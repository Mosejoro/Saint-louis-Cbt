// Import the timetable data directly from the main exam system
const timetable = {
  Day1: {
    Pry1: ["English", "Mathematics"],
    Pry2: ["Basic Science", "CCA"],
    Pry3: ["National Value", "Prevocational Studies"],
    Pry4: ["English", "Mathematics"],
    Pry5: ["CRK", "French"],
    Pry6: ["Basic Science", "National Value"],
  },
  Day2: {
    Pry1: ["CCA", "Basic Science"],
    Pry2: ["English", "Mathematics"],
    Pry3: ["CRK", "English"],
    Pry4: ["CCA", "Prevocational Studies"],
    Pry5: ["English", "Mathematics"],
    Pry6: ["CRK", "French"],
  },
  Day3: {
    Pry1: ["National Value", "CRK"],
    Pry2: ["Prevocational Studies", "National Value"],
    Pry3: ["Mathematics", "CCA"],
    Pry4: ["Basic Science", "National Value"],
    Pry5: ["Prevocational Studies", "CCA"],
    Pry6: ["English", "Mathematics"],
  },
  Day4: {
    Pry1: ["Prevocational Studies", "English"],
    Pry2: ["CRK", "Basic Science"],
    Pry3: ["Basic Science", "National Value"],
    Pry4: ["CRK", "French"],
    Pry5: ["Basic Science", "National Value"],
    Pry6: ["CCA", "Prevocational Studies"],
  },
  Day5: {
    Pry1: ["Mathematics", "Basic Science"],
    Pry2: ["CCA", "English"],
    Pry3: ["Prevocational Studies", "CRK"],
    Pry4: ["National Value", "English"],
    Pry5: ["CRK", "Prevocational Studies"],
    Pry6: ["French", "Basic Science"],
  },
  Day6: {
    Pry1: ["CRK", "Prevocational Studies"],
    Pry2: ["Mathematics", "National Value"],
    Pry3: ["English", "Mathematics"],
    Pry4: ["Basic Science", "CCA"],
    Pry5: ["National Value", "English"],
    Pry6: ["Mathematics", "CCA"],
  },

  // ... (other days remain the same)
};

// Function to update subject options based on selected day and class
function updateSubjects() {
  const selectedDay = document.getElementById("day").value;
  const selectedClass = document.getElementById("class").value;
  const subjectOptionsDiv = document.getElementById("subject-options");

  subjectOptionsDiv.innerHTML = "<label>Select Subject:</label>";

  if (selectedDay && selectedClass && timetable[selectedDay]?.[selectedClass]) {
    const subjects = timetable[selectedDay][selectedClass];
    subjects.forEach((subject, index) => {
      const radioDiv = document.createElement("div");
      radioDiv.className = "subject-radio";
      radioDiv.innerHTML = `
          <input type="radio" id="subject${index}" name="subject" value="${subject}">
          <label for="subject${index}">${subject}</label>
        `;
      subjectOptionsDiv.appendChild(radioDiv);
    });
  }
}

// Enhanced document processing function
async function processDocument() {
  const selectedDay = document.getElementById("day").value;
  const selectedClass = document.getElementById("class").value;
  const selectedSubject = document.querySelector(
    'input[name="subject"]:checked'
  )?.value;
  const fileInput = document.getElementById("doc");
  const outputDiv = document.getElementById("output");

  // Validation
  if (
    !selectedDay ||
    !selectedClass ||
    !selectedSubject ||
    !fileInput.files[0]
  ) {
    alert("Please select all required fields and upload a document.");
    return;
  }

  const file = fileInput.files[0];
  const reader = new FileReader();

  reader.onload = async function (event) {
    try {
      const arrayBuffer = event.target.result;
      const result = await mammoth.extractRawText({ arrayBuffer });
      const text = result.value;

      // Enhanced question parsing logic
      const questions = parseQuestions(text);

      // Save to localStorage
      const questionsDB = JSON.parse(localStorage.getItem("questionsDB")) || {};
      if (!questionsDB[selectedDay]) questionsDB[selectedDay] = {};
      if (!questionsDB[selectedDay][selectedClass])
        questionsDB[selectedDay][selectedClass] = {};

      questionsDB[selectedDay][selectedClass][selectedSubject] = questions;
      localStorage.setItem("questionsDB", JSON.stringify(questionsDB));

      // Display parsed questions
      displayParsedQuestions(questions, outputDiv);
      displayUploadedDocs();

      alert("Document processed and questions added successfully!");
    } catch (error) {
      console.error("Error processing document:", error);
      alert(
        "Error processing document. Please check the format and try again."
      );
    }
  };

  reader.readAsArrayBuffer(file);
}

