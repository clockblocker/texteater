import type { ParsingIssue } from "common-utils";
import type { Reading } from "dumling/types";
import type { KnowledgeChange, UnitShadow } from "dumrel/types";
import type {
	KnowledgeGenerationInput,
	KnowledgeGenerationResult,
} from "./knowledge-generation/contracts.js";
import type { SegmentedSentenceId } from "./types.js";

export function bindSegmentedSentenceId(value: string): SegmentedSentenceId {
	return value as SegmentedSentenceId;
}

export function hasEnglishTranslationSelection(value: object): boolean {
	return Object.keys(value).length > 0;
}

export function hasSemanticRelationSelection(value: object): boolean {
	return Object.keys(value).length > 0;
}

export function isGermanKnowledgeReading(reading: unknown): boolean {
	return (
		reading !== null &&
		typeof reading === "object" &&
		Reflect.get(Reflect.get(reading, "lemma") as object, "language") ===
			"de"
	);
}

export function bindGermanKnowledgeReading(reading: unknown): Reading<"de"> {
	return reading as Reading<"de">;
}

export function bindGermanKnowledgeInput(
	input: Readonly<{
		markedContext: string;
		reading: Reading<"de">;
		request: KnowledgeGenerationInput<"de">["request"];
	}>,
): KnowledgeGenerationInput<"de"> {
	return input;
}

export function isGermanRelationTarget(target: unknown): boolean {
	return (
		target !== null &&
		typeof target === "object" &&
		Reflect.get(target, "language") === "de"
	);
}

export function bindGermanRelationTarget(
	target: unknown,
): UnitShadow<"de", "Lexeme" | "Phraseme"> {
	return target as UnitShadow<"de", "Lexeme" | "Phraseme">;
}

export function knowledgeGenerationResultIssues(result: {
	readonly changes: readonly KnowledgeChange[];
}): ParsingIssue[] {
	const issues: ParsingIssue[] = [];
	for (const [index, change] of result.changes.entries()) {
		if (
			change.kind !== "Contribute" ||
			(change.aspect !== "transcription" &&
				change.aspect !== "definition" &&
				change.aspect !== "translations")
		) {
			issues.push({
				code: "custom",
				path: ["changes", index],
				message:
					"Generated Knowledge contains only base-aspect Contributions.",
			});
		}
		if (change.aspect === "translations" && change.language !== "en") {
			issues.push({
				code: "custom",
				path: ["changes", index, "language"],
				message:
					"German Knowledge generation contributes only English Translations.",
			});
		}
	}
	return issues;
}

export function bindKnowledgeGenerationResult(
	result: unknown,
): KnowledgeGenerationResult {
	return result as KnowledgeGenerationResult;
}

export function shallowFreeze<Value>(value: Value): Value {
	return typeof value === "object" && value !== null
		? Object.freeze(value)
		: value;
}

export function normalizeReadingLemma(value: unknown): unknown {
	if (value === null || typeof value !== "object") return value;
	const canonicalForm = Reflect.get(value, "canonicalForm");
	return typeof canonicalForm === "string"
		? {
				...value,
				canonicalForm: canonicalForm.trim().normalize("NFC"),
			}
		: value;
}

export function deepFreeze<Value>(value: Value): Value {
	if (typeof value !== "object" || value === null) return value;
	for (const child of Object.values(value)) deepFreeze(child);
	return Object.isFrozen(value) ? value : Object.freeze(value);
}

export function isValidWhitespaceSegment(segment: {
	readonly kind: string;
	readonly text: string;
}): boolean {
	return segment.kind !== "Whitespace" || segment.text === " ";
}

export function grammaticalInteractionIssues(interaction: {
	readonly clickedSegmentIndex: number;
	readonly memberSegmentIndices: readonly number[];
}): ParsingIssue[] {
	const issues: ParsingIssue[] = [];
	if (
		!interaction.memberSegmentIndices.includes(
			interaction.clickedSegmentIndex,
		)
	) {
		issues.push({
			code: "custom",
			message: "Interaction membership must include the clicked Segment.",
			path: ["memberSegmentIndices"],
		});
	}
	if (
		interaction.memberSegmentIndices.some(
			(index, position, indices) =>
				position > 0 && index <= (indices[position - 1] ?? -1),
		)
	) {
		issues.push({
			code: "custom",
			message:
				"Interaction membership must be ordered and contain no duplicates.",
			path: ["memberSegmentIndices"],
		});
	}
	return issues;
}

export function grammaticalInputIssues(input: {
	readonly clickedSegmentIndex: number;
	readonly sentence: {
		readonly segments: readonly { readonly kind: string }[];
	};
}): ParsingIssue[] {
	return input.sentence.segments[input.clickedSegmentIndex]?.kind ===
		"ResolvableText"
		? []
		: [
				{
					code: "custom",
					message:
						"The clicked index must reference a ResolvableText Segment.",
					path: ["clickedSegmentIndex"],
				},
			];
}
