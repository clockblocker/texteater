import { defineGoldenCorpus } from "../../../../../../../assembly";
import { inputSchema, outputSchema } from "../schemas";
import { boundaryCases } from "./cases/boundaries";
import { proverbCases } from "./cases/proverbs";
import { wordingVariantCases } from "./cases/wording-variants";

export const corpus = defineGoldenCorpus({
	route: "grammatical-resolution/de/phraseme/proverb",
	inputSchema,
	outputSchema,
	collections: {
		proverbs: proverbCases,
		boundaries: boundaryCases,
		wordingVariants: wordingVariantCases,
	},
	fingerprintInput(input) {
		return input.markedContext
			.normalize("NFC")
			.replaceAll(/\s+/gu, " ")
			.trim()
			.toLocaleLowerCase("de");
	},
});
