import type * as Dumling from "dumling/types";
import type { StoredSegment } from "./storedSegments";

/**
 * The Encounter a click resolves: a stored Sentence and the occurrence
 * Grammar names in it. It loads nothing heavy, so isolate-side Convex
 * modules that restore a Grammar checkpoint can read it.
 */

/** The Sentence a click resolves against: its stored Segments, a fused word as its pieces. */
export type ClickSentence = {
	readonly id: string;
	readonly language: "de";
	readonly segments: readonly Pick<StoredSegment, "kind" | "text">[];
};

/**
 * The occurrence Grammar resolved: its Sentence and the route and stored
 * indices of its members.
 */
export type ClickEncounter = {
	readonly sentence: ClickSentence;
	readonly target: {
		readonly family: Dumling.Family<"de">;
		readonly kind: Dumling.Kind<"de">;
		readonly memberSegmentIndices: readonly number[];
	};
};

/**
 * Checks that an Encounter names members of its own Sentence: at least one,
 * ascending, each a ResolvableText Segment.
 */
export function validateClickEncounter(value: unknown): ClickEncounter {
	const encounter = value as ClickEncounter;
	const segments = encounter?.sentence?.segments;
	const members = encounter?.target?.memberSegmentIndices;
	if (
		!encounter ||
		typeof encounter.sentence.id !== "string" ||
		encounter.sentence.language !== "de" ||
		!Array.isArray(segments) ||
		!Array.isArray(members) ||
		members.length === 0 ||
		typeof encounter.target.family !== "string" ||
		typeof encounter.target.kind !== "string"
	)
		throw new Error("Invalid Encounter.");
	members.forEach((index, position) => {
		if (
			!Number.isSafeInteger(index) ||
			segments[index]?.kind !== "ResolvableText" ||
			(position > 0 && index <= (members[position - 1] ?? -1))
		)
			throw new Error(
				"An Encounter's members must be ascending ResolvableText Segments of its Sentence.",
			);
	});
	return encounter;
}
