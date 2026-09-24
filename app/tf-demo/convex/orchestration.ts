"use node";

import { type Infer, v } from "convex/values";
import { createDumdictService } from "dumdict/runtime";
import { directSemanticRelationValues } from "dumrel";
import * as Effect from "effect/Effect";
import type { InspectionCapture } from "../server/inspectionCapture";
import {
	createTfDemoOrchestrator,
	type LateResolvedClickCommit,
	type OrchestrationPersistence,
	type ResolutionContext,
	type ResolutionProgressObserver,
	type ResolvedClickCommit,
	type ResolveSegmentInput,
	type ReusedResolvedClickCommit,
	type UnresolvedClickCommit,
} from "../server/linguisticOrchestration";
import {
	createProductionDumgen,
	createProductionKnowledgeDraft,
} from "../server/modelExecution";
import {
	parseGermanLemma,
	parseGermanReading,
} from "../server/operationalParsing";
import { executeResolutionSession } from "../server/resolutionSessionExecution";
import {
	fromStoredSentenceAnalysis,
	toStoredSentenceAnalysis,
} from "../server/sentenceAnalysisStorage";
import { splitInSentences } from "../server/sentenceSplitting";
import { textSubmissionLimitViolation } from "../server/textSubmissionLimits";
import { api, internal } from "./_generated/api";
import type { Id, TableNames } from "./_generated/dataModel";
import { type ActionCtx, action, internalAction } from "./_generated/server";
import { createConvexDumdictStorage } from "./dumdictStorage/adapter";
import { inspectionFor } from "./inspectionAction";
import type { ResolutionSessionGuard } from "./model/resolutionSessions";
import { resolutionSessionGuardValidator } from "./model/validators";
import { createResolutionSessionLifecycle } from "./resolutionSessionLifecycle";

const MAX_KNOWLEDGE_PLAN_ATTEMPTS = 3;

const submitTextResultValidator = v.union(
	v.object({
		status: v.literal("Accepted"),
		textId: v.id("texts"),
	}),
	v.object({
		status: v.literal("Rejected"),
		message: v.string(),
	}),
);

type SubmitTextActionResult = Infer<typeof submitTextResultValidator>;

function convexId<TableName extends TableNames>(value: string): Id<TableName> {
	return value as Id<TableName>;
}

export const submitText = action({
	args: {
		submissionKey: v.string(),
		sourceText: v.string(),
		inspectionVisitorId: v.optional(v.string()),
	},
	returns: submitTextResultValidator,
	handler: async (ctx, args): Promise<SubmitTextActionResult> => {
		// Only limit violations become Rejected, checked here before any
		// work; every other failure still throws.
		const limitViolation = textSubmissionLimitViolation(
			args.sourceText,
			splitInSentences(args.sourceText),
		);
		if (limitViolation !== undefined)
			return { status: "Rejected", message: limitViolation };
		const requestId = crypto.randomUUID();
		if (args.inspectionVisitorId) {
			await ctx.runMutation(internal.resolutionInspection.beginAnalysis, {
				requestId,
				visitorId: args.inspectionVisitorId,
				sourceText: args.sourceText,
			});
		}
		const inspection = inspectionFor(
			ctx,
			requestId,
			Boolean(args.inspectionVisitorId),
		);
		let state: "Complete" | "PermanentFailure" = "PermanentFailure";
		try {
			const run = () =>
				Effect.runPromise(
					orchestratorFor(
						ctx,
						null,
						undefined,
						inspection,
					).submitText(args),
				);
			const result = inspection
				? await inspection.promise(
						"Analyze submitted text",
						"app/tf-demo · linguisticOrchestration",
						{ sourceText: args.sourceText },
						run,
						true,
					)
				: await run();
			state = "Complete";
			return {
				status: "Accepted",
				textId: convexId<"texts">(result.persisted.textId),
			};
		} finally {
			await inspection?.flush();
			if (args.inspectionVisitorId) {
				await ctx.runMutation(
					internal.resolutionInspection.finishAnalysis,
					{ requestId, state },
				);
			}
		}
	},
});

