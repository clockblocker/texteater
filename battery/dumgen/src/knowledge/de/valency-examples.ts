/**
 * The valency prompt's worked examples: Readings with the frame Luna
 * answers for them, written as Luna answers (`{valency: [...]}`), so the
 * prompt shows the answer's own shape. Two are Locutions whose fixed noun
 * is no object («den Braten riechen», «einen Bären aufbinden»), the
 * commonest miss without them, and one a Locution and one an adjective
 * that keep a complement they govern.
 *
 * They are the valency notation bench's r3 examples in JSON, the
 * `json-examples@r3` control that, with `valency.restraint`, matched gold
 * on 59.8% of 193 dev Readings and 59.3% of 54 held-out ones, against
 * 54.7% and 52.8% without (2026-11-19, 2 reps).
 *
 * No example is a Lemma of the Knowledge gold or the spot-check samples
 * (#693); `valencyExampleLemmas` names them for the disjointness test,
 * since the line quotes none «…».
 */
import type { CitingPrompt } from "dumcorpus/types";
import { type Cite, paragraphRegistry } from "../../prompt-paragraphs.js";

const valencyRule: Cite = [
	"de/valency-frame-follows-e-valbu",
	"f0b9c8226ff45fb8",
];

const registry = paragraphRegistry("de/knowledge");

const someone = { kind: "Case", governedCase: "Nom", referent: "Someone" };
const subject = { status: "Required", complements: [someone] };

/** Each example's Lemma, its Emoji Description and the frame Luna answers. */
const examples = [
	{
		lemma: "ahnen",
		emoji: "🤔",
		valency: [
			subject,
			{
				status: "Optional",
				complements: [
					{
						kind: "Case",
						governedCase: "Acc",
						referent: "Something",
					},
					{ kind: "Clause", form: "Dass", correlate: "Optional" },
					{ kind: "Clause", form: "Ob", correlate: "Optional" },
					{ kind: "Clause", form: "W", correlate: "Optional" },
				],
			},
		],
	},
	{
		lemma: "freuen",
		emoji: "🪞😊",
		valency: [
			subject,
			{
				status: "Required",
				complements: [{ kind: "Reflexive", governedCase: "Acc" }],
			},
			{
				status: "Optional",
				complements: [
					{
						kind: "Preposition",
						preposition: "auf",
						governedCase: "Acc",
						referent: "Either",
					},
					{
						kind: "Preposition",
						preposition: "über",
						governedCase: "Acc",
						referent: "Either",
					},
					{ kind: "Clause", form: "Dass", correlate: "Optional" },
					{
						kind: "Clause",
						form: "ZuInfinitive",
						correlate: "Optional",
					},
				],
			},
		],
	},
	{
		lemma: "halten",
		emoji: "🤔⚖",
		valency: [
			subject,
			{
				status: "Required",
				complements: [
					{ kind: "Case", governedCase: "Acc", referent: "Either" },
				],
			},
			{
				status: "Required",
				complements: [
					{ kind: "Predicative", of: "Object", marker: "Für" },
				],
			},
		],
	},
	{
		lemma: "fehlen",
		emoji: "🕳",
		valency: [
			{
				status: "Required",
				complements: [
					{ kind: "Case", governedCase: "Dat", referent: "Someone" },
				],
			},
			{
				status: "Required",
				complements: [
					{
						kind: "Preposition",
						preposition: "an",
						governedCase: "Dat",
						referent: "Something",
					},
				],
			},
		],
	},
	{
		lemma: "dauern",
		emoji: "⏳",
		valency: [
			{
				status: "Required",
				complements: [
					{
						kind: "Case",
						governedCase: "Nom",
						referent: "Something",
					},
				],
			},
			{
				status: "Required",
				complements: [{ kind: "Adverbial", standIn: "IrgendwieLange" }],
			},
		],
	},
	{
		lemma: "neidisch",
		emoji: "😒",
		valency: [
			{
				status: "Optional",
				complements: [
					{
						kind: "Preposition",
						preposition: "auf",
						governedCase: "Acc",
						referent: "Either",
					},
				],
			},
		],
	},
	{ lemma: "Fenster", emoji: "🪟", valency: [] },
	{ lemma: "den Braten riechen", emoji: "👃🕵", valency: [subject] },
	{
		lemma: "einen Bären aufbinden",
		emoji: "🐻🤥",
		valency: [
			subject,
			{
				status: "Required",
				complements: [
					{ kind: "Case", governedCase: "Dat", referent: "Someone" },
				],
			},
		],
	},
	{
		lemma: "Rede und Antwort stehen",
		emoji: "🗣❓",
		valency: [
			subject,
			{
				status: "Optional",
				complements: [
					{ kind: "Case", governedCase: "Dat", referent: "Someone" },
				],
			},
		],
	},
	{
		lemma: "abhängig",
		emoji: "🔗",
		valency: [
			{
				status: "Required",
				complements: [
					{
						kind: "Preposition",
						preposition: "von",
						governedCase: "Dat",
						referent: "Either",
					},
				],
			},
		],
	},
] as const;

/** The examples as one line, each Reading then its answer. */
export const valencyExamples = registry.paragraph(
	"valency.examples",
	`Examples: ${examples
		.map(
			({ lemma, emoji, valency }) =>
				`${lemma} ${emoji}: ${JSON.stringify({ valency })}`,
		)
		.join("; ")}.`,
	valencyRule,
);

/** The examples' Lemmas, for the disjointness test (#693). */
export const valencyExampleLemmas: readonly string[] = examples.map(
	({ lemma }) => lemma,
);

/** The registered paragraph, as dumcorpus's citation check reads it. */
export function valencyExamplePromptTexts(): readonly CitingPrompt[] {
	return registry.texts();
}
