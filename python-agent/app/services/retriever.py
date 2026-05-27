# app/services/retriever.py
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Filter, FieldCondition, MatchValue,
    VectorParams, Distance, PointStruct
)
from langchain_openai import OpenAIEmbeddings
from ..core.config import settings
import uuid

# Initialize once at module level — not per request
embeddings = OpenAIEmbeddings(
    model="text-embedding-3-small",
    openai_api_key=settings.OPENAI_API_KEY
)
# text-embedding-3-small: 1536 dimensions
# Converts text to a vector of 1536 numbers
# Similar texts get similar vectors
# That's how semantic search works

client = QdrantClient(
    url=settings.QDRANT_URL,
    api_key=settings.QDRANT_API_KEY
)

COLLECTION = "knowledge_base"

def ensure_collection_exists():
    """Create Qdrant collection if it doesn't exist yet"""
    collections = [c.name for c in client.get_collections().collections]
    
    if COLLECTION not in collections:
        client.create_collection(
            collection_name=COLLECTION,
            vectors_config=VectorParams(
                size=1536,
                # Must match embedding model dimensions
                # text-embedding-3-small = 1536
                # text-embedding-3-large = 3072
                
                distance=Distance.COSINE
                # Cosine similarity: measures angle between vectors
                # Best for semantic text search
                # 1.0 = identical meaning, 0.0 = completely unrelated
            )
        )
        print(f"[QDRANT] Created collection: {COLLECTION}")

def ingest_knowledge(id: str, title: str, content: str, category: str):
    """Store a KB entry in Qdrant as a searchable vector"""
    ensure_collection_exists()
    
    # Create embedding for the content
    full_text = f"{title}\n\n{content}"
    vector = embeddings.embed_query(full_text)
    # embed_query: single string → single vector (list of 1536 floats)
    
    client.upsert(
        collection_name=COLLECTION,
        points=[
            PointStruct(
                id=str(uuid.uuid4()),
                # Qdrant needs a UUID for each point
                vector=vector,
                payload={
                    "kb_id": id,
                    "title": title,
                    "text": full_text,
                    "category": category
                    # Payload = metadata stored alongside the vector
                    # Returned with search results
                    # Filterable — we filter by category
                }
            )
        ]
    )
    print(f"[QDRANT] Ingested KB entry: {title}")

def search_knowledge_base(query: str, category: str, limit: int = 3) -> list:
    """Search for relevant KB entries given a query and category"""
    ensure_collection_exists()
    
    # Embed the search query using the same model
    # Same model is critical — different models produce incompatible vector spaces
    query_vector = embeddings.embed_query(query)
    
    results = client.search(
        collection_name=COLLECTION,
        query_vector=query_vector,
        
        query_filter=Filter(
            must=[
                FieldCondition(
                    key="category",
                    match=MatchValue(value=category)
                )
            ]
        ),
        # Filter by category: Bug tickets only search Bug KB entries
        # This dramatically improves precision
        # Without filter: "billing issue" might match "bug in export feature"
        # With filter: "billing issue" only matches billing KB entries
        
        limit=limit,
        with_payload=True
        # Include the text and metadata in results
        # Without this, you only get vector IDs — useless for building context
    )
    
    return [
        {
            "title": hit.payload.get("title", ""),
            "text": hit.payload.get("text", ""),
            "score": round(hit.score, 3),
            "category": hit.payload.get("category", "")
        }
        for hit in results
        if hit.score > 0.5
        # Filter out low-relevance results
        # 0.5 = 50% cosine similarity — below this is usually noise
        # Adjust based on your KB quality — better KB can lower threshold
    ]