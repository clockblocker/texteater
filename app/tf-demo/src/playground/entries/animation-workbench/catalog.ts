import type { DeckInteraction } from "../deck-models/interaction-policy";
import type { DeckMotionOverrides } from "../deck-models/runtime-config";

export type Entry = {
	readonly key: string;
	readonly interactions: readonly DeckInteraction[];
	readonly title: string;
	readonly instruction: string;
	readonly source: string;
	readonly initialScene: "empty" | "deck" | "sheet";
	readonly knobs: readonly (keyof DeckMotionOverrides)[];
};

const source = "deck-models/drag-deck.tsx";
const spring = ["stiffness", "damping"] as const;
const morph = ["morphStiffness", "morphDamping"] as const;
const release = ["commitDistance", "throwVelocity"] as const;

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
					"Select a word to deal its cards. Click the page outside the cards and words to sweep the deck away. Select another word to replace the deck. Escape removes the selected card.",
				source,
				initialScene: "empty",
				knobs: ["durationScale"],
			},
			{
				key: "remove",
				interactions: ["drag", "remove"],
				title: "Remove / throw",
				instruction:
					"Drag a card left past the commit distance, then release. Try a short fast throw and a slow release to compare the distance and velocity thresholds.",
				source,
				initialScene: "deck",
				knobs: [
					...spring,
					...release,
					"tiltMax",
					"tiltPerPx",
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
					"Drag a card in any direction and release, or press Escape while dragging. Compare how the card settles back into the deck.",
				source,
				initialScene: "deck",
				knobs: [...spring, ...release],
			},
			{
				key: "drop-zones",
				interactions: ["drag", "drop", "collapse"],
				title: "Free drag / drop zones",
				instruction:
					"Drag a card and hold briefly to enter free drag. Move over the pane, its edges, the deck and the remove zone; release to open, split, return or remove. Watch the zone and card-border feedback.",
				source,
				initialScene: "deck",
				knobs: [
					...spring,
					...morph,
					"armReleaseMs",
					"edgeBand",
					"zoneFeedbackMs",
					"durationScale",
				],
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
					"Drag a card upward and release to open it as a sheet. Use the back arrow or Escape to collapse it. Watch the body, clipping and pane bar arrive with the sheet.",
				source,
				initialScene: "deck",
				knobs: [...morph, ...release, "durationScale"],
			},
			{
				key: "sheet-lift",
				interactions: ["drag", "lift"],
				title: "Heading lift / margin hold",
				instruction:
					"Drag the sheet heading to lift it into a held card. Reset, then press and hold a sheet margin: watch the shrink and blue border before it lifts. Release to return it to the deck, or cancel to restore the sheet.",
				source,
				initialScene: "sheet",
				knobs: [
					...spring,
					...morph,
					"holdMs",
					"holdScale",
					"durationScale",
				],
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
					"Follow a link inside the sheet to open another sheet in the same pane. Use the back arrow to step back through the stack, then collapse the last sheet to inspect the bar exit.",
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
