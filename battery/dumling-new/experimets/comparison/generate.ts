import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const sizes = [100, 1000];
export const libraries = ["zod", "valibot", "arktype", "arri"] as const;
const q = JSON.stringify;
const kinds = ["Lemma", "Surface", "Reading", "Attestation"];
function route(i: number) { return { language: `l${i % 5}`, family: `F${Math.floor(i / 5) % 4}`, kind: `K${Math.floor(i / 20)}` }; }

for (const size of sizes) for (const lib of libraries) {
 const dir = join(import.meta.dir, "generated", `${lib}-${size}`);
 mkdirSync(dir, { recursive: true });
 writeFileSync(join(dir,"shared.ts"),readFileSync(join(import.meta.dir,"shared.ts"),"utf8"));
 const enumOf = (values: string[]) => lib === "zod" ? `z.enum(${q(values)})` : lib === "valibot" ? `v.picklist(${q(values)})` : lib === "arktype" ? `type(${q(values.map(q).join(" | "))})` : `a.stringEnum(${q(values)})`;
 const literal = (value: string) => enumOf([value]);
 const nullable = (s: string) => lib === "zod" ? `${s}.nullable()` : lib === "valibot" ? `v.nullable(${s})` : lib === "arktype" ? `${s}.or("null")` : `a.nullable(${s})`;
 const array = (s: string) => lib === "zod" ? `z.array(${s})` : lib === "valibot" ? `v.array(${s})` : lib === "arktype" ? `${s}.array()` : `a.array(${s})`;
 const string = lib === "zod" ? "z.string()" : lib === "valibot" ? "v.string()" : lib === "arktype" ? 'type("string")' : "a.string()";
 const object = (fields: Record<string, string>) => {
  const body = Object.entries(fields).map(([key,value]) => `${q(key)}:${value}`).join(",");
  return lib === "zod" ? `z.strictObject({${body}})` : lib === "valibot" ? `v.strictObject({${body}})` : lib === "arktype" ? `type({"+":"reject",${body}})` : `a.object({${body}},{isStrict:true})`;
 };
 const infer = (name: string) => lib === "zod" ? `z.output<typeof ${name}>` : lib === "valibot" ? `v.InferOutput<typeof ${name}>` : lib === "arktype" ? `typeof ${name}.infer` : `a.InferType<typeof ${name}>`;
 const lines = [lib === "zod" ? 'import {z} from "zod";' : lib === "valibot" ? 'import * as v from "valibot";' : lib === "arktype" ? 'import {type} from "arktype";' : 'import * as a from "@arrirpc/schema";', 'import {dispatch, type Result, type Expected} from "./shared.js";'];
 const entries: string[] = [];
 const typeEntries: string[] = [];
 for (let i=0;i<size;i++) {
  const r=route(i), prefix=`r${i}`, key=`${r.language}/${r.family}/${r.kind}`;
  lines.push(`const ${prefix}Core=${object({code:literal(prefix),gender:nullable(enumOf(["Fem","Masc","Neut"])),hyph:nullable(enumOf(["Yes"])),flags:array(enumOf(["Rare","Archaic"]))})};`);
  lines.push(`const ${prefix}Inflection=${object({case:nullable(enumOf(["Nom","Acc","Dat","Gen"])),number:nullable(enumOf(["Sing","Plur"])),person:nullable(enumOf(["1","2","3"]))})};`);
  lines.push(`const ${prefix}Lemma=${object({language:literal(r.language),family:literal(r.family),kind:literal(r.kind),canonicalForm:string,coreFeatures:`${prefix}Core`})};`);
  lines.push(`const ${prefix}Surface=${object({lemma:`${prefix}Lemma`,normalizedSurface:string,spelling:enumOf(["Canonical","Variant"]),inflectionalFeatures:nullable(`${prefix}Inflection`)})};`);
  lines.push(`const ${prefix}Reading=${object({lemma:`${prefix}Lemma`,emojiDescription:string})};`);
  lines.push(`const ${prefix}Attestation=${object({surface:`${prefix}Surface`,members:array(object({attested:string,orthography:enumOf(["Canonical","Variant"])})),realizationCoverage:enumOf(["Full","Partial"])})};`);
  entries.push(`${q(key)}:{${kinds.map(u=>`${u}:${prefix}${u}`).join(",")}}`);
  typeEntries.push(`${q(key)}:{${kinds.map(u=>`${u}:${infer(prefix+u)}`).join(";")}}`);
 }
 lines.push(`const registry={${entries.join(",\n")}};`);
 lines.push(`export type Units={${typeEntries.join(";\n")}};`);
 lines.push(`export type UnitKind="Lemma"|"Surface"|"Reading"|"Attestation";
export type Language=${Array.from({length:5},(_,i)=>q(`l${i}`)).join("|")};
export type Family="F0"|"F1"|"F2"|"F3";
export type Kind=${Array.from({length:size/20},(_,i)=>q(`K${i}`)).join("|")};
export type Unit<U extends UnitKind,L extends Language=Language,F extends Family=Family,K extends Kind=Kind> = Units[Extract<\`${'${L}/${F}/${K}'}\`,keyof Units>][U];
export function parseUnit<U extends UnitKind,L extends Language,F extends Family,K extends Kind>(input:unknown, expected:{unitKind:U;language:L;family:F;kind:K}):Result<Unit<U,L,F,K>>;
export function parseUnit(input:unknown):Result<Unit<UnitKind>>;
export function parseUnit(input:unknown,expected?:Expected):Result<unknown>{return dispatch(input,registry,parseSelected,expected);}
export const schemaCount=${size*4};`);
 const parse = lib === "zod" ? `const r=(schema as z.core.$ZodType);const result=z.safeParse(r,value);return result.success?{success:true,data:result.data}:{success:false,issues:result.error.issues};`
 : lib === "valibot" ? `const result=v.safeParse(schema as v.GenericSchema,value);return result.success?{success:true,data:result.output}:{success:false,issues:result.issues};`
 : lib === "arktype" ? `const result=(schema as (value:unknown)=>unknown)(value);return result instanceof type.errors?{success:false,issues:result}:{success:true,data:result};`
 : `const result=a.parse(schema as Parameters<typeof a.parse>[0],value);return result.success?{success:true,data:result.value}:{success:false,issues:result.errors};`;
 lines.push(`function parseSelected(schema:unknown,value:unknown):Result<unknown>{${parse}}`);
 writeFileSync(join(dir,"model.ts"),lines.join("\n")+"\n");
 const compilerOptions={strict:true,target:"ES2022",module:"ESNext",moduleResolution:"Bundler",skipLibCheck:true,types:[],lib:["ES2022"],declaration:true,emitDeclarationOnly:true,outDir:"declarations"};
 writeFileSync(join(dir,"author.json"),q({compilerOptions,files:["model.ts"]}));
 const consumer=`import {parseUnit,type Unit} from "./model.js";
export type Noun=Unit<"Lemma","l0","F0","K0">;
export type Surface=Unit<"Surface","l0","F0","K0">;
declare const noun:Noun;
const gender:"Fem"|"Masc"|"Neut"|null=noun.coreFeatures.gender;
// @ts-expect-error Exact route feature code.
const wrong:"r1"=noun.coreFeatures.code;
// @ts-expect-error Unsupported language.
type Unsupported=Unit<"Lemma","wrong","F0","K0">;
const result=parseUnit(null,{unitKind:"Lemma",language:"l0",family:"F0",kind:"K0"});
if(result.success){const code:"r0"=result.data.coreFeatures.code;}
export function broad(input:Unit<"Lemma">){if(input.language==="l0"&&input.family==="F0"&&input.kind==="K0"){const code:"r0"=input.coreFeatures.code;return code;}}
`;
 writeFileSync(join(dir,"consumer.ts"),consumer);
 writeFileSync(join(dir,"source.json"),q({compilerOptions:{...compilerOptions,declaration:false,emitDeclarationOnly:false,noEmit:true},files:["consumer.ts"]}));
}
console.log("Generated",sizes,"routes × four unit kinds for",libraries.join(", "));
