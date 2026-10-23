import { cell, description, stemAdder } from "./pronoun-authoring.js";
import {
	form,
	pronounMember,
	pronounParadigm,
	strongPronoun,
} from "./pronoun-paradigm.js";
import type { ReviewedMember } from "./stem-lemma.js";

const reviewed: ReviewedMember[] = [];
const add = stemAdder(reviewed);
// The der-series demonstrative and relative pronouns. Before a noun the
// genitives dessen and deren assign it to their referent.
reviewed.push(
	...pronounParadigm(
		{
			Masc: [
				cell("der", "deːɐ̯", ["тот", "этот"]),
				cell("den", "deːn", ["тот", "этот", "того", "этого"]),
				cell("dem", "deːm", ["тому", "этому"]),
				cell(
					"dessen",
					"ˈdɛsn̩",
					["его"],
					["that one", "this one", "his"],
					"Vor einem Nomen ordnet es dieses ihr zu: mein Freund und dessen Hund.",
				),
			],
			Neut: [
				cell("das", "das", ["то", "это"]),
				cell("das", "das", ["то", "это"]),
				cell("dem", "deːm", ["тому", "этому"]),
				cell(
					"dessen",
					"ˈdɛsn̩",
					["его"],
					["that one", "this one", "its"],
					"Vor einem Nomen ordnet es dieses ihr zu: das Haus und dessen Dach.",
				),
			],
			Fem: [
				cell("die", "diː", ["та", "эта"]),
				cell("die", "diː", ["ту", "эту"]),
				cell("der", "deːɐ̯", ["той", "этой"]),
				cell(
					"deren",
					"ˈdeːʁən",
					["её"],
					["that one", "this one", "her"],
					"Vor einem Nomen ordnet es dieses ihr zu: meine Schwester und deren Mann.",
				),
			],
			Plur: [
				cell("die", "diː", ["те", "эти"]),
				cell("die", "diː", ["те", "эти", "тех", "этих"]),
				cell("denen", "ˈdeːnən", ["тем", "этим"]),
				cell(
					"deren",
					"ˈdeːʁən",
					["их"],
					["that one", "this one", "their"],
					"Vor einem Nomen ordnet es dieses ihr zu: die Gäste und deren Kinder.",
				),
			],
		},
		{
			core: { pronType: "Dem" },
			emoji: "👉",
			definition: (text) =>
				`Das Demonstrativpronomen „${text}“ verweist betont auf eine im Kontext bestimmte Person oder Sache.`,
			namesCell: false,
			en: ["that one", "this one"],
		},
	),
	...pronounParadigm(
		{
			Masc: [
				cell("der", "deːɐ̯", ["который", "кто"]),
				cell("den", "deːn", ["который", "которого", "кого"]),
				cell("dem", "deːm", ["которому"]),
				cell(
					"dessen",
					"ˈdɛsn̩",
					["которого", "чей"],
					["whose", "who", "which", "that"],
					"Vor einem Nomen ordnet es dieses dem Bezugswort zu: der Autor, dessen Buch fehlt.",
				),
			],
			Neut: [
				cell("das", "das", ["которое", "что"]),
				cell("das", "das", ["которое", "что"]),
				cell("dem", "deːm", ["которому"]),
				cell(
					"dessen",
					"ˈdɛsn̩",
					["которого", "чей"],
					["whose", "who", "which", "that"],
					"Vor einem Nomen ordnet es dieses dem Bezugswort zu: das Haus, dessen Tür offen steht.",
				),
			],
			Fem: [
				cell("die", "diː", ["которая", "кто"]),
				cell("die", "diː", ["которую", "кого"]),
				cell("der", "deːɐ̯", ["которой"]),
				cell(
					"deren",
					"ˈdeːʁən",
					["которой", "чьей"],
					["whose", "who", "which", "that"],
					"Vor einem Nomen ordnet es dieses dem Bezugswort zu: die Zeugin, deren Aussage zählt.",
				),
			],
			Plur: [
				cell("die", "diː", ["которые", "кто"]),
				cell("die", "diː", ["которые", "которых"]),
				cell("denen", "ˈdeːnən", ["которым"]),
				cell(
					"deren",
					"ˈdeːʁən",
					["которых", "чьих"],
					["whose", "who", "which", "that"],
					"Vor einem Nomen ordnet es dieses dem Bezugswort zu: die Geräte, deren Nummern wir notieren.",
				),
			],
		},
		{
			core: { pronType: "Rel" },
			emoji: "🧩",
			definition: (text) =>
				`Das Relativpronomen „${text}“ leitet einen Relativsatz ein und verweist auf dessen Bezugswort.`,
			namesCell: false,
			en: ["who", "which", "that"],
		},
	),
);

