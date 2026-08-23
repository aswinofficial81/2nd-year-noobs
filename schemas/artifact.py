from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Any, Dict

class NormalizedMessage(BaseModel):
    role: str # "user", "assistant", etc.
    content: str

class StandardArtifact(BaseModel):
    id: str = Field(..., description="Unique identifier or hash of the artifact")
    type: Literal["doc", "chat", "pdf"]
    title: Optional[str] = None
    raw_content: str
    normalized_messages: Optional[List[NormalizedMessage]] = None
    summary_line: Optional[str] = None
