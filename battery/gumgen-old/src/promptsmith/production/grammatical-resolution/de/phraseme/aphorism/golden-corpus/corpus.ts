import { defineGoldenCorpus } from "../../../../../../assembly";
import { inputSchema, outputSchema } from "../schemas";
import { authorshipBoundaryCases } from "./cases/authorship-boundaries";
import { boundaryCases } from "./cases/boundaries";
import { resolvedCases } from "./cases/resolved";

export const corpus = defineGoldenCorpus({
	route: "grammatical-resolution/de/phraseme/aphorism",
	inputSchema,
	outputSchema,
	collections: {
		resolved: resolvedCases,
		boundaries: boundaryCases,
		authorshipBoundaries: authorshipBoundaryCases,
	},
	fingerprintInput(input) {
		return input.markedContext
			.normalize("NFC")
			.replaceAll(/\s+/gu, " ")
			.trim()
			.toLocaleLowerCase("de");
	},
});
