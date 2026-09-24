import { v } from "convex/values";
import { makeSurfaceId } from "dumdict/planning";
import { deriveNounArticle } from "dumgen/authored";
import { parseGermanSurface } from "../../../server/operationalParsing";
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
import {
	projectOccurrenceSource,
	sourceOriginValidator,
	sourceSegmentValidator,
	sourceTargetValidator,
} from "./sourceContext";
import { isUnitReadingFamily } from "./unitReadingFamilies";

const ROUTE_CONNECTION_PAGE_SIZE = 25;
const SURFACE_ANALYSIS_PAGE_SIZE = 100;

const attestationTargetValidator = v.object({
	kind: v.literal("Attestation"),
	attestationId: v.id("attestations"),
});

const lemmaTargetValidator = v.object({
	kind: v.literal("Lemma"),
	lemmaId: v.id("lemmas"),
});

const surfaceTargetValidator = v.object({
	kind: v.literal("Surface"),
	language: v.literal("de"),
	normalizedSurface: v.string(),
});

const readingTargetValidator = v.object({
	kind: v.literal("Reading"),
	readingId: v.id("readings"),
});

const attestationRouteNoteValidator = v.object({
	kind: v.literal("Attestation"),
	target: attestationTargetValidator,
	source: v.object({
		textId: v.id("texts"),
		sentencePosition: v.number(),
		sentenceSnippet: v.string(),
		segments: v.array(sourceSegmentValidator),
		memberSegmentIndices: v.array(v.number()),
		origin: sourceOriginValidator,
		target: sourceTargetValidator,
	}),
	presented: presentedAttestationValidator,
	surfaceTarget: surfaceTargetValidator,
	reading: v.object({
		emojiDescription: v.string(),
		target: readingTargetValidator,
	}),
});

const surfaceRouteConnectionValidator = v.object({
	surfaceId: v.id("surfaces"),
	normalizedSurface: v.string(),
	canonicalForm: v.string(),
	family: v.string(),
	kind: v.string(),
	target: surfaceTargetValidator,
});

const surfaceRouteNoteValidator = v.object({
	kind: v.literal("Surface"),
	target: surfaceTargetValidator,
	analyses: v.array(
		v.object({
			analysisKey: v.id("surfaces"),
			article: v.optional(
				v.union(
					v.null(),
					v.object({
						presented: presentedSurfaceValidator,
						target: surfaceTargetValidator,
						presentationContext: v.object({
							activeAnalysisKey: v.id("surfaces"),
						}),
					}),
				),
			),
			surfaceId: v.id("surfaces"),
			lemmaId: v.id("lemmas"),
			presented: presentedSurfaceValidator,
			lemmaTarget: lemmaTargetValidator,
		}),
	),
	continueCursor: v.string(),
	isDone: v.boolean(),
});

const lemmaRouteConnectionValidator = v.object({
	lemmaId: v.id("lemmas"),
	canonicalForm: v.string(),
	family: v.string(),
	kind: v.string(),
	target: lemmaTargetValidator,
});

