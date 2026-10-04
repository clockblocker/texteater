import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";
import type { AuthoredMember } from "./member.js";
import {
	determinerParadigm,
	form,
	type PronounForm,
	type PronounTable,
	strongPronoun,
} from "./pronoun-paradigm.js";
import {
	type AuthoredSpelling,
	canonical,
	citationForm,
	type ReviewedMember,
	type StemDescription,
	stemMember,
	tableSpellings,
} from "./stem-lemma.js";

type Core = Dumling.Lemma<"de", "Lexeme", "DET">["coreFeatures"];
type DeterminerDescription = StemDescription<Core>;

const emptyCore: Core = {
	case: null,
	gender: null,
	number: null,
	person: null,
	polite: null,
	poss: null,
	pronType: null,
};

/**
 * A stem determiner (dieser, mein, kein, viel) is one Lemma whose Surfaces
 * mark the cell (system ADR 0032). It cites its Nom.Masc.Sg or, lacking one,
 * its Nom.Plur cell unless a citation is given; uninflected spellings (viel
 * Geld, all die Jahre) realize it without a cell.
 */
function determinerStem(
	table: PronounTable,
	description: DeterminerDescription,
	options: {
		readonly citation?: PronounForm;
		readonly uninflected?: readonly string[];
	} = {},
): ReviewedMember {
	const spellings: AuthoredSpelling[] = [
		...tableSpellings(table),
		...(options.uninflected ?? []).map((spelled) => ({
			spelled,
			spelling: canonical,
		})),
	];
	return stemMember({
		kind: "DET",
		route: {
			family: "Lexeme",
			coreFeatures: { ...emptyCore, ...description.core },
		},
		citation: options.citation ?? citationForm(table),
		description,
		spellings,
	});
}

/**
 * A DET Locution (was für ein) is a stem too: one Lemma, with an empty Core,
 * whose Surfaces mark the cell (ADR 0039). It cites its Nom.Masc.Sg cell;
 * uninflected spellings realize it without a cell.
 */
function determinerLocution(
	table: PronounTable,
	description: StemDescription<Record<string, never>>,
	locutionType: Dumrel.LocutionType | null,
	options: { readonly uninflected?: readonly string[] } = {},
): ReviewedMember {
	return stemMember({
		kind: "DET",
		route: { family: "Locution", locutionType },
		citation: citationForm(table),
		description,
		spellings: [
			...tableSpellings(table),
			...(options.uninflected ?? []).map((spelled) => ({
				spelled,
				spelling: canonical,
			})),
		],
	});
}

const absent = [null, null, null, null] as const;
const reviewed: ReviewedMember[] = [];
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

// The definite and indefinite articles are pillars: one Lemma per Paradigm
// Cell (system ADR 0032), each named in its definition. ein has no plural.
/** The der and ein articles, one DET Lemma per Paradigm Cell. */
export const germanArticles: readonly AuthoredMember[] = [
	...determinerParadigm(
		{
			Masc: [
				form("der", "deːɐ̯"),
				form("den", "deːn"),
				form("dem", "deːm"),
				form("des", "dɛs"),
			],
			Neut: [
				form("das", "das"),
				form("das", "das"),
				form("dem", "deːm"),
				form("des", "dɛs"),
			],
			Fem: [
				form("die", "diː"),
				form("die", "diː"),
				form("der", "deːɐ̯"),
				form("der", "deːɐ̯"),
			],
			Plur: [
				form("die", "diː"),
				form("die", "diː"),
				form("den", "deːn"),
				form("der", "deːɐ̯"),
			],
		},
		{
			core: { pronType: "Art" },
			emoji: "👉",
			definition: (text) =>
				`Der bestimmte Artikel „${text}“ kennzeichnet einen bestimmten Bezug.`,
			en: ["the"],
			ru: ["определённый артикль"],
		},
	),
	...determinerParadigm(einWord("ein", "ˈaɪ̯n", false), {
		core: { pronType: "Art" },
		emoji: "1⃣",
		definition: (text) =>
			`Der unbestimmte Artikel „${text}“ führt einen nicht näher bestimmten Bezug ein.`,
		en: ["a", "an"],
		ru: ["неопределённый артикль"],
	}),
].map(({ member }) => member);

// Every other declining determiner is a stem with borrowed article endings:
// one Lemma here whose Surfaces mark the cell (system ADR 0032). Invariant
// ones (derlei, etwas, lauter) keep their single-Lemma files.

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
// After a fused piece (am selben, ins selbe), selben and selbe are no spellings
// of their own: derselbe owns the piece, a Fused member standing for its dem-
// or das-, and its Surface is the whole demselben or dasselbe (ADR 0035, #618).
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
		description({ pronType: "Dem" }, "👉", definition, [en], [ru]),
	);
}

