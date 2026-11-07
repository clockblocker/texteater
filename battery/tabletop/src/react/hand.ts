import type { Point } from "../core/geometry";
import { FLIGHT, SPRINGS } from "../core/springs";
import { sumAt, type Term } from "../core/term";
import { FLAT } from "../core/tilt";
import type { BodyState, Engine } from "./engine";
import { steer } from "./tilt";

/** A held Body rides this much bigger, and over every other. */
const HELD_SCALE = 1.03;
const HELD_Z = 10_000;
/** A reduced exit travels this far while it fades, and this long. */
const REDUCED_EXIT = { px: 24, ms: 180 };

function shownBox(engine: Engine, body: BodyState, now: number) {
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
		scale: engine.scaleOf(body) * (1 + sumAt(body.terms, "lift", now)),
		opacity: 1 + (shown.opacity ?? 0),
	};
}

function springTerm(
	channel: Term["channel"],
	delta: number,
	now: number,
): Term[] {
	if (Math.abs(delta) < 1e-3) return [];
	return [
		{
			channel,
			delta,
			curve: { kind: "spring", ...SPRINGS.settle, velocity: 0 },
			delayMs: 0,
			bornAt: now,
			source: "hand",
		},
	];
}

/**
 * The hand takes `id` from where it shows: the shown box becomes the hand
 * box, the grab point stays under the pointer, and every box Term is
 * dropped. It straightens and lifts on a spring; under reduced motion it
 * only follows the hand. Its tilt goes on leaning toward the spot it is held
 * by, or lies flat and stays lit when the tilt's feel says so.
 */
export function hold(engine: Engine, id: string, pointer: Point) {
	const body = engine.bodies.get(id);
	if (!body?.el || body.mode === "unmoored") return;
	const now = engine.now();
	const shown = shownBox(engine, body, now);
	if (!shown) return;
	const reduced = engine.policy.reduced;
	body.mode = "hand";
	body.box = shown.box;
	body.grab = { x: pointer.x - shown.box.x, y: pointer.y - shown.box.y };
	body.base = {
		rotate: reduced ? shown.rotate : 0,
		scale: reduced ? shown.scale : HELD_SCALE,
		z: HELD_Z,
		opacity: 1,
	};
	body.terms = [
		...body.terms.filter((term) => term.channel === "turn"),
		...(reduced
			? []
			: [
					...springTerm("rotate", shown.rotate, now),
					...springTerm("lift", shown.scale / HELD_SCALE - 1, now),
				]),
		...springTerm("opacity", shown.opacity - 1, now),
	];
	body.boxDirty = true;
	body.el.dataset.mode = "hand";
	if (body.tilt && !engine.tilt?.held)
		steer(engine, body, { ...FLAT, glare: 1 }, now);
	engine.write(body, now);
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
	body.boxDirty = true;
	engine.activate(body);
}

/** How a Body leaves for good. */
export type Flight = {
	/** The hand's velocity at the throw, px/s; the Body keeps it. */
	readonly velocity: Point;
};

/**
 * `id` leaves for good: unmoored at its shown box, so it reads no Slot
 * any more, and flown along the throw with the hand's speed while it fades.
 * Settles when the fade ends; the app then drops it.
 */
export function leave(
	engine: Engine,
	id: string,
	flight: Flight,
): Promise<void> {
	const body = engine.bodies.get(id);
	const now = engine.now();
	const shown = body ? shownBox(engine, body, now) : null;
	if (!body?.el || !shown) return Promise.resolve();
	const reduced = engine.policy.reduced;
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
	body.mode = "unmoored";
	body.box = {
		...shown.box,
		x: shown.box.x + exit.x,
		y: shown.box.y + exit.y,
	};
	body.base = {
		rotate: shown.rotate + turn,
		scale: shown.scale,
		z: HELD_Z,
		opacity: 0,
	};
	const fade = reduced
		? { ms: REDUCED_EXIT.ms, ease: FLIGHT.fade.ease }
		: FLIGHT.fade;
	const tween = (channel: Term["channel"], delta: number): Term => ({
		channel,
		delta,
		curve: { kind: "tween", ...fade },
		delayMs: 0,
		bornAt: now,
		source: "hand",
	});
	const travel = (
		channel: "x" | "y",
		delta: number,
		velocity: number,
	): Term =>
		reduced
			? tween(channel, delta)
			: {
					channel,
					delta,
					curve: { kind: "spring", ...FLIGHT.travel, velocity },
					delayMs: 0,
					bornAt: now,
					source: "hand",
				};
	body.terms = [
		...body.terms.filter((term) => term.channel === "turn"),
		travel("x", -exit.x, flight.velocity.x),
		travel("y", -exit.y, flight.velocity.y),
		...(turn ? [tween("rotate", -turn)] : []),
		tween("opacity", shown.opacity),
	];
	body.boxDirty = true;
	body.el.dataset.mode = "unmoored";
	steer(engine, body, FLAT, now);
	engine.write(body, now);
	engine.activate(body);
	/* the fade ends the flight: the rest of the travel is out of sight */
	return engine.after(fade.ms);
}
