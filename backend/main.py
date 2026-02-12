import shutil
import os
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from modules.resume_parser import extract_text_from_pdf, parse_resume_with_ai
from modules.interview_controller import create_session, get_session
from modules.transcriber import transcribe_audio
from modules.feedback_engine import generate_interview_report

app = FastAPI(title="Multi-modal Interview Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Interview Agent API is running!"}

# --- 1. Start Interview (Resume -> Q1) ---
@app.post("/start-interview")
async def start_interview(file: UploadFile = File(...)):
    # A. Save & Parse Resume
    file_bytes = await file.read()
    raw_text = extract_text_from_pdf(file_bytes)
    
    if not raw_text:
        raise HTTPException(status_code=400, detail="Empty PDF")
        
    profile = parse_resume_with_ai(raw_text)
    
    # B. Initialize Session
    session_id, session = create_session(profile)
    
    # C. Generate First Question
    first_question = session.generate_next_question()
    
    return {
        "session_id": session_id,
        "profile": profile,
        "current_question": first_question
    }

# --- 2. Submit Answer (Audio -> Q2) ---
# ... inside main.py ...

@app.post("/submit-answer")
async def submit_answer(
    session_id: str = Form(...), 
    audio_file: UploadFile = File(...)
):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # 1. Transcribe
    temp_filename = f"temp_{session_id}.wav"
    with open(temp_filename, "wb") as buffer:
        shutil.copyfileobj(audio_file.file, buffer)

    user_text = transcribe_audio(temp_filename)
    
    # 2. Generate Next Question OR Stop
    next_question = session.generate_next_question(user_answer=user_text)

    # Cleanup audio
    if os.path.exists(temp_filename):
        os.remove(temp_filename)

    # 3. Check if Interview is Over (Limit Reached)
    if next_question is None:
        return {
            "user_transcription": user_text,
            "ai_response": "Thank you. The interview is now complete. Please click 'End Interview' to see your results.",
            "is_finished": True  # Flag for Frontend
        }

    return {
        "user_transcription": user_text,
        "ai_response": next_question,
        "is_finished": False
    }

@app.post("/end-interview")
async def end_interview(session_id: str = Form(...)):
    # 1. Retrieve the session
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # 2. Generate the Report using the new Feedback Engine
    # We pass the full conversation history + the candidate's resume profile
    report = generate_interview_report(session.history, session.profile)
    
    # 3. Return the report to the Frontend
    return {
        "message": "Interview Completed",
        "report": report
    }