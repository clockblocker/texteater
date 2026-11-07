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
	/** `contain: layout paint` on the box, as the real Note has. */
	readonly contain: boolean;
	readonly reducedMotion: ReducedMotion;
	readonly timeScale: TimeScale;
	readonly rtl: boolean;
};

/**
 * react-flip-toolkit's StaggeredList: its "gentle" spring, parts that start
 * with the box (`delayUntil`), and CardsExample's 75 ms between the extras;
 * the box contained, as the real Note is.
 */
export const DEFAULT_SETTINGS: Settings = {
	move: "spring",
	stiffness: 120,
	damping: 14,
	ms: 400,
	parts: "with",
	stagger: 75,
	contain: true,
	reducedMotion: "off",
	timeScale: 1,
	rtl: false,
};

/**
 * The knobs' steps. The springs are react-flip-toolkit's gentle (120/14),
 * noWobble (200/26) and stiff (260/26) and tf-demo's MORPH (380/38).
 */
export const STEPS = {
	stiffness: [120, 200, 260, 380],
	damping: [14, 20, 26, 38],
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
	};
}
