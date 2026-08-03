import { defineGoldenCorpus } from "../../../../../../../assembly";
import { inputSchema, outputSchema } from "../schemas";
import { boundaryCases } from "./cases/boundaries";
import { formCases } from "./cases/forms";
import { policyProbeCases } from "./cases/policy-probes";

export const corpus = defineGoldenCorpus({
	route: "grammatical-resolution/de/phraseme/collocation",
	inputSchema,
	outputSchema,
	collections: {
		forms: formCases,
		boundaries: boundaryCases,
		policyProbes: policyProbeCases,
	},
	fingerprintInput(input) {
		return input.markedContext
			.normalize("NFC")
			.replaceAll(/\s+/gu, " ")
			.trim()
			.toLocaleLowerCase("de");
	},
});
