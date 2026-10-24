import { isRecord } from "common-utils";
import type * as Dumling from "dumling/types";
import { foldedCanonicalForm } from "../../server/linguisticIdentity";
import type { MutationCtx } from "../_generated/server";
import { lemmaValue } from "./occurrenceAttestations";
import { replaceAccumulatedKnowledge, shadowKeyFor } from "./shadows";

/**
 * A Breakdown piece or a Source links to a Unit Shadow while its part is
 * pending and to the part's Lemma once it is stored (ADR 0050), as a
 * Pending Semantic Relation resolves (ADR 0011). A link moves when exactly
 * one dictionary Lemma has its route and folded Canonical Form: a new link
 * moves as it is published, a stored one when that Lemma is stored. Then
 * the morphemes walk reads the part's own Breakdown (ADR 0051), and the
 * link opens the Lemma's Note. The structural Shadow reference stays on
 * the Shadow interned for the Lemma's identity, so Formations keep listing
 * the owner.
 */

/** Homograph Lemmas of one Shadow differ by Core Features only; few exist. */
const MAX_SHADOW_LEMMAS = 3;
/** The owners a newly stored Lemma's Shadow can list; Formations cap there too. */
const MAX_MOVED_OWNERS = 200;

type LinkRoute = {
	readonly language: Dumling.Language;
	readonly family: string;
	readonly kind: string;
	readonly canonicalForm: string;
};

/** A pending link's route, or undefined for a Lemma link or another value. */
function shadowRouteOf(target: unknown): LinkRoute | undefined {
	if (!isRecord(target) || target.unitKind !== undefined) return undefined;
	const { language, family, kind, canonicalForm } = target;
	return (language === "de" || language === "en" || language === "he") &&
		typeof family === "string" &&
		typeof kind === "string" &&
		typeof canonicalForm === "string"
		? { language, family, kind, canonicalForm }
		: undefined;
}

const routeKey = (route: LinkRoute) =>
	JSON.stringify([
		route.language,
		route.family,
		route.kind,
		foldedCanonicalForm(route),
	]);

/** The one dictionary Lemma a pending link's route names, if exactly one. */
async function onlyLemmaOf(
	ctx: MutationCtx,
	route: LinkRoute,
): Promise<Dumling.Lemma | undefined> {
	const candidates = await ctx.db
		.query("lemmas")
		.withIndex("by_shadow_descriptor", (q) =>
			q
				.eq("language", route.language)
				.eq("foldedCanonicalForm", foldedCanonicalForm(route))
				.eq("family", route.family as Dumling.Family)
				.eq("kind", route.kind as Dumling.Kind),
		)
		.take(MAX_SHADOW_LEMMAS);
	const stored = [];
	for (const lemma of candidates) {
		const member = await ctx.db
			.query("dictionaryLemmas")
			.withIndex("by_lemma_id", (q) => q.eq("lemmaId", lemma._id))
			.unique();
		if (member) stored.push(lemma);
	}
	const [only, ...others] = stored;
	return only && others.length === 0
		? (lemmaValue(only) as Dumling.Lemma)
		: undefined;
}

type Resolve = (route: LinkRoute) => Dumling.Lemma | undefined;

/** The pieces with each pending target `resolve` names moved to its Lemma. */
function movedPieces(pieces: unknown, resolve: Resolve): unknown {
	if (!Array.isArray(pieces)) return pieces;
	return pieces.map((piece) => {
		if (!isRecord(piece)) return piece;
		const route = shadowRouteOf(piece.target);
		const lemma = route && resolve(route);
		return lemma ? { ...piece, target: lemma } : piece;
	});
}

/** A Source or Breakdown value with its pending targets moved. */
function movedLinks(
	aspect: "source" | "breakdown",
	value: unknown,
	resolve: Resolve,
): unknown {
	if (!isRecord(value)) return value;
	if (aspect === "source") {
		const route = shadowRouteOf(value.target);
		const lemma = route && resolve(route);
		return lemma ? { ...value, target: lemma } : value;
	}
	return Object.fromEntries(
		Object.entries(value).map(([part, pieces]) => [
			part,
			movedPieces(pieces, resolve),
		]),
	);
}

