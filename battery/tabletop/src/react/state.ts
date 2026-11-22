import type { Box, Point } from "../core/geometry";
import type { Move } from "../core/move";
import type { PartBox } from "../core/parts";
import type { Place } from "../core/place";
import type { Lean, LeanTerm } from "../core/tilt";
import type { Spans, Written } from "./write";

/** Where a Body stands: on its Slot, in the hand, or leaving for good. */
export type Mode = "rest" | "hand" | "unmoored";

/** What a held or leaving Body stands on in place of its Place: physical degrees, its scale, z, opacity. */
export type Base = {
	readonly rotate: number;
	readonly scale: number;
	readonly z: number;
	readonly opacity: number;
};

export const REST_BASE: Base = { rotate: 0, scale: 1, z: 0, opacity: 1 };

export type PartState = {
	readonly id: string;
	readonly el: HTMLElement;
	/** The one form it belongs to, if it has one. */
	readonly only: string | undefined;
	readonly written: Written;
	/** Where its offsets' move started, which snapping never passes. */
	spans: Spans;
	/**
	 * Where it is pinned in its face while it leaves with its form: out of
	 * the new form's flow, at the place it showed, px in the face.
	 */
	pin: PartBox | null;
};

/** A Body's lean toward the pointer: where it heads and how it gets there. */
type LeanState = { target: Lean; terms: LeanTerm[] };

export type BodyState = {
	readonly id: string;
	/** The element while mounted: the Body, which carries every offset. */
	el: HTMLElement | null;
	/**
	 * The invisible box it sits in: anchored to its Slot at rest, or fixed
	 * where the hand took it. Written only when its stacking or mode
	 * changes, never once a frame.
	 */
	seat: HTMLElement | null;
	/** The element last mounted, to tell a remount from a re-attach. */
	mounted: HTMLElement | null;
	shell: HTMLElement | null;
	/** The Shell's front face element, cached by ref to avoid per-frame DOM queries. */
	front: HTMLElement | null;
	/** The Place last committed, which the Body's CSS reads. */
	place: Place | null;
	/** Every Move in flight: its rest plus these is what it shows. */
	moves: Move[];
	/** Where the box's offsets started, which snapping never rounds back past. */
	spans: Spans;
	mode: Mode;
	/** The px box in client coordinates while held or leaving. */
	box: Box | null;
	/** The px box the seat stands on while held or leaving. */
	seatBox: Box | null;
	base: Base;
	/** The pointer's offset from the box's corner while held. */
	grab: Point;
	readonly parts: Map<string, PartState>;
	readonly written: Written;
	readonly seatWritten: Written;
	/** Its lean toward the pointer, at rest or in the hand. */
	lean: LeanState | null;
	/** Its Glares, which only its lean lights. */
	readonly lights: Set<HTMLElement>;
	/** Its corner radius, px, read once: the shape it veils others in. */
	radius: number | null;
	/** Tells its React side that the forms it was leaving are gone. */
	settleForms: (() => void) | null;
};

export function bodyState(id: string): BodyState {
	return {
		id,
		el: null,
		seat: null,
		mounted: null,
		shell: null,
		front: null,
		place: null,
		moves: [],
		spans: {},
		mode: "rest",
		box: null,
		seatBox: null,
		base: REST_BASE,
		grab: { x: 0, y: 0 },
		parts: new Map(),
		written: new Map(),
		seatWritten: new Map(),
		lean: null,
		lights: new Set(),
		radius: null,
		settleForms: null,
	};
}
