import { defineGoldenCorpus } from "../../../../../../assembly";
import { inputSchema, outputSchema } from "../schemas";
import { boundaryCases } from "./cases/boundaries";
import { inflectionCases } from "./cases/inflection";
import { orthographyAndSurfaceCases } from "./cases/orthography-and-surface";

export const corpus = defineGoldenCorpus({
	route: "grammatical-resolution/de/lexeme/noun",
	inputSchema,
	outputSchema,
	collections: {
		inflection: inflectionCases,
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
