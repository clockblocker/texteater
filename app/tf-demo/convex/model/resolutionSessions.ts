import { type Infer, v } from "convex/values";

import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import {
	resolutionGrammarProjectionValidator,
	resolutionReadingProjectionValidator,
	type resolutionSessionGuardValidator,
	resolutionStageValidator,
} from "./validators";

const MAX_IDENTIFIER_LENGTH = 200;

export type ResolutionStage = Infer<typeof resolutionStageValidator>;
export type ResolutionSessionGuard = Infer<
	typeof resolutionSessionGuardValidator
>;
export type ResolutionGrammarProjection = Infer<
	typeof resolutionGrammarProjectionValidator
>;
export type ResolutionReadingProjection = Infer<
	typeof resolutionReadingProjectionValidator
>;

type ResolvedGrammaticalProjectionInput = {
	readonly attestation: {
		readonly members: readonly {
			readonly attested: string;
			readonly orthography: "Standard" | "Typo";
		}[];
		readonly realizationCoverage: "Full" | "Partial";
		readonly surface: {
			readonly normalizedSurface: string;
			readonly spelling: "Canonical" | "Variant";
			readonly surfaceKind: "Citation" | "Inflection";
			readonly lemma: {
				readonly canonicalForm: string;
				readonly family: string;
				readonly kind: string;
			};
		};
	};
};

type ReadingProjectionInput = {
	readonly emojiDescription: string;
	readonly lemma: {
		readonly canonicalForm: string;
		readonly family: string;
		readonly kind: string;
	};
};

export const stagePosition: Readonly<Record<ResolutionStage, number>> = {
	Starting: 0,
	RouteAvailable: 1,
	GrammarAvailable: 2,
	ReadingAvailable: 3,
	Committing: 4,
	Complete: 5,
	Unresolved: 5,
	Failed: 5,
};

export const terminalStages = new Set<ResolutionStage>([
	"Complete",
	"Unresolved",
	"Failed",
]);

export const resolutionNoteValidator = v.object({
	kind: v.literal("ResolutionNote"),
	target: v.object({
		kind: v.literal("Resolution"),
		requestId: v.string(),
	}),
	stage: resolutionStageValidator,
	route: v.object({
		textId: v.id("texts"),
		sentenceId: v.id("sentences"),
		stitchedText: v.string(),
		clickedSegmentIndex: v.number(),
		selectedSegment: v.string(),
	}),
	grammar: v.optional(resolutionGrammarProjectionValidator),
	reading: v.optional(resolutionReadingProjectionValidator),
	terminal: v.optional(
		v.union(
			v.object({
				kind: v.literal("Complete"),
				attestationId: v.id("attestations"),
				target: v.union(
					v.object({
						kind: v.literal("UnitReadingNote"),
						readingId: v.id("readings"),
					}),
					v.object({
						kind: v.literal("RouteNote"),
						routeKind: v.literal("Attestation"),
						id: v.id("attestations"),
					}),
				),
			}),
			v.object({ kind: v.literal("Unresolved") }),
			v.object({
				kind: v.literal("Failed"),
				message: v.string(),
			}),
		),
	),
	updatedAt: v.number(),
});

export type ResolutionNote = Infer<typeof resolutionNoteValidator>;

export function assertResolutionStageTransition(
	current: ResolutionStage,
	next: ResolutionStage,
): void {
	if (current === next) return;
	if (terminalStages.has(current)) {
		throw new Error("A terminal Resolution Session cannot advance.");
	}
	if (terminalStages.has(next)) return;
	if (stagePosition[next] !== stagePosition[current] + 1) {
		throw new Error(
			`Resolution Session stage ${next} cannot follow ${current}.`,
		);
	}
}

export function projectResolutionGrammar(
	grammatical: ResolvedGrammaticalProjectionInput,
): ResolutionGrammarProjection {
	const surface = grammatical.attestation.surface;
	return {
		members: grammatical.attestation.members.map((member) => ({
			attested: member.attested,
			orthography: member.orthography,
		})),
		realizationCoverage: grammatical.attestation.realizationCoverage,
		normalizedSurface: surface.normalizedSurface,
		spelling: surface.spelling,
		surfaceKind: surface.surfaceKind,
		canonicalForm: surface.lemma.canonicalForm,
		family: surface.lemma.family,
		kind: surface.lemma.kind,
	};
}

