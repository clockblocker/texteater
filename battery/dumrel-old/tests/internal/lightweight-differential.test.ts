import { describe, expect, test } from "bun:test";
import { ParsingError, parseValidationArtifact } from "common-utils";
import { compareDifferentialTarget } from "../../../../tooling/dum-runtime-verification/differential";
import {
	COVERED_DUMREL_DIFFERENTIAL_BEHAVIORS,
	DUMREL_DIFFERENTIAL_TARGETS,
	DUMREL_OPERATION_DIFFERENTIAL_COVERAGE,
	REQUIRED_DUMREL_DIFFERENTIAL_COVERAGE,
} from "../../../../tooling/dum-runtime-verification/differential-targets";
import { encodedDumrelValidationArtifacts } from "../../src/generated/validation-artifacts";
import { decodeDumrelValidationArtifact } from "../../src/parsing/lightweight-parsers";
import { dumrelValidationOperations } from "../../src/parsing/validation-operations";

describe("Dumrel generated validators", () => {
	test("bind every generated semantic operation to a runtime implementation", () => {
		expect(Object.keys(dumrelValidationOperations).toSorted()).toEqual([
			...encodedDumrelValidationArtifacts.requiredOperations,
		]);
		for (const name of encodedDumrelValidationArtifacts.requiredOperations) {
			expect(
				encodedDumrelValidationArtifacts.operationSignatures[name],
			).toBeDefined();
		}
	});

	test("covers every required operation and frozen semantic behavior", () => {
		expect(COVERED_DUMREL_DIFFERENTIAL_BEHAVIORS).toEqual(
			[...REQUIRED_DUMREL_DIFFERENTIAL_COVERAGE].toSorted(),
		);
		expect(
			Object.keys(DUMREL_OPERATION_DIFFERENTIAL_COVERAGE).toSorted(),
		).toEqual([...encodedDumrelValidationArtifacts.requiredOperations]);
		for (const coverage of Object.values(
			DUMREL_OPERATION_DIFFERENTIAL_COVERAGE,
		)) {
			expect(COVERED_DUMREL_DIFFERENTIAL_BEHAVIORS).toContain(coverage);
		}
	});

	test("detects a no-op NFC normalizer", () => {
		const target = DUMREL_DIFFERENTIAL_TARGETS.find(
			(candidate) =>
				candidate.id === "dumrel:parseAsSemanticRelationGraphReading",
		);
		if (target === undefined)
			throw new Error("Missing normalization target.");
		const result = compareDifferentialTarget({
			...target,
			lightweight: (input) =>
				parseValidationArtifact(
					decodeDumrelValidationArtifact(
						"parseAsSemanticRelationGraphReading",
					),
					input,
					{
						...dumrelValidationOperations,
						"dumrel.normalize-nfc": (value) => ({ value }),
					},
				),
		});
		expect(result.mismatches.length).toBeGreaterThan(0);
	});

	test("prefixes nested contextual issues in canonical child order", () => {
		const target = DUMREL_DIFFERENTIAL_TARGETS.find(
			(candidate) =>
				candidate.id === "dumrel:parseAsMorphologicalTreeStructure",
		);
		if (target === undefined) throw new Error("Missing structure target.");
		const fixture = target.representativeValues.find((value) => {
			if (
				value === null ||
				typeof value !== "object" ||
				!("input" in value)
			)
				return false;
			const input = value.input;
			return (
				input !== null &&
				typeof input === "object" &&
				"children" in input &&
				Array.isArray(input.children) &&
				input.children.length === 2
			);
		});
		if (fixture === undefined) throw new Error("Missing nested fixture.");
		const parsed = target.lightweight(fixture);
		if (!(parsed instanceof ParsingError)) {
			throw new Error("Expected nested contextual failure.");
		}
		expect(parsed.issues.map((issue) => issue.path)).toEqual([
			["children", 0, "unitShadow", "kind"],
			["children", 1, "reading", "lemma", "family"],
		]);
	});

	for (const target of DUMREL_DIFFERENTIAL_TARGETS) {
		test(`${target.id} matches canonical representatives and property cases`, () => {
			const result = compareDifferentialTarget(target);
			expect(result.representativeValueCount).toBeGreaterThanOrEqual(3);
			expect(result.propertyValueCount).toBe(64);
			expect(result.mismatches).toEqual([]);
		});
	}
});
