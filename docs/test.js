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
            if (testState.questions[index]) {
                await saveCurrentAnswer();
            }
            
            // Update current index
            testState.currentQuestionIndex = index;
            
            // Fetch question from backend
            const response = await fetch(
                `${API_BASE_URL}/question/${testState.sessionId}/${index}`
            );
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Failed to load question');
            }
            
            const data = await response.json();
            
            // Store the question for later use
            testState.questions[index] = {
                question: data.question,
                options: data.options,
                correct_answer: data.correct_answer
            };
            
            // Update UI
            currentQuestionSpan.textContent = index + 1;
            questionNumberSpan.textContent = index + 1;
            questionTextDiv.textContent = data.question;
            
            // Update progress
            const progress = ((index + 1) / testState.totalQuestions) * 100;
            progressFill.style.width = `${progress}%`;
            
            // Display options
            displayOptions(data.options, data.user_answer);
            
            // Update user answer in state
            let userAnswerLetter = null;
            if (data.user_answer) {
                const optionIndex = data.options.indexOf(data.user_answer);
                if (optionIndex !== -1) {
                    userAnswerLetter = ['A', 'B', 'C', 'D'][optionIndex];
                }
            }
            testState.userAnswers[index] = userAnswerLetter;
            
            // Update navigation buttons
            updateNavigationButtons();
            
            // Update question status
            updateQuestionStatus(userAnswerLetter);
            
            // Update indicators
            updateQuestionIndicators();
            
            // Check if all questions answered
            checkAllAnswered();
            
        } catch (error) {
            console.error('Error loading question:', error);
            alert('Failed to load question. Please try again.');
        }
    }
    
    function displayOptions(options, selectedAnswer) {
        optionsContainer.innerHTML = '';
        
        const optionLabels = ['A', 'B', 'C', 'D'];
        
        options.forEach((option, index) => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'option';
            
            if (option === selectedAnswer) {
                optionDiv.classList.add('selected');
            }
            
            optionDiv.innerHTML = `
                <div class="option-label">${optionLabels[index]}</div>
                <div class="option-radio"></div>
                <div class="option-text">${option}</div>
            `;
            
            optionDiv.addEventListener('click', () => selectOption(option, optionDiv, optionLabels[index]));
            optionsContainer.appendChild(optionDiv);
        });
    }
    
    function selectOption(optionText, optionElement, optionLetter) {
        // Remove selected class from all options
        document.querySelectorAll('.option').forEach(opt => {
            opt.classList.remove('selected');
        });
        
        // Add selected class to clicked option
        optionElement.classList.add('selected');
        
        // Update answer status
        updateQuestionStatus(optionLetter);
        
        // Save answer as letter ("A", "B", "C", "D")
        testState.userAnswers[testState.currentQuestionIndex] = optionLetter;
        
        // Update indicator
        updateQuestionIndicators();
        
        // Check if all questions answered
        checkAllAnswered();
    }
    
    async function saveCurrentAnswer() {
        const currentAnswerLetter = testState.userAnswers[testState.currentQuestionIndex];
        
        if (currentAnswerLetter) {
            try {
                // Convert letter back to option text for backend
                const question = testState.questions[testState.currentQuestionIndex];
                if (question && question.options) {
                    const optionIndex = ['A', 'B', 'C', 'D'].indexOf(currentAnswerLetter);
                    if (optionIndex !== -1 && question.options[optionIndex]) {
                        const answerText = question.options[optionIndex];
                        
                        const response = await fetch(
                            `${API_BASE_URL}/answer/${testState.sessionId}/${testState.currentQuestionIndex}`,
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
                            console.error('Error saving answer:', errorData);
                        }
                    }
                }
            } catch (error) {
                console.error('Error saving answer:', error);
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
            await saveCurrentAnswer();
            
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
            
            // Get the correct answer letter from the backend result
            const correctAnswerLetter = result.correct_answer;
            
            // Get the user's answer from the backend result
            const userAnswerText = result.user_answer;
            
            // Convert user's answer text to letter
            let userAnswerLetter = null;
            if (userAnswerText) {
                const optionIndex = result.options.indexOf(userAnswerText);
                if (optionIndex !== -1) {
                    userAnswerLetter = ['A', 'B', 'C', 'D'][optionIndex];
                }
            }
            
            // Compare user's answer letter with correct answer letter from backend
            const isCorrect = userAnswerLetter === correctAnswerLetter;
            
            resultItem.className = `result-item ${isCorrect ? 'correct' : 'incorrect'}`;
            
            const optionLabels = ['A', 'B', 'C', 'D'];
            
            let optionsHTML = '';
            result.options.forEach((option, optIndex) => {
                const optionLetter = optionLabels[optIndex];
                let className = '';
                
                if (optionLetter === correctAnswerLetter) {
                    className = 'correct';
                } else if (optionLetter === userAnswerLetter && !isCorrect) {
                    className = 'user';
                } else if (optionLetter === userAnswerLetter && isCorrect) {
                    className = 'correct';
                }
                
                optionsHTML += `
                    <div class="result-option ${className}">
                        <strong>${optionLetter}:</strong> ${option}
                        ${optionLetter === correctAnswerLetter ? ' ✓' : ''}
                        ${optionLetter === userAnswerLetter && !isCorrect ? ' ✗' : ''}
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
                    ${userAnswerLetter ? `(You selected: ${userAnswerLetter})` : '(Not answered)'}
                </div>
            `;
            
            resultsList.appendChild(resultItem);
        });
        
        resultsModal.style.display = 'flex';
    }
});