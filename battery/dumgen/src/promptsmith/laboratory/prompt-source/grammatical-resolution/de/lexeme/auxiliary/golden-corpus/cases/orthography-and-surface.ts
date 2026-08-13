import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { finiteCase } from "./builders";

const thirdSingularPresent = {
	mood: "Ind" as const,
	number: "Sing" as const,
	person: "3" as const,
	tense: "Pres" as const,
	voice: null,
};

export const orthographyAndSurfaceCases = defineGoldenCaseCollection(
	import.meta.url,
	{
		cases: {
			"grammar-de-aux-demo-typo-sol": finiteCase(
				"Er <TARGET>sol</TARGET> jetzt warten.",
				"sol",
				"sollen",
				"Mod",
				thirdSingularPresent,
				{
					orthography: "Typo",
					normalizedMember: "soll",
					explanation:
						"Missing letter. Mark Typo. Repair member. Keep modal AUX grammar.",
				},
			),
			"grammar-de-aux-dev-typo-mus": finiteCase(
				"Der Fahrer <TARGET>mus</TARGET> sofort bremsen.",
				"mus",
				"müssen",
				"Mod",
				thirdSingularPresent,
				{ orthography: "Typo", normalizedMember: "muss" },
			),
			"grammar-de-aux-dev-variant-muss": finiteCase(
				"Im alten Brief steht: „Er <TARGET>muß</TARGET> morgen abreisen.“",
				"muß",
				"müssen",
				"Mod",
				thirdSingularPresent,
				{
					spelling: "Variant",
					explanation:
						"Licensed pre-reform spelling. Standard member. Preserve Surface. Variant spelling.",
				},
			),
			"grammar-de-aux-accept-typo-koenen": finiteCase(
				"Wir <TARGET>könen</TARGET> den Termin einhalten.",
				"könen",
				"können",
				"Mod",
				{
					mood: "Ind",
					number: "Plur",
					person: "1",
					tense: "Pres",
					voice: null,
				},
				{ orthography: "Typo", normalizedMember: "können" },
			),
			"grammar-de-aux-accept-archaic-ward": finiteCase(
				"Der Bote <TARGET>ward</TARGET> freundlich empfangen.",
				"ward",
				"werden",
				null,
				{
					mood: "Ind",
					number: "Sing",
					person: "3",
					tense: "Past",
					voice: "Pass",
				},
				{
					spelling: "Variant",
					historicalStatus: "Archaic",
					explanation:
						"Old passive auxiliary form. Standard attestation. Variant spelling. Surface Archaic.",
				},
			),
		} as const satisfies GoldenCaseRegistry<
			typeof inputSchema,
			typeof outputSchema
		>,
	},
);
