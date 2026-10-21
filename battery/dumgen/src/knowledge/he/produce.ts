import { lemmaIdentityKey, parseUnit, routeOf } from "dumling";
import {
	applyKnowledgeChanges,
	parseKnowledgeChange,
	selectKnowledge,
	translationLanguageValues,
} from "dumrel";
import {
	formulaRoleSchema,
	hebrewParadigmSchema,
	hebrewValencyComplementSchema,
	knowledgeRequestMaskSchema,
	locutionTypeSchema,
	sayingTypeSchema,
	valencySlotStatusSchema,
} from "dumrel/schema";
import type * as Dumrel from "dumrel/types";
import * as Effect from "effect/Effect";
import * as Semaphore from "effect/Semaphore";
import { z } from "zod";
import type { OperationScope } from "../../call.js";
import { InvalidModelOutput, type ProviderFailure } from "../../errors.js";
import type { JevSettings } from "../../jev-call.js";
import { askLuna, type LunaSettings } from "../../luna-call.js";
import type {
	KnowledgeChange,
	KnowledgeFailure,
	KnowledgeProduction,
	ProduceKnowledgeInput,
} from "../types.js";
import { hebrewKnowledgePrompts } from "./prompts.js";

export type HebrewKnowledgeModels = {
	readonly luna: LunaSettings;
	readonly jev: JevSettings;
};
type Change = KnowledgeChange<"he">;
type Output = {
	readonly changes: readonly Change[];
	readonly failures: readonly KnowledgeFailure[];
};
type Job = {
	readonly aspect: KnowledgeFailure["aspect"];
	readonly leaf?: string;
	readonly run: Effect.Effect<
		readonly Change[] | null,
		ProviderFailure | InvalidModelOutput
	>;
};
const textSchema = {
	anyOf: [{ type: "string", minLength: 1 }, { type: "null" }],
} as const;
const translationSchema = {
	anyOf: [
		{
			type: "array",
			items: { type: "string", minLength: 1 },
			minItems: 1,
			maxItems: 3,
		},
		{ type: "null" },
	],
} as const;
const invalid = (stage: string, message: string) =>
	new InvalidModelOutput({ stage, message });

function validateInput<E>(
	input: ProduceKnowledgeInput<E, "he">,
): string | undefined {
	if (
		input.language !== "he" ||
		input.reading.lemma.language !== "he" ||
		input.attestation.surface.lemma.language !== "he"
	)
		return "Expected Hebrew Knowledge input";
	for (const value of [input.reading, input.attestation]) {
		const parsed = parseUnit(value);
		if (!parsed.success) return parsed.error.message;
	}
	if (
		lemmaIdentityKey(input.reading.lemma) !==
		lemmaIdentityKey(input.attestation.surface.lemma)
	)
		return "The Attestation is of another Lemma than the Reading";
	if (input.origin !== "New" && input.origin !== "TopUp")
		return "Expected New or TopUp origin";
	const { segments, target } = input.sentence;
	if (
		target.length === 0 ||
		target.some(
			(value, index) =>
				!Number.isInteger(value) ||
				value < 0 ||
				value >= segments.length ||
				(index > 0 && value <= (target[index - 1] ?? -1)),
		)
	)
		return "The target is no ascending run of the Sentence's Segments";
	if (!knowledgeRequestMaskSchema.safeParse(input.request).success)
		return "The request is not a Knowledge Request Mask";
	return undefined;
}

function checkedChanges<E>(
	input: ProduceKnowledgeInput<E, "he">,
	aspect: string,
	changes: readonly unknown[],
): Change[] | InvalidModelOutput {
	const accepted: Change[] = [];
	for (const change of changes) {
		const parsed = parseKnowledgeChange({ source: input.reading, change });
		if (!parsed.success)
			return invalid(
				aspect,
				`Dumrel refuses the ${aspect} change: ${parsed.error.message}`,
			);
		accepted.push(parsed.value);
	}
	const applied = applyKnowledgeChanges({
		source: input.reading,
		knowledge: {},
		changes: accepted,
	});
	return applied.success
		? accepted
		: invalid(
				aspect,
				`Dumrel refuses the ${aspect} changes: ${applied.error.message}`,
			);
}

