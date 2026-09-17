import { deckFor } from "../../deck-models/dummy";
import {
	CSS_EASE,
	cubicBezier,
	MORPH_CAVEAT,
	MORPH_MS,
	MOTION_EASE_IN_OUT,
	morphProgress,
} from "../motion";
import { mix, type Scene, type SceneGroup, scene, segment } from "../scene";

/**
 * SHEET & DIALOG — a Note changing form, and the app's Dialog. In the
 * Compass prototype a Note is one element in every form (ADR 0006): its
 * box (left, top, width, height) rides the `MORPH` spring from the deck
 * slot to the Pane's Sheet box and back, or into the hand, and its Heading
 * grows and shrinks with it. The Dialog is tw-animate keyframes in
 * `battery/lego/src/atoms/dialog.tsx`.
 */

const NOTE = deckFor("noch")[0];

/* ------------------------------------------------------------- morph */

type Box = {
	readonly left: number;
	readonly top: number;
	readonly width: number;
	readonly height: number;
};

function mixBox(a: Box, b: Box, p: number): Box {
	return {
		left: mix(a.left, b.left, p),
		top: mix(a.top, b.top, p),
		width: mix(a.width, b.width, p),
		height: mix(a.height, b.height, p),
	};
}

/*
 * The stage: a 24 × 13 rem Pane at 16 px. The Pane bar is 2.25 rem; the
 * Sheet box is the Pane under it, inset 1.5 rem × 1 rem. The deck slot is
 * a small Card at the lower right; the hand is where an Open ↑ let go.
 */
const STAGE = { width: 384, height: 208 };
const BAR = 36;
const SHEET_BOX: Box = {
	left: 24,
	top: BAR + 16,
	width: STAGE.width - 48,
	height: STAGE.height - BAR - 32,
};
const SLOT: Box = { left: 232, top: 100, width: 128, height: 92 };
const HAND: Box = { ...SLOT, top: SLOT.top - 64 };
const LIFTED: Box = { left: 120, top: 70, width: 128, height: 92 };

/** The Heading row: 2.75 rem and 1 rem type as a Card, 4.25 rem and 1.5 rem as a Sheet. */
const HEADING = { card: 44, sheet: 68, cardType: 16, sheetType: 24 };
const KIND_MS = 160;
const FADE_MS = 200;
const LONG_PRESS_MS = 500;
const LINEAR = cubicBezier(0, 0, 1, 1);

export type MorphFrame = {
	readonly box: Box;
	readonly scale: number;
	/** `transform-origin`, the pressed corner while holding. */
	readonly origin: string;
	readonly border: "line" | "link";
	readonly heading: {
		readonly height: number;
		readonly fontSize: number;
		/** The kind label above the title: Sheet only. */
		readonly kind: number;
		readonly kindY: number;
	};
	/** The Card's clip gradient; a Sheet lifts it. */
	readonly fade: number;
	/** The Pane bar's opacity. */
	readonly bar: number;
};

type MorphScene = Omit<Scene<MorphFrame>, "Render">;

const morphCaveat = () => MORPH_CAVEAT;

/** The Heading and clip at `toSheet` progress `p`, the kind label at tween `k`. */
function blocks(p: number, k: number, fade: number) {
	return {
		heading: {
			height: mix(HEADING.card, HEADING.sheet, p),
			fontSize: mix(HEADING.cardType, HEADING.sheetType, p),
			kind: k,
			kindY: mix(4, 0, k),
		},
		fade,
	};
}

const BAR_DELAY_MS = 180;
const BAR_MS = 160;

