import { type Move, UNSTARTED } from "../core/move";
import { type PartBox, planParts } from "../core/parts";
import { type MoveStyle, type Pose, plan } from "../core/plan";
import { reduce, reducedKind, SWITCH } from "../core/reduce";
import { FOLLOW, type Shape } from "../core/shape";
import { DECK_OF_CARDS, SPRINGS } from "../core/springs";
import type { Engine } from "./engine";
import {
	type Before,
	measuring,
	neighbours,
	partLayout,
	snapshot,
} from "./measure";
import type { BodyState } from "./state";

/** The style each Body a commit changes moves in; the rest reflow or morph. */
export type Moves =
	| ReadonlyMap<string, MoveStyle>
	| ((id: string) => MoveStyle | undefined);

type Changed = {
	readonly body: BodyState;
	readonly before: Before | undefined;
	/** The Move carrying its box, pose, stacking and Parts, if any. */
	readonly box: Move | null;
	readonly formChanged: boolean;
	/** Where a reduced dissolve switches its Parts, if it dissolves. */
	readonly cut: number | undefined;
	readonly bornAt: number;
};

function styleOf(moves: Moves | undefined, id: string): MoveStyle | undefined {
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

/** Lets a held or leaving Body back onto its Slot for a move that takes it there; whether it may move. */
function moorFor(
	engine: Engine,
	body: BodyState,
	style: MoveStyle | undefined,
) {
	/* a held Body stays in the hand until a release; a leaving one stays
	   gone unless a move deals it back */
	if (body.mode === "hand" && style?.source !== "hand") return false;
	if (body.mode === "unmoored" && !style) return false;
	if (body.mode !== "rest") engine.moor(body);
	return true;
}

/** What the commit changed for `body`: its rests before and after, and which kinds of change. */
function compare(engine: Engine, body: BodyState, before: Before | undefined) {
	const to = engine.restPose(body);
	const place = body.place;
	if (!to || !place) return null;
	const formChanged = !!before && before.form !== place.form;
	const from: Pose = before
		? { ...before.from, lift: before.scale / engine.scaleOf(body) - 1 }
		: to;
	const z = { from: before?.z ?? place.z, to: place.z };
	return {
		to,
		from,
		z,
		formChanged,
		posed: formChanged || differs(from, to),
		restacked: z.from !== z.to || (before?.showing.size ?? 0) > 0,
		turned: (from.turn ?? 0) !== (to.turn ?? 0),
	};
}

/** Plans `body`'s Move for the commit: `null` when the commit left it be. */
function change(
	engine: Engine,
	body: BodyState,
	before: Before | undefined,
	style: MoveStyle | undefined,
	now: number,
): Changed | null {
	if (!moorFor(engine, body, style)) return null;
	const was = compare(engine, body, before);
	if (!was) return null;
	const posed = was.posed || !!style;
	if (!posed && !was.restacked && !was.turned) return null;
	const chosen: MoveStyle = style ?? {
		source: "app",
		spring: was.formChanged ? SPRINGS.morph : SPRINGS.reflow,
	};
	const bornAt = chosen.source === "app" ? UNSTARTED : engine.handBirth(now);
	const planned = plan({
		live: body.moves,
		from: was.from,
		to: was.to,
		style: chosen,
		now,
		bornAt,
		turn: { ms: engine.turn.ms, ease: DECK_OF_CARDS.ease },
		lean: posed ? (before?.lean ?? null) : null,
		stacking: {
			...was.z,
			others: neighbours(engine, body),
			showing: before?.showing ?? new Map(),
		},
		formChanged: was.formChanged,
	});
	const kind =
		planned.box && engine.policy.reduced ? reducedKind(planned.box) : null;
	const box = planned.box ? reduce(planned.box, engine.policy) : null;
	const turn = planned.turn ? reduce(planned.turn, engine.policy) : null;
	body.moves = [
		...planned.keep,
		...(box ? [box] : []),
		...(turn ? [turn] : []),
	];
	if (box && posed && before?.lean) body.lean = null;
	return {
		body,
		before,
		box,
		formChanged: was.formChanged,
		cut: kind === "dissolve" ? SWITCH : undefined,
		bornAt,
	};
}

/**
 * Pins each Part only the old form had where it showed, out of the new
 * form's flow, and frees each Part the new form has.
 */
function pin(change: Changed) {
	const { body, before } = change;
	const form = body.place?.form;
	for (const part of body.parts.values()) {
		const leaving = part.only !== undefined && part.only !== form;
		if (!leaving) {
			part.pin = null;
			continue;
		}
		if (part.pin || !before) continue;
		const shown = before.parts.get(part.id);
		const face = before.faces.get(part.id);
		if (!shown || !face) continue;
		part.pin = {
			x: shown.box.x + shown.dx - face.x,
			y: shown.box.y + shown.dy - face.y,
			w: shown.box.w,
			h: shown.box.h,
		};
	}
}

function shapeOf(move: Move): Shape {
	return (
		move.terms.find((term) =>
			["x", "y", "width", "height"].includes(term.channel),
		)?.shape ?? FOLLOW
	);
}

/** The Parts' share of a change of form, on the box's own Move. */
function withParts(change: Changed, after: ReadonlyMap<string, PartBox>) {
	const { body, before, box } = change;
	if (!before || !box) return;
	const parts = planParts({
		before: before.parts,
		after,
		shape: shapeOf(box),
		...(change.cut === undefined ? {} : { cut: change.cut }),
	});
	const next: Move = {
		...box,
		parts: parts.terms,
		leaving: parts.pins.size > 0 ? before.form : null,
	};
	body.moves = body.moves.map((move) => (move === box ? next : move));
}

/**
 * Commits `commit` and moves every Body it changed from where it showed,
 * in one task (#1311 rule 2): the Parts are read with every transform
 * off, the commit is flushed, each changed Body gets one Move for
 * everything it changes (its box keeps the size it showed, rule 4), the
 * Parts only its old form had are pinned where they showed, and the Parts
 * are read again for their share of the same Move. The Table then starts
 * nothing until that frame has painted (rule 8), except a release, which
 * keeps the hand's speed. Every jump the model causes goes through here.
 */
export function transact(
	engine: Engine,
	commit: (() => void) | null,
	moves?: Moves,
) {
	const changed: Changed[] = [];
	const after = new Map<BodyState, Map<string, PartBox>>();
	let now = engine.now();
	measuring(engine.bodies.values(), true);
	try {
		const before = snapshot(engine, now);
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
			const planned = change(
				engine,
				body,
				before.get(body.id),
				styleOf(moves, body.id),
				now,
			);
			if (planned) changed.push(planned);
		}
		for (const planned of changed) {
			pin(planned);
			engine.began(planned.body, now);
			engine.paint(planned.body, now);
		}
		const forms = changed.filter((planned) => planned.formChanged);
		measuring(
			forms.map((planned) => planned.body),
			true,
		);
		for (const planned of forms)
			after.set(planned.body, partLayout(planned.body));
	} finally {
		measuring(engine.bodies.values(), false);
	}
	for (const planned of changed) {
		const layout = after.get(planned.body);
		if (layout) withParts(planned, layout);
	}
	for (const { body, bornAt } of changed) {
		engine.began(body, now);
		engine.paint(body, now);
		engine.activate(body);
		if (bornAt === UNSTARTED) engine.defer(body);
	}
}
