import { describe, expect, test } from "bun:test";
import { ParsingError } from "common-utils";
import { operationalEntrypoints } from "../dum-entrypoint-rss/inventory";
import {
	compareDifferentialTarget,
	type DifferentialTarget,
} from "../dum-runtime-verification/differential";
import { DUM_DIFFERENTIAL_TARGETS } from "../dum-runtime-verification/differential-targets";
import {
	evaluateEntrypointRss,
	evaluateSharedRss,
	formatRssGateReport,
	RSS_ENTRYPOINT_POLICIES,
	RSS_SHARED_BUDGET_BYTES,
} from "../dum-runtime-verification/policy";

describe("current compiled validation", () => {
	test("all replacement validation roots agree with canonical schemas", () => {
		expect(DUM_DIFFERENTIAL_TARGETS).toHaveLength(546);
		for (const target of DUM_DIFFERENTIAL_TARGETS)
			expect(
				compareDifferentialTarget(target).mismatches,
				target.id,
			).toEqual([]);
	}, 30_000);
	test("fails on normalized output or issue drift", () => {
		const target: DifferentialTarget<string> = {
			id: "test:drift",
			canonical: {
				safeParse(input) {
					return typeof input === "string"
						? { success: true as const, data: input.trim() }
						: {
								success: false as const,
								error: {
									issues: [
										{
											code: "invalid_type",
											expected: "string",
											message: "expected string",
											path: [],
										},
									],
								},
							};
				},
			},
			lightweight(input) {
				return typeof input === "string"
					? input
					: new ParsingError([
							{
								code: "invalid_type",
								expected: "number",
								message: "expected number",
								path: [],
							},
						]);
			},
			propertyValues: [" padded ", false],
			representativeValues: [],
		};

		expect(compareDifferentialTarget(target).mismatches).toHaveLength(2);
	});
});

describe("operational RSS CI contract", () => {
	test("is part of the permanent repository validation command", async () => {
		const manifest = await Bun.file(
			new URL("../../package.json", import.meta.url),
		).json();
		expect(manifest.scripts["verify:dum-runtime"]).toBe(
			"bun tooling/dum-runtime-verification/verify.ts",
		);
		expect(manifest.scripts.validate).toContain(
			"tooling/dum-runtime-verification/verify.ts",
		);
	});

	test("has one exact policy for every operational public entrypoint", () => {
		expect(Object.keys(RSS_ENTRYPOINT_POLICIES).sort()).toEqual(
			operationalEntrypoints()
				.map(({ specifier }) => specifier)
				.sort(),
		);
	});

	test("shared chain has one inclusive 30 MiB ceiling after Effect", () => {
		expect(RSS_SHARED_BUDGET_BYTES).toBe(30 * 1024 * 1024);
		expect(evaluateSharedRss(RSS_SHARED_BUDGET_BYTES).passed).toBe(true);
		expect(evaluateSharedRss(RSS_SHARED_BUDGET_BYTES + 1).passed).toBe(
			false,
		);
		for (const invalid of [NaN, Infinity, -1])
			expect(evaluateSharedRss(invalid).passed).toBe(false);
	});
	test("isolated RSS is diagnostic while every surface still enforces schema isolation", () => {
		for (const policy of Object.values(RSS_ENTRYPOINT_POLICIES)) {
			const observation = {
				importOnlyDeltaBytes: 100 * 1024 * 1024,
				importPlusOperationDeltaBytes: 120 * 1024 * 1024,
				reachability: {
					heavyweightDependencies: [],
					schemaEntrypoints: [],
				},
			};
			expect(evaluateEntrypointRss(policy, observation)).toMatchObject({
				passed: true,
				status: "diagnostic",
			});
			for (const reachability of [
				{ heavyweightDependencies: ["zod"], schemaEntrypoints: [] },
				{
					heavyweightDependencies: [],
					schemaEntrypoints: ["dumrel/schema"],
				},
			])
				expect(
					evaluateEntrypointRss(policy, {
						...observation,
						reachability,
					}).passed,
				).toBe(false);
		}
	});

	test("reports absolute, empty-baseline, and delta RSS without conflating them", () => {
		const report = formatRssGateReport({
			baselineMedianBytes: 30 * 1024 * 1024,
			entries: [
				{
					absoluteImportOnlyMedianBytes: 32 * 1024 * 1024,
					absoluteImportPlusOperationMedianBytes: 33 * 1024 * 1024,
					importOnlyDeltaBytes: 2 * 1024 * 1024,
					importPlusOperationDeltaBytes: 3 * 1024 * 1024,
					passed: true,
					specifier: "dumling/reading",
					status: "diagnostic",
					violations: [],
				},
			],
		});
		expect(report).toContain("empty-module baseline: 30.000 MiB absolute");
		expect(report).toContain(
			"import-only: 32.000 MiB absolute; +2.000 MiB delta",
		);
		expect(report).toContain(
			"import+operation: 33.000 MiB absolute; +3.000 MiB delta",
		);
	});
});
