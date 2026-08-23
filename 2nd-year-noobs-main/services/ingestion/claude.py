import json
import hashlib
from schemas.artifact import StandardArtifact, NormalizedMessage

def parse_claude_json(content: str, title: str = "Claude Conversation") -> StandardArtifact:
    """
    Parses a Claude conversation JSON export.
    Assumes the flat chat_messages array directly (sender, text).
    """
    data = json.loads(content)
    
    chat_messages = []
    
    # Check if the structure contains chat_messages directly or if it's a list
    if isinstance(data, list):
        if len(data) > 0 and "chat_messages" in data[0]:
            chat_messages = data[0]["chat_messages"]
            title = data[0].get("name", title)
        else:
            chat_messages = data
    elif isinstance(data, dict):
        chat_messages = data.get("chat_messages", [])
        title = data.get("name", title)

    normalized_messages = []
    raw_content_parts = []
    
    for msg in chat_messages:
        sender = msg.get("sender")
        text = msg.get("text", "")
        
        role = "user" if sender == "human" else "assistant"
        
        normalized_messages.append(NormalizedMessage(role=role, content=text))
        raw_content_parts.append(f"{role.upper()}:\n{text}")

    raw_content = "\n\n".join(raw_content_parts)
    doc_id = hashlib.sha256(raw_content.encode()).hexdigest()

    return StandardArtifact(
        id=doc_id,
        type="chat",
        title=title,
        raw_content=raw_content,
        normalized_messages=normalized_messages
    )
