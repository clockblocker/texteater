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
import { pendingSemanticRelationSchema } from "dumrel";

import {
	applyDumdictPlanInTransaction,
	commitDumdictChanges,
	findDumdictStoredReadings,
	getDumdictRelationsCleanupInfo,
	loadDumdictCleanupRelationsContext,
	loadDumdictNewNoteContext,
	loadDumdictReadingForPatch,
} from "../convex/dumdictStorage";
import { lemmaKeyFor } from "../convex/model/linguisticKeys";
import {
	cleanupPendingRelation,
	createConvexDumdictStorage,
} from "../convex/orchestration";
import { loadPendingSelection } from "../convex/shadowResolution";
import {
	createTfDemoOrchestrator,
	type OrchestrationPersistence,
} from "../server/linguisticOrchestration";

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
				lemmaKey: lemmaKeyFor(gehenLemma),
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

function pendingProposalKey(input: unknown): string {
	const pending = pendingSemanticRelationSchema.parse(input);
	return JSON.stringify([
		pending.relation,
		pending.target.language,
		pending.target.canonicalForm,
		pending.target.family,
		pending.target.kind,
	]);
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
	return {
		async findStoredReadings({ lemma }) {
			return (await runQuery(db, findDumdictStoredReadings, {
				lemmaKey: lemmaKeyFor(lemma),
			})) as never;
		},
		async loadNewNoteContext({ draft }) {
			return (await runQuery(db, loadDumdictNewNoteContext, {
				lemmaKey: lemmaKeyFor(draft.reading.lemma),
				readingKey: readingFingerprint(draft.reading),
				surfaceKeys:
					draft.ownedSurfaces?.map(({ surface: value }) =>
						makeSurfaceId("de", value),
					) ?? [],
				explicitReadingTargetKeys:
					draft.relations?.flatMap(({ target }) =>
						target.kind === "existing"
							? [readingFingerprint(target.reading)]
							: [],
					) ?? [],
				pendingProposalKeys:
					draft.relations?.flatMap(({ target }) =>
						target.kind === "pending"
							? [pendingProposalKey(target.pending)]
							: [],
					) ?? [],
			})) as never;
		},
		async loadReadingForPatch({ reading }) {
			return (await runQuery(db, loadDumdictReadingForPatch, {
				readingKey: readingFingerprint(reading),
			})) as never;
		},
		async getInfoForRelationsCleanup({ canonicalForm }) {
			return (await runQuery(db, getDumdictRelationsCleanupInfo, {
				canonicalForm,
			})) as never;
		},
		async loadCleanupRelationsContext({ resolutions }) {
			return (await runQuery(db, loadDumdictCleanupRelationsContext, {
				locatorKeys: resolutions.map(({ locator }) =>
					locatorKey(locator),
				),
				targetReadingKeys: resolutions.flatMap(({ targetReading }) =>
					targetReading ? [readingFingerprint(targetReading)] : [],
				),
			})) as never;
		},
		async commitChanges(request) {
			return (await runMutation(
				db,
				commitDumdictChanges,
				request,
			)) as never;
		},
	};
}

function actualConvexStorageFor(db: IndexedDb): DumdictStoragePort<"de"> {
	const queries = new Map<string, unknown>([
		["dumdictStorage:findDumdictStoredReadings", findDumdictStoredReadings],
		["dumdictStorage:loadDumdictNewNoteContext", loadDumdictNewNoteContext],
		[
			"dumdictStorage:loadDumdictReadingForPatch",
			loadDumdictReadingForPatch,
		],
		[
			"dumdictStorage:getDumdictRelationsCleanupInfo",
			getDumdictRelationsCleanupInfo,
		],
		[
			"dumdictStorage:loadDumdictCleanupRelationsContext",
			loadDumdictCleanupRelationsContext,
		],
	]);
	return createConvexDumdictStorage({
		async runQuery(reference: unknown, args: unknown) {
			const name = getFunctionName(reference as never);
			const fn = queries.get(name);
			if (!fn) throw new Error(`Unexpected Convex query: ${name}`);
			return runQuery(db, fn, args);
		},
		async runMutation(reference: unknown) {
			throw new Error(
				`Unexpected Convex mutation: ${getFunctionName(reference as never)}`,
			);
		},
	} as never);
}

