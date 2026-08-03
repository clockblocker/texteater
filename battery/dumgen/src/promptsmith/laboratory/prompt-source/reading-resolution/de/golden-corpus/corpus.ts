import { defineGoldenCorpus } from "../../../../../assembly";
import { inputSchema, outputSchema } from "../schemas";
import { adpositions } from "./cases/hand-verivied/adp";
import { adjectives } from "./cases/wip/adjective";
import { constructions } from "./cases/wip/construction";
import { functionWords } from "./cases/wip/function-words";
import { labelsAndNames } from "./cases/wip/labels-and-names";
import { nouns } from "./cases/wip/noun";
import { phrasemes } from "./cases/wip/phraseme";
import { verbs } from "./cases/wip/verb";

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
