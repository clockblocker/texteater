import { describe, expect, test } from "bun:test";
import {
	clearLemmaDataBatch,
	clearReadingDataBatch,
	clearSharedDataBatch,
	clearVisitorDataBatch,
	resetDemoDataBatch,
} from "../convex/demoReset";
import {
	attachPendingShadowReference,
	collectStructuralShadowReferences,
	descriptorFromStoredShadow,
	normalizeShadowDescriptor,
	replaceAccumulatedKnowledge,
	shadowIsCompatible,
	shadowKeyFor,
} from "../convex/model/shadows";
import { getNote } from "../convex/presentation";
import {
	auditPendingShadowReferencesPage,
	auditStructuralShadowReferencesPage,
	backfillPendingShadowReferencesPage,
	backfillStructuralShadowReferencesPage,
} from "../convex/shadows";

type Row = Record<string, unknown> & { _id: string };

function nestedValue(row: Row, path: string): unknown {
	return path.split(".").reduce<unknown>((value, key) => {
		if (value === null || typeof value !== "object") return undefined;
		return (value as Record<string, unknown>)[key];
	}, row);
}

class ShadowDb {
	private tables = new Map<string, Map<string, Row>>();
	private nextId = 1;

	constructor(seed: Record<string, readonly Row[]> = {}) {
		for (const [table, rows] of Object.entries(seed)) {
			this.tables.set(
				table,
				new Map(rows.map((row) => [row._id, structuredClone(row)])),
			);
		}
	}

	rows(table: string): Row[] {
		return [...(this.tables.get(table)?.values() ?? [])].map((row) =>
			structuredClone(row),
		);
	}

	snapshot() {
		return Object.fromEntries(
			[...this.tables].map(([table, rows]) => [
				table,
				[...rows.values()].map((row) => structuredClone(row)),
			]),
		);
	}

	normalizeId(_table: string, value: string) {
		return /^[A-Za-z0-9_-]+$/.test(value) ? value : null;
	}

	async get(id: string): Promise<Row | null> {
		for (const rows of this.tables.values()) {
			const row = rows.get(id);
			if (row) return structuredClone(row);
		}
		return null;
	}

	query(table: string) {
		const conditions: Array<[string, unknown]> = [];
		const range = {
			eq(field: string, value: unknown) {
				conditions.push([field, value]);
				return range;
			},
		};
		const matches = () =>
			this.rows(table).filter((row) =>
				conditions.every(
					([field, value]) => nestedValue(row, field) === value,
				),
			);
		const terminal = {
			async first() {
				return matches()[0] ?? null;
			},
			async unique() {
				const rows = matches();
				if (rows.length > 1) throw new Error("Expected a unique row.");
				return rows[0] ?? null;
			},
			async take(limit: number) {
				return matches().slice(0, limit);
			},
			async paginate(options: {
				cursor: string | null;
				numItems: number;
			}) {
				const start = options.cursor ? Number(options.cursor) : 0;
				const rows = matches();
				const page = rows.slice(start, start + options.numItems);
				const next = start + page.length;
				return {
					page,
					continueCursor: String(next),
					isDone: next >= rows.length,
				};
			},
		};
		return {
			...terminal,
			withIndex(_name: string, build: (value: typeof range) => unknown) {
				build(range);
				return terminal;
			},
		};
	}

	async insert(table: string, value: Record<string, unknown>) {
		const id = `${table}_${this.nextId++}`;
		const rows = this.tables.get(table) ?? new Map<string, Row>();
		rows.set(id, { _id: id, ...structuredClone(value) });
		this.tables.set(table, rows);
		return id;
	}

	async patch(id: string, value: Record<string, unknown>) {
		for (const rows of this.tables.values()) {
			const row = rows.get(id);
			if (!row) continue;
			rows.set(id, { ...row, ...structuredClone(value) });
			return;
		}
		throw new Error(`Missing row ${id}.`);
	}

