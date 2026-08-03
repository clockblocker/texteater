import { defineGoldenCorpus } from "../../../../../../../assembly";
import { inputSchema, outputSchema } from "../schemas";
import { boundaryCases } from "./cases/boundaries";
import { interjectionCases } from "./cases/interjections";
import { orthographyAndSurfaceCases } from "./cases/orthography-and-surface";

export const corpus = defineGoldenCorpus({
	route: "grammatical-resolution/de/lexeme/interjection",
	inputSchema,
	outputSchema,
	collections: {
		interjections: interjectionCases,
		orthographyAndSurface: orthographyAndSurfaceCases,
		boundaries: boundaryCases,
	},
	fingerprintInput(input) {
		return input.markedContext
			.normalize("NFC")
			.replaceAll(/\s+/gu, " ")
			.trim()
			.toLocaleLowerCase("de");
	},
});
