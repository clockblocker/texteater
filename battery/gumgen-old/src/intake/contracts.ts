import type { EnabledSegmentationLanguage } from "../types";

export const INTAKE_LIMITS = Object.freeze({
	maxBatchSize: 9,
	maxWordsPerSentence: 34,
	maxCodePointsPerSentence: 205,
});

type IntakeItemDecision = Readonly<{
	readonly id: string;
	readonly decision: "Accepted" | "UnsupportedLanguage" | "Unintelligible";
	readonly language: EnabledSegmentationLanguage | null;
	readonly stitchedText: string;
}>;

export type IntakeBatch = Readonly<{
	readonly language: EnabledSegmentationLanguage | null;
	readonly items: readonly IntakeItemDecision[];
}>;

export type IntakeTrace = Readonly<{
	readonly phase: "intake";
	readonly items: readonly IntakeItemDecision[];
}>;

export function assertIntakeBatch(
	input: Readonly<{
		readonly items: readonly Readonly<{
			readonly id: string;
			readonly sourceText: string;
		}>[];
	}>,
	generated: IntakeBatch,
): void {
	if (generated.items.length !== input.items.length) {
		throw new Error(
			"Intake must return exactly one result per input item.",
		);
	}

	for (let index = 0; index < input.items.length; index += 1) {
		const source = input.items[index];
		const result = generated.items[index];
		if (!source || !result || result.id !== source.id) {
			throw new Error(
				"Intake must preserve item cardinality, order, and IDs.",
			);
		}
		if (
			result.stitchedText.length === 0 ||
			result.stitchedText.trim() !== result.stitchedText ||
			/[^\S ]/u.test(result.stitchedText) ||
			result.stitchedText.includes("  ")
		) {
			throw new Error(
				"Every Intake result requires normalized, non-empty Stitched Text.",
			);
		}
		if (compact(result.stitchedText) !== compact(source.sourceText)) {
			throw new Error(
				"Intake may change whitespace only; non-whitespace code points and order are immutable.",
			);
		}
		if (
			(result.decision === "Accepted" && result.language === null) ||
			(result.decision !== "Accepted" && result.language !== null)
		) {
			throw new Error(
				"Intake item decision and language are inconsistent.",
			);
		}
	}

	const acceptedLanguages = new Set(
		generated.items.flatMap((item) =>
			item.decision === "Accepted" && item.language
				? [item.language]
				: [],
		),
	);
	if (
		acceptedLanguages.size > 1 ||
		(acceptedLanguages.size === 0 && generated.language !== null) ||
		(acceptedLanguages.size === 1 &&
			generated.language !== [...acceptedLanguages][0])
	) {
		throw new Error(
			"A batch must have one primary accepted language, or null when nothing is accepted.",
		);
	}
}

export function freezeIntakeBatch(generated: IntakeBatch): IntakeBatch {
	return Object.freeze({
		language: generated.language,
		items: Object.freeze(
			generated.items.map((item) => Object.freeze({ ...item })),
		),
	});
}

function compact(value: string): string {
	return value.replace(/\s/gu, "");
}
