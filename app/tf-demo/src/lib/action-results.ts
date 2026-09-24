import type { Id } from "../../convex/_generated/dataModel";

export type SegmentKind =
	| "ResolvableText"
	| "OpaqueText"
	| "Whitespace"
	| "Punctuation";

export type SentenceSegmentView = {
	readonly index: number;
	readonly kind: SegmentKind;
	readonly text: string;
	/** Present on a fusion component: the word it stands for. */
	readonly surface?: string;
	readonly attestationId?: Id<"attestations">;
	readonly encountered: boolean;
	readonly gender?: "Fem" | "Masc" | "Neut";
	readonly resolutionState?: "Active" | "Unresolved" | "PermanentFailure";
};

export type SentenceView = {
	readonly sentenceId: Id<"sentences">;
	readonly position: number;
	/** Sentences sharing a paragraph run together; absent reads alone. */
	readonly paragraph?: number;
	readonly language: "de" | "en" | "he";
	readonly stitchedText: string;
	readonly heading?: string;
	readonly sourceText: string;
	readonly segments: readonly SentenceSegmentView[];
};

export function parseSubmittedTextId(resultValue: unknown): Id<"texts"> {
	const result = requireRecord(resultValue, "Text submission result");
	if (result.status === "Rejected") {
		throw new Error(
			optionalString(result.message) ??
				"Dumgen rejected the source text.",
		);
	}
	if (result.status !== "Accepted" || typeof result.textId !== "string") {
		throw new Error("Persisted submission has no Text identifier.");
	}
	return result.textId as Id<"texts">;
}

type UnknownRecord = Record<string, unknown>;

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
