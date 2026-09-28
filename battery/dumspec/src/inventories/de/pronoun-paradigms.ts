import type * as Dumling from "dumling/types";
import {
	form,
	type PronounDescription,
	type PronounTable,
	pronounMember,
	pronounParadigm,
	pronounStem,
	pronounStemOf,
	type ReviewedPronoun,
	strongPronoun,
} from "./pronoun-paradigm.js";
import type { AuthoredSpelling, SurfaceCell } from "./stem-lemma.js";

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
// A pillar's forms cannot be derived from another paradigm (system ADR 0032).
// Pillars are one Lemma per cell: the personal and der-series cells are member
// files, and derer, attributive dessen and deren, and einer are pushed
// explicitly below. Every add() is a stem with borrowed endings: one Lemma
// whose Surfaces mark the cell.
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
	const stems = [
		{
			citation: form("wer", "veːɐ̯"),
			gender: "Masc",
			spellings: [
				{ spelled: "wer", cell: cell("Nom") },
				{ spelled: "wen", cell: cell("Acc") },
				{ spelled: "wem", cell: cell("Dat") },
				{ spelled: "wessen", cell: cell("Gen") },
			],
			Int: {
				emoji: "❓👤",
				definition: "Fragt nach einer Person.",
				en: ["who"],
				ru: ["кто"],
			},
			Rel: {
				emoji: "🔗👤",
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
				{ spelled: "was", cell: cell("Nom") },
				{ spelled: "was", cell: cell("Acc") },
				{ spelled: "wessen", cell: cell("Gen") },
			],
			Int: {
				emoji: "❓📦",
				definition:
					"Fragt nach einer Sache, einem Sachverhalt oder einer Handlung.",
				en: ["what"],
				ru: ["что"],
			},
			Rel: {
				emoji: "🔗📦",
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
		const emoji = pronType === "Int" ? "❓" : "🔗";
		// Attributive wessen is the genitive of wer: it asks for or names a
		// possessor person. extPos DET keeps it apart from the stem, and it has
		// one form, so it is an invariant Lemma.
		reviewed.push(
			pronounMember(form("wessen", "ˈvɛsən"), {
				core: { pronType, extPos: "DET" },
				emoji,
				definition:
					"Bezeichnet fragend oder relativisch die Person, der das folgende Nomen zugeordnet ist.",
				en: ["whose"],
				ru: ["чей"],
			}),
		);
	}
}

// Only deren is attributive. Standalone demonstrative derer points ahead to a
// relative clause (Wir gedenken derer, die geholfen haben) and deren points
// back, so both stay Lemmas of the same cells. Relative derer is nonstandard
// (Duden prescribes deren) and is a Variant spelling of relative deren
// (realizations.ts). Bare der is not a genitive PRON form.
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/RelInter/RelPron-der-die-das.xml?lang=de
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/Demonstr/Pron-der-die-das.html?lang=de
for (const [gender, number] of [
	["Fem", "Sing"],
	[null, "Plur"],
] as const)
	reviewed.push(
		pronounMember(
			form("derer", "ˈdeːʁɐ"),
			description(
				"Dem",
				"👉",
				"Genitivischer Verweis auf eine im Kontext bestimmte Person oder Gruppe. Steht selbstständig; der feminine Singular ist unüblich.",
				["of that one; of those"],
				["того; тех"],
			),
			{ case: "Gen", gender, number },
		),
	);
for (const pronType of ["Dem", "Rel"] as const)
	for (const [text, ipa, gender, number] of [
		["dessen", "ˈdɛsən", "Masc", "Sing"],
		["dessen", "ˈdɛsən", "Neut", "Sing"],
		["deren", "ˈdeːʁən", "Fem", "Sing"],
		["deren", "ˈdeːʁən", null, "Plur"],
	] as const)
		reviewed.push(
			pronounMember(
				form(text, ipa),
				{
					core: { pronType, extPos: "DET" },
					emoji: pronType === "Dem" ? "👉" : "🔗",
					definition:
						"Ordnet das folgende Nomen dem Bezugswort des genitivischen Pronomens zu.",
					en: ["whose; of whom; of which"],
					ru: ["чей; которого; которых"],
				},
				{ case: "Gen", gender, number },
			),
		);

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
	const table: PronounTable = {
		Masc: absent,
		Fem: absent,
		Neut: [bare(t.Neut[0]), bare(t.Neut[1]), bare(t.Neut[2]), t.Masc[1]],
		Plur: t.Plur,
	};
	add(
		table,
		description("Ind", emoji, definition, [en], [ru]),
		plural(table),
	);
}
// meist stands alone only after the definite article (das meiste, die meisten),
// so its standalone cells carry weak endings. It is cited as die meisten.
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
	{ citation: form("meisten", "ˈmaɪ̯stən") },
);
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
			"💯",
			"Bezeichnet die Gesamtheit einer Menge ohne Ausnahme.",
			["all; the whole of"],
			["всё; все"],
		),
		plural(table),
	);
}

