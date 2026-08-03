import { defineGoldenCorpus } from "../../../../../../../assembly";
import { inputSchema, outputSchema } from "../schemas";
import { boundaryCases } from "./cases/boundaries";
import { coreFeaturesAndOrthographyCases } from "./cases/core-features-and-orthography";
import { resolvedCases } from "./cases/resolved";

export const corpus = defineGoldenCorpus({
	route: "grammatical-resolution/de/lexeme/coordinating-conjunction",
	inputSchema,
	outputSchema,
	collections: {
		resolved: resolvedCases,
		coreFeaturesAndOrthography: coreFeaturesAndOrthographyCases,
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
