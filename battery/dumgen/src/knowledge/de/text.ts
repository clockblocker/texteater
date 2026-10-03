/**
 * The text aspects Luna writes (#862): the transcription of the Lemma
 * headword as this Reading pronounces it, a German definition and a
 * translation per language, each in one call of its own (#890 refuted
 * the single call for all of them). The Emoji Description bounds the
 * sense; the Sentence is evidence for the definition and translations
 * only (#623). No judge checks the text: a human spot-checks a sample
 * (#883 point 10).
 */
import type * as Dumrel from "dumrel/types";
import type * as Effect from "effect/Effect";
import type { GermanKnowledgeChange } from "../types.js";
import {
	type AspectContext,
	type AspectError,
	checkedChanges,
	textOf,
	textsOf,
	unusable,
	write,
} from "./context.js";
import { definition, shared, transcription, translation } from "./prompts.js";

export const transcriptionPrompt = [
	shared.reading,
	transcription.task,
	transcription.output,
].join("\n");

export const definitionPrompt = [
	shared.reading,
	shared.evidence,
	definition.task,
	definition.multiword,
	definition.output,
].join("\n");

/** The one translation prompt; the language comes in the input (#697). */
export const translationPrompt = [
	shared.reading,
	shared.evidence,
	translation.task,
	translation.citation,
	translation.form,
	translation.multiword,
	translation.output,
].join("\n");

const stringSchema = { type: "string", minLength: 1 } as const;
const translationsSchema = {
	type: "array",
	items: { type: "string", minLength: 1 },
	minItems: 1,
	maxItems: 3,
} as const;

/** The transcription of the Lemma's headword; it needs no Sentence. */
export const produceTranscription = (
	context: AspectContext,
): Effect.Effect<GermanKnowledgeChange[], AspectError> =>
	write(
		context,
		"transcription",
		transcriptionPrompt,
		{},
		stringSchema,
		(output) => {
			const text = textOf("transcription", output);
			if (typeof text !== "string") return text;
			// The prompt asks for no delimiters; a pair around it says nothing.
			const bare = text.replace(/^[/[](.*)[/\]]$/u, "$1").trim();
			return checkedChanges(context, "transcription", [
				{ kind: "Contribute", aspect: "transcription", value: bare },
			]);
		},
		{ withSentence: false },
	);

export const produceDefinition = (
	context: AspectContext,
): Effect.Effect<GermanKnowledgeChange[], AspectError> =>
	write(
		context,
		"definition",
		definitionPrompt,
		{},
		stringSchema,
		(output) => {
			const text = textOf("definition", output);
			if (typeof text !== "string") return text;
			return checkedChanges(context, "definition", [
				{ kind: "Contribute", aspect: "definition", value: text },
			]);
		},
	);

export const produceTranslation = (
	context: AspectContext,
	language: Dumrel.TranslationLanguage,
): Effect.Effect<GermanKnowledgeChange[], AspectError> =>
	write(
		context,
		"translations",
		translationPrompt,
		{ language },
		translationsSchema,
		(output) => {
			const texts = textsOf("translations", output, 3);
			if (!Array.isArray(texts)) return texts;
			if (texts.length === 0)
				return unusable("translations", "Luna answered no translation");
			return checkedChanges(context, "translations", [
				{
					kind: "Contribute",
					aspect: "translations",
					language,
					value: texts,
				},
			]);
		},
	);
