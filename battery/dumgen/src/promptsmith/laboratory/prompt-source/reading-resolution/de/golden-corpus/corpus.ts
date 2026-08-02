import { defineGoldenCorpus } from "../../../../../assembly";
import { inputSchema, outputSchema } from "../schemas";
import { adpositions } from "./cases/adp";
import { constructions } from "./cases/construction";
import { lexemes } from "./cases/lexeme";
import { morphemes } from "./cases/morpheme";
import { phrasemes } from "./cases/phraseme";

export const corpus = defineGoldenCorpus({
	route: "reading-resolution/de",
	inputSchema,
	outputSchema,
	collections: {
		adp: adpositions,
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
