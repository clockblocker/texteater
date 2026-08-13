import { defineGoldenCorpus } from "../../../../../../../assembly";
import { inputSchema, outputSchema } from "../schemas";
import { dwArticleCases } from "./cases/dw-articles";
import { formCases } from "./cases/forms";
import { lexicalFeatureCases } from "./cases/lexical-features";
import { policyProbeCases } from "./cases/policy-probes";
import { prepositionContrastCases } from "./cases/preposition-contrasts";

export const corpus = defineGoldenCorpus({
	route: "grammatical-resolution/de/lexeme/verb",
	inputSchema,
	outputSchema,
	collections: {
		forms: formCases,
		lexicalFeatures: lexicalFeatureCases,
		policyProbes: policyProbeCases,
		dwArticles: dwArticleCases,
		prepositionContrasts: prepositionContrastCases,
	},
	fingerprintInput(input) {
		return JSON.stringify({
			markedContext: input.markedContext
				.normalize("NFC")
				.replaceAll(/\s+/gu, " ")
				.trim()
				.toLocaleLowerCase("de"),
			members: input.members.map((member) =>
				member.normalize("NFC").toLocaleLowerCase("de"),
			),
		});
	},
});
