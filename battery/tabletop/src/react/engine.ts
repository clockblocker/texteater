import type { Box, Point } from "../core/geometry";
import type { Pose } from "../core/move";
import type { Place, SlotId } from "../core/place";
import type { MotionPolicy } from "../core/reduce";
import { type Channel, done, startTerms, sumAt, type Term } from "../core/term";
import type { TiltFeel } from "../core/tilt";
import {
	DEFAULT_TURN,
	frontOpacity,
	restAngle,
	type TurnFeel,
	turnLift,
} from "../core/turn";
import { clearGhosts, type Ghost, startGhosts, writeGhosts } from "./ghosts";
import { type TiltState, writeTilt } from "./tilt";
import {
	type Spans,
	setWritten,
	spansAt,
	type Written,
	writeChannels,
} from "./write";

/** Where a Body stands: on its Slot, in the hand, or leaving for good. */
type Mode = "rest" | "hand" | "unmoored";

/** What a held or leaving Body stands on in place of its Slot's rest. */
type Base = {
	readonly rotate: number;
	readonly scale: number;
	readonly z: number;
	readonly opacity: number;
};

type PartState = {
	readonly id: string;
	readonly el: HTMLElement;
	terms: Term[];
	readonly written: Written;
	/** Where its offsets' move started. */
	spans: Spans;
	/** The one form it belongs to, if it has one. */
	readonly only: string | undefined;
};

export type BodyState = {
	readonly id: string;
	/** The element while mounted: the Body, which carries every offset. */
	el: HTMLElement | null;
	/**
	 * The invisible box it sits in: anchored to its Slot at rest, or fixed
	 * where the hand took it. The Table writes on it only when the Body's
	 * stacking order or mode changes, never once a frame.
	 */
	seat: HTMLElement | null;
	/** The element last mounted, to tell a remount from a re-attach. */
	mounted: HTMLElement | null;
	shell: HTMLElement | null;
	/** The Place last committed, which the Body's CSS reads. */
	place: Place | null;
	terms: Term[];
	/** Where the box's offsets' move started, which snapping never passes. */
	spans: Spans;
	mode: Mode;
	/** The px box in client coordinates while held or leaving. */
	box: Box | null;
	/** The px box the seat stands on while held or leaving. */
	seatBox: Box | null;
	base: Base;
	/** The pointer's offset from the box's corner while held. */
	grab: Point;
	boxDirty: boolean;
	readonly parts: Map<string, PartState>;
	readonly written: Written;
	readonly seatWritten: Written;
	/** Its lean toward the pointer, while it has one. */
	tilt: TiltState | null;
	/** Its Glares, which only its tilt writes. */
	readonly lights: Set<HTMLElement>;
	/** Copies of Parts its last form had, fading out. */
	ghosts: Ghost[];
};

/** A clock in ms. The Table's runs slower under slow-mo. */
export type Clock = { readonly now: () => number };

/** One frame at 60 Hz, in ms. */
const FRAME_MS = 1000 / 60;

const BODY_PROPS = {
	x: "--fly-x",
	y: "--fly-y",
	width: "--fly-w",
	height: "--fly-h",
	rotate: "--fly-rotate",
	lift: "--fly-lift",
	opacity: "--fly-opacity",
} as const satisfies Partial<Record<Channel, string>>;
const SEAT_PROPS = { z: "--fly-z" } as const satisfies Partial<
	Record<Channel, string>
>;
const PART_PROPS = {
	x: "--part-x",
	y: "--part-y",
	opacity: "--part-o",
} as const satisfies Partial<Record<Channel, string>>;
const BOX_PROPS = [
	"--box-x",
	"--box-y",
	"--box-rotate",
	"--box-scale",
	"--box-o",
];
const SEAT_BOX_PROPS = [
	"--seat-x",
	"--seat-y",
	"--seat-w",
	"--seat-h",
	"--box-z",
];

const REST_BASE: Base = { rotate: 0, scale: 1, z: 0, opacity: 1 };

