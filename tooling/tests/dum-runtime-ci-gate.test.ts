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
	formatRssGateReport,
	RSS_ENTRYPOINT_POLICIES,
	RSS_IMPORT_BUDGET_BYTES,
	RSS_OPERATION_BUDGET_BYTES,
} from "../dum-runtime-verification/policy";

describe("current compiled validation", () => {
	test("all replacement validation roots agree with canonical schemas", () => {
		expect(DUM_DIFFERENTIAL_TARGETS).toHaveLength(563);
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

	test("strict surfaces keep imports below 5 MiB and operations at or below 5.3 MiB", () => {
		const policy = RSS_ENTRYPOINT_POLICIES["dumling/validation"];
		expect(policy.status).toBe("strict");
		expect(
			evaluateEntrypointRss(policy, {
				importOnlyDeltaBytes: RSS_IMPORT_BUDGET_BYTES - 1,
				importPlusOperationDeltaBytes: RSS_OPERATION_BUDGET_BYTES,
				reachability: {
					heavyweightDependencies: [],
					schemaEntrypoints: [],
				},
			}),
		).toMatchObject({ passed: true, status: "strict" });
		expect(
			evaluateEntrypointRss(policy, {
				importOnlyDeltaBytes: RSS_IMPORT_BUDGET_BYTES,
				importPlusOperationDeltaBytes: RSS_OPERATION_BUDGET_BYTES,
				reachability: {
					heavyweightDependencies: [],
					schemaEntrypoints: [],
				},
			}).passed,
		).toBe(false);
		expect(
			evaluateEntrypointRss(policy, {
				importOnlyDeltaBytes: RSS_IMPORT_BUDGET_BYTES - 1,
				importPlusOperationDeltaBytes: RSS_OPERATION_BUDGET_BYTES + 1,
				reachability: {
					heavyweightDependencies: [],
					schemaEntrypoints: [],
				},
			}).passed,
		).toBe(false);
	});

	test("the migrated Dumling root is held to the strict RSS and reachability contract", () => {
		const policy = RSS_ENTRYPOINT_POLICIES["dumling"];
		expect(policy.status).toBe("strict");
		expect(
			evaluateEntrypointRss(policy, {
				importOnlyDeltaBytes: RSS_IMPORT_BUDGET_BYTES - 1,
				importPlusOperationDeltaBytes: RSS_OPERATION_BUDGET_BYTES,
				reachability: {
					heavyweightDependencies: [],
					schemaEntrypoints: [],
				},
			}),
		).toMatchObject({ passed: true, status: "strict" });
		expect(
			evaluateEntrypointRss(policy, {
				importOnlyDeltaBytes: RSS_IMPORT_BUDGET_BYTES,
				importPlusOperationDeltaBytes: RSS_OPERATION_BUDGET_BYTES,
				reachability: {
					heavyweightDependencies: ["zod"],
					schemaEntrypoints: [],
				},
			}).passed,
		).toBe(false);
	});

	test("the migrated Dumrel root is held to the strict RSS and reachability contract", () => {
		const policy = RSS_ENTRYPOINT_POLICIES.dumrel;
		expect(policy.status).toBe("strict");
		expect(
			evaluateEntrypointRss(policy, {
				importOnlyDeltaBytes: RSS_IMPORT_BUDGET_BYTES - 1,
				importPlusOperationDeltaBytes: RSS_OPERATION_BUDGET_BYTES,
				reachability: {
					heavyweightDependencies: [],
					schemaEntrypoints: [],
				},
			}),
		).toMatchObject({ passed: true, status: "strict" });
		expect(
			evaluateEntrypointRss(policy, {
				importOnlyDeltaBytes: RSS_IMPORT_BUDGET_BYTES - 1,
				importPlusOperationDeltaBytes: RSS_OPERATION_BUDGET_BYTES + 1,
				reachability: {
					heavyweightDependencies: [],
					schemaEntrypoints: ["dumrel/schema"],
				},
			}).passed,
		).toBe(false);
	});

	test("Effect workflows report RSS without weakening heavyweight or schema isolation", () => {
		const policy = RSS_ENTRYPOINT_POLICIES.dumgen;
		expect(policy.status).toBe("effect-workflow");

		const measuredWorkflow = {
			importOnlyDeltaBytes: 32 * 1024 * 1024,
			importPlusOperationDeltaBytes: 32 * 1024 * 1024,
		};
		expect(
			evaluateEntrypointRss(policy, {
				...measuredWorkflow,
				reachability: {
					heavyweightDependencies: [],
					schemaEntrypoints: [],
				},
			}),
		).toMatchObject({ passed: true, status: "effect-workflow" });

		for (const reachability of [
			{ heavyweightDependencies: ["zod"], schemaEntrypoints: [] },
			{
				heavyweightDependencies: [],
				schemaEntrypoints: ["dumgen/schema"],
			},
		]) {
			expect(
				evaluateEntrypointRss(policy, {
					...measuredWorkflow,
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
					status: "strict",
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
