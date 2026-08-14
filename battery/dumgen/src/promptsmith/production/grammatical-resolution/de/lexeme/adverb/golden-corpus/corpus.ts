import { defineGoldenCorpus } from "../../../../../../assembly";
import { inputSchema, outputSchema } from "../schemas";
import { boundaryCases } from "./cases/boundaries";
import { resolvedCases } from "./cases/resolved";

export const corpus = defineGoldenCorpus({
	route: "grammatical-resolution/de/lexeme/adverb",
	inputSchema,
	outputSchema,
	collections: { resolved: resolvedCases, boundaries: boundaryCases },
	fingerprintInput(input) {
		return input.markedContext
			.normalize("NFC")
			.replaceAll(/\s+/gu, " ")
			.trim()
			.toLocaleLowerCase("de");
	},
});
