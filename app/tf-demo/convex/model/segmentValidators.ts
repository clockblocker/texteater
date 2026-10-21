import { v } from "convex/values";
import { literalUnion } from "./literalUnion";

const segmentKindValues = [
	"ResolvableText",
	"OpaqueText",
	"Whitespace",
	"Punctuation",
] as const;

export const segmentKindValidator = literalUnion(segmentKindValues);

export const segmentResolutionStateValidator = v.union(
	v.object({
		kind: v.literal("Active"),
		activeSessionCount: v.number(),
	}),
	v.object({ kind: v.literal("Unresolved") }),
	v.object({ kind: v.literal("PermanentFailure") }),
);

export const segmentInputValidator = v.object({
	kind: segmentKindValidator,
	text: v.string(),
});

/** A Segment to store; `surface` marks a fusion component. */
export const storedSegmentInputValidator = v.object({
	kind: segmentKindValidator,
	text: v.string(),
	/** The word the Segment stands for: `in` for the `i` of `im`, `es` for `'s`. */
	surface: v.optional(v.string()),
});

/** A stored Segment at its storage key; see server/storedSegments.ts. */
export const storedSegmentValidator = storedSegmentInputValidator.extend({
	index: v.number(),
});
