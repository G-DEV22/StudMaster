// Main configuration script for index.html
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const form = document.getElementById('testConfigForm');
    const schoolFields = document.getElementById('schoolFields');
    const collegeFields = document.getElementById('collegeFields');
    const competitiveFields = document.getElementById('competitiveFields');
    const domainInputs = document.querySelectorAll('input[name="domain"]');
    const classLevelSelect = document.getElementById('classLevel');
    const subjectSelect = document.getElementById('subject');
    const courseSelect = document.getElementById('course');
    const examSelect = document.getElementById('exam');
    const numQuestionsSlider = document.getElementById('numQuestions');
    const questionCountSpan = document.getElementById('questionCount');
    const generateBtn = document.getElementById('generateBtn');
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    
    // Backend API URL
    const API_BASE_URL = 'http://localhost:8000';
    
    // Update question count display
    numQuestionsSlider.addEventListener('input', function() {
        questionCountSpan.textContent = this.value;
    });
    
    // Handle domain selection
    domainInputs.forEach(input => {
        input.addEventListener('change', function() {
            updateDomainFields(this.value);
        });
    });
    
    // Update class level subjects
    classLevelSelect.addEventListener('change', function() {
        updateSubjects(this.value);
    });
    
    // Initialize subjects for default class
    updateSubjects('6');
    
    // Load configuration options from backend
    loadConfigOptions();
    
    // Form submission - FIXED: Added preventDefault and proper form submission handling
    form.addEventListener('submit', async function(e) {
        e.preventDefault(); // FIX: Prevent default form submission
        
        // Get form data
        const formData = getFormData();
        
        // Validate form
        if (!validateForm(formData)) {
            return;
        }
        
        // Show loading state
        generateBtn.disabled = true;
        loadingDiv.style.display = 'block';
        errorDiv.style.display = 'none';
        
        try {
            // Send request to backend
            const response = await fetch(`${API_BASE_URL}/generate-test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.detail || 'Failed to generate test');
            }
            
            // Store session ID and redirect to test page
            localStorage.setItem('currentTestSession', data.session_id);
            window.location.href = 'test.html';
            
        } catch (error) {
            showError(error.message);
        } finally {
            generateBtn.disabled = false;
            loadingDiv.style.display = 'none';
        }
    });
    
    // Also bind directly to button click as backup
    generateBtn.addEventListener('click', async function(e) {
        e.preventDefault(); // FIX: Prevent default button behavior
        
        // Get form data
        const formData = getFormData();
        
        // Validate form
        if (!validateForm(formData)) {
            return;
        }
        
        // Show loading state
        generateBtn.disabled = true;
        loadingDiv.style.display = 'block';
        errorDiv.style.display = 'none';
        
        try {
            // Send request to backend
            const response = await fetch(`${API_BASE_URL}/generate-test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.detail || 'Failed to generate test');
            }
            
            // Store session ID and redirect to test page
            localStorage.setItem('currentTestSession', data.session_id);
            window.location.href = 'test.html';
            
        } catch (error) {
            showError(error.message);
        } finally {
            generateBtn.disabled = false;
            loadingDiv.style.display = 'none';
        }
    });
    
    // Function to update domain-specific fields
    function updateDomainFields(domain) {
        // Hide all fields first
        schoolFields.style.display = 'none';
        collegeFields.style.display = 'none';
        competitiveFields.style.display = 'none';
        
        // Reset required attributes
        subjectSelect.required = false;
        courseSelect.required = false;
        examSelect.required = false;
        
        // Show relevant fields
        switch(domain) {
            case 'school':
                schoolFields.style.display = 'block';
                subjectSelect.required = true;
                break;
            case 'college':
                collegeFields.style.display = 'block';
                courseSelect.required = true;
                break;
            case 'competitive':
                competitiveFields.style.display = 'block';
                examSelect.required = true;
                break;
        }
    }
    
    // Function to update subjects based on class level
    function updateSubjects(classLevel) {
        const grade = parseInt(classLevel);
        let subjects = [];
        
        if (grade >= 6 && grade <= 8) {
            subjects = ['Mathematics', 'Science', 'English', 'Social Studies', 'Hindi'];
        } else if (grade >= 9 && grade <= 10) {
            subjects = ['Mathematics', 'Science', 'English', 'Social Science', 'Hindi', 'Sanskrit'];
        } else if (grade === 11 || grade === 12) {
            // For 11th and 12th, show science stream subjects by default
            subjects = ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'English', 'Computer Science'];
        }
        
        // Update subject dropdown
        subjectSelect.innerHTML = '<option value="">Select Subject</option>';
        subjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            subjectSelect.appendChild(option);
        });
    }
    
    // Function to load configuration options from backend
    async function loadConfigOptions() {
        try {
            const response = await fetch(`${API_BASE_URL}/config/options`);
            const data = await response.json();
            
            // Populate college courses
            data.college_courses.forEach(course => {
                const option = document.createElement('option');
                option.value = course;
                option.textContent = course;
                courseSelect.appendChild(option);
            });
            
            // Populate competitive exams
            data.competitive_exams.forEach(exam => {
                const option = document.createElement('option');
                option.value = exam;
                option.textContent = exam;
                examSelect.appendChild(option);
            });
            
        } catch (error) {
            console.error('Failed to load config options:', error);
        }
    }
    
    // Function to get form data
    function getFormData() {
        const domain = document.querySelector('input[name="domain"]:checked').value;
        
        const formData = {
            domain: domain,
            topic: document.getElementById('topic').value.trim(),
            num_questions: parseInt(numQuestionsSlider.value)
        };
        
        // Add domain-specific fields
        switch(domain) {
            case 'school':
                formData.class_level = parseInt(classLevelSelect.value);
                formData.subject = subjectSelect.value;
                break;
            case 'college':
                formData.course = courseSelect.value;
                formData.semester = parseInt(document.getElementById('semester').value);
                break;
            case 'competitive':
                formData.exam = examSelect.value;
                break;
        }
        
        return formData;
    }
    
    // Function to validate form
    function validateForm(formData) {
        errorDiv.style.display = 'none';
        
        if (!formData.topic) {
            showError('Please enter a topic');
            return false;
        }
        
        if (formData.domain === 'school' && !formData.subject) {
            showError('Please select a subject');
            return false;
        }
        
        if (formData.domain === 'college' && !formData.course) {
            showError('Please select a course');
            return false;
        }
        
        if (formData.domain === 'competitive' && !formData.exam) {
            showError('Please select an exam');
            return false;
        }
        
        if (formData.num_questions < 5 || formData.num_questions > 20) {
            showError('Number of questions must be between 5 and 20');
            return false;
        }
        
        return true;
    }
    
    // Function to show error message
    function showError(message) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        errorDiv.scrollIntoView({ behavior: 'smooth' });
    }
});