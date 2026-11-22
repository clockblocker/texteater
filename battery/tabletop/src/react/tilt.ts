import { sumAt } from "../core/move";
import { isTurn } from "../core/plan";
import {
	FLAT,
	followLean,
	isFlat,
	type Lean,
	leanToward,
	pointerOn,
} from "../core/tilt";
import type { Engine } from "./engine";
import type { BodyState } from "./state";

/** A pointer over a Body: a React or DOM pointer event will do. */
export type Pointing = {
	readonly clientX: number;
	readonly clientY: number;
	readonly pointerType: string;
};

/** Light layers go on few Bodies: never more than this lean at once (#1314). */
const MAX_TILTING = 3;

/** Drops `body`'s lean at once: the writer clears what it wrote on its next paint. */
function flatten(engine: Engine, body: BodyState) {
	engine.tilting.delete(body);
	if (!body.lean) return;
	body.lean = null;
	engine.activate(body);
}

export function flattenAll(engine: Engine) {
	for (const body of engine.tilting) flatten(engine, body);
}

/** Heads `body`'s lean for `target` from where it shows, on the feel's spring. */
export function steer(
	engine: Engine,
	body: BodyState,
	target: Lean,
	now: number,
) {
	const feel = engine.tilt;
	if (!feel || engine.policy.reduced || !body.el) {
		flatten(engine, body);
		return;
	}
	let state = body.lean;
	if (!state) {
		if (isFlat(target)) return;
		for (const other of engine.tilting) {
			if (engine.tilting.size < MAX_TILTING) break;
			flatten(engine, other);
		}
		state = { target: FLAT, terms: [] };
		body.lean = state;
	}
	engine.tilting.add(body);
	state.terms = followLean(
		state.terms,
		state.target,
		target,
		feel.spring,
		now,
	);
	state.target = target;
	engine.activate(body);
}

/**
 * Whether `body` is in a Move: a change of form, place or stacking owns
 * its whole visible state, its lean too, until it lands. A turn alone
 * doesn't.
 */
function moving(body: BodyState): boolean {
	return body.mode === "rest" && body.moves.some((move) => !isTurn(move));
}

/** Whether another Body is in the hand: then only that one leans. */
function handBusy(engine: Engine, body: BodyState): boolean {
	for (const other of engine.bodies.values())
		if (other !== body && other.mode === "hand") return true;
	return false;
}

/**
 * The pointer is over `id` at `pointer`, or left it (`null`). A Body at
 * rest, with nothing in flight, or in the hand leans toward where the
 * pointer is on it, read off its Slot's rect or its hand box and never off
 * the Body. A Body in a Move doesn't follow the pointer: the Move lets its
 * lean go and it leans again on the next pointer move after it lands.
 * While one Body is in the hand, no other leans. A touch never tilts a
 * Body.
 */
export function point(engine: Engine, id: string, pointer: Pointing | null) {
	const body = engine.bodies.get(id);
	if (!body?.el || moving(body)) return;
	const now = engine.now();
	if (pointer && handBusy(engine, body)) {
		steer(engine, body, FLAT, now);
		return;
	}
	if (!pointer) {
		steer(engine, body, FLAT, now);
		return;
	}
	const feel = engine.tilt;
	if (
		!feel ||
		engine.policy.reduced ||
		pointer.pointerType === "touch" ||
		body.mode === "unmoored"
	)
		return;
	const shown = engine.shownPose(body, now);
	if (!shown) return;
	const held = body.mode === "hand";
	if (held && !feel.held) {
		steer(engine, body, { ...FLAT, glare: 1 }, now);
		return;
	}
	const at = pointerOn(
		{
			x: shown.x ?? 0,
			y: shown.y ?? 0,
			width: shown.width ?? 0,
			height: shown.height ?? 0,
			rotate: shown.rotate ?? 0,
			scale: engine.scaleOf(body) * (1 + sumAt(body.moves, "lift", now)),
		},
		{ x: pointer.clientX, y: pointer.clientY },
		engine.dir,
	);
	const lean = leanToward(at, feel);
	steer(engine, body, held ? { ...lean, tiltLift: 0 } : lean, now);
}
