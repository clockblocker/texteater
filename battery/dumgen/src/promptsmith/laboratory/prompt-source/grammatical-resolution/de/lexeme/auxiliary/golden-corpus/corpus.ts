import { defineGoldenCorpus } from "../../../../../../../assembly";
import { inputSchema, outputSchema } from "../schemas";
import { classifiedContrastCases } from "./cases/boundaries";
import { inflectionCases } from "./cases/inflection";
import { orthographyAndSurfaceCases } from "./cases/orthography-and-surface";

export const corpus = defineGoldenCorpus({
	route: "grammatical-resolution/de/lexeme/auxiliary",
	inputSchema,
	outputSchema,
	collections: {
		inflection: inflectionCases,
		orthographyAndSurface: orthographyAndSurfaceCases,
		classifiedContrasts: classifiedContrastCases,
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
