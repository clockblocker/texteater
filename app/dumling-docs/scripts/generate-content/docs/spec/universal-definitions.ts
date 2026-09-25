import type * as Dumling from "dumling/types";
import type { EvidenceField } from "./schema-routes";

type KindDefinition = Readonly<{
	definition: string;
	family: Dumling.Family;
	kind: Dumling.Kind;
}>;

function udPos(kind: Dumling.Kind, name: string): KindDefinition {
	return {
		definition: `\`${kind}\` is the Universal Dependencies part of speech for ${name}. See the [UD definition](https://universaldependencies.org/u/pos/${kind}.html).`,
		family: "Lexeme",
		kind,
	};
}

function morpheme(kind: Dumling.Kind, definition: string): KindDefinition {
	return { definition, family: "Morpheme", kind };
}

function phraseme(kind: Dumling.Kind, definition: string): KindDefinition {
	return { definition, family: "Phraseme", kind };
}

/**
 * The universal Kinds in page order, each with the short definition its
 * `/u/` index page shows. Lexeme Kinds are UD parts of speech.
 */
export const kindDefinitions: readonly KindDefinition[] = [
	udPos("ADJ", "adjectives"),
	udPos("ADV", "adverbs"),
	udPos("INTJ", "interjections"),
	udPos("NOUN", "nouns"),
	udPos("PROPN", "proper nouns"),
	udPos("VERB", "verbs"),
	udPos("ADP", "adpositions"),
	udPos("AUX", "auxiliaries"),
	udPos("CCONJ", "coordinating conjunctions"),
	udPos("DET", "determiners"),
	udPos("NUM", "numerals"),
	udPos("PART", "particles"),
	udPos("PRON", "pronouns"),
	udPos("SCONJ", "subordinating conjunctions"),
	udPos("PUNCT", "punctuation"),
	udPos("SYM", "symbols"),
	udPos("X", "words that fit no other part of speech"),
	morpheme("Root", "The lexical core of a word."),
	morpheme("Prefix", "A bound affix before the stem."),
	morpheme("Suffix", "A bound affix after the stem."),
	morpheme(
		"Suffixoid",
		"An element that looks like a free word but works like a suffix.",
	),
	morpheme("Infix", "An affix inserted inside the stem."),
	morpheme("Circumfix", "An affix in two parts around the stem."),
	morpheme("Interfix", "A linking element between the parts of a compound."),
	morpheme(
		"Transfix",
		"A discontinuous affix interleaved with a consonantal root.",
	),
	morpheme("ToneMarking", "A tone pattern that marks a distinction."),
	morpheme("Duplifix", "An affix made by repeating part of the stem."),
	phraseme("DiscourseFormula", "A fixed conversational routine."),
	phraseme("Aphorism", "An established maxim with a known author."),
	phraseme("Proverb", "A traditional complete saying."),
	phraseme(
		"Idiom",
		"An established expression whose meaning is not the sum of its words.",
	),
	phraseme(
		"Collocation",
		"A conventional multiword expression with restricted word choice and a non-idiomatic meaning.",
	),
];

type EvidenceFieldDefinition = Readonly<{
	definition: string;
	/** The page under `feature/`: `surface/spelling`. */
	path: string;
	title: string;
}>;

/** The Surface and Attestation fields that get feature pages. */
export const evidenceFieldDefinitions: Readonly<
	Record<EvidenceField, EvidenceFieldDefinition>
> = {
	historicalStatus: {
		definition:
			"`surfaceFeatures.historicalStatus` marks a Surface whose grammar is archaic.",
		path: "surface/historical-status",
		title: "historical-status",
	},
	memberOrthography: {
		definition:
			"`members[].orthography` says how each attested member is written: Standard, Typo, Fused (one piece of a written word that holds several words) or Shorthand (a standalone shortened word).",
		path: "attestation/member-orthography",
		title: "member.orthography",
	},
	realizationCoverage: {
		definition:
			"`realizationCoverage` says whether an Attestation's members realize its whole Surface (Full) or leave fixed material out (Partial).",
		path: "attestation/realization-coverage",
		title: "realizationCoverage",
	},
	spelling: {
		definition:
			"`spelling` says whether a Surface uses its Lemma's canonical spelling or a licensed Variant spelling.",
		path: "surface/spelling",
		title: "spelling",
	},
};
