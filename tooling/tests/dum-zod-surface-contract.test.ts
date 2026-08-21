import { expect, test } from "bun:test";
import {
	DUM_DANGEROUSLY_HEAVY_ZOD_SURFACES,
	DUM_OPERATIONAL_ZOD_FREE_EXPORT_SURFACES,
	DUM_PUBLIC_ZOD_SURFACES,
} from "../dum-zod-surface-contract";

function looksLikeSchemaExport(name: string): boolean {
	return (
		name.endsWith("Schema") ||
		name.endsWith("Schemas") ||
		name === "abstractSchemas" ||
		name.includes("SchemaTree") ||
		name.includes("SchemasFor")
	);
}

test("normal Zod surfaces expose only the frozen broad composition primitives", async () => {
	for (const [specifier, expectedExports] of Object.entries(
		DUM_PUBLIC_ZOD_SURFACES,
	)) {
		expect(Object.keys(await import(specifier)).sort()).toEqual(
			[...expectedExports].sort(),
		);
	}
});

test("heavyweight route trees require cost-bearing danger-zone names", async () => {
	for (const [specifier, expectedExports] of Object.entries(
		DUM_DANGEROUSLY_HEAVY_ZOD_SURFACES,
	)) {
		expect(specifier).toContain("dangerously-heavy");
		const actualExports = Object.keys(await import(specifier)).sort();
		expect(actualExports).toEqual([...expectedExports].sort());
		for (const exported of actualExports) {
			expect(exported).toMatch(/DangerouslyHeavy|dangerouslyHeavy/u);
			expect(exported).toMatch(/100MiBRss/u);
		}
	}
});

test("operational surfaces do not advertise Zod schemas", async () => {
	for (const specifier of DUM_OPERATIONAL_ZOD_FREE_EXPORT_SURFACES) {
		const schemaExports = Object.keys(await import(specifier)).filter(
			looksLikeSchemaExport,
		);
		expect(schemaExports, specifier).toEqual([]);
	}
});