	async replace(id: string, value: Record<string, unknown>) {
		for (const rows of this.tables.values()) {
			if (!rows.has(id)) continue;
			rows.set(id, { _id: id, ...structuredClone(value) });
			return;
		}
		throw new Error(`Missing row ${id}.`);
	}

	async delete(id: string) {
		for (const rows of this.tables.values()) {
			if (rows.delete(id)) return;
		}
		throw new Error(`Missing row ${id}.`);
	}
}

function handler(value: unknown) {
	return (
		value as {
			_handler: (ctx: unknown, args: unknown) => Promise<unknown>;
		}
	)._handler;
}

const nounShadow = {
	language: "de",
	canonicalForm: " Bank ",
	family: "Lexeme",
	kind: "NOUN",
} as const;
const verbShadow = {
	language: "de",
	canonicalForm: "gehen",
	family: "Lexeme",
	kind: "VERB",
} as const;

function structuralKnowledge() {
	return {
		morphologicalTree: {
			root: {
				nodeKind: "structure",
				children: [
					{ nodeKind: "unitShadow", unitShadow: nounShadow },
					{
						nodeKind: "structure",
						children: [
							{ nodeKind: "unitShadow", unitShadow: nounShadow },
						],
					},
				],
			},
		},
		lexicalBreakdown: [nounShadow, nounShadow],
	};
}

function pendingRecord(
	sourceReadingKey = "reading-source",
	targetPendingId = "pending-1",
) {
	return {
		sourceReading: {},
		pending: { relation: "synonym", target: nounShadow },
		locator: {
			sourceReadingKey,
			relation: "synonym",
			targetPendingId,
		},
	};
}

describe("Shadow descriptor and storage seam", () => {
	test("normalizes stable descriptors and preserves every exact structural path", () => {
		expect(normalizeShadowDescriptor(nounShadow)).toEqual({
			...nounShadow,
			canonicalForm: "Bank",
		});
		expect(shadowKeyFor(nounShadow)).toBe('["de","Bank","Lexeme","NOUN"]');
		expect(() =>
			normalizeShadowDescriptor({ ...nounShadow, extra: true }),
		).toThrow("exactly language");
		expect(() =>
			normalizeShadowDescriptor({ ...nounShadow, kind: "VERBISH" }),
		).toThrow("not a supported Dumling Lemma route");
		expect(() =>
			normalizeShadowDescriptor({ ...nounShadow, language: " de " }),
		).toThrow("Unsupported Unit Shadow language");
		expect(
			normalizeShadowDescriptor({ ...nounShadow, family: " Lexeme " })
				.family,
		).toBe("Lexeme");
		expect(
			normalizeShadowDescriptor({ ...nounShadow, kind: " NOUN " }).kind,
		).toBe("NOUN");
		const stored = {
			_id: "shadow_realistic",
			_creationTime: 1,
			shadowKey: shadowKeyFor(nounShadow),
			...normalizeShadowDescriptor(nounShadow),
		};
		expect(descriptorFromStoredShadow(stored)).toEqual(
			normalizeShadowDescriptor(nounShadow),
		);
		expect(shadowIsCompatible(stored, nounShadow)).toBe(true);
		expect(() =>
			normalizeShadowDescriptor({
				...nounShadow,
				language: "he",
				family: "Phraseme",
				kind: "Collocation",
			}),
		).toThrow("not a supported Dumling Lemma route");
		expect(
			collectStructuralShadowReferences(structuralKnowledge()).map(
				({ aspect, path }) => `${aspect}:${path}`,
			),
		).toEqual([
			"morphologicalTree:root.children[0]",
			"morphologicalTree:root.children[1].children[0]",
			"lexicalBreakdown:[0]",
			"lexicalBreakdown:[1]",
		]);
	});

	test("atomically replaces structural projection, keeps dormant rows, and reuses the same Shadow ID", async () => {
		const db = new ShadowDb();
		const ctx = { db } as never;
		await replaceAccumulatedKnowledge(
			ctx,
			"reading-source",
			structuralKnowledge(),
		);
		expect(db.rows("structuralShadowReferences")).toHaveLength(4);
		expect(db.rows("shadows")).toHaveLength(1);
		const shadowId = db.rows("shadows")[0]?._id;
		const referenceIds = db
			.rows("structuralShadowReferences")
			.map(({ _id }) => _id);

		await replaceAccumulatedKnowledge(
			ctx,
			"reading-source",
			structuralKnowledge(),
		);
		expect(
			db.rows("structuralShadowReferences").map(({ _id }) => _id),
		).toEqual(referenceIds);

		await replaceAccumulatedKnowledge(ctx, "reading-source", undefined);
		expect(db.rows("structuralShadowReferences")).toEqual([]);
		expect(db.rows("shadows").map(({ _id }) => _id)).toEqual([shadowId]);

		await replaceAccumulatedKnowledge(ctx, "reading-source", {
			lexicalBreakdown: [nounShadow, verbShadow],
		});
		expect(
			db
				.rows("shadows")
				.find(({ shadowKey }) => shadowKey === shadowKeyFor(nounShadow))
				?._id,
		).toBe(shadowId);
	});

	test("rejects a malformed replacement before changing authoritative or projected state", async () => {
		const db = new ShadowDb();
		const ctx = { db } as never;
		await replaceAccumulatedKnowledge(ctx, "reading-source", {
			lexicalBreakdown: [nounShadow, verbShadow],
		});
		const before = db.snapshot();
		await expect(
			replaceAccumulatedKnowledge(ctx, "reading-source", {
				lexicalBreakdown: [nounShadow, { family: "Lexeme" }],
			}),
		).rejects.toThrow("exactly language");
		expect(db.snapshot()).toEqual(before);
	});
});

