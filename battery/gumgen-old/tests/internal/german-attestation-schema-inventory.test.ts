import { describe, expect, test } from "bun:test";
import { encodedDumgenValidationArtifacts } from "../../src/generated/validation-artifacts";
import { canonicalGermanAttestationSchemas } from "../../src/schemas/german-attestation-schema";

describe("German Attestation schema inventory", () => {
	test("matches the generated closed 47-leaf inventory", () => {
		const actual = Object.keys(
			canonicalGermanAttestationSchemas,
		).toSorted();
		const generated =
			encodedDumgenValidationArtifacts.germanAttestationRouteKeys.split(
				"\n",
			);
		expect(actual).toHaveLength(47);
		expect(generated).toHaveLength(47);
		expect(generated).toEqual(actual);
		expect(new Set(generated).size).toBe(47);
	});
});
