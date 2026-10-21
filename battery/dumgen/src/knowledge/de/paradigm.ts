/**
 * Who writes a Reading's Licence in each requested Variation Dimension
 * (ADR 0048, Dumgen ADR 0003, #1230):
 *
 * - **No stored variant.** The dimension is written as for a Lemma's first
 *   Reading: Luna writes the sense's forms, and code turns each into a
 *   variant the Reading licenses explicitly.
 * - **Stored variants, a created Reading.** The licence judge, one jev
 *   request over every such dimension, asks of each stored variant
 *   whether the sense takes it. The variants it takes are the Reading's
 *   Licence. A dimension where it takes none is NoMatch, and only then
 *   does Luna write that dimension's forms, never seeing the stored ones,
 *   so a form Luna merely omits (`melkte` beside `molk`) never reads as
 *   conditioning. The Reading licenses what Luna writes; what is new
 *   becomes a variant.
 * - **Stored variants, a reused Reading.** Skipped: the Reading's Licence
 *   stays as it is, stated or Unstated. Only a created Reading's Licence
 *   is written; a later occurrence's added variant is #1234's step, which
 *   reuses `judgeLicences`.
 *
 * Only the produced Reading is licensed. Another Reading's Licence is
 * never touched, so an Unstated one keeps taking every variant, new ones
 * too. Code keys the variants and checks every change on the stored
 * Paradigm; Dumdict merges them and removes what no Reading licenses.
 */
import { readingIdentityKey } from "dumling";
import { paradigmDimensions, variantIdOf } from "dumrel";
import type * as Dumrel from "dumrel/types";
import * as Effect from "effect/Effect";
import { InvalidModelOutput } from "../../errors.js";
import { noul, noulOf } from "../../segment/ask.js";
import type { KnowledgeFailure, KnowledgeOrigin } from "../types.js";
import {
	type AspectContext,
	type AspectError,
	checkedOnStored,
	judgeState,
} from "./context.js";
import {
	dimensionParts,
	licenceCriteria,
	licencePolicy,
	licenceQuestion,
	markerForms,
} from "./licence-prompts.js";
import {
	producePlural,
	produceVerbForms,
	type VerbDimension,
} from "./structure.js";

/** What a Paradigm job brings back. */
type ParadigmOutput = {
	readonly paradigmChanges: readonly Dumrel.ParadigmChange[];
	readonly failures?: readonly KnowledgeFailure[];
};

/** One job writing one or more dimensions, failing for each of them. */
export type ParadigmJob = {
	readonly aspect: Dumrel.DimensionId;
	readonly alongside?: readonly Dumrel.DimensionId[];
	readonly run: Effect.Effect<ParadigmOutput, AspectError>;
};

/** jev's request, as the trace and a cache key it. */
const judgeStage = "paradigmLicence";

/**
 * The Noul the judge takes a variant at or above. jev leans to yes on any
 * correct form of the word, so 0.5 let other meanings' forms in; on the
 * German Doublet Rule's gold 0.6 to 0.75 score alike, and 0.6 drops the
 * fewest forms a Free dimension's Reading takes (#1230).
 */
const licenceFloor = 0.6;

/** What the judge made of one dimension: the variants it takes, none being NoMatch. */
type LicenceVerdict = {
	readonly dimension: Dumrel.DimensionId;
	readonly variants: readonly Dumrel.VariantId[];
	/** Each stored variant's noul, by id. */
	readonly nouls: Readonly<Record<Dumrel.VariantId, number>>;
};

/**
 * The licence judge (ADR 0048): one jev request asking, of every stored
 * variant of `dimensions`, whether the context's Reading takes it, the
 * variants bare, as values, beside its Emoji Description and the marked
 * Sentence. A dimension the Paradigm holds no variant of is no question.
 */
