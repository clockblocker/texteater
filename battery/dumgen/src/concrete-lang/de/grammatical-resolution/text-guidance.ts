// Guidance for the text-generation follow-up. Grammar is already judged when
// this runs, so each snippet says only how to spell the requested text.

export const textSystemPrompt =
	"Supply exactly the requested missing German text fields. All grammatical judgments and target membership are fixed and are not restated here; never emit bounded labels, add attested members, modernize a licensed variant, or use a different identity.";

export const canonicalFormGuidance: Readonly<Record<string, string>> = {
	VERB: "Canonical Form is the lexical infinitive with required reflexive/prefix material (besaß -> besitzen, stand auf -> aufstehen, handelt sich -> sich handeln), never the whole auxiliary chain. Governed prepositions stay out of the headword: es geht um -> gehen, erinnert sich an -> sich erinnern. A subject expletive keeps the ordinary verb Lemma: geben for es gibt/es gab/gibt es, regnen for es regnet; never prefix a headword with es. Lowercase.",
	NOUN: "Canonical Form is the bare nominative singular dictionary headword with noun capitalization and without its article: Bücher -> Buch, des Mannes -> Mann, dem Nachbarn -> Nachbar. A plural-only noun keeps its plural headword (Eltern, Ferien, Leute); an invariant plural is spelled like its singular (Knie).",
	PROPN: "Canonical Form is the registered name with its capitalization, internal capitals, brand styling and name-internal punctuation, minus any contextual genitive suffix or apostrophe.",
	ADJ: "Canonical Form is the uninflected positive base, preserving irregular paradigms (besser/beste -> gut, höher -> hoch, näher -> nah). An adjectival participle stays participial (geschlossene -> geschlossen), not a verbal infinitive.",
	ADV: "Canonical Form is the positive base: lieber -> gern, öfter -> oft. Whole multi-member correlators keep only supplied anchors, with dictionary open-slot notation where conventional.",
	PRON: "Canonical Form retains the reviewed case-bearing form; do not reduce to a nominative or possessive stem. Preserve formal capitalization Sie/Ihnen/Ihrer; lowercase ordinary sentence-initial capitalization.",
	DET: "Canonical Form keeps exact article spelling (der, die, das are separate headwords). Inflected welcher/mancher keep their full citation form. Comparative mehr is its own headword; weniger -> wenig; meisten -> meist; selben after a fused article -> derselbe. Formal Ihr stays uppercase.",
	NUM: "Canonical Form is the modern numeral in the source representation (digit stays digit, word stays word); preserve Roman/abbreviation casing and lowercase ordinary initial capitalization.",
	SYM: "Canonical Form is the glyph identity in conventional Unicode presentation, never a word expansion or translation.",
	X: "Canonical Form is the defensible base of the residual identity, an infinitive for an inflected nonce verb; never invent an expansion or translate source-language material.",
	ADP: "Canonical Form of a circumposition names the whole fixed unit in conventional open-slot notation.",
	CCONJ: "Canonical Form of a correlator uses conventional open-slot notation such as entweder … oder or je … desto.",
	SCONJ: "Canonical Form is the conventional dictionary form of the whole identity, such as um zu, ohne zu, statt zu, so … dass.",
	PART: "Canonical Form preserves the particle identity in its conventional dictionary spelling.",
	INTJ: "Canonical Form is the settled dictionary spelling without expressive lengthening or reduplication.",
	Idiom: "Canonical Form is the settled complete lexical inventory in dictionary order, retaining obligatory reflexives and fixed function words with German noun capitals; omit free-valency placeholders such as jemandem/etwas when they are not fixed lexical members.",
	Collocation:
		"Canonical Form names the established complete component inventory in dictionary order.",
	DiscourseFormula:
		"Canonical Form is lowercase complete current wording including nouns, joined by single spaces without punctuation.",
	Proverb:
		"Canonical Form is the complete current conventional wording, single-space joined, with initial/noun capitalization and no punctuation.",
	Aphorism:
		"Canonical Form is the complete current conventional wording in lexical order, single-space joined, with initial/noun capitalization and no punctuation.",
};

/**
 * One prompt per Kind: the occurrence's words in, its Canonical Form out.
 *
 * The input deliberately omits the sentence, since the route already fixes
 * the Kind. If a real case needs context to pick the headword (a
 * sentence-initial Sie or Die, say), add the marked sentence back to the
 * input rather than working around it in the prompt.
 */
export function canonicalFormPrompt(kind: string): string {
	return `The input is one German ${kind} as written in a sentence, its words separated by spaces. Reply with its Canonical Form and nothing else: no quotes, no explanation. ${canonicalFormGuidance[kind] ?? "Canonical Form is the exact dictionary headword."}`;
}

export const normalizedMemberGuidance =
	"A normalized member keeps the occurrence morphology, position and casing rules of the source member; correct only the judged typo. A licensed noun suspension completes the one trailing-hyphen member with the literal shared suffix of the binary right conjunct. Lowercase ordinary sentence-initial capitalization; preserve formal Sie forms and noun capitals.";
