from pydantic import BaseModel, Field, validator
from typing import List, Optional, Literal
from datetime import datetime

class TestConfig(BaseModel):
    domain: Literal["school", "college", "competitive"]
    
    # School fields
    class_level: Optional[int] = Field(None, ge=6, le=12)
    subject: Optional[str] = None
    
    # College fields
    course: Optional[str] = None
    semester: Optional[int] = Field(None, ge=1, le=8)
    
    # Competitive fields
    exam: Optional[str] = None
    
    # Common fields
    topic: str = Field(..., min_length=1, max_length=100)
    num_questions: int = Field(..., ge=5, le=20)
    
    @validator('subject', always=True)
    def validate_subject(cls, v, values):
        if values.get('domain') == 'school' and not v:
            raise ValueError('Subject is required for school domain')
        return v
    
    @validator('course', always=True)
    def validate_course(cls, v, values):
        if values.get('domain') == 'college' and not v:
            raise ValueError('Course is required for college domain')
        return v
    
    @validator('exam', always=True)
    def validate_exam(cls, v, values):
        if values.get('domain') == 'competitive' and not v:
            raise ValueError('Exam is required for competitive domain')
        return v

class Question(BaseModel):
    question: str
    options: List[str]
    correct_answer: str
    
    @validator('options')
    def validate_options(cls, v):
        if len(v) != 4:
            raise ValueError('Exactly 4 options are required')
        return v
    
    @validator('correct_answer')
    def validate_correct_answer(cls, v, values):
        if 'options' in values and v not in values['options']:
            raise ValueError('Correct answer must be one of the options')
        return v

class TestSession(BaseModel):
    session_id: str
    config: TestConfig
    questions: List[Question]
    user_answers: List[Optional[str]] = []
    created_at: datetime
    submitted: bool = False