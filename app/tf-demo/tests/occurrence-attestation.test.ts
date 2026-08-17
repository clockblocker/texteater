import { expect, test } from "bun:test";

import { loadOccurrenceAttestation } from "../convex/model/occurrenceAttestations";

test("reconstructs mixed, discontinuous occurrence evidence in source order", async () => {
	const documents: Record<string, unknown> = {
		"attestation-1": {
			_id: "attestation-1",
			surfaceId: "surface-1",
			readingId: "reading-1",
			realizationCoverage: "Partial",
		},
		"surface-1": {
			_id: "surface-1",
			lemmaId: "lemma-1",
			language: "de",
			normalizedSurface: "aufmachen",
			spelling: "Canonical",
			surfaceKind: "Citation",
			surfaceFeatures: null,
		},
		"reading-1": {
			_id: "reading-1",
			lemmaId: "lemma-1",
			readingKey: "reading-key-1",
			emojiDescription: "🚪",
		},
		"lemma-1": {
			_id: "lemma-1",
			lemmaKey: "lemma-key-1",
			language: "de",
			family: "Lexeme",
			kind: "VERB",
			canonicalForm: "aufmachen",
			coreFeatures: { separability: "Separable" },
		},
		"sentence-1": {
			_id: "sentence-1",
			segmentedSentenceId: "segmented-1",
		},
	};
	const segments = [
		{
			_id: "segment-0",
			sentenceId: "sentence-1",
			index: 0,
			kind: "ResolvableText",
			text: "Macht",
			attestationMembership: {
				attestationId: "attestation-1",
				orthography: "Typo",
			},
		},
		{
			_id: "segment-1",
			sentenceId: "sentence-1",
			index: 1,
			kind: "Whitespace",
			text: " ",
		},
		{
			_id: "segment-2",
			sentenceId: "sentence-1",
			index: 2,
			kind: "ResolvableText",
			text: "die <Tür> &",
		},
		{
			_id: "segment-3",
			sentenceId: "sentence-1",
			index: 3,
			kind: "Whitespace",
			text: " ",
		},
		{
			_id: "segment-4",
			sentenceId: "sentence-1",
			index: 4,
			kind: "ResolvableText",
			text: "auf&",
			attestationMembership: {
				attestationId: "attestation-1",
				orthography: "Standard",
			},
		},
	];
	const ctx = {
		db: {
			async get(id: string) {
				return documents[id] ?? null;
			},
			query() {
				let indexName = "";
				return {
					withIndex(
						name: string,
						build: (range: { eq(): unknown }) => unknown,
					) {
						indexName = name;
						const range = { eq: () => range };
						build(range);
						return {
							async take() {
								return indexName === "by_attestation_id"
									? [segments[4], segments[0]]
									: segments;
							},
						};
					},
				};
			},
		},
	};

	const occurrence = await loadOccurrenceAttestation(
		ctx as never,
		"attestation-1" as never,
	);

	expect(occurrence?.memberSegmentIndices).toEqual([0, 4]);
	expect(occurrence?.markedContext).toBe(
		"<TARGET>Macht</TARGET> die &lt;Tür&gt; &amp; <TARGET>auf&amp;</TARGET>",
	);
	expect(occurrence?.publicAttestation).toMatchObject({
		members: [
			{ attested: "Macht", orthography: "Typo" },
			{ attested: "auf&", orthography: "Standard" },
		],
		realizationCoverage: "Partial",
		surface: { lemma: { canonicalForm: "aufmachen" } },
	});
});
