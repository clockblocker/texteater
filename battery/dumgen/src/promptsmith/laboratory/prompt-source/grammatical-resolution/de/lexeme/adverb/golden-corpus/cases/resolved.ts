import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { citationCase, inflectionCase, unmarkedCoreFeatures } from "./builders";

const demonstrative = {
	...unmarkedCoreFeatures,
	pronType: "Dem" as const,
};
const indefinite = {
	...unmarkedCoreFeatures,
	pronType: "Ind" as const,
};
const interrogative = {
	...unmarkedCoreFeatures,
	pronType: "Int" as const,
};
const relative = {
	...unmarkedCoreFeatures,
	pronType: "Rel" as const,
};
const negative = {
	...unmarkedCoreFeatures,
	pronType: "Neg" as const,
};

export const resolvedCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-adv-demo-temporal-heute": citationCase(
			"Wir treffen uns <TARGET>heute</TARGET> vor der Bibliothek.",
			["heute"],
			"heute",
			unmarkedCoreFeatures,
			{
				explanation:
					"The classified temporal adverb is invariant and therefore uses Citation.",
			},
		),
		"grammar-de-adv-demo-demonstrative-dazu": citationCase(
			"<TARGET>Dazu</TARGET> brauchen wir noch einen Schlüssel.",
			["Dazu"],
			"dazu",
			demonstrative,
			{
				normalizedMembers: ["dazu"],
				explanation:
					"Ordinary sentence-initial capitalization is Standard; the pronominal adverb has PronType Dem.",
			},
		),
		"grammar-de-adv-demo-interrogative-warum": citationCase(
			"<TARGET>Warum</TARGET> bleibt das Fenster heute geschlossen?",
			["Warum"],
			"warum",
			interrogative,
			{
				normalizedMembers: ["warum"],
				explanation:
					"The direct question establishes the interrogative pronominal identity.",
			},
		),
		"grammar-de-adv-demo-comparative-lieber": inflectionCase(
			"Mina fährt <TARGET>lieber</TARGET> mit dem Zug als mit dem Auto.",
			["lieber"],
			"gern",
			"Cmp",
			unmarkedCoreFeatures,
			{
				explanation:
					"Lieber is the suppletive comparative Surface of the ADV Lemma gern.",
			},
		),
		"grammar-de-adv-demo-superlative-am-liebsten": inflectionCase(
			"Mina reist <TARGET>am</TARGET> <TARGET>liebsten</TARGET> im Frühling.",
			["am", "liebsten"],
			"gern",
			"Sup",
			unmarkedCoreFeatures,
			{
				explanation:
					"Both authoritative members form the complete periphrastic superlative Surface.",
			},
		),
		"grammar-de-adv-demo-typo-gester": citationCase(
			"Der Regionalzug kam <TARGET>gester</TARGET> pünktlich an.",
			["gester"],
			"gestern",
			unmarkedCoreFeatures,
			{
				orthographies: ["Typo"],
				normalizedMembers: ["gestern"],
				explanation:
					"The missing final n is repaired in normalizedMembers while the occurrence is marked Typo.",
			},
		),

		"grammar-de-adv-dev-temporal-morgen": citationCase(
			"Der Nachtzug fährt <TARGET>morgen</TARGET> um sechs Uhr ab.",
			["morgen"],
			"morgen",
		),
		"grammar-de-adv-dev-initial-vielleicht": citationCase(
			"<TARGET>Vielleicht</TARGET> endet die Sitzung etwas früher.",
			["Vielleicht"],
			"vielleicht",
			unmarkedCoreFeatures,
			{ normalizedMembers: ["vielleicht"] },
		),
		"grammar-de-adv-dev-demonstrative-damit": citationCase(
			"<TARGET>Damit</TARGET> öffnet der Hausmeister das Seitentor.",
			["Damit"],
			"damit",
			demonstrative,
			{ normalizedMembers: ["damit"] },
		),
		"grammar-de-adv-dev-relative-weshalb": citationCase(
			"Das ist der Grund, <TARGET>weshalb</TARGET> die Fähre heute ausfällt.",
			["weshalb"],
			"weshalb",
			relative,
			{
				explanation:
					"The relative clause links weshalb to an antecedent and establishes PronType Rel.",
			},
		),
		"grammar-de-adv-dev-negative-keineswegs": citationCase(
			"Die Reparatur ist <TARGET>keineswegs</TARGET> abgeschlossen.",
			["keineswegs"],
			"keineswegs",
			negative,
		),
		"grammar-de-adv-dev-multiplicative-zweimal": citationCase(
			"Die Besucherin klingelte <TARGET>zweimal</TARGET> an der Hintertür.",
			["zweimal"],
			"zweimal",
			{ ...unmarkedCoreFeatures, numType: "Mult" },
		),
		"grammar-de-adv-dev-positive-viel": inflectionCase(
			"Heute regnete es <TARGET>viel</TARGET>, gestern mehr und vorgestern am meisten.",
			["viel"],
			"viel",
			"Pos",
			indefinite,
			{
				explanation:
					"The explicit degree contrast establishes Degree Pos; the indefinite ADV identity carries PronType Ind without adding NumType from quantity meaning alone.",
			},
		),
		"grammar-de-adv-dev-cardinal-2x": citationCase(
			"Ich war bereits <TARGET>2x</TARGET> in dieser Werkstatt.",
			["2x"],
			"2x",
			{ ...unmarkedCoreFeatures, numType: "Card" },
			{
				explanation:
					"The cardinal ADV identity follows the official UD German-GSD train-s562 2x analysis; the sentence is minimally adapted.",
			},
		),
		"grammar-de-adv-dev-foreign-remotely": citationCase(
			"Das internationale Team arbeitete diese Woche <TARGET>remotely</TARGET>.",
			["remotely"],
			"remotely",
			{ ...unmarkedCoreFeatures, foreign: "Yes" },
			{
				explanation:
					"The fixed ADV route and code-switched English Lemma establish Foreign Yes.",
			},
		),
		"grammar-de-adv-dev-comparative-weniger": inflectionCase(
			"Seit dem Umbau lärmt die Anlage <TARGET>weniger</TARGET> als zuvor.",
			["weniger"],
			"wenig",
			"Cmp",
			indefinite,
		),
		"grammar-de-adv-dev-superlative-am-fruehesten": inflectionCase(
			"Von allen Zügen kommt dieser <TARGET>am</TARGET> <TARGET>frühesten</TARGET> an.",
			["am", "frühesten"],
			"früh",
			"Sup",
		),
		"grammar-de-adv-dev-typo-vielleich": citationCase(
			"Die Vertretung kommt <TARGET>vielleich</TARGET> erst am Nachmittag.",
			["vielleich"],
			"vielleicht",
			unmarkedCoreFeatures,
			{
				orthographies: ["Typo"],
				normalizedMembers: ["vielleicht"],
			},
		),
		"grammar-de-adv-dev-variant-bisschen": citationCase(
			"Der historische Brief klingt <TARGET>bißchen</TARGET> förmlich.",
			["bißchen"],
			"bisschen",
			indefinite,
			{
				spelling: "Variant",
				explanation:
					"The licensed pre-reform spelling is Standard occurrence evidence and a Variant Surface.",
			},
		),
		"grammar-de-adv-dev-abbreviation-ca": citationCase(
			"Die Wanderung dauert <TARGET>ca</TARGET>. drei Stunden.",
			["ca"],
			"circa",
			{ ...unmarkedCoreFeatures, foreign: "Yes" },
			{
				spelling: "Variant",
				explanation:
					"The licensed abbreviation is a full Variant Surface; punctuation remains outside the member.",
			},
		),

		"grammar-de-adv-accept-temporal-gestern": citationCase(
			"Die Bibliothek schloss <TARGET>gestern</TARGET> schon um sechs Uhr.",
			["gestern"],
			"gestern",
		),
		"grammar-de-adv-accept-locative-hier": citationCase(
			"Bitte warten Sie <TARGET>hier</TARGET> vor dem Eingang.",
			["hier"],
			"hier",
		),
		"grammar-de-adv-accept-initial-draussen": citationCase(
			"<TARGET>Draußen</TARGET> warten noch drei Gäste.",
			["Draußen"],
			"draußen",
			unmarkedCoreFeatures,
			{ normalizedMembers: ["draußen"] },
		),
		"grammar-de-adv-accept-demonstrative-dafuer": citationCase(
			"<TARGET>Dafür</TARGET> fehlt uns heute das passende Werkzeug.",
			["Dafür"],
			"dafür",
			demonstrative,
			{ normalizedMembers: ["dafür"] },
		),
		"grammar-de-adv-accept-indefinite-wenig": citationCase(
			"Nach dem Umbau arbeitet die Pumpe <TARGET>wenig</TARGET>.",
			["wenig"],
			"wenig",
			indefinite,
		),
		"grammar-de-adv-accept-interrogative-wo": citationCase(
			"<TARGET>Wo</TARGET> steht der reservierte Kleinbus?",
			["Wo"],
			"wo",
			interrogative,
			{ normalizedMembers: ["wo"] },
		),
		"grammar-de-adv-accept-relative-wobei": citationCase(
			"Das war der Versuch, <TARGET>wobei</TARGET> die Sicherung ausfiel.",
			["wobei"],
			"wobei",
			relative,
		),
		"grammar-de-adv-accept-negative-nie": citationCase(
			"Der alte Aufzug bleibt <TARGET>nie</TARGET> zwischen den Etagen stehen.",
			["nie"],
			"nie",
			negative,
		),
		"grammar-de-adv-accept-multiplicative-dreimal": citationCase(
			"Vor dem Öffnen klopfte sie <TARGET>dreimal</TARGET> an.",
			["dreimal"],
			"dreimal",
			{ ...unmarkedCoreFeatures, numType: "Mult" },
		),
		"grammar-de-adv-accept-comparative-oefter": inflectionCase(
			"Seit dem Fahrplanwechsel kommt der Bus <TARGET>öfter</TARGET>.",
			["öfter"],
			"oft",
			"Cmp",
		),
		"grammar-de-adv-accept-typo-morgne": citationCase(
			"Die Lieferung erreicht uns <TARGET>morgne</TARGET> am Vormittag.",
			["morgne"],
			"morgen",
			unmarkedCoreFeatures,
			{
				orthographies: ["Typo"],
				normalizedMembers: ["morgen"],
			},
		),
		"grammar-de-adv-accept-archaic-allhier": citationCase(
			"Der Unterzeichnete erklärt <TARGET>allhier</TARGET> die Übergabe.",
			["allhier"],
			"allhier",
			unmarkedCoreFeatures,
			{
				historicalStatus: "Archaic",
				explanation:
					"The deliberately historical register licenses the archaic Surface feature.",
			},
		),
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
