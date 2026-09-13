import { expect, test } from "bun:test";
import {
	ParsingError,
	parseValidationArtifact,
	type ValidationArtifact,
} from "common-utils";
import { validationOperations } from "dumling/validation";
import * as schemas from "dumrel/schema";
import { encodedValidation } from "../src/generated/validation";
import { normalizeText } from "../src/semantics";

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
					root: registry.roots[root]!,
					definitions: registry.definitions,
				},
				input,
				{
					...validationOperations,
					"dumrel.normalize-text": (value) => ({
						value: normalizeText(value as string),
					}),
				},
			);
			expect(
				!(compiled instanceof ParsingError),
				`${root}: ${JSON.stringify(input)}`,
			).toBe(canonical.success);
			if (canonical.success) expect(compiled).toEqual(canonical.data);
		}
	}
});
