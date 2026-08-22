import { describe, expect, test } from "bun:test";
import { isDeepStrictEqual } from "node:util";
import {
	type Constraint,
	ParsingError,
	type ParsingIssue,
	parseValidationArtifact,
	type ValidationOperations,
} from "../../battery/common-utils/dist/index.js";
import { encodedDumdictValidationArtifacts } from "../../battery/dumdict/src/generated/validation-artifacts";
import { decodeDumdictValidationArtifact } from "../../battery/dumdict/src/parsing/lightweight-parsers";
import {
	createDumdictValidationOperations,
	dumdictValidationOperations,
} from "../../battery/dumdict/src/parsing/validation-operations";
import type { DumdictValidationRouteKey } from "../../battery/dumdict/src/parsing/validation-route-types";
import { encodedDumgenValidationArtifacts } from "../../battery/dumgen/src/generated/validation-artifacts";
import { decodeDumgenValidationArtifact } from "../../battery/dumgen/src/parsing/lightweight-parsers";
import { createDumgenValidationOperations } from "../../battery/dumgen/src/parsing/validation-operations";
import type { DumgenValidationRouteKey } from "../../battery/dumgen/src/parsing/validation-routes";
import { operationalEntrypoints } from "../dum-entrypoint-rss/inventory";
import { DUM_PARSER_INTERFACE_CONTRACT } from "../dum-parser-interface-contract";
import {
	compareDifferentialTarget,
	type DifferentialTarget,
} from "../dum-runtime-verification/differential";
import {
	COMMON_UTILS_DIFFERENTIAL_TARGETS,
	COVERED_DUMDICT_DIFFERENTIAL_BEHAVIORS,
	DUMDICT_DIFFERENTIAL_TARGETS,
	DUMDICT_OPERATION_FOCUSED_CASES,
	DUMGEN_DIFFERENTIAL_TARGETS,
	REQUIRED_DUMDICT_OPERATION_CASE_IDS,
} from "../dum-runtime-verification/differential-targets";
import {
	evaluateEntrypointRss,
	formatRssGateReport,
	PARSER_DIFFERENTIAL_POLICIES,
	RSS_ENTRYPOINT_POLICIES,
	RSS_IMPORT_BUDGET_BYTES,
	RSS_OPERATION_BUDGET_BYTES,
} from "../dum-runtime-verification/policy";

