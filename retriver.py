import os
from dotenv import load_dotenv
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from typing import Optional, Dict, Any

# Load environment variables once at the module level
load_dotenv()

# --- Configuration Constants ---
# Default path to the persistent FAISS index directory, relative to this script's location
_DEFAULT_FAISS_INDEX_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "db1", "faiss_index"
)
# Default model for HuggingFace Embeddings (must match your indexing script)
_DEFAULT_HF_EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
# Default LLM for Google Generative AI
_DEFAULT_GEMINI_LLM_MODEL = "gemini-2.5-flash"


def initialize_rag_chatbot(
    faiss_index_path: str = _DEFAULT_FAISS_INDEX_DIR,
    hf_embedding_model_name: str = _DEFAULT_HF_EMBEDDING_MODEL_NAME,
    gemini_llm_model_name: str = _DEFAULT_GEMINI_LLM_MODEL,
    temperature: float = 0.3,
    top_k_retrieval: int = 4,
    google_api_key: Optional[str] = None # Allow explicit API key or env var
) -> RetrievalQA:
    """
    Initializes and returns a RetrievalQA chain for a RAG chatbot.

    Args:
        faiss_index_path (str): The absolute or relative path to the FAISS index directory.
        hf_embedding_model_name (str): The name of the HuggingFace embedding model
                                       used for both indexing and retrieval.
        gemini_llm_model_name (str): The name of the Google Generative AI model to use (e.g., "gemini-pro").
        temperature (float): The temperature for the LLM (0.0 to 1.0). Higher values mean more creative.
        top_k_retrieval (int): The number of top relevant documents to retrieve from the vector store.
        google_api_key (Optional[str]): Your Google API key. If None, it will be fetched from
                                       the GOOGLE_API_KEY environment variable.

    Returns:
        RetrievalQA: An initialized LangChain RetrievalQA chain.

    Raises:
        FileNotFoundError: If the FAISS index is not found at the specified path.
        ValueError: If GOOGLE_API_KEY is not provided or found in environment variables.
    """

    # --- 1. Load Embeddings Model ---
    print(f"Loading HuggingFace Embeddings model: {hf_embedding_model_name}...")
    try:
        embedding_model = HuggingFaceEmbeddings(model_name=hf_embedding_model_name)
    except Exception as e:
        print(f"Error loading HuggingFace Embeddings model: {e}")
        print("Please ensure 'sentence-transformers' library is installed and model name is correct.")
        raise
    print("HuggingFace Embeddings model loaded.")

    # --- 2. Load FAISS Vector Store ---
    faiss_index_file = os.path.join(faiss_index_path, "index.faiss")
    if not os.path.exists(faiss_index_file):
        raise FileNotFoundError(
            f"FAISS index file not found at {faiss_index_file}. "
            "Please ensure your chunking script has run and the path is correct."
        )
    print(f"Loading FAISS index from {faiss_index_path}...")
    vector_store = FAISS.load_local(faiss_index_path, embedding_model, allow_dangerous_deserialization=True)
    print("FAISS index loaded successfully.")

    # --- 3. Initialize Google Generative AI Chat Model ---
    if google_api_key is None:
        google_api_key = os.getenv("GEMINI_API_KEY")

    if not google_api_key:
        raise ValueError(
            "GOOGLE_API_KEY not provided and not found in environment variables. "
            "Please set the GOOGLE_API_KEY environment variable or pass it directly."
        )

    print(f"Initializing Google Generative AI ({gemini_llm_model_name})...")
    llm = ChatGoogleGenerativeAI(model=gemini_llm_model_name, temperature=temperature, google_api_key=google_api_key)
    print("Google Generative AI model initialized.")

    # --- 4. Define Prompt Template ---
    prompt_template = """
You are a helpful and informative chatbot designed for disaster management assistance.
Use the following context to answer the user's question comprehensively and accurately.
If the context does not contain the answer, just state that you don't have enough information from the provided context, and do not try to make up an answer.

Context:
{context}

Question: {question}

Helpful Answer:
"""
    PROMPT = PromptTemplate(
        template=prompt_template, input_variables=["context", "question"]
    )

    # --- 5. Create RetrievalQA Chain ---
    print("Creating RAG RetrievalQA chain...")
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=vector_store.as_retriever(search_kwargs={"k": top_k_retrieval}),
        return_source_documents=True,
        chain_type_kwargs={"prompt": PROMPT}
    )
    print("RAG RetrievalQA chain created.")

    return qa_chain


if __name__ == "__main__":
    # --- Example Usage (when run directly) ---
    print("--- Initializing RAG Chatbot (Standalone Test) ---")
    try:
        # Initialize the chatbot (using default paths/models or your custom ones)
        rag_chain = initialize_rag_chatbot(
            
        )
        print("\n--- RAG Chatbot Ready ---")
        print("Enter your queries. Type 'exit' to quit.")

        while True:
            user_query = input("\nUser: ")
            if user_query.lower() == 'exit':
                print("Exiting chatbot. Goodbye!")
                break

            print("Chatbot: Thinking...")
            try:
                result = rag_chain.invoke({"query": user_query})
                print(f"\nChatbot: {result['result']}")
                
                # Optional: Print source documents for transparency
                print("\n--- Source Documents Used ---")
                for i, doc in enumerate(result['source_documents']):
                    source = doc.metadata.get('source', 'Unknown File')
                    page_content_preview = doc.page_content.replace('\n', ' ')[:150] + "..." if len(doc.page_content) > 150 else doc.page_content.replace('\n', ' ')
                    print(f"  {i+1}. Source: {source}\n     Content: \"{page_content_preview}\"\n")
                print("----------------------------")


            except Exception as e:
                print(f"An error occurred during query: {e}")
                print("Please ensure your GOOGLE_API_KEY is correctly set and you have sufficient quota.")

    except Exception as e:
        print(f"\n--- Chatbot Initialization Failed ---")
        print(f"Error: {e}")
        print("Please check your FAISS index path, API key, and environment setup.")