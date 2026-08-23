import json
from services.ingestion import parse_markdown, parse_chatgpt_json, parse_claude_json

def test_parse_markdown():
    content = "# Title\n\nSome paragraph."
    artifact = parse_markdown(content, "Test Doc")
    assert artifact.type == "doc"
    assert artifact.title == "Test Doc"
    assert artifact.raw_content == content

def test_parse_chatgpt_json():
    mock_data = {
        "title": "ChatGPT Test",
        "mapping": {
            "node1": {
                "message": {
                    "author": {"role": "user"},
                    "content": {"parts": ["Hello AI"]}
                }
            },
            "node2": {
                "message": {
                    "author": {"role": "assistant"},
                    "content": {"parts": ["Hello human"]}
                }
            }
        }
    }
    artifact = parse_chatgpt_json(json.dumps(mock_data))
    assert artifact.type == "chat"
    assert artifact.title == "ChatGPT Test"
    assert len(artifact.normalized_messages) == 2
    assert artifact.normalized_messages[0].role == "user"
    assert artifact.normalized_messages[0].content == "Hello AI"

def test_parse_claude_json():
    mock_data = {
        "name": "Claude Test",
        "chat_messages": [
            {"sender": "human", "text": "Hi Claude"},
            {"sender": "assistant", "text": "Hi there"}
        ]
    }
    artifact = parse_claude_json(json.dumps(mock_data))
    assert artifact.type == "chat"
    assert artifact.title == "Claude Test"
    assert len(artifact.normalized_messages) == 2
    assert artifact.normalized_messages[0].role == "user"
    assert artifact.normalized_messages[0].content == "Hi Claude"
