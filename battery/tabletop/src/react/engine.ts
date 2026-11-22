import type { Point } from "../core/geometry";
import { HAND_Z, type HandPose, LIFTED } from "../core/hand";
import { sampleMoves, startMoves } from "../core/move";
import type { SlotId } from "../core/place";
import type { Pose } from "../core/plan";
import type { MotionPolicy } from "../core/reduce";
import type { TiltFeel } from "../core/tilt";
import { DEFAULT_TURN, restAngle, type TurnFeel } from "../core/turn";
import { paintBody } from "./paint";
import { type BodyState, bodyState, type Mode, REST_BASE } from "./state";
import { Veils } from "./veil";
import { partSpansAt, setWritten, spansAt } from "./write";

/** A clock in ms. The Table's runs slower under slow-mo. */
export type Clock = { readonly now: () => number };

/** One frame at 60 Hz, in ms. */
const FRAME_MS = 1000 / 60;

const SEAT_BOX_PROPS = ["--seat-x", "--seat-y", "--seat-w", "--seat-h"];

/** What a Body's offsets add to: its rest, or its base and hand box while held or leaving. */
export type Stance = {
	readonly rotate: number;
	readonly scale: number;
	readonly opacity: number;
	readonly at: Point | null;
};

function devicePixelRatio(): number {
	return (typeof window === "undefined" ? 1 : window.devicePixelRatio) || 1;
}

/**
 * The Table's engine: every Body's Moves, the clock and the one frame loop
 * (its own `requestAnimationFrame`, on the frames' timestamps) that paints
 * them. It never says where a Body is, only how far it still is from its
 * rest; a Body with no Moves has nothing written on it.
 */
export class Engine {
	readonly bodies = new Map<string, BodyState>();
	readonly slots = new Map<SlotId, HTMLElement>();
	readonly regions = new Map<string, HTMLElement>();
	readonly veils = new Veils(this);
	policy: MotionPolicy = { reduced: false };
	dir: 1 | -1 = 1;
	turn: TurnFeel = DEFAULT_TURN;
	/** How a handled Body tilts, or `null` when nothing tilts. */
	tilt: TiltFeel | null = null;
	/** How a Body looks in the hand. */
	hand: HandPose = LIFTED;
	/** The Bodies leaning toward the pointer, oldest first. */
	readonly tilting = new Set<BodyState>();
	/** Development checks: every Place has a Slot; nothing anchors to a transformed box. */
	assert = false;
	/** Set while `transact` commits, so a Body can tell a jump outside one. */
	transacting = false;
	origin: HTMLElement | null = null;
	prefix = "tt";
	/** Device pixels per CSS px, read once a frame: what offsets snap to. */
	dpr = devicePixelRatio();
	readonly active = new Set<BodyState>();
	private readonly unstarted = new Set<BodyState>();
	/** The frame the held Moves start on: the one after the frame that paints them. */
	private startFrame = Number.POSITIVE_INFINITY;
	/** When they start, if not one frame before that frame: a cue's frame. */
	private startBirth: number | null = null;
	private frames = 0;
	private lastFrame = Number.NEGATIVE_INFINITY;
	private loop: number | null = null;
	/** Set while a frame's callback runs, before that frame paints. */
	private inFrame = false;
	private waiters: { ids: readonly string[]; resolve: () => void }[] = [];
	private cues: {
		readonly ms: number;
		at: number;
		readonly fn: () => void;
	}[] = [];
	private base = 0;
	private realBase = performance.now();
	private scale = 1;

	readonly flush: (commit: () => void) => void;
	private readonly clock: Clock | undefined;

	constructor(flush: (commit: () => void) => void, clock?: Clock) {
		this.flush = flush;
		this.clock = clock;
	}

	/** Table time in ms: real time, slowed by the time scale. */
	now(): number {
		return this.at(performance.now());
	}

	private at(real: number): number {
		if (this.clock) return this.clock.now();
		return this.base + (real - this.realBase) * this.scale;
	}

