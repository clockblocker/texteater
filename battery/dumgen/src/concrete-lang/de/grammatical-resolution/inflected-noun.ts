/**
 * Whether an attested German NOUN member can spell an inflected form rather
 * than its headword under the judged Surface: every plural (Bücher, Häusern),
 * a genitive singular that is not feminine (Mannes, Aufstiegs) and a masculine
 * oblique singular in -n, as weak nouns inflect (Nachbarn, Studenten).
 * Feminine singulars never inflect (der Frau). Invariant, plural-only and
 * -n-final headwords also match (Knie, Eltern, Garten); a match only means the
 * member is no evidence of the headword.
 */
export function possiblyInflectedNoun(
	text: string,
	judged: {
		readonly gender: unknown;
		readonly number: unknown;
		readonly case: unknown;
	},
): boolean {
	if (judged.number === "Plur") return true;
	if (judged.gender === "Fem") return false;
	if (judged.case === "Gen") return true;
	return (
		judged.gender === "Masc" &&
		(judged.case === "Acc" || judged.case === "Dat") &&
		text.endsWith("n")
	);
}
