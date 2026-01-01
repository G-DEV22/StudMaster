import json
import httpx
from typing import List
from app.config import Config
from app.models import Question, TestConfig
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AIGenerator:
    def __init__(self):
        self.api_key = Config.OPENROUTER_API_KEY
        self.base_url = Config.OPENROUTER_BASE_URL
        self.model = Config.OPENROUTER_MODEL
        
        # FIX: Log API key status for debugging (without exposing full key)
        if self.api_key:
            masked_key = self.api_key[:8] + "..." + self.api_key[-4:] if len(self.api_key) > 12 else "***"
            logger.info(f"OpenRouter API key loaded: {masked_key}")
            if self.api_key == "your_openrouter_api_key_here" or self.api_key.startswith("sk-or-"):
                logger.warning("API key appears to be placeholder or invalid format")
        else:
            logger.error("OpenRouter API key is None/empty")
    
    def build_prompt(self, config: TestConfig) -> str:
        if config.domain == "school":
            prompt = f"""Generate {config.num_questions} multiple choice questions (MCQs) for a {config.class_level}th grade student.
Subject: {config.subject}
Topic: {config.topic}

Requirements:
1. Each question must have exactly 4 options (A, B, C, D)
2. Questions should be appropriate for {config.class_level}th grade level
3. Mix conceptual and application-based questions
4. For each question, clearly indicate the correct answer

Return ONLY a valid JSON array with this exact structure:
[
  {{
    "question": "The question text here",
    "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
    "correct_answer": "The exact text of the correct option"
  }}
]"""
        
        elif config.domain == "college":
            prompt = f"""Generate {config.num_questions} multiple choice questions (MCQs) for {config.course} students in semester {config.semester}.
Topic: {config.topic}

Requirements:
1. Each question must have exactly 4 options (A, B, C, D)
2. Questions should be at appropriate college/semester level
3. Include both theoretical and practical questions
4. For each question, clearly indicate the correct answer

Return ONLY a valid JSON array with this exact structure:
[
  {{
    "question": "The question text here",
    "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
    "correct_answer": "The exact text of the correct option"
  }}
]"""
        
        else:  # competitive
            prompt = f"""Generate {config.num_questions} multiple choice questions (MCQs) for {config.exam} preparation.
Topic: {config.topic}

Requirements:
1. Each question must have exactly 4 options (A, B, C, D)
2. Questions should match the difficulty and pattern of {config.exam}
3. Include previous year question patterns if applicable
4. For each question, clearly indicate the correct answer

Return ONLY a valid JSON array with this exact structure:
[
  {{
    "question": "The question text here",
    "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
    "correct_answer": "The exact text of the correct option"
  }}
]"""
        
        return prompt
    
    async def generate_questions(self, config: TestConfig) -> List[Question]:
        # FIX: Better API key validation with clear error messages
        if not self.api_key:
            logger.error("OpenRouter API key is None/empty")
            raise ValueError("OpenRouter API key not configured. Please set OPENROUTER_API_KEY in .env file")
        
        if self.api_key == "your_openrouter_api_key_here":
            logger.error("OpenRouter API key is still set to placeholder value")
            raise ValueError("OpenRouter API key is not properly configured. Please update your .env file with a valid key")
        
        if len(self.api_key) < 20:
            logger.warning(f"OpenRouter API key seems too short: {len(self.api_key)} characters")
        
        prompt = self.build_prompt(config)
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:8000",
        }
        
        data = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are an expert educational content creator. Generate accurate, well-structured MCQs. Return ONLY valid JSON."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.7,
            "max_tokens": 4000
        }
        
        try:
            # FIX: Increased timeout and added connection error handling
            async with httpx.AsyncClient(timeout=60.0) as client:
                logger.info(f"Sending request to OpenRouter with model: {self.model}")
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=data
                )
                
                # FIX: Log response status for debugging
                logger.info(f"OpenRouter response status: {response.status_code}")
                
                if response.status_code == 200:
                    result = response.json()
                    
                    # FIX: Added validation for response structure
                    if "choices" not in result or len(result["choices"]) == 0:
                        logger.error("Invalid OpenRouter response: missing choices")
                        raise ValueError("Invalid response from AI service")
                    
                    content = result["choices"][0]["message"]["content"]
                    logger.info(f"Received AI response (first 200 chars): {content[:200]}...")
                    
                    # Clean the response to extract JSON
                    content = content.strip()
                    
                    # FIX: More robust JSON extraction
                    import re
                    json_match = re.search(r'\[.*\]', content, re.DOTALL)
                    if not json_match:
                        json_match = re.search(r'\{.*\}', content, re.DOTALL)
                    
                    if json_match:
                        content = json_match.group(0)
                    else:
                        # If no JSON found, try to parse the entire content
                        logger.warning("No JSON pattern found in AI response, attempting to parse entire content")
                    
                    # FIX: Added try-catch for JSON parsing
                    try:
                        questions_data = json.loads(content)
                    except json.JSONDecodeError as e:
                        logger.error(f"Failed to parse AI response as JSON: {e}")
                        logger.error(f"Problematic content: {content[:500]}")
                        raise ValueError(f"AI returned invalid JSON: {str(e)}")
                    
                    # FIX: Handle both array and object formats
                    if isinstance(questions_data, list):
                        questions_list = questions_data
                    elif isinstance(questions_data, dict) and "questions" in questions_data:
                        questions_list = questions_data["questions"]
                    else:
                        logger.error(f"Unexpected response format: {type(questions_data)}")
                        raise ValueError("AI returned unexpected response format")
                    
                    # Validate and convert to Question objects
                    questions = []
                    for i, q_data in enumerate(questions_list[:config.num_questions]):
                        try:
                            # FIX: Validate required fields before creating Question
                            if not all(key in q_data for key in ["question", "options", "correct_answer"]):
                                logger.warning(f"Question {i} missing required fields: {q_data}")
                                continue
                            
                            # FIX: Ensure options is a list with 4 items
                            if not isinstance(q_data["options"], list) or len(q_data["options"]) != 4:
                                logger.warning(f"Question {i} has invalid options format: {q_data['options']}")
                                continue
                            
                            # FIX: Ensure correct_answer is in options
                            if q_data["correct_answer"] not in q_data["options"]:
                                logger.warning(f"Question {i}: correct_answer not in options")
                                continue
                            
                            question = Question(**q_data)
                            questions.append(question)
                        except Exception as e:
                            logger.warning(f"Invalid question format at index {i}: {e}, data: {q_data}")
                            continue
                    
                    if len(questions) >= config.num_questions:
                        return questions[:config.num_questions]
                    elif len(questions) >= 5:
                        logger.info(f"AI generated {len(questions)} valid questions (requested {config.num_questions})")
                        return questions
                    else:
                        logger.error(f"AI returned insufficient valid questions: {len(questions)}")
                        raise ValueError(f"AI generated only {len(questions)} valid questions, need at least 5")
                
                else:
                    # FIX: Better error logging for API failures
                    error_msg = f"OpenRouter API error: {response.status_code}"
                    try:
                        error_detail = response.json()
                        error_msg += f" - {error_detail}"
                        logger.error(error_msg)
                    except:
                        error_msg += f" - {response.text[:200]}"
                        logger.error(error_msg)
                    raise ValueError(f"AI service error: {response.status_code}")
        
        except httpx.RequestError as e:
            # FIX: Handle network/connection errors
            logger.error(f"Network error connecting to OpenRouter: {e}")
            raise ValueError(f"Network error: {str(e)}")
        except ValueError as e:
            # FIX: Re-raise validation errors
            raise
        except Exception as e:
            # FIX: Catch-all for unexpected errors
            logger.error(f"Unexpected error in generate_questions: {type(e).__name__}: {e}")
            raise ValueError(f"Unexpected error: {str(e)}")

# Global AI generator instance
ai_generator = AIGenerator()