import uuid
import time
from typing import Dict, Optional, List
from datetime import datetime, timedelta
from app.models import TestSession, TestConfig, Question

class SessionManager:
    def __init__(self, expire_minutes: int = 30):
        self.sessions: Dict[str, TestSession] = {}
        self.expire_minutes = expire_minutes
    
    def create_session(self, config: TestConfig, questions: List[Question]) -> str:
        session_id = str(uuid.uuid4())
        self.sessions[session_id] = TestSession(
            session_id=session_id,
            config=config,
            questions=questions,
            user_answers=[None] * len(questions),
            created_at=datetime.now(),
            submitted=False
        )
        self._cleanup_old_sessions()
        return session_id
    
    def get_session(self, session_id: str) -> Optional[TestSession]:
        self._cleanup_old_sessions()
        return self.sessions.get(session_id)
    
    def update_answer(self, session_id: str, question_index: int, answer: str) -> bool:
        session = self.get_session(session_id)
        if not session or session.submitted:
            return False
        
        if 0 <= question_index < len(session.questions):
            if answer in session.questions[question_index].options:
                session.user_answers[question_index] = answer
                return True
        return False
    
    def submit_test(self, session_id: str) -> Optional[TestSession]:
        session = self.get_session(session_id)
        if session and not session.submitted:
            session.submitted = True
            return session
        return None
    
    def _cleanup_old_sessions(self):
        current_time = datetime.now()
        expired_sessions = []
        
        for session_id, session in self.sessions.items():
            if current_time - session.created_at > timedelta(minutes=self.expire_minutes):
                expired_sessions.append(session_id)
        
        for session_id in expired_sessions:
            del self.sessions[session_id]

# Global session manager instance
session_manager = SessionManager()