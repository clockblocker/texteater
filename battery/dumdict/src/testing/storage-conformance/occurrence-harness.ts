import type * as Dumling from "dumling/types";

import type { AttestationLink, PlannedChangeOp } from "../../domain-types";
import { createDumdictPlanner } from "../../planner/planner";
import { createOwnedSurface, createPending, readingEntry } from "./fixtures";
import { type ConformanceStorage, readingContext, seed } from "./harness";
import {
	bank,
	bankParadigm,
	bench,
	moneyBank,
	moneyBankPending,
	type surfaceEntry,
} from "./occurrence-fixtures";

export const planner = createDumdictPlanner("de");

/** Plans one occurrence against the store, as a host does. */
export async function planRecord(
	storage: ConformanceStorage,
	link: AttestationLink<"de">,
	surface: Dumling.Surface<"de">,
) {
	const request = { link, surface };
	const context = await storage.loadReadingEntryContext(
		planner.contextRequest({ intent: "recordOccurrence", request }),
	);
	if (context.intent !== "recordOccurrence")
		throw new Error("Expected a recordOccurrence context.");
	return planner.recordOccurrence(context, request);
}

/** Plans removing one occurrence against the store, as a host does. */
export async function planRemove(storage: ConformanceStorage, ref: string) {
	const slice = await storage.loadOccurrenceSlice(
		planner.occurrenceSliceRequest({ ref }),
	);
	return planner.removeOccurrence(slice, { ref });
}

/** The stored Reading Entry, or undefined. */
export async function storedReading(
	storage: ConformanceStorage,
	reading: Dumling.Reading<"de">,
) {
	return (await readingContext(storage, reading)).existingReading;
}

/** The stored Lemma Record of a Reading's Lemma, or undefined. */
export async function storedLemma(
	storage: ConformanceStorage,
	reading: Dumling.Reading<"de">,
) {
	return (await readingContext(storage, reading)).existingLemma;
}

/** The stored Surface Entry of `Bank`'s `surface`, or undefined. */
export async function storedSurface(
	storage: ConformanceStorage,
	surface: Dumling.Surface<"de">,
) {
	const context = await storage.loadReadingEntryContext({
		intent: "ensureOwnedSurface",
		reading: bench,
		surface,
	});
	if (context.intent !== "ensureOwnedSurface")
		throw new Error("Expected an ensureOwnedSurface context.");
	return context.existingOwnedSurfaces[0];
}

/**
 * `Bank` with its Paradigm, 🪑 and 🏦, 🏦's Knowledge and pending synonym,
 * and `surfaces` with their notes.
 */
export async function seedBank(
	storage: ConformanceStorage,
	surfaces: ReturnType<typeof surfaceEntry>[] = [],
) {
	const changes: PlannedChangeOp<"de">[] = [
		{
			type: "createLemma",
			record: { lemma: bank, paradigm: bankParadigm },
			preconditions: [],
		},
		{
			type: "createReading",
			entry: readingEntry(bench),
			preconditions: [],
		},
		{
			type: "createReading",
			entry: readingEntry(moneyBank, {
				knowledge: { definition: "ein Geldinstitut" },
			}),
			preconditions: [],
		},
		createPending(moneyBankPending),
		...surfaces.map((entry) => createOwnedSurface(entry)),
	];
	await seed(storage, changes);
}
