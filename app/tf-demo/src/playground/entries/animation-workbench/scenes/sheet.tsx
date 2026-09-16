import { deckFor } from "../../deck-models/dummy";
import { CSS_EASE, cubicBezier, MOTION_EASE_IN_OUT } from "../motion";
import { mix, type Scene, type SceneGroup, scene, segment } from "../scene";

/**
 * SHEET & DIALOG — surfaces that come and go. The Compass Sheet is a Motion
 * tween in `deck-models/drag-deck.tsx`; the Dialog is tw-animate keyframes
 * in `battery/lego/src/atoms/dialog.tsx`, used by the app's confirm dialog.
 */

const NOTE = deckFor("noch")[0];

/* ------------------------------------------------------ compass sheet */

export type SheetFrame = {
	readonly opacity: number;
	readonly scale: number;
	/** `transform-origin`, set to the pressed corner while holding. */
	readonly origin: string;
	readonly border: "line" | "link";
};

type SheetScene = Omit<Scene<SheetFrame>, "Render">;

const SHEET_MS = 160;
const LONG_PRESS_MS = 500;
const LINEAR = cubicBezier(0, 0, 1, 1);

const sheetEnter: SheetScene = {
	key: "sheet-enter",
	where: "playground",
	title: "Sheet enters",
	blurb: "A Card opens as a Sheet: it fades in and grows from 0.98 in 160 ms, Motion's default ease-in-out.",
	source: "drag-deck.tsx · SheetView · initial/animate",
	knobs: [],
	length: () => SHEET_MS,
	frame: (t) => {
		const p = segment(t, 0, SHEET_MS, MOTION_EASE_IN_OUT);
		return {
			opacity: mix(0, 1, p),
			scale: mix(0.98, 1, p),
			origin: "50% 50%",
			border: "line",
		};
	},
};

const sheetExit: SheetScene = {
	key: "sheet-exit",
	where: "playground",
	title: "Sheet leaves",
	blurb: "The Sheet collapses back to a Card, or is dismissed: the enter, run backwards, in 160 ms.",
	source: "drag-deck.tsx · SheetView · exit",
	knobs: [],
	length: () => SHEET_MS,
	frame: (t) => {
		const p = segment(t, 0, SHEET_MS, MOTION_EASE_IN_OUT);
		return {
			opacity: mix(1, 0, p),
			scale: mix(1, 0.98, p),
			origin: "50% 50%",
			border: "line",
		};
	},
};

const sheetHold: SheetScene = {
	key: "sheet-hold",
	where: "playground",
	title: "Sheet held",
	blurb: "A long press on the Sheet's margin: it shrinks toward the pressed corner and its edge turns link-blue over the 500 ms it takes to lift. Letting go early snaps it back in 160 ms.",
	source: "drag-deck.tsx · SheetView · holding",
	knobs: [],
	length: () => LONG_PRESS_MS,
	frame: (t) => {
		const p = segment(t, 0, LONG_PRESS_MS, LINEAR);
		return {
			opacity: 1,
			scale: mix(1, 0.95, p),
			origin: "84% 88%",
			border: p > 0 ? "link" : "line",
		};
	},
};

function CompassSheet({ frame }: { readonly frame: SheetFrame }) {
	return (
		<div className="relative h-[13rem] overflow-hidden rounded-[0.7rem] bg-canvas">
			<section
				data-sheet
				className="absolute inset-x-6 inset-y-4 flex flex-col overflow-hidden rounded-[0.9rem] border bg-paper"
				style={{
					opacity: frame.opacity,
					transform: `scale(${frame.scale.toFixed(4)})`,
					transformOrigin: frame.origin,
					borderColor:
						frame.border === "link"
							? "var(--link)"
							: "var(--line-strong)",
				}}
			>
				<header className="flex h-8 shrink-0 items-center gap-2 border-b border-line ps-3 pe-3 text-[0.8rem] text-ink-muted">
					<span aria-hidden="true">←</span>
					<span className="font-serif text-[0.95rem] text-ink">
						{NOTE?.title}
					</span>
				</header>
				<div className="space-y-1.5 px-4 py-3 text-[0.85rem] leading-relaxed text-ink-soft">
					{NOTE?.lines.slice(0, 3).map((line) => (
						<p key={line}>{line}</p>
					))}
				</div>
			</section>
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
	blurb: "A Dialog opens: scrim and panel fade in together, the panel zooming from 0.95, in 100 ms on the browser's `ease`.",
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
	blurb: "Surfaces coming and going: the Compass Sheet's Motion tweens, and the app's Dialog on CSS.",
	scenes: [
		...[sheetEnter, sheetExit, sheetHold].map((spec) =>
			scene<SheetFrame>({ ...spec, Render: CompassSheet }),
		),
		scene<PanelFrame>({ ...dialog, Render: DialogPanel }),
	],
};
