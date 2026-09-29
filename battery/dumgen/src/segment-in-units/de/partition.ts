/**
 * Turns judged links between pieces into a partition, and a partition with
 * routes into a `segment.inUnits` output. Every piece ends in exactly one
 * unit.
 */
import type {
	SegmentInUnitsOutput,
	Unit,
} from "../../evaluation/spec-corpus/segment-in-units.js";
import { type RouteKey, routeOf } from "./routes.js";
import type { Sentence } from "./sentence.js";

/** Groups of piece ids, each sorted, ordered by first piece. */
export type Partition = readonly (readonly number[])[];

export class UnionFind {
	readonly #parent = new Map<number, number>();
	find(id: number): number {
		let root = id;
		while (this.#parent.has(root) && this.#parent.get(root) !== root)
			root = this.#parent.get(root) ?? root;
		this.#parent.set(id, root);
		return root;
	}
	union(left: number, right: number): void {
		const a = this.find(left);
		const b = this.find(right);
		if (a !== b) this.#parent.set(Math.max(a, b), Math.min(a, b));
	}
}

export function partitionOf(
	ids: readonly number[],
	links: Iterable<readonly [number, number]>,
): Partition {
	const sets = new UnionFind();
	for (const id of ids) sets.find(id);
	for (const [left, right] of links) sets.union(left, right);
	const groups = new Map<number, number[]>();
	for (const id of ids) {
		const root = sets.find(id);
		const group = groups.get(root) ?? [];
		group.push(id);
		groups.set(root, group);
	}
	return [...groups.values()]
		.map((group) => group.sort((a, b) => a - b))
		.sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0));
}

export function singletons(sentence: Sentence): Partition {
	return sentence.pieces.map((piece) => [piece.id]);
}

export const groupKey = (group: readonly number[]) => group.join(",");

/** The output: each group's Segments with its route key. */
export function outputOf(
	sentence: Sentence,
	partition: Partition,
	routeFor: (group: readonly number[]) => RouteKey,
): SegmentInUnitsOutput {
	const units: Unit[] = partition.map((group) => ({
		segments: group.map((id) => {
			const piece = sentence.pieces[id - 1];
			if (!piece) throw Error(`No piece p${id}`);
			return piece.segment;
		}),
		route: routeOf(routeFor(group)),
	}));
	return { units };
}

/** The gold partition of a case: its units' pieces; unannotated pieces alone. */
export function partitionOfUnits(
	sentence: Sentence,
	units: readonly Unit[],
): Partition {
	const bySegment = new Map(
		sentence.pieces.map((piece) => [piece.segment, piece.id]),
	);
	const links: [number, number][] = [];
	for (const unit of units) {
		const ids = unit.segments.flatMap(
			(segment) => bySegment.get(segment) ?? [],
		);
		for (const id of ids.slice(1)) links.push([ids[0] ?? id, id]);
	}
	return partitionOf(
		sentence.pieces.map((piece) => piece.id),
		links,
	);
}

/** The argmax key of a distribution, ties to the first key. */
export function argmax(distribution: Readonly<Record<string, number>>): {
	readonly key: string;
	readonly share: number;
} {
	let best = { key: "", share: -1 };
	for (const [key, share] of Object.entries(distribution))
		if (share > best.share) best = { key, share };
	return best;
}
