import os
from dotenv import load_dotenv
from llama_parse import LlamaParse


load_dotenv()


llama_parse = LlamaParse(result_type="markdown")


current_dir = os.path.dirname(os.path.abspath(__file__))
pdf_files_directory = os.path.join(current_dir, "pdf_files")
text_files_directory = os.path.join(current_dir, "text_files")

os.makedirs(text_files_directory, exist_ok=True)


pdf_files = [f for f in os.listdir(pdf_files_directory) if f.endswith(".pdf")]
extracted_files = {f for f in os.listdir(text_files_directory) if f.endswith(".txt")}

print(f"Already extracted files: {extracted_files}")

for pdf_file in pdf_files:
    txt_filename = os.path.splitext(pdf_file)[0] + ".txt"

    
    if txt_filename in extracted_files:
        print(f"Skipping {pdf_file}, already extracted.")
        continue

    pdf_path = os.path.join(pdf_files_directory, pdf_file)
    txt_path = os.path.join(text_files_directory, txt_filename)
    
    print(f"Extracting text from {pdf_file} using LlamaParse...")

    
    try:
        parsed_docs = llama_parse.load_data(pdf_path)
        extracted_text = " ".join([doc.text for doc in parsed_docs])

        # here we don't need to write the tables to the text file as the llama_parse handels that
        with open(txt_path, "w", encoding="utf-8") as file:
            file.write(extracted_text)

        print(f"Extraction complete! Saved to {txt_path}")

    except Exception as e:
        print(f"Error processing {pdf_file}: {e}")

print("All PDFs processed.")
