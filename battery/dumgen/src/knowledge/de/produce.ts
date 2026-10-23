/**
 * The German body of `knowledge.produce` (#883): one path, after the Reading
 * resolves, with no drafts (#623).
 *
 * - The Reading's route fixes what applies (Dumgen ADR 0003): an aspect
 *   or leaf its Knowledge Policy lacks and a Variation Dimension its
 *   Paradigm Policy doesn't name are skipped. The split by Family stays here.
 * - A Closed Route, or an exact authored Reading, takes its Knowledge from
 *   dumcorpus through tf-demo, so every aspect still requested is a
 *   `CatalogMiss` and nothing is asked (ADR 0021).
 * - Every other aspect runs at once under the instance's request budget,
 *   isolated: its failure is a value, and its siblings land (#445, #446).
 * - Each aspect's Knowledge changes go to `onContribution` as it finishes,
 *   one contribution at a time; its failure is the run's only error and
 *   interrupts the aspects still running. Paradigm Changes come back with
 *   the result only.
 * - The returned changes, pending relations and failures read in job order
 *   (the request's order, then the dimensions'), not the order the aspects
 *   finish in (#1122).
 * - The requested Variation Dimensions go to `paradigm.ts`: written as for
 *   a Lemma's first Reading, or, for a created Reading of a Lemma with
 *   stored variants, written and then, where the forms differ from the
 *   stored ones, put to the licence judge (ADR 0048, #1260).
 * - Bad input is a Defect, raised before anything is asked: a stored
 *   Paradigm Dumrel refuses for the Lemma and its Readings among it.
 */

import { authoredReading, closedRoute } from "dumcorpus/inventories";
import { lemmaIdentityKey, readingIdentityKey, routeOf } from "dumling";
import type * as Dumling from "dumling/types";
import {
	dimensionIdValues,
	directSemanticRelationValues,
	parseLemmaParadigm,
	selectKnowledge,
	translationLanguageValues,
} from "dumrel";
import type * as Dumrel from "dumrel/types";
import * as Effect from "effect/Effect";
import * as Semaphore from "effect/Semaphore";
import type { CallLog } from "../../call.js";
import type { Jev } from "../../jev-call.js";
import type { Luna } from "../../luna-call.js";
import { markedSentence } from "../../resolve/reading.js";
import type {
	GermanKnowledgeChange,
	GermanPendingRelation,
	KnowledgeAspect,
	KnowledgeFailure,
	KnowledgeOrigin,
	KnowledgeProduction,
	ProduceKnowledgeInput,
} from "../types.js";
import {
	type AspectContext,
	type AspectError,
	aspectContext,
	type StoredParadigm,
} from "./context.js";
import { paradigmJobsOf } from "./paradigm.js";
import { produceRelations } from "./relations.js";
import {
	produceFormulaRole,
	produceLocutionType,
	produceSayingType,
	produceSource,
} from "./structure.js";
import {
	produceDefinition,
	produceTranscription,
	produceTranslation,
} from "./text.js";
import { produceValency } from "./valency.js";

/** What one aspect brings back once it ran. */
type AspectOutput = {
	readonly changes: readonly GermanKnowledgeChange[];
	readonly paradigmChanges?: readonly Dumrel.ParadigmChange[];
	readonly pendingRelations?: readonly GermanPendingRelation[];
	readonly failures?: readonly KnowledgeFailure[];
};

/** A Knowledge aspect, or a Variation Dimension of the Lemma Paradigm. */
type JobAspect = KnowledgeAspect | Dumrel.DimensionId;

/**
 * One aspect, one translation language or one Variation Dimension to
 * produce. A job that fills more from the same call names them `alongside`,
 * and fails for each of them.
 */
type Job = {
	readonly aspect: JobAspect;
	readonly alongside?: readonly JobAspect[];
	readonly leaf?: string;
	readonly run: Effect.Effect<AspectOutput, AspectError>;
};

const aspectsOf = (job: Job): readonly JobAspect[] => [
	job.aspect,
	...(job.alongside ?? []),
];

const requestAspects = new Set<string>([
	"transcription",
	"definition",
	"translations",
	"semanticRelations",
	"valency",
	"source",
	"locutionType",
	"sayingType",
	"formulaRole",
]);

const changesOnly = (
	run: Effect.Effect<readonly GermanKnowledgeChange[], AspectError>,
): Effect.Effect<AspectOutput, AspectError> =>
	Effect.map(run, (changes) => ({ changes }));

