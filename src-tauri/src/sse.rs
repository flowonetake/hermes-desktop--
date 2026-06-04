use reqwest::Response;
use tokio::sync::mpsc;

#[derive(Debug, Clone)]
pub struct ToolCallInfo {
    pub id: String,
    pub name: String,
    pub arguments: String,
}

#[derive(Debug, Clone)]
pub enum SseEvent {
    MessageChunk(String),
    ToolCall(ToolCallInfo),
    Error(String),
    Done,
    TokenUsage { prompt: u64, completion: u64 },
}

pub fn parse_sse_stream(response: Response) -> mpsc::Receiver<SseEvent> {
    let (tx, rx) = mpsc::channel::<SseEvent>(256);

    tokio::spawn(async move {
        let body = match response.bytes().await {
            Ok(b) => b,
            Err(e) => {
                let _ = tx.send(SseEvent::Error(format!("Failed to read response: {}", e))).await;
                let _ = tx.send(SseEvent::Done).await;
                return;
            }
        };

        let text = String::from_utf8_lossy(&body);
        let mut current_data = String::new();

        for line in text.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with("data: ") {
                let data = &trimmed[6..];
                current_data.push_str(data);
            } else if trimmed.starts_with("data:") {
                let data = &trimmed[5..];
                current_data.push_str(data);
            } else if trimmed.is_empty() && !current_data.is_empty() {
                let event = parse_event_data(&current_data);
                if tx.send(event).await.is_err() {
                    return;
                }
                current_data.clear();
            }
        }

        if !current_data.is_empty() {
            let event = parse_event_data(&current_data);
            let _ = tx.send(event).await;
        }

        let _ = tx.send(SseEvent::Done).await;
    });

    rx
}

fn parse_event_data(data: &str) -> SseEvent {
    let trimmed = data.trim();
    if trimmed.is_empty() || trimmed == "[DONE]" {
        return SseEvent::Done;
    }

    match serde_json::from_str::<serde_json::Value>(trimmed) {
        Ok(val) => {
            if let Some(content) = val.get("content").and_then(|c| c.as_str()) {
                if !content.is_empty() {
                    return SseEvent::MessageChunk(content.to_string());
                }
            }
            if let Some(delta) = val.get("delta")
                .and_then(|d| d.get("content"))
                .and_then(|c| c.as_str())
            {
                if !delta.is_empty() {
                    return SseEvent::MessageChunk(delta.to_string());
                }
            }
            if let Some(error) = val.get("error").and_then(|e| e.as_str()) {
                return SseEvent::Error(error.to_string());
            }
            if let Some(message) = val.get("message").and_then(|m| m.as_str()) {
                return SseEvent::Error(message.to_string());
            }
            if let Some(tool_calls) = val.get("tool_calls").and_then(|t| t.as_array()) {
                if let Some(first) = tool_calls.first() {
                    let id = first.get("id").and_then(|i| i.as_str()).unwrap_or("").to_string();
                    let name = first.get("function")
                        .and_then(|f| f.get("name"))
                        .and_then(|n| n.as_str())
                        .unwrap_or("")
                        .to_string();
                    let args = first.get("function")
                        .and_then(|f| f.get("arguments"))
                        .and_then(|a| a.as_str())
                        .unwrap_or("{}")
                        .to_string();
                    return SseEvent::ToolCall(ToolCallInfo { id, name, arguments: args });
                }
            }
            if let Some(tool_call) = val.get("tool_call").and_then(|t| t.as_object()) {
                let id = tool_call.get("id").and_then(|i| i.as_str()).unwrap_or("").to_string();
                let name = tool_call.get("name")
                    .or_else(|| tool_call.get("function"))
                    .and_then(|n| n.as_str())
                    .unwrap_or("")
                    .to_string();
                let args = tool_call.get("arguments")
                    .and_then(|a| a.as_str())
                    .unwrap_or("{}")
                    .to_string();
                return SseEvent::ToolCall(ToolCallInfo { id, name, arguments: args });
            }
            if val.get("done").and_then(|d| d.as_bool()).unwrap_or(false) {
                let prompt = val.get("usage")
                    .and_then(|u| u.get("prompt_tokens"))
                    .and_then(|t| t.as_u64())
                    .unwrap_or(0);
                let completion = val.get("usage")
                    .and_then(|u| u.get("completion_tokens"))
                    .and_then(|t| t.as_u64())
                    .unwrap_or(0);
                if prompt > 0 || completion > 0 {
                    return SseEvent::TokenUsage { prompt, completion };
                }
                return SseEvent::Done;
            }
            SseEvent::MessageChunk(trimmed.to_string())
        }
        Err(_) => {
            SseEvent::MessageChunk(trimmed.to_string())
        }
    }
}

pub async fn collect_events(rx: &mut mpsc::Receiver<SseEvent>) -> Vec<SseEvent> {
    let mut events = Vec::new();
    while let Some(event) = rx.recv().await {
        let is_done = matches!(event, SseEvent::Done);
        events.push(event);
        if is_done {
            break;
        }
    }
    events
}
