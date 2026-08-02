import type { ExampleSet, ExampleSetTree } from "../../../../../assembly";
import type { inputSchema } from "../input-schema";
import type { outputSchema } from "../output-schema";

const ueberStorytelling = [
	{
		id: "reading-de-adp-ueber-connector",
		input: {
			markedContext:
				"Das Hotel verfügt <TARGET>über</TARGET> einen Pool.",
			lemma: "über",
			existingEmojiDescriptions: [],
		},
		idealOutput: {
			decision: "New",
			emojiDescription: "🔗",
		},
		explanation: "verfügen über fixed. über only links. New.",
	},
	{
		id: "reading-de-adp-ueber-above",
		input: {
			markedContext: "Die Lampe hängt <TARGET>über</TARGET> dem Tisch.",
			lemma: "über",
			existingEmojiDescriptions: ["🔗"],
		},
		idealOutput: {
			decision: "New",
			emojiDescription: "⬆️",
		},
		explanation: "Above, not a generic connector. New.",
	},
	{
		id: "reading-de-adp-ueber-topic-unfall",
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
		id: "reading-de-adp-ueber-topic-wetter",
		input: {
			markedContext: "Wir reden <TARGET>über</TARGET> das Wetter.",
			lemma: "über",
			existingEmojiDescriptions: ["⬆️", "💬", "🔗"],
		},
		idealOutput: {
			decision: "Reuse",
			emojiDescription: "💬",
		},
		explanation: "Topic. Reuse.",
	},
] as const satisfies ExampleSet<typeof inputSchema, typeof outputSchema>;

/**
 * ADP emoji-picking rules:
 * - Name relation, not complement or scene.
 * - Within a lemma, reuse one emoji for the same broad relation across domains.
 * - Different lemmas may use the same emoji independently.
 * - Clear stable relation gets semantic emoji; material change gets new emoji.
 * - No clear standalone relation: use generic connector 🔗.
 *
 * Related: `battery/dumgen/docs/persistent/prompting-philosophie.md`
 */
export const adpExamples = {
	ueberStorytelling,
	rest: [
		{
			id: "reading-de-adp-mit-means",
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
			id: "reading-de-adp-mit-connector",
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
			id: "reading-de-adp-um-topic",
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
			id: "reading-de-adp-um-clock-time",
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
			id: "reading-de-adp-nach-sensory-characteristic",
			input: {
				markedContext: "Die Jacke riecht <TARGET>nach</TARGET> Rauch.",
				lemma: "nach",
				existingEmojiDescriptions: ["🧭", "⏭️", "🔗"],
			},
			idealOutput: {
				decision: "New",
				emojiDescription: "🪞",
			},
			explanation: "Seems like. Not direction. New.",
		},
		{
			id: "reading-de-adp-vor-broad-precedence",
			input: {
				markedContext:
					"Sie ruft mich <TARGET>vor</TARGET> dem Essen an.",
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
			id: "reading-de-adp-vor-cause",
			input: {
				markedContext: "Das Kind zittert <TARGET>vor</TARGET> Angst.",
				lemma: "vor",
				existingEmojiDescriptions: ["⏮️", "🔗"],
			},
			idealOutput: {
				decision: "New",
				emojiDescription: "⚡",
			},
			explanation: "Cause, not before. New.",
		},
		{
			id: "reading-de-adp-gegen-counteraction",
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
			id: "reading-de-adp-gegen-approximation",
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
			id: "reading-de-adp-mit-instrument",
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
	],
} as const satisfies ExampleSetTree<typeof inputSchema, typeof outputSchema>;
