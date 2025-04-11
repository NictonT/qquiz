// --- Global Variables ---
let questions = []; // Holds the original questions loaded for the session
let randomizedQuestions = []; // Holds the questions for the current quiz round (shuffled)
let currentIndex = 0;
let correctCount = 0;
let wrongCount = 0;
let selectedAnswer = null; // Store { key, answer } of the selected answer
let wrongAnswers = []; // Array to store details of wrong/skipped answers { question, selected, correct, skipped }
let correctAnswers = []; // Array to store details of correct answers { question, correct }

let retryingQuestion = false; // Flag if user is retrying a single question from results
let retryIndex = -1; // Index of the question being retried

let totalQuestions = 0; // Total questions in the *current* quiz round
let completedQuestions = 0; // Number of questions attempted/skipped in the current round

// --- DOM Elements (Optional Caching) ---
// Caching elements could slightly improve performance if accessed very frequently
// const quizPage = document.getElementById('quizPage');
// const resultPage = document.getElementById('resultPage');
// ... other elements

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Apply night mode class based on localStorage (set by previous page)
    if (localStorage.getItem('nightMode') === 'true') {
        document.body.classList.add('night-mode');
    }

    // Load quiz data from localStorage
    const storedData = localStorage.getItem('quizData');
    const storedFileName = localStorage.getItem('quizFileName') || "Quiz"; // Get file name or use default

    document.getElementById('fileNameDisplay').innerText = storedFileName;

    if (storedData) {
        try {
            let parsedData = JSON.parse(storedData);

            // Ensure data is an array
            if (!Array.isArray(parsedData)) {
                parsedData = [parsedData];
            }

            questions = parsedData; // Store the original loaded questions

            if (questions.length === 0) {
                displayError("No valid questions found in the provided data.");
                return;
            }

            startNewQuiz(questions); // Start the first quiz round

        } catch (e) {
            console.error('Error parsing stored quiz data:', e);
            displayError("Error loading quiz data. Please check the format.");
        }
    } else {
        displayError("No quiz data found. Please go back and load a quiz.");
    }
});

// --- Core Quiz Functions ---

function startNewQuiz(questionSet) {
    // Use a *copy* of the question set for randomization
    randomizedQuestions = shuffleArray([...questionSet]);
    resetQuizState(); // Reset counters and UI for the new round
    loadQuestion();
}

function resetQuizState() {
    currentIndex = 0;
    correctCount = 0;
    wrongCount = 0;
    selectedAnswer = null;
    wrongAnswers = [];
    correctAnswers = [];
    completedQuestions = 0;
    retryingQuestion = false;
    retryIndex = -1;

    totalQuestions = randomizedQuestions.length; // Set total for this round

    // Ensure buttons are in the correct initial state
    const submitButton = document.getElementById('submitButton');
    if (submitButton) submitButton.disabled = true;
    const skipButton = document.getElementById('skipButton');
    if (skipButton) skipButton.style.display = 'block';
    const helpButton = document.querySelector('.help-button');
    if (helpButton) helpButton.style.display = 'block';
    const returnButton = document.getElementById('returnToScoreButton');
    if (returnButton) returnButton.classList.add('hidden');


    // Reset result lists visibility
    const correctList = document.getElementById('correctList');
    if(correctList) correctList.classList.add('hidden');
    const wrongList = document.getElementById('wrongList');
    if(wrongList) wrongList.classList.add('hidden');


    showSlide('quizPage');
    updateProgressBar();
}

