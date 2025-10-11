import os
import json
from langchain_experimental.text_splitter import SemanticChunker
from langchain_community.document_loaders import TextLoader
from langchain_community.vectorstores import FAISS  
from langchain_community.embeddings import HuggingFaceEmbeddings
from dotenv import load_dotenv

load_dotenv()

current_dir = os.path.dirname(os.path.abspath(__file__))  # Get the current directory

# Path to the text files directory
text_files_directory = os.path.join(current_dir, "text_files")

# Persistent directory for FAISS index
persistent_directory = os.path.join(current_dir, "db1", "faiss_index")

# Metadata file to track processed files
metadata_file = os.path.join(persistent_directory, "processed_files.json")

# Ensure that the text files directory exists
if not os.path.exists(text_files_directory):
    raise FileNotFoundError(f"Text files directory not found: {text_files_directory}")

# List all .txt files in the directory
text_files = [f for f in os.listdir(text_files_directory) if f.endswith(".txt")]

if not text_files:
    raise FileNotFoundError(f"No text files found in {text_files_directory}")

# Load metadata (if exists)
if os.path.exists(metadata_file):
    with open(metadata_file, "r") as f:
        processed_files = set(json.load(f))
else:
    processed_files = set()

# Identify new files to process
new_files = [f for f in text_files if f not in processed_files]

if not new_files:
    print("No new files to process. Vector store is up to date.")
else:
    print(f"Found {len(new_files)} new files. Processing...\n")
    
    all_docs = []  # List to store all new document chunks

    # Load sentence transformer embeddings for chunking
    chunking_embedding_model = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

    # Initialize the semantic chunker
    semantic_splitter = SemanticChunker(chunking_embedding_model)

    for file_name in new_files:
        file_path = os.path.join(text_files_directory, file_name)
        print(f"Processing file: {file_name}")

        # Load document
        loader = TextLoader(file_path, encoding="utf-8")
        documents = loader.load()
        
        # Chunking the document using Semantic Chunker
        docs = semantic_splitter.split_documents(documents)
        
        print(f"Chunked {file_name} into {len(docs)} semantic parts.\n")

        # Display first 3 chunks for each file
        for i in range(min(3, len(docs))):
            print(f"Chunk {i+1},:-{docs[i].metadata} {docs[i].page_content}")
            print(f"*********** End of Chunk {i+1} ***********\n")

        all_docs.extend(docs)  # Collect all chunks

    # Create embedding model for FAISS indexing
    print("\n---- Creating Embeddings ----")
    embedding_model = chunking_embedding_model

    # Load existing FAISS index or create a new one
    if os.path.exists(os.path.join(persistent_directory, "index.faiss")):
        vector_store = FAISS.load_local(persistent_directory, embedding_model, allow_dangerous_deserialization=True)
        vector_store.add_documents(all_docs)
    else:
        vector_store = FAISS.from_documents(all_docs, embedding_model)

    # Save updated FAISS index
    vector_store.save_local(persistent_directory)
    
    # Update metadata file with newly processed files
    processed_files.update(new_files)
    with open(metadata_file, "w") as f:
        json.dump(list(processed_files), f)

    print(f"FAISS index updated successfully at {persistent_directory}")
