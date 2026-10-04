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

/** A Locution's Kind is the UD part of speech the whole acts as (ADR 0039). */
function locution(kind: Dumling.Kind, examples: string): KindDefinition {
	return {
		definition: `A Locution, a Lemma with two or more Heads, that acts as \`${kind}\`: ${examples}. It inflects like a Lexeme \`${kind}\`, narrowed to what the Locution varies.`,
		family: "Locution",
		kind,
	};
}

/**
 * The universal Kinds in page order, each with the short definition its
 * `/u/` index page shows. Lexeme and Locution Kinds are UD parts of speech,
 * so a Kind is named with its Family.
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
	locution("ADJ", "`fix und fertig`"),
	locution("ADV", "`zum Teil`, `ganz und gar`"),
	locution("INTJ", "`Herzlichen Dank`, `guten Morgen`"),
	locution("NOUN", "`weißer Rabe`, `blinder Passagier`"),
	locution("VERB", "`den Faden verlieren`, `eine Entscheidung treffen`"),
	locution("ADP", "`in Bezug auf`, `von … an`"),
	locution("CCONJ", "`entweder … oder`"),
	locution("DET", "`was für ein`"),
	locution("NUM", "`zwölf bis sechzehn`"),
	locution("PRON", "`was für einer`"),
	locution("SCONJ", "`so dass`, `als ob`"),
	{
		definition:
			"A complete saying: a Proverb (`Morgenstund hat Gold im Mund`) or a Winged Word (`Sein oder Nichtsein`). Its Canonical Form is written as a sentence without final punctuation.",
		family: "Saying",
		kind: "Saying",
	},
	{
		definition:
			"Material from another language inside the text: a word (`whatever`) or a phrase fixed in its source language (`by the way`), with its source language as `sourceLang`. It has one Surface, its Canonical Form, and one Reading with no Emoji Description.",
		family: "Foreign",
		kind: "Foreign",
	},
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
			"`spelling` says whether a Surface uses its Lemma's standard spelling (Canonical) or another spelling of it that is no mistake (Variant). A Variant names every tag that applies: Licensed by a current standard (zwo, British colour), Historical under an earlier standard (daß), Regional (nit), and Expressive, with letters stretched for effect (ohhh). Tags combine, as in Swiss Strasse, Licensed and Regional, but never Licensed with Historical.",
		path: "surface/spelling",
		title: "spelling",
	},
};

/**
 * Feature Pool features Dumling defines itself rather than take from
 * Universal Dependencies, so the universal feature table gives them no UD
 * link.
 */
export const dumlingOwnFeatures: ReadonlySet<string> = new Set([
	"article",
	"comparable",
	"expletive",
	"future",
	"hasSepPrefix",
	"lexicallyReflexive",
	"participleForm",
	"passive",
	"perfect",
	"phrasal",
	"sourceLang",
]);