describe("Shadow backfills and presentation", () => {
	test("keeps shadowId optional while page-level backfills and audits are runnable", async () => {
		const schemaSource = await Bun.file(
			new URL("../convex/schema.ts", import.meta.url),
		).text();
		expect(schemaSource).toContain('shadowId: v.optional(v.id("shadows"))');
		for (const registered of [
			backfillPendingShadowReferencesPage,
			backfillStructuralShadowReferencesPage,
			auditPendingShadowReferencesPage,
			auditStructuralShadowReferencesPage,
		]) {
			expect(registered.exportArgs()).toContain("paginationOpts");
		}
	});

	test("backfills pending and structural references idempotently and audits them in bounded pages", async () => {
		const record = pendingRecord();
		const db = new ShadowDb({
			pendingSemanticRelations: [
				{
					_id: "pending_legacy",
					locatorKey: '["reading-source","synonym","pending-1"]',
					sourceReadingKey: "reading-source",
					targetCanonicalForm: " Bank ",
					record,
				},
			],
			accumulatedKnowledge: [
				{
					_id: "knowledge_legacy",
					ownerReadingKey: "reading-source",
					knowledge: structuralKnowledge(),
					updatedAt: 1,
				},
			],
		});
		const paginationOpts = { cursor: null, numItems: 50 };
		const structuralPaginationOpts = { cursor: null, numItems: 8 };
		await expect(
			handler(backfillStructuralShadowReferencesPage)(
				{ db },
				{ paginationOpts: { cursor: null, numItems: 9 } },
			),
		).rejects.toThrow("at most 8 Reading owners");
		expect(
			await handler(backfillPendingShadowReferencesPage)(
				{ db },
				{ paginationOpts },
			),
		).toMatchObject({ changed: 1, malformed: 0 });
		expect(
			await handler(backfillStructuralShadowReferencesPage)(
				{ db },
				{ paginationOpts: structuralPaginationOpts },
			),
		).toMatchObject({ changed: 1, malformed: 0 });
		expect(db.rows("shadows")).toHaveLength(1);
		expect(db.rows("structuralShadowReferences")).toHaveLength(4);

		expect(
			await handler(backfillPendingShadowReferencesPage)(
				{ db },
				{ paginationOpts },
			),
		).toMatchObject({ changed: 0 });
		expect(
			await handler(backfillStructuralShadowReferencesPage)(
				{ db },
				{ paginationOpts: structuralPaginationOpts },
			),
		).toMatchObject({ changed: 0 });
		expect(
			await handler(auditPendingShadowReferencesPage)(
				{ db },
				{ paginationOpts },
			),
		).toMatchObject({ valid: 1, missing: 0, mismatched: 0, malformed: 0 });
		expect(
			await handler(auditStructuralShadowReferencesPage)(
				{ db },
				{ paginationOpts },
			),
		).toMatchObject({ valid: 4, missing: 0, mismatched: 0, malformed: 0 });
		const shadow = db.rows("shadows")[0];
		if (!shadow) throw new Error("Expected a Shadow row.");
		await db.patch(shadow._id, { kind: "VERB" });
		expect(
			await handler(auditPendingShadowReferencesPage)(
				{ db },
				{ paginationOpts },
			),
		).toMatchObject({ valid: 0, mismatched: 1 });
		expect(
			await handler(auditStructuralShadowReferencesPage)(
				{ db },
				{ paginationOpts },
			),
		).toMatchObject({ valid: 0, mismatched: 4 });
	});

	test("groups exact pending and structural references by referring Unit Reading Note and hides dormancy", async () => {
		const db = new ShadowDb({
			lemmas: [
				{
					_id: "lemma_source",
					lemmaKey: "lemma-key",
					language: "de",
					family: "Lexeme",
					kind: "VERB",
					canonicalForm: "laufen",
					coreFeatures: {},
				},
			],
			readings: [
				{
					_id: "reading_source",
					readingKey: "reading-source",
					lemmaId: "lemma_source",
					emojiDescription: "🏃",
				},
			],
		});
		const ctx = { db } as never;
		await replaceAccumulatedKnowledge(ctx, "reading-source", {
			lexicalBreakdown: [nounShadow, nounShadow],
		});
		const record = pendingRecord();
		const shadowId = await attachPendingShadowReference(ctx, record);
		await db.insert("pendingSemanticRelations", {
			locatorKey: '["reading-source","synonym","pending-1"]',
			sourceReadingKey: "reading-source",
			targetCanonicalForm: "Bank",
			shadowId,
			record,
		});

		const note = (await handler(getNote)(
			{ db },
			{ target: { kind: "ShadowNote", shadowId } },
		)) as Record<string, unknown> & {
			references: {
				continueCursor: string;
				page: Array<{
					pendingRelations: unknown[];
					structuralReferences: unknown[];
				}>;
			};
		};
		expect(note.kind).toBe("ShadowNote");
		expect(note.references.page).toHaveLength(1);
		expect(note.references.page[0]?.pendingRelations).toHaveLength(1);
		expect(note.references.page[0]?.structuralReferences).toHaveLength(0);
		const structuralPage = (await handler(getNote)(
			{ db },
			{
				target: { kind: "ShadowNote", shadowId },
				contextCursor: note.references.continueCursor,
			},
		)) as typeof note;
		expect(
			structuralPage.references.page[0]?.structuralReferences,
		).toHaveLength(2);

		for (const row of db.rows("pendingSemanticRelations")) {
			await db.delete(row._id);
		}
		await replaceAccumulatedKnowledge(ctx, "reading-source", undefined);
		expect(
			await handler(getNote)(
				{ db },
				{ target: { kind: "ShadowNote", shadowId } },
			),
		).toBeNull();
		expect(db.rows("shadows").some(({ _id }) => _id === shadowId)).toBe(
			true,
		);
	});

	test("pages every admitted incoming reference through indexed Shadow lookups", async () => {
		const db = new ShadowDb({
			lemmas: [
				{
					_id: "lemma_source",
					lemmaKey: "lemma-key",
					language: "de",
					family: "Lexeme",
					kind: "VERB",
					canonicalForm: "laufen",
					coreFeatures: {},
				},
			],
			readings: [
				{
					_id: "reading_source",
					readingKey: "reading-source",
					lemmaId: "lemma_source",
					emojiDescription: "🏃",
				},
			],
		});
		const ctx = { db } as never;
		const shadowId = await attachPendingShadowReference(
			ctx,
			pendingRecord(),
		);
		for (let index = 0; index < 51; index += 1) {
			const targetPendingId = `pending-${index}`;
			await db.insert("pendingSemanticRelations", {
				locatorKey: JSON.stringify([
					"reading-source",
					"synonym",
					targetPendingId,
				]),
				sourceReadingKey: "reading-source",
				targetCanonicalForm: "Bank",
				shadowId,
				record: pendingRecord("reading-source", targetPendingId),
			});
		}
		const first = (await handler(getNote)(
			{ db },
			{ target: { kind: "ShadowNote", shadowId } },
		)) as {
			references: {
				page: Array<{ pendingRelations: unknown[] }>;
				continueCursor: string;
				isDone: boolean;
			};
		};
		expect(first.references.page[0]?.pendingRelations).toHaveLength(50);
		expect(first.references.isDone).toBe(false);
		const second = (await handler(getNote)(
			{ db },
			{
				target: { kind: "ShadowNote", shadowId },
				contextCursor: first.references.continueCursor,
			},
		)) as typeof first;
		expect(second.references.page[0]?.pendingRelations).toHaveLength(1);
		expect(second.references.isDone).toBe(true);
	});

	test("inspects zero, one, or many dictionary-backed candidates by the exact normalized descriptor", async () => {
		const lemmaRows = [
			["candidate-1", "de", "Bank", "Lexeme", "NOUN", "🏦"],
			["candidate-2", "de", "Bank", "Lexeme", "NOUN", "🏦"],
			["wrong-language", "en", "Bank", "Lexeme", "NOUN", "🇬🇧"],
			["wrong-form", "de", "Banken", "Lexeme", "NOUN", "🏦"],
			["wrong-family", "de", "Bank", "Phraseme", "NOUN", "🧩"],
			["wrong-kind", "de", "Bank", "Lexeme", "VERB", "🏦"],
		] as const;
		const db = new ShadowDb({
			dictionaryState: [{ _id: "state", key: "global", revision: 7 }],
			lemmas: [
				{
					_id: "lemma-source",
					lemmaKey: "source",
					language: "de",
					canonicalForm: "laufen",
					family: "Lexeme",
					kind: "VERB",
					coreFeatures: {},
				},
				...lemmaRows.map(
					([id, language, canonicalForm, family, kind]) => ({
						_id: `lemma-${id}`,
						lemmaKey: id,
						language,
						canonicalForm,
						family,
						kind,
						coreFeatures: id.startsWith("candidate-")
							? { sense: id }
							: {},
					}),
				),
			],
			readings: [
				{
					_id: "reading-source",
					readingKey: "reading-source",
					lemmaId: "lemma-source",
					emojiDescription: "🏃",
				},
				...lemmaRows.map(([id, , , , , emoji]) => ({
					_id: `reading-${id}`,
					readingKey: id,
					lemmaId: `lemma-${id}`,
					emojiDescription: emoji,
				})),
			],
			readingEntries: lemmaRows.map(([id]) => ({
				_id: `entry-${id}`,
				readingId: `reading-${id}`,
				record: {},
			})),
			dictionaryLemmas: lemmaRows.map(([id]) => ({
				_id: `dictionary-${id}`,
				lemmaId: `lemma-${id}`,
			})),
		});
		const ctx = { db } as never;
		const record = pendingRecord();
		const shadowId = await attachPendingShadowReference(ctx, record);
		await db.insert("pendingSemanticRelations", {
			locatorKey: '["reading-source","synonym","pending-1"]',
			sourceReadingKey: "reading-source",
			targetCanonicalForm: "Bank",
			shadowId,
			record,
		});

		const note = (await handler(getNote)(
			{ db },
			{ target: { kind: "ShadowNote", shadowId } },
		)) as {
			inspection: {
				revision: string;
				candidates: Array<{
					lemmaId: string;
					coreFeatures: Array<{ name: string; value: string }>;
				}>;
			};
		};
		expect(note.inspection.revision).toBe("convex-7");
		expect(
			note.inspection.candidates.map(({ lemmaId }) => lemmaId),
		).toEqual(["lemma-candidate-1", "lemma-candidate-2"]);
		expect(
			note.inspection.candidates.map(({ coreFeatures }) => coreFeatures),
		).toEqual([
			[{ name: "sense", value: "candidate-1" }],
			[{ name: "sense", value: "candidate-2" }],
		]);

		await db.delete("dictionary-candidate-2");
		const one = (await handler(getNote)(
			{ db },
			{ target: { kind: "ShadowNote", shadowId } },
		)) as typeof note;
		expect(one.inspection.candidates).toHaveLength(1);
		await db.delete("dictionary-candidate-1");
		const zero = (await handler(getNote)(
			{ db },
			{ target: { kind: "ShadowNote", shadowId } },
		)) as typeof note;
		expect(zero.inspection.candidates).toEqual([]);
	});

	test("never projects unsupported Construction Readings as Unit Reading candidates", async () => {
		const construction = {
			language: "de",
			canonicalForm: "je … desto",
			family: "Construction",
			kind: "Fusion",
		};
		const db = new ShadowDb({
			lemmas: [
				{
					_id: "lemma-source",
					lemmaKey: "source",
					language: "de",
					canonicalForm: "laufen",
					family: "Lexeme",
					kind: "VERB",
					coreFeatures: {},
				},
				{
					_id: "lemma-construction",
					lemmaKey: "construction",
					...construction,
					coreFeatures: {},
				},
			],
			readings: [
				{
					_id: "reading-source",
					readingKey: "reading-source",
					lemmaId: "lemma-source",
					emojiDescription: "🏃",
				},
				{
					_id: "reading-construction",
					readingKey: "reading-construction",
					lemmaId: "lemma-construction",
					emojiDescription: "🧱",
				},
			],
			readingEntries: [
				{
					_id: "entry-construction",
					readingId: "reading-construction",
					record: {},
				},
			],
		});
		const record = {
			...pendingRecord(),
			pending: { relation: "synonym", target: construction },
		};
		const ctx = { db } as never;
		const shadowId = await attachPendingShadowReference(ctx, record);
		await db.insert("pendingSemanticRelations", {
			locatorKey: '["reading-source","synonym","pending-1"]',
			sourceReadingKey: "reading-source",
			targetCanonicalForm: construction.canonicalForm,
			shadowId,
			record,
		});
		const note = (await handler(getNote)(
			{ db },
			{ target: { kind: "ShadowNote", shadowId } },
		)) as { inspection: { candidates: unknown[] } };
		expect(note.inspection.candidates).toEqual([]);
	});
});

