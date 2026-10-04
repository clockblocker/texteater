import { germanArticles } from "./determiner-paradigms.js";
import type { AuthoredMember } from "./member.js";

/**
 * An article as its Head's Attestation records it: an owned member, or the
 * shared article of `articleEvidence`. A Fused piece names the Fusion
 * component it realizes (`m` of `im`).
 */
export type ArticleMember = {
	readonly attested: string;
	readonly orthography: string;
	readonly fusion?: {
		readonly components: readonly { readonly surface: string }[];
	};
	readonly component?: number;
};

/**
 * The Head's coordinates its article agrees with. A null coordinate is one
 * the Head does not mark, and any cell matches it.
 */
export type ArticleAgreement = {
	readonly case: string | null;
	readonly number: string | null;
	readonly gender: string | null;
};

/**
 * The shortened articles a Shorthand member may spell, with or without the
 * apostrophe, and the article forms each stands for: `'ne Frage` is `eine
 * Frage`, and `n Auto` is `ein Auto`.
 */
const shorthands: Readonly<Record<string, readonly string[]>> =
	Object.fromEntries(
		Object.entries({
			n: ["ein", "einen"],
			ne: ["eine"],
			nem: ["einem"],
			nen: ["einen"],
			ner: ["einer"],
			nes: ["eines"],
			s: ["das"],
		}).flatMap(([spelling, forms]) => [
			[spelling, forms],
			[`'${spelling}`, forms],
		]),
	);

/**
 * The article forms a member spells, read through its Fusion or Shorthand
 * (`m` is `dem`, `'ne` is `eine`) and compared in lowercase. A Typo spells
 * none that can be read, so it returns undefined.
 */
export function germanArticleSpellings(
	member: ArticleMember,
): readonly string[] | undefined {
	if (member.orthography === "Typo") return undefined;
	if (member.orthography === "Fused") {
		const surface =
			member.component === undefined
				? undefined
				: member.fusion?.components[member.component]?.surface;
		return surface === undefined ? [] : [surface.toLocaleLowerCase("de")];
	}
	const spelling = member.attested.toLocaleLowerCase("de");
	if (member.orthography === "Shorthand") return shorthands[spelling] ?? [];
	return [spelling];
}

/**
 * The DET cell an article derives to (system ADR 0040, ADR 0041): the der or
 * ein cell its spelling names for its Head's case, number and gender. `dem`
 * before `Wald` is `dem` Dat.Masc.Sg, and `m` of `im` is the same cell. A
 * plural cell marks no gender. Returns undefined when the spelling names no
 * cell that agrees with the Head: `ein Häuser`, or a word that is no article.
 */
export function germanArticleCell(
	member: ArticleMember,
	head: ArticleAgreement,
): AuthoredMember | undefined {
	const spellings = germanArticleSpellings(member) ?? [];
	return germanArticles.find(({ lemma }) => {
		const core = lemma.coreFeatures as Readonly<Record<string, unknown>>;
		return (
			spellings.includes(lemma.canonicalForm) &&
			(head.case === null || core.case === head.case) &&
			(head.number === null || core.number === head.number) &&
			(head.gender === null ||
				core.number === "Plur" ||
				core.gender === head.gender)
		);
	});
}
