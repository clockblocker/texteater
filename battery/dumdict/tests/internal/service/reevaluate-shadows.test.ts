import { describe, expect, test } from "bun:test";
import { sameReading } from "dumling";
import { createPendingSemanticRelationRecord } from "../../../src/core/pending";
import type { PlannedChangeOp } from "../../../src/domain-types";
import {
	parseAsCommitChangesRequest,
	unwrapDumdictParse,
} from "../../../src/parsing/lightweight-parsers";
import { createDumdictPlanner } from "../../../src/planner/planner";
import type {
	AddNewNoteRequest,
	ApplyGeneratedKnowledgeRequest,
	ReevaluateShadowsRequest,
} from "../../../src/public";
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
	seeShadow,
} from "../../../src/testing/storage-conformance/fixtures";
import { createInMemoryTestStorage } from "../../support/in-memory-store";

const planner = createDumdictPlanner("de");

function storeWith(changes: PlannedChangeOp<"de">[]) {
	const storage = createInMemoryTestStorage("de");
	const result = storage.commitChanges({
		baseRevision: storage.revision(),
		changes,
	});
	if (result.status !== "committed")
		throw new Error(`Seed failed: ${JSON.stringify(result)}`);
	return storage;
}

function plan(
	storage: ReturnType<typeof storeWith>,
	request: Omit<ReevaluateShadowsRequest<"de">, "baseRevision">,
) {
	const slice = storage.loadReevaluateShadowsContext(request);
	return planner.reevaluateShadows(slice, {
		...request,
		baseRevision: slice.revision,
	});
}

function commit(
	storage: ReturnType<typeof storeWith>,
	outcome: ReturnType<typeof plan>,
) {
	if (outcome.status !== "planned")
		throw new Error(`Expected a plan, got ${JSON.stringify(outcome)}`);
	expect(
		storage.commitChanges(
			unwrapDumdictParse(parseAsCommitChangesRequest(outcome.plan, "de")),
		),
	).toMatchObject({ status: "committed" });
}

const meerKnowledge = (storage: ReturnType<typeof storeWith>) =>
	storage
		.loadAll()
		.flatMap(({ readingEntries }) => readingEntries)
		.find(({ reading }) => sameReading(reading, meerReading))?.knowledge;

const records = (storage: ReturnType<typeof storeWith>) =>
	storage.loadAll().flatMap(({ pendingRelations }) => pendingRelations);

const meerNote = [createLemma(meer), createReading(readingEntry(meerReading))];

/** Meer's synonym resolved through its `See` Shadow to der See. */
const resolvedMeerSee = [
	createLemma(meer),
	createReading(
		readingEntry(meerReading, {
			knowledge: { semanticRelations: { synonym: [derSee] } },
		}),
	),
	createPending({ ...meerSeePendingRecord, resolvedLemma: derSee }),
];

function addNote(
	storage: ReturnType<typeof storeWith>,
	reading: typeof derSeeReading | typeof dieSeeReading,
) {
	const request: AddNewNoteRequest<"de"> = {
		draft: {
			reading,
			note: { attestedTranslations: [], attestationLinks: [], notes: "" },
		},
	};
	const context = storage.loadReadingEntryContext(
		planner.contextRequest({ intent: "addNewNote", request }),
	);
	if (context.intent !== "addNewNote")
		throw new Error("Expected an addNewNote context.");
	commit(storage, planner.addNewNote(context, request));
}

