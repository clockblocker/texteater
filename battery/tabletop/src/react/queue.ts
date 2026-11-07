import { landsAt, UNSTARTED } from "../core/term";
import { type Trick, trickMove } from "../core/trick";
import type { Engine } from "./engine";
import { transact } from "./transact";

/** A Trick, and the commit that gives the Deck its order, rest and sides. */
export type Staged = {
	readonly trick: Trick;
	readonly commit?: (() => void) | undefined;
};

function rootRemPx(): number {
	if (typeof document === "undefined") return 16;
	return (
		Number.parseFloat(
			getComputedStyle(document.documentElement).fontSize,
		) || 16
	);
}

/**
 * Commits `staged` and plays it from where each Card shows; returns when
 * it lands, in ms after its clock starts: once the last of its Cards' moves
 * ends, the turns it cued after aside.
 */
export function playTrick(engine: Engine, { trick, commit }: Staged): number {
	const frame = { remPx: rootRemPx(), dir: engine.dir };
	const moves = new Map(
		[...trick.moves].map(([id, move]) => [id, trickMove(move, frame)]),
	);
	transact(engine, commit ?? null, moves);
	let lands = 0;
	for (const id of trick.moves.keys()) {
		const terms = engine.bodies.get(id)?.terms ?? [];
		lands = Math.max(
			lands,
			landsAt(terms.filter((term) => term.bornAt === UNSTARTED)),
		);
	}
	return lands;
}

type Waiting = {
	readonly stage: () => Staged | null;
	readonly done: () => void;
};

/**
 * deck-of-cards' queue on the Table's clock: one Trick after another, each
 * made only when its turn comes, from the Deck as it is then, and the next
 * started inside the frame the one before lands, so a chain keeps the
 * library's rhythm at any slow-mo. `play` plays a Trick and says when it
 * lands; `cue` calls back that long after its clock starts (`Engine.cue`).
 */
export class TrickQueue {
	private waiting: Waiting[] = [];
	private running = false;
	/** Bumped by `drop`, so a dropped Trick's landing starts nothing. */
	private generation = 0;
	private readonly play: (staged: Staged) => number;
	private readonly cue: (ms: number, fn: () => void) => void;

	constructor(
		play: (staged: Staged) => number,
		cue: (ms: number, fn: () => void) => void,
	) {
		this.play = play;
		this.cue = cue;
	}

	push(stage: () => Staged | null): Promise<void> {
		return new Promise((resolve) => {
			this.waiting.push({ stage, done: resolve });
			if (!this.running) this.next();
		});
	}

	/** Forgets every Trick still waiting; the next one pushed starts at once. */
	drop() {
		this.generation++;
		for (const waiting of this.waiting) waiting.done();
		this.waiting = [];
		this.running = false;
	}

	private next() {
		const waiting = this.waiting.shift();
		this.running = waiting !== undefined;
		if (!waiting) return;
		let staged: Staged | null;
		try {
			staged = waiting.stage();
		} catch (error) {
			waiting.done();
			this.running = false;
			throw error;
		}
		if (!staged) {
			waiting.done();
			this.next();
			return;
		}
		const generation = this.generation;
		this.cue(this.play(staged), () => {
			waiting.done();
			if (generation === this.generation) this.next();
		});
	}
}
