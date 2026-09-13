import { describe, expect, test } from "bun:test";
import { compareDifferentialTarget } from "../../../../tooling/dum-runtime-verification/differential";
import {
	COVERED_DUMLING_DIFFERENTIAL_BEHAVIORS,
	DUMLING_DIFFERENTIAL_TARGETS,
	REQUIRED_DUMLING_DIFFERENTIAL_COVERAGE,
} from "../../../../tooling/dum-runtime-verification/differential-targets";
import {
	collectDumlingValidationSchemas,
	compileDumlingValidationArtifacts,
} from "../../codegen/validation-artifacts";
import { encodedDumlingValidationArtifacts } from "../../src/generated/validation-artifacts";

describe("Dumling generated validators", () => {
	test("drives every retained constraint and registered semantic behavior", () => {
		expect(COVERED_DUMLING_DIFFERENTIAL_BEHAVIORS).toEqual(
			[...REQUIRED_DUMLING_DIFFERENTIAL_COVERAGE].toSorted(),
		);
	});

	test("keeps registered operation versions and custom messages fresh", () => {
		const compiled = compileDumlingValidationArtifacts();
		expect(
			encodedDumlingValidationArtifacts.operationSignatures as Readonly<
				Record<string, unknown>
			>,
		).toEqual(
			compiled.operationSignatures as Readonly<Record<string, unknown>>,
		);
		expect(
			Object.keys(collectDumlingValidationSchemas()).toSorted(),
		).toEqual(Object.keys(compiled.roots).toSorted());
	});
	for (const target of DUMLING_DIFFERENTIAL_TARGETS) {
		test(`${target.id} matches every canonical route and property case`, () => {
			const result = compareDifferentialTarget(target);
			expect(result.mismatches).toEqual([]);
			expect(result.propertyValueCount).toBe(64);
			expect(result.representativeValueCount).toBeGreaterThanOrEqual(100);
		});
	}
});