describe("differential validation CI contract", () => {
	test("holds every frozen parser to a strict differential target", () => {
		const frozenParsers = Object.entries(
			DUM_PARSER_INTERFACE_CONTRACT.packages,
		).flatMap(([packageName, parsers]) =>
			Object.keys(parsers).map(
				(parserName) => `${packageName}:${parserName}`,
			),
		);

		expect(Object.keys(PARSER_DIFFERENTIAL_POLICIES).sort()).toEqual(
			frozenParsers.sort(),
		);
		for (const policy of Object.values(PARSER_DIFFERENTIAL_POLICIES)) {
			expect(policy.status).toBe("strict");
		}
		const targetIds = new Set(
			[
				...COMMON_UTILS_DIFFERENTIAL_TARGETS,
				...DUMGEN_DIFFERENTIAL_TARGETS,
			].map(({ id }) => id),
		);
		for (const policy of Object.values(PARSER_DIFFERENTIAL_POLICIES)) {
			if (
				policy.status === "strict" &&
				policy.differentialTargetId.startsWith("dumgen:")
			)
				expect(targetIds.has(policy.differentialTargetId)).toBe(true);
		}
	});

	test("matches Zod output and ParsingError issues for representative and generated values", () => {
		for (const target of COMMON_UTILS_DIFFERENTIAL_TARGETS) {
			expect(compareDifferentialTarget(target)).toMatchObject({
				id: target.id,
				mismatches: [],
				propertyValueCount: 64,
			});
		}
	});

	test("executes focused Dumdict cases for every exact generated operation", () => {
		expect(Object.keys(DUMDICT_OPERATION_FOCUSED_CASES).toSorted()).toEqual(
			[
				...encodedDumdictValidationArtifacts.requiredOperations,
			].toSorted(),
		);
		for (const caseId of REQUIRED_DUMDICT_OPERATION_CASE_IDS)
			expect(COVERED_DUMDICT_DIFFERENTIAL_BEHAVIORS).toContain(caseId);
		for (const target of DUMDICT_DIFFERENTIAL_TARGETS) {
			expect(compareDifferentialTarget(target)).toMatchObject({
				id: target.id,
				mismatches: [],
				propertyValueCount: 64,
			});
		}
		expect(Object.keys(dumdictValidationOperations).toSorted()).toEqual(
			[
				...encodedDumdictValidationArtifacts.requiredOperations,
			].toSorted(),
		);
	});

	test("matches all frozen Dumgen parsers across every canonical route", () => {
		expect(
			DUMGEN_DIFFERENTIAL_TARGETS.map(({ id }) => id).toSorted(),
		).toEqual(
			Object.entries(DUM_PARSER_INTERFACE_CONTRACT.packages.dumgen)
				.map(([name]) => `dumgen:${name}`)
				.toSorted(),
		);
		for (const target of DUMGEN_DIFFERENTIAL_TARGETS) {
			expect(compareDifferentialTarget(target)).toMatchObject({
				id: target.id,
				mismatches: [],
				propertyValueCount: 64,
			});
		}
	});

	test("executes every exact Dumgen operation and kills focused semantic no-ops", () => {
		const executed = new Set<string>();
		const base = createDumgenValidationOperations();
		for (const target of DUMGEN_DIFFERENTIAL_TARGETS) {
			for (const representative of target.representativeValues) {
				const sample = representative as {
					input: unknown;
					route: DumgenValidationRouteKey;
				};
				const operations = new Proxy(base, {
					get(target, property) {
						if (typeof property === "string")
							executed.add(property);
						return Reflect.get(target, property);
					},
				});
				parseValidationArtifact(
					decodeDumgenValidationArtifact(sample.route),
					sample.input,
					operations,
				);
			}
		}
		expect([...executed].toSorted()).toEqual(
			[...encodedDumgenValidationArtifacts.requiredOperations].toSorted(),
		);

		for (const [route, input, operationName] of [
			[
				"parseAsGrammaticalRoute:de",
				{ family: "Morpheme", kind: "Prefix" },
				"dumgen.readonly.11",
			],
			[
				"parseAsSegmentationDecision",
				{ decision: "Unintelligible" },
				"dumgen.readonly.29",
			],
		] as const) {
			const artifact = decodeDumgenValidationArtifact(route);
			const parsed = parseValidationArtifact(artifact, input, base);
			expect(parsed).not.toBeInstanceOf(ParsingError);
			expect(Object.isFrozen(parsed)).toBe(true);
			const mutated = parseValidationArtifact(
				artifact,
				input,
				new Proxy(base, {
					get(target, property) {
						if (property === operationName)
							return (value: unknown) => ({ value });
						return Reflect.get(target, property);
					},
				}),
			);
			expect(mutated).not.toBeInstanceOf(ParsingError);
			expect(Object.isFrozen(mutated)).toBe(false);
		}

		for (const operationName of [
			"dumgen.transitive.custom.hasDistinctPair",
			"dumgen.transitive.custom.hasGermanVerbInflectionSignal",
			"dumgen.transitive.custom.hasMarkedSurfaceFeature",
		] as const) {
			let mismatchCount = 0;
			for (const target of DUMGEN_DIFFERENTIAL_TARGETS) {
				for (const representative of target.representativeValues) {
					const sample = representative as {
						input: unknown;
						route: DumgenValidationRouteKey;
					};
					const expected = target.canonical.safeParse(representative);
					const actual = parseValidationArtifact(
						decodeDumgenValidationArtifact(sample.route),
						sample.input,
						new Proxy(base, {
							get(target, property) {
								if (property === operationName)
									return (value: unknown) => ({ value });
								return Reflect.get(target, property);
							},
						}),
					);
					const matches = expected.success
						? !(actual instanceof ParsingError) &&
							isDeepStrictEqual(actual, expected.data)
						: actual instanceof ParsingError &&
							isDeepStrictEqual(
								actual.issues,
								expected.error.issues,
							);
					if (!matches) mismatchCount += 1;
				}
			}
			expect(mismatchCount).toBeGreaterThan(0);
		}

		const grammaticalTarget = DUMGEN_DIFFERENTIAL_TARGETS.find(
			({ id }) => id === "dumgen:parseAsGrammaticalResult",
		);
		if (grammaticalTarget === undefined)
			throw new Error(
				"Missing Dumgen Grammatical Result differential target.",
			);
		const focusedIssues: ParsingIssue[] =
			grammaticalTarget.representativeValues.flatMap((value) => {
				const result = grammaticalTarget.canonical.safeParse(value);
				return result.success ? [] : result.error.issues;
			});
		const expectedFocusedIssues: ParsingIssue[] = [
			{
				code: "custom",
				message: "Invalid input",
				path: [
					"attestation",
					"surface",
					"inflectionalFeatures",
					"gender",
				],
			},
			{
				code: "custom",
				message: "inflectionalFeatures must not be empty",
				path: ["attestation", "surface", "inflectionalFeatures"],
			},
			{
				code: "custom",
				message: "Feature bag must contain at least one marked value",
				path: ["attestation", "surface", "surfaceFeatures"],
			},
		];
		for (const expected of expectedFocusedIssues)
			expect(focusedIssues).toContainEqual(expected);
	});

	test("focused cases detect normalization, contextual, and discriminator no-ops", () => {
		const mismatchCount = (
			caseId: string,
			shouldMutate: (name: string) => boolean,
		): number => {
			let definitions: Readonly<Record<string, Constraint>> = {};
			let operations: ValidationOperations;
			const base = createDumdictValidationOperations((branch, value) =>
				parseValidationArtifact(
					{ definitions, root: branch, version: 1 },
					value,
					operations,
				),
			);
			operations = new Proxy(base, {
				get(target, property) {
					if (typeof property === "string" && shouldMutate(property))
						return (value: unknown) => ({ value });
					return Reflect.get(target, property);
				},
			});
			let mismatches = 0;
			for (const target of DUMDICT_DIFFERENTIAL_TARGETS) {
				for (const representative of target.representativeValues) {
					if (
						representative === null ||
						typeof representative !== "object" ||
						!("coverage" in representative) ||
						!Array.isArray(representative.coverage) ||
						!representative.coverage.includes(caseId) ||
						!("route" in representative) ||
						!("input" in representative)
					)
						continue;
					const route =
						representative.route as DumdictValidationRouteKey;
					const artifact = decodeDumdictValidationArtifact(route);
					definitions = artifact.definitions ?? {};
					const expected = target.canonical.safeParse(representative);
					const actual = parseValidationArtifact(
						artifact,
						representative.input,
						operations,
					);
					const matches = expected.success
						? !(actual instanceof ParsingError) &&
							isDeepStrictEqual(actual, expected.data)
						: actual instanceof ParsingError &&
							isDeepStrictEqual(
								actual.issues,
								expected.error.issues,
							);
					if (!matches) mismatches += 1;
				}
			}
			return mismatches;
		};

		expect(
			mismatchCount(
				"transitive-lexical-unit-shadow",
				(name) =>
					name === "dumdict.transitive.overwrite.dumrelTrimString",
			),
		).toBeGreaterThan(0);
		expect(
			mismatchCount(
				"transitive-lexical-unit-shadow",
				(name) => name === "dumdict.transitive.contextual.anonymous",
			),
		).toBeGreaterThan(0);
		expect(
			mismatchCount("invalid-discriminator", (name) =>
				name.startsWith("dumdict.discriminator."),
			),
		).toBeGreaterThan(0);
	});

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
		const policy = RSS_ENTRYPOINT_POLICIES["dumling/reading"];
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
		const policy = RSS_ENTRYPOINT_POLICIES.dumling;
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
