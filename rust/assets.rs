use std::{
    borrow::Cow,
    path::{Component, Path},
};
use wry::http::{Request, Response};

pub const RENDERER_URL: &str = "http://unique.localhost/renderer/index.html";

pub fn is_renderer_url(source: &str) -> bool {
    let Ok(mut url) = url::Url::parse(source) else {
        return false;
    };
    url.set_fragment(None);
    url.as_str() == RENDERER_URL
}

pub fn respond(root: &Path, request: Request<Vec<u8>>) -> Response<Cow<'static, [u8]>> {
    let path = request.uri().path();
    let allowed = path
        .strip_prefix("/renderer/")
        .map(|relative| (root.join("renderer"), relative))
        .or_else(|| (path == "/unique.png").then(|| (root.to_path_buf(), "unique.png")));
    let response = allowed.and_then(|(base, relative)| {
        if relative.contains(['\\', '%'])
            || Path::new(relative)
                .components()
                .any(|c| !matches!(c, Component::Normal(_)))
        {
            return None;
        }
        let base = base.canonicalize().ok()?;
        let file = base.join(relative).canonicalize().ok()?;
        if !file.starts_with(base) || !file.is_file() {
            return None;
        }
        let mime = match file.extension().and_then(|s| s.to_str()) {
            Some("html") => "text/html; charset=utf-8",
            Some("js") => "text/javascript; charset=utf-8",
            Some("css") => "text/css; charset=utf-8",
            Some("png") => "image/png",
            Some("ttf") => "font/ttf",
            _ => return None,
        };
        Some((std::fs::read(file).ok()?, mime))
    });
    match response {
        Some((bytes, mime)) => Response::builder()
            .header("Content-Type", mime)
            .header("Cache-Control", "no-store")
            .body(Cow::Owned(bytes))
            .unwrap(),
        None => Response::builder()
            .status(404)
            .body(Cow::Borrowed(&b"Not found"[..]))
            .unwrap(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn renderer_origin_can_pass_through_wry_ipc() {
        let request = Request::builder()
            .uri(RENDERER_URL)
            .body(Vec::<u8>::new())
            .unwrap();
        assert!(is_renderer_url(&request.uri().to_string()));
        assert!(is_renderer_url(&format!("{RENDERER_URL}#main")));
        for source in [
            "http://unique.localhost/renderer/other.html",
            "https://example.com/renderer/index.html",
            "http://unique.localhost.evil/renderer/index.html",
            "http://unique.localhost/renderer/index.html?evil=1",
        ] {
            assert!(!is_renderer_url(source));
        }
        // Wry silently discards IPC from file:/// pages when it builds an HTTP request.
        assert!("file:///E:/minecraft%20launcher/renderer/index.html"
            .parse::<wry::http::Uri>()
            .is_err());
    }
    #[test]
    fn serves_assets_but_never_backend_or_parent_files() {
        let root = Path::new(env!("CARGO_MANIFEST_DIR"));
        for asset in [
            "renderer/index.html",
            "renderer/renderer.js",
            "renderer/style.css",
            "unique.png",
        ] {
            let request = Request::builder()
                .uri(format!("unique://localhost/{asset}"))
                .body(Vec::new())
                .unwrap();
            assert_eq!(respond(root, request).status(), 200);
        }
        for asset in [
            "main.js",
            ".env",
            "renderer/../main.js",
            "renderer/%2e%2e/main.js",
            "renderer/missing.js",
        ] {
            let request = Request::builder()
                .uri(format!("unique://localhost/{asset}"))
                .body(Vec::new())
                .unwrap();
            assert_eq!(respond(root, request).status(), 404);
        }
    }
}
