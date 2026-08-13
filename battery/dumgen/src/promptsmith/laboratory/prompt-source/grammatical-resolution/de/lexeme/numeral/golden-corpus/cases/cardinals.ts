import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { cardinalCore, citationCase } from "./builders";

export const cardinalCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-num-demo-word-vier": citationCase(
			"Die Schülerin kauft <TARGET>vier</TARGET> karierte Hefte.",
			["vier"],
			"vier",
			cardinalCore,
			{
				explanation:
					"The classified word-form cardinal is invariant and uses Citation with NumType Card.",
			},
		),
		"grammar-de-num-demo-digit-7": citationCase(
			"Auf der Anzeigetafel steht <TARGET>7</TARGET>.",
			["7"],
			"7",
			cardinalCore,
			{
				explanation:
					"The codec has no NumForm feature, so the digit remains its own canonical identity.",
			},
		),

		"grammar-de-num-dev-initial-fuenf": citationCase(
			"<TARGET>Fünf</TARGET> Gäste warten bereits im Foyer.",
			["Fünf"],
			"fünf",
			cardinalCore,
			{ normalizedMembers: ["fünf"] },
		),
		"grammar-de-num-dev-decimal-drei-komma-vierzehn": citationCase(
			"Der gemessene Wert beträgt <TARGET>drei</TARGET> <TARGET>Komma</TARGET> <TARGET>vierzehn</TARGET>.",
			["drei", "Komma", "vierzehn"],
			"drei Komma vierzehn",
		),
		"grammar-de-num-dev-year-2024": citationCase(
			"Die neue Brücke wurde <TARGET>2024</TARGET> eröffnet.",
			["2024"],
			"2024",
		),
		"grammar-de-num-dev-roman-xiv": citationCase(
			"Als römische Zahl wird vierzehn <TARGET>XIV</TARGET> geschrieben.",
			["XIV"],
			"XIV",
		),
		"grammar-de-num-dev-abbreviation-t": citationCase(
			"Die Stückzahl ist mit <TARGET>T</TARGET> für Tausend angegeben.",
			["T"],
			"Tausend",
			{ ...cardinalCore, abbr: "Yes" },
			{
				spelling: "Variant",
				explanation:
					"German GSD licenses T as an abbreviated Surface of Tausend; the occurrence remains Standard.",
			},
		),
		"grammar-de-num-dev-foreign-three": citationCase(
			"Im englischen Zitat stand die Zahl <TARGET>three</TARGET>.",
			["three"],
			"three",
			{ ...cardinalCore, foreign: "Yes" },
		),
		"grammar-de-num-dev-distributive-zwei": citationCase(
			"Die Kinder erhielten jeweils <TARGET>zwei</TARGET> Äpfel.",
			["zwei"],
			"zwei",
			cardinalCore,
			{
				explanation:
					"The unmarked jeweils supplies distributive meaning, but the exact German NUM codec has no Dist value; the numeral identity remains Card.",
			},
		),
		"grammar-de-num-dev-collective-zwei": citationCase(
			"Für die Reise kaufte sie <TARGET>zwei</TARGET> Paar Wanderschuhe.",
			["zwei"],
			"zwei",
			cardinalCore,
			{
				explanation:
					"The unmarked measure noun expresses sets; the exact codec has no Sets or collective value, so the supplied NUM remains Card.",
			},
		),
		"grammar-de-num-dev-multi-member-ein-komma-fuenf": citationCase(
			"Der Mittelwert beträgt <TARGET>ein</TARGET> <TARGET>Komma</TARGET> <TARGET>fünf</TARGET>.",
			["ein", "Komma", "fünf"],
			"ein Komma fünf",
			cardinalCore,
			{
				explanation:
					"All three authoritative members realize one spoken decimal NUM; preserve membership and source order.",
			},
		),

		"grammar-de-num-accept-v3-word-dreizehn": citationCase(
			"Auf dem Bahnsteig warten <TARGET>dreizehn</TARGET> Reisende.",
			["dreizehn"],
			"dreizehn",
		),
		"grammar-de-num-accept-v3-digit-73": citationCase(
			"Das Trikot trägt die Nummer <TARGET>73</TARGET>.",
			["73"],
			"73",
		),
		"grammar-de-num-accept-v3-decimal-sieben-komma-acht": citationCase(
			"Der Pegel liegt bei <TARGET>sieben</TARGET> <TARGET>Komma</TARGET> <TARGET>acht</TARGET> Metern.",
			["sieben", "Komma", "acht"],
			"sieben Komma acht",
		),
		"grammar-de-num-accept-v3-year-1987": citationCase(
			"Die Aufnahme entstand <TARGET>1987</TARGET> in Leipzig.",
			["1987"],
			"1987",
		),
		"grammar-de-num-accept-v3-roman-xix": citationCase(
			"Die römische Zahl neunzehn wird als <TARGET>XIX</TARGET> notiert.",
			["XIX"],
			"XIX",
		),
		"grammar-de-num-accept-v3-multi-member-vier-komma-neun": citationCase(
			"Die Waage zeigt <TARGET>vier</TARGET> <TARGET>Komma</TARGET> <TARGET>neun</TARGET> Kilogramm.",
			["vier", "Komma", "neun"],
			"vier Komma neun",
		),
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