function loadQuestion() {
    selectedAnswer = null; // Clear previous selection

    // Determine the question to load (normal flow or retry)
    const questionIndex = retryingQuestion ? retryIndex : currentIndex;

    if (questionIndex >= 0 && questionIndex < randomizedQuestions.length) {
        const question = randomizedQuestions[questionIndex];

        if (!question || typeof question.question !== 'string' || typeof question.answers !== 'object' || question.answers === null) {
             console.error("Invalid question format at index:", questionIndex, question);
             displayError("Encountered an invalid question. Skipping...");
             // Skip this invalid question
             if (retryingQuestion) {
                showResults(); // Can't retry invalid question, go back to results
             } else {
                currentIndex++;
                completedQuestions++; // Count as completed
                updateProgressBar();
                loadQuestion(); // Try next one
             }
             return;
        }

        document.getElementById('questionText').innerText = question.question;
        const answersContainer = document.getElementById('answersContainer');
        answersContainer.innerHTML = ''; // Clear previous answers

        // Shuffle answer options (A, B, C...)
        const shuffledAnswerMap = shuffleAnswers(question.answers);

        // Create answer elements
        for (const key in shuffledAnswerMap) {
            let answerElement = document.createElement('div');
            answerElement.classList.add('answer');
            answerElement.innerText = `${key}: ${shuffledAnswerMap[key]}`;
            // Use closure to capture the correct key and answer for the onclick handler
            answerElement.onclick = ((k, ansText) => {
                return () => selectAnswer(k, ansText);
            })(key, shuffledAnswerMap[key]);
            answersContainer.appendChild(answerElement);
        }

        // Reset button states
        document.getElementById('submitButton').disabled = true; // Disable submit until an answer is selected
        document.getElementById('submitButton').style.display = 'block';
        document.querySelector('.help-button').style.display = 'block';
        // Hide skip button only if retrying a single question
        document.getElementById('skipButton').style.display = retryingQuestion ? 'none' : 'block';
        document.getElementById('returnToScoreButton').classList.toggle('hidden', !retryingQuestion);


        updateProgressBar(); // Update progress bar for the new question
    } else {
        // End of quiz reached
        showResults();
    }
}

function selectAnswer(key, answerText) {
    selectedAnswer = { key: key, answer: answerText }; // Store selected key and text

    // Update visual selection
    document.querySelectorAll('.answer').forEach(el => {
        el.classList.remove('selected');
        // Check if the element's text starts with the selected key + ':'
        if (el.innerText.trim().startsWith(key + ':')) {
            el.classList.add('selected');
        }
    });

    document.getElementById('submitButton').disabled = false; // Enable submit button
}

function submitAnswer() {
    if (!selectedAnswer) {
        alert('Please select an answer before submitting.');
        return;
    }

    const questionIndex = retryingQuestion ? retryIndex : currentIndex;
    const currentQuestion = randomizedQuestions[questionIndex];

    // Check if the selected answer text matches the text of the correct answer
    const correctAnswerKey = currentQuestion.correctAnswer; // e.g., "C"
    const correctAnswerText = currentQuestion.answers[correctAnswerKey];

    if (selectedAnswer.answer === correctAnswerText) {
        correctCount++;
        recordCorrectAnswer(questionIndex, selectedAnswer);
        // If this question was previously wrong, remove it from the wrong list
        removeFromWrongAnswers(currentQuestion.question);
    } else {
        wrongCount++;
        recordWrongAnswer(questionIndex, selectedAnswer, false); // false = not skipped
    }

    // Mark question as completed *unless* retrying (retries don't advance overall progress)
    if (!retryingQuestion) {
       if (completedQuestions < totalQuestions) {
           completedQuestions++;
       }
        currentIndex++; // Move to next question index for normal flow
    }


    updateProgressBar(); // Update progress based on completed questions

    // Decide next step
    if (retryingQuestion) {
        showResults(); // After retrying one question, go back to results
        retryingQuestion = false; // Reset retry flag
    } else if (currentIndex < randomizedQuestions.length) {
        loadQuestion(); // Load the next question
    } else {
        showResults(); // End of quiz
    }
}

function skipQuestion() {
    // Cannot skip during a single retry
    if (retryingQuestion) return;

    const questionIndex = currentIndex;
    wrongCount++;
    recordWrongAnswer(questionIndex, null, true); // true = skipped

    if (completedQuestions < totalQuestions) {
       completedQuestions++;
    }
    currentIndex++;
    updateProgressBar();
    loadQuestion();
}

function showAnswer() {
    // Reveals the correct answer for the current question
    const questionIndex = retryingQuestion ? retryIndex : currentIndex;
    if (questionIndex < randomizedQuestions.length) {
        const question = randomizedQuestions[questionIndex];
        const correctAnswerKey = question.correctAnswer;
        const correctAnswerText = question.answers[correctAnswerKey];

        document.querySelectorAll('.answer').forEach(el => {
            el.classList.remove('selected', 'wrong'); // Clear previous states
            // Check if the answer text (after the key) matches the correct answer text
            const answerValue = el.innerText.substring(el.innerText.indexOf(':') + 1).trim();
            if (answerValue === correctAnswerText) {
                el.classList.add('correct'); // Highlight the correct one
            }
            el.onclick = null; // Disable clicking after revealing
        });

        // Disable submit, hide help, ensure skip is visible (if not retrying)
        document.getElementById('submitButton').disabled = true;
        document.getElementById('submitButton').style.display = 'none'; // Hide submit after reveal
        document.querySelector('.help-button').style.display = 'none';
        document.getElementById('skipButton').style.display = retryingQuestion ? 'none' : 'block';
        document.getElementById('returnToScoreButton').classList.toggle('hidden', !retryingQuestion);

    }
}

