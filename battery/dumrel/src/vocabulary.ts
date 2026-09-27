export const directSemanticRelationValues = [
	"synonym",
	"nearSynonym",
	"antonym",
	"nearAntonym",
	"hypernym",
	"holonym",
] as const;

export const translationLanguageValues = ["en", "ru"] as const;

/** Cases a lexically governed preposition can assign to its complement. */
export const governedCaseValues = ["Acc", "Dat", "Gen"] as const;

/** Whether a Valency Frame Slot must be filled or may be left out. */
export const valencySlotStatusValues = ["Required", "Optional"] as const;

/** What fills a Slot: a person (`jN`), a thing (`etw`), or either. */
export const valencyReferentValues = [
	"Someone",
	"Something",
	"Either",
] as const;

/**
 * Whether a Participial Adjective's Reading means a sense of its source verb
 * (`gekocht`: `kochen`) or has drifted from all of them (`gelassen` 😌:
 * `lassen`). Form alone names the verb; this records the meaning.
 */
export const participleMeaningValues = ["Verbal", "Drifted"] as const;

/** Cases a German bare case complement takes, the subject's Nom included. */
export const germanComplementCaseValues = ["Nom", "Acc", "Dat", "Gen"] as const;

/**
 * How a German noun forms its plural from its singular: no ending
 * (`Lehrer`), umlaut only (`Mutter` → `Mütter`), `-e` (`Tag`), umlaut + `-e`
 * (`Bank` → `Bänke`), `-er` (`Kind`), umlaut + `-er` (`Haus` → `Häuser`),
 * `-(e)n` (`Muttern`, `Banken`, `Pizzen`), `-s` (`Pizzas`), or another way.
 */
export const pluralPatternValues = [
	"NoEnding",
	"UmlautOnly",
	"E",
	"UmlautE",
	"Er",
	"UmlautEr",
	"En",
	"S",
	"Other",
] as const;

/** A noun with no plural pattern: no plural (`Milch`) or no singular (`Leute`). */
export const pluralMarkerValues = ["NoPlural", "PluralOnly"] as const;

/**
 * Whether a Locution's Reading means more than its words (Idiom: `ins Gras
 * beißen`) or has a verb that only supports its predicate (Collocation: `eine
 * Entscheidung treffen`). A Locution with neither (`zum Teil`) stores none
 * (ADR 0039).
 */
export const locutionTypeValues = ["Idiom", "Collocation"] as const;

/**
 * Whether a Saying's Reading is a Proverb (`Morgenstund hat Gold im Mund`) or
 * a Winged Word, a line from a known source (`Sein oder Nichtsein`) (ADR
 * 0039).
 */
export const sayingTypeValues = ["Proverb", "WingedWord"] as const;

/**
 * What a routine formula does in conversation (ADR 0039). An INTJ Reading
 * stores one, so `tut mir leid` has an Apology Reading and a Sympathy Reading.
 */
export const formulaRoleValues = [
	"Greeting",
	"Farewell",
	"Thanks",
	"Apology",
	"Sympathy",
	"Request",
	"Acknowledgment",
	"Refusal",
	"Reaction",
	"Initiation",
	"Transition",
] as const;
