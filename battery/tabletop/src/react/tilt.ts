import { done, sumAt, type Term } from "../core/term";
import {
	FLAT,
	followLean,
	glareAt,
	isFlat,
	type Lean,
	leanToward,
	pointerOn,
	shownLean,
} from "../core/tilt";
import type { BodyState, Engine } from "./engine";

/**
 * A Body's tilt: the lean, lift and glare it heads for, and the Terms still
 * to go. It is its own layer with its own writer, the Body's `transform`
 * and its Glares, so a change of rest never touches it.
 */
export type TiltState = { target: Lean; terms: Term[] };

/** A pointer over a Body: a React or DOM pointer event will do. */
export type Pointing = {
	readonly clientX: number;
	readonly clientY: number;
	readonly pointerType: string;
};

/** Light layers go on few Bodies: never more than this tilt at once (#1314). */
const MAX_TILTING = 3;

const BODY_PROPS = ["--tilt-x", "--tilt-y", "--tilt-lift"] as const;
const GLARE_PROPS = ["--glare-x", "--glare-y", "--glare-o"] as const;

function clearLight(light: HTMLElement) {
	for (const prop of GLARE_PROPS) light.style.removeProperty(prop);
}

/** Drops `body`'s tilt at once: nothing of it stays written. */
function flatten(engine: Engine, body: BodyState) {
	engine.tilting.delete(body);
	if (!body.tilt) return;
	body.tilt = null;
	const el = body.el;
	if (el) {
		for (const prop of BODY_PROPS) el.style.removeProperty(prop);
		delete el.dataset.tilt;
	}
	for (const light of body.lights) clearLight(light);
}

export function flattenAll(engine: Engine) {
	for (const body of [...engine.tilting]) flatten(engine, body);
}

/** Heads `body`'s tilt for `target` from where it shows, on the feel's spring. */
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
	let state = body.tilt;
	if (!state) {
		if (isFlat(target)) return;
		for (const other of engine.tilting) {
			if (engine.tilting.size < MAX_TILTING) break;
			flatten(engine, other);
		}
		state = { target: FLAT, terms: [] };
		body.tilt = state;
		engine.tilting.add(body);
		body.el.dataset.tilt = "";
	}
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
 * The pointer is over `id` at `pointer`, or left it (`null`). A Body at
 * rest or in the hand leans toward where the pointer is on it, read off its
 * Slot's rect or its hand box and never off the Body, so the read in a
 * pointer event finds layout clean. A touch never tilts a Body.
 */
export function point(engine: Engine, id: string, pointer: Pointing | null) {
	const body = engine.bodies.get(id);
	if (!body?.el) return;
	const now = engine.now();
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
			scale: engine.scaleOf(body) * (1 + sumAt(body.terms, "lift", now)),
		},
		{ x: pointer.clientX, y: pointer.clientY },
		engine.dir,
	);
	const lean = leanToward(at, feel);
	steer(engine, body, held ? { ...lean, lift: 0 } : lean, now);
}

/** Writes `body`'s tilt at `now`; whether it still moves. */
export function writeTilt(engine: Engine, body: BodyState, now: number) {
	const state = body.tilt;
	const el = body.el;
	if (!state || !el) return false;
	const feel = engine.tilt;
	if (!feel || engine.policy.reduced) {
		flatten(engine, body);
		return false;
	}
	state.terms = state.terms.filter((term) => !done(term, now));
	if (state.terms.length === 0 && isFlat(state.target)) {
		flatten(engine, body);
		return false;
	}
	const lean = shownLean(state.target, state.terms, now);
	el.style.setProperty("--tilt-x", `${lean.tiltX.toFixed(2)}deg`);
	el.style.setProperty("--tilt-y", `${lean.tiltY.toFixed(2)}deg`);
	el.style.setProperty("--tilt-lift", lean.lift.toFixed(4));
	const glare = glareAt(lean, feel, engine.dir);
	const lit = Math.min(1, Math.max(0, lean.glare * feel.glare));
	for (const light of body.lights) {
		light.style.setProperty("--glare-x", `${glare.x}%`);
		light.style.setProperty("--glare-y", `${glare.y}%`);
		light.style.setProperty("--glare-o", lit.toFixed(3));
	}
	return state.terms.length > 0;
}
