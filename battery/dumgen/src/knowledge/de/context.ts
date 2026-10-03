/**
 * What every German Knowledge aspect works from: the Reading, the marked
 * Sentence, the two ports and the checks that turn an answer into Dumrel
 * changes. An aspect fails with a `ProviderFailure` or an
 * `InvalidModelOutput` from its calls, or with `KnowledgeUnresolved` when
 * its judges or writer leave it undecided; `produce.ts` turns each into
 * that aspect's failure value.
 */

import type * as Dumling from "dumling/types";
import { applyKnowledgeChange } from "dumrel";
import * as Data from "effect/Data";
import type * as Effect from "effect/Effect";
import type { EntryType } from "promptsmith/typesafe";
import type { OperationScope } from "../../call.js";
import { InvalidModelOutput, type ProviderFailure } from "../../errors.js";
import { askThrough, type JevSettings } from "../../jev-call.js";
import { askLuna, type LunaSettings } from "../../luna-call.js";
import type { Ask } from "../../segment/ask.js";
import type { GermanKnowledgeChange, KnowledgeAspect } from "../types.js";

/** An aspect its judges or writer left undecided (#883: `Unresolved`). */
export class KnowledgeUnresolved extends Data.TaggedError(
	"KnowledgeUnresolved",
)<{ readonly message: string; readonly leaf?: string }> {}

export type AspectError =
	| ProviderFailure
	| InvalidModelOutput
	| KnowledgeUnresolved;

/** What the aspects reach their models with: jev judges, Luna writes (#862). */
export type KnowledgeModels = {
	readonly jev: JevSettings;
	readonly luna: LunaSettings;
};

/** The Reading as every prompt names it: the sense boundary (#623). */
export type ReadingView = {
	readonly lemma: string;
	readonly kind: string;
	readonly family: string;
	readonly emojiDescription?: string;
};

export type AspectContext = {
	readonly scope: OperationScope;
	readonly models: KnowledgeModels;
	readonly ask: Ask;
	readonly reading: Dumling.Reading<"de">;
	readonly lemma: Dumling.Lemma<"de">;
	readonly view: ReadingView;
	/** The Sentence with the occurrence's Segments marked `<TARGET>…</TARGET>`. */
	readonly markedSentence: string;
	readonly attestation: Dumling.Attestation<"de">;
};

export function aspectContext(
	scope: OperationScope,
	models: KnowledgeModels,
	reading: Dumling.Reading<"de">,
	attestation: Dumling.Attestation<"de">,
	markedSentence: string,
): AspectContext {
	const lemma = reading.lemma as Dumling.Lemma<"de">;
	const emojiDescription = (reading as { emojiDescription?: string })
		.emojiDescription;
	return {
		scope,
		models,
		ask: askThrough(scope, models.jev),
		reading,
		lemma,
		view: {
			lemma: lemma.canonicalForm,
			kind: lemma.kind,
			family: lemma.family,
			...(emojiDescription === undefined ? {} : { emojiDescription }),
		},
		markedSentence,
		attestation,
	};
}

/**
 * One Luna request of an aspect: its system prompt, the Reading and the
 * marked Sentence with whatever the aspect adds, JSON back under `schema`
 * (strict mode off, as every Dumgen writing call: the check enforces it).
 * The input names its `aspect`, so a cached answer is keyed by it.
 */
export function write<Output>(
	context: AspectContext,
	stage: string,
	systemPrompt: string,
	extra: Readonly<Record<string, unknown>>,
	schema: Readonly<Record<string, unknown>>,
	check: (output: unknown) => Output | InvalidModelOutput,
	options: { readonly withSentence?: boolean } = {},
): Effect.Effect<Output, ProviderFailure | InvalidModelOutput> {
	return askLuna(
		context.scope,
		context.models.luna,
		stage,
		{
			systemPrompt,
			input: {
				aspect: stage,
				reading: context.view,
				...(options.withSentence === false
					? {}
					: { markedSentence: context.markedSentence }),
				...extra,
			},
			outputFormat: "json",
			outputSchema: schema,
		},
		check,
	);
}

/** The jev state every judgment reads: the Reading and the marked Sentence. */
export const judgeState = (
	context: AspectContext,
	extra: Readonly<Record<string, EntryType>> = {},
): Readonly<Record<string, EntryType>> => ({
	reading: { ...context.view },
	markedSentence: context.markedSentence,
	...extra,
});

export const unusable = (stage: string, message: string) =>
	new InvalidModelOutput({ stage, message });

/** A string answer, trimmed, or why it is none. */
export function textOf(
	stage: string,
	output: unknown,
): string | InvalidModelOutput {
	if (typeof output !== "string" || output.trim() === "")
		return unusable(
			stage,
			`Luna answered no text: ${JSON.stringify(output).slice(0, 80)}`,
		);
	return output.trim();
}

/** An array of strings, trimmed and distinct, of at most `max`, or why it is none. */
export function textsOf(
	stage: string,
	output: unknown,
	max: number,
): string[] | InvalidModelOutput {
	if (
		!Array.isArray(output) ||
		output.some((value) => typeof value !== "string")
	)
		return unusable(
			stage,
			`Luna answered no array of text: ${JSON.stringify(output).slice(0, 80)}`,
		);
	const texts = [
		...new Set(
			(output as string[])
				.map((value) => value.trim())
				.filter((value) => value !== ""),
		),
	];
	if (texts.length > max)
		return unusable(stage, `Luna answered ${texts.length}, past ${max}`);
	return texts;
}

/**
 * The changes Dumrel accepts for the Reading, each checked on its own
 * against empty Knowledge; one it refuses makes the answer unusable, so
 * the aspect contributes nothing from it (Dumgen ADR 0003).
 */
export function checkedChanges(
	context: AspectContext,
	aspect: KnowledgeAspect,
	changes: readonly unknown[],
): GermanKnowledgeChange[] | InvalidModelOutput {
	for (const change of changes) {
		const applied = applyKnowledgeChange({
			source: context.reading,
			knowledge: {},
			change,
		});
		if (!applied.success)
			return unusable(
				aspect,
				`Dumrel refuses the ${aspect} change: ${applied.error.message.slice(0, 200)}`,
			);
	}
	return changes as GermanKnowledgeChange[];
}
