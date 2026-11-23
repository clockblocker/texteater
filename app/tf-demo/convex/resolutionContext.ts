import { messageOf } from "common-utils";
import { type Infer, v } from "convex/values";
import { withoutCitedReflexive } from "../server/citedReflexive";
import { foldedCanonicalForm } from "../server/linguisticIdentity";
import { spellingOf, unitsByMember } from "../server/storedSegments";
import { isSupportedTargetLanguage } from "../shared/supported-target-language";
import type { Doc, Id } from "./_generated/dataModel";
import { internalQuery, type QueryCtx } from "./_generated/server";
import { lemmaValue } from "./model/occurrenceAttestations";
import {
	assertIndex,
	loadNeighbourSentences,
	projectSentenceForResolution,
	reconstructReusableAttestation,
	requireClickableSegment,
} from "./model/resolutionLookup";
import { loadStoredSegments } from "./model/storedSegments";
import {
	detectedLanguageValidator,
	lemmaValueValidator,
	reusableAttestationValidator,
	storedSegmentValidator,
	storedUnitValidator,
} from "./model/validators";

export const resolutionContextValidator = v.object({
	reusable: v.union(v.null(), reusableAttestationValidator),
	sentence: v.union(
		v.null(),
		v.object({
			sentenceId: v.id("sentences"),
			scrollId: v.id("scrolls"),
			/** The Detected Language; a click lands only on the target's. */
			language: v.optional(detectedLanguageValidator),
			stitchedText: v.string(),
			segments: v.array(storedSegmentValidator),
			/** The biggest units intake stored, absent after Analysis Stripping. */
			units: v.optional(v.array(storedUnitValidator)),
			/** Whether the Sentence belongs to a hidden Definition Text. */
			definitionText: v.boolean(),
			/** Present when intake's segmentation failed; a click segments it again. */
			segmentationFailed: v.optional(v.literal(true)),
		}),
	),
	/** Stored Lemmas and the Sentence texts they were found under. */
	lemmaCandidates: v.array(
		v.object({
			lemma: lemmaValueValidator,
			foundUnder: v.array(v.string()),
		}),
	),
	/** The Sentences around this one, for a pronoun whose referent is outside it. */
	neighbours: v.object({
		before: v.optional(v.string()),
		after: v.optional(v.string()),
	}),
});

type ProjectedResolutionSentence = ReturnType<
	typeof projectSentenceForResolution
>;

type DictionaryHintCache = ReturnType<typeof createDictionaryHintCache>;

/**
 * Deduplicates folded canonical-form Lemma lookups, normalized Surface
 * lookups, and owner Lemma fetches across spellings (and across units of a
 * Sentence when loading contexts in a batch).
 */
function createDictionaryHintCache(
	ctx: QueryCtx,
	language: "de" | "he" = "de",
) {
	const lemmasByFolded = new Map<string, Promise<Doc<"lemmas">[]>>();
	const surfacesBySpelling = new Map<string, Promise<Doc<"surfaces">[]>>();
	const lemmasById = new Map<Id<"lemmas">, Promise<Doc<"lemmas"> | null>>();

	return {
		lemmasFor(folded: string) {
			let pending = lemmasByFolded.get(folded);
			if (!pending) {
				pending = ctx.db
					.query("lemmas")
					.withIndex("by_shadow_descriptor", (q) =>
						q
							.eq("language", language)
							.eq("foldedCanonicalForm", folded),
					)
					.take(9);
				lemmasByFolded.set(folded, pending);
			}
			return pending;
		},
		surfacesFor(spelling: string) {
			let pending = surfacesBySpelling.get(spelling);
			if (!pending) {
				pending = ctx.db
					.query("surfaces")
					.withIndex("by_language_and_normalized_surface", (q) =>
						q
							.eq("language", language)
							.eq("normalizedSurface", spelling),
					)
					.take(9);
				surfacesBySpelling.set(spelling, pending);
			}
			return pending;
		},
		lemmaById(id: Id<"lemmas">) {
			let pending = lemmasById.get(id);
			if (!pending) {
				pending = ctx.db.get(id);
				lemmasById.set(id, pending);
			}
			return pending;
		},
	};
}