const grow: MorphScene = {
	key: "note-grows",
	where: "playground",
	title: "Card grows into a Sheet",
	source: "drag-deck.tsx · growFromHand · NoteView box effect · MORPH",
	knobs: [],
	length: () => Math.max(MORPH_MS, BAR_DELAY_MS + BAR_MS),
	caveat: morphCaveat,
	frame: (t) => {
		const p = morphProgress(t);
		const k = segment(t, 0, KIND_MS, MOTION_EASE_IN_OUT);
		return {
			box: mixBox(HAND, SHEET_BOX, p),
			scale: mix(1.05, 1, p),
			origin: "50% 50%",
			border: "link",
			...blocks(p, k, 1 - segment(t, 0, FADE_MS, MOTION_EASE_IN_OUT)),
			bar: segment(t, BAR_DELAY_MS, BAR_MS, MOTION_EASE_IN_OUT),
		};
	},
};

const BAR_EXIT_MS = 100;

const collapse: MorphScene = {
	key: "sheet-collapses",
	where: "playground",
	title: "Sheet shrinks to a Card",
	source: "drag-deck.tsx · collapseSheet · NoteView box effect · MORPH",
	knobs: [],
	length: () => MORPH_MS,
	caveat: morphCaveat,
	frame: (t) => {
		const p = morphProgress(t);
		const k = segment(t, 0, KIND_MS, MOTION_EASE_IN_OUT);
		return {
			box: mixBox(SHEET_BOX, SLOT, p),
			scale: 1,
			origin: "50% 50%",
			border: "line",
			...blocks(1 - p, 1 - k, segment(t, 0, FADE_MS, MOTION_EASE_IN_OUT)),
			bar: 1 - segment(t, 0, BAR_EXIT_MS, MOTION_EASE_IN_OUT),
		};
	},
};

const lift: MorphScene = {
	key: "sheet-lifts",
	where: "playground",
	title: "Sheet lifts into the hand",
	source: "drag-deck.tsx · liftSheet · Drag.origin · MORPH",
	knobs: [],
	length: () => MORPH_MS,
	caveat: morphCaveat,
	frame: (t) => {
		const p = morphProgress(t);
		const k = segment(t, 0, KIND_MS, MOTION_EASE_IN_OUT);
		return {
			box: mixBox(SHEET_BOX, LIFTED, p),
			scale: 1,
			origin: "50% 100%",
			border: "link",
			...blocks(1 - p, 1 - k, segment(t, 0, FADE_MS, MOTION_EASE_IN_OUT)),
			bar: 1 - segment(t, 0, BAR_EXIT_MS, MOTION_EASE_IN_OUT),
		};
	},
};

const hold: MorphScene = {
	key: "sheet-hold",
	where: "playground",
	title: "Sheet held",
	source: "drag-deck.tsx · NoteView · holding · LONG_PRESS_MS",
	knobs: [],
	length: () => LONG_PRESS_MS,
	frame: (t) => {
		const p = segment(t, 0, LONG_PRESS_MS, LINEAR);
		return {
			box: SHEET_BOX,
			scale: mix(1, 0.95, p),
			origin: "84% 88%",
			border: p > 0 ? "link" : "line",
			...blocks(1, 1, 0),
			bar: 1,
		};
	},
};