/** The jobs a request asks for that the route applies, in the request's order. */
function jobsOf(
	context: AspectContext,
	request: Dumrel.KnowledgeRequestMask,
	applicable: Dumrel.KnowledgeRequestMask,
	origin: KnowledgeOrigin,
): { readonly jobs: Job[]; readonly skipped: string[] } {
	const jobs: Job[] = [];
	const skipped: string[] = [];
	for (const [aspect, selection] of Object.entries(request)) {
		if (!(aspect in applicable)) {
			skipped.push(aspect);
			continue;
		}
		switch (aspect) {
			case "transcription":
				jobs.push({
					aspect,
					run: changesOnly(produceTranscription(context)),
				});
				break;
			case "definition":
				jobs.push({
					aspect,
					run: changesOnly(produceDefinition(context)),
				});
				break;
			case "translations":
				for (const language of Object.keys(selection ?? {})) {
					const known = translationLanguageValues.find(
						(value) => value === language,
					);
					if (
						known === undefined ||
						!(known in (applicable.translations ?? {}))
					) {
						skipped.push(`${aspect}.${language}`);
						continue;
					}
					jobs.push({
						aspect,
						leaf: known,
						run: changesOnly(produceTranslation(context, known)),
					});
				}
				break;
			case "semanticRelations": {
				const relations = Object.keys(selection ?? {}).flatMap(
					(relation) => {
						const direct = directSemanticRelationValues.find(
							(value) => value === relation,
						);
						if (
							direct === undefined ||
							!(direct in (applicable.semanticRelations ?? {}))
						) {
							skipped.push(`${aspect}.${relation}`);
							return [];
						}
						return [direct];
					},
				);
				if (relations.length > 0)
					jobs.push({
						aspect,
						run: Effect.map(
							produceRelations(context, relations),
							(pendingRelations) => ({
								changes: [],
								pendingRelations,
							}),
						),
					});
				break;
			}
			case "valency":
				jobs.push({ aspect, run: produceValency(context, origin) });
				break;
			case "source":
				jobs.push({
					aspect,
					run: changesOnly(produceSource(context)),
				});
				break;
			case "locutionType":
				jobs.push({
					aspect,
					run: changesOnly(produceLocutionType(context)),
				});
				break;
			case "sayingType":
				jobs.push({
					aspect,
					run: changesOnly(produceSayingType(context)),
				});
				break;
			case "formulaRole":
				jobs.push({
					aspect,
					run: changesOnly(produceFormulaRole(context)),
				});
				break;
		}
	}
	return { jobs, skipped };
}

/** An aspect's error as its failure value. */
const failureOf = (
	job: Job,
	aspect: JobAspect,
	error: AspectError,
): KnowledgeFailure => ({
	aspect,
	...(job.leaf !== undefined
		? { leaf: job.leaf }
		: error._tag === "KnowledgeUnresolved" && error.leaf !== undefined
			? { leaf: error.leaf }
			: {}),
	code: error._tag === "KnowledgeUnresolved" ? "Unresolved" : error._tag,
	message: error.message,
});

/** Why the input is bad, if it is: a Defect, raised before anything is asked. */
function badInput<E>(input: ProduceKnowledgeInput<E>): string | undefined {
	const { reading, attestation, sentence, request } = input;
	if (
		lemmaIdentityKey(attestation.surface.lemma) !==
		lemmaIdentityKey(reading.lemma)
	)
		return "The Attestation is of another Lemma than the Reading";
	if (input.origin !== "New" && input.origin !== "TopUp")
		return `origin is New or TopUp, not ${JSON.stringify(input.origin)}`;
	const { segments, target } = sentence;
	if (
		target.length === 0 ||
		target.some(
			(index, at) =>
				!Number.isInteger(index) ||
				index < 0 ||
				index >= segments.length ||
				(at > 0 && index <= (target[at - 1] ?? -1)),
		)
	)
		return "The target is no ascending run of the Sentence's Segments";
	for (const aspect of Object.keys(request))
		if (!requestAspects.has(aspect))
			return `The request names no Knowledge aspect ${aspect}`;
	for (const dimension of input.paradigm?.dimensions ?? [])
		if (!(dimensionIdValues as readonly string[]).includes(dimension))
			return `The paradigm request names no Variation Dimension ${dimension}`;
	return undefined;
}