// Comparative quantifiers without a noun (Mehr als die Hälfte; Weniger ist mehr)
// are invariant PRON identities; case comes from the clause (ticket 503). The
// attributive comparatives stay DET: mehr as its own headword, weniger as wenig.
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
// with one Lemma per cell; irgendeiner and keiner are stems.
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
			"✌",
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
	const spellings: AuthoredSpelling[] = [
		{ spelled: stem, cell: cell("Nom") },
		{ spelled: `${stem}en`, cell: cell("Acc") },
		{ spelled: stem, cell: cell("Acc") },
		{ spelled: `${stem}em`, cell: cell("Dat") },
		{ spelled: stem, cell: cell("Dat") },
		{ spelled: `${stem}es`, cell: cell("Gen") },
		{ spelled: `${stem}s`, cell: cell("Gen") },
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
				{ spelled: "irgendwer", cell: cell("Nom") },
				{ spelled: "irgendwen", cell: cell("Acc") },
				{ spelled: "irgendwem", cell: cell("Dat") },
			],
		),
	);
}
// man has one form of its own; its oblique cases are borrowed from einer
// (einen, einem), so it is an invariant Lemma with case unmarked (ADR 0018).
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

// Possessor gender and number describe the Surface, as on the possessive
// articles: seiner serves a masculine or neuter possessor (his, its) and ihrer
// a feminine or plural one (hers, theirs), so each is one Lemma. Only the word
// and its sentence's grammar decide a Lemma, never what it refers to.
// Strong standalone, weak after an article, and article-bound -ig forms:
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/Posses/index.html?lang=de
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/Posses/Pron-Poss-ig1.html?lang=de
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/e-Tilgung.html?lang=de
for (const [stem, ipa, person, polite, en, ru] of [
	["mein", "ˈmaɪ̯n", "1", null, "mine", "мой"],
	["dein", "ˈdaɪ̯n", "2", "Infm", "yours (singular informal)", "твой"],
	["sein", "ˈzaɪ̯n", "3", null, "his, its", "его"],
	["ihr", "ˈiːʁ", "3", null, "hers, theirs", "её; их"],
	["unser", "ˈʊnzəʁ", "1", null, "ours", "наш"],
	[
		"eur",
		"ˈɔɪ̯ʁ",
		"2",
		"Infm",
		"yours (plural informal)",
		"ваш (несколько адресатов)",
	],
	["Ihr", "ˈiːʁ", "2", "Form", "yours (formal)", "Ваш (вежливое обращение)"],
] as const) {
	const meaning: PronounDescription = {
		core: { pronType: "Prs", poss: "Yes", person, polite },
		emoji: "🔐",
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
				{ spelled: "jedermann", cell: cell("Nom") },
				{ spelled: "jedermann", cell: cell("Acc") },
				{ spelled: "jedermann", cell: cell("Dat") },
				{ spelled: "jedermanns", cell: cell("Gen") },
			],
		),
	);
}

/** Reviewed coverage matrix, including exact identities and their alternate realizations. */
export const reviewedPronouns: readonly ReviewedPronoun[] = reviewed;
