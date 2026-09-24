import type { DeckInteraction } from "../deck-models/interaction-policy";
import { SNAP_BACK_MODELS } from "../deck-models/motion-spec";
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
const release = ["commitDistance", "throwVelocity"] as const;

/**
 * One preset per snap-back model the Deck does not run. The baseline is
 * `under`; `lifted` is what the prototype had before it, and is here to
 * show what was wrong. The model is an index into `SNAP_BACK_MODELS`,
 * which is what the "Snap-back model" knob writes too.
 */
const snapBackPresets: readonly Preset[] = [
	{
		key: "lifted",
		name: "lifted — waits for the gesture to tear down (the old one)",
		motion: { snapBackModel: SNAP_BACK_MODELS.indexOf("lifted") },
	},
	{
		key: "land",
		name: "land — rejoins it on arrival",
		motion: { snapBackModel: SNAP_BACK_MODELS.indexOf("land") },
	},
	{
		key: "quick",
		name: "quick — arrival, on a 200 ms tween",
		motion: { snapBackModel: SNAP_BACK_MODELS.indexOf("quick") },
	},
	{
		key: "setdown",
		name: "setdown — arrival, and the lift is visible",
		motion: { snapBackModel: SNAP_BACK_MODELS.indexOf("setdown") },
	},
];

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
					"Drag a card left: the whole deck follows the finger and turns red past the commit distance. Release there and the whole deck goes, there is no per-card removal. Pull well up, down or back right and the card tears loose: the deck springs back and the card is a plain drag. Try a short fast throw and a slow release to compare the distance and velocity thresholds.",
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
					"Drag a card in any direction and release, or press Escape while dragging. Watch the moment the deck closes over the card: the snap-back model decides whether that is an arrival or a change of z a fifth of a second later.",
				source,
				initialScene: "deck",
				knobs: ["snapBackModel", "snapLandPx", ...spring, ...release],
				presets: snapBackPresets,
			},
			{
				key: "drop-zones",
				interactions: ["drag", "drop", "collapse"],
				title: "Free drag / drop zones",
				instruction:
					"Drag a card and hold briefly to enter free drag. The middle of the pane opens it as a Cover and shows a translucent one; outside the middle, the nearest edge spawns a Pane and the Panes move aside for a preview of it, at once. The ghost is the drop region. Only the drop itself morphs.",
				source,
				initialScene: "deck",
				knobs: [
					...spring,
					...morph,
					"armReleaseMs",
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
					"Drag a card upward and release to open it as a Cover; the deck beneath is hidden, not ended. Use the back arrow to collapse it and reveal the deck again. Watch the body and clipping arrive with the sheet.",
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