export const runResolutionSession = internalAction({
	args: {
		...resolutionSessionGuardValidator.fields,
		inspect: v.optional(v.boolean()),
	},
	returns: v.null(),
	handler: async (ctx, { inspect, ...guard }): Promise<null> => {
		const inspection = inspectionFor(
			ctx,
			guard.requestId,
			inspect === true,
		);
		const run = () =>
			Effect.runPromise(
				executeResolutionSession({
					identity: guard,
					lifecycle: createResolutionSessionLifecycle(
						ctx,
						guard,
						inspection,
					),
					resolve: (selection, checkpoints, observer, context) => {
						const resolution = orchestratorFor(
							ctx,
							guard,
							observer,
							inspection,
						).resolveSegment(selection, checkpoints, context);
						return inspection
							? inspection.effect(
									"Resolve selected segment",
									"app/tf-demo · linguisticOrchestration",
									{ selection, checkpoints },
									resolution,
								)
							: resolution;
					},
				}),
			);
		try {
			if (inspection)
				await inspection.promise(
					"Resolution session",
					"app/tf-demo · orchestration.runResolutionSession",
					guard,
					run,
					true,
				);
			else await run();
		} finally {
			await inspection?.flush();
		}
		return null;
	},
});

function orchestratorFor(
	ctx: ActionCtx,
	sessionGuard: ResolutionSessionGuard | null,
	observer?: ResolutionProgressObserver,
	inspection?: InspectionCapture,
) {
	const dictionary = createDumdictService({
		language: "de",
		storage: createConvexDumdictStorage(ctx),
	});
	const persistence = createConvexPersistence(ctx, sessionGuard);
	const tracedPersistence: OrchestrationPersistence = inspection
		? {
				persistSubmittedText: (input) =>
					inspection.promise(
						"Persist submitted text",
						"app/tf-demo",
						input,
						() => persistence.persistSubmittedText(input),
					),
				loadResolutionContext: (input) =>
					inspection.promise(
						"Load resolution context",
						"app/tf-demo",
						input,
						() => persistence.loadResolutionContext(input),
					),
				persistResolvedClick: (input) =>
					inspection.promise(
						"Commit resolved occurrence",
						"app/tf-demo · persistence",
						input,
						() => persistence.persistResolvedClick(input),
					),
				persistReusedResolvedClick: (input) =>
					inspection.promise(
						"Commit reused occurrence",
						"app/tf-demo · persistence",
						input,
						() => persistence.persistReusedResolvedClick(input),
					),
				persistUnresolvedClick: (input) =>
					inspection.promise(
						"Commit unresolved encounter",
						"app/tf-demo · persistence",
						input,
						() => persistence.persistUnresolvedClick(input),
					),
			}
		: persistence;
	return createTfDemoOrchestrator({
		draftKnowledge: ({ encounter, lemma, visitorId, settle }) =>
			Effect.gen(function* () {
				const [settings, authorization] = yield* Effect.tryPromise(() =>
					Promise.all([
						ctx.runQuery(api.knowledgeSettings.get, { visitorId }),
						ctx.runQuery(
							internal.relationPublication.getAuthorization,
							{},
						),
					]),
				);
				const { generationRequestFor } = yield* Effect.promise(
					() => import("../server/generatedKnowledgeRequest"),
				);
				return yield* createProductionKnowledgeDraft(
					{
						encounter,
						lemma,
						request: generationRequestFor(
							{ lemma },
							authorization.rollbackStopped
								? []
								: authorization.qualifiedKinds,
							{
								translationLanguages: (
									["en", "ru"] as const
								).filter(
									(language) =>
										settings.translations[language],
								),
							},
						),
					},
					inspection,
					{ settle },
				);
			}),
		dumgen: createProductionDumgen(
			observer?.generationEvent,
			{},
			inspection,
		),
		dictionary: inspection
			? {
					findStoredReadings: (input) =>
						inspection.effect(
							"Find stored Readings",
							"battery/dumdict",
							input,
							dictionary.findStoredReadings(input),
						),
				}
			: dictionary,
		persistence: tracedPersistence,
		inspection,
		...(observer ? { observer } : {}),
	});
}

/**
 * Every Occurrence commit runs under the Resolution Session that asked for it
 * and settles that session in its own transaction (ADR-0004). Text submission
 * has no session and makes no commit.
 */
