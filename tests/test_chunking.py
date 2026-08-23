from schemas.artifact import StandardArtifact, NormalizedMessage
from services.retrieval.chunking import chunk_artifact

def test_chunk_doc():
    content = "Paragraph 1 is here.\n\nParagraph 2 is here.\n\n"
    artifact = StandardArtifact(id="1", type="doc", raw_content=content)
    chunks = chunk_artifact(artifact)
    assert len(chunks) == 2
    assert chunks[0] == "Paragraph 1 is here."
    assert chunks[1] == "Paragraph 2 is here."

def test_chunk_chat():
    messages = [
        NormalizedMessage(role="user", content="Hi"),
        NormalizedMessage(role="assistant", content="Hello"),
        NormalizedMessage(role="user", content="How are you?"),
        NormalizedMessage(role="assistant", content="I'm fine.")
    ]
    artifact = StandardArtifact(
        id="2", type="chat", raw_content="", normalized_messages=messages
    )
    chunks = chunk_artifact(artifact)
    assert len(chunks) == 2
    assert "Hi" in chunks[0] and "Hello" in chunks[0]
    assert "How are you?" in chunks[1] and "I'm fine." in chunks[1]
