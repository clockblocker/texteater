/**
 * What every German Knowledge aspect works from: the Reading, the marked
 * Sentence, jev's `Ask`, Luna's `Write` and the operation's log, and the
 * checks that turn an answer into Dumrel changes. An aspect fails with a
 * `ProviderFailure` or an `InvalidModelOutput` from its calls, or with `KnowledgeUnresolved` when
 * its judges or writer leave it undecided; `produce.ts` turns each into
 * that aspect's failure value.
 */

import type { EntryType } from "@typesafe-ai/sdk";
import type * as Dumling from "dumling/types";
import {
	applyKnowledgeChange,
	applyParadigmChanges,
	paradigmChangesFor,
	parseKnowledgeChange,
	parseParadigmChange,
} from "dumrel";
import type * as Dumrel from "dumrel/types";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import { CallLog } from "../../call.js";
import { InvalidModelOutput, type ProviderFailure } from "../../errors.js";
import { type Jev, stageAsk } from "../../jev-call.js";
import { type Luna, stageWrite, type Write } from "../../luna-call.js";
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

/** The Reading as every prompt names it: the sense boundary (#623). */
type ReadingView = {
	readonly lemma: string;
	readonly kind: string;
	readonly family: string;
	readonly emojiDescription?: string;
};

export type AspectContext = {
	readonly log: CallLog["Service"];
	/** jev judges (#862). */
	readonly ask: Ask;
	/** Luna writes (#862). */
	readonly write: Write;
	readonly reading: Dumling.Reading<"de">;
	readonly lemma: Dumling.Lemma<"de">;
	readonly view: ReadingView;
	/** The Sentence with the occurrence's Segments marked `<TARGET>…</TARGET>`. */
	readonly markedSentence: string;
	readonly attestation: Dumling.Attestation<"de">;
	/**
	 * The Lemma's stored Paradigm and its Readings, the produced one among
	 * them, that Paradigm Changes are checked against; an empty Paradigm
	 * and the Reading alone for a Lemma's first Reading.
	 */
	readonly paradigm: StoredParadigm;
};

/** A Lemma's stored Paradigm and the Readings its Licences name. */
export type StoredParadigm = {
	readonly paradigm: Dumrel.LemmaParadigm;
	readonly readings: readonly Dumling.Reading<"de">[];
};

/** The aspects' context, with jev, Luna and the log of the running operation. */
export const aspectContext = (
	reading: Dumling.Reading<"de">,
	attestation: Dumling.Attestation<"de">,
	markedSentence: string,
	paradigm: StoredParadigm = {
		paradigm: { dimensions: {} },
		readings: [reading],
	},
): Effect.Effect<AspectContext, never, Jev | Luna | CallLog> =>
	Effect.gen(function* () {
		const { lemma } = reading;
		// A Foreign Reading has no Emoji Description (ADR 0045).
		const emojiDescription =
			"emojiDescription" in reading
				? reading.emojiDescription
				: undefined;
		return {
			log: yield* CallLog,
			ask: yield* stageAsk,
			write: yield* stageWrite,
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
			paradigm,
		};
	});

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
	return context.write(
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
	const strings = Array.isArray(output)
		? output.filter((value): value is string => typeof value === "string")
		: [];
	if (!Array.isArray(output) || strings.length !== output.length)
		return unusable(
			stage,
			`Luna answered no array of text: ${JSON.stringify(output).slice(0, 80)}`,
		);
	const texts = [
		...new Set(
			strings
				.map((value) => value.trim())
				.filter((value) => value !== ""),
		),
	];
	if (texts.length > max)
		return unusable(stage, `Luna answered ${texts.length}, past ${max}`);
	return texts;
}

/**
 * The changes Dumrel accepts for the Reading, as Dumrel answers them, each
 * checked on its own against empty Knowledge; one it refuses makes the
 * answer unusable, so the aspect contributes nothing from it (Dumgen ADR
 * 0003).
 */
export function checkedChanges(
	context: AspectContext,
	aspect: KnowledgeAspect,
	changes: readonly unknown[],
): GermanKnowledgeChange[] | InvalidModelOutput {
	const accepted: GermanKnowledgeChange[] = [];
	for (const change of changes) {
		const applied = applyKnowledgeChange({
			source: context.reading,
			knowledge: {},
			change,
		});
		const parsed = applied.success
			? parseKnowledgeChange({ source: context.reading, change })
			: applied;
		if (!parsed.success)
			return unusable(
				aspect,
				`Dumrel refuses the ${aspect} change: ${parsed.error.message.slice(0, 200)}`,
			);
		accepted.push(parsed.value);
	}
	return accepted;
}

/**
 * The Paradigm Changes that give the Reading the forms written for one
 * Variation Dimension (ADR 0048): a Contribute per variant and a License
 * over them all, each checked by Dumrel, and the list checked whole on the
 * stored Paradigm. A form the Paradigm already holds contributes nothing
 * new and is licensed all the same. Dumrel refusing any of them makes the
 * answer unusable.
 */
export function checkedParadigmChanges(
	context: AspectContext,
	dimension: Dumrel.DimensionId,
	values: readonly string[],
): Dumrel.ParadigmChange[] | InvalidModelOutput {
	return checkedOnStored(
		context,
		dimension,
		paradigmChangesFor({
			reading: context.reading,
			dimension,
			values,
			provenance: "Produced",
		}),
		"forms",
	);
}

/**
 * `changes` of one dimension, each checked by Dumrel and the list checked
 * whole on the stored Paradigm, or why Dumrel refuses them.
 */
export function checkedOnStored(
	context: AspectContext,
	dimension: Dumrel.DimensionId,
	changes: readonly Dumrel.ParadigmChange[],
	what: string,
): Dumrel.ParadigmChange[] | InvalidModelOutput {
	const { lemma } = context.reading;
	const applied = applyParadigmChanges({
		lemma,
		readings: context.paradigm.readings,
		paradigm: context.paradigm.paradigm,
		changes,
	});
	if (!applied.success)
		return unusable(
			dimension,
			`Dumrel refuses the ${dimension} ${what}: ${applied.error.message.slice(0, 200)}`,
		);
	const accepted: Dumrel.ParadigmChange[] = [];
	for (const change of changes) {
		const parsed = parseParadigmChange({ lemma, change });
		if (!parsed.success)
			return unusable(
				dimension,
				`Dumrel refuses the ${dimension} change: ${parsed.error.message.slice(0, 200)}`,
			);
		accepted.push(parsed.value);
	}
	return accepted;
}
