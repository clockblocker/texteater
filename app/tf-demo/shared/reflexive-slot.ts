/**
 * A Reading's lexical reflexive, read from its Valency Frame (ADR 0052): the
 * status of its Reflexive Slot and the case German names for it (`erinnern`
 * 🪞🧠 takes Acc, `vorstellen` 'imagine' Dat). English names no case. A
 * reflexive inside a fixed phrase names the preposition it follows, as
 * `außer sein` holds `außer` + Dat for `außer sich sein`. The server
 * projects it beside every Reading a Note names, and the Citation presenter
 * prints it.
 */
export type ReflexiveSlot = {
	readonly status: "Required" | "Optional";
	readonly governedCase: "Acc" | "Dat" | null;
	/** The preposition's Canonical Form the reflexive follows, if any. */
	readonly preposition: string | null;
};

type FrameSlot = {
	readonly status: "Required" | "Optional";
	readonly complements: readonly {
		readonly kind: string;
		readonly governedCase?: string;
		readonly preposition?: { readonly canonicalForm: string };
	}[];
};

/** The frame's Reflexive Slot, or null when it has none or no frame is known. */
export function reflexiveSlotOf(
	valency: readonly FrameSlot[] | undefined,
): ReflexiveSlot | null {
	for (const slot of valency ?? [])
		for (const complement of slot.complements)
			if (complement.kind === "Reflexive")
				return {
					status: slot.status,
					governedCase:
						complement.governedCase === "Acc" ||
						complement.governedCase === "Dat"
							? complement.governedCase
							: null,
					preposition: complement.preposition?.canonicalForm ?? null,
				};
	return null;
}
