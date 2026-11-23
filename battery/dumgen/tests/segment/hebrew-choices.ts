export function picked(choice: string, probability = 1) {
	return {
		type: "choice" as const,
		choice,
		confidence: probability,
		probabilities: { [choice]: probability },
	};
}
