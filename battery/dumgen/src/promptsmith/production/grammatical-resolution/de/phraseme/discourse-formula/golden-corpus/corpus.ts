import { defineGoldenCorpus } from "../../../../../../assembly";
import { inputSchema, outputSchema } from "../schemas";
import { contextualContrastCases } from "./cases/boundaries";
import { formulaCases } from "./cases/formulas";
import { orthographyAndCoverageCases } from "./cases/orthography";

export const corpus = defineGoldenCorpus({
	route: "grammatical-resolution/de/phraseme/discourse-formula",
	inputSchema,
	outputSchema,
	collections: {
		formulas: formulaCases,
		orthographyAndCoverage: orthographyAndCoverageCases,
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
