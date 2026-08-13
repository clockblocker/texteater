import { defineGoldenCorpus } from "../../../../../../../assembly";
import { inputSchema, outputSchema } from "../schemas";
import { determinerCases } from "./cases/core-features";

export const corpus = defineGoldenCorpus({
	route: "grammatical-resolution/de/lexeme/determiner",
	inputSchema,
	outputSchema,
	collections: {
		determiners: determinerCases,
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
