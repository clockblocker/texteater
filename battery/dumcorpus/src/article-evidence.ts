import type * as Dumling from "dumling/types";
import type {
	ArticleAgreement,
	ArticleMember,
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
 * The case, number and gender a Head shows, whether its Surface or its Core
 * marks them: a noun's or name's gender is its Lemma's, or its singular
 * Surface's when the Lemma has none (`der Reisende`, `der junge
 * Schwarzkopf`). A noun in free gender variation shows each gender of its
 * `mixed` value (der or das Balg). Plural agreement has no gender.
 */
export function headAgreement(surface: Dumling.Surface): ArticleAgreement {
	const core: Readonly<Record<string, unknown>> = surface.lemma.coreFeatures;
	const bag: Readonly<Record<string, unknown>> =
		"inflectionalFeatures" in surface && surface.inflectionalFeatures
			? surface.inflectionalFeatures
			: {};
	const coordinate = (name: string) => {
		const value = bag[name] ?? core[name];
		return typeof value === "string" ? value : null;
	};
	const number = coordinate("number");
	return {
		case: coordinate("case"),
		number,
		gender:
			number === "Plur" ? null : genderShown(bag.gender ?? core.gender),
	};
}

function genderShown(value: unknown): string | readonly string[] | null {
	if (typeof value === "string") return value;
	if (typeof value !== "object" || value === null || !("mixed" in value))
		return null;
	const { mixed } = value;
	return Array.isArray(mixed) &&
		mixed.every((gender) => typeof gender === "string")
		? mixed
		: null;
}

/**
 * The article a Head's Attestation names as its evidence, owned or shared,
 * with its path inside the Attestation. A NOUN Locution may leave its article
 * evidence out, and a hidden Fusion component spells no article to read.
 */
export function attestedArticle(attestation: Dumling.Attestation):
	| {
			readonly article: ArticleMember;
			readonly path: string;
			readonly kind: "Owned" | "Shared";
	  }
	| undefined {
	if (!("articleEvidence" in attestation)) return undefined;
	const evidence: ArticleEvidence | null | undefined =
		attestation.articleEvidence;
	if (!evidence || evidence.kind === "Hidden") return undefined;
	const [article, path] =
		evidence.kind === "Owned"
			? [
					attestation.members[evidence.member],
					`members.${evidence.member}`,
				]
			: [evidence.article, "articleEvidence.article"];
	if (article === undefined) return undefined;
	return { article, path, kind: evidence.kind };
}
