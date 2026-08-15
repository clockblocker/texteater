import { defineGoldenCorpus, stableJson } from "../../../assembly";
import { inputSchema, outputSchema } from "../schemas";
import { demonstrationCases } from "./cases/demonstrations";
import { lexemeCases } from "./cases/lexemes";
import { nonLexemeCases } from "./cases/non-lexemes";
import { rejectionAndTrapCases } from "./cases/rejections";

export const corpus = defineGoldenCorpus({
	route: "unit-shadow-classification",
	inputSchema,
	outputSchema,
	collections: {
		demonstrations: demonstrationCases,
		lexemes: lexemeCases,
		nonLexemes: nonLexemeCases,
		rejectionsAndTraps: rejectionAndTrapCases,
	},
	fingerprintInput(input) {
		return stableJson({
			language: input.language,
			canonicalForm: input.canonicalForm
				.normalize("NFC")
				.toLocaleLowerCase(input.language),
		});
	},
});
