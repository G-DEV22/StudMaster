import os
from dotenv import load_dotenv

# FIX: Load environment variables BEFORE defining Config class
# Load .env file from current directory first, then parent directories
env_loaded = load_dotenv(override=True)

# Log environment loading status for debugging
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

if env_loaded:
    logger.info("Successfully loaded .env file")
else:
    logger.warning("No .env file found, using system environment variables")

# Check if OpenRouter API key is available for debugging
api_key = os.getenv("OPENROUTER_API_KEY")
if api_key:
    if api_key == "your_openrouter_api_key_here":
        logger.error("OpenRouter API key is still set to placeholder value")
    else:
        logger.info("OpenRouter API key is configured")
else:
    logger.error("OPENROUTER_API_KEY environment variable not found")

class Config:
    # FIX: Access environment variables AFTER load_dotenv() is called
    OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
    OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.1-8b-instruct:free")
    SESSION_EXPIRE_MINUTES = int(os.getenv("SESSION_EXPIRE_MINUTES", 30))
    
    # School subjects mapping
    SCHOOL_SUBJECTS = {
        "6-8": ["Mathematics", "Science", "English", "Social Studies", "Hindi"],
        "9-10": ["Mathematics", "Science", "English", "Social Science", "Hindi", "Sanskrit"],
        "11-12_science": ["Physics", "Chemistry", "Mathematics", "Biology", "English", "Computer Science"],
        "11-12_commerce": ["Accountancy", "Business Studies", "Economics", "Mathematics", "English"],
        "11-12_arts": ["History", "Political Science", "Geography", "Economics", "Psychology", "English"]
    }
    
    # College courses
    COLLEGE_COURSES = [
        "MBBS", "BDS", "CSE", "IT", "ECE", "EEE", "Mechanical", "Civil",
        "Biotechnology", "Biomedical", "Pharmacy", "Nursing", "BBA", "BCA"
    ]
    
    # Competitive exams
    COMPETITIVE_EXAMS = [
        "JEE Mains", "JEE Advanced", "NEET", "CUET", "UPSC Prelims",
        "GATE", "CAT", "SAT", "GRE", "GMAT"
    ]