import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { compileZodValidationArtifacts } from "codegen";
import { SurfaceKindSchema, UnitKindSchema } from "../src/schemas/units.js";
import { validationOperations } from "../src/validation/operations.js";
import { outputType } from "./emit-types.js";
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
for (const name of compiled.requiredOperations)
	if (!Object.hasOwn(validationOperations, name))
		throw Error(`Missing runtime operation ${name}`);
function rootFor(key: string) {
	const root = compiled.roots[key];
	if (!root) throw Error(`Missing compiled route ${key}`);
	return root;
}
const lines = routes.map(
	(route) =>
		`${JSON.stringify(route.key)}:{${kinds.map((kind) => `${kind}:${outputType(rootFor(`${kind}/${route.key}`), compiled.definitions)};`).join("\n")}};`,
);
const types = `// Generated from canonical Zod unit schemas. Run bun run generate.\nexport interface UnitMap {${lines.join("\n")}}\n
export type UnitKind=${kinds.map((value) => JSON.stringify(value)).join("|")};
export type SurfaceKind=${SurfaceKindSchema.options.map((value) => JSON.stringify(value)).join("|")};
export type Language=UnitMap[keyof UnitMap]["Lemma"]["language"];
export type Family<L extends Language=Language>=L extends Language ? { [R in keyof UnitMap]: UnitMap[R]["Lemma"]["language"] extends L ? UnitMap[R]["Lemma"]["family"] : never }[keyof UnitMap] : never;
export type Kind<L extends Language=Language,F extends Family<L>=Family<L>>=L extends Language ? F extends Family<L> ? { [R in keyof UnitMap]: UnitMap[R]["Lemma"] extends {language:L;family:F} ? UnitMap[R]["Lemma"]["kind"] : never }[keyof UnitMap] : never : never;
export type Unit<U extends UnitKind=UnitKind,L extends Language=Language,F extends Family<L>=Family<L>,K extends Kind<L,F>=Kind<L,F>>=UnitMap[Extract<\`\${L}/\${F}/\${K}\`,keyof UnitMap>][U];
export type DumlingUnit<U extends UnitKind=UnitKind,L extends Language=Language,F extends Family<L>=Family<L>,K extends Kind<L,F>=Kind<L,F>>=Unit<U,L,F,K>;
${kinds.map((kind) => `export type ${kind}<L extends Language=Language,F extends Family<L>=Family<L>,K extends Kind<L,F>=Kind<L,F>>=Unit<"${kind}",L,F,K>;`).join("\n")}
export type UnitRoute={ [R in keyof UnitMap]: Pick<UnitMap[R]["Lemma"],"language"|"family"|"kind"> & {unitKind:UnitKind} }[keyof UnitMap];
export type ParsedUnit<R extends UnitRoute=UnitRoute>=R extends UnitRoute ? { [U in R["unitKind"]]: {unitKind:U;language:R["language"];family:R["family"];kind:R["kind"];value:UnitMap[Extract<\`\${R["language"]}/\${R["family"]}/\${R["kind"]}\`,keyof UnitMap>][U]} }[R["unitKind"]] : never;
`;
const outputs = {
	"units.ts": types,
	"validation.ts": `// Generated from canonical Zod schemas. Run bun run generate.\nexport const encodedValidation: string = ${JSON.stringify(JSON.stringify(compiled))};\n`,
	"vocabulary.ts": `// Generated from canonical Zod enums. Run bun run generate.\nexport const UnitKind = ${JSON.stringify(UnitKindSchema.enum)} as const;\nexport const SurfaceKind = ${JSON.stringify(SurfaceKindSchema.enum)} as const;\nexport type UnitKind = (typeof UnitKind)[keyof typeof UnitKind];\nexport type SurfaceKind = (typeof SurfaceKind)[keyof typeof SurfaceKind];\n`,
};
const directory = new URL("../src/generated/", import.meta.url);
const check = process.argv.includes("--check");
await mkdir(directory, { recursive: true });
for (const [name, source] of Object.entries(outputs)) {
	const formatter = Bun.spawn(
		[
			fileURLToPath(
				new URL(
					"../../../node_modules/@biomejs/biome/bin/biome",
					import.meta.url,
				),
			),
			"format",
			`--stdin-file-path=${fileURLToPath(new URL(name, directory))}`,
		],
		{ stdin: "pipe", stdout: "pipe", stderr: "pipe" },
	);
	formatter.stdin.write(source);
	formatter.stdin.end();
	const [formatted, error, exit] = await Promise.all([
		new Response(formatter.stdout).text(),
		new Response(formatter.stderr).text(),
		formatter.exited,
	]);
	if (exit) throw Error(error);
	const path = new URL(name, directory);
	if (check) {
		if ((await readFile(path, "utf8").catch(() => "")) !== formatted)
			throw Error(
				`Stale generated artifact: ${name}; run bun run generate`,
			);
	} else await writeFile(path, formatted);
}
console.log(
	`${check ? "Verified" : "Generated"} ${Object.keys(schemas).length} unit routes from ${routes.length} feature-bag schemas`,
);
