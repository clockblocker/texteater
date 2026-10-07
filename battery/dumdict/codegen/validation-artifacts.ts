import { fileURLToPath } from "node:url";
import { defineCodegen, formatTypeScript } from "codegen";
import {
	compileZodValidationArtifacts,
	emitLinkedValidationRegistry,
	type ZodValidationOperationRegistration,
} from "common-utils/validation-compiler";
import { registrations as dumlingOperations } from "dumling/codegen";
import { encodedValidation as dumlingValidation } from "dumling/validation-artifact";
import {
	knowledgeChangeSchema,
	pendingSemanticRelationSchema,
	readingKnowledgeSchema,
} from "dumrel/schema";
import { encodedValidation as dumrelValidation } from "dumrel/validation-artifact";
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
const generated = new URL("../src/generated/", import.meta.url);
export function validationRecipe() {
	return defineCodegen({
		inputs: {},
		outputs: { generated: { root: fileURLToPath(generated) } },
		build: async () => {
			const artifact = compileZodValidationArtifacts({
				schemas: allSchemas,
				operations,
			});
			const sources = {
				"linked-validation.ts": emitLinkedValidationRegistry([
					{
						owner: "dumling",
						registry: JSON.parse(dumlingValidation),
					},
					{ owner: "dumrel", registry: JSON.parse(dumrelValidation) },
					{ owner: "dumdict", registry: artifact },
				]),
				"validation-artifacts.ts": `// Generated canonical Dumdict validation. Run bun run generate:validation.\nexport const encodedDumdictValidationArtifacts: string = ${JSON.stringify(JSON.stringify(artifact))};\n`,
			};
			return Promise.all(
				Object.entries(sources).map(async ([name, source]) => ({
					id: name,
					to: { target: "generated" as const, path: name },
					content: await formatTypeScript(
						source,
						new URL(name, generated),
					),
					provenance: [],
					meta: null,
				})),
			);
		},
	});
}
