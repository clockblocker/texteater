import { makeSurfaceId } from "dumdict/planning";
import { deriveNounArticle } from "dumgen/authored";
import { parseGermanSurface } from "../../server/operationalParsing";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { materializeGrammaticalComponent } from "../dumdictStorage/transaction";
import { surfaceValue } from "./occurrenceAttestations";

/** Re-keys grammar without dropping old destinations. Collisions retain an ID redirect. */
export async function migrateNounArticle(
	ctx: MutationCtx,
	stored: Doc<"surfaces">,
) {
	if (stored.language !== "de" || stored.redirectedTo) return;
	const lemma = await ctx.db.get(stored.lemmaId);
	if (!lemma) return;
	const value = parseGermanSurface(surfaceValue(stored, lemma));
	const surfaceKey = makeSurfaceId("de", value);
	if (
		surfaceKey === stored.surfaceKey &&
		stored.articleReference === undefined
	)
		return;
	const existing = await ctx.db
		.query("surfaces")
		.withIndex("by_surface_key", (q) => q.eq("surfaceKey", surfaceKey))
		.unique();
	const reference = deriveNounArticle(value);
	if (reference) await materializeGrammaticalComponent(ctx, reference);
	await ctx.db.patch(stored._id, {
		surfaceKey:
			existing && existing._id !== stored._id
				? `redirect:${stored._id}`
				: surfaceKey,
		redirectedTo:
			existing && existing._id !== stored._id ? existing._id : undefined,
		articleReference: undefined,
		...("inflectionalFeatures" in value
			? { inflectionalFeatures: value.inflectionalFeatures }
			: {}),
	});
}

/** A separate per-row pass bounds work even when one Surface has many occurrences. */
export async function migrateCompositionAttestation(
	ctx: MutationCtx,
	row: Doc<"attestations">,
) {
	const surface = await ctx.db.get(row.surfaceId);
	if (!surface)
		throw new Error(
			"Missing Attestation Surface during composition migration",
		);
	const lemma = await ctx.db.get(surface.lemmaId);
	const verbal =
		lemma?.language === "de" &&
		["VERB", "AUX", "Idiom", "Collocation"].includes(lemma.kind);
	if (
		surface.redirectedTo ||
		(verbal &&
			(row.expletiveEvidence === undefined ||
				row.governedPrepositionEvidence === undefined))
	)
		await ctx.db.patch(row._id, {
			surfaceId: surface.redirectedTo ?? row.surfaceId,
			...(verbal
				? {
						expletiveEvidence: row.expletiveEvidence ?? null,
						governedPrepositionEvidence:
							row.governedPrepositionEvidence ?? null,
					}
				: {}),
		});
}

/** Merge dictionary prose and translations before removing only the duplicate ownership row. */
export async function migrateCompositionOwnership(
	ctx: MutationCtx,
	row: Doc<"ownedSurfaces">,
) {
	const surface = await ctx.db.get(row.surfaceId);
	if (!surface?.redirectedTo) return;
	const destination = surface.redirectedTo;
	const existing = await ctx.db
		.query("ownedSurfaces")
		.withIndex("by_surface_id", (q) => q.eq("surfaceId", destination))
		.unique();
	if (!existing) {
		await ctx.db.patch(row._id, { surfaceId: surface.redirectedTo });
		return;
	}
	const left = existing.record as Record<string, unknown>;
	const right = row.record as Record<string, unknown>;
	const notes = [
		...new Set(
			[left.notes, right.notes].filter(
				(value) => typeof value === "string" && value.length,
			),
		),
	].join("\n\n");
	const translations = [
		...(Array.isArray(left.attestedTranslations)
			? left.attestedTranslations
			: []),
		...(Array.isArray(right.attestedTranslations)
			? right.attestedTranslations
			: []),
	];
	await ctx.db.patch(existing._id, {
		record: {
			...right,
			...left,
			notes,
			attestedTranslations: [
				...new Map(
					translations.map((value) => [JSON.stringify(value), value]),
				).values(),
			],
		},
	});
	await ctx.db.delete(row._id);
}