function collectLookupSpellings(
	sentence: ProjectedResolutionSentence,
	clickedSegmentIndex: number,
) {
	const words = sentence.segments.filter(
		(segment) => segment.kind === "ResolvableText",
	);
	const clicked = words.findIndex(
		(segment) => segment.index === clickedSegmentIndex,
	);
	// The unit intake stored at the click names the words the Lemma is
	// made of, however far apart they stand: they are looked up first,
	// together and one by one, so the cut below never drops them.
	const memberIndices = new Set(
		unitsByMember(sentence.units).get(clickedSegmentIndex)?.segments ?? [],
	);
	const members = words
		.filter((segment) => memberIndices.has(segment.index))
		.map(spellingOf);
	// Then nearby phrases and individual words: a Lemma's Canonical Form can
	// span an article, a Locution's words or a separated verb.
	const phrases: string[] = [];
	for (let start = Math.max(0, clicked - 3); start <= clicked; start++) {
		for (
			let end = clicked + 1;
			end <= Math.min(words.length, start + 4);
			end++
		) {
			phrases.push(words.slice(start, end).map(spellingOf).join(" "));
		}
	}
	// Each wording is a Lemma candidate, looked up by its Canonical Form. A
	// single word is also looked up among stored Surfaces, whose form is
	// that word (`Banken` leads to `Bank`); a multiword Surface is stored in
	// base order (`mit zu tun hatte`, #1293), which the clicked text need
	// not spell, so a phrase finds its Lemma by Canonical Form alone. Every word
	// is looked up so a target's far member, such as a separated prefix,
	// still finds its Lemma; each spelling keeps the Sentence text it came
	// from, so ClickResolution can offer only Lemmas found under the
	// target's own. A phrase that cites a reflexive (`sich erinnern`) is
	// looked up without it too, since a Canonical Form never holds one
	// (ADR 0052).
	const foundUnder = new Map<string, Set<string>>();
	for (const text of [
		...(members.length > 1 ? [members.join(" ")] : []),
		...members,
		words[clicked] ? spellingOf(words[clicked]) : "",
		...phrases,
		...words.map(spellingOf),
	].filter(Boolean))
		for (const wording of new Set([text, withoutCitedReflexive(text)]))
			for (const spelling of [
				wording,
				wording.slice(0, 1).toLocaleLowerCase("de") + wording.slice(1),
				wording.slice(0, 1).toLocaleUpperCase("de") + wording.slice(1),
			])
				foundUnder.set(
					spelling,
					(foundUnder.get(spelling) ?? new Set()).add(text),
				);
	return { spellings: [...foundUnder.keys()].slice(0, 64), foundUnder };
}

function addCandidate(
	candidates: Map<
		Id<"lemmas">,
		{ lemma: Doc<"lemmas">; foundUnder: Set<string> }
	>,
	lemma: Doc<"lemmas">,
	texts: readonly string[],
) {
	const candidate = candidates.get(lemma._id) ?? {
		lemma,
		foundUnder: new Set<string>(),
	};
	for (const text of texts) candidate.foundUnder.add(text);
	candidates.set(lemma._id, candidate);
}

