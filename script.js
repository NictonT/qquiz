let questions = [];
let randomizedQuestions = [];
let currentIndex = 0;
let correctCount = 0;
let wrongCount = 0;
let skippedQuestions = [];
let selectedAnswer = '';
let wrongAnswers = [];
let correctAnswers = [];
let retryingQuestion = false;
let retryIndex = -1;
let currentFileName = '';

document.addEventListener('DOMContentLoaded', () => {
    const storedData = localStorage.getItem('currentFile');
    currentFileName = localStorage.getItem('executingFileName') || 'Unknown File';
    if (storedData) {
        try {
            const parsedData = JSON.parse(storedData);
            questions = parsedData.flatMap(item => {
                if (typeof item === 'string') {
                    try {
                        return JSON.parse(item);
                    } catch (e) {
                        console.error('Error parsing JSON string:', e);
                        return [];
                    }
                }
                return item;
            });
            document.getElementById('jsonInput').value = JSON.stringify(questions, null, 2);
        } catch (e) {
            console.error('Error parsing stored data:', e);
        }
        localStorage.removeItem('currentFile');
    }

    document.getElementById('executeButton').addEventListener('click', startQuiz);
    const nightModeToggle = document.getElementById('nightModeToggle');
    if (localStorage.getItem('nightMode') === 'true') {
        document.body.classList.add('night-mode');
        nightModeToggle.checked = true;
    }
    nightModeToggle.addEventListener('change', function () {
        document.body.classList.toggle('night-mode', this.checked);
        localStorage.setItem('nightMode', this.checked);
    });

    document.getElementById('fileNameDisplay').innerHTML = `<div class="file-name"><strong>File:</strong> ${currentFileName}<div class="progress-bar" style="width: 0%;" id="progressBar"></div></div>`;
});

function showSlide(slideId) {
    const slides = document.querySelectorAll('.slide');
    slides.forEach(slide => {
        slide.classList.add("hidden");
        slide.classList.remove("active");
    });

    const slide = document.getElementById(slideId);
    slide.classList.remove("hidden");
    slide.classList.add("active");
}

function startQuiz() {
    const jsonInput = document.getElementById('jsonInput').value;
    try {
        questions = JSON.parse(jsonInput);
        if (!Array.isArray(questions)) questions = [questions]; // Support single question input
        randomizedQuestions = shuffleArray(questions);
        showSlide('quizPage');
        document.querySelector('.progress-container').insertAdjacentHTML('afterbegin', `<div class="file-name"><strong>File:</strong> ${currentFileName}<div class="progress-bar" style="width: 0%;" id="progressBar"></div></div>`);
        loadQuestion();
    } catch (e) {
        alert('Invalid JSON format');
    }
}

function shuffleArray(array) {
    let shuffled = array.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function shuffleAnswers(answers) {
    const keys = Object.keys(answers);
    const shuffledKeys = shuffleArray(keys);
    let shuffledAnswers = {};
    shuffledKeys.forEach((key, index) => {
        shuffledAnswers[String.fromCharCode(65 + index)] = answers[key];
    });
    return shuffledAnswers;
}

function loadQuestion() {
    if (retryingQuestion) {
        currentIndex = retryIndex;
        retryingQuestion = false;
    }

    if (currentIndex < randomizedQuestions.length) {
        const question = randomizedQuestions[currentIndex];
        document.getElementById('questionText').innerText = question.question;
        const answersContainer = document.getElementById('answersContainer');
        answersContainer.innerHTML = '';
        const shuffledAnswers = shuffleAnswers(question.answers);
        for (let key in shuffledAnswers) {
            let answerElement = document.createElement('div');
            answerElement.classList.add('answer');
            answerElement.innerText = `${key}: ${shuffledAnswers[key]}`;
            answerElement.onclick = () => selectAnswer(key, shuffledAnswers[key]);
            answersContainer.appendChild(answerElement);
        }
        document.querySelector('.help-button').style.display = 'block';
        document.querySelector('.button-container .button:first-child').style.display = 'block';
    } else {
        showResults();
    }
}

function selectAnswer(key, answer) {
    selectedAnswer = { key, answer };
    document.querySelectorAll('.answer').forEach(el => {
        el.classList.remove('selected');
        if (el.innerText.startsWith(key)) {
            el.classList.add('selected');
        }
    });
}

function submitAnswer() {
    if (selectedAnswer) {
        if (selectedAnswer.answer === randomizedQuestions[currentIndex].answers[randomizedQuestions[currentIndex].correctAnswer]) {
            correctCount++;
            recordCorrectAnswer(currentIndex, selectedAnswer);
        } else {
            wrongCount++;
            recordWrongAnswer(currentIndex, selectedAnswer);
        }
        currentIndex++;
        updateProgressBar();
        loadQuestion();
    } else {
        alert('Please select an answer');
    }
}

function skipQuestion() {
    wrongCount++;
    recordWrongAnswer(currentIndex, null, true);
    currentIndex++;
    updateProgressBar();
    loadQuestion();
}

function showAnswer() {
    if (currentIndex < randomizedQuestions.length) {
        const question = randomizedQuestions[currentIndex];
        const correctAnswer = question.answers[question.correctAnswer];
        document.querySelectorAll('.answer').forEach(el => {
            if (el.innerText.includes(correctAnswer)) {
                el.classList.add('correct');
                el.style.backgroundColor = 'green';
            }
        });
        document.querySelector('.button-container .button:first-child').style.display = 'none'; // Hide Submit button
        document.querySelector('.help-button').style.display = 'none'; // Hide Help button
        document.querySelector('.button.secondary').style.display = 'block'; // Show Skip button
    }
}

function recordWrongAnswer(index, selectedAnswer, skipped = false) {
    const question = randomizedQuestions[index];
    wrongAnswers.push({
        question: question.question,
        selected: selectedAnswer ? selectedAnswer.answer : null,
        correct: question.answers[question.correctAnswer],
        skipped: skipped,
        attempts: 1
    });
}

function recordCorrectAnswer(index, selectedAnswer) {
    const question = randomizedQuestions[index];
    correctAnswers.push({
        question: question.question,
        correct: question.answers[question.correctAnswer]
    });
}

function showResults() {
    showSlide('resultPage');
    const correctList = document.getElementById('correctList');
    const wrongList = document.getElementById('wrongList');
    correctList.innerHTML = '';
    wrongList.innerHTML = '';
    correctAnswers.forEach(item => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `<div class="indicator correct"></div> Question: ${item.question}`;
        listItem.onclick = () => viewQuestion(item.question, 'correct');
        correctList.appendChild(listItem);
    });
    wrongAnswers.forEach(item => {
        const listItem = document.createElement('li');
        const indicatorClass = item.skipped ? 'skipped' : 'wrong';
        listItem.innerHTML = `<div class="indicator ${indicatorClass}"></div> Question: ${item.question}`;
        listItem.onclick = () => viewQuestion(item.question, indicatorClass);
        wrongList.appendChild(listItem);
    });

    const total = correctCount + wrongCount;
    const correctPercentage = Math.round((correctCount / total) * 100);
    const wrongPercentage = Math.round((wrongCount / total) * 100);

    animatePercentage('correctPercentage', correctPercentage);
    animatePercentage('wrongPercentage', wrongPercentage);

    document.getElementById('correctPercentage').setAttribute('data-percentage', `${correctCount} Correct`);
    document.getElementById('wrongPercentage').setAttribute('data-percentage', `${wrongCount} Wrong/Skipped`);

    document.getElementById('scoreText').innerText = `Score: ${correctPercentage}%`;
}

