import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { type CoreFeatures, citationCase, inflectionCase } from "./builders";

const fem = { abbr: null, foreign: null, gender: "Fem" } as const;
const masc = { abbr: null, foreign: null, gender: "Masc" } as const;
const neut = { abbr: null, foreign: null, gender: "Neut" } as const;
const unknown = { abbr: null, foreign: null, gender: null } as const;
const infl = (
	caseValue: "Acc" | "Dat" | "Gen" | "Nom" | null,
	number: "Plur" | "Sing" | null,
) => ({ case: caseValue, number });

export const properNounCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-propn-demo-person-maria": inflectionCase(
			"<TARGET>Maria</TARGET> eröffnet heute die Ausstellung.",
			["Maria"],
			"Maria",
			infl("Nom", "Sing"),
			{ coreFeatures: fem },
		),
		"grammar-de-propn-demo-place-berlin": inflectionCase(
			"Wir treffen uns morgen in <TARGET>Berlin</TARGET>.",
			["Berlin"],
			"Berlin",
			infl("Dat", "Sing"),
			{ coreFeatures: neut },
		),
		"grammar-de-propn-demo-multi-angela-merkel": inflectionCase(
			"<TARGET>Angela</TARGET> <TARGET>Merkel</TARGET> hielt am Abend eine Rede.",
			["Angela", "Merkel"],
			"Angela Merkel",
			infl("Nom", "Sing"),
			{
				coreFeatures: fem,
				explanation:
					"Both supplied members form one complete classified name; preserve their order and resolve one PROPN Surface.",
			},
		),
		"grammar-de-propn-demo-genitive-hans": inflectionCase(
			"<TARGET>Hans</TARGET>' Fahrrad steht noch vor dem Haus.",
			["Hans"],
			"Hans",
			infl("Gen", "Sing"),
			{ coreFeatures: masc },
		),
		"grammar-de-propn-demo-acronym-nato": inflectionCase(
			"Die <TARGET>NATO</TARGET> berät heute über den Antrag.",
			["NATO"],
			"NATO",
			infl("Nom", "Sing"),
			{ coreFeatures: { abbr: "Yes", foreign: null, gender: "Fem" } },
		),
		"grammar-de-propn-demo-typo-koelnn": inflectionCase(
			"Der Zug hält morgen in <TARGET>Kölnn</TARGET>.",
			["Kölnn"],
			"Köln",
			infl("Dat", "Sing"),
			{
				normalizedMembers: ["Köln"],
				orthographies: ["Typo"],
				coreFeatures: neut,
			},
		),
		"grammar-de-propn-demo-citation-work-tonio-kroeger": citationCase(
			"Im Werkverzeichnis steht der Titel „<TARGET>Tonio</TARGET> <TARGET>Kröger</TARGET>“.",
			["Tonio", "Kröger"],
			"Tonio Kröger",
			{
				coreFeatures: masc,
				explanation:
					"The surrounding common noun Titel bears sentence case; the separately quoted work-name mention is Citation rather than an accusative name occurrence.",
			},
		),
		"grammar-de-propn-demo-org-unesco": inflectionCase(
			"Die <TARGET>UNESCO</TARGET> fördert das neue Bildungsprojekt.",
			["UNESCO"],
			"UNESCO",
			infl("Nom", "Sing"),
			{
				coreFeatures: { abbr: "Yes", foreign: null, gender: "Fem" },
				explanation:
					"An abbreviated organization in an ordinary subject occurrence is Inflection; its acronym shape never turns the contextual use into Citation.",
			},
		),
		"grammar-de-propn-demo-vocative-clara": inflectionCase(
			"Hör bitte kurz zu, <TARGET>Clara</TARGET>!",
			["Clara"],
			"Clara",
			infl(null, "Sing"),
			{
				coreFeatures: fem,
				explanation:
					"A direct-address occurrence is contextual Inflection with singular Number and null Case, never Citation.",
			},
		),
		"grammar-de-propn-demo-stylized-ebay": inflectionCase(
			"Der Bericht erwähnt <TARGET>eBay</TARGET> nur am Rand.",
			["eBay"],
			"eBay",
			infl("Acc", "Sing"),
			{
				coreFeatures: unknown,
				explanation:
					"Registered styling is Canonical, ordinary contextual use is Inflection, and absent reliable agreement the name's gender stays null.",
			},
		),
		"grammar-de-propn-demo-org-rotes-kreuz": inflectionCase(
			"Das <TARGET>Rote</TARGET> <TARGET>Kreuz</TARGET> eröffnete eine neue Beratungsstelle.",
			["Rote", "Kreuz"],
			"Rotes Kreuz",
			infl("Nom", "Sing"),
			{
				coreFeatures: neut,
				explanation:
					"An ordinary multi-member organization subject is Inflection; its contextual article and verb establish nominative singular.",
			},
		),
		"grammar-de-propn-demo-work-physiker": inflectionCase(
			"Das Theater zeigt heute <TARGET>Die</TARGET> <TARGET>Physiker</TARGET>.",
			["Die", "Physiker"],
			"Die Physiker",
			infl("Acc", "Sing"),
			{
				coreFeatures: masc,
				explanation:
					"A supplied article inside an ordinary contextual work-title object remains a member and the title is Inflection, not a Citation mention.",
			},
		),
		"grammar-de-propn-demo-integrated-lego": inflectionCase(
			"Das Kind sortiert das <TARGET>LEGO</TARGET> nach Farben.",
			["LEGO"],
			"LEGO",
			infl("Acc", "Sing"),
			{
				coreFeatures: { abbr: null, foreign: null, gender: "Neut" },
				explanation:
					"An established product name in German is not Foreign merely because its brand origin is non-German.",
			},
		),

		"grammar-de-propn-dev-person-anna-acc": inflectionCase(
			"Die Redaktion interviewt <TARGET>Anna</TARGET> am Freitag.",
			["Anna"],
			"Anna",
			infl("Acc", "Sing"),
			{ coreFeatures: fem },
		),
		"grammar-de-propn-dev-person-peters-gen": inflectionCase(
			"<TARGET>Peters</TARGET> neuer Roman erscheint im Herbst.",
			["Peters"],
			"Peter",
			infl("Gen", "Sing"),
			{ coreFeatures: masc },
		),
		"grammar-de-propn-dev-place-schweiz": inflectionCase(
			"Im Sommer besucht sie die <TARGET>Schweiz</TARGET>.",
			["Schweiz"],
			"Schweiz",
			infl("Acc", "Sing"),
			{ coreFeatures: fem },
		),
		"grammar-de-propn-dev-place-niederlanden": inflectionCase(
			"Seit April arbeitet er in den <TARGET>Niederlanden</TARGET>.",
			["Niederlanden"],
			"Niederlande",
			infl("Dat", "Plur"),
			{ coreFeatures: unknown },
		),
		"grammar-de-propn-dev-org-deutsche-bank": inflectionCase(
			"Die <TARGET>Deutsche</TARGET> <TARGET>Bank</TARGET> veröffentlichte den Bericht.",
			["Deutsche", "Bank"],
			"Deutsche Bank",
			infl("Nom", "Sing"),
			{
				coreFeatures: fem,
				explanation:
					"Upstream supplied both name members; Deutsche is not reclassified as ADJ and Bank is not repaired to a common NOUN.",
			},
		),
		"grammar-de-propn-dev-org-spd": inflectionCase(
			"Die <TARGET>SPD</TARGET> beschloss ein neues Programm.",
			["SPD"],
			"SPD",
			infl("Nom", "Sing"),
			{ coreFeatures: { abbr: "Yes", foreign: null, gender: "Fem" } },
		),
		"grammar-de-propn-dev-product-iphone": inflectionCase(
			"Sie testet das neue <TARGET>iPhone</TARGET> im Labor.",
			["iPhone"],
			"iPhone",
			infl("Acc", "Sing"),
			{
				coreFeatures: neut,
				explanation:
					"Registered internal capitalization is Standard and must not be regularized.",
			},
		),
		"grammar-de-propn-dev-product-adidas": inflectionCase(
			"Die Kampagne stellt <TARGET>adidas</TARGET> in den Mittelpunkt.",
			["adidas"],
			"adidas",
			infl("Acc", "Sing"),
			{ coreFeatures: unknown },
		),
		"grammar-de-propn-dev-work-zauberfloete": inflectionCase(
			"Am Samstag sehen wir <TARGET>Die</TARGET> <TARGET>Zauberflöte</TARGET> in der Oper.",
			["Die", "Zauberflöte"],
			"Die Zauberflöte",
			infl("Acc", "Sing"),
			{
				coreFeatures: fem,
				explanation:
					"The article is a supplied member of the fixed work title, not a neighboring DET to remove.",
			},
		),
		"grammar-de-propn-dev-work-prozess": citationCase(
			"Der Katalog nennt den Titel „<TARGET>Der</TARGET> <TARGET>Prozess</TARGET>“.",
			["Der", "Prozess"],
			"Der Prozess",
			{ coreFeatures: masc },
		),
		"grammar-de-propn-dev-citation-hamburg": citationCase(
			"Im Register steht der Namenseintrag <TARGET>Hamburg</TARGET>.",
			["Hamburg"],
			"Hamburg",
			{ coreFeatures: neut },
		),
		"grammar-de-propn-dev-vocative-lukas": inflectionCase(
			"Bitte komm herein, <TARGET>Lukas</TARGET>!",
			["Lukas"],
			"Lukas",
			infl(null, "Sing"),
			{ coreFeatures: masc },
		),
		"grammar-de-propn-dev-foreign-new-york": inflectionCase(
			"Sie lebt seit zwei Jahren in <TARGET>New</TARGET> <TARGET>York</TARGET>.",
			["New", "York"],
			"New York",
			infl("Dat", "Sing"),
			{ coreFeatures: { abbr: null, foreign: "Yes", gender: "Neut" } },
		),
		"grammar-de-propn-dev-transliteration-kyjiw": inflectionCase(
			"Im ukrainischsprachigen Teil sagt die Delegation, sie reise morgen nach <TARGET>Kyjiw</TARGET>.",
			["Kyjiw"],
			"Kyjiw",
			infl("Acc", "Sing"),
			{ coreFeatures: { abbr: null, foreign: "Yes", gender: "Neut" } },
		),
		"grammar-de-propn-dev-variant-pressburg": inflectionCase(
			"Der Reisebericht verwendet den historischen deutschen Namen <TARGET>Pressburg</TARGET> für Bratislava.",
			["Pressburg"],
			"Bratislava",
			infl("Acc", "Sing"),
			{
				spelling: "Variant",
				historicalStatus: "Archaic",
				coreFeatures: neut,
			},
		),
		"grammar-de-propn-dev-typo-muenchn": inflectionCase(
			"Die Konferenz findet in <TARGET>Münchn</TARGET> statt.",
			["Münchn"],
			"München",
			infl("Dat", "Sing"),
			{
				normalizedMembers: ["München"],
				orthographies: ["Typo"],
				coreFeatures: neut,
			},
		),
		"grammar-de-propn-dev-casing-berLin": inflectionCase(
			"Die Messe wurde nach <TARGET>berLin</TARGET> verlegt.",
			["berLin"],
			"Berlin",
			infl("Acc", "Sing"),
			{
				normalizedMembers: ["Berlin"],
				orthographies: ["Typo"],
				coreFeatures: neut,
			},
		),
		"grammar-de-propn-dev-multi-johann-goethe": inflectionCase(
			"Die Universität ehrt <TARGET>Johann</TARGET> <TARGET>Wolfgang</TARGET> <TARGET>von</TARGET> <TARGET>Goethe</TARGET> mit einer Ausstellung.",
			["Johann", "Wolfgang", "von", "Goethe"],
			"Johann Wolfgang von Goethe",
			infl("Acc", "Sing"),
			{ coreFeatures: masc },
		),
		"grammar-de-propn-dev-neighbor-city-berlin": inflectionCase(
			"Die Stadt <TARGET>Berlin</TARGET> wächst weiterhin schnell.",
			["Berlin"],
			"Berlin",
			infl("Nom", "Sing"),
			{
				coreFeatures: neut,
				explanation:
					"The unmarked common NOUN Stadt is a neighbor, not a member to add.",
			},
		),
		"grammar-de-propn-dev-repeated-second-peter": inflectionCase(
			"Peter kam zuerst, doch <TARGET>Peter</TARGET> ging als Letzter.",
			["Peter"],
			"Peter",
			infl("Nom", "Sing"),
			{ coreFeatures: masc },
		),
		"grammar-de-propn-dev-plural-alpen": inflectionCase(
			"Im Winter fahren sie in die <TARGET>Alpen</TARGET>.",
			["Alpen"],
			"Alpen",
			infl("Acc", "Plur"),
			{ coreFeatures: unknown },
		),

		"grammar-de-propn-accept-v3-person-leonie": inflectionCase(
			"Die Jury dankt <TARGET>Leonie</TARGET> für ihren Einsatz.",
			["Leonie"],
			"Leonie",
			infl("Dat", "Sing"),
			{ coreFeatures: fem },
		),
		"grammar-de-propn-accept-v3-place-saarland": inflectionCase(
			"<TARGET>Saarland</TARGET> meldet steigende Besucherzahlen.",
			["Saarland"],
			"Saarland",
			infl("Nom", "Sing"),
			{ coreFeatures: neut },
		),
		"grammar-de-propn-accept-v3-multi-garmisch-partenkirchen":
			inflectionCase(
				"Der Bus durchquert <TARGET>Garmisch</TARGET>-<TARGET>Partenkirchen</TARGET> am Nachmittag.",
				["Garmisch", "Partenkirchen"],
				"Garmisch-Partenkirchen",
				infl("Acc", "Sing"),
				{ coreFeatures: neut },
			),
		"grammar-de-propn-accept-v3-org-zdf": inflectionCase(
			"Das <TARGET>ZDF</TARGET> überträgt die Debatte live.",
			["ZDF"],
			"ZDF",
			infl("Nom", "Sing"),
			{ coreFeatures: { abbr: "Yes", foreign: null, gender: "Neut" } },
		),
		"grammar-de-propn-accept-v3-product-thermomix": inflectionCase(
			"Die Werkstatt repariert den <TARGET>Thermomix</TARGET> noch heute.",
			["Thermomix"],
			"Thermomix",
			infl("Acc", "Sing"),
			{ coreFeatures: masc },
		),
		"grammar-de-propn-accept-v3-work-nibelungenlied": inflectionCase(
			"Die Klasse interpretiert das <TARGET>Nibelungenlied</TARGET>.",
			["Nibelungenlied"],
			"Nibelungenlied",
			infl("Acc", "Sing"),
			{ coreFeatures: neut },
		),
		"grammar-de-propn-accept-v3-citation-mainz": citationCase(
			"Das Namenverzeichnis enthält den Ortsnamen <TARGET>Mainz</TARGET>.",
			["Mainz"],
			"Mainz",
			{ coreFeatures: neut },
		),
		"grammar-de-propn-accept-v3-foreign-rio-de-janeiro": inflectionCase(
			"Im portugiesischsprachigen Gespräch erzählt sie von <TARGET>Rio</TARGET> <TARGET>de</TARGET> <TARGET>Janeiro</TARGET>.",
			["Rio", "de", "Janeiro"],
			"Rio de Janeiro",
			infl("Dat", "Sing"),
			{ coreFeatures: { abbr: null, foreign: "Yes", gender: "Neut" } },
		),
		"grammar-de-propn-accept-v3-genitive-max": inflectionCase(
			"<TARGET>Max</TARGET>' Fahrrad lehnt an der Mauer.",
			["Max"],
			"Max",
			infl("Gen", "Sing"),
			{ coreFeatures: masc },
		),
		"grammar-de-propn-accept-v3-typo-hannnover": inflectionCase(
			"Die Messe findet dieses Jahr in <TARGET>Hannnover</TARGET> statt.",
			["Hannnover"],
			"Hannover",
			infl("Dat", "Sing"),
			{
				normalizedMembers: ["Hannover"],
				orthographies: ["Typo"],
				coreFeatures: neut,
			},
		),
		"grammar-de-propn-accept-v3-variant-preussen": citationCase(
			"Das Wörterbuch dokumentiert <TARGET>Preussen</TARGET> als historische Schreibvariante von Preußen.",
			["Preussen"],
			"Preußen",
			{
				spelling: "Variant",
				historicalStatus: "Archaic",
				coreFeatures: neut,
			},
		),
		"grammar-de-propn-accept-v3-plural-balearen": inflectionCase(
			"Im Oktober besuchen sie die <TARGET>Balearen</TARGET>.",
			["Balearen"],
			"Balearen",
			infl("Acc", "Plur"),
			{ coreFeatures: unknown },
		),
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});

export type ProperNounCoreFeatures = CoreFeatures;
