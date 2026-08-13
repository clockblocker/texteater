import { defineGoldenCorpus } from "../../../../../../../assembly";
import { inputSchema, outputSchema } from "../schemas";
import { ambiguityAndAnchorCases } from "./cases/boundaries";
import { orthographyAndHistoryCases } from "./cases/core-features-and-orthography";
import { resolvedCases } from "./cases/resolved";

export const corpus = defineGoldenCorpus({
	route: "grammatical-resolution/de/lexeme/coordinating-conjunction",
	inputSchema,
	outputSchema,
	collections: {
		resolved: resolvedCases,
		ambiguityAndAnchors: ambiguityAndAnchorCases,
		orthographyAndHistory: orthographyAndHistoryCases,
	},
	fingerprintInput(input) {
		return JSON.stringify({
			markedContext: input.markedContext
				.normalize("NFC")
				.replaceAll(/\s+/gu, " ")
				.trim()
				.toLocaleLowerCase("de"),
			members: input.members.map((member) =>
				member.normalize("NFC").toLocaleLowerCase("de"),
			),
		});
	},
});
