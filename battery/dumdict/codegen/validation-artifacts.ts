import { readFile, writeFile } from "node:fs/promises";
import {
	knowledgeChangeSchema,
	pendingSemanticRelationSchema,
	readingKnowledgeSchema,
} from "dumrel/schema";
import {
	compileZodValidationArtifacts,
	emitLinkedValidationRegistry,
	type ZodValidationOperationRegistration,
} from "dumval/compiler";
import { registrations as dumlingOperations } from "../../dumling/codegen/operations.js";
import { encodedValidation as dumlingValidation } from "../../dumling/src/generated/validation.js";
import { formatTypeScript } from "../../dumrel/codegen/format-typescript.js";
import { encodedValidation as dumrelValidation } from "../../dumrel/src/generated/validation.js";
import { normalizeText } from "../../dumrel/src/semantics.js";
import { unitSchemas } from "../src/generated/unit-schemas.js";
import {
	commitChangesResultSchema,
	type DumdictSchemasFor,
	getDumdictSchemasFor,
} from "../src/schema.js";
import {
	dumdictNamedValidationErrors,
	dumdictNamedValidationPredicates,
	dumdictNamedValidationTransforms,
	retainCommitChangesRequest,
	retainDumdictPlan,
} from "../src/validation-semantics.js";

const operations: ZodValidationOperationRegistration[] = [
	...dumlingOperations,
	{
		construct: "overwrite",
		implementation: normalizeText,
		name: "dumrel.normalize-text",
		version: 1,
	},
	...Object.entries(dumdictNamedValidationPredicates).map(
		([name, implementation]) => ({
			construct: "custom" as const,
			implementation,
			error: dumdictNamedValidationErrors[
				name as keyof typeof dumdictNamedValidationErrors
			],
			name,
			version: 1,
		}),
	),
	...Object.entries(dumdictNamedValidationTransforms).map(
		([name, implementation]) => ({
			construct: "transform" as const,
			implementation,
			name,
			version: 1,
		}),
	),
	{
		construct: "transform",
		implementation: retainCommitChangesRequest,
		name: "dumdict.retain-commit-request",
		version: 1,
	},
	{
		construct: "transform",
		implementation: retainDumdictPlan,
		name: "dumdict.retain-plan",
		version: 1,
	},
];
type ParserName<Key extends string> = Key extends `${infer Name}Schema`
	? `parseAs${Capitalize<Name>}`
	: never;
function languageSchemas<L extends "de" | "en" | "he">(language: L) {
	type Schemas = {
		[Key in keyof DumdictSchemasFor<L> as `${ParserName<Key>}:${L}`]: DumdictSchemasFor<L>[Key];
	};
	return Object.fromEntries(
		Object.entries(getDumdictSchemasFor(language)).map(([name, schema]) => [
			`parseAs${name[0]?.toUpperCase()}${name.slice(1).replace(/Schema$/, "")}:${language}`,
			schema,
		]),
	) as Schemas;
}
export const canonicalDumdictValidationSchemas = {
	...languageSchemas("de"),
	...languageSchemas("en"),
	...languageSchemas("he"),
	parseAsCommitChangesResult: commitChangesResultSchema,
};
const allSchemas = {
	...canonicalDumdictValidationSchemas,
	"internal:knowledge-change": knowledgeChangeSchema,
	"internal:reading-knowledge": readingKnowledgeSchema,
	"internal:pending-semantic-relation": pendingSemanticRelationSchema,
	...Object.fromEntries(
		(["de", "en", "he"] as const).map((language) => [
			`internal:reading:${language}`,
			unitSchemas[language].reading,
		]),
	),
};
export async function generateValidation(check: boolean) {
	const artifact = compileZodValidationArtifacts({
		schemas: allSchemas,
		operations,
	});
	const linkedPath = new URL(
		"../src/generated/linked-validation.ts",
		import.meta.url,
	);
	const linkedOutput = await formatTypeScript(
		emitLinkedValidationRegistry([
			{ owner: "dumling", registry: JSON.parse(dumlingValidation) },
			{ owner: "dumrel", registry: JSON.parse(dumrelValidation) },
			{ owner: "dumdict", registry: artifact },
		]),
		linkedPath,
	);
	if (check) {
		if (
			(await readFile(linkedPath, "utf8").catch(() => "")) !==
			linkedOutput
		)
			throw Error("Stale Dumdict linked validation");
	} else await writeFile(linkedPath, linkedOutput);
	const path = new URL(
		"../src/generated/validation-artifacts.ts",
		import.meta.url,
	);
	const output = await formatTypeScript(
		`// Generated canonical Dumdict validation. Run bun run generate:validation.\nexport const encodedDumdictValidationArtifacts: string = ${JSON.stringify(JSON.stringify(artifact))};\n`,
		path,
	);
	if (check) {
		if ((await readFile(path, "utf8").catch(() => "")) !== output)
			throw Error("Stale Dumdict validation artifacts");
	} else await writeFile(path, output);
}
