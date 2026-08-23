from sqlalchemy.orm import Session
from schemas.artifact import StandardArtifact
from models.artifact import Artifact, Chunk, Topic
from services.llm import get_embedding, extract_topics, generate_summary, update_summary
from services.retrieval.chunking import chunk_artifact

def clean_text(text: str | None) -> str | None:
    """PostgreSQL cannot store null bytes (\\x00). This removes them."""
    return text.replace("\x00", "") if text else text

def index_artifact(db: Session, standard_artifact: StandardArtifact, parent_id: str = None):
    """
    On Commit indexing service.
    """
    print(f"--> [DEBUG] Starting index_artifact for {standard_artifact.id}")
    
    # Clean all incoming text of null bytes to prevent psycopg2 ValueError
    standard_artifact.title = clean_text(standard_artifact.title)
    standard_artifact.raw_content = clean_text(standard_artifact.raw_content)
    if standard_artifact.summary_line:
        standard_artifact.summary_line = clean_text(standard_artifact.summary_line)
    if standard_artifact.normalized_messages:
        for m in standard_artifact.normalized_messages:
            m.content = clean_text(m.content)
            
    print("--> [DEBUG] Checking for existing artifact...")
    # Check if artifact exists by ID
    existing_artifact = db.query(Artifact).filter(Artifact.id == standard_artifact.id).first()
    if existing_artifact and not parent_id:
        print("--> [DEBUG] Artifact already exists. Skipping.")
        return existing_artifact 
        
    summary_line = standard_artifact.summary_line
    db_artifact = None

    if parent_id:
        print(f"--> [DEBUG] Updating parent artifact {parent_id}...")
        parent_artifact = db.query(Artifact).filter(Artifact.id == parent_id).first()
        if parent_artifact:
            # We are updating an existing artifact
            if parent_artifact.type == "chat":
                if parent_artifact.summary_line:
                    summary_line = update_summary(parent_artifact.summary_line, standard_artifact.raw_content[:4000])
                else:
                    summary_line = generate_summary(standard_artifact.raw_content[:4000])
            
            # Clear old chunks before inserting new ones
            db.query(Chunk).filter(Chunk.artifact_id == parent_id).delete()
            
            # Update the existing artifact in place
            db_artifact = parent_artifact
            db_artifact.raw_content = standard_artifact.raw_content
            db_artifact.normalized_messages = [m.model_dump() for m in standard_artifact.normalized_messages] if standard_artifact.normalized_messages else None
            db_artifact.summary_line = summary_line
            standard_artifact.id = parent_id # Match the parent ID
            
    if not db_artifact:
        print("--> [DEBUG] Creating new artifact record...")
        # Generate summary line for chats if not provided
        if standard_artifact.type == "chat" and not summary_line:
            summary_line = generate_summary(standard_artifact.raw_content[:4000]) # Max 4k chars for summary
            
        db_artifact = Artifact(
            id=standard_artifact.id,
            type=standard_artifact.type,
            title=standard_artifact.title,
            raw_content=standard_artifact.raw_content,
            normalized_messages=[m.model_dump() for m in standard_artifact.normalized_messages] if standard_artifact.normalized_messages else None,
            summary_line=summary_line
        )
        db.add(db_artifact)
        
    # Update standard_artifact's summary_line to ensure API responses have it
    standard_artifact.summary_line = summary_line
    
    print("--> [DEBUG] Committing artifact to DB...")
    db.commit()
    db.refresh(db_artifact)
    
    # Chunk and embed
    print("--> [DEBUG] Chunking artifact...")
    chunks = chunk_artifact(standard_artifact)
    print(f"--> [DEBUG] Generated {len(chunks)} chunks.")
    if chunks:
        # Import get_embeddings here if not at top level
        from services.llm import get_embeddings
        
        import time
        # Process in batches of 100 to avoid hitting limits
        embeddings = []
        for i in range(0, len(chunks), 100):
            batch = chunks[i:i+100]
            print(f"--> [DEBUG] Fetching embeddings for batch {i} to {i+len(batch)}...")
            embeddings.extend(get_embeddings(batch))
            time.sleep(2) # Prevent Gemini free tier rate limits
            
        print("--> [DEBUG] Embeddings fetched. Saving chunks to DB...")
        for c_text, emb in zip(chunks, embeddings):
            db_chunk = Chunk(
                artifact_id=db_artifact.id,
                content=c_text.replace("\x00", ""),
                embedding=emb
            )
            db.add(db_chunk)
            
    # Extract topics
    print("--> [DEBUG] Extracting topics...")
    topics = extract_topics(standard_artifact.raw_content[:4000])
    print(f"--> [DEBUG] Topics extracted: {topics}")
    for topic_name in topics:
        db_topic = db.query(Topic).filter(Topic.name == topic_name).first()
        if not db_topic:
            db_topic = Topic(name=topic_name)
            db.add(db_topic)
            db.commit()
            db.refresh(db_topic)
        
        # Link topic to artifact
        db_artifact.topics.append(db_topic)
        
    print("--> [DEBUG] Final commit...")
    db.commit()
    print("--> [DEBUG] Done!")
    return db_artifact
