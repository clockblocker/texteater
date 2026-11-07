import type { Move, Pose } from "../core/move";
import { reduce, reduceFollowers } from "../core/reduce";
import { replaces, retarget } from "../core/retarget";
import { ARRIVAL, DECK_OF_CARDS, SPRINGS } from "../core/springs";
import {
	BOX_CHANNELS,
	type Curve,
	done,
	keyframed,
	sumAt,
	type Term,
	timeToShare,
	UNSTARTED,
} from "../core/term";
import type { BodyState, Engine } from "./engine";
import { haunt, type Leaving } from "./ghosts";
import {
	type Before,
	measuring,
	type Offset,
	partLayout,
	snapshot,
} from "./measure";
import { letGo } from "./tilt";

/** The Move for each Body a commit changes; the rest reflow or morph. */
export type Moves =
	| ReadonlyMap<string, Move>
	| ((id: string) => Move | undefined);

type Changed = {
	readonly body: BodyState;
	readonly before: Before | undefined;
	/** The Terms the change added, before `reduce`. */
	readonly added: readonly Term[];
	/** Whether the move replaced the Terms it moves, or added to them. */
	readonly replaces: boolean;
	/** When its clock starts: now for the hand, after the paint for the app. */
	readonly bornAt: number;
};

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

function born(terms: readonly Term[], bornAt: number): Term[] {
	return terms.map((term) => ({ ...term, bornAt }));
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
	const bornAt = chosen.source === "app" ? UNSTARTED : engine.handBirth(now);
	body.terms = [...kept, ...born(reduce(added, engine.policy), bornAt)];
	return { body, before, added, replaces: replaces(chosen), bornAt };
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

/**
 * The curve a Part rides: the box's own curve object, so the Part's
 * offset and the box's place and size are one progress (#1311 rule 1). A
 * scripted path has no one progress; its Parts take a plain tween as long.
 */
function followCurve(leader: Term | undefined): Curve {
	if (!leader) return { kind: "spring", ...SPRINGS.morph, rate: 0 };
	const curve = leader.curve;
	if (!keyframed(curve)) return curve;
	if (curve.kind === "spring") return curve;
	return {
		kind: "tween",
		ms: curve.ms,
		ease: Array.isArray(curve.ease)
			? (curve.ease[0] ?? ((t: number) => t))
			: (curve.ease as (t: number) => number),
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
 * Each part's move inside its Body: a position-only FLIP in body-local px,
 * the difference of where it was laid out before the commit and after,
 * both read with the box at the size it showed. It rides the box's own
 * curve: a move that adds to the box's Terms adds to the Part's, one that
 * replaces them replaces the Part's from where it shows. A Part the new
 * form mounted anew carries its old Terms over. Parts only the
 * new form has fade in after the box is most of the way there; parts only
 * the old form had leave as copies (`haunt`) that travel across with the
 * nearest part that stays. They keep their height in the face, so two of
 * them never cross; the shrinking face clips them as they fade.
 */
function flipParts(
	change: Changed,
	after: ReadonlyMap<string, Offset>,
	engine: Engine,
	now: number,
) {
	const { body, before, bornAt } = change;
	const leader = leaderOf(change.added);
	const curve = followCurve(leader);
	const partTerm = (channel: "x" | "y", delta: number): Term => ({
		channel,
		delta,
		curve,
		delayMs: leader?.delayMs ?? 0,
		bornAt,
		source: leader?.source ?? "app",
	});
	const arriving: string[] = [];
	for (const part of body.parts.values()) {
		const at = after.get(part.id);
		const was = before?.parts.get(part.id);
		if (!at) continue;
		if (!was) {
			if (before) arriving.push(part.id);
			continue;
		}
		const live = (before?.terms.get(part.id) ?? part.terms).filter(
			(term) => !done(term, now),
		);
		const kept = live.filter(
			(term) => term.channel === "opacity" || !change.replaces,
		);
		/* what it shows less what it keeps, against where it now lies */
		const jump = (channel: "x" | "y") =>
			was[channel] +
			sumAt(live, channel, now) -
			sumAt(kept, channel, now) -
			at[channel];
		const terms = [
			partTerm("x", jump("x")),
			partTerm("y", jump("y")),
		].filter((term) => Math.abs(term.delta) >= 1e-3);
		part.terms = [
			...kept,
			...reduceFollowers(terms, change.added, engine.policy),
		];
	}
	if (before && before.form !== body.place?.form)
		for (const leaving of before.leaving) {
			const shift = shiftNear(leaving, before.parts, after);
			const travel = [partTerm("x", -shift)].filter(
				(term) => Math.abs(term.delta) >= 1e-3,
			);
			haunt(
				engine,
				body,
				{ ...leaving, x: leaving.x + shift },
				reduceFollowers(travel, change.added, engine.policy),
				now,
				bornAt,
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
			bornAt,
			source: "app",
		};
		part.terms = reduceFollowers([fade], change.added, engine.policy);
	});
}

/**
 * Commits `commit` and moves every Body it changed from where it showed.
 * In one task (#1311 rule 2): the Parts are read with every transform off,
 * the commit is flushed, each changed Body's first frame is written so its
 * box keeps the size it showed (rule 4), and the Parts are read again; the
 * Table then starts nothing until that frame has painted (rule 8), except
 * a release, which keeps the hand's speed. Every jump the model causes
 * goes through here: one that doesn't teleports. A Body whose box moves
 * lets go of its tilt on the same progress, and the Parts only its old
 * form had fade out as copies where they were.
 */
export function transact(
	engine: Engine,
	commit: (() => void) | null,
	moves?: Moves,
) {
	const bodies = [...engine.bodies.values()];
	measuring(bodies, true);
	const changed: Changed[] = [];
	let offsets: Map<string, Offset>[] = [];
	let now = engine.now();
	try {
		const before = snapshot(engine);
		if (commit) {
			engine.transacting = true;
			try {
				engine.flush(commit);
			} finally {
				engine.transacting = false;
			}
		}
		assertSlots(engine);
		now = engine.now();
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
		for (const { body, added, bornAt } of changed) {
			if (
				body.tilt &&
				added.some((term) =>
					(BOX_CHANNELS as readonly string[]).includes(term.channel),
				)
			)
				letGo(engine, body, leaderOf(added), bornAt, now);
			engine.began(body, now);
			engine.write(body, now);
		}
		measuring(
			changed.map(({ body }) => body),
			true,
		);
		offsets = changed.map(({ body }) => partLayout(body));
	} finally {
		measuring(engine.bodies.values(), false);
	}
	changed.forEach((change, index) => {
		flipParts(change, offsets[index] ?? new Map(), engine, now);
	});
	for (const { body, bornAt } of changed) {
		engine.began(body, now);
		engine.write(body, now);
		engine.activate(body);
		if (bornAt === UNSTARTED) engine.defer(body);
	}
}