const judgeLicences = (
	context: AspectContext,
	paradigm: Dumrel.LemmaParadigm,
	dimensions: readonly Dumrel.DimensionId[],
): Effect.Effect<LicenceVerdict[], AspectError> =>
	Effect.gen(function* () {
		const asked = dimensions.flatMap((dimension, at) =>
			(paradigm.dimensions[dimension]?.variants ?? []).map(
				(variant, index) => ({
					dimension,
					variant,
					id: `l${at}_${index}`,
				}),
			),
		);
		if (asked.length === 0) return [];
		const answers = yield* context.ask({
			stage: judgeStage,
			state: judgeState(context, { policy: { ...licencePolicy } }),
			questions: Object.fromEntries(
				asked.map(({ dimension, variant, id }) => [
					id,
					noul(
						{
							question: licenceQuestion,
							part: dimensionParts[dimension],
							form: Object.hasOwn(markerForms, variant.value)
								? (markerForms[variant.value] ?? variant.value)
								: variant.value,
						},
						{ ...licenceCriteria },
					),
				]),
			),
		});
		return dimensions.flatMap((dimension) => {
			const own = asked.filter((entry) => entry.dimension === dimension);
			if (own.length === 0) return [];
			const nouls = Object.fromEntries(
				own.map(({ variant, id }) => [variant.id, noulOf(answers, id)]),
			);
			return [
				{
					dimension,
					variants: own
						.map(({ variant }) => variant.id)
						.filter((id) => (nouls[id] ?? 0) >= licenceFloor),
					nouls,
				},
			];
		});
	});

/**
 * The License the judge's pick gives the Reading, checked on the stored
 * Paradigm: Dumrel refuses a marker (`NoPlural`) picked beside a form.
 */
const licenceOf = (
	context: AspectContext,
	{ dimension, variants }: LicenceVerdict,
): Dumrel.ParadigmChange[] | InvalidModelOutput =>
	checkedOnStored(
		context,
		dimension,
		[
			{
				kind: "License",
				dimension,
				reading: structuredClone(context.reading),
				variants: [...variants],
			},
		],
		"licence",
	);

/**
 * The Luna writes of `dimensions`, as for a Lemma's first Reading: one
 * plural write, and one principal-parts write for every verb dimension,
 * at once.
 */
function written(
	context: AspectContext,
	dimensions: readonly Dumrel.DimensionId[],
): Effect.Effect<Required<ParadigmOutput>, AspectError> {
	const verbal = dimensions.filter(
		(dimension): dimension is VerbDimension => dimension !== "plural",
	);
	const writes: Effect.Effect<ParadigmOutput, AspectError>[] = [
		...(dimensions.includes("plural")
			? [
					Effect.map(producePlural(context), (paradigmChanges) => ({
						paradigmChanges,
					})),
				]
			: []),
		...(verbal.length > 0 ? [produceVerbForms(context, verbal)] : []),
	];
	return Effect.map(
		Effect.all(writes, { concurrency: "unbounded" }),
		(outputs) => ({
			paradigmChanges: outputs.flatMap(
				(output) => output.paradigmChanges,
			),
			failures: outputs.flatMap((output) => output.failures ?? []),
		}),
	);
}

/** The ids `changes` license, and the values they contribute, for the trace. */
const licensedIn = (
	context: AspectContext,
	dimension: Dumrel.DimensionId,
	changes: readonly Dumrel.ParadigmChange[],
) => {
	const stored = new Set(
		context.paradigm.paradigm.dimensions[dimension]?.variants.map(
			(variant) => variant.id,
		),
	);
	const values = changes.flatMap((change) =>
		change.dimension === dimension && change.kind === "Contribute"
			? [change.value]
			: [],
	);
	return {
		written: values,
		added: values.filter(
			(value) =>
				!stored.has(variantIdOf(context.lemma, dimension, value)),
		),
	};
};

/**
 * A created Reading's dimensions when some hold stored variants: the
 * judge first, then Luna for the NoMatch dimensions and those with no
 * variant yet, in one write per Paradigm Policy part. Each dimension fails
 * on its own, a failed write its dimensions only; a judge with no answer
 * fails them all.
 */
