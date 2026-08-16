document.querySelectorAll("[data-quiz]").forEach((quiz) => {
	const feedback = quiz.querySelector("[data-feedback]");
	quiz.querySelectorAll("button[data-answer]").forEach((button) => {
		button.addEventListener("click", () => {
			const correct = button.dataset.answer === quiz.dataset.correct;
			feedback.textContent = correct
				? quiz.dataset.correctMessage
				: quiz.dataset.incorrectMessage;
			feedback.className = `feedback ${correct ? "correct" : "incorrect"}`;
		});
	});
});
