import { expect, test } from "bun:test";
import { readingFingerprint } from "dumling/reading";
import { structuralShadowLocatorKey } from "../convex/model/shadows";
import { projectFeaturesForPresentation as projectFeatures } from "../convex/modules/notes/featurePresentation";
import {
	projectReadingKnowledge,
	projectReadingValue,
} from "../convex/modules/notes/projections";
import { loadSourceContextPage } from "../convex/modules/notes/readingNote";
import { projectResolvedRelationTargets } from "../convex/modules/notes/relations";
import { isUnitReadingFamily } from "../convex/modules/notes/unitReadingFamilies";
import { get as getReadingNote } from "../convex/readingNotes";
import { get as getTextView, loadTextFocus } from "../convex/textViews";

const getReadingNoteHandler = queryHandler<{
	readingId: string;
	visitorId: string;
	contextCursor?: string;
}>(getReadingNote);
const getTextViewHandler = queryHandler<{
	textId: string;
	visitorId: string;
	focusAttestationId?: string;
}>(getTextView);

test("projects Dumling feature values for learner inspection", () => {
	expect(projectFeatures({ gender: "Fem", hyph: null })).toEqual([
		{ name: "gender", value: "Fem" },
		{ name: "hyph", value: "—" },
	]);
});

test("projects foundational Reading and unfiltered Knowledge without display sentinels", () => {
	const reading = projectReadingValue(
		{ emojiDescription: "🏃" },
		{
			language: "de",
			family: "Lexeme",
			kind: "VERB",
			canonicalForm: "aufpassen",
			coreFeatures: {
				hasGovPrep: null,
				hasSepPrefix: "auf",
				lexicallyReflexive: null,
				verbType: null,
			},
		},
	);
	const knowledge = projectReadingKnowledge({
		transcription: "  aʊ̯fˌpasn̩  ",
		definition: "  aufmerksam sein  ",
		translations: { en: ["pay attention"] },
	});

	expect(reading.lemma.coreFeatures).toEqual({
		hasGovPrep: null,
		hasSepPrefix: "auf",
		lexicallyReflexive: null,
		verbType: null,
	});
	expect(knowledge).toEqual({
		transcription: "aʊ̯fˌpasn̩",
		definition: "aufmerksam sein",
		translations: { en: ["pay attention"] },
	});
});

