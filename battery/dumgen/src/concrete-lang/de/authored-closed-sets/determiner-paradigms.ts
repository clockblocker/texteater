import type * as Dumling from "dumling/types";
import {
	type DeterminerDescription,
	determinerStem,
	type ReviewedDeterminer,
} from "./determiner-paradigm.js";
import {
	form,
	type PronounForm,
	type PronounTable,
	strongPronoun,
} from "./pronoun-paradigm.js";

type Core = Dumling.Lemma<"de", "Lexeme", "DET">["coreFeatures"];
const absent = [null, null, null, null] as const;
const reviewed: ReviewedDeterminer[] = [];
const add = (
	table: PronounTable,
	meaning: DeterminerDescription,
	options?: Parameters<typeof determinerStem>[2],
) => reviewed.push(determinerStem(table, meaning, options));
const description = (
	core: Partial<Core>,
	emoji: string,
	definition: string,
	en: string[],
	ru: string[],
): DeterminerDescription => ({ core, emoji, definition, en, ru });
const endings = { "": "", e: "ə", en: "ən", em: "əm", es: "əs", er: "ɐ" };
type Ending = keyof typeof endings;
/** Quantifiers cited in the plural (einige, alle) name their Nom.Plur cell. */
const plural = (table: PronounTable): PronounForm => {
	const cited = table.Plur[0];
	if (!cited) throw Error("A plural citation needs a Nom.Plur cell");
	return cited;
};
const withVariants = (entry: PronounForm, ...variants: string[]) => ({
	...entry,
	variants: [...(entry.variants ?? []), ...variants],
});

/** ein-words: bare stem in Masc Nom and Neut Nom/Acc, strong endings elsewhere. */
function einWord(stem: string, ipa: string, plural: boolean): PronounTable {
	const f = (ending: Ending) => form(stem + ending, ipa + endings[ending]);
	return {
		Masc: [f(""), f("en"), f("em"), f("es")],
		Neut: [f(""), f(""), f("em"), f("es")],
		Fem: [f("e"), f("e"), f("er"), f("er")],
		Plur: plural ? [f("e"), f("e"), f("en"), f("er")] : absent,
	};
}
/** Strong endings whose Masc/Neut genitive is adjectival -en, keeping -es as a variant. */
function adjectivalGenitive(stem: string, ipa: string): PronounTable {
	const t = strongPronoun(stem, ipa);
	return {
		...t,
		Masc: [
			t.Masc[0],
			t.Masc[1],
			t.Masc[2],
			withVariants(t.Masc[1], t.Masc[3].text),
		],
		Neut: [
			t.Neut[0],
			t.Neut[1],
			t.Neut[2],
			withVariants(t.Masc[1], t.Neut[3].text),
		],
	};
}
/** Weak endings after a definite article: die meisten, der wievielte. */
function weak(stem: string, ipa: string): PronounTable {
	const e = form(`${stem}e`, `${ipa}ə`),
		en = form(`${stem}en`, `${ipa}ən`);
	return {
		Masc: [e, en, en, en],
		Neut: [e, e, en, en],
		Fem: [e, e, en, en],
		Plur: [en, en, en, en],
	};
}

// The definite and indefinite articles are pillars, authored one Lemma per
// cell under members/lexeme/determiner/article. Every other declining
// determiner is a stem with borrowed article endings: one Lemma here whose
// Surfaces mark the cell (system ADR 0032). Invariant ones (derlei, manch,
// lauter, mehr, selber, welch) keep their single-Lemma files.

for (const [stem, ipa, definition, en, ru] of [
	[
		"dies",
		"ˈdiːz",
		"Der Demonstrativartikel „dieser“ hebt einen bestimmten Bezug hervor.",
		"this",
		"этот",
	],
	[
		"jen",
		"ˈjeːn",
		"Der Demonstrativartikel „jener“ hebt einen bestimmten Bezug hervor.",
		"that",
		"тот",
	],
	[
		"solch",
		"ˈzɔlç",
		"Der Demonstrativartikel „solcher“ hebt einen bestimmten Bezug hervor.",
		"such",
		"такой",
	],
] as const)
	add(
		strongPronoun(stem, ipa),
		description({ pronType: "Dem" }, "👉", definition, [en], [ru]),
	);

