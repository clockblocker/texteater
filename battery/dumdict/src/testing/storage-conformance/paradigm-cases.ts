import { expect, test } from "bun:test";
import { paradigmChangesFor } from "dumrel";

import { migrateV1toV2 } from "../../core/migrate-v1-to-v2";
import type { PlannedChangeOp } from "../../domain-types";
import { unwrapDumdictParse } from "../../parsing/lightweight-parsers";
import { createReading, readingEntry } from "./fixtures";
import { type ConformanceStorage, commitPlan, run, seed } from "./harness";
import {
	bank,
	bankParadigm,
	bankSingular,
	bench,
	benchParadigm,
	moneyBank,
	surfaceEntry,
} from "./occurrence-fixtures";
import {
	planner,
	storedLemma,
	storedReading,
	storedSurface,
} from "./occurrence-harness";

const setParadigm = (
	paradigm?: typeof bankParadigm,
): PlannedChangeOp<"de"> => ({
	type: "setLemmaParadigm",
	lemma: bank,
	...(paradigm && { paradigm }),
	preconditions: [],
});

/** A version 1 `Bank` note: principal parts as Knowledge, plain attestations. */
const bankNoteV1 = {
	schemaVersion: 1,
	lemmaRecord: { lemma: bank },
	readingEntries: [
		{
			reading: moneyBank,
			knowledge: { plural: ["Banken"] },
			attestedTranslations: [],
			attestations: ["Die Bank schließt."],
			notes: "",
		},
		{
			reading: bench,
			knowledge: {
				plural: ["Bänke"],
				definition: "eine Sitzgelegenheit",
			},
			attestedTranslations: ["bench"],
			attestations: ["Sie sitzt auf der Bank."],
			notes: "",
		},
	],
	ownedSurfaceEntries: [
		{
			...surfaceEntry(bankSingular),
			attestations: ["Sie sitzt auf der Bank."],
		},
	],
	pendingRelations: [],
};

/**
 * Registers the Lemma Paradigm cases (system ADR 0048): a Lemma Record
 * stores its Paradigm, generated Knowledge and new Readings change it, and,
 * with `attestationLinks`, a migrated version 1 note stores as it migrated.
 */
export function describeParadigmConformance(
	createStorage: () => ConformanceStorage | Promise<ConformanceStorage>,
	attestationLinks: boolean,
): void {
	test("stores a Lemma's Paradigm with its record, replaces it and drops it", async () => {
		const storage = await createStorage();
		await seed(storage, [
			{
				type: "createLemma",
				record: { lemma: bank, paradigm: benchParadigm },
				preconditions: [],
			},
			createReading(readingEntry(bench)),
		]);
		expect(await storedLemma(storage, bench)).toEqual({
			lemma: bank,
			paradigm: benchParadigm,
		});

		await seed(storage, [
			createReading(readingEntry(moneyBank)),
			setParadigm(bankParadigm),
		]);
		expect(await storedLemma(storage, bench)).toEqual({
			lemma: bank,
			paradigm: bankParadigm,
		});
		await seed(storage, [setParadigm()]);
		expect(await storedLemma(storage, bench)).toEqual({ lemma: bank });
	});

	test("applies generated Paradigm Changes, and a new Reading's, with the Lemma's Readings", async () => {
		const storage = await createStorage();
		await seed(storage, [
			{ type: "createLemma", record: { lemma: bank }, preconditions: [] },
			createReading(readingEntry(bench)),
		]);
		const generated = {
			reading: bench,
			changes: [],
			pendingRelations: [],
			paradigmChanges: paradigmChangesFor({
				reading: bench,
				dimension: "plural",
				values: ["Bänke"],
				provenance: "Produced",
			}),
		};
		const context = await run(
			storage.loadReadingEntryContext(
				planner.contextRequest({
					intent: "applyGeneratedKnowledge",
					request: generated,
				}),
			),
		);
		if (context.intent !== "applyGeneratedKnowledge")
			throw new Error("Expected an applyGeneratedKnowledge context.");
		expect(
			await commitPlan(
				storage,
				planner.applyGeneratedKnowledge(context, generated),
			),
		).toMatchObject({ status: "committed" });
		expect(await storedLemma(storage, bench)).toEqual({
			lemma: bank,
			paradigm: benchParadigm,
		});

		const draft = {
			draft: {
				reading: moneyBank,
				note: {
					attestedTranslations: [],
					attestationLinks: [],
					notes: "",
				},
				paradigmChanges: paradigmChangesFor({
					reading: moneyBank,
					dimension: "plural",
					values: ["Banken"],
					provenance: "Produced",
				}),
			},
		};
		const added = await run(
			storage.loadReadingEntryContext(
				planner.contextRequest({
					intent: "addNewNote",
					request: draft,
				}),
			),
		);
		if (added.intent !== "addNewNote")
			throw new Error("Expected an addNewNote context.");
		expect(
			await commitPlan(storage, planner.addNewNote(added, draft)),
		).toMatchObject({ status: "committed" });
		expect(await storedLemma(storage, bench)).toEqual({
			lemma: bank,
			paradigm: bankParadigm,
		});
	});

	if (attestationLinks)
		test("stores a migrated version 1 note as it migrated", async () => {
			const storage = await createStorage();
			const note = unwrapDumdictParse(migrateV1toV2(bankNoteV1, "de"));
			await seed(storage, [
				{
					type: "createLemma",
					record: note.lemmaRecord,
					preconditions: [],
				},
				...note.ownedSurfaceEntries.map(
					(entry): PlannedChangeOp<"de"> => ({
						type: "createOwnedSurface",
						entry,
						preconditions: [],
					}),
				),
				...note.readingEntries.map((entry) => createReading(entry)),
			]);

			expect(await storedLemma(storage, bench)).toEqual(note.lemmaRecord);
			for (const entry of note.readingEntries)
				expect(await storedReading(storage, entry.reading)).toEqual(
					entry,
				);
			expect(await storedSurface(storage, bankSingular)).toEqual(
				note.ownedSurfaceEntries[0],
			);
			expect(
				note.lemmaRecord.paradigm?.dimensions.plural?.licences,
			).toEqual(bankParadigm.dimensions.plural?.licences);
			expect(
				note.readingEntries.map(
					({ attestationLinks }) => attestationLinks,
				),
			).toEqual([
				[
					{
						ref: "Die Bank schließt.",
						surfaceId: null,
						reading: moneyBank,
					},
				],
				[
					{
						ref: "Sie sitzt auf der Bank.",
						surfaceId: surfaceEntry(bankSingular).id,
						reading: bench,
					},
				],
			]);
		});
}
