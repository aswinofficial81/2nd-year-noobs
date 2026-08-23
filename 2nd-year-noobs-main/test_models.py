import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

models_to_test = ["text-embedding-004", "embedding-001", "models/text-embedding-004"]

for model in models_to_test:
    try:
        response = client.models.embed_content(
            model=model,
            contents=["Hello world"]
        )
        print(f"SUCCESS: {model} works! Dimensions: {len(response.embeddings[0].values)}")
    except Exception as e:
        print(f"FAILED: {model} - {e}")
