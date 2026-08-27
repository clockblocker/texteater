import { v } from "convex/values";

import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import {
	lemmaValue,
	loadOccurrenceAttestation,
	surfaceValue,
} from "../../model/occurrenceAttestations";
import {
	presentAttestation,
	presentedAttestationValidator,
	presentedLemmaValidator,
	presentedSurfaceValidator,
	presentLemma,
	presentSurface,
} from "../../model/presentedDumling";
import { isUnitReadingFamily } from "./unitReadingFamilies";

const MAX_SEGMENTS_PER_SENTENCE = 512;
const ROUTE_CONNECTION_PAGE_SIZE = 25;

export const routeNoteTargetValidator = v.object({
	kind: v.literal("RouteNote"),
	routeKind: v.union(
		v.literal("Attestation"),
		v.literal("Surface"),
		v.literal("Lemma"),
	),
	id: v.string(),
});

const attestationRouteNoteValidator = v.object({
	kind: v.literal("RouteNote"),
	routeKind: v.literal("Attestation"),
	target: routeNoteTargetValidator,
	source: v.object({
		textId: v.id("texts"),
		sentencePosition: v.number(),
		sentenceSnippet: v.string(),
		memberSegmentIndices: v.array(v.number()),
		target: v.object({
			kind: v.literal("Text"),
			textId: v.id("texts"),
			focusAttestationId: v.id("attestations"),
		}),
	}),
	presented: presentedAttestationValidator,
	surfaceTarget: routeNoteTargetValidator,
	reading: v.object({
		emojiDescription: v.string(),
		target: v.object({
			kind: v.literal("UnitReadingNote"),
			readingId: v.id("readings"),
		}),
	}),
});

const surfaceRouteConnectionValidator = v.object({
	surfaceId: v.id("surfaces"),
	normalizedSurface: v.string(),
	canonicalForm: v.string(),
	family: v.string(),
	kind: v.string(),
	target: routeNoteTargetValidator,
});

const surfaceRouteNoteValidator = v.object({
	kind: v.literal("RouteNote"),
	routeKind: v.literal("Surface"),
	target: routeNoteTargetValidator,
	presented: presentedSurfaceValidator,
	lemmaTarget: routeNoteTargetValidator,
	connections: v.object({
		occurrences: v.array(
			v.object({
				attestationId: v.id("attestations"),
				sentenceSnippet: v.string(),
				members: v.array(v.string()),
				target: routeNoteTargetValidator,
			}),
		),
		sameWrittenForm: v.array(surfaceRouteConnectionValidator),
		continueCursor: v.string(),
		isDone: v.boolean(),
	}),
});

const lemmaRouteConnectionValidator = v.object({
	lemmaId: v.id("lemmas"),
	canonicalForm: v.string(),
	family: v.string(),
	kind: v.string(),
	target: routeNoteTargetValidator,
});

const lemmaRouteNoteValidator = v.object({
	kind: v.literal("RouteNote"),
	routeKind: v.literal("Lemma"),
	target: routeNoteTargetValidator,
	presented: presentedLemmaValidator,
	connections: v.object({
		surfaces: v.array(surfaceRouteConnectionValidator),
		readings: v.array(
			v.object({
				readingId: v.id("readings"),
				emojiDescription: v.string(),
				target: v.object({
					kind: v.literal("UnitReadingNote"),
					readingId: v.id("readings"),
				}),
			}),
		),
		sameWrittenForm: v.array(lemmaRouteConnectionValidator),
		continueCursor: v.string(),
		isDone: v.boolean(),
	}),
});

export const routeNoteValidator = v.union(
	attestationRouteNoteValidator,
	surfaceRouteNoteValidator,
	lemmaRouteNoteValidator,
);

type RouteNoteTarget = {
	readonly kind: "RouteNote";
	readonly routeKind: "Attestation" | "Surface" | "Lemma";
	readonly id: string;
};

export async function loadRouteNote(
	ctx: QueryCtx,
	target: RouteNoteTarget,
	contextCursor?: string,
) {
	if (target.routeKind === "Attestation") {
		return loadAttestationRouteNote(ctx, target.id);
	}
	if (target.routeKind === "Surface") {
		return loadSurfaceRouteNote(ctx, target.id, contextCursor);
	}
	return loadLemmaRouteNote(ctx, target.id, contextCursor);
}

