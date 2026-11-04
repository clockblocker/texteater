import type { ReactNode } from "react";
import type { VariantProps } from "./deck-cards";
import { readKnobs, type VariantKey } from "./knobs";
import { SwipeVariant } from "./swipe";
import { TableVariant } from "./table";

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

/** The variants the page offers, in the spec's order: B and D are kept. */
export const VARIANTS: readonly VariantEntry[] = [
	{
		key: "table",
		name: "B · Table",
		summary:
			"Zones are places. The Deck fans under the pointer; a picked-up Card trails the hand on a stiff spring, the Deck closes its gap, and three targets appear: the slot it left, the tray (dismiss) and the pad (open). Near a target the Card is pulled in.",
		render: (common, stored) => (
			<TableVariant {...common} knobs={readKnobs("table", stored)} />
		),
	},
	{
		key: "swipe",
		name: "D · Swipe actions",
		summary:
			"Zones are revealed under the Card, as in iOS Mail. The Card slides on one axis and uncovers red Close deck (inline-start, down) or blue Open (inline-end, up); at the detent the colour fills and the Card resists. Past it a release commits.",
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
