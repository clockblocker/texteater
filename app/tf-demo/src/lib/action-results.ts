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
	readonly attestationId?: Id<"attestations">;
	readonly encountered: boolean;
	readonly resolutionState?: "Active" | "Unresolved" | "PermanentFailure";
};

export type SentenceView = {
	readonly sentenceId: Id<"sentences">;
	readonly position: number;
	readonly language: "de" | "he";
	readonly stitchedText: string;
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

export function parseResolvedReadingId(
	resultValue: unknown,
): Id<"readings"> | null {
	const result = requireRecord(resultValue, "Resolution result");
	const grammatical = requireRecord(
		result.grammatical,
		"Grammatical resolution",
	);
	if (grammatical.decision !== "Resolved") return null;

	const persisted = requireRecord(result.persisted, "Persisted resolution");
	if (
		persisted.status !== "Committed" &&
		persisted.status !== "Reused" &&
		persisted.status !== "Resolved"
	) {
		return null;
	}
	if (typeof persisted.readingId !== "string") {
		throw new Error("A resolved Segment has no Reading identifier.");
	}
	return persisted.readingId as Id<"readings">;
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
