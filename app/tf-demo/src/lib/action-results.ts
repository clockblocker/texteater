import type { GenericId } from "convex/values";

export type SegmentKind =
	| "ResolvableText"
	| "OpaqueText"
	| "Whitespace"
	| "Punctuation";

export type SentenceSegmentView = {
	readonly index: number;
	readonly kind: SegmentKind;
	readonly text: string;
	readonly isClicked: boolean;
	readonly isResolutionMember: boolean;
};

export type SentenceView = {
	readonly sentenceId: GenericId<"sentences">;
	readonly position: number;
	readonly language: "de" | "he";
	readonly stitchedText: string;
	readonly sourceText: string;
	readonly segments: readonly SentenceSegmentView[];
};

export function parseSubmittedTextId(resultValue: unknown): GenericId<"texts"> {
	const result = requireRecord(resultValue, "Text submission result");
	if (result.ok !== true) {
		const error = optionalRecord(result.error);
		throw new Error(
			optionalString(error?.message) ??
				"Dumgen rejected the source text.",
		);
	}
	const persisted = requireRecord(result.persisted, "Persisted submission");
	if (typeof persisted.textId !== "string") {
		throw new Error("Persisted submission has no Text identifier.");
	}
	return persisted.textId as GenericId<"texts">;
}

type UnknownRecord = Record<string, unknown>;

export function parseSubmittedSentences(
	resultValue: unknown,
	sourceText: string,
): readonly SentenceView[] {
	const result = requireRecord(resultValue, "Text submission result");
	if (result.ok !== true) {
		const error = optionalRecord(result.error);
		throw new Error(
			optionalString(error?.message) ??
				"Dumgen rejected the source text.",
		);
	}
	const persisted = requireRecord(result.persisted, "Persisted submission");
	if (!Array.isArray(persisted.sentenceIds)) {
		throw new Error("Persisted submission has no Sentence identifiers.");
	}
	const sentenceIds = persisted.sentenceIds.map((value) => {
		if (typeof value !== "string") {
			throw new Error("A persisted Sentence identifier is invalid.");
		}
		return value as GenericId<"sentences">;
	});
	if (!Array.isArray(result.value)) {
		throw new Error("Dumgen returned no segmentation decisions.");
	}

	let persistedIndex = 0;
	const sentences = result.value.flatMap(
		(decisionValue, position): SentenceView[] => {
			const decision = optionalRecord(decisionValue);
			if (decision?.decision !== "Accepted") return [];
			const language = decision.language;
			if (language !== "de" && language !== "he") {
				throw new Error("Dumgen returned an unsupported language.");
			}
			const sentence = requireRecord(
				decision.sentence,
				"Segmented Sentence",
			);
			if (!Array.isArray(sentence.segments)) {
				throw new Error("A Segmented Sentence has no Segments.");
			}
			const sentenceId = sentenceIds[persistedIndex];
			persistedIndex += 1;
			if (!sentenceId) {
				throw new Error("A Segmented Sentence was not persisted.");
			}
			const segments = sentence.segments.map((segmentValue, index) => {
				const segment = requireRecord(segmentValue, "Segment");
				const kind = requireSegmentKind(segment.kind);
				const text = requireString(segment.text, "Segment text");
				return {
					index,
					kind,
					text,
					isClicked: false,
					isResolutionMember: false,
				};
			});
			return [
				{
					sentenceId,
					position,
					language,
					stitchedText: segments.map(({ text }) => text).join(""),
					sourceText,
					segments,
				},
			];
		},
	);
	if (sentences.length === 0) {
		throw new Error("Dumgen did not accept a German source sentence.");
	}
	if (persistedIndex !== sentenceIds.length) {
		throw new Error("Persisted Sentences do not match Dumgen output.");
	}
	return sentences;
}

export function parseResolutionDecision(resultValue: unknown): string {
	const result = requireRecord(resultValue, "Resolution result");
	const grammatical = requireRecord(
		result.grammatical,
		"Grammatical resolution",
	);
	const decision = grammatical.decision;
	if (
		decision !== "Resolved" &&
		decision !== "Unresolved" &&
		decision !== "NotImplemented"
	) {
		throw new Error("Dumgen returned an invalid resolution decision.");
	}
	return decision;
}

function optionalRecord(value: unknown): UnknownRecord | null {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as UnknownRecord)
		: null;
}

function requireRecord(value: unknown, name: string): UnknownRecord {
	const record = optionalRecord(value);
	if (!record) throw new Error(`${name} must be an object.`);
	return record;
}

function optionalString(value: unknown): string | null {
	return typeof value === "string" && value.trim().length > 0
		? value.trim()
		: null;
}

function requireString(value: unknown, name: string): string {
	if (typeof value !== "string" || value.length === 0) {
		throw new Error(`${name} must be a non-empty string.`);
	}
	return value;
}

function requireSegmentKind(value: unknown): SegmentKind {
	if (
		value === "ResolvableText" ||
		value === "OpaqueText" ||
		value === "Whitespace" ||
		value === "Punctuation"
	) {
		return value;
	}
	throw new Error("Segment kind is invalid.");
}
