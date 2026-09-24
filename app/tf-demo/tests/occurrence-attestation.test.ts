import { expect, test } from "bun:test";

import { loadOccurrenceAttestation } from "../convex/model/occurrenceAttestations";
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
			coreFeatures: {
				hasSepPrefix: "Yes",
				lexicallyReflexive: null,
				verbType: null,
			},
		});
		const attestationId = await ctx.db.insert("attestations", {
			surfaceId: await ctx.db.insert("surfaces", {
				surfaceKey: "surface-key-1",
				lemmaId,
				language: "de",
				normalizedSurface: "aufmachen",
				inflectionalFeatures: null,
				spelling: "Canonical",
				surfaceFeatures: null,
			}),
			readingId: await ctx.db.insert("readings", {
				lemmaId,
				readingKey: "reading-key-1",
				emojiDescription: "🚪",
			}),
			realizationCoverage: "Partial",
		});
		const sentenceId = await ctx.db.insert("sentences", {
			segmentedSentenceId: "segmented-1",
			textId: await ctx.db.insert("texts", {
				submissionKey: "text-1",
				sourceText: "Macht die <Tür> & auf&",
			}),
			position: 0,
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
