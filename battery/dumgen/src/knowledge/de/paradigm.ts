/**
 * Who writes a Reading's Licence in each requested Variation Dimension
 * (ADR 0048, Dumgen ADR 0003, #1260):
 *
 * - **No stored variant.** The dimension is written as for a Lemma's first
 *   Reading: Luna writes the sense's forms, and code turns each into a
 *   variant the Reading licenses explicitly.
 * - **Stored variants, a created Reading.** Luna first writes the
 *   dimension's forms for the sense, never seeing the stored ones. Where
 *   they are the stored variants, by content id, code licenses those and
 *   asks nothing more. Where they differ, the licence judge
 *   (`licence-judge.ts`), one jev request over every such dimension, sees
 *   the stored variants and Luna's new forms together and picks the forms
 *   the sense takes: the stored ones it picks are licensed, the new ones
 *   it picks become variants. A form Luna omits (`melkte` beside `molk`)
 *   never reads as conditioning on its own: only the judge leaves a stored
 *   form out.
 * - **Stored variants, a reused Reading.** Skipped: the Reading's Licence
 *   stays as it is, stated or Unstated. Only a created Reading's Licence
 *   is written; a later occurrence's added variant is #1234's step.
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
import type { KnowledgeFailure, KnowledgeOrigin } from "../types.js";
import {
	type AspectContext,
	type AspectError,
	checkedOnStored,
} from "./context.js";
import {
	judgeLicences,
	type LicenceOffer,
	type OfferedForm,
} from "./licence-judge.js";
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

/** An aspect's error as the failure of `dimension`. */
const failureOf = (
	dimension: Dumrel.DimensionId,
	error: AspectError,
): KnowledgeFailure => ({
	aspect: dimension,
	code: error._tag === "KnowledgeUnresolved" ? "Unresolved" : error._tag,
	message: error.message,
});

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

/** The values Luna's checked changes contribute to `dimension`, in order. */
const contributed = (
	changes: readonly Dumrel.ParadigmChange[],
	dimension: Dumrel.DimensionId,
) =>
	changes.flatMap((change) =>
		change.dimension === dimension && change.kind === "Contribute"
			? [change.value]
			: [],
	);

/**
 * The changes that license `taken` to the Reading, checked on the stored
 * Paradigm: a Contribute per form the Paradigm lacks, then one License
 * over them all.
 */
const licenceOf = (
	context: AspectContext,
	dimension: Dumrel.DimensionId,
	taken: readonly OfferedForm[],
): Dumrel.ParadigmChange[] | InvalidModelOutput =>
	checkedOnStored(
		context,
		dimension,
		[
			...taken.flatMap(({ value, stored }): Dumrel.ParadigmChange[] =>
				stored
					? []
					: [
							{
								kind: "Contribute",
								dimension,
								value,
								provenance: "Produced",
							},
						],
			),
			{
				kind: "License",
				dimension,
				reading: structuredClone(context.reading),
				variants: taken.map(({ id }) => id),
			},
		],
		"licence",
	);

/**
 * The forms a judged dimension shows: its stored variants, then each form
 * Luna wrote that the Paradigm lacks; or none when Luna wrote exactly the
 * stored variants, which code licenses without a judge.
 */
function offerOf(
	context: AspectContext,
	dimension: Dumrel.DimensionId,
	values: readonly string[],
): { readonly matched: boolean; readonly forms: OfferedForm[] } {
	const stored = context.paradigm.paradigm.dimensions[dimension]?.variants;
	const forms: OfferedForm[] = (stored ?? []).map(({ id, value }) => ({
		value,
		id,
		stored: true,
	}));
	const storedIds = new Set(forms.map(({ id }) => id));
	const writtenIds = new Set<string>();
	for (const value of values) {
		const id = variantIdOf(context.lemma, dimension, value);
		if (!storedIds.has(id) && !writtenIds.has(id))
			forms.push({ value, id, stored: false });
		writtenIds.add(id);
	}
	const matched =
		writtenIds.size === storedIds.size &&
		[...storedIds].every((id) => writtenIds.has(id));
	return { matched, forms };
}

