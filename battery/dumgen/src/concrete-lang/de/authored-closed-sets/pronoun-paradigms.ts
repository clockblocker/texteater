import type * as Dumling from "dumling/types";
import {
	form,
	type PronounDescription,
	type PronounTable,
	pronounMember,
	pronounParadigm,
	type ReviewedPronoun,
	strongPronoun,
} from "./pronoun-paradigm.js";

type Core = Dumling.Lemma<"de", "Lexeme", "PRON">["coreFeatures"];
const absent = [null, null, null, null] as const;
const description = (
	pronType: Core["pronType"],
	emoji: string,
	definition: string,
	en: string[],
	ru: string[],
): PronounDescription => ({ core: { pronType }, emoji, definition, en, ru });
const reviewed: ReviewedPronoun[] = [];
const add = (table: PronounTable, meaning: PronounDescription) =>
	reviewed.push(...pronounParadigm(table, meaning));

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
			pronType === "Int" ? "❓" : "🔗",
			pronType === "Int"
				? "Fragt nach der Auswahl einer Person oder Sache aus einer bekannten Menge."
				: "Leitet einen Relativsatz ein und verweist auf dessen Bezugswort.",
			[pronType === "Int" ? "which one; which ones" : "who; which"],
			[pronType === "Int" ? "который; какие" : "который"],
		),
	);
}

// wer/was do not distinguish reference gender/number. Keep the established null
// coordinates of interrogative wer; do not duplicate shared wessen by referent type.
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/RelInter/Pron-wer-was.xml?lang=de
for (const pronType of ["Int", "Rel"] as const) {
	const meaning = description(
		pronType,
		pronType === "Int" ? "❓" : "🔗",
		pronType === "Int"
			? "Fragt nach einer Sache, einem Sachverhalt oder einer Handlung."
			: "Bezeichnet in einem freien Relativsatz die gemeinte Person oder Sache.",
		[pronType === "Int" ? "what" : "whoever; what"],
		[pronType === "Int" ? "что" : "кто; что"],
	);
	for (const grammaticalCase of ["Nom", "Acc"] as const)
		reviewed.push(
			pronounMember(form("was", "vas"), meaning, {
				case: grammaticalCase,
			}),
		);
	if (pronType === "Rel")
		for (const [text, ipa, grammaticalCase] of [
			["wer", "veːɐ̯", "Nom"],
			["wen", "veːn", "Acc"],
			["wem", "veːm", "Dat"],
			["wessen", "ˈvɛsən", "Gen"],
		] as const)
			reviewed.push(
				pronounMember(form(text, ipa), meaning, {
					case: grammaticalCase,
				}),
			);
	// Attributive genitives retain the pronoun's own Gen, not the following noun's case.
	reviewed.push(
		pronounMember(
			form("wessen", "ˈvɛsən"),
			{
				...meaning,
				core: { pronType, extPos: "DET" },
				definition:
					"Bezeichnet fragend oder relativisch die Person oder Sache, der das folgende Nomen zugeordnet ist.",
				en: ["whose"],
				ru: ["чей"],
			},
			{ case: "Gen" },
		),
	);
}