describe("Shadow reset lifecycle", () => {
	async function lifecycleDb() {
		const db = new ShadowDb();
		const ctx = { db } as never;
		await replaceAccumulatedKnowledge(ctx, "reading-doomed", {
			lexicalBreakdown: [nounShadow, nounShadow],
		});
		await replaceAccumulatedKnowledge(ctx, "reading-survivor", {
			lexicalBreakdown: [nounShadow, nounShadow],
		});
		const pending = pendingRecord("reading-doomed");
		const activeShadowId = await attachPendingShadowReference(ctx, pending);
		await db.insert("pendingSemanticRelations", {
			locatorKey: '["reading-doomed","synonym","pending-1"]',
			sourceReadingKey: "reading-doomed",
			targetCanonicalForm: "Bank",
			shadowId: activeShadowId,
			record: pending,
		});
		const dormantShadowId = await attachPendingShadowReference(ctx, {
			...pending,
			pending: { relation: "synonym", target: verbShadow },
		});
		return { db, activeShadowId, dormantShadowId };
	}

	test("analysis stripping removes doomed references, preserves survivor activity, and visitor reset leaves Shadows", async () => {
		const { db, activeShadowId, dormantShadowId } = await lifecycleDb();
		await handler(clearReadingDataBatch)(
			{ db },
			{ readingKeys: ["reading-doomed"] },
		);
		expect(db.rows("pendingSemanticRelations")).toEqual([]);
		expect(
			db
				.rows("structuralShadowReferences")
				.every(
					({ ownerReadingKey }) =>
						ownerReadingKey === "reading-survivor",
				),
		).toBe(true);
		expect(
			db
				.rows("structuralShadowReferences")
				.some(({ shadowId }) => shadowId === activeShadowId),
		).toBe(true);
		expect(
			db
				.rows("shadows")
				.map(({ _id }) => _id)
				.sort(),
		).toEqual([activeShadowId, dormantShadowId].sort());

		await handler(clearVisitorDataBatch)(
			{ db },
			{ visitorId: "visitor-1" },
		);
		expect(
			db
				.rows("shadows")
				.map(({ _id }) => _id)
				.sort(),
		).toEqual([activeShadowId, dormantShadowId].sort());
	});

	for (const [name, reset] of [
		["shared reset", clearSharedDataBatch],
		["full reset", resetDemoDataBatch],
	] as const) {
		test(`${name} removes active and dormant Shadow rows`, async () => {
			const { db } = await lifecycleDb();
			await handler(reset)({ db }, {});
			expect(db.rows("pendingSemanticRelations")).toEqual([]);
			expect(db.rows("structuralShadowReferences")).toEqual([]);
			expect(db.rows("shadows")).toEqual([]);
		});
	}
});

