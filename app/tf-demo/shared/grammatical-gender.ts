export type GrammaticalGender = "Fem" | "Masc" | "Neut";

type LemmaFeatures = {
	readonly family: string;
	readonly kind: string;
	readonly coreFeatures: unknown;
};

const isGender = (value: unknown): value is GrammaticalGender =>
	value === "Fem" || value === "Masc" || value === "Neut";

/**
 * The genders a noun's or pronoun's Core names: one, each member of a
 * `mixed` gender in its catalog order (der oder das Balg is Masc, Neut),
 * or none. Agreement supplies none.
 */
export function coreGenders(
	lemma: LemmaFeatures,
): readonly GrammaticalGender[] {
	if (
		lemma.family !== "Lexeme" ||
		(lemma.kind !== "NOUN" &&
			lemma.kind !== "PROPN" &&
			lemma.kind !== "PRON")
	)
		return [];
	const core = lemma.coreFeatures;
	if (!core || typeof core !== "object" || !("gender" in core)) return [];
	const { gender } = core;
	if (isGender(gender)) return [gender];
	if (!gender || typeof gender !== "object" || !("mixed" in gender))
		return [];
	const { mixed } = gender;
	return Array.isArray(mixed) ? mixed.filter(isGender) : [];
}

/**
 * Only noun and pronoun Core Features supply gender colour; agreement does
 * not. A `mixed` gender has no one colour, so it supplies none.
 */
export function coreGender(
	lemma: LemmaFeatures,
): GrammaticalGender | undefined {
	const genders = coreGenders(lemma);
	return genders.length === 1 ? genders[0] : undefined;
}
