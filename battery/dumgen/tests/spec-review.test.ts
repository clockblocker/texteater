import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	disagreementsFileName,
	evaluateExperiment,
	reviewEvaluationRun,
} from "dumgen/development";
import { loadSpecRecords } from "dumspec";
import {
	projectGrammarCases,
	readGrammarSidecar,
} from "../codegen/project-grammar-cases.js";
import {
	formatDisagreements,
	reviewRun,
} from "../src/evaluation/spec-review.js";
import nounProjection from "../src/generated/grammar-cases/lexeme/noun.json";

const origins = {
	"reviewed-pass": { record: "de/a", target: 0, status: "Reviewed" },
	"reviewed-fail": { record: "de/b", target: 1, status: "Reviewed" },
	"reviewed-error": { record: "de/c", target: 0, status: "Reviewed" },
	"draft-fail": { record: "de/d", target: 0, status: "Draft" },
};
const lemma = { canonicalForm: "Angst", coreFeatures: { gender: "Fem" } };
const run = {
	cases: [
		{
			caseId: "reviewed-pass",
			status: "Success",
			idealOutput: { lemma },
			output: { lemma },
			evaluation: { contractPass: true },
		},
		{
			caseId: "reviewed-fail",
			status: "Success",
			idealOutput: {
				lemma,
				surface: {
					inflectionalFeatures: { case: "Dat", number: "Sing" },
				},
				normalizedMembers: ["Angst", "vor"],
			},
			output: {
				lemma,
				surface: {
					inflectionalFeatures: { case: "Acc", number: "Sing" },
				},
				normalizedMembers: ["Angst"],
				articleEvidence: null,
			},
			evaluation: { contractPass: false },
		},
		{
			caseId: "reviewed-error",
			status: "ProviderFailure",
			idealOutput: { lemma },
		},
		{
			caseId: "draft-fail",
			status: "Success",
			idealOutput: { lemma },
			output: { decision: "Unresolved" },
			evaluation: { contractPass: false },
		},
		{
			caseId: "sidecar-owned",
			status: "Success",
			idealOutput: { decision: "Unresolved" },
			output: { decision: "Unresolved" },
			evaluation: { contractPass: true },
		},
	],
};

describe("spec review", () => {
	test("scores Reviewed, Draft and Dumgen-owned cases separately", () => {
		expect(reviewRun(run, origins).scores).toEqual({
			Reviewed: {
				total: 3,
				passed: 1,
				failed: 1,
				needsReview: 0,
				unscored: 1,
			},
			Draft: {
				total: 1,
				passed: 0,
				failed: 1,
				needsReview: 0,
				unscored: 0,
			},
			DumgenOwned: {
				total: 1,
				passed: 1,
				failed: 0,
				needsReview: 0,
				unscored: 0,
			},
		});
	});

	test("lists only failed Reviewed cases, one compact line each", () => {
		const { disagreements } = reviewRun(run, origins);
		expect(formatDisagreements(disagreements)).toBe(
			`${JSON.stringify({
				record: "de/b",
				target: 1,
				caseId: "reviewed-fail",
				expected: {
					"$.surface.inflectionalFeatures.case": "Dat",
					"$.normalizedMembers": ["Angst", "vor"],
				},
				produced: {
					"$.surface.inflectionalFeatures.case": "Acc",
					"$.normalizedMembers": ["Angst"],
					"$.articleEvidence": null,
				},
			})}\n`,
		);
		expect(formatDisagreements([])).toBe("");
	});

	test("a whole answer that differs is reported at the root", () => {
		const { disagreements } = reviewRun(
			{
				cases: [
					{
						caseId: "reviewed-fail",
						status: "Success",
						idealOutput: { lemma },
						output: "Unresolved",
						evaluation: { contractPass: false },
					},
				],
			},
			origins,
		);
		expect(disagreements).toEqual([
			{
				record: "de/b",
				target: 1,
				caseId: "reviewed-fail",
				expected: { $: { lemma } },
				produced: { $: "Unresolved" },
			},
		]);
	});
});

describe("case origins", () => {
	test("the projection carries each target's record, index and Review Status", () => {
		const records = loadSpecRecords();
		const origin =
			nounProjection.origins["grammar-de-noun-governed-angst-vor"];
		expect(origin).toEqual({
			record: "de/aus-angst-vor-hunden-bleibt-sie-zu-hause",
			target: 0,
			status: "Reviewed",
		});
		const drafted = projectGrammarCases(
			readGrammarSidecar(
				new URL(
					"../src/concrete-lang/de/grammatical-resolution/lexeme/noun/",
					import.meta.url,
				),
			),
			records.map((record) =>
				record.id === origin.record
					? { ...record, status: "Draft" as const }
					: record,
			),
		);
		expect(
			drafted.origins["grammar-de-noun-governed-angst-vor"]?.status,
		).toBe("Draft");
		expect(drafted.cases).toEqual(nounProjection.cases);
	});

	test("only spec-backed experiments are reviewed, slices included", () => {
		const cases: { caseId: string; status: string }[] = [];
		for (const experimentId of [
			"grammatical-resolution/de/lexeme/noun",
			"grammatical-resolution/de/lexeme/noun:governed",
			"sentence-analysis/de",
			"sentence-analysis/de:governed",
		])
			expect(
				reviewEvaluationRun({ manifest: { experimentId }, cases }),
			).toBeDefined();
		expect(
			reviewEvaluationRun({
				manifest: { experimentId: "intake" },
				cases,
			}),
		).toBeUndefined();
	});

	test("each spec-backed run writes its disagreement list beside the run", async () => {
		const outputDirectory = await mkdtemp(join(tmpdir(), "dumgen-review-"));
		try {
			const offline = async () => {
				throw Error("offline");
			};
			const run = await evaluateExperiment({
				experimentId: "grammatical-resolution/de/lexeme/noun:governed",
				execute: offline,
				judge: offline,
				sourceRevision: "spec-review-test",
				outputDirectory,
			});
			expect(reviewEvaluationRun(run)?.scores.Reviewed?.total).toBe(2);
			expect(
				await readFile(
					join(
						outputDirectory,
						run.manifest.runId,
						disagreementsFileName,
					),
					"utf8",
				),
			).toBe("");
		} finally {
			await rm(outputDirectory, { recursive: true, force: true });
		}
	});
});
