import type { ExampleSet } from "../../../../assembly";
import type { inputSchema } from "./input-schema";
import type { outputSchema } from "./output-schema";

export const examplesForTest = [
	{
		id: "reading-de-test-bank-financial-vs-bench",
		input: {
			markedContext: "Sie hebt Geld bei der <TARGET>Bank</TARGET> ab.",
			lemma: "Bank",
			existingEmojiDescriptions: ["🪑"],
		},
		idealOutput: {
			decision: "New",
			emojiDescription: "🏦",
		},
	},
	{
		id: "reading-de-test-key-metaphor-reuse",
		input: {
			markedContext:
				"Geduld ist der <TARGET>Schlüssel</TARGET> zum Erfolg.",
			lemma: "Schlüssel",
			existingEmojiDescriptions: ["🔑"],
		},
		idealOutput: {
			decision: "Reuse",
			emojiDescription: "🔑",
		},
	},
	{
		id: "reading-de-test-bank-park-bench-reuse",
		input: {
			markedContext:
				"Wir sitzen auf einer <TARGET>Bank</TARGET> im Park.",
			lemma: "Bank",
			existingEmojiDescriptions: ["🪑"],
		},
		idealOutput: {
			decision: "Reuse",
			emojiDescription: "🪑",
		},
	},
	{
		id: "reading-de-test-separable-aufstehen-new",
		input: {
			markedContext:
				"Morgen <TARGET>steht</TARGET> sie um sechs Uhr <TARGET>auf</TARGET>.",
			lemma: "aufstehen",
			existingEmojiDescriptions: [],
		},
		idealOutput: {
			decision: "New",
			emojiDescription: "🛏️⬆️",
		},
	},
	{
		id: "reading-de-test-maus-computer-vs-animal",
		input: {
			markedContext: "Bewege den Zeiger mit der <TARGET>Maus</TARGET>.",
			lemma: "Maus",
			existingEmojiDescriptions: ["🐭"],
		},
		idealOutput: {
			decision: "New",
			emojiDescription: "🖱️",
		},
	},
	{
		id: "reading-de-test-idiom-mit-den-woelfen-heulen",
		input: {
			markedContext:
				"Obwohl er anderer Meinung war, <TARGET>heulte</TARGET> er <TARGET>mit</TARGET>.",
			lemma: "mit den Wölfen heulen",
			existingEmojiDescriptions: [],
		},
		idealOutput: {
			decision: "New",
			emojiDescription: "🐺🗣️🤝",
		},
	},
	{
		id: "reading-de-test-leitung-management-vs-cable",
		input: {
			markedContext:
				"Die <TARGET>Leitung</TARGET> berief eine Sitzung ein.",
			lemma: "Leitung",
			existingEmojiDescriptions: ["🔌"],
		},
		idealOutput: {
			decision: "New",
			emojiDescription: "🧑‍💼",
		},
	},
	{
		id: "reading-de-test-scharf-spicy-vs-sharp",
		input: {
			markedContext: "Die Suppe ist sehr <TARGET>scharf</TARGET>.",
			lemma: "scharf",
			existingEmojiDescriptions: ["🔪"],
		},
		idealOutput: {
			decision: "New",
			emojiDescription: "🌶️",
		},
	},
	{
		id: "reading-de-test-scharf-select-sharp",
		input: {
			markedContext:
				"Das Messer ist <TARGET>scharf</TARGET> genug, um das Brot zu schneiden.",
			lemma: "scharf",
			existingEmojiDescriptions: ["🌶️", "🔪"],
		},
		idealOutput: {
			decision: "Reuse",
			emojiDescription: "🔪",
		},
	},
	{
		id: "reading-de-test-absatz-select-paragraph",
		input: {
			markedContext:
				"Im zweiten <TARGET>Absatz</TARGET> steht die Begründung.",
			lemma: "Absatz",
			existingEmojiDescriptions: ["👠", "📈", "📄"],
		},
		idealOutput: {
			decision: "Reuse",
			emojiDescription: "📄",
		},
	},
] as const satisfies ExampleSet<typeof inputSchema, typeof outputSchema>;
