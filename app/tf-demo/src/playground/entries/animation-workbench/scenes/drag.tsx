import { deckFor } from "../../deck-models/dummy";
import {
	MOTION_EASE_IN,
	MOTION_EASE_IN_OUT,
	type Params,
	type SpringSpec,
	springAt,
	springLength,
	springSettle,
} from "../motion";
import { mix, type Scene, type SceneGroup, scene, segment } from "../scene";

/**
 * DRAG — what the Compass Held Card does once the pointer lets go, or when
 * it crosses a zone. Shipped in `deck-models/drag-deck.tsx`: `snapBack`,
 * `flyAway`, the remove-zone tilt and the arm label. A release that opens
 * a Sheet is not here: the Note grows from the hand, in the Sheet tab.
 *
 * The Card is drawn at rest in the middle of a stage; `x` and `y` are its
 * offsets from that rest, as Motion holds them on the Note itself.
 */

const NOTE = deckFor("noch")[0];

/** The drag spring: `SPRING` in drag-deck.tsx, from the knobs. */
function springOf(params: Params): SpringSpec {
	return { stiffness: params.stiffness, damping: params.damping };
}

/**
 * The spring's progress at `t`, pinned to 1 once it has settled, the way
 * Motion snaps a value to its target when it comes to rest. A spring the
 * preview cut short is never pinned: its last frame is wherever it was.
 */
function springProgress(t: number, params: Params): number {
	const spec = springOf(params);
	const settle = springSettle(spec);
	return settle.settled && t >= settle.ms ? 1 : springAt(t, spec);
}

function springCaveat(params: Params): string | null {
	return springSettle(springOf(params)).settled
		? null
		: "Cut short at 5 s: this spring has not settled. The last frame is not its rest.";
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

const snapBack: GhostScene = {
	key: "snap-back",
	title: "Snap back",
	source: "drag-deck.tsx · snapBack · SPRING",
	where: "playground",
	knobs: ["stiffness", "damping"],
	length: (params) => springLength(springOf(params)),
	caveat: springCaveat,
	frame: (t, params) => {
		const p = springProgress(t, params);
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
	knobs: ["stiffness", "damping"],
	length: (params) => springLength(springOf(params)),
	caveat: springCaveat,
	frame: (t, params) => ({
		...REST,
		x: OVER_REMOVE.x,
		y: OVER_REMOVE.y,
		rotate: mix(0, -20, springProgress(t, params)),
		border: "link",
	}),
};

/**
 * An armed Remove past the commit line. While armed the lean follows the
 * pointer, dx / 16, so at this offset the ghost is already tilted a little.
 */
const ARMED_REMOVE = { x: -100, rotate: -100 / 16 };
const FLY_MS = 220;

const flyAway: GhostScene = {
	key: "fly-away",
	title: "Fly away",
	source: "drag-deck.tsx · flyAway",
	where: "playground",
	knobs: [],
	length: () => FLY_MS,
	frame: (t) => {
		const travel = segment(t, 0, FLY_MS, MOTION_EASE_IN);
		const rest = segment(t, 0, FLY_MS, MOTION_EASE_IN_OUT);
		return {
			...REST,
			x: mix(ARMED_REMOVE.x, ARMED_REMOVE.x - 720, travel),
			rotate: mix(ARMED_REMOVE.rotate, -28, rest),
			opacity: mix(1, 0, rest),
			border: "destructive",
			label: REMOVE,
		};
	},
};

/** The arm label appears when the gesture arms, and firms up past commit. */
const LABEL_MS = 150;
const COMMIT_AT = 350;

const armLabel: GhostScene = {
	key: "arm-label",
	title: "Arm label",
	source: "drag-deck.tsx · armLabel · pastCommit",
	where: "playground",
	knobs: [],
	length: () => COMMIT_AT + LABEL_MS,
	frame: (t) => {
		const enter = segment(t, 0, LABEL_MS, MOTION_EASE_IN_OUT);
		const commit = segment(t, COMMIT_AT, LABEL_MS, MOTION_EASE_IN_OUT);
		return {
			...REST,
			x: -40,
			rotate: -40 / 16,
			border: "destructive",
			label: {
				...REMOVE,
				opacity: mix(mix(0, 0.55, enter), 1, commit),
				scale: mix(mix(0.9, 0.96, enter), 1, commit),
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
