import { defineGoldenCorpus } from "../../../../../../assembly";
import { inputSchema, outputSchema } from "../schemas";
import { coreFeatureCases } from "./cases/core-features";
import { orthographyAndSurfaceCases } from "./cases/orthography-and-surface";

export const corpus = defineGoldenCorpus({
	route: "grammatical-resolution/de/lexeme/adposition",
	inputSchema,
	outputSchema,
	collections: {
		coreFeatures: coreFeatureCases,
		orthographyAndSurface: orthographyAndSurfaceCases,
	},
	fingerprintInput(input) {
		return input.markedContext
			.normalize("NFC")
			.replaceAll(/\s+/gu, " ")
			.trim()
			.toLocaleLowerCase("de");
	},
});
