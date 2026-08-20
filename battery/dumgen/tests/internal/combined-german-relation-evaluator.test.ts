import { describe, expect, test } from "bun:test";
import type { LexicalUnitShadow } from "dumrel";

import type { GermanKnowledgeAnalysis } from "../../src/knowledge-generation/de/schemas";
import {
	analyzeCombinedGermanKnowledgeCase,
	evaluateCombinedGermanKnowledge,
} from "../../src/promptsmith/laboratory/experiments/knowledge-analysis/de/combined/evaluator";
import {
	createGermanRelationEvaluationReport,
	GERMAN_RELATION_GATE_THRESHOLDS,
	type GermanRelationEvaluationRun,
	germanRelationEvaluationReportSchema,
	MINIMUM_STABILITY_RUNS,
} from "../../src/promptsmith/laboratory/experiments/knowledge-analysis/de/combined/relation-report";
import { corpus } from "../../src/promptsmith/production/knowledge-analysis/de/combined/golden-corpus/corpus";

type CorpusEntry = (typeof corpus.collections.development.cases)[number];

describe("combined German relation case evaluator", () => {
	test("accepts every retained ideal while keeping exact equality diagnostic-only", () => {
		for (const caseId of corpus.collections.development.ids) {
			const entry = requiredCase(caseId);
			const analysis = analyze(caseId, entry, entry.idealOutput);
			expect(analysis).toMatchObject({
				contractPass: true,
				relationSemanticPass: true,
				relationExactDiagnosticPass: true,
				precisionPass: true,
				requiredTargetsPass: true,
				nullBehaviorPass: true,
				targetFamilyKindPass: true,
				kindConfusionPass: true,
				harmfulTargetsPass: true,
				unclassifiedTargetsPass: true,
			});
		}

		const caseId = "relation-adv-42-beginnen-alternative";
		const entry = requiredCase(caseId);
		const alternative = withRelation(entry, "synonym", [
			shadow("einsetzen", "Lexeme", "VERB"),
		]);
		expect(analyze(caseId, entry, alternative)).toMatchObject({
			contractPass: true,
			relationSemanticPass: true,
			relationExactDiagnosticPass: false,
		});
		expect(
			evaluateCombinedGermanKnowledge({
				caseId,
				input: entry.input,
				idealOutput: entry.idealOutput,
				output: alternative,
			}),
		).toMatchObject({
			contractPass: true,
			relationExactDiagnosticPass: false,
		});
	});

	test("classifies omissions, unknown extras, wrong Family/Kind, and null failures", () => {
		const caseId = "relation-adv-42-beginnen-alternative";
		const entry = requiredCase(caseId);
		const omitted = analyze(
			caseId,
			entry,
			withRelation(entry, "synonym", null),
		);
		expect(omitted).toMatchObject({
			contractPass: false,
			requiredTargetsPass: false,
			nullBehaviorPass: false,
		});
		expect(omitted.relations.synonym).toMatchObject({
			omissionCount: 1,
			recall: 0,
		});

		const unknown = analyze(
			caseId,
			entry,
			withRelation(entry, "synonym", [
				shadow("loslegen", "Lexeme", "VERB"),
			]),
		);
		expect(unknown).toMatchObject({
			contractPass: false,
			precisionPass: false,
			unclassifiedTargetsPass: false,
		});
		expect(unknown.relations.synonym).toMatchObject({
			falsePositiveCount: 1,
			unclassifiedFalsePositiveCount: 1,
			precision: 0,
		});

		const extra = analyze(
			caseId,
			entry,
			withRelation(entry, "synonym", [
				shadow("anfangen", "Lexeme", "VERB"),
				shadow("loslegen", "Lexeme", "VERB"),
			]),
		);
		expect(extra.relations.synonym).toMatchObject({
			truePositiveCount: 1,
			falsePositiveCount: 1,
			omissionCount: 0,
			precision: 0.5,
			recall: 1,
		});

		const wrongFamily = analyze(
			caseId,
			entry,
			withRelation(entry, "synonym", [
				shadow("anfangen", "Phraseme", "Collocation"),
			]),
		);
		expect(wrongFamily).toMatchObject({
			contractPass: false,
			targetFamilyKindPass: false,
		});
		expect(wrongFamily.relations.synonym?.wrongFamilyCount).toBe(1);

		const wrongKind = analyze(
			caseId,
			entry,
			withRelation(entry, "synonym", [
				shadow("anfangen", "Lexeme", "NOUN"),
			]),
		);
		expect(wrongKind.relations.synonym?.wrongKindCount).toBe(1);

		const nullCaseId = "relation-adv-18-johann-trivial";
		const nullEntry = requiredCase(nullCaseId);
		const filledNull = analyze(
			nullCaseId,
			nullEntry,
			withRelation(nullEntry, "hypernym", [
				shadow("Person", "Lexeme", "NOUN"),
			]),
		);
		expect(filledNull).toMatchObject({
			contractPass: false,
			nullBehaviorPass: false,
			harmfulTargetsPass: false,
		});
	});

	test("counts harmful targets and relation-kind confusions without aggregate hiding", () => {
		const caseId = "relation-adv-01-bank-finance";
		const entry = requiredCase(caseId);
		const output = withRelation(entry, "hypernym", [
			shadow("Kreditinstitut", "Lexeme", "NOUN"),
		]);
		const analysis = analyze(caseId, entry, output);
		expect(analysis).toMatchObject({
			contractPass: false,
			precisionPass: false,
			kindConfusionPass: false,
			harmfulTargetsPass: false,
		});
		expect(analysis.relations.hypernym).toMatchObject({
			falsePositiveCount: 1,
			harmfulFalsePositiveCount: 1,
		});
		expect(analysis.relations.hypernym?.confusions).toEqual([
			{
				target: shadow("Kreditinstitut", "Lexeme", "NOUN"),
				actualRelation: "hypernym",
				expectedRelation: "synonym",
			},
		]);
	});

	test("the historical shape-only 4/4 behavior now scores semantic 0/4", () => {
		const looseCases = [
			loose("relation-basic-03-pudel", "hypernym", "Tier", "NOUN"),
			loose(
				"relation-adv-01-bank-finance",
				"hypernym",
				"Kreditinstitut",
				"NOUN",
			),
			loose("relation-adv-12-hund-katze", "nearAntonym", "Katze", "NOUN"),
			loose(
				"relation-adv-45-fahrrad-granularity",
				"hypernym",
				"Verkehrsmittel",
				"NOUN",
			),
		];
		const analyses = looseCases.map(({ caseId, entry, output }) =>
			analyze(caseId, entry, output),
		);
		expect(
			analyses.filter(
				(analysis) =>
					analysis.requestShapePass &&
					analysis.crossAspectConsistencyPass &&
					analysis.relationKindsPass,
			),
		).toHaveLength(4);
		expect(
			analyses.filter(({ contractPass }) => contractPass),
		).toHaveLength(0);
	});
});

