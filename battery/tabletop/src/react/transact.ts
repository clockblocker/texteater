import type { Move, Pose } from "../core/move";
import { reduce, reduceFollowers } from "../core/reduce";
import { retarget } from "../core/retarget";
import { ARRIVAL, DECK_OF_CARDS, SPRINGS } from "../core/springs";
import {
	BOX_CHANNELS,
	type Curve,
	done,
	sumAt,
	type Term,
	timeToShare,
} from "../core/term";
import { FLAT } from "../core/tilt";
import type { BodyState, Engine } from "./engine";
import { haunt, type Leaving } from "./ghosts";
import { steer } from "./tilt";

/** The Move for each Body a commit changes; the rest reflow or morph. */
export type Moves =
	| ReadonlyMap<string, Move>
	| ((id: string) => Move | undefined);

type Offset = { readonly x: number; readonly y: number };

type Before = {
	readonly from: Pose;
	readonly scale: number;
	readonly form: string;
	readonly parts: ReadonlyMap<string, Offset>;
	/** The Parts only this form has, copied in case the form changes. */
	readonly leaving: readonly Leaving[];
};

type Changed = {
	readonly body: BodyState;
	readonly before: Before | undefined;
	/** The Terms the change added, before `reduce`. */
	readonly added: readonly Term[];
};

/** A part's place in its Body, ignoring every transform on the way. */
function offsetIn(el: HTMLElement, root: HTMLElement): Offset {
	let x = 0;
	let y = 0;
	let node: HTMLElement | null = el;
	while (node && node !== root) {
		x += node.offsetLeft;
		y += node.offsetTop;
		const parent: Element | null = node.offsetParent;
		node = parent instanceof HTMLElement ? parent : null;
	}
	return { x, y };
}

/** Where each part is laid out in its Body, plus, with `now`, its Terms. */
function partOffsets(body: BodyState, now?: number): Map<string, Offset> {
	const offsets = new Map<string, Offset>();
	const root = body.el;
	if (!root) return offsets;
	for (const part of body.parts.values()) {
		const at = offsetIn(part.el, root);
		offsets.set(
			part.id,
			now === undefined
				? at
				: {
						x: at.x + sumAt(part.terms, "x", now),
						y: at.y + sumAt(part.terms, "y", now),
					},
		);
	}
	return offsets;
}

function moveOf(moves: Moves | undefined, id: string): Move | undefined {
	if (!moves) return undefined;
	return typeof moves === "function" ? moves(id) : moves.get(id);
}

function differs(from: Pose, to: Pose): boolean {
	for (const channel of Object.keys(to) as (keyof Pose)[]) {
		const limit = channel === "lift" || channel === "opacity" ? 1e-3 : 0.5;
		if (Math.abs((from[channel] ?? 0) - (to[channel] ?? 0)) > limit)
			return true;
	}
	return false;
}

/** A copy of each Part only `form` has, with where it sits in its face. */
function leavingOf(
	body: BodyState,
	form: string,
	offsets: ReadonlyMap<string, Offset>,
): Leaving[] {
	const root = body.el;
	if (!root) return [];
	const leaving: Leaving[] = [];
	for (const part of body.parts.values()) {
		if (part.only !== form) continue;
		const face = part.el.closest<HTMLElement>("[data-tabletop-face]");
		const at = offsets.get(part.id);
		if (!face || !at) continue;
		const faceAt = offsetIn(face, root);
		leaving.push({
			id: part.id,
			at,
			copy: part.el.cloneNode(true) as HTMLElement,
			face,
			x: at.x - faceAt.x,
			y: at.y - faceAt.y,
			width: part.el.offsetWidth,
			height: part.el.offsetHeight,
		});
	}
	return leaving;
}

