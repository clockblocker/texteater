import { HAND_Z } from "../core/hand";
import { overAt, partSumAt, zAt } from "../core/move";
import type { PartBox, PartShown } from "../core/parts";
import type { Pose } from "../core/plan";
import type { Neighbour } from "../core/stacking";
import { isFlat, type Lean } from "../core/tilt";
import type { Engine } from "./engine";
import { leanOf } from "./paint";
import type { BodyState } from "./state";

/** What a Body was, and how it showed, before a commit. */
export type Before = {
	readonly from: Pose;
	readonly scale: number;
	readonly form: string;
	/** The stacking order it was drawn at. */
	readonly z: number;
	/** How much each Body its crossing in flight crosses shows over it. */
	readonly showing: ReadonlyMap<string, number>;
	/** The lean it showed, if any. */
	readonly lean: Lean | null;
	/** Each Part where it lay, its offset and its opacity. */
	readonly parts: ReadonlyMap<string, PartShown>;
	/** Where each Part's face's padding box sits in the Body: what a pin is measured from. */
	readonly faces: ReadonlyMap<
		string,
		{ readonly x: number; readonly y: number }
	>;
};

/**
 * The attribute that takes every transform between a Body and its Parts
 * off while the Table reads them. Set and cleared in the one task that
 * commits, so no frame ever paints it.
 */
const MEASURING = "data-tabletop-measuring";

/** Takes the transforms off `bodies` with Parts for a read, or puts them back. */
export function measuring(bodies: Iterable<BodyState>, on: boolean) {
	for (const body of bodies)
		if (!on || body.parts.size > 0) body.el?.toggleAttribute(MEASURING, on);
}

/**
 * Where each of `body`'s Parts lies in it (but the pinned ones, unless
 * `pinned`): rect differences, exact to the sub-pixel, and true of a
 * turned or leaning Body too since its transforms are off (#1311 rule 3).
 */
export function partLayout(
	body: BodyState,
	pinned = false,
): Map<string, PartBox> {
	const boxes = new Map<string, PartBox>();
	const root = body.el;
	if (!root) return boxes;
	const origin = root.getBoundingClientRect();
	for (const part of body.parts.values()) {
		if (part.pin && !pinned) continue;
		const rect = part.el.getBoundingClientRect();
		boxes.set(part.id, {
			x: rect.left - origin.left,
			y: rect.top - origin.top,
			w: rect.width,
			h: rect.height,
		});
	}
	return boxes;
}

function facesOf(body: BodyState) {
	const faces = new Map<string, { x: number; y: number }>();
	const root = body.el;
	if (!root) return faces;
	const origin = root.getBoundingClientRect();
	for (const part of body.parts.values()) {
		const face = part.el.closest<HTMLElement>("[data-tabletop-face]");
		if (!face) continue;
		const rect = face.getBoundingClientRect();
		faces.set(part.id, {
			x: rect.left - origin.left + face.clientLeft,
			y: rect.top - origin.top + face.clientTop,
		});
	}
	return faces;
}

/** The stacking order `body` is drawn at now. */
export function drawnZ(body: BodyState, now: number): number {
	const crossing = body.moves.findLast((move) => move.crossing);
	const z = crossing ? zAt(crossing, now) : null;
	if (z !== null) return z;
	return body.mode === "rest" ? (body.place?.z ?? 0) : HAND_Z;
}

/** How much each Body `body`'s crossing in flight crosses shows over it now. */
export function showingOf(body: BodyState, now: number): Map<string, number> {
	const crossing = body.moves.findLast((move) => move.crossing);
	if (!crossing || crossing.crossing?.shape.kind === "step") return new Map();
	return overAt(crossing, now);
}

/** Every other Body on the Table, as `body`'s crossing sees it. */
export function neighbours(engine: Engine, body: BodyState): Neighbour[] {
	const out: Neighbour[] = [];
	for (const other of engine.bodies.values()) {
		if (other === body || !other.el || !other.place) continue;
		const later =
			!!body.seat &&
			!!other.seat &&
			!!(
				body.seat.compareDocumentPosition(other.seat) &
				Node.DOCUMENT_POSITION_FOLLOWING
			);
		out.push({ id: other.id, z: engine.restZ(other), later });
	}
	return out;
}

/** Every Body's rest, Parts, stacking and lean before a commit, read with transforms off (`measuring`). */
export function snapshot(engine: Engine, now: number): Map<string, Before> {
	const before = new Map<string, Before>();
	const lean = !!engine.tilt && !engine.policy.reduced;
	for (const body of engine.bodies.values()) {
		if (!body.el || !body.place || body.mode === "unmoored") continue;
		const from = engine.restPose(body);
		if (!from) continue;
		const parts = new Map<string, PartShown>();
		for (const [id, box] of partLayout(body, true)) {
			const pinned = !!body.parts.get(id)?.pin;
			parts.set(id, {
				box,
				dx: partSumAt(body.moves, id, "x", now),
				dy: partSumAt(body.moves, id, "y", now),
				opacity: Math.max(
					0,
					Math.min(
						1,
						(pinned ? 0 : 1) +
							partSumAt(body.moves, id, "opacity", now),
					),
				),
			});
		}
		const shown = lean ? leanOf(body, now) : null;
		before.set(body.id, {
			from,
			scale: engine.scaleOf(body),
			form: body.place.form,
			z: drawnZ(body, now),
			showing: showingOf(body, now),
			lean: shown && !isFlat(shown) ? shown : null,
			parts,
			faces: facesOf(body),
		});
	}
	return before;
}
