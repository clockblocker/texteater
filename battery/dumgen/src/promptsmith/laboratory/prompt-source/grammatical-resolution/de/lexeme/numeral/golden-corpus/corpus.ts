import { defineGoldenCorpus } from "../../../../../../../assembly";
import { inputSchema, outputSchema } from "../schemas";
import { boundaryCases } from "./cases/boundaries";
import { cardinalCases } from "./cases/cardinals";
import { inflectionCases } from "./cases/inflection";
import { orthographyCases } from "./cases/orthography";
import { policyProbeCases } from "./cases/policy-probes";

export const corpus = defineGoldenCorpus({
	route: "grammatical-resolution/de/lexeme/numeral",
	inputSchema,
	outputSchema,
	collections: {
		cardinals: cardinalCases,
		inflection: inflectionCases,
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
