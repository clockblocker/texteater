import { expect, test } from "bun:test";

import { loadOccurrenceAttestation } from "../convex/model/occurrenceAttestations";
import { loadResolutionContext } from "../convex/resolutionContext";
import { clickSentenceOf } from "../server/clickGrammarInput";
import { createTestConvex } from "./support/convex";

test("reconstructs mixed, discontinuous occurrence evidence in source order", async () => {
	const t = createTestConvex();
	const occurrence = await t.run(async (ctx) => {
		const lemmaId = await ctx.db.insert("lemmas", {
			lemmaKey: "lemma-key-1",
			language: "de",
			family: "Lexeme",
			kind: "VERB",
			canonicalForm: "aufmachen",
			foldedCanonicalForm: "aufmachen",
			coreFeatures: {
				hasSepPrefix: "Yes",
			},
		});
		const attestationId = await ctx.db.insert("attestations", {
			surfaceId: await ctx.db.insert("surfaces", {
				surfaceKey: "surface-key-1",
				lemmaId,
				language: "de",
				normalizedSurface: "aufmachen",
				inflectionalFeatures: null,
				spelling: { kind: "Canonical" },
				surfaceFeatures: null,
			}),
			readingId: await ctx.db.insert("readings", {
				lemmaId,
				readingKey: "reading-key-1",
				emojiDescription: "🚪",
			}),
			realizationCoverage: "Partial",
			expletiveEvidence: null,
			valencyEvidence: [],
		});
		const sentenceId = await ctx.db.insert("sentences", {
			segmentedSentenceId: "segmented-1",
			scrollId: await ctx.db.insert("scrolls", {
				submissionKey: "text-1",
				sourceText: "Macht die <Tür> & auf&",
			}),
			position: 0,
			paragraph: 0,
			language: "de",
			stitchedText: "Macht die <Tür> & auf&",
		});
		// The later member is stored first, so the membership index returns
		// members out of source order.
		for (const [index, kind, text, orthography] of [
			[4, "ResolvableText", "auf&", "Standard"],
			[0, "ResolvableText", "Macht", "Typo"],
			[1, "Whitespace", " ", null],
			[2, "ResolvableText", "die <Tür> &", null],
			[3, "Whitespace", " ", null],
		] as const) {
			await ctx.db.insert("segments", {
				sentenceId,
				index,
				kind,
				text,
				...(orthography
					? { attestationMembership: { attestationId, orthography } }
					: {}),
			});
		}
		return loadOccurrenceAttestation(ctx, attestationId);
	});

	expect(occurrence?.memberSegmentIndices).toEqual([0, 4]);
	expect(occurrence?.encounter.sentence.id).toBe(occurrence?.sentence._id);
	expect(occurrence?.encounter.target.memberSegmentIndices).toEqual([0, 4]);
	expect(occurrence?.publicAttestation).toMatchObject({
		unitKind: "Attestation",
		members: [
			{ attested: "Macht", orthography: "Typo" },
			{ attested: "auf&", orthography: "Standard" },
		],
		realizationCoverage: "Partial",
		surface: { lemma: { canonicalForm: "aufmachen" } },
	});
});

test("encounter.sentence.id uses the bounded Convex sentenceId rather than raw paste text in segmentedSentenceId", async () => {
	const t = createTestConvex();
	const rawPaste = `text:v1:${"Langer eingefügter Text. ".repeat(120)}`;
	const result = await t.run(async (ctx) => {
		const scrollId = await ctx.db.insert("scrolls", {
			submissionKey: rawPaste,
			sourceText: "Die Banken.",
		});
		const sentenceId = await ctx.db.insert("sentences", {
			segmentedSentenceId: `${rawPaste}#0`,
			scrollId,
			position: 0,
			paragraph: 0,
			language: "de",
			stitchedText: "Die Banken.",
		});
		for (const [index, kind, text] of [
			[0, "ResolvableText", "Die"],
			[1, "Whitespace", " "],
			[2, "ResolvableText", "Banken"],
			[3, "Punctuation", "."],
		] as const) {
			await ctx.db.insert("segments", { sentenceId, index, kind, text });
		}
		const context = await loadResolutionContext(ctx, {
			sentenceId,
			clickedSegmentIndex: 2,
		});
		return { sentenceId, context };
	});

	expect(result.context.sentence).not.toBeNull();
	expect(JSON.stringify(result.context)).not.toContain("text:v1:");
	if (!result.context.sentence) throw new Error("Expected a Sentence.");
	expect(clickSentenceOf(result.context.sentence).id).toBe(result.sentenceId);
});
