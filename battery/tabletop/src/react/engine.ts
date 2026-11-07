import { cancelFrame, frame } from "motion";
import type { Box, Point } from "../core/geometry";
import type { Pose } from "../core/move";
import type { Place, SlotId } from "../core/place";
import type { MotionPolicy } from "../core/reduce";
import { type Channel, done, sumAt, type Term } from "../core/term";
import type { TiltFeel } from "../core/tilt";
import {
	DEFAULT_TURN,
	frontOpacity,
	restAngle,
	type TurnFeel,
	turnLift,
} from "../core/turn";
import { clearGhosts, type Ghost, writeGhosts } from "./ghosts";
import { type TiltState, writeTilt } from "./tilt";

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
	readonly written: Set<string>;
	/** The one form it belongs to, if it has one. */
	readonly only: string | undefined;
};

export type BodyState = {
	readonly id: string;
	/** The element while mounted. */
	el: HTMLElement | null;
	/** The element last mounted, to tell a remount from a re-attach. */
	mounted: HTMLElement | null;
	shell: HTMLElement | null;
	/** The Place last committed, which the Body's CSS reads. */
	place: Place | null;
	terms: Term[];
	mode: Mode;
	/** The px box in client coordinates while held or leaving. */
	box: Box | null;
	base: Base;
	/** The pointer's offset from the box's corner while held. */
	grab: Point;
	boxDirty: boolean;
	readonly parts: Map<string, PartState>;
	readonly written: Set<string>;
	/** Its lean toward the pointer, while it has one. */
	tilt: TiltState | null;
	/** Its Glares, which only its tilt writes. */
	readonly lights: Set<HTMLElement>;
	/** Copies of Parts its last form had, fading out. */
	ghosts: Ghost[];
};

/** A clock in ms. The Table's runs slower under slow-mo. */
export type Clock = { readonly now: () => number };

const BODY_PROPS = {
	x: "--fly-x",
	y: "--fly-y",
	width: "--fly-w",
	height: "--fly-h",
	rotate: "--fly-rotate",
	lift: "--fly-lift",
	z: "--fly-z",
	opacity: "--fly-opacity",
} as const satisfies Partial<Record<Channel, string>>;
const PART_PROPS = {
	x: "--part-x",
	y: "--part-y",
	opacity: "--part-o",
} as const satisfies Partial<Record<Channel, string>>;

function format(channel: Channel, value: number): string {
	if (channel === "z") return String(Math.round(value));
	if (channel === "rotate" || channel === "turn") return `${value}deg`;
	if (channel === "lift" || channel === "opacity") return String(value);
	return `${value}px`;
}

/** Writes each channel with a live Term, and clears the ones that ended. */
function writeChannels(
	style: CSSStyleDeclaration,
	written: Set<string>,
	terms: readonly Term[],
	props: Partial<Record<Channel, string>>,
	now: number,
) {
	for (const [channel, prop] of Object.entries(props) as [
		Channel,
		string,
	][]) {
		if (terms.some((term) => term.channel === channel)) {
			style.setProperty(
				prop,
				format(channel, sumAt(terms, channel, now)),
			);
			written.add(prop);
		} else if (written.delete(prop)) style.removeProperty(prop);
	}
}

function setWritten(
	style: CSSStyleDeclaration,
	written: Set<string>,
	prop: string,
	value: string | null,
) {
	if (value === null) {
		if (written.delete(prop)) style.removeProperty(prop);
		return;
	}
	style.setProperty(prop, value);
	written.add(prop);
}

const REST_BASE: Base = { rotate: 0, scale: 1, z: 0, opacity: 1 };

/**
 * The Table's engine: every Body's Terms, the clock and the one frame loop
 * that writes them. It never says where a Body is, only how far it still
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
	private readonly active = new Set<BodyState>();
	private running = false;
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
		if (this.clock) return this.clock.now();
		return this.base + (performance.now() - this.realBase) * this.scale;
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
				mounted: null,
				shell: null,
				place: null,
				terms: [],
				mode: "rest",
				box: null,
				base: REST_BASE,
				grab: { x: 0, y: 0 },
				boxDirty: false,
				parts: new Map(),
				written: new Set(),
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
			body.mode = "rest";
			body.box = null;
			body.base = REST_BASE;
			body.written.clear();
			body.tilt = null;
			this.tilting.delete(body);
			clearGhosts(body);
			this.active.delete(body);
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
		if (this.running) return;
		this.running = true;
		frame.render(this.tick, true);
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

	private readonly tick = () => {
		const now = this.now();
		for (const body of this.active)
			if (!this.write(body, now)) this.active.delete(body);
		if (this.active.size === 0) {
			cancelFrame(this.tick);
			this.running = false;
		}
		this.resolveWaiters();
	};

	/** Writes `body`'s frame at `now`; whether it still moves. */
	write(body: BodyState, now: number): boolean {
		const el = body.el;
		if (!el) return false;
		body.terms = body.terms.filter((term) => !done(term, now));
		writeChannels(el.style, body.written, body.terms, BODY_PROPS, now);
		setWritten(
			el.style,
			body.written,
			"--fly-raise",
			body.terms.some((term) => term.raise) ? "1" : null,
		);
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
			);
			parts ||= part.terms.length > 0;
		}
		const leaning = writeTilt(this, body, now);
		const haunted = writeGhosts(body, now);
		return body.terms.length > 0 || parts || leaning || haunted;
	}

	/** The px box a held or leaving Body stands on, in the Table's px. */
	writeBox(body: BodyState) {
		const el = body.el;
		const box = body.box;
		if (!el || !box) return;
		const origin = this.originPoint();
		const set = (prop: string, value: string) =>
			setWritten(el.style, body.written, prop, value);
		set("--box-x", `${box.x - origin.x}px`);
		set("--box-y", `${box.y - origin.y}px`);
		set("--box-w", `${box.width}px`);
		set("--box-h", `${box.height}px`);
		set("--box-rotate", `${body.base.rotate}deg`);
		set("--box-scale", String(body.base.scale));
		set("--box-z", String(Math.round(body.base.z)));
		set("--box-o", String(body.base.opacity));
		body.boxDirty = false;
	}

	/** Puts a held or leaving Body back on its Slot's rest. */
	moor(body: BodyState) {
		const el = body.el;
		body.mode = "rest";
		body.box = null;
		body.base = REST_BASE;
		if (!el) return;
		delete el.dataset.mode;
		for (const prop of [
			"--box-x",
			"--box-y",
			"--box-w",
			"--box-h",
			"--box-rotate",
			"--box-scale",
			"--box-z",
			"--box-o",
		])
			setWritten(el.style, body.written, prop, null);
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
			shell.style.setProperty(prop, value);
			written.add(`shell:${prop}`);
		}
	}
}
