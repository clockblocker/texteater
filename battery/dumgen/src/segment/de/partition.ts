/**
 * Turns links between pieces into a partition, and a partition with routes
 * into units. Every piece ends in exactly one unit.
 */
import type { Unit } from "../segmented-sentence.js";
import { routeForKey, type UnitRouteKey } from "./routes.js";
import type { Sentence } from "./sentence.js";

/** Groups of piece ids, each sorted, ordered by first piece. */
export type Partition = readonly (readonly number[])[];

class UnionFind {
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

export const groupKey = (group: readonly number[]) => group.join(",");

/** Each group's Segments with its route. */
export function unitsOf(
	sentence: Sentence,
	partition: Partition,
	routeFor: (group: readonly number[]) => UnitRouteKey,
): Unit[] {
	return partition.map((group) => ({
		segments: group.map((id) => {
			const piece = sentence.pieces[id - 1];
			if (!piece) throw Error(`No piece p${id}`);
			return piece.segment;
		}),
		route: routeForKey(routeFor(group)),
	}));
}

type Top = { readonly key: string; readonly share: number };

/**
 * The argmax key of a distribution, ties to the first key; undefined when
 * no key has a share above -1, as in an empty distribution.
 */
export function argmax(
	distribution: Readonly<Record<string, number>>,
): Top | undefined {
	let best: Top | undefined;
	for (const [key, share] of Object.entries(distribution))
		if (share > (best?.share ?? -1)) best = { key, share };
	return best;
}

/** A Choice's most probable answer other than `none`; undefined when there is none. */
export const argmaxBesideNone = (
	distribution: Readonly<Record<string, number>>,
): Top | undefined =>
	argmax(
		Object.fromEntries(
			Object.entries(distribution).filter(([key]) => key !== "none"),
		),
	);
