from fastapi.testclient import TestClient
from unittest.mock import patch
from schemas.artifact import StandardArtifact

def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

@patch("main.index_artifact")
def test_ingest_markdown_api(mock_index, client):
    files = {"file": ("test.md", b"# Title\n\nContent", "text/markdown")}
    data = {"title": "Test MD"}
    response = client.post("/api/ingest/markdown", data=data, files=files)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["type"] == "doc"
    assert res_data["title"] == "Test MD"
    mock_index.assert_called_once()

@patch("main.search_and_synthesize")
def test_search_api(mock_search, client):
    mock_search.return_value = {
        "query": "test query",
        "answer": "This is a test answer.",
        "context_used": []
    }
    response = client.post("/api/search", json={"query": "test query"})
    assert response.status_code == 200
    assert response.json()["answer"] == "This is a test answer."
    mock_search.assert_called_once()