async function lookupLemmaCandidates(
	cache: DictionaryHintCache,
	sentence: ProjectedResolutionSentence,
	clickedSegmentIndex: number,
) {
	const { spellings, foundUnder } = collectLookupSpellings(
		sentence,
		clickedSegmentIndex,
	);
	// Case variants share one folded canonical form, so deduplicate Lemma
	// queries by folded key while keeping case-sensitive Surface queries.
	const foldedBySpelling = new Map(
		spellings.map((spelling) => [
			spelling,
			foldedCanonicalForm({
				language: sentence.language === "he" ? "he" : "de",
				canonicalForm: spelling,
			}),
		]),
	);
	const uniqueFolded = [...new Set(foldedBySpelling.values())];
	const singleWordSpellings = spellings.filter(
		(spelling) => !/\s/u.test(spelling),
	);
	const [lemmasList, surfacesList] = await Promise.all([
		Promise.all(uniqueFolded.map((folded) => cache.lemmasFor(folded))),
		Promise.all(
			singleWordSpellings.map((spelling) => cache.surfacesFor(spelling)),
		),
	]);
	const lemmasByFolded = new Map(
		uniqueFolded.map((folded, index) => [folded, lemmasList[index] ?? []]),
	);
	const surfacesBySpelling = new Map(
		singleWordSpellings.map((spelling, index) => [
			spelling,
			surfacesList[index] ?? [],
		]),
	);
	const eligibleSpellings = spellings.flatMap((spelling) => {
		const lemmas =
			lemmasByFolded.get(foldedBySpelling.get(spelling) ?? "") ?? [];
		const surfaces = surfacesBySpelling.get(spelling) ?? [];
		// Hints are optional; an overfull spelling falls back to normal resolution.
		return lemmas.length > 8 || surfaces.length > 8
			? []
			: [{ spelling, lemmas, surfaces }];
	});
	const ownerIdsToFetch = [
		...new Set(
			eligibleSpellings.flatMap(({ surfaces }) =>
				surfaces.map((surface) => surface.lemmaId),
			),
		),
	];
	const ownerDocsById = new Map(
		await Promise.all(
			ownerIdsToFetch.map(
				async (id) => [id, await cache.lemmaById(id)] as const,
			),
		),
	);
	const candidates = new Map<
		Id<"lemmas">,
		{ lemma: Doc<"lemmas">; foundUnder: Set<string> }
	>();
	for (const { spelling, lemmas, surfaces } of eligibleSpellings) {
		const texts = [...(foundUnder.get(spelling) ?? [])];
		for (const lemma of lemmas) addCandidate(candidates, lemma, texts);
		for (const id of new Set(surfaces.map((surface) => surface.lemmaId))) {
			const owner = ownerDocsById.get(id);
			if (owner && owner.language === sentence.language)
				addCandidate(candidates, owner, texts);
		}
	}
	return [...candidates.values()]
		.slice(0, 64)
		.map(({ lemma, foundUnder: texts }) => ({
			lemma: lemmaValue(lemma),
			foundUnder: [...texts],
		}));
}

/**
 * One snapshot of reuse, sentence, and bounded dictionary hints; commit
 * rechecks ownership. It reads no Visitor, so a batch asking a click's
 * Luna request ahead loads the same context the click will (#1351).
 */
export async function loadResolutionContext(
	ctx: QueryCtx,
	input: {
		sentenceId: Id<"sentences">;
		clickedSegmentIndex: number;
	},
	loadGrammar = true,
): Promise<Infer<typeof resolutionContextValidator>> {
	const { sentence: sentenceDoc, segment: clickedSegment } =
		await requireClickableSegment(
			ctx,
			input.sentenceId,
			input.clickedSegmentIndex,
		);
	const attestationId = clickedSegment.attestationMembership?.attestationId;
	if (attestationId) {
		const reusable = await reconstructReusableAttestation(
			ctx,
			attestationId,
		);
		if (reusable.sentenceId === input.sentenceId)
			return {
				reusable: reusable.value,
				sentence: null,
				lemmaCandidates: [],
				neighbours: {},
			};
	}
	// A resumed Grammar still needs the Sentence to commit stored membership.
	const needGrammar =
		loadGrammar && isSupportedTargetLanguage(sentenceDoc.language);
	const [storedSegments, scroll, neighbours] = await Promise.all([
		loadStoredSegments(ctx, sentenceDoc._id),
		ctx.db.get(sentenceDoc.scrollId),
		needGrammar
			? loadNeighbourSentences(ctx, sentenceDoc)
			: Promise.resolve({}),
	]);
	const sentence = projectSentenceForResolution(
		sentenceDoc,
		storedSegments,
		scroll,
	);
	if (!needGrammar)
		return {
			reusable: null,
			sentence,
			lemmaCandidates: [],
			neighbours: {},
		};
	const lemmaCandidates = await lookupLemmaCandidates(
		createDictionaryHintCache(
			ctx,
			sentenceDoc.language === "he" ? "he" : "de",
		),
		sentence,
		input.clickedSegmentIndex,
	);

	return {
		reusable: null,
		sentence,
		lemmaCandidates,
		neighbours,
	};
}

