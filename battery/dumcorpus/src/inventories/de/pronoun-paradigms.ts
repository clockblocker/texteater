import type * as Dumling from "dumling/types";
import type { AuthoredMember } from "../member.js";
import {
	form,
	type PillarForm,
	type PronounCell,
	type PronounDescription,
	type PronounTable,
	pronounLocution,
	pronounMember,
	pronounParadigm,
	pronounStem,
	pronounStemOf,
	strongPronoun,
} from "./pronoun-paradigm.js";
import {
	type AuthoredSpelling,
	canonical,
	licensed,
	type ReviewedMember,
	type SurfaceCell,
} from "./stem-lemma.js";

type Core = Dumling.Lemma<"de", "Lexeme", "PRON">["coreFeatures"];
const absent = [null, null, null, null] as const;
const description = (
	pronType: Core["pronType"],
	emoji: string,
	definition: string,
	en: string[],
	ru: string[],
): PronounDescription => ({ core: { pronType }, emoji, definition, en, ru });
const reviewed: ReviewedMember[] = [];
// A pillar's forms cannot be derived from another paradigm (system ADR 0032).
// Pillars are one Lemma per cell: the personal and der-series tables below,
// and einer. Every add() is a stem with borrowed endings: one Lemma whose
// Surfaces mark the cell.
const add = (
	table: PronounTable,
	meaning: PronounDescription,
	options?: Parameters<typeof pronounStem>[2],
) => reviewed.push(pronounStem(table, meaning, options));
const plural = (table: PronounTable) => {
	const cited = table.Plur[0];
	if (!cited) throw Error("A plural citation needs a Nom.Plur cell");
	return { citation: cited };
};

/** A pillar cell with its Russian translation and, where it differs from its paradigm's, its English one. */
const cell = (
	text: string,
	ipa: string,
	ru: readonly string[],
	en?: readonly string[],
	remark?: string,
): PillarForm => ({
	text,
	ipa,
	ru,
	...(en ? { en } : {}),
	...(remark ? { remark } : {}),
});

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

// Relative welcher has no masculine/neuter genitive; interrogative welcher does.
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/RelInter/Pron-welcher3.xml?lang=de
for (const pronType of ["Int", "Rel"] as const) {
	const t = strongPronoun("welch", "ˈvɛlç");
	add(
		pronType === "Rel"
			? {
					...t,
					Masc: [t.Masc[0], t.Masc[1], t.Masc[2], null],
					Neut: [t.Neut[0], t.Neut[1], t.Neut[2], null],
				}
			: t,
		description(
			pronType,
			pronType === "Int" ? "❓" : "🧩",
			pronType === "Int"
				? "Fragt nach der Auswahl einer Person oder Sache aus einer bekannten Menge."
				: "Leitet einen Relativsatz ein und verweist auf dessen Bezugswort.",
			[pronType === "Int" ? "which one; which ones" : "who; which"],
			[pronType === "Int" ? "который; какие" : "который"],
		),
	);
}