// Both parts decline: article + weak ending, including plural denjenigen/denselben.
// selbe/selben remain after a fused article (am selben, ins selbe): Partial coverage.
for (const [tail, ipa, definition, en, ru] of [
	[
		"jenig",
		"ˈjeːnɪɡ",
		"Der Demonstrativartikel „derjenige“ hebt einen bestimmten Bezug hervor.",
		"the one",
		"тот",
	],
	[
		"selb",
		"ˈzɛlb",
		"Der Demonstrativartikel „derselbe“ hebt einen bestimmten Bezug hervor.",
		"the same",
		"тот же самый",
	],
] as const) {
	const fused = (entry: PronounForm, piece: string) =>
		tail === "selb" ? withVariants(entry, piece) : entry;
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
				fused(f("dem", "deːm", "en"), "selben"),
				f("des", "dɛs", "en"),
			],
			Neut: [
				f("das", "das", "e"),
				fused(f("das", "das", "e"), "selbe"),
				fused(f("dem", "deːm", "en"), "selben"),
				f("des", "dɛs", "en"),
			],
			Fem: [
				f("die", "diː", "e"),
				f("die", "diː", "e"),
				fused(f("der", "deːɐ̯", "en"), "selben"),
				f("der", "deːɐ̯", "en"),
			],
			Plur: [
				f("die", "diː", "en"),
				f("die", "diː", "en"),
				f("den", "deːn", "en"),
				f("der", "deːɐ̯", "en"),
			],
		},
		description({ pronType: "Dem" }, "👉", definition, [en], [ru]),
	);
}

for (const pronType of ["Int", "Rel"] as const)
	add(
		strongPronoun("welch", "ˈvɛlç"),
		pronType === "Int"
			? description(
					{ pronType },
					"❓",
					"Der interrogative Determinierer „welcher“ fragt nach Auswahl oder Menge.",
					["which"],
					["какой"],
				)
			: description(
					{ pronType },
					"🔗",
					"Der relative Determinierer „welcher“ verbindet einen Bezug mit einer weiterführenden Aussage.",
					["which"],
					["который"],
				),
	);

// was für: plural and mass use drop the article (was für Leute).
{
	const t = einWord("was für ein", "vas fyːɐ̯ ˈaɪ̯n", false);
	const bare = form("was für", "vas fyːɐ̯");
	add(
		{ ...t, Plur: [bare, bare, bare, bare] },
		description(
			{ pronType: "Int" },
			"❓👉",
			"Der interrogative Determinierer „was für ein“ fragt nach der Art oder Beschaffenheit.",
			["what kind of a"],
			["какой"],
		),
	);
}
// Uninflected wieviel stands before a singular noun (wieviel Geld); its
// declined cells are plural only.
add(
	{
		Masc: absent,
		Neut: absent,
		Fem: absent,
		Plur: [
			form("wieviele", "viˈfiːlə"),
			form("wieviele", "viˈfiːlə"),
			form("wievielen", "viˈfiːlən"),
			form("wievieler", "viˈfiːlɐ"),
		],
	},
	description(
		{ pronType: "Int" },
		"❓🔢",
		"Der interrogative Determinierer „wieviel“ fragt nach Auswahl oder Menge.",
		["how much", "how many"],
		["сколько"],
	),
	{ citation: form("wieviel", "viːˈfiːl"), uninflected: ["wieviel"] },
);
add(
	weak("wievielt", "viˈfiːlt"),
	description(
		{ pronType: "Int", numType: "Ord" },
		"❓🔢",
		"Der interrogative Determinierer „wievielte“ fragt nach der Stelle in einer Reihenfolge.",
		["which numbered"],
		["который по счёту"],
	),
);

add(
	einWord("kein", "ˈkaɪ̯n", true),
	description(
		{ pronType: "Neg" },
		"🚫",
		"Der negative Determinierer „kein“ verneint das Vorhandensein des bezeichneten Bezugs.",
		["no", "not a"],
		["никакой"],
	),
);

