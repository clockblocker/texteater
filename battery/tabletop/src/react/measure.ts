import type { Pose } from "../core/move";
import type { Term } from "../core/term";
import type { BodyState, Engine } from "./engine";
import type { Leaving } from "./ghosts";

/** A Part's place in its Body, px from the Body's corner. */
export type Offset = { readonly x: number; readonly y: number };

/** What a Body was before a commit. */
export type Before = {
	readonly from: Pose;
	readonly scale: number;
	readonly form: string;
	/** Where each Part was laid out, without its own offset. */
	readonly parts: ReadonlyMap<string, Offset>;
	/**
	 * Each Part's Terms: a change of form mounts its Parts anew, so they
	 * carry on from here rather than from nothing.
	 */
	readonly terms: ReadonlyMap<string, readonly Term[]>;
	/** The Parts only this form has, copied in case the form changes. */
	readonly leaving: readonly Leaving[];
};

/**
 * The attribute that takes every transform between a Body and its Parts
 * off while the Table reads them: the Body's rotation, scale and tilt, its
 * Shell's turn, its faces' and its Parts' own offsets. Set and cleared in
 * the one task that commits, so no frame ever paints it.
 */
const MEASURING = "data-tabletop-measuring";

/**
 * Takes the transforms off `bodies` for a read, or puts them back. A Body
 * with no Parts has nothing to read, so it is never restyled for one: a
 * restyle of every Body on a full Table costs more than the move.
 */
export function measuring(bodies: Iterable<BodyState>, on: boolean) {
	for (const body of bodies)
		if (!on || body.parts.size > 0) body.el?.toggleAttribute(MEASURING, on);
}

/**
 * Where each of `body`'s Parts is laid out in it: rect differences, exact
 * to the sub-pixel where `offsetLeft` would round to whole px, and true of
 * a rotated or tilted Body too since its transforms are off (#1311 rule 3).
 */
export function partLayout(body: BodyState): Map<string, Offset> {
	const offsets = new Map<string, Offset>();
	const root = body.el;
	if (!root || body.parts.size === 0) return offsets;
	const origin = root.getBoundingClientRect();
	for (const part of body.parts.values()) {
		const rect = part.el.getBoundingClientRect();
		offsets.set(part.id, {
			x: rect.left - origin.left,
			y: rect.top - origin.top,
		});
	}
	return offsets;
}

/** A copy of each Part only `form` has, with where it sits in its face. */
function leavingOf(
	body: BodyState,
	form: string,
	offsets: ReadonlyMap<string, Offset>,
): Leaving[] {
	const leaving: Leaving[] = [];
	for (const part of body.parts.values()) {
		if (part.only !== form) continue;
		const face = part.el.closest<HTMLElement>("[data-tabletop-face]");
		const at = offsets.get(part.id);
		if (!face || !at) continue;
		const inFace = face.getBoundingClientRect();
		const rect = part.el.getBoundingClientRect();
		leaving.push({
			id: part.id,
			at,
			copy: part.el.cloneNode(true) as HTMLElement,
			face,
			x: rect.left - inFace.left - face.clientLeft,
			y: rect.top - inFace.top - face.clientTop,
			width: rect.width,
			height: rect.height,
		});
	}
	return leaving;
}

/**
 * Every Body's rest and Parts before a commit; the Parts are read with
 * their transforms off (`measuring`).
 */
export function snapshot(engine: Engine): Map<string, Before> {
	const before = new Map<string, Before>();
	for (const body of engine.bodies.values()) {
		if (!body.el || !body.place || body.mode === "unmoored") continue;
		const from = engine.restPose(body);
		if (!from) continue;
		const parts = partLayout(body);
		before.set(body.id, {
			from,
			scale: engine.scaleOf(body),
			form: body.place.form,
			parts,
			terms: new Map(
				[...body.parts.values()].map((part) => [part.id, part.terms]),
			),
			leaving: leavingOf(body, body.place.form, parts),
		});
	}
	return before;
}
