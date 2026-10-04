import type * as Dumling from "dumling/types";
import {
	type ArticleAgreement,
	type ArticleMember,
	germanArticleCell,
	germanArticleSpellings,
} from "./inventories/de/article-cells.js";

/** An article that does not agree with its Head, at a path inside the checked Attestation. */
export type ArticleAgreementIssue = {
	readonly path: string;
	readonly message: string;
};

type ArticleEvidence =
	| { readonly kind: "Owned"; readonly member: number }
	| { readonly kind: "Shared"; readonly article: ArticleMember }
	| { readonly kind: "Hidden" };

/**
 * English `the` goes with any Head, and `a` or `an` with one that is not
 * plural: `a books` fails.
 */
const englishArticles: Readonly<Record<string, (number: unknown) => boolean>> =
	{
		the: () => true,
		a: (number) => number !== "Plur" && number !== "Ptan",
		an: (number) => number !== "Plur" && number !== "Ptan",
	};

/**
 * The case, number and gender a Head shows, whether its Surface or its Core
 * marks them: a noun's or name's gender is its Lemma's, or its singular
 * Surface's when the Lemma has none (`der Reisende`, `der junge
 * Schwarzkopf`). Plural agreement has no gender.
 */
function headAgreement(surface: Dumling.Surface): ArticleAgreement {
	const core: Readonly<Record<string, unknown>> = surface.lemma.coreFeatures;
	const bag: Readonly<Record<string, unknown>> =
		"inflectionalFeatures" in surface && surface.inflectionalFeatures
			? surface.inflectionalFeatures
			: {};
	const coordinate = (name: string) =>
		(bag[name] ?? core[name] ?? null) as string | null;
	const number = coordinate("number");
	return {
		case: coordinate("case"),
		number,
		gender: number === "Plur" ? null : coordinate("gender"),
	};
}

function describe(head: ArticleAgreement): string {
	const marked = [head.case, head.gender, head.number].filter(
		(value) => value !== null,
	);
	return marked.length > 0 ? marked.join(".") : "any cell";
}

/**
 * Where a German or English Attestation's article does not agree with its
 * Head (system ADR 0040, ADR 0041), a Lexeme or a NOUN Locution, whose Core
 * gender the check reads as a noun's: the owned or shared article's spelling,
 * read through its Fusion or Shorthand, must name a cell of `der` or `ein`
 * for the Head's case, number and gender, or be English `the`, `a` or `an`
 * fitting the Head's number. `ein Häuser` and `a books` fail; so does an
 * owned member that is no article at all. A German name that owns its
 * article must show its gender, in Core or, for a surname or coined name, on
 * its singular Surface, so the check never passes on an unmarked gender.
 * Dumling checks only where the evidence points. A Typo article is not read,
 * and Hebrew marks its article on the Surface.
 */
export function attestationArticleAgreementIssues(
	attestation: Dumling.Attestation,
): ArticleAgreementIssue[] {
	const { surface } = attestation;
	if (
		!("articleEvidence" in attestation) ||
		(surface.language !== "de" && surface.language !== "en")
	)
		return [];
	// A NOUN Locution may leave its article evidence out.
	const evidence = attestation.articleEvidence as
		| ArticleEvidence
		| null
		| undefined;
	if (!evidence || evidence.kind === "Hidden") return [];
	const [article, path] =
		evidence.kind === "Owned"
			? [
					attestation.members[evidence.member] as
						| ArticleMember
						| undefined,
					`members.${evidence.member}`,
				]
			: [evidence.article, "articleEvidence.article"];
	if (article === undefined) return [];
	const head = headAgreement(surface);
	if (surface.language === "en") {
		const spelling = article.attested.toLocaleLowerCase("en");
		if (article.orthography === "Typo") return [];
		const agrees = englishArticles[spelling];
		if (agrees === undefined)
			return [
				{
					path,
					message: `${article.attested} is not an English article`,
				},
			];
		return agrees(head.number)
			? []
			: [
					{
						path,
						message: `${article.attested} does not agree with a ${head.number} Head`,
					},
				];
	}
	if (
		evidence.kind === "Owned" &&
		surface.lemma.kind === "PROPN" &&
		head.number !== "Plur" &&
		head.gender === null
	)
		return [
			{
				path: "surface.inflectionalFeatures.gender",
				message: `${surface.lemma.canonicalForm} owns ${article.attested}, so its Surface marks the gender the article shows`,
			},
		];
	if (germanArticleSpellings(article) === undefined) return [];
	return germanArticleCell(article, head) === undefined
		? [
				{
					path,
					message: `${article.attested} names no cell of der or ein for ${describe(head)}`,
				},
			]
		: [];
}
