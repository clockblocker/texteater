import { defineGoldenCorpus } from "../../../../../assembly";
import { inputSchema, outputSchema } from "../schemas";
import { adpCases, adpGroups } from "./cases/adp";
import { constructionCases } from "./cases/construction";
import { lexemeCases } from "./cases/lexeme";
import { morphemeCases } from "./cases/morpheme";
import { phrasemeCases } from "./cases/phraseme";

export const corpus = defineGoldenCorpus({
	route: "reading-resolution/de",
	inputSchema,
	outputSchema,
	cases: {
		...lexemeCases,
		...adpCases,
		...phrasemeCases,
		...morphemeCases,
		...constructionCases,
	},
	groups: { adp: adpGroups },
	fingerprintInput(input) {
		return normalizeMarkedContext(input.markedContext);
	},
});

function normalizeMarkedContext(markedContext: string): string {
	return markedContext.normalize("NFC").replaceAll(/\s+/gu, " ").trim();
}