function textJob<E>(
	scope: OperationScope,
	models: HebrewKnowledgeModels,
	input: ProduceKnowledgeInput<E, "he">,
	aspect: "definition" | "transcription" | "translations",
	language?: Dumrel.TranslationLanguage,
): Job {
	const target = new Set(input.sentence.target);
	const markedSentence = input.sentence.segments
		.map(({ text }, index) =>
			target.has(index) ? `<TARGET>${text}</TARGET>` : text,
		)
		.join("")
		.replaceAll("</TARGET><TARGET>", "");
	return {
		aspect,
		...(language === undefined ? {} : { leaf: language }),
		run: askLuna(
			scope,
			models.luna,
			aspect,
			{
				systemPrompt: hebrewKnowledgePrompts[aspect],
				input: {
					aspect,
					reading: {
						lemma: input.reading.lemma.canonicalForm,
						kind: input.reading.lemma.kind,
						family: input.reading.lemma.family,
						coreFeatures: input.reading.lemma.coreFeatures,
						...("emojiDescription" in input.reading
							? {
									emojiDescription:
										input.reading.emojiDescription,
								}
							: {}),
					},
					...(aspect === "transcription" ? {} : { markedSentence }),
					...(language === undefined ? {} : { language }),
				},
				outputFormat: "json",
				outputSchema:
					aspect === "translations" ? translationSchema : textSchema,
			},
			(output) => {
				if (output === null) return null;
				if (aspect === "translations") {
					if (
						language === undefined ||
						!Array.isArray(output) ||
						output.length === 0 ||
						output.length > 3 ||
						output.some(
							(value) =>
								typeof value !== "string" ||
								value.trim() === "",
						)
					)
						return invalid(
							aspect,
							"Expected one to three nonempty translations or null",
						);
					return checkedChanges(input, aspect, [
						{
							kind: "Contribute",
							aspect,
							language,
							value: [
								...new Set(
									output.map((value: string) => value.trim()),
								),
							],
						},
					]);
				}
				if (typeof output !== "string" || !output.trim())
					return invalid(aspect, "Expected nonempty text or null");
				const value =
					aspect === "transcription"
						? output
								.trim()
								.replace(/^[/[](.*)[/\]]$/u, "$1")
								.trim()
						: output.trim();
				if (
					aspect === "transcription" &&
					(value.match(/[aeiouəɛɔɐɑɒɜɞɪʊʌyøœɨʉɯɤ]/gu)?.length ?? 0) >
						1 &&
					!value.includes("ˈ")
				)
					return invalid(
						aspect,
						"Multisyllabic IPA must mark primary stress; unstressed romanization is not a pronunciation result",
					);
				return checkedChanges(input, aspect, [
					{ kind: "Contribute", aspect, value },
				]);
			},
		),
	};
}

const classificationSchemas = {
	formulaRole: formulaRoleSchema,
	locutionType: locutionTypeSchema,
	sayingType: sayingTypeSchema,
};
function classificationJob<E>(
	scope: OperationScope,
	models: HebrewKnowledgeModels,
	input: ProduceKnowledgeInput<E, "he">,
	aspect: keyof typeof classificationSchemas,
): Job {
	return {
		aspect,
		run: askLuna(
			scope,
			models.luna,
			aspect,
			{
				systemPrompt: hebrewKnowledgePrompts[aspect],
				input: {
					aspect,
					reading: {
						lemma: input.reading.lemma.canonicalForm,
						kind: input.reading.lemma.kind,
						family: input.reading.lemma.family,
						...("emojiDescription" in input.reading
							? {
									emojiDescription:
										input.reading.emojiDescription,
								}
							: {}),
					},
				},
				outputFormat: "json",
				outputSchema: {
					anyOf: [
						z.toJSONSchema(classificationSchemas[aspect]),
						{ type: "null" },
					],
				},
			},
			(output) =>
				output === null
					? null
					: checkedChanges(input, aspect, [
							{ kind: "Contribute", aspect, value: output },
						]),
		),
	};
}

function valencyJob<E>(
	scope: OperationScope,
	models: HebrewKnowledgeModels,
	input: ProduceKnowledgeInput<E, "he">,
): Job {
	const schema = z.array(
		z.strictObject({
			status: valencySlotStatusSchema,
			complements: z.array(hebrewValencyComplementSchema).min(1),
		}),
	);
	return {
		aspect: "valency",
		run: askLuna(
			scope,
			models.luna,
			"valency",
			{
				systemPrompt: hebrewKnowledgePrompts.valency,
				input: {
					aspect: "valency",
					markedSentence: input.sentence.segments
						.map(({ text }, index) =>
							input.sentence.target.includes(index)
								? `<TARGET>${text}</TARGET>`
								: text,
						)
						.join("")
						.replaceAll("</TARGET><TARGET>", ""),
					reading: {
						lemma: input.reading.lemma.canonicalForm,
						kind: input.reading.lemma.kind,
						family: input.reading.lemma.family,
						coreFeatures: input.reading.lemma.coreFeatures,
						...("emojiDescription" in input.reading
							? {
									emojiDescription:
										input.reading.emojiDescription,
								}
							: {}),
					},
					...(input.origin === "New" &&
					"valencyEvidence" in input.attestation
						? {
								newReadingEvidence:
									input.attestation.valencyEvidence,
							}
						: {}),
				},
				outputFormat: "json",
				outputSchema: {
					anyOf: [z.toJSONSchema(schema), { type: "null" }],
				},
			},
			(output) => {
				if (output === null) return null;
				const parsed = schema.safeParse(output);
				if (!parsed.success)
					return invalid("valency", parsed.error.message);
				return parsed.data.length === 0
					? []
					: checkedChanges(input, "valency", [
							{
								kind: "Contribute",
								aspect: "valency",
								value: parsed.data,
							},
						]);
			},
		),
	};
}

