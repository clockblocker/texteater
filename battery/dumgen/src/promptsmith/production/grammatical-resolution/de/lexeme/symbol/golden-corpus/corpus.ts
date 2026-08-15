import { defineGoldenCorpus } from "../../../../../../assembly";
import { inputSchema, outputSchema } from "../schemas";
import { symbolCases } from "./cases/symbols";

export const corpus = defineGoldenCorpus({
	route: "grammatical-resolution/de/lexeme/symbol",
	inputSchema,
	outputSchema,
	collections: {
		symbols: symbolCases,
	},
	fingerprintInput(input) {
		return JSON.stringify({
			markedContext: input.markedContext
				.normalize("NFC")
				.replaceAll(/\s+/gu, " ")
				.trim(),
			members: input.members.map((member) => member.normalize("NFC")),
		});
	},
});
