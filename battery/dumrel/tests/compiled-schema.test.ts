import { expect, test } from "bun:test";
import { required } from "common-utils";
import {
	ParsingError,
	parseValidationArtifact,
	type ValidationArtifact,
} from "common-utils/validation";
import { validationOperations } from "dumling/validation";
import * as schemas from "dumrel/schema";
import { encodedValidation } from "../src/generated/validation";

const registry = JSON.parse(encodedValidation) as {
	roots: Record<string, ValidationArtifact["root"]>;
	definitions: ValidationArtifact["definitions"];
};

import { samples } from "./compiled-schema-fixtures";

test("every generated root agrees with its public canonical schema, including normalization and recursive leaves", () => {
	expect(Object.keys(samples).sort()).toEqual(
		Object.keys(registry.roots).sort(),
	);
	for (const [root, examples] of Object.entries(samples)) {
		// biome-ignore lint/performance/noDynamicNamespaceImportAccess: generated root names intentionally select their matching public schemas
		const schema = schemas[`${root}Schema` as keyof typeof schemas];
		for (const input of [
			...examples,
			undefined,
			null,
			[],
			{},
			"",
			42,
			...examples
				.filter((v) => typeof v === "object" && !Array.isArray(v))
				.map((v) => ({ ...(v as object), unexpected: true })),
		]) {
			const canonical = schema.safeParse(input);
			const compiled = parseValidationArtifact(
				{
					version: 1,
					root: required(
						registry.roots[root],
						`Missing generated root: ${root}`,
					),
					definitions: registry.definitions,
				},
				input,
				validationOperations,
			);
			expect(
				!(compiled instanceof ParsingError),
				`${root}: ${JSON.stringify(input)}`,
			).toBe(canonical.success);
			if (canonical.success) expect(compiled).toEqual(canonical.data);
		}
	}
});

test("a Unit Shadow's Canonical Form normalizes as a Lemma's does", () => {
	const shadow = {
		language: "de",
		family: "Locution",
		kind: "ADP",
		canonicalForm: " um ... willen ",
	} as const;
	const normalized = { ...shadow, canonicalForm: "um … willen" };
	const compiled: unknown = parseValidationArtifact(
		{
			version: 1,
			root: required(registry.roots.unitShadow, "Missing unitShadow"),
			definitions: registry.definitions,
		},
		shadow,
		validationOperations,
	);
	expect(schemas.unitShadowSchema.parse(shadow)).toEqual(normalized);
	expect(compiled).toEqual(normalized);
});
