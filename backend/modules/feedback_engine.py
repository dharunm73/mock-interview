import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def generate_interview_report(session_history, candidate_profile):
    """
    Generates a weighted score report:
    - Technical Accuracy (70%)
    - Confidence/Communication (30%)
    """
    
    conversation_text = ""
    for msg in session_history:
        role = "Interviewer" if msg["role"] == "assistant" else "Candidate"
        conversation_text += f"{role}: {msg['content']}\n\n"

    # Updated Prompt for Weighted Scoring
    prompt = f"""
    You are an Expert Technical Interviewer. Grade this interview based on two criteria.

    1. TECHNICAL ACCURACY (0-100): Are the answers correct, deep, and precise?
    2. CONFIDENCE & COMMUNICATION (0-100): Is the candidate clear? Do they use filler words (um, uh) excessively? Do they sound unsure?

    CANDIDATE PROFILE:
    {json.dumps(candidate_profile, indent=2)}

    TRANSCRIPT:
    {conversation_text}

    ---
    RETURN JSON ONLY:
    {{
        "technical_score": (0-100),
        "confidence_score": (0-100),
        "strengths": ["List of 3"],
        "weaknesses": ["List of 3"],
        "summary": "Short summary of performance"
    }}
    """

    try:
        response = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.3,
            response_format={"type": "json_object"}
        )
        
        data = json.loads(response.choices[0].message.content)
        
        # --- THE FORMULA ---
        tech = data.get("technical_score", 0)
        conf = data.get("confidence_score", 0)
        
        # Calculate Weighted Final Score
        final_score = round((tech * 0.7) + (conf * 0.3))
        
        # Determine Verdict
        if final_score >= 85: verdict = "Strong Hire"
        elif final_score >= 70: verdict = "Hire"
        elif final_score >= 50: verdict = "Consider"
        else: verdict = "No Hire"

        # Construct Final Report
        report = {
            "score": final_score,
            "technical_score": tech,
            "confidence_score": conf,
            "verdict": verdict,
            "strengths": data.get("strengths", []),
            "weaknesses": data.get("weaknesses", []),
            "summary": data.get("summary", "No summary available.")
        }
        
        return report

    except Exception as e:
        print(f"❌ Report Error: {e}")
        return {"error": "Could not generate report"}