// Enhanced question parsing function
// Enhanced question parsing function
function parseQuestions(text) {
  const lines = text.split("\n").filter((line) => line.trim());
  const questions = [];
  let currentQuestion = null;

  // Regular expressions for matching different parts
  const questionRegex =
    /^(?:(?:\d+[\.):])|(?:Q\d+[\.):])|(?:Question\s+\d+[\.):])\s*)(.*)/i;
  const optionRegex = /^([A-D])[\.).]\s*(.*)/i;
  const answerRegex = /^(?:Answer|Ans|Correct):\s*([A-D])/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check for question
    const questionMatch = line.match(questionRegex);
    if (questionMatch) {
      if (currentQuestion) {
        questions.push(currentQuestion);
      }
      currentQuestion = {
        question: questionMatch[1].trim(),
        options: [],
        answer: "",
      };
      continue;
    }

    // Check for option
    const optionMatch = line.match(optionRegex);
    if (optionMatch && currentQuestion) {
      // Store option as a simple string with its label
      currentQuestion.options.push(
        optionMatch[1] + ") " + optionMatch[2].trim()
      );
      continue;
    }

    // Check for answer
    const answerMatch = line.match(answerRegex);
    if (answerMatch && currentQuestion) {
      currentQuestion.answer = answerMatch[1];
      continue;
    }

    // Handle continuation of question text
    if (
      currentQuestion &&
      !optionMatch &&
      !answerMatch &&
      line.length > 0 &&
      currentQuestion.options.length === 0
    ) {
      currentQuestion.question += " " + line;
    }
  }

  // Add the last question if exists
  if (currentQuestion) {
    questions.push(currentQuestion);
  }

  // Validate questions
  return questions.filter((q) => {
    const isValid = q.question && q.options.length === 4 && q.answer;

    if (!isValid) {
      console.warn("Invalid question found:", q);
    }

    return isValid;
  });
}

// Function to display parsed questions
function displayParsedQuestions(questions, outputDiv) {
  outputDiv.innerHTML = "<h3>Parsed Questions:</h3>";

  questions.forEach((q, index) => {
    const questionDiv = document.createElement("div");
    questionDiv.className = "question";
    questionDiv.innerHTML = `
        <p><strong>Question ${index + 1}:</strong> ${q.question}</p>
        <p><strong>Options:</strong></p>
        <ul>
          ${q.options.map((opt) => `<li>${opt}</li>`).join("")}
        </ul>
        <p><strong>Answer:</strong> ${q.answer}</p>
      `;
    outputDiv.appendChild(questionDiv);
  });
}

// Add this function to preview the document before processing
function previewDocument(file) {
  const reader = new FileReader();
  reader.onload = async function (event) {
    try {
      const arrayBuffer = event.target.result;
      const result = await mammoth.extractRawText({ arrayBuffer });
      const text = result.value;

      // Log raw text for debugging
      console.log("Raw text:", text);

      // Parse questions
      const questions = parseQuestions(text);

      // Display preview
      const outputDiv = document.getElementById("output");
      outputDiv.innerHTML = "<h3>Document Preview:</h3>";

      if (questions.length === 0) {
        outputDiv.innerHTML +=
          '<p class="error">No valid questions found. Please check the document format.</p>';
        return;
      }

      displayParsedQuestions(questions, outputDiv);

      // Add confirmation button
      const confirmBtn = document.createElement("button");
      confirmBtn.textContent = "Confirm and Save Questions";
      confirmBtn.onclick = () => saveQuestions(questions);
      outputDiv.appendChild(confirmBtn);
    } catch (error) {
      console.error("Error processing document:", error);
      document.getElementById("output").innerHTML = `
          <p class="error">Error processing document: ${error.message}</p>
          <p>Please check the document format and try again.</p>
        `;
    }
  };
  reader.readAsArrayBuffer(file);
}

// Function to save questions to database
function saveQuestions(questions) {
  const selectedDay = document.getElementById("day").value;
  const selectedClass = document.getElementById("class").value;
  const selectedSubject = document.querySelector(
    'input[name="subject"]:checked'
  )?.value;

  if (!selectedDay || !selectedClass || !selectedSubject) {
    alert("Please select day, class, and subject before saving.");
    return;
  }

  // Save to localStorage
  const questionsDB = JSON.parse(localStorage.getItem("questionsDB")) || {};
  if (!questionsDB[selectedDay]) questionsDB[selectedDay] = {};
  if (!questionsDB[selectedDay][selectedClass])
    questionsDB[selectedDay][selectedClass] = {};

  questionsDB[selectedDay][selectedClass][selectedSubject] = questions;
  localStorage.setItem("questionsDB", JSON.stringify(questionsDB));

  alert("Questions saved successfully!");
  displayUploadedDocs();
}

// Update the file input handler
document.getElementById("doc").onchange = function (event) {
  const file = event.target.files[0];
  if (file) {
    previewDocument(file);
  }
};

// Helper function to display validation results
function validateDocument(questions) {
  const issues = [];

  questions.forEach((q, index) => {
    if (!q.question) {
      issues.push(`Question ${index + 1}: Missing question text`);
    }
    if (q.options.length !== 4) {
      issues.push(`Question ${index + 1}: Does not have exactly 4 options`);
    }
    if (!q.answer) {
      issues.push(`Question ${index + 1}: Missing answer`);
    }
    if (!q.options.some((opt) => opt.label === q.answer)) {
      issues.push(`Question ${index + 1}: Answer does not match any option`);
    }
  });

  return issues;
}
// Function to display parsed questions
function displayParsedQuestions(questions, outputDiv) {
  outputDiv.innerHTML = "<h3>Parsed Questions:</h3>";

  questions.forEach((q, index) => {
    const questionDiv = document.createElement("div");
    questionDiv.className = "question";
    questionDiv.innerHTML = `
        <p><strong>Question ${index + 1}:</strong> ${q.question}</p>
        <p><strong>Options:</strong></p>
        <ul>
          ${q.options.map((opt) => `<li>${opt}</li>`).join("")}
        </ul>
        <p><strong>Answer:</strong> ${q.answer}</p>
      `;
    outputDiv.appendChild(questionDiv);
  });
}

// Call on page load
window.onload = function () {
  displayUploadedDocs();
  // Add event listeners
  document.getElementById("day").addEventListener("change", updateSubjects);
  document.getElementById("class").addEventListener("change", updateSubjects);
};
