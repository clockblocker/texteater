import { expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import { projectSemanticRelations } from "dumrel";

import { resolveShadow, spellingTarget } from "../../core/link-target";
import type {
	PendingSemanticRelationRecord,
	ReadingEntry,
} from "../../domain-types";
import { createDumdictPlanner } from "../../planner/planner";
import type { ReevaluateShadowsRequest } from "../../public";
import {
	createLemma,
	createPending,
	createReading,
	derSee,
	derSeeReading,
	dieSee,
	dieSeeReading,
	gehen,
	gehenPendingRecord,
	gehenReading,
	meer,
	meerReading,
	meerSeePendingRecord,
	ozean,
	ozeanReading,
	ozeanSeePendingRecord,
	readingEntry,
	schreiten,
	schreitenPending,
	seeShadow,
	teich,
	teichReading,
} from "./fixtures";
import {
	type ConformanceStorage,
	commitPlan,
	exactPending,
	knowledgeOf,
	readingContext,
	resolvedTo,
	run,
	seed,
	storedInventory,
} from "./harness";

const planner = createDumdictPlanner("de");

/** Every Lemma and Reading the Shadow cases store. */
const dictionary = {
	lemmas: [derSee, dieSee, meer, ozean, teich, gehen, schreiten],
	readings: [
		derSeeReading,
		dieSeeReading,
		meerReading,
		ozeanReading,
		teichReading,
		gehenReading,
	],
};

/**
 * `Meer` and `Ozean` each with a synonym pending on some `See`, and `Teich`
 * naming der See exactly as its hypernym, so `Teich` needs der See stored.
 */
const seaSources = [
	createLemma(meer),
	createReading(readingEntry(meerReading)),
	createPending(meerSeePendingRecord),
	createLemma(ozean),
	createReading(readingEntry(ozeanReading)),
	createPending(ozeanSeePendingRecord),
];
const exactTeich = readingEntry(teichReading, {
	knowledge: { semanticRelations: { hypernym: [derSee] } },
});

async function addNote(
	storage: ConformanceStorage,
	reading: Dumling.Reading<"de">,
) {
	const request = {
		draft: {
			reading,
			note: { attestedTranslations: [], attestationLinks: [], notes: "" },
		},
	};
	const context = await run(
		storage.loadReadingEntryContext(
			planner.contextRequest({ intent: "addNewNote", request }),
		),
	);
	if (context.intent !== "addNewNote")
		throw new Error("Expected an addNewNote context.");
	expect(
		await commitPlan(storage, planner.addNewNote(context, request)),
	).toMatchObject({ status: "committed" });
}

async function reevaluate(
	storage: ConformanceStorage,
	request: Omit<ReevaluateShadowsRequest<"de">, "baseRevision">,
) {
	const slice = await run(storage.loadReevaluateShadowsContext(request));
	return {
		slice,
		outcome: planner.reevaluateShadows(slice, {
			...request,
			baseRevision: slice.revision,
		}),
	};
}

/** Commits a re-evaluation, then shows that planning it again plans nothing. */
async function reevaluateToRest(
	storage: ConformanceStorage,
	request: Omit<ReevaluateShadowsRequest<"de">, "baseRevision">,
) {
	const first = await reevaluate(storage, request);
	// One slice plans one plan.
	expect(
		planner.reevaluateShadows(first.slice, {
			...request,
			baseRevision: first.slice.revision,
		}),
	).toEqual(first.outcome);
	expect(await commitPlan(storage, first.outcome)).toMatchObject({
		status: "committed",
	});
	await expectAtRest(storage, request);
}

async function expectAtRest(
	storage: ConformanceStorage,
	request: Omit<ReevaluateShadowsRequest<"de">, "baseRevision">,
) {
	const again = await reevaluate(storage, request);
	expect(again.outcome).toMatchObject({
		status: "planned",
		plan: { changes: [] },
	});
}

async function recordOf(
	storage: ConformanceStorage,
	record: PendingSemanticRelationRecord<"de">,
) {
	return exactPending(storage, [record.pending], record.sourceReading);
}

/** Where a link to some `See` goes, by the match rule over stored Lemmas. */
async function seeLink(storage: ConformanceStorage) {
	const { relationLemmas } = await storedInventory(
		storage,
		dictionary.lemmas,
		[],
	);
	return resolveShadow(
		seeShadow,
		relationLemmas.map(({ lemma }) => lemma),
	);
}

/** The Synonym edges the stored claims project onto one Reading. */
async function synonymsOf(
	storage: ConformanceStorage,
	reading: Dumling.Reading<"de">,
) {
	const { relationReadings } = await storedInventory(
		storage,
		[],
		dictionary.readings,
	);
	const projected = projectSemanticRelations(
		relationReadings.map(({ reading, knowledge }: ReadingEntry<"de">) => ({
			reading,
			knowledge: knowledge ?? {},
		})),
		{ source: reading },
	);
	if (!projected.success) throw projected.error;
	return projected.value.filter(({ relation }) => relation === "synonym");
}

/**
 * Registers the Shadow re-evaluation cases (system ADR 0011): a relation
 * resolved through a Shadow keeps its Shadow, and every Lemma added or
 * removed re-evaluates the Shadows it matches, in bulk and idempotently.
 */
export function describeShadowConformance(
	createStorage: () => ConformanceStorage | Promise<ConformanceStorage>,
): void {
	test("a Shadow follows its Lemmas: der See alone, then die See added, then die See removed", async () => {
		const storage = await createStorage();
		await seed(storage, seaSources);
		const see = { shadows: [seeShadow] };
		const sources = [
			[meerReading, meerSeePendingRecord],
			[ozeanReading, ozeanSeePendingRecord],
		] as const;

		// der See alone: both links resolve to it in the plan that adds it.
		await addNote(storage, derSeeReading);
		await seed(storage, [createLemma(teich), createReading(exactTeich)]);
		await expectAtRest(storage, see);
		expect(await seeLink(storage)).toEqual({
			kind: "Lemma",
			lemma: derSee,
		});
		for (const [reading, record] of sources) {
			expect(await knowledgeOf(storage, reading)).toEqual({
				semanticRelations: { synonym: [derSee] },
			});
			expect(await recordOf(storage, record)).toEqual([
				resolvedTo(record, derSee),
			]);
		}
		expect(await synonymsOf(storage, derSeeReading)).toHaveLength(2);

		// die See added: both go back to the Spelling in the plan that adds
		// it, and the inverses on der See go with them.
		await addNote(storage, dieSeeReading);
		await expectAtRest(storage, see);
		expect(await seeLink(storage)).toEqual(spellingTarget("de", "See"));
		for (const [reading, record] of sources) {
			expect(await knowledgeOf(storage, reading)).toBeUndefined();
			expect(await recordOf(storage, record)).toEqual([record]);
		}
		expect(await synonymsOf(storage, derSeeReading)).toEqual([]);

		// die See removed: both resolve to der See again.
		await run(storage.removeLemma(dieSee));
		await reevaluateToRest(storage, { removedLemmas: [dieSee] });
		expect(await seeLink(storage)).toEqual({
			kind: "Lemma",
			lemma: derSee,
		});
		for (const [reading, record] of sources) {
			expect(await knowledgeOf(storage, reading)).toEqual({
				semanticRelations: { synonym: [derSee] },
			});
			expect(await recordOf(storage, record)).toEqual([
				resolvedTo(record, derSee),
			]);
		}
		expect(await synonymsOf(storage, derSeeReading)).toHaveLength(2);

		// The exactly named hypernym never moved.
		expect(await knowledgeOf(storage, teichReading)).toEqual(
			exactTeich.knowledge,
		);
	});

	test("a record stored without a resolution is resolved by one re-evaluation", async () => {
		const storage = await createStorage();
		// A store written before relations kept their Shadow holds only
		// pending records, some of which may now match one Lemma.
		await seed(storage, [
			...seaSources,
			createLemma(derSee),
			createReading(readingEntry(derSeeReading)),
		]);

		await reevaluateToRest(storage, { shadows: [seeShadow] });
		expect(await knowledgeOf(storage, meerReading)).toEqual({
			semanticRelations: { synonym: [derSee] },
		});
		expect(await recordOf(storage, meerSeePendingRecord)).toEqual([
			resolvedTo(meerSeePendingRecord, derSee),
		]);
	});

	test("an exactly named relation never moves", async () => {
		const storage = await createStorage();
		await seed(storage, [
			createLemma(derSee),
			createReading(readingEntry(derSeeReading)),
			createLemma(teich),
			createReading(exactTeich),
		]);

		await addNote(storage, dieSeeReading);
		expect(await knowledgeOf(storage, teichReading)).toEqual(
			exactTeich.knowledge,
		);
		await run(storage.removeLemma(dieSee));
		await reevaluateToRest(storage, { removedLemmas: [dieSee] });
		expect(await knowledgeOf(storage, teichReading)).toEqual(
			exactTeich.knowledge,
		);
	});

	test("a removal planned before the host removes the Lemma moves the same links", async () => {
		const storage = await createStorage();
		await seed(storage, [
			...seaSources,
			createLemma(derSee),
			createReading(readingEntry(derSeeReading)),
		]);
		await addNote(storage, dieSeeReading);

		const { outcome } = await reevaluate(storage, {
			removedLemmas: [dieSee],
		});
		expect(await commitPlan(storage, outcome)).toMatchObject({
			status: "committed",
		});
		await run(storage.removeLemma(dieSee));
		await expectAtRest(storage, { removedLemmas: [dieSee] });
		expect(await knowledgeOf(storage, meerReading)).toEqual({
			semanticRelations: { synonym: [derSee] },
		});
		expect(await recordOf(storage, meerSeePendingRecord)).toEqual([
			resolvedTo(meerSeePendingRecord, derSee),
		]);
	});

	test("removing a Shadow's only Lemma sends its link back to the Spelling", async () => {
		const storage = await createStorage();
		await seed(storage, [
			createLemma(meer),
			createReading(readingEntry(meerReading)),
			createPending(meerSeePendingRecord),
		]);
		await addNote(storage, dieSeeReading);
		expect(await knowledgeOf(storage, meerReading)).toEqual({
			semanticRelations: { synonym: [dieSee] },
		});

		// The claim on die See outlives its Lemma until the re-evaluation.
		await run(storage.removeLemma(dieSee));
		await reevaluateToRest(storage, { removedLemmas: [dieSee] });
		expect(await knowledgeOf(storage, meerReading)).toBeUndefined();
		expect(await recordOf(storage, meerSeePendingRecord)).toEqual([
			meerSeePendingRecord,
		]);
	});

	test("creating a Lemma through ensureReadingEntry re-evaluates the Shadows it matches", async () => {
		const storage = await createStorage();
		await seed(storage, [
			createLemma(meer),
			createReading(readingEntry(meerReading)),
			createPending(meerSeePendingRecord),
		]);
		const request = { entry: readingEntry(derSeeReading) };
		const context = await run(
			storage.loadReadingEntryContext(
				planner.contextRequest({
					intent: "ensureReadingEntry",
					request,
				}),
			),
		);
		if (context.intent !== "ensureReadingEntry")
			throw new Error("Expected an ensureReadingEntry context.");
		expect(context.pendingRelationsMatchingProposedLemma).toEqual([
			meerSeePendingRecord,
		]);
		expect(
			await commitPlan(
				storage,
				planner.ensureReadingEntry(context, request),
			),
		).toMatchObject({ status: "committed" });

		expect(await knowledgeOf(storage, meerReading)).toEqual({
			semanticRelations: { synonym: [derSee] },
		});
		await expectAtRest(storage, { shadows: [seeShadow] });
	});

	test("re-evaluation reads only the requested Shadows' records", async () => {
		const storage = await createStorage();
		await seed(storage, [
			...seaSources,
			createLemma(gehen),
			createReading(readingEntry(gehenReading)),
			createPending(gehenPendingRecord),
			createLemma(schreiten),
		]);

		const { slice } = await reevaluate(storage, {
			shadows: [schreitenPending.target],
		});
		expect(slice.pendingRelations).toEqual([gehenPendingRecord]);
		await reevaluateToRest(storage, { shadows: [schreitenPending.target] });
		expect(await knowledgeOf(storage, gehenReading)).toEqual({
			semanticRelations: { synonym: [schreiten] },
		});
		expect(await recordOf(storage, meerSeePendingRecord)).toEqual([
			meerSeePendingRecord,
		]);
		expect(
			(await readingContext(storage, meerReading)).existingReading
				?.knowledge,
		).toBeUndefined();
	});
}
