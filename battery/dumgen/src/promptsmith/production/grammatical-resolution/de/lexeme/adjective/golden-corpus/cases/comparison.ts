import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { inflectionCase } from "./builders";

export const comparisonCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-adj-demo-comparative-besser": inflectionCase(
			"Der zweite Plan ist <TARGET>besser</TARGET>.",
			"besser",
			"gut",
			{ case: null, degree: "Cmp", gender: null, number: null },
			{
				explanation:
					"Suppletive comparative. Surface besser. Positive Lemma gut.",
			},
		),
		"grammar-de-adj-dev-attributive-comparative-teuer": inflectionCase(
			"Er kaufte ein <TARGET>teureres</TARGET> Gerät.",
			"teureres",
			"teuer",
			{ case: "Acc", degree: "Cmp", gender: "Neut", number: "Sing" },
		),
		"grammar-de-adj-dev-attributive-superlative-hoch": inflectionCase(
			"Der <TARGET>höchste</TARGET> Turm steht am Fluss.",
			"höchste",
			"hoch",
			{ case: "Nom", degree: "Sup", gender: "Masc", number: "Sing" },
		),
		"grammar-de-adj-dev-adverbial-superlative-sorgfaeltig": inflectionCase(
			"Von allen arbeitet sie am <TARGET>sorgfältigsten</TARGET>.",
			"sorgfältigsten",
			"sorgfältig",
			{ case: null, degree: "Sup", gender: null, number: null },
		),
		"grammar-de-adj-dev-predicative-comparative-nah": inflectionCase(
			"Das neue Büro liegt <TARGET>näher</TARGET>.",
			"näher",
			"nah",
			{ case: null, degree: "Cmp", gender: null, number: null },
		),
		"grammar-de-adj-accept-irregular-superlative-beste": inflectionCase(
			"Das war die <TARGET>beste</TARGET> Lösung.",
			"beste",
			"gut",
			{ case: "Nom", degree: "Sup", gender: "Fem", number: "Sing" },
		),
		"grammar-de-adj-accept-adverbial-comparative-schnell": inflectionCase(
			"Heute fährt der Zug <TARGET>schneller</TARGET>.",
			"schneller",
			"schnell",
			{ case: null, degree: "Cmp", gender: null, number: null },
		),
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
