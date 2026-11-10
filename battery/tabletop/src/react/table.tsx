import {
	type CSSProperties,
	createContext,
	type ReactNode,
	use,
	useId,
	useLayoutEffect,
	useState,
	useSyncExternalStore,
} from "react";
import { flushSync } from "react-dom";
import type { Box, Point } from "../core/geometry";
import { type HandPose, LIFTED } from "../core/hand";
import { moves as movesOn } from "../core/move";
import type { SlotId } from "../core/place";
import { motionPolicy } from "../core/reduce";
import { SPRINGS } from "../core/springs";
import type { TiltFeel } from "../core/tilt";
import type { Trick } from "../core/trick";
import { DEFAULT_TURN, type TurnFeel } from "../core/turn";
import { type Clock, Engine } from "./engine";
import { carry, type Flight, hold, leave } from "./hand";
import { playTrick, type Staged, TrickQueue } from "./queue";
import { TABLE_CSS } from "./styles";
import { flattenAll, type Pointing, point } from "./tilt";
import { type Moves, transact } from "./transact";

/** What the app does with the Table: every jump it causes goes through it. */
export type TableHandle = {
	/** The hand takes `id` from where it shows, `pointer` (client px) on it. */
	readonly hold: (id: string, pointer: Point) => void;
	/** The held `id` follows `pointer` 1:1. */
	readonly carry: (id: string, pointer: Point) => void;
	/**
	 * The hand lets go of `id` at `velocity` (px/s), and `commit` gives it its
	 * new rest, or leaves it where it was: it springs there with the part of
	 * the hand's speed aimed at it. A rest where it shows has no way to go:
	 * nothing moves and the hand's speed is thrown away.
	 */
	readonly release: (
		id: string,
		velocity: Point,
		commit?: () => void,
	) => void;
	/**
	 * Commits a change of the model and moves every Body it changed from
	 * where it showed: by `moves`, or else by a reflow (a change of form
	 * morphs).
	 */
	readonly transact: (commit: (() => void) | null, moves?: Moves) => void;
	/**
	 * Plays `trick` at once, cutting in on any Trick playing or queued:
	 * `commit` gives the Deck the trick's order, rest and sides, and each
	 * Card passes its waypoints on the way from where it shows. Settles
	 * when they all rest.
	 */
	readonly play: (trick: Trick, commit?: () => void) => Promise<void>;
	/**
	 * Queues a Trick behind every one queued before it, as deck-of-cards
	 * runs them: `stage` makes it when its turn comes, from the Deck as it
	 * is then (`null` skips it), and the next starts in the frame its last
	 * move lands, while a turn it cued after plays on. Settles as it lands.
	 */
	readonly queue: (stage: () => Staged | null) => Promise<void>;
	/** Forgets every Trick still queued; the next one queued starts at once. */
	readonly drop: () => void;
	/**
	 * Calls `fn` `ms` of Table time after the Moves committed now start, in
	 * the frame that reaches it and before that frame paints: a follow-up on
	 * the move's own clock, such as a turn once a deal has landed. Slow-mo
	 * stretches it with the move, and it is only ever called in a frame, so
	 * never before the Table has drawn the move that far, as a timer in a
	 * hidden tab would be.
	 */
	readonly cue: (ms: number, fn: () => void) => void;
	/** `id` leaves for good, flying on with the throw; drop it once this settles. */
	readonly leave: (id: string, flight: Flight) => Promise<void>;
	/**
	 * The pointer is over `id`, or left it (`null`). While the Table tilts
	 * and motion isn't reduced, a resting or held Body leans toward where the
	 * pointer is on it and lights its Glares. A touch never tilts a Body;
	 * call it from `onPointerEnter`, `onPointerMove` and `onPointerLeave`.
	 */
	readonly point: (id: string, pointer: Pointing | null) => void;
	/** Whether `id` is moving, so a press catches it rather than taps it. */
	readonly moving: (id: string) => boolean;
	/** Where `id` shows now, in client px, unrotated. */
	readonly shown: (id: string) => Box | null;
	/**
	 * Where `id` shows now: its box (client px, unrotated) and its rotation
	 * in logical degrees, as a Place would hold it. What an app puts a Body
	 * down at to leave it exactly where the hand let go.
	 */
	readonly pose: (
		id: string,
	) => { readonly box: Box; readonly rotate: number } | null;
	readonly slotRect: (slot: SlotId) => DOMRect | null;
	/** @internal The engine the Table's components register with. */
	readonly engine: Engine;
};

