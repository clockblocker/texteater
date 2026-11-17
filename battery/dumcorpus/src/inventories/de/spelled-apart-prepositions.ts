/**
 * The German prepositions written as one word that may also be written as
 * two, keyed by Canonical Form, each with its two-word spelling. Rule
 * `de/preposition-spelled-apart` cites this list: the two-word spelling is
 * the Lexeme ADP's Licensed Variant over two members, never a Locution ADP
 * and never an ADP and a NOUN. The pairs are those § 39 E3 (3) of the
 * official spelling rules leaves to the writer, and `zuseiten`, whose
 * `zu Seiten` Duden also accepts (archaic). Each is a Lexeme ADP in the
 * ADP Case Table. `anhand` and `infolge` are no members: the rules spell
 * them as one word only (§ 39 (3)), and `in Folge` means 'in a row'.
 */
export const germanSpelledApartPrepositions = {
	anstelle: "an Stelle",
	aufgrund: "auf Grund",
	aufseiten: "auf Seiten",
	mithilfe: "mit Hilfe",
	vonseiten: "von Seiten",
	zugunsten: "zu Gunsten",
	zulasten: "zu Lasten",
	zuseiten: "zu Seiten",
	zuungunsten: "zu Ungunsten",
} as const satisfies Readonly<Record<string, string>>;