function shadowActionCtx(db: IndexedDb) {
	const queries = new Map<string, unknown>([
		["shadowResolution:loadPendingSelection", loadPendingSelection],
		[
			"dumdictStorage:loadDumdictCleanupRelationsContext",
			loadDumdictCleanupRelationsContext,
		],
	]);
	const mutations = new Map<string, unknown>([
		["dumdictStorage:commitDumdictChanges", commitDumdictChanges],
	]);
	return {
		async runQuery(reference: unknown, args: unknown) {
			const name = getFunctionName(reference as never);
			const fn = queries.get(name);
			if (!fn) throw new Error(`Unexpected Convex query: ${name}`);
			return runQuery(db, fn, args);
		},
		async runMutation(reference: unknown, args: unknown) {
			const name = getFunctionName(reference as never);
			const fn = mutations.get(name);
			if (!fn) throw new Error(`Unexpected Convex mutation: ${name}`);
			return runMutation(db, fn, args);
		},
	};
}

function readingKnowledge(db: IndexedDb, key: string) {
	return db
		.rows("accumulatedKnowledge")
		.find((row) => row.ownerKind === "Reading" && row.ownerKey === key)
		?.knowledge as
		| {
				semanticRelations?: Record<string, unknown[]>;
		  }
		| undefined;
}

