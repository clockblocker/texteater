import { expect, test } from "bun:test";
import {
	coverageOf,
	formatCoverage,
} from "../../src/evaluation/spec-corpus/coverage.js";
import { loadGold } from "../../src/evaluation/spec-corpus/gold.js";
import { projectCorpus } from "../../src/evaluation/spec-corpus/projection.js";
import { segmentText } from "../../src/evaluation/spec-corpus/segment-text.js";

const gold = loadGold();

test("every loaded German record is a Segment.Text case or a reported skip", () => {
	const projected = projectCorpus(segmentText, gold);
	const german = gold.records.filter(({ language }) => language === "de");
	const cases = new Set(
		Object.values(projected.origins).map(({ record }) => record),
	);
	const skipped = new Set(projected.skipped.map(({ record }) => record));
	expect(
		german
			.map(({ id }) => id)
			.filter((id) => cases.has(id) === skipped.has(id)),
	).toEqual([]);
	expect(projected.reviewed.ids.length).toBeGreaterThan(0);
	expect(projected.excluded.ids.every((id) => id in projected.origins)).toBe(
		true,
	);
});

test("the coverage printout splits the German records by Review Status", () => {
	const coverage = coverageOf(
		projectCorpus(segmentText, gold),
		gold,
		segmentText.language,
	);
	const { Reviewed, Draft } = coverage.byStatus;
	expect(Reviewed.cases + Draft.cases).toBeGreaterThan(0);
	expect(formatCoverage(coverage)).toStartWith(
		"segment-text/de: Spec Records in de\n",
	);
});
