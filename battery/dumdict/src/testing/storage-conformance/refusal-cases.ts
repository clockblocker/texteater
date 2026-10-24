import { expect, test } from "bun:test";

import type { PlannedChangeOp } from "../../domain-types";
import {
	createLemma,
	createOwnedSurface,
	createReading,
	gehen,
	gehenReading,
	gehenSurfaceEntry,
	laufen,
	readingEntry,
} from "./fixtures";
import {
	type ConformanceStorage,
	commit,
	seed,
	semanticConflict,
	snapshot,
} from "./harness";
import { bank, bankParadigm, linkOf } from "./occurrence-fixtures";

const gehenLink = linkOf("r1", gehenReading, gehenSurfaceEntry.surface);

const deletions: PlannedChangeOp<"de">[] = [
	{ type: "deleteReading", reading: gehenReading, preconditions: [] },
	{
		type: "deleteOwnedSurface",
		surfaceId: gehenSurfaceEntry.id,
		ownerLemma: gehen,
		preconditions: [],
	},
	{ type: "deleteLemma", lemma: gehen, preconditions: [] },
];

const paradigmChanges: PlannedChangeOp<"de">[] = [
	{
		type: "createLemma",
		record: { lemma: bank, paradigm: bankParadigm },
		preconditions: [],
	},
	{
		type: "setLemmaParadigm",
		lemma: gehen,
		preconditions: [],
	},
];

/**
 * Registers what a store refuses: with `attestationLinks`, a deletion or a
 * Paradigm of a record it does not hold; without, every change that carries
 * or checks an Attestation Link and every deletion, which its own graph
 * owns; without `paradigms`, every Lemma Paradigm.
 */
export function describeRefusalConformance(
	createStorage: () => ConformanceStorage | Promise<ConformanceStorage>,
	options: {
		readonly attestationLinks: boolean;
		readonly paradigms: boolean;
	},
): void {
	if (options.attestationLinks)
		test("refuses deleting a record or setting a Paradigm it does not hold, writing nothing", async () => {
			const storage = await createStorage();
			await seed(storage, [createLemma(laufen)]);
			const before = await snapshot(storage);
			for (const change of [
				...deletions,
				...(options.paradigms ? paradigmChanges.slice(1) : []),
			])
				expect(await commit(storage, [change])).toMatchObject(
					semanticConflict,
				);
			expect(await snapshot(storage)).toEqual(before);
		});
	else
		test("refuses every change that carries or checks an Attestation Link, and every deletion", async () => {
			const storage = await createStorage();
			await seed(storage, [
				createLemma(gehen),
				createOwnedSurface(gehenSurfaceEntry),
			]);
			const linked = readingEntry(gehenReading, {
				attestationLinks: [gehenLink],
			});
			await expect(
				commit(storage, [createReading(linked)]),
			).rejects.toThrow();
			await seed(storage, [createReading(readingEntry(gehenReading))]);
			for (const kind of [
				"addAttestationLink",
				"removeAttestationLink",
			] as const)
				await expect(
					commit(storage, [
						{
							type: "patchReading",
							reading: gehenReading,
							ops: [{ kind, link: gehenLink }],
							preconditions: [],
						},
					]),
				).rejects.toThrow();
			for (const precondition of [
				{ kind: "attestationMissing", ref: "r1" },
				{ kind: "attestationLinkExists", link: gehenLink },
			] as const)
				await expect(
					commit(storage, [createLemma(laufen, [precondition])]),
				).rejects.toThrow();
			for (const change of deletions)
				await expect(commit(storage, [change])).rejects.toThrow();
		});

	if (!options.paradigms)
		test("refuses every Lemma Paradigm", async () => {
			const storage = await createStorage();
			await seed(storage, [createLemma(gehen)]);
			for (const change of paradigmChanges)
				await expect(commit(storage, [change])).rejects.toThrow();
		});
}
