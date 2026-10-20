/**
 * `translate.sentence` (#1210): one German Sentence goes in, its
 * translation into a Dumrel translation language comes out, written by
 * Luna in one call. The Sentences around it are context only. No judge
 * checks the text (ADR 0023), and nothing of it is Knowledge: the
 * `translations` aspect gives a Reading's dictionary equivalents, never a
 * Sentence's.
 */
import { translationLanguageValues } from "dumrel";
import * as Effect from "effect/Effect";
import type { OperationScope } from "../call.js";
import { InvalidModelOutput, type ProviderFailure } from "../errors.js";
import { askLuna, type LunaSettings } from "../luna-call.js";
import { sentenceTranslationPrompt } from "./de/prompt.js";
import type { TranslateSentenceInput } from "./types.js";

const stage = "translation";

const translationSchema = { type: "string", minLength: 1 } as const;

const isText = (value: unknown): value is string =>
	typeof value === "string" && value.trim() !== "";

/**
 * Translates one Sentence. Another language than German, a blank
 * Sentence, a language outside Dumrel's translation languages or a
 * neighbour that is no text is bad input, a Defect raised before anything
 * is asked.
 */
export const translateSentence = Effect.fnUntraced(function* (
	scope: OperationScope,
	luna: LunaSettings,
	input: TranslateSentenceInput,
): Effect.fn.Return<string, ProviderFailure | InvalidModelOutput> {
	const language: string = input.language;
	if (language !== "de")
		return yield* Effect.die(
			Error(
				`translate.sentence translates German ("de") only, not ${JSON.stringify(language)}`,
			),
		);
	if (!isText(input.sentence))
		return yield* Effect.die(Error("translate.sentence needs a Sentence"));
	const into: string = input.into;
	if (!translationLanguageValues.some((known) => known === into))
		return yield* Effect.die(
			Error(
				`translate.sentence translates into ${translationLanguageValues.join(" or ")}, not ${JSON.stringify(into)}`,
			),
		);
	const { before, after } = input.neighbours ?? {};
	for (const neighbour of [before, after])
		if (neighbour !== undefined && typeof neighbour !== "string")
			return yield* Effect.die(
				Error(
					"translate.sentence needs each neighbouring Sentence as text",
				),
			);
	return yield* askLuna(
		scope,
		luna,
		stage,
		{
			systemPrompt: sentenceTranslationPrompt,
			input: {
				sentence: input.sentence.trim(),
				language: into,
				...(isText(before) ? { before: before.trim() } : {}),
				...(isText(after) ? { after: after.trim() } : {}),
			},
			outputFormat: "json",
			outputSchema: translationSchema,
		},
		(output) =>
			isText(output)
				? output.trim()
				: new InvalidModelOutput({
						stage,
						message: `Luna answered no translation: ${JSON.stringify(output)?.slice(0, 80)}`,
					}),
	);
});
