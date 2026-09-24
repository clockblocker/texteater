import type { Infer } from "convex/values";
import type { Id } from "../../convex/_generated/dataModel";
import type { sentenceSegmentViewValidator } from "../../convex/modules/text/sentenceView";

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
