import { defineGoldenCorpus } from "../../../../../../assembly";
import { inputSchema, outputSchema } from "../schemas";
import { properNounCases } from "./cases/names";

export const corpus = defineGoldenCorpus({
	route: "grammatical-resolution/de/lexeme/proper-noun",
	inputSchema,
	outputSchema,
	collections: {
		names: properNounCases,
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
