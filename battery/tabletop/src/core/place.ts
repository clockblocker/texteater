import type { Logical } from "./geometry";

export type SlotId = string;
export type RegionId = string;
export type Side = "front" | "back";

/**
 * Where a Presentation rests. The Slot gives the box; the rest is data the
 * Body's CSS reads: a rotation about the box's centre in logical degrees
 * (mirrored in RTL), a scale, a stacking order, the side that faces up and
 * the app's name for the form.
 */
export type Place = {
	readonly slot: SlotId;
	readonly rotate: number;
	readonly scale: number;
	readonly z: number;
	readonly side: Side;
	readonly form: string;
};

/** A Place with the defaults filled in: upright, full size, face up, a Card. */
export function place(
	slot: SlotId,
	rest: Partial<Omit<Place, "slot">> = {},
): Place {
	return {
		slot,
		rotate: rest.rotate ?? 0,
		scale: rest.scale ?? 1,
		z: rest.z ?? 0,
		side: rest.side ?? "front",
		form: rest.form ?? "card",
	};
}

/**
 * An invisible box in a Region, laid out by ordinary CSS: logical insets
 * and sizes in any units a Region's size container resolves (`%`, `cq*`,
 * `rem`, `calc()`, `min()`, trig).
 */
export type SlotSpec = {
	readonly id: SlotId;
	readonly region: RegionId;
	readonly style: {
		readonly insetInlineStart: string;
		readonly top: string;
		readonly width: string;
		readonly height: string;
	};
};

/**
 * A Slot a pose puts a Card in, with the rotation its Place takes and
 * where its centre is, in rem from the Region's centre: what a Trick's
 * waypoints are measured against.
 */
export type Posed = {
	readonly id: string;
	readonly slot: SlotSpec;
	readonly rotate: number;
	readonly centre: Logical;
};