async function loadAttestationRouteNote(
	ctx: QueryCtx,
	attestationIdValue: string,
) {
	const attestationId = ctx.db.normalizeId(
		"attestations",
		attestationIdValue,
	);
	if (!attestationId) return null;
	const occurrence = await loadOccurrenceAttestation(ctx, attestationId);
	if (
		!occurrence ||
		occurrence.surface.language !== occurrence.lemma.language ||
		!isUnitReadingFamily(occurrence.lemma.family)
	) {
		return null;
	}
	const text = await ctx.db.get(occurrence.sentence.textId);
	if (!text) return null;
	return {
		kind: "RouteNote" as const,
		routeKind: "Attestation" as const,
		target: {
			kind: "RouteNote" as const,
			routeKind: "Attestation" as const,
			id: occurrence.attestation._id,
		},
		source: {
			textId: text._id,
			sentencePosition: occurrence.sentence.position,
			sentenceSnippet: occurrence.sentence.stitchedText,
			memberSegmentIndices: occurrence.memberSegmentIndices,
			target: {
				kind: "Text" as const,
				textId: text._id,
				focusAttestationId: occurrence.attestation._id,
			},
		},
		presented: presentAttestation(occurrence.publicAttestation),
		surfaceTarget: {
			kind: "RouteNote" as const,
			routeKind: "Surface" as const,
			id: occurrence.surface._id,
		},
		reading: {
			emojiDescription: occurrence.reading.emojiDescription,
			target: {
				kind: "UnitReadingNote" as const,
				readingId: occurrence.reading._id,
			},
		},
	};
}

async function loadSurfaceRouteNote(
	ctx: QueryCtx,
	surfaceIdValue: string,
	contextCursor?: string,
) {
	const surfaceId = ctx.db.normalizeId("surfaces", surfaceIdValue);
	if (!surfaceId) return null;
	const surface = await ctx.db.get(surfaceId);
	if (!surface) return null;
	const lemma = await ctx.db.get(surface.lemmaId);
	if (
		!lemma ||
		surface.language !== lemma.language ||
		!isUnitReadingFamily(lemma.family)
	) {
		return null;
	}

	const firstOccurrence = await ctx.db
		.query("attestations")
		.withIndex("by_surface_id", (q) => q.eq("surfaceId", surface._id))
		.take(1);
	const cursor = parseRouteConnectionCursor(
		contextCursor,
		"Surface",
		firstOccurrence.length > 0 ? "occurrences" : "sameWrittenForm",
	);
	let occurrences: Awaited<
		ReturnType<typeof loadSurfaceOccurrenceConnection>
	>[] = [];
	let sameWritten: Doc<"surfaces">[] = [];
	let continueCursor = "";
	let isDone = false;
	if (cursor.phase === "occurrences") {
		const page = await ctx.db
			.query("attestations")
			.withIndex("by_surface_id", (q) => q.eq("surfaceId", surface._id))
			.paginate({
				cursor: cursor.cursor,
				numItems: ROUTE_CONNECTION_PAGE_SIZE,
			});
		occurrences = await Promise.all(
			page.page.map((attestation) =>
				loadSurfaceOccurrenceConnection(ctx, attestation),
			),
		);
		if (!page.isDone) {
			continueCursor = routeConnectionCursor(
				"Surface",
				"occurrences",
				page.continueCursor,
			);
		} else {
			continueCursor = routeConnectionCursor(
				"Surface",
				"sameWrittenForm",
				null,
			);
		}
	} else {
		const page = await ctx.db
			.query("surfaces")
			.withIndex("by_language_and_normalized_surface", (q) =>
				q
					.eq("language", surface.language)
					.eq("normalizedSurface", surface.normalizedSurface),
			)
			.paginate({
				cursor: cursor.cursor,
				numItems: ROUTE_CONNECTION_PAGE_SIZE,
			});
		sameWritten = page.page;
		isDone = page.isDone;
		continueCursor = page.isDone
			? ""
			: routeConnectionCursor(
					"Surface",
					"sameWrittenForm",
					page.continueCursor,
				);
	}

	const sameWrittenLemmas = await Promise.all(
		sameWritten.map((candidate) => ctx.db.get(candidate.lemmaId)),
	);
	if (occurrences.some((occurrence) => occurrence === null)) return null;

	return {
		kind: "RouteNote" as const,
		routeKind: "Surface" as const,
		target: {
			kind: "RouteNote" as const,
			routeKind: "Surface" as const,
			id: surface._id,
		},
		presented: presentSurface(surfaceValue(surface, lemma)),
		lemmaTarget: {
			kind: "RouteNote" as const,
			routeKind: "Lemma" as const,
			id: lemma._id,
		},
		connections: {
			occurrences: occurrences.filter(
				(value): value is NonNullable<typeof value> => value !== null,
			),
			sameWrittenForm: sameWritten.flatMap((candidate, index) => {
				const candidateLemma = sameWrittenLemmas[index];
				return candidate._id !== surface._id &&
					candidateLemma &&
					candidate.language === candidateLemma.language &&
					isUnitReadingFamily(candidateLemma.family)
					? [
							{
								surfaceId: candidate._id,
								normalizedSurface: candidate.normalizedSurface,
								canonicalForm: candidateLemma.canonicalForm,
								family: candidateLemma.family,
								kind: candidateLemma.kind,
								target: {
									kind: "RouteNote" as const,
									routeKind: "Surface" as const,
									id: candidate._id,
								},
							},
						]
					: [];
			}),
			continueCursor,
			isDone,
		},
	};
}