test("Unit Reading NoteData ignores visitor settings and keeps all pure data", async () => {
	const sourceLemma = {
		_id: "lemma-source",
		lemmaKey: "lemma-source-key",
		language: "de",
		family: "Lexeme",
		kind: "VERB",
		canonicalForm: "aufpassen",
		coreFeatures: {
			hasGovPrep: null,
			hasSepPrefix: "auf",
			lexicallyReflexive: null,
			verbType: null,
		},
	};
	const readingKey = readingFingerprint({
		lemma: {
			language: sourceLemma.language,
			family: sourceLemma.family,
			kind: sourceLemma.kind,
			canonicalForm: sourceLemma.canonicalForm,
			coreFeatures: sourceLemma.coreFeatures,
		},
		emojiDescription: "🏃",
	});
	const targetLemma = {
		_id: "lemma-target",
		lemmaKey: "lemma-target-key",
		language: "de",
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm: "Aufmerksamkeit",
		coreFeatures: { gender: "Fem", hyph: null },
	};
	const structuralShadow = {
		_id: "shadow-1",
		shadowKey: JSON.stringify(["de", "Merkmal", "Lexeme", "NOUN"]),
		language: "de",
		canonicalForm: "Merkmal",
		family: "Lexeme",
		kind: "NOUN",
	};
	const rows = {
		dictionaryLemmas: [
			{ lemmaId: sourceLemma._id },
			{ lemmaId: targetLemma._id },
		],
		readings: [
			{
				_id: "reading-1",
				lemmaId: sourceLemma._id,
				readingKey,
				emojiDescription: "🏃",
			},
		],
		readingEntries: {
			readingId: "reading-1",
			record: {
				attestedTranslations: [],
				notes: "",
			},
		},
		accumulatedKnowledge: {
			ownerReadingKey: readingKey,
			knowledge: {
				transcription: "aʊ̯fˌpasn̩",
				definition: "aufmerksam sein",
				translations: { en: ["pay attention"] },
			},
			status: "Full",
			updatedAt: 42,
		},
		semanticRelationEdges: [
			{
				sourceReadingId: "reading-1",
				targetLemmaId: targetLemma._id,
				relation: "synonym",
			},
		],
		structuralShadowReferences: [
			{
				shadowId: structuralShadow._id,
				ownerReadingKey: readingKey,
				aspect: "morphologicalTree",
				path: "root.0",
				locatorKey: structuralShadowLocatorKey(
					readingKey,
					"morphologicalTree",
					"root.0",
				),
			},
		],
	};
	const documents: Record<string, unknown> = {
		"reading-1": {
			_id: "reading-1",
			lemmaId: sourceLemma._id,
			readingKey,
			emojiDescription: "🏃",
		},
		[sourceLemma._id]: sourceLemma,
		[targetLemma._id]: targetLemma,
		[structuralShadow._id]: structuralShadow,
	};
	const queriedTables: string[] = [];
	const ctx = {
		db: {
			normalizeId(_table: string, id: string) {
				return id;
			},
			async get(id: string) {
				return documents[id] ?? null;
			},
			query(table: keyof typeof rows | string) {
				queriedTables.push(table);
				const builder = {
					withIndex() {
						return builder;
					},
					order() {
						return builder;
					},
					async unique() {
						return table === "accumulatedKnowledge"
							? rows.accumulatedKnowledge
							: table === "readingEntries"
								? rows.readingEntries
								: table === "lemmas"
									? targetLemma
									: null;
					},
					async take() {
						if (table === "dictionaryLemmas") {
							return rows.dictionaryLemmas;
						}
						if (table === "readings") return rows.readings;
						if (table === "semanticRelationEdges") {
							return rows.semanticRelationEdges;
						}
						if (table === "structuralShadowReferences") {
							return rows.structuralShadowReferences;
						}
						return [];
					},
					async paginate() {
						return { page: [], continueCursor: "", isDone: true };
					},
				};
				return builder;
			},
		},
	};

	const note = (await getReadingNoteHandler(ctx, {
		readingId: "reading-1",
		visitorId: "visitor-1",
	})) as {
		kind: string;
		reading: { lemma: { coreFeatures: unknown } };
		knowledge: Record<string, unknown>;
		relations: unknown[];
		structuralReferences: unknown[];
	};

	expect(queriedTables).not.toContain("knowledgeSettings");
	expect(note.kind).toBe("UnitReadingNote");
	expect(note.reading.lemma.coreFeatures).toEqual(sourceLemma.coreFeatures);
	expect(note.knowledge).toMatchObject({
		transcription: "aʊ̯fˌpasn̩",
		definition: "aufmerksam sein",
		translations: { en: ["pay attention"] },
		semanticRelations: {
			synonym: [
				{
					language: targetLemma.language,
					family: targetLemma.family,
					kind: targetLemma.kind,
					canonicalForm: targetLemma.canonicalForm,
					coreFeatures: targetLemma.coreFeatures,
				},
			],
		},
	});
	expect(note.relations).toHaveLength(1);
	expect(note.structuralReferences).toHaveLength(1);
});

test("projects stored semantic endpoints as Lemma Route Note targets", () => {
	const relations = [
		{
			relation: "hypernym" as const,
			targetLemmaKey: "stored-lemma-key",
			targetCanonicalForm: "Institut",
		},
		{
			relation: "antonym" as const,
			targetLemmaKey: "construction-lemma-key",
			targetCanonicalForm: "Sparkasse",
		},
		{
			relation: "synonym" as const,
			targetLemmaKey: "dangling-lemma-key",
			targetCanonicalForm: "Geldinstitut",
		},
	];

	expect(
		projectResolvedRelationTargets(relations, [
			{
				lemmaKey: "stored-lemma-key",
				lemmaId: "lemma_123",
			},
			{
				lemmaKey: "construction-lemma-key",
				lemmaId: "lemma_456",
			},
		]),
	).toEqual([
		{
			relation: "hypernym",
			targetCanonicalForm: "Institut",
			target: {
				kind: "RouteNote",
				routeKind: "Lemma",
				id: "lemma_123",
			},
		},
		{
			relation: "antonym",
			targetCanonicalForm: "Sparkasse",
			target: {
				kind: "RouteNote",
				routeKind: "Lemma",
				id: "lemma_456",
			},
		},
	]);
});

