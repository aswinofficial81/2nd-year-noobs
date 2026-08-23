import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

print("Listing all available embedding models for your API key...")
try:
    for m in client.models.list():
        methods = getattr(m, 'supported_generation_methods', [])
        # In newer SDK versions, supported_generation_methods might be different
        # We will just print any model that has "embed" in its name or methods
        if "embed" in m.name.lower() or any("embed" in str(method).lower() for method in methods):
            print(f"Found embedding model: {m.name}")
            print(f"  Methods: {methods}")
except Exception as e:
    print(f"Error listing models: {e}")
