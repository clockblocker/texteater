import { defineGoldenCorpus } from "../../../../../../assembly";
import { inputSchema, outputSchema } from "../schemas";
import { boundaryCases } from "./cases/boundaries";
import { fixedMultiMemberCases } from "./cases/fixed-multi-member";
import { policyProbeCases } from "./cases/policy-probes";
import { recoveryCases } from "./cases/recovery";
import { resolvedCases } from "./cases/resolved";

export const corpus = defineGoldenCorpus({
	route: "grammatical-resolution/de/lexeme/subordinating-conjunction",
	inputSchema,
	outputSchema,
	collections: {
		resolved: resolvedCases,
		fixedMultiMember: fixedMultiMemberCases,
		boundaries: boundaryCases,
		policyProbes: policyProbeCases,
		recovery: recoveryCases,
	},
	fingerprintInput(input) {
		return input.markedContext
			.normalize("NFC")
			.replaceAll(/\s+/gu, " ")
			.trim()
			.toLocaleLowerCase("de");
	},
});
