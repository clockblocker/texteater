import { deckFor } from "../../deck-models/dummy";
import {
	MOTION_EASE_IN,
	MOTION_EASE_IN_OUT,
	type Params,
	type SpringSpec,
	springAt,
	springLength,
} from "../motion";
import { mix, type Scene, type SceneGroup, scene, segment } from "../scene";

/**
 * DRAG — what the Compass ghost does once the pointer lets go, or when it
 * crosses a zone. Shipped in `deck-models/drag-deck.tsx`: `snapBack`,
 * `flyAway`, `dissolveInto`, the remove-zone tilt and the arm label.
 *
 * The ghost is drawn at rest in the middle of a stage; `x` and `y` are its
 * offsets from that rest, as Motion holds them.
 */

const NOTE = deckFor("noch")[0];

/** The drag ghost's spring: `SPRING` in drag-deck.tsx, from the knobs. */
function springOf(params: Params): SpringSpec {
	return { stiffness: params.stiffness, damping: params.damping };
}

/**
 * The spring's progress at `t`, pinned to 1 once its timeline is over, the
 * way Motion snaps a value to its target when it comes to rest.
 */
function springProgress(t: number, params: Params): number {
	const spec = springOf(params);
	return t >= springLength(spec) ? 1 : springAt(t, spec);
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
const OPEN: Label = {
	text: "Open as sheet",
	side: "start",
	opacity: 1,
	scale: 1,
};

/* --------------------------------------------------------------- scenes */

/** Where a free drag was let go: past the pile, up and to the right. */
const DROP = { x: 140, y: -60 };

const snapBack: GhostScene = {
	key: "snap-back",
	title: "Snap back",
	blurb: "A free drag let go nowhere: x, y, rotate and scale all spring home. Motion also feeds in the pointer's last velocity; here it is zero.",
	source: "drag-deck.tsx · snapBack · SPRING",
	where: "playground",
	knobs: ["stiffness", "damping"],
	length: (params) => springLength(springOf(params)),
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
	blurb: "A free drag crossing into the remove zone: the ghost springs to a 20° lean, as if swiped. Leaving the zone springs it back.",
	source: "drag-deck.tsx · frameMove · overRemove",
	where: "playground",
	knobs: ["stiffness", "damping"],
	length: (params) => springLength(springOf(params)),
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
	blurb: "Remove committed: the ghost is thrown 720 px further left with an ease-in, leans to 28°, and fades, all in 220 ms.",
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

/**
 * An armed Open past the commit line. While armed the ghost grows with the
 * pull, −dy / 800 up to 5 %, so here it starts a touch large.
 */
const ARMED_OPEN = { y: -100, scale: 1.05 };
const DISSOLVE_MS = 160;

const dissolve: GhostScene = {
	key: "dissolve",
	title: "Dissolve",
	blurb: "Open as sheet, or drop into a pane: the ghost rises 20 px, grows to 1.04 and fades in 160 ms, and the Sheet enters underneath.",
	source: "drag-deck.tsx · dissolveInto",
	where: "playground",
	knobs: [],
	length: () => DISSOLVE_MS,
	frame: (t) => {
		const p = segment(t, 0, DISSOLVE_MS, MOTION_EASE_IN_OUT);
		return {
			...REST,
			y: mix(ARMED_OPEN.y, ARMED_OPEN.y - 20, p),
			scale: mix(ARMED_OPEN.scale, 1.04, p),
			opacity: mix(1, 0, p),
			border: "link",
			label: OPEN,
		};
	},
};

/** The arm label appears when the gesture arms, and firms up past commit. */
const LABEL_MS = 150;
const COMMIT_AT = 350;

const armLabel: GhostScene = {
	key: "arm-label",
	title: "Arm label",
	blurb: "The gesture arms: its label fades in at 55 % and a hair small. At the commit line it firms up to full opacity and size.",
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
	blurb: "The Compass ghost after the pointer lets go, or as it crosses a zone. Springs are Motion's own, in closed form, so they scrub.",
	scenes: [snapBack, tilt, flyAway, dissolve, armLabel].map(withGhost),
};
