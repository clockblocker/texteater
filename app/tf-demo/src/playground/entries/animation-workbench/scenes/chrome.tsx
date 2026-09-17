import { LibraryIcon, SettingsIcon, TextIcon } from "lucide-react";

import { cubicBezier, TW_EASE_IN_OUT, TW_EASE_OUT } from "../motion";
import { colorMix, mix, type SceneGroup, scene, segment } from "../scene";

/**
 * CHROME — the app frame's small motions: a Library card pressed, the
 * sidebar collapsing to icons, a spinner, a checkbox pressed and checked,
 * a switch toggled. All CSS transitions in `views/` and `lego/atoms`.
 */

const LINEAR = cubicBezier(0, 0, 1, 1);

function Stage({ children }: { readonly children: React.ReactNode }) {
	return (
		<div className="relative flex h-[13rem] items-center justify-center overflow-hidden rounded-[0.7rem] bg-canvas px-6">
			{children}
		</div>
	);
}

/* --------------------------------------------------------- library card */

const PRESS_MS = 150;
const HOLD_UNTIL = 300;

export type PressFrame = {
	readonly scale: number;
	/** 0 resting, 1 hovered or pressed. */
	readonly wash: number;
	/** The arrow's hover nudge, px. */
	readonly arrow: number;
};

const libraryPress = scene<PressFrame>({
	key: "library-press",
	title: "Library card pressed",
	source: "views/library-view.tsx · active:scale-[0.96] · group-hover:translate-x-0.5",
	where: "main app",
	knobs: [],
	length: () => HOLD_UNTIL + PRESS_MS,
	frame: (t) => {
		const press = segment(t, 0, PRESS_MS, TW_EASE_OUT);
		const release = segment(t, HOLD_UNTIL, PRESS_MS, TW_EASE_OUT);
		return {
			scale: mix(mix(1, 0.96, press), 1, release),
			wash: segment(t, 0, PRESS_MS, TW_EASE_OUT),
			arrow: mix(0, 2, segment(t, 0, PRESS_MS, TW_EASE_IN_OUT)),
		};
	},
	Render: ({ frame }) => (
		<Stage>
			<div
				data-card
				className="w-[16rem] rounded-xl p-4 text-start ring-1 ring-foreground/10"
				style={{
					transform: `scale(${frame.scale.toFixed(4)})`,
					backgroundColor: colorMix(
						"var(--card)",
						"color-mix(in oklab, var(--muted) 60%, transparent)",
						frame.wash,
					),
				}}
			>
				<div className="flex items-start justify-between gap-4">
					<div className="flex min-w-0 flex-col gap-2">
						<p className="line-clamp-2 text-base leading-relaxed font-medium text-ink">
							Das Haus steht am Ende der Straße.
						</p>
						<p className="text-xs text-ink-muted tabular-nums">
							Added 12 Sep 2026
						</p>
					</div>
					<span
						aria-hidden="true"
						className="mt-1 text-ink-muted"
						style={{
							transform: `translateX(${frame.arrow.toFixed(2)}px)`,
						}}
					>
						→
					</span>
				</div>
			</div>
		</Stage>
	),
});

/* -------------------------------------------------------------- sidebar */

const SIDEBAR_MS = 200;
const SIDEBAR_REM = 16;
const SIDEBAR_ICON_REM = 3;

export type SidebarFrame = {
	readonly width: number;
	readonly labelOpacity: number;
	/** The group label's margin-top, rem. */
	readonly labelMargin: number;
};

const ITEMS = [
	{ icon: TextIcon, label: "Texts" },
	{ icon: LibraryIcon, label: "Library" },
	{ icon: SettingsIcon, label: "Settings" },
] as const;

const sidebarCollapse = scene<SidebarFrame>({
	key: "sidebar-collapse",
	title: "Sidebar collapses",
	source: "lego/atoms/sidebar.tsx · collapsible=icon · transition-[width] ease-linear",
	where: "main app",
	knobs: [],
	length: () => SIDEBAR_MS,
	frame: (t) => {
		const p = segment(t, 0, SIDEBAR_MS, LINEAR);
		return {
			width: mix(SIDEBAR_REM, SIDEBAR_ICON_REM, p),
			labelOpacity: mix(1, 0, p),
			labelMargin: mix(0, -2, p),
		};
	},
	Render: ({ frame }) => (
		<div className="relative flex h-[13rem] overflow-hidden rounded-[0.7rem] bg-paper">
			<div
				data-sidebar
				className="flex h-full shrink-0 flex-col overflow-hidden bg-sidebar p-2"
				style={{ width: `${frame.width.toFixed(3)}rem` }}
			>
				<div
					className="flex h-8 shrink-0 items-center px-2 text-xs font-medium whitespace-nowrap text-sidebar-foreground/70"
					style={{
						opacity: frame.labelOpacity,
						marginTop: `${frame.labelMargin.toFixed(3)}rem`,
					}}
				>
					Reading
				</div>
				{ITEMS.map(({ icon: Icon, label }) => (
					<div
						key={label}
						className="flex h-8 items-center gap-2 rounded-md p-2 text-sm whitespace-nowrap text-sidebar-foreground"
					>
						<Icon className="size-4 shrink-0" />
						<span>{label}</span>
					</div>
				))}
			</div>
			<div className="flex-1 border-s border-line" />
		</div>
	),
});