function paradigmJob<E>(
	scope: OperationScope,
	models: HebrewKnowledgeModels,
	input: ProduceKnowledgeInput<E, "he">,
): Job {
	return {
		aspect: "hebrewParadigm",
		run: askLuna(
			scope,
			models.luna,
			"hebrewParadigm",
			{
				systemPrompt: hebrewKnowledgePrompts.hebrewParadigm,
				input: {
					aspect: "hebrewParadigm",
					markedSentence: input.sentence.segments
						.map(({ text }, index) =>
							input.sentence.target.includes(index)
								? `<TARGET>${text}</TARGET>`
								: text,
						)
						.join("")
						.replaceAll("</TARGET><TARGET>", ""),
					reading: {
						lemma: input.reading.lemma.canonicalForm,
						kind: input.reading.lemma.kind,
						family: input.reading.lemma.family,
						coreFeatures: input.reading.lemma.coreFeatures,
						...("emojiDescription" in input.reading
							? {
									emojiDescription:
										input.reading.emojiDescription,
								}
							: {}),
					},
				},
				outputFormat: "json",
				outputSchema: {
					anyOf: [
						z.toJSONSchema(hebrewParadigmSchema),
						{ type: "null" },
					],
				},
			},
			(output) =>
				output === null
					? null
					: checkedChanges(input, "hebrewParadigm", [
							{
								kind: "Contribute",
								aspect: "hebrewParadigm",
								value: output,
							},
						]),
		),
	};
}

/** Hebrew's Knowledge producer. Every contribution is source-checked; failures are values, not invented coverage. */
export const produceHebrewKnowledge = <E>(
	scope: OperationScope,
	models: HebrewKnowledgeModels,
	input: ProduceKnowledgeInput<E, "he">,
): Effect.Effect<KnowledgeProduction<"he">, E> =>
	Effect.gen(function* () {
		const problem = validateInput(input);
		if (problem) return yield* Effect.die(Error(problem));
		const selected = selectKnowledge({
			route: routeOf(input.reading.lemma),
		});
		if (!selected.success)
			return yield* Effect.die(Error(selected.error.message));
		const jobs: Job[] = [];
		const skipped: string[] = [];
		for (const [aspect, selection] of Object.entries(input.request)) {
			if (!(aspect in selected.value)) {
				skipped.push(aspect);
				continue;
			}
			if (aspect === "definition" || aspect === "transcription")
				jobs.push(textJob(scope, models, input, aspect));
			else if (
				aspect === "formulaRole" ||
				aspect === "locutionType" ||
				aspect === "sayingType"
			)
				jobs.push(classificationJob(scope, models, input, aspect));
			else if (aspect === "valency")
				jobs.push(valencyJob(scope, models, input));
			else if (aspect === "hebrewParadigm")
				jobs.push(paradigmJob(scope, models, input));
			else if (aspect === "translations") {
				for (const key of Object.keys(selection ?? {})) {
					const language = translationLanguageValues.find(
						(value) => value === key,
					);
					if (
						language &&
						language in (selected.value.translations ?? {})
					)
						jobs.push(
							textJob(
								scope,
								models,
								input,
								"translations",
								language,
							),
						);
					else skipped.push(`translations.${key}`);
				}
			} else skipped.push(aspect);
		}
		if (skipped.length)
			scope.event({ name: "SkippedAspects", data: { skipped } });
		const publication = Semaphore.makeUnsafe(1);
		const outputs = yield* Effect.forEach(
			jobs,
			(job) =>
				job.run.pipe(
					Effect.map(
						(changes): Output =>
							changes === null
								? {
										changes: [],
										failures: [
											{
												aspect: job.aspect,
												...(job.leaf === undefined
													? {}
													: { leaf: job.leaf }),
												code: "Unresolved",
												message: `The Hebrew writer left ${job.aspect} undecided`,
											},
										],
									}
								: { changes, failures: [] },
					),
					Effect.catch((error) =>
						Effect.succeed<Output>({
							changes: [],
							failures: [
								{
									aspect: job.aspect,
									...(job.leaf === undefined
										? {}
										: { leaf: job.leaf }),
									code: error._tag,
									message: error.message,
								},
							],
						}),
					),
					Effect.tap((output) =>
						input.onContribution === undefined ||
						output.changes.length === 0
							? Effect.void
							: publication.withPermits(1)(
									input.onContribution(output.changes),
								),
					),
				),
			{ concurrency: "unbounded" },
		);
		return {
			changes: outputs.flatMap((output) => output.changes),
			pendingRelations: [],
			failures: outputs.flatMap((output) => output.failures),
		};
	});
