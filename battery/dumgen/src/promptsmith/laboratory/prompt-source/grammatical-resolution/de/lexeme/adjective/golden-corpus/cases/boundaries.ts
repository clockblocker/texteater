import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { inflectionCase } from "./builders";

export const classifiedBoundaryCases = defineGoldenCaseCollection(
	import.meta.url,
	{
		cases: {
			"grammar-de-adj-dev-participial-geschlossen": inflectionCase(
				"Die <TARGET>geschlossene</TARGET> Tür bleibt heute zu.",
				"geschlossene",
				"geschlossen",
				{ case: "Nom", degree: "Pos", gender: "Fem", number: "Sing" },
				{
					explanation:
						"Established result adjective. Route fixed ADJ, not verbal participle.",
				},
			),
			"grammar-de-adj-dev-participial-spannend": inflectionCase(
				"Der <TARGET>spannende</TARGET> Vortrag dauerte eine Stunde.",
				"spannende",
				"spannend",
				{ case: "Nom", degree: "Pos", gender: "Masc", number: "Sing" },
				{
					explanation:
						"Established property adjective. Route fixed ADJ, not verbal participle.",
				},
			),
			"grammar-de-adj-dev-invariant-lila": inflectionCase(
				"Sie trug einen <TARGET>lila</TARGET> Schal.",
				"lila",
				"lila",
				{ case: "Acc", degree: "Pos", gender: "Masc", number: "Sing" },
				{
					explanation:
						"Attributive color ADJ. Not color-name NOUN. Invariant form keeps agreement.",
				},
			),
			"grammar-de-adj-dev-archaic-hold": inflectionCase(
				"Ihr <TARGET>holdes</TARGET> Lächeln bezauberte die Gäste.",
				"holdes",
				"hold",
				{ case: "Nom", degree: "Pos", gender: "Neut", number: "Sing" },
				{
					historicalStatus: "Archaic",
					explanation: "Old poetic adjective. Mark Surface Archaic.",
				},
			),
			"grammar-de-adj-accept-participial-glaenzend": inflectionCase(
				"Eine <TARGET>glänzende</TARGET> Idee rettete das Projekt.",
				"glänzende",
				"glänzend",
				{ case: "Nom", degree: "Pos", gender: "Fem", number: "Sing" },
			),
			"grammar-de-adj-accept-invariant-rosa": inflectionCase(
				"Er kaufte ein <TARGET>rosa</TARGET> Kleid.",
				"rosa",
				"rosa",
				{ case: "Acc", degree: "Pos", gender: "Neut", number: "Sing" },
			),
		} as const satisfies GoldenCaseRegistry<
			typeof inputSchema,
			typeof outputSchema
		>,
	},
);
