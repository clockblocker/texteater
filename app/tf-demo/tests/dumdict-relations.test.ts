import { describe, expect, test } from "bun:test";
import { getFunctionName } from "convex/server";
import {
	createDumdictService,
	type DumdictPlan,
	type DumdictStoragePort,
	makeSurfaceId,
	type StoreRevision,
} from "dumdict";
import type { Dumgen } from "dumgen";
import { readingFingerprint } from "dumling";

import { createConvexDumdictStorage } from "../convex/dumdictActionStorage";
import {
	commitDumdictChanges,
	loadDumdictCleanupRelationsContext,
	loadDumdictReadingEntryContext,
	loadDumdictReadingForPatch,
} from "../convex/dumdictStorage";
import { createDumdictTransaction } from "../convex/dumdictTransaction";
import { loadRelationProjections } from "../convex/modules/notes/relations";
import { lemmaIdentityKey } from "../server/linguisticIdentity";
import {
	createTfDemoOrchestrator,
	type OrchestrationPersistence,
} from "../server/linguisticOrchestration";
import { createTestConvexDumdictStorage } from "./support/dumdict-storage";

type Row = Record<string, unknown> & { _id: string };

function nestedValue(row: Row, path: string): unknown {
	return path.split(".").reduce<unknown>((value, key) => {
		if (value === null || typeof value !== "object") return undefined;
		return (value as Record<string, unknown>)[key];
	}, row);
}

class IndexedDb {
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

	fork(): IndexedDb {
		const copy = new IndexedDb(this.snapshot());
		copy.nextId = this.nextId;
		return copy;
	}

	adopt(committed: IndexedDb): void {
		this.tables = committed.tables;
		this.nextId = committed.nextId;
	}

	snapshot(): Record<string, Row[]> {
		return Object.fromEntries(
			[...this.tables].map(([table, rows]) => [
				table,
				[...rows.values()].map((row) => structuredClone(row)),
			]),
		);
	}

	rows(table: string): Row[] {
		return [...(this.tables.get(table)?.values() ?? [])];
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
		return {
			async take(limit: number) {
				return matches().slice(0, limit);
			},
			withIndex(_name: string, build: (value: typeof range) => unknown) {
				build(range);
				return {
					async unique() {
						const rows = matches();
						if (rows.length > 1)
							throw new Error("Expected a unique row.");
						return rows[0] ?? null;
					},
					async take(limit: number) {
						return matches().slice(0, limit);
					},
				};
			},
		};
	}

	async insert(
		table: string,
		value: Record<string, unknown>,
	): Promise<string> {
		const id = `${table}-${this.nextId++}`;
		const rows = this.tables.get(table) ?? new Map<string, Row>();
		rows.set(id, { _id: id, ...structuredClone(value) });
		this.tables.set(table, rows);
		return id;
	}

	async patch(id: string, value: Record<string, unknown>): Promise<void> {
		for (const rows of this.tables.values()) {
			const row = rows.get(id);
			if (!row) continue;
			rows.set(id, { ...row, ...structuredClone(value) });
			return;
		}
		throw new Error(`Cannot patch missing row ${id}.`);
	}

	async replace(id: string, value: Record<string, unknown>): Promise<void> {
		for (const rows of this.tables.values()) {
			if (!rows.has(id)) continue;
			rows.set(id, { _id: id, ...structuredClone(value) });
			return;
		}
		throw new Error(`Cannot replace missing row ${id}.`);
	}

	async delete(id: string): Promise<void> {
		for (const rows of this.tables.values()) {
			if (rows.delete(id)) return;
		}
		throw new Error(`Cannot delete missing row ${id}.`);
	}
}

function registeredHandler(value: unknown) {
	return (
		value as {
			_handler: (ctx: unknown, args: unknown) => Promise<unknown>;
		}
	)._handler;
}

async function runQuery(db: IndexedDb, fn: unknown, args: unknown) {
	return registeredHandler(fn)({ db }, args);
}

async function runReadingEntryContextQuery(db: IndexedDb, request: unknown) {
	return runQuery(db, loadDumdictReadingEntryContext, { request });
}

async function runMutation(db: IndexedDb, fn: unknown, args: unknown) {
	const draft = db.fork();
	const result = await registeredHandler(fn)({ db: draft }, args);
	db.adopt(draft);
	return result;
}

const verbFeatures = {
	verbType: null,
	lexicallyReflexive: null,
	hasSepPrefix: null,
	hasGovPrep: null,
} as const;

const gehenLemma = {
	language: "de",
	family: "Lexeme",
	kind: "VERB",
	canonicalForm: "gehen",
	coreFeatures: verbFeatures,
} as const;
const laufenLemma = { ...gehenLemma, canonicalForm: "laufen" } as const;
const springenLemma = { ...gehenLemma, canonicalForm: "springen" } as const;
const gehenReading = { lemma: gehenLemma, emojiDescription: "🚶" } as const;
const laufenReading = { lemma: laufenLemma, emojiDescription: "🏃" } as const;
const springenReading = {
	lemma: springenLemma,
	emojiDescription: "🦘",
} as const;
const note = {
	attestedTranslations: [],
	attestations: [],
	notes: "",
};

