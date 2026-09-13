import {
	defineGoldenCaseCollection,
	defineGoldenCorpus,
} from "../../../../assembly";
import { inputSchema, outputSchema } from "../schemas";
export const corpus = defineGoldenCorpus({
	route: "reading-generation/de",
	inputSchema,
	outputSchema,
	collections: {
		examples: defineGoldenCaseCollection(import.meta.url, {
			cases: {
				"reading-generation-house": {
					input: {
						markedContext:
							"Wir wohnen in einem <TARGET>Haus</TARGET>.",
						lemma: "Haus",
					},
					idealOutput: { emojiDescription: "🏠" },
				},
				"reading-generation-bank-seat": {
					input: {
						markedContext:
							"Wir sitzen auf einer <TARGET>Bank</TARGET> im Park.",
						lemma: "Bank",
					},
					idealOutput: { emojiDescription: "🪑" },
				},
				"reading-generation-maus-computer": {
					input: {
						markedContext:
							"Klicke mit der <TARGET>Maus</TARGET> auf das Symbol.",
						lemma: "Maus",
					},
					idealOutput: { emojiDescription: "🖱️" },
				},
			},
		}),
	},
	fingerprintInput: (input) =>
		input.markedContext.normalize("NFC").replaceAll(/\s+/gu, " ").trim(),
});
