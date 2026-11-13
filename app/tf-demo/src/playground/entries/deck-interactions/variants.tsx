import type { ReactNode } from "react";
import type { VariantProps } from "./deck-cards";
import { readKnobs, type VariantKey } from "./knobs";
import { SwipeVariant } from "./swipe";

type Common = Omit<VariantProps<never>, "knobs">;

export type VariantEntry = {
	readonly key: VariantKey;
	readonly name: string;
	/** What the variant does, for the inspector. */
	readonly summary: string;
	readonly render: (
		common: Common,
		stored: Readonly<Record<string, unknown>> | undefined,
	) => ReactNode;
};

/** The variants the page offers, in the spec's order: D is kept; B, the Table, was retired. */
export const VARIANTS: readonly VariantEntry[] = [
	{
		key: "swipe",
		name: "D · Swipe actions",
		summary:
			"Zones are revealed under the Card, as in iOS Mail. The Card slides on one axis and uncovers red Close deck (inline-start, down), blue Open (up, and inline-end on a phone) or, on a wide screen, amber Other pane (inline-end), which opens the Card as a Cover in a stand-in Pane beside the Deck's while the Deck stays put; at the detent the colour fills and the Card resists. Past it a release commits. Toward Close deck the rest of the Deck gathers onto whichever Card is swiped, every Card keeping its place in the stack, and the whole Deck fades as one layer; a commit carries it on a short way and fades it out. The Deck never moves on hover; the Card under the pointer lights its border.",
		render: (common, stored) => (
			<SwipeVariant {...common} knobs={readKnobs("swipe", stored)} />
		),
	},
];

export function variantEntry(key: VariantKey): VariantEntry {
	return (
		VARIANTS.find((entry) => entry.key === key) ??
		(VARIANTS[0] as VariantEntry)
	);
}
