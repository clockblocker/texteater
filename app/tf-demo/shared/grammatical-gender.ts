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

export function nounHeadingArticle(
	lemma: LemmaFeatures & { readonly language: string },
): string | undefined {
	if (lemma.language !== "de" || lemma.kind !== "NOUN") return undefined;
	switch (coreGender(lemma)) {
		case "Masc":
			return "der";
		case "Fem":
			return "die";
		case "Neut":
			return "das";
	}
}
