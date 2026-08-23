import json
import hashlib
from typing import Dict, Any
from schemas.artifact import StandardArtifact, NormalizedMessage

def parse_chatgpt_json(content: str, title: str = "ChatGPT Conversation") -> StandardArtifact:
    """
    Parses a ChatGPT conversation JSON export.
    Assumes the structure where mapping[node_id].message.content.parts exists.
    """
    data = json.loads(content)
    
    # ChatGPT exports can be a single conversation object or a list of conversations.
    # For simplicity, we handle the case where it's a single conversation object.
    if isinstance(data, list) and len(data) > 0:
        convo = data[0]
    else:
        convo = data

    mapping = convo.get("mapping", {})
    
    # Reconstruct the conversation thread by following the 'children' pointers, 
    # but a simpler way is to just grab all messages and sort by create_time if possible,
    # or just extract them. We will extract all user and assistant messages.
    normalized_messages = []
    raw_content_parts = []
    
    for node_id, node in mapping.items():
        message = node.get("message")
        if not message:
            continue
            
        role = message.get("author", {}).get("role")
        if role not in ["user", "assistant"]:
            continue
            
        content_obj = message.get("content", {})
        parts = content_obj.get("parts", [])
        
        # Only handle text parts for now
        text_parts = [str(p) for p in parts if isinstance(p, str)]
        if not text_parts:
            continue
            
        text_content = "\n".join(text_parts)
        normalized_messages.append(NormalizedMessage(role=role, content=text_content))
        raw_content_parts.append(f"{role.upper()}:\n{text_content}")

    raw_content = "\n\n".join(raw_content_parts)
    doc_id = hashlib.sha256(raw_content.encode()).hexdigest()

    return StandardArtifact(
        id=doc_id,
        type="chat",
        title=convo.get("title", title),
        raw_content=raw_content,
        normalized_messages=normalized_messages
    )
