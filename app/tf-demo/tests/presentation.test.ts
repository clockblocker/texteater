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
	contextCursor?: string;
}>(getReadingNote);
const getTextViewHandler = queryHandler<{
	textId: string;
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
	expect(noteArgs).not.toContain('"visitorId"');
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
		}),
	).toBeNull();
	expect(
		await getTextViewHandler(ctx, {
			textId: "malformed id",
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
		}),
	).toBeNull();
	expect(
		await getTextViewHandler(ctx, {
			textId: "deleted-text",
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
}: {
	pages?: Record<string, string[]>;
	segmentsByAttestation?: Record<
		string,
		{ sentenceId: string; index: number }[]
	>;
	documents?: Record<string, Record<string, unknown>>;
	malformedIds?: Set<string>;
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
						return table === "segments"
							? (segmentsByAttestation[indexedValue] ?? [])
							: [];
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
