import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

# Initialize Groq Client
api_key = os.getenv("GROQ_API_KEY")
client = Groq(api_key=api_key) if api_key else None

def transcribe_audio(file_path):
    """
    Transcribes audio using Groq's Whisper API.
    Fast (Sub-second), reliable, and requires NO GPU setup.
    """
    if not client:
        print("❌ Error: GROQ_API_KEY not found.")
        return "Error: API Key Missing"

    print(f"🎤 Sending {file_path} to Groq Whisper...")
    
    try:
        with open(file_path, "rb") as file:
            # 'whisper-large-v3' is the most accurate model on Groq
            transcription = client.audio.transcriptions.create(
                file=(file_path, file.read()),
                model="whisper-large-v3", 
                response_format="json",
                language="en",
                temperature=0.0 
            )
            
        text = transcription.text
        print(f"✅ Transcription: {text}")
        return text
        
    except Exception as e:
        print(f"❌ Groq Transcription Error: {e}")
        return "Error: Could not transcribe audio."