import { describe, expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import {
	createPendingSemanticRelationRecord,
	unitShadowOf,
} from "../../../src/core/pending";
import type { PlannedChangeOp, ReadingEntry } from "../../../src/domain-types";
import type { SerializedDictionaryNote } from "../../../src/dto";
import {
	parseAsCommitChangesRequest,
	unwrapDumdictParse,
} from "../../../src/parsing/lightweight-parsers";
import {
	createDumdictPlanner,
	type DumdictPlanOutcome,
} from "../../../src/planner/planner";
import {
	createLemma,
	createPending,
	createReading,
	derSee,
	derSeeReading,
	dieSee,
	dieSeeReading,
	meer,
	meerReading,
	meerSeePendingRecord,
	readingEntry,
	teich,
	teichReading,
} from "../../../src/testing/storage-conformance/fixtures";
import {
	baenke,
	bank,
	banken,
	bench,
	linkOf,
	moneyBank,
	sparkasse,
	surfaceEntry,
} from "../../../src/testing/storage-conformance/occurrence-fixtures";
import { createInMemoryTestStorage } from "../../support/in-memory-store";

const planner = createDumdictPlanner("de");
type Storage = ReturnType<typeof createInMemoryTestStorage<"de">>;

function storeWith(changes: PlannedChangeOp<"de">[]): Storage {
	const storage = createInMemoryTestStorage("de");
	const result = storage.commitChanges({
		baseRevision: storage.revision(),
		changes,
	});
	if (result.status !== "committed")
		throw new Error(`Seed failed: ${JSON.stringify(result)}`);
	return storage;
}

function commit(storage: Storage, outcome: DumdictPlanOutcome<"de">) {
	if (outcome.status !== "planned")
		throw new Error(`Expected a plan, got ${JSON.stringify(outcome)}`);
	expect(
		storage.commitChanges(
			unwrapDumdictParse(parseAsCommitChangesRequest(outcome.plan, "de")),
		),
	).toMatchObject({ status: "committed" });
}

function reevaluate(storage: Storage, removedLemmas: Dumling.Lemma<"de">[]) {
	const slice = storage.loadReevaluateShadowsContext({ removedLemmas });
	return planner.reevaluateShadows(slice, {
		baseRevision: slice.revision,
		removedLemmas,
	});
}

function removeOccurrence(storage: Storage, ref: string) {
	const slice = storage.loadOccurrenceSlice(
		planner.occurrenceSliceRequest({ ref }),
	);
	return planner.removeOccurrence(slice, { ref });
}

const knowledgeOf = (storage: Storage, reading: Dumling.Reading<"de">) =>
	storage
		.loadAll()
		.flatMap(({ readingEntries }) => readingEntries)
		.find(
			(entry) =>
				JSON.stringify(entry.reading) === JSON.stringify(reading),
		)?.knowledge;

const records = (storage: Storage) =>
	storage.loadAll().flatMap(({ pendingRelations }) => pendingRelations);

const entry = (
	reading: Dumling.Reading<"de">,
	content: Partial<ReadingEntry<"de">> = {},
): ReadingEntry<"de"> => ({
	reading,
	attestedTranslations: [],
	attestationLinks: [],
	notes: "",
	...content,
});

/** `Bank` with 🪑 holding `r1` alone, so removing `r1` removes the Lemma. */
const lastBankNote = (): SerializedDictionaryNote<"de"> => ({
	schemaVersion: 2,
	lemmaRecord: { lemma: bank },
	readingEntries: [
		entry(bench, { attestationLinks: [linkOf("r1", bench, baenke)] }),
	],
	ownedSurfaceEntries: [surfaceEntry(baenke)],
	pendingRelations: [],
});

describe("claims on a removed target", () => {
	test("an exact claim and a pending Shadow of the same relation become one Shadow relation", () => {
		const storage = storeWith([
			createLemma(derSee),
			createReading(readingEntry(derSeeReading)),
			createLemma(dieSee),
			createReading(readingEntry(dieSeeReading)),
			createLemma(meer),
			createReading(
				readingEntry(meerReading, {
					knowledge: { semanticRelations: { synonym: [dieSee] } },
				}),
			),
			// Ambiguous while both See are stored.
			createPending(meerSeePendingRecord),
		]);
		storage.removeLemma(dieSee);

		commit(storage, reevaluate(storage, [dieSee]));
		expect(knowledgeOf(storage, meerReading)).toEqual({
			semanticRelations: { synonym: [derSee] },
		});
		expect(records(storage)).toEqual([
			{ ...meerSeePendingRecord, resolvedLemma: derSee },
		]);
		expect(reevaluate(storage, [dieSee])).toMatchObject({
			plan: { changes: [] },
		});
	});

	test("a converted claim the source already holds on the match is absorbed", () => {
		const storage = storeWith([
			createLemma(derSee),
			createLemma(dieSee),
			createLemma(teich),
			createReading(
				readingEntry(teichReading, {
					knowledge: {
						semanticRelations: { hypernym: [dieSee, derSee] },
					},
				}),
			),
		]);
		storage.removeLemma(dieSee);

		commit(storage, reevaluate(storage, [dieSee]));
		expect(knowledgeOf(storage, teichReading)).toEqual({
			semanticRelations: { hypernym: [derSee] },
		});
		expect(records(storage)).toEqual([]);
	});

	test("removeOccurrence sends a Shadow relation resolved to the removed Lemma back to pending", () => {
		const shadow = createPendingSemanticRelationRecord<"de">(sparkasse, {
			relation: "hypernym",
			target: unitShadowOf(bank),
		});
		const storage = createInMemoryTestStorage<"de">("de", [
			lastBankNote(),
			{
				schemaVersion: 2,
				lemmaRecord: { lemma: sparkasse.lemma },
				readingEntries: [
					entry(sparkasse, {
						knowledge: { semanticRelations: { hypernym: [bank] } },
					}),
				],
				ownedSurfaceEntries: [],
				pendingRelations: [{ ...shadow, resolvedLemma: bank }],
			},
		]);

		const outcome = removeOccurrence(storage, "r1");
		expect(outcome).toMatchObject({
			affected: { removed: { lemmas: [bank] } },
		});
		commit(storage, outcome);
		expect(knowledgeOf(storage, sparkasse)).toBeUndefined();
		expect(records(storage)).toEqual([shadow]);
	});

	test("removeOccurrence retracts a sibling Reading's Reading-mode claim on the removed Reading", () => {
		const storage = createInMemoryTestStorage<"de">("de", [
			{
				...lastBankNote(),
				readingEntries: [
					entry(bench, {
						knowledge: {
							semanticRelations: {
								targetKind: "reading",
								synonym: [moneyBank],
							},
						},
					}),
					entry(moneyBank, {
						attestationLinks: [linkOf("r2", moneyBank, banken)],
					}),
				],
				ownedSurfaceEntries: [
					surfaceEntry(baenke),
					surfaceEntry(banken),
				],
			},
		]);

		commit(storage, removeOccurrence(storage, "r2"));
		expect(knowledgeOf(storage, bench)).toEqual({
			semanticRelations: { targetKind: "reading" },
		});
	});

	test("refuses an occurrence slice whose claiming Reading claims nothing in it", () => {
		const storage = createInMemoryTestStorage<"de">("de", [lastBankNote()]);
		const slice = storage.loadOccurrenceSlice({ refs: ["r1"] });
		expect(() =>
			planner.removeOccurrence(
				{ ...slice, claimingReadings: [entry(sparkasse)] },
				{ ref: "r1" },
			),
		).toThrow("claims no occurrence Lemma or Reading");
	});
});

describe("dangling claims", () => {
	test("a claim on a Lemma the dictionary lost is reported, not thrown", () => {
		// Written before removals moved the claims on what they remove.
		const storage = storeWith([
			createLemma(meer),
			createReading(readingEntry(meerReading)),
		]);
		const slice = storage.loadReevaluateShadowsContext({});
		const outcome = planner.reevaluateShadows(
			{
				...slice,
				relationReadings: [
					readingEntry(meerReading, {
						knowledge: {
							semanticRelations: {
								synonym: [derSee],
							},
						},
					}),
				],
			},
			{ baseRevision: slice.revision },
		);
		expect(outcome).toMatchObject({
			status: "planned",
			plan: { changes: [] },
			issues: [
				{
					kind: "danglingRelationClaim",
					reading: meerReading,
					relation: "synonym",
					target: { kind: "lemma", lemma: derSee },
				},
			],
		});
	});

	test("a Reading-mode claim on a Reading the dictionary lost is reported, not thrown", () => {
		const storage = storeWith([
			createLemma(meer),
			createReading(readingEntry(meerReading)),
		]);
		const request = { entry: readingEntry(teichReading) };
		const context = storage.loadReadingEntryContext(
			planner.contextRequest({ intent: "ensureReadingEntry", request }),
		);
		if (context.intent !== "ensureReadingEntry")
			throw new Error("Expected an ensureReadingEntry context.");
		const outcome = planner.ensureReadingEntry(
			{
				...context,
				relationReadings: [
					readingEntry(meerReading, {
						knowledge: {
							semanticRelations: {
								targetKind: "reading",
								synonym: [dieSeeReading],
							},
						},
					}),
				],
			},
			request,
		);
		expect(outcome).toMatchObject({
			status: "planned",
			issues: [
				{
					kind: "danglingRelationClaim",
					reading: meerReading,
					target: { kind: "reading", reading: dieSeeReading },
				},
			],
		});
	});

	test("a plan with no dangling claim has no issues", () => {
		const storage = storeWith([]);
		const slice = storage.loadReevaluateShadowsContext({});
		const outcome = planner.reevaluateShadows(slice, {
			baseRevision: slice.revision,
		});
		expect(outcome).toMatchObject({ status: "planned" });
		expect(outcome).not.toHaveProperty("issues");
	});
});
