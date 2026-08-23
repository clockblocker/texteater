import { v } from "convex/values";
import { makeSurfaceId } from "dumdict/runtime";
import { allFixedReadingCatalogs } from "dumling/fixed";
import { readingFingerprint } from "dumling/reading";
import type { Reading, Surface } from "dumling/types";

import { lemmaIdentityKey } from "../server/linguisticIdentity";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation } from "./_generated/server";

const PAGE_LIMIT = 64;
const pronounReadings = Object.freeze(
	allFixedReadingCatalogs()
		.find((catalog) => catalog.scope === "de-Lexeme-PRON-personal-v1")
		?.members.map((reading) => reading as Reading<"de">) ?? [],
);

type LegacyPronounSurface = Readonly<{
	canonicalForm: string;
	coreFeatures: Readonly<Record<string, unknown>>;
	inflectionalFeatures?: Readonly<Record<string, unknown>>;
	normalizedSurface: string;
}>;

/** Candidate selection is deliberately conservative: unknown reference keys are wildcards. */
export function fixedPronounCandidatesForLegacySurface(
	legacy: LegacyPronounSurface,
): readonly Reading<"de">[] {
	const possessive = legacy.coreFeatures.poss === "Yes";
	return pronounReadings.filter((reading) => {
		const candidateCore = reading.lemma.coreFeatures as Readonly<
			Record<string, unknown>
		>;
		if (
			reading.lemma.canonicalForm !==
			(possessive ? legacy.canonicalForm : legacy.normalizedSurface)
		) {
			return false;
		}
		const coreMatches = [
			"extPos",
			"foreign",
			"person",
			"polite",
			"poss",
			"pronType",
		].every(
			(key) =>
				!Object.hasOwn(legacy.coreFeatures, key) ||
				legacy.coreFeatures[key] === candidateCore[key],
		);
		const referenceMatches = ["referenceGender", "referenceNumber"].every(
			(key) =>
				legacy.coreFeatures[key] == null ||
				legacy.coreFeatures[key] === candidateCore[key],
		);
		if (
			!coreMatches ||
			!referenceMatches ||
			possessive ||
			!legacy.inflectionalFeatures
		)
			return coreMatches && referenceMatches;
		const surfaceGender = legacy.inflectionalFeatures.gender;
		const surfaceNumber = legacy.inflectionalFeatures.number;
		const formalAddress =
			candidateCore.polite === "Form" && candidateCore.poss === null;
		return (
			(surfaceGender == null ||
				candidateCore.referenceGender == null ||
				surfaceGender === candidateCore.referenceGender) &&
			(formalAddress ||
				surfaceNumber == null ||
				candidateCore.referenceNumber == null ||
				surfaceNumber === candidateCore.referenceNumber)
		);
	});
}

const cursorValidator = v.union(v.string(), v.null());
const migrationPageValidator = v.object({
	continueCursor: v.string(),
	isDone: v.boolean(),
	visited: v.number(),
	changed: v.number(),
	ambiguous: v.array(
		v.object({
			surfaceId: v.id("surfaces"),
			normalizedSurface: v.string(),
			candidateReadingKeys: v.array(v.string()),
		}),
	),
	blocked: v.array(
		v.object({
			surfaceId: v.id("surfaces"),
			reason: v.string(),
		}),
	),
});

/** Phase one: make the new nullable identity dimensions explicit on legacy rows. */
export const backfillPronounReferenceNullsPage = internalMutation({
	args: { cursor: cursorValidator },
	returns: v.object({
		continueCursor: v.string(),
		isDone: v.boolean(),
		visited: v.number(),
		changed: v.number(),
		collisions: v.array(v.id("lemmas")),
	}),
	handler: async (ctx, { cursor }) => {
		const page = await ctx.db.query("lemmas").paginate({
			cursor,
			numItems: PAGE_LIMIT,
		});
		let changed = 0;
		const collisions: Id<"lemmas">[] = [];
		for (const lemma of page.page) {
			if (
				lemma.language !== "de" ||
				lemma.family !== "Lexeme" ||
				lemma.kind !== "PRON" ||
				lemma.coreFeatures === null ||
				typeof lemma.coreFeatures !== "object" ||
				Array.isArray(lemma.coreFeatures)
			) {
				continue;
			}
			const core = lemma.coreFeatures as Readonly<
				Record<string, unknown>
			>;
			if (
				Object.hasOwn(core, "referenceGender") &&
				Object.hasOwn(core, "referenceNumber")
			) {
				continue;
			}
			const coreFeatures = {
				...core,
				referenceGender: core.referenceGender ?? null,
				referenceNumber: core.referenceNumber ?? null,
			};
			// Preserve the historical key as an alias until every dependent Reading,
			// Knowledge row, and occurrence has been reconciled. Re-keying only the
			// Lemma would silently break those references.
			await ctx.db.patch(lemma._id, { coreFeatures });
			changed += 1;
		}
		return {
			continueCursor: page.continueCursor,
			isDone: page.isDone,
			visited: page.page.length,
			changed,
			collisions,
		};
	},
});

