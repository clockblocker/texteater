/**
 * What German `segment.inConstituents` asks about a single word
 * (`constituents.ts`): the analysis question and its `none`, the guides
 * that close a word part's route question, and a hyphenated compound's
 * front phrase's headword candidates and guide. Their examples are no
 * Breakdown case (#693).
 */
import type { WordAnalysis } from "./word-analyses.js";

/**
 * The analysis question (#1241 round 1): read the sense `meaning` names,
 * since a homograph splits by sense; know the prefix + noun or adjective +
 * citation ending shape; and keep to parts that are words. Its examples
 * are no Breakdown case (#693).
 */
export const analysisInstructions =
	"How was `word` built, one level down, in the sense `meaning` names? `meaning` is an emoji for this Reading's sense, and one spelling can split differently by sense (Staubecken: Stau + becken, a reservoir; Staub + ecken, dusty corners), so pick the analysis whose parts together give that sense, even when another analysis gives a commoner word. Pick its immediate parts as a dictionary's word formation (DWDS Wortzerlegung) splits it: a compound's first word and its head, which may be a compound itself (Sommer + schlussverkauf); a prefix or verb particle and its base verb (ver- + brennen, since brennen is a verb); a base and a suffix (Heiz + -ung). Check the base after a verb's prefix: when it is no verb a dictionary lists on its own, the verb was made from the noun or adjective inside it, so pick the prefix, that noun or adjective and the citation ending (vergolden is ver- + gold + -en, since there is no verb golden). Every part that isn't an affix must be a word a dictionary lists, though it may show the word without a final -e, with an umlaut or as a verb's stem (Schwimm for schwimmen): never pick an analysis with a part that is no word at all. The one exception is a cranberry piece, a noun's first part that is no word but lives on only in this word, before a head that is a word (Schorn + stein). Pick `none` for a word with no word inside, or one converted whole from another word with nothing cut off (Schlag from schlagen).";

/**
 * Closes a compound part's route question (#1241 round 1): a first part
 * showing a verb's stem is that verb (`Wach` in Wachstube 💂 is wachen,
 * DWDS).
 */
export const compoundRouteGuide =
	"A part that shows a verb's stem without its ending is that verb (Schwimm in Schwimmbad is schwimmen, Bohr in Bohrmaschine is bohren).";

/**
 * Closes the base's route question in a prefix + base + citation ending
 * analysis (#1241 round 1): the verb was made from that base.
 */
export const prefixedBaseRouteGuide =
	"This verb was made from a noun or adjective with a prefix and the citation ending, so the part between them is that noun or adjective, not a verb.";

/**
 * Closes a verb's first part's route question (#1280): it is a word also
 * written apart, mostly an adjective or a noun, and a verb only as a whole
 * infinitive, never as a stem (`weh` in wehtun is ADJ weh, DWDS, not wehen).
 */
export const verbFirstPartRouteGuide =
	"In a verb, the part before the verb at its end is a word also written on its own, usually an adjective (fest in festhalten, voll in volltanken) or a noun (Teil in teilnehmen). It is a verb only when it shows a whole infinitive (kennen in kennenlernen), never a bare stem.";

/**
 * Closes a hyphenated compound's front phrase's route question (#1241
 * round 4): the phrase keeps the Kind dictionaries give it on its own,
 * though in front of the head it describes it.
 */
export const phraseFrontRouteGuide =
	"Judge the phrase in front of the compound's head as the phrase it is on its own, as dictionaries list it, not by its job in front of the head: a phrase that says when, where, how or how long something happens is ADV (Hals über Kopf), even though in front of the head it describes it.";

/**
 * The route guide for an analysis's word parts: a front phrase's, a
 * compound's, a verb's first part's, a prefixed base's, or none.
 */
export function routeGuideOf(
	analysis: WordAnalysis,
	kind: string,
): string | undefined {
	if (analysis.pieces.some(({ role }) => role === "Phrase"))
		return phraseFrontRouteGuide;
	if (analysis.pieces.some(({ role }) => role === "Ending"))
		return prefixedBaseRouteGuide;
	const words = analysis.pieces.filter(({ role }) => role === "Word");
	if (words.length !== analysis.pieces.length || words.length < 2)
		return undefined;
	return kind === "VERB" ? verbFirstPartRouteGuide : compoundRouteGuide;
}

export const noneOption = "No immediate parts: a simple word, or a conversion";

const capitalizedFirst = /^\p{Lu}/u;

/**
 * Closes a front phrase's headword question: the compound capitalized its
 * first word, which a dictionary writes lower-case unless it is a noun.
 */
export const phraseFormGuide =
	"The compound capitalizes its first word whatever it is; a dictionary writes that word with a capital letter only when it is a noun.";

/**
 * A front phrase's Canonical Forms: as it stands, and opening lower-case
 * (`hin und her`), unless its first word comes back capitalized inside it,
 * which makes it a noun (`Schritt für Schritt`).
 */
export function phraseForms(reads: string): readonly string[] {
	const [first, ...rest] = reads.split(" ");
	return first !== undefined &&
		capitalizedFirst.test(first) &&
		!rest.includes(first)
		? [reads, reads.charAt(0).toLocaleLowerCase("de") + reads.slice(1)]
		: [reads];
}
