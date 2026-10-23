import { isRecord } from "common-utils";
import type * as Dumling from "dumling/types";
import {
	foldedCanonicalForm,
	lemmaIdentityKey,
} from "../../server/linguisticIdentity";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { findAccumulatedKnowledge } from "./knowledgeCoverage";

/**
 * Containment for a Source that points the wrong way (ADR 0050, #1279): a
 * Reading's new Source is rejected when a stored Reading of its base already
 * names the Reading's Lemma as its own Source. The first stored direction
 * wins. A rejected Source counts as none, as a conversion that doesn't pass
 * does, so the Reading goes on as a word formed from no other.
 */

/** Lemmas sharing a route and folded Canonical Form differ by Core Features only. */
const MAX_BASE_LEMMAS = 20;
const MAX_BASE_READINGS_PER_LEMMA = 50;

/** A link target's route and Canonical Form, read alike from a Lemma or a Unit Shadow. */
type LinkRoute = {
	readonly language: string;
	readonly family: string;
	readonly kind: string;
	readonly canonicalForm: string;
};

/** What a stored base Reading's Knowledge row shows of its Source. */
export type StoredBaseKnowledge = Pick<
	Doc<"accumulatedKnowledge">,
	"ownerReadingKey" | "knowledge" | "sourceLemmaKey"
>;

function linkRouteOf(value: unknown): LinkRoute | undefined {
	if (!isRecord(value)) return undefined;
	const { language, family, kind, canonicalForm } = value;
	return typeof language === "string" &&
		typeof family === "string" &&
		typeof kind === "string" &&
		typeof canonicalForm === "string"
		? { language, family, kind, canonicalForm }
		: undefined;
}

/** A Unit Shadow names every Lemma of its route and folded Canonical Form. */
function routeNamesLemma(route: LinkRoute, lemma: Dumling.Lemma<"de">) {
	return (
		route.language === lemma.language &&
		route.family === lemma.family &&
		route.kind === lemma.kind &&
		foldedCanonicalForm({
			language: lemma.language,
			canonicalForm: route.canonicalForm,
		}) === foldedCanonicalForm(lemma)
	);
}

/** The target a Source-setting change links to; a Retract has none. */
function sourceTargetOf(change: unknown): unknown {
	return isRecord(change) &&
		change.aspect === "source" &&
		isRecord(change.value)
		? change.value.target
		: undefined;
}

/**
 * The stored base Reading whose Source names the owner's Lemma, if any. A
 * Lemma target matches by the Lemma key its row indexes (`sourceLemmaKey`),
 * a Unit Shadow target by route and folded Canonical Form. A base that is
 * still a pending Shadow has no stored Readings, so it never conflicts.
 */
export function backPointingBase(
	owner: Dumling.Lemma<"de">,
	bases: readonly StoredBaseKnowledge[],
): StoredBaseKnowledge | undefined {
	const ownerKey = lemmaIdentityKey(owner);
	return bases.find(({ knowledge, sourceLemmaKey }) => {
		const source = isRecord(knowledge) ? knowledge.source : undefined;
		const target = isRecord(source) ? source.target : undefined;
		if (!isRecord(target)) return false;
		if ("unitKind" in target) return sourceLemmaKey === ownerKey;
		const route = linkRouteOf(target);
		return route !== undefined && routeNamesLemma(route, owner);
	});
}

/** The Knowledge rows of every stored Reading of a Lemma the target names. */
async function loadBaseKnowledge(
	ctx: MutationCtx,
	owner: Dumling.Lemma<"de">,
	target: unknown,
): Promise<StoredBaseKnowledge[]> {
	const route = linkRouteOf(target);
	if (!route || route.language !== owner.language) return [];
	const lemmaKey =
		isRecord(target) && "unitKind" in target
			? lemmaIdentityKey(target)
			: undefined;
	const lemmas = (
		await ctx.db
			.query("lemmas")
			.withIndex("by_shadow_descriptor", (q) =>
				q.eq("language", owner.language).eq(
					"foldedCanonicalForm",
					foldedCanonicalForm({
						language: owner.language,
						canonicalForm: route.canonicalForm,
					}),
				),
			)
			.take(MAX_BASE_LEMMAS)
	).filter((lemma) =>
		lemmaKey === undefined
			? lemma.family === route.family && lemma.kind === route.kind
			: lemma.lemmaKey === lemmaKey,
	);
	const readings = (
		await Promise.all(
			lemmas.map((lemma) =>
				ctx.db
					.query("readings")
					.withIndex("by_lemma_id", (q) => q.eq("lemmaId", lemma._id))
					.take(MAX_BASE_READINGS_PER_LEMMA),
			),
		)
	).flat();
	const rows = await Promise.all(
		readings.map((reading) =>
			findAccumulatedKnowledge(ctx, reading.readingKey),
		),
	);
	return rows.filter((row) => row !== null);
}

/**
 * Drops a Source change whose base's stored Source points back at the
 * owner, and reports the rejection as one JSON line. Every other change
 * passes untouched.
 */
export async function withoutBackPointingSource<TChange>(
	ctx: MutationCtx,
	owner: { readonly reading: Dumling.Reading<"de">; readonly key: string },
	changes: readonly TChange[],
): Promise<TChange[]> {
	const kept: TChange[] = [];
	for (const change of changes) {
		const target = sourceTargetOf(change);
		const base =
			target === undefined
				? undefined
				: backPointingBase(
						owner.reading.lemma,
						await loadBaseKnowledge(
							ctx,
							owner.reading.lemma,
							target,
						),
					);
		if (!base) {
			kept.push(change);
			continue;
		}
		console.warn(
			JSON.stringify({
				event: "BackPointingSourceRejected",
				ownerReadingKey: owner.key,
				baseReadingKey: base.ownerReadingKey,
			}),
		);
	}
	return kept;
}