	/** Settles `ms` of Table time from now. */
	after(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms / this.scale));
	}

	setTimeScale(scale: number) {
		if (scale === this.scale) return;
		this.base = this.now();
		this.realBase = performance.now();
		this.scale = scale;
	}

	/** The CSS anchor name of `slot` on this Table. */
	anchorOf(slot: SlotId): string {
		return `--${this.prefix}-${slot.replace(/[^a-zA-Z0-9_-]/g, (char) => `_${char.charCodeAt(0).toString(16)}`)}`;
	}

	body(id: string): BodyState {
		let body = this.bodies.get(id);
		if (!body) {
			body = bodyState(id);
			this.bodies.set(id, body);
		}
		return body;
	}

	/**
	 * A Body's element mounted. A new element starts at rest with nothing
	 * written; the same one again (React's strict re-attach) keeps its state.
	 */
	attach(id: string, el: HTMLElement) {
		const body = this.body(id);
		if (body.mounted !== el) {
			body.mounted = el;
			body.moves = [];
			body.spans = {};
			body.mode = "rest";
			body.box = null;
			body.seatBox = null;
			body.base = REST_BASE;
			body.written.clear();
			body.seatWritten.clear();
			body.lean = null;
			body.radius = null;
			this.tilting.delete(body);
			this.active.delete(body);
			this.unstarted.delete(body);
		}
		body.el = el;
	}

	detach(id: string, el: HTMLElement) {
		const body = this.bodies.get(id);
		if (body?.el !== el) return;
		body.el = null;
		body.lean = null;
		this.tilting.delete(body);
		this.scheduleEvict(id, body);
	}

	seat(id: string, el: HTMLElement | null) {
		if (el === null) {
			const body = this.bodies.get(id);
			if (!body) return;
			body.seat = null;
			this.scheduleEvict(id, body);
			return;
		}
		this.body(id).seat = el;
	}

	/**
	 * Evicts a fully detached Body on the microtask queue so synchronous React
	 * StrictMode same-element re-attach retains its state while real unmounts
	 * release `BodyState` and its DOM references.
	 */
	private scheduleEvict(id: string, body: BodyState) {
		if (body.el !== null || body.seat !== null) return;
		queueMicrotask(() => {
			if (
				this.bodies.get(id) === body &&
				body.el === null &&
				body.seat === null
			) {
				body.mounted = null;
				this.bodies.delete(id);
				this.active.delete(body);
				this.unstarted.delete(body);
				this.tilting.delete(body);
			}
		});
	}

	/** Stops the frame loop and drops pending animations, cues, waiters, and veils. */
	dispose() {
		if (this.loop !== null) {
			cancelAnimationFrame(this.loop);
			this.loop = null;
		}
		this.active.clear();
		this.unstarted.clear();
		this.tilting.clear();
		this.cues.length = 0;
		this.waiters.length = 0;
		this.veils.clear();
	}

	/** Where the Table's px boxes start, in client px. */
	originPoint(): Point {
		const rect = this.origin?.getBoundingClientRect();
		return { x: rect?.left ?? 0, y: rect?.top ?? 0 };
	}

	slotRect(slot: SlotId): DOMRect | null {
		return this.slots.get(slot)?.getBoundingClientRect() ?? null;
	}

	/** The scale a Body rests at: its Place's, or its base's while held. */
	scaleOf(body: BodyState): number {
		return body.mode === "rest"
			? (body.place?.scale ?? 1)
			: body.base.scale;
	}

	/** The stacking order a Body rests at: its Place's, or the hand's. */
	restZ(body: BodyState): number {
		return body.mode === "rest" ? (body.place?.z ?? 0) : HAND_Z;
	}

	/** A Body's rest in client px and physical degrees, read off its Slot. */
	restPose(body: BodyState): Pose | null {
		const place = body.place;
		if (!place) return null;
		const turn = restAngle(place.side);
		if (body.mode !== "rest" && body.box) {
			const { x, y, width, height } = body.box;
			return {
				x,
				y,
				width,
				height,
				rotate: body.base.rotate,
				turn,
				opacity: body.base.opacity - 1,
				lift: 0,
			};
		}
		const rect = this.slotRect(place.slot);
		if (!rect) return null;
		return {
			x: rect.left,
			y: rect.top,
			width: rect.width,
			height: rect.height,
			rotate: this.dir * place.rotate,
			turn,
			opacity: 0,
			lift: 0,
		};
	}

	/** What a Body shows: its rest plus its Moves. */
	shownPose(body: BodyState, now: number): Pose | null {
		const rest = this.restPose(body);
		if (!rest) return null;
		const sample = sampleMoves(body.moves, now);
		const shown: Pose = {};
		for (const [channel, value] of Object.entries(rest) as [
			keyof Pose,
			number,
		][])
			shown[channel] = value + (sample[channel] ?? 0);
		return shown;
	}

	/** What `body`'s offsets add to: its Place's rotation and scale, or its base and hand box. */
	stance(body: BodyState): Stance {
		const box = body.box;
		const seat = body.seatBox;
		if (body.mode !== "rest" && box && seat)
			return {
				rotate: body.base.rotate,
				scale: body.base.scale,
				opacity: body.base.opacity,
				at: { x: box.x - seat.x, y: box.y - seat.y },
			};
		return {
			rotate: this.dir * (body.place?.rotate ?? 0),
			scale: body.place?.scale ?? 1,
			opacity: 1,
			at: null,
		};
	}

	/**
	 * Tells `body`'s React side that the Parts of forms it left can go. They
	 * stay pinned until they unmount, so nothing reflows.
	 */
	settleForms(body: BodyState) {
		body.settleForms?.();
	}

	activate(body: BodyState) {
		this.active.add(body);
		if (this.loop === null) this.loop = requestAnimationFrame(this.tick);
	}

	/** Where `body`'s offsets, and its Parts', start from now: what snapping never rounds back past. */
	began(body: BodyState, now: number) {
		body.spans = spansAt(body.moves, now);
		for (const part of body.parts.values())
			part.spans = partSpansAt(body.moves, part.id, now);
	}

	/** Writes `body`'s frame at `now`; whether it still moves. */
	paint(body: BodyState, now: number): boolean {
		return paintBody(this, body, now);
	}

	/**
	 * The time of what the reader last saw: the last frame painted, whenever
	 * the hand acts in between, or `now` if the loop was idle. A grab takes
	 * a Body from there, and a move the hand hands over starts there.
	 */
	handBirth(now: number): number {
		return now - this.lastFrame <= 2 * FRAME_MS * this.scale
			? Math.min(now, this.lastFrame)
			: now;
	}

	/**
	 * Holds `body`'s unstarted Moves at their start through the frame that
	 * paints the change, the slowest of the move, and starts their clock one
	 * frame in on the next (#1311 rule 8).
	 */
	defer(body: BodyState) {
		this.unstarted.add(body);
		this.holdThroughPaint();
	}

	/**
	 * The frame that starts what is held now: the one after the frame that
	 * paints it. A change made inside a frame's callback, by a cue, paints in
	 * that frame and starts on the next, its clock born at the cue's frame: a
	 * Trick queued behind another starts where the one before it landed.
	 */
	private holdThroughPaint() {
		this.startFrame = Math.min(
			this.startFrame,
			this.frames + (this.inFrame ? 0 : 1),
		);
		if (this.inFrame)
			this.startBirth = Math.min(
				this.startBirth ?? Number.POSITIVE_INFINITY,
				this.lastFrame,
			);
	}

	/** Calls `fn` `ms` of Table time after the Moves held now start, before that frame paints. */
	cue(ms: number, fn: () => void) {
		this.cues.push({ ms, at: Number.POSITIVE_INFINITY, fn });
		this.holdThroughPaint();
		if (this.loop === null) this.loop = requestAnimationFrame(this.tick);
	}

	private start(at: number) {
		for (const body of this.unstarted)
			body.moves = startMoves(body.moves, at);
		this.unstarted.clear();
		for (const cue of this.cues)
			if (cue.at === Number.POSITIVE_INFINITY) cue.at = at + cue.ms;
	}

	private callCues(now: number) {
		const due = this.cues.filter((cue) => cue.at <= now);
		if (due.length === 0) return;
		this.cues = this.cues.filter((cue) => cue.at > now);
		this.inFrame = true;
		try {
			for (const cue of due) cue.fn();
		} finally {
			this.inFrame = false;
		}
	}

	/** Settles once none of `ids` has a Move left. */
	settled(ids: readonly string[]): Promise<void> {
		return new Promise((resolve) => {
			this.waiters.push({ ids, resolve });
			this.resolveWaiters();
		});
	}

	private resolveWaiters() {
		this.waiters = this.waiters.filter(({ ids, resolve }) => {
			const moving = ids.some(
				(id) => (this.bodies.get(id)?.moves.length ?? 0) > 0,
			);
			if (!moving) resolve();
			return moving;
		});
	}

	/**
	 * One frame, at the frame's own timestamp: the crossings' veils are read
	 * and written first, then every moving Body is painted.
	 */
	private readonly tick = (timestamp: number) => {
		const now = this.at(timestamp);
		const index = this.frames++;
		this.lastFrame = now;
		this.dpr = devicePixelRatio();
		if (index >= this.startFrame) {
			this.startFrame = Number.POSITIVE_INFINITY;
			this.start(this.startBirth ?? now - FRAME_MS * this.scale);
			this.startBirth = null;
		}
		this.veils.paint(now);
		for (const body of this.active)
			if (!this.paint(body, now)) this.active.delete(body);
		this.callCues(now);
		this.loop =
			this.active.size > 0 || this.cues.length > 0
				? requestAnimationFrame(this.tick)
				: null;
		this.resolveWaiters();
	};

	/** Stands a held or leaving Body's seat on its px box, unanchored, written once. */
	seatOn(body: BodyState, mode: Exclude<Mode, "rest">) {
		const seat = body.seat;
		const box = body.box;
		body.mode = mode;
		body.seatBox = box;
		if (body.el) body.el.dataset.mode = mode;
		if (!seat || !box) return;
		const origin = this.originPoint();
		const set = (prop: string, value: string) =>
			setWritten(seat.style, body.seatWritten, prop, value);
		set("--seat-x", `${box.x - origin.x}px`);
		set("--seat-y", `${box.y - origin.y}px`);
		set("--seat-w", `${box.width}px`);
		set("--seat-h", `${box.height}px`);
		seat.dataset.mode = mode;
	}

	/** Puts a held or leaving Body back on its Slot's rest. */
	moor(body: BodyState) {
		body.mode = "rest";
		body.box = null;
		body.seatBox = null;
		body.base = REST_BASE;
		if (body.el) delete body.el.dataset.mode;
		const seat = body.seat;
		if (seat) {
			delete seat.dataset.mode;
			for (const prop of SEAT_BOX_PROPS)
				setWritten(seat.style, body.seatWritten, prop, null);
		}
	}
}