function snapshot(engine: Engine, now: number): Map<string, Before> {
	const before = new Map<string, Before>();
	for (const body of engine.bodies.values()) {
		if (!body.el || !body.place || body.mode === "unmoored") continue;
		const from = engine.restPose(body);
		if (!from) continue;
		const parts = partOffsets(body, now);
		before.set(body.id, {
			from,
			scale: engine.scaleOf(body),
			form: body.place.form,
			parts,
			leaving: leavingOf(body, body.place.form, parts),
		});
	}
	return before;
}

function assertSlots(engine: Engine) {
	if (!engine.assert) return;
	for (const body of engine.bodies.values()) {
		if (!body.el || !body.place || body.mode !== "rest") continue;
		if (!engine.slots.has(body.place.slot))
			console.error(
				`tabletop: Body "${body.id}" rests on Slot "${body.place.slot}", which isn't mounted, so it falls to its static position.`,
			);
	}
}

function retargetBody(
	engine: Engine,
	body: BodyState,
	before: Before | undefined,
	move: Move | undefined,
	now: number,
): Changed | null {
	/* a held Body stays in the hand until a release; a leaving one stays
	   gone unless a move deals it back */
	if (body.mode === "hand") {
		if (move?.source !== "hand") return null;
		engine.moor(body);
	}
	if (body.mode === "unmoored") {
		if (!move) return null;
		engine.moor(body);
	}
	const to = engine.restPose(body);
	if (!to || !body.place) return null;
	const formChanged = !!before && before.form !== body.place.form;
	const from: Pose = before
		? { ...before.from, lift: before.scale / engine.scaleOf(body) - 1 }
		: to;
	if (!move && !formChanged && !differs(from, to)) return null;
	const chosen: Move = move ?? {
		source: "app",
		spring: formChanged ? SPRINGS.morph : SPRINGS.reflow,
	};
	const { kept, added } = retarget({
		live: body.terms,
		from,
		to,
		move: chosen,
		now,
		turn: { ms: engine.turn.ms, ease: DECK_OF_CARDS.ease },
	});
	body.terms = [...kept, ...reduce(added, engine.policy)];
	return { body, before, added };
}

/** The Term of the change that moved the box most: what parts follow. */
function leaderOf(added: readonly Term[]): Term | undefined {
	let leader: Term | undefined;
	for (const term of added)
		if (
			(BOX_CHANNELS as readonly string[]).includes(term.channel) &&
			(!leader || Math.abs(term.delta) > Math.abs(leader.delta))
		)
			leader = term;
	return leader;
}

/** A part's curve: the box's, scaled to its own distance. */
function follow(leader: Term | undefined, delta: number): Curve {
	if (!leader) return { kind: "spring", ...SPRINGS.morph, velocity: 0 };
	const curve = leader.curve;
	if (curve.kind === "spring") {
		const rate = leader.delta === 0 ? 0 : -curve.velocity / leader.delta;
		return { ...curve, velocity: -delta * rate };
	}
	return {
		kind: "tween",
		ms: curve.ms,
		ease: Array.isArray(curve.ease)
			? (curve.ease[0] ?? ((t: number) => t))
			: (curve.ease as (t: number) => number),
	};
}

function partTerm(
	channel: "x" | "y",
	delta: number,
	leader: Term | undefined,
	now: number,
): Term {
	return {
		channel,
		delta,
		curve: follow(leader, delta),
		delayMs: leader?.delayMs ?? 0,
		bornAt: now,
		source: leader?.source ?? "app",
	};
}

/** How far across the part that stays nearest to `leaving` moves. */
function shiftNear(
	leaving: Leaving,
	before: ReadonlyMap<string, Offset>,
	after: ReadonlyMap<string, Offset>,
): number {
	let shift = 0;
	let nearest = Number.POSITIVE_INFINITY;
	for (const [id, was] of before) {
		const at = after.get(id);
		if (!at) continue;
		const distance = Math.hypot(was.x - leaving.at.x, was.y - leaving.at.y);
		if (distance < nearest) {
			nearest = distance;
			shift = at.x - was.x;
		}
	}
	return shift;
}