const judgedThenWritten = (
	context: AspectContext,
	judged: readonly Dumrel.DimensionId[],
	fresh: readonly Dumrel.DimensionId[],
	policy: readonly Dumrel.DimensionId[],
): Effect.Effect<ParadigmOutput, AspectError> =>
	Effect.gen(function* () {
		const verdicts = yield* judgeLicences(
			context,
			context.paradigm.paradigm,
			judged,
		);
		const failures: KnowledgeFailure[] = [];
		const changes: Dumrel.ParadigmChange[] = [];
		const noMatch: Dumrel.DimensionId[] = [];
		for (const verdict of verdicts) {
			const { dimension, variants, nouls } = verdict;
			if (variants.length === 0) {
				noMatch.push(dimension);
				continue;
			}
			const licence = licenceOf(context, verdict);
			if (licence instanceof InvalidModelOutput)
				failures.push({
					aspect: dimension,
					code: licence._tag,
					message: licence.message,
				});
			else changes.push(...licence);
			context.scope.event({
				name: "ParadigmLicence",
				data: {
					dimension,
					outcome: "Licensed",
					variants: [...variants],
					nouls,
				},
			});
		}
		// A failed write fails only its dimensions: the Licences the judge
		// gave stand (Dumgen ADR 0003).
		const writing = [...noMatch, ...fresh];
		const output = yield* written(context, writing).pipe(
			Effect.catch((error: AspectError) =>
				Effect.succeed({
					paradigmChanges: [],
					failures: writing.map(
						(dimension): KnowledgeFailure => ({
							aspect: dimension,
							code:
								error._tag === "KnowledgeUnresolved"
									? "Unresolved"
									: error._tag,
							message: error.message,
						}),
					),
				}),
			),
		);
		changes.push(...output.paradigmChanges);
		failures.push(...output.failures);
		for (const { dimension, nouls } of verdicts)
			if (noMatch.includes(dimension))
				context.scope.event({
					name: "ParadigmLicence",
					data: {
						dimension,
						outcome: "NoMatch",
						nouls,
						...licensedIn(context, dimension, changes),
					},
				});
		return {
			paradigmChanges: policy.flatMap((dimension) =>
				changes.filter((change) => change.dimension === dimension),
			),
			failures,
		};
	});

/**
 * The jobs for the requested Variation Dimensions the route's Paradigm
 * Policy names, in policy order. With no stored variant in any, one job
 * for a noun's plural and one write for a verb's principal parts (#1209,
 * #1217); otherwise one job, the judge before the writes. A dimension the
 * policy doesn't name, or a reused Reading's dimension with stored
 * variants, goes to `skipped`.
 */
export function paradigmJobsOf(
	context: AspectContext,
	requested: readonly Dumrel.DimensionId[],
	origin: KnowledgeOrigin,
	skipped: string[],
): ParadigmJob[] {
	const policy = paradigmDimensions(context.lemma);
	for (const dimension of requested)
		if (!policy.includes(dimension)) skipped.push(`paradigm.${dimension}`);
	const stored = context.paradigm.paradigm.dimensions;
	const key = readingIdentityKey(context.reading);
	const judged: Dumrel.DimensionId[] = [];
	const fresh: Dumrel.DimensionId[] = [];
	for (const dimension of policy) {
		if (!requested.includes(dimension)) continue;
		const held = stored[dimension];
		if (held === undefined) fresh.push(dimension);
		else if (origin === "New" && !Object.hasOwn(held.licences, key))
			judged.push(dimension);
		else skipped.push(`paradigm.${dimension}`);
	}
	const jobOf = (
		[first, ...alongside]: readonly [
			Dumrel.DimensionId,
			...Dumrel.DimensionId[],
		],
		run: Effect.Effect<ParadigmOutput, AspectError>,
	): ParadigmJob => ({
		aspect: first,
		...(alongside.length === 0 ? {} : { alongside }),
		run,
	});
	const [firstJudged, ...restJudged] = judged;
	if (firstJudged !== undefined)
		return [
			jobOf(
				[firstJudged, ...restJudged, ...fresh],
				judgedThenWritten(context, judged, fresh, policy),
			),
		];
	// A noun's plural and a verb's principal parts, each its own job.
	const parts = [
		fresh.filter((dimension) => dimension === "plural"),
		fresh.filter((dimension) => dimension !== "plural"),
	];
	return parts.flatMap((part) => {
		const [first, ...alongside] = part;
		return first === undefined
			? []
			: [jobOf([first, ...alongside], written(context, part))];
	});
}
