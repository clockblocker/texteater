import { reflexiveMarker } from "dumcorpus/inventories";

/**
 * A Reading's lexical reflexive, read from its accumulated Valency Patterns
 * and its 🪞 marker (ADR 0052): whether it is Required (`🪞` Reading, present
 * in every pattern) or Optional (non-`🪞` Reading with a reflexive pattern),
 * the case German names for it (`erinnern` 🪞🧠 takes Acc, `vorstellen`
 * 'imagine' Dat), and any preposition it follows (`außer` in `außer sich
 * sein`). The server projects it beside every Reading a Note names, and the
 * Citation presenter prints it.
 */
export type ReflexiveSlot = {
	readonly status: "Required" | "Optional";
	readonly governedCase: "Acc" | "Dat" | null;
	/** The preposition's Canonical Form the reflexive follows, if any. */
	readonly preposition: string | null;
};

type PatternComplement = {
	readonly kind: string;
	readonly governedCase?: string;
	readonly preposition?: { readonly canonicalForm: string };
};

type ValencyPatternLike = readonly PatternComplement[];

/**
 * The Reading's Reflexive Slot from its accumulated Valency Patterns, or
 * null when no pattern carries a Reflexive complement.
 */
export function reflexiveSlotOf(
	valency: readonly ValencyPatternLike[] | undefined,
	emojiDescription?: string,
): ReflexiveSlot | null {
	const patterns = valency ?? [];
	for (const pattern of patterns) {
		for (const complement of pattern) {
			if (complement.kind === "Reflexive") {
				const required =
					emojiDescription !== undefined
						? emojiDescription.startsWith(reflexiveMarker)
						: patterns.every((entry) =>
								entry.some((item) => item.kind === "Reflexive"),
							);
				return {
					status: required ? "Required" : "Optional",
					governedCase:
						complement.governedCase === "Acc" ||
						complement.governedCase === "Dat"
							? complement.governedCase
							: null,
					preposition: complement.preposition?.canonicalForm ?? null,
				};
			}
		}
	}
	return null;
}
