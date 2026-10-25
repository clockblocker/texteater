import { expect, test } from "bun:test";

import { createDumdictPlanner } from "../../planner/planner";
import type { AddNewNoteRequest } from "../../public";
import {
	createLemma,
	createPending,
	createReading,
	deletePending,
	durchlaufen,
	durchlaufenPending,
	durchlaufenReading,
	gehen,
	gehenNounPendingRecord,
	gehenPendingRecord,
	gehenReading,
	gehenUnstoredPendingRecord,
	laufen,
	laufenPendingRecord,
	laufenReading,
	readingEntry,
	separableDurchlaufen,
	springen,
} from "./fixtures";
import {
	type ConformanceStorage,
	commitPlan,
	exactPending,
	expectBoundedInventory,
	expectSameRecords,
	knowledgeOf,
	pendingMatchingLemma,
	readingContext,
	resolvedTo,
	seed,
	semanticConflict,
	storedInventory,
} from "./harness";

const planner = createDumdictPlanner("de");

/** Every Lemma and Reading the relation cases store. */
const dictionary = {
	lemmas: [gehen, laufen, springen, durchlaufen, separableDurchlaufen],
	readings: [gehenReading, laufenReading, durchlaufenReading],
};

const stored = (storage: ConformanceStorage) =>
	storedInventory(storage, dictionary.lemmas, dictionary.readings);

/** `gehen` with a synonym pending on a `durchlaufen` the store does not hold. */
const pendingGehen = [
	createLemma(gehen),
	createReading(readingEntry(gehenReading)),
	createPending(gehenPendingRecord),
];

/** A Lemma and Reading no relation reaches, which a bounded host may skip. */
const unrelatedLaufen = [
	createLemma(laufen),
	createReading(readingEntry(laufenReading)),
];

async function cleanup(
	storage: ConformanceStorage,
	locators = [gehenPendingRecord.locator],
) {
	const resolutions = locators.map((locator) => ({ locator }));
	const slice = await storage.loadCleanupRelationsContext({ resolutions });
	const outcome = planner.cleanupRelations(slice, {
		baseRevision: slice.revision,
		resolutions,
	});
	return { slice, outcome };
}

const durchlaufenNote: AddNewNoteRequest<"de"> = {
	draft: {
		reading: durchlaufenReading,
		note: {
			attestedTranslations: ["stride"],
			attestationLinks: [],
			notes: "conformance",
		},
	},
};

async function addDurchlaufenNote(storage: ConformanceStorage) {
	const context = await storage.loadReadingEntryContext(
		planner.contextRequest({
			intent: "addNewNote",
			request: durchlaufenNote,
		}),
	);
	if (context.intent !== "addNewNote")
		throw new Error("Expected an addNewNote context.");
	return { context, outcome: planner.addNewNote(context, durchlaufenNote) };
}

/**
 * Registers the relation cases: the `cleanupRelations` slice, pending
 * relations resolving when their target Lemma is created, and the relation
 * inventory each relation slice carries, which a host may bound to the
 * neighbourhood a plan reads. `revisions` is the suite's
 * `StorageConformanceOptions.revisions`.
 */
