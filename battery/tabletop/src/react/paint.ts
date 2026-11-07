import {
	type Channel,
	done,
	moves as movesOn,
	movesPart,
	partSumAt,
	sumAt,
	zAt,
} from "../core/move";
import {
	FLAT,
	glareAt,
	isFlat,
	type Lean,
	leanDone,
	shownLean,
} from "../core/tilt";
import { frontOpacity, restAngle, turnTransform } from "../core/turn";
import type { Engine } from "./engine";
import type { BodyState, PartState } from "./state";
import { setWritten, snapped, writtenOn } from "./write";

/**
 * The Table's one writer. Everything a Body shows is its rest plus its live
 * Moves (and, at rest or in the hand, its lean toward the pointer), read at
 * the frame's own time and written here and nowhere else: the Body's
 * translate, rotation, scale, opacity, size and lean, its seat's stacking
 * order, its shell's turn, its Glares and every Part's offset, opacity and
 * pin. A property with nothing in flight is left to the stylesheet's rest.
 */

/** The lean a Body shows: its follow toward the pointer plus whatever its Moves still let go of. */
export function leanOf(body: BodyState, now: number): Lean {
	const own = body.lean
		? shownLean(body.lean.target, body.lean.terms, now)
		: FLAT;
	return {
		tiltX: own.tiltX + sumAt(body.moves, "tiltX", now),
		tiltY: own.tiltY + sumAt(body.moves, "tiltY", now),
		tiltLift: own.tiltLift + sumAt(body.moves, "tiltLift", now),
		glare: own.glare + sumAt(body.moves, "glare", now),
	};
}

/** The stacking order its seat is drawn at, doubled; `null` leaves it to its rest. */
function seatZOf(body: BodyState, now: number): number | null {
	const crossing = body.moves.findLast((move) => move.crossing);
	const z = crossing ? zAt(crossing, now) : null;
	const doubled =
		z === null
			? null
			: crossing?.crossing?.shape.kind === "step"
				? 2 * z
				: 2 * z + 1;
	if (body.mode !== "rest") return doubled ?? 2 * body.base.z;
	return doubled;
}

function paintParts(engine: Engine, body: BodyState, now: number) {
	for (const part of body.parts.values()) paintPart(engine, body, part, now);
}

function paintPart(
	engine: Engine,
	body: BodyState,
	part: PartState,
	now: number,
) {
	const { el, written, spans, pin } = part;
	const set = (prop: string, value: string | null) =>
		setWritten(el.style, written, prop, value);
	const offset = (channel: "x" | "y") =>
		movesPart(body.moves, part.id, channel)
			? snapped(
					channel,
					partSumAt(body.moves, part.id, channel, now),
					spans,
					engine.dpr,
				)
			: null;
	const x = offset("x");
	const y = offset("y");
	const fading = movesPart(body.moves, part.id, "opacity");
	set(
		"translate",
		x !== null || y !== null ? `${x ?? 0}px ${y ?? 0}px` : null,
	);
	set(
		"opacity",
		fading || pin
			? String(
					Math.max(
						0,
						Math.min(
							1,
							(pin ? 0 : 1) +
								partSumAt(body.moves, part.id, "opacity", now),
						),
					),
				)
			: null,
	);
	/* a Part leaving with its form stays where it showed, out of the new
	   form's flow, clipped by the face */
	set("position", pin ? "absolute" : null);
	set("inset", pin ? "auto" : null);
	set("left", pin ? `${pin.x}px` : null);
	set("top", pin ? `${pin.y}px` : null);
	set("width", pin ? `${pin.w}px` : null);
	set("margin", pin ? "0" : null);
	set("box-sizing", pin ? "border-box" : null);
	set("pointer-events", pin ? "none" : null);
	/* a leaving Part takes no focus and no clicks */
	if (pin && !written.has("inert")) {
		el.setAttribute("inert", "");
		written.set("inert", "");
	} else if (!pin && written.delete("inert")) el.removeAttribute("inert");
}

