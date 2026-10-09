import type * as Dumling from "dumling/types";
import {
	type ArticleAgreementIssue,
	attestedArticle,
	headAgreement,
} from "../article-evidence.js";
import {
	type ArticleAgreement,
	germanArticleCell,
	germanArticleSpellings,
} from "../inventories/de/article-cells.js";

function describe(head: ArticleAgreement): string {
	const gender =
		typeof head.gender === "string" || head.gender === null
			? head.gender
			: head.gender.join("|");
	const marked = [head.case, gender, head.number].filter(
		(value) => value !== null,
	);
	return marked.length > 0 ? marked.join(".") : "any cell";
}

/**
 * Where a German Attestation's article does not agree with its Head (system
 * ADR 0040, ADR 0041), a Lexeme or a NOUN Locution, whose Core gender the
 * check reads as a noun's: the owned or shared article's spelling, read
 * through its Fusion or Shorthand, must name a cell of `der` or `ein` for the
 * Head's case, number and gender, any of its genders when it has a `mixed`
 * one (das Balg and der Balg pass, die Balg fails; Rule
 * de/noun-gender-in-free-variation). `ein Häuser` fails; so does an owned member
 * that is no article at all. A German name that owns its article must show
 * its gender, in Core or, for a surname or coined name, on its singular
 * Surface, so the check never passes on an unmarked gender. Dumling checks
 * only where the evidence points. A Typo article is not read.
 */
export function germanArticleAgreementIssues(
	attestation: Dumling.Attestation<"de">,
): ArticleAgreementIssue[] {
	const found = attestedArticle(attestation);
	if (found === undefined) return [];
	const { article, path } = found;
	const { surface } = attestation;
	const head = headAgreement(surface);
	if (
		found.kind === "Owned" &&
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