// LEO 1.5.1.5: the same demonstrative can accompany or replace a noun.
// These are the standalone PRON identities; DET has its own existing members.
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/Demonstr/index.html?lang=de
for (const [stem, ipa, definition, en, ru] of [
	[
		"dies",
		"ˈdiːz",
		"Verweist auf eine im Kontext nahe oder hervorgehobene Person oder Sache.",
		"this; these",
		"этот; эти",
	],
	[
		"jen",
		"ˈjeːn",
		"Verweist auf eine entferntere oder zuvor erwähnte Person oder Sache.",
		"that; those",
		"тот; те",
	],
	[
		"solch",
		"ˈzɔlç",
		"Bezeichnet eine Person oder Sache der beschriebenen Art.",
		"such a one; such ones",
		"такой; такие",
	],
] as const) {
	const table = strongPronoun(stem, ipa);
	// LEO permits dies beside dieses in Nom/Acc Neut; not as a genitive.
	// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/Demonstr/index.html?lang=de
	add(
		stem === "dies"
			? {
					...table,
					Neut: [
						form("dieses", "ˈdiːzəs", "dies"),
						form("dieses", "ˈdiːzəs", "dies"),
						table.Neut[2],
						table.Neut[3],
					],
				}
			: table,
		description("Dem", "👉", definition, [en], [ru]),
	);
}

// Both parts decline: article + weak ending, including plural denjenigen/denselben.
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/Demonstr/Pron-derjenige3.html?lang=de
for (const [tail, ipa, definition, en, ru] of [
	[
		"jenig",
		"ˈjeːnɪɡ",
		"Verweist auf die durch einen folgenden Relativsatz bestimmte Person oder Sache.",
		"the one; those",
		"тот, кто; те, кто",
	],
	[
		"selb",
		"ˈzɛlb",
		"Bezeichnet dieselbe Person oder Sache wie die zuvor genannte.",
		"the same one; the same ones",
		"тот же; те же",
	],
] as const) {
	const f = (article: string, sound: string, ending: "e" | "en") =>
		form(
			article + tail + ending,
			sound + ipa + (ending === "e" ? "ə" : "ən"),
		);
	add(
		{
			Masc: [
				f("der", "deːɐ̯", "e"),
				f("den", "deːn", "en"),
				f("dem", "deːm", "en"),
				f("des", "dɛs", "en"),
			],
			Neut: [
				f("das", "das", "e"),
				f("das", "das", "e"),
				f("dem", "deːm", "en"),
				f("des", "dɛs", "en"),
			],
			Fem: [
				f("die", "diː", "e"),
				f("die", "diː", "e"),
				f("der", "deːɐ̯", "en"),
				f("der", "deːɐ̯", "en"),
			],
			Plur: [
				f("die", "diː", "en"),
				f("die", "diː", "en"),
				f("den", "deːn", "en"),
				f("der", "deːɐ̯", "en"),
			],
		},
		description("Dem", "👉", definition, [en], [ru]),
	);
}
// derer points ahead to a following relative clause, the job derjenige does
// with its own stem (Wir gedenken derer, die geholfen haben). Standalone
// deren points back (Ich habe deren viele) and alone fills the der-series
// Gen.Fem.Sg and Gen.Plur cells. Pointing ahead, derer is not a second
// spelling of those cells: Duden marks "Wir gedenken deren, die …" wrong.
// Pointing back, where deren could stand, derer is deren's Licensed Variant
// (realizations.ts). It has one form, so it is an invariant Lemma, as
// attributive wessen is (system ADR 0044), and Duden gives it as a genitive
// plural only.
// https://www.duden.de/rechtschreibung/derer
// https://www.duden.de/sprachwissen/sprachratgeber/Demonstrativpronomen-deren-derer
reviewed.push(
	pronounMember(
		form("derer", "ˈdeːʁɐ"),
		description(
			"Dem",
			"👉",
			"Kündigt einen folgenden Relativsatz an und verweist im Genitiv Plural auf die Personen oder Sachen, die er bestimmt: Wir gedenken derer, die geholfen haben.",
			["of those (who …)"],
			["тех, кто …; тех, которые …"],
		),
	),
);

/** The der-series and the other demonstrative pronouns. */
export const derSeriesPronouns: readonly ReviewedMember[] = reviewed;