function sessionCommitGuard(
	sessionGuard: ResolutionSessionGuard | null,
): ResolutionSessionGuard {
	if (!sessionGuard) {
		throw new Error("An Occurrence commit needs its Resolution Session.");
	}
	return sessionGuard;
}

function createConvexPersistence(
	ctx: ActionCtx,
	sessionGuard: ResolutionSessionGuard | null,
): OrchestrationPersistence {
	return {
		async persistSubmittedText(input) {
			return ctx.runMutation(internal.persistence.persistSubmittedText, {
				...input,
				sentences: input.sentences.map(({ analysis, ...sentence }) => ({
					...sentence,
					segments: sentence.segments.map((segment) => ({
						...segment,
					})),
					...(analysis
						? { analysis: toStoredSentenceAnalysis(analysis) }
						: {}),
				})),
			});
		},
		async loadResolutionContext(input) {
			const context = await ctx.runQuery(
				internal.resolutionContext.load,
				{
					...input,
					sentenceId: convexId<"sentences">(input.sentenceId),
				},
			);
			return {
				...context,
				lemmaCandidates: context.lemmaCandidates.map(
					({ lemma, foundUnder }) => ({
						lemma: parseGermanLemma(lemma),
						foundUnder,
					}),
				),
				analysis: context.analysis
					? fromStoredSentenceAnalysis(context.analysis)
					: null,
			} as ResolutionContext;
		},
		async persistResolvedClick(input) {
			return ctx.runMutation(internal.persistence.persistResolvedClick, {
				...convexSegmentSelectionArgs(input),
				readingDecision: input.readingDecision,
				...(input.knowledgeDraftJson
					? { knowledgeDraftJson: input.knowledgeDraftJson }
					: {}),
				reading: input.reading,
				readingKey: input.readingKey,
				occurrence: {
					...input.occurrence,
					attestation: {
						...input.occurrence.attestation,
						members: input.occurrence.attestation.members.map(
							(member) => ({ ...member }),
						),
					},
					memberSegmentIndices: [
						...input.occurrence.memberSegmentIndices,
					],
				},
				sessionGuard: sessionCommitGuard(sessionGuard),
			}) as Promise<ResolvedClickCommit>;
		},
		async persistReusedResolvedClick(input) {
			return ctx.runMutation(
				internal.persistence.persistReusedResolvedClick,
				{
					...convexSegmentSelectionArgs(input),
					attestationId: input.attestationId as Id<"attestations">,
					sessionGuard: sessionCommitGuard(sessionGuard),
				},
			) as Promise<ReusedResolvedClickCommit>;
		},
		async persistUnresolvedClick(input) {
			return ctx.runMutation(
				internal.persistence.persistUnresolvedClick,
				{
					...convexSegmentSelectionArgs(input),
					sessionGuard: sessionCommitGuard(sessionGuard),
				},
			) as Promise<UnresolvedClickCommit | LateResolvedClickCommit>;
		},
	};
}

function convexSegmentSelectionArgs(input: ResolveSegmentInput) {
	return {
		requestId: input.requestId,
		visitorId: input.visitorId,
		sentenceId: input.sentenceId as Id<"sentences">,
		clickedSegmentIndex: input.clickedSegmentIndex,
	};
}

function pendingLocatorFromRecord(value: unknown): {
	sourceReadingKey: string;
	relation: (typeof directSemanticRelationValues)[number];
	targetPendingId: string;
} | null {
	if (!value || typeof value !== "object") return null;
	const locator = Reflect.get(value, "locator");
	if (!locator || typeof locator !== "object") return null;
	const sourceReadingKey = Reflect.get(locator, "sourceReadingKey");
	const relation = Reflect.get(locator, "relation");
	const targetPendingId = Reflect.get(locator, "targetPendingId");
	if (
		typeof sourceReadingKey !== "string" ||
		typeof relation !== "string" ||
		!directSemanticRelationValues.includes(
			relation as (typeof directSemanticRelationValues)[number],
		) ||
		typeof targetPendingId !== "string"
	) {
		return null;
	}
	return {
		sourceReadingKey,
		relation: relation as (typeof directSemanticRelationValues)[number],
		targetPendingId,
	};
}

