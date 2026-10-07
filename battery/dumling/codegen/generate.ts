import { fileURLToPath } from "node:url";
import { defineCodegen, formatTypeScript, runCodegenCommand } from "codegen";
import {
	compileZodValidationArtifacts,
	emitInlineOutputType,
	emitLinkedValidationRegistry,
} from "common-utils/validation-compiler";
import { UnitKindSchema, VariantTagSchema } from "../src/schemas/unit-parts.js";
import { registrations } from "./operations.js";
import { loadRoutes } from "./routes.js";

const kinds = UnitKindSchema.options;
const routes = await loadRoutes();
const schemas = Object.fromEntries(
	routes.flatMap((route) =>
		kinds.map((kind) => [`${kind}/${route.key}`, route.schemas[kind]]),
	),
);
const compiled = compileZodValidationArtifacts({
	schemas,
	operations: registrations,
});
// Every Dumling operation keeps its input's structural type.
const typePreservingOperations = registrations.map(({ name }) => name);
const lines = routes.map(
	(route) =>
		`${JSON.stringify(route.key)}:{${kinds.map((kind) => `${kind}:${emitInlineOutputType({ artifact: compiled, root: `${kind}/${route.key}`, typePreservingOperations })};`).join("\n")}};`,
);
const types = `// Generated from canonical Zod unit schemas. Run bun run generate.\nexport interface UnitMap {${lines.join("\n")}}\n
export type UnitKind=${kinds.map((value) => JSON.stringify(value)).join("|")};
export type VariantTag=${VariantTagSchema.options.map((value) => JSON.stringify(value)).join("|")};
export type Language=UnitMap[keyof UnitMap]["Lemma"]["language"];
export type Family<L extends Language=Language>=L extends Language ? { [R in keyof UnitMap]: UnitMap[R]["Lemma"]["language"] extends L ? UnitMap[R]["Lemma"]["family"] : never }[keyof UnitMap] : never;
export type Kind<L extends Language=Language,F extends Family<L>=Family<L>>=L extends Language ? F extends Family<L> ? { [R in keyof UnitMap]: UnitMap[R]["Lemma"] extends {language:L;family:F} ? UnitMap[R]["Lemma"]["kind"] : never }[keyof UnitMap] : never : never;
export type Unit<U extends UnitKind=UnitKind,L extends Language=Language,F extends Family<L>=Family<L>,K extends Kind<L,F>=Kind<L,F>>=UnitMap[Extract<\`\${L}/\${F}/\${K}\`,keyof UnitMap>][U];
${kinds.map((kind) => `export type ${kind}<L extends Language=Language,F extends Family<L>=Family<L>,K extends Kind<L,F>=Kind<L,F>>=Unit<"${kind}",L,F,K>;`).join("\n")}
/** The Unit Kinds that carry features, so a route may give them Syncretisms (system ADR 0046). Reading and Attestation reach one through their Lemma or Surface. */
export type SyncretizableUnitKind="Lemma"|"Surface";
/** A Syncretism with its units (system ADR 0046): \`syncretic\` names the features its units disagree on and \`syncretized\` holds them. Only routes whose schema allows one have it. */
export type Syncretism<U extends SyncretizableUnitKind=SyncretizableUnitKind,L extends Language=Language,F extends Family<L>=Family<L>,K extends Kind<L,F>=Kind<L,F>>=Unit<U,L,F,K> extends infer T ? T extends {syncretic?:infer S;syncretized?:infer V} ? "syncretized" extends keyof T ? {[P in keyof T as P extends "syncretic"|"syncretized" ? never : P]:T[P]}&{syncretic:Exclude<S,undefined>;syncretized:Exclude<V,undefined>} : never : never : never;
/** A Syncretism without its units: what a classifier answers. It keeps \`syncretic\`, so it has the Syncretism's identity (system ADR 0046). */
export type SyncretismView<U extends SyncretizableUnitKind=SyncretizableUnitKind,L extends Language=Language,F extends Family<L>=Family<L>,K extends Kind<L,F>=Kind<L,F>>=Unit<U,L,F,K> extends infer T ? T extends {syncretic?:infer S} ? "syncretic" extends keyof T ? {[P in keyof T as P extends "syncretic"|"syncretized" ? never : P]:T[P]}&{syncretic:Exclude<S,undefined>} : never : never : never;
export type UnitRoute={ [R in keyof UnitMap]: Pick<UnitMap[R]["Lemma"],"language"|"family"|"kind"> & {unitKind:UnitKind} }[keyof UnitMap];
// Distributes over R without re-checking each route against UnitRoute: that
// check relates every route to the whole union and grows cubically with routes.
export type ParsedUnit<R extends UnitRoute=UnitRoute>=R extends unknown ? { [U in R["unitKind"]]: {unitKind:U;language:R["language"];family:R["family"];kind:R["kind"];value:UnitMap[Extract<\`\${R["language"]}/\${R["family"]}/\${R["kind"]}\`,keyof UnitMap>][U]} }[R["unitKind"]] : never;
`;
const outputs = {
	"linked-validation.ts": emitLinkedValidationRegistry([
		{ owner: "dumling", registry: compiled },
	]),
	"units.ts": types,
	"validation.ts": `// Generated from canonical Zod schemas. Run bun run generate.\nexport const encodedValidation: string = ${JSON.stringify(JSON.stringify(compiled))};\n`,
	...Object.fromEntries(
		routes.map((route) => [
			`schemas/${route.modulePath.replace(/\.js$/, ".ts")}`,
			`// Generated concrete schemas. Run bun run generate.\nimport type {Assert} from "common-utils";\nimport type {z} from "zod";\nimport {${route.exportName} as featureBags} from "../../../../schemas/concrete-language/${route.modulePath}";\nimport type {IsUniversalFeatureBags} from "../../../../schemas/universal/features/catalog.js";\nimport {buildUnitSchemas} from "../../../../schemas/units.js";\n// The route's Feature Bags draw only on the Feature Pool (system ADR 0032).\ntype _InFeaturePool=Assert<IsUniversalFeatureBags<z.infer<typeof featureBags>>>;\nconst schemas=buildUnitSchemas(${JSON.stringify({ language: route.language, family: route.family, kind: route.kind })},featureBags.shape.core,${Object.hasOwn(route.bag.shape, "inflectional") ? "featureBags.shape.inflectional" : "undefined"});\nexport const lemmaSchema=schemas.Lemma;\nexport const surfaceSchema=schemas.Surface;\nexport const readingSchema=schemas.Reading;\nexport const attestationSchema=schemas.Attestation;\n`,
		]),
	),
};
// The `dumling/codegen` route manifest: every route as plain data, so sibling
// generators enumerate routes without reading this package's file tree.
const manifest = `// Generated from Dumling's concrete-language schemas. Run bun run generate.\nexport const routes=[${routes.map((route) => JSON.stringify({ language: route.language, family: route.family, kind: route.kind, schemaPath: route.modulePath.replace(/\.js$/, "") })).join(",")}] as const;\n`;
const roots = {
	generated: new URL("../src/generated/", import.meta.url),
	manifest: new URL("generated/", import.meta.url),
};
const emitted: { target: keyof typeof roots; path: string; source: string }[] =
	[
		...Object.entries(outputs).map(([path, source]) => ({
			target: "generated" as const,
			path,
			source,
		})),
		{ target: "manifest", path: "routes.ts", source: manifest },
	];
const recipe = defineCodegen({
	inputs: {},
	outputs: {
		generated: {
			root: fileURLToPath(roots.generated),
			// Ownership retires the schema module of a removed route.
			ownership: {
				manifest: fileURLToPath(
					new URL("src-generated.ownership.json", roots.manifest),
				),
			},
		},
		manifest: { root: fileURLToPath(roots.manifest) },
	},
	build: () =>
		Promise.all(
			emitted.map(async ({ target, path, source }) => ({
				id: `${target}/${path}`,
				to: { target, path },
				content: await formatTypeScript(
					source,
					new URL(path, roots[target]),
				),
				provenance: [],
				meta: null,
			})),
		),
});
await runCodegenCommand(recipe, { label: "Dumling" });