async function loadLemmaRouteNote(
	ctx: QueryCtx,
	lemmaIdValue: string,
	contextCursor?: string,
) {
	const lemmaId = ctx.db.normalizeId("lemmas", lemmaIdValue);
	if (!lemmaId) return null;
	const lemma = await ctx.db.get(lemmaId);
	if (!lemma || !isUnitReadingFamily(lemma.family)) return null;

	const [firstSurfaces, firstReadings] = await Promise.all([
		ctx.db
			.query("surfaces")
			.withIndex("by_lemma_id", (q) => q.eq("lemmaId", lemma._id))
			.take(1),
		ctx.db
			.query("readings")
			.withIndex("by_lemma_id", (q) => q.eq("lemmaId", lemma._id))
			.take(1),
	]);
	const initialPhase =
		firstSurfaces.length > 0
			? "surfaces"
			: firstReadings.length > 0
				? "readings"
				: "sameWrittenForm";
	const cursor = parseRouteConnectionCursor(
		contextCursor,
		"Lemma",
		initialPhase,
	);
	let surfaces: typeof firstSurfaces = [];
	let readings: typeof firstReadings = [];
	let sameWritten: Doc<"lemmas">[] = [];
	let continueCursor = "";
	let isDone = false;

	if (cursor.phase === "surfaces") {
		const page = await ctx.db
			.query("surfaces")
			.withIndex("by_lemma_id", (q) => q.eq("lemmaId", lemma._id))
			.paginate({
				cursor: cursor.cursor,
				numItems: ROUTE_CONNECTION_PAGE_SIZE,
			});
		surfaces = page.page;
		if (!page.isDone) {
			continueCursor = routeConnectionCursor(
				"Lemma",
				"surfaces",
				page.continueCursor,
			);
		} else if (firstReadings.length > 0) {
			continueCursor = routeConnectionCursor("Lemma", "readings", null);
		} else {
			continueCursor = routeConnectionCursor(
				"Lemma",
				"sameWrittenForm",
				null,
			);
		}
	} else if (cursor.phase === "readings") {
		const page = await ctx.db
			.query("readings")
			.withIndex("by_lemma_id", (q) => q.eq("lemmaId", lemma._id))
			.paginate({
				cursor: cursor.cursor,
				numItems: ROUTE_CONNECTION_PAGE_SIZE,
			});
		readings = page.page;
		if (!page.isDone) {
			continueCursor = routeConnectionCursor(
				"Lemma",
				"readings",
				page.continueCursor,
			);
		} else {
			continueCursor = routeConnectionCursor(
				"Lemma",
				"sameWrittenForm",
				null,
			);
		}
	} else {
		const page = await ctx.db
			.query("lemmas")
			.withIndex("by_language_and_canonical_form", (q) =>
				q
					.eq("language", lemma.language)
					.eq("canonicalForm", lemma.canonicalForm),
			)
			.paginate({
				cursor: cursor.cursor,
				numItems: ROUTE_CONNECTION_PAGE_SIZE,
			});
		sameWritten = page.page;
		isDone = page.isDone;
		continueCursor = page.isDone
			? ""
			: routeConnectionCursor(
					"Lemma",
					"sameWrittenForm",
					page.continueCursor,
				);
	}

	return {
		kind: "RouteNote" as const,
		routeKind: "Lemma" as const,
		target: {
			kind: "RouteNote" as const,
			routeKind: "Lemma" as const,
			id: lemma._id,
		},
		presented: presentLemma(lemmaValue(lemma)),
		connections: {
			surfaces: surfaces.flatMap((surface) =>
				surface.language === lemma.language
					? [
							{
								surfaceId: surface._id,
								normalizedSurface: surface.normalizedSurface,
								canonicalForm: lemma.canonicalForm,
								family: lemma.family,
								kind: lemma.kind,
								target: {
									kind: "RouteNote" as const,
									routeKind: "Surface" as const,
									id: surface._id,
								},
							},
						]
					: [],
			),
			readings: readings.map((reading) => ({
				readingId: reading._id,
				emojiDescription: reading.emojiDescription,
				target: {
					kind: "UnitReadingNote" as const,
					readingId: reading._id,
				},
			})),
			sameWrittenForm: sameWritten.flatMap((candidate) =>
				candidate._id !== lemma._id &&
				isUnitReadingFamily(candidate.family)
					? [
							{
								lemmaId: candidate._id,
								canonicalForm: candidate.canonicalForm,
								family: candidate.family,
								kind: candidate.kind,
								target: {
									kind: "RouteNote" as const,
									routeKind: "Lemma" as const,
									id: candidate._id,
								},
							},
						]
					: [],
			),
			continueCursor,
			isDone,
		},
	};
}

