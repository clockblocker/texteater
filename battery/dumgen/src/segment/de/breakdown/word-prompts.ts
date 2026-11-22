/**
 * What German `segment.inConstituents` asks about a single word
 * (`constituents.ts`): the analysis question and its `none`, the guides
 * that close a word part's route question. Their examples are no
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
	"How was `word` built, one level down, in the sense `meaning` names? `meaning` is an emoji for this Reading's sense, and one spelling can split differently by sense (Staubecken: Stau + becken, a reservoir; Staub + ecken, dusty corners), so pick the analysis whose parts together give that sense, even when another analysis gives a commoner word. Pick its immediate parts as a dictionary's word formation (DWDS Wortzerlegung) splits it: a compound's first word and its head, which may be a compound itself (Sommer + schlussverkauf); a prefix or verb particle and its base verb (ver- + brennen, since brennen is a verb); a base and a suffix (Heiz + -ung); or in a hyphenated word, a glossed prefix option (such as e-, short for elektronisch) when it matches `meaning`. Check the base after a verb's prefix: when it is no verb a dictionary lists on its own, the verb was made from the noun or adjective inside it, so pick the prefix, that noun or adjective and the citation ending (vergolden is ver- + gold + -en, since there is no verb golden). Every part that isn't an affix must be a word a dictionary lists, though it may show the word without a final -e, with an umlaut or as a verb's stem (Schwimm for schwimmen): never pick an analysis with a part that is no word at all. The one exception is a cranberry piece, a noun's first part that is no word but lives on only in this word, before a head that is a word (Schorn + stein). An ordinary personal or family proper name (`PROPN`) is not split: pick `none` unless it is transparently built from real words. Pick `none` for a word with no word inside, or one converted whole from another word with nothing cut off (Schlag from schlagen).";

/**
 * Closes a compound part's route question (#1241 round 1): a first part
 * showing a verb's stem is that verb (`Wach` in Wachstube 💂 is wachen,
 * DWDS).
 */
export const compoundRouteGuide =
	"A first part that shows a real verb's stem is that verb (Schwimm in Schwimmbad is schwimmen, Bohr in Bohrmaschine is bohren); a noun carrying a linking -s- or -er- (like Geburts- or Kinder-) is NOUN, never a verb.";

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

/** Closes a suffix base's route question: pick from the reading's meaning. */
export const suffixBaseRouteGuide =
	"Choose the base word's Kind from what `word` means in `meaning`: a doer, instrument, vessel or tool that performs an action takes VERB when the base is that verb's stem (Lehrer from lehren, Bohrer from bohren), an inhabitant or product of a place takes PROPN (Berliner from Berlin), and a derivative from a thing or quality takes NOUN or ADJ.";

/** Closes a Ge- noun's base route question: denominal thing/collective vs deverbal action/sound. */
export const gePrefixRouteGuide =
	"Pick NOUN when the base is a common noun naming a thing, perception or collective (Gebirge from Berg); pick VERB when the Ge- noun names an action, process or sound from a verb stem (Gebell from bellen).";

/**
 * The route guide for an analysis's word parts: a prefixed base's, a Ge-
 * noun's, a suffix base's, or none. Compound first-part guides are attached
 * per-part in `word-parts.ts` so they never apply to a compound's head.
 */
export function routeGuideOf(
	analysis: WordAnalysis,
	kind: string,
): string | undefined {
	if (analysis.pieces.some(({ role }) => role === "Ending"))
		return prefixedBaseRouteGuide;
	const [first, second, ...rest] = analysis.pieces;
	if (
		first?.role === "Prefix" &&
		first.canonicalForm === "ge-" &&
		second?.role === "Word" &&
		rest.length === 0 &&
		kind === "NOUN"
	)
		return gePrefixRouteGuide;
	if (
		first?.role === "Word" &&
		second?.role === "Suffix" &&
		rest.length === 0
	)
		return suffixBaseRouteGuide;
	return undefined;
}

export const noneOption = "No immediate parts: a simple word, or a conversion";