describe("tf-demo Dumdict relation storage", () => {
	test("rejects over-budget and duplicate-heavy slices before planning while admitting the exact transaction boundary", async () => {
		const db = new IndexedDb(initialSeed());
		const newNoteArgs = {
			lemmaKey: lemmaKeyFor(gehenLemma),
			readingKey: readingFingerprint(gehenReading),
			surfaceKeys: Array.from(
				{ length: 16 },
				(_, index) => `surface-${index}`,
			),
			explicitReadingTargetKeys: Array.from(
				{ length: 16 },
				(_, index) => `reading-${index}`,
			),
			pendingProposalKeys: Array.from(
				{ length: 16 },
				(_, index) => `pending-${index}`,
			),
		};
		await expect(
			runQuery(db, loadDumdictNewNoteContext, newNoteArgs),
		).resolves.toMatchObject({ revision: "convex-0" });
		await expect(
			runQuery(db, loadDumdictNewNoteContext, {
				...newNoteArgs,
				pendingProposalKeys: [
					...newNoteArgs.pendingProposalKeys,
					"overflow",
				],
			}),
		).rejects.toThrow(
			"New-note context can produce at most 50 planned changes",
		);
		await expect(
			runQuery(db, loadDumdictNewNoteContext, {
				lemmaKey: lemmaKeyFor(gehenLemma),
				readingKey: readingFingerprint(gehenReading),
				surfaceKeys: [],
				explicitReadingTargetKeys: Array.from({ length: 49 }, () =>
					readingFingerprint(gehenReading),
				),
				pendingProposalKeys: [],
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
				targetReadingKeys: Array.from(
					{ length: 16 },
					(_, index) => `reading-${index}`,
				),
			}),
		).resolves.toMatchObject({ revision: "convex-0" });
		await expect(
			runQuery(db, loadDumdictCleanupRelationsContext, {
				locatorKeys: Array.from(
					{ length: 17 },
					(_, index) => `locator-${index}`,
				),
				targetReadingKeys: Array.from(
					{ length: 17 },
					(_, index) => `reading-${index}`,
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
			target: { kind: "existing" as const, reading: gehenReading },
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
		).toEqual([laufenReading]);
	});

	test("loads every requested owned Surface and explicit existing Reading target", async () => {
		const db = new IndexedDb(initialSeed());
		const result = (await runQuery(db, loadDumdictNewNoteContext, {
			lemmaKey: lemmaKeyFor(gehenLemma),
			readingKey: readingFingerprint({
				lemma: gehenLemma,
				emojiDescription: "🥾",
			}),
			surfaceKeys: [
				makeSurfaceId("de", surface("gehen")),
				makeSurfaceId("de", surface("ging")),
			],
			explicitReadingTargetKeys: [readingFingerprint(gehenReading)],
			pendingProposalKeys: [],
		})) as {
			existingOwnedSurfaces: unknown[];
			explicitExistingReadingTargets: unknown[];
		};

		expect(result.existingOwnedSurfaces).toHaveLength(2);
		expect(result.explicitExistingReadingTargets).toEqual([
			expect.objectContaining({ reading: gehenReading }),
		]);
	});

	test("authors inverse direct Knowledge, deduplicates pending proposals, and survives a repeated encounter", async () => {
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
							target: { kind: "existing", reading: gehenReading },
						},
					],
				},
			}),
		).toMatchObject({ status: "applied" });
		expect(
			readingKnowledge(db, readingFingerprint(laufenReading))
				?.semanticRelations?.nearSynonym,
		).toEqual([gehenReading]);
		expect(
			readingKnowledge(db, readingFingerprint(gehenReading))
				?.semanticRelations?.nearSynonym,
		).toEqual([laufenReading]);

		const pending = {
			target: {
				kind: "pending" as const,
				pending: {
					relation: "nearSynonym" as const,
					target: {
						language: "de" as const,
						canonicalForm: " laufen ",
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

	test("loads cleanup context and atomically resolves only the exact pending locator", async () => {
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
				resolutions: [{ locator, targetReading: laufenReading }],
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
		).toEqual([laufenReading]);
		expect(
			readingKnowledge(db, readingFingerprint(laufenReading))
				?.semanticRelations?.nearSynonym,
		).toEqual([springenReading]);

		expect(
			await dict.cleanupRelations({
				baseRevision: info.revision,
				resolutions: [{ locator, targetReading: laufenReading }],
			}),
		).toMatchObject({ status: "conflict", code: "revisionConflict" });
		const latest = await dict.getInfoForRelationsCleanup({
			canonicalForm: "laufen",
		});
		expect(
			await dict.cleanupRelations({
				baseRevision: latest.revision,
				resolutions: [{ locator, targetReading: laufenReading }],
			}),
		).toMatchObject({
			status: "conflict",
			code: "semanticPreconditionFailed",
		});
	});

	test("resolves and discards exact Shadow locators through the public action while preserving dormancy and reuse", async () => {
		const db = new IndexedDb(initialSeed());
		const dict = createDumdictService({
			language: "de",
			storage: storageFor(db),
		});
		await dict.addNewNote({ draft: { reading: laufenReading, note } });
		const pendingTarget = {
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
			draft: {
				reading: springenReading,
				note,
				relations: [pendingTarget],
			},
		});
		const firstPending = db.rows("pendingSemanticRelations")[0];
		if (
			!firstPending ||
			typeof firstPending.locatorKey !== "string" ||
			typeof firstPending.shadowId !== "string"
		) {
			throw new Error("Expected an attached pending Shadow reference.");
		}
		const shadowId = firstPending.shadowId;
		const targetReadingId = db
			.rows("readings")
			.find(
				(row) => row.readingKey === readingFingerprint(laufenReading),
			)?._id;
		if (!targetReadingId) throw new Error("Expected target Reading ID.");

		const actionCtx = shadowActionCtx(db);
		expect(
			await registeredHandler(cleanupPendingRelation)(actionCtx, {
				shadowId,
				locatorKey: firstPending.locatorKey,
				baseRevision: "convex-2",
				targetReadingId,
			}),
		).toMatchObject({ status: "applied", nextRevision: "convex-3" });
		expect(db.rows("pendingSemanticRelations")).toEqual([]);
		expect(
			readingKnowledge(db, readingFingerprint(springenReading))
				?.semanticRelations?.nearSynonym,
		).toEqual([laufenReading]);
		expect(
			readingKnowledge(db, readingFingerprint(laufenReading))
				?.semanticRelations?.nearSynonym,
		).toEqual([springenReading]);
		expect(db.rows("shadows").map(({ _id }) => _id)).toContain(shadowId);
		const afterResolve = db.snapshot();
		expect(
			await registeredHandler(cleanupPendingRelation)(actionCtx, {
				shadowId,
				locatorKey: firstPending.locatorKey,
				baseRevision: "convex-2",
				targetReadingId,
			}),
		).toMatchObject({ status: "conflict", code: "revisionConflict" });
		expect(db.snapshot()).toEqual(afterResolve);

		const secondSource = {
			...springenReading,
			emojiDescription: "🐇",
		} as const;
		const thirdSource = {
			...springenReading,
			emojiDescription: "🦘💨",
		} as const;
		await dict.addNewNote({
			draft: {
				reading: secondSource,
				note,
				relations: [pendingTarget],
			},
		});
		await dict.addNewNote({
			draft: {
				reading: thirdSource,
				note,
				relations: [pendingTarget],
			},
		});
		const repeated = db.rows("pendingSemanticRelations");
		expect(repeated).toHaveLength(2);
		expect(new Set(repeated.map(({ shadowId: id }) => id))).toEqual(
			new Set([shadowId]),
		);
		const discarded = repeated[0];
		if (!discarded || typeof discarded.locatorKey !== "string") {
			throw new Error("Expected exact discard locator.");
		}
		const wrongTargetId = db
			.rows("readings")
			.find(
				(row) => row.readingKey === readingFingerprint(gehenReading),
			)?._id;
		if (!wrongTargetId)
			throw new Error("Expected wrong target Reading ID.");
		const beforeRejectedSelection = db.snapshot();
		expect(
			await registeredHandler(cleanupPendingRelation)(actionCtx, {
				shadowId,
				locatorKey: discarded.locatorKey,
				baseRevision: "convex-5",
				targetReadingId: wrongTargetId,
			}),
		).toMatchObject({ status: "rejected", code: "invalidRequest" });
		expect(db.snapshot()).toEqual(beforeRejectedSelection);
		expect(
			await registeredHandler(cleanupPendingRelation)(actionCtx, {
				shadowId,
				locatorKey: discarded.locatorKey,
				baseRevision: "convex-5",
			}),
		).toMatchObject({ status: "applied", nextRevision: "convex-6" });
		expect(db.rows("pendingSemanticRelations")).toHaveLength(1);
		expect(db.rows("pendingSemanticRelations")[0]?.locatorKey).not.toBe(
			discarded.locatorKey,
		);
		expect(db.rows("shadows").map(({ _id }) => _id)).toContain(shadowId);

		const last = db.rows("pendingSemanticRelations")[0];
		if (!last || typeof last.locatorKey !== "string") {
			throw new Error("Expected the independent remaining locator.");
		}
		const originalRecord = structuredClone(last.record);
		const malformed = structuredClone(last.record) as {
			locator: { targetPendingId: string };
		};
		malformed.locator.targetPendingId = "different-pending-id";
		await db.patch(last._id, { record: malformed });
		const corruptSnapshot = db.snapshot();
		expect(
			await registeredHandler(cleanupPendingRelation)(actionCtx, {
				shadowId,
				locatorKey: last.locatorKey,
				baseRevision: "convex-6",
			}),
		).toMatchObject({
			status: "conflict",
			code: "semanticPreconditionFailed",
		});
		expect(db.snapshot()).toEqual(corruptSnapshot);

		await db.patch(last._id, { record: originalRecord });
		expect(
			await registeredHandler(cleanupPendingRelation)(actionCtx, {
				shadowId,
				locatorKey: last.locatorKey,
				baseRevision: "convex-6",
			}),
		).toMatchObject({ status: "applied", nextRevision: "convex-7" });
		expect(db.rows("pendingSemanticRelations")).toEqual([]);
		expect(db.rows("shadows").map(({ _id }) => _id)).toContain(shadowId);

		const reactivatedSource = {
			...springenReading,
			emojiDescription: "🦘✨",
		} as const;
		await dict.addNewNote({
			draft: {
				reading: reactivatedSource,
				note,
				relations: [pendingTarget],
			},
		});
		expect(db.rows("pendingSemanticRelations")).toEqual([
			expect.objectContaining({ shadowId }),
		]);
		expect(
			db.rows("shadows").filter(({ _id }) => _id === shadowId),
		).toHaveLength(1);
	});

	test("resolves two equal-looking locators independently to different same-descriptor Reading IDs", async () => {
		const db = new IndexedDb(initialSeed());
		const dict = createDumdictService({
			language: "de",
			storage: storageFor(db),
		});
		const alternativeTarget = {
			...laufenReading,
			emojiDescription: "🏃‍♀️",
		} as const;
		const alternativeSource = {
			...springenReading,
			emojiDescription: "🐇",
		} as const;
		await dict.addNewNote({ draft: { reading: laufenReading, note } });
		await dict.addNewNote({
			draft: { reading: alternativeTarget, note },
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
		await dict.addNewNote({
			draft: {
				reading: alternativeSource,
				note,
				relations: [relation],
			},
		});
		const pending = db.rows("pendingSemanticRelations");
		expect(pending).toHaveLength(2);
		const shadowId = pending[0]?.shadowId;
		if (typeof shadowId !== "string")
			throw new Error("Expected Shadow ID.");
		expect(new Set(pending.map((row) => row.shadowId))).toEqual(
			new Set([shadowId]),
		);
		const locatorFor = (reading: typeof springenReading) => {
			const row = pending.find(
				(candidate) =>
					candidate.sourceReadingKey === readingFingerprint(reading),
			);
			if (!row || typeof row.locatorKey !== "string") {
				throw new Error("Expected exact locator.");
			}
			return row.locatorKey;
		};
		const readingIdFor = (reading: typeof laufenReading) => {
			const id = db
				.rows("readings")
				.find(
					(candidate) =>
						candidate.readingKey === readingFingerprint(reading),
				)?._id;
			if (!id) throw new Error("Expected candidate Reading ID.");
			return id;
		};
		const firstLocator = locatorFor(springenReading);
		const secondLocator = locatorFor(alternativeSource);
		const ctx = shadowActionCtx(db);
		expect(
			await registeredHandler(cleanupPendingRelation)(ctx, {
				shadowId,
				locatorKey: firstLocator,
				baseRevision: "convex-4",
				targetReadingId: readingIdFor(laufenReading),
			}),
		).toMatchObject({ status: "applied", nextRevision: "convex-5" });
		expect(db.rows("pendingSemanticRelations")).toEqual([
			expect.objectContaining({ locatorKey: secondLocator, shadowId }),
		]);
		expect(
			readingKnowledge(db, readingFingerprint(springenReading))
				?.semanticRelations?.nearSynonym,
		).toEqual([laufenReading]);

		expect(
			await registeredHandler(cleanupPendingRelation)(ctx, {
				shadowId,
				locatorKey: secondLocator,
				baseRevision: "convex-5",
				targetReadingId: readingIdFor(alternativeTarget),
			}),
		).toMatchObject({ status: "applied", nextRevision: "convex-6" });
		expect(db.rows("pendingSemanticRelations")).toEqual([]);
		expect(
			readingKnowledge(db, readingFingerprint(alternativeSource))
				?.semanticRelations?.nearSynonym,
		).toEqual([alternativeTarget]);
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
								owner: {
									kind: "Reading",
									reading: gehenReading,
								},
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
								owner: {
									kind: "Reading",
									reading: laufenReading,
								},
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

		await expect(
			applyDumdictPlanInTransaction({ db } as never, badPlan),
		).rejects.toThrow("owner does not match");
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
		expect(
			await applyDumdictPlanInTransaction({ db } as never, conflictPlan),
		).toMatchObject({
			status: "conflict",
			code: "semanticPreconditionFailed",
		});
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
				ownerKind: "Reading",
				ownerKey: readingFingerprint(gehenReading),
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
				storage: actualConvexStorageFor(db),
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
