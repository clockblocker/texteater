import { defineGoldenCorpus } from "../../../../../../../assembly";
import { inputSchema, outputSchema } from "../schemas";
import { particleCases } from "./cases/particles";

export const corpus = defineGoldenCorpus({
	route: "grammatical-resolution/de/lexeme/particle",
	inputSchema,
	outputSchema,
	collections: {
		particles: particleCases,
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
