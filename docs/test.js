// File: test.js
// Test session script for test.html
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const testInfoDiv = document.getElementById('testInfo');
    const currentQuestionSpan = document.getElementById('currentQuestion');
    const totalQuestionsSpan = document.getElementById('totalQuestions');
    const progressFill = document.getElementById('progressFill');
    const timerSpan = document.getElementById('timer');
    const questionNumberSpan = document.getElementById('questionNumber');
    const questionTextDiv = document.getElementById('questionText');
    const optionsContainer = document.getElementById('optionsContainer');
    const answerStatusIcon = document.getElementById('answerStatus');
    const statusTextSpan = document.getElementById('statusText');
    const questionIndicatorsDiv = document.getElementById('questionIndicators');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitSection = document.getElementById('submitSection');
    const submitBtn = document.getElementById('submitBtn');
    const resultsModal = document.getElementById('resultsModal');
    const closeModalBtn = document.getElementById('closeModal');
    const newTestBtn = document.getElementById('newTestBtn');
    const backToHomeBtn = document.getElementById('backToHomeBtn');
    const exitTestBtn = document.getElementById('exitTestBtn');
    
    // Test state
    let testState = {
        sessionId: null,
        config: null,
        questions: [],
        userAnswers: [],
        currentQuestionIndex: 0,
        totalQuestions: 0,
        startTime: null,
        timerInterval: null
    };
    
    // Backend API URL
    const API_BASE_URL = 'https://studmaster.onrender.com';
    
    // Initialize test
    initTest();
    
    // Initialize event listeners
    prevBtn.addEventListener('click', goToPreviousQuestion);
    nextBtn.addEventListener('click', goToNextQuestion);
    submitBtn.addEventListener('click', submitTest);
    closeModalBtn.addEventListener('click', () => resultsModal.style.display = 'none');
    newTestBtn.addEventListener('click', () => window.location.href = 'index.html');
    backToHomeBtn.addEventListener('click', goBackToHome);
    exitTestBtn.addEventListener('click', exitTest);
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === resultsModal) {
            resultsModal.style.display = 'none';
        }
    });
    
    async function initTest() {
        console.log('Initializing test...');
        
        // Get session ID from localStorage
        testState.sessionId = localStorage.getItem('currentTestSession');
        
        console.log('Session ID from localStorage:', testState.sessionId);
        
        if (!testState.sessionId) {
            alert('No test session found. Please create a new test from the home page.');
            window.location.href = 'index.html';
            return;
        }
        
        try {
            // Get test summary
            console.log('Fetching test summary...');
            const summaryResponse = await fetch(`${API_BASE_URL}/test-summary/${testState.sessionId}`);
            
            console.log('Response status:', summaryResponse.status);
            
            if (!summaryResponse.ok) {
                const errorData = await summaryResponse.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Test session not found or expired');
            }
            
            const summary = await summaryResponse.json();
            console.log('Summary received:', summary);
            
            if (summary.submitted) {
                alert('This test has already been submitted.');
                window.location.href = 'index.html';
                return;
            }
            
            testState.config = summary.config;
            testState.totalQuestions = summary.num_questions;
            testState.userAnswers = new Array(summary.num_questions).fill(null);
            
            // FIX: Pre-load all questions to ensure we have access to all option texts
            await preloadAllQuestions();
            
            // Display test info
            displayTestInfo();
            
            // Load first question
            await loadQuestion(0);
            
            // Start timer
            startTimer();
            
            // Create question indicators
            createQuestionIndicators();
            
        } catch (error) {
            console.error('Error in initTest:', error);
            alert(`Error: ${error.message}`);
            window.location.href = 'index.html';
        }
    }
    
    // FIX: New function to pre-load all questions at startup
    async function preloadAllQuestions() {
        console.log('Pre-loading all questions...');
        
        for (let i = 0; i < testState.totalQuestions; i++) {
            try {
                const response = await fetch(
                    `${API_BASE_URL}/question/${testState.sessionId}/${i}`
                );
                
                if (response.ok) {
                    const data = await response.json();
                    testState.questions[i] = {
                        question: data.question,
                        options: data.options,
                        correct_answer: data.correct_answer
                    };
                    
                    // Convert user answer from backend to letter format for state management
                    if (data.user_answer) {
                        const optionIndex = data.options.indexOf(data.user_answer);
                        if (optionIndex !== -1) {
                            testState.userAnswers[i] = ['A', 'B', 'C', 'D'][optionIndex];
                        }
                    }
                }
            } catch (error) {
                console.error(`Error pre-loading question ${i}:`, error);
            }
        }
        
        console.log('Pre-loaded questions:', testState.questions.length);
        console.log('Pre-loaded answers:', testState.userAnswers);
    }
    
    function displayTestInfo() {
        const config = testState.config;
        let infoText = '';
        
        if (config) {
            switch(config.domain) {
                case 'school':
                    infoText = `Class ${config.class_level} - ${config.subject} - ${config.topic}`;
                    break;
                case 'college':
                    infoText = `${config.course} - Semester ${config.semester} - ${config.topic}`;
                    break;
                case 'competitive':
                    infoText = `${config.exam} - ${config.topic}`;
                    break;
                default:
                    infoText = `${config.topic}`;
            }
        } else {
            infoText = 'Loading test information...';
        }
        
        testInfoDiv.textContent = infoText;
        totalQuestionsSpan.textContent = testState.totalQuestions;
    }
    
    async function loadQuestion(index) {
        try {
            // Save current answer if changed
            await saveCurrentAnswer();
            
            // Update current index
            testState.currentQuestionIndex = index;
            
            // Use pre-loaded question or fetch if not available
            if (!testState.questions[index]) {
                const response = await fetch(
                    `${API_BASE_URL}/question/${testState.sessionId}/${index}`
                );
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.detail || 'Failed to load question');
                }
                
                const data = await response.json();
                testState.questions[index] = {
                    question: data.question,
                    options: data.options,
                    correct_answer: data.correct_answer
                };
            }
            
            const question = testState.questions[index];
            
            // Update UI
            currentQuestionSpan.textContent = index + 1;
            questionNumberSpan.textContent = index + 1;
            questionTextDiv.textContent = question.question;
            
            // Update progress
            const progress = ((index + 1) / testState.totalQuestions) * 100;
            progressFill.style.width = `${progress}%`;
            
            // Display options
            displayOptions(question.options, index);
            
            // Update navigation buttons
            updateNavigationButtons();
            
            // Update question status
            updateQuestionStatus(testState.userAnswers[index]);
            
            // Update indicators
            updateQuestionIndicators();
            
            // Check if all questions answered
            checkAllAnswered();
            
        } catch (error) {
            console.error('Error loading question:', error);
            alert('Failed to load question. Please try again.');
        }
    }
    
    function displayOptions(options, questionIndex) {
        optionsContainer.innerHTML = '';
        
        const optionLabels = ['A', 'B', 'C', 'D'];
        const currentAnswerLetter = testState.userAnswers[questionIndex];
        
        options.forEach((option, index) => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'option';
            
            // Check if this option corresponds to the user's answer
            const optionLetter = optionLabels[index];
            if (optionLetter === currentAnswerLetter) {
                optionDiv.classList.add('selected');
            }
            
            optionDiv.innerHTML = `
                <div class="option-label">${optionLetter}</div>
                <div class="option-radio"></div>
                <div class="option-text">${option}</div>
            `;
            
            optionDiv.addEventListener('click', () => selectOption(option, optionDiv, optionLetter, questionIndex));
            optionsContainer.appendChild(optionDiv);
        });
    }
    
    function selectOption(optionText, optionElement, optionLetter, questionIndex) {
        // Remove selected class from all options
        document.querySelectorAll('.option').forEach(opt => {
            opt.classList.remove('selected');
        });
        
        // Add selected class to clicked option
        optionElement.classList.add('selected');
        
        // Update answer status
        updateQuestionStatus(optionLetter);
        
        // Save answer as letter ("A", "B", "C", "D")
        testState.userAnswers[questionIndex] = optionLetter;
        
        // Save to backend immediately
        saveAnswerToBackend(questionIndex, optionText);
        
        // Update indicator
        updateQuestionIndicators();
        
        // Check if all questions answered
        checkAllAnswered();
    }
    
    // FIX: New function to save answer to backend immediately when selected
    async function saveAnswerToBackend(questionIndex, answerText) {
        try {
            const response = await fetch(
                `${API_BASE_URL}/answer/${testState.sessionId}/${questionIndex}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ answer: answerText })
                }
            );
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Error saving answer to backend:', errorData);
            } else {
                console.log(`Answer saved for question ${questionIndex}:`, answerText);
            }
        } catch (error) {
            console.error('Error saving answer to backend:', error);
        }
    }
    
    async function saveCurrentAnswer() {
        const currentIndex = testState.currentQuestionIndex;
        const currentAnswerLetter = testState.userAnswers[currentIndex];
        
        if (currentAnswerLetter && testState.questions[currentIndex]) {
            const question = testState.questions[currentIndex];
            const optionIndex = ['A', 'B', 'C', 'D'].indexOf(currentAnswerLetter);
            
            if (optionIndex !== -1 && question.options[optionIndex]) {
                const answerText = question.options[optionIndex];
                await saveAnswerToBackend(currentIndex, answerText);
            }
        }
    }
    
    function updateQuestionStatus(answer) {
        if (answer) {
            answerStatusIcon.style.color = '#10b981';
            answerStatusIcon.className = 'fas fa-check-circle';
            statusTextSpan.textContent = 'Answered';
            statusTextSpan.style.color = '#10b981';
        } else {
            answerStatusIcon.style.color = '#ef4444';
            answerStatusIcon.className = 'fas fa-circle';
            statusTextSpan.textContent = 'Not Answered';
            statusTextSpan.style.color = '#6b7280';
        }
    }
    
    function updateNavigationButtons() {
        prevBtn.disabled = testState.currentQuestionIndex === 0;
        nextBtn.style.display = testState.currentQuestionIndex === testState.totalQuestions - 1 
            ? 'none' 
            : 'flex';
    }
    
    function createQuestionIndicators() {
        questionIndicatorsDiv.innerHTML = '';
        
        for (let i = 0; i < testState.totalQuestions; i++) {
            const indicator = document.createElement('div');
            indicator.className = 'indicator';
            indicator.dataset.index = i;
            
            if (i === 0) {
                indicator.classList.add('current');
            }
            
            if (testState.userAnswers[i]) {
                indicator.classList.add('answered');
            }
            
            indicator.addEventListener('click', () => {
                if (i !== testState.currentQuestionIndex) {
                    loadQuestion(i);
                }
            });
            
            questionIndicatorsDiv.appendChild(indicator);
        }
    }
    
    function updateQuestionIndicators() {
        const indicators = document.querySelectorAll('.indicator');
        
        indicators.forEach((indicator, index) => {
            indicator.classList.remove('current', 'answered');
            
            if (index === testState.currentQuestionIndex) {
                indicator.classList.add('current');
            }
            
            if (testState.userAnswers[index]) {
                indicator.classList.add('answered');
            }
        });
    }
    
    function checkAllAnswered() {
        const allAnswered = testState.userAnswers.every(answer => answer !== null);
        
        if (allAnswered) {
            submitSection.style.display = 'block';
            // Smooth scroll to submit section
            submitSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            submitSection.style.display = 'none';
        }
    }
    
    function goToPreviousQuestion() {
        if (testState.currentQuestionIndex > 0) {
            loadQuestion(testState.currentQuestionIndex - 1);
        }
    }
    
    function goToNextQuestion() {
        if (testState.currentQuestionIndex < testState.totalQuestions - 1) {
            loadQuestion(testState.currentQuestionIndex + 1);
        }
    }
    
    function exitTest() {
        if (confirm('Are you sure you want to exit the test? All progress will be lost.')) {
            localStorage.removeItem('currentTestSession');
            
            if (testState.timerInterval) {
                clearInterval(testState.timerInterval);
            }
            
            testState = {
                sessionId: null,
                config: null,
                questions: [],
                userAnswers: [],
                currentQuestionIndex: 0,
                totalQuestions: 0,
                startTime: null,
                timerInterval: null
            };
            
            window.location.href = 'index.html';
        }
    }
    
    function goBackToHome() {
        localStorage.removeItem('currentTestSession');
        
        if (testState.timerInterval) {
            clearInterval(testState.timerInterval);
        }
        
        resultsModal.style.display = 'none';
        
        window.location.href = 'index.html';
    }
    
    function startTimer() {
        testState.startTime = Date.now();
        
        testState.timerInterval = setInterval(() => {
            const elapsed = Date.now() - testState.startTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            
            timerSpan.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }
    
    async function submitTest() {
        if (!confirm('Are you sure you want to submit the test? You cannot change answers after submission.')) {
            return;
        }
        
        try {
            // Ensure all answers are saved to backend before submission
            await saveAllAnswersToBackend();
            
            const response = await fetch(
                `${API_BASE_URL}/submit/${testState.sessionId}`,
                { method: 'POST' }
            );
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Failed to submit test');
            }
            
            const results = await response.json();
            
            clearInterval(testState.timerInterval);
            
            showResults(results);
            
            localStorage.removeItem('currentTestSession');
            
        } catch (error) {
            alert(`Error submitting test: ${error.message}`);
        }
    }
    
    // FIX: New function to save all answers to backend before submission
    async function saveAllAnswersToBackend() {
        console.log('Saving all answers to backend before submission...');
        
        for (let i = 0; i < testState.totalQuestions; i++) {
            const answerLetter = testState.userAnswers[i];
            
            if (answerLetter && testState.questions[i]) {
                const question = testState.questions[i];
                const optionIndex = ['A', 'B', 'C', 'D'].indexOf(answerLetter);
                
                if (optionIndex !== -1 && question.options[optionIndex]) {
                    const answerText = question.options[optionIndex];
                    
                    try {
                        const response = await fetch(
                            `${API_BASE_URL}/answer/${testState.sessionId}/${i}`,
                            {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({ answer: answerText })
                            }
                        );
                        
                        if (response.ok) {
                            console.log(`Saved answer for question ${i}:`, answerText);
                        }
                    } catch (error) {
                        console.error(`Error saving answer for question ${i}:`, error);
                    }
                }
            }
        }
    }
    
    function showResults(results) {
        document.getElementById('scorePercentage').textContent = `${results.percentage}%`;
        document.getElementById('correctCount').textContent = results.score;
        document.getElementById('totalCount').textContent = results.total;
        document.getElementById('timeTaken').textContent = timerSpan.textContent;
        
        const circle = document.getElementById('scoreCircle');
        const circumference = 339.292;
        const offset = circumference - (results.percentage / 100) * circumference;
        circle.style.strokeDashoffset = offset;
        
        const resultsList = document.getElementById('resultsList');
        resultsList.innerHTML = '';
        
        results.results.forEach((result, index) => {
            const resultItem = document.createElement('div');
            
            const isCorrect = result.is_correct;
            
            resultItem.className = `result-item ${isCorrect ? 'correct' : 'incorrect'}`;
            
            const optionLabels = ['A', 'B', 'C', 'D'];
            
            let optionsHTML = '';
            result.options.forEach((option, optIndex) => {
                const optionLetter = optionLabels[optIndex];
                let className = '';
                
                if (option === result.correct_answer) {
                    className = 'correct';
                } else if (option === result.user_answer && !isCorrect) {
                    className = 'user';
                } else if (option === result.user_answer && isCorrect) {
                    className = 'correct';
                }
                
                optionsHTML += `
                    <div class="result-option ${className}">
                        <strong>${optionLetter}:</strong> ${option}
                        ${option === result.correct_answer ? ' ✓' : ''}
                        ${option === result.user_answer && !isCorrect ? ' ✗' : ''}
                    </div>
                `;
            });
            
            resultItem.innerHTML = `
                <div class="result-question">
                    <strong>Q${index + 1}:</strong> ${result.question}
                </div>
                <div class="result-options">
                    ${optionsHTML}
                </div>
                <div class="result-status ${isCorrect ? 'correct' : 'incorrect'}">
                    ${isCorrect ? '✓ Correct' : '✗ Incorrect'} 
                    ${result.user_answer ? `(You selected: ${result.user_answer})` : '(Not answered)'}
                </div>
            `;
            
            resultsList.appendChild(resultItem);
        });
        
        resultsModal.style.display = 'flex';
    }
});
