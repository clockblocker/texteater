import { describe, expect, test } from "bun:test";
import type {
	BlindCase,
	CatalogEntry,
	GoldCase,
	RelationalAssertion,
} from "./scorer";
import { scoreCase, scoreEvaluation } from "./scorer";

const catalogDocument = (await Bun.file(
	`${import.meta.dir}/catalog.json`,
).json()) as {
	entries: CatalogEntry[];
};
const blindDocument = (await Bun.file(
	`${import.meta.dir}/blind-input.json`,
).json()) as {
	cases: BlindCase[];
};
const goldDocument = (await Bun.file(
	`${import.meta.dir}/gold.json`,
).json()) as {
	cases: GoldCase[];
	relationalAssertions: RelationalAssertion[];
};

const catalogById = new Map(
	catalogDocument.entries.map((entry) => [entry.entryId, entry]),
);

function required<T>(value: T | undefined, label: string): T {
	if (value === undefined) throw new Error(`missing test fixture: ${label}`);
	return value;
}

describe("opaque Entry-identity scorer", () => {
	test("the frozen gold is exactly scoreable", () => {
		const score = scoreEvaluation(
			goldDocument.cases,
			blindDocument.cases,
			goldDocument.cases,
			catalogDocument.entries,
			goldDocument.relationalAssertions,
		);

		expect(score.totals).toMatchObject({
			cases: 21,
			valid: 21,
			invalid: 0,
			abstained: 0,
			exactCorrect: 21,
			falseExistingMerges: 0,
			fabricatedEntryIds: 0,
			descriptorDrifts: 0,
			relationsCorrect: 10,
			relationsTotal: 10,
		});
	});

	test("a fabricated opaque ID is invalid and scores zero", () => {
		const blindCase = blindDocument.cases[0];
		const goldCase = goldDocument.cases[0];
		const result = { ...goldCase, entryId: "ent_0000000000000000" };
		const score = scoreCase(result, blindCase, goldCase, catalogById);

		expect(score.valid).toBe(false);
		expect(score.exactCorrect).toBe(false);
		expect(score.fabricatedEntryId).toBe(true);
	});

	test("descriptor drift on an Existing decision is invalid", () => {
		const blindCase = blindDocument.cases[2];
		const goldCase = goldDocument.cases[2];
		const result = { ...goldCase, inherentFeatures: { gender: "Masc" } };
		const score = scoreCase(result, blindCase, goldCase, catalogById);

		expect(score.valid).toBe(false);
		expect(score.exactCorrect).toBe(false);
		expect(score.descriptorDrift).toBe(true);
	});

	test("a structured abstention is valid coverage but earns no correctness", () => {
		const blindCase = blindDocument.cases[0];
		const goldCase = goldDocument.cases[0];
		const score = scoreCase(
			{
				caseId: blindCase.caseId,
				decision: "Abstain",
				reason: "authority unavailable",
			},
			blindCase,
			goldCase,
			catalogById,
		);

		expect(score.valid).toBe(true);
		expect(score.abstained).toBe(true);
		expect(score.exactCorrect).toBe(false);
	});

	test("ProposeNew rejects a borrowed catalog ID", () => {
		const blindCase = required(
			blindDocument.cases.at(-1),
			"last blind case",
		);
		const goldCase = required(goldDocument.cases.at(-1), "last gold case");
		const score = scoreCase(
			{ ...goldCase, entryId: blindCase.candidateEntryIds[0] },
			blindCase,
			goldCase,
			catalogById,
		);

		expect(score.valid).toBe(false);
		expect(score.exactCorrect).toBe(false);
		expect(score.errors).toContain("ProposeNew requires entryId null");
	});

	test("a wrong Existing merge is counted separately", () => {
		const blindCase = required(
			blindDocument.cases.at(-1),
			"last blind case",
		);
		const goldCase = required(goldDocument.cases.at(-1), "last gold case");
		const catalogEntry = required(
			catalogById.get(blindCase.candidateEntryIds[0]),
			"missing-identity candidate",
		);
		const result = {
			caseId: blindCase.caseId,
			decision: "Existing",
			entryId: catalogEntry.entryId,
			family: catalogEntry.family,
			subkind: catalogEntry.subkind,
			citationForm: catalogEntry.citationForm,
			inherentFeatures: catalogEntry.inherentFeatures,
		};
		const score = scoreCase(result, blindCase, goldCase, catalogById);

		expect(score.valid).toBe(true);
		expect(score.falseExistingMerge).toBe(true);
		expect(score.exactCorrect).toBe(false);
	});
});
