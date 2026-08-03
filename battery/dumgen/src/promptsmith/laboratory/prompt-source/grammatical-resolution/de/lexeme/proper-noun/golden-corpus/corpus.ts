import { defineGoldenCorpus } from "../../../../../../../assembly";
import { inputSchema, outputSchema } from "../schemas";
import { boundaryCases } from "./cases/boundaries";
import { orthographyCases } from "./cases/orthography";
import { policyProbeCases } from "./cases/policy-probes";
import { resolvedCases } from "./cases/resolved";

export const corpus = defineGoldenCorpus({
	route: "grammatical-resolution/de/lexeme/proper-noun",
	inputSchema,
	outputSchema,
	collections: {
		resolved: resolvedCases,
		orthography: orthographyCases,
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
