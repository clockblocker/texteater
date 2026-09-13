import { writeFile } from "node:fs/promises";
import { z } from "zod";
import { compileZodValidationArtifacts, type ZodValidationOperationRegistration } from "../../../codegen/src/zod-validation-artifact.ts";
import { nonEmptyFeatureBagSchema } from "../../src/schemas/universal/features/non-empty-feature-bag.ts";
import { loadRoutes } from "./source.ts";

const before = performance.now();
const routes = await loadRoutes();
const schemas = Object.fromEntries(routes.map(route => [route.key, route.schema]));
let unregisteredFailure = "";
try { compileZodValidationArtifacts({schemas, operations: []}); }
catch (error) { unregisteredFailure = String(error); }
if (!unregisteredFailure.includes("no explicitly named operation registration matched")) {
  throw Error(`Expected fail-closed custom refinement rejection; got ${unregisteredFailure}`);
}

// Only the known closure-free nonempty-bag predicate may cross into generated code.
// Identity registration is exact; serialized source equivalence restricts which checks register.
const exemplar = nonEmptyFeatureBagSchema(z.strictObject({ feature: z.string().nullable() }));
const exemplarCheck = (exemplar._zod.def as any).checks[0]._zod.def;
const predicateSource = exemplarCheck.fn.toString();
const expectedSource = "featureBag=>Object.values(featureBag).some(featureValue=>featureValue!==null)";
if (predicateSource.replace(/\s+/g, "").replace(/[()]/g, "") !== expectedSource.replace(/[()]/g, "")) {
  throw Error(`Known operation source changed; inspect closure safety before updating: ${predicateSource}`);
}
const operations: ZodValidationOperationRegistration[] = [];
const seen = new WeakSet<object>();
function walk(schema: any) {
  if (!schema?._zod || seen.has(schema)) return;
  seen.add(schema);
  const def = schema._zod.def;
  for (const check of def.checks ?? []) {
    const cd = check._zod.def;
    if (cd.check !== "custom") continue;
    if (cd.fn.toString() !== predicateSource || cd.error?.() !== exemplarCheck.error()) {
      throw Error("Unsupported custom operation: not the exact audited nonempty feature-bag predicate");
    }
    operations.push({construct: "custom", implementation: cd.fn, error: cd.error, name: `nonempty-${operations.length}`, version: 1});
  }
  for (const field of ["innerType", "element", "rest", "in", "out", "keyType", "valueType"]) walk(def[field]);
  for (const child of [...Object.values(def.shape ?? {}), ...(def.options ?? []), ...(def.items ?? [])]) walk(child);
}
for (const route of routes) walk(route.schema);
const compiled = compileZodValidationArtifacts({schemas, operations});
await writeFile(new URL("artifact.json", import.meta.url), JSON.stringify(compiled));
const names = JSON.stringify(compiled.requiredOperations);
await writeFile(new URL("operations.ts", import.meta.url), `// Generated from the audited source predicate; see generate.ts.\nimport type { ValidationOperations, ValidationOperation } from "../../../common-utils/src/validation-artifact.ts";\nconst predicate: (featureBag: Record<string, unknown>) => boolean = ${predicateSource};\nconst operation: ValidationOperation = (value: unknown) => predicate(value as Record<string, unknown>) ? { value } : { value, issues: [{ code: "custom", path: [], message: ${JSON.stringify(exemplarCheck.error())} }] };\nexport const operations: ValidationOperations = Object.fromEntries(${names}.map(name => [name, operation]));\n`);

// The compiler's closed constraint vocabulary already carries structural output shapes.
// Printing flat types from it avoids exporting z.output or Zod's declaration graph.
function outputType(node: any): string {
  switch(node[0]) {
    case "ref": return outputType(compiled.definitions[node[1]]);
    case "pipe": return outputType(node[1]); // Only audited non-transforming refinement exists here.
    case "literal": return JSON.stringify(node[1]);
    case "enum": return node[1].map((v: unknown) => JSON.stringify(v)).join(" | ");
    case "string": case "number": case "boolean": case "unknown": case "null": return node[0];
    case "nullable": return `(${outputType(node[1])}) | null`;
    case "optional": return `(${outputType(node[1])}) | undefined`;
    case "array": return `Array<${outputType(node[1])}>`;
    case "union": return node[1].map((v: unknown) => `(${outputType(v)})`).join(" | ");
    case "tuple": return `[${node[1].map(outputType).join(", ")}${node[2] ? `${node[1].length ? ", " : ""}...Array<${outputType(node[2])}>` : ""}]`;
    case "object": return `{ ${Object.entries(node[1]).map(([key, value]) => `${JSON.stringify(key)}: ${outputType(value)};`).join(" ")} }`;
    default: throw Error(`Unsupported flat-type emitter node ${node[0]}`);
  }
}
const rootTypes = routes.map(route => `${JSON.stringify(route.key)}: ${outputType(compiled.roots[route.key])};`).join("\n");
await writeFile(new URL("dto.ts", import.meta.url), `// Generated structural output types: no Zod imports.\nexport interface UnitMap {\n${rootTypes}\n}\nexport type Route = keyof UnitMap;\nexport type UnitKind = "Lemma" | "Surface" | "Reading" | "Attestation";\nexport type Unit<U extends UnitKind, R extends Route> = { [P in keyof UnitMap[R]]: P extends "unitKind" ? U : UnitMap[R][P] };\nexport type Language = UnitMap[Route]["language"];\nexport type Family<L extends Language> = { [R in Route]: UnitMap[R]["language"] extends L ? UnitMap[R]["family"] : never }[Route];\nexport type Kind<L extends Language, F extends Family<L>> = { [R in Route]: UnitMap[R] extends {language: L; family: F} ? UnitMap[R]["kind"] : never }[Route];\nexport type DumlingUnit<U extends UnitKind, L extends Language, F extends Family<L>, K extends Kind<L,F>> = Unit<U, Extract<\`\${L}/\${F}/\${K}\`, Route>>;\n`);

