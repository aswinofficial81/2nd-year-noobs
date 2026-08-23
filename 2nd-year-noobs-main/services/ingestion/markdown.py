from schemas.artifact import StandardArtifact

def parse_markdown(content: str, title: str = "Untitled Document") -> StandardArtifact:
    """
    Parses a markdown document into a StandardArtifact.
    Extracts raw text (ignoring formatting for search purposes).
    For now, we just pass the raw content.
    """
    import hashlib
    # Generate a simple deterministic ID
    doc_id = hashlib.sha256(content.encode()).hexdigest()

    return StandardArtifact(
        id=doc_id,
        type="doc",
        title=title,
        raw_content=content
    )
