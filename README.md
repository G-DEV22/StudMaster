# 🚀 StudMaster

StudMaster is an AI-powered practice test web application designed to help students prepare effectively for academic subjects and competitive examinations. It provides a clean, modern, and distraction-free interface with dynamically generated questions based on user input — no login or profile required.

---

## ✨ Features

* 🧠 **AI-Generated Practice Tests**
  Questions are generated in real time using an AI model based on the topic and number of questions selected by the user.

* 🎓 **Multiple Learning Domains**

  * School (Classes 6–12)
  * College (Course, semester, topic-based)
  * Competitive Exams (JEE, NEET, CUET, etc.)

* ⚙️ **Fully Dynamic**
  No predefined questions. Every test is generated fresh using AI.

* 🧪 **Real Exam Interface**

  * One question at a time
  * MCQ format with four options
  * Progress bar and timer
  * Exit Test button to return to home anytime

* 🎨 **Smooth UI & Animations**
  Includes a fade-in animation when the site loads for a polished user experience.

* 🔓 **No Login Required**
  Students can start practicing instantly without creating an account.

---

## 🛠 Tech Stack

### Backend

* **FastAPI** (Python)
* OpenRouter API (AI question generation)
* Environment-based configuration using `.env`

### Frontend

* HTML
* CSS
* Vanilla JavaScript

---

## 📁 Project Structure

```
StudMaster/
│
├── backend/
│   ├── app/
│   │   ├── ai_generator.py
│   │   ├── config.py
│   │   ├── main.py
│   │   ├── models.py
│   │   └── session_manager.py
│   ├── .env.example
│   ├── requirements.txt
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   ├── test.html
│   ├── test.js
│   └── config.js
│
└── .gitignore
```

---

## ⚙️ Setup Instructions

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/your-username/StudMaster.git
cd StudMaster
```

### 2️⃣ Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file:

```env
OPENROUTER_API_KEY=your_api_key_here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=deepseek/deepseek-chat
SESSION_EXPIRE_MINUTES=30
```

Run the backend:

```bash
uvicorn app.main:app --reload
```

### 3️⃣ Frontend Setup

Simply open `frontend/index.html` in your browser.

---

## 📌 Notes

* This project is intended for educational purposes.
* Ensure your OpenRouter API key has access to the selected model.
* No user data is stored.

---

## 📜 License

This project is open-source and free to use.

---

⭐ If you like this project, consider giving it a star!
