import { defineGoldenCorpus } from "../../../../../assembly";
import { inputSchema, outputSchema } from "../schemas";
import { adjectives } from "./cases/wip/adjective";
import { adpositions } from "./cases/hand-verivied/adp";
import { nouns } from "./cases/wip/noun";
import { constructions } from "./cases/wip/construction";
import { lexemes } from "./cases/wip/lexeme";
import { morphemes } from "./cases/wip/morpheme";
import { phrasemes } from "./cases/wip/phraseme";

export const corpus = defineGoldenCorpus({
	route: "reading-resolution/de",
	inputSchema,
	outputSchema,
	collections: {
		adj: adjectives,
		adp: adpositions,
		noun: nouns,
		constructions,
		lexemes,
		morphemes,
		phrasemes,
	},
	fingerprintInput(input) {
		return normalizeMarkedContext(input.markedContext);
	},
});

function normalizeMarkedContext(markedContext: string): string {
	return markedContext.normalize("NFC").replaceAll(/\s+/gu, " ").trim();
}
