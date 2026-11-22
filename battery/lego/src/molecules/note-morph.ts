import type * as React from "react";

/**
 * Declarative Card -> Sheet morph contract for Note presentations.
 *
 * `progress` is a continuous scalar in `[0, 1]`:
 * - `0` is Card form (tight rhythm, compact typography, space-aware blocks)
 * - `1` is Sheet form (comfortable reading measure, generous section spacing)
 *
 * Every Note molecule reads `--note-morph` from its enclosing `NoteSurface`
 * so Card and Sheet share one DOM tree and morph synchronously without
 * engine coupling.
 */

export type NoteSurfaceMode = "card" | "sheet";

/**
 * How section labels and dividers behave across the Card -> Sheet morph.
 *
 * - `reveal`: no rules in Card; uppercase section labels glide open in Sheet.
 * - `hairline`: subtle solid hairline dividers in Card dissolve into uppercase
 *   section labels in Sheet.
 * - `compact-label`: quiet micro-labels stay visible in Card and scale/brighten
 *   cleanly into Sheet.
 */
export type NoteSectionChrome = "reveal" | "hairline" | "compact-label";

export const DEFAULT_NOTE_SECTION_CHROME: NoteSectionChrome = "reveal";

export const NOTE_SECTION_CHROMES: readonly {
	readonly id: NoteSectionChrome;
	readonly label: string;
	readonly summary: string;
}[] = [
	{
		id: "reveal",
		label: "Reveal labels",
		summary: "No dividers in Card; labels smoothly reveal in Sheet.",
	},
	{
		id: "hairline",
		label: "Hairline → label",
		summary: "Subtle hairline rules in Card dissolve into labels in Sheet.",
	},
	{
		id: "compact-label",
		label: "Always-visible",
		summary: "Compact labels stay visible and scale cleanly into Sheet.",
	},
];

export type MorphRange = {
	readonly card: number;
	readonly sheet: number;
};

/**
 * Declarative numeric endpoints for every spatial and typographic token that
 * morphs between Card (`0`) and Sheet (`1`). CSS rules in `styles.css` match
 * these exact values so JS measurements and CSS layout always agree.
 */
export const NOTE_MORPH_TOKENS = {
	framePaddingInlineRem: { card: 0.875, sheet: 2.5 },
	framePaddingTopRem: { card: 0.875, sheet: 3.5 },
	framePaddingBottomRem: { card: 0.875, sheet: 3.5 },
	sectionFirstTopRem: { card: 0, sheet: 1.5 },
	sectionGapRem: { card: 1, sheet: 2.25 },
	tagsMarginTopRem: { card: 0.75, sheet: 2.5 },
	bodyFontRem: { card: 0.875, sheet: 1 },
	asideFontRem: { card: 0.75, sheet: 0.875 },
	ipaFontRem: { card: 0.8125, sheet: 0.9375 },
	quoteIndentRem: { card: 0.875, sheet: 1.75 },
	listGapTightRem: { card: 0.25, sheet: 0.375 },
	listGapRem: { card: 0.375, sheet: 0.5 },
	listGapLooseRem: { card: 0.5, sheet: 0.75 },
	translationLabelColumnRem: { card: 1.5, sheet: 1.75 },
	translationRowGapRem: { card: 0.25, sheet: 0.375 },
} as const satisfies Record<string, MorphRange>;

/** Clamps a morph progress scalar into `[0, 1]`. */
export function clampMorph(value: number): number {
	if (!Number.isFinite(value)) return 1;
	return Math.max(0, Math.min(1, value));
}

/** Resting morph progress for a surface mode (`card` = 0, `sheet` = 1). */
export function morphForMode(mode: NoteSurfaceMode): number {
	return mode === "card" ? 0 : 1;
}

/** Linearly interpolates a `MorphRange` at `progress` in `[0, 1]`. */
export function interpolateMorph(range: MorphRange, progress: number): number {
	const t = clampMorph(progress);
	return range.card + (range.sheet - range.card) * t;
}

/** CSS custom properties driving a `NoteSurface` at `progress` in `[0, 1]`. */
export function noteMorphStyle(
	progress: number,
): React.CSSProperties & { readonly "--note-morph": string } {
	return {
		"--note-morph": clampMorph(progress).toString(),
	};
}
