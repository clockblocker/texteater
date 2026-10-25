import type { ReflexiveSlot } from "../../../shared/reflexive-slot";
import type {
	CitationPart,
	CitationPresenter,
} from "../universal/blocks/citation";

/**
 * The emoji a Reading with a Required Reflexive Slot starts with (ADR 0052).
 * Resolution writes it before Knowledge gives the Reading its frame, so it
 * stands for that Slot until the frame arrives.
 */
const REFLEXIVE_MARKER = "🪞";

/** A citation cites the third person, whose reflexive is `sich` in either case. */
const CITED_REFLEXIVE = {
	Acc: "sich",
	Dat: "sich",
} as const satisfies Record<NonNullable<ReflexiveSlot["governedCase"]>, string>;

/**
 * The German Citation of a Reading (ADR 0052), as Duden and DWDS cite it. A
 * reflexive inside a fixed phrase goes right after the first occurrence of
 * its preposition: `außer sich sein`, `zu sich kommen`, `es in sich haben`.
 * Any other goes first, or right after a leading `es`: `sich erinnern`,
 * `sich Sorgen machen`, `es sich gemütlich machen`. An Optional Reflexive
 * Slot prints as `(sich) ausruhen`. A Reading without a frame yet is read by
 * its 🪞.
 */
export const germanCitation: CitationPresenter = ({
	lemma,
	emojiDescription,
	reflexive,
}) => {
	const slot: ReflexiveSlot | null =
		reflexive ??
		(emojiDescription?.startsWith(REFLEXIVE_MARKER)
			? { status: "Required", governedCase: null, preposition: null }
			: null);
	if (!slot) return [{ kind: "Words", text: lemma.canonicalForm }];
	const words = lemma.canonicalForm.split(" ");
	const at = reflexivePosition(words, slot.preposition);
	const before = words.slice(0, at).join(" ");
	const after = words.slice(at).join(" ");
	return [
		...(before ? [{ kind: "Words", text: before } as const] : []),
		{
			kind: "Reflexive",
			text: CITED_REFLEXIVE[slot.governedCase ?? "Acc"],
			optional: slot.status === "Optional",
		},
		...(after ? [{ kind: "Words", text: after } as const] : []),
	] satisfies CitationPart[];
};

/**
 * How many of the wording's words come before `sich`: those up to its
 * preposition, or a leading `es`, or none.
 */
function reflexivePosition(
	words: readonly string[],
	preposition: string | null,
): number {
	const governor = preposition === null ? -1 : words.indexOf(preposition);
	if (governor >= 0) return governor + 1;
	return words[0] === "es" && words.length > 1 ? 1 : 0;
}
