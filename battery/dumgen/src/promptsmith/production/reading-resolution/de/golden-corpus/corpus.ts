import { defineGoldenCorpus } from "../../../../assembly";
import { inputSchema, outputSchema } from "../schemas";
import { adjectives } from "./cases/adjective";
import { adpositions } from "./cases/adp";
import { constructions } from "./cases/construction";
import { functionWords } from "./cases/function-words";
import { labelsAndNames } from "./cases/labels-and-names";
import { nouns } from "./cases/noun";
import { phrasemes } from "./cases/phraseme";
import { verbs } from "./cases/verb";

export const corpus = defineGoldenCorpus({
	route: "reading-resolution/de",
	inputSchema,
	outputSchema,
	collections: {
		adj: adjectives,
		adp: adpositions,
		noun: nouns,
		constructions,
		functionWords,
		labelsAndNames,
		phrasemes,
		verbs,
	},
	fingerprintInput(input) {
		return normalizeMarkedContext(input.markedContext);
	},
});

function normalizeMarkedContext(markedContext: string): string {
	return markedContext.normalize("NFC").replaceAll(/\s+/gu, " ").trim();
}
