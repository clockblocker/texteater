import { describe, expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import * as Effect from "effect/Effect";

import type {
	CommitChangesRequest,
	CommitChangesResult,
	DumdictPendingSemanticRelation,
	PlannedChangeOp,
	ReadingEntry,
} from "../../domain-types";
import type {
	LoadReadingEntryContextRequest,
	ReadingEntryContext,
} from "../../storage";
import {
	createLemma,
	createOwnedSurface,
	createPending,
	createReading,
	deletePending,
	gehen,
	gehenPendingRecord,
	gehenReading,
	gehenSurface,
	gehenSurfaceEntry,
	gehenUnstoredPendingRecord,
	laufen,
	laufenReading,
	patchKnowledge,
	readingEntry,
	schreiten,
	schreitenPending,
	springen,
} from "./fixtures";

/**
 * The storage operations the conformance suite drives: the commit, and the
 * Reading Entry context reads the planner plans from. A failing Effect fails
 * the test.
 */
export type ConformanceStorage = {
	commitChanges(
		request: CommitChangesRequest<"de">,
	): Effect.Effect<CommitChangesResult, unknown>;
	loadReadingEntryContext(
		request: LoadReadingEntryContextRequest<"de">,
	): Effect.Effect<ReadingEntryContext<"de">, unknown>;
};

export type StorageConformanceOptions = {
	/**
	 * Whether the store keeps occurrence Attestations in Dumdict Reading
	 * Entries. A host that keeps them in its own graph sets `false`, and must
	 * then refuse every planned change that carries or checks one.
	 */
	readonly readingAttestations?: boolean;
};

/**
 * Registers bun tests that drive the same planned changes through a store's
 * commit and assert the same resulting reads, so every Dumdict storage
 * adapter applies a plan the same way.
 *
 * `createStorage` returns a fresh, empty German store for each test. Store
 * revisions are opaque: the suite reads one before each commit and asserts
 * only the commit status and conflict code.
 */
export function describeStorageConformance(
	name: string,
	createStorage: () => ConformanceStorage | Promise<ConformanceStorage>,
	options: StorageConformanceOptions = {},
): void {
	const readingAttestations = options.readingAttestations ?? true;

	describe(`${name} conforms to the Dumdict storage contract`, () => {
		test("an empty commit commits", async () => {
			const storage = await createStorage();
			expect(await commit(storage, [])).toMatchObject({
				status: "committed",
			});
		});

		test("creates a Lemma, its Reading and an owned Surface in one commit", async () => {
			const storage = await createStorage();
			const revision = (await readingContext(storage, gehenReading))
				.revision;
			const entry = readingEntry(gehenReading);
			expect(
				await commit(storage, [
					createLemma(gehen, [
						{ kind: "revisionMatches", revision },
						{ kind: "lemmaMissing", lemma: gehen },
					]),
					createReading(entry),
					createOwnedSurface(gehenSurfaceEntry),
				]),
			).toMatchObject({ status: "committed" });

			const context = await run(
				storage.loadReadingEntryContext({
					intent: "ensureOwnedSurface",
					reading: gehenReading,
					surface: gehenSurface,
				}),
			);
			expect(context).toMatchObject({
				intent: "ensureOwnedSurface",
				existingLemma: { lemma: gehen },
				existingReading: entry,
				existingOwnedSurfaces: [gehenSurfaceEntry],
			});
		});

		test("checks each change's preconditions against the changes before it", async () => {
			const storage = await createStorage();
			expect(
				await commit(storage, [
					createLemma(laufen),
					createLemma(laufen),
				]),
			).toMatchObject(semanticConflict);
			expect(
				(await readingContext(storage, laufenReading)).existingLemma,
			).toBeUndefined();
		});

		test("a failed precondition commits none of the commit's changes", async () => {
			const storage = await createStorage();
			const entry = readingEntry(gehenReading);
			await seed(storage, [createLemma(gehen), createReading(entry)]);

			expect(
				await commit(storage, [
					createLemma(laufen),
					createReading(
						readingEntry(gehenReading, { notes: "again" }),
					),
				]),
			).toMatchObject(semanticConflict);
			expect(
				(await readingContext(storage, laufenReading)).existingLemma,
			).toBeUndefined();
			expect(
				(await readingContext(storage, gehenReading)).existingReading,
			).toEqual(entry);
		});

		test("stores a new Reading's Knowledge with its Lemma-targeted relations", async () => {
			const storage = await createStorage();
			await seed(storage, [createLemma(laufen)]);
			const entry = readingEntry(gehenReading, {
				knowledge: {
					definition: "sich zu Fuß fortbewegen",
					translations: { en: ["go", "walk"] },
					semanticRelations: { synonym: [laufen] },
				},
			});
			await seed(storage, [createLemma(gehen), createReading(entry)]);

			expect(
				(await readingContext(storage, gehenReading)).existingReading,
			).toEqual(entry);
		});

		test("applies Contribute, Correct and Retract in order", async () => {
			const storage = await createStorage();
			await seed(storage, [
				createLemma(laufen),
				createLemma(springen),
				createLemma(gehen),
				createReading(readingEntry(gehenReading)),
			]);

			await seed(storage, [
				patchKnowledge(gehenReading, [
					{
						kind: "Contribute",
						aspect: "definition",
						value: "gehen",
					},
					{
						kind: "Contribute",
						aspect: "semanticRelations",
						relation: "synonym",
						value: [laufen],
					},
				]),
			]);
			expect(await knowledgeOf(storage, gehenReading)).toEqual({
				definition: "gehen",
				semanticRelations: { synonym: [laufen] },
			});

			await seed(storage, [
				patchKnowledge(gehenReading, [
					{
						kind: "Correct",
						aspect: "definition",
						value: "schreiten",
					},
					{
						kind: "Correct",
						aspect: "semanticRelations",
						relation: "synonym",
						value: [springen, laufen],
					},
				]),
			]);
			expect(await knowledgeOf(storage, gehenReading)).toEqual({
				definition: "schreiten",
				semanticRelations: { synonym: [springen, laufen] },
			});

			await seed(storage, [
				patchKnowledge(gehenReading, [
					{ kind: "Retract", aspect: "definition" },
					{
						kind: "Retract",
						aspect: "semanticRelations",
						relation: "synonym",
					},
				]),
			]);
			expect(await knowledgeOf(storage, gehenReading)).toBeUndefined();
		});

		test("stores Reading-targeted synonyms", async () => {
			const storage = await createStorage();
			await seed(storage, [
				createLemma(laufen),
				createReading(readingEntry(laufenReading)),
				createLemma(gehen),
				createReading(readingEntry(gehenReading)),
			]);

			await seed(storage, [
				patchKnowledge(gehenReading, [
					{
						kind: "Contribute",
						aspect: "semanticRelations",
						relation: "synonym",
						targetKind: "reading",
						value: [laufenReading],
					},
				]),
			]);
			expect(await knowledgeOf(storage, gehenReading)).toEqual({
				semanticRelations: {
					targetKind: "reading",
					synonym: [laufenReading],
				},
			});

			await seed(storage, [
				patchKnowledge(gehenReading, [
					{
						kind: "Retract",
						aspect: "semanticRelations",
						relation: "synonym",
						targetKind: "reading",
					},
				]),
			]);
			expect(await knowledgeOf(storage, gehenReading)).toEqual({
				semanticRelations: { targetKind: "reading" },
			});
		});

		test("creates and deletes a pending Semantic Relation", async () => {
			const storage = await createStorage();
			await seed(storage, [
				createLemma(gehen),
				createReading(readingEntry(gehenReading)),
			]);

			await seed(storage, [createPending(gehenPendingRecord)]);
			expect(await exactPending(storage, [schreitenPending])).toEqual([
				gehenPendingRecord,
			]);
			expect(await pendingMatchingLemma(storage, schreiten)).toEqual([
				gehenPendingRecord,
			]);

			await seed(storage, [deletePending(gehenPendingRecord)]);
			expect(await exactPending(storage, [schreitenPending])).toEqual([]);
			expect(await pendingMatchingLemma(storage, schreiten)).toEqual([]);
		});

		test("checks pending-relation and Surface preconditions", async () => {
			const storage = await createStorage();
			await seed(storage, [
				createLemma(gehen),
				createReading(readingEntry(gehenReading)),
				createOwnedSurface(gehenSurfaceEntry),
			]);

			expect(
				await commit(storage, [
					createPending(gehenPendingRecord),
					createPending(gehenPendingRecord),
				]),
			).toMatchObject(semanticConflict);
			expect(
				await commit(storage, [deletePending(gehenPendingRecord)]),
			).toMatchObject(semanticConflict);
			expect(
				await commit(storage, [createOwnedSurface(gehenSurfaceEntry)]),
			).toMatchObject(semanticConflict);
			expect(
				await commit(storage, [
					{
						type: "createPendingSemanticRelation",
						record: gehenPendingRecord,
						preconditions: [
							{
								kind: "surfaceExists",
								surfaceId: gehenSurfaceEntry.id,
							},
						],
					},
				]),
			).toMatchObject({ status: "committed" });
			expect(await exactPending(storage, [schreitenPending])).toEqual([
				gehenPendingRecord,
			]);
		});

		describe("refuses a change the stored state cannot take, without preconditions", () => {
			const refusals: Array<{
				readonly name: string;
				readonly seeded: boolean;
				readonly change: PlannedChangeOp<"de">;
			}> = [
				{
					name: "creating a stored Lemma",
					seeded: true,
					change: createLemma(gehen, []),
				},
				{
					name: "creating a Reading of a missing Lemma",
					seeded: false,
					change: createReading(readingEntry(gehenReading), []),
				},
				{
					name: "creating a stored Reading",
					seeded: true,
					change: createReading(readingEntry(gehenReading), []),
				},
				{
					name: "creating a Surface owned by a missing Lemma",
					seeded: false,
					change: createOwnedSurface(gehenSurfaceEntry, []),
				},
				{
					name: "creating a stored Surface",
					seeded: true,
					change: createOwnedSurface(gehenSurfaceEntry, []),
				},
				{
					name: "patching a missing Reading",
					seeded: false,
					change: patchKnowledge(
						gehenReading,
						[
							{
								kind: "Contribute",
								aspect: "definition",
								value: "x",
							},
						],
						[],
					),
				},
				{
					name: "creating a pending relation from a missing Reading",
					seeded: false,
					change: createPending(gehenPendingRecord, []),
				},
				{
					name: "creating a stored pending relation",
					seeded: true,
					change: createPending(gehenPendingRecord, []),
				},
				{
					name: "deleting a pending relation from a missing Reading",
					seeded: false,
					change: deletePending(gehenPendingRecord, []),
				},
				{
					name: "deleting a missing pending relation",
					seeded: true,
					change: deletePending(gehenUnstoredPendingRecord, []),
				},
			];

			for (const refusal of refusals)
				test(refusal.name, async () => {
					const storage = await createStorage();
					if (refusal.seeded)
						await seed(storage, [
							createLemma(gehen),
							createReading(readingEntry(gehenReading)),
							createOwnedSurface(gehenSurfaceEntry),
							createPending(gehenPendingRecord),
							createLemma(laufen),
						]);
					const before = await snapshot(storage);
					expect(
						await commit(storage, [refusal.change]),
					).toMatchObject(semanticConflict);
					expect(await snapshot(storage)).toEqual(before);
				});
		});

		test("rejects a direct relation to a Lemma it does not hold, writing nothing", async () => {
			const storage = await createStorage();
			await seed(storage, [
				createLemma(gehen),
				createReading(readingEntry(gehenReading)),
				createLemma(laufen),
			]);
			const before = await snapshot(storage);
			const synonymOfSpringen = { synonym: [springen] };

			await expect(
				commit(storage, [
					createReading(
						readingEntry(laufenReading, {
							knowledge: { semanticRelations: synonymOfSpringen },
						}),
					),
				]),
			).rejects.toThrow("target Lemma is missing");
			await expect(
				commit(storage, [
					patchKnowledge(gehenReading, [
						{
							kind: "Contribute",
							aspect: "definition",
							value: "gehen",
						},
						{
							kind: "Contribute",
							aspect: "semanticRelations",
							relation: "synonym",
							value: [springen],
						},
					]),
				]),
			).rejects.toThrow("target Lemma is missing");
			expect(await snapshot(storage)).toEqual(before);
			expect(await knowledgeOf(storage, gehenReading)).toBeUndefined();
		});

		if (readingAttestations) {
			test("appends Reading Attestations and checks for one", async () => {
				const storage = await createStorage();
				await seed(storage, [
					createLemma(gehen),
					createReading(readingEntry(gehenReading)),
				]);
				const attest: PlannedChangeOp<"de"> = {
					type: "patchReading",
					reading: gehenReading,
					ops: [{ kind: "addAttestation", value: "Wir gehen." }],
					preconditions: [
						{
							kind: "readingAttestationMissing",
							reading: gehenReading,
							value: "Wir gehen.",
						},
					],
				};

				await seed(storage, [attest]);
				expect(
					(await readingContext(storage, gehenReading))
						.existingReading?.attestations,
				).toEqual(["Wir gehen."]);
				expect(await commit(storage, [attest])).toMatchObject(
					semanticConflict,
				);
			});
		} else {
			test("refuses every change that carries or checks a Reading Attestation", async () => {
				const storage = await createStorage();
				await seed(storage, [createLemma(gehen)]);
				const attested = readingEntry(gehenReading, {
					attestations: ["Wir gehen."],
				});

				await expect(
					commit(storage, [createReading(attested)]),
				).rejects.toThrow();
				await expect(
					commit(storage, [
						createOwnedSurface({
							...gehenSurfaceEntry,
							attestations: ["Wir gehen."],
						}),
					]),
				).rejects.toThrow();
				await seed(storage, [
					createReading(readingEntry(gehenReading)),
				]);
				await expect(
					commit(storage, [
						{
							type: "patchReading",
							reading: gehenReading,
							ops: [
								{ kind: "addAttestation", value: "Wir gehen." },
							],
							preconditions: [],
						},
					]),
				).rejects.toThrow();
				await expect(
					commit(storage, [
						createLemma(laufen, [
							{
								kind: "readingAttestationMissing",
								reading: gehenReading,
								value: "Wir gehen.",
							},
						]),
					]),
				).rejects.toThrow();
			});
		}
	});
}

const semanticConflict = {
	status: "conflict",
	code: "semanticPreconditionFailed",
} as const;

function run<A, E>(effect: Effect.Effect<A, E>): Promise<A> {
	return Effect.runPromise(effect);
}

async function commit(
	storage: ConformanceStorage,
	changes: PlannedChangeOp<"de">[],
): Promise<CommitChangesResult> {
	const { revision } = await readingContext(storage, gehenReading);
	return run(storage.commitChanges({ baseRevision: revision, changes }));
}

async function seed(
	storage: ConformanceStorage,
	changes: PlannedChangeOp<"de">[],
): Promise<void> {
	const result = await commit(storage, changes);
	if (result.status !== "committed")
		throw new Error(
			`Expected the seed commit to commit, got ${JSON.stringify(result)}.`,
		);
}

async function readingContext(
	storage: ConformanceStorage,
	reading: Dumling.Reading<"de">,
) {
	const context = await run(
		storage.loadReadingEntryContext({
			intent: "ensureReadingEntry",
			reading,
		}),
	);
	if (context.intent !== "ensureReadingEntry")
		throw new Error(`Expected an ensureReadingEntry context.`);
	return context;
}

async function knowledgeOf(
	storage: ConformanceStorage,
	reading: Dumling.Reading<"de">,
): Promise<ReadingEntry<"de">["knowledge"]> {
	return (await readingContext(storage, reading)).existingReading?.knowledge;
}

async function exactPending(
	storage: ConformanceStorage,
	pendingRelations: DumdictPendingSemanticRelation<"de">[],
) {
	const context = await run(
		storage.loadReadingEntryContext({
			intent: "applyGeneratedKnowledge",
			reading: gehenReading,
			pendingRelations,
			relationTargetLemmas: [],
			relationTargetReadings: [],
		}),
	);
	if (context.intent !== "applyGeneratedKnowledge")
		throw new Error(`Expected an applyGeneratedKnowledge context.`);
	return context.exactPendingRelations;
}

async function pendingMatchingLemma(
	storage: ConformanceStorage,
	lemma: Dumling.Lemma<"de", "Lexeme", "VERB">,
) {
	const context = await run(
		storage.loadReadingEntryContext({
			intent: "addNewNote",
			reading: { unitKind: "Reading", lemma, emojiDescription: "🦶" },
			ownedSurfaces: [],
			relations: [],
		}),
	);
	if (context.intent !== "addNewNote")
		throw new Error(`Expected an addNewNote context.`);
	return context.pendingRelationsMatchingProposedLemma;
}

/** Every fixture value a refused commit must leave as it was. */
async function snapshot(storage: ConformanceStorage) {
	const surfaces = await run(
		storage.loadReadingEntryContext({
			intent: "ensureOwnedSurface",
			reading: gehenReading,
			surface: gehenSurface,
		}),
	);
	return {
		surfaces,
		laufen: await readingContext(storage, laufenReading),
		pending: await exactPending(storage, [schreitenPending]),
	};
}
