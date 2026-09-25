export type GrammaticalGender = "Fem" | "Masc" | "Neut";

type LemmaFeatures = {
	readonly family: string;
	readonly kind: string;
	readonly coreFeatures: unknown;
};

/** Only noun and pronoun Core Features supply gender colour; agreement does not. */
export function coreGender(
	lemma: LemmaFeatures,
): GrammaticalGender | undefined {
	if (
		lemma.family !== "Lexeme" ||
		(lemma.kind !== "NOUN" &&
			lemma.kind !== "PROPN" &&
			lemma.kind !== "PRON")
	)
		return undefined;
	const core = lemma.coreFeatures;
	if (!core || typeof core !== "object" || !("gender" in core))
		return undefined;
	return core.gender === "Fem" ||
		core.gender === "Masc" ||
		core.gender === "Neut"
		? core.gender
		: undefined;
}

/**
 * The nominative definite article a German noun heading is cited with. A
 * proper noun has one only when it is cited with its article (ADR 0035): `die
 * Schweiz`, and plural `die Niederlande` without a gender.
 */
export function nounHeadingArticle(
	lemma: LemmaFeatures & { readonly language: string },
): string | undefined {
	if (lemma.language !== "de" || lemma.family !== "Lexeme") return undefined;
	if (lemma.kind === "PROPN") {
		const core = lemma.coreFeatures;
		if (
			!core ||
			typeof core !== "object" ||
			!("article" in core) ||
			core.article !== "Definite"
		)
			return undefined;
		if (!("gender" in core) || core.gender === null) return "die";
	} else if (lemma.kind !== "NOUN") return undefined;
	switch (coreGender(lemma)) {
		case "Masc":
			return "der";
		case "Fem":
			return "die";
		case "Neut":
			return "das";
	}
}