/** The link targets one generated change carries: a Source's or each piece's. */
function changeTargets(change: unknown): unknown[] {
	if (!isRecord(change)) return [];
	if (change.aspect === "source")
		return isRecord(change.value) ? [change.value.target] : [];
	if (change.aspect === "breakdown" && Array.isArray(change.value))
		return change.value.map((piece) =>
			isRecord(piece) ? piece.target : undefined,
		);
	return [];
}

function movedChange<Change>(change: Change, resolve: Resolve): Change {
	if (!isRecord(change)) return change;
	if (change.aspect === "source")
		return {
			...change,
			value: movedLinks("source", change.value, resolve),
		} as Change;
	if (change.aspect === "breakdown")
		return {
			...change,
			value: movedPieces(change.value, resolve),
		} as Change;
	return change;
}

/**
 * Generated Breakdown and Source changes with each link whose part is
 * already stored as one Lemma moved to it, before the plan is built.
 */
export async function withStoredLinkTargets<Change>(
	ctx: MutationCtx,
	changes: readonly Change[],
): Promise<Change[]> {
	const routes = new Map<string, LinkRoute>();
	for (const target of changes.flatMap(changeTargets)) {
		const route = shadowRouteOf(target);
		if (route) routes.set(routeKey(route), route);
	}
	if (routes.size === 0) return [...changes];
	const lemmas = new Map<string, Dumling.Lemma>();
	for (const [key, route] of routes) {
		const lemma = await onlyLemmaOf(ctx, route);
		if (lemma) lemmas.set(key, lemma);
	}
	const resolve: Resolve = (route) => lemmas.get(routeKey(route));
	return changes.map((change) => movedChange(change, resolve));
}

/**
 * Moves every stored link that waits on a newly stored Lemma's Shadow to
 * the Lemma, in the transaction that stores it, so the owners' Notes walk
 * the Lemma's Breakdown once it has one.
 */
export async function moveLinksToStoredLemma(
	ctx: MutationCtx,
	lemma: Dumling.Lemma,
): Promise<void> {
	const shadow = await ctx.db
		.query("shadows")
		.withIndex("by_shadow_key", (q) =>
			q.eq(
				"shadowKey",
				shadowKeyFor({
					language: lemma.language,
					canonicalForm: lemma.canonicalForm,
					family: lemma.family,
					kind: lemma.kind,
				}),
			),
		)
		.unique();
	if (!shadow) return;
	const references = await ctx.db
		.query("structuralShadowReferences")
		.withIndex("by_shadow_id", (q) => q.eq("shadowId", shadow._id))
		.take(MAX_MOVED_OWNERS);
	if (references.length === 0) return;
	const only = await onlyLemmaOf(ctx, lemma);
	if (!only) return;
	const key = routeKey(lemma);
	const resolve: Resolve = (route) =>
		routeKey(route) === key ? only : undefined;
	const owners = new Set(references.map((row) => row.ownerReadingKey));
	for (const ownerReadingKey of owners) {
		const reading = await ctx.db
			.query("readings")
			.withIndex("by_reading_key", (q) =>
				q.eq("readingKey", ownerReadingKey),
			)
			.unique();
		const entry = reading
			? await ctx.db
					.query("readingEntries")
					.withIndex("by_reading_id", (q) =>
						q.eq("readingId", reading._id),
					)
					.unique()
			: null;
		const record = isRecord(entry?.record) ? entry.record : undefined;
		const knowledge = isRecord(record?.knowledge)
			? record.knowledge
			: undefined;
		if (!entry || !record || !knowledge) continue;
		const moved = {
			...knowledge,
			...(knowledge.breakdown === undefined
				? {}
				: {
						breakdown: movedLinks(
							"breakdown",
							knowledge.breakdown,
							resolve,
						),
					}),
			...(knowledge.source === undefined
				? {}
				: { source: movedLinks("source", knowledge.source, resolve) }),
		};
		if (JSON.stringify(moved) === JSON.stringify(knowledge)) continue;
		await ctx.db.patch(entry._id, {
			record: { ...record, knowledge: moved },
		});
		await replaceAccumulatedKnowledge(ctx, ownerReadingKey, moved);
	}
}
