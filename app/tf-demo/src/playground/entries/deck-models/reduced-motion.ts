import { useReducedMotion } from "motion/react";

import { useMotionPreference } from "@/lib/motion-preference";

/**
 * Whether the deck should hold still.
 *
 * The app-level `prefers-reduced-motion` block in `index.css` cannot reach
 * any of the deck's motion: every bit of it is Motion driving a motion
 * value, and CSS can only shorten CSS transitions and animations. The
 * `MotionConfig` around `CompassModel` covers the declarative `animate`
 * props; this covers the rest, which is the imperative `animate()` calls —
 * `MotionConfig`'s setting is context for components, and the standalone
 * `animate()` never reads it.
 *
 * "Ignore" is the app's own "Always play animations" switch, so a reader
 * who has asked for motion anyway still gets it.
 */
export function useDeckReducedMotion(): boolean {
	const { preference } = useMotionPreference();
	const system = useReducedMotion();
	return preference !== "ignore" && system === true;
}
