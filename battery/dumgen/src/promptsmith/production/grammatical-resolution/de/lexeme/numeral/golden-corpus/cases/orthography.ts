import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { cardinalCore, citationCase, inflectionCase } from "./builders";

export const orthographyCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-num-demo-typo-dreii": citationCase(
			"Für das Experiment fehlen <TARGET>dreii</TARGET> Kabel.",
			["dreii"],
			"drei",
			cardinalCore,
			{
				orthographies: ["Typo"],
				normalizedMembers: ["drei"],
				explanation:
					"Repair the duplicated final i and mark the occurrence Typo.",
			},
		),
		"grammar-de-num-dev-archaic-zween": inflectionCase(
			"<TARGET>Zween</TARGET> Ritter bewachten der Sage nach das Tor.",
			["Zween"],
			"zwei",
			{ case: "Nom", gender: "Masc", number: "Plur" },
			cardinalCore,
			{
				spelling: "Variant",
				historicalStatus: "Archaic",
				normalizedMembers: ["zween"],
				explanation:
					"Zween is an archaic masculine inflected form of zwei; initial capitalization remains Standard.",
			},
		),
		"grammar-de-num-dev-variant-zwo": citationCase(
			"Im Funkverkehr meldete die Pilotin <TARGET>zwo</TARGET> Kontakte.",
			["zwo"],
			"zwei",
			cardinalCore,
			{
				spelling: "Variant",
				explanation:
					"The licensed disambiguating form zwo is Standard occurrence evidence and a Variant Surface of zwei.",
			},
		),
		"grammar-de-num-accept-v3-typo-neunzhen": citationCase(
			"Im Protokoll stehen <TARGET>neunzhen</TARGET> einzelne Meldungen.",
			["neunzhen"],
			"neunzehn",
			cardinalCore,
			{
				orthographies: ["Typo"],
				normalizedMembers: ["neunzehn"],
			},
		),
		"grammar-de-num-accept-v3-archaic-fuenff": citationCase(
			"Im alten Rechenbuch steht die Zahl <TARGET>fünff</TARGET>.",
			["fünff"],
			"fünf",
			cardinalCore,
			{ spelling: "Variant", historicalStatus: "Archaic" },
		),
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
