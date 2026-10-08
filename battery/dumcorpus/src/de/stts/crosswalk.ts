import type * as Dumling from "dumling/types";
import type {
	SttsBecomes,
	SttsGap,
	SttsRoute,
	SttsRow,
	SttsShowing,
	SttsStatus,
} from "./types.js";

type DeRoute<F extends Dumling.Family<"de">> = Extract<
	SttsRoute,
	{ family: F }
>;

/** A German Lexeme route of `kind`. */
export const lexeme = (
	kind: Dumling.Kind<"de", "Lexeme">,
): DeRoute<"Lexeme"> => ({
	family: "Lexeme",
	kind,
});
/** A German Locution route of `kind`. */
export const locution = (
	kind: Dumling.Kind<"de", "Locution">,
): DeRoute<"Locution"> => ({
	family: "Locution",
	kind,
});
/** The token is the whole target, alone. */
const alone = (route: SttsRoute): SttsBecomes => ({ role: "Target", route });
/** The token's word is the target, whose Head may own other members. */
const head = (route: SttsRoute): SttsBecomes => ({
	role: "Target",
	route,
	satellites: true,
});
const member = (route: SttsRoute): SttsBecomes => ({ role: "Member", route });
const component = (route: SttsRoute): SttsBecomes => ({
	role: "Component",
	route,
});
const show = (
	record: string,
	word: string,
	lemma?: string,
	nth?: number,
): SttsShowing => ({
	record: `de/${record}`,
	word,
	...(lemma === undefined ? {} : { lemma }),
	...(nth === undefined ? {} : { nth }),
});

const modeled: SttsStatus = { status: "Yes" };
const partial = (...gaps: SttsGap[]): SttsStatus => ({
	status: "Partial",
	gaps,
});
/** Dumgen builds nothing until segment.inUnits is rewritten. */
const waitsOnDumgen: SttsStatus = {
	status: "No",
	gaps: [
		{
			gap: "Dumgen's segment.inUnits is being rewritten against dumcorpus and doesn't build yet",
			issue: 701,
		},
	],
};
const noRecord = (gap: string, issue?: number): SttsGap => ({
	gap,
	...(issue === undefined ? {} : { issue }),
});

/**
 * The STTS crosswalk for German: each of the 54 STTS tags, the Dumling
 * representation of each of its uses, and the records showing each. A
 * ruling on #734 or #735 updates the rows it touches. The #679
 * coverage table is regenerated from it with `bun run stts-table`.
 */
