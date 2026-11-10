import { expect, test } from "bun:test";
import { loadResolutionContext } from "../convex/resolutionContext";
import { createTestConvex } from "./support/convex";
import { insertDictionaryLemma } from "./support/dumdict-relations";

/** The Lemma candidates a click on word `clicked` of `text` is offered. */
async function hintsFor(
	t: ReturnType<typeof createTestConvex>,
	text: string,
	clicked: number,
	/** The units intake stored, by the words' positions. */
	units: readonly (readonly number[])[] = [],
) {
	const context = await t.run(async (ctx) => {
		const sentenceId = await ctx.db.insert("sentences", {
			segmentedSentenceId: "segmented-1",
			scrollId: await ctx.db.insert("scrolls", {
				submissionKey: "text-1",
				sourceText: text,
			}),
			position: 0,
			paragraph: 0,
			language: "de",
			stitchedText: text,
			units: units.map((words) => ({
				segments: words.map((word) => word * 2),
				route: {
					language: "de" as const,
					family: "Lexeme" as const,
					kind: "VERB" as const,
				},
			})),
		});
		for (const [index, word] of text.split(" ").entries()) {
			if (index > 0)
				await ctx.db.insert("segments", {
					sentenceId,
					index: index * 2 - 1,
					kind: "Whitespace",
					text: " ",
				});
			await ctx.db.insert("segments", {
				sentenceId,
				index: index * 2,
				kind: "ResolvableText",
				text: word,
			});
		}
		return loadResolutionContext(ctx, {
			requestId: "request-1",
			visitorId: "visitor-1",
			sentenceId,
			clickedSegmentIndex: clicked * 2,
		});
	});
	return context.lemmaCandidates.map(({ lemma, foundUnder }) => ({
		canonicalForm: lemma.canonicalForm,
		foundUnder,
	}));
}

test("a multiword click finds its Lemma by the Canonical Form its words spell", async () => {
	const t = createTestConvex();
	await insertDictionaryLemma(t, {
		unitKind: "Lemma",
		language: "de",
		family: "Locution",
		kind: "VERB",
		canonicalForm: "auf den Keks gehen",
		coreFeatures: {},
	});
	// Keks
	expect(
		await hintsFor(t, "Das wird mir auf den Keks gehen", 5),
	).toContainEqual({
		canonicalForm: "auf den Keks gehen",
		foundUnder: ["auf den Keks gehen"],
	});
});

test("a unit's far member is looked up first, however many words stand between", async () => {
	const t = createTestConvex();
	await insertDictionaryLemma(t, {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm: "Teil",
		coreFeatures: { gender: "Masc" },
	});
	const between = Array.from({ length: 30 }, (_, index) => `wort${index}`);
	const text = ["Sie", "nimmt", ...between, "teil"].join(" ");
	const teil = between.length + 2;
	// Without the unit, the words before `teil` use up every lookup.
	expect(await hintsFor(t, text, 1)).toEqual([]);
	expect(await hintsFor(t, text, 1, [[1, teil]])).toEqual([
		{ canonicalForm: "Teil", foundUnder: ["teil"] },
	]);
});
