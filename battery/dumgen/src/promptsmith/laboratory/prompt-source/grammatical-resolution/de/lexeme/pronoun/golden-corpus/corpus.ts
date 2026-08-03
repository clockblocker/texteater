import { defineGoldenCorpus } from "../../../../../../../assembly";
import { inputSchema, outputSchema } from "../schemas";
import { boundaryCases } from "./cases/boundaries";
import { indefiniteAndNegativeCases } from "./cases/indefinite-and-negative";
import { orthographyAndSurfaceCases } from "./cases/orthography-and-surface";
import { personalAndPolitenessCases } from "./cases/personal-and-politeness";
import { policyProbeCases } from "./cases/policy-probes";
import { reflexiveAndReciprocalCases } from "./cases/reflexive-and-reciprocal";

export const corpus = defineGoldenCorpus({
	route: "grammatical-resolution/de/lexeme/pronoun",
	inputSchema,
	outputSchema,
	collections: {
		personalAndPoliteness: personalAndPolitenessCases,
		reflexiveAndReciprocal: reflexiveAndReciprocalCases,
		indefiniteAndNegative: indefiniteAndNegativeCases,
		orthographyAndSurface: orthographyAndSurfaceCases,
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
