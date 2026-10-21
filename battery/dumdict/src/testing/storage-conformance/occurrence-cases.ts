import { expect, test } from "bun:test";

import { createOwnedSurface, createReading, readingEntry } from "./fixtures";
import {
	type ConformanceStorage,
	commit,
	commitPlan,
	exactPending,
	run,
	seed,
	semanticConflict,
} from "./harness";
import {
	baenke,
	bank,
	banken,
	bankSingular,
	bench,
	benchParadigm,
	linkOf,
	moneyBank,
	moneyBankPending,
	respelledBaenke,
	surfaceEntry,
} from "./occurrence-fixtures";
import {
	planner,
	planRecord,
	planRemove,
	seedBank,
	storedLemma,
	storedReading,
	storedSurface,
} from "./occurrence-harness";

const r1 = linkOf("r1", bench, baenke);

async function record(
	storage: ConformanceStorage,
	link: ReturnType<typeof linkOf>,
	surface: Parameters<typeof planRecord>[2],
) {
	expect(
		await commitPlan(storage, await planRecord(storage, link, surface)),
	).toMatchObject({ status: "committed" });
}

async function remove(storage: ConformanceStorage, ref: string) {
	const outcome = await planRemove(storage, ref);
	expect(await commitPlan(storage, outcome)).toMatchObject({
		status: "committed",
	});
	return outcome;
}

/**
 * Registers the occurrence cases (system ADR 0043, ADR 0049): recording an
 * occurrence, its idempotence and rejection, racing writers, removal and
 * what it leaves behind, and forgetting a Surface unless it holds user text.
 */
