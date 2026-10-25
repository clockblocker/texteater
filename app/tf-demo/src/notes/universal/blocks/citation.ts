import {
	type ReflexiveSlot,
	reflexiveSlotOf,
} from "../../../../shared/reflexive-slot";
import type { NoteDataFor } from "../note/data";

/**
 * A Citation: how a Note prints a Reading, its Canonical Form with the
 * lexical reflexive its Valency Frame holds (ADR 0052). Each language
 * places the reflexive, so the presenter comes with its registry; a
 * renderer only joins the parts. A Lemma, a Shadow or a link target names
 * no Reading, so it shows the bare Canonical Form and needs no presenter.
 */
export type CitationPart =
	| { readonly kind: "Words"; readonly text: string }
	| {
			readonly kind: "Reflexive";
			readonly text: string;
			/** The Reading takes its reflexive or leaves it out: `(sich) ausruhen`. */
			readonly optional: boolean;
	  };

/** What a Citation is printed from: a Reading's Lemma, emoji and Reflexive Slot. */
export type CitedReading = {
	readonly lemma: { readonly canonicalForm: string };
	readonly emojiDescription?: string;
	readonly reflexive: ReflexiveSlot | null;
};

export type CitationPresenter = (
	reading: CitedReading,
) => readonly CitationPart[];

/** A Citation without a reflexive, for a language that places none yet. */
export const bareCitation: CitationPresenter = ({ lemma }) => [
	{ kind: "Words", text: lemma.canonicalForm },
];

/** One part as printed: an Optional reflexive in parentheses, `(sich)`. */
export function citationPartText(part: CitationPart): string {
	return part.kind === "Reflexive" && part.optional
		? `(${part.text})`
		: part.text;
}

/** A Citation as one run of text: `sich erinnern`, `(sich) ausruhen`. */
export function citationText(parts: readonly CitationPart[]): string {
	return parts.map(citationPartText).join(" ");
}

/** The Reading a Reading Note shows, cited by its own Valency Frame. */
export function citedNoteReading(note: {
	readonly reading: {
		readonly lemma: { readonly canonicalForm: string };
		readonly emojiDescription: string;
	};
	readonly knowledge: Pick<NoteDataFor<"Reading">["knowledge"], "valency">;
}): CitedReading {
	return {
		lemma: note.reading.lemma,
		emojiDescription: note.reading.emojiDescription,
		reflexive: reflexiveSlotOf(note.knowledge.valency),
	};
}