// Possessor coordinates stay as reviewed before; gender[psor] remains Surface evidence.
for (const [stem, ipa, person, polite, definition, en, ru] of [
	[
		"mein",
		"ˈmaɪ̯n",
		"1",
		null,
		"Der Possessivartikel „mein“ ordnet den bezeichneten Gegenstand der sprechenden Person zu.",
		["my"],
		["мой"],
	],
	[
		"dein",
		"ˈdaɪ̯n",
		"2",
		null,
		"Der Possessivartikel „dein“ ordnet den bezeichneten Gegenstand der vertraut angesprochenen Person zu.",
		["your"],
		["твой"],
	],
	[
		"Ihr",
		"ˈiːɐ̯",
		"2",
		"Form",
		"Der Possessivartikel „Ihr“ ordnet den bezeichneten Gegenstand der oder den förmlich angesprochenen Personen zu.",
		["your (formal)"],
		["Ваш"],
	],
	[
		"sein",
		"ˈzaɪ̯n",
		"3",
		null,
		"Der Possessivartikel „sein“ ordnet den bezeichneten Gegenstand einem maskulinen oder neutralen Bezug im Singular zu.",
		["his", "its"],
		["его"],
	],
	[
		"ihr",
		"ˈiːɐ̯",
		"3",
		null,
		"Der Possessivartikel „ihr“ ordnet den bezeichneten Gegenstand einem femininen Bezug im Singular oder einem Bezug im Plural zu.",
		["her", "their"],
		["её", "их"],
	],
	[
		"unser",
		"ˈʊnzəʁ",
		"1",
		null,
		"Der Possessivartikel „unser“ ordnet den bezeichneten Gegenstand einer Gruppe zu, zu der die sprechende Person gehört.",
		["our"],
		["наш"],
	],
	[
		"euer",
		"ˈɔɪ̯ɐ",
		"2",
		null,
		"Der Possessivartikel „euer“ ordnet den bezeichneten Gegenstand mehreren vertraut angesprochenen Personen zu.",
		["your (plural)"],
		["ваш"],
	],
] as const) {
	// e-deletion (unsre, unserm, euern) is licensed variation, not Typo.
	const table =
		stem === "euer"
			? (() => {
					const t = einWord("eur", "ˈɔɪ̯ʁ", true);
					const full = (entry: PronounForm | null) => {
						if (!entry) return entry;
						const long = entry.text.replace(/^eur/, "euer");
						return withVariants(
							entry,
							long,
							...(/e[nm]$/.test(long)
								? [long.replace(/e([nm])$/, "$1")]
								: []),
						);
					};
					const bare = form("euer", ipa);
					return {
						Masc: [
							bare,
							full(t.Masc[1]),
							full(t.Masc[2]),
							full(t.Masc[3]),
						],
						Neut: [bare, bare, full(t.Neut[2]), full(t.Neut[3])],
						Fem: t.Fem.map(full),
						Plur: t.Plur.map(full),
					} as unknown as PronounTable;
				})()
			: stem === "unser"
				? (() => {
						const t = einWord(stem, ipa, true);
						const short = (entry: PronounForm | null) => {
							if (!entry || entry.text === stem) return entry;
							const syncopated = entry.text.replace(
								/^unser/,
								"unsr",
							);
							return withVariants(
								entry,
								syncopated,
								...(/e[nm]$/.test(entry.text)
									? [entry.text.replace(/e([nm])$/, "$1")]
									: []),
							);
						};
						return {
							Masc: t.Masc.map(short),
							Neut: t.Neut.map(short),
							Fem: t.Fem.map(short),
							Plur: t.Plur.map(short),
						} as unknown as PronounTable;
					})()
				: einWord(stem, ipa, true);
	add(
		table,
		description(
			{ pronType: "Prs", poss: "Yes", person, polite },
			"🔐",
			definition,
			[...en],
			[...ru],
		),
	);
}

// Indefinite quantifiers. einig/etlich/etwelch/viel/wenig/sämtlich/all take
// the adjectival -en genitive before a strong genitive noun (einigen Aufwands).
// einige, etliche and etwelche are cited in the plural; viel and wenig by their
// uninflected form before a singular noun (viel Geld).
for (const [stem, ipa, definition, en, ru, emoji, citation] of [
	[
		"einig",
		"ˈaɪ̯nɪɡ",
		"Der quantifizierende Determinierer „einige“ grenzt die Menge der bezeichneten Bezüge ein.",
		["some"],
		["некоторые"],
		"🔢",
		"plural",
	],
	[
		"etlich",
		"ˈɛtlɪç",
		"Der quantifizierende Determinierer „etliche“ grenzt die Menge der bezeichneten Bezüge ein.",
		["several"],
		["несколько"],
		"🔢",
		"plural",
	],
	[
		"etwelch",
		"ˈɛtˌvɛlç",
		"Der quantifizierende Determinierer „etwelche“ grenzt die Menge der bezeichneten Bezüge ein.",
		["some"],
		["некоторый"],
		"🔢",
		"plural",
	],
	[
		"viel",
		"ˈfiːl",
		"Der quantifizierende Determinierer „viel“ grenzt die Menge der bezeichneten Bezüge ein.",
		["much", "many"],
		["много"],
		"🔢",
		"uninflected",
	],
	[
		"wenig",
		"ˈveːnɪɡ",
		"Der quantifizierende Determinierer „wenig“ grenzt die Menge der bezeichneten Bezüge ein.",
		["little", "few"],
		["мало"],
		"➖",
		"uninflected",
	],
] as const) {
	const table = adjectivalGenitive(stem, ipa);
	add(
		table,
		description({ pronType: "Ind" }, emoji, definition, [...en], [...ru]),
		citation === "plural"
			? { citation: plural(table) }
			: {
					// Transcriptions reviewed with the uninflected headword.
					citation: form(stem, stem === "viel" ? "fiːl" : "ˈveːnɪç"),
					uninflected: [stem],
				},
	);
}
for (const [stem, ipa, definition, en, ru] of [
	[
		"manch",
		"ˈmanç",
		"Der quantifizierende Determinierer „mancher“ grenzt die Menge der bezeichneten Bezüge ein.",
		"many a",
		"многие",
	],
	[
		"irgendwelch",
		"ˈɪʁɡəntˌvɛlç",
		"Der quantifizierende Determinierer „irgendwelcher“ grenzt die Menge der bezeichneten Bezüge ein.",
		"any",
		"какой-либо",
	],
] as const)
	add(
		strongPronoun(stem, ipa),
		description({ pronType: "Ind" }, "🔢", definition, [en], [ru]),
	);
