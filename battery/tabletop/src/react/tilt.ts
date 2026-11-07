import { type Curve, done, keyframed, sumAt, type Term } from "../core/term";
import {
	FLAT,
	followLean,
	glareAt,
	isFlat,
	type Lean,
	leanToward,
	letGoTerms,
	pointerOn,
	shownLean,
} from "../core/tilt";
import type { BodyState, Engine } from "./engine";
import { setWritten, type Written } from "./write";

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

/** What the tilt last wrote on each Glare. */
const lightWritten = new WeakMap<HTMLElement, Written>();

function writtenOn(light: HTMLElement): Written {
	let written = lightWritten.get(light);
	if (!written) {
		written = new Map();
		lightWritten.set(light, written);
	}
	return written;
}

function clearLight(light: HTMLElement) {
	const written = writtenOn(light);
	for (const prop of GLARE_PROPS)
		setWritten(light.style, written, prop, null);
}

/** Drops `body`'s tilt at once: nothing of it stays written. */
function flatten(engine: Engine, body: BodyState) {
	engine.tilting.delete(body);
	if (!body.tilt) return;
	body.tilt = null;
	const el = body.el;
	if (el) {
		for (const prop of BODY_PROPS)
			setWritten(el.style, body.written, prop, null);
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
 * A move of `body`'s box lets its tilt go on the move's own progress: the
 * lean, the lift and the glare head flat on `leader`'s curve, born with
 * it, so the Body's size and its lean end on one clock (#1311 rule 1). A
 * scripted move's waypoints are no progress to ride, so its tilt lets go
 * on the tilt's own spring.
 */
export function letGo(
	engine: Engine,
	body: BodyState,
	leader: Term | undefined,
	bornAt: number,
	now: number,
) {
	const state = body.tilt;
	if (!state) return;
	if (!leader || keyframed(leader.curve)) {
		steer(engine, body, FLAT, now);
		return;
	}
	const curve: Curve = leader.curve;
	state.terms = letGoTerms(shownLean(state.target, state.terms, now), curve, {
		bornAt,
		delayMs: leader.delayMs,
		source: leader.source,
	});
	state.target = FLAT;
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
	const set = (prop: string, value: string) =>
		setWritten(el.style, body.written, prop, value);
	set("--tilt-x", `${lean.tiltX.toFixed(2)}deg`);
	set("--tilt-y", `${lean.tiltY.toFixed(2)}deg`);
	set("--tilt-lift", lean.lift.toFixed(4));
	const glare = glareAt(lean, feel, engine.dir);
	const lit = Math.min(1, Math.max(0, lean.glare * feel.glare));
	for (const light of body.lights) {
		const written = writtenOn(light);
		setWritten(light.style, written, "--glare-x", `${glare.x}%`);
		setWritten(light.style, written, "--glare-y", `${glare.y}%`);
		setWritten(light.style, written, "--glare-o", lit.toFixed(3));
	}
	return state.terms.length > 0;
}
