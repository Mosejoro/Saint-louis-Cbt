function getQueryParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    day: params.get("day"),
    class: params.get("class"),
    subject: params.get("subject"),
  };
}

function loadQuestions() {
  const { day, class: studentClass, subject } = getQueryParams();
  const questionsDB = JSON.parse(localStorage.getItem("questionsDB")) || {};
  const questions = questionsDB[day]?.[studentClass]?.[subject] || [];

  if (!questions || questions.length === 0) {
    document.getElementById(
      "questions-container"
    ).innerHTML = `<p>No questions available for this subject.</p>`;
    return;
  }

  const container = document.getElementById("questions-container");
  container.innerHTML = "";

  // Enhanced student info section
  const nameInput = document.createElement("div");
  nameInput.className = "student-info";
  nameInput.innerHTML = `
    <div class="name-input-container">
      <label for="student-name">Student Name:</label>
      <input type="text" id="student-name" class="name-input" required>
    </div>
  `;
  container.appendChild(nameInput);

  // Enhanced subject info section
  const subjectInfo = document.createElement("div");
  subjectInfo.className = "subject-info";
  subjectInfo.innerHTML = `
    <div class="subject-header">
      <h2>${subject}</h2>
      <h3>Class: ${studentClass}</h3>
    </div>
  `;
  container.appendChild(subjectInfo);

  const savedAnswers = JSON.parse(localStorage.getItem("examAnswers")) || {};

  // Enhanced questions display
  questions.forEach((q, index) => {
    const questionDiv = document.createElement("div");
    questionDiv.className = "question";
    questionDiv.dataset.questionId = index;
    questionDiv.dataset.correctAnswer = q.answer;

    const optionsHtml = q.options
      .map((opt, optIndex) => {
        const optionLetter = String.fromCharCode(65 + optIndex);
        const isChecked =
          savedAnswers[`q${index}`] === optionLetter ? "checked" : "";
        return `
          <div class="option-wrapper">
            <input type="radio" 
                   id="q${index}opt${optionLetter}" 
                   name="q${index}" 
                   value="${optionLetter}"
                   data-question="${index}"
                   required
                   ${isChecked}>
            <label for="q${index}opt${optionLetter}">${opt}</label>
          </div>
        `;
      })
      .join("");

    questionDiv.innerHTML = `
      <div class="question-content">
        <p class="question-text">${index + 1}. ${q.question}</p>
        <div class="options-container">
          ${optionsHtml}
        </div>
      </div>
    `;
    container.appendChild(questionDiv);
  });

  // Save answers when they change
  container.addEventListener("change", function (e) {
    if (e.target.type === "radio") {
      const savedAnswers =
        JSON.parse(localStorage.getItem("examAnswers")) || {};
      savedAnswers[e.target.name] = e.target.value;
      localStorage.setItem("examAnswers", JSON.stringify(savedAnswers));
    }
  });
}

async function submitAnswers() {
  const studentName = document.getElementById("student-name").value;
  if (!studentName) {
    alert("Please enter your name before submitting.");
    return;
  }

  // Check if all questions are answered
  const unansweredQuestions = [];
  const questions = document.querySelectorAll(".question");
  questions.forEach((question, index) => {
    const answered = question.querySelector('input[type="radio"]:checked');
    if (!answered) {
      unansweredQuestions.push(index + 1);
    }
  });

  if (unansweredQuestions.length > 0) {
    alert(
      `Please answer all questions before submitting. \nUnanswered questions: ${unansweredQuestions.join(
        ", "
      )}`
    );
    return;
  }

  const { day, class: studentClass, subject } = getQueryParams();
  const questionsDB = JSON.parse(localStorage.getItem("questionsDB")) || {};
  const examQuestions = questionsDB[day]?.[studentClass]?.[subject] || [];

  // Calculate results
  let score = 0;
  const detailedResults = [];

  examQuestions.forEach((q, index) => {
    const selected = document.querySelector(`input[name="q${index}"]:checked`);
    const isCorrect = selected && selected.value === q.answer;
    if (isCorrect) score++;

    detailedResults.push({
      questionNumber: index + 1,
      question: q.question,
      correctAnswer: q.answer,
      selectedAnswer: selected ? selected.value : "Not answered",
      isCorrect: isCorrect,
    });
  });

  const percentage = ((score / examQuestions.length) * 100).toFixed(1);
  let grade = "";

  if (percentage >= 90) grade = "A+";
  else if (percentage >= 80) grade = "A";
  else if (percentage >= 70) grade = "B";
  else if (percentage >= 60) grade = "C";
  else if (percentage >= 50) grade = "D";
  else grade = "F";

  const sheetsData = {
    student_name: studentName,
    subject: subject,
    class_info: `Class: ${studentClass}`,
    total_questions: examQuestions.length,
    correct_answers: score,
    percentage: percentage,
    grade: grade,
    score: `${score}/${examQuestions.length} (${percentage}%)`,
    detailed_results: detailedResults
      .map(
        (r) =>
          `Q${r.questionNumber}: ${r.isCorrect ? "✓" : "✗"} (Selected: ${
            r.selectedAnswer
          }, Correct: ${r.correctAnswer})`
      )
      .join("\n"),
    day: day,
    class: studentClass,
  };

  try {
    const response = await fetch(
      "https://script.google.com/macros/s/AKfycbxgf61IfK3c5VzEUvbNE4pCe8GYsmvkIdDTDYN8pjtE7ThXYCRZmGByD53t8oFv0VQI9A/exec",
      {
        method: "POST",
        body: JSON.stringify(sheetsData),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to save to spreadsheet");
    }

    // Modified submission display
    const container = document.getElementById("questions-container");
    container.innerHTML = `
      <div class="submission-summary">
        <h2>Exam Submitted Successfully!</h2>
        <p class="thank-you-message">Thank you for completing the exam, ${studentName}.</p>
        <p class="thank-you-message">Wishing You The Very Best In The Remaining Exams.</p>
        <p class="email-confirmation">A detailed report has been sent to your teacher.</p>
        <a href="index.html" class="go-home">Return to Home Page</a>
      </div>
    `;

    // Clear stored exam data
    localStorage.removeItem("examAnswers");

    const submitButton = document.querySelector("button");
    if (submitButton) submitButton.style.display = "none";
  } catch (error) {
    console.error("Submission error:", error);
    alert(
      "Failed to submit results. Please try again or contact your teacher."
    );
  }
}

window.onload = function () {
  loadQuestions();
};