add(
	einWord("irgendein", "ˈɪʁɡəntˌaɪ̯n", false),
	description(
		{ pronType: "Ind" },
		"🔢",
		"Der quantifizierende Determinierer „irgendein“ grenzt die Menge der bezeichneten Bezüge ein.",
		["some"],
		["какой-нибудь"],
	),
);
add(
	{
		Masc: absent,
		Neut: absent,
		Fem: absent,
		Plur: [
			form("mehrere", "ˈmeːʁəʁə"),
			form("mehrere", "ˈmeːʁəʁə"),
			form("mehreren", "ˈmeːʁəʁən"),
			form("mehrerer", "ˈmeːʁəʁɐ"),
		],
	},
	description(
		{ pronType: "Ind" },
		"🔢",
		"Der quantifizierende Determinierer „mehrere“ grenzt die Menge der bezeichneten Bezüge ein.",
		["several"],
		["несколько"],
	),
);
// meiste declines weakly after the article; its Surfaces mark degree Sup.
add(
	weak("meist", "ˈmaɪ̯st"),
	description(
		{ pronType: "Ind" },
		"🔢",
		"Der quantifizierende Determinierer „meiste“ grenzt die Menge der bezeichneten Bezüge ein.",
		["most"],
		["большинство"],
	),
);

// Total quantifiers, cited in the plural. Uninflected all stands before an
// article or pronoun (all die Jahre).
for (const [stem, ipa, definition, en, ru] of [
	[
		"all",
		"ˈal",
		"Der totalisierende Determinierer „alle“ erfasst die bezeichnete Menge vollständig.",
		["all"],
		["все"],
	],
	[
		"sämtlich",
		"ˈzɛmtlɪç",
		"Der totalisierende Determinierer „sämtliche“ erfasst die bezeichnete Menge vollständig.",
		["all"],
		["все"],
	],
] as const) {
	const table = adjectivalGenitive(stem, ipa);
	add(
		table,
		description({ pronType: "Tot" }, "💯", definition, [...en], [...ru]),
		{
			citation: plural(table),
			...(stem === "all" ? { uninflected: ["all"] } : {}),
		},
	);
}
// jeder is singular; genitive jedes also appears as jeden (jeden Monats).
for (const [stem, ipa, definition, en, ru] of [
	[
		"jed",
		"ˈjeːd",
		"Der totalisierende Determinierer „jeder“ erfasst die bezeichnete Menge vollständig.",
		["every"],
		["каждый"],
	],
	[
		"jedwed",
		"ˈjeːtveːd",
		"Der totalisierende Determinierer „jedweder“ erfasst die bezeichnete Menge vollständig.",
		["each and every"],
		["каждый"],
	],
	[
		"jeglich",
		"ˈjeːɡlɪç",
		"Der totalisierende Determinierer „jeglicher“ erfasst die bezeichnete Menge vollständig.",
		["any; every"],
		["всякий; любой"],
	],
] as const) {
	const t = strongPronoun(stem, ipa);
	add(
		{
			...t,
			Masc: [
				t.Masc[0],
				t.Masc[1],
				t.Masc[2],
				withVariants(t.Masc[3], t.Masc[1].text),
			],
			Neut: [
				t.Neut[0],
				t.Neut[1],
				t.Neut[2],
				withVariants(t.Neut[3], t.Masc[1].text),
			],
			Plur: stem === "jed" ? absent : t.Plur,
		},
		description({ pronType: "Tot" }, "💯", definition, [...en], [...ru]),
	);
}
// beide is plural; weak beiden follows an article (die beiden Geräte).
add(
	{
		Masc: absent,
		Neut: absent,
		Fem: absent,
		Plur: [
			form("beide", "ˈbaɪ̯də", "beiden"),
			form("beide", "ˈbaɪ̯də", "beiden"),
			form("beiden", "ˈbaɪ̯dən"),
			form("beider", "ˈbaɪ̯dɐ", "beiden"),
		],
	},
	description(
		{ pronType: "Tot", numType: "Card" },
		"2️⃣",
		"Der totalisierende Determinierer „beide“ erfasst die bezeichnete Menge vollständig.",
		["both"],
		["оба"],
	),
);

/** Reviewed stem determiners with every spelling and the cell it marks. */
export const reviewedDeterminers: readonly ReviewedDeterminer[] = reviewed;
