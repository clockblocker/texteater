import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { cardinalCore, citationCase } from "./builders";

export const policyProbeCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-num-demo-fraction-eineinhalb": citationCase(
			"Die Fahrt dauert <TARGET>eineinhalb</TARGET> Stunden.",
			["eineinhalb"],
			"eineinhalb",
			{ ...cardinalCore, numType: "Frac" },
			{
				explanation:
					"The fixed NUM route and exact fraction glyph establish the codec-supported Frac identity.",
			},
		),
		"grammar-de-num-demo-range-zehn-bis-zwoelf": citationCase(
			"Die Sprechstunde läuft von <TARGET>zehn</TARGET> <TARGET>bis</TARGET> <TARGET>zwölf</TARGET> Uhr.",
			["zehn", "bis", "zwölf"],
			"zehn bis zwölf",
			{ ...cardinalCore, numType: "Range" },
			{
				explanation:
					"The supplied one-member interval is a Range; never split or replace the authoritative member.",
			},
		),
		"grammar-de-num-dev-multiplicative-dreifach": citationCase(
			"Der klassifizierte Multiplikator lautet <TARGET>dreifach</TARGET>.",
			["dreifach"],
			"dreifach",
			{ ...cardinalCore, numType: "Mult" },
		),
		"grammar-de-num-accept-v3-fraction-siebenachtel": citationCase(
			"Der Tank ist zu <TARGET>siebenachtel</TARGET> gefüllt.",
			["siebenachtel"],
			"siebenachtel",
			{ ...cardinalCore, numType: "Frac" },
		),
		"grammar-de-num-accept-v3-multiplicative-sechsfach": citationCase(
			"Die Beschichtung schützt <TARGET>sechsfach</TARGET> besser.",
			["sechsfach"],
			"sechsfach",
			{ ...cardinalCore, numType: "Mult" },
		),
		"grammar-de-num-accept-v3-range-zwoelf-bis-sechzehn": citationCase(
			"Das Angebot gilt für Gruppen von <TARGET>zwölf</TARGET> <TARGET>bis</TARGET> <TARGET>sechzehn</TARGET> Personen.",
			["zwölf", "bis", "sechzehn"],
			"zwölf bis sechzehn",
			{ ...cardinalCore, numType: "Range" },
		),
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
