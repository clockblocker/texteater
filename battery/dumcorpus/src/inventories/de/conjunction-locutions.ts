/**
 * The German Locution SCONJs whose Rules cite this list instead of naming
 * them inline (#735), by Canonical Form. `dass` holds the subordinators a
 * preposition forms with `dass` (Rule `de/dass-conjunction`), and
 * `zuInfinitive` the ones it forms with an infinitive's `zu` (Rule
 * `de/correlator-anchors`). `statt` and `anstatt` forms are separate Lemmas,
 * related as synonyms. `sodass` is no member: it is a Lexeme, and `so dass`
 * is its Variant spelling.
 */
export const germanConjunctionLocutions = {
	dass: ["ohne dass", "statt dass", "anstatt dass"],
	zuInfinitive: ["um … zu", "ohne … zu", "statt … zu", "anstatt … zu"],
} as const satisfies Readonly<Record<string, readonly string[]>>;