describe("German relation evaluation report", () => {
	test("requires three stable runs and passes every relation gate independently", () => {
		const oneRun = createGermanRelationEvaluationReport({
			runs: [idealRun("round-1")],
		});
		expect(oneRun.overallGatePass).toBe(false);
		expect(oneRun.runCount).toBe(1);
		for (const relation of oneRun.requestedRelations) {
			expect(oneRun.byRelation[relation]?.gate.minimumRunsPass).toBe(
				false,
			);
		}

		const report = createGermanRelationEvaluationReport({
			runs: [
				idealRun("round-1"),
				idealRun("round-2"),
				idealRun("round-3"),
			],
		});
		expect(report).toMatchObject({
			formatVersion: "german-relation-evaluation-v1",
			runCount: MINIMUM_STABILITY_RUNS,
			caseObservationCount: 150,
			contractPassCount: 150,
			exactDiagnosticPassCount: 150,
			structuralFailureCount: 0,
			unclassifiedMissCount: 0,
			overallGatePass: true,
		});
		expect(germanRelationEvaluationReportSchema.parse(report)).toEqual(
			report,
		);
		expect(Object.isFrozen(report)).toBe(true);
		for (const relation of report.requestedRelations) {
			expect(report.byRelation[relation]).toMatchObject({
				threshold: GERMAN_RELATION_GATE_THRESHOLDS[relation],
				metrics: {
					precision: 1,
					falsePositiveRate: 0,
					harmfulFalsePositiveRate: 0,
					recall: 1,
					nullAccuracy: 1,
					targetFamilyKindAccuracy: 1,
					stability: 1,
				},
				gate: { pass: true },
			});
		}
	});

	test("one relation failure defeats the overall gate and populates the confusion matrix", () => {
		const failed = idealRun("round-3");
		const bankIndex = failed.cases.findIndex(
			({ caseId }) => caseId === "relation-adv-01-bank-finance",
		);
		const bank = failed.cases[bankIndex];
		if (bank === undefined) throw new Error("Missing retained bank case.");
		const failedCases = [...failed.cases];
		failedCases[bankIndex] = {
			...bank,
			output: withRelation(requiredCase(bank.caseId), "hypernym", [
				shadow("Kreditinstitut", "Lexeme", "NOUN"),
			]),
		};
		const report = createGermanRelationEvaluationReport({
			runs: [
				idealRun("round-1"),
				idealRun("round-2"),
				{ runId: failed.runId, cases: failedCases },
			],
		});
		expect(report.overallGatePass).toBe(false);
		expect(report.byRelation.hypernym).toMatchObject({
			metrics: {
				falsePositiveCount: 1,
				harmfulFalsePositiveCount: 1,
				kindConfusionCount: 1,
			},
			gate: {
				precisionPass: false,
				harmfulFalsePositiveRatePass: false,
				kindConfusionPass: false,
				stabilityPass: false,
				pass: false,
			},
		});
		expect(report.kindConfusionMatrix.hypernym?.synonym).toBe(1);
		expect(report.byRelation.synonym?.gate.pass).toBe(true);
	});

	test("semantically accepted variation still fails the run-to-run stability gate", () => {
		const caseId = "relation-adv-42-beginnen-alternative";
		const varied = idealRun("round-3");
		const index = varied.cases.findIndex((item) => item.caseId === caseId);
		const item = varied.cases[index];
		if (item === undefined) throw new Error("Missing retained begin case.");
		const cases = [...varied.cases];
		cases[index] = {
			...item,
			output: withRelation(requiredCase(caseId), "synonym", [
				shadow("einsetzen", "Lexeme", "VERB"),
			]),
		};
		const report = createGermanRelationEvaluationReport({
			runs: [
				idealRun("round-1"),
				idealRun("round-2"),
				{ runId: varied.runId, cases },
			],
		});
		expect(report.contractPassCount).toBe(report.caseObservationCount);
		expect(report.overallGatePass).toBe(false);
		expect(report.byRelation.synonym).toMatchObject({
			metrics: {
				precision: 1,
				recall: 1,
			},
			gate: {
				precisionPass: true,
				recallPass: true,
				stabilityPass: false,
				pass: false,
			},
		});
		expect(report.byRelation.synonym?.metrics.stability).toBeLessThan(1);
	});

	test("unclassified false positives fail the report and duplicate run IDs are rejected", () => {
		const caseId = "relation-adv-42-beginnen-alternative";
		const failed = idealRun("round-3");
		const index = failed.cases.findIndex((item) => item.caseId === caseId);
		const item = failed.cases[index];
		if (item === undefined) throw new Error("Missing retained begin case.");
		const cases = [...failed.cases];
		cases[index] = {
			...item,
			output: withRelation(requiredCase(caseId), "synonym", [
				shadow("loslegen", "Lexeme", "VERB"),
			]),
		};
		const report = createGermanRelationEvaluationReport({
			runs: [
				idealRun("round-1"),
				idealRun("round-2"),
				{ runId: failed.runId, cases },
			],
		});
		expect(report).toMatchObject({
			overallGatePass: false,
			unclassifiedMissCount: 1,
		});
		expect(report.byRelation.synonym?.gate.unclassifiedPass).toBe(false);

		expect(() =>
			createGermanRelationEvaluationReport({
				runs: [idealRun("same"), idealRun("same"), idealRun("third")],
			}),
		).toThrow(/repeats run ID/);
	});
});