function paintLean(engine: Engine, body: BodyState, now: number) {
	const el = body.el;
	if (!el) return false;
	const feel = engine.tilt;
	const lean = feel && !engine.policy.reduced ? leanOf(body, now) : FLAT;
	const flat = isFlat(lean) || !feel;
	setWritten(
		el.style,
		body.written,
		"transform",
		flat || !feel
			? null
			: `perspective(${feel.perspective}px) rotateX(${lean.tiltX.toFixed(2)}deg) rotateY(${(-engine.dir * lean.tiltY).toFixed(2)}deg) scale(${(1 + lean.tiltLift).toFixed(4)})`,
	);
	const glare = feel ? glareAt(lean, feel, engine.dir) : { x: 50, y: 50 };
	const lit = feel ? Math.min(1, Math.max(0, lean.glare * feel.glare)) : 0;
	for (const light of body.lights) {
		const written = writtenOn(light);
		setWritten(
			light.style,
			written,
			"--glare-x",
			lit > 0 ? `${glare.x}%` : null,
		);
		setWritten(
			light.style,
			written,
			"--glare-y",
			lit > 0 ? `${glare.y}%` : null,
		);
		setWritten(
			light.style,
			written,
			"--glare-o",
			lit > 0 ? lit.toFixed(3) : null,
		);
	}
	const state = body.lean;
	if (!state) return false;
	state.terms = state.terms.filter((term) => !leanDone(term, now));
	if (state.terms.length > 0) return true;
	if (isFlat(state.target)) body.lean = null;
	return false;
}

function paintTurn(engine: Engine, body: BodyState, now: number) {
	const shell = body.shell;
	if (!shell) return;
	const turning = movesOn(body.moves, "turn");
	const angle =
		restAngle(body.place?.side ?? "front") + sumAt(body.moves, "turn", now);
	const reduced = engine.policy.reduced;
	const front = shell.querySelector<HTMLElement>(
		':scope > [data-tabletop-face="front"]',
	);
	setWritten(
		shell.style,
		writtenOn(shell),
		"transform",
		turning && !reduced
			? turnTransform(
					engine.turn.axis === "y" ? engine.dir * angle : angle,
					engine.turn,
					false,
				)
			: null,
	);
	if (front)
		setWritten(
			front.style,
			writtenOn(front),
			"opacity",
			turning && reduced ? String(frontOpacity(angle, true)) : null,
		);
}

/**
 * Writes `body`'s whole frame at `now` and drops the Moves that ended;
 * whether anything of it still moves.
 */
export function paintBody(
	engine: Engine,
	body: BodyState,
	now: number,
): boolean {
	const el = body.el;
	if (!el) return false;
	const before = body.moves.length;
	body.moves = body.moves.filter((move) => !done(move, now));
	if (
		before !== body.moves.length &&
		!body.moves.some((move) => move.leaving)
	)
		engine.settleForms(body);
	const held = body.mode !== "rest";
	const stance = engine.stance(body);
	const on = (channel: Channel) => movesOn(body.moves, channel);
	const box = (channel: "x" | "y" | "width" | "height") =>
		on(channel)
			? snapped(
					channel,
					sumAt(body.moves, channel, now),
					body.spans,
					engine.dpr,
				)
			: null;
	const x = box("x");
	const y = box("y");
	const width = box("width");
	const height = box("height");
	const set = (prop: string, value: string | null) =>
		setWritten(el.style, body.written, prop, value);
	set(
		"translate",
		held || x !== null || y !== null
			? `${(stance.at?.x ?? 0) + (x ?? 0)}px ${(stance.at?.y ?? 0) + (y ?? 0)}px`
			: null,
	);
	set(
		"rotate",
		held || on("rotate")
			? `${stance.rotate + sumAt(body.moves, "rotate", now)}deg`
			: null,
	);
	set(
		"scale",
		held || on("lift")
			? String(stance.scale * (1 + sumAt(body.moves, "lift", now)))
			: null,
	);
	set(
		"opacity",
		held || on("opacity")
			? String(stance.opacity + sumAt(body.moves, "opacity", now))
			: null,
	);
	set("width", width === null ? null : `calc(100% + ${width}px)`);
	set("height", height === null ? null : `calc(100% + ${height}px)`);
	const seat = body.seat;
	if (seat) {
		const z = seatZOf(body, now);
		setWritten(
			seat.style,
			body.seatWritten,
			"z-index",
			z === null ? null : String(z),
		);
	}
	paintTurn(engine, body, now);
	paintParts(engine, body, now);
	const leaning = paintLean(engine, body, now);
	return body.moves.length > 0 || leaning;
}