test("Reading deletion removes outgoing edges and preserves incoming edges until the target Lemma dies", async () => {
	const db = new ShadowDb({
		lemmas: [
			{
				_id: "lemma-doomed",
				lemmaKey: "doomed",
				language: "de",
				family: "Lexeme",
				kind: "NOUN",
				canonicalForm: "Ziel",
				coreFeatures: {},
			},
			{
				_id: "lemma-survivor",
				lemmaKey: "survivor",
				language: "de",
				family: "Lexeme",
				kind: "NOUN",
				canonicalForm: "Quelle",
				coreFeatures: {},
			},
		],
		dictionaryLemmas: [
			{ _id: "dictionary-doomed", lemmaId: "lemma-doomed" },
			{ _id: "dictionary-survivor", lemmaId: "lemma-survivor" },
		],
		readings: [
			{
				_id: "reading-doomed-id",
				readingKey: "reading-doomed",
				lemmaId: "lemma-doomed",
				emojiDescription: "🎯",
			},
			{
				_id: "reading-survivor-id",
				readingKey: "reading-survivor",
				lemmaId: "lemma-survivor",
				emojiDescription: "➡️",
			},
		],
		readingEntries: [
			{ _id: "entry-doomed", readingId: "reading-doomed-id", record: {} },
			{
				_id: "entry-survivor",
				readingId: "reading-survivor-id",
				record: {},
			},
		],
		semanticRelationEdges: [
			{
				_id: "edge-outgoing",
				sourceReadingId: "reading-doomed-id",
				relation: "hypernym",
				targetLemmaId: "lemma-survivor",
			},
			{
				_id: "edge-incoming",
				sourceReadingId: "reading-survivor-id",
				relation: "hyponym",
				targetLemmaId: "lemma-doomed",
			},
		],
	});
	for (let attempt = 0; attempt < 3; attempt += 1) {
		await handler(clearReadingDataBatch)(
			{ db },
			{ readingKeys: ["reading-doomed"] },
		);
	}
	expect(db.rows("semanticRelationEdges").map(({ _id }) => _id)).toEqual([
		"edge-incoming",
	]);
	expect(db.rows("readings").map(({ _id }) => _id)).not.toContain(
		"reading-doomed-id",
	);

	await handler(clearLemmaDataBatch)({ db }, { lemmaIds: ["lemma-doomed"] });
	expect(db.rows("semanticRelationEdges")).toEqual([]);
	await handler(clearLemmaDataBatch)({ db }, { lemmaIds: ["lemma-doomed"] });
	expect(db.rows("lemmas").map(({ _id }) => _id)).not.toContain(
		"lemma-doomed",
	);
});
