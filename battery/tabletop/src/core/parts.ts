import type { PartTerm } from "./move";
import { type Shape, shareAt, span } from "./shape";

/** A Part's box in its Body, px from the Body's corner, before any offset. */
export type PartBox = {
	readonly x: number;
	readonly y: number;
	readonly w: number;
	readonly h: number;
};

/** A Part as it shows before a change of form: where it lies, its offset and its opacity. */
export type PartShown = {
	readonly box: PartBox;
	readonly dx: number;
	readonly dy: number;
	readonly opacity: number;
};

/** When Parts only the new form has start to arrive, as a share of the Move. */
const ARRIVE = { from: 0.55, stagger: 0.06, length: 0.3 } as const;
/** By when Parts only the old form had are gone, at the latest. */
const DEPART = { by: 0.35, least: 0.08 } as const;
/** Where in the Move a Part whose order flips is hidden, so it can jump. */
const DISSOLVE = { out: 0.35, in: 0.65 } as const;

/** Steps the progress is sampled at to find where boxes meet. */
const SAMPLES = 40;

type Moving = { readonly id: string; readonly at: (p: number) => PartBox };

function meets(a: PartBox, b: PartBox): boolean {
	return (
		Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 0.5 &&
		Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 0.5
	);
}

/**
 * `part` dissolves instead of travelling: it fades out where it showed,
 * gone before anything travelling reaches it there, jumps while it can't be
 * seen, and fades in where it now lies once nothing travelling is over it.
 */
function dissolve(
	part: Moving,
	terms: Map<string, PartTerm[]>,
	opacity: number,
	shared: readonly Moving[],
) {
	const others = shared.filter((other) => other.id !== part.id);
	const out = Math.max(
		DEPART.least,
		Math.min(
			DISSOLVE.out,
			firstMeeting(part.at(0), others) ?? DISSOLVE.out,
		),
	);
	const back = Math.min(
		0.9,
		Math.max(DISSOLVE.in, lastMeeting(part.at(1), others) ?? 0),
	);
	const own = terms.get(part.id) ?? [];
	terms.set(part.id, [
		...own
			.filter((term) => term.channel !== "opacity")
			.map((term) => ({
				...term,
				shape: { kind: "step", at: (out + back) / 2 } as Shape,
			})),
		{
			channel: "opacity",
			delta: -1,
			shape: {
				kind: "keys",
				keys: [1 - opacity, 1, 1, 0],
				times: [0, out, back, 1],
			},
		},
	]);
}

/** The first progress at which `box` meets any of `moving`, or `null`. */
function firstMeeting(box: PartBox, moving: readonly Moving[]): number | null {
	for (let i = 0; i <= SAMPLES; i++) {
		const p = i / SAMPLES;
		if (moving.some((part) => meets(part.at(p), box))) return p;
	}
	return null;
}

/** The last progress at which `box` meets any of `moving`, or `null`. */
function lastMeeting(box: PartBox, moving: readonly Moving[]): number | null {
	for (let i = SAMPLES; i >= 0; i--) {
		const p = i / SAMPLES;
		if (moving.some((part) => meets(part.at(p), box))) return p;
	}
	return null;
}

export type PartPlan = {
	readonly terms: ReadonlyMap<string, readonly PartTerm[]>;
	/** Parts only the old form had, pinned where they showed while they leave. */
	readonly pins: ReadonlyMap<string, PartBox>;
};

type Travelling = Moving & { readonly travel: number };

type Input = {
	readonly before: ReadonlyMap<string, PartShown>;
	readonly after: ReadonlyMap<string, PartBox>;
	readonly shape: Shape;
	readonly cut?: number;
};

