import { defineGoldenCorpus } from "../../../../../../../assembly";
import { inputSchema, outputSchema } from "../schemas";
import { formCases } from "./cases/forms";

export const corpus = defineGoldenCorpus({
	route: "grammatical-resolution/de/lexeme/other",
	inputSchema,
	outputSchema,
	collections: { forms: formCases },
	fingerprintInput(input) {
		return input.markedContext
			.normalize("NFC")
			.replaceAll(/\s+/gu, " ")
			.trim()
			.toLocaleLowerCase("de");
	},
});