/**
 * The stored Paradigm the input brings, checked by Dumrel against the
 * Lemma and its Readings, the produced one added when the host left it
 * out; or why it is bad input.
 */
function storedParadigmOf<E>(
	input: ProduceKnowledgeInput<E>,
): StoredParadigm | string {
	const { reading } = input;
	const siblings = input.paradigm?.readings ?? [];
	for (const sibling of siblings)
		if (lemmaIdentityKey(sibling.lemma) !== lemmaIdentityKey(reading.lemma))
			return "A paradigm Reading is of another Lemma than the Reading";
	const key = readingIdentityKey(reading);
	const readings: Dumling.Reading<"de">[] = [
		reading,
		...siblings.filter((sibling) => readingIdentityKey(sibling) !== key),
	];
	const parsed = parseLemmaParadigm({
		lemma: reading.lemma,
		paradigm: input.paradigm?.stored ?? { dimensions: {} },
		readings,
	});
	if (!parsed.success)
		return `The stored Paradigm is no Paradigm of the Lemma and its Readings: ${parsed.error.message.slice(0, 200)}`;
	return { paradigm: parsed.value, readings };
}

export const produceGermanKnowledge = <E>(
	input: ProduceKnowledgeInput<E>,
): Effect.Effect<KnowledgeProduction, E, Jev | Luna | CallLog> =>
	Effect.gen(function* () {
		const problem = badInput(input);
		if (problem) return yield* Effect.die(Error(problem));
		const stored = storedParadigmOf(input);
		if (typeof stored === "string") return yield* Effect.die(Error(stored));
		const { reading, attestation, request } = input;
		const { family, kind } = reading.lemma;
		const selected = selectKnowledge({ route: routeOf(reading.lemma) });
		if (!selected.success)
			return yield* Effect.die(
				Error(`No German Knowledge Policy for ${family} ${kind}`),
			);
		const context = yield* aspectContext(
			reading,
			attestation,
			markedSentence(input.sentence.segments, input.sentence.target),
			stored,
		);
		const { jobs, skipped } = jobsOf(
			context,
			request,
			selected.value,
			input.origin,
		);
		jobs.push(
			...paradigmJobsOf(
				context,
				input.paradigm?.dimensions ?? [],
				input.origin,
				skipped,
			).map(
				({ run, ...job }): Job => ({
					...job,
					run: Effect.map(run, (output) => ({
						changes: [],
						...output,
					})),
				}),
			),
		);
		if (skipped.length > 0)
			context.log.event({ name: "SkippedAspects", data: { skipped } });
		// Authored Knowledge is tf-demo's to attach (ADR 0021).
		if (closedRoute(reading.lemma) || authoredReading(reading))
			return {
				changes: [],
				paradigmChanges: [],
				pendingRelations: [],
				failures: jobs.flatMap((job) =>
					aspectsOf(job).map((aspect) => ({
						aspect,
						...(job.leaf === undefined ? {} : { leaf: job.leaf }),
						code: "CatalogMiss",
						message: `The authored ${family} ${kind} ${reading.lemma.canonicalForm} has no reviewed ${aspect}`,
					})),
				),
			};
		const publication = Semaphore.makeUnsafe(1);
		const publish = (contribution: readonly GermanKnowledgeChange[]) =>
			input.onContribution === undefined || contribution.length === 0
				? Effect.void
				: publication.withPermits(1)(
						input.onContribution(contribution),
					);
		// Effect.forEach keeps the input order, so the result reads in job
		// order however the jobs finish (#1122).
		const outputs = yield* Effect.forEach(
			jobs,
			(job) =>
				job.run.pipe(
					Effect.catch((error: AspectError) =>
						Effect.succeed<AspectOutput>({
							changes: [],
							failures: aspectsOf(job).map((aspect) =>
								failureOf(job, aspect, error),
							),
						}),
					),
					Effect.tap((output) => publish(output.changes)),
				),
			{ concurrency: "unbounded" },
		);
		return {
			changes: outputs.flatMap((output) => output.changes),
			paradigmChanges: outputs.flatMap(
				(output) => output.paradigmChanges ?? [],
			),
			pendingRelations: outputs.flatMap(
				(output) => output.pendingRelations ?? [],
			),
			failures: outputs.flatMap((output) => output.failures ?? []),
		};
	});
