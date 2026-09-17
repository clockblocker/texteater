import { deckFor } from "../../deck-models/dummy";
import {
	ARM_LABEL,
	ARM_LABEL_ARMED,
	ARM_LABEL_COMMITTED,
	ARM_LABEL_FROM,
	FLY_DISTANCE,
	FLY_FADE,
	FLY_ROTATE,
	FLY_ROTATE_TO,
	FLY_TRAVEL,
	leanFor,
	TILT_MAX,
} from "../../deck-models/motion-spec";
import {
	type Params,
	progressOf,
	type SpringSpec,
	settleCaveat,
	springAt,
	springLength,
	springSettle,
} from "../motion";
import { mix, type Scene, type SceneGroup, scene } from "../scene";

/**
 * DRAG — what the Compass Held Card does once the pointer lets go, or when
 * it crosses a zone. Shipped in `deck-models/drag-deck.tsx`: `snapBack`,
 * `flyAway`, the remove-zone tilt and the arm label. A release that opens
 * a Sheet is not here: the Note grows from the hand, in the Sheet tab.
 *
 * The Card is drawn at rest in the middle of a stage; `x` and `y` are its
 * offsets from that rest, as Motion holds them on the Note itself.
 *
 * Every duration, curve and distance comes from
 * `deck-models/motion-spec.ts`. What a scene owns is where the pointer let
 * go — the stage has to put the Card somewhere before it can move — and
 * the beat before a commit, which exists so the preview shows both halves.
 */

const NOTE = deckFor("noch")[0];

/**
 * The drag spring: `SPRING` in drag-deck.tsx, from the knobs.
 *
 * `travel` is how far the value has to go, in px. It is here because a
 * spring's initial velocity is in units of that travel per second, and the
 * knob is in px/ms — the units the deck itself measures a throw in
 * (`THROW` in drag-deck.tsx). Pass 0 for a spring that starts from rest,
 * which is what everything but a release does.
 */
function springOf(params: Params, travel = 0): SpringSpec {
	const velocity =
		travel === 0 ? 0 : -(params.velocity * 1000) / Math.abs(travel);
	return {
		stiffness: params.stiffness,
		damping: params.damping,
		...(velocity === 0 ? {} : { velocity }),
	};
}

/**
 * The spring's progress at `t`, pinned to 1 once it has settled, the way
 * Motion snaps a value to its target when it comes to rest. A spring the
 * preview cut short is never pinned: its last frame is wherever it was.
 */
function springProgress(t: number, spec: SpringSpec): number {
	const settle = springSettle(spec);
	return settle.settled && t >= settle.ms ? 1 : springAt(t, spec);
}

const CUT_SHORT =
	"Cut short at 5 s: this spring has not settled. The last frame is not its rest.";

/**
 * `bounded` is for the one spring the deck puts a clock on: `snapBack`
 * runs inside `settle()` in drag-deck.tsx, which gives up after
 * `SETTLE_TIMEOUT_MS`. The remove tilt rides the same spring mid-drag with
 * nothing waiting on it, so it has no such ceiling.
 */
function springCaveat(spec: SpringSpec, bounded = false): string | null {
	const settle = springSettle(spec);
	if (!settle.settled) return CUT_SHORT;
	return bounded ? settleCaveat(settle.ms) : null;
}

type Label = {
	readonly text: string;
	readonly side: "start" | "end";
	readonly opacity: number;
	readonly scale: number;
};

export type GhostFrame = {
	readonly x: number;
	readonly y: number;
	readonly rotate: number;
	readonly scale: number;
	readonly opacity: number;
	readonly border: "line" | "link" | "destructive";
	readonly label: Label | null;
};

type GhostScene = Omit<Scene<GhostFrame>, "Render">;

const REST: GhostFrame = {
	x: 0,
	y: 0,
	rotate: 0,
	scale: 1,
	opacity: 1,
	border: "line",
	label: null,
};

const REMOVE: Label = {
	text: "Remove",
	side: "end",
	opacity: 1,
	scale: 1,
};

/* --------------------------------------------------------------- scenes */

/** Where a free drag was let go: past the pile, up and to the right. */
const DROP = { x: 140, y: -60 };
/**
 * How far the ghost has to travel home. The release velocity points back
 * along this vector, so both axes carry the same velocity per unit of
 * their own travel and one spring serves for both.
 */
const DROP_TRAVEL = Math.hypot(DROP.x, DROP.y);

const snapBack: GhostScene = {
	key: "snap-back",
	title: "Snap back",
	source: "drag-deck.tsx · snapBack · SPRING",
	where: "playground",
	knobs: ["stiffness", "damping", "velocity"],
	length: (params) => springLength(springOf(params, DROP_TRAVEL)),
	caveat: (params) => springCaveat(springOf(params, DROP_TRAVEL), true),
	frame: (t, params) => {
		const p = springProgress(t, springOf(params, DROP_TRAVEL));
		return {
			...REST,
			x: mix(DROP.x, 0, p),
			y: mix(DROP.y, 0, p),
			border: "link",
		};
	},
};

/** Over the remove zone the ghost is already off to the left. */
const OVER_REMOVE = { x: -150, y: -30 };

