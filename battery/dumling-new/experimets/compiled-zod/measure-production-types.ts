import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const packageRoot = resolve(import.meta.dir, "../..");
const directory = join(import.meta.dir, "production-consumer");
await mkdir(directory, { recursive: true });
await writeFile(join(directory, "baseline.ts"), "export {};\n");
await writeFile(join(directory, "consumer.ts"), `
import { parseUnit, type Unit, type Surface } from "../../../dist/index.js";
type Noun = Unit<"Lemma", "de", "Lexeme", "NOUN">;
declare const noun: Noun;
const gender: "Fem" | "Masc" | "Neut" | null = noun.coreFeatures.gender;
declare const surface: Surface;
const form: string = surface.normalizedSurface;
// @ts-expect-error Invalid route.
type Invalid = Unit<"Lemma", "de", "Morpheme", "NOUN">;
const exact = parseUnit(null, {unitKind: "Lemma", language: "de", family: "Lexeme", kind: "NOUN"});
if (exact.success) { const value: Noun = exact.chain.value; }
const broad = parseUnit(null);
if (broad.success) {
 const chain = broad.chain;
 if (chain.unitKind === "Lemma" && chain.language === "de" && chain.family === "Lexeme" && chain.kind === "NOUN") {
  const value: Noun = chain.value;
 }
}
`);
for (const name of ["baseline", "consumer"]) {
 await writeFile(join(directory, `${name}.json`), JSON.stringify({
  compilerOptions: { noEmit: true, strict: true, skipLibCheck: true, target: "ES2022", module: "ESNext", moduleResolution: "Bundler", types: [] },
  files: [`${name}.ts`],
 }));
 const child = Bun.spawn([process.execPath, join(packageRoot, "../../node_modules/typescript/bin/tsc"), "-p", join(directory, `${name}.json`), "--extendedDiagnostics", "--listFiles"], { stdout: "pipe", stderr: "pipe" });
 const [output, error, exit] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
 if (exit) throw Error(output + error);
 if (/\/zod\/|\/schemas\//.test(output)) throw Error("Consumer loaded Zod declarations");
 await writeFile(join(import.meta.dir, `production-types-${name}.txt`), output);
 console.log(name, output.split("\n").filter(line => /[Mm]emory|[Cc]heck time|[Tt]otal time|[Ii]nstantiations/.test(line)).join("\n"));
}