// Interrogative welcher has a second Reading, exclamative ❗ (Welch ein
// Glück! Welche Freude!): Duden gives the exclamation under the one
// headword. Uninflected welch, mostly before ein, spells that Lemma without
// a cell, as uninflected viel does, and the spelling serves both Readings.
// https://www.duden.de/rechtschreibung/welcher_welche_welches
for (const meaning of [
	description(
		{ pronType: "Int" },
		"❓",
		"Der interrogative Determinierer „welcher“ fragt nach Auswahl oder Menge.",
		["which"],
		["какой"],
	),
	description(
		{ pronType: "Int" },
		"❗",
		"Der Determinierer „welcher“ leitet einen Ausruf ein und hebt Art oder Ausmaß des Bezeichneten hervor, gehoben oft unflektiert vor „ein“: Welch ein Glück! Welche Freude!",
		["what (a)"],
		["какой"],
	),
])
	add(strongPronoun("welch", "ˈvɛlç"), meaning, { uninflected: ["welch"] });
add(
	strongPronoun("welch", "ˈvɛlç"),
	description(
		{ pronType: "Rel" },
		"🧩",
		"Der relative Determinierer „welcher“ verbindet einen Bezug mit einer weiterführenden Aussage.",
		["which"],
		["который"],
	),
);

// was für ein is a Locution DET with an empty Core and no Locution Type
// (de/was-fuer, ADR 0039; ruled on #741): a determiner in a noun phrase, not
// a routine formula. The article has no plural or mass form, so bare was für
// spells the plural cells (was für Leute) and, before a mass noun, realizes
// the Lemma without a cell, as uninflected viel does (was für Wein).
{
	const t = einWord("was für ein", "vas fyːɐ̯ ˈaɪ̯n", false);
	const bare = form("was für", "vas fyːɐ̯");
	reviewed.push(
		determinerLocution(
			{ ...t, Plur: [bare, bare, bare, bare] },
			{
				core: {},
				emoji: "❓👉",
				definition:
					"Der interrogative Determinierer „was für ein“ fragt nach der Art oder Beschaffenheit.",
				en: ["what kind of a"],
				ru: ["какой"],
			},
			null,
			{ uninflected: [bare.text] },
		),
	);
}
// wie viel is ADV wie and DET viel, two targets word by word, and wievielte
// is an ADJ like the ordinals (der wievielte Versuch), so no DET is authored
// for either. A one-word wieviel, the spelling before 1996, is a Historical
// spelling spanning both words.
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
		"3",
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
// usual bare form (viel Geld), whose comparatives mehr and weniger are
// spellings marking Cmp (realizations.ts, de/canonical-form-is-the-headword).
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
// mancher cites its Nom.Masc.Sg cell, and uninflected manch (manch ein
// Freund, manch schöner Tag) spells it without a cell, as uninflected viel
// does (de/canonical-form-is-the-headword).
add(
	strongPronoun("manch", "ˈmanç"),
	description(
		{ pronType: "Ind" },
		"🔢",
		"Der quantifizierende Determinierer „mancher“ grenzt die Menge der bezeichneten Bezüge ein; unflektiert „manch“ steht gehoben vor „ein“ oder einem Adjektiv.",
		["many a"],
		["многие"],
	),
	{ uninflected: ["manch"] },
);
// The irgend- determiners take the ❔ marker of the irgend- pronouns and
// adverbs (irgendeiner, irgendwo).
add(
	strongPronoun("irgendwelch", "ˈɪʁɡəntˌvɛlç"),
	description(
		{ pronType: "Ind" },
		"❔",
		"Der quantifizierende Determinierer „irgendwelcher“ grenzt die Menge der bezeichneten Bezüge ein.",
		["any"],
		["какой-либо"],
	),
);
add(
	einWord("irgendein", "ˈɪʁɡəntˌaɪ̯n", false),
	description(
		{ pronType: "Ind" },
		"❔",
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
// meist has no DET: it stands only after a determiner, where viel, wenig,
// mehr and meist are ADJ (Rule de/quantifier-by-use), so die meisten Gäste is
// the Sup of ADJ viel.

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
		description({ pronType: "Tot" }, "🌐", definition, [...en], [...ru]),
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
		description({ pronType: "Tot" }, "🌐", definition, [...en], [...ru]),
	);
}
// beide is plural. Weak beiden stands only after a determiner, where beide
// is ADJ (die beiden Geräte; de/pron-or-det-by-use), so DET beide has none.
add(
	{
		Masc: absent,
		Neut: absent,
		Fem: absent,
		Plur: [
			form("beide", "ˈbaɪ̯də"),
			form("beide", "ˈbaɪ̯də"),
			form("beiden", "ˈbaɪ̯dən"),
			form("beider", "ˈbaɪ̯dɐ"),
		],
	},
	description(
		{ pronType: "Tot" },
		"2⃣",
		"Der totalisierende Determinierer „beide“ erfasst die bezeichnete Menge vollständig.",
		["both"],
		["оба"],
	),
);

/** Reviewed stem determiners with every spelling and the cell it marks. */
export const reviewedDeterminers: readonly ReviewedMember[] = reviewed;