// wer and was put the der-pronoun endings on w- (der, den, dem, dessen; das),
// so each is a stem whose Surfaces mark case (system ADR 0032). Their gender
// is inherent, as a noun's is: the speaker picks wer for a person and was for
// a thing, and the word then controls agreement (Wer hat seinen Schirm
// vergessen?). So gender is Core, Masc for wer and Neut for was, and wer and
// was are two Lemmas. Neither marks number, and was has no dative. Genitive
// wessen spells both; the referent decides which.
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/RelInter/Pron-wer-was.xml?lang=de
{
	const cell = (grammaticalCase: SurfaceCell["case"]): SurfaceCell => ({
		case: grammaticalCase,
		number: null,
		gender: null,
	});
	// Each cell has one spelling, Canonical.
	const spelled = (
		text: string,
		grammaticalCase: SurfaceCell["case"],
	): AuthoredSpelling => ({
		spelled: text,
		cell: cell(grammaticalCase),
		spelling: canonical,
	});
	const stems = [
		{
			citation: form("wer", "veːɐ̯"),
			gender: "Masc",
			spellings: [
				spelled("wer", "Nom"),
				spelled("wen", "Acc"),
				spelled("wem", "Dat"),
				spelled("wessen", "Gen"),
			],
			Int: {
				emoji: "❓👤",
				definition: "Fragt nach einer Person.",
				en: ["who"],
				ru: ["кто"],
			},
			Rel: {
				emoji: "🧩👤",
				definition:
					"Leitet einen Relativsatz ein, meist ohne eigenes Bezugswort, und bezeichnet die gemeinte Person: Wer mitkommen will, meldet sich.",
				en: ["whoever; the one who"],
				ru: ["кто; тот, кто"],
			},
		},
		{
			citation: form("was", "vas"),
			gender: "Neut",
			spellings: [
				spelled("was", "Nom"),
				spelled("was", "Acc"),
				spelled("wessen", "Gen"),
			],
			Int: {
				emoji: "❓📦",
				definition:
					"Fragt nach einer Sache, einem Sachverhalt oder einer Handlung.",
				en: ["what"],
				ru: ["что"],
			},
			Rel: {
				emoji: "🧩📦",
				definition:
					"Leitet einen Relativsatz ein, ohne eigenes Bezugswort oder nach das, etwas, alles, nichts oder einem ganzen Satz, und bezeichnet die gemeinte Sache: Was er sagt, stimmt.",
				en: ["whatever; what"],
				ru: ["что; то, что"],
			},
		},
	] as const;
	for (const pronType of ["Int", "Rel"] as const) {
		for (const stem of stems) {
			const meaning = stem[pronType];
			reviewed.push(
				pronounStemOf(
					stem.citation,
					{
						core: { pronType, gender: stem.gender },
						emoji: meaning.emoji,
						definition: meaning.definition,
						en: meaning.en,
						ru: meaning.ru,
					},
					stem.spellings,
				),
			);
		}
		const emoji = pronType === "Int" ? "❓" : "🧩";
		// Attributive wessen is the genitive of wer: it asks for or names a
		// possessor person. It has one form, so it is an invariant Lemma, cited
		// apart from the stem wer.
		reviewed.push(
			pronounMember(form("wessen", "ˈvɛsən"), {
				core: { pronType },
				emoji,
				definition:
					"Bezeichnet fragend oder relativisch die Person, der das folgende Nomen zugeordnet ist.",
				en: ["whose"],
				ru: ["чей"],
			}),
		);
	}
}

// Indefinite is not total: several and some are partial quantities.
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/Pron-Indef/Pron-manch3.html?lang=de
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/Pron-Indef/Pron-mehrere3.html?lang=de
add(
	strongPronoun("manch", "ˈmanç"),
	description(
		"Ind",
		"🔢",
		"Bezeichnet einzelne Mitglieder einer unbestimmten, oft beträchtlichen Gruppe.",
		["some; many a one"],
		["некоторые; иной"],
	),
);
add(
	{
		Plur: [
			form("mehrere", "ˈmeːʁəʁə"),
			form("mehrere", "ˈmeːʁəʁə"),
			form("mehreren", "ˈmeːʁəʁən"),
			form("mehrerer", "ˈmeːʁəʁɐ"),
		],
		Masc: absent,
		Neut: absent,
		Fem: absent,
	},
	description(
		"Ind",
		"🔢",
		"Bezeichnet eine unbestimmte Mehrzahl von Personen oder Sachen.",
		["several; multiple"],
		["несколько"],
	),
);

// Standalone quantifiers (ticket 503): a determiner form without a noun is PRON,
// resolved in the pronoun catalog; DET keeps the attributive identity. viel and
// wenig stand alone as neuter mass singular (vieles, bare viel) or plural; the
// genitive is adjectival -en. Masc/Fem singular has no standalone use. Like
// the DETs, both cite their usual bare form (de/canonical-form-is-the-headword).
// Bare viel and wenig (Er weiß viel) spell the Lemma without a cell, as DET
// viel's uninflected spelling does; vieles, vielem and weniges stay Canonical
// in their cells (decided by agents under the user's delegation, 2026-10-02).
for (const [stem, ipa, emoji, definition, en, ru] of [
	[
		"viel",
		"ˈfiːl",
		"🔢",
		"Bezeichnet eine große unbestimmte Menge oder Anzahl.",
		"much; many; a lot",
		"многое; многие",
	],
	[
		"wenig",
		"ˈveːnɪɡ",
		"➖",
		"Bezeichnet eine geringe unbestimmte Menge oder Anzahl.",
		"little; few",
		"немногое; немногие",
	],
] as const) {
	const t = strongPronoun(stem, ipa);
	const table: PronounTable = {
		Masc: absent,
		Fem: absent,
		Neut: [t.Neut[0], t.Neut[1], t.Neut[2], t.Masc[1]],
		Plur: t.Plur,
	};
	add(table, description("Ind", emoji, definition, [en], [ru]), {
		// Transcriptions reviewed with the bare headword, as on the DETs.
		citation: form(stem, stem === "viel" ? "fiːl" : "ˈveːnɪç"),
		uninflected: [stem],
	});
}
// meist has no PRON: standing alone it still follows its article (das meiste,
// die meisten), so it is ADJ viel with its noun elided (Rule
// de/quantifier-by-use).
// sämtlich is total; standalone as neuter mass singular or plural.
{
	const t = strongPronoun("sämtlich", "ˈzɛmtlɪç");
	const table: PronounTable = {
		Masc: absent,
		Fem: absent,
		Neut: [t.Neut[0], t.Neut[1], t.Neut[2], t.Masc[1]],
		Plur: t.Plur,
	};
	add(
		table,
		description(
			"Tot",
			"🌐",
			"Bezeichnet die Gesamtheit einer Menge ohne Ausnahme.",
			["all; the whole of"],
			["всё; все"],
		),
		plural(table),
	);
}

