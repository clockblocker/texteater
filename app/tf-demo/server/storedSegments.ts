import type { Infer } from "convex/values";
import type {
	storedSegmentInputValidator,
	storedSegmentValidator,
	storedUnitValidator,
} from "../convex/model/validators";

/**
 * The stored Segment module. It owns what tf-demo stores for a Sentence:
 * its Segments as intake's `segment.inUnits` cut them, a fused word as its
 * pieces when segmentation split it, the per-Sentence bound, the units that
 * index into the Segments, and the conversion to a click's Sentence.
 *
 * Stored rows are keyed by `index`, the Segment's index in its Sentence,
 * which is also how units and Attestation memberships name a Segment
 * (Dumgen ADR 0004, amended for #767). Reading the stored rows is the
 * Convex layer's `loadStoredSegments`.
 */

/** A Segment to store; `surface` marks a fusion component. */
export type StoredSegmentValue = Infer<typeof storedSegmentInputValidator>;

/** A stored Segment at its storage key. */
export type StoredSegment = Infer<typeof storedSegmentValidator>;

/** One biggest unit as a Sentence stores it. */
export type StoredUnit = Infer<typeof storedUnitValidator>;

/**
 * A unit as Dumgen's `segment.inUnits` returns it, copied as a Sentence
 * stores it: its Segments, its route, its variants, and the closed-class
 * identity its route judge picked (#864), which a click reads.
 */
export function storedUnitOf(unit: {
	readonly segments: readonly number[];
	readonly route:
		| "Unresolved"
		| { readonly family: string; readonly kind: string };
	readonly variants?: readonly {
		readonly family: string;
		readonly kind: string;
	}[];
	readonly identity?: {
		readonly kind: "DET" | "PRON";
		readonly canonicalForm: string;
		readonly pronType: string | null;
		readonly poss?: "Yes";
	};
}): StoredUnit {
	return {
		segments: [...unit.segments],
		route: unit.route === "Unresolved" ? "Unresolved" : { ...unit.route },
		...(unit.variants
			? { variants: unit.variants.map((route) => ({ ...route })) }
			: {}),
		...(unit.identity ? { identity: { ...unit.identity } } : {}),
	} as StoredUnit;
}

/** Intake stores at most this many Segments in one Sentence. */
export const MAX_SEGMENTS_PER_SENTENCE = 512;

/**
 * The word a Segment stands for, for looking Lemmas up: a fusion component's
 * surface, else its text. An Attestation member is attested as the text.
 */
export function spellingOf(segment: {
	readonly text: string;
	readonly surface?: string;
}): string {
	return segment.surface ?? segment.text;
}

/**
 * Checks that stored Segments form their Sentence: contiguous zero-based
 * indices, non-empty text, and texts that concatenate to the Stitched Text.
 */
export function assertStoredSentence(stored: {
	readonly stitchedText: string;
	readonly segments: readonly Pick<
		StoredSegment,
		"index" | "kind" | "text"
	>[];
}): void {
	const ordered = [...stored.segments].sort(
		(left, right) => left.index - right.index,
	);
	for (const [expectedIndex, { index, text }] of ordered.entries()) {
		if (index !== expectedIndex) {
			throw new Error(
				"Persisted Segment indices must be contiguous and zero-based.",
			);
		}
		if (text.length === 0) {
			throw new Error("Persisted Segment data is invalid.");
		}
	}
	if (ordered.map(({ text }) => text).join("") !== stored.stitchedText) {
		throw new Error(
			"Persisted Segments do not reconstruct the Stitched Text.",
		);
	}
}

/**
 * Checks that units cover a Sentence's Segments as `segment.inUnits` leaves
 * them: each unit names ascending indices of ResolvableText Segments, and
 * every ResolvableText Segment belongs to exactly one unit.
 */
function assertStoredUnits(
	segments: readonly Pick<StoredSegment, "kind">[],
	units: readonly StoredUnit[],
): void {
	const owned = new Set<number>();
	for (const unit of units) {
		if (unit.segments.length === 0)
			throw new Error("A unit must name at least one Segment.");
		unit.segments.forEach((index, position) => {
			if (
				!Number.isSafeInteger(index) ||
				segments[index]?.kind !== "ResolvableText"
			)
				throw new Error(
					`Unit member ${index} is not a ResolvableText Segment.`,
				);
			if (position > 0 && index <= (unit.segments[position - 1] ?? -1))
				throw new Error(
					"A unit names its Segments in ascending order.",
				);
			if (owned.has(index))
				throw new Error(`Segment ${index} belongs to two units.`);
			owned.add(index);
		});
	}
	segments.forEach((segment, index) => {
		if (segment.kind === "ResolvableText" && !owned.has(index))
			throw new Error(`Segment ${index} belongs to no unit.`);
	});
}

/**
 * Checks a Sentence's units as `assertStoredUnits` does, or that a Sentence
 * whose segmentation failed stores none.
 */
export function assertSentenceUnits(sentence: {
	readonly segments: readonly Pick<StoredSegment, "kind">[];
	readonly units: readonly StoredUnit[];
	readonly segmentationFailed?: true;
}): void {
	if (!sentence.segmentationFailed)
		assertStoredUnits(sentence.segments, sentence.units);
	else if (sentence.units.length > 0)
		throw new Error(
			"A Sentence whose segmentation failed stores no units.",
		);
}

/** Each ResolvableText Segment as its own `Unresolved` unit. */
export function unresolvedUnits(
	segments: readonly Pick<StoredSegment, "kind">[],
): StoredUnit[] {
	return segments.flatMap((segment, index) =>
		segment.kind === "ResolvableText"
			? [{ segments: [index], route: "Unresolved" as const }]
			: [],
	);
}

/**
 * Units for a Sentence whose one occurrence is known in advance, as
 * fixtures store it: the occurrence's members form one unit on `route`,
 * and every other ResolvableText Segment is its own Unresolved unit.
 */
export function unitsAroundOccurrence(
	segments: readonly Pick<StoredSegment, "kind">[],
	members: readonly number[],
	route: StoredUnit["route"],
): StoredUnit[] {
	const occurrence: StoredUnit = {
		segments: [...members].sort((left, right) => left - right),
		route,
	};
	return [
		...unresolvedUnits(segments).filter(
			(unit) => !members.includes(unit.segments[0] ?? -1),
		),
		occurrence,
	].sort((left, right) => (left.segments[0] ?? 0) - (right.segments[0] ?? 0));
}

/** Each unit member's index, mapped to the unit holding it. */
export function unitsByMember(
	units: readonly StoredUnit[] | undefined,
): ReadonlyMap<number, StoredUnit> {
	return new Map(
		(units ?? []).flatMap((unit) =>
			unit.segments.map((index) => [index, unit] as const),
		),
	);
}

/**
 * The Sentence a click resolves against: the stored Segments as they are,
 * so a fused word arrives as its pieces (`i` + `m`) and a click's index is
 * the stored index. The caller validates the stored Segments.
 */
export function encounterSentenceOf(stored: {
	readonly segmentedSentenceId: string;
	readonly segments: readonly StoredSegment[];
}): {
	readonly id: string;
	readonly language: "de";
	readonly segments: readonly Pick<StoredSegment, "kind" | "text">[];
} {
	return Object.freeze({
		id: stored.segmentedSentenceId,
		language: "de",
		segments: Object.freeze(
			[...stored.segments]
				.sort((left, right) => left.index - right.index)
				.map(({ kind, text }) => Object.freeze({ kind, text })),
		),
	});
}
