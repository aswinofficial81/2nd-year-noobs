import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def get_embeddings(texts: list[str]) -> list[list[float]]:
    """Generates embeddings for a batch of texts."""
    if not texts:
        return []
        
    try:
        response = client.models.embed_content(
            model='gemini-embedding-2',
            contents=texts,
            config=types.EmbedContentConfig(output_dimensionality=768)
        )
        # response.embeddings is a list of Embedding objects
        return [item.values for item in response.embeddings]
    except Exception as e:
        print(f"Embedding error: {e}")
        return [[0.0] * 768 for _ in texts]

def get_embedding(text: str) -> list[float]:
    """Generates an embedding for a single text."""
    return get_embeddings([text])[0]

def generate_summary(text: str) -> str:
    """Generates a summary for an artifact or chat chunk."""
    if not text.strip():
        return ""
        
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[
                "You are an AI assistant. Summarize the following text concisely. Only return the summary.",
                text
            ]
        )
        return response.text
    except Exception as e:
        print(f"Summary generation error: {e}")
        return "Summary generation failed."

def update_summary(previous_summary: str, new_content: str) -> str:
    """Updates an existing summary with new chat content."""
    if not new_content.strip():
        return previous_summary
        
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[
                "You are an AI assistant. You will be provided with a previous summary of a conversation, and the new messages appended to the conversation. Your task is to output a single, cohesive, updated summary that encompasses both the previous summary context and the new information. Only return the summary.",
                f"PREVIOUS SUMMARY:\n{previous_summary}\n\nNEW MESSAGES:\n{new_content}"
            ]
        )
        return response.text
    except Exception as e:
        print(f"Summary update error: {e}")
        return previous_summary

def extract_topics(text: str) -> list[str]:
    """Extracts high-frequency keywords and topics from the text."""
    if not text.strip():
        return []
        
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[
                "Extract 3 to 5 key topics or keywords from the following text. Return them as a comma-separated list. No other text.",
                text
            ]
        )
        content = response.text
        topics = [t.strip().lower() for t in content.split(",") if t.strip()]
        return topics
    except Exception as e:
        print(f"Topic extraction error: {e}")
        return []

def synthesize_rag_answer(query: str, context: str) -> str:
    """Synthesizes an answer using RAG context."""
    prompt = f"""
Use the following context to answer the user's question. 
If the answer is not in the context, say "I don't know based on the provided context."
Include citations if possible.

Context:
{context}

Question:
{query}
"""
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[
                "You are a helpful research assistant.",
                prompt
            ]
        )
        return response.text
    except Exception as e:
        print(f"RAG synthesis error: {e}")
        return "Sorry, I encountered an error while synthesizing the answer."
