"""
utils/text_chunker.py — Simple text splitting utility for RAG processing.
"""
from typing import List

def chunk_text(text: str, chunk_size: int = 1500, overlap: int = 300) -> List[str]:
    """
    Split text into overlapping chunks by character length.
    Ensures that context isn't hard-cut between adjoining chunks.
    
    Args:
        text: The raw input string
        chunk_size: Maximum characters per chunk
        overlap: How many characters to overlap with the previous chunk
        
    Returns:
        A list of string chunks.
    """
    if not text:
        return []
    
    text = text.strip()
    chunks = []
    
    start = 0
    text_length = len(text)
    
    while start < text_length:
        end = start + chunk_size
        
        # If we are not at the final chunk and there's a space nearby, try to break cleanly
        if end < text_length:
            # Try to find a newline or space within the last 150 characters to break cleanly
            clean_break = max(
                text.rfind('\n', start, end),
                text.rfind('. ', start, end),
                text.rfind(' ', start, end)
            )
            if clean_break > start + (chunk_size // 2):
                end = clean_break + 1  # include the space/newline
        
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
            
        # Move start pointer forward, stepping back by overlap
        start = end - overlap
        
        # Prevent infinite loop if overlap >= chunk_size or clean_break fails
        if start <= end - chunk_size:
            start = end
            
    return chunks
