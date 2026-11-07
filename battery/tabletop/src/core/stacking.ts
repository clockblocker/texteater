import type { Crossing } from "./move";
import type { Shape } from "./shape";

/** Another Body on the Table, as a crossing sees it. */
export type Neighbour = {
	readonly id: string;
	/** Its resting stacking order. */
	readonly z: number;
	/** Whether it comes later among the seats, so it wins a tie. */
	readonly later: boolean;
};

/** Whether `other` is drawn over a Body at `z`. */
function overAtZ(other: Neighbour, z: number): boolean {
	return other.z === z ? other.later : other.z > z;
}

/**
 * The crossing a change of stacking makes: the Body is shown at `from`
 * (with whatever a crossing still in flight shows, `showing`) and rests
 * at `to`. Each other Body whose order against it ends differently from
 * how it shows now is crossed, from how much it shows over the Body now to
 * all or nothing; one already where it ends is left out. `null` when
 * nothing is crossed. A cut (`step`) crosses nothing: it switches the
 * order at its time, as deck-of-cards' tricks do.
 */
export function crossing({
	from,
	to,
	others,
	showing,
	shape,
}: {
	readonly from: number;
	readonly to: number;
	readonly others: readonly Neighbour[];
	/** How much each Body a crossing in flight crosses shows over this one now. */
	readonly showing: ReadonlyMap<string, number>;
	readonly shape: Shape;
}): Crossing | null {
	if (shape.kind === "step")
		return from === to ? null : { from, to, over: new Map(), shape };
	const over = new Map<string, { from: number; to: number }>();
	for (const other of others) {
		const now = showing.get(other.id) ?? (overAtZ(other, from) ? 1 : 0);
		const end = overAtZ(other, to) ? 1 : 0;
		if (Math.abs(now - end) > 1e-3)
			over.set(other.id, { from: now, to: end });
	}
	/* a change of order no other Body sees is no crossing: it lands at once */
	if (over.size === 0) return null;
	return { from, to, over, shape };
}
