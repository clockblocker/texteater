import {
	alone,
	head,
	lexeme,
	locution,
	member,
	modeled,
	noRecord,
	reflexive,
	show,
	waitsOnDumgen,
} from "./crosswalk-parts.js";
import type { SttsRow } from "./types.js";

/** The German STTS crosswalk rows PDAT to PTKANT, in STTS order. */
export const sttsRowsPdatToPtkant: readonly SttsRow[] = [
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
			"A free reflexive is its personal or sich PRON cell, unmarked for reflexivity; a verb's inherent sich is a member of the verb, named in its valencyEvidence, and fills the Reading's Reflexive Slot; einander is PRON Rcp",
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
				becomes: reflexive(lexeme("VERB")),
				records: [
					show("sie-erinnert-sich-an-den-geruch", "sich", "erinnern"),
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
		adrs: ["ADR-0044", "ADR-0052"],
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
];