/** Each Part both forms have, travelling from where it shows to where it lies. */
function travelling(
	{ before, after, shape, cut }: Input,
	terms: Map<string, PartTerm[]>,
) {
	const shared: Travelling[] = [];
	const step: Shape | null =
		cut === undefined ? null : { kind: "step", at: cut };
	for (const [id, now] of after) {
		const was = before.get(id);
		if (!was) continue;
		const dx = was.box.x + was.dx - now.x;
		const dy = was.box.y + was.dy - now.y;
		shared.push({
			id,
			travel: Math.hypot(dx, dy),
			at: (p) => {
				const share = shareAt(shape, p);
				return { ...now, x: now.x + dx * share, y: now.y + dy * share };
			},
		});
		const own: PartTerm[] = [
			{ channel: "x", delta: dx, shape: step ?? shape },
			{ channel: "y", delta: dy, shape: step ?? shape },
			{
				channel: "opacity",
				delta: was.opacity - 1,
				shape: step ?? shape,
			},
		];
		terms.set(
			id,
			own.filter((term) => Math.abs(term.delta) >= 1e-3),
		);
	}
	return shared;
}

/** Whether `a` and `b` cross on the way, though apart where they start and end. */
function cross(a: Moving, b: Moving): boolean {
	if (meets(a.at(0), b.at(0)) || meets(a.at(1), b.at(1))) return false;
	for (let k = 1; k < SAMPLES; k++)
		if (meets(a.at(k / SAMPLES), b.at(k / SAMPLES))) return true;
	return false;
}

/** Where two travelling Parts would cross, the one going further dissolves. */
function uncross(
	shared: readonly Travelling[],
	before: ReadonlyMap<string, PartShown>,
	terms: Map<string, PartTerm[]>,
) {
	for (const [i, a] of shared.entries())
		for (const b of shared.slice(i + 1)) {
			if (!cross(a, b)) continue;
			const far = a.travel >= b.travel ? a : b;
			dissolve(far, terms, before.get(far.id)?.opacity ?? 1, shared);
		}
}

/**
 * Each Part's share of a change of form, on the box's own `shape` of the
 * Move's progress, so Parts and box ride one clock and no text crosses
 * another:
 *
 * - A Part both forms have travels from where it shows to where it now lies,
 *   by position only (a body-local FLIP). Where two such Parts would cross,
 *   the one that travels further dissolves: it fades out where it was,
 *   jumps while it can't be seen, and fades in where it lies.
 * - A Part only the old form had stays pinned where it lay, clipped by the
 *   face as the box shrinks, and fades out on the progress, gone before
 *   anything travelling reaches it (by 0.35 at the latest).
 * - A Part only the new form has fades in where it lies once nothing
 *   travelling is over it, from 0.55 of the way, 0.06 apart.
 *
 * Under reduced motion (`cut`) everything switches at that progress, while
 * the Body is hidden.
 */
export function planParts(input: Input): PartPlan {
	const { before, after, cut } = input;
	const terms = new Map<string, PartTerm[]>();
	const shared = travelling(input, terms);
	if (cut === undefined) uncross(shared, before, terms);
	const switched: Shape | null =
		cut === undefined ? null : { kind: "step", at: cut };
	const pins = new Map<string, PartBox>();
	for (const [id, was] of before) {
		if (after.has(id)) continue;
		const box = {
			...was.box,
			x: was.box.x + was.dx,
			y: was.box.y + was.dy,
		};
		pins.set(id, box);
		const by = Math.max(
			DEPART.least,
			Math.min(DEPART.by, firstMeeting(box, shared) ?? DEPART.by),
		);
		terms.set(id, [
			{
				channel: "opacity",
				delta: was.opacity,
				shape: switched ?? span(0, by),
			},
		]);
	}
	let arrival = 0;
	for (const [id, box] of after) {
		if (before.has(id)) continue;
		const own = ARRIVE.from + arrival++ * ARRIVE.stagger;
		const from = Math.min(
			0.9,
			Math.max(own, lastMeeting(box, shared) ?? 0),
		);
		terms.set(id, [
			{
				channel: "opacity",
				delta: -1,
				shape:
					switched ?? span(from, Math.min(1, from + ARRIVE.length)),
			},
		]);
	}
	return { terms, pins };
}
