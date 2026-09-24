import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internalQuery, type QueryCtx } from "./_generated/server";
import { lemmaValue } from "./model/occurrenceAttestations";
import {
	findAttestationForSegmentValue,
	findClickResult,
	loadSentenceAnalysis,
	loadSentenceForResolution,
} from "./model/resolutionLookup";
import {
	languageValidator,
	lemmaValueValidator,
	recordedClickValidator,
	reusableAttestationValidator,
	segmentKindValidator,
	storedSentenceAnalysisValidator,
} from "./model/validators";

export const resolutionContextValidator = v.object({
	recorded: v.union(v.null(), recordedClickValidator),
	reusable: v.union(v.null(), reusableAttestationValidator),
	sentence: v.union(
		v.null(),
		v.object({
			sentenceId: v.id("sentences"),
			textId: v.id("texts"),
			segmentedSentenceId: v.string(),
			language: languageValidator,
			stitchedText: v.string(),
			segments: v.array(
				v.object({
					index: v.number(),
					kind: segmentKindValidator,
					text: v.string(),
					surface: v.optional(v.string()),
				}),
			),
			/** Whether the Sentence belongs to a hidden Definition Text. */
			definitionText: v.boolean(),
		}),
	),
	/** Stored Lemmas and the Sentence texts they were found under. */
	lemmaCandidates: v.array(
		v.object({
			lemma: lemmaValueValidator,
			foundUnder: v.array(v.string()),
		}),
	),
	/** Intake's Sentence Analysis, read before click-time classification. */
	analysis: v.union(v.null(), storedSentenceAnalysisValidator),
});

/** One snapshot of reuse, sentence, and bounded dictionary hints; commit rechecks ownership. */
export async function loadResolutionContext(
	ctx: QueryCtx,
	input: {
		requestId: string;
		visitorId: string;
		sentenceId: Id<"sentences">;
		clickedSegmentIndex: number;
	},
	loadGrammar = true,
) {
	const recorded = await findClickResult(ctx, input);
	if (recorded)
		return {
			recorded,
			reusable: null,
			sentence: null,
			lemmaCandidates: [],
			analysis: null,
		};
	const reusable = await findAttestationForSegmentValue(ctx, input);
	if (reusable)
		return {
			recorded: null,
			reusable,
			sentence: null,
			lemmaCandidates: [],
			analysis: null,
		};
	// A resumed Grammar still needs the Sentence to commit stored membership.
	const sentence = await loadSentenceForResolution(ctx, input);
	if (!loadGrammar || sentence?.language !== "de")
		return {
			recorded: null,
			reusable: null,
			sentence,
			lemmaCandidates: [],
			analysis: null,
		};
	const analysis = await loadSentenceAnalysis(ctx, input.sentenceId);
	const words = sentence.segments.filter(
		(segment) => segment.kind === "ResolvableText",
	);
	const clicked = words.findIndex(
		(segment) => segment.index === input.clickedSegmentIndex,
	);
	// A fusion component is looked up by the word it stands for.
	const spellingOf = (word: (typeof words)[number]) =>
		word.surface ?? word.text;
	// Include nearby phrases as well as individual words: articles, separated verbs,
	// and inflected forms can lead to stored Surfaces with a different headword.
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
	// Every word is looked up so a target's far member, such as a separated
	// prefix, still finds its Lemma; each spelling keeps the Sentence text it
	// came from, and Dumgen offers only Lemmas found under the target's own.
	const foundUnder = new Map<string, Set<string>>();
	for (const text of [
		words[clicked] ? spellingOf(words[clicked]) : "",
		...phrases,
		...words.map(spellingOf),
	].filter(Boolean))
		for (const spelling of [
			text,
			text.slice(0, 1).toLocaleLowerCase("de") + text.slice(1),
			text.slice(0, 1).toLocaleUpperCase("de") + text.slice(1),
		])
			foundUnder.set(
				spelling,
				(foundUnder.get(spelling) ?? new Set()).add(text),
			);
	const spellings = [...foundUnder.keys()].slice(0, 64);
	const matches = await Promise.all(
		spellings.map(async (spelling) => {
			const [lemmas, surfaces] = await Promise.all([
				ctx.db
					.query("lemmas")
					.withIndex("by_language_and_canonical_form", (q) =>
						q.eq("language", "de").eq("canonicalForm", spelling),
					)
					.take(9),
				ctx.db
					.query("surfaces")
					.withIndex("by_language_and_normalized_surface", (q) =>
						q
							.eq("language", "de")
							.eq("normalizedSurface", spelling),
					)
					.take(9),
			]);
			// Hints are optional; an overfull spelling falls back to normal resolution.
			if (lemmas.length > 8 || surfaces.length > 8) return [];
			const owners = await Promise.all(
				[...new Set(surfaces.map((surface) => surface.lemmaId))].map(
					(id) => ctx.db.get(id),
				),
			);
			const texts = [...(foundUnder.get(spelling) ?? [])];
			return [
				...lemmas,
				...owners.flatMap((lemma) =>
					lemma?.language === "de" ? [lemma] : [],
				),
			].map((lemma) => ({ lemma, texts }));
		}),
	);
	const candidates = new Map<
		Id<"lemmas">,
		{ lemma: Doc<"lemmas">; foundUnder: Set<string> }
	>();
	for (const { lemma, texts } of matches.flat()) {
		const candidate = candidates.get(lemma._id) ?? {
			lemma,
			foundUnder: new Set<string>(),
		};
		for (const text of texts) candidate.foundUnder.add(text);
		candidates.set(lemma._id, candidate);
	}
	return {
		recorded: null,
		reusable: null,
		sentence,
		lemmaCandidates: [...candidates.values()]
			.slice(0, 64)
			.map(({ lemma, foundUnder }) => ({
				lemma: lemmaValue(lemma),
				foundUnder: [...foundUnder],
			})),
		analysis,
	};
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
