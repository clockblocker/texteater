import { isRecord } from "common-utils";
import { type Infer, v } from "convex/values";
import { germanMorphemePolicy } from "dumcorpus/inventories";
import type * as Dumling from "dumling/types";
import { propagateMorphemes } from "dumrel";
import type * as Dumrel from "dumrel/types";
import { lemmaIdentityKey } from "../../../server/linguisticIdentity";
import type { Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import {
	type BreakdownRoute,
	formationGroupOf,
	formationGroupValues,
	prefetchMorphemeSources,
} from "../../model/breakdownParts";
import { shadowKeyFor } from "../../model/shadows";
import { unitReadingEmojiDescription } from "./unitReadingFamilies";

/** The Formations a base's Note lists at most; a learner meets few per base. */
const MAX_FORMATION_REFERENCES = 200;
/** Readings of one part's Lemma the walk looks through for a Breakdown. */
const MAX_PART_READINGS = 20;

const breakdownLinkValidator = v.union(
	v.object({ kind: v.literal("Lemma"), lemmaId: v.id("lemmas") }),
	v.object({ kind: v.literal("Shadow"), shadowId: v.id("shadows") }),
);

const breakdownTargetValidator = v.object({
	canonicalForm: v.string(),
	family: v.string(),
	kind: v.string(),
	/** Null when neither the Lemma nor its Shadow is stored. */
	link: v.union(v.null(), breakdownLinkValidator),
});

/**
 * A Reading's Breakdown as its Note shows it (ADR 0050, ADR 0051): the
 * Constituents as stored, and the Morphemic Breakdown walked up them, with
 * every target resolved to the Note a click opens.
 */
export const breakdownViewValidator = v.object({
	constituents: v.optional(
		v.array(
			v.object({
				letters: v.string(),
				/** Absent for filler: a citation ending, a space, a hyphen. */
				target: v.optional(breakdownTargetValidator),
			}),
		),
	),
	morphemes: v.optional(
		v.array(
			v.object({
				letters: v.string(),
				/**
				 * The Morpheme's Kind, `Chunk` for a part not split yet, or
				 * `Filler` for punctuation such as a compound's hyphen.
				 */
				kind: v.string(),
				target: v.union(v.null(), breakdownTargetValidator),
			}),
		),
	),
});

export type BreakdownView = Infer<typeof breakdownViewValidator>;
type BreakdownTarget = Infer<typeof breakdownTargetValidator>;

/** One group of a base's Formations, DWDS's word-formation panel. */
export const formationsValidator = v.array(
	v.object({
		group: v.union(
			...formationGroupValues.map((group) => v.literal(group)),
		),
		formations: v.array(
			v.object({
				readingId: v.id("readings"),
				canonicalForm: v.string(),
				emojiDescription: v.string(),
				kind: v.string(),
				target: v.object({
					kind: v.literal("Reading"),
					readingId: v.id("readings"),
				}),
			}),
		),
	}),
);

export type FormationsView = Infer<typeof formationsValidator>;

function asKnowledge(value: unknown): Dumrel.MorphemeSources {
	return isRecord(value) ? (value as Dumrel.MorphemeSources) : {};
}

async function storedLemma(ctx: QueryCtx, target: Dumrel.LinkTarget) {
	if (!("unitKind" in target)) return null;
	return ctx.db
		.query("lemmas")
		.withIndex("by_lemma_key", (q) =>
			q.eq("lemmaKey", lemmaIdentityKey(target)),
		)
		.unique();
}

/**
 * Where a piece leads: its stored Lemma, else the Unit Shadow interned for
 * it (every linked piece interns one, ADR 0050), so inherited pieces resolve
 * without their owner's locator.
 */
async function resolveTarget(
	ctx: QueryCtx,
	target: Dumrel.LinkTarget,
): Promise<BreakdownTarget> {
	const route = {
		canonicalForm: target.canonicalForm,
		family: target.family,
		kind: target.kind,
	};
	const lemma = await storedLemma(ctx, target);
	if (lemma) return { ...route, link: { kind: "Lemma", lemmaId: lemma._id } };
	const shadow = await ctx.db
		.query("shadows")
		.withIndex("by_shadow_key", (q) =>
			q.eq(
				"shadowKey",
				shadowKeyFor({ ...route, language: target.language }),
			),
		)
		.unique();
	return {
		...route,
		link: shadow ? { kind: "Shadow", shadowId: shadow._id } : null,
	};
}

/** The first stored Reading of a part's Lemma that holds a Breakdown or Source. */
async function loadPartSources(
	ctx: QueryCtx,
	target: Dumrel.LinkTarget,
): Promise<Dumrel.MorphemeSources | undefined> {
	const lemma = await storedLemma(ctx, target);
	if (!lemma) return undefined;
	const readings = await ctx.db
		.query("readings")
		.withIndex("by_lemma_id", (q) => q.eq("lemmaId", lemma._id))
		.take(MAX_PART_READINGS);
	for (const reading of readings) {
		const row = await ctx.db
			.query("accumulatedKnowledge")
			.withIndex("by_owner_reading_key", (q) =>
				q.eq("ownerReadingKey", reading.readingKey),
			)
			.unique();
		const knowledge = asKnowledge(row?.knowledge);
		if (knowledge.breakdown || knowledge.source) return knowledge;
	}
	return undefined;
}

/** A shown morpheme as the view carries it: its Kind, `Chunk` or `Filler`. */
function shownKindAndTarget(piece: Dumrel.ShownMorpheme): {
	readonly kind: string;
	readonly target: Dumrel.LinkTarget | undefined;
} {
	switch (piece.kind) {
		case "Morpheme":
			return { kind: piece.target.kind, target: piece.target };
		case "Unsplit":
			return { kind: "Chunk", target: piece.target };
		case "Filler":
			return { kind: "Filler", target: undefined };
	}
}

/**
 * A Reading's Breakdown for its Note, or undefined when it has none to show.
 * The morphemes are Dumrel's propagation under German's policy (ADR 0051).
 */
export async function loadBreakdownView(
	ctx: QueryCtx,
	reading: Dumling.Reading<"de">,
	knowledge: Dumrel.ReadingKnowledge,
): Promise<BreakdownView | undefined> {
	const stored = knowledge.breakdown?.constituents;
	const constituents = stored
		? await Promise.all(
				stored.map(async ({ letters, target }) =>
					target
						? { letters, target: await resolveTarget(ctx, target) }
						: { letters },
				),
			)
		: undefined;
	const owner = { breakdown: knowledge.breakdown, source: knowledge.source };
	const lookup = await prefetchMorphemeSources(owner, (target) =>
		loadPartSources(ctx, target),
	);
	const shown = propagateMorphemes(
		{ reading, knowledge: owner },
		lookup,
		germanMorphemePolicy,
	);
	const morphemes = shown
		? await Promise.all(
				shown.map(async (piece) => {
					const { kind, target } = shownKindAndTarget(piece);
					return {
						letters: piece.letters,
						kind,
						target: target
							? await resolveTarget(ctx, target)
							: null,
					};
				}),
			)
		: undefined;
	if (!constituents && !morphemes) return undefined;
	return {
		...(constituents ? { constituents } : {}),
		...(morphemes ? { morphemes } : {}),
	};
}

/**
 * The stored words whose Constituents link to a base (ADR 0050), grouped by
 * the Kind of their other pieces. The base is named by its Shadow: a pending
 * base's own, or the one interned for a stored Lemma's identity, so
 * resolution needs no move. Computed from the links, never stored.
 */
async function loadFormationsOfShadow(
	ctx: QueryCtx,
	shadowId: Id<"shadows">,
): Promise<FormationsView> {
	const references = await ctx.db
		.query("structuralShadowReferences")
		.withIndex("by_shadow_id", (q) => q.eq("shadowId", shadowId))
		.take(MAX_FORMATION_REFERENCES);
	const owners = new Set(
		references.flatMap(({ aspect, path, ownerReadingKey }) =>
			aspect === "breakdown" && path.startsWith("constituents.")
				? [ownerReadingKey]
				: [],
		),
	);
	const groups = new Map<
		FormationsView[number]["group"],
		FormationsView[number]["formations"]
	>();
	for (const ownerReadingKey of owners) {
		const reading = await ctx.db
			.query("readings")
			.withIndex("by_reading_key", (q) =>
				q.eq("readingKey", ownerReadingKey),
			)
			.unique();
		const lemma = reading ? await ctx.db.get(reading.lemmaId) : null;
		const row = await ctx.db
			.query("accumulatedKnowledge")
			.withIndex("by_owner_reading_key", (q) =>
				q.eq("ownerReadingKey", ownerReadingKey),
			)
			.unique();
		const constituents = asKnowledge(row?.knowledge).breakdown
			?.constituents;
		if (!reading || !lemma || !constituents) continue;
		const group = formationGroupOf(lemma, constituents);
		const members = groups.get(group) ?? [];
		members.push({
			readingId: reading._id,
			canonicalForm: lemma.canonicalForm,
			emojiDescription: unitReadingEmojiDescription(reading),
			kind: lemma.kind,
			target: { kind: "Reading", readingId: reading._id },
		});
		groups.set(group, members);
	}
	return formationGroupValues.flatMap((group) => {
		const formations = groups.get(group);
		return formations
			? [
					{
						group,
						formations: formations.sort((left, right) =>
							left.canonicalForm.localeCompare(
								right.canonicalForm,
								"de",
							),
						),
					},
				]
			: [];
	});
}

/** A base's Formations, by the Shadow a Lemma or a Shadow Note stands for. */
export async function loadFormations(
	ctx: QueryCtx,
	base:
		| { readonly shadowId: Id<"shadows"> }
		| (BreakdownRoute & {
				readonly language: string;
				readonly canonicalForm: string;
		  }),
): Promise<FormationsView> {
	if ("shadowId" in base) return loadFormationsOfShadow(ctx, base.shadowId);
	const shadow = await ctx.db
		.query("shadows")
		.withIndex("by_shadow_key", (q) =>
			q.eq(
				"shadowKey",
				shadowKeyFor({
					language: base.language,
					canonicalForm: base.canonicalForm,
					family: base.family,
					kind: base.kind,
				}),
			),
		)
		.unique();
	return shadow ? loadFormationsOfShadow(ctx, shadow._id) : [];
}
