import { MotionConfig } from "motion/react";

import { useMotionPreference } from "@/lib/motion-preference";
import { CompassModel } from "./deck-models/drag-deck";

/**
 * Compass: what a drag means for a deck of Cards on dummy subjects. The first
 * direction of the gesture names the intent; a held gesture relaxes into a
 * plain drag with drop zones.
 *
 * Every motion in the deck is Motion driving a motion value, so none of it
 * is reachable by the `prefers-reduced-motion` block in `index.css`, which
 * can only shorten CSS transitions and animations. `MotionConfig` is what
 * reaches it: under `user` Motion drops transforms — the 720 px fly-away,
 * the box morph, the tilt — and keeps opacity and colour, which is the
 * gentler-not-zero the guideline asks for. `never` is the app's own
 * "Always play animations", so the switch in Settings still wins.
 */
export function DeckModelsGallery() {
	const { preference } = useMotionPreference();
	return (
		<MotionConfig
			reducedMotion={preference === "ignore" ? "never" : "user"}
		>
			<CompassModel />
		</MotionConfig>
	);
}
