import type {
	ReducedMotion,
	TimeScale,
} from "../deck-interactions/settings-atoms";
import type { MorphFeel } from "./timing";

/** The inspector's state: the open's feel, the box's containment and the page's motion. */
export type Settings = {
	readonly move: MorphFeel["move"]["kind"];
	readonly stiffness: number;
	readonly damping: number;
	/** The tween's length. */
	readonly ms: number;
	readonly parts: MorphFeel["parts"];
	readonly stagger: number;
	readonly clock: MorphFeel["clock"];
	readonly start: MorphFeel["start"];
	readonly snap: boolean;
	readonly crossing: MorphFeel["crossing"];
	/** `contain: layout paint` on the box, as the real Note has. */
	readonly contain: boolean;
	readonly reducedMotion: ReducedMotion;
	readonly timeScale: TimeScale;
	readonly rtl: boolean;
};

/**
 * The open that measured solid (#1311): tf-demo's MORPH spring (380/38,
 * ζ 0.97, no overshoot a pixel could show), the parts on the box's own
 * progress, a clock that starts once the change of form has been painted,
 * every moving value on whole device pixels, and the lines sliding over
 * the Source contexts where they cross. The Cover-only parts
 * keep CardsExample's 75 ms between them; the box is contained, as the
 * real Note is.
 */
export const DEFAULT_SETTINGS: Settings = {
	move: "spring",
	stiffness: 380,
	damping: 38,
	ms: 400,
	parts: "with",
	stagger: 75,
	clock: "box",
	start: "painted",
	snap: true,
	crossing: "over",
	contain: true,
	reducedMotion: "off",
	timeScale: 1,
	rtl: false,
};

/**
 * The knobs' steps. The springs are react-flip-toolkit's gentle (120/14,
 * the first default, which overshot by 7%), noWobble (200/26) and stiff
 * (260/26), tf-demo's MORPH (380/38) and a critically damped spring with
 * a 0.3 s response (439/42).
 */
export const STEPS = {
	stiffness: [120, 200, 260, 380, 439],
	damping: [14, 20, 26, 38, 42],
	ms: [250, 400, 600],
	stagger: [0, 50, 75, 150],
} as const;

export function feelOf(settings: Settings): MorphFeel {
	return {
		move:
			settings.move === "spring"
				? {
						kind: "spring",
						stiffness: settings.stiffness,
						damping: settings.damping,
					}
				: { kind: "tween", ms: settings.ms },
		parts: settings.parts,
		stagger: settings.stagger,
		clock: settings.clock,
		start: settings.start,
		snap: settings.snap,
		crossing: settings.crossing,
	};
}
