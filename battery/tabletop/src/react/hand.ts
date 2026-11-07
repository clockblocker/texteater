import type { Point } from "../core/geometry";
import { HAND_Z } from "../core/hand";
import { type Move, NO_PARTS, sumAt, type Term, without } from "../core/move";
import { isTurn, POSE } from "../core/plan";
import { reduce } from "../core/reduce";
import { FOLLOW } from "../core/shape";
import { FLIGHT, SPRINGS } from "../core/springs";
import { crossing } from "../core/stacking";
import { FLAT, isFlat } from "../core/tilt";
import type { Engine } from "./engine";
import { drawnZ, neighbours, showingOf } from "./measure";
import { leanOf } from "./paint";
import type { BodyState } from "./state";
import { steer } from "./tilt";

/** A reduced exit travels this far while it fades, and this long. */
const REDUCED_EXIT = { px: 24, ms: 180 };

const LEAN_AND_POSE = new Set([
	...POSE,
	"tiltX",
	"tiltY",
	"tiltLift",
	"glare",
] as const);

function shownOf(engine: Engine, body: BodyState, now: number) {
	const shown = engine.shownPose(body, now);
	if (!shown) return null;
	return {
		box: {
			x: shown.x ?? 0,
			y: shown.y ?? 0,
			width: shown.width ?? 0,
			height: shown.height ?? 0,
		},
		rotate: shown.rotate ?? 0,
		scale: engine.scaleOf(body) * (1 + sumAt(body.moves, "lift", now)),
		opacity: 1 + (shown.opacity ?? 0),
	};
}

/**
 * What the hand keeps of what was in flight: turns, and Parts still on
 * their way, which go on as they were; the box and pose are what the hand
 * now holds, folded in.
 */
function keptByHand(moves: readonly Move[]): Move[] {
	return moves
		.map((move) =>
			isTurn(move)
				? move
				: without(move, LEAN_AND_POSE, { crossing: false }),
		)
		.filter(
			(move) =>
				move.terms.length > 0 || move.parts.size > 0 || move.leaving,
		);
}

/**
 * The hand takes `id` from where it shows: the shown box becomes the hand
 * box and the grab point stays under the pointer. It takes the hand's pose
 * (`engine.hand`) on one Move from what it showed, rising over every other
 * Body by a dissolve or at once. Its lean folds into its lean toward the
 * spot it is held by, or lies flat and stays lit when the tilt says so.
 */
export function hold(engine: Engine, id: string, pointer: Point) {
	const body = engine.bodies.get(id);
	if (!body?.el || body.mode === "unmoored") return;
	const now = engine.now();
	const shown = shownOf(engine, body, now);
	if (!shown) return;
	const pose = engine.hand;
	const reduced = engine.policy.reduced;
	const lean = engine.tilt && !reduced ? leanOf(body, now) : FLAT;
	const z = drawnZ(body, now);
	const showing = showingOf(body, now);
	body.box = shown.box;
	body.grab = { x: pointer.x - shown.box.x, y: pointer.y - shown.box.y };
	const keep = reduced || !pose.straighten;
	body.base = {
		rotate: keep ? shown.rotate : 0,
		scale: keep ? shown.scale : (body.place?.scale ?? 1) * (1 + pose.lift),
		z: HAND_Z,
		opacity: 1,
	};
	const terms: Term[] = [
		{
			channel: "rotate",
			delta: shown.rotate - body.base.rotate,
			shape: FOLLOW,
		},
		{
			channel: "lift",
			delta: shown.scale / body.base.scale - 1,
			shape: FOLLOW,
		},
		{ channel: "opacity", delta: shown.opacity - 1, shape: FOLLOW },
	];
	const raise = crossing({
		from: z,
		to: HAND_Z,
		others: neighbours(engine, body),
		showing,
		shape: pose.raise === "cut" ? { kind: "step", at: 0 } : FOLLOW,
	});
	const held: Move = {
		curve: { kind: "spring", ...SPRINGS.settle, rate: 0 },
		source: "hand",
		bornAt: now,
		delayMs: 0,
		terms: terms.filter((term) => Math.abs(term.delta) > 1e-4),
		parts: NO_PARTS,
		crossing: raise?.shape.kind === "step" ? null : raise,
		leaving: null,
	};
	body.moves = [
		...keptByHand(body.moves),
		...(held.terms.length || held.crossing
			? [reduce(held, engine.policy)]
			: []),
	];
	engine.seatOn(body, "hand");
	body.lean = isFlat(lean) ? null : { target: lean, terms: [] };
	if (engine.tilt && !engine.tilt.held)
		steer(engine, body, { ...FLAT, glare: 1 }, now);
	engine.began(body, now);
	engine.paint(body, now);
	engine.activate(body);
}

