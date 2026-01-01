from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import ValidationError
import logging
from typing import Dict, Any

from app.models import TestConfig
from app.ai_generator import ai_generator
from app.session_manager import session_manager
from app.config import Config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Exam Practice App", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(ValidationError)
async def validation_exception_handler(request: Request, exc: ValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()}
    )

@app.get("/")
async def root():
    return {"message": "Exam Practice API", "status": "running"}

@app.get("/config/options")
async def get_config_options():
    return {
        "school_subjects": Config.SCHOOL_SUBJECTS,
        "college_courses": Config.COLLEGE_COURSES,
        "competitive_exams": Config.COMPETITIVE_EXAMS
    }

@app.post("/generate-test")
async def generate_test(config_data: Dict[str, Any]):
    try:
        # Validate input data
        config = TestConfig(**config_data)
        logger.info(f"Generating test for: {config.domain}, topic: {config.topic}")
        
        # Generate questions using AI
        try:
            questions = await ai_generator.generate_questions(config)
        except ValueError as e:
            # FIX: Catch AI generation errors and provide user-friendly message
            logger.error(f"AI generation failed: {e}")
            raise HTTPException(
                status_code=503,
                detail=f"AI question generation failed: {str(e)}. Please check your API key and try again."
            )
        
        if len(questions) < 5:
            # FIX: Ensure minimum questions requirement
            raise HTTPException(
                status_code=503,
                detail=f"Could only generate {len(questions)} valid questions. Need at least 5. Please try again with a different topic."
            )
        
        if len(questions) < config.num_questions:
            logger.info(f"Generated {len(questions)} questions (requested {config.num_questions})")
        
        # Create session
        session_id = session_manager.create_session(config, questions)
        logger.info(f"Created session: {session_id} with {len(questions)} questions")
        
        return {
            "session_id": session_id,
            "num_questions": len(questions),
            "config": config.dict()
        }
    
    except ValidationError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=422, detail=str(e))
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # FIX: Catch all other exceptions and provide detailed logging
        logger.error(f"Unexpected error in generate-test: {type(e).__name__}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {type(e).__name__}. Check server logs for details."
        )

@app.get("/question/{session_id}/{question_index}")
async def get_question(session_id: str, question_index: int):
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    
    if question_index < 0 or question_index >= len(session.questions):
        raise HTTPException(status_code=400, detail="Invalid question index")
    
    question = session.questions[question_index]
    return {
        "question_index": question_index,
        "total_questions": len(session.questions),
        "question": question.question,
        "options": question.options,
        "user_answer": session.user_answers[question_index],
        "correct_answer": question.correct_answer  # FIX: Added correct_answer for frontend validation
    }

@app.post("/answer/{session_id}/{question_index}")
async def submit_answer(session_id: str, question_index: int, answer_data: Dict[str, str]):
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    
    if session.submitted:
        raise HTTPException(status_code=400, detail="Test already submitted")
    
    answer = answer_data.get("answer")
    if not answer:
        raise HTTPException(status_code=400, detail="Answer is required")
    
    success = session_manager.update_answer(session_id, question_index, answer)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid answer or question index")
    
    return {"success": True, "message": "Answer saved"}

@app.post("/submit/{session_id}")
async def submit_test(session_id: str):
    session = session_manager.submit_test(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found, expired, or already submitted")
    
    # Calculate score
    score = 0
    results = []
    
    for i, (question, user_answer) in enumerate(zip(session.questions, session.user_answers)):
        is_correct = user_answer == question.correct_answer
        if is_correct:
            score += 1
        
        results.append({
            "question_index": i,
            "question": question.question,
            "options": question.options,
            "user_answer": user_answer,
            "correct_answer": question.correct_answer,
            "is_correct": is_correct
        })
    
    percentage = (score / len(session.questions)) * 100
    
    return {
        "session_id": session_id,
        "score": score,
        "total": len(session.questions),
        "percentage": round(percentage, 2),
        "results": results,
        "config": session.config.dict()
    }

@app.get("/test-summary/{session_id}")
async def get_test_summary(session_id: str):
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    
    return {
        "session_id": session_id,
        "num_questions": len(session.questions),
        "num_answered": sum(1 for ans in session.user_answers if ans is not None),
        "submitted": session.submitted,
        "config": session.config.dict()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