/**
 * A created Reading's dimensions when some hold stored variants: Luna
 * writes every requested dimension first, in one write per Paradigm Policy
 * part; then each judged dimension is licensed as matched, or put to the
 * judge's one request. Each dimension fails on its own: a failed write
 * fails its dimensions, a judge with no answer the dimensions it was asked.
 */
const writtenThenJudged = (
	context: AspectContext,
	judged: readonly Dumrel.DimensionId[],
	fresh: readonly Dumrel.DimensionId[],
	policy: readonly Dumrel.DimensionId[],
): Effect.Effect<ParadigmOutput, AspectError> =>
	Effect.gen(function* () {
		const writing = policy.filter(
			(dimension) =>
				judged.includes(dimension) || fresh.includes(dimension),
		);
		const output = yield* written(context, writing).pipe(
			Effect.catch((error: AspectError) =>
				Effect.succeed({
					paradigmChanges: [],
					failures: writing.map((dimension) =>
						failureOf(dimension, error),
					),
				}),
			),
		);
		const failures = [...output.failures];
		const failed = new Set(failures.map(({ aspect }) => aspect));
		const changes = output.paradigmChanges.filter(({ dimension }) =>
			fresh.includes(dimension),
		);
		const land = (
			dimension: Dumrel.DimensionId,
			taken: readonly OfferedForm[],
			data: Readonly<Record<string, unknown>>,
		) => {
			const licence = licenceOf(context, dimension, taken);
			if (licence instanceof InvalidModelOutput)
				failures.push(failureOf(dimension, licence));
			else changes.push(...licence);
			context.scope.event({
				name: "ParadigmLicence",
				data: {
					dimension,
					...data,
					variants: taken.map(({ id }) => id),
					added: taken
						.filter(({ stored }) => !stored)
						.map(({ value }) => value),
				},
			});
		};
		const offers: (LicenceOffer & { readonly written: string[] })[] = [];
		for (const dimension of judged) {
			if (failed.has(dimension)) continue;
			const values = contributed(output.paradigmChanges, dimension);
			const { matched, forms } = offerOf(context, dimension, values);
			if (matched)
				land(
					dimension,
					forms.filter(({ stored }) => stored),
					{ outcome: "Matched", written: values },
				);
			else offers.push({ dimension, forms, written: values });
		}
		if (offers.length > 0) {
			const judgment = yield* judgeLicences(context, offers).pipe(
				Effect.catch((error: AspectError) =>
					Effect.succeed({
						verdicts: [],
						refused: new Map(
							offers.map(({ dimension }) => [dimension, error]),
						),
					}),
				),
			);
			for (const [dimension, error] of judgment.refused)
				failures.push(failureOf(dimension, error));
			for (const {
				dimension,
				taken,
				probabilities,
			} of judgment.verdicts) {
				const offer = offers.find(
					(entry) => entry.dimension === dimension,
				);
				land(dimension, taken, {
					outcome: "Judged",
					written: offer?.written ?? [],
					forms: offer?.forms.map(({ value }) => value) ?? [],
					probabilities,
				});
			}
		}
		const order = (dimension: string) =>
			policy.indexOf(dimension as Dumrel.DimensionId);
		return {
			paradigmChanges: policy.flatMap((dimension) =>
				changes.filter((change) => change.dimension === dimension),
			),
			failures: failures.sort(
				(left, right) => order(left.aspect) - order(right.aspect),
			),
		};
	});

/**
 * The jobs for the requested Variation Dimensions the route's Paradigm
 * Policy names, in policy order. With no stored variant in any, one job
 * for a noun's plural and one write for a verb's principal parts (#1209,
 * #1217); otherwise one job, Luna's writes before the judge. A dimension
 * the policy doesn't name, or a reused Reading's dimension with stored
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
				writtenThenJudged(context, judged, fresh, policy),
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
