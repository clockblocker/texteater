import { defineGoldenCorpus } from "../../../../../../../assembly";
import { inputSchema, outputSchema } from "../schemas";
import { boundaryCases } from "./cases/boundaries";
import { coreFeatureCases } from "./cases/core-features";
import { orthographyAndSurfaceCases } from "./cases/orthography-and-surface";

export const corpus = defineGoldenCorpus({
	route: "grammatical-resolution/de/lexeme/determiner",
	inputSchema,
	outputSchema,
	collections: {
		coreFeatures: coreFeatureCases,
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
