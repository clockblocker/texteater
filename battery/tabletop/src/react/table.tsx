import {
	type CSSProperties,
	createContext,
	type ReactNode,
	use,
	useId,
	useState,
	useSyncExternalStore,
} from "react";
import { flushSync } from "react-dom";
import type { Box, Point } from "../core/geometry";
import type { SlotId } from "../core/place";
import { motionPolicy } from "../core/reduce";
import { SPRINGS } from "../core/springs";
import { type Trick, trickMove } from "../core/tricks";
import { DEFAULT_TURN, type TurnFeel } from "../core/turn";
import { type Clock, Engine } from "./engine";
import { carry, type Flight, hold, leave } from "./hand";
import { TABLE_CSS } from "./styles";
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
	 * the hand's speed aimed at it.
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
	 * Plays `trick`: `commit` gives the Deck the trick's order and rest, and
	 * each Card passes its waypoints on the way. Settles when they all rest.
	 */
	readonly play: (trick: Trick, commit?: () => void) => Promise<void>;
	/** `id` leaves for good, flying on with the throw; drop it once this settles. */
	readonly leave: (id: string, flight: Flight) => Promise<void>;
	/** Whether `id` is moving, so a press catches it rather than taps it. */
	readonly moving: (id: string) => boolean;
	/** Where `id` shows now, in client px, unrotated. */
	readonly shown: (id: string) => Box | null;
	readonly slotRect: (slot: SlotId) => DOMRect | null;
	/** @internal The engine the Table's components register with. */
	readonly engine: Engine;
};

function rootRemPx(): number {
	return (
		Number.parseFloat(
			getComputedStyle(document.documentElement).fontSize,
		) || 16
	);
}

function handleOf(engine: Engine): TableHandle {
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
			const frame = { remPx: rootRemPx(), dir: engine.dir };
			const moves = new Map(
				[...trick.moves].map(([id, move]) => [
					id,
					trickMove(move, frame),
				]),
			);
			transact(engine, commit ?? null, moves);
			return engine.settled([...trick.moves.keys()]);
		},
		leave: (id, flight) => leave(engine, id, flight),
		moving: (id) => {
			const body = engine.bodies.get(id);
			return (
				!!body &&
				body.mode !== "hand" &&
				body.terms.some(
					(term) =>
						term.channel === "x" ||
						term.channel === "y" ||
						term.channel === "width",
				)
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
	/** Development checks: pass the app's development flag. */
	readonly assert?: boolean;
	readonly className?: string;
	readonly style?: CSSProperties;
	readonly children: ReactNode;
};

/**
 * The surface every Region and Body sits on: one clock and frame loop (Motion's,
 * with no layout projection), the reduced-motion policy, the writing
 * direction and the turn's feel. Its Bodies are `position: fixed`, so no
 * ancestor may transform or contain it.
 */
export function Table({
	table,
	dir = "ltr",
	reducedMotion = "system",
	alwaysPlay = false,
	timeScale = 1,
	turn = DEFAULT_TURN,
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
	engine.assert = assert;
	engine.setTimeScale(timeScale);
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
			<TableContext value={table}>{children}</TableContext>
		</div>
	);
}