function devicePixelRatio(): number {
	return (typeof window === "undefined" ? 1 : window.devicePixelRatio) || 1;
}

/**
 * The Table's engine: every Body's Terms, the clock and the one frame loop
 * (its own `requestAnimationFrame`, on the frames' timestamps) that writes
 * them. It never says where a Body is, only how far it still
 * is from its rest; a Body with no Terms has nothing written on it.
 */
export class Engine {
	readonly bodies = new Map<string, BodyState>();
	readonly slots = new Map<SlotId, HTMLElement>();
	readonly regions = new Map<string, HTMLElement>();
	policy: MotionPolicy = { reduced: false };
	dir: 1 | -1 = 1;
	turn: TurnFeel = DEFAULT_TURN;
	/** How a handled Body tilts, or `null` when nothing tilts. */
	tilt: TiltFeel | null = null;
	/** The Bodies with a tilt, oldest first. */
	readonly tilting = new Set<BodyState>();
	/** Development checks: every Place has a Slot; nothing anchors to a transformed box. */
	assert = false;
	/** Set while `transact` commits, so a Body can tell a jump outside one. */
	transacting = false;
	origin: HTMLElement | null = null;
	prefix = "tt";
	/** Device pixels per CSS px, read once a frame: what offsets snap to. */
	dpr = devicePixelRatio();
	private readonly active = new Set<BodyState>();
	private readonly unstarted = new Set<BodyState>();
	/** The frame the unstarted Terms start on: the one after the next. */
	private startFrame = Number.POSITIVE_INFINITY;
	/** The frames the loop has run, and the Table time of the last. */
	private frames = 0;
	private lastFrame = Number.NEGATIVE_INFINITY;
	private loop: number | null = null;
	private waiters: { ids: readonly string[]; resolve: () => void }[] = [];
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

