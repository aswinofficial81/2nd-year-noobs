import httpx

print("Sending request to API...")
try:
    # We use httpx which is already installed
    files = {
        'file': ('test.md', b'# Test Document\nThis is a test document.'),
        'title': (None, 'Test Upload')
    }
    response = httpx.post("http://127.0.0.1:8000/api/ingest/markdown", files=files, timeout=30.0)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"Error: {e}")