// --- Result Tracking ---

function recordWrongAnswer(index, selectedAns, skipped = false) {
    const question = randomizedQuestions[index];
    // Avoid duplicates if retrying/redoing
    const existingIndex = wrongAnswers.findIndex(item => item.question === question.question);
    if (existingIndex !== -1) {
        wrongAnswers.splice(existingIndex, 1); // Remove old entry
    }
    wrongAnswers.push({
        question: question.question,
        selected: selectedAns ? selectedAns.answer : (skipped ? "Skipped" : "No Answer"),
        correct: question.answers[question.correctAnswer],
        skipped: skipped,
        originalIndex: index // Store original index if needed later
    });
}

function recordCorrectAnswer(index, selectedAns) {
    const question = randomizedQuestions[index];
     // Avoid duplicates if retrying/redoing
    const existingIndex = correctAnswers.findIndex(item => item.question === question.question);
    if (existingIndex !== -1) {
        correctAnswers.splice(existingIndex, 1); // Remove old entry
    }
    correctAnswers.push({
        question: question.question,
        correct: question.answers[question.correctAnswer],
        originalIndex: index // Store original index if needed later
    });
}

function removeFromWrongAnswers(questionText) {
    const index = wrongAnswers.findIndex(item => item.question === questionText);
    if (index !== -1) {
        wrongAnswers.splice(index, 1);
        // Adjust wrongCount if necessary (e.g., if not part of a "redo wrong" round)
        // Be careful here - simpler to recalculate counts in showResults
    }
}

// --- Results Page ---

function showResults() {
    showSlide('resultPage');

    const correctList = document.getElementById('correctList');
    const wrongList = document.getElementById('wrongList');
    correctList.innerHTML = '<h3>Correct Answers</h3>'; // Clear previous, add header
    wrongList.innerHTML = '<h3>Wrong/Skipped Answers</h3>'; // Clear previous, add header

    // Recalculate counts based on the arrays length for accuracy
    correctCount = correctAnswers.length;
    wrongCount = wrongAnswers.length;
    // Use the total from the *last completed round* for percentages
    const roundTotal = Math.max(1, correctCount + wrongCount); // Avoid division by zero


    // Populate Correct List
    correctAnswers.forEach(item => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `<div class="indicator correct"></div> ${item.question}`;
        // Find the original question object to allow retrying
        const originalQuestion = questions.find(q => q.question === item.question);
        if (originalQuestion) {
             listItem.onclick = () => retryQuestion(item.question);
        }
        correctList.appendChild(listItem);
    });

    // Populate Wrong List
    wrongAnswers.forEach(item => {
        const listItem = document.createElement('li');
        const indicatorClass = item.skipped ? 'skipped' : 'wrong';
        // Show correct answer for wrong items
        let detail = item.skipped ? '(Skipped)' : `(Your answer: ${item.selected || 'N/A'}, Correct: ${item.correct})`;
        listItem.innerHTML = `<div class="indicator ${indicatorClass}"></div> ${item.question} <small>${detail}</small>`;

        const originalQuestion = questions.find(q => q.question === item.question);
         if (originalQuestion) {
             listItem.onclick = () => retryQuestion(item.question);
         }
        wrongList.appendChild(listItem);
    });

    // Calculate percentages
    const correctPercentage = Math.round((correctCount / roundTotal) * 100);
    const wrongPercentage = 100 - correctPercentage; // Or calculate directly

    // Update circle charts
    const correctChart = document.getElementById('correctPercentage');
    correctChart.style.setProperty('--percentage', `${correctPercentage}%`);
    correctChart.setAttribute('data-count', correctCount);

    const wrongChart = document.getElementById('wrongPercentage');
    wrongChart.style.setProperty('--percentage', `${wrongPercentage}%`);
    wrongChart.setAttribute('data-count', wrongCount);

    // Update score text
    document.getElementById('scoreText').innerText = `Final Score: ${correctPercentage}%`;

    // Show/hide redo button
    document.getElementById('redoWrongButton').style.display = wrongCount > 0 ? 'block' : 'none';

    // Ensure lists are initially hidden unless user toggled them
    // (Handled by adding/removing 'hidden' class in toggle functions)
}

