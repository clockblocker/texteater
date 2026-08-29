import { v } from "convex/values";
import { makeSurfaceId } from "dumdict/runtime";
import { allFixedReadingCatalogs } from "dumling/fixed";
import { readingFingerprint } from "dumling/reading";
import type { Reading, Surface } from "dumling/types";

import { lemmaIdentityKey } from "../server/linguisticIdentity";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";

const PAGE_LIMIT = 64;
const ATTESTATION_PAGE_LIMIT = 100;
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
	const jemandCaseForms = new Set([
		"jemand",
		"jemanden",
		"jemandem",
		"jemandes",
	]);
	const niemandCaseForms = new Set([
		"niemand",
		"niemanden",
		"niemandem",
		"niemandes",
	]);
	const legacyCase = legacy.inflectionalFeatures?.case;
	const isUnresolvedUninflectedJemand =
		legacy.normalizedSurface === "jemand" &&
		legacyCase !== undefined &&
		legacyCase !== null &&
		legacyCase !== "Nom";
	const isUnresolvedUninflectedNiemand =
		legacy.normalizedSurface === "niemand" &&
		legacyCase !== undefined &&
		legacyCase !== null &&
		legacyCase !== "Nom";
	if (isUnresolvedUninflectedJemand || isUnresolvedUninflectedNiemand)
		return [];
	const collectsUnderJemand =
		legacy.coreFeatures.pronType === "Ind" &&
		jemandCaseForms.has(legacy.canonicalForm) &&
		jemandCaseForms.has(legacy.normalizedSurface);
	const collectsUnderNiemand =
		legacy.coreFeatures.pronType === "Neg" &&
		niemandCaseForms.has(legacy.canonicalForm) &&
		niemandCaseForms.has(legacy.normalizedSurface);
	const totalParadigm = {
		alles: {
			canonicalForm: "alles",
			cases: ["Nom", "Acc"],
			gender: "Neut",
			number: "Sing",
		},
		allem: {
			canonicalForm: "alles",
			cases: ["Dat"],
			gender: "Neut",
			number: "Sing",
		},
		alle: {
			canonicalForm: "alle",
			cases: ["Nom", "Acc"],
			gender: null,
			number: "Plur",
		},
		allen: {
			canonicalForm: "alle",
			cases: ["Dat"],
			gender: null,
			number: "Plur",
		},
		aller: {
			canonicalForm: "alle",
			cases: ["Gen"],
			gender: null,
			number: "Plur",
		},
	} as const;
	const totalForm =
		legacy.coreFeatures.pronType === "Tot"
			? totalParadigm[
					legacy.normalizedSurface as keyof typeof totalParadigm
				]
			: undefined;
	const mehrereSlots = [
		["mehrere", "Nom"],
		["mehrere", "Acc"],
		["mehreren", "Dat"],
		["mehrerer", "Gen"],
	] as const;
	const mehrereMatches = mehrereSlots.filter(
		([form, grammaticalCase]) =>
			legacy.normalizedSurface === form &&
			legacy.inflectionalFeatures?.case === grammaticalCase &&
			legacy.inflectionalFeatures?.gender === null &&
			legacy.inflectionalFeatures?.number === "Plur",
	);
	const attemptsMehrere =
		legacy.coreFeatures.pronType === "Tot" &&
		["mehrere", "mehreren", "mehrerer"].includes(legacy.canonicalForm) &&
		["mehrere", "mehreren", "mehrerer"].includes(legacy.normalizedSurface);
	if (attemptsMehrere && mehrereMatches.length !== 1) return [];
	const jederSlots = [
		["jeder", "Nom", "Masc"],
		["jede", "Nom", "Fem"],
		["jedes", "Nom", "Neut"],
		["jeden", "Acc", "Masc"],
		["jede", "Acc", "Fem"],
		["jedes", "Acc", "Neut"],
		["jedem", "Dat", "Masc"],
		["jeder", "Dat", "Fem"],
		["jedem", "Dat", "Neut"],
		["jedes", "Gen", "Masc"],
		["jeder", "Gen", "Fem"],
		["jedes", "Gen", "Neut"],
	] as const;
	const jederMatches = jederSlots.filter(
		([form, grammaticalCase, gender]) =>
			legacy.normalizedSurface === form &&
			legacy.inflectionalFeatures?.case === grammaticalCase &&
			legacy.inflectionalFeatures?.gender === gender &&
			legacy.inflectionalFeatures?.number === "Sing",
	);
	const attemptsJeder =
		legacy.coreFeatures.pronType === "Tot" &&
		["jeder", "jede", "jedes", "jeden", "jedem"].includes(
			legacy.canonicalForm,
		) &&
		["jeder", "jede", "jedes", "jeden", "jedem"].includes(
			legacy.normalizedSurface,
		);
	if (attemptsJeder && jederMatches.length !== 1) return [];
	const jedwederSlots = [
		["jedweder", "Nom", "Masc"],
		["jedwede", "Nom", "Fem"],
		["jedwedes", "Nom", "Neut"],
		["jedweden", "Acc", "Masc"],
		["jedwede", "Acc", "Fem"],
		["jedwedes", "Acc", "Neut"],
		["jedwedem", "Dat", "Masc"],
		["jedweder", "Dat", "Fem"],
		["jedwedem", "Dat", "Neut"],
		["jedwedes", "Gen", "Masc"],
		["jedweder", "Gen", "Fem"],
		["jedwedes", "Gen", "Neut"],
	] as const;
	const jedwederMatches = jedwederSlots.filter(
		([form, grammaticalCase, gender]) =>
			legacy.normalizedSurface === form &&
			legacy.inflectionalFeatures?.case === grammaticalCase &&
			legacy.inflectionalFeatures?.gender === gender &&
			legacy.inflectionalFeatures?.number === "Sing",
	);
	const attemptsJedweder =
		legacy.coreFeatures.pronType === "Tot" &&
		["jedweder", "jedwede", "jedwedes", "jedweden", "jedwedem"].includes(
			legacy.canonicalForm,
		) &&
		["jedweder", "jedwede", "jedwedes", "jedweden", "jedwedem"].includes(
			legacy.normalizedSurface,
		);
	if (attemptsJedweder && jedwederMatches.length !== 1) return [];
	const jeglicherSlots = [
		["jeglicher", "Nom", "Masc", "Sing"],
		["jegliche", "Nom", "Fem", "Sing"],
		["jegliches", "Nom", "Neut", "Sing"],
		["jeglichen", "Acc", "Masc", "Sing"],
		["jegliche", "Acc", "Fem", "Sing"],
		["jegliches", "Acc", "Neut", "Sing"],
		["jeglichem", "Dat", "Masc", "Sing"],
		["jeglicher", "Dat", "Fem", "Sing"],
		["jeglichem", "Dat", "Neut", "Sing"],
		["jegliches", "Gen", "Masc", "Sing"],
		["jeglicher", "Gen", "Fem", "Sing"],
		["jegliches", "Gen", "Neut", "Sing"],
		["jegliche", "Nom", null, "Plur"],
		["jegliche", "Acc", null, "Plur"],
		["jeglichen", "Dat", null, "Plur"],
		["jeglicher", "Gen", null, "Plur"],
	] as const;
	const jeglicherMatches = jeglicherSlots.filter(
		([form, grammaticalCase, gender, number]) =>
			legacy.normalizedSurface === form &&
			legacy.inflectionalFeatures?.case === grammaticalCase &&
			legacy.inflectionalFeatures?.gender === gender &&
			legacy.inflectionalFeatures?.number === number,
	);
	const attemptsJeglicher =
		legacy.coreFeatures.pronType === "Tot" &&
		[
			"jeglicher",
			"jegliche",
			"jegliches",
			"jeglichen",
			"jeglichem",
		].includes(legacy.canonicalForm) &&
		[
			"jeglicher",
			"jegliche",
			"jegliches",
			"jeglichen",
			"jeglichem",
		].includes(legacy.normalizedSurface);
	if (attemptsJeglicher && jeglicherMatches.length !== 1) return [];
	if (totalForm && legacy.inflectionalFeatures) {
		const {
			case: grammaticalCase,
			gender,
			number,
		} = legacy.inflectionalFeatures;
		if (
			(grammaticalCase != null &&
				!totalForm.cases.includes(grammaticalCase as never)) ||
			(totalForm.gender === null
				? gender != null
				: gender != null && gender !== totalForm.gender) ||
			(number != null && number !== totalForm.number)
		) {
			return [];
		}
	}
	const collectsUnderNichts =
		legacy.coreFeatures.pronType === "Neg" &&
		["nichts", "nix"].includes(legacy.canonicalForm) &&
		["nichts", "nix"].includes(legacy.normalizedSurface);
	const keinerSlots = [
		["keiner", "Nom", "Masc", "Sing"],
		["keine", "Nom", "Fem", "Sing"],
		["keines", "Nom", "Neut", "Sing"],
		["keinen", "Acc", "Masc", "Sing"],
		["keine", "Acc", "Fem", "Sing"],
		["keines", "Acc", "Neut", "Sing"],
		["keinem", "Dat", "Masc", "Sing"],
		["keiner", "Dat", "Fem", "Sing"],
		["keinem", "Dat", "Neut", "Sing"],
		["keines", "Gen", "Masc", "Sing"],
		["keiner", "Gen", "Fem", "Sing"],
		["keines", "Gen", "Neut", "Sing"],
		["keine", "Nom", null, "Plur"],
		["keine", "Acc", null, "Plur"],
		["keinen", "Dat", null, "Plur"],
		["keiner", "Gen", null, "Plur"],
	] as const;
	const keinerMatches = keinerSlots.filter(
		([form, grammaticalCase, gender, number]) =>
			legacy.normalizedSurface === form &&
			legacy.inflectionalFeatures?.case === grammaticalCase &&
			legacy.inflectionalFeatures?.gender === gender &&
			legacy.inflectionalFeatures?.number === number,
	);
	const attemptsKeiner =
		legacy.coreFeatures.pronType === "Neg" &&
		["keiner", "keine", "keines", "keinen", "keinem"].includes(
			legacy.normalizedSurface,
		);
	if (attemptsKeiner && keinerMatches.length !== 1) return [];
	const mancherForms = [
		"mancher",
		"manche",
		"manches",
		"manchen",
		"manche",
		"manches",
		"manchem",
		"mancher",
		"manchem",
		"manches",
		"mancher",
		"manches",
		"manche",
		"manche",
		"manchen",
		"mancher",
	] as const;
	const mancherMatches = keinerSlots.filter(
		([, grammaticalCase, gender, number], index) =>
			legacy.normalizedSurface === mancherForms[index] &&
			legacy.inflectionalFeatures?.case === grammaticalCase &&
			legacy.inflectionalFeatures?.gender === gender &&
			legacy.inflectionalFeatures?.number === number,
	);
	const attemptsMancher =
		legacy.coreFeatures.pronType === "Tot" &&
		["mancher", "manche", "manches", "manchen", "manchem"].includes(
			legacy.normalizedSurface,
		);
	if (attemptsMancher && mancherMatches.length !== 1) return [];
	const attemptsJedermann =
		legacy.coreFeatures.pronType === "Tot" &&
		["jedermann", "jedermanns"].includes(legacy.normalizedSurface);
	const jedermannCase = legacy.inflectionalFeatures?.case;
	if (
		attemptsJedermann &&
		(legacy.inflectionalFeatures?.number !== "Sing" ||
			legacy.inflectionalFeatures?.gender != null ||
			(legacy.normalizedSurface === "jedermann"
				? !["Nom", "Acc", "Dat"].includes(String(jedermannCase))
				: jedermannCase !== "Gen"))
	)
		return [];
	const expectedCanonicalForm = possessive
		? legacy.canonicalForm
		: collectsUnderJemand
			? "jemand"
			: collectsUnderNiemand
				? "niemand"
				: collectsUnderNichts
					? "nichts"
					: attemptsKeiner
						? "keiner"
						: attemptsJedermann
							? "jedermann"
							: attemptsMancher
								? "mancher"
								: attemptsMehrere
									? "mehrere"
									: attemptsJeder
										? "jeder"
										: attemptsJedweder
											? "jedweder"
											: attemptsJeglicher
												? "jeglicher"
												: (totalForm?.canonicalForm ??
													legacy.normalizedSurface);
	return pronounReadings.filter((reading) => {
		const candidateCore = reading.lemma.coreFeatures as Readonly<
			Record<string, unknown>
		>;
		if (reading.lemma.canonicalForm !== expectedCanonicalForm) {
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
			const surfaceNeedsPatch =
				surface.lemmaId !== targetLemma._id ||
				surface.surfaceKey !== surfaceKey;
			if (surfaceNeedsPatch) {
				await ctx.db.patch(surface._id, {
					lemmaId: targetLemma._id,
					surfaceKey,
				});
				changed += 1;
			}
			const firstAttestation = await ctx.db
				.query("attestations")
				.withIndex("by_surface_id", (q) =>
					q.eq("surfaceId", surface._id),
				)
				.first();
			if (firstAttestation) {
				await ctx.scheduler.runAfter(
					0,
					internal.pronounFixedPopulationMigration
						.reconcilePronounSurfaceAttestationsPage,
					{
						surfaceId: surface._id,
						targetReadingId: targetReading._id,
						cursor: null,
					},
				);
			}
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

/** Continue one heavily reused Surface in bounded, independently retried mutations. */
export const reconcilePronounSurfaceAttestationsPage = internalMutation({
	args: {
		surfaceId: v.id("surfaces"),
		targetReadingId: v.id("readings"),
		cursor: cursorValidator,
	},
	returns: v.object({
		continueCursor: v.string(),
		isDone: v.boolean(),
		visited: v.number(),
		changed: v.number(),
	}),
	handler: async (ctx, { surfaceId, targetReadingId, cursor }) => {
		const page = await ctx.db
			.query("attestations")
			.withIndex("by_surface_id", (q) => q.eq("surfaceId", surfaceId))
			.paginate({ cursor, numItems: ATTESTATION_PAGE_LIMIT });
		let changed = 0;
		for (const attestation of page.page) {
			if (attestation.readingId === targetReadingId) continue;
			await ctx.db.patch(attestation._id, { readingId: targetReadingId });
			changed += 1;
		}
		if (!page.isDone) {
			await ctx.scheduler.runAfter(
				0,
				internal.pronounFixedPopulationMigration
					.reconcilePronounSurfaceAttestationsPage,
				{
					surfaceId,
					targetReadingId,
					cursor: page.continueCursor,
				},
			);
		}
		return {
			continueCursor: page.continueCursor,
			isDone: page.isDone,
			visited: page.page.length,
			changed,
		};
	},
});
