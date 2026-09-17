import { deckFor } from "../../deck-models/dummy";
import {
	BAR_ENTER,
	BAR_EXIT,
	CARD_TITLE_REM,
	CLIP_FADE,
	CONTEXT_ITEM,
	HEADER_REM,
	KIND_LABEL,
	KIND_LABEL_Y,
	SHEET_HEADER_REM,
	SHEET_TITLE_REM,
} from "../../deck-models/motion-spec";
import { MORPH_MS, morphProgress, progressOf } from "../motion";
import { mix, type SceneGroup, scene } from "../scene";

/**
 * NOTE & BLOCKS — the smaller motions inside and around a Compass Note,
 * each on its own so it can be judged apart from the box morph it usually
 * runs under. All in `deck-models/drag-deck.tsx`: the Heading Block, the
 * Source Contexts Block, the Pane bar above a Sheet. The Note itself
 * neither fades in nor out: it is dealt whole and swept whole.
 *
 * Every duration, curve and distance below comes from
 * `deck-models/motion-spec.ts`, which `drag-deck.tsx` reads too. The only
 * numbers a scene owns are the stage's own geometry and the beats that
 * exist so a preview has something to show — both marked where they are.
 */

const NOTE = deckFor("noch")[0];

/** The preview's root font size: every rem in the spec is drawn at this. */
const PX = 16;

function Stage({ children }: { readonly children: React.ReactNode }) {
	return (
		<div className="relative flex h-[13rem] items-center justify-center overflow-hidden rounded-[0.7rem] bg-canvas px-6">
			{children}
		</div>
	);
}

/* ------------------------------------------------------- heading grows */

const HEADING = {
	card: HEADER_REM * PX,
	sheet: SHEET_HEADER_REM * PX,
	cardType: CARD_TITLE_REM * PX,
	sheetType: SHEET_TITLE_REM * PX,
};

export type HeadingFrame = {
	readonly height: number;
	readonly fontSize: number;
	readonly kind: number;
	readonly kindY: number;
};

const headingGrows = scene<HeadingFrame>({
	key: "heading-grows",
	title: "Heading grows",
	source: "drag-deck.tsx · HeadingBlock · animate height / fontSize · MORPH",
	where: "playground",
	knobs: [],
	length: () => MORPH_MS,
	frame: (t) => {
		const p = morphProgress(t);
		const k = progressOf(KIND_LABEL, t);
		return {
			height: mix(HEADING.card, HEADING.sheet, p),
			fontSize: mix(HEADING.cardType, HEADING.sheetType, p),
			kind: k,
			kindY: mix(KIND_LABEL_Y, 0, k),
		};
	},
	Render: ({ frame }) => (
		<Stage>
			<div
				data-heading
				className="relative flex w-[20rem] items-end gap-4 rounded-[0.9rem] border border-line-strong bg-paper px-4 pb-2"
				style={{ height: frame.height }}
			>
				<span
					className="pointer-events-none absolute top-3 left-4 font-mono text-[0.62rem] font-bold tracking-[0.12em] text-ink-muted uppercase"
					style={{
						opacity: frame.kind,
						transform: `translateY(${frame.kindY.toFixed(2)}px)`,
					}}
				>
					{NOTE?.kind}
				</span>
				<span
					className="min-w-0 flex-1 truncate font-serif leading-tight text-ink"
					style={{ fontSize: frame.fontSize }}
				>
					{NOTE?.tail.form}
				</span>
				<span className="shrink-0 pb-[0.15rem] text-[0.72rem] text-ink-muted">
					{NOTE?.tail.gloss}
				</span>
			</div>
		</Stage>
	),
});

/* --------------------------------------------------------- clip lifts */

export type FadeFrame = { readonly fade: number };

const clipLifts = scene<FadeFrame>({
	key: "clip-lifts",
	title: "Clip fade lifts",
	source: "drag-deck.tsx · NoteView · clip gradient · animate opacity",
	where: "playground",
	knobs: [],
	length: () => CLIP_FADE.ms,
	frame: (t) => ({ fade: 1 - progressOf(CLIP_FADE, t) }),
	Render: ({ frame }) => (
		<Stage>
			<div className="relative h-[8rem] w-[20rem] overflow-hidden rounded-[0.9rem] border border-line-strong bg-paper">
				<div className="space-y-1.5 px-4 pt-3 text-[0.85rem] leading-relaxed text-ink-soft">
					{NOTE?.lines.slice(0, 5).map((line) => (
						<p key={line}>{line}</p>
					))}
				</div>
				<div
					aria-hidden="true"
					className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-paper to-transparent"
					style={{ opacity: frame.fade }}
				/>
			</div>
		</Stage>
	),
});