function analyze(
	caseId: string,
	entry: CorpusEntry,
	output: GermanKnowledgeAnalysis,
) {
	return analyzeCombinedGermanKnowledgeCase({
		caseId,
		input: entry.input,
		idealOutput: entry.idealOutput,
		output,
	});
}

function withRelation(
	entry: CorpusEntry,
	relation: keyof NonNullable<GermanKnowledgeAnalysis["semanticRelations"]>,
	value: readonly LexicalUnitShadow<"de">[] | null,
): GermanKnowledgeAnalysis {
	return {
		...entry.idealOutput,
		semanticRelations: {
			...entry.idealOutput.semanticRelations,
			[relation]: value,
		},
	};
}

function loose(
	caseId: string,
	relation: Parameters<typeof withRelation>[1],
	canonicalForm: string,
	kind: string,
) {
	const entry = requiredCase(caseId);
	return {
		caseId,
		entry,
		output: withRelation(entry, relation, [
			shadow(canonicalForm, "Lexeme", kind),
		]),
	};
}

function idealRun(runId: string): GermanRelationEvaluationRun {
	return {
		runId,
		cases: corpus.collections.development.ids.map((caseId) => {
			const entry = requiredCase(caseId);
			return {
				caseId,
				input: entry.input,
				idealOutput: entry.idealOutput,
				output: entry.idealOutput,
			};
		}),
	};
}

function requiredCase(caseId: string): CorpusEntry {
	const entry = corpus.cases[caseId];
	if (entry === undefined)
		throw new Error(`Missing retained case ${caseId}.`);
	return entry;
}

function shadow(
	canonicalForm: string,
	family: string,
	kind: string,
): LexicalUnitShadow<"de"> {
	return {
		language: "de",
		canonicalForm,
		family,
		kind,
	} as LexicalUnitShadow<"de">;
}