function surface(normalizedSurface: string) {
	return {
		language: "de" as const,
		normalizedSurface,
		spelling: "Canonical" as const,
		surfaceKind: "Citation" as const,
		surfaceFeatures: null,
		lemma: gehenLemma,
	};
}

function initialSeed(): Record<string, readonly Row[]> {
	const citation = surface("gehen");
	const variant = surface("ging");
	return {
		lemmas: [
			{
				_id: "lemma-gehen",
				lemmaKey: lemmaIdentityKey(gehenLemma),
				...gehenLemma,
			},
		],
		dictionaryLemmas: [
			{ _id: "dictionary-lemma-gehen", lemmaId: "lemma-gehen" },
		],
		readings: [
			{
				_id: "reading-gehen",
				readingKey: readingFingerprint(gehenReading),
				lemmaId: "lemma-gehen",
				emojiDescription: gehenReading.emojiDescription,
			},
		],
		readingEntries: [
			{
				_id: "reading-entry-gehen",
				readingId: "reading-gehen",
				record: note,
			},
		],
		surfaces: [
			{
				_id: "surface-gehen",
				surfaceKey: makeSurfaceId("de", citation),
				lemmaId: "lemma-gehen",
				...citation,
			},
			{
				_id: "surface-ging",
				surfaceKey: makeSurfaceId("de", variant),
				lemmaId: "lemma-gehen",
				...variant,
			},
		],
		ownedSurfaces: [
			{
				_id: "owned-surface-gehen",
				surfaceId: "surface-gehen",
				record: note,
			},
			{
				_id: "owned-surface-ging",
				surfaceId: "surface-ging",
				record: note,
			},
		],
	};
}

function locatorKey(locator: {
	sourceReadingKey: string;
	relation: string;
	targetPendingId: string;
}): string {
	return JSON.stringify([
		locator.sourceReadingKey,
		locator.relation,
		locator.targetPendingId,
	]);
}

function storageFor(db: IndexedDb): DumdictStoragePort<"de"> {
	return createTestConvexDumdictStorage({
		runQuery: (implementation, args) => runQuery(db, implementation, args),
		runMutation: (implementation, args) =>
			runMutation(db, implementation, args),
	});
}

function transactionFor(db: IndexedDb) {
	return createDumdictTransaction({ db } as never);
}

function readingKnowledge(db: IndexedDb, key: string) {
	const accumulated = db
		.rows("accumulatedKnowledge")
		.find((row) => row.ownerReadingKey === key)?.knowledge as
		| Record<string, unknown>
		| undefined;
	const reading = db.rows("readings").find((row) => row.readingKey === key);
	if (!reading) return accumulated;
	const semanticRelations: Record<string, unknown[]> = {};
	for (const edge of db
		.rows("semanticRelationEdges")
		.filter((row) => row.sourceReadingId === reading._id)) {
		if (typeof edge.relation !== "string") continue;
		const lemma = db
			.rows("lemmas")
			.find((row) => row._id === edge.targetLemmaId);
		if (!lemma) continue;
		const targets = semanticRelations[edge.relation] ?? [];
		targets.push({
			language: lemma.language,
			family: lemma.family,
			kind: lemma.kind,
			canonicalForm: lemma.canonicalForm,
			coreFeatures: lemma.coreFeatures,
		});
		semanticRelations[edge.relation] = targets;
	}
	return {
		...(accumulated ?? {}),
		...(Object.keys(semanticRelations).length > 0
			? { semanticRelations }
			: {}),
	};
}