// Comparative quantifiers without a noun (Mehr als die Hälfte; Weniger ist mehr)
// are invariant PRON identities; case comes from the clause (ticket 503). PRON
// has no degree, so they are Lemmas of their own. The attributive comparatives
// are the Cmp of DET viel and wenig (mehr Zeit, weniger Besucher).
for (const [text, ipa, emoji, definition, en, ru] of [
	[
		"mehr",
		"ˈmeːɐ̯",
		"➕",
		"Bezeichnet eine größere Menge oder Anzahl als die verglichene.",
		"more",
		"больше; более",
	],
	[
		"weniger",
		"ˈveːnɪɡɐ",
		"➖",
		"Bezeichnet eine geringere Menge oder Anzahl als die verglichene.",
		"less; fewer",
		"меньше; менее",
	],
] as const) {
	reviewed.push(
		pronounMember(
			form(text, ipa),
			description("Ind", emoji, definition, [en], [ru]),
		),
	);
}

// Strong adjectival genitive -en, not pronominal -es.
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/Pron-Indef/Pron-einige3.html?lang=de
for (const [stem, ipa, en, ru] of [
	["einig", "ˈaɪ̯nɪɡ", "some", "некоторые; немного"],
	["etlich", "ˈɛtlɪç", "several; quite a few", "несколько; немало"],
	["etwelch", "ˈɛtvɛlç", "some", "некоторые"],
] as const) {
	const t = strongPronoun(stem, ipa);
	const table: PronounTable = {
		...t,
		Masc: [t.Masc[0], t.Masc[1], t.Masc[2], t.Masc[1]],
		Neut: [t.Neut[0], t.Neut[1], t.Neut[2], t.Masc[1]],
	};
	add(
		table,
		description(
			"Ind",
			"🔢",
			`Bezeichnet eine unbestimmte Menge oder Anzahl.${stem === "etwelch" ? " Die Form ist selten und eher veraltet." : ""}`,
			[en],
			[ru],
		),
		plural(table),
	);
}

// Singular keiner/einer vs plural keine; eins/keins only in Nom/Acc Neut.
// einer is the pronominal use of the ein article table and, like it, a pillar
// with one Lemma per cell, a masculine and a neuter one for einem and for
// eines (mit einem der Kinder, eines der Häuser), whose Syncretism an open
// referent attests (system ADR 0046); irgendeiner and keiner are stems.
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/Pron-Indef/Pron-einer3.html?lang=de
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/Pron-Indef/Pron-irgendein3.html?lang=de
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/e-Tilgung.html?lang=de
for (const [stem, ipa, pronType, definition, en, ru] of [
	[
		"ein",
		"ˈaɪ̯n",
		"Ind",
		"Bezeichnet eine unbestimmte einzelne Person oder Sache.",
		"one; someone",
		"один; кто-то",
	],
	[
		"irgendein",
		"ˈɪʁɡəntˌaɪ̯n",
		"Ind",
		"Bezeichnet eine beliebige, nicht näher bestimmte Person oder Sache.",
		"any one; someone",
		"какой-нибудь; кто-нибудь",
	],
	[
		"kein",
		"ˈkaɪ̯n",
		"Neg",
		"Verneint das Vorhandensein einer Person oder Sache aus der betreffenden Menge.",
		"none; no one",
		"никто; ни один",
	],
] as const) {
	const t = strongPronoun(stem, ipa),
		short = form(`${stem}es`, `${ipa}əs`, `${stem}s`);
	const table: PronounTable = {
		...t,
		Neut: [short, short, t.Neut[2], t.Neut[3]],
		Plur: stem === "kein" ? t.Plur : absent,
	};
	const meaning = description(
		pronType,
		stem === "kein" ? "🚫" : stem === "ein" ? "1⃣" : "❔",
		definition,
		[en],
		[ru],
	);
	if (stem === "ein") reviewed.push(...pronounParadigm(table, meaning));
	else add(table, meaning);
}
// Irgendwelche supplies the plural of irgendeiner, and also singular mass reference.
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/Pron-Indef/index.html?lang=de
add(
	strongPronoun("irgendwelch", "ˈɪʁɡəntˌvɛlç"),
	description(
		"Ind",
		"❔",
		"Bezeichnet beliebige, nicht näher bestimmte Personen, Sachen oder Mengen.",
		["any; some"],
		["какие-нибудь; какой-нибудь"],
	),
);

