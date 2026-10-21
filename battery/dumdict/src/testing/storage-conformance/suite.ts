import { describe, expect, test } from "bun:test";

import type { PlannedChangeOp } from "../../domain-types";
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
import {
	type ConformanceStorage,
	commit,
	exactPending,
	knowledgeOf,
	pendingMatchingLemma,
	readingContext,
	run,
	seed,
	semanticConflict,
	snapshot,
} from "./harness";
import { describeOccurrenceConformance } from "./occurrence-cases";
import { describeParadigmConformance } from "./paradigm-cases";
import { describeRefusalConformance } from "./refusal-cases";
import { describeRelationConformance } from "./relation-cases";
import { describeShadowConformance } from "./shadow-cases";

export type { ConformanceStorage } from "./harness";

export type StorageConformanceOptions = {
	/**
	 * Whether the store keeps occurrences as Dumdict Attestation Links on its
	 * Reading Entries, and with them the removals they plan. A host that keeps
	 * occurrences in its own graph sets `false`, and must then refuse every
	 * planned change that carries or checks a link, and every deletion of a
	 * Reading, Surface or Lemma, since its graph owns that cleanup.
	 */
	readonly attestationLinks?: boolean;
	/**
	 * Whether the store keeps Lemma Paradigms on its Lemma Records. A host
	 * that does not yet sets `false`, and must then refuse every Lemma Record
	 * holding one and every `setLemmaParadigm`.
	 */
	readonly paradigms?: boolean;
	/**
	 * Whether the store's revision advances with each commit, so it refuses a
	 * commit planned at an older one. A host whose commit is guarded by its
	 * own transaction's reads, and so reports one constant revision, sets
	 * `false`.
	 */
	readonly revisions?: boolean;
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
	const attestationLinks = options.attestationLinks ?? true;
	const paradigms = options.paradigms ?? true;
	const revisions = options.revisions ?? true;

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

		if (revisions)
			test("refuses a commit planned at an older revision, writing nothing", async () => {
				const storage = await createStorage();
				const { revision } = await readingContext(
					storage,
					gehenReading,
				);
				await seed(storage, [createLemma(gehen)]);

				expect(
					await run(
						storage.commitChanges({
							baseRevision: revision,
							changes: [createLemma(laufen)],
						}),
					),
				).toMatchObject({
					status: "conflict",
					code: "revisionConflict",
				});
				expect(
					await commit(storage, [
						createLemma(laufen, [
							{ kind: "revisionMatches", revision },
							{ kind: "lemmaMissing", lemma: laufen },
						]),
					]),
				).toMatchObject({ status: "conflict" });
				expect(
					(await readingContext(storage, laufenReading))
						.existingLemma,
				).toBeUndefined();
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

		if (attestationLinks) describeOccurrenceConformance(createStorage);
		if (paradigms)
			describeParadigmConformance(createStorage, attestationLinks);
		describeRefusalConformance(createStorage, {
			attestationLinks,
			paradigms,
		});
		describeRelationConformance(createStorage, revisions);
		describeShadowConformance(createStorage);
	});
}
