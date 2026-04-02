import asyncio
from llm.gemini_client import gemini_client

async def test_gemini():
    try:
        print("Testing generate...")
        res = await gemini_client.generate("Hello, say 'Test'")
        print("Generate success:", res)
    except Exception as e:
        print("Generate failed:", e)
        
    try:
        print("Testing embed...")
        embed = await gemini_client.embed("Test embedding")
        print("Embed success, length:", len(embed))
    except Exception as e:
        print("Embed failed:", e)

if __name__ == "__main__":
    asyncio.run(test_gemini())