// all is total; keep each marked case instead of unmarked alle/alles placeholders.
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/Pron-Indef/Pron-all3.html?lang=de
{
	const table = strongPronoun("all", "ˈal");
	add(
		table,
		description(
			"Tot",
			"🌐",
			"Bezeichnet die Gesamtheit einer Menge oder aller Mitglieder einer Gruppe.",
			["all; everything; everyone"],
			["все; всё"],
		),
		plural(table),
	);
}
// jeder is singular. Genitive jedes cannot stand alone, unlike eines jeden.
// Plural jedwede/jegliche is rare but closed: an authored stem covers every
// cell of its supported feature product (map 487, ticket 499).
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/Pron-Indef/Pron-jeder3.html?lang=de
for (const [stem, ipa] of [
	["jed", "ˈjeːd"],
	["jedwed", "ˈjeːtveːd"],
	["jeglich", "ˈjeːɡlɪç"],
] as const) {
	const t = strongPronoun(stem, ipa);
	add(
		{
			...t,
			Masc: [t.Masc[0], t.Masc[1], t.Masc[2], null],
			Neut: [t.Neut[0], t.Neut[1], t.Neut[2], null],
			Plur: stem === "jed" ? absent : t.Plur,
		},
		description(
			"Tot",
			"🌐",
			"Bezeichnet jedes einzelne Mitglied einer Gruppe ohne Ausnahme.",
			["each; everyone"],
			["каждый"],
		),
	);
}
// beide: neuter singular has no Gen. Weak beiden follows an article, where
// beide is ADJ with its noun elided or not (Die beiden kamen; die beiden
// Häuser; de/pron-or-det-by-use), so PRON beide has only its strong cells:
// Beide kamen.
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/Pron-Indef/Pron-beide.html?lang=de
{
	const t = strongPronoun("beid", "ˈbaɪ̯d");
	add(
		{
			Masc: absent,
			Fem: absent,
			Neut: [t.Neut[0], t.Neut[1], t.Neut[2], null],
			Plur: [
				form("beide", "ˈbaɪ̯də"),
				form("beide", "ˈbaɪ̯də"),
				t.Plur[2],
				form("beider", "ˈbaɪ̯dɐ"),
			],
		},
		description(
			"Tot",
			"2⃣",
			"Bezeichnet die Gesamtheit zweier Personen oder Sachen.",
			["both"],
			["оба; обе"],
		),
	);
}