const shadowCleanupResultValidator = v.union(
	v.object({
		status: v.literal("applied"),
		baseRevision: v.string(),
		nextRevision: v.string(),
		message: v.string(),
	}),
	v.object({
		status: v.literal("conflict"),
		code: v.union(
			v.literal("revisionConflict"),
			v.literal("semanticPreconditionFailed"),
		),
		baseRevision: v.string(),
		latestRevision: v.string(),
		message: v.string(),
	}),
	v.object({
		status: v.literal("rejected"),
		code: v.string(),
		message: v.string(),
	}),
);

type ShadowCleanupActionResult =
	| {
			status: "applied";
			baseRevision: string;
			nextRevision: string;
			message: string;
	  }
	| {
			status: "conflict";
			code: "revisionConflict" | "semanticPreconditionFailed";
			baseRevision: string;
			latestRevision: string;
			message: string;
	  }
	| { status: "rejected"; code: string; message: string };

function shadowCleanupConflict(
	code: "revisionConflict" | "semanticPreconditionFailed",
	baseRevision: string,
	latestRevision: string,
	message: string,
): ShadowCleanupActionResult {
	return {
		status: "conflict",
		code,
		baseRevision,
		latestRevision,
		message,
	};
}

export const cleanupPendingRelation = action({
	args: {
		shadowId: v.id("shadows"),
		locatorKey: v.string(),
		baseRevision: v.string(),
	},
	returns: shadowCleanupResultValidator,
	handler: async (ctx, args): Promise<ShadowCleanupActionResult> => {
		const selection: {
			revision: string;
			pendingRecord: unknown | null;
		} = await ctx.runQuery(internal.shadowResolution.loadPendingSelection, {
			shadowId: args.shadowId,
			locatorKey: args.locatorKey,
		});
		if (selection.revision !== args.baseRevision) {
			return shadowCleanupConflict(
				"revisionConflict",
				args.baseRevision,
				selection.revision,
				"Shadow inspection is stale. Refresh before resolving this reference.",
			);
		}
		if (selection.pendingRecord === null) {
			return shadowCleanupConflict(
				"semanticPreconditionFailed",
				args.baseRevision,
				selection.revision,
				"The exact pending Shadow reference no longer exists.",
			);
		}
		const pendingLocator = pendingLocatorFromRecord(
			selection.pendingRecord,
		);
		if (!pendingLocator) {
			return shadowCleanupConflict(
				"semanticPreconditionFailed",
				args.baseRevision,
				selection.revision,
				"The pending Shadow reference is malformed and cannot be changed.",
			);
		}
		const result = await Effect.runPromise(
			createDumdictService({
				language: "de",
				storage: createConvexDumdictStorage(ctx),
			})
				.cleanupRelations({
					baseRevision: args.baseRevision,
					resolutions: [
						{
							locator: pendingLocator,
						},
					],
				})
				.pipe(
					Effect.match({
						onFailure: (error) => error,
						onSuccess: (value) => value,
					}),
				),
		);
		if ("status" in result && result.status === "applied") {
			return {
				status: "applied",
				baseRevision: result.baseRevision,
				nextRevision: result.nextRevision,
				message: result.summary.message,
			};
		}
		if (
			"_tag" in result &&
			(result._tag === "DumdictRevisionConflict" ||
				result._tag === "DumdictSemanticPreconditionFailure")
		) {
			return {
				status: "conflict",
				code:
					result._tag === "DumdictRevisionConflict"
						? "revisionConflict"
						: "semanticPreconditionFailed",
				baseRevision: result.baseRevision,
				latestRevision: result.latestRevision ?? selection.revision,
				message: result.message ?? "Shadow cleanup conflicted.",
			};
		}
		if ("_tag" in result && result._tag === "DumdictRejection")
			return {
				status: "rejected",
				code: result.code,
				message: result.message ?? "Shadow cleanup was rejected.",
			};
		throw new Error("Shadow cleanup storage failed.");
	},
});

