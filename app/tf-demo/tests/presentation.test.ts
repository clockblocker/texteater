import { expect, test } from "bun:test";
import { readingFingerprint } from "dumling";

import {
	getNote,
	getTextView,
	isUnitReadingFamily,
	loadSourceContextPage,
	loadTextFocus,
	projectFeatures,
	projectKnowledge,
	projectResolvedRelationTargets,
} from "../convex/presentation";

const getNoteHandler = queryHandler<{
	target: { kind: "UnitReadingNote"; readingId: string };
}>(getNote);
const getTextViewHandler = queryHandler<{
	target: { kind: "Text"; textId: string };
}>(getTextView);

test("projects learner Knowledge and direct relations without storing a view", () => {
	const targetLemma = {
		language: "de",
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm: "Institut",
		coreFeatures: { gender: "Neut", hyph: null },
	} as const;

	expect(
		projectKnowledge(
			{
				definition: "Ein Geldinstitut.",
				translations: { en: ["bank"] },
				semanticRelations: {
					hypernym: [{ lemma: targetLemma, emojiDescription: "🏛️" }],
				},
			},
			{ transcriptions: { de: ["baŋk"] } },
		),
	).toEqual({
		definition: "Ein Geldinstitut.",
		translations: [{ language: "en", values: ["bank"] }],
		transcriptions: [{ language: "de", values: ["baŋk"] }],
		morphologicalTree: null,
		lexicalBreakdown: [],
		relations: [
			{
				relation: "hypernym",
				targetReadingKey: readingFingerprint({
					lemma: targetLemma,
					emojiDescription: "🏛️",
				}),
				targetCanonicalForm: "Institut",
				targetEmojiDescription: "🏛️",
			},
		],
	});
});

test("projects Dumling feature values for learner inspection", () => {
	expect(projectFeatures({ gender: "Fem", hyph: null })).toEqual([
		{ name: "gender", value: "Fem" },
		{ name: "hyph", value: "—" },
	]);
});

test("projects only stored semantic endpoints as Unit Reading Note targets", () => {
	const relations = [
		{
			relation: "hypernym" as const,
			targetReadingKey: "stored-reading-key",
			targetCanonicalForm: "Institut",
			targetEmojiDescription: "🏛️",
		},
		{
			relation: "antonym" as const,
			targetReadingKey: "construction-reading-key",
			targetCanonicalForm: "Sparkasse",
			targetEmojiDescription: "🏦",
		},
		{
			relation: "synonym" as const,
			targetReadingKey: "dangling-reading-key",
			targetCanonicalForm: "Geldinstitut",
			targetEmojiDescription: "💶",
		},
	];

	expect(
		projectResolvedRelationTargets(relations, [
			{
				readingKey: "stored-reading-key",
				readingId: "reading_123",
				lemmaFamily: "Lexeme",
			},
			{
				readingKey: "construction-reading-key",
				readingId: "reading_456",
				lemmaFamily: "Construction",
			},
		]),
	).toEqual([
		{
			relation: "hypernym",
			targetCanonicalForm: "Institut",
			targetEmojiDescription: "🏛️",
			target: {
				kind: "UnitReadingNote",
				readingId: "reading_123",
			},
		},
	]);
});

test("routed presentation queries accept targets and return app-owned IDs", () => {
	const textArgs = getTextView.exportArgs();
	const textReturns = getTextView.exportReturns();
	const noteArgs = getNote.exportArgs();
	const noteReturns = getNote.exportReturns();

	expect(textArgs).toContain('"value":"Text"');
	expect(noteArgs).toContain('"value":"UnitReadingNote"');
	expect(noteArgs).toContain('"value":"RouteNote"');
	expect(noteArgs).toContain('"value":"ShadowNote"');
	expect(noteArgs).toContain('"value":"Resolution"');
	expect(noteArgs).toContain('"contextCursor"');
	expect(noteReturns).toContain('"tableName":"readings"');
	expect(noteReturns).toContain('"tableName":"attestations"');
	expect(noteReturns).toContain('"sentenceSnippet"');
	expect(noteReturns).not.toContain("targetReadingKey");
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
		await getNoteHandler(ctx, {
			target: { kind: "UnitReadingNote", readingId: "malformed id" },
		}),
	).toBeNull();
	expect(
		await getTextViewHandler(ctx, {
			target: { kind: "Text", textId: "malformed id" },
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
		await getNoteHandler(ctx, {
			target: { kind: "UnitReadingNote", readingId: "deleted-reading" },
		}),
	).toBeNull();
	expect(
		await getTextViewHandler(ctx, {
			target: { kind: "Text", textId: "deleted-text" },
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