/**
 * Phase two: after the fixed loader runs, relink only uniquely identified
 * legacy Surfaces and their Attestations. Ambiguities are returned untouched.
 */
export const reconcilePronounSurfacesPage = internalMutation({
	args: { cursor: cursorValidator },
	returns: migrationPageValidator,
	handler: async (ctx, { cursor }) => {
		const page = await ctx.db.query("surfaces").paginate({
			cursor,
			numItems: PAGE_LIMIT,
		});
		let changed = 0;
		const ambiguous = [];
		const blocked = [];
		for (const surface of page.page) {
			const legacyLemma = await ctx.db.get(surface.lemmaId);
			if (
				legacyLemma?.language !== "de" ||
				legacyLemma.family !== "Lexeme" ||
				legacyLemma.kind !== "PRON" ||
				legacyLemma.coreFeatures === null ||
				typeof legacyLemma.coreFeatures !== "object" ||
				Array.isArray(legacyLemma.coreFeatures)
			) {
				continue;
			}
			const candidates = fixedPronounCandidatesForLegacySurface({
				canonicalForm: legacyLemma.canonicalForm,
				coreFeatures: legacyLemma.coreFeatures as Readonly<
					Record<string, unknown>
				>,
				...(surface.inflectionalFeatures === undefined
					? {}
					: {
							inflectionalFeatures:
								surface.inflectionalFeatures as Readonly<
									Record<string, unknown>
								>,
						}),
				normalizedSurface: surface.normalizedSurface,
			});
			if (candidates.length > 1) {
				ambiguous.push({
					surfaceId: surface._id,
					normalizedSurface: surface.normalizedSurface,
					candidateReadingKeys: candidates.map(readingFingerprint),
				});
				continue;
			}
			const candidate = candidates[0];
			if (!candidate) continue;
			const targetLemma = await ctx.db
				.query("lemmas")
				.withIndex("by_lemma_key", (q) =>
					q.eq("lemmaKey", lemmaIdentityKey(candidate.lemma)),
				)
				.unique();
			const targetReading = await ctx.db
				.query("readings")
				.withIndex("by_reading_key", (q) =>
					q.eq("readingKey", readingFingerprint(candidate)),
				)
				.unique();
			if (!targetLemma || !targetReading) {
				blocked.push({
					surfaceId: surface._id,
					reason: "fixed-target-not-loaded",
				});
				continue;
			}
			if (
				surface.lemmaId === targetLemma._id &&
				(await allAttestationsTarget(
					ctx,
					surface._id,
					targetReading._id,
				))
			) {
				continue;
			}
			const surfaceValue = {
				language: "de",
				normalizedSurface: surface.normalizedSurface,
				spelling: surface.spelling,
				surfaceKind: surface.surfaceKind,
				surfaceFeatures: surface.surfaceFeatures,
				lemma: candidate.lemma,
				...(surface.inflectionalFeatures === undefined
					? {}
					: { inflectionalFeatures: surface.inflectionalFeatures }),
			} as Surface<"de">;
			const surfaceKey = makeSurfaceId("de", surfaceValue);
			const collision = await ctx.db
				.query("surfaces")
				.withIndex("by_surface_key", (q) =>
					q.eq("surfaceKey", surfaceKey),
				)
				.first();
			if (collision && collision._id !== surface._id) {
				blocked.push({
					surfaceId: surface._id,
					reason: "surface-key-collision",
				});
				continue;
			}
			await ctx.db.patch(surface._id, {
				lemmaId: targetLemma._id,
				surfaceKey,
			});
			for (const attestation of await ctx.db
				.query("attestations")
				.withIndex("by_surface_id", (q) =>
					q.eq("surfaceId", surface._id),
				)
				.collect()) {
				await ctx.db.patch(attestation._id, {
					readingId: targetReading._id,
				});
			}
			changed += 1;
		}
		return {
			continueCursor: page.continueCursor,
			isDone: page.isDone,
			visited: page.page.length,
			changed,
			ambiguous,
			blocked,
		};
	},
});

async function allAttestationsTarget(
	ctx: MutationCtx,
	surfaceId: Id<"surfaces">,
	readingId: Id<"readings">,
): Promise<boolean> {
	const attestations = await ctx.db
		.query("attestations")
		.withIndex("by_surface_id", (q) => q.eq("surfaceId", surfaceId))
		.collect();
	return attestations.every(
		(attestation) => attestation.readingId === readingId,
	);
}
