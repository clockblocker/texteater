import { defineGoldenCorpus } from "../../../../../../../assembly";
import { inputSchema, outputSchema } from "../schemas";
import { boundaryCases } from "./cases/boundaries";
import { policyProbeCases } from "./cases/policy-probes";
import { upstreamRejectionCases } from "./cases/upstream-rejections";

export const corpus = defineGoldenCorpus({
	route: "grammatical-resolution/de/lexeme/other",
	inputSchema,
	outputSchema,
	collections: {
		upstreamRejections: upstreamRejectionCases,
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
