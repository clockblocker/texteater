import { expect, test } from "bun:test";
import { paradigmChangesFor } from "dumrel";

import type { PlannedChangeOp } from "../../domain-types";
import { createReading, readingEntry } from "./fixtures";
import { type ConformanceStorage, commitPlan, run, seed } from "./harness";
import {
	bank,
	bankParadigm,
	bench,
	benchParadigm,
	moneyBank,
} from "./occurrence-fixtures";
import { planner, storedLemma } from "./occurrence-harness";

const setParadigm = (
	paradigm?: typeof bankParadigm,
): PlannedChangeOp<"de"> => ({
	type: "setLemmaParadigm",
	lemma: bank,
	...(paradigm && { paradigm }),
	preconditions: [],
});

/**
 * Registers the Lemma Paradigm cases (system ADR 0048): a Lemma Record
 * stores its Paradigm, and generated Knowledge and new Readings change it.
 */
export function describeParadigmConformance(
	createStorage: () => ConformanceStorage | Promise<ConformanceStorage>,
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
}