/* --------------------------------------------------- contexts unfold */

/**
 * The one stand-in in the workbench. A Source Context wraps, so the
 * prototype animates its height to `auto` and only the DOM knows the
 * target; this is one line at the shipped type size, so the preview has a
 * distance to travel. The duration and curve are the shipped ones.
 */
const ITEM_HEIGHT = 22;
const PAGE = 3;

export type ContextsFrame = {
	/** Each arriving item's height and opacity. */
	readonly items: readonly {
		readonly height: number;
		readonly opacity: number;
	}[];
};

const contextsUnfold = scene<ContextsFrame>({
	key: "contexts-unfold",
	title: "Source Contexts unfold",
	source: "drag-deck.tsx · ContextsBlock · AnimatePresence · height auto",
	where: "playground",
	knobs: [],
	length: () => CONTEXT_ITEM.ms,
	frame: (t) => {
		const p = progressOf(CONTEXT_ITEM, t);
		return {
			items: Array.from({ length: PAGE }, () => ({
				height: mix(0, ITEM_HEIGHT, p),
				opacity: p,
			})),
		};
	},
	Render: ({ frame }) => (
		<Stage>
			<div className="w-[20rem] rounded-[0.9rem] border border-line-strong bg-paper px-4 py-3">
				<div className="mb-1 flex items-baseline justify-between font-mono text-[0.58rem] font-bold tracking-[0.12em] text-ink-muted uppercase">
					<span>Source contexts</span>
					<span>{NOTE?.contexts.length}</span>
				</div>
				<ul className="flex flex-col gap-0.5 text-[0.8rem] leading-relaxed text-ink-soft">
					{NOTE?.contexts.slice(0, 2).map((line) => (
						<li key={line} className="truncate">
							{line}
						</li>
					))}
					{frame.items.map((item, index) => (
						<li
							key={NOTE?.contexts[2 + index] ?? index.toString()}
							className="truncate overflow-hidden"
							style={{
								height: item.height,
								opacity: item.opacity,
							}}
						>
							{NOTE?.contexts[2 + index]}
						</li>
					))}
				</ul>
			</div>
		</Stage>
	),
});

/* ---------------------------------------------------------- pane bar */

/** A preview beat: how long the bar sits before the Sheet closes. */
const BAR_HOLD_UNTIL = 700;

export type BarFrame = { readonly opacity: number };

const paneBar = scene<BarFrame>({
	key: "pane-bar",
	title: "Pane bar",
	source: "drag-deck.tsx · renderPane · data-pane-bar · AnimatePresence",
	where: "playground",
	knobs: [],
	length: () => BAR_HOLD_UNTIL + BAR_EXIT.ms,
	frame: (t) => ({
		opacity: mix(
			progressOf(BAR_ENTER, t),
			0,
			progressOf(BAR_EXIT, t, BAR_HOLD_UNTIL),
		),
	}),
	Render: ({ frame }) => (
		<Stage>
			<div className="relative h-[8rem] w-[20rem] overflow-hidden rounded-[0.9rem] border border-line bg-paper">
				<div
					data-pane-bar
					className="flex h-9 items-center gap-2 ps-2 pe-3 font-mono text-[0.62rem] tracking-[0.08em] text-ink-muted uppercase"
					style={{ opacity: frame.opacity }}
				>
					<span className="grid h-7 min-w-7 place-items-center rounded-md px-1.5 font-sans text-[0.9rem] text-link normal-case">
						←
					</span>
					<span>Text</span>
					<span aria-hidden="true">›</span>
					<span className="text-ink">
						{NOTE?.kind} · {NOTE?.title}
					</span>
				</div>
				<div className="absolute inset-x-6 top-13 bottom-0 rounded-t-[0.9rem] border border-b-0 border-line-strong" />
			</div>
		</Stage>
	),
});

/* --------------------------------------------------------------- group */

export const NOTE_GROUP: SceneGroup = {
	key: "note",
	title: "Note & blocks",
	scenes: [headingGrows, clipLifts, contextsUnfold, paneBar],
};

export { NOTE_GROUP as NOTE };
