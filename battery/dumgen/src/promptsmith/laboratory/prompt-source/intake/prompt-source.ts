import {
	defineLocalDemonstrations,
	definePromptSource,
} from "../../../assembly";
import { inputSchema, outputSchema } from "./schemas";

const body = `Resolve the source text's single primary language for segmentation routing.

Return Accepted with language "de" when German is primary and some useful
material can be segmented for downstream German resolution. Ordinary typos,
malformed but intelligible German, and local unknown or non-German spans do not
prevent acceptance.

Return UnsupportedLanguage with the resolved nonempty language when the text
is valid language but its primary language is not German. Return
Unintelligible with language null only for gibberish or corruption too severe
for a defensible reading.

Resolve only language; do not segment, correct, or interpret individual
words.`;

const demonstrations = defineLocalDemonstrations({
	inputSchema,
	outputSchema,
	cases: [
		{
			input: { text: "Der Kaffe ist heiß, see you!" },
			idealOutput: { decision: "Accepted", language: "de" },
		},
	],
});

export const promptSource = definePromptSource({
	route: "intake",
	inputSchema,
	outputSchema,
	body,
	demonstrations,
});
