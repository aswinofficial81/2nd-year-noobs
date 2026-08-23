import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from main import app
from database import get_db, Base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Setup test DB (In memory SQLite - note that pgvector will NOT work here, 
# so tests involving the vector DB directly need to be mocked or run against Postgres)
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    # Attempt to mock Vector type for SQLite if possible, or just skip it
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture
def mock_llm(mocker):
    """Mocks the LLM calls to avoid API usage during tests."""
    mocker.patch("services.llm.get_embedding", return_value=[0.1] * 1536)
    mocker.patch("services.llm.generate_summary", return_value="Mocked summary.")
    mocker.patch("services.llm.extract_topics", return_value=["mocked_topic_1", "mocked_topic_2"])
    mocker.patch("services.llm.synthesize_rag_answer", return_value="This is a mocked RAG answer.")