async function loadSurfaceOccurrenceConnection(
	ctx: QueryCtx,
	attestation: {
		readonly _id: Id<"attestations">;
		readonly surfaceId: Id<"surfaces">;
	},
) {
	const members = await ctx.db
		.query("segments")
		.withIndex("by_attestation_id", (q) =>
			q.eq("attestationMembership.attestationId", attestation._id),
		)
		.take(MAX_SEGMENTS_PER_SENTENCE + 1);
	assertRouteBound(members, MAX_SEGMENTS_PER_SENTENCE, "Attestation members");
	if (members.length === 0) return null;
	const ordered = [...members].sort(
		(left, right) => left.index - right.index,
	);
	const sentenceId = ordered[0]?.sentenceId;
	if (
		!sentenceId ||
		ordered.some(
			(member) =>
				member.sentenceId !== sentenceId ||
				member.kind !== "ResolvableText" ||
				member.attestationMembership?.attestationId !== attestation._id,
		)
	) {
		return null;
	}
	const sentence = await ctx.db.get(sentenceId);
	if (!sentence) return null;
	return {
		attestationId: attestation._id,
		sentenceSnippet: sentence.stitchedText,
		members: ordered.map(({ text }) => text),
		target: {
			kind: "RouteNote" as const,
			routeKind: "Attestation" as const,
			id: attestation._id,
		},
	};
}

type RouteConnectionPhase = {
	Surface: "occurrences" | "sameWrittenForm";
	Lemma: "surfaces" | "readings" | "sameWrittenForm";
};

function parseRouteConnectionCursor<Kind extends keyof RouteConnectionPhase>(
	value: string | undefined,
	kind: Kind,
	initialPhase: RouteConnectionPhase[Kind],
): {
	readonly phase: RouteConnectionPhase[Kind];
	readonly cursor: string | null;
} {
	if (!value) return { phase: initialPhase, cursor: null };
	try {
		const parsed = JSON.parse(value) as Record<string, unknown>;
		const validPhase =
			kind === "Surface"
				? parsed.phase === "occurrences" ||
					parsed.phase === "sameWrittenForm"
				: parsed.phase === "surfaces" ||
					parsed.phase === "readings" ||
					parsed.phase === "sameWrittenForm";
		if (
			parsed.kind === kind &&
			validPhase &&
			(parsed.cursor === null || typeof parsed.cursor === "string")
		) {
			return {
				phase: parsed.phase as RouteConnectionPhase[Kind],
				cursor: parsed.cursor,
			};
		}
	} catch {
		// Fall through to one stable invalid-cursor error.
	}
	throw new Error("Invalid Route Note connection cursor.");
}

function routeConnectionCursor<Kind extends keyof RouteConnectionPhase>(
	kind: Kind,
	phase: RouteConnectionPhase[Kind],
	cursor: string | null,
): string {
	return JSON.stringify({ kind, phase, cursor });
}

function assertRouteBound(
	values: readonly unknown[],
	maximum: number,
	name: string,
): void {
	if (values.length > maximum) {
		throw new Error(`A Route Note supports at most ${maximum} ${name}.`);
	}
}
