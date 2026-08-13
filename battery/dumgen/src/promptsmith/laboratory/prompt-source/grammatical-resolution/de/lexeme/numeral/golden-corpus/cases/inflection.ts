import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { inflectionCase } from "./builders";

export const inflectionCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-num-demo-inflected-millionen": inflectionCase(
			"Mit <TARGET>Millionen</TARGET> rechnet die Planerin nicht.",
			["Millionen"],
			"Million",
			{ case: "Dat", gender: "Fem", number: "Plur" },
			undefined,
			{
				explanation:
					"German GSD licenses inflected quantity numerals; mit establishes dative feminine plural.",
			},
		),
		"grammar-de-num-demo-initial-inflected-trillionen": inflectionCase(
			"<TARGET>Trillionen</TARGET> winziger Teilchen würden den Behälter füllen.",
			["Trillionen"],
			"Trillion",
			{ case: "Nom", gender: "Fem", number: "Plur" },
			undefined,
			{
				normalizedMembers: ["trillionen"],
				explanation:
					"The initial German quantity word is a feminine plural NUM Inflection in nominative context; its ordinary initial capitalization normalizes to lowercase.",
			},
		),
		"grammar-de-num-dev-inflected-million-acc": inflectionCase(
			"Der Fonds investiert eine <TARGET>Million</TARGET> Euro.",
			["Million"],
			"Million",
			{ case: "Acc", gender: "Fem", number: "Sing" },
		),
		"grammar-de-num-dev-inflected-millionen-gen": inflectionCase(
			"Trotz <TARGET>Millionen</TARGET> offener Fragen begann das Projekt.",
			["Millionen"],
			"Million",
			{ case: "Gen", gender: "Fem", number: "Plur" },
		),
		"grammar-de-num-accept-v3-inflected-quadrillionen-nom": inflectionCase(
			"<TARGET>Quadrillionen</TARGET> kleinster Einheiten wären dafür nötig.",
			["Quadrillionen"],
			"Quadrillion",
			{ case: "Nom", gender: "Fem", number: "Plur" },
			undefined,
			{ normalizedMembers: ["quadrillionen"] },
		),
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
