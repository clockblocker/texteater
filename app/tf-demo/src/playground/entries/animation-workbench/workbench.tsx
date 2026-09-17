import { useEffect, useState } from "react";

import type { EntryRoute } from "../../playground-router";
import { entryFor, neighbour } from "./catalog";
import { CatalogView } from "./catalog-view";
import { Stage } from "./stage";

/**
 * ANIMATION WORKBENCH — every animation in tf-demo, frozen at any instant.
 *
 * Two pages, and the URL says which. `/playground/animation-workbench` is
 * the score: every animation on one millisecond axis, so durations are
 * comparable by eye. `/animation-workbench/<key>` is the stage: that one
 * animation, fitted to the screen, with the clock and its knobs in a panel
 * you can put away.
 *
 * The clock owns `t` and nothing else. Every specimen is a pure function of
 * it (`scenes/` for shipped motion, `swap.ts` for the deck tap), drawn with
 * inline styles and no CSS transitions, so scrub, step and play all show
 * the same frame for the same timestamp. The keyframes in the panel are
 * derived from that very function (`keyframes.ts`), never declared.
 *
 * The Swap's spec is the one the live deck reads
 * (`deck-models/swap-pulse.ts`), so a tuned pulse is carried over by
 * changing that file's `SWAP`.
 */
export function AnimationWorkbench({ route }: { route: EntryRoute }) {
	/** The panel outlives navigation: put it away once, it stays away. */
	const [panelOpen, setPanelOpen] = useState(false);

	const requested = route.segments[0];
	const entry = entryFor(requested);

	// An unknown key is not an animation; the score is the one place to
	// start from, so it canonicalises there.
	useEffect(() => {
		if (requested !== undefined && !entryFor(requested)) {
			route.setSegments([], { replace: true });
		}
	}, [requested, route]);

	if (!entry) {
		return <CatalogView onOpen={(key) => route.setSegments([key])} />;
	}

	return (
		<Stage
			entry={entry}
			nav={{
				onBack: () => route.setSegments([]),
				onGo: (step) => {
					const next = neighbour(entry.key, step);
					if (next) route.setSegments([next.key]);
				},
				panelOpen,
				onPanelOpenChange: setPanelOpen,
			}}
		/>
	);
}