function animatePercentage(elementId, percentage) {
    const element = document.getElementById(elementId);
    let currentPercentage = 0;
    const interval = setInterval(() => {
        if (currentPercentage >= percentage) {
            clearInterval(interval);
        } else {
            currentPercentage++;
            element.style.setProperty('--percentage', `${currentPercentage}`);
            element.setAttribute('data-percentage', `${currentPercentage}%`);
        }
    }, 20);
}

function updateProgressBar() {
    const progressBarFill = document.getElementById('progressBar');
    const totalQuestions = randomizedQuestions.length;
    const progressPercentage = Math.round((currentIndex / totalQuestions) * 100);
    progressBarFill.style.width = `${progressPercentage}%`;
}

function retryQuestion(questionText, type) {
    retryingQuestion = true;
    retryIndex = randomizedQuestions.findIndex(q => q.question === questionText);

    if (retryIndex !== -1) {
        if (type === 'correct') {
            correctCount--;
            correctAnswers = correctAnswers.filter(item => item.question !== questionText);
        } else {
            wrongCount--;
            wrongAnswers = wrongAnswers.filter(item => item.question !== questionText);
        }
        showSlide('quizPage');
        loadQuestion();
    }
}

function viewQuestion(questionText, indicatorClass) {
    const questionIndex = randomizedQuestions.findIndex(q => q.question === questionText);
    if (questionIndex !== -1) {
        currentIndex = questionIndex;
        loadQuestion();
        document.querySelector('.button-container .button:first-child').style.display = 'none'; // Hide Submit button
        document.querySelector('.help-button').style.display = 'none'; // Hide Help button
        document.querySelector('.button.secondary').style.display = 'block'; // Show Skip button
        document.querySelectorAll('.answer').forEach(el => {
            if (el.innerText.includes(randomizedQuestions[questionIndex].answers[randomizedQuestions[questionIndex].correctAnswer])) {
                el.classList.add('correct');
                el.style.backgroundColor = 'green';
            } else {
                el.classList.remove('selected');
                el.style.backgroundColor = 'none';
            }
        });
        document.querySelector('.button.secondary').textContent = 'Return';
    }
}

function toggleCorrectList() {
    document.getElementById('correctList').classList.toggle('hidden');
}

function toggleWrongList() {
    document.getElementById('wrongList').classList.toggle('hidden');
}

function redoWrongAnswers() {
    randomizedQuestions = wrongAnswers.map(item => {
        const question = questions.find(q => q.question === item.question);
        return question;
    });
    wrongAnswers = [];
    correctAnswers = [];
    correctCount = 0;
    wrongCount = 0;
    currentIndex = 0;
    skippedQuestions = [];
    showSlide('quizPage');
    loadQuestion();
}

function restartQuiz() {
    currentIndex = 0;
    correctCount = 0;
    wrongCount = 0;
    skippedQuestions = [];
    selectedAnswer = '';
    wrongAnswers = [];
    correctAnswers = [];
    showSlide('mainPage');
}

function goToHomePage() {
    showSlide('mainPage');
}

function goToFilesPage() {
    window.location.href = 'files.html';
}

function goToResultPage() {
    showSlide('resultPage');
}
