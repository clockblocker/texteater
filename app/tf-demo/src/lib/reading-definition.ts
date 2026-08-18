export type ReadingDefinitionChange =
	| {
			readonly kind: "Contribute" | "Correct";
			readonly aspect: "definition";
			readonly value: string;
	  }
	| {
			readonly kind: "Retract";
			readonly aspect: "definition";
	  };

export function normalizeReadingDefinition(value: string | null): string {
	return value?.trim().normalize("NFC") ?? "";
}

export function readingDefinitionChange(
	current: string,
	next: string,
): ReadingDefinitionChange | null {
	if (current === next) return null;
	if (!next) return { kind: "Retract", aspect: "definition" };
	return {
		kind: current ? "Correct" : "Contribute",
		aspect: "definition",
		value: next,
	};
}
