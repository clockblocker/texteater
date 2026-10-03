/**
 * The body of `knowledge.produce` (#883): one path, after the Reading
 * resolves, with no drafts (#623).
 *
 * - The Reading's route fixes what applies (Dumgen ADR 0003): an aspect
 *   or leaf its Knowledge Policy lacks, and the deferred
 *   `morphologicalTree`, are skipped. The split by Family stays here.
 * - A Closed Route, or an exact authored Reading, takes its Knowledge from
 *   dumspec through tf-demo, so every aspect still requested is a
 *   `CatalogMiss` and nothing is asked (ADR 0021).
 * - Every other aspect runs at once under the instance's request budget,
 *   isolated: its failure is a value, and its siblings land (#445, #446).
 * - Each aspect's changes go to `onContribution` as it finishes, one
 *   contribution at a time; its failure is the run's only error and
 *   interrupts the aspects still running.
 * - Bad input is a Defect, raised before anything is asked.
 */
import { lemmaIdentityKey } from "dumling";
import type * as Dumling from "dumling/types";
import { selectKnowledge } from "dumrel";
import type * as Dumrel from "dumrel/types";
import { authoredReading, closedRoute } from "dumspec/inventories";
import * as Effect from "effect/Effect";
import * as Semaphore from "effect/Semaphore";
import type { OperationScope } from "../call.js";
import { markedSentence } from "../resolve/reading.js";
import {
	type AspectContext,
	type AspectError,
	aspectContext,
	type KnowledgeModels,
} from "./de/context.js";
import { produceRelations } from "./de/relations.js";
import {
	produceConjugationClass,
	produceFormulaRole,
	produceLocutionType,
	produceParticipleSource,
	producePlural,
	produceSayingType,
} from "./de/structure.js";
import {
	produceDefinition,
	produceTranscription,
	produceTranslation,
} from "./de/text.js";
import { produceValency } from "./de/valency.js";
import type {
	GermanKnowledgeChange,
	GermanPendingRelation,
	KnowledgeAspect,
	KnowledgeFailure,
	KnowledgeOrigin,
	KnowledgeProduction,
	ProduceKnowledgeInput,
} from "./types.js";

/** What one aspect brings back once it ran. */
type AspectOutput = {
	readonly changes: readonly GermanKnowledgeChange[];
	readonly pendingRelations?: readonly GermanPendingRelation[];
	readonly failures?: readonly KnowledgeFailure[];
};

/** One aspect, or one translation language, to produce. */
type Job = {
	readonly aspect: KnowledgeAspect;
	readonly leaf?: string;
	readonly run: Effect.Effect<AspectOutput, AspectError>;
};

const requestAspects = new Set<string>([
	"transcription",
	"definition",
	"translations",
	"semanticRelations",
	"valency",
	"participleSource",
	"plural",
	"conjugationClass",
	"locutionType",
	"sayingType",
	"formulaRole",
	"morphologicalTree",
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
	const applies = applicable as Readonly<Record<string, unknown>>;
	for (const [aspect, selection] of Object.entries(request)) {
		if (!(aspect in applies) || aspect === "morphologicalTree") {
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
					if (!(language in (applicable.translations ?? {}))) {
						skipped.push(`${aspect}.${language}`);
						continue;
					}
					jobs.push({
						aspect,
						leaf: language,
						run: changesOnly(
							produceTranslation(
								context,
								language as Dumrel.TranslationLanguage,
							),
						),
					});
				}
				break;
			case "semanticRelations": {
				const relations = Object.keys(selection ?? {}).filter(
					(relation) => {
						const applies =
							relation in (applicable.semanticRelations ?? {});
						if (!applies) skipped.push(`${aspect}.${relation}`);
						return applies;
					},
				) as Dumrel.DirectSemanticRelation[];
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
			case "plural":
				jobs.push({ aspect, run: changesOnly(producePlural(context)) });
				break;
			case "conjugationClass":
				jobs.push({
					aspect,
					run: changesOnly(produceConjugationClass(context)),
				});
				break;
			case "participleSource":
				jobs.push({
					aspect,
					run: changesOnly(produceParticipleSource(context)),
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
const failureOf = (job: Job, error: AspectError): KnowledgeFailure => ({
	aspect: job.aspect,
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
	const lemma = reading.lemma as Dumling.Lemma;
	if (input.language !== "de" || lemma.language !== "de")
		return `knowledge.produce produces German ("de") only, not ${JSON.stringify(lemma.language)}`;
	if (
		lemmaIdentityKey(attestation.surface.lemma as Dumling.Lemma) !==
		lemmaIdentityKey(lemma)
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
	return undefined;
}

export const produceKnowledge = <E>(
	scope: OperationScope,
	models: KnowledgeModels,
	input: ProduceKnowledgeInput<E>,
): Effect.Effect<KnowledgeProduction, E> =>
	Effect.gen(function* () {
		const problem = badInput(input);
		if (problem) return yield* Effect.die(Error(problem));
		const { reading, attestation, request } = input;
		const { language, family, kind } = reading.lemma;
		const selected = selectKnowledge({
			route: {
				language,
				family,
				kind,
			} as Dumrel.KnowledgeSelectionInput["route"],
		});
		if (!selected.success)
			return yield* Effect.die(
				Error(`No German Knowledge Policy for ${family} ${kind}`),
			);
		const context = aspectContext(
			scope,
			models,
			reading,
			attestation,
			markedSentence(input.sentence.segments, input.sentence.target),
		);
		const { jobs, skipped } = jobsOf(
			context,
			request,
			selected.value,
			input.origin,
		);
		if (skipped.length > 0)
			scope.event({ name: "SkippedAspects", data: { skipped } });
		const changes: GermanKnowledgeChange[] = [];
		const pendingRelations: GermanPendingRelation[] = [];
		const failures: KnowledgeFailure[] = [];
		// Authored Knowledge is tf-demo's to attach (ADR 0021).
		if (closedRoute(reading.lemma) || authoredReading(reading)) {
			for (const job of jobs)
				failures.push({
					aspect: job.aspect,
					...(job.leaf === undefined ? {} : { leaf: job.leaf }),
					code: "CatalogMiss",
					message: `The authored ${family} ${kind} ${reading.lemma.canonicalForm} has no reviewed ${job.aspect}`,
				});
			return { changes, pendingRelations, failures };
		}
		const publication = Semaphore.makeUnsafe(1);
		const publish = (contribution: readonly GermanKnowledgeChange[]) =>
			input.onContribution === undefined || contribution.length === 0
				? Effect.void
				: publication.withPermits(1)(
						input.onContribution(contribution),
					);
		yield* Effect.forEach(
			jobs,
			(job) =>
				job.run.pipe(
					Effect.catch((error: AspectError) =>
						Effect.succeed<AspectOutput>({
							changes: [],
							failures: [failureOf(job, error)],
						}),
					),
					Effect.flatMap((output) => {
						changes.push(...output.changes);
						pendingRelations.push(
							...(output.pendingRelations ?? []),
						);
						failures.push(...(output.failures ?? []));
						return publish(output.changes);
					}),
				),
			{ concurrency: "unbounded", discard: true },
		);
		return { changes, pendingRelations, failures };
	});