describe("tf-demo Dumdict relation storage", () => {
	test("rejects over-budget and duplicate-heavy slices before planning while admitting the exact transaction boundary", async () => {
		const db = new IndexedDb(initialSeed());
		const newNoteArgs = {
			intent: "addNewNote" as const,
			lemmaKey: lemmaIdentityKey(gehenLemma),
			proposedLemma: gehenLemma,
			readingKey: readingFingerprint(gehenReading),
			surfaceKeys: Array.from(
				{ length: 16 },
				(_, index) => `surface-${index}`,
			),
			explicitLemmaTargetKeys: Array.from(
				{ length: 16 },
				(_, index) => `reading-${index}`,
			),
			pendingLocatorKeys: Array.from(
				{ length: 16 },
				(_, index) => `pending-${index}`,
			),
		};
		await expect(
			runReadingEntryContextQuery(db, newNoteArgs),
		).resolves.toMatchObject({ revision: "convex-0" });
		await expect(
			runReadingEntryContextQuery(db, {
				...newNoteArgs,
				pendingLocatorKeys: [
					...newNoteArgs.pendingLocatorKeys,
					"overflow",
				],
			}),
		).rejects.toThrow(
			"New-note context can produce at most 50 planned changes",
		);
		await expect(
			runReadingEntryContextQuery(db, {
				intent: "addNewNote",
				lemmaKey: lemmaIdentityKey(gehenLemma),
				proposedLemma: gehenLemma,
				readingKey: readingFingerprint(gehenReading),
				surfaceKeys: [],
				explicitLemmaTargetKeys: Array.from({ length: 49 }, () =>
					lemmaIdentityKey(gehenLemma),
				),
				pendingLocatorKeys: [],
			}),
		).rejects.toThrow(
			"New-note context can produce at most 50 planned changes",
		);

		await expect(
			runQuery(db, loadDumdictCleanupRelationsContext, {
				locatorKeys: Array.from(
					{ length: 16 },
					(_, index) => `locator-${index}`,
				),
			}),
		).resolves.toMatchObject({ revision: "convex-0" });
		await expect(
			runQuery(db, loadDumdictCleanupRelationsContext, {
				locatorKeys: Array.from(
					{ length: 51 },
					(_, index) => `locator-${index}`,
				),
			}),
		).rejects.toThrow(
			"Relations-cleanup context can produce at most 50 planned changes",
		);

		const boundaryDb = new IndexedDb(initialSeed());
		const boundaryDict = createDumdictService({
			language: "de",
			storage: storageFor(boundaryDb),
		});
		const duplicateDirectRelation = {
			relation: "nearSynonym" as const,
			target: { kind: "existing" as const, lemma: gehenLemma },
		};
		expect(
			await boundaryDict.addNewNote({
				draft: {
					reading: laufenReading,
					note,
					relations: Array.from(
						{ length: 48 },
						() => duplicateDirectRelation,
					),
				},
			}),
		).toMatchObject({ status: "applied", nextRevision: "convex-1" });
		expect(boundaryDb.rows("dictionaryState")[0]?.revision).toBe(1);
		expect(
			readingKnowledge(boundaryDb, readingFingerprint(gehenReading))
				?.semanticRelations?.nearSynonym,
		).toBeUndefined();
	});

	test("loads every requested owned Surface and explicit existing Lemma target", async () => {
		const db = new IndexedDb(initialSeed());
		const result = (await runReadingEntryContextQuery(db, {
			intent: "addNewNote",
			lemmaKey: lemmaIdentityKey(gehenLemma),
			proposedLemma: gehenLemma,
			readingKey: readingFingerprint({
				lemma: gehenLemma,
				emojiDescription: "🥾",
			}),
			surfaceKeys: [
				makeSurfaceId("de", surface("gehen")),
				makeSurfaceId("de", surface("ging")),
			],
			explicitLemmaTargetKeys: [lemmaIdentityKey(gehenLemma)],
			pendingLocatorKeys: [],
		})) as {
			existingOwnedSurfaces: unknown[];
			explicitExistingLemmaTargets: unknown[];
		};

		expect(result.existingOwnedSurfaces).toHaveLength(2);
		expect(result.explicitExistingLemmaTargets).toEqual([
			{ lemma: gehenLemma },
		]);
	});

	test("loads every Reading Entry intent through one discriminated Convex query", async () => {
		const db = new IndexedDb(initialSeed());
		const queryInputs: unknown[] = [];
		const storage = createConvexDumdictStorage({
			async runQuery(reference: unknown, args: unknown) {
				expect(getFunctionName(reference as never)).toBe(
					"dumdictStorage:loadDumdictReadingEntryContext",
				);
				queryInputs.push(args);
				return runQuery(db, loadDumdictReadingEntryContext, args);
			},
			async runMutation() {
				throw new Error("Unexpected Convex mutation.");
			},
		} as never);

		const contexts = await Promise.all([
			storage.loadReadingEntryContext({
				intent: "addNewNote",
				reading: laufenReading,
				ownedSurfaces: [],
				relations: [],
			}),
			storage.loadReadingEntryContext({
				intent: "applyGeneratedKnowledge",
				reading: gehenReading,
				pendingRelations: [],
			}),
			storage.loadReadingEntryContext({
				intent: "ensureOwnedSurface",
				reading: gehenReading,
				surface: surface("gehen"),
			}),
			storage.loadReadingEntryContext({
				intent: "ensureReadingEntry",
				reading: gehenReading,
			}),
		]);

		expect(queryInputs).toHaveLength(4);
		expect(
			contexts.map(({ intent, revision }) => ({ intent, revision })),
		).toEqual([
			{ intent: "addNewNote", revision: "convex-0" },
			{
				intent: "applyGeneratedKnowledge",
				revision: "convex-0",
			},
			{ intent: "ensureOwnedSurface", revision: "convex-0" },
			{ intent: "ensureReadingEntry", revision: "convex-0" },
		]);
		expect(contexts[2]).not.toHaveProperty("relationLemmas");
		expect(contexts[3]).not.toHaveProperty("relationReadings");
		expect(contexts[1]).toHaveProperty("relationLemmas");
	});

	test("authors only direct Knowledge, deduplicates pending proposals, and survives a repeated encounter", async () => {
		const db = new IndexedDb(initialSeed());
		const dict = createDumdictService({
			language: "de",
			storage: storageFor(db),
		});

		expect(
			await dict.addNewNote({
				draft: {
					reading: laufenReading,
					note,
					relations: [
						{
							relation: "nearSynonym",
							target: { kind: "existing", lemma: gehenLemma },
						},
					],
				},
			}),
		).toMatchObject({ status: "applied" });
		expect(
			readingKnowledge(db, readingFingerprint(laufenReading))
				?.semanticRelations?.nearSynonym,
		).toEqual([gehenLemma]);
		expect(
			readingKnowledge(db, readingFingerprint(gehenReading))
				?.semanticRelations?.nearSynonym,
		).toBeUndefined();
		const gehenReadingId = db
			.rows("readings")
			.find(
				(row) => row.readingKey === readingFingerprint(gehenReading),
			)?._id;
		if (!gehenReadingId) throw new Error("Expected gehen Reading.");
		expect(
			await loadRelationProjections(
				{ db } as never,
				gehenReadingId as never,
			),
		).toMatchObject({
			fingerprints: [
				{
					relation: "nearSynonym",
					targetCanonicalForm: "laufen",
					provenance: "inferred",
				},
			],
		});
		expect(
			db
				.rows("accumulatedKnowledge")
				.filter(({ ownerReadingKey }) =>
					[
						readingFingerprint(laufenReading),
						readingFingerprint(gehenReading),
					].includes(String(ownerReadingKey)),
				)
				.map(({ ownerReadingKey, status }) => ({
					ownerReadingKey,
					status,
				})),
		).toEqual(
			expect.arrayContaining([
				{
					ownerReadingKey: readingFingerprint(laufenReading),
					status: "Partial",
				},
			]),
		);

		const pending = {
			target: {
				kind: "pending" as const,
				pending: {
					relation: "nearSynonym" as const,
					target: {
						language: "de" as const,
						canonicalForm: "flitzen",
						family: "Lexeme" as const,
						kind: "VERB" as const,
					},
				},
			},
		};
		expect(
			await dict.addNewNote({
				draft: {
					reading: springenReading,
					note,
					relations: [pending, pending],
				},
			}),
		).toMatchObject({ status: "applied" });
		expect(db.rows("pendingSemanticRelations")).toHaveLength(1);
		expect(
			db
				.rows("accumulatedKnowledge")
				.find(
					({ ownerReadingKey }) =>
						ownerReadingKey === readingFingerprint(springenReading),
				),
		).toMatchObject({ status: "Partial", knowledge: {} });
		expect(
			await dict.addNewNote({
				draft: {
					reading: springenReading,
					note,
					relations: [pending],
				},
			}),
		).toMatchObject({ status: "rejected", code: "readingAlreadyExists" });
		expect(db.rows("pendingSemanticRelations")).toHaveLength(1);
		expect(db.rows("dictionaryState")[0]?.revision).toBe(2);
	});

	test("persists exact Reading targets and navigates to the target Reading Note", async () => {
		const db = new IndexedDb(initialSeed());
		const dict = createDumdictService({
			language: "de",
			storage: storageFor(db),
		});
		expect(
			await dict.addNewNote({
				draft: { reading: laufenReading, note },
			}),
		).toMatchObject({ status: "applied" });
		expect(
			await transactionFor(db).commit({
				baseRevision: "convex-1" as StoreRevision,
				changes: [
					{
						type: "patchReading",
						reading: laufenReading,
						ops: [
							{
								kind: "applyKnowledgeChange",
								envelope: {
									reading: laufenReading,
									change: {
										kind: "Contribute",
										aspect: "semanticRelations",
										relation: "synonym",
										targetKind: "reading",
										value: [gehenReading],
									},
								},
							},
						],
						preconditions: [
							{
								kind: "revisionMatches",
								revision: "convex-1" as StoreRevision,
							},
							{
								kind: "readingExists",
								reading: laufenReading,
							},
						],
					},
				],
			} satisfies DumdictPlan<"de">),
		).toMatchObject({ status: "committed" });

		const source = db
			.rows("readings")
			.find(
				(row) => row.readingKey === readingFingerprint(laufenReading),
			);
		const target = db
			.rows("readings")
			.find((row) => row.readingKey === readingFingerprint(gehenReading));
		if (!source || !target) throw new Error("Expected exact Reading rows.");
		expect(db.rows("semanticRelationEdges")).toContainEqual(
			expect.objectContaining({
				sourceReadingId: source._id,
				targetKind: "reading",
				targetReadingId: target._id,
				relation: "synonym",
			}),
		);
		expect(
			await runQuery(db, loadDumdictReadingForPatch, {
				readingKey: readingFingerprint(laufenReading),
			}),
		).toMatchObject({
			reading: {
				knowledge: {
					semanticRelations: {
						targetKind: "reading",
						synonym: [gehenReading],
					},
				},
			},
		});
		expect(
			await loadRelationProjections({ db } as never, source._id as never),
		).toMatchObject({
			resolved: [
				{
					relation: "synonym",
					target: {
						kind: "UnitReadingNote",
						readingId: target._id,
					},
				},
			],
		});
	});

	test("applies graph-wide direct target conflicts atomically at the Convex seam", async () => {
		const db = new IndexedDb(initialSeed());
		const dict = createDumdictService({
			language: "de",
			storage: storageFor(db),
		});
		await dict.addNewNote({
			draft: {
				reading: laufenReading,
				note,
				relations: [
					{
						relation: "nearSynonym",
						target: { kind: "existing", lemma: gehenLemma },
					},
				],
			},
		});
		expect(
			await dict.applyGeneratedKnowledge({
				reading: laufenReading,
				changes: [],
				pendingRelations: [
					{
						relation: "synonym",
						target: {
							language: "de",
							canonicalForm: "gehen",
							family: "Lexeme",
							kind: "VERB",
						},
					},
				],
			}),
		).toMatchObject({ status: "applied" });
		const sourceId = db
			.rows("readings")
			.find(
				(row) => row.readingKey === readingFingerprint(laufenReading),
			)?._id;
		expect(
			db
				.rows("semanticRelationEdges")
				.filter((edge) => edge.sourceReadingId === sourceId)
				.map(({ relation }) => relation),
		).toEqual(["synonym"]);

		expect(
			await dict.applyGeneratedKnowledge({
				reading: laufenReading,
				changes: [
					{
						kind: "Contribute",
						aspect: "definition",
						value: "sich gehend fortbewegen",
					},
				],
				pendingRelations: [
					{
						relation: "antonym",
						target: {
							language: "de",
							canonicalForm: "gehen",
							family: "Lexeme",
							kind: "VERB",
						},
					},
				],
			}),
		).toMatchObject({ status: "rejected", code: "relationConflict" });
		expect(
			db
				.rows("accumulatedKnowledge")
				.find(
					(row) =>
						row.ownerReadingKey ===
						readingFingerprint(laufenReading),
				)?.knowledge,
		).not.toMatchObject({ definition: "sich gehend fortbewegen" });
	});

	test("loads cleanup context and atomically resolves only the exact pending locator", async () => {
		const db = new IndexedDb(initialSeed());
		const dict = createDumdictService({
			language: "de",
			storage: storageFor(db),
		});
		await dict.addNewNote({
			draft: {
				reading: springenReading,
				note,
				relations: [
					{
						target: {
							kind: "pending",
							pending: {
								relation: "nearSynonym",
								target: {
									language: "de",
									canonicalForm: "laufen",
									family: "Lexeme",
									kind: "VERB",
								},
							},
						},
					},
					{
						target: {
							kind: "pending",
							pending: {
								relation: "antonym",
								target: {
									language: "de",
									canonicalForm: "laufen",
									family: "Lexeme",
									kind: "VERB",
								},
							},
						},
					},
				],
			},
		});
		const targetLemmaId = await db.insert("lemmas", {
			lemmaKey: lemmaIdentityKey(laufenLemma),
			...laufenLemma,
		});
		await db.insert("dictionaryLemmas", { lemmaId: targetLemmaId });
		const targetReadingId = await db.insert("readings", {
			readingKey: readingFingerprint(laufenReading),
			lemmaId: targetLemmaId,
			emojiDescription: laufenReading.emojiDescription,
		});
		await db.insert("readingEntries", {
			readingId: targetReadingId,
			record: note,
		});

		const info = await dict.getInfoForRelationsCleanup({
			canonicalForm: " laufen ",
		});
		expect(info.candidateLemmas).toEqual([
			expect.objectContaining(laufenLemma),
		]);
		expect(info.pendingRelations).toHaveLength(2);
		const locator = info.pendingRelations.find(
			({ pending }) => pending.relation === "nearSynonym",
		)?.locator;
		if (!locator) throw new Error("Expected a pending relation.");
		expect(
			await dict.cleanupRelations({
				baseRevision: info.revision,
				resolutions: [{ locator }],
			}),
		).toMatchObject({ status: "applied" });
		expect(db.rows("pendingSemanticRelations")).toEqual([
			expect.objectContaining({
				record: expect.objectContaining({
					pending: expect.objectContaining({ relation: "antonym" }),
				}),
			}),
		]);
		expect(
			readingKnowledge(db, readingFingerprint(springenReading))
				?.semanticRelations?.nearSynonym,
		).toEqual([laufenLemma]);
		expect(
			readingKnowledge(db, readingFingerprint(laufenReading))
				?.semanticRelations?.nearSynonym,
		).toBeUndefined();

		expect(
			await dict.cleanupRelations({
				baseRevision: info.revision,
				resolutions: [{ locator }],
			}),
		).toMatchObject({ status: "conflict", code: "revisionConflict" });
		const latest = await dict.getInfoForRelationsCleanup({
			canonicalForm: "laufen",
		});
		expect(
			await dict.cleanupRelations({
				baseRevision: latest.revision,
				resolutions: [{ locator }],
			}),
		).toMatchObject({
			status: "conflict",
			code: "semanticPreconditionFailed",
		});
	});

	test("resolves pending Shadows automatically when their exact Lemma appears", async () => {
		const db = new IndexedDb(initialSeed());
		const dict = createDumdictService({
			language: "de",
			storage: storageFor(db),
		});
		const relation = {
			target: {
				kind: "pending" as const,
				pending: {
					relation: "nearSynonym" as const,
					target: {
						language: "de" as const,
						canonicalForm: "laufen",
						family: "Lexeme" as const,
						kind: "VERB" as const,
					},
				},
			},
		};
		await dict.addNewNote({
			draft: { reading: springenReading, note, relations: [relation] },
		});
		expect(db.rows("pendingSemanticRelations")).toHaveLength(1);
		expect(
			await dict.addNewNote({ draft: { reading: laufenReading, note } }),
		).toMatchObject({
			status: "applied",
		});
		expect(db.rows("pendingSemanticRelations")).toEqual([]);
		expect(
			readingKnowledge(db, readingFingerprint(springenReading))
				?.semanticRelations?.nearSynonym,
		).toEqual([laufenLemma]);
		expect(
			readingKnowledge(db, readingFingerprint(laufenReading))
				?.semanticRelations?.nearSynonym,
		).toBeUndefined();
	});

	test("keeps an ambiguous multi-Lemma Shadow pending and inert", async () => {
		const db = new IndexedDb(initialSeed());
		const dict = createDumdictService({
			language: "de",
			storage: storageFor(db),
		});
		const alternativeLemma = {
			...laufenLemma,
			coreFeatures: { ...verbFeatures, hasSepPrefix: "mit" },
		} as const;
		const alternativeReading = {
			lemma: alternativeLemma,
			emojiDescription: "🏃‍♀️",
		} as const;
		await dict.addNewNote({ draft: { reading: laufenReading, note } });
		await dict.addNewNote({ draft: { reading: alternativeReading, note } });

		const result = await dict.addNewNote({
			draft: {
				reading: springenReading,
				note,
				relations: [
					{
						target: {
							kind: "pending",
							pending: {
								relation: "nearSynonym",
								target: {
									language: "de",
									canonicalForm: "laufen",
									family: "Lexeme",
									kind: "VERB",
								},
							},
						},
					},
				],
			},
		});
		expect(result).toMatchObject({ status: "applied" });
		expect(db.rows("pendingSemanticRelations")).toHaveLength(1);
		const forward = readingKnowledge(
			db,
			readingFingerprint(springenReading),
		)?.semanticRelations?.nearSynonym as unknown[];
		expect(forward).toBeUndefined();
		expect(
			readingKnowledge(db, readingFingerprint(laufenReading))
				?.semanticRelations?.nearSynonym,
		).toBeUndefined();
		expect(
			readingKnowledge(db, readingFingerprint(alternativeReading))
				?.semanticRelations?.nearSynonym,
		).toBeUndefined();
	});

	test("does not backfill an inverse edge when a later Reading joins the target Lemma", async () => {
		const db = new IndexedDb(initialSeed());
		const dict = createDumdictService({
			language: "de",
			storage: storageFor(db),
		});
		await dict.addNewNote({ draft: { reading: laufenReading, note } });
		await dict.addNewNote({
			draft: {
				reading: springenReading,
				note,
				relations: [
					{
						relation: "hypernym",
						target: { kind: "existing", lemma: laufenLemma },
					},
				],
			},
		});
		const laterReading = {
			...laufenReading,
			emojiDescription: "🏃‍♀️",
		} as const;
		expect(
			await dict.addNewNote({ draft: { reading: laterReading, note } }),
		).toMatchObject({
			status: "applied",
		});
		expect(
			readingKnowledge(db, readingFingerprint(laterReading))
				?.semanticRelations?.hyponym,
		).toBeUndefined();
	});

	test("rolls relation-edge writes back when a later planned change fails", async () => {
		const db = new IndexedDb(initialSeed());
		const before = db.snapshot();
		const missingLemma = {
			...laufenLemma,
			canonicalForm: "fehlen",
		} as const;
		const plan: DumdictPlan<"de"> = {
			baseRevision: "convex-0" as StoreRevision,
			changes: [
				{
					type: "patchReading",
					reading: gehenReading,
					ops: [
						{
							kind: "applyKnowledgeChange",
							envelope: {
								reading: gehenReading,
								change: {
									kind: "Contribute",
									aspect: "semanticRelations",
									relation: "antonym",
									value: [missingLemma],
								},
							},
						},
					],
					preconditions: [
						{
							kind: "revisionMatches",
							revision: "convex-0" as StoreRevision,
						},
						{ kind: "readingExists", reading: gehenReading },
					],
				},
			],
			affected: {},
			summary: { message: "must roll back" },
		};
		await expect(
			runMutation(db, commitDumdictChanges, plan),
		).rejects.toThrow("target Lemma is missing");
		expect(db.snapshot()).toEqual(before);
	});

	test("fails relation planning explicitly when the complete Lemma inventory overflows", async () => {
		const dictionaryRows = Array.from({ length: 101 }, (_, index) => ({
			_id: `dictionary-overflow-${index}`,
			lemmaId: `lemma-overflow-${index}`,
		}));
		const db = new IndexedDb({
			...initialSeed(),
			dictionaryLemmas: dictionaryRows,
		});
		await expect(
			runReadingEntryContextQuery(db, {
				intent: "addNewNote",
				lemmaKey: lemmaIdentityKey(laufenLemma),
				proposedLemma: laufenLemma,
				readingKey: readingFingerprint(laufenReading),
				surfaceKeys: [],
				explicitLemmaTargetKeys: [],
				pendingLocatorKeys: [],
			}),
		).rejects.toThrow("at most 100 dictionary Lemmas");
	});

	test("fails relation planning explicitly when the complete Reading inventory overflows", async () => {
		const seed = initialSeed();
		seed.readings = Array.from({ length: 201 }, (_, index) => ({
			_id: `reading-overflow-${index}`,
			readingKey: `reading-key-overflow-${index}`,
			lemmaId: "lemma-gehen",
			emojiDescription: "overflow",
		}));
		const db = new IndexedDb(seed);
		await expect(
			runReadingEntryContextQuery(db, {
				intent: "addNewNote",
				lemmaKey: lemmaIdentityKey(laufenLemma),
				proposedLemma: laufenLemma,
				readingKey: readingFingerprint(laufenReading),
				surfaceKeys: [],
				explicitLemmaTargetKeys: [],
				pendingLocatorKeys: [],
			}),
		).rejects.toThrow("at most 200 dictionary Readings");
	});

	test("fails relation planning explicitly when one Reading's edge inventory overflows", async () => {
		const seed = initialSeed();
		seed.semanticRelationEdges = Array.from(
			{ length: 201 },
			(_, index) => ({
				_id: `edge-overflow-${index}`,
				sourceReadingId: "reading-gehen",
				targetLemmaId: "lemma-gehen",
				relation: "synonym",
			}),
		);
		const db = new IndexedDb(seed);
		await expect(
			runReadingEntryContextQuery(db, {
				intent: "addNewNote",
				lemmaKey: lemmaIdentityKey(laufenLemma),
				proposedLemma: laufenLemma,
				readingKey: readingFingerprint(laufenReading),
				surfaceKeys: [],
				explicitLemmaTargetKeys: [],
				pendingLocatorKeys: [],
			}),
		).rejects.toThrow("at most 200 Semantic Relation edges");
	});

	test("preflights every Knowledge patch before writes and reports semantic conflicts without partial state", async () => {
		const db = new IndexedDb(initialSeed());
		const before = db.snapshot();
		const revision = "convex-0" as StoreRevision;
		const badPlan: DumdictPlan<"de"> = {
			baseRevision: revision,
			changes: [
				{
					type: "patchReading",
					reading: gehenReading,
					ops: [
						{
							kind: "applyKnowledgeChange",
							envelope: {
								reading: gehenReading,
								change: {
									kind: "Contribute",
									aspect: "definition",
									value: "motion",
								},
							},
						},
					],
					preconditions: [
						{ kind: "revisionMatches", revision },
						{ kind: "readingExists", reading: gehenReading },
					],
				},
				{
					type: "patchReading",
					reading: gehenReading,
					ops: [
						{
							kind: "applyKnowledgeChange",
							envelope: {
								reading: laufenReading,
								change: {
									kind: "Contribute",
									aspect: "definition",
									value: "must fail",
								},
							},
						},
					],
					preconditions: [
						{ kind: "revisionMatches", revision },
						{ kind: "readingExists", reading: gehenReading },
					],
				},
			],
		};

		await expect(transactionFor(db).commit(badPlan)).rejects.toThrow(
			"Reading does not match",
		);
		expect(db.snapshot()).toEqual(before);

		const conflictPlan: DumdictPlan<"de"> = {
			baseRevision: revision,
			changes: [
				{
					type: "patchReading",
					reading: gehenReading,
					ops: [],
					preconditions: [
						{ kind: "revisionMatches", revision },
						{ kind: "readingMissing", reading: gehenReading },
					],
				},
			],
		};
		expect(await transactionFor(db).commit(conflictPlan)).toMatchObject({
			status: "conflict",
			code: "semanticPreconditionFailed",
		});
		expect(db.snapshot()).toEqual(before);

		const forgedRecord = {
			sourceReading: gehenReading,
			pending: {
				relation: "synonym",
				target: {
					language: "de",
					canonicalForm: "laufen",
					family: "Lexeme",
					kind: "VERB",
				},
			},
			locator: {
				sourceReadingKey: readingFingerprint(gehenReading),
				relation: "synonym",
				targetPendingId: "pending-entry:v2:de:Lexeme:VERB:forged",
			},
		} as const;
		const forgedPlan: DumdictPlan<"de"> = {
			baseRevision: revision,
			changes: [
				{
					type: "createPendingSemanticRelation",
					record: forgedRecord,
					preconditions: [
						{ kind: "revisionMatches", revision },
						{ kind: "readingExists", reading: gehenReading },
						{
							kind: "pendingRelationMissing",
							record: forgedRecord,
						},
					],
				},
			],
		};
		await expect(transactionFor(db).commit(forgedPlan)).rejects.toThrow(
			"wrong target Pending Entry ID",
		);
		expect(db.snapshot()).toEqual(before);
	});

	test("repeated orchestration encounters through the real Convex adapter preserve direct and pending relations", async () => {
		const seed = initialSeed();
		const directKnowledge = {
			semanticRelations: { nearSynonym: [laufenReading] },
		};
		seed.readingEntries = [
			{
				_id: "reading-entry-gehen",
				readingId: "reading-gehen",
				record: { ...note, knowledge: directKnowledge },
			},
		];
		seed.accumulatedKnowledge = [
			{
				_id: "knowledge-gehen",
				ownerReadingKey: readingFingerprint(gehenReading),
				knowledge: directKnowledge,
				updatedAt: 1,
			},
		];
		const pendingRecord = {
			sourceReading: gehenReading,
			pending: {
				relation: "antonym",
				target: {
					language: "de",
					canonicalForm: "laufen",
					family: "Lexeme",
					kind: "VERB",
				},
			},
			locator: {
				sourceReadingKey: readingFingerprint(gehenReading),
				relation: "antonym",
				targetPendingId: "pending-entry:v2:de:Lexeme:VERB:laufen",
			},
		} as const;
		seed.pendingSemanticRelations = [
			{
				_id: "pending-gehen-laufen",
				locatorKey: locatorKey(pendingRecord.locator),
				sourceReadingKey: readingFingerprint(gehenReading),
				targetCanonicalForm: "laufen",
				record: pendingRecord,
			},
		];
		const db = new IndexedDb(seed);
		const plans: DumdictPlan<"de">[] = [];
		const citation = surface("gehen");
		const grammatical = {
			decision: "Resolved",
			language: "de",
			markedContext: "Wir <TARGET>gehen</TARGET>.",
			attestation: {
				members: [{ attested: "gehen", orthography: "Standard" }],
				realizationCoverage: "Full",
				surface: citation,
			},
			interaction: {
				segmentedSentenceId: "segmented-1",
				clickedSegmentIndex: 2,
				memberSegmentIndices: [2],
			},
		} as const;
		const persistence: OrchestrationPersistence = {
			async persistSubmittedText() {
				throw new Error("Unexpected submission.");
			},
			async getSentenceForResolution() {
				return {
					sentenceId: "sentence-1",
					textId: "text-1",
					segmentedSentenceId: "segmented-1",
					language: "de",
					stitchedText: "Wir gehen.",
					segments: [
						{ index: 0, kind: "ResolvableText", text: "Wir" },
						{ index: 1, kind: "Whitespace", text: " " },
						{ index: 2, kind: "ResolvableText", text: "gehen" },
						{ index: 3, kind: "Punctuation", text: "." },
					],
				};
			},
			async findRecordedClick() {
				return null;
			},
			async findAttestation() {
				return null;
			},
			async persistResolvedClick(input) {
				plans.push(input.dictionaryPlan);
				return {
					status: "Committed",
					clickId: `click-${plans.length}`,
					attestationId: `attestation-${plans.length}`,
					readingId: "reading-gehen",
					deduplicated: false,
					occurrence: {
						attestationId: `attestation-${plans.length}`,
						grammatical,
						reading: gehenReading,
					},
				};
			},
			async persistReusedResolvedClick() {
				throw new Error("Occurrences are intentionally distinct.");
			},
			async persistUnresolvedClick() {
				throw new Error("Expected a resolved click.");
			},
		};
		const orchestrator = createTfDemoOrchestrator({
			dumgen: {
				async segment() {
					throw new Error("Unexpected segmentation.");
				},
				resolve: {
					async grammatical() {
						return grammatical;
					},
					async reading() {
						return {
							decision: "Reuse",
							emojiDescription: gehenReading.emojiDescription,
						};
					},
				},
			} as Dumgen,
			dictionary: createDumdictService({
				language: "de",
				storage: storageFor(db),
			}),
			persistence,
		});

		for (const requestId of ["encounter-1", "encounter-2"]) {
			await orchestrator.resolveSegment({
				requestId,
				visitorId: "visitor-1",
				sentenceId: "sentence-1",
				clickedSegmentIndex: 2,
			});
		}

		expect(plans.map(({ changes }) => changes)).toEqual([[], []]);
		expect(db.rows("readingEntries")[0]?.record).toMatchObject({
			knowledge: directKnowledge,
		});
		expect(db.rows("pendingSemanticRelations")).toEqual([
			expect.objectContaining({ record: pendingRecord }),
		]);
	});
});
