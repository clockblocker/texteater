import { expect, test } from "bun:test";

import { createDumdictPlanner } from "../../planner/planner";
import type { AddNewNoteRequest } from "../../public";
import {
	createLemma,
	createPending,
	createReading,
	deletePending,
	gehen,
	gehenPendingRecord,
	gehenReading,
	gehenUnstoredPendingRecord,
	laufen,
	laufenPendingRecord,
	laufenReading,
	readingEntry,
	reflexiveSchreiten,
	schreiten,
	schreitenPending,
	schreitenReading,
	springen,
} from "./fixtures";
import {
	type ConformanceStorage,
	commitPlan,
	exactPending,
	expectBoundedInventory,
	knowledgeOf,
	pendingMatchingLemma,
	readingContext,
	run,
	seed,
	storedInventory,
} from "./harness";

const planner = createDumdictPlanner("de");

/** Every Lemma and Reading the relation cases store. */
const dictionary = {
	lemmas: [gehen, laufen, springen, schreiten, reflexiveSchreiten],
	readings: [gehenReading, laufenReading, schreitenReading],
};

const stored = (storage: ConformanceStorage) =>
	storedInventory(storage, dictionary.lemmas, dictionary.readings);

/** `gehen` with a synonym pending on a `schreiten` the store does not hold. */
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
	const slice = await run(
		storage.loadCleanupRelationsContext({ resolutions }),
	);
	const outcome = planner.cleanupRelations(slice, {
		baseRevision: slice.revision,
		resolutions,
	});
	return { slice, outcome };
}

const schreitenNote: AddNewNoteRequest<"de"> = {
	draft: {
		reading: schreitenReading,
		note: {
			attestedTranslations: ["stride"],
			attestations: [],
			notes: "conformance",
		},
	},
};

async function addSchreitenNote(storage: ConformanceStorage) {
	const context = await run(
		storage.loadReadingEntryContext(
			planner.contextRequest({
				intent: "addNewNote",
				request: schreitenNote,
			}),
		),
	);
	if (context.intent !== "addNewNote")
		throw new Error("Expected an addNewNote context.");
	return { context, outcome: planner.addNewNote(context, schreitenNote) };
}

/**
 * Registers the relation cases: the `cleanupRelations` slice, pending
 * relations resolving when their target Lemma is created, and the relation
 * inventory each relation slice carries, which a host may bound to the
 * neighbourhood a plan reads.
 */
export function describeRelationConformance(
	createStorage: () => ConformanceStorage | Promise<ConformanceStorage>,
): void {
	test("cleanup loads only the requested pending relations and resolves a Shadow that names one Lemma", async () => {
		const storage = await createStorage();
		await seed(storage, [
			...pendingGehen,
			...unrelatedLaufen,
			createPending(laufenPendingRecord),
			createLemma(schreiten),
		]);
		const before = await stored(storage);

		const { slice, outcome } = await cleanup(storage);
		expect(slice.pendingRelations).toEqual([gehenPendingRecord]);
		expectBoundedInventory(slice, before, {
			lemmas: [gehen, schreiten],
			readings: [gehenReading],
		});
		expect(await commitPlan(storage, outcome)).toMatchObject({
			status: "committed",
		});

		expect(await knowledgeOf(storage, gehenReading)).toEqual({
			semanticRelations: { synonym: [schreiten] },
		});
		expect(await exactPending(storage, [schreitenPending])).toEqual([]);
		expect(await pendingMatchingLemma(storage, schreiten)).toEqual([
			laufenPendingRecord,
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
			expect(await exactPending(storage, [schreitenPending])).toEqual([
				gehenPendingRecord,
			]);
		};

		await unresolved([gehen]);
		await seed(storage, [
			createLemma(schreiten),
			createLemma(reflexiveSchreiten),
		]);
		await unresolved([gehen, schreiten, reflexiveSchreiten]);
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
		await seed(storage, [...pendingGehen, createLemma(schreiten)]);
		const { outcome } = await cleanup(storage);
		await seed(storage, [deletePending(gehenPendingRecord)]);

		expect(await commitPlan(storage, outcome)).toMatchObject({
			status: "conflict",
		});
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
			...unrelatedLaufen,
		]);
		const before = await stored(storage);

		const { context, outcome } = await addSchreitenNote(storage);
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
			(await readingContext(storage, schreitenReading)).existingReading,
		).toEqual(readingEntry(schreitenReading, schreitenNote.draft.note));
		expect(await knowledgeOf(storage, gehenReading)).toEqual({
			semanticRelations: { antonym: [springen], synonym: [schreiten] },
		});
		expect(await pendingMatchingLemma(storage, schreiten)).toEqual([]);
	});

	test("creating a Lemma beside another the Shadow names keeps its pending relations", async () => {
		const storage = await createStorage();
		await seed(storage, [...pendingGehen, createLemma(reflexiveSchreiten)]);
		const before = await stored(storage);

		const { context, outcome } = await addSchreitenNote(storage);
		expectBoundedInventory(context, before, {
			lemmas: [gehen, reflexiveSchreiten],
			readings: [gehenReading],
		});
		expect(await commitPlan(storage, outcome)).toMatchObject({
			status: "committed",
		});

		expect(await knowledgeOf(storage, gehenReading)).toBeUndefined();
		expect(await pendingMatchingLemma(storage, schreiten)).toEqual([
			gehenPendingRecord,
		]);
	});

	test("generated Knowledge plans over its Reading's targets and the Lemmas its Shadows name", async () => {
		const storage = await createStorage();
		await seed(storage, [
			...unrelatedLaufen,
			createLemma(springen),
			createLemma(schreiten),
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
			pendingRelations: [schreitenPending],
		} as const;

		const context = await run(
			storage.loadReadingEntryContext(
				planner.contextRequest({
					intent: "applyGeneratedKnowledge",
					request,
				}),
			),
		);
		if (context.intent !== "applyGeneratedKnowledge")
			throw new Error("Expected an applyGeneratedKnowledge context.");
		expectBoundedInventory(context, before, {
			lemmas: [gehen, springen, schreiten],
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
			semanticRelations: { antonym: [springen], synonym: [schreiten] },
		});
		expect(await exactPending(storage, [schreitenPending])).toEqual([]);
	});
}
