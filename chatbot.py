from fastapi import FastAPI
from retriver import initialize_rag_chatbot

app = FastAPI()

@app.post("/chat")
def chat_endpoint(query: str):
    try:
        # Initialize the chatbot (using default paths/models or your custom ones)
        rag_chain = initialize_rag_chatbot()
        result = rag_chain.invoke({"query": query})

        return {"response": result["result"], "sources": [doc.metadata for doc in result["source_documents"]]}
    except Exception as e:
        print(f"Error occurred: {e}")
        return {"error": str(e)}