test("note and text queries expose target-specific interfaces", () => {
	const textArgs = getTextView.exportArgs();
	const textReturns = getTextView.exportReturns();
	const noteArgs = getReadingNote.exportArgs();
	const noteReturns = getReadingNote.exportReturns();

	expect(textArgs).toContain('"textId"');
	expect(textArgs).toContain('"focusAttestationId"');
	expect(textArgs).not.toContain('"target"');
	expect(noteArgs).toContain('"readingId"');
	expect(noteArgs).toContain('"contextCursor"');
	expect(noteArgs).toContain('"visitorId"');
	expect(noteArgs).not.toContain('"value":"RouteNote"');
	expect(noteArgs).not.toContain('"value":"ShadowNote"');
	expect(noteReturns).toContain('"tableName":"readings"');
	expect(noteReturns).toContain('"tableName":"attestations"');
	expect(noteReturns).toContain('"sentenceSnippet"');
	expect(noteReturns).not.toContain("targetReadingKey");
	expect(noteReturns).toContain('"value":"Lemma"');
	expect(textReturns).toContain('"value":"None"');
	expect(textReturns).toContain('"value":"Missing"');
	expect(textReturns).toContain('"value":"Occurrence"');
});

test("Text projection shares current truth through Visitor Encounter history", async () => {
	const sentence = {
		_id: "sentence-1",
		textId: "text-1",
		position: 0,
		language: "de",
		stitchedText: "rufe fehl an aktiv",
	};
	const segments = [
		{
			_id: "segment-rufe",
			sentenceId: sentence._id,
			index: 0,
			kind: "ResolvableText",
			text: "rufe",
			attestationMembership: {
				attestationId: "attestation-1",
				orthography: "Exact",
			},
		},
		{
			_id: "segment-failed",
			sentenceId: sentence._id,
			index: 1,
			kind: "ResolvableText",
			text: "fehl",
			resolutionState: { kind: "PermanentFailure" },
		},
		{
			_id: "segment-an",
			sentenceId: sentence._id,
			index: 2,
			kind: "ResolvableText",
			text: "an",
			attestationMembership: {
				attestationId: "attestation-1",
				orthography: "Exact",
			},
		},
		{
			_id: "segment-active-for-other-visitor",
			sentenceId: sentence._id,
			index: 3,
			kind: "ResolvableText",
			text: "aktiv",
			resolutionState: { kind: "Active", activeSessionCount: 1 },
		},
	];
	const encounteredSegmentIds = new Set(["segment-an", "segment-failed"]);
	const ctx = {
		db: {
			normalizeId(_table: string, id: string) {
				return id;
			},
			async get(id: string) {
				return id === "text-1"
					? {
							_id: "text-1",
							_creationTime: 1,
							sourceText: sentence.stitchedText,
						}
					: null;
			},
			query(table: string) {
				const indexed: Record<string, string> = {};
				const builder = {
					withIndex(_name: string, range: (q: unknown) => unknown) {
						const q = {
							eq(field: string, value: string) {
								indexed[field] = value;
								return q;
							},
						};
						range(q);
						return builder;
					},
					async take() {
						if (table === "sentences") return [sentence];
						if (table === "segments") return segments;
						if (
							table === "visitorClicks" &&
							encounteredSegmentIds.has(indexed.segmentId ?? "")
						) {
							return [{ _id: `encounter-${indexed.segmentId}` }];
						}
						return [];
					},
				};
				return builder;
			},
		},
	};

	const result = (await getTextViewHandler(ctx, {
		textId: "text-1",
		visitorId: "visitor-1",
	})) as {
		sentences: {
			segments: {
				text: string;
				encountered: boolean;
				resolutionState?: string;
			}[];
		}[];
	};
	const projected = Object.fromEntries(
		(result.sentences[0]?.segments ?? []).map((segment) => [
			segment.text,
			segment,
		]),
	);

	expect(projected.rufe?.encountered).toBe(true);
	expect(projected.an?.encountered).toBe(true);
	expect(projected.fehl).toMatchObject({
		encountered: true,
		resolutionState: "PermanentFailure",
	});
	expect(projected.aktiv).toEqual({
		index: 3,
		kind: "ResolvableText",
		text: "aktiv",
		encountered: false,
	});
});

test("only learner-facing Unit families can open Unit Reading Notes", () => {
	expect(["Lexeme", "Phraseme", "Morpheme"].every(isUnitReadingFamily)).toBe(
		true,
	);
	expect(isUnitReadingFamily("Construction")).toBe(false);
});

test("malformed routed IDs return not-found without reading documents", async () => {
	let documentReads = 0;
	const ctx = {
		db: {
			normalizeId() {
				return null;
			},
			async get() {
				documentReads += 1;
				return null;
			},
		},
	};

	expect(
		await getReadingNoteHandler(ctx, {
			readingId: "malformed id",
			visitorId: "visitor-1",
		}),
	).toBeNull();
	expect(
		await getTextViewHandler(ctx, {
			textId: "malformed id",
			visitorId: "visitor-1",
		}),
	).toBeNull();
	expect(documentReads).toBe(0);
});

test("deleted routed records return the same defined not-found result", async () => {
	let documentReads = 0;
	const ctx = {
		db: {
			normalizeId(_table: string, id: string) {
				return id;
			},
			async get() {
				documentReads += 1;
				return null;
			},
		},
	};

	expect(
		await getReadingNoteHandler(ctx, {
			readingId: "deleted-reading",
			visitorId: "visitor-1",
		}),
	).toBeNull();
	expect(
		await getTextViewHandler(ctx, {
			textId: "deleted-text",
			visitorId: "visitor-1",
		}),
	).toBeNull();
	expect(documentReads).toBe(2);
});

test("pages distinct Source Contexts newest-first with complete discontinuous members", async () => {
	const fixture = presentationFixture({
		pages: {
			start: [
				"attestation_new_b",
				"attestation_new_a",
				"attestation_new_b",
			],
			cursor_1: ["attestation_old"],
		},
		segmentsByAttestation: {
			attestation_new_b: [
				{ sentenceId: "sentence_b", index: 4 },
				{ sentenceId: "sentence_b", index: 1 },
			],
			attestation_new_a: [{ sentenceId: "sentence_a", index: 2 }],
			attestation_old: [{ sentenceId: "sentence_old", index: 0 }],
		},
		documents: {
			sentence_b: {
				_id: "sentence_b",
				textId: "text_b",
				position: 3,
				stitchedText: "Heute steht etwas dazwischen.",
			},
			sentence_a: {
				_id: "sentence_a",
				textId: "text_a",
				position: 1,
				stitchedText: "A distinct encounter.",
			},
			sentence_old: {
				_id: "sentence_old",
				textId: "text_a",
				position: 0,
				stitchedText: "The oldest encounter.",
			},
			text_a: { _id: "text_a" },
			text_b: { _id: "text_b" },
		},
	});

	const first = await loadSourceContextPage(
		fixture.ctx as never,
		"reading_shared" as never,
		"visitor-1",
	);
	expect(first.page.map(({ attestationId }) => attestationId)).toEqual([
		"attestation_new_b",
		"attestation_new_a",
	]);
	expect(first.page.map(({ textId }) => textId)).toEqual([
		"text_b",
		"text_a",
	]);
	expect(first.page[0]?.memberSegmentIndices).toEqual([1, 4]);
	expect(first.page[0]?.target).toEqual({
		kind: "Text",
		textId: "text_b",
		focusAttestationId: "attestation_new_b",
	});
	expect(fixture.orders).toEqual(["desc"]);
	expect(fixture.paginations[0]).toEqual({ cursor: null, numItems: 6 });

	const continuation = await loadSourceContextPage(
		fixture.ctx as never,
		"reading_shared" as never,
		"visitor-1",
		"cursor_1",
	);
	expect(continuation.page.map(({ attestationId }) => attestationId)).toEqual(
		["attestation_old"],
	);
	expect(fixture.paginations[1]).toEqual({
		cursor: "cursor_1",
		numItems: 6,
	});
});

test("Source Contexts include only occurrences encountered by this Visitor", async () => {
	const fixture = presentationFixture({
		pages: {
			start: ["attestation_seen", "attestation_other_visitor"],
		},
		segmentsByAttestation: {
			attestation_seen: [
				{ sentenceId: "sentence_seen", index: 1 },
				{ sentenceId: "sentence_seen", index: 4 },
			],
			attestation_other_visitor: [
				{ sentenceId: "sentence_other", index: 2 },
			],
		},
		documents: {
			sentence_seen: {
				_id: "sentence_seen",
				textId: "text_seen",
				position: 0,
				stitchedText: "The encountered occurrence.",
			},
			sentence_other: {
				_id: "sentence_other",
				textId: "text_other",
				position: 0,
				stitchedText: "Someone else's occurrence.",
			},
			text_seen: { _id: "text_seen" },
			text_other: { _id: "text_other" },
		},
		encounteredSegmentIds: new Set(["attestation_seen:segment:1"]),
	});

	const result = await loadSourceContextPage(
		fixture.ctx as never,
		"reading_shared" as never,
		"visitor-1",
	);

	expect(result.page.map(({ attestationId }) => attestationId)).toEqual([
		"attestation_seen",
	]);
	expect(result.page[0]?.memberSegmentIndices).toEqual([1, 4]);
});