/* -------------------------------------------------------------- spinner */

const SPIN_MS = 1000;

export type SpinFrame = {
	readonly rotate: number;
};

const spinner = scene<SpinFrame>({
	key: "spinner",
	title: "Spinner",
	source: "renderers/* · LoaderCircleIcon animate-spin",
	where: "main app",
	knobs: [],
	length: () => SPIN_MS,
	frame: (t) => ({ rotate: 360 * segment(t, 0, SPIN_MS, LINEAR) }),
	Render: ({ frame }) => (
		<Stage>
			<svg
				aria-hidden="true"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth={2}
				strokeLinecap="round"
				strokeLinejoin="round"
				className="size-8 text-ink-muted"
				style={{ transform: `rotate(${frame.rotate.toFixed(2)}deg)` }}
			>
				<path d="M21 12a9 9 0 1 1-6.219-8.56" />
			</svg>
		</Stage>
	),
});

/* ------------------------------------------------------------- checkbox */

export type CheckFrame = {
	readonly scale: number;
	/** 0 unchecked, 1 checked. */
	readonly checked: number;
};

const checkboxPress = scene<CheckFrame>({
	key: "checkbox-press",
	title: "Checkbox pressed",
	source: "lego/atoms/checkbox.tsx · active:scale-[0.92] · data-checked",
	where: "main app",
	knobs: [],
	length: () => HOLD_UNTIL + PRESS_MS,
	frame: (t) => {
		const press = segment(t, 0, PRESS_MS, TW_EASE_OUT);
		const release = segment(t, HOLD_UNTIL, PRESS_MS, TW_EASE_OUT);
		return {
			scale: mix(mix(1, 0.92, press), 1, release),
			checked: release,
		};
	},
	Render: ({ frame }) => (
		<Stage>
			<span className="flex items-center gap-3 text-sm text-ink">
				<span
					data-checkbox
					className="relative flex size-4 shrink-0 items-center justify-center rounded-[4px] border"
					style={{
						transform: `scale(${frame.scale.toFixed(4)})`,
						borderColor: colorMix(
							"var(--input)",
							"var(--primary)",
							frame.checked,
						),
						backgroundColor: colorMix(
							"var(--background)",
							"var(--primary)",
							frame.checked,
						),
					}}
				>
					<svg
						aria-hidden="true"
						viewBox="0 0 24 24"
						fill="none"
						stroke="var(--primary-foreground)"
						strokeWidth={3}
						strokeLinecap="round"
						strokeLinejoin="round"
						className="size-3"
						style={{ opacity: frame.checked > 0.5 ? 1 : 0 }}
					>
						<path d="M20 6 9 17l-5-5" />
					</svg>
				</span>
				Show the gloss
			</span>
		</Stage>
	),
});

/* --------------------------------------------------------------- switch */

const SWITCH_MS = 150;
/** The thumb is 16 px; `translate-x-[calc(100%-2px)]`. */
const THUMB_TRAVEL = 14;

export type SwitchFrame = {
	readonly thumb: number;
	readonly on: number;
};

const switchToggle = scene<SwitchFrame>({
	key: "switch-toggle",
	title: "Switch toggled",
	source: "lego/atoms/switch.tsx · transition-transform · data-checked",
	where: "main app",
	knobs: [],
	length: () => SWITCH_MS,
	frame: (t) => {
		const p = segment(t, 0, SWITCH_MS, TW_EASE_IN_OUT);
		return { thumb: mix(0, THUMB_TRAVEL, p), on: p };
	},
	Render: ({ frame }) => (
		<Stage>
			<span className="flex items-center gap-3 text-sm text-ink">
				<span
					data-switch
					className="relative inline-flex h-[18.4px] w-[32px] shrink-0 items-center rounded-full border border-transparent px-px"
					style={{
						backgroundColor: colorMix(
							"var(--input)",
							"var(--primary)",
							frame.on,
						),
					}}
				>
					<span
						className="block size-4 rounded-full bg-background"
						style={{
							transform: `translateX(${frame.thumb.toFixed(2)}px)`,
						}}
					/>
				</span>
				Always play animations
			</span>
		</Stage>
	),
});

/* --------------------------------------------------------------- group */

export const CHROME: SceneGroup = {
	key: "chrome",
	title: "Chrome",
	scenes: [
		libraryPress,
		sidebarCollapse,
		spinner,
		checkboxPress,
		switchToggle,
	],
};