const tilt: GhostScene = {
	key: "tilt",
	title: "Tilt over remove",
	source: "drag-deck.tsx · frameMove · overRemove",
	where: "playground",
	/* the zone is crossed mid-drag, not released into: no velocity knob */
	knobs: ["stiffness", "damping"],
	length: (params) => springLength(springOf(params)),
	caveat: (params) => springCaveat(springOf(params)),
	frame: (t, params) => ({
		...REST,
		x: OVER_REMOVE.x,
		y: OVER_REMOVE.y,
		rotate: mix(0, TILT_MAX, springProgress(t, springOf(params))),
		border: "link",
	}),
};

/**
 * An armed Remove past the commit line. While armed the lean follows the
 * pointer, so at this offset the ghost is already tilted a little.
 */
const ARMED_REMOVE = { x: -100, rotate: leanFor(-100) };

const flyAway: GhostScene = {
	key: "fly-away",
	title: "Fly away",
	source: "drag-deck.tsx · flyAway",
	where: "playground",
	knobs: [],
	length: () => FLY_TRAVEL.ms,
	frame: (t) => ({
		...REST,
		x: mix(
			ARMED_REMOVE.x,
			ARMED_REMOVE.x - FLY_DISTANCE,
			progressOf(FLY_TRAVEL, t),
		),
		rotate: mix(
			ARMED_REMOVE.rotate,
			FLY_ROTATE_TO,
			progressOf(FLY_ROTATE, t),
		),
		opacity: mix(1, 0, progressOf(FLY_FADE, t)),
		border: "destructive",
		label: REMOVE,
	}),
};

/**
 * The arm label appears when the gesture arms, and firms up past commit.
 * A preview beat: how long it is merely armed before the pointer crosses
 * the commit line.
 */
const COMMIT_AT = 350;

const armLabel: GhostScene = {
	key: "arm-label",
	title: "Arm label",
	source: "drag-deck.tsx · armLabel · pastCommit",
	where: "playground",
	knobs: [],
	length: () => COMMIT_AT + ARM_LABEL.ms,
	frame: (t) => {
		const enter = progressOf(ARM_LABEL, t);
		const commit = progressOf(ARM_LABEL, t, COMMIT_AT);
		return {
			...REST,
			x: -40,
			rotate: leanFor(-40),
			border: "destructive",
			label: {
				...REMOVE,
				opacity: mix(
					mix(ARM_LABEL_FROM.opacity, ARM_LABEL_ARMED.opacity, enter),
					ARM_LABEL_COMMITTED.opacity,
					commit,
				),
				scale: mix(
					mix(ARM_LABEL_FROM.scale, ARM_LABEL_ARMED.scale, enter),
					ARM_LABEL_COMMITTED.scale,
					commit,
				),
			},
		};
	},
};

/* --------------------------------------------------------------- render */

const BORDER: Record<GhostFrame["border"], string> = {
	line: "var(--line-strong)",
	link: "var(--link)",
	destructive: "var(--destructive)",
};

function Ghost({ frame }: { readonly frame: GhostFrame }) {
	const label = frame.label;
	return (
		<div className="relative h-[13rem] overflow-hidden rounded-[0.7rem] bg-canvas">
			<div
				aria-hidden="true"
				className="absolute inset-y-3 start-3 w-[3.5rem] rounded-[1.1rem] border border-dashed border-destructive/50 bg-destructive/5"
			/>
			<div
				data-ghost
				className="absolute top-[2.25rem] start-[calc(50%-7rem)] flex h-[9rem] w-[14rem] flex-col overflow-hidden rounded-[0.9rem] border bg-paper"
				style={{
					transformOrigin: "50% 100%",
					transform: `translate(${frame.x.toFixed(2)}px, ${frame.y.toFixed(2)}px) rotate(${frame.rotate.toFixed(3)}deg) scale(${frame.scale.toFixed(4)})`,
					opacity: frame.opacity,
					borderColor: BORDER[frame.border],
				}}
			>
				<span className="flex h-[2.5rem] w-full shrink-0 items-center justify-between gap-4 px-4">
					<span className="truncate font-serif text-[1rem] text-ink">
						{NOTE?.tail.form}
					</span>
					<span className="shrink-0 text-[0.72rem] text-ink-muted">
						{NOTE?.tail.gloss}
					</span>
				</span>
				<div className="space-y-1.5 px-4 text-[0.85rem] leading-relaxed text-ink-soft">
					{NOTE?.lines.slice(0, 2).map((line) => (
						<p key={line}>{line}</p>
					))}
				</div>
				{label ? (
					<div
						className={`absolute top-3 rounded-md border bg-paper px-2 py-0.5 font-mono text-[0.62rem] font-bold tracking-[0.12em] uppercase ${label.side === "end" ? "end-3 border-destructive text-destructive" : "start-3 border-link text-link"}`}
						style={{
							opacity: label.opacity,
							transform: `scale(${label.scale.toFixed(4)})`,
						}}
					>
						{label.text}
					</div>
				) : null}
			</div>
		</div>
	);
}

const withGhost = (spec: GhostScene) =>
	scene<GhostFrame>({ ...spec, Render: Ghost });

export const DRAG: SceneGroup = {
	key: "drag",
	title: "Drag",
	scenes: [snapBack, tilt, flyAway, armLabel].map(withGhost),
};