/**
 * Loads the Resolution Context for every clicked Segment in one Sentence in a
 * single query, sharing the Sentence, Segments, Scroll, neighbour Sentences,
 * and dictionary hint lookups across all units in that Sentence.
 */
export async function loadSentenceResolutionContexts(
	ctx: QueryCtx,
	input: {
		sentenceId: Id<"sentences">;
		clickedSegmentIndices: readonly number[];
	},
) {
	const sentenceDoc = await ctx.db.get(input.sentenceId);
	if (!sentenceDoc) {
		return input.clickedSegmentIndices.map((clickedSegmentIndex) => ({
			clickedSegmentIndex,
			error: "Sentence does not exist.",
		}));
	}
	const needGrammar = isSupportedTargetLanguage(sentenceDoc.language);
	const [storedSegments, scroll, neighbours] = await Promise.all([
		loadStoredSegments(ctx, sentenceDoc._id),
		ctx.db.get(sentenceDoc.scrollId),
		needGrammar
			? loadNeighbourSentences(ctx, sentenceDoc)
			: Promise.resolve({}),
	]);
	const segmentByIndex = new Map(
		storedSegments.map((segment) => [segment.index, segment]),
	);
	const sentence = projectSentenceForResolution(
		sentenceDoc,
		storedSegments,
		scroll,
	);
	const cache = createDictionaryHintCache(
		ctx,
		sentenceDoc.language === "he" ? "he" : "de",
	);
	return Promise.all(
		input.clickedSegmentIndices.map(async (clickedSegmentIndex) => {
			try {
				assertIndex(clickedSegmentIndex, "clickedSegmentIndex");
				const clickedSegment = segmentByIndex.get(clickedSegmentIndex);
				if (clickedSegment?.kind !== "ResolvableText") {
					throw new Error(
						"Only a ResolvableText Segment can be clicked.",
					);
				}
				const attestationId =
					clickedSegment.attestationMembership?.attestationId;
				if (attestationId) {
					const reusable = await reconstructReusableAttestation(
						ctx,
						attestationId,
					);
					if (reusable.sentenceId === input.sentenceId) {
						return {
							clickedSegmentIndex,
							context: {
								reusable: reusable.value,
								sentence: null,
								lemmaCandidates: [],
								neighbours: {},
							},
						};
					}
				}
				if (!needGrammar) {
					return {
						clickedSegmentIndex,
						context: {
							reusable: null,
							sentence,
							lemmaCandidates: [],
							neighbours: {},
						},
					};
				}
				const lemmaCandidates = await lookupLemmaCandidates(
					cache,
					sentence,
					clickedSegmentIndex,
				);
				return {
					clickedSegmentIndex,
					context: {
						reusable: null,
						sentence,
						lemmaCandidates,
						neighbours,
					},
				};
			} catch (error) {
				return {
					clickedSegmentIndex,
					error: messageOf(error),
				};
			}
		}),
	);
}

export const load = internalQuery({
	args: {
		requestId: v.string(),
		visitorId: v.string(),
		sentenceId: v.id("sentences"),
		clickedSegmentIndex: v.number(),
	},
	returns: resolutionContextValidator,
	handler: (ctx, args) => loadResolutionContext(ctx, args),
});
