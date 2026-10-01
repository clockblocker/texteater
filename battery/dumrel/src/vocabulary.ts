/**
 * The relations a Reading's Knowledge stores. Each inverse is projected, never
 * stored: `hyponym` from `hypernym`, `meronym` from `holonym`, and `exonym`
 * from `endonym`, which only a PROPN Reading stores (`Pressburg`: `Bratislava`).
 */
export const directSemanticRelationValues = [
	"synonym",
	"nearSynonym",
	"antonym",
	"nearAntonym",
	"hypernym",
	"holonym",
	"endonym",
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
 * The adverb that stands in for a German Adverbial complement, as E-VALBU
 * substitutes it (ADR 0034): a place (`wohnen` irgendwo), a direction
 * (`legen` irgendwohin), a manner (`sich benehmen` irgendwie), a duration
 * (`dauern` irgendwie lange) or a measure (`kosten` irgendwie viel).
 */
export const adverbialStandInValues = [
	"Irgendwo",
	"Irgendwohin",
	"Irgendwie",
	"IrgendwieLange",
	"IrgendwieViel",
] as const;

/**
 * What a German Predicative complement describes: the subject (`gut
 * aussehen`) or the object (`jN für dumm halten`).
 */
export const predicativeOfValues = ["Subject", "Object"] as const;

/**
 * The free word that marks a German Predicative: none (`aussehen`), `als`
 * (`sich zeigen`) or `für` (`halten`). It is never a member and never a
 * Preposition complement (ADR 0034).
 */
export const predicativeMarkerValues = ["None", "Als", "Für"] as const;

/**
 * The forms a German Clause complement takes, one complement per form: a
 * zu-infinitive (`versuchen`), a bare infinitive (a modal), or a clause with
 * `dass`, `ob` or a w-word (`wissen`).
 */
export const clauseFormValues = [
	"ZuInfinitive",
	"BareInfinitive",
	"Dass",
	"Ob",
	"W",
] as const;

/**
 * Whether a Clause complement needs the word that anticipates it: `es` in a
 * Nom or Acc Slot, `da(r)-` with the Slot's preposition in a Preposition Slot
 * (`sich freuen auf`: Required `darauf`).
 */
export const clauseCorrelateValues = ["Required", "Optional"] as const;

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
 * How a German verb forms its Präteritum, judged on the stem: Strong changes
 * the stem and adds no `-te` (`wiegen` → `wog`), Weak adds `-te` or `-ete` to
 * the unchanged stem (`wiegte`, `arbeitete`), and Mixed adds `-te` to a
 * changed stem (`bringen` → `brachte`).
 */
export const conjugationClassValues = ["Strong", "Weak", "Mixed"] as const;

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
