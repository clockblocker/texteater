import { germanArticleForm } from "dumling";

type DisplayedSurface = {
	readonly language: string;
	readonly normalizedSurface: string;
	readonly inflectionalFeatures?: unknown;
	readonly lemma: {
		readonly family: string;
		readonly kind: string;
		readonly coreFeatures: unknown;
	};
};

function feature(bag: unknown, name: string): string | null {
	if (!bag || typeof bag !== "object" || !(name in bag)) return null;
	const value = (bag as Record<string, unknown>)[name];
	return typeof value === "string" ? value : null;
}

/**
 * The article a noun Surface is displayed with (ADR 0035). A noun owns its
 * article, but no stored value spells it: German derives it from the Lemma's
 * gender and the Surface's case, number and `article` (`dem` for `Wald` Dat
 * Sing Definite). A proper noun cited with its article has it as the Core
 * `article` instead (`der Schweiz` for `Schweiz` Dat Sing). English displays
 * none. Hebrew writes `ה` for `Def`.
 */
export function displayedArticle(
	surface: DisplayedSurface,
): { readonly text: string; readonly joiner: "" | " " } | null {
	const { lemma } = surface;
	if (lemma.family !== "Lexeme") return null;
	const bag = surface.inflectionalFeatures;
	const proper = lemma.kind === "PROPN";
	if (surface.language === "de" && (lemma.kind === "NOUN" || proper)) {
		const text = germanArticleForm({
			article: feature(proper ? lemma.coreFeatures : bag, "article"),
			case: feature(bag, "case"),
			number: feature(bag, "number"),
			gender: feature(lemma.coreFeatures, "gender"),
		});
		return text ? { text, joiner: " " } : null;
	}
	if (
		surface.language === "he" &&
		(proper
			? feature(lemma.coreFeatures, "article") === "Definite"
			: (lemma.kind === "NOUN" || lemma.kind === "ADJ") &&
				feature(bag, "definite") === "Def")
	)
		return { text: "ה", joiner: "" };
	return null;
}

/** A Surface as the learner reads it: a noun with its article (`dem Wald`). */
export function displayedSurface(surface: DisplayedSurface): string {
	const article = displayedArticle(surface);
	return article
		? `${article.text}${article.joiner}${surface.normalizedSurface}`
		: surface.normalizedSurface;
}