// jemand and niemand take article endings on their own stem, optional in use
// (mit jemand), and irgendjemand is jemand with irgend- in front, so each is a
// stem: one Lemma whose Surfaces mark the cell (system ADR 0032). They are
// singular and genderless; the bare stem also spells Acc and Dat.
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/Pron-Indef/Pron-jemand3.html?lang=de
for (const [stem, ipa, pronType, emoji, definition, en, ru] of [
	[
		"jemand",
		"ˈjeːmant",
		"Ind",
		"👤",
		"Bezeichnet eine unbestimmte Person.",
		"someone; somebody",
		"кто-то",
	],
	[
		"niemand",
		"ˈniːmant",
		"Neg",
		"🚫",
		"Verneint, dass eine Person gemeint ist oder die Aussage erfüllt.",
		"nobody; no one",
		"никто",
	],
	[
		"irgendjemand",
		"ˈɪʁɡəntˌjeːmant",
		"Ind",
		"👤",
		"Bezeichnet eine beliebige, nicht näher bestimmte Person.",
		"anyone; someone",
		"кто-нибудь",
	],
] as const) {
	const cell = (grammaticalCase: SurfaceCell["case"]): SurfaceCell => ({
		case: grammaticalCase,
		number: "Sing",
		gender: null,
	});
	// Each cell's inflected form is Canonical. The bare stem in Acc and Dat
	// and the short genitive are Licensed Variants, other accepted forms of
	// the cell, as the user ruled on 2026-10-02.
	const spellings: AuthoredSpelling[] = [
		{ spelled: stem, cell: cell("Nom"), spelling: canonical },
		{ spelled: `${stem}en`, cell: cell("Acc"), spelling: canonical },
		{ spelled: stem, cell: cell("Acc"), spelling: licensed },
		{ spelled: `${stem}em`, cell: cell("Dat"), spelling: canonical },
		{ spelled: stem, cell: cell("Dat"), spelling: licensed },
		{ spelled: `${stem}es`, cell: cell("Gen"), spelling: canonical },
		{ spelled: `${stem}s`, cell: cell("Gen"), spelling: licensed },
	];
	reviewed.push(
		pronounStemOf(
			form(stem, ipa),
			description(pronType, emoji, definition, [en], [ru]),
			spellings,
		),
	);
}
// irgendwer puts the wer endings on irgend- and, like wer, is a stem with
// inherent Masc gender whose Surfaces mark case. Duden marks it colloquial and
// gives no genitive; irgendwas is its neuter counterpart, authored below.
// https://www.duden.de/rechtschreibung/irgendwer
{
	const cell = (grammaticalCase: SurfaceCell["case"]): SurfaceCell => ({
		case: grammaticalCase,
		number: null,
		gender: null,
	});
	const irgendjemand = reviewed.find(
		({ member }) => member.lemma.canonicalForm === "irgendjemand",
	)?.member.lemma;
	if (!irgendjemand) throw Error("irgendwer needs irgendjemand first");
	reviewed.push(
		pronounStemOf(
			form("irgendwer", "ˈɪʁɡəntˌveːɐ̯"),
			{
				core: { pronType: "Ind", gender: "Masc" },
				emoji: "👤",
				definition:
					"Bezeichnet eine beliebige, nicht näher bestimmte Person, umgangssprachlich: Irgendwer hat angerufen.",
				en: ["someone; anyone"],
				ru: ["кто-нибудь; кто-то"],
				synonyms: [irgendjemand],
			},
			[
				{
					spelled: "irgendwer",
					cell: cell("Nom"),
					spelling: canonical,
				},
				{
					spelled: "irgendwen",
					cell: cell("Acc"),
					spelling: canonical,
				},
				{
					spelled: "irgendwem",
					cell: cell("Dat"),
					spelling: canonical,
				},
			],
		),
	);
}
// man has one form of its own; its oblique cases are borrowed from einer
// (einen, einem), so it is an invariant Lemma with case unmarked (system ADR 0044).
// It always takes singular agreement.
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/Pron-Indef/Pron-man.html?lang=de
reviewed.push(
	pronounMember(
		form("man", "man"),
		description(
			"Ind",
			"👤",
			"Bezeichnet Menschen allgemein oder nicht näher bestimmte Handelnde.",
			["one; people; you"],
			["люди; неопределённо-личное местоимение"],
		),
		{ number: "Sing" },
	),
);
// Invariant expressions keep unmarked coordinates, per system ADR 0044.
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/Pron-Indef/index.html?lang=de
for (const [text, ipa, en, ru] of [
	["etwas", "ˈɛtvas", "something", "что-то"],
	["irgendetwas", "ˈɪʁɡəntˌɛtvas", "anything; something", "что-нибудь"],
	["irgendwas", "ˈɪʁɡəntvas", "anything; something", "что-нибудь"],
] as const)
	reviewed.push(
		pronounMember(
			form(text, ipa),
			description(
				"Ind",
				"📦",
				"Bezeichnet eine nicht näher bestimmte Sache oder einen Sachverhalt.",
				[en],
				[ru],
			),
		),
	);

// ein wenig is one invariant Lemma in every use (de/quantifier-by-use): its ein
// never inflects (mit ein wenig Geduld). Naming an amount (ein wenig Zucker)
// and grading (ein wenig müde) are shades of one meaning, so it has one
// Reading.
// https://www.duden.de/rechtschreibung/wenig
reviewed.push(
	pronounMember(
		form("ein wenig", "aɪ̯n ˈveːnɪç"),
		description(
			"Ind",
			"🤏",
			"Bezeichnet eine kleine, nicht näher bestimmte Menge oder einen geringen Grad, etwas, ein bisschen: Gib mir ein wenig Zucker. Sie war ein wenig müde.",
			["a little; a bit"],
			["немного; чуть-чуть"],
		),
	),
);

