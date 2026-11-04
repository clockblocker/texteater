import type { ReactNode } from "react";
import type { VariantProps } from "./deck-cards";
import { readKnobs, type VariantKey } from "./knobs";
import { StackVariant } from "./stack";
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
];

export function variantEntry(key: VariantKey): VariantEntry {
	return (
		VARIANTS.find((entry) => entry.key === key) ??
		(VARIANTS[0] as VariantEntry)
	);
}