test("focused occurrence validates Text ownership and never substitutes stale coordinates", async () => {
	const fixture = presentationFixture({
		segmentsByAttestation: {
			attestation_valid: [
				{ sentenceId: "sentence_a", index: 5 },
				{ sentenceId: "sentence_a", index: 1 },
			],
			attestation_wrong_text: [{ sentenceId: "sentence_b", index: 2 }],
		},
		documents: {
			attestation_valid: { _id: "attestation_valid" },
			attestation_wrong_text: { _id: "attestation_wrong_text" },
			sentence_a: { _id: "sentence_a", textId: "text_a" },
			sentence_b: { _id: "sentence_b", textId: "text_b" },
		},
		malformedIds: new Set(["malformed"]),
	});

	expect(
		await loadTextFocus(
			fixture.ctx as never,
			"text_a" as never,
			"attestation_valid",
		),
	).toEqual({
		kind: "Occurrence",
		attestationId: "attestation_valid",
		sentenceId: "sentence_a",
		memberSegmentIndices: [1, 5],
	});
	expect(
		await loadTextFocus(
			fixture.ctx as never,
			"text_a" as never,
			"attestation_wrong_text",
		),
	).toEqual({
		kind: "Missing",
		requestedAttestationId: "attestation_wrong_text",
	});
	expect(
		await loadTextFocus(
			fixture.ctx as never,
			"text_a" as never,
			"attestation_stale",
		),
	).toEqual({
		kind: "Missing",
		requestedAttestationId: "attestation_stale",
	});
	const readsBeforeMalformed = fixture.documentReads.length;
	expect(
		await loadTextFocus(
			fixture.ctx as never,
			"text_a" as never,
			"malformed",
		),
	).toEqual({ kind: "Missing", requestedAttestationId: "malformed" });
	expect(fixture.documentReads).toHaveLength(readsBeforeMalformed);
});

function presentationFixture({
	pages = {},
	segmentsByAttestation = {},
	documents = {},
	malformedIds = new Set<string>(),
	encounteredSegmentIds,
}: {
	pages?: Record<string, string[]>;
	segmentsByAttestation?: Record<
		string,
		{ sentenceId: string; index: number }[]
	>;
	documents?: Record<string, Record<string, unknown>>;
	malformedIds?: Set<string>;
	encounteredSegmentIds?: ReadonlySet<string>;
}) {
	const orders: string[] = [];
	const paginations: { cursor: string | null; numItems: number }[] = [];
	const documentReads: string[] = [];
	const ctx = {
		db: {
			normalizeId(_table: string, id: string) {
				return malformedIds.has(id) ? null : id;
			},
			async get(id: string) {
				documentReads.push(id);
				return documents[id] ?? null;
			},
			query(table: string) {
				let indexedValue = "";
				const builder = {
					withIndex(_index: string, range: (q: unknown) => unknown) {
						const q = {
							eq(_field: string, value: string) {
								indexedValue = value;
								return q;
							},
						};
						range(q);
						return builder;
					},
					order(direction: string) {
						orders.push(direction);
						return builder;
					},
					async paginate(options: {
						cursor: string | null;
						numItems: number;
					}) {
						paginations.push(options);
						const ids = pages[options.cursor ?? "start"] ?? [];
						return {
							page: ids.map((id) => ({
								_id: id,
								readingId: indexedValue,
							})),
							continueCursor: "cursor_1",
							isDone: options.cursor === "cursor_1",
						};
					},
					async take() {
						if (table === "segments") {
							return (
								segmentsByAttestation[indexedValue] ?? []
							).map((segment, index) => ({
								_id: `${indexedValue}:segment:${index}`,
								...segment,
							}));
						}
						if (table === "visitorClicks") {
							return !encounteredSegmentIds ||
								encounteredSegmentIds.has(indexedValue)
								? [{ _id: `encounter:${indexedValue}` }]
								: [];
						}
						return [];
					},
				};
				return builder;
			},
		},
	};
	return { ctx, orders, paginations, documentReads };
}

function queryHandler<Args>(query: unknown) {
	return (
		query as { _handler: (ctx: unknown, args: Args) => Promise<unknown> }
	)._handler;
}
