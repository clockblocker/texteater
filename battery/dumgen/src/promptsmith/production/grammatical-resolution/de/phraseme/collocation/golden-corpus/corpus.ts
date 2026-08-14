import { defineGoldenCorpus } from "../../../../../../assembly";
import { inputSchema, outputSchema } from "../schemas";
import { alternantCases } from "./cases/alternants";
import { boundaryCases } from "./cases/boundaries";
import { formCases } from "./cases/forms";

export const corpus = defineGoldenCorpus({
	route: "grammatical-resolution/de/phraseme/collocation",
	inputSchema,
	outputSchema,
	collections: {
		forms: formCases,
		boundaries: boundaryCases,
		alternants: alternantCases,
	},
	fingerprintInput(input) {
		return input.markedContext
			.normalize("NFC")
			.replaceAll(/\s+/gu, " ")
			.trim()
			.toLocaleLowerCase("de");
	},
});