/**
 * Each part's move inside its Body: a position-only FLIP in body-local px
 * (`offsetLeft`/`offsetTop`, which ignore transforms), read after the
 * box's first frame is written so the part starts where it showed. Parts
 * only the new form has fade in after the box is most of the way there;
 * parts only the old form had leave as copies (`haunt`) that travel across
 * with the nearest part that stays. They keep their height in the face, so
 * two of them never cross; the shrinking face clips them as they fade.
 */
function flipParts(
	change: Changed,
	after: ReadonlyMap<string, Offset>,
	engine: Engine,
	now: number,
) {
	const { body, before } = change;
	const leader = leaderOf(change.added);
	const arriving: string[] = [];
	for (const part of body.parts.values()) {
		const at = after.get(part.id);
		const was = before?.parts.get(part.id);
		if (!at) continue;
		if (!was) {
			if (before) arriving.push(part.id);
			continue;
		}
		const terms = [
			partTerm("x", was.x - at.x, leader, now),
			partTerm("y", was.y - at.y, leader, now),
		].filter((term) => Math.abs(term.delta) >= 0.5);
		const live = part.terms.filter(
			(term) => term.channel === "opacity" && !done(term, now),
		);
		part.terms = [
			...live,
			...reduceFollowers(terms, change.added, engine.policy),
		];
	}
	if (before && before.form !== body.place?.form)
		for (const leaving of before.leaving) {
			const shift = shiftNear(leaving, before.parts, after);
			const travel = [partTerm("x", -shift, leader, now)].filter(
				(term) => Math.abs(term.delta) >= 0.5,
			);
			haunt(
				engine,
				body,
				{ ...leaving, x: leaving.x + shift },
				reduceFollowers(travel, change.added, engine.policy),
				now,
			);
		}
	const cue = leader ? timeToShare(leader, ARRIVAL.cue) : 0;
	arriving.forEach((id, index) => {
		const part = body.parts.get(id);
		if (!part) return;
		const fade: Term = {
			channel: "opacity",
			delta: -1,
			curve: { kind: "tween", ...ARRIVAL.fade },
			delayMs:
				cue + Math.min(index * ARRIVAL.staggerMs, ARRIVAL.staggerMaxMs),
			bornAt: now,
			source: "app",
		};
		part.terms = reduceFollowers([fade], change.added, engine.policy);
	});
}

/**
 * Commits `commit` and moves every Body it changed from where it showed.
 * The Slots' rects and the parts' offsets are read before and after the
 * commit, each in one batch; the first frame is written before the browser
 * paints. Every jump the model causes goes through here: one that doesn't
 * teleports. A Body whose box moves lets go of its tilt, and the Parts
 * only its old form had fade out as copies where they were.
 */
export function transact(
	engine: Engine,
	commit: (() => void) | null,
	moves?: Moves,
) {
	const before = snapshot(engine, engine.now());
	if (commit) {
		engine.transacting = true;
		try {
			engine.flush(commit);
		} finally {
			engine.transacting = false;
		}
	}
	assertSlots(engine);
	const now = engine.now();
	const changed: Changed[] = [];
	for (const body of engine.bodies.values()) {
		if (!body.el) continue;
		const change = retargetBody(
			engine,
			body,
			before.get(body.id),
			moveOf(moves, body.id),
			now,
		);
		if (change) changed.push(change);
	}
	for (const { body, added } of changed) {
		if (
			body.tilt &&
			added.some((term) =>
				(BOX_CHANNELS as readonly string[]).includes(term.channel),
			)
		)
			steer(engine, body, FLAT, now);
		engine.write(body, now);
	}
	const offsets = changed.map(({ body }) => partOffsets(body));
	changed.forEach((change, index) => {
		flipParts(change, offsets[index] ?? new Map(), engine, now);
	});
	for (const { body } of changed) {
		engine.write(body, now);
		engine.activate(body);
	}
}
