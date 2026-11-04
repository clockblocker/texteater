import type { ReactNode } from "react";
import type { VariantProps } from "./deck-cards";
import { readKnobs, type VariantKey } from "./knobs";
import { StackVariant } from "./stack";
import { SwipeVariant } from "./swipe";
import { TableVariant } from "./table";
import { WalletVariant } from "./wallet";
import { WholeVariant } from "./whole";

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

/** The variants the page offers, in the spec's order. */
export const VARIANTS: readonly VariantEntry[] = [
	{
		key: "stack",
		name: "A · Stack",
		summary:
			"The Deck stays put; only the touched Card comes up and leans as you carry it. Inline-start or down past the threshold, or a flick, sweeps the Deck after it; inline-end or up opens the Card. Over the rest of the Deck is always back.",
		render: (common, stored) => (
			<StackVariant {...common} knobs={readKnobs("stack", stored)} />
		),
	},
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
		key: "wallet",
		name: "C · Wallet",
		summary:
			"Up opens, down puts away, as Apple Wallet does. Pulling a Card up scrubs it into the Cover and a release past p completes it; pulling down takes the whole stack with the hand; sideways a Card only rubber-bands, and a flick sweeps. Nothing leans.",
		render: (common, stored) => (
			<WalletVariant {...common} knobs={readKnobs("wallet", stored)} />
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
	{
		key: "whole",
		name: "E · Whole Deck",
		summary:
			"A plain drag moves the whole Deck as one sheet; inline-start or down past the line, or a flick, sweeps it. Press and hold a Card to take it alone: it swells while the hold counts down, then carries as in B, targets included.",
		render: (common, stored) => (
			<WholeVariant {...common} knobs={readKnobs("whole", stored)} />
		),
	},
];

export function variantEntry(key: VariantKey): VariantEntry {
	return (
		VARIANTS.find((entry) => entry.key === key) ??
		(VARIANTS[0] as VariantEntry)
	);
}
