import { defineGoldenCorpus } from "../../../../../../../assembly";
import { inputSchema, outputSchema } from "../schemas";
import { boundaryCases } from "./cases/boundaries";
import { formCases } from "./cases/forms";

export const corpus = defineGoldenCorpus({
	route: "grammatical-resolution/de/construction/fusion",
	inputSchema,
	outputSchema,
	collections: { forms: formCases, boundaries: boundaryCases },
	fingerprintInput(input) {
		return input.markedContext
			.normalize("NFC")
			.replaceAll(/\s+/gu, " ")
			.trim()
			.toLocaleLowerCase("de");
	},
});