// deren/derer restrictions are contextual: only deren is attributive; forward
// demonstrative reference uses derer. Bare der is not a genitive PRON form.
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/RelInter/RelPron-der-die-das.xml?lang=de
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/Demonstr/Pron-der-die-das.html?lang=de
for (const pronType of ["Dem", "Rel"] as const) {
	const meaning = description(
		pronType,
		pronType === "Dem" ? "👉" : "🔗",
		"Genitivischer Verweis auf eine im Kontext bestimmte Person oder Gruppe.",
		["of that one; of those"],
		["того; тех"],
	);
	for (const [gender, number] of [
		["Fem", "Sing"],
		[null, "Plur"],
	] as const) {
		reviewed.push(
			pronounMember(
				form("derer", "ˈdeːʁɐ"),
				{
					...meaning,
					definition: `${meaning.definition} Steht selbstständig; demonstrativ ist der feminine Singular unüblich.`,
				},
				{ case: "Gen", gender, number },
			),
		);
	}
	for (const [text, ipa, gender, number] of [
		["dessen", "ˈdɛsən", "Masc", "Sing"],
		["dessen", "ˈdɛsən", "Neut", "Sing"],
		["deren", "ˈdeːʁən", "Fem", "Sing"],
		["deren", "ˈdeːʁən", null, "Plur"],
	] as const) {
		reviewed.push(
			pronounMember(
				form(text, ipa),
				{
					...meaning,
					core: { pronType, extPos: "DET" },
					definition:
						"Ordnet das folgende Nomen dem Bezugswort des genitivischen Pronomens zu.",
					en: ["whose; of whom; of which"],
					ru: ["чей; которого; которых"],
				},
				{ case: "Gen", gender, number },
			),
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
// genitive is adjectival -en. Masc/Fem singular has no standalone use.
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
	const t = strongPronoun(stem, ipa),
		bare = (cell: (typeof t.Neut)[number]) =>
			form(cell.text, cell.ipa, stem);
	add(
		{
			Masc: absent,
			Fem: absent,
			Neut: [bare(t.Neut[0]), bare(t.Neut[1]), bare(t.Neut[2]), t.Masc[1]],
			Plur: t.Plur,
		},
		description("Ind", emoji, definition, [en], [ru]),
	);
}
// meist stands alone only after the definite article (das meiste, die meisten),
// so its standalone cells carry weak endings.
add(
	{
		Masc: absent,
		Fem: absent,
		Neut: [
			form("meiste", "ˈmaɪ̯stə"),
			form("meiste", "ˈmaɪ̯stə"),
			form("meisten", "ˈmaɪ̯stən"),
			form("meisten", "ˈmaɪ̯stən"),
		],
		Plur: [
			form("meisten", "ˈmaɪ̯stən"),
			form("meisten", "ˈmaɪ̯stən"),
			form("meisten", "ˈmaɪ̯stən"),
			form("meisten", "ˈmaɪ̯stən"),
		],
	},
	description(
		"Ind",
		"🔢",
		"Bezeichnet den größten Teil einer Menge oder Gruppe.",
		["most; the majority"],
		["большинство; большая часть"],
	),
);
// sämtlich is total; standalone as neuter mass singular or plural.
{
	const t = strongPronoun("sämtlich", "ˈzɛmtlɪç");
	add(
		{
			Masc: absent,
			Fem: absent,
			Neut: [t.Neut[0], t.Neut[1], t.Neut[2], t.Masc[1]],
			Plur: t.Plur,
		},
		description(
			"Tot",
			"💯",
			"Bezeichnet die Gesamtheit einer Menge ohne Ausnahme.",
			["all; the whole of"],
			["всё; все"],
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
	add(
		{
			...t,
			Masc: [t.Masc[0], t.Masc[1], t.Masc[2], t.Masc[1]],
			Neut: [t.Neut[0], t.Neut[1], t.Neut[2], t.Masc[1]],
		},
		description(
			"Ind",
			"🔢",
			`Bezeichnet eine unbestimmte Menge oder Anzahl.${stem === "etwelch" ? " Die Form ist selten und eher veraltet." : ""}`,
			[en],
			[ru],
		),
	);
}

// Singular keiner/einer vs plural keine; eins/keins only in Nom/Acc Neut.
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
	add(
		{
			...t,
			Neut: [short, short, t.Neut[2], t.Neut[3]],
			Plur: stem === "kein" ? t.Plur : absent,
		},
		description(
			pronType,
			pronType === "Neg" ? "🚫" : "👤",
			definition,
			[en],
			[ru],
		),
	);
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
add(
	strongPronoun("all", "ˈal"),
	description(
		"Tot",
		"🌐",
		"Bezeichnet die Gesamtheit einer Menge oder aller Mitglieder einer Gruppe.",
		["all; everything; everyone"],
		["все; всё"],
	),
);
// jeder is singular. Genitive jedes cannot stand alone, unlike eines jeden.
// Plural jedwede/jegliche is rare but closed: a Closed Route member covers every
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
// beide: neuter singular has no Gen; plural weak endings follow an article.
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/Pron-Indef/Pron-beide.html?lang=de
{
	const t = strongPronoun("beid", "ˈbaɪ̯d");
	add(
		{
			Masc: absent,
			Fem: absent,
			Neut: [t.Neut[0], t.Neut[1], t.Neut[2], null],
			Plur: [
				form("beide", "ˈbaɪ̯də", "beiden"),
				form("beide", "ˈbaɪ̯də", "beiden"),
				t.Plur[2],
				form("beider", "ˈbaɪ̯dɐ", "beiden"),
			],
		},
		description(
			"Tot",
			"✌️",
			"Bezeichnet die Gesamtheit zweier Personen oder Sachen.",
			["both"],
			["оба; обе"],
		),
	);
}

// Missing genitives and the full irgendjemand series; uninflected Acc/Dat remain variants.
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/Pron-Indef/Pron-jemand3.html?lang=de
for (const [stem, ipa, pronType, definition, en, ru] of [
	[
		"jemand",
		"ˈjeːmant",
		"Ind",
		"Bezeichnet eine unbestimmte Person.",
		"someone",
		"кто-то",
	],
	[
		"niemand",
		"ˈniːmant",
		"Neg",
		"Verneint, dass eine Person gemeint ist oder die Aussage erfüllt.",
		"nobody",
		"никто",
	],
	[
		"irgendjemand",
		"ˈɪʁɡəntˌjeːmant",
		"Ind",
		"Bezeichnet eine beliebige, nicht näher bestimmte Person.",
		"anyone; someone",
		"кто-нибудь",
	],
] as const) {
	const meaning = description(
		pronType,
		pronType === "Neg" ? "🚫" : "👤",
		definition,
		[en],
		[ru],
	);
	reviewed.push(
		pronounMember(
			form(`${stem}es`, `${ipa.slice(0, -1)}dəs`, `${stem}s`),
			meaning,
			{ case: "Gen", number: "Sing" },
		),
	);
	if (stem === "irgendjemand")
		for (const [ending, grammaticalCase] of [
			["", "Nom"],
			["en", "Acc"],
			["em", "Dat"],
		] as const)
			reviewed.push(
				pronounMember(
					form(
						stem + ending,
						ending
							? `${ipa.slice(0, -1)}d${ending === "en" ? "ən" : "əm"}`
							: ipa,
						...(ending ? [stem] : []),
					),
					meaning,
					{ case: grammaticalCase, number: "Sing" },
				),
			);
}
// man has only Nom/Sing; einer supplies its oblique substitutes, not aliases of man.
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
		{ case: "Nom", number: "Sing" },
	),
);
// Invariant expressions keep unmarked coordinates, per ADR 0018.
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

// Standalone einander is one invariant reciprocal Lemma (Dumling Context); case
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

// Possessor coordinates and possessed-item agreement are independent.
// Strong standalone, weak after an article, and article-bound -ig forms:
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/Posses/index.html?lang=de
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/Posses/Pron-Poss-ig1.html?lang=de
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/e-Tilgung.html?lang=de
for (const [
	stem,
	ipa,
	person,
	referenceNumber,
	possessorGender,
	polite,
	en,
	ru,
] of [
	["mein", "ˈmaɪ̯n", "1", "Sing", null, null, "mine", "мой"],
	[
		"dein",
		"ˈdaɪ̯n",
		"2",
		"Sing",
		null,
		"Infm",
		"yours (singular informal)",
		"твой",
	],
	[
		"sein",
		"ˈzaɪ̯n",
		"3",
		"Sing",
		"Masc",
		null,
		"his",
		"его (обладатель — муж. род)",
	],
	[
		"sein",
		"ˈzaɪ̯n",
		"3",
		"Sing",
		"Neut",
		null,
		"its",
		"его (обладатель — ср. род)",
	],
	["ihr", "ˈiːʁ", "3", "Sing", "Fem", null, "hers", "её"],
	["ihr", "ˈiːʁ", "3", "Plur", null, null, "theirs", "их"],
	["unser", "ˈʊnzəʁ", "1", "Plur", null, null, "ours", "наш"],
	[
		"eur",
		"ˈɔɪ̯ʁ",
		"2",
		"Plur",
		null,
		"Infm",
		"yours (plural informal)",
		"ваш (несколько адресатов)",
	],
	[
		"Ihr",
		"ˈiːʁ",
		"2",
		null,
		null,
		"Form",
		"yours (formal)",
		"Ваш (вежливое обращение)",
	],
	[
		"Ihr",
		"ˈiːʁ",
		"2",
		"Sing",
		null,
		"Form",
		"yours (formal, one addressee)",
		"Ваш (один адресат)",
	],
	[
		"Ihr",
		"ˈiːʁ",
		"2",
		"Plur",
		null,
		"Form",
		"yours (formal, several addressees)",
		"Ваш (несколько адресатов)",
	],
] as const) {
	const meaning: PronounDescription = {
		core: {
			pronType: "Prs",
			poss: "Yes",
			person,
			referenceNumber,
			"gender[psor]": possessorGender,
			polite,
		},
		emoji: "🔑",
		definition: `Bezeichnet eine dem Besitzer zugeordnete Person oder Sache (${en}).`,
		en: [en],
		ru: [ru],
	};
	const t = strongPronoun(stem, ipa);
	const weak = (ending: "e" | "en") => stem + ending;
	const withWeak = (
		entry: NonNullable<PronounTable["Masc"][0]>,
		ending: "e" | "en",
		short = false,
	) => {
		const variants = new Set([weak(ending)]);
		if (short && ["mein", "dein", "sein"].includes(stem))
			variants.add(`${stem}s`);
		for (const text of [entry.text, ...variants]) {
			if (stem === "unser") {
				variants.add(text.replace(/^unser/, "unsr"));
				if (/^unser(en|em)$/.test(text))
					variants.add(text.replace(/e([nm])$/, "$1"));
			}
			if (stem === "eur") {
				variants.add(text.replace(/^eur/, "euer"));
				if (/^eur(en|em)$/.test(text))
					variants.add(
						text.replace(/^eur/, "euer").replace(/e([nm])$/, "$1"),
					);
			}
		}
		variants.delete(entry.text);
		return { ...entry, variants: [...variants] };
	};
	add(
		{
			Masc: [
				withWeak(t.Masc[0], "e"),
				withWeak(t.Masc[1], "en"),
				withWeak(t.Masc[2], "en"),
				withWeak(t.Masc[3], "en"),
			],
			Neut: [
				withWeak(t.Neut[0], "e", true),
				withWeak(t.Neut[1], "e", true),
				withWeak(t.Neut[2], "en"),
				withWeak(t.Neut[3], "en"),
			],
			Fem: [
				withWeak(t.Fem[0], "e"),
				withWeak(t.Fem[1], "e"),
				withWeak(t.Fem[2], "en"),
				withWeak(t.Fem[3], "en"),
			],
			Plur: [
				withWeak(t.Plur[0], "en"),
				withWeak(t.Plur[1], "en"),
				withWeak(t.Plur[2], "en"),
				withWeak(t.Plur[3], "en"),
			],
		},
		meaning,
	);
	const igStem = stem === "unser" ? "unsrig" : `${stem}ig`;
	const igIpa = stem === "unser" ? "ˈʊnzʁɪɡ" : `${ipa}ɪɡ`;
	const e = form(`${igStem}e`, `${igIpa}ə`),
		enForm = form(`${igStem}en`, `${igIpa}ən`);
	add(
		{
			Masc: [e, enForm, enForm, enForm],
			Neut: [e, e, enForm, enForm],
			Fem: [e, e, enForm, enForm],
			Plur: [enForm, enForm, enForm, enForm],
		},
		{
			...meaning,
			definition: `${meaning.definition} Die Form auf -ig verlangt einen Artikel.`,
		},
	);
}

// was für: plural standalone welche, but attributive bare was für.
// The standalone genitive is rare (echo questions after a genitive verb: "Er bedarf
// eines Anwalts. Was für eines?") but exists, so the Closed Route invariant keeps it.
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/RelInter/Pron-was_fuer.xml?lang=de
{
	const t = strongPronoun("was für ein", "vas fyːɐ̯ ˈaɪ̯n");
	add(
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
		description(
			"Int",
			"❓",
			"Fragt nach der Art oder Beschaffenheit einer Person oder Sache.",
			["what kind; what sort"],
			["что за; какого рода"],
		),
	);
}

// jedermann has invariant Nom/Acc/Dat and a distinct Gen jedermanns.
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/Pron-Indef/Pron-jedermann3.html?lang=de
for (const grammaticalCase of ["Nom", "Acc", "Dat", "Gen"] as const)
	reviewed.push(
		pronounMember(
			form(
				grammaticalCase === "Gen" ? "jedermanns" : "jedermann",
				grammaticalCase === "Gen" ? "ˈjeːdɐmans" : "ˈjeːdɐman",
			),
			description(
				"Tot",
				"🌐",
				"Bezeichnet jeden Menschen ohne Ausnahme.",
				["everyone; everybody"],
				["каждый; все"],
			),
			{ case: grammaticalCase, number: "Sing" },
		),
	);

/** Reviewed coverage matrix, including exact identities and their alternate realizations. */
export const reviewedPronouns: readonly ReviewedPronoun[] = reviewed;
