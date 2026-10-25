import { expect, test } from "bun:test";
import { loadResolutionContext } from "../convex/resolutionContext";
import { withoutCitedReflexive } from "../server/citedReflexive";
import { createTestConvex } from "./support/convex";
import { insertDictionaryLemma } from "./support/dumdict-relations";

test("lookup removes the sich a wording cites first, or after a leading es", () => {
	expect(withoutCitedReflexive("sich erinnern")).toBe("erinnern");
	expect(withoutCitedReflexive("Sich Sorgen machen")).toBe("Sorgen machen");
	expect(withoutCitedReflexive("es sich gemütlich machen")).toBe(
		"es gemütlich machen",
	);
});

test("a wording that cites no reflexive, or is only sich, stays as it is", () => {
	expect(withoutCitedReflexive("erinnert sich")).toBe("erinnert sich");
	expect(withoutCitedReflexive("an sich")).toBe("an sich");
	expect(withoutCitedReflexive("sich")).toBe("sich");
	expect(withoutCitedReflexive("es eilig haben")).toBe("es eilig haben");
});

test("a phrase that cites a reflexive finds its Lemma, under the words it was read from", async () => {
	const t = createTestConvex();
	await insertDictionaryLemma(t, {
		unitKind: "Lemma",
		language: "de",
		family: "Locution",
		kind: "VERB",
		canonicalForm: "es gemütlich machen",
		coreFeatures: {},
	});
	const context = await t.run(async (ctx) => {
		const text = "Sie will es sich gemütlich machen";
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
			// gemütlich
			clickedSegmentIndex: 8,
		});
	});

	const found = context.lemmaCandidates.find(
		({ lemma }) => lemma.canonicalForm === "es gemütlich machen",
	);
	expect(found?.foundUnder).toEqual(["es sich gemütlich machen"]);
});
