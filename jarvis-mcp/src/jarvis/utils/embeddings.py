"""Embeddings wrapper for semantic search.

Uses bge-large-en-v1.5 model for generating text embeddings.
"""


import numpy as np
from sentence_transformers import SentenceTransformer


class EmbeddingsWrapper:
    """Wrapper for sentence-transformers embeddings model."""

    MODEL_NAME = "BAAI/bge-large-en-v1.5"
    EMBEDDING_DIM = 1024

    def __init__(self, model_name: str = MODEL_NAME) -> None:
        """Initialize embeddings model.

        Args:
            model_name: Name of the sentence-transformers model to use.
        """
        self.model_name = model_name
        self._model: SentenceTransformer | None = None

    def _load_model(self) -> SentenceTransformer:
        """Lazy load the embeddings model.

        Returns:
            Loaded SentenceTransformer model.
        """
        if self._model is None:
            self._model = SentenceTransformer(self.model_name)
        return self._model

    def generate_embedding(self, text: str) -> list[float]:
        """Generate embedding for a single text.

        Args:
            text: Text to embed.

        Returns:
            Embedding vector as list of floats.
        """
        model = self._load_model()
        embedding = model.encode(text, convert_to_numpy=True)

        # Convert numpy array to list
        if isinstance(embedding, np.ndarray):
            return embedding.tolist()

        return list(embedding)

    def batch_embed(self, texts: list[str], batch_size: int = 32) -> list[list[float]]:
        """Generate embeddings for multiple texts in batches.

        Args:
            texts: List of texts to embed.
            batch_size: Batch size for encoding.

        Returns:
            List of embedding vectors.
        """
        if not texts:
            return []

        model = self._load_model()
        embeddings = model.encode(
            texts, batch_size=batch_size, convert_to_numpy=True, show_progress_bar=False
        )

        # Convert numpy arrays to lists
        if isinstance(embeddings, np.ndarray):
            return embeddings.tolist()

        return [emb.tolist() if isinstance(emb, np.ndarray) else list(emb) for emb in embeddings]

    def get_embedding_dim(self) -> int:
        """Get dimension of embeddings.

        Returns:
            Embedding dimension.
        """
        return self.EMBEDDING_DIM

    def chunk_text(self, text: str, max_words: int = 1000, overlap: int = 100) -> list[str]:
        """Chunk long text into smaller pieces for embedding.

        Args:
            text: Text to chunk.
            max_words: Maximum words per chunk.
            overlap: Number of overlapping words between chunks.

        Returns:
            List of text chunks.
        """
        words = text.split()

        if len(words) <= max_words:
            return [text]

        chunks = []
        start = 0

        while start < len(words):
            end = min(start + max_words, len(words))
            chunk_words = words[start:end]
            chunks.append(" ".join(chunk_words))

            # Move start forward, accounting for overlap
            if end >= len(words):
                break
            start += max_words - overlap

        return chunks


# Global instance for reuse
_embeddings_instance: EmbeddingsWrapper | None = None


def get_embeddings() -> EmbeddingsWrapper:
    """Get global embeddings instance.

    Returns:
        Global EmbeddingsWrapper instance.
    """
    global _embeddings_instance
    if _embeddings_instance is None:
        _embeddings_instance = EmbeddingsWrapper()
    return _embeddings_instance


def generate_embedding(text: str) -> list[float]:
    """Convenience function to generate single embedding.

    Args:
        text: Text to embed.

    Returns:
        Embedding vector.
    """
    embeddings = get_embeddings()
    return embeddings.generate_embedding(text)


def batch_embed(texts: list[str], batch_size: int = 32) -> list[list[float]]:
    """Convenience function to generate multiple embeddings.

    Args:
        texts: List of texts to embed.
        batch_size: Batch size for encoding.

    Returns:
        List of embedding vectors.
    """
    embeddings = get_embeddings()
    return embeddings.batch_embed(texts, batch_size)