/** The held `id` follows the pointer 1:1, under reduced motion too. */
export function carry(engine: Engine, id: string, pointer: Point) {
	const body = engine.bodies.get(id);
	if (!body?.box || body.mode !== "hand") return;
	body.box = {
		...body.box,
		x: pointer.x - body.grab.x,
		y: pointer.y - body.grab.y,
	};
	engine.activate(body);
}

/** How a Body leaves for good. */
export type Flight = {
	/** The hand's velocity at the throw, px/s; the Body keeps it. */
	readonly velocity: Point;
};

/**
 * `id` leaves for good: unmoored at its shown box, so it reads no Slot any
 * more, and flown along the throw with the hand's speed while it fades,
 * over every other Body. Settles when the fade ends; the app then drops it.
 */
export function leave(
	engine: Engine,
	id: string,
	flight: Flight,
): Promise<void> {
	const body = engine.bodies.get(id);
	const now = engine.now();
	const shown = body ? shownOf(engine, body, now) : null;
	if (!body?.el || !shown) return Promise.resolve();
	const reduced = engine.policy.reduced;
	/* the flight goes on from where the hand last showed it */
	const born = engine.handBirth(now);
	const speed = Math.hypot(flight.velocity.x, flight.velocity.y);
	const way =
		speed > 0
			? { x: flight.velocity.x / speed, y: flight.velocity.y / speed }
			: { x: 0, y: 1 };
	const reach = reduced
		? REDUCED_EXIT.px
		: Math.hypot(window.innerWidth, window.innerHeight);
	const exit = { x: way.x * reach, y: way.y * reach };
	const turn = reduced ? 0 : (way.x < 0 ? -1 : 1) * FLIGHT.turn;
	body.box = {
		...shown.box,
		x: shown.box.x + exit.x,
		y: shown.box.y + exit.y,
	};
	body.base = {
		rotate: shown.rotate + turn,
		scale: shown.scale,
		z: HAND_Z,
		opacity: 0,
	};
	const fade = reduced
		? { ms: REDUCED_EXIT.ms, ease: FLIGHT.fade.ease }
		: FLIGHT.fade;
	const move = (curve: Move["curve"], terms: Term[]): Move => ({
		curve,
		source: "hand",
		bornAt: born,
		delayMs: 0,
		terms,
		parts: NO_PARTS,
		crossing: null,
		leaving: null,
	});
	const travel: Term[] = [
		{ channel: "x", delta: -exit.x, shape: FOLLOW },
		{ channel: "y", delta: -exit.y, shape: FOLLOW },
	];
	/* one spring for both axes, heading out at the throw's speed; the fade,
	   its turn and the lean it lets go of on a tween that ends the flight */
	const lean = leanOf(body, now);
	body.moves = [
		...body.moves.filter(isTurn),
		reduced
			? move({ kind: "tween", ...fade }, travel)
			: move(
					{
						kind: "spring",
						...FLIGHT.travel,
						rate: reach > 0 ? speed / reach : 0,
					},
					travel,
				),
		move({ kind: "tween", ...fade }, [
			...(turn
				? [{ channel: "rotate" as const, delta: -turn, shape: FOLLOW }]
				: []),
			{ channel: "opacity", delta: shown.opacity, shape: FOLLOW },
			...(["tiltX", "tiltY", "tiltLift", "glare"] as const).flatMap(
				(channel) =>
					Math.abs(lean[channel]) > 1e-4
						? [{ channel, delta: lean[channel], shape: FOLLOW }]
						: [],
			),
		]),
	];
	body.lean = null;
	engine.tilting.delete(body);
	engine.seatOn(body, "unmoored");
	engine.began(body, now);
	engine.paint(body, now);
	engine.activate(body);
	/* the fade ends the flight: the rest of the travel is out of sight */
	return engine.after(fade.ms);
}
