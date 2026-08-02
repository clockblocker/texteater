import { readingLegend } from "../../../../../../../../../experiments/issue-22-compact-noun-dtos/compact-codecs";
import {
	defineLocalDemonstrations,
	definePromptSource,
} from "../../../../../../../../assembly";
import { inputSchema, outputSchema } from "./schemas";

const body = `PROTOTYPE ONLY: compact German Lexeme/NOUN Reading Resolution for issue #22.

The marked context shows one use of the supplied fixed Lemma. Do not revise the
Lemma. If an existing description is close enough for the learner-facing
concept, copy it exactly and answer Reuse. Otherwise answer New with one compact
emoji description. An emojiDescription contains only emoji: never append the
Lemma, a gloss, or explanatory text. Exact description membership remains
authoritative. Return only the compact schema.

Compact legend:
${readingLegend}

Do not return verbose property names, a Lemma, Surface, ID, Meaning, Sense,
confidence, candidates, notes, or explanation.`;

const demonstrations = defineLocalDemonstrations({
	inputSchema,
	outputSchema,
	cases: [
		{
			input: {
				c: "Wir sitzen in der <TARGET>Bibliothek</TARGET>.",
				l: { c: "Bibliothek", g: "F", h: null },
				e: [],
			},
			idealOutput: { d: "N", e: "📚" },
		},
		{
			input: {
				c: "Der <TARGET>Tee</TARGET> duftet.",
				l: { c: "Tee", g: "M", h: null },
				e: ["☕"],
			},
			idealOutput: { d: "R", e: "☕" },
		},
	],
});

export const promptSource = definePromptSource({
	route: "reading-resolution/de/lexeme/noun",
	inputSchema,
	outputSchema,
	body,
	demonstrations,
});
