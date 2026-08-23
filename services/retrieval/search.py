from sqlalchemy.orm import Session
from models.artifact import Chunk, Topic, Artifact
from services.llm import get_embedding, extract_topics, synthesize_rag_answer

def search_and_synthesize(db: Session, query: str) -> dict:
    """
    Cross-Corpus RAG search.
    1. Gets query embedding and topics.
    2. Performs vector similarity search in Tier 1.
    3. Performs topic hashmap lookup in Tier 2.
    4. Assembles context and calls LLM to synthesize answer.
    """
    # 1. Prepare query
    query_emb = get_embedding(query)
    query_topics = extract_topics(query)
    
    context_chunks = []
    
    # 2. Tier 1: Vector Similarity (Top 5 chunks)
    # pgvector provides the <-> operator for L2 distance (or <=> for cosine distance).
    # Using L2 distance for demonstration.
    top_chunks = db.query(Chunk).order_by(Chunk.embedding.l2_distance(query_emb)).limit(5).all()
    
    for c in top_chunks:
        context_chunks.append(
            f"[Source: {c.artifact.title} (ID: {c.artifact.id})]\n{c.content}"
        )
        
    # 3. Tier 2: Topic Hashmap lookup (Top matching artifacts)
    # Find artifacts that match the query topics
    topic_artifacts = []
    for topic_name in query_topics:
        topic = db.query(Topic).filter(Topic.name == topic_name).first()
        if topic:
            for art in topic.artifacts:
                topic_artifacts.append(art)
                
    # Deduplicate topic artifacts
    unique_arts = {art.id: art for art in topic_artifacts}.values()
    
    # Add summary lines from matching topic artifacts to context
    for art in unique_arts:
        if art.summary_line:
            context_chunks.append(
                f"[Topic Match - {art.title} (ID: {art.id})]\nSummary: {art.summary_line}"
            )
            
    # 4. Context Assembly and RAG Synthesis
    assembled_context = "\n\n---\n\n".join(context_chunks)
    
    answer = synthesize_rag_answer(query, assembled_context)
    
    return {
        "query": query,
        "answer": answer,
        "context_used": context_chunks
    }