// Quantity bisschen is one invariant Lemma in every use (de/quantifier-by-use):
// ein or der before it is a satellite (ein bisschen Zucker, das bisschen
// Geld), and alone it grades (klingt bisschen förmlich). Duden lists it as an
// indeclinable indefinite pronoun; bißchen is its pre-1996 spelling, a
// Historical Variant (realizations.ts).
// https://www.duden.de/rechtschreibung/bisschen
reviewed.push(
	pronounMember(
		form("bisschen", "ˈbɪsçən"),
		description(
			"Ind",
			"🤏",
			"Bezeichnet eine kleine, nicht näher bestimmte Menge oder einen geringen Grad, ein wenig: Gib mir ein bisschen Zucker. Das klingt bisschen förmlich.",
			["a bit; a little"],
			["немного; чуть-чуть"],
		),
	),
);

// Standalone einander is one invariant reciprocal Lemma (system ADR 0044); case
// is supplied by the governing verb or preposition and is not part of identity.
reviewed.push(
	pronounMember(
		form("einander", "aɪ̯ˈnandɐ"),
		description(
			"Rcp",
			"🤝",
			"Bezeichnet eine wechselseitige Beziehung zwischen den Mitgliedern einer Gruppe.",
			["each other; one another"],
			["друг друга"],
		),
	),
);

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

// was für einer is a Locution PRON with an empty Core and no Locution Type
// (de/was-fuer, ADR 0039; ruled on #741). Plural standalone welche, but
// attributive bare was für. The standalone genitive is rare (echo questions
// after a genitive verb: "Er bedarf eines Anwalts. Was für eines?") but
// exists, so the authored stem keeps its cell.
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/RelInter/Pron-was_fuer.xml?lang=de
{
	const t = strongPronoun("was für ein", "vas fyːɐ̯ ˈaɪ̯n");
	reviewed.push(
		pronounLocution(
			{
				Masc: t.Masc,
				Neut: [
					form("was für eines", "vas fyːɐ̯ ˈaɪ̯nəs", "was für eins"),
					form("was für eines", "vas fyːɐ̯ ˈaɪ̯nəs", "was für eins"),
					t.Neut[2],
					t.Neut[3],
				],
				Fem: t.Fem,
				Plur: [
					form("was für welche", "vas fyːɐ̯ ˈvɛlçə"),
					form("was für welche", "vas fyːɐ̯ ˈvɛlçə"),
					form("was für welchen", "vas fyːɐ̯ ˈvɛlçən"),
					form("was für welcher", "vas fyːɐ̯ ˈvɛlçɐ"),
				],
			},
			{
				core: {},
				emoji: "❓",
				definition:
					"Fragt nach der Art oder Beschaffenheit einer Person oder Sache.",
				en: ["what kind; what sort"],
				ru: ["что за; какого рода"],
			},
			null,
		),
	);
}

// jedermann has one form for Nom, Acc and Dat and a genitive jedermanns, the
// noun's -s on its own stem. Its forms derive from another paradigm, so it is
// a stem (system ADR 0032).
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/Pron-Indef/Pron-jedermann3.html?lang=de
{
	const cell = (grammaticalCase: SurfaceCell["case"]): SurfaceCell => ({
		case: grammaticalCase,
		number: "Sing",
		gender: null,
	});
	reviewed.push(
		pronounStemOf(
			form("jedermann", "ˈjeːdɐman"),
			description(
				"Tot",
				"🌐",
				"Bezeichnet jeden Menschen ohne Ausnahme.",
				["everyone; everybody"],
				["каждый; все"],
			),
			[
				{
					spelled: "jedermann",
					cell: cell("Nom"),
					spelling: canonical,
				},
				{
					spelled: "jedermann",
					cell: cell("Acc"),
					spelling: canonical,
				},
				{
					spelled: "jedermann",
					cell: cell("Dat"),
					spelling: canonical,
				},
				{
					spelled: "jedermanns",
					cell: cell("Gen"),
					spelling: canonical,
				},
			],
		),
	);
}

/** Reviewed coverage matrix, including exact identities and their alternate realizations. */
export const reviewedPronouns: readonly ReviewedMember[] = reviewed;
