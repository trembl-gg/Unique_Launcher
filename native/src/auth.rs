use crate::{
    crypto,
    net::{self, Cancel},
    storage::Store,
};
use serde_json::{json, Value};
use std::{
    io::{Read, Write},
    net::TcpListener,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
const CLIENT: &str = "8e0b0376-e0b6-4f26-869f-9d5c7e321046";
const TOKEN: &str = "https://login.microsoftonline.com/consumers/oauth2/v2.0/token";
const REDIRECT: &str = "http://localhost:53682/callback";
pub fn now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}
pub fn offline(name: &str) -> Result<Value, String> {
    if !(3..=16).contains(&name.len())
        || !name.bytes().all(|c| c.is_ascii_alphanumeric() || c == b'_')
    {
        return Err("Ник: 3–16 латинских букв, цифр или _".into());
    }
    Ok(
        json!({"nickname":name,"guest":true,"sessionToken":format!("guest-{}",crypto::random()?),"profileId":crypto::offline_uuid(name)?}),
    )
}
pub fn open_browser(address: &str) -> Result<(), String> {
    let url = url::Url::parse(address).map_err(|e| e.to_string())?;
    if !matches!(url.scheme(), "http" | "https") {
        return Err("Invalid browser URL".into());
    }
    let wide: Vec<u16> = address.encode_utf16().chain(Some(0)).collect();
    let result = unsafe {
        windows::Win32::UI::Shell::ShellExecuteW(
            None,
            windows::core::w!("open"),
            windows::core::PCWSTR(wide.as_ptr()),
            None,
            None,
            windows::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL,
        )
    };
    if result.0 as isize <= 32 {
        Err("Не удалось открыть браузер Windows".into())
    } else {
        Ok(())
    }
}
pub fn login(cancel: &Cancel) -> Result<Value, String> {
    let server = TcpListener::bind(("127.0.0.1", 53682))
        .map_err(|e| format!("Порт входа Microsoft занят: {e}"))?;
    server.set_nonblocking(true).map_err(|e| e.to_string())?;
    let state = crypto::random()?;
    let verifier = format!("{}{}", crypto::random()?, crypto::random()?);
    let digest = crypto::Digest::new("SHA256")?;
    digest.update(verifier.as_bytes())?;
    let challenge = crypto::base64url(&digest.finish()?);
    let client = std::env::var("UNIQUE_MICROSOFT_CLIENT_ID").unwrap_or_else(|_| CLIENT.into());
    let mut url =
        url::Url::parse("https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize")
            .unwrap();
    url.query_pairs_mut().extend_pairs([
        ("client_id", client.as_str()),
        ("response_type", "code"),
        ("redirect_uri", REDIRECT),
        ("scope", "XboxLive.signin offline_access"),
        ("state", state.as_str()),
        ("code_challenge", challenge.as_str()),
        ("code_challenge_method", "S256"),
        ("prompt", "select_account"),
    ]);
    open_browser(url.as_str())?;
    let deadline = Instant::now() + Duration::from_secs(180);
    loop {
        net::checkpoint(cancel)?;
        if Instant::now() > deadline {
            return Err("Время входа истекло. Повторите вход Microsoft.".into());
        }
        match server.accept() {
            Ok((mut stream, peer)) => {
                if !peer.ip().is_loopback() {
                    continue;
                }
                let _ = stream.set_read_timeout(Some(Duration::from_secs(2)));
                let mut bytes = [0u8; 8192];
                let n = stream.read(&mut bytes).map_err(|e| e.to_string())?;
                let request = String::from_utf8_lossy(&bytes[..n]);
                let line = request.lines().next().unwrap_or("");
                let mut parts = line.split_whitespace();
                let method = parts.next().unwrap_or("");
                let path = parts.next().unwrap_or("");
                let callback = url::Url::parse(&format!("http://localhost:53682{path}"));
                let valid = callback.as_ref().is_ok_and(|u| {
                    u.path() == "/callback"
                        && u.query_pairs().any(|(k, v)| k == "state" && v == state)
                });
                if method != "GET" || !valid {
                    let _=stream.write_all(b"HTTP/1.1 400 Bad Request\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");
                    continue;
                }
                let callback = callback.unwrap();
                let code = callback
                    .query_pairs()
                    .find(|(k, _)| k == "code")
                    .map(|(_, v)| v.into_owned());
                let success = code.is_some();
                let html = if success {
                    "<!doctype html><meta charset=utf-8><title>Unique Launcher</title><body style='background:#0c0e16;color:#eee;font:20px system-ui;display:grid;place-items:center;height:90vh'><main><h1>Вход подтверждён</h1><p>Вернитесь в Unique Launcher.</p></main>"
                } else {
                    "<!doctype html><meta charset=utf-8><title>Unique Launcher</title><body style='background:#0c0e16;color:#eee;font:20px system-ui'><h1>Вход отменён</h1><p>Вернитесь в лаунчер и повторите попытку.</p>"
                };
                let _=write!(stream,"HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nCache-Control: no-store\r\nContent-Security-Policy: default-src 'none'; style-src 'unsafe-inline'\r\nConnection: close\r\n\r\n{html}",html.len());
                let code = code.ok_or("Вход Microsoft отменён")?;
                net::checkpoint(cancel)?;
                let token = net::form(
                    TOKEN,
                    &[
                        ("client_id", &client),
                        ("grant_type", "authorization_code"),
                        ("code", &code),
                        ("redirect_uri", REDIRECT),
                        ("code_verifier", &verifier),
                    ],
                )?;
                return exchange(token);
            }
            Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                std::thread::sleep(Duration::from_millis(100))
            }
            Err(e) => return Err(e.to_string()),
        }
    }
}
fn text<'a>(v: &'a Value, key: &str) -> Result<&'a str, String> {
    v[key]
        .as_str()
        .filter(|s| !s.is_empty())
        .ok_or_else(|| format!("Microsoft response missing {key}"))
}
fn exchange(token: Value) -> Result<Value, String> {
    let xbl = net::post_json(
        "https://user.auth.xboxlive.com/user/authenticate",
        &json!({"Properties":{"AuthMethod":"RPS","SiteName":"user.auth.xboxlive.com","RpsTicket":format!("d={}",text(&token,"access_token")?)},"RelyingParty":"http://auth.xboxlive.com","TokenType":"JWT"}),
    )?;
    let xsts = net::post_json(
        "https://xsts.auth.xboxlive.com/xsts/authorize",
        &json!({"Properties":{"SandboxId":"RETAIL","UserTokens":[text(&xbl,"Token")?]},"RelyingParty":"rp://api.minecraftservices.com/","TokenType":"JWT"}),
    )?;
    let uhs = xsts["DisplayClaims"]["xui"][0]["uhs"]
        .as_str()
        .ok_or("Xbox account has no user hash")?;
    let minecraft = net::post_json(
        "https://api.minecraftservices.com/authentication/login_with_xbox",
        &json!({"identityToken":format!("XBL3.0 x={uhs};{}",text(&xsts,"Token")?)}),
    )?;
    let access = text(&minecraft, "access_token")?;
    let profile=net::json("GET","https://api.minecraftservices.com/minecraft/profile",&[],&format!("Authorization: Bearer {access}\r\n"))
        .map_err(|_|"Аккаунт не имеет доступного профиля Minecraft Java Edition. Проверьте покупку и настройки Xbox.".to_owned())?;
    let name = text(&profile, "name")?;
    let uuid = text(&profile, "id")?;
    Ok(
        json!({"nickname":name,"profileId":uuid,"microsoft":true,"guest":false,"sessionToken":crypto::random()?,"refreshToken":token["refresh_token"],"minecraftAuth":{"name":name,"uuid":uuid,"access_token":access,"expiresAt":now()+minecraft["expires_in"].as_u64().unwrap_or(86400).saturating_sub(60)*1000}}),
    )
}
pub fn credentials(store: &mut Store) -> Result<Value, String> {
    let account = store.data["lastSession"].clone();
    let name = account["nickname"]
        .as_str()
        .ok_or("Сначала войдите в аккаунт")?;
    if account["guest"] == true || account["microsoft"] != true {
        return Ok(
            json!({"name":name,"uuid":crypto::offline_uuid(name)?,"access_token":"0","user_type":"legacy"}),
        );
    }
    if account["minecraftAuth"]["expiresAt"].as_u64().unwrap_or(0) > now() {
        let mut value = account["minecraftAuth"].clone();
        value["user_type"] = json!("msa");
        return Ok(value);
    }
    let refresh = account["refreshToken"]
        .as_str()
        .filter(|s| !s.is_empty())
        .ok_or("Войдите в Microsoft повторно")?;
    let client = std::env::var("UNIQUE_MICROSOFT_CLIENT_ID").unwrap_or_else(|_| CLIENT.into());
    let token = net::form(
        TOKEN,
        &[
            ("client_id", &client),
            ("grant_type", "refresh_token"),
            ("refresh_token", refresh),
            ("scope", "XboxLive.signin offline_access"),
        ],
    )?;
    let mut account = exchange(token)?;
    if account["refreshToken"].as_str().unwrap_or("").is_empty() {
        account["refreshToken"] = json!(refresh);
    }
    store.login(account.clone())?;
    let mut value = account["minecraftAuth"].clone();
    value["user_type"] = json!("msa");
    Ok(value)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn offline_validation() {
        assert!(offline("Test_123").is_ok());
        for name in ["ab", "a b", "../abc", "Русский"] {
            assert!(offline(name).is_err());
        }
    }
}
