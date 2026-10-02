/**
 * How a `segment.inUnits` answer groups a Sentence's Segments against its
 * Spec Record (#701). Hovering a Segment highlights the other Segments of its
 * unit, so a unit's Segment set matters even where exact membership misses:
 * which Segment pairs stay together, which returned units join Segments of
 * several gold units, and which gold units come back split. Only
 * ResolvableText Segments count.
 *
 * Every gold unit a record asserts is complete, Partial records included:
 * a Segment outside it belongs to another unit. A pair of Segments no gold
 * unit asserts is undecided. `Unresolved` and Foreign gold units are Stubs,
 * as in the evaluator: their own grouping goes unscored, but a Segment of
 * theirs joined to another unit's Segment is a false pair.
 */
import type { SegmentInUnitsInput, Unit } from "./segment-in-units.js";

/** Gold units the evaluator does not score yet (#730, #701). */
export const awaitsForeignScoring = (route: Unit["route"]) =>
	route === "Unresolved" || route.family === "Foreign";

/** The Segments of a returned unit that came from one gold unit, or that no gold unit asserts. */
export type GroupingPart = {
	readonly text: string;
	/** The gold unit's index in the ideal output; absent for Segments no gold unit asserts. */
	readonly unit?: number;
};

/** A returned unit that joins Segments of two or more gold units. */
export type OverMerge = {
	/** Its scored Segments. */
	readonly segments: readonly number[];
	readonly text: string;
	/** Its Segments by gold unit, in Segment order. */
	readonly parts: readonly GroupingPart[];
};

/** A scored gold unit whose Segments came back in two or more returned units. */
export type UnderMerge = {
	readonly unit: number;
	readonly text: string;
	/**
	 * Its Segments by returned unit, in Segment order; a Segment no returned
	 * unit holds is a fragment of its own.
	 */
	readonly fragments: readonly string[];
};

export type GroupingCheck = {
	/** Unordered Segment pairs inside one scored gold unit. */
	readonly goldPairs: number;
	/** Of those, the pairs one returned unit also holds. */
	readonly recalledPairs: number;
	/**
	 * Returned Segment pairs whose truth the gold decides: at least one
	 * Segment in a gold unit, and not both in one Stub. On a Full record,
	 * every returned pair.
	 */
	readonly decidedPairs: number;
	/** Of those, the pairs inside one gold unit. */
	readonly truePairs: number;
	readonly overMerged: readonly OverMerge[];
	readonly underMerged: readonly UnderMerge[];
};

/** The unordered pairs of ascending Segments, each keyed `a-b`. */
const pairsOf = (segments: readonly number[]) =>
	segments.flatMap((a, index) =>
		segments.slice(index + 1).map((b) => [`${a}-${b}`, [a, b]] as const),
	);

export function checkGrouping(args: {
	readonly segments: SegmentInUnitsInput["segments"];
	readonly ideal: readonly Unit[];
	readonly returned: readonly Unit[];
}): GroupingCheck {
	const scoredOf = (unit: Unit) =>
		[...new Set(unit.segments)]
			.filter((index) => args.segments[index]?.kind === "ResolvableText")
			.sort((a, b) => a - b);
	const textOf = (segments: readonly number[]) =>
		segments.map((index) => args.segments[index]?.text ?? "").join(" ");
	const gold = args.ideal.map((unit) => ({
		segments: scoredOf(unit),
		stub: awaitsForeignScoring(unit.route),
	}));
	const goldUnitOf = new Map<number, number>();
	gold.forEach(({ segments }, unit) => {
		for (const segment of segments) goldUnitOf.set(segment, unit);
	});
	const returned = args.returned
		.map(scoredOf)
		.filter((segments) => segments.length > 0);
	const returnedPairs = new Map(returned.flatMap(pairsOf));
	let goldPairs = 0;
	let recalledPairs = 0;
	for (const { segments, stub } of gold) {
		if (stub) continue;
		for (const [pair] of pairsOf(segments)) {
			goldPairs++;
			if (returnedPairs.has(pair)) recalledPairs++;
		}
	}
	let decidedPairs = 0;
	let truePairs = 0;
	for (const pair of returnedPairs.values()) {
		const [left, right] = pair.map((segment) => goldUnitOf.get(segment));
		if (left === undefined && right === undefined) continue;
		if (left === right && left !== undefined && gold[left]?.stub) continue;
		decidedPairs++;
		if (left === right) truePairs++;
	}
	const overMerged = returned.flatMap((segments): OverMerge[] => {
		const parts = new Map<number | undefined, number[]>();
		for (const segment of segments) {
			const unit = goldUnitOf.get(segment);
			parts.set(unit, [...(parts.get(unit) ?? []), segment]);
		}
		const asserted = [...parts.keys()].some((unit) => unit !== undefined);
		if (parts.size < 2 || !asserted) return [];
		return [
			{
				segments,
				text: textOf(segments),
				parts: [...parts].map(([unit, members]) => ({
					text: textOf(members),
					...(unit === undefined ? {} : { unit }),
				})),
			},
		];
	});
	const underMerged = gold.flatMap(
		({ segments, stub }, unit): UnderMerge[] => {
			if (stub || segments.length < 2) return [];
			const fragments = new Map<number | string, number[]>();
			for (const segment of segments) {
				const holder = returned.findIndex((members) =>
					members.includes(segment),
				);
				const key = holder === -1 ? `alone ${segment}` : holder;
				fragments.set(key, [...(fragments.get(key) ?? []), segment]);
			}
			if (fragments.size < 2) return [];
			return [
				{
					unit,
					text: textOf(segments),
					fragments: [...fragments.values()].map(textOf),
				},
			];
		},
	);
	return {
		goldPairs,
		recalledPairs,
		decidedPairs,
		truePairs,
		overMerged,
		underMerged,
	};
}
