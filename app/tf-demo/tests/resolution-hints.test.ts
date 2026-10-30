import { expect, test } from "bun:test";
import { loadResolutionContext } from "../convex/resolutionContext";
import { createTestConvex } from "./support/convex";
import { insertDictionaryLemma } from "./support/dumdict-relations";

/** The Lemma candidates a click on word `clicked` of `text` is offered. */
async function hintsFor(
	t: ReturnType<typeof createTestConvex>,
	text: string,
	clicked: number,
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
