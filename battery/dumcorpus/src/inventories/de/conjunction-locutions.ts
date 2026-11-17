/**
 * The German Locution conjunctions whose Rules cite this list instead of
 * naming them inline (#735), by Canonical Form. `dass` holds the
 * subordinators a preposition forms with `dass` (Rule `de/dass-conjunction`),
 * `zuInfinitive` the ones it forms with an infinitive's `zu` (Rule
 * `de/correlator-anchors`), and `adjacentSubordinators` and
 * `adjacentCoordinators` the other two-word SCONJs and CCONJs, whose words
 * stand side by side (Rule `de/two-word-conjunction`). `statt` and `anstatt`
 * forms are separate Lemmas, related as synonyms. `sodass` is no member: it
 * is a Lexeme, and `so dass` is its Variant spelling.
 */
export const germanConjunctionLocutions = {
	dass: ["ohne dass", "statt dass", "anstatt dass", "außer dass"],
	zuInfinitive: ["um … zu", "ohne … zu", "statt … zu", "anstatt … zu"],
	adjacentSubordinators: [
		"als ob",
		"als wenn",
		"auch wenn",
		"nur dass",
		"kaum dass",
	],
	adjacentCoordinators: ["und zwar"],
} as const satisfies Readonly<Record<string, readonly string[]>>;
