from sqlalchemy import Column, String, JSON, Integer, Text, ForeignKey, Table
from pgvector.sqlalchemy import Vector
from database import Base
from sqlalchemy.orm import relationship

# Association table for many-to-many relationship between Topics and Blobs
topic_blob_association = Table(
    'topic_blob', Base.metadata,
    Column('topic_id', Integer, ForeignKey('topics.id')),
    Column('blob_id', String, ForeignKey('artifacts.id'))
)

class Artifact(Base):
    __tablename__ = 'artifacts'

    id = Column(String, primary_key=True, index=True) # Will store the UUID or blob_id
    type = Column(String, index=True) # doc | chat | pdf
    title = Column(String)
    raw_content = Column(Text)
    normalized_messages = Column(JSON, nullable=True) # For chats
    summary_line = Column(Text, nullable=True)

    chunks = relationship("Chunk", back_populates="artifact")
    topics = relationship("Topic", secondary=topic_blob_association, back_populates="artifacts")

class Chunk(Base):
    __tablename__ = 'chunks'

    id = Column(Integer, primary_key=True, autoincrement=True)
    artifact_id = Column(String, ForeignKey('artifacts.id'), index=True)
    content = Column(Text)
    embedding = Column(Vector(768)) # text-embedding-004 uses 768 dimensions

    artifact = relationship("Artifact", back_populates="chunks")

class Topic(Base):
    __tablename__ = 'topics'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, unique=True, index=True)

    artifacts = relationship("Artifact", secondary=topic_blob_association, back_populates="topics")
