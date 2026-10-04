import type * as Dumling from "dumling/types";
import {
	type ArticleAgreementIssue,
	attestedArticle,
	headAgreement,
} from "../article-evidence.js";

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
 * Where an English Attestation's article does not agree with its Head (system
 * ADR 0040, ADR 0041), a Lexeme or a NOUN Locution: the owned or shared
 * article must be `the`, `a` or `an` fitting the Head's number. `a books`
 * fails; so does an owned member that is no article at all. A Typo article is
 * not read.
 */
export function englishArticleAgreementIssues(
	attestation: Dumling.Attestation<"en">,
): ArticleAgreementIssue[] {
	const found = attestedArticle(attestation);
	if (found === undefined) return [];
	const { article, path } = found;
	const head = headAgreement(attestation.surface);
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
