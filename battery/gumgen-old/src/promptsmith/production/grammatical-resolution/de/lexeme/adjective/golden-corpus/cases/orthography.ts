import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { inflectionCase } from "./builders";

export const orthographyCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-adj-demo-typo-freundlcih": inflectionCase(
			"Die Antwort klingt <TARGET>freundlcih</TARGET>.",
			"freundlcih",
			"freundlich",
			{ case: null, degree: "Pos", gender: null, number: null },
			{
				normalizedMember: "freundlich",
				orthography: "Typo",
				explanation:
					"Letters transposed. Mark Typo. Repair Surface and Lemma.",
			},
		),
		"grammar-de-adj-dev-typo-grsser": inflectionCase(
			"Ein <TARGET>grßer</TARGET> Hund wartet draußen.",
			"grßer",
			"groß",
			{ case: "Nom", degree: "Pos", gender: "Masc", number: "Sing" },
			{
				normalizedMember: "großer",
				orthography: "Typo",
			},
		),
		"grammar-de-adj-accept-typo-wunderschoen": inflectionCase(
			"Der Garten sieht <TARGET>wundershcön</TARGET> aus.",
			"wundershcön",
			"wunderschön",
			{ case: null, degree: "Pos", gender: null, number: null },
			{
				normalizedMember: "wunderschön",
				orthography: "Typo",
			},
		),
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