	/** Table time at real time `real`, such as a frame's timestamp. */
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
			body = {
				id,
				el: null,
				seat: null,
				mounted: null,
				shell: null,
				place: null,
				terms: [],
				spans: {},
				mode: "rest",
				box: null,
				seatBox: null,
				base: REST_BASE,
				grab: { x: 0, y: 0 },
				boxDirty: false,
				parts: new Map(),
				written: new Map(),
				seatWritten: new Map(),
				tilt: null,
				lights: new Set(),
				ghosts: [],
			};
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
			body.terms = [];
			body.spans = {};
			body.mode = "rest";
			body.box = null;
			body.seatBox = null;
			body.base = REST_BASE;
			body.written.clear();
			body.seatWritten.clear();
			body.tilt = null;
			this.tilting.delete(body);
			clearGhosts(body);
			this.active.delete(body);
			this.unstarted.delete(body);
		}
		body.el = el;
	}

	detach(id: string, el: HTMLElement) {
		const body = this.bodies.get(id);
		if (body?.el !== el) return;
		body.el = null;
		body.tilt = null;
		this.tilting.delete(body);
	}

	/** A Body's seat mounted, or unmounted (`null`). */
	seat(id: string, el: HTMLElement | null) {
		this.body(id).seat = el;
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

	/** A Body's rest in client px and physical degrees, read off its Slot. */
	restPose(body: BodyState): Pose | null {
		const place = body.place;
		if (!place) return null;
		const turn = restAngle(place.side);
		if (body.mode !== "rest" && body.box) {
			const { x, y, width, height } = body.box;
			const { rotate, z, opacity } = body.base;
			return {
				x,
				y,
				width,
				height,
				rotate,
				z,
				turn,
				opacity: opacity - 1,
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
			z: place.z,
			turn,
			opacity: 0,
			lift: 0,
		};
	}

	/** What a Body shows: its rest plus its Terms. */
	shownPose(body: BodyState, now: number): Pose | null {
		const rest = this.restPose(body);
		if (!rest) return null;
		const shown: Pose = { ...rest };
		for (const channel of Object.keys(rest) as Channel[])
			shown[channel] =
				(rest[channel] ?? 0) + sumAt(body.terms, channel, now);
		return shown;
	}

	activate(body: BodyState) {
		this.active.add(body);
		if (this.loop === null) this.loop = requestAnimationFrame(this.tick);
	}

	/**
	 * Where `body`'s Terms, and its Parts', start from as they are now: the
	 * starts snapping never rounds back past. Called whenever a move gives
	 * them new Terms.
	 */
	began(body: BodyState, now: number) {
		body.spans = spansAt(body.terms, now);
		for (const part of body.parts.values())
			part.spans = spansAt(part.terms, now);
	}

	/**
	 * When a move the hand hands over starts: on the last frame painted,
	 * where the hand last showed the Body, so the next frame carries it one
	 * frame's worth at the hand's speed, whenever the release ran in
	 * between; at `now` if the loop was idle.
	 */
	handBirth(now: number): number {
		return now - this.lastFrame <= 2 * FRAME_MS * this.scale
			? Math.min(now, this.lastFrame)
			: now;
	}

	/**
	 * Holds `body`'s unstarted Terms at their start through the frame that
	 * paints the change, the slowest of the move, and starts their clock one
	 * frame in on the next (#1311 rule 8): the first frame that moves moves
	 * one frame's worth, however long the change took to paint.
	 */
	defer(body: BodyState) {
		this.unstarted.add(body);
		this.startFrame = Math.min(this.startFrame, this.frames + 1);
	}

	private start(at: number) {
		for (const body of this.unstarted) {
			body.terms = startTerms(body.terms, at);
			for (const part of body.parts.values())
				part.terms = startTerms(part.terms, at);
			if (body.tilt) body.tilt.terms = startTerms(body.tilt.terms, at);
			startGhosts(body, at);
		}
		this.unstarted.clear();
	}

	/** Settles once none of `ids` has a Term left. */
	settled(ids: readonly string[]): Promise<void> {
		return new Promise((resolve) => {
			this.waiters.push({ ids, resolve });
			this.resolveWaiters();
		});
	}

	private resolveWaiters() {
		this.waiters = this.waiters.filter(({ ids, resolve }) => {
			const moving = ids.some((id) => {
				const body = this.bodies.get(id);
				return (
					!!body &&
					(body.terms.length > 0 ||
						[...body.parts.values()].some(
							(part) => part.terms.length > 0,
						))
				);
			});
			if (!moving) resolve();
			return moving;
		});
	}

	/**
	 * One frame: every moving Body written at the frame's own timestamp,
	 * not at whenever its callback happens to run, so a frame that starts
	 * late still shows a frame's worth of progress, no more.
	 */
	private readonly tick = (timestamp: number) => {
		const now = this.at(timestamp);
		const index = this.frames++;
		this.lastFrame = now;
		this.dpr = devicePixelRatio();
		if (index >= this.startFrame) {
			this.startFrame = Number.POSITIVE_INFINITY;
			this.start(now - FRAME_MS * this.scale);
		}
		for (const body of this.active)
			if (!this.write(body, now)) this.active.delete(body);
		this.loop =
			this.active.size > 0 ? requestAnimationFrame(this.tick) : null;
		this.resolveWaiters();
	};

	/** Writes `body`'s frame at `now`; whether it still moves. */
	write(body: BodyState, now: number): boolean {
		const el = body.el;
		if (!el) return false;
		body.terms = body.terms.filter((term) => !done(term, now));
		writeChannels(
			el.style,
			body.written,
			body.terms,
			BODY_PROPS,
			now,
			body.spans,
			this.dpr,
		);
		const seat = body.seat;
		if (seat) {
			writeChannels(
				seat.style,
				body.seatWritten,
				body.terms,
				SEAT_PROPS,
				now,
				{},
				this.dpr,
			);
			setWritten(
				seat.style,
				body.seatWritten,
				"--fly-raise",
				body.terms.some((term) => term.raise) ? "1" : null,
			);
		}
		if (body.mode !== "rest" && body.box && body.boxDirty)
			this.writeBox(body);
		this.writeTurn(body, now);
		let parts = false;
		for (const part of body.parts.values()) {
			part.terms = part.terms.filter((term) => !done(term, now));
			writeChannels(
				part.el.style,
				part.written,
				part.terms,
				PART_PROPS,
				now,
				part.spans,
				this.dpr,
			);
			parts ||= part.terms.length > 0;
		}
		const leaning = writeTilt(this, body, now);
		const haunted = writeGhosts(body, now, this.dpr);
		return body.terms.length > 0 || parts || leaning || haunted;
	}

	/**
	 * Stands a held or leaving Body's seat on its px box, unanchored, so the
	 * hand's moves write only the Body: written once, as the hand takes it
	 * or it leaves.
	 */
	seatOn(body: BodyState, mode: Exclude<Mode, "rest">) {
		const seat = body.seat;
		const box = body.box;
		body.mode = mode;
		body.seatBox = box;
		body.boxDirty = true;
		if (body.el) body.el.dataset.mode = mode;
		if (!seat || !box) return;
		const origin = this.originPoint();
		const set = (prop: string, value: string) =>
			setWritten(seat.style, body.seatWritten, prop, value);
		set("--seat-x", `${box.x - origin.x}px`);
		set("--seat-y", `${box.y - origin.y}px`);
		set("--seat-w", `${box.width}px`);
		set("--seat-h", `${box.height}px`);
		set("--box-z", String(Math.round(body.base.z)));
		seat.dataset.mode = mode;
	}

	/** The px box a held or leaving Body stands on, from its seat's corner. */
	writeBox(body: BodyState) {
		const el = body.el;
		const box = body.box;
		const seat = body.seatBox;
		if (!el || !box || !seat) return;
		const set = (prop: string, value: string) =>
			setWritten(el.style, body.written, prop, value);
		set("--box-x", `${box.x - seat.x}px`);
		set("--box-y", `${box.y - seat.y}px`);
		set("--box-rotate", `${body.base.rotate}deg`);
		set("--box-scale", String(body.base.scale));
		set("--box-o", String(body.base.opacity));
		body.boxDirty = false;
	}

	/** Puts a held or leaving Body back on its Slot's rest. */
	moor(body: BodyState) {
		const el = body.el;
		body.mode = "rest";
		body.box = null;
		body.seatBox = null;
		body.base = REST_BASE;
		if (el) {
			delete el.dataset.mode;
			for (const prop of BOX_PROPS)
				setWritten(el.style, body.written, prop, null);
		}
		const seat = body.seat;
		if (seat) {
			delete seat.dataset.mode;
			for (const prop of SEAT_BOX_PROPS)
				setWritten(seat.style, body.seatWritten, prop, null);
		}
	}

	private writeTurn(body: BodyState, now: number) {
		const shell = body.shell;
		if (!shell) return;
		const turning = body.terms.some((term) => term.channel === "turn");
		const written = body.written;
		if (!turning) {
			for (const prop of ["--fly-turn", "--turn-lift", "--turn-front"])
				if (written.delete(`shell:${prop}`))
					shell.style.removeProperty(prop);
			return;
		}
		const offset = sumAt(body.terms, "turn", now);
		const angle = restAngle(body.place?.side ?? "front") + offset;
		const reduced = this.policy.reduced;
		const values: [string, string][] = [
			["--fly-turn", `${offset}deg`],
			[
				"--turn-lift",
				String(reduced ? 1 : turnLift(angle, this.turn.lift)),
			],
		];
		if (reduced)
			values.push(["--turn-front", String(frontOpacity(angle, true))]);
		for (const [prop, value] of values) {
			if (written.get(`shell:${prop}`) === value) continue;
			shell.style.setProperty(prop, value);
			written.set(`shell:${prop}`, value);
		}
	}
}
