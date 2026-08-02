import type { ExampleSet } from "../../../../../assembly";
import type { inputSchema } from "../input-schema";
import type { outputSchema } from "../output-schema";

/**
 * ADP emoji rules:
 * - Name relation, not complement or scene.
 * - Same broad relation reuses one emoji, even across domains.
 * - Clear stable relation gets semantic emoji; material change gets new emoji.
 * - No clear standalone relation: use generic connector 🔗.
 */
export const adpExamples = [
	{
		id: "reading-de-use-adp-mit-new-means",
		input: {
			markedContext:
				"Mara schneidet das Brot <TARGET>mit</TARGET> einem Messer.",
			lemma: "mit",
			existingEmojiDescriptions: ["🤝", "🔗"],
		},
		idealOutput: {
			decision: "New",
			emojiDescription: "🛠️",
		},
		explanation: "Means, not companion. New.",
	},
	{
		id: "reading-de-use-adp-mit-reuse-connector",
		input: {
			markedContext: "Wir rechnen <TARGET>mit</TARGET> Regen.",
			lemma: "mit",
			existingEmojiDescriptions: ["🤝", "🛠️", "🔗"],
		},
		idealOutput: {
			decision: "Reuse",
			emojiDescription: "🔗",
		},
		explanation: "rechnen mit fixed. mit only links.",
	},
	{
		id: "reading-de-use-adp-ueber-new-topic",
		input: {
			markedContext: "Sie sprechen <TARGET>über</TARGET> den Unfall.",
			lemma: "über",
			existingEmojiDescriptions: ["⬆️", "🔗"],
		},
		idealOutput: {
			decision: "New",
			emojiDescription: "💬",
		},
		explanation: "Topic, not above. New.",
	},
	{
		id: "reading-de-use-adp-um-new-topic",
		input: {
			markedContext: "Der Streit geht <TARGET>um</TARGET> Geld.",
			lemma: "um",
			existingEmojiDescriptions: ["🔄", "🔗"],
		},
		idealOutput: {
			decision: "New",
			emojiDescription: "💬",
		},
		explanation: "Topic, not around. New.",
	},
	{
		id: "reading-de-use-adp-um-new-clock-time",
		input: {
			markedContext: "Der Zug fährt <TARGET>um</TARGET> acht Uhr.",
			lemma: "um",
			existingEmojiDescriptions: ["🔄", "💬", "🔗"],
		},
		idealOutput: {
			decision: "New",
			emojiDescription: "⏰",
		},
		explanation: "Clock point. New.",
	},
	{
		id: "reading-de-use-adp-nach-reuse-connector",
		input: {
			markedContext: "Die Jacke riecht <TARGET>nach</TARGET> Rauch.",
			lemma: "nach",
			existingEmojiDescriptions: ["🧭", "⏭️", "🔗"],
		},
		idealOutput: {
			decision: "Reuse",
			emojiDescription: "🔗",
		},
		explanation: "Smell from phrase. nach only links.",
	},
	{
		id: "reading-de-use-adp-vor-reuse-broad-precedence",
		input: {
			markedContext: "Sie ruft mich <TARGET>vor</TARGET> dem Essen an.",
			lemma: "vor",
			existingEmojiDescriptions: ["⏮️", "🔗"],
		},
		idealOutput: {
			decision: "Reuse",
			emojiDescription: "⏮️",
		},
		explanation: "Still before. Reuse.",
	},
	{
		id: "reading-de-use-adp-vor-reuse-connector",
		input: {
			markedContext: "Das Kind zittert <TARGET>vor</TARGET> Angst.",
			lemma: "vor",
			existingEmojiDescriptions: ["⏮️", "🔗"],
		},
		idealOutput: {
			decision: "Reuse",
			emojiDescription: "🔗",
		},
		explanation: "No before. Cause phrase. Use link.",
	},
	{
		id: "reading-de-use-adp-gegen-reuse-counteraction",
		input: {
			markedContext:
				"Sie nimmt eine Tablette <TARGET>gegen</TARGET> Kopfschmerzen.",
			lemma: "gegen",
			existingEmojiDescriptions: ["⚔️"],
		},
		idealOutput: {
			decision: "Reuse",
			emojiDescription: "⚔️",
		},
		explanation: "Medicine fights pain. Same against.",
	},
	{
		id: "reading-de-use-adp-gegen-new-approximation",
		input: {
			markedContext: "Wir kommen <TARGET>gegen</TARGET> acht Uhr.",
			lemma: "gegen",
			existingEmojiDescriptions: ["⚔️"],
		},
		idealOutput: {
			decision: "New",
			emojiDescription: "🤏",
		},
		explanation: "Rough time, not against. New.",
	},
	{
		id: "reading-de-test-lexeme-adp-mit-instrument-vs-accompaniment",
		input: {
			markedContext:
				"Die Mechanikerin löst die Schraube <TARGET>mit</TARGET> einem Schlüssel.",
			lemma: "mit",
			existingEmojiDescriptions: ["🤝", "🔗"],
		},
		idealOutput: {
			decision: "New",
			emojiDescription: "🛠️",
		},
	},
] as const satisfies ExampleSet<typeof inputSchema, typeof outputSchema>;