export const germanSttsCrosswalk: readonly SttsRow[] = [
	{
		tag: "ADJA",
		stts: "attributive adjective",
		dumling:
			"Lexeme ADJ; the Surface marks case, gender and number. An attributive participle is ADJ too (ADR 0036)",
		mappings: [
			{
				use: "attributive adjective",
				becomes: alone(lexeme("ADJ")),
				records: [
					show(
						"es-brennt-die-hand-es-brennt-das-haar",
						"ganze",
						"ganz",
					),
					show("ich-suche-einen-besseren-ansatz", "besseren", "gut"),
				],
			},
			{
				use: "attributive participle",
				becomes: alone(lexeme("ADJ")),
				records: [
					show(
						"die-gekochten-kartoffeln-standen-schon-bereit",
						"gekochten",
						"gekocht",
					),
				],
			},
		],
		rules: [
			"de/attributive-adjective-stands-alone",
			"de/participial-adjective",
		],
		adrs: ["ADR-0036"],
		model: modeled,
		gold: "Yes",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "ADJD",
		stts: "predicative or adverbial adjective",
		dumling:
			"Lexeme ADJ with case, gender and number left empty; the features tell ADJA from ADJD",
		mappings: [
			{
				use: "predicative adjective after a copula",
				becomes: alone(lexeme("ADJ")),
				records: [
					show("er-wog-vielleicht-ein-halbes-lot", "tot", "tot"),
				],
			},
			{
				use: "state participle after sein",
				becomes: alone(lexeme("ADJ")),
				records: [
					show(
						"die-tuer-ist-geschlossen",
						"geschlossen",
						"geschlossen",
					),
				],
			},
			{
				use: "sentence adverb or degree word spelled like an adjective (offenbar, ganz 'quite', früh 'in the morning')",
				becomes: alone(lexeme("ADV")),
				records: [
					show(
						"er-schadet-ja-offenbar-niemandem-aber-die-vorstellung-dass",
						"offenbar",
						"offenbar",
					),
					show(
						"k-wartete-noch-ein-weilchen-sah-von-seinem-kopfkissen-aus",
						"ganz",
						"ganz",
					),
				],
			},
		],
		rules: [
			"de/adjective-stays-adj",
			"de/comparability-is-lexical",
			"de/sein-perfect-or-copula",
			"de/degree-word-is-adv",
		],
		adrs: ["ADR-0036", "ADR-0042"],
		model: modeled,
		gold: "Partial",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "ADV",
		stts: "adverb",
		dumling: "Lexeme ADV",
		mappings: [
			{
				use: "adverb",
				becomes: alone(lexeme("ADV")),
				records: [
					show("sieh-einmal-hier-steht-er", "hier", "hier"),
					show(
						"am-naechsten-morgen-war-alles-anders",
						"anders",
						"anders",
					),
				],
			},
			{
				use: "degree word (sehr, gar)",
				becomes: alone(lexeme("ADV")),
				records: [
					show("jetzt-schien-die-sonne-gar-zu-sehr", "gar", "gar"),
					show(
						"das-ergebnis-ist-sehr-viel-besser-als-erwartet",
						"sehr",
						"sehr",
					),
				],
			},
			{
				use: "focus word (nur, sogar)",
				becomes: alone(lexeme("ADV")),
				records: [
					show(
						"fuer-die-reparatur-braucht-sie-nur-einen-schraubendreher",
						"nur",
						"nur",
					),
					show(
						"lea-hat-sogar-den-schwierigen-zusatztest-bestanden",
						"sogar",
						"sogar",
					),
				],
			},
			{
				use: "modal particle (ja, doch, halt)",
				becomes: alone(lexeme("PART")),
				records: [
					show("du-kennst-den-weg-ja-bereits", "ja", "ja"),
					show("dann-warten-wir-halt-bis-montag", "halt", "halt"),
				],
			},
			{
				use: "aber after the first phrase (Bald aber lernte er)",
				becomes: alone(lexeme("CCONJ")),
				records: [
					show(
						"bald-aber-lernte-er-es-richtiger-schaetzen",
						"aber",
						"aber",
					),
				],
			},
		],
		rules: [
			"de/degree-word-is-adv",
			"de/focus-word-is-adv",
			"de/modal-particle-is-part",
			"de/aber-is-cconj",
		],
		adrs: [],
		model: modeled,
		gold: "Partial",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "APPR",
		stts: "preposition, left part of a circumposition",
		dumling:
			"Lexeme ADP; the first member of a circumposition Locution ADP; a member of the word governing it",
		loss: "Position: no Lemma or Attestation records that the adposition stands before its complement, since the sentence shows it; the ADP Case Table lists the positions each adposition takes (ADR 0032)",
		mappings: [
			{
				use: "preposition",
				becomes: alone(lexeme("ADP")),
				records: [
					show("das-rote-band-lag-auf-dem-geschenk", "auf", "auf"),
				],
			},
			{
				use: "left part of a circumposition",
				becomes: member(locution("ADP")),
				records: [
					show(
						"um-des-friedens-willen-schwiegen-beide-seiten",
						"Um",
						"um … willen",
					),
				],
			},
			{
				use: "preposition a verb or adjective governs",
				becomes: member(lexeme("ADJ")),
				records: [show("er-ist-stolz-auf-seinen-sohn", "auf", "stolz")],
			},
		],
		rules: [
			"de/governed-preposition-joins-its-governor",
			"de/bracket-particle-or-circumposition",
			"de/core-features-are-identity",
		],
		adrs: ["ADR-0029", "ADR-0032", "ADR-0041"],
		model: modeled,
		gold: "Partial",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "APPRART",
		stts: "preposition fused with an article",
		dumling:
			"A Fusion: the preposition piece is Lexeme ADP, and the article piece is the article member of its noun (ADR 0035)",
		mappings: [
			{
				use: "preposition piece",
				becomes: component(lexeme("ADP")),
				records: [
					show("am-naechsten-morgen-war-alles-anders", "A", "an"),
				],
			},
			{
				use: "article piece",
				becomes: component(lexeme("NOUN")),
				records: [
					show("am-naechsten-morgen-war-alles-anders", "m", "Morgen"),
				],
			},
		],
		rules: ["de/fused-word-pieces", "de/noun-owns-its-article"],
		adrs: ["ADR-0035", "ADR-0040"],
		model: modeled,
		gold: "Yes",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "APPO",
		stts: "postposition",
		dumling:
			"Lexeme ADP, the same Lemma as the adposition standing before its complement",
		loss: "Position: no Lemma or Attestation records that the adposition stands after its complement, since the sentence shows it; the ADP Case Table lists the positions each adposition takes (ADR 0032)",
		mappings: [
			{
				use: "postposition",
				becomes: alone(lexeme("ADP")),
				records: [
					show(
						"den-fluss-entlang-standen-alte-weiden",
						"entlang",
						"entlang",
					),
				],
			},
		],
		rules: ["de/core-features-are-identity"],
		adrs: ["ADR-0032"],
		model: modeled,
		gold: "Yes",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "APZR",
		stts: "right part of a circumposition",
		dumling: "A member of the circumposition Locution ADP (von … an)",
		mappings: [
			{
				use: "right part of a circumposition",
				becomes: member(locution("ADP")),
				records: [
					show(
						"von-der-terrasse-aus-sieht-man-den-see",
						"aus",
						"von … aus",
					),
				],
			},
		],
		rules: ["de/bracket-particle-or-circumposition"],
		adrs: ["ADR-0039"],
		model: modeled,
		gold: "No",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "ART",
		stts: "definite or indefinite article",
		dumling:
			"DET pronType Art, attested as the article member of its Head; never a target of its own",
		mappings: [
			{
				use: "article before its Head",
				becomes: member(lexeme("NOUN")),
				records: [
					show("es-zog-der-wilde-jaegersmann", "der", "Jägersmann"),
				],
			},
		],
		rules: ["de/noun-owns-its-article", "de/only-der-and-ein-are-articles"],
		adrs: ["ADR-0040", "ADR-0041"],
		model: modeled,
		gold: "Yes",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "CARD",
		stts: "cardinal number",
		dumling:
			"Lexeme NUM, in words or digits; digits spell the numeral word",
		mappings: [
			{
				use: "numeral in words",
				becomes: alone(lexeme("NUM")),
				records: [
					show("und-minz-und-maunz-die-schreien", "zweien", "zwei"),
				],
			},
			{
				use: "numeral in digits",
				becomes: alone(lexeme("NUM")),
				records: [
					show(
						"das-trikot-traegt-die-nummer-73",
						"73",
						"dreiundsiebzig",
					),
				],
			},
		],
		rules: ["de/digits-spell-the-numeral"],
		adrs: [],
		model: modeled,
		gold: "Partial",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "FM",
		stts: "foreign material",
		dumling:
			"Foreign family with its source language (ADR 0045); a loan Duden lists is a Lexeme of its Kind",
		mappings: [
			{
				use: "foreign word German grammar doesn't touch",
				becomes: alone({ family: "Foreign", kind: "Foreign" }),
				records: [show("das-ist-sus", "sus", "sus")],
			},
		],
		rules: ["de/foreign-unless-duden-or-german-grammar"],
		adrs: ["ADR-0045"],
		model: modeled,
		gold: "No",
		pipeline: {
			status: "No",
			gaps: [
				{
					gap: "German segment.inUnits has no Foreign route yet",
					issue: 730,
				},
			],
		},
	},
	{
		tag: "ITJ",
		stts: "interjection",
		dumling:
			"Lexeme INTJ; interjection pieces or a routine formula of several words is a Locution INTJ",
		mappings: [
			{
				use: "one-word interjection",
				becomes: alone(lexeme("INTJ")),
				records: [
					show("sieh-einmal-hier-steht-er", "pfui", "pfui"),
					show("fort-geht-nun-die-mutter-und", "wupp", "wupp"),
				],
			},
			{
				use: "part of a multiword interjection or formula",
				becomes: member(locution("INTJ")),
				records: [
					show("guten-tag-ich-habe-einen-termin", "Tag", "guten Tag"),
				],
			},
		],
		rules: [
			"de/interjection-counts-its-words",
			"de/routine-formula-is-intj",
		],
		adrs: ["ADR-0039"],
		model: modeled,
		gold: "Yes",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "KOUI",
		stts: "subordinating conjunction with zu and infinitive",
		dumling:
			"A member of the Locution SCONJ um … zu, ohne … zu, statt … zu or anstatt … zu, whose zu may be a Fusion piece of the infinitive",
		mappings: [
			{
				use: "um, ohne, statt or anstatt before a zu-infinitive",
				becomes: member(locution("SCONJ")),
				records: [
					show(
						"ich-gehe-tomaten-kaufen-um-einen-salat-zu-machen",
						"um",
						"um … zu",
					),
				],
			},
		],
		rules: ["de/correlator-anchors", "de/fused-word-pieces"],
		adrs: ["ADR-0039", "ADR-0035"],
		model: modeled,
		gold: "Yes",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "KOUS",
		stts: "subordinating conjunction with a clause",
		dumling:
			"Lexeme SCONJ; a preposition joined with dass is a Locution SCONJ (ohne dass); sodass is one Lexeme",
		mappings: [
			{
				use: "subordinating conjunction",
				becomes: alone(lexeme("SCONJ")),
				records: [
					show(
						"da-vorne-steht-der-wagen-weil-die-einfahrt-gesperrt-ist",
						"weil",
						"weil",
					),
				],
			},
			{
				use: "preposition joined with dass",
				becomes: member(locution("SCONJ")),
				records: [
					show(
						"sie-ging-ohne-dass-jemand-es-bemerkte",
						"ohne",
						"ohne dass",
					),
				],
			},
		],
		rules: ["de/dass-conjunction"],
		adrs: ["ADR-0039"],
		model: modeled,
		gold: "No",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "KON",
		stts: "coordinating conjunction",
		dumling: "Lexeme CCONJ",
		mappings: [
			{
				use: "coordinating conjunction",
				becomes: alone(lexeme("CCONJ")),
				records: [
					show("die-peitsche-hat-er-mitgebracht", "und", "und"),
				],
			},
		],
		rules: ["de/aber-is-cconj"],
		adrs: [],
		model: modeled,
		gold: "Yes",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "KOKOM",
		stts: "comparison particle",
		dumling:
			"als or wie in its comparison Reading (than, as): CCONJ before a phrase, SCONJ before a clause",
		mappings: [
			{
				use: "before a phrase",
				becomes: alone(lexeme("CCONJ")),
				records: [
					show(
						"der-neue-brunnen-ist-tiefer-als-der-alte",
						"als",
						"als",
					),
				],
			},
			{
				use: "before a clause",
				becomes: alone(lexeme("SCONJ")),
				records: [
					show(
						"der-weg-dauerte-laenger-als-wir-erwartet-hatten",
						"als",
						"als",
					),
				],
			},
		],
		rules: ["de/comparison-als", "de/relative-w-adverb-fills-a-slot"],
		adrs: [],
		model: modeled,
		gold: "No",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "NN",
		stts: "common noun",
		dumling:
			"Lexeme NOUN, owning its article; a substantivized infinitive is a NOUN",
		mappings: [
			{
				use: "common noun",
				becomes: head(lexeme("NOUN")),
				records: [
					show(
						"es-zog-der-wilde-jaegersmann",
						"Jägersmann",
						"Jägersmann",
					),
				],
			},
			{
				use: "substantivized infinitive",
				becomes: head(lexeme("NOUN")),
				records: [
					show("das-rennen-hat-spass-gemacht", "Rennen", "Rennen"),
				],
			},
		],
		rules: [
			"de/noun-owns-its-article",
			"de/substantivized-infinitive-is-a-noun",
		],
		adrs: ["ADR-0040"],
		model: modeled,
		gold: "Yes",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "NE",
		stts: "proper noun",
		dumling:
			"Lexeme PROPN, owning its article; a surname or coined name has no Core gender, and its Surface marks the gender an owned article shows",
		mappings: [
			{
				use: "proper noun",
				becomes: head(lexeme("PROPN")),
				records: [
					show("in-berlin-betreibt-die-bvg-die-u-bahn", "BVG", "BVG"),
				],
			},
		],
		rules: ["de/proper-noun-article", "de/abbreviation-is-one-segment"],
		adrs: ["ADR-0040"],
		model: modeled,
		gold: "Yes",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "PDS",
		stts: "substituting demonstrative pronoun",
		dumling: "Lexeme PRON pronType Dem",
		mappings: [
			{
				use: "demonstrative standing for a noun phrase",
				becomes: alone(lexeme("PRON")),
				records: [
					show("und-minz-und-maunz-die-schreien", "die", "die"),
				],
			},
		],
		rules: ["de/pron-or-det-by-use"],
		adrs: ["ADR-0044"],
		model: modeled,
		gold: "Yes",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "PDAT",
		stts: "attributive demonstrative pronoun",
		dumling: "Lexeme DET pronType Dem",
		mappings: [
			{
				use: "demonstrative before a noun",
				becomes: alone(lexeme("DET")),
				records: [
					show(
						"mit-diesem-plan-schaffen-wir-den-termin",
						"diesem",
						"dieser",
					),
				],
			},
		],
		rules: ["de/pron-or-det-by-use"],
		adrs: ["ADR-0044"],
		model: modeled,
		gold: "No",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "PIS",
		stts: "substituting indefinite pronoun",
		dumling: "Lexeme PRON pronType Ind, Neg or Tot",
		mappings: [
			{
				use: "indefinite standing for a noun phrase",
				becomes: alone(lexeme("PRON")),
				records: [
					show("niemand-wartet-vor-der-tuer", "Niemand", "niemand"),
				],
			},
			{
				use: "viel, wenig or mehr standing for a noun phrase",
				becomes: alone(lexeme("PRON")),
				records: [show("viele-kamen-zu-spaet", "Viele", "viel")],
			},
		],
		rules: ["de/pron-or-det-by-use", "de/quantifier-by-use"],
		adrs: ["ADR-0044"],
		model: modeled,
		gold: "No",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "PIAT",
		stts: "attributive indefinite pronoun without a determiner",
		dumling: "Lexeme DET pronType Ind, Neg or Tot",
		mappings: [
			{
				use: "indefinite before a noun",
				becomes: alone(lexeme("DET")),
				records: [
					show(
						"mit-keinem-wort-erwaehnte-sie-den-plan",
						"keinem",
						"kein",
					),
				],
			},
		],
		rules: ["de/pron-or-det-by-use", "de/quantifier-by-use"],
		adrs: ["ADR-0044"],
		model: modeled,
		gold: "Yes",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "PIDAT",
		stts: "attributive indefinite pronoun with a determiner",
		dumling:
			"Lexeme ADJ beide after a determiner (die beiden Häuser); wenig of ein wenig is part of PRON ein wenig",
		mappings: [
			{
				use: "beide after a determiner (die beiden Häuser)",
				becomes: alone(lexeme("ADJ")),
				records: [
					show(
						"der-musiktempel-zwischen-nadelbaeumen-versteckt-stand",
						"beiden",
						"beide",
					),
				],
			},
			{
				use: "wenig of ein wenig before a noun (ein wenig Wasser)",
				becomes: head(lexeme("PRON")),
				records: [
					show("gib-mir-ein-wenig-zucker", "wenig", "ein wenig"),
				],
			},
		],
		rules: ["de/pron-or-det-by-use", "de/quantifier-by-use"],
		adrs: [],
		model: modeled,
		gold: "No",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "PPER",
		stts: "irreflexive personal pronoun",
		dumling:
			"Lexeme PRON pronType Prs; each case form is its own Lemma, a pillar cell, and a form serving two genders (ihm) is a Masc and a Neut cell, whose Syncretism an open referent attests (ADR 0044, ADR 0046)",
		mappings: [
			{
				use: "personal pronoun",
				becomes: alone(lexeme("PRON")),
				records: [show("die-peitsche-hat-er-mitgebracht", "er", "er")],
			},
		],
		rules: ["de/core-features-are-identity"],
		adrs: ["ADR-0044", "ADR-0046"],
		model: modeled,
		gold: "Yes",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "PPOSS",
		stts: "substituting possessive pronoun",
		dumling:
			"Lexeme PRON poss Yes; after an article, a Lexeme ADJ cited in its weak form, which owns the article (der meine gives meine)",
		mappings: [
			{
				use: "possessive standing for a noun phrase",
				becomes: alone(lexeme("PRON")),
				records: [
					show("der-freie-platz-ist-deiner", "deiner", "deiner"),
				],
			},
			{
				use: "weak possessive after an article (der meine, der meinige)",
				becomes: head(lexeme("ADJ")),
				records: [
					show(
						"dein-garten-ist-gross-der-meine-ist-klein",
						"meine",
						"meine",
					),
				],
			},
		],
		rules: ["de/possessive-after-article", "de/noun-owns-its-article"],
		adrs: ["ADR-0040", "ADR-0044"],
		model: modeled,
		gold: "No",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "PPOSAT",
		stts: "attributive possessive pronoun",
		dumling: "Lexeme DET poss Yes",
		mappings: [
			{
				use: "possessive before a noun",
				becomes: alone(lexeme("DET")),
				records: [
					show(
						"er-vergass-seinen-schluessel-im-buero",
						"seinen",
						"sein",
					),
				],
			},
		],
		rules: ["de/pron-or-det-by-use"],
		adrs: ["ADR-0044"],
		model: modeled,
		gold: "Yes",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "PRELS",
		stts: "substituting relative pronoun",
		dumling: "Lexeme PRON pronType Rel",
		mappings: [
			{
				use: "relative pronoun",
				becomes: alone(lexeme("PRON")),
				records: [
					show(
						"das-ist-die-frau-die-heute-auftritt",
						"die",
						"die",
						2,
					),
				],
			},
		],
		rules: ["de/core-features-are-identity"],
		adrs: ["ADR-0044"],
		model: modeled,
		gold: "No",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "PRELAT",
		stts: "attributive relative pronoun",
		dumling:
			"Lexeme PRON pronType Rel, the genitive cell dessen or deren, one Lemma with the standalone use",
		mappings: [
			{
				use: "dessen or deren before a noun",
				becomes: alone(lexeme("PRON")),
				records: [
					show(
						"der-autor-dessen-buch-fehlt-wartet-draussen",
						"dessen",
						"dessen",
					),
				],
			},
		],
		rules: ["de/pron-or-det-by-use", "de/core-features-are-identity"],
		adrs: ["ADR-0044"],
		model: modeled,
		gold: "No",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "PRF",
		stts: "reflexive personal pronoun",
		dumling:
			"A free reflexive is its personal or sich PRON cell, unmarked for reflexivity; a verb's inherent sich is a member of the verb; einander is PRON Rcp",
		mappings: [
			{
				use: "free reflexive object",
				becomes: alone(lexeme("PRON")),
				records: [
					show(
						"nach-dem-lauf-waeschst-du-dich-gruendlich",
						"dich",
						"dich",
					),
				],
			},
			{
				use: "inherent reflexive",
				becomes: member(lexeme("VERB")),
				records: [
					show(
						"sie-erinnert-sich-an-den-geruch",
						"sich",
						"sich erinnern",
					),
				],
			},
			{
				use: "reciprocal einander",
				becomes: alone(lexeme("PRON")),
				records: [
					show(
						"nach-dem-streit-hoerten-die-beiden-einander-wieder-zu",
						"einander",
						"einander",
					),
				],
			},
		],
		rules: ["de/verb-owns-its-scattered-members"],
		adrs: ["ADR-0044"],
		model: modeled,
		gold: "Partial",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "PWS",
		stts: "substituting interrogative pronoun",
		dumling:
			"Lexeme PRON pronType Int; wer and was are stem Lemmas whose Surfaces mark case (ADR 0044)",
		mappings: [
			{
				use: "interrogative pronoun",
				becomes: alone(lexeme("PRON")),
				records: [show("wer-war-das", "Wer", "wer")],
			},
		],
		rules: ["de/core-features-are-identity"],
		adrs: ["ADR-0044"],
		model: modeled,
		gold: "Yes",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "PWAT",
		stts: "attributive interrogative pronoun",
		dumling:
			"Lexeme DET pronType Int; attributive wessen is an invariant PRON (ADR 0044)",
		mappings: [
			{
				use: "welcher before a noun",
				becomes: alone(lexeme("DET")),
				records: [
					show(
						"welche-nachricht-hat-die-redaktion-zuerst-bestaetigt",
						"Welche",
						"welcher",
					),
				],
			},
			{
				use: "attributive wessen",
				becomes: alone(lexeme("PRON")),
				records: [],
				missing: noRecord("No record has attributive wessen"),
			},
		],
		rules: ["de/pron-or-det-by-use"],
		adrs: ["ADR-0044"],
		model: modeled,
		gold: "No",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "PWAV",
		stts: "adverbial interrogative or relative pronoun",
		dumling:
			"Lexeme ADV, one Lemma per w-adverb with an interrogative and a relative Reading",
		mappings: [
			{
				use: "interrogative w-adverb",
				becomes: alone(lexeme("ADV")),
				records: [
					show("wo-steht-der-reservierte-kleinbus", "Wo", "wo"),
				],
			},
			{
				use: "relative w-adverb",
				becomes: alone(lexeme("ADV")),
				records: [
					show(
						"jetzt-wo-du-da-bist-koennen-wir-anfangen",
						"wo",
						"wo",
					),
				],
			},
		],
		rules: [
			"de/relative-w-adverb-fills-a-slot",
			"de/relative-wo-place-or-time",
		],
		adrs: [],
		model: modeled,
		gold: "No",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "PAV",
		stts: "pronominal adverb",
		dumling:
			"Lexeme ADV from dumcorpus's pronominal-adverb inventory; split, one ADV target with both parts",
		mappings: [
			{
				use: "pronominal adverb in one word",
				becomes: alone(lexeme("ADV")),
				records: [
					show(
						"alles-was-stirbt-hat-vorher-eine-art-ziel-eine-art",
						"daran",
						"daran",
					),
				],
			},
			{
				use: "split pronominal adverb",
				becomes: member(lexeme("ADV")),
				records: [show("wo-hast-du-das-mit-gemacht", "Wo", "womit")],
			},
		],
		rules: [
			"de/pronominal-adverb-stands-alone",
			"de/split-adverb-is-one-target",
		],
		adrs: ["ADR-0021"],
		model: modeled,
		gold: "No",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "PTKZU",
		stts: "zu before an infinitive",
		dumling:
			"Lexeme PART partType Inf; a member of the Locution SCONJ um … zu",
		mappings: [
			{
				use: "zu before an infinitive",
				becomes: alone(lexeme("PART")),
				records: [show("das-ist-schwer-zu-erklaeren", "zu", "zu")],
			},
			{
				use: "zu of um … zu, ohne … zu, statt … zu",
				becomes: member(locution("SCONJ")),
				records: [
					show(
						"ich-gehe-tomaten-kaufen-um-einen-salat-zu-machen",
						"zu",
						"um … zu",
					),
				],
			},
		],
		rules: ["de/bare-infinitive-zu", "de/correlator-anchors"],
		adrs: ["ADR-0039"],
		model: modeled,
		gold: "Yes",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "PTKNEG",
		stts: "negation particle",
		dumling: "Lexeme PART polarity Neg",
		mappings: [
			{
				use: "nicht",
				becomes: alone(lexeme("PART")),
				records: [show("das-ist-nicht-mein-problem", "nicht", "nicht")],
			},
		],
		rules: ["de/nicht-is-part"],
		adrs: [],
		model: modeled,
		gold: "Yes",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "PTKVZ",
		stts: "separated verb particle",
		dumling: "A member of the VERB target; hasSepPrefix is Core",
		mappings: [
			{
				use: "separated verb particle",
				becomes: member(lexeme("VERB")),
				records: [
					show("der-laster-fuhr-das-schild-um", "um", "umfahren"),
				],
			},
		],
		rules: ["de/verb-owns-its-scattered-members", "de/verb-core-features"],
		adrs: ["ADR-0022"],
		model: modeled,
		gold: "Yes",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "PTKANT",
		stts: "answer particle",
		dumling: "Lexeme INTJ partType Res",
		mappings: [
			{
				use: "answer ja, nein or doch",
				becomes: alone(lexeme("INTJ")),
				records: [
					show("sie-fragte-ob-er-komme-er-antwortete-ja", "Ja", "ja"),
				],
			},
			{
				use: "answer quoted or embedded in a clause (antwortete mit ja)",
				becomes: alone(lexeme("INTJ")),
				records: [
					show(
						"auf-die-kontrollfrage-antwortete-sie-klar-mit-ja",
						"ja",
						"ja",
					),
				],
			},
		],
		rules: ["de/interjection-counts-its-words"],
		adrs: [],
		model: modeled,
		gold: "No",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "PTKA",
		stts: "particle with an adjective or adverb",
		dumling:
			"am before a superlative is a DegreeMarker member of the ADJ or ADV target; degree zu is a single-member ADV",
		mappings: [
			{
				use: "am before a superlative",
				becomes: member(lexeme("ADJ")),
				records: [
					show(
						"von-allen-arbeitet-sie-am-sorgfaeltigsten",
						"am",
						"sorgfältig",
					),
				],
			},
			{
				use: "zu grading an adjective (zu schnell)",
				becomes: alone(lexeme("ADV")),
				records: [
					show("das-kleid-ist-zu-gross", "zu", "zu"),
					show("jetzt-schien-die-sonne-gar-zu-sehr", "zu", "zu", 2),
				],
			},
		],
		rules: ["de/fused-word-pieces", "de/degree-word-is-adv"],
		adrs: ["ADR-0040"],
		model: modeled,
		gold: "Partial",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "TRUNC",
		stts: "truncated word, the first part of a suspended compound",
		dumling:
			"Completed to the full compound: Kinder- in Kinder- und Jugendbücher is NOUN Kinderbuch; without a right conjunct, No Target",
		mappings: [
			{
				use: "noun fragment in an und or oder pair",
				becomes: alone(lexeme("NOUN")),
				records: [
					show(
						"sie-verkauft-kinder-und-jugendbuecher",
						"Kinder-",
						"Kinderbuch",
					),
				],
			},
			{
				use: "fragment without a right conjunct",
				becomes: { role: "NoTarget" },
				records: [show("auf-dem-zettel-steht-kinder", "Kinder-")],
			},
			{
				use: "fragment of a verb or adjective (be- und entladen)",
				becomes: alone(lexeme("VERB")),
				records: [],
				missing: noRecord("No Rule completes a fragment outside nouns"),
			},
		],
		rules: ["de/suspended-compound-completion", "de/no-target"],
		adrs: ["ADR-0003"],
		model: partial({
			gap: "No Rule completes a fragment outside nouns (be- und entladen)",
		}),
		gold: "No",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "VVFIN",
		stts: "finite full verb",
		dumling:
			"Lexeme VERB verbForm Fin, owning its auxiliaries and particles",
		mappings: [
			{
				use: "finite full verb",
				becomes: head(lexeme("VERB")),
				records: [
					show(
						"er-lief-erst-nach-links-und-dann-hinaus",
						"lief",
						"laufen",
					),
				],
			},
		],
		rules: [
			"de/verbal-surface-is-whole",
			"de/verb-owns-its-scattered-members",
		],
		adrs: ["ADR-0022"],
		model: modeled,
		gold: "Yes",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "VVIMP",
		stts: "imperative full verb",
		dumling: "Lexeme VERB mood Imp",
		mappings: [
			{
				use: "imperative",
				becomes: head(lexeme("VERB")),
				records: [show("sieh-einmal-hier-steht-er", "Sieh", "sehen")],
			},
		],
		rules: ["de/verbal-surface-is-whole"],
		adrs: ["ADR-0022"],
		model: modeled,
		gold: "No",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "VVINF",
		stts: "infinitive full verb",
		dumling:
			"Lexeme VERB verbForm Inf; the infinitive a modal governs is a VERB target of its own",
		mappings: [
			{
				use: "infinitive after a modal",
				becomes: head(lexeme("VERB")),
				records: [
					show("er-muss-heute-arbeiten", "arbeiten", "arbeiten"),
				],
			},
		],
		rules: ["de/modal-is-a-verb", "de/verbal-surface-is-whole"],
		adrs: ["ADR-0026"],
		model: modeled,
		gold: "Yes",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "VVIZU",
		stts: "infinitive with incorporated zu",
		dumling:
			"A Fusion of the verb's pieces and zu: Lexeme VERB verbForm Inf over its prefix and stem pieces, and the zu piece PART zu or the zu of um … zu, ohne … zu or statt … zu",
		mappings: [
			{
				use: "the prefix and stem pieces of the infinitive",
				becomes: component(lexeme("VERB")),
				records: [
					show(
						"er-versucht-hinauszulaufen",
						"hinaus",
						"hinauslaufen",
					),
				],
			},
			{
				use: "the incorporated zu, without um, ohne or statt",
				becomes: component(lexeme("PART")),
				records: [show("er-versucht-hinauszulaufen", "zu", "zu")],
			},
			{
				use: "the incorporated zu of um … zu, ohne … zu or statt … zu",
				becomes: component(locution("SCONJ")),
				records: [],
				missing: noRecord(
					"No record has a correlative whose zu is incorporated (ohne … abzuspannen)",
				),
			},
		],
		rules: [
			"de/fused-word-pieces",
			"de/bare-infinitive-zu",
			"de/verb-core-features",
		],
		adrs: ["ADR-0022", "ADR-0035"],
		model: modeled,
		gold: "Partial",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "VVPP",
		stts: "past participle of a full verb",
		dumling:
			"In a perfect or passive, the VERB target owning its auxiliary; describing a state, ADJ (ADR 0036)",
		mappings: [
			{
				use: "participle in a perfect or passive",
				becomes: head(lexeme("VERB")),
				records: [
					show(
						"die-peitsche-hat-er-mitgebracht",
						"mitgebracht",
						"mitbringen",
					),
				],
			},
			{
				use: "participle describing a state",
				becomes: alone(lexeme("ADJ")),
				records: [
					show(
						"der-brief-ist-schon-geschrieben",
						"geschrieben",
						"geschrieben",
					),
				],
			},
		],
		rules: [
			"de/verbal-participle",
			"de/sein-perfect-or-copula",
			"de/participial-adjective",
		],
		adrs: ["ADR-0036", "ADR-0022"],
		model: modeled,
		gold: "Yes",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "VAFIN",
		stts: "finite auxiliary",
		dumling:
			"An auxiliary is a member of the VERB it serves (ADR 0022); copular sein and haben 'own' are VERBs",
		mappings: [
			{
				use: "auxiliary of a perfect, future or passive",
				becomes: member(lexeme("VERB")),
				records: [
					show(
						"die-peitsche-hat-er-mitgebracht",
						"hat",
						"mitbringen",
					),
				],
			},
			{
				use: "copula",
				becomes: alone(lexeme("VERB")),
				records: [show("die-tuer-ist-geschlossen", "ist", "sein")],
			},
		],
		rules: [
			"de/auxiliary-joins-the-verb-it-serves",
			"de/copula-stays-apart",
		],
		adrs: ["ADR-0022", "ADR-0026"],
		model: modeled,
		gold: "Yes",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "VAIMP",
		stts: "imperative auxiliary",
		dumling: "Copular sein in the imperative is a VERB with mood Imp",
		mappings: [
			{
				use: "imperative sein",
				becomes: alone(lexeme("VERB")),
				records: [show("sei-bitte-vorsichtig", "Sei", "sein")],
			},
		],
		rules: ["de/copula-stays-apart"],
		adrs: ["ADR-0026"],
		model: modeled,
		gold: "No",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "VAINF",
		stts: "infinitive auxiliary",
		dumling: "A member of the VERB it serves",
		mappings: [
			{
				use: "infinitive of a passive or perfect auxiliary",
				becomes: member(lexeme("VERB")),
				records: [
					show(
						"die-impfstofflieferung-fuer-die-eu-soll-in-den",
						"werden",
						"herstellen",
					),
				],
			},
		],
		rules: ["de/auxiliary-joins-the-verb-it-serves", "de/partial-coverage"],
		adrs: ["ADR-0022", "ADR-0041"],
		model: modeled,
		gold: "No",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "VAPP",
		stts: "past participle of an auxiliary",
		dumling:
			"gewesen of copular sein is the VERB owning its auxiliary; passive worden is a member of the VERB",
		mappings: [
			{
				use: "gewesen of a copula",
				becomes: head(lexeme("VERB")),
				records: [show("das-waere-schoen-gewesen", "gewesen", "sein")],
			},
			{
				use: "passive worden",
				becomes: member(lexeme("VERB")),
				records: [
					show(
						"in-suedkorea-ist-der-junge-musiker-und-schauspieler-cha-in",
						"worden",
						"auffinden",
					),
				],
			},
		],
		rules: [
			"de/auxiliary-joins-the-verb-it-serves",
			"de/copula-stays-apart",
		],
		adrs: ["ADR-0022"],
		model: modeled,
		gold: "Partial",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "VMFIN",
		stts: "finite modal verb",
		dumling: "Lexeme VERB, a modal by dumcorpus's modal list (ADR 0026)",
		mappings: [
			{
				use: "finite modal",
				becomes: head(lexeme("VERB")),
				records: [show("er-muss-heute-arbeiten", "muss", "müssen")],
			},
		],
		rules: ["de/modal-is-a-verb"],
		adrs: ["ADR-0026"],
		model: modeled,
		gold: "Yes",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "VMINF",
		stts: "infinitive modal verb",
		dumling:
			"Lexeme VERB modal owning its auxiliary: hat … schreiben müssen is [hat, müssen]",
		mappings: [
			{
				use: "modal infinitive in a perfect (Ersatzinfinitiv)",
				becomes: head(lexeme("VERB")),
				records: [],
				missing: noRecord("No record has hat … müssen"),
			},
		],
		rules: ["de/modal-is-a-verb"],
		adrs: ["ADR-0026"],
		model: modeled,
		gold: "No",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "VMPP",
		stts: "past participle of a modal verb",
		dumling: "Lexeme VERB modal, verbForm Part, owning its auxiliary",
		mappings: [
			{
				use: "modal participle (hat gemusst)",
				becomes: head(lexeme("VERB")),
				records: [],
				missing: noRecord("No record has a modal participle"),
			},
		],
		rules: ["de/modal-is-a-verb"],
		adrs: ["ADR-0026"],
		model: modeled,
		gold: "No",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "XY",
		stts: "non-word",
		dumling:
			"Split by the real Kind: SYM, ADJ (3D), Foreign (w00t), or No Target for a nonce word (ADR 0045)",
		mappings: [
			{
				use: "symbol",
				becomes: alone(lexeme("SYM")),
				records: [
					show(
						"in-der-herleitung-wird-die-reihe-mit-notiert",
						"∑",
						"∑",
					),
				],
			},
			{
				use: "letters and digits that are an adjective",
				becomes: alone(lexeme("ADJ")),
				records: [
					show(
						"die-uneinheitlich-annotierte-spalte-enthielt-den-eintrag-3d",
						"3D",
						"3D",
					),
				],
			},
			{
				use: "foreign non-word",
				becomes: alone({ family: "Foreign", kind: "Foreign" }),
				records: [
					show(
						"der-alte-forenbeitrag-endete-mit-dem-slangausdruck-w00t",
						"w00t",
						"w00t",
					),
				],
			},
			{
				use: "nonce word",
				becomes: { role: "NoTarget" },
				records: [show("das-wetter-ist-xqzt", "xqzt")],
			},
			{
				use: "a score or ratio (3:7)",
				becomes: alone(lexeme("SYM")),
				records: [],
				missing: noRecord("No Rule covers a token like 3:7"),
			},
		],
		rules: ["de/no-target", "de/foreign-unless-duden-or-german-grammar"],
		adrs: ["ADR-0045"],
		model: partial({ gap: "No Rule covers a token like 3:7" }),
		gold: "No",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "$,",
		stts: "comma",
		dumling:
			"A Punctuation Segment, never a target; Lexeme PUNCT exists but no record targets it",
		mappings: [
			{
				use: "comma",
				becomes: { role: "Punctuation" },
				records: [
					show("es-brennt-die-hand-es-brennt-das-haar", ","),
					show("er-versucht-hinauszulaufen", ","),
				],
			},
		],
		rules: [],
		adrs: [],
		model: modeled,
		gold: "Yes",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "$.",
		stts: "sentence-final punctuation",
		dumling: "A Punctuation Segment",
		mappings: [
			{
				use: "sentence-final punctuation",
				becomes: { role: "Punctuation" },
				records: [show("die-tuer-ist-geschlossen", ".")],
			},
		],
		rules: [],
		adrs: [],
		model: modeled,
		gold: "Yes",
		pipeline: waitsOnDumgen,
	},
	{
		tag: "$(",
		stts: "other punctuation within a sentence",
		dumling: "A Punctuation Segment",
		mappings: [
			{
				use: "quotation mark, bracket or dash",
				becomes: { role: "Punctuation" },
				records: [
					show("sie-fragte-kommst-du-nicht-er-antwortete-doch", "„"),
				],
			},
		],
		rules: [],
		adrs: [],
		model: modeled,
		gold: "No",
		pipeline: waitsOnDumgen,
	},
];
