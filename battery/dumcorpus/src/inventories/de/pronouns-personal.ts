import type { AuthoredMember } from "../member.js";
import { cell } from "./pronoun-authoring.js";
import { type PronounCell, pronounParadigm } from "./pronoun-paradigm.js";
import type { ReviewedMember } from "./stem-lemma.js";

const reviewed: ReviewedMember[] = [];
// The personal pronouns, one table per person and politeness. Their
// definitions name the referent rather than the cell.
const personal = (text: string, predicate: string) =>
	`Die Personalpronomenform „${text}“ ${predicate}.`;
const numberName = ({ number }: Partial<PronounCell>) =>
	number === "Plur" ? "Mehrzahl" : "Einzahl";
reviewed.push(
	...pronounParadigm(
		{
			Sing: [
				cell("ich", "ɪç", ["я"], ["I"]),
				cell("mich", "mɪç", ["меня"], ["me"]),
				cell("mir", "miːɐ̯", ["мне"], ["me"]),
				cell("meiner", "ˈmaɪ̯nɐ", ["меня"], ["me"]),
			],
			Plur: [
				cell("wir", "viːɐ̯", ["мы"], ["we"]),
				cell("uns", "ʊns", ["нас"], ["us"]),
				cell("uns", "ʊns", ["нам"], ["us"]),
				cell("unser", "ˈʊnzɐ", ["нас"], ["us"]),
			],
		},
		{
			core: { pronType: "Prs", person: "1" },
			emoji: "👈",
			definition: (text, of) =>
				personal(text, `verweist auf die sprechende ${numberName(of)}`),
			namesCell: false,
		},
	),
	...pronounParadigm(
		{
			Sing: [
				cell("du", "duː", ["ты"]),
				cell("dich", "dɪç", ["тебя"]),
				cell("dir", "diːɐ̯", ["тебе"]),
				cell("deiner", "ˈdaɪ̯nɐ", ["тебя"]),
			],
			Plur: [
				cell("ihr", "iːɐ̯", ["вы"]),
				cell("euch", "ɔʏç", ["вас"]),
				cell("euch", "ɔʏç", ["вам"]),
				cell("euer", "ˈɔʏ̯ɐ", ["вас"]),
			],
		},
		{
			core: { pronType: "Prs", person: "2" },
			emoji: "👈",
			definition: (text, of) =>
				personal(
					text,
					`verweist auf die angesprochene ${numberName(of)}`,
				),
			namesCell: false,
			en: ["you"],
		},
	),
);
// ihm and seiner spell both an er and an es cell, so those cells' definitions
// name the Nominative they decline.
const thirdPersonReferents = {
	Masc: "die männliche dritte Person Einzahl",
	Neut: "die sächliche dritte Person Einzahl",
	Fem: "die weibliche dritte Person Einzahl",
};
const thirdPerson = pronounParadigm(
	{
		Masc: [
			cell("er", "eːɐ̯", ["он"], ["he"]),
			cell("ihn", "iːn", ["его"], ["him"]),
			cell("ihm", "iːm", ["ему"], ["him"]),
			cell("seiner", "ˈzaɪ̯nɐ", ["его"], ["of him"]),
		],
		Neut: [
			cell("es", "ɛs", ["оно"], ["it"]),
			cell("es", "ɛs", ["его"], ["it"]),
			cell("ihm", "iːm", ["ему"], ["it"]),
			cell("seiner", "ˈzaɪ̯nɐ", ["его"], ["of it"]),
		],
		Fem: [
			cell("sie", "ziː", ["она"], ["she", "her"]),
			cell("sie", "ziː", ["её"], ["she", "her"]),
			cell("ihr", "iːɐ̯", ["ей"], ["her"]),
			cell("ihrer", "ˈiːʁɐ", ["её"], ["her"]),
		],
		Plur: [
			cell("sie", "ziː", ["они"], ["they", "them"]),
			cell("sie", "ziː", ["их"], ["they", "them"]),
			cell("ihnen", "ˈiːnən", ["им"], ["them"]),
			cell("ihrer", "ˈiːʁɐ", ["их"], ["them"]),
		],
	},
	{
		core: { pronType: "Prs", person: "3" },
		emoji: "👈",
		definition: (text, { case: grammaticalCase, gender }) => {
			if (!gender)
				return personal(
					text,
					"verweist auf die dritte Person Mehrzahl",
				);
			const declines =
				gender !== "Fem" &&
				(grammaticalCase === "Dat" || grammaticalCase === "Gen")
					? `ist der ${grammaticalCase === "Dat" ? "Dativ" : "Genitiv"} von „${gender === "Masc" ? "er" : "es"}“ und `
					: "";
			return personal(
				text,
				`${declines}verweist auf ${thirdPersonReferents[gender]}`,
			);
		},
		namesCell: false,
	},
);
reviewed.push(
	...thirdPerson,
	...pronounParadigm(
		{
			Plur: [
				cell("Sie", "ziː", ["Вы"]),
				cell("Sie", "ziː", ["Вас"]),
				cell("Ihnen", "ˈiːnən", ["Вам"]),
				cell("Ihrer", "ˈiːʁɐ", ["Вас"]),
			],
		},
		{
			core: { pronType: "Prs", person: "3", polite: "Form" },
			emoji: "👈",
			definition: (text) =>
				personal(
					text,
					"verweist auf eine oder mehrere höflich angesprochene Personen",
				),
			namesCell: false,
			en: ["you (formal)"],
		},
	),
);
/** The referential es cell of a case, whose Lemma the correlate and expletive es share. */
export function referentialEs(grammaticalCase: "Nom" | "Acc"): AuthoredMember {
	const found = thirdPerson.find(
		({ member: { lemma } }) =>
			lemma.canonicalForm === "es" &&
			"case" in lemma.coreFeatures &&
			lemma.coreFeatures.case === grammaticalCase,
	);
	if (!found) throw Error(`No referential es ${grammaticalCase} cell`);
	return found.member;
}

/** The personal pronouns of every person, including polite Sie. */
export const personalPronouns: readonly ReviewedMember[] = reviewed;
