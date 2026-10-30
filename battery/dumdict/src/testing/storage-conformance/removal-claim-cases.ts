import { expect, test } from "bun:test";
import type * as Dumling from "dumling/types";

import {
	createPendingSemanticRelationRecord,
	unitShadowOf,
} from "../../core/pending";
import type { PendingSemanticRelationRecord } from "../../domain-types";
import type { DumdictPlanOutcome } from "../../planner/planner";
import type { ReevaluateShadowsRequest } from "../../public";
import {
	createLemma,
	createReading,
	derSee,
	derSeeReading,
	dieSee,
	dieSeeReading,
	readingEntry,
	seeShadow,
	teichReading,
} from "./fixtures";
import {
	type ConformanceStorage,
	commitPlan,
	exactPending,
	knowledgeOf,
	resolvedTo,
	seed,
} from "./harness";
import {
	baenke,
	bank,
	banken,
	bench,
	kreditinstitut,
	linkOf,
	moneyBank,
	sparkasse,
} from "./occurrence-fixtures";
import {
	planner,
	planRemove,
	planRemoveReading,
	seedBank,
} from "./occurrence-harness";

/** A Reading's Lemma and the Reading, whose Knowledge holds these claims. */
function claiming(
	reading: Dumling.Reading<"de">,
	semanticRelations: NonNullable<
		NonNullable<ReturnType<typeof readingEntry>["knowledge"]>
	>["semanticRelations"],
) {
	return [
		createLemma(reading.lemma),
		createReading(
			readingEntry(reading, { knowledge: { semanticRelations } }),
		),
	];
}

/** The Shadow relation an exact claim on `lemma` becomes. */
function shadowOf(
	reading: Dumling.Reading<"de">,
	relation: "hypernym" | "synonym",
	lemma: Dumling.Lemma<"de">,
): PendingSemanticRelationRecord<"de"> {
	return createPendingSemanticRelationRecord(reading, {
		relation,
		target: unitShadowOf(lemma),
	});
}

async function recordOf(
	storage: ConformanceStorage,
	record: PendingSemanticRelationRecord<"de">,
) {
	return exactPending(storage, [record.pending], record.sourceReading);
}

async function committed(
	storage: ConformanceStorage,
	outcome: DumdictPlanOutcome<"de">,
) {
	expect(await commitPlan(storage, outcome)).toMatchObject({
		status: "committed",
	});
}

/** Commits a re-evaluation, then shows that planning it again plans nothing. */
async function reevaluateToRest(
	storage: ConformanceStorage,
	request: Omit<ReevaluateShadowsRequest<"de">, "baseRevision">,
) {
	const plan = async () => {
		const slice = await storage.loadReevaluateShadowsContext(request);
		return planner.reevaluateShadows(slice, {
			...request,
			baseRevision: slice.revision,
		});
	};
	await committed(storage, await plan());
	expect(await plan()).toMatchObject({
		status: "planned",
		plan: { changes: [] },
	});
}

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
	const context = await storage.loadReadingEntryContext(
		planner.contextRequest({ intent: "addNewNote", request }),
	);
	if (context.intent !== "addNewNote")
		throw new Error("Expected an addNewNote context.");
	await committed(storage, planner.addNewNote(context, request));
}

const teichOnDieSee = shadowOf(teichReading, "hypernym", dieSee);

/**
 * Registers the cases for claims on a removed target (system ADR 0011), in
 * both removal paths: a Lemma-mode claim on a removed Lemma becomes its
 * Shadow relation, and a Reading-mode claim on a removed Reading is
 * retracted, in the plan that removes them.
 */
export function describeRemovalClaimConformance(
	createStorage: () => ConformanceStorage | Promise<ConformanceStorage>,
	options: { readonly attestationLinks: boolean },
): void {
	test("a host's Lemma removal turns an exact claim on it into its Shadow, which resolves when the Lemma comes back", async () => {
		const storage = await createStorage();
		await seed(storage, [
			createLemma(dieSee),
			createReading(readingEntry(dieSeeReading)),
			...claiming(teichReading, { hypernym: [dieSee] }),
		]);

		await storage.removeLemma(dieSee);
		await reevaluateToRest(storage, { removedLemmas: [dieSee] });
		expect(await knowledgeOf(storage, teichReading)).toBeUndefined();
		expect(await recordOf(storage, teichOnDieSee)).toEqual([teichOnDieSee]);

		await addNote(storage, dieSeeReading);
		expect(await knowledgeOf(storage, teichReading)).toEqual({
			semanticRelations: { hypernym: [dieSee] },
		});
		expect(await recordOf(storage, teichOnDieSee)).toEqual([
			resolvedTo(teichOnDieSee, dieSee),
		]);
	});

	test("the Shadow of a host-removed Lemma resolves to the one Lemma it still matches", async () => {
		const storage = await createStorage();
		await seed(storage, [
			createLemma(derSee),
			createReading(readingEntry(derSeeReading)),
			createLemma(dieSee),
			createReading(readingEntry(dieSeeReading)),
			...claiming(teichReading, { hypernym: [dieSee] }),
		]);

		await storage.removeLemma(dieSee);
		await reevaluateToRest(storage, { removedLemmas: [dieSee] });
		expect(await knowledgeOf(storage, teichReading)).toEqual({
			semanticRelations: { hypernym: [derSee] },
		});
		expect(await recordOf(storage, teichOnDieSee)).toEqual([
			resolvedTo(teichOnDieSee, derSee),
		]);
	});

	test("a host's Lemma removal retracts the Reading-mode claims on its Readings", async () => {
		const storage = await createStorage();
		await seed(storage, [
			createLemma(dieSee),
			createReading(readingEntry(dieSeeReading)),
			...claiming(teichReading, {
				targetKind: "reading",
				synonym: [dieSeeReading],
			}),
		]);

		await storage.removeLemma(dieSee);
		await reevaluateToRest(storage, { removedLemmas: [dieSee] });
		expect(await knowledgeOf(storage, teichReading)).toEqual({
			semanticRelations: { targetKind: "reading" },
		});
		expect(
			await exactPending(
				storage,
				[{ relation: "synonym", target: seeShadow }],
				teichReading,
			),
		).toEqual([]);
	});

	if (!options.attestationLinks) return;

	const sparkasseOnBank = shadowOf(sparkasse, "hypernym", bank);
	const claimants = [
		...claiming(sparkasse, { hypernym: [bank] }),
		...claiming(kreditinstitut, {
			targetKind: "reading",
			synonym: [bench, moneyBank],
		}),
	];
	const record = async (
		storage: ConformanceStorage,
		reading: typeof bench,
		ref: string,
	) => {
		const surface = reading === bench ? baenke : banken;
		const request = { link: linkOf(ref, reading, surface), surface };
		const context = await storage.loadReadingEntryContext(
			planner.contextRequest({ intent: "recordOccurrence", request }),
		);
		if (context.intent !== "recordOccurrence")
			throw new Error("Expected a recordOccurrence context.");
		await committed(storage, planner.recordOccurrence(context, request));
	};
	const remove = async (storage: ConformanceStorage, ref: string) => {
		const outcome = await planRemove(storage, ref);
		await committed(storage, outcome);
		return outcome;
	};

	test("removing a Reading's last occurrence retracts the Reading-mode claims on it, in the same plan", async () => {
		const storage = await createStorage();
		await seedBank(storage);
		await seed(storage, claimants);
		await record(storage, bench, "r1");
		await record(storage, moneyBank, "r2");

		const outcome = await remove(storage, "r2");
		expect(outcome).toMatchObject({
			affected: {
				readings: expect.arrayContaining([kreditinstitut]),
				removed: { readings: [moneyBank] },
			},
		});
		expect(await knowledgeOf(storage, kreditinstitut)).toEqual({
			semanticRelations: { targetKind: "reading", synonym: [bench] },
		});
		// `Bank` stays, and so do the claims on it.
		expect(await knowledgeOf(storage, sparkasse)).toEqual({
			semanticRelations: { hypernym: [bank] },
		});
		expect(await recordOf(storage, sparkasseOnBank)).toEqual([]);
	});

	test("removing a Lemma's last occurrence turns the claims on it into its Shadow, which resolves when the Lemma comes back", async () => {
		const storage = await createStorage();
		await seedBank(storage);
		await seed(storage, claimants);
		await record(storage, bench, "r1");
		await record(storage, moneyBank, "r2");
		await remove(storage, "r2");

		const outcome = await remove(storage, "r1");
		expect(outcome).toMatchObject({
			affected: {
				readings: expect.arrayContaining([sparkasse, kreditinstitut]),
				pendingIds: [sparkasseOnBank.locator.targetPendingId],
				removed: { lemmas: [bank] },
			},
		});
		expect(await knowledgeOf(storage, sparkasse)).toBeUndefined();
		expect(await recordOf(storage, sparkasseOnBank)).toEqual([
			sparkasseOnBank,
		]);
		expect(await knowledgeOf(storage, kreditinstitut)).toEqual({
			semanticRelations: { targetKind: "reading" },
		});
		// Nothing matches its Shadow, so the host's re-evaluation keeps it.
		await reevaluateToRest(storage, { removedLemmas: [bank] });
		expect(await recordOf(storage, sparkasseOnBank)).toEqual([
			sparkasseOnBank,
		]);

		await addNote(storage, bench);
		expect(await knowledgeOf(storage, sparkasse)).toEqual({
			semanticRelations: { hypernym: [bank] },
		});
		expect(await recordOf(storage, sparkasseOnBank)).toEqual([
			resolvedTo(sparkasseOnBank, bank),
		]);
	});

	test("removeReading moves the claims on the Reading, and on its Lemma with its last Reading, in the same plan", async () => {
		const storage = await createStorage();
		await seedBank(storage);
		await seed(storage, claimants);
		await record(storage, bench, "r1");
		// 🏦 has no link, as a host keeps a Reading it emptied.
		const kept = await planRemoveReading(storage, moneyBank);
		await committed(storage, kept);
		expect(kept).toMatchObject({
			affected: {
				readings: expect.arrayContaining([kreditinstitut]),
				removed: { readings: [moneyBank] },
			},
		});
		expect(await knowledgeOf(storage, kreditinstitut)).toEqual({
			semanticRelations: { targetKind: "reading", synonym: [bench] },
		});
		expect(await recordOf(storage, sparkasseOnBank)).toEqual([]);

		const last = await planRemoveReading(storage, bench);
		await committed(storage, last);
		expect(last).toMatchObject({
			affected: {
				pendingIds: [sparkasseOnBank.locator.targetPendingId],
				removed: { lemmas: [bank], readings: [bench] },
			},
		});
		expect(await knowledgeOf(storage, sparkasse)).toBeUndefined();
		expect(await recordOf(storage, sparkasseOnBank)).toEqual([
			sparkasseOnBank,
		]);
		expect(await knowledgeOf(storage, kreditinstitut)).toEqual({
			semanticRelations: { targetKind: "reading" },
		});
	});
}
