# module/vector_memory.py
from qdrant_client import QdrantClient
from qdrant_client.http import models
import uuid
import numpy as np

class BioMemory:
    def __init__(self):
        try:
            # Connect to local Qdrant container
            self.client = QdrantClient(url="http://localhost:6333") 
            self.collection_name = "dna_knowledge_base"
            
            # Initialize collection if it doesn't exist
            if not self.client.collection_exists(self.collection_name):
                print(f"Creating new vector collection: {self.collection_name}")
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=models.VectorParams(
                        size=768, 
                        distance=models.Distance.COSINE
                    )
                )
            print("Vector Database Connected.")
        except Exception as e:
            print(f"VECTOR DB WARNING: Could not connect to Qdrant at localhost:6333. Vector Space features will be disabled. Error: {e}")
            self.client = None

    def add_knowledge(self, sequences, embeddings, species_labels):
        """Stores vectors + metadata (species name)"""
        if not self.client:
            return False

        try:
            points = []
            for i, seq in enumerate(sequences):
                vector = embeddings[i].tolist() if hasattr(embeddings[i], 'tolist') else embeddings[i]
                
                points.append(models.PointStruct(
                    id=str(uuid.uuid4()),
                    vector=vector,
                    payload={
                        "sequence": str(seq),
                        "species": str(species_labels[i]),
                        "source": "user_upload"
                    }
                ))
            
            # Upsert in batches
            self.client.upsert(
                collection_name=self.collection_name,
                points=points
            )
            print(f"VectorDb: Successfully stored {len(points)} new sequences.")
            return True
        except Exception as e:
            print(f"VectorDb Error adding knowledge: {e}")
            return False

    def search(self, query_embedding, top_k=1):
        """Finds similar DNA sequences in the database"""
        if not self.client:
            return []

        try:
            vector = query_embedding.tolist() if hasattr(query_embedding, 'tolist') else query_embedding

            results = self.client.search(
                collection_name=self.collection_name,
                query_vector=vector,
                limit=top_k
            )
            
            matches = []
            for r in results:
                matches.append({
                    "species": r.payload.get('species', 'Unknown'),
                    "score": r.score,
                    "sequence_snippet": r.payload.get('sequence', '')[:30] + "..."
                })
            return matches
        except Exception as e:
            print(f"Vector Search Error: {e}")
            return []