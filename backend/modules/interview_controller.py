import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

class InterviewSession:
    def __init__(self, session_id, profile):
        self.session_id = session_id
        self.profile = profile
        self.history = []
        self.question_count = 0  # <--- New Counter
        self.max_questions = 15  # <--- Limit

    def generate_next_question(self, user_answer=None):
        # 1. Check Limit
        if self.question_count >= self.max_questions:
            return None  # Signal that interview is over

        # 2. Add User Answer to History
        if user_answer:
            self.history.append({"role": "user", "content": user_answer})

        # 3. Construct Context for AI
        system_prompt = f"""
        You are a Technical Interviewer. 
        Candidate Profile: {self.profile}
        
        Current Question #{self.question_count + 1} of {self.max_questions}.
        
        GOAL: Ask a relevant follow-up question based on the candidate's previous answer.
        - If the answer was weak, ask for clarification.
        - If the answer was strong, ask a harder concept.
        - Keep questions short (1-2 sentences).
        """
        
        messages = [{"role": "system", "content": system_prompt}] + self.history

        # 4. Generate Question
        chat_completion = client.chat.completions.create(
            messages=messages,
            model="llama-3.3-70b-versatile",
            temperature=0.6,
        )
        
        next_question = chat_completion.choices[0].message.content
        
        # 5. Update History & Counter
        self.history.append({"role": "assistant", "content": next_question})
        self.question_count += 1  # <--- Increment
        
        return next_question

# In-memory storage
sessions = {}

def create_session(profile):
    import uuid
    session_id = str(uuid.uuid4())
    session = InterviewSession(session_id, profile)
    sessions[session_id] = session
    return session_id, session

def get_session(session_id):
    return sessions.get(session_id)