describe("reevaluateShadows", () => {
	test("an exact claim absorbs a Shadow that resolves to it, and never moves", () => {
		const storage = storeWith([
			createLemma(derSee),
			createReading(readingEntry(derSeeReading)),
			createLemma(dieSee),
			createLemma(meer),
			createReading(
				readingEntry(meerReading, {
					knowledge: { semanticRelations: { synonym: [derSee] } },
				}),
			),
			createPending(meerSeePendingRecord),
		]);
		storage.removeLemma(dieSee);

		commit(storage, plan(storage, { removedLemmas: [dieSee] }));
		expect(records(storage)).toEqual([]);
		expect(meerKnowledge(storage)).toEqual({
			semanticRelations: { synonym: [derSee] },
		});

		addNote(storage, dieSeeReading);
		expect(meerKnowledge(storage)).toEqual({
			semanticRelations: { synonym: [derSee] },
		});
	});

	test("a Shadow whose one match is its source's own Lemma stays pending", () => {
		const selfRecord = createPendingSemanticRelationRecord(derSeeReading, {
			relation: "synonym",
			target: seeShadow,
		});
		const storage = storeWith([
			createLemma(derSee),
			createReading(readingEntry(derSeeReading)),
			createLemma(dieSee),
			createPending(selfRecord),
		]);
		storage.removeLemma(dieSee);

		expect(plan(storage, { removedLemmas: [dieSee] })).toMatchObject({
			status: "planned",
			plan: { changes: [] },
		});
		expect(records(storage)).toEqual([selfRecord]);
	});

	test("a Shadow whose match the source claims under another relation stays pending", () => {
		const storage = storeWith([
			createLemma(derSee),
			createLemma(dieSee),
			createLemma(meer),
			createReading(
				readingEntry(meerReading, {
					knowledge: { semanticRelations: { antonym: [derSee] } },
				}),
			),
			createPending(meerSeePendingRecord),
		]);
		storage.removeLemma(dieSee);

		expect(plan(storage, { removedLemmas: [dieSee] })).toMatchObject({
			status: "planned",
			plan: { changes: [] },
		});
		expect(meerKnowledge(storage)).toEqual({
			semanticRelations: { antonym: [derSee] },
		});
	});

	test("drops a resolved Shadow whose claim was retracted while its Lemma stayed", () => {
		const storage = storeWith([
			createLemma(derSee),
			...meerNote,
			createPending({ ...meerSeePendingRecord, resolvedLemma: derSee }),
		]);

		addNote(storage, dieSeeReading);
		expect(records(storage)).toEqual([]);
		expect(meerKnowledge(storage)).toBeUndefined();
	});

	test("generated Knowledge that names a Shadow's Lemma absorbs it, so the claim never moves", () => {
		const storage = storeWith([createLemma(derSee), ...resolvedMeerSee]);

		const request: ApplyGeneratedKnowledgeRequest<"de"> = {
			reading: meerReading,
			changes: [
				{
					kind: "Contribute",
					aspect: "semanticRelations",
					relation: "synonym",
					value: [derSee],
				},
			],
			pendingRelations: [],
		};
		const context = storage.loadReadingEntryContext(
			planner.contextRequest({
				intent: "applyGeneratedKnowledge",
				request,
			}),
		);
		if (context.intent !== "applyGeneratedKnowledge")
			throw new Error("Expected an applyGeneratedKnowledge context.");
		commit(storage, planner.applyGeneratedKnowledge(context, request));
		expect(records(storage)).toEqual([]);

		storage.commitChanges({
			baseRevision: storage.revision(),
			changes: [
				createLemma(dieSee),
				createReading(readingEntry(dieSeeReading)),
			],
		});
		expect(meerKnowledge(storage)).toEqual({
			semanticRelations: { synonym: [derSee] },
		});
	});

	test("a draft naming a Lemma exactly absorbs its own Shadow of that Lemma", () => {
		const storage = storeWith([
			createLemma(derSee),
			createReading(readingEntry(derSeeReading)),
		]);
		const request: AddNewNoteRequest<"de"> = {
			draft: {
				reading: meerReading,
				note: {
					attestedTranslations: [],
					attestationLinks: [],
					notes: "",
				},
				relations: [
					{
						relation: "synonym",
						target: { kind: "existing", lemma: derSee },
					},
					{
						target: {
							kind: "pending",
							pending: meerSeePendingRecord.pending,
						},
					},
				],
			},
		};
		const context = storage.loadReadingEntryContext(
			planner.contextRequest({ intent: "addNewNote", request }),
		);
		if (context.intent !== "addNewNote")
			throw new Error("Expected an addNewNote context.");
		commit(storage, planner.addNewNote(context, request));
		expect(records(storage)).toEqual([]);
		expect(meerKnowledge(storage)).toEqual({
			semanticRelations: { synonym: [derSee] },
		});
	});

	test("refuses a stale slice as a revision conflict", () => {
		const storage = storeWith([
			...meerNote,
			createPending(meerSeePendingRecord),
		]);
		const slice = storage.loadReevaluateShadowsContext({
			removedLemmas: [dieSee],
		});
		expect(
			planner.reevaluateShadows(slice, {
				baseRevision: "mem-0" as typeof slice.revision,
				removedLemmas: [dieSee],
			}),
		).toMatchObject({ status: "conflict", code: "revisionConflict" });
	});

	test("throws for a slice record the request does not name", () => {
		const storage = storeWith([
			...meerNote,
			createPending(meerSeePendingRecord),
		]);
		const slice = storage.loadReevaluateShadowsContext({
			removedLemmas: [dieSee],
		});
		expect(() =>
			planner.reevaluateShadows(slice, {
				baseRevision: slice.revision,
				removedLemmas: [{ ...dieSee, canonicalForm: "Meer" }],
			}),
		).toThrow("not requested by this re-evaluation");
	});

	test("refuses a removed Lemma in another language", () => {
		const storage = storeWith([]);
		const slice = storage.loadReevaluateShadowsContext({});
		expect(
			planner.reevaluateShadows(slice, {
				baseRevision: slice.revision,
				removedLemmas: [{ ...derSee, language: "en" } as never],
			}),
		).toMatchObject({ status: "rejected", code: "invalidRequest" });
	});

	test("re-proposing a resolved Shadow through generated Knowledge changes nothing", () => {
		const storage = storeWith([createLemma(derSee), ...resolvedMeerSee]);
		const request = {
			reading: meerReading,
			changes: [],
			pendingRelations: [meerSeePendingRecord.pending],
		};
		const context = storage.loadReadingEntryContext(
			planner.contextRequest({
				intent: "applyGeneratedKnowledge",
				request,
			}),
		);
		if (context.intent !== "applyGeneratedKnowledge")
			throw new Error("Expected an applyGeneratedKnowledge context.");
		expect(planner.applyGeneratedKnowledge(context, request)).toMatchObject(
			{ status: "planned", plan: { changes: [] } },
		);
	});
});
