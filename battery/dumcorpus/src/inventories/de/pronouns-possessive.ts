import { stemAdder } from "./pronoun-authoring.js";
import {
	type PronounDescription,
	type PronounTable,
	strongPronoun,
} from "./pronoun-paradigm.js";
import type { ReviewedMember } from "./stem-lemma.js";

const reviewed: ReviewedMember[] = [];
const add = stemAdder(reviewed);
// Possessor gender and number describe the Surface, as on the possessive
// articles: seiner serves a masculine or neuter possessor (his, its) and ihrer
// a feminine or plural one (hers, theirs), so each is one Lemma. A possessor
// is no Core Feature, so no referent picks between possessive cells and none
// has a Syncretism (system ADR 0044, ADR 0046).
// Strong standalone forms only. The -ig forms (der meinige) always follow an
// article, where the weak possessive is ADJ (der meinige gives ADJ meinige;
// de/possessive-after-article), so they are no PRON.
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/Posses/index.html?lang=de
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/e-Tilgung.html?lang=de
for (const [stem, ipa, person, polite, en, ru] of [
	["mein", "ˈmaɪ̯n", "1", null, "mine", "мой"],
	["dein", "ˈdaɪ̯n", "2", null, "yours (singular informal)", "твой"],
	["sein", "ˈzaɪ̯n", "3", null, "his, its", "его"],
	["ihr", "ˈiːʁ", "3", null, "hers, theirs", "её; их"],
	["unser", "ˈʊnzəʁ", "1", null, "ours", "наш"],
	[
		"eur",
		"ˈɔɪ̯ʁ",
		"2",
		null,
		"yours (plural informal)",
		"ваш (несколько адресатов)",
	],
	["Ihr", "ˈiːʁ", "3", "Form", "yours (formal)", "Ваш (вежливое обращение)"],
] as const) {
	const meaning: PronounDescription = {
		core: { pronType: "Prs", poss: "Yes", person, polite },
		emoji: "🔐",
		definition: `Bezeichnet eine dem Besitzer zugeordnete Person oder Sache (${en}).`,
		en: [en],
		ru: [ru],
	};
	const t = strongPronoun(stem, ipa);
	// The e of unser drops or the eu- of eur widens (unsre, unserm; euere,
	// euern): other spellings of the same form.
	const respellings = (text: string): string[] => {
		if (stem === "unser")
			return [
				text.replace(/^unser/, "unsr"),
				...(/^unser(en|em)$/.test(text)
					? [text.replace(/e([nm])$/, "$1")]
					: []),
			];
		if (stem === "eur")
			return [
				text.replace(/^eur/, "euer"),
				...(/^eur(en|em)$/.test(text)
					? [text.replace(/^eur/, "euer").replace(/e([nm])$/, "$1")]
					: []),
			];
		return [];
	};
	// A cell's respellings and short meins, deins or seins are Licensed
	// Variants. The PRON has no weak forms: after an article the weak
	// possessive is ADJ (der meine gives ADJ meine;
	// de/possessive-after-article), as weak beiden after an article is ADJ
	// beide.
	const withVariants = (
		entry: NonNullable<PronounTable["Masc"][0]>,
		short = false,
	) => {
		const variants = new Set(respellings(entry.text));
		if (short && ["mein", "dein", "sein"].includes(stem))
			variants.add(`${stem}s`);
		variants.delete(entry.text);
		return { ...entry, variants: [...variants] };
	};
	add(
		{
			Masc: [
				withVariants(t.Masc[0]),
				withVariants(t.Masc[1]),
				withVariants(t.Masc[2]),
				withVariants(t.Masc[3]),
			],
			Neut: [
				withVariants(t.Neut[0], true),
				withVariants(t.Neut[1], true),
				withVariants(t.Neut[2]),
				withVariants(t.Neut[3]),
			],
			Fem: [
				withVariants(t.Fem[0]),
				withVariants(t.Fem[1]),
				withVariants(t.Fem[2]),
				withVariants(t.Fem[3]),
			],
			Plur: [
				withVariants(t.Plur[0]),
				withVariants(t.Plur[1]),
				withVariants(t.Plur[2]),
				withVariants(t.Plur[3]),
			],
		},
		meaning,
	);
}

/** The standalone possessive pronouns. */
export const possessivePronouns: readonly ReviewedMember[] = reviewed;