export function projectResolutionReading(
	reading: ReadingProjectionInput,
): ResolutionReadingProjection {
	return {
		emojiDescription: reading.emojiDescription,
		canonicalForm: reading.lemma.canonicalForm,
		family: reading.lemma.family,
		kind: reading.lemma.kind,
	};
}

export async function loadResolutionNote(
	ctx: QueryCtx,
	requestId: string,
): Promise<ResolutionNote | null> {
	if (requestId.length === 0 || requestId.length > MAX_IDENTIFIER_LENGTH) {
		return null;
	}
	const session = await ctx.db
		.query("resolutionSessions")
		.withIndex("by_request_id", (q) => q.eq("requestId", requestId))
		.unique();
	if (!session) return null;
	return {
		kind: "ResolutionNote",
		target: { kind: "Resolution", requestId },
		stage: session.stage,
		route: session.route,
		...(session.grammar ? { grammar: session.grammar } : {}),
		...(session.reading ? { reading: session.reading } : {}),
		...(session.stage === "Complete" &&
		session.readingId &&
		session.attestationId
			? {
					terminal: {
						kind: "Complete" as const,
						attestationId: session.attestationId,
						target: session.routeNoteRequested
							? {
									kind: "RouteNote" as const,
									routeKind: "Attestation" as const,
									id: session.attestationId,
								}
							: {
									kind: "UnitReadingNote" as const,
									readingId: session.readingId,
								},
					},
				}
			: session.stage === "Unresolved"
				? { terminal: { kind: "Unresolved" as const } }
				: session.stage === "Failed"
					? {
							terminal: {
								kind: "Failed" as const,
								message:
									session.failureMessage ??
									"Resolution could not be completed.",
							},
						}
					: {}),
		updatedAt: session.updatedAt,
	};
}

export async function requireActiveResolutionSession(
	ctx: MutationCtx,
	guard: ResolutionSessionGuard,
) {
	const session = await ctx.db
		.query("resolutionSessions")
		.withIndex("by_request_id", (q) => q.eq("requestId", guard.requestId))
		.unique();
	if (
		!session ||
		session.runToken !== guard.runToken ||
		session.segmentId !== guard.segmentId ||
		terminalStages.has(session.stage)
	) {
		throw new Error("Resolution Session is no longer active.");
	}
	const segment = await ctx.db.get(guard.segmentId);
	if (
		!segment ||
		segment.sentenceId !== session.sentenceId ||
		segment.index !== session.clickedSegmentIndex ||
		segment.kind !== "ResolvableText"
	) {
		throw new Error(
			"Resolution Session source Segment is no longer valid.",
		);
	}
	return session;
}

export async function settleComplete(
	ctx: MutationCtx,
	session: { _id: Id<"resolutionSessions"> },
	result: {
		readingId: Id<"readings">;
		attestationId: Id<"attestations">;
		grammar: ResolutionGrammarProjection;
		reading: ResolutionReadingProjection;
	},
): Promise<void> {
	await ctx.db.patch(session._id, {
		stage: "Complete",
		grammar: result.grammar,
		reading: result.reading,
		readingId: result.readingId,
		attestationId: result.attestationId,
		failureMessage: undefined,
		updatedAt: Date.now(),
	});
}

export async function settleUnresolved(
	ctx: MutationCtx,
	session: { _id: Id<"resolutionSessions"> },
): Promise<void> {
	await ctx.db.patch(session._id, {
		stage: "Unresolved",
		failureMessage: undefined,
		updatedAt: Date.now(),
	});
}

export async function settleFailed(
	ctx: MutationCtx,
	session: { _id: Id<"resolutionSessions"> },
	message: string,
): Promise<void> {
	await ctx.db.patch(session._id, {
		stage: "Failed",
		failureMessage: safeFailureMessage(message),
		updatedAt: Date.now(),
	});
}

function safeFailureMessage(message: string): string {
	return message.trim().length > 0 && message.length <= 240
		? message
		: "Resolution could not be completed.";
}
