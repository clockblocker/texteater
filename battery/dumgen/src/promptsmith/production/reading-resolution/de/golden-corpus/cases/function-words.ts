import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

export const functionWords = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"reading-de-lexeme-adv-sonst-usual": {
			input: {
				markedContext:
					"Er arbeitet <TARGET>sonst</TARGET> im Homeoffice, heute aber im Büro.",
				lemma: "sonst",
				existingEmojiDescriptions: ["⚠️"],
			},
			idealOutput: { decision: "New", emojiDescription: "🔁" },
			explanation:
				"Usual circumstances, not an otherwise-warning reading. New.",
		},
		"reading-de-lexeme-aux-werden-passive": {
			input: {
				markedContext:
					"Der Antrag <TARGET>wird</TARGET> morgen geprüft.",
				lemma: "werden",
				existingEmojiDescriptions: ["🔮"],
			},
			idealOutput: { decision: "New", emojiDescription: "🔄" },
			explanation: "Passive auxiliary use, not future prediction. New.",
		},
		"reading-de-lexeme-cconj-aber-contrast-reuse": {
			input: {
				markedContext: "Sie ist müde, <TARGET>aber</TARGET> zufrieden.",
				lemma: "aber",
				existingEmojiDescriptions: ["↔️"],
			},
			idealOutput: { decision: "Reuse", emojiDescription: "↔️" },
			explanation: "Contrast between coordinated statements. Reuse.",
		},
		"reading-de-lexeme-det-dieser-demonstrative-reuse": {
			input: {
				markedContext: "Ich nehme <TARGET>diesen</TARGET> Stuhl.",
				lemma: "dieser",
				existingEmojiDescriptions: ["👉"],
			},
			idealOutput: { decision: "Reuse", emojiDescription: "👉" },
			explanation:
				"Demonstrative selection of a particular referent. Reuse.",
		},
		"reading-de-lexeme-intj-hurra-celebration-new": {
			input: {
				markedContext: "<TARGET>Hurra</TARGET>, wir haben gewonnen!",
				lemma: "Hurra",
				existingEmojiDescriptions: [],
			},
			idealOutput: { decision: "New", emojiDescription: "🎉" },
			explanation: "A stable exclamation of celebration. New.",
		},
		"reading-de-lexeme-num-drei-cardinal-reuse": {
			input: {
				markedContext: "Sie kauft <TARGET>drei</TARGET> Äpfel.",
				lemma: "drei",
				existingEmojiDescriptions: ["3️⃣"],
			},
			idealOutput: { decision: "Reuse", emojiDescription: "3️⃣" },
			explanation: "Cardinal quantity three. Reuse.",
		},
		"reading-de-lexeme-part-nicht-negation-reuse": {
			input: {
				markedContext: "Das stimmt <TARGET>nicht</TARGET>.",
				lemma: "nicht",
				existingEmojiDescriptions: ["🚫"],
			},
			idealOutput: { decision: "Reuse", emojiDescription: "🚫" },
			explanation: "Ordinary negation. Reuse.",
		},
		"reading-de-lexeme-pron-jemand-person-reuse": {
			input: {
				markedContext: "<TARGET>Jemand</TARGET> wartet vor der Tür.",
				lemma: "jemand",
				existingEmojiDescriptions: ["👤"],
			},
			idealOutput: { decision: "Reuse", emojiDescription: "👤" },
			explanation: "An unspecified person. Reuse.",
		},
		"reading-de-lexeme-sconj-waehrend-adversative": {
			input: {
				markedContext:
					"<TARGET>Während</TARGET> Lea gern früh beginnt, arbeitet Amir lieber abends.",
				lemma: "während",
				existingEmojiDescriptions: ["⏳"],
			},
			idealOutput: { decision: "New", emojiDescription: "↔️" },
			explanation: "Adversative contrast, not temporal duration. New.",
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
