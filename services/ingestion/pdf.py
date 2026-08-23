import io
import hashlib
from pypdf import PdfReader
from schemas.artifact import StandardArtifact

def parse_pdf(file_bytes: bytes, title: str = "Untitled PDF") -> StandardArtifact:
    """
    Extracts text from a PDF file using pypdf.
    """
    reader = PdfReader(io.BytesIO(file_bytes))
    extracted_text = ""
    for page in reader.pages:
        extracted_text += page.extract_text() + "\n\n"
        
    doc_id = hashlib.sha256(extracted_text.encode()).hexdigest()

    return StandardArtifact(
        id=doc_id,
        type="pdf",
        title=title,
        raw_content=extracted_text.strip()
    )