export function describeRelationConformance(
	createStorage: () => ConformanceStorage | Promise<ConformanceStorage>,
	revisions: boolean,
): void {
	test("cleanup loads only the requested pending relations and resolves a Shadow that names one Lemma", async () => {
		const storage = await createStorage();
		await seed(storage, [
			...pendingGehen,
			...unrelatedLaufen,
			createPending(laufenPendingRecord),
			createLemma(durchlaufen),
		]);
		const before = await stored(storage);

		const { slice, outcome } = await cleanup(storage);
		expect(slice.pendingRelations).toEqual([gehenPendingRecord]);
		expectBoundedInventory(slice, before, {
			lemmas: [gehen, durchlaufen],
			readings: [gehenReading],
		});
		expect(await commitPlan(storage, outcome)).toMatchObject({
			status: "committed",
		});

		expect(await knowledgeOf(storage, gehenReading)).toEqual({
			semanticRelations: { synonym: [durchlaufen] },
		});
		// The resolved relation keeps its Shadow beside its resolution.
		expect(await exactPending(storage, [durchlaufenPending])).toEqual([
			resolvedTo(gehenPendingRecord, durchlaufen),
		]);
		expectSameRecords(await pendingMatchingLemma(storage, durchlaufen), [
			resolvedTo(gehenPendingRecord, durchlaufen),
			laufenPendingRecord,
		]);
	});

	test("cleanup loads and resolves every requested pending relation", async () => {
		const storage = await createStorage();
		await seed(storage, [
			...pendingGehen,
			...unrelatedLaufen,
			createPending(laufenPendingRecord),
			createLemma(durchlaufen),
		]);
		const before = await stored(storage);

		const { slice, outcome } = await cleanup(storage, [
			gehenPendingRecord.locator,
			laufenPendingRecord.locator,
		]);
		expect(slice.pendingRelations).toHaveLength(2);
		expect(slice.pendingRelations).toEqual(
			expect.arrayContaining([gehenPendingRecord, laufenPendingRecord]),
		);
		expectBoundedInventory(slice, before, {
			lemmas: [gehen, laufen, durchlaufen],
			readings: [gehenReading, laufenReading],
		});
		expect(await commitPlan(storage, outcome)).toMatchObject({
			status: "committed",
		});

		for (const reading of [gehenReading, laufenReading])
			expect(await knowledgeOf(storage, reading)).toEqual({
				semanticRelations: { synonym: [durchlaufen] },
			});
		expectSameRecords(await pendingMatchingLemma(storage, durchlaufen), [
			resolvedTo(gehenPendingRecord, durchlaufen),
			resolvedTo(laufenPendingRecord, durchlaufen),
		]);
	});

	test("cleanup keeps a Shadow that names no Lemma, or two, pending", async () => {
		const storage = await createStorage();
		await seed(storage, pendingGehen);
		const unresolved = async (required: typeof dictionary.lemmas) => {
			const before = await stored(storage);
			const { slice, outcome } = await cleanup(storage);
			expectBoundedInventory(slice, before, {
				lemmas: required,
				readings: [gehenReading],
			});
			expect(await commitPlan(storage, outcome)).toMatchObject({
				status: "committed",
			});
			expect(await knowledgeOf(storage, gehenReading)).toBeUndefined();
			expect(await exactPending(storage, [durchlaufenPending])).toEqual([
				gehenPendingRecord,
			]);
		};

		await unresolved([gehen]);
		await seed(storage, [
			createLemma(durchlaufen),
			createLemma(separableDurchlaufen),
		]);
		await unresolved([gehen, durchlaufen, separableDurchlaufen]);
	});

	test("cleanup of a pending relation the store does not hold conflicts", async () => {
		const storage = await createStorage();
		await seed(storage, pendingGehen);

		const { slice, outcome } = await cleanup(storage, [
			gehenUnstoredPendingRecord.locator,
		]);
		expect(slice.pendingRelations).toEqual([]);
		expect(outcome).toMatchObject({
			status: "conflict",
			code: "semanticPreconditionFailed",
		});
	});

	test("a cleanup plan whose pending relation is gone commits nothing", async () => {
		const storage = await createStorage();
		await seed(storage, [...pendingGehen, createLemma(durchlaufen)]);
		const { outcome } = await cleanup(storage);
		await seed(storage, [deletePending(gehenPendingRecord)]);

		// A store whose revision advanced refuses the plan's base revision; one
		// with a constant revision refuses its pending-relation precondition.
		expect(await commitPlan(storage, outcome)).toMatchObject(
			revisions
				? { status: "conflict", code: "revisionConflict" }
				: semanticConflict,
		);
		expect(await knowledgeOf(storage, gehenReading)).toBeUndefined();
	});

	test("creating a Shadow's one Lemma resolves its pending relations", async () => {
		const storage = await createStorage();
		await seed(storage, [
			createLemma(springen),
			createLemma(gehen),
			createReading(
				readingEntry(gehenReading, {
					knowledge: { semanticRelations: { antonym: [springen] } },
				}),
			),
			createPending(gehenPendingRecord),
			createPending(gehenNounPendingRecord),
			...unrelatedLaufen,
		]);
		const before = await stored(storage);

		const { context, outcome } = await addDurchlaufenNote(storage);
		expect(context.pendingRelationsMatchingProposedLemma).toEqual([
			gehenPendingRecord,
		]);
		expectBoundedInventory(context, before, {
			lemmas: [gehen, springen],
			readings: [gehenReading],
		});
		expect(await commitPlan(storage, outcome)).toMatchObject({
			status: "committed",
		});

		expect(
			(await readingContext(storage, durchlaufenReading)).existingReading,
		).toEqual(readingEntry(durchlaufenReading, durchlaufenNote.draft.note));
		expect(await knowledgeOf(storage, gehenReading)).toEqual({
			semanticRelations: { antonym: [springen], synonym: [durchlaufen] },
		});
		expect(await pendingMatchingLemma(storage, durchlaufen)).toEqual([
			resolvedTo(gehenPendingRecord, durchlaufen),
		]);
		expect(
			await exactPending(storage, [gehenNounPendingRecord.pending]),
		).toEqual([gehenNounPendingRecord]);
	});

	test("creating a Lemma beside another the Shadow names keeps its pending relations", async () => {
		const storage = await createStorage();
		await seed(storage, [
			...pendingGehen,
			createLemma(separableDurchlaufen),
		]);
		const before = await stored(storage);

		const { context, outcome } = await addDurchlaufenNote(storage);
		expectBoundedInventory(context, before, {
			lemmas: [gehen, separableDurchlaufen],
			readings: [gehenReading],
		});
		expect(await commitPlan(storage, outcome)).toMatchObject({
			status: "committed",
		});

		expect(await knowledgeOf(storage, gehenReading)).toBeUndefined();
		expect(await pendingMatchingLemma(storage, durchlaufen)).toEqual([
			gehenPendingRecord,
		]);
	});

	test("generated Knowledge plans over its Reading's targets and the Lemmas its Shadows name", async () => {
		const storage = await createStorage();
		await seed(storage, [
			...unrelatedLaufen,
			createLemma(springen),
			createLemma(durchlaufen),
			createLemma(gehen),
			createReading(
				readingEntry(gehenReading, {
					knowledge: { semanticRelations: { antonym: [springen] } },
				}),
			),
		]);
		const before = await stored(storage);
		const request = {
			reading: gehenReading,
			changes: [
				{
					kind: "Contribute",
					aspect: "definition",
					value: "sich zu Fuß fortbewegen",
				},
			],
			pendingRelations: [durchlaufenPending],
		} as const;

		const context = await storage.loadReadingEntryContext(
			planner.contextRequest({
				intent: "applyGeneratedKnowledge",
				request,
			}),
		);
		if (context.intent !== "applyGeneratedKnowledge")
			throw new Error("Expected an applyGeneratedKnowledge context.");
		expectBoundedInventory(context, before, {
			lemmas: [gehen, springen, durchlaufen],
			readings: [gehenReading],
		});
		expect(
			await commitPlan(
				storage,
				planner.applyGeneratedKnowledge(context, request),
			),
		).toMatchObject({ status: "committed" });

		expect(await knowledgeOf(storage, gehenReading)).toEqual({
			definition: "sich zu Fuß fortbewegen",
			semanticRelations: { antonym: [springen], synonym: [durchlaufen] },
		});
		expect(await exactPending(storage, [durchlaufenPending])).toEqual([
			resolvedTo(gehenPendingRecord, durchlaufen),
		]);
	});
}
