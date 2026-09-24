import type { Infer } from "convex/values";
import type { Id } from "../../convex/_generated/dataModel";
import type { sentenceSegmentViewValidator } from "../../convex/modules/text/sentenceView";

export type SegmentKind =
	| "ResolvableText"
	| "OpaqueText"
	| "Whitespace"
	| "Punctuation";

/** A stored Segment as a Visitor sees it in the reader. */
export type SentenceSegmentView = Readonly<
	Infer<typeof sentenceSegmentViewValidator>
>;

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