/** Materializes only the reviewed Reading selected by this navigation request. */
export const followGrammaticalAlternative = action({
	args: { sourceReadingId: v.id("readings"), readingKey: v.string() },
	returns: v.id("readings"),
	handler: async (
		ctx,
		{ sourceReadingId, readingKey },
	): Promise<Id<"readings">> => {
		const [{ reviewedAlternatives }, { readingIdentityKey }] =
			await Promise.all([
				import("./modules/notes/relations"),
				import("../server/linguisticIdentity"),
			]);
		const source = parseGermanReading(
			await ctx.runQuery(internal.reviewedNavigation.source, {
				readingId: sourceReadingId,
			}),
		);
		const selected = reviewedAlternatives(source.lemma).find(
			({ reading }) => readingIdentityKey(reading) === readingKey,
		);
		if (!selected)
			throw new Error(
				"This Reading is not a reviewed grammatical alternative.",
			);
		const dictionary = createDumdictService({
			language: "de",
			storage: createConvexDumdictStorage(ctx),
		});
		for (
			let attempt = 0;
			attempt < MAX_KNOWLEDGE_PLAN_ATTEMPTS;
			attempt++
		) {
			const existing = await ctx.runQuery(
				internal.reviewedNavigation.destination,
				{ readingKey },
			);
			if (existing) return existing;
			const result = await Effect.runPromise(
				Effect.either(
					dictionary.ensureReadingEntry({
						entry: {
							reading: selected.reading,
							attestedTranslations: [],
							attestations: [],
							notes: "",
						},
					}),
				),
			);
			const destination = await ctx.runQuery(
				internal.reviewedNavigation.destination,
				{ readingKey },
			);
			if (destination) return destination;
			if (
				result._tag === "Left" &&
				result.left._tag !== "DumdictRevisionConflict"
			)
				throw new Error("Grammatical alternative could not be stored.");
		}
		throw new Error(
			"Grammatical alternative conflicted with another change; try again.",
		);
	},
});

/** Opens a noun heading's reviewed article without creating a semantic relation or encounter. */
export const followNounArticle = action({
	args: { lemmaId: v.id("lemmas") },
	returns: v.id("readings"),
	handler: async (ctx, { lemmaId }): Promise<Id<"readings">> => {
		const [{ selectNounHeadingArticle }, { readingIdentityKey }] =
			await Promise.all([
				import("dumgen/authored"),
				import("../server/linguisticIdentity"),
			]);
		const lemma = await ctx.runQuery(
			internal.reviewedNavigation.nounSource,
			{ lemmaId },
		);
		const selected = selectNounHeadingArticle(parseGermanLemma(lemma));
		if (!selected)
			throw new Error("This Lemma has no noun heading article.");
		const readingKey = readingIdentityKey(selected.reading);
		const existing = await ctx.runQuery(
			internal.reviewedNavigation.destination,
			{ readingKey },
		);
		if (existing)
			return ctx.runMutation(
				internal.reviewedNavigation.completeNounArticleKnowledge,
				{ lemmaId },
			);
		const dictionary = createDumdictService({
			language: "de",
			storage: createConvexDumdictStorage(ctx),
		});
		for (
			let attempt = 0;
			attempt < MAX_KNOWLEDGE_PLAN_ATTEMPTS;
			attempt++
		) {
			const result = await Effect.runPromise(
				Effect.either(
					dictionary.ensureReadingEntry({
						entry: {
							reading: selected.reading,
							knowledge: {
								definition: selected.knowledge.definition,
								translations: selected.knowledge.translations,
							},
							attestedTranslations: [],
							attestations: [],
							notes: "",
						},
					}),
				),
			);
			if (result._tag === "Left") {
				const concurrent = await ctx.runQuery(
					internal.reviewedNavigation.destination,
					{ readingKey },
				);
				if (concurrent)
					return ctx.runMutation(
						internal.reviewedNavigation
							.completeNounArticleKnowledge,
						{ lemmaId },
					);
				if (result.left._tag === "DumdictRevisionConflict") continue;
				throw new Error("The article Reading could not be stored.");
			}
			const destination = await ctx.runQuery(
				internal.reviewedNavigation.destination,
				{ readingKey },
			);
			if (destination)
				return ctx.runMutation(
					internal.reviewedNavigation.completeNounArticleKnowledge,
					{ lemmaId },
				);
		}
		throw new Error(
			"Opening the article conflicted with another change; try again.",
		);
	},
});
