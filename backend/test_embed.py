import asyncio
from core.config import settings
from llm.gemini_client import gemini_client

async def main():
    try:
        embeds = await gemini_client.embed("test text")
        print(f"Embedding dimensions: {len(embeds)}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