const lemmaRouteNoteValidator = v.object({
	kind: v.literal("Lemma"),
	target: lemmaTargetValidator,
	presented: presentedLemmaValidator,
	connections: v.object({
		surfaces: v.array(surfaceRouteConnectionValidator),
		readings: v.array(
			v.object({
				readingId: v.id("readings"),
				emojiDescription: v.string(),
				target: readingTargetValidator,
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

type RouteNoteTarget =
	| {
			readonly kind: "Attestation";
			readonly attestationId: Id<"attestations">;
	  }
	| {
			readonly kind: "Surface";
			readonly language: "de";
			readonly normalizedSurface: string;
			readonly activeAnalysisKey?: Id<"surfaces">;
	  }
	| { readonly kind: "Lemma"; readonly lemmaId: Id<"lemmas"> };

export async function loadRouteNote(
	ctx: QueryCtx,
	target: RouteNoteTarget,
	contextCursor?: string,
	visitorId?: string,
) {
	if (target.kind === "Attestation") {
		return loadAttestationRouteNote(ctx, target.attestationId, visitorId);
	}
	if (target.kind === "Surface") {
		return loadSurfaceRouteNote(
			ctx,
			target.language,
			target.normalizedSurface,
			contextCursor,
			target.activeAnalysisKey,
		);
	}
	return loadLemmaRouteNote(ctx, target.lemmaId, contextCursor);
}

async function loadAttestationRouteNote(
	ctx: QueryCtx,
	attestationId: Id<"attestations">,
	visitorId?: string,
) {
	const occurrence = await loadOccurrenceAttestation(ctx, attestationId);
	if (!occurrence) return null;
	if (
		occurrence.surface.language !== "de" ||
		occurrence.surface.language !== occurrence.lemma.language ||
		!isUnitReadingFamily(occurrence.lemma.family)
	) {
		return null;
	}
	const text = await ctx.db.get(occurrence.sentence.textId);
	if (!text) return null;
	const source = await projectOccurrenceSource(
		ctx,
		{
			attestationId: occurrence.attestation._id,
			sentence: occurrence.sentence,
			text,
			memberSegmentIndices: occurrence.memberSegmentIndices,
		},
		visitorId,
	);
	if (!source) return null;
	return {
		kind: "Attestation" as const,
		target: {
			kind: "Attestation" as const,
			attestationId: occurrence.attestation._id,
		},
		source,
		presented: presentAttestation(occurrence.publicAttestation),
		surfaceTarget: {
			kind: "Surface" as const,
			language: "de" as const,
			normalizedSurface: occurrence.surface.normalizedSurface,
		},
		reading: {
			emojiDescription: occurrence.reading.emojiDescription,
			target: {
				kind: "Reading" as const,
				readingId: occurrence.reading._id,
			},
		},
	};
}

async function loadSurfaceRouteNote(
	ctx: QueryCtx,
	language: "de",
	normalizedSurface: string,
	contextCursor?: string,
	activeAnalysisKey?: Id<"surfaces">,
) {
	const page = await ctx.db
		.query("surfaces")
		.withIndex("by_language_and_normalized_surface", (q) =>
			q
				.eq("language", language)
				.eq("normalizedSurface", normalizedSurface),
		)
		.paginate({
			cursor: contextCursor ?? null,
			numItems: SURFACE_ANALYSIS_PAGE_SIZE,
		});
	let activeRedirect: Id<"surfaces"> | undefined;
	let surfaces = page.page.filter((surface) => !surface.redirectedTo);
	if (contextCursor === undefined && activeAnalysisKey !== undefined) {
		const savedSurface = await ctx.db.get(activeAnalysisKey);
		activeRedirect = savedSurface?.redirectedTo;
		const activeSurface = savedSurface?.redirectedTo
			? await ctx.db.get(savedSurface.redirectedTo)
			: savedSurface;
		if (
			activeSurface?.language === language &&
			activeSurface.normalizedSurface === normalizedSurface &&
			!surfaces.some((surface) => surface._id === activeSurface._id)
		) {
			surfaces = [...surfaces, activeSurface];
		}
	}
	if (surfaces.length === 0) return null;
	const lemmas = await Promise.all(
		surfaces.map((surface) => ctx.db.get(surface.lemmaId)),
	);
	const articles = await Promise.all(
		surfaces.map(async (surface, index) => {
			const lemma = lemmas[index];
			if (!lemma) return null;
			const value = parseGermanSurface(surfaceValue(surface, lemma));
			const reference = deriveNounArticle(value);
			if (!reference) return null;
			const component = await ctx.db
				.query("surfaces")
				.withIndex("by_surface_key", (q) =>
					q.eq("surfaceKey", makeSurfaceId("de", reference.surface)),
				)
				.unique();
			if (!component)
				throw new Error(
					"Article Surface was not materialized with its noun Surface",
				);
			return {
				presented: presentSurface(reference.surface),
				target: {
					kind: "Surface" as const,
					language: "de" as const,
					normalizedSurface: reference.surface.normalizedSurface,
				},
				presentationContext: { activeAnalysisKey: component._id },
			};
		}),
	);
	const analyses = surfaces.flatMap((surface, index) => {
		const lemma = lemmas[index];
		if (
			!lemma ||
			surface.language !== language ||
			lemma.language !== language ||
			!isUnitReadingFamily(lemma.family)
		) {
			return [];
		}
		return [
			{
				analysisKey:
					surface._id === activeRedirect && activeAnalysisKey
						? activeAnalysisKey
						: surface._id,
				article: articles[index] ?? null,
				surfaceId: surface._id,
				lemmaId: lemma._id,
				presented: presentSurface(surfaceValue(surface, lemma)),
				lemmaTarget: { kind: "Lemma" as const, lemmaId: lemma._id },
			},
		];
	});
	if (analyses.length === 0) return null;
	analyses.sort((left, right) =>
		`${left.presented.lemma.family}\0${left.presented.lemma.kind}\0${left.presented.lemma.canonicalForm}\0${left.analysisKey}`.localeCompare(
			`${right.presented.lemma.family}\0${right.presented.lemma.kind}\0${right.presented.lemma.canonicalForm}\0${right.analysisKey}`,
		),
	);
	return {
		kind: "Surface" as const,
		target: { kind: "Surface" as const, language, normalizedSurface },
		analyses,
		continueCursor: page.continueCursor,
		isDone: page.isDone,
	};
}

async function loadLemmaRouteNote(
	ctx: QueryCtx,
	lemmaId: Id<"lemmas">,
	contextCursor?: string,
) {
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
	// Readings come first: they are what a Lemma Note is for, and a Card
	// shows nothing else.
	const initialPhase =
		firstReadings.length > 0
			? "readings"
			: firstSurfaces.length > 0
				? "surfaces"
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
		surfaces = page.page.filter((surface) => !surface.redirectedTo);
		continueCursor = page.isDone
			? routeConnectionCursor("Lemma", "sameWrittenForm", null)
			: routeConnectionCursor("Lemma", "surfaces", page.continueCursor);
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
		} else if (firstSurfaces.length > 0) {
			continueCursor = routeConnectionCursor("Lemma", "surfaces", null);
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
			.withIndex("by_shadow_descriptor", (q) =>
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
		kind: "Lemma" as const,
		target: {
			kind: "Lemma" as const,
			lemmaId: lemma._id,
		},
		presented: presentLemma(lemmaValue(lemma)),
		connections: {
			surfaces: surfaces.flatMap((surface) =>
				surface.language === "de" && lemma.language === "de"
					? [
							{
								surfaceId: surface._id,
								normalizedSurface: surface.normalizedSurface,
								canonicalForm: lemma.canonicalForm,
								family: lemma.family,
								kind: lemma.kind,
								target: {
									kind: "Surface" as const,
									language: "de" as const,
									normalizedSurface:
										surface.normalizedSurface,
								},
							},
						]
					: [],
			),
			readings: readings.map((reading) => ({
				readingId: reading._id,
				emojiDescription: reading.emojiDescription,
				target: {
					kind: "Reading" as const,
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
									kind: "Lemma" as const,
									lemmaId: candidate._id,
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

type RouteConnectionPhase = {
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
			parsed.phase === "surfaces" ||
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
	throw new Error("Invalid Lemma Note connection cursor.");
}

function routeConnectionCursor<Kind extends keyof RouteConnectionPhase>(
	kind: Kind,
	phase: RouteConnectionPhase[Kind],
	cursor: string | null,
): string {
	return JSON.stringify({ kind, phase, cursor });
}