function NoteStage({ frame }: { readonly frame: MorphFrame }) {
	const { box, heading } = frame;
	return (
		<div className="relative flex h-[13rem] justify-center overflow-hidden rounded-[0.7rem] bg-canvas">
			<div
				className="relative bg-paper"
				style={{ width: STAGE.width, height: STAGE.height }}
			>
				{/* the Pane bar */}
				<div
					aria-hidden="true"
					className="absolute inset-x-0 top-0 flex items-center gap-2 ps-2 font-mono text-[0.62rem] tracking-[0.08em] text-ink-muted uppercase"
					style={{ height: BAR, opacity: frame.bar }}
				>
					<span className="text-link">←</span>
					<span>Text</span>
					<span>›</span>
					<span className="text-ink">{NOTE?.kind}</span>
				</div>
				{/* the deck slot the Card came from */}
				<div
					aria-hidden="true"
					className="absolute rounded-[0.9rem] border border-dashed border-line"
					style={SLOT}
				/>
				<article
					data-note
					className="absolute flex flex-col overflow-hidden rounded-[0.9rem] border bg-paper"
					style={{
						left: box.left,
						top: box.top,
						width: box.width,
						height: box.height,
						transform: `scale(${frame.scale.toFixed(4)})`,
						transformOrigin: frame.origin,
						borderColor:
							frame.border === "link"
								? "var(--link)"
								: "var(--line-strong)",
					}}
				>
					<div
						className="relative flex w-full shrink-0 items-end gap-3 px-3 pb-1.5"
						style={{ height: heading.height }}
					>
						<span
							className="pointer-events-none absolute top-2 left-3 font-mono text-[0.58rem] font-bold tracking-[0.12em] text-ink-muted uppercase"
							style={{
								opacity: heading.kind,
								transform: `translateY(${heading.kindY.toFixed(2)}px)`,
							}}
						>
							{NOTE?.kind}
						</span>
						<span
							className="min-w-0 flex-1 truncate font-serif leading-tight text-ink"
							style={{ fontSize: heading.fontSize }}
						>
							{NOTE?.tail.form}
						</span>
						<span className="shrink-0 text-[0.65rem] text-ink-muted">
							{NOTE?.tail.gloss}
						</span>
					</div>
					<div className="relative min-h-0 flex-1 overflow-hidden">
						<div className="space-y-1 px-3 text-[0.75rem] leading-relaxed text-ink-soft">
							{NOTE?.lines.slice(0, 4).map((line) => (
								<p key={line}>{line}</p>
							))}
						</div>
						<div
							aria-hidden="true"
							className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-paper to-transparent"
							style={{ opacity: frame.fade }}
						/>
					</div>
				</article>
			</div>
		</div>
	);
}

/* --------------------------------------------------------------- dialog */

export type PanelFrame = {
	readonly scrim: number;
	readonly opacity: number;
	readonly scale: number;
};

type PanelScene = Omit<Scene<PanelFrame>, "Render">;

const DIALOG_MS = 100;

const dialog: PanelScene = {
	key: "dialog",
	where: "main app",
	title: "Dialog",
	source: "lego/atoms/dialog.tsx · animate-in fade-in-0 zoom-in-95 duration-100",
	knobs: [],
	length: () => DIALOG_MS,
	frame: (t) => {
		const p = segment(t, 0, DIALOG_MS, CSS_EASE);
		return {
			scrim: p,
			opacity: p,
			scale: mix(0.95, 1, p),
		};
	},
};

function DialogPanel({ frame }: { readonly frame: PanelFrame }) {
	return (
		<div className="relative h-[13rem] overflow-hidden rounded-[0.7rem] bg-canvas">
			<p className="px-5 pt-4 text-[0.85rem] leading-relaxed text-ink-soft">
				Nur der Wind kannte noch den Weg hinein.
			</p>
			<div
				aria-hidden="true"
				className="absolute inset-0 bg-scrim/60"
				style={{ opacity: frame.scrim }}
			/>
			<div
				data-panel
				className="absolute top-1/2 left-1/2 w-[15rem] rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10"
				style={{
					opacity: frame.opacity,
					transform: `translate(-50%, -50%) scale(${frame.scale.toFixed(4)})`,
				}}
			>
				<p className="font-medium">Forget this word?</p>
				<p className="mt-1 text-[0.8rem] text-ink-muted">
					Its history stays on the Text.
				</p>
			</div>
		</div>
	);
}

/* --------------------------------------------------------------- group */

export const SHEET: SceneGroup = {
	key: "sheet",
	title: "Sheet & dialog",
	scenes: [
		...[grow, collapse, lift, hold].map((spec) =>
			scene<MorphFrame>({ ...spec, Render: NoteStage }),
		),
		scene<PanelFrame>({ ...dialog, Render: DialogPanel }),
	],
};
