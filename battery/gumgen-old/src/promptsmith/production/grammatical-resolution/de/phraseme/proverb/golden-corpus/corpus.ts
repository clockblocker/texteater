import { defineGoldenCorpus } from "../../../../../../assembly";
import { inputSchema, outputSchema } from "../schemas";
import { contextualContrastCases } from "./cases/boundaries";
import { proverbCases } from "./cases/proverbs";
import { wordingAndCoverageCases } from "./cases/wording-variants";

export const corpus = defineGoldenCorpus({
	route: "grammatical-resolution/de/phraseme/proverb",
	inputSchema,
	outputSchema,
	collections: {
		proverbs: proverbCases,
		wordingAndCoverage: wordingAndCoverageCases,
		contextualContrasts: contextualContrastCases,
	},
	fingerprintInput(input) {
		return input.markedContext
			.normalize("NFC")
			.replaceAll(/\s+/gu, " ")
			.trim()
			.toLocaleLowerCase("de");
	},
});
