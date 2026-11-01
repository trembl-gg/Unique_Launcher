use serde::Deserialize;
use serde_json::{json, Value};

pub const PREFIX: &str = "UNIQUE_RPC:";

#[derive(Debug, Deserialize)]
pub struct Invoke {
    pub id: u64,
    pub channel: String,
    #[serde(default)]
    pub payload: Value,
}

pub fn reply(id: u64, result: Result<Value, String>) -> Value {
    match result {
        Ok(result) => json!({"type":"invoke-result", "id":id, "ok":true, "result":result}),
        Err(error) => json!({"type":"invoke-result", "id":id, "ok":false, "error":error}),
    }
}

pub fn event(channel: &str, data: Value) -> Value {
    json!({"type":"event", "channel":channel, "data":data})
}

pub fn decode(line: &str) -> Option<Value> {
    serde_json::from_str(line.strip_prefix(PREFIX)?).ok()
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn protocol_does_not_parse_logs_as_messages() {
        assert!(decode("{\"type\":\"event\"}").is_none());
        assert!(decode("UNIQUE_RPC:invalid").is_none());
        assert_eq!(decode("UNIQUE_RPC:{\"id\":4}").unwrap()["id"], 4);
    }
    #[test]
    fn errors_and_optional_payload_preserve_contract() {
        let request: Invoke = serde_json::from_str(r#"{"id":3,"channel":"get-settings"}"#).unwrap();
        assert!(request.payload.is_null());
        let response = reply(request.id, Err("failure".into()));
        assert_eq!(response["ok"], false);
        assert_eq!(response["error"], "failure");
    }
}