function fixture(schema: any): any {
  const def = schema._zod.def;
  switch(def.type) {
    case "literal": return def.values[0];
    case "enum": return Object.values(def.entries)[0];
    case "string": return "example";
    case "number": return 1;
    case "boolean": return true;
    case "null": return null;
    case "nullable": return fixture(def.innerType);
    case "object": return Object.fromEntries(Object.entries(def.shape).map(([name, value]) => [name, fixture(value)]));
    case "union": return fixture(def.options[0]);
    case "tuple": return def.items.map(fixture);
    default: throw Error(`Unsupported fixture type ${def.type}`);
  }
}
const fixtures = routes.map(route => fixture(route.schema));
for (let i = 0; i < routes.length; i++) routes[i]!.schema.parse(fixtures[i]);
await writeFile(new URL("fixtures.json", import.meta.url), JSON.stringify(fixtures));
const evidence = {schemaCount: routes.length, registeredOperations: operations.length, artifactBytes: Buffer.byteLength(JSON.stringify(compiled)), generationMs: performance.now()-before, unregisteredFailure};
await writeFile(new URL("generation.json", import.meta.url), JSON.stringify(evidence, null, 2));
console.log(JSON.stringify(evidence));

const imports = routes.map((route, index) => `import { ${route.exportName} as bag${index} } from "../../src/schemas/concrete-language/${route.sourcePath}";`).join("\n");
const entries = routes.map((route,index) => `[${JSON.stringify(route.key)}, z.strictObject({ language:z.literal(${JSON.stringify(route.language)}), family:z.literal(${JSON.stringify(route.family)}), kind:z.literal(${JSON.stringify(route.kind)}), unitKind:z.enum(["Lemma","Surface","Reading","Attestation"]), value:bag${index} })]`).join(",\n");
await writeFile(new URL("direct.ts", import.meta.url), `// Generated direct-Zod control with the same wrappers and static imports.\nimport { z } from "zod";\n${imports}\nconst registry = new Map<string, z.ZodType>([${entries}]);\nexport const schemaCount = registry.size;\nexport function parseUnit(input: unknown) {\n if (typeof input !== "object" || input === null || Array.isArray(input)) return {success:false as const, issues:[{code:"invalid_type",path:[],message:"Expected unit object"}]};\n const value = input as Record<string, unknown>;\n if ([value.language,value.family,value.kind].some(coordinate => typeof coordinate !== "string")) return {success:false as const,issues:[{code:"custom",path:[],message:"Coordinates must be strings"}]};\n const schema = registry.get(\`\${value.language}/\${value.family}/\${value.kind}\`);\n if (!schema) return {success:false as const, issues:[{code:"custom",path:[],message:"Unknown grammatical route"}]};\n const result = schema.safeParse(input);\n return result.success ? result : {success:false as const, issues:result.error.issues};\n}\n`);
await writeFile(new URL("public.d.ts", import.meta.url), `// Emitted operational interface. Runtime counterpart is index.ts / compiled.bundle.mjs.\nimport type { ParsingIssue } from "../../../common-utils/src/parsing-error.ts";\nimport type { Route, Unit, UnitKind } from "./dto.js";\nexport type { DumlingUnit, Unit, UnitKind, Route } from "./dto.js";\nexport type ParseResult<T> = {success: true; data: T} | {success: false; issues: readonly ParsingIssue[]};\ninterface AbstractUnit {language:string;family:string;kind:string;unitKind:UnitKind;value:unknown}\nexport declare const schemaCount: number;\nexport declare function parseUnit<R extends Route, U extends UnitKind>(input: unknown, expected: {route:R;unitKind:U}): ParseResult<Unit<U,R>>;\nexport declare function parseUnit(input:unknown): ParseResult<AbstractUnit>;\n`);