function handleOf(engine: Engine): TableHandle {
	const tricks = new TrickQueue(
		(staged) => playTrick(engine, staged),
		(ms, fn) => engine.cue(ms, fn),
	);
	return {
		engine,
		hold: (id, pointer) => hold(engine, id, pointer),
		carry: (id, pointer) => carry(engine, id, pointer),
		release: (id, velocity, commit) =>
			transact(engine, commit ?? null, (other) =>
				other === id
					? {
							source: "hand",
							velocity: engine.policy.reduced
								? { x: 0, y: 0 }
								: velocity,
							spring: SPRINGS.settle,
						}
					: undefined,
			),
		transact: (commit, moves) => transact(engine, commit, moves),
		play: (trick, commit) => {
			tricks.drop();
			playTrick(engine, { trick, commit });
			return engine.settled([...trick.moves.keys()]);
		},
		queue: (stage) => tricks.push(stage),
		drop: () => tricks.drop(),
		cue: (ms, fn) => engine.cue(ms, fn),
		leave: (id, flight) => leave(engine, id, flight),
		point: (id, pointer) => point(engine, id, pointer),
		moving: (id) => {
			const body = engine.bodies.get(id);
			return (
				!!body &&
				body.mode !== "hand" &&
				(movesOn(body.moves, "x") ||
					movesOn(body.moves, "y") ||
					movesOn(body.moves, "width"))
			);
		},
		shown: (id) => {
			const body = engine.bodies.get(id);
			const pose = body ? engine.shownPose(body, engine.now()) : null;
			if (!pose) return null;
			return {
				x: pose.x ?? 0,
				y: pose.y ?? 0,
				width: pose.width ?? 0,
				height: pose.height ?? 0,
			};
		},
		pose: (id) => {
			const body = engine.bodies.get(id);
			const pose = body ? engine.shownPose(body, engine.now()) : null;
			if (!pose) return null;
			return {
				box: {
					x: pose.x ?? 0,
					y: pose.y ?? 0,
					width: pose.width ?? 0,
					height: pose.height ?? 0,
				},
				rotate: engine.dir * (pose.rotate ?? 0),
			};
		},
		slotRect: (slot) => engine.slotRect(slot),
	};
}

/** A Table's handle, made once: pass it to `<Table>`. */
export function useTable({
	clock,
}: {
	readonly clock?: Clock;
} = {}): TableHandle {
	const [handle] = useState(() =>
		handleOf(new Engine((commit) => flushSync(commit), clock)),
	);
	return handle;
}

const TableContext = createContext<TableHandle | null>(null);

/** The Table the component is on. */
export function useTableHandle(): TableHandle {
	const table = use(TableContext);
	if (!table) throw new Error("tabletop: render this inside a <Table>");
	return table;
}

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReduced(onChange: () => void) {
	const query = window.matchMedia(REDUCED_QUERY);
	query.addEventListener("change", onChange);
	return () => query.removeEventListener("change", onChange);
}

function usePrefersReducedMotion(): boolean {
	return useSyncExternalStore(
		subscribeReduced,
		() => window.matchMedia(REDUCED_QUERY).matches,
		() => false,
	);
}

export type TableProps = {
	readonly table: TableHandle;
	readonly dir?: "ltr" | "rtl";
	/** Reduced motion: the reader's preference (`system`), forced on, or off. */
	readonly reducedMotion?: "system" | "on" | "off";
	/** The app's "Always play animations": overrides the system preference. */
	readonly alwaysPlay?: boolean;
	/** Slow-mo: 1 is real time, 0.25 four times slower. */
	readonly timeScale?: number;
	readonly turn?: TurnFeel;
	/** How a handled Body tilts toward the pointer; nothing tilts without it. */
	readonly tilt?: TiltFeel | null;
	/** How a Body looks in the hand: lifted and upright, or as it was (`KEEP_POSE`). */
	readonly hand?: HandPose;
	/** Development checks: pass the app's development flag. */
	readonly assert?: boolean;
	readonly className?: string;
	readonly style?: CSSProperties;
	readonly children: ReactNode;
};

/**
 * The surface every Region and Body sits on: one clock and frame loop with
 * one writer, the reduced-motion policy, the writing direction, the turn's
 * feel, the tilt's and the hand's pose. Its Bodies are `position: fixed`, so no
 * ancestor may transform or contain it.
 */
export function Table({
	table,
	dir = "ltr",
	reducedMotion = "system",
	alwaysPlay = false,
	timeScale = 1,
	turn = DEFAULT_TURN,
	tilt = null,
	hand = LIFTED,
	assert = false,
	className,
	style,
	children,
}: TableProps) {
	const engine = table.engine;
	const id = useId();
	const prefersReduced = usePrefersReducedMotion();
	const reduced =
		reducedMotion === "on" ||
		(reducedMotion === "system" &&
			motionPolicy(prefersReduced, alwaysPlay).reduced);
	/* plain fields the engine reads in event handlers: set as the Table renders */
	engine.prefix = `tt${id.replace(/[^a-zA-Z0-9]/g, "")}`;
	engine.policy = { reduced };
	engine.dir = dir === "rtl" ? -1 : 1;
	engine.turn = turn;
	engine.tilt = tilt;
	engine.hand = hand;
	engine.assert = assert;
	engine.setTimeScale(timeScale);
	useLayoutEffect(() => {
		if (!tilt || reduced) flattenAll(engine);
	}, [engine, tilt, reduced]);
	return (
		<div
			data-tabletop=""
			dir={dir}
			data-reduced={reduced || undefined}
			data-turn-axis={turn.axis}
			className={className}
			style={
				{
					...style,
					"--turn-perspective": `${turn.perspective}px`,
					"--tilt-perspective": `${tilt?.perspective ?? 600}px`,
				} as CSSProperties
			}
		>
			<style>{TABLE_CSS}</style>
			<div
				data-tabletop-origin=""
				aria-hidden="true"
				ref={(el) => {
					engine.origin = el;
				}}
			/>
			<svg
				data-tabletop-veils=""
				aria-hidden="true"
				ref={(el) => {
					engine.veils.svg = el;
				}}
			/>
			<TableContext value={table}>{children}</TableContext>
		</div>
	);
}
