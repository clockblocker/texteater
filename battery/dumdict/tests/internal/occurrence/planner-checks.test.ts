import { describe, expect, test } from "bun:test";
import type { SerializedDictionaryNote } from "../../../src/dto";
import { makeSurfaceId } from "../../../src/dumling-id";
import { createDumdictPlanner } from "../../../src/planner/planner";
import {
	baenke,
	bank,
	banken,
	bankParadigm,
	bench,
	linkOf,
	moneyBank,
	respelledBaenke,
	surfaceEntry,
} from "../../../src/testing/storage-conformance/occurrence-fixtures";
import { createInMemoryTestStorage } from "../../support/in-memory-store";

const planner = createDumdictPlanner("de");
const entryOf = (
	reading: typeof bench | typeof moneyBank,
	links: ReturnType<typeof linkOf>[] = [],
) => ({
	reading,
	attestedTranslations: [],
	attestationLinks: links,
	notes: "",
});
const bankNote = (
	readings = [entryOf(bench), entryOf(moneyBank)],
	surfaces = [surfaceEntry(baenke)],
): SerializedDictionaryNote<"de"> => ({
	schemaVersion: 2,
	lemmaRecord: { lemma: bank, paradigm: bankParadigm },
	readingEntries: readings,
	ownedSurfaceEntries: surfaces,
	pendingRelations: [],
});

function recordContext(
	storage: ReturnType<typeof createInMemoryTestStorage<"de">>,
	request: { link: ReturnType<typeof linkOf>; surface: typeof baenke },
) {
	const context = storage.loadReadingEntryContext(
		planner.contextRequest({ intent: "recordOccurrence", request }),
	);
	if (context.intent !== "recordOccurrence") throw new Error("Wrong intent.");
	return context;
}

describe("recordOccurrence checks", () => {
	test("refuses a link that names another Surface's id, a Surface of another Lemma, or no Reading", () => {
		const storage = createInMemoryTestStorage("de", [bankNote()]);
		const wrongId = { link: linkOf("r1", bench, banken), surface: baenke };
		expect(
			planner.recordOccurrence(recordContext(storage, wrongId), wrongId),
		).toMatchObject({ status: "rejected", code: "invalidRequest" });

		const strayReading = { ...bench, emojiDescription: "🧱" };
		const missing = {
			link: linkOf("r1", strayReading, baenke),
			surface: baenke,
		};
		expect(
			planner.recordOccurrence(recordContext(storage, missing), missing),
		).toMatchObject({ status: "rejected", code: "readingMissing" });
	});

	test("plans the Surface before the link, guarded by the ref", () => {
		const empty = createInMemoryTestStorage("de", [
			{ ...bankNote(), ownedSurfaceEntries: [] },
		]);
		const request = { link: linkOf("r1", bench, banken), surface: banken };
		const outcome = planner.recordOccurrence(
			recordContext(empty, request),
			request,
		);
		expect(outcome).toMatchObject({
			status: "planned",
			plan: {
				changes: [
					{ type: "createOwnedSurface" },
					{
						type: "patchReading",
						preconditions: expect.arrayContaining([
							{ kind: "attestationMissing", ref: "r1" },
						]),
					},
				],
			},
		});
	});
});

describe("the occurrence slice contract", () => {
	test("a link naming a Surface its Lemma does not own breaks the contract", () => {
		const storage = createInMemoryTestStorage("de", [
			bankNote([
				entryOf(bench, [linkOf("r1", bench, banken)]),
				entryOf(moneyBank),
			]),
		]);
		expect(() =>
			planner.removeOccurrence(
				storage.loadOccurrenceSlice({ refs: ["r1"] }),
				{ ref: "r1" },
			),
		).toThrow("does not own");
	});
});

describe("removeOccurrence and removeReading checks", () => {
	test("refuses an emptyReading that is neither Remove nor Keep", () => {
		const storage = createInMemoryTestStorage("de", [bankNote()]);
		const request = { ref: "r1", emptyReading: "keep" } as unknown as {
			ref: string;
		};
		expect(
			planner.removeOccurrence(
				storage.loadOccurrenceSlice({ refs: ["r1"] }),
				request,
			),
		).toMatchObject({ status: "rejected", code: "invalidRequest" });
	});

	test("refuses a Reading of another language", () => {
		const storage = createInMemoryTestStorage("de", [bankNote()]);
		const reading = {
			...bench,
			lemma: { ...bench.lemma, language: "en" },
		} as unknown as typeof bench;
		expect(
			planner.removeReading(
				storage.loadOccurrenceSlice({ refs: [], readings: [bench] }),
				{ reading },
			),
		).toMatchObject({ status: "rejected", code: "invalidRequest" });
	});

	test("refuses a malformed Reading", () => {
		const storage = createInMemoryTestStorage("de", [bankNote()]);
		const slice = storage.loadOccurrenceSlice({
			refs: [],
			readings: [bench],
		});
		for (const reading of [
			null,
			{ unitKind: "Reading", emojiDescription: "🪑" },
			{ ...bench, emojiDescription: 7 },
		])
			expect(
				planner.removeReading(slice, {
					reading: reading as unknown as typeof bench,
				}),
			).toMatchObject({ status: "rejected", code: "invalidRequest" });
	});

	test("the slice for removeReading holds the Reading's Lemma, whole, though it has no link", () => {
		const storage = createInMemoryTestStorage("de", [bankNote()]);
		const sliceRequest = planner.occurrenceSliceRequest({
			reading: moneyBank,
		});
		expect(sliceRequest).toEqual({ refs: [], readings: [moneyBank] });
		const slice = storage.loadOccurrenceSlice(sliceRequest);
		expect(
			slice.lemmas.map(({ lemmaRecord }) => lemmaRecord.lemma),
		).toEqual([bank]);
		expect(() =>
			planner.removeReading(
				{ ...slice },
				{ reading: { ...moneyBank, emojiDescription: "🧱" } },
			),
		).toThrow("not requested");
	});
});

describe("Paradigm Changes", () => {
	test("a change Dumrel refuses rejects the request", () => {
		const storage = createInMemoryTestStorage("de", [bankNote()]);
		const request = {
			reading: bench,
			changes: [],
			pendingRelations: [],
			paradigmChanges: [
				{
					kind: "License" as const,
					dimension: "plural" as const,
					reading: bench,
					variants: ["pizzen"],
				},
			],
		};
		const context = storage.loadReadingEntryContext(
			planner.contextRequest({
				intent: "applyGeneratedKnowledge",
				request,
			}),
		);
		if (context.intent !== "applyGeneratedKnowledge")
			throw new Error("Wrong intent.");
		expect(planner.applyGeneratedKnowledge(context, request)).toMatchObject(
			{
				status: "rejected",
				code: "invalidRequest",
			},
		);
	});

	test("a stored Licence of a Reading the Lemma lacks breaks the contract", () => {
		const storage = createInMemoryTestStorage("de", [
			bankNote([entryOf(bench)]),
		]);
		const request = { reading: bench, changes: [], pendingRelations: [] };
		const context = storage.loadReadingEntryContext(
			planner.contextRequest({
				intent: "applyGeneratedKnowledge",
				request,
			}),
		);
		if (context.intent !== "applyGeneratedKnowledge")
			throw new Error("Wrong intent.");
		expect(() => planner.applyGeneratedKnowledge(context, request)).toThrow(
			"Paradigm",
		);
	});
});

describe("rekeySurfaces", () => {
	const noted = surfaceEntry(baenke, { notes: "mine" });
	const request = {
		rekeys: [{ from: noted.id, to: respelledBaenke }],
	};

	test("refuses to merge user text into an entry already stored under the new id", () => {
		const storage = createInMemoryTestStorage("de", [
			bankNote(undefined, [noted, surfaceEntry(respelledBaenke)]),
		]);
		expect(
			planner.rekeySurfaces(
				storage.loadRekeySurfacesSlice(
					planner.rekeySurfacesSliceRequest(request),
				),
				request,
			),
		).toMatchObject({
			status: "rejected",
			code: "ownedSurfaceAlreadyExists",
		});
	});

	test("plans nothing once the old id is gone", () => {
		const storage = createInMemoryTestStorage("de", [
			bankNote(undefined, [surfaceEntry(respelledBaenke)]),
		]);
		expect(
			planner.rekeySurfaces(
				storage.loadRekeySurfacesSlice(
					planner.rekeySurfacesSliceRequest(request),
				),
				request,
			),
		).toMatchObject({ status: "planned", plan: { changes: [] } });
		expect(makeSurfaceId("de", respelledBaenke)).not.toBe(noted.id);
	});
});
