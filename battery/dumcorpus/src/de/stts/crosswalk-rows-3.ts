import {
	alone,
	component,
	head,
	lexeme,
	locution,
	member,
	modeled,
	noRecord,
	partial,
	show,
	waitsOnDumgen,
} from "./crosswalk-parts.js";
import type { SttsRow } from "./types.js";

/** The German STTS crosswalk rows PTKA to $(, in STTS order. */
export const sttsRowsPtkaToPunctuation: readonly SttsRow[] = [
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
		rules: ["de/fused-word-pieces", "de/degree-word-stands-alone"],
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
