import type { DeckInteraction } from "../deck-models/interaction-policy";
import type { DeckMotionOverrides } from "../deck-models/runtime-config";

/**
 * An alternative the entry ships with, in the Version list beside the
 * baseline and whatever the reader has saved. A preset is read-only: it is
 * a position to compare against, not a draft. "Create variant" copies the
 * selected one, so tuning a preset means starting from it.
 */
export type Preset = {
	readonly key: string;
	readonly name: string;
	readonly motion: DeckMotionOverrides;
};

export type Entry = {
	readonly key: string;
	readonly interactions: readonly DeckInteraction[];
	readonly title: string;
	readonly instruction: string;
	readonly source: string;
	readonly initialScene: "empty" | "deck" | "sheet";
	readonly knobs: readonly (keyof DeckMotionOverrides)[];
	readonly presets?: readonly Preset[];
};

const source = "deck-models/drag-deck.tsx";
const spring = ["stiffness", "damping"] as const;
const morph = ["morphStiffness", "morphDamping"] as const;
const release = ["commitDistance", "throwProjectionMs", "flickSpeed"] as const;

export const SECTIONS: readonly {
	readonly title: string;
	readonly entries: readonly Entry[];
}[] = [
	{
		title: "Cards",
		entries: [
			{
				key: "swap",
				interactions: ["select", "drag"],
				title: "Tap / selection",
				instruction:
					"Tap a folded card to select it. Switch repeatedly between the top and bottom cards to inspect heading placement and the selected scale.",
				source,
				initialScene: "deck",
				knobs: ["headingEdgeMs", "openScale"],
			},
			{
				key: "deal",
				interactions: ["deal", "dismiss"],
				title: "Deal / dismiss",
				instruction:
					"Select a word to deal its cards. Click the page outside the cards and words to sweep the deck away. Select another word to replace the deck. Escape sweeps the deck.",
				source,
				initialScene: "empty",
				knobs: ["durationScale"],
			},
			{
				key: "sweep",
				interactions: ["drag", "sweep"],
				title: "Sweep / swipe left",
				instruction:
					"Drag a card left: the whole deck follows the finger and turns red past the commit distance. Release there and the whole deck goes, there is no per-card removal. Pull well up, down or back right, or carry it slowly far left, and the card tears loose: the deck springs back and the card is a plain drag. A throw left sweeps whatever it drifts through. Try a short fast throw and a slow release: a flick is read where it was heading.",
				source,
				initialScene: "deck",
				knobs: [
					...spring,
					...release,
					"tiltMax",
					"tiltPerPx",
					"deckFollow",
					"deckFollowFalloff",
					"swipeBreakPx",
					"swipeLetGoPx",
					"flyDistance",
					"flyRotateTo",
					"durationScale",
				],
			},
			{
				key: "snap-back",
				interactions: ["drag"],
				title: "Snap back / cancel",
				instruction:
					"Drag a card in any direction and release, or press Escape while dragging. The deck closes over the card at the release, so it travels home under the cards that overlap it and nothing happens on arrival.",
				source,
				initialScene: "deck",
				knobs: [...spring, ...release],
			},
			{
				key: "drop-zones",
				interactions: ["drag", "drop", "collapse"],
				title: "Free drag / drop zones",
				instruction:
					"Drag a card any way but left: it is in hand at once. The middle of the pane opens it as a Cover and shows a translucent one; outside the middle, the nearest edge spawns a Pane and the Panes move aside for a preview of it, at once. The ghost is the drop region. Only the drop itself morphs.",
				source,
				initialScene: "deck",
				knobs: [...spring, ...morph, "zoneFeedbackMs", "durationScale"],
			},
		],
	},
	{
		title: "Sheets",
		entries: [
			{
				key: "sheet-morph",
				interactions: ["drag", "expand", "collapse"],
				title: "Expand / collapse",
				instruction:
					"Drag a card upward and release to open it as a Cover; the deck beneath is hidden, not ended. Use the back arrow to collapse it and reveal the deck again. Watch the body and clipping arrive with the sheet.",
				source,
				initialScene: "deck",
				knobs: [...morph, ...release, "durationScale"],
			},
			{
				key: "sheet-lift",
				interactions: ["drag", "lift"],
				title: "Heading lift",
				instruction:
					"Drag the sheet heading to lift it into a held card. Release to return it to the deck, or cancel to restore the sheet.",
				source,
				initialScene: "sheet",
				knobs: [...spring, ...morph, "durationScale"],
			},
			{
				key: "contexts",
				interactions: ["contexts", "collapse"],
				title: "Source contexts",
				instruction:
					"In the sheet, load more source contexts to inspect their staggered arrival. Collapse the sheet to see the context list contract back to the card view.",
				source,
				initialScene: "sheet",
				knobs: [
					"contextStaggerMs",
					"contextStaggerMaxMs",
					"durationScale",
				],
			},
			{
				key: "pane-bar",
				interactions: ["follow", "collapse"],
				title: "Pane bar / sheet stack",
				instruction:
					"Follow a link inside the sheet to push another Cover in the same pane. Use the back arrow to step back through the stack: a Cover that came from a link closes, the one lifted from the deck collapses back to its card. Watch the trail change in the pane bar.",
				source,
				initialScene: "sheet",
				knobs: [...morph, "durationScale"],
			},
		],
	},
];

export const ENTRIES = SECTIONS.flatMap((section) => section.entries);
export function entryFor(key: string | undefined): Entry | null {
	return ENTRIES.find((entry) => entry.key === key) ?? null;
}
export function neighbour(key: string, step: number): Entry | null {
	const at = ENTRIES.findIndex((entry) => entry.key === key);
	if (at < 0) return null;
	return (
		ENTRIES[
			(((at + step) % ENTRIES.length) + ENTRIES.length) % ENTRIES.length
		] ?? null
	);
}
