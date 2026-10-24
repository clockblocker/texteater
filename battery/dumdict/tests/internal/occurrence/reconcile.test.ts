import { describe, expect, test } from "bun:test";
import { readingIdentityKey } from "dumling";
import {
	reconcileAttestationLinks,
	reconcileLemmaParadigms,
} from "../../../src";
import type { SerializedDictionaryNote } from "../../../src/dto";
import {
	parseAsCommitChangesRequest,
	unwrapDumdictParse,
} from "../../../src/parsing/lightweight-parsers";
import { createDumdictPlanner } from "../../../src/planner/planner";
import {
	baenke,
	bank,
	banken,
	bankParadigm,
	bankSingular,
	bench,
	benchParadigm,
	linkOf,
	moneyBank,
	surfaceEntry,
} from "../../../src/testing/storage-conformance/occurrence-fixtures";
import { createInMemoryTestStorage } from "../../support/in-memory-store";

const benchKey = readingIdentityKey(bench);
const moneyKey = readingIdentityKey(moneyBank);
const [first] = [benchKey, moneyKey].sort();

describe("reconcileAttestationLinks", () => {
	const a = linkOf("r1", bench, baenke);
	const b = linkOf("r1", moneyBank, banken);
	const c = linkOf("r0", moneyBank, banken);

	test("keeps one link per ref, the code-unit-smaller Reading key's", () => {
		const winner = first === benchKey ? a : b;
		const loser = first === benchKey ? b : a;
		expect(reconcileAttestationLinks([a, b, c])).toEqual({
			kept: [c, winner],
			dropped: [loser],
		});
	});

	test("merges equal links and never depends on input order", () => {
		const forward = reconcileAttestationLinks([a, b, c, a]);
		expect(reconcileAttestationLinks([c, b, a])).toEqual(forward);
		expect(reconcileAttestationLinks([a, a])).toEqual({
			kept: [a],
			dropped: [],
		});
	});

	test("of one Reading's two links for a ref, keeps the smaller Surface ID's", () => {
		const other = linkOf("r1", bench, bankSingular);
		const [smaller = a, larger = other] = [a, other].sort((left, right) =>
			left.surfaceId < right.surfaceId ? -1 : 1,
		);
		expect(reconcileAttestationLinks([larger, smaller])).toEqual({
			kept: [smaller],
			dropped: [larger],
		});
	});
});

describe("reconcileLemmaParadigms", () => {
	const moneyOnly = {
		dimensions: {
			plural: {
				variants: [
					{ id: "banken", value: "Banken", provenance: "Produced" },
				],
				licences: { [moneyKey]: ["banken"] },
			},
		},
	} as const;
	const readings = [bench, moneyBank];

	test("merges variants by id and Licences as a union per Reading, in any order", () => {
		const merged = reconcileLemmaParadigms({
			lemma: bank,
			readings,
			paradigms: [benchParadigm, moneyOnly],
		});
		expect(merged).toEqual({ success: true, value: bankParadigm });
		expect(
			reconcileLemmaParadigms({
				lemma: bank,
				readings,
				paradigms: [moneyOnly, benchParadigm],
			}),
		).toEqual(merged);
	});

	test("drops what no listed Reading licenses", () => {
		expect(
			reconcileLemmaParadigms({
				lemma: bank,
				readings: [bench],
				paradigms: [bankParadigm],
			}),
		).toEqual({ success: true, value: benchParadigm });
	});

	test("fails when the union breaks an invariant", () => {
		const noPlural = {
			dimensions: {
				plural: {
					variants: [
						{
							id: "NoPlural",
							value: "NoPlural",
							provenance: "Produced",
						},
					],
					licences: { [benchKey]: ["NoPlural"] },
				},
			},
		} as const;
		expect(
			reconcileLemmaParadigms({
				lemma: bank,
				readings,
				paradigms: [benchParadigm, noPlural],
			}).success,
		).toBe(false);
	});
});

describe("the reconcileAttestationLinks workflow", () => {
	const planner = createDumdictPlanner("de");
	const benchLink = linkOf("r1", bench, baenke);
	const moneyLink = linkOf("r1", moneyBank, banken);
	// Two devices recorded one occurrence under each sense, then synced.
	const merged: SerializedDictionaryNote<"de"> = {
		schemaVersion: 2,
		lemmaRecord: { lemma: bank, paradigm: bankParadigm },
		readingEntries: [
			{
				reading: bench,
				attestedTranslations: [],
				attestationLinks: [benchLink],
				notes: "",
			},
			{
				reading: moneyBank,
				attestedTranslations: [],
				attestationLinks: [moneyLink],
				notes: "",
			},
		],
		ownedSurfaceEntries: [surfaceEntry(baenke), surfaceEntry(banken)],
		pendingRelations: [],
	};

	test("removes the losing link as removeOccurrence would, and reports it", () => {
		const storage = createInMemoryTestStorage("de", [merged]);
		const request = { refs: ["r1"] };
		const outcome = planner.reconcileAttestationLinks(
			storage.loadOccurrenceSlice(
				planner.occurrenceSliceRequest(request),
			),
			request,
		);
		const loser = first === benchKey ? moneyLink : benchLink;
		expect(outcome).toMatchObject({
			status: "planned",
			affected: { removed: { attestationLinks: [loser] } },
		});
		if (outcome.status !== "planned") throw new Error("Expected a plan.");
		const plan = unwrapDumdictParse(
			parseAsCommitChangesRequest(outcome.plan, "de"),
		);
		expect(storage.commitChanges(plan)).toMatchObject({
			status: "committed",
		});
		const [note] = storage.loadAll();
		expect(
			note?.readingEntries.flatMap(
				({ attestationLinks }) => attestationLinks,
			),
		).toEqual([first === benchKey ? benchLink : moneyLink]);
		const again = planner.reconcileAttestationLinks(
			storage.loadOccurrenceSlice(
				planner.occurrenceSliceRequest(request),
			),
			request,
		);
		expect(again).toMatchObject({
			status: "planned",
			plan: { changes: [] },
		});
	});
});
