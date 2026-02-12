import os
import json
import re
from pypdf import PdfReader
from io import BytesIO
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

def extract_text_from_pdf(file_bytes):
    """
    Extracts raw text from a PDF file in memory.
    """
    try:
        reader = PdfReader(BytesIO(file_bytes))
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        return text
    except Exception as e:
        print(f"❌ Error reading PDF: {e}")
        return None

def parse_resume_with_ai(resume_text):
    """
    Sends the raw resume text to Groq (Llama-3.3) to structure it.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("❌ Error: GROQ_API_KEY not found in .env")
        return {"error": "API Key Missing"}

    client = Groq(api_key=api_key)

    # We truncate to 30k chars to be safe, though Llama 3.3 can handle much more.
    prompt = f"""
    You are an AI Resume Parser. Extract details from the text below into strict JSON format.
    
    RESUME TEXT:
    {resume_text[:30000]}
    
    OUTPUT FORMAT (JSON ONLY):
    {{
      "full_name": "Name",
      "email": "email",
      "years_of_experience": 2,
      "technical_skills": ["Skill1", "Skill2"],
      "soft_skills": ["Skill1", "Skill2"],
      "primary_domain": "e.g. Frontend, Backend, Data Science",
      "projects": [
        {{
          "title": "Project Name",
          "description": "Short summary"
        }}
      ]
    }}
    
    Do not add conversational text. Return ONLY the JSON.
    """

    try:
        print("⏳ Sending resume to Groq (Llama-3.3)...")
        response = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile", # <--- Best model for JSON
            temperature=0, # Deterministic (consistent results)
            response_format={"type": "json_object"} # Force valid JSON
        )
        
        # Parse the JSON response
        json_str = response.choices[0].message.content
        print("✅ Resume Parsed Successfully!")
        return json.loads(json_str)
        
    except Exception as e:
        print(f"❌ Groq Parsing Error: {e}")
        return {"error": "Failed to parse resume"}