export function describeOccurrenceConformance(
	createStorage: () => ConformanceStorage | Promise<ConformanceStorage>,
): void {
	test("records an occurrence's Surface and link in one commit, and again as nothing", async () => {
		const storage = await createStorage();
		await seedBank(storage);
		await record(storage, r1, baenke);

		expect((await storedReading(storage, bench))?.attestationLinks).toEqual(
			[r1],
		);
		expect(await storedSurface(storage, baenke)).toEqual(
			surfaceEntry(baenke),
		);
		const again = await planRecord(storage, r1, baenke);
		expect(again).toMatchObject({
			status: "planned",
			plan: { changes: [] },
		});
	});

	test("refuses a ref already attested with another Reading or Surface", async () => {
		const storage = await createStorage();
		await seedBank(storage);
		await record(storage, r1, baenke);

		for (const [link, surface] of [
			[linkOf("r1", moneyBank, banken), banken],
			[linkOf("r1", bench, bankSingular), bankSingular],
		] as const)
			expect(await planRecord(storage, link, surface)).toMatchObject({
				status: "rejected",
				code: "occurrenceAttestedElsewhere",
			});
		expect(await storedReading(storage, moneyBank)).toMatchObject({
			attestationLinks: [],
		});
	});

	test("a new Reading records its first occurrence, of a Surface its Lemma owns", async () => {
		const storage = await createStorage();
		await seed(storage, [
			{ type: "createLemma", record: { lemma: bank }, preconditions: [] },
			createReading(readingEntry(bench)),
			createOwnedSurface(surfaceEntry(banken)),
		]);
		await record(storage, r1, baenke);
		const draftOf = (ref: string) => ({
			draft: {
				reading: moneyBank,
				note: {
					attestedTranslations: [],
					attestationLinks: [linkOf(ref, moneyBank, banken)],
					notes: "",
				},
			},
		});
		const plan = async (request: ReturnType<typeof draftOf>) => {
			const context = await run(
				storage.loadReadingEntryContext(
					planner.contextRequest({ intent: "addNewNote", request }),
				),
			);
			if (context.intent !== "addNewNote")
				throw new Error("Expected an addNewNote context.");
			return planner.addNewNote(context, request);
		};

		expect(await plan(draftOf("r1"))).toMatchObject({
			status: "rejected",
			code: "occurrenceAttestedElsewhere",
		});
		expect(
			await commitPlan(storage, await plan(draftOf("r2"))),
		).toMatchObject({ status: "committed" });
		expect(
			(await storedReading(storage, moneyBank))?.attestationLinks,
		).toEqual([linkOf("r2", moneyBank, banken)]);
	});

	test("keeps one link per ref when two writers race", async () => {
		const storage = await createStorage();
		await seedBank(storage);
		const first = await planRecord(storage, r1, baenke);
		const second = await planRecord(
			storage,
			linkOf("r1", moneyBank, banken),
			banken,
		);

		expect(await commitPlan(storage, first)).toMatchObject({
			status: "committed",
		});
		expect(await commitPlan(storage, second)).toMatchObject({
			status: "conflict",
		});
		expect(
			(await storedReading(storage, moneyBank))?.attestationLinks,
		).toEqual([]);
		expect(await storedSurface(storage, banken)).toBeUndefined();
	});

	test("refuses a link whose ref is stored, or a removal of a link it does not hold", async () => {
		const storage = await createStorage();
		await seedBank(storage, [surfaceEntry(banken)]);
		await record(storage, r1, baenke);
		const patch = (
			kind: "addAttestationLink" | "removeAttestationLink",
			link: ReturnType<typeof linkOf>,
		) => ({
			type: "patchReading" as const,
			reading: link.reading,
			ops: [{ kind, link }],
			preconditions: [],
		});

		for (const change of [
			patch("addAttestationLink", linkOf("r1", moneyBank, banken)),
			patch("removeAttestationLink", linkOf("r1", moneyBank, banken)),
			patch("removeAttestationLink", linkOf("r2", bench, baenke)),
		])
			expect(await commit(storage, [change])).toMatchObject(
				semanticConflict,
			);
		expect((await storedReading(storage, bench))?.attestationLinks).toEqual(
			[r1],
		);
	});

	test("removing an occurrence keeps the Surface and Reading other links name", async () => {
		const storage = await createStorage();
		await seedBank(storage);
		const r2 = linkOf("r2", bench, baenke);
		await record(storage, r1, baenke);
		await record(storage, r2, baenke);

		const outcome = await remove(storage, "r1");
		expect(outcome).toMatchObject({
			affected: { removed: { attestationLinks: [r1] } },
		});
		expect((await storedReading(storage, bench))?.attestationLinks).toEqual(
			[r2],
		);
		expect(await storedSurface(storage, baenke)).toEqual(
			surfaceEntry(baenke),
		);
		const missing = await planRemove(storage, "r1");
		expect(missing).toMatchObject({
			status: "planned",
			plan: { changes: [] },
		});
	});

	test("removing a Reading's last occurrence removes it with its Knowledge, pending records and Licences", async () => {
		const storage = await createStorage();
		await seedBank(storage);
		await record(storage, r1, baenke);
		await record(storage, linkOf("r2", moneyBank, banken), banken);

		const outcome = await remove(storage, "r2");
		expect(outcome).toMatchObject({
			affected: {
				removed: {
					readings: [moneyBank],
					surfaceIds: [surfaceEntry(banken).id],
				},
			},
		});
		expect(await storedReading(storage, moneyBank)).toBeUndefined();
		expect(
			await exactPending(storage, [moneyBankPending.pending], moneyBank),
		).toEqual([]);
		expect(await storedSurface(storage, banken)).toBeUndefined();
		expect(await storedLemma(storage, bench)).toEqual({
			lemma: bank,
			paradigm: benchParadigm,
		});
		expect((await storedReading(storage, bench))?.attestationLinks).toEqual(
			[r1],
		);
	});

	test("removing a Lemma's last occurrence removes the Lemma, its Paradigm and its Surfaces", async () => {
		const storage = await createStorage();
		await seedBank(storage, [surfaceEntry(bankSingular)]);
		await record(storage, r1, baenke);
		await record(storage, linkOf("r2", moneyBank, banken), banken);
		await remove(storage, "r2");

		const outcome = await remove(storage, "r1");
		expect(outcome).toMatchObject({
			affected: { removed: { lemmas: [bank], readings: [bench] } },
		});
		expect(await storedLemma(storage, bench)).toBeUndefined();
		expect(await storedSurface(storage, bankSingular)).toBeUndefined();
	});

	test("forgets a Surface that loses its last link unless it holds user text", async () => {
		const storage = await createStorage();
		const noted = surfaceEntry(baenke, { notes: "my own note" });
		const translated = surfaceEntry(banken, {
			attestedTranslations: ["banks"],
		});
		await seedBank(storage, [noted, translated]);
		await record(storage, r1, baenke);
		await record(storage, linkOf("r2", bench, banken), banken);
		await record(storage, linkOf("r3", bench, bankSingular), bankSingular);
		// 🏦's one occurrence goes first, so 🪑 is the Lemma's last Reading.
		await record(storage, linkOf("r4", moneyBank, baenke), baenke);
		await remove(storage, "r4");

		for (const ref of ["r1", "r2", "r3"]) await remove(storage, ref);
		expect(await storedSurface(storage, baenke)).toEqual(noted);
		expect(await storedSurface(storage, banken)).toEqual(translated);
		expect(await storedSurface(storage, bankSingular)).toBeUndefined();
		// The Surfaces' user text keeps the Lemma without its Readings.
		expect(await storedReading(storage, bench)).toBeUndefined();
		expect(await storedLemma(storage, bench)).toEqual({ lemma: bank });
	});

	test("re-keys a Surface and the links naming it in one commit", async () => {
		const storage = await createStorage();
		const noted = surfaceEntry(baenke, { notes: "my own note" });
		await seedBank(storage, [noted]);
		await record(storage, r1, baenke);
		const respelled = respelledBaenke;
		const request = { rekeys: [{ from: noted.id, to: respelled }] };
		const slice = await run(
			storage.loadRekeySurfacesSlice(
				planner.rekeySurfacesSliceRequest(request),
			),
		);
		expect(
			await commitPlan(storage, planner.rekeySurfaces(slice, request)),
		).toMatchObject({ status: "committed" });

		expect(await storedSurface(storage, baenke)).toBeUndefined();
		expect(await storedSurface(storage, respelled)).toEqual({
			...surfaceEntry(respelled, { notes: "my own note" }),
		});
		expect((await storedReading(storage, bench))?.attestationLinks).toEqual(
			[linkOf("r1", bench, respelled)],
		);
	});
}
