import { expect, test } from "bun:test";
import { z } from "zod";
import { compileZodValidationArtifacts } from "../../../codegen/src/zod-validation-artifact.ts";
import { parseValidationArtifact } from "../../../common-utils/src/validation-artifact.ts";
import { ParsingError } from "../../../common-utils/src/parsing-error.ts";
import { parseUnit, schemaCount } from "./index.ts";
import { parseUnit as direct } from "./direct.ts";
import { samples, sample } from "./fixtures.ts";

let compared = 0;
function compare(input: unknown) {
  const compiled = parseUnit(input);
  const canonical = direct(input);
  compared++;
  expect(compiled.success).toBe(canonical.success);
  if (compiled.success && canonical.success) expect(compiled.data).toEqual(canonical.data);
  return compiled;
}
function mutations(value: unknown, path: (string|number)[] = []): {path: (string|number)[]; replacement: unknown}[] {
  const result = [{path, replacement: undefined}, {path, replacement: "INVALID_FEATURE_VALUE"}, {path, replacement: null}];
  if (Array.isArray(value)) {
    result.push({path, replacement: []});
    for (let i=0; i<value.length; i++) result.push(...mutations(value[i], [...path,i]));
  } else if (value !== null && typeof value === "object") {
    result.push({path, replacement: {...value, __unknown: "strictness"}});
    result.push({path, replacement: Object.fromEntries(Object.keys(value).map(key => [key,null]))});
    for (const [key, child] of Object.entries(value)) result.push(...mutations(child, [...path,key]));
  }
  return result;
}
function replaced(input: unknown, path: (string|number)[], replacement: unknown): unknown {
  if (!path.length) return replacement;
  const output = structuredClone(input) as any;
  let current = output;
  for (const key of path.slice(0,-1)) current = current[key];
  current[path.at(-1)!] = replacement;
  return output;
}

test("all 100 actual bags match Zod for four envelope tags and malformed feature paths", () => {
  expect(schemaCount).toBe(100);
  compare({language:Symbol("bad"),family:"Lexeme",kind:"NOUN"});
  for (const input of samples) {
    expect(compare(input).success).toBe(true);
    for (const unitKind of ["Lemma","Surface","Reading","Attestation"]) expect(compare({...input as object, unitKind}).success).toBe(true);
    for (const mutation of mutations(input)) compare(replaced(input, mutation.path, mutation.replacement));
  }
  console.log(`Compared ${compared} actual-bag cases`);
});

test("actual nonempty inflectional refinement and strictness are retained", () => {
  const noun = structuredClone(sample()) as any;
  noun.value.inflectional = {case:null,number:null};
  const rejected = compare(noun);
  expect(rejected.success).toBe(false);
  if (!rejected.success) expect(rejected.issues.some(issue => issue.code === "custom" && issue.path.join(".") === "value.inflectional")).toBe(true);
  noun.value.inflectional = {case:"Nom", number:null};
  expect(compare(noun).success).toBe(true);
  noun.value.inflectional.extra = "bad";
  expect(compare(noun).success).toBe(false);
});

test("single values and nonempty tuple-rest feature sets preserve union semantics", () => {
  const feature = z.enum(["A", "B"]);
  const schema = z.strictObject({set:z.union([feature,z.tuple([feature],feature)])});
  const compiled = compileZodValidationArtifacts({schemas:{fixture:schema}, operations:[]});
  for (const set of ["A",["A"],["A","B"],[],["A","bad"],"bad",null,undefined]) {
    const value = {set};
    const actual = parseValidationArtifact({version:1,root:compiled.roots.fixture,definitions:compiled.definitions}, value);
    const canonical = schema.safeParse(value);
    expect(!(actual instanceof ParsingError)).toBe(canonical.success);
    if (canonical.success) expect(actual).toEqual(canonical.data);
  }
});

test("unsupported checks fail closed and known-coordinate calls enforce expected route", () => {
  expect(() => compileZodValidationArtifacts({schemas:{bad:z.string().refine(value => value.length > 3)},operations:[]})).toThrow("no explicitly named operation registration matched");
  expect(parseUnit(sample(), {route:"de/Lexeme/NOUN", unitKind:"Lemma"}).success).toBe(true);
  expect(parseUnit(sample(), {route:"en/Lexeme/NOUN", unitKind:"Lemma"}).success).toBe(false);
});
