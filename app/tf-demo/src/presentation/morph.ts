import { HEADER_REM } from "compass";
import { clampMorph, type NoteSectionChrome, type NoteSurfaceMode } from "lego";
import type { CSSProperties } from "react";
import { coverHeadingRem, formLayout, type PresentationForm } from "./form";
import { COVER_GUTTER_REM } from "./skin";

/**
 * Declarative Card -> Sheet morph contract for Note Presentations.
 *
 * Pure data and CSS formulas only — no motion engine imports (ADR 0017).
 * Hosts (Compass Motion, Playground scrubber, or static galleries) drive
 * `--note-morph` in `[0, 1]` on the Presentation's root surface, and both
 * Heading and Body blocks read it in lockstep.
 */

export type PresentationMorphState = {
	readonly form: PresentationForm;
	readonly mode: NoteSurfaceMode;
	readonly sheet: boolean;
	/** Resting target for `form`: `0` for Card/Tail, `1` for Cover/Ground/Sheet. */
	readonly target: number;
	/** Explicit progress override when a host scrubs directly (`0..1`). */
	readonly progress: number;
	readonly sectionChrome?: NoteSectionChrome;
};

/** Resting morph target for `form`: `0` in Card forms, `1` in Sheet forms. */
export function presentationMorphTarget(form: PresentationForm): number {
	return formLayout(form).sheet ? 1 : 0;
}

/** Heading row height in rem at morph progress `t in [0, 1]`. */
export function headingHeightRemAt(progress: number, folded = false): number {
	const t = clampMorph(progress);
	const sheetHeight = coverHeadingRem(folded);
	return HEADER_REM + (sheetHeight - HEADER_REM) * t;
}

/**
 * Inline-start / inline-end gutter width for the Heading row, matching
 * `NoteFrame`'s horizontal padding (`0.875rem` Card -> `2.5rem` Cover) at
 * every point `t in [0, 1]` so the headword stays aligned with the blocks.
 */
export function headingGutterCss(): string {
	const delta = COVER_GUTTER_REM - 0.875;
	return `calc(0.875rem + ${delta.toString()}rem * var(--note-morph))`;
}

/**
 * Content column max-width for a Presentation's Heading row: matches
 * `NoteFrame`'s resting cap (`min(sheetWidth, var(--container-note))`) so
 * the headword and Body blocks stay locked on the exact same horizontal
 * rail on every frame of the morph.
 */
export function headingMaxWidthCss(columnRem: number): string {
	const sheetWidth = columnRem + 2 * (COVER_GUTTER_REM - 1);
	return `min(${sheetWidth.toString()}rem, var(--container-note))`;
}

/**
 * Declarative typography variables for `NoteTitle` inside a Presentation
 * heading bar. Folded stays at bar size (`1rem`); unfolded glides from
 * Card (`1.125rem`, `580`, `-0.02em`, `1.25`) to Sheet
 * (`clamp(1.5rem, 5.5cqi, 1.875rem)`, `600`, `-0.028em`, `1.15`).
 */
export function headingTitleStyle(folded: boolean): CSSProperties {
	if (folded) {
		return {
			"--note-title-size": "1rem",
			"--note-title-weight": "570",
			"--note-title-leading": "1.25",
			"--note-title-tracking": "-0.02em",
		} as CSSProperties;
	}
	return {
		"--note-title-size":
			"calc(1.125rem + (clamp(1.5rem, 5.5cqi, 1.875rem) - 1.125rem) * var(--note-morph))",
		"--note-title-weight": "calc(580 + 20 * var(--note-morph))",
		"--note-title-leading": "calc(1.25 - 0.1 * var(--note-morph))",
		"--note-title-tracking": "calc(-0.02em - 0.008em * var(--note-morph))",
	} as CSSProperties;
}

/** Static Cover bar typography style (used by `SheetChrome` on Pane bars). */
export function sheetChromeTitleStyle(large: boolean): CSSProperties {
	if (!large) {
		return {
			"--note-title-size": "1rem",
			"--note-title-weight": "570",
			"--note-title-leading": "1.25",
			"--note-title-tracking": "-0.02em",
		} as CSSProperties;
	}
	return {
		"--note-title-size": "clamp(1.5rem, 5.5cqi, 1.875rem)",
		"--note-title-weight": "600",
		"--note-title-leading": "1.15",
		"--note-title-tracking": "-0.028em",
	} as CSSProperties;
}

/**
 * Opacity and subtle scale expressions for Cover chrome buttons (`←`, `×`)
 * during the morph: delayed until `t = 0.55` so gutters have room and
 * chrome never collides with the headword or IPA mid-morph.
 */
export const HEADING_CHROME_OPACITY_CSS =
	"clamp(0, (var(--note-morph) - 0.55) / 0.45, 1)";
export const HEADING_CHROME_SCALE_CSS =
	"calc(0.92 + 0.08 * clamp(0, (var(--note-morph) - 0.55) / 0.45, 1))";

/** Declarative opacity for a Card's bottom clip fade across `--note-morph`. */
export const CARD_CLIP_FADE_OPACITY_CSS =
	"clamp(0, 1 - var(--note-morph) * 1.5, 1)";
