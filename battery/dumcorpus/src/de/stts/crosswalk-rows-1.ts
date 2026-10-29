import {
	alone,
	component,
	head,
	lexeme,
	locution,
	member,
	modeled,
	show,
	waitsOnDumgen,
} from "./crosswalk-parts.js";
import type { SttsRow } from "./types.js";

/** The German STTS crosswalk rows ADJA to PDS, in STTS order. */
export const sttsRowsAdjaToPds: readonly SttsRow[] = [
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
				use: "sentence adverb or degree word whose sense DWDS files under its Adjektiv (offenbar 'apparently', ziemlich 'fairly', früh 'in the morning')",
				becomes: alone(lexeme("ADJ")),
				records: [
					show(
						"er-schadet-ja-offenbar-niemandem-aber-die-vorstellung-dass",
						"offenbar",
						"offenbar",
					),
					show("es-ist-schon-ziemlich-spaet", "ziemlich", "ziemlich"),
				],
			},
			{
				use: "degree word whose sense DWDS labels Adv. (ganz 'quite')",
				becomes: alone(lexeme("ADV")),
				records: [
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
			"de/degree-word-stands-alone",
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
			"de/degree-word-stands-alone",
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
];
