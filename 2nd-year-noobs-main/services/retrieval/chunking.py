from schemas.artifact import StandardArtifact
import re

def chunk_artifact(artifact: StandardArtifact) -> list[str]:
    """
    Chunks an artifact based on its type.
    - doc (markdown): paragraph chunks
    - pdf: header/page chunks (we have flat text for now, so we can split by double newlines)
    - chat: turn-pairs
    """
    chunks = []
    
    if artifact.type == "doc":
        # Chunk by paragraphs (double newlines)
        raw_chunks = re.split(r'\n\s*\n', artifact.raw_content)
        chunks = [c.strip() for c in raw_chunks if len(c.strip()) > 10]
        
    elif artifact.type == "pdf":
        # For now, pypdf extracts text with pages separated by \n\n in our implementation
        raw_chunks = re.split(r'\n\s*\n', artifact.raw_content)
        chunks = [c.strip() for c in raw_chunks if len(c.strip()) > 10]
        
    elif artifact.type == "chat":
        # Chunk by turn-pairs if normalized_messages are available
        if artifact.normalized_messages:
            current_chunk = []
            for msg in artifact.normalized_messages:
                current_chunk.append(f"{msg.role.upper()}: {msg.content}")
                if msg.role == "assistant" and len(current_chunk) >= 2:
                    chunks.append("\n".join(current_chunk))
                    current_chunk = []
            if current_chunk:
                chunks.append("\n".join(current_chunk))
        else:
            # Fallback
            raw_chunks = re.split(r'\n\s*\n', artifact.raw_content)
            chunks = [c.strip() for c in raw_chunks if len(c.strip()) > 10]
            
    else:
        # Generic chunking
        raw_chunks = re.split(r'\n\s*\n', artifact.raw_content)
        chunks = [c.strip() for c in raw_chunks if len(c.strip()) > 10]

    return chunks