function toggleCorrectList() {
    document.getElementById('correctList').classList.toggle('hidden');
}

function toggleWrongList() {
    document.getElementById('wrongList').classList.toggle('hidden');
}


// --- Navigation and Retries ---

function retryQuestion(questionText) {
    // Find the index in the *original* questions array
    const originalQuestionIndex = questions.findIndex(q => q.question === questionText);

     if (originalQuestionIndex !== -1) {
         // Find this question within the *current* randomized set for its index
         retryIndex = randomizedQuestions.findIndex(q => q.question === questionText);

         if (retryIndex !== -1) {
            retryingQuestion = true;
            selectedAnswer = null; // Clear any previous selection for this retry
            showSlide('quizPage');
            loadQuestion(); // Load the specific question to retry
         } else {
            console.warn("Could not find question to retry in current randomized set.");
         }

     } else {
         console.error("Could not find original question to retry:", questionText);
     }
}

function redoWrongAnswers() {
    if (wrongAnswers.length === 0) {
        alert("No wrong answers to redo!");
        return;
    }
    // Create a new set of questions based *only* on the ones answered incorrectly
    const questionsToRedo = wrongAnswers
        .map(wrongItem => questions.find(q => q.question === wrongItem.question))
        .filter(q => q !== undefined); // Filter out any potential undefined if mapping failed

    if (questionsToRedo.length > 0) {
        startNewQuiz(questionsToRedo);
    } else {
        alert("Could not prepare questions for redo.");
    }
}

function restartQuiz() {
    // Restart with the full original set of questions
    if (questions.length > 0) {
        startNewQuiz(questions);
    } else {
        displayError("No questions available to restart.");
    }
}

function goToHomePage() {
    // Clear potentially sensitive quiz data when leaving? Optional.
    // localStorage.removeItem('quizData');
    // localStorage.removeItem('quizFileName');
    window.location.href = 'index.html';
}

// --- Utility Functions ---

function shuffleArray(array) {
    // Fisher-Yates (Knuth) Shuffle
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function shuffleAnswers(answersObject) {
    // Shuffles the keys (A, B, C...) for displaying answers
    const originalKeys = Object.keys(answersObject); // e.g., ["A", "B", "C", "D"]
    const shuffledKeys = shuffleArray([...originalKeys]); // Shuffle a copy

    let newAnswerMap = {};
    shuffledKeys.forEach((originalKey, index) => {
        const newKey = String.fromCharCode(65 + index); // Assign new keys A, B, C...
        newAnswerMap[newKey] = answersObject[originalKey]; // Map new key to original answer text
    });
    return newAnswerMap;
}

function showSlide(slideId) {
    document.querySelectorAll('.slide').forEach(slide => {
        slide.classList.add('hidden');
        slide.classList.remove('active');
    });
    const activeSlide = document.getElementById(slideId);
    if (activeSlide) {
        activeSlide.classList.remove('hidden');
        activeSlide.classList.add('active');
    } else {
        console.error("Slide not found:", slideId);
    }
}

function updateProgressBar() {
    const progressBarFill = document.getElementById('progressBarFill');
    const questionCountDisplay = document.getElementById('questionCount');
    let progressPercentage = 0;

    if (totalQuestions > 0) {
        // Ensure completedQuestions doesn't exceed totalQuestions visually
        const currentCompleted = Math.min(completedQuestions, totalQuestions);
        progressPercentage = Math.round((currentCompleted / totalQuestions) * 100);
    }

    if (progressBarFill) {
         progressBarFill.style.width = `${progressPercentage}%`;
    }
    if (questionCountDisplay) {
        questionCountDisplay.innerText = `${progressPercentage}%`;
    }
}

function displayError(message) {
    // Display error message prominently, e.g., replace quiz content
    const quizPage = document.getElementById('quizPage');
    if (quizPage) {
        quizPage.innerHTML = `<div class="question-card" style="color: red; text-align: center;">
                                <h2>Error</h2>
                                <p>${message}</p>
                                <button class="button secondary" onclick="goToHomePage()">Go Home</button>
                              </div>`;
    }
    // Hide other slides if necessary
     const resultPage = document.getElementById('resultPage');
     if (resultPage) resultPage.classList.add('hidden');

}
