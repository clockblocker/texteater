import { defineGoldenCorpus } from "../../../../../../../assembly";
import { inputSchema, outputSchema } from "../schemas";
import { boundaryCases } from "./cases/boundaries";
import { orthographyCases } from "./cases/orthography";
import { particleCases } from "./cases/particles";
import { policyProbeCases } from "./cases/policy-probes";

export const corpus = defineGoldenCorpus({
	route: "grammatical-resolution/de/lexeme/particle",
	inputSchema,
	outputSchema,
	collections: {
		particles: particleCases,
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
