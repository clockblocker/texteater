import { parseValidationArtifact, type Constraint, type ValidationArtifact } from "../../../common-utils/src/validation-artifact.ts";
import { ParsingError, type ParsingIssue } from "../../../common-utils/src/parsing-error.ts";
import data from "./artifact.json" with {type: "json"};
import { operations } from "./operations.ts";
import type { Route, Unit, UnitKind } from "./dto.ts";
export type { DumlingUnit, Unit, UnitKind, Route } from "./dto.ts";

interface Registry {
  version: 1;
  roots: Readonly<Record<string, Constraint>>;
  definitions: Readonly<Record<string, Constraint>>;
}
const registry = data as unknown as Registry;
export const schemaCount = Object.keys(registry.roots).length;
interface AbstractUnit {language: string; family: string; kind: string; unitKind: UnitKind; value: unknown}
export type ParseResult<T> = {success: true; data: T} | {success: false; issues: readonly ParsingIssue[]};
export function parseUnit<R extends Route, U extends UnitKind>(input: unknown, expected: {route: R; unitKind: U}): ParseResult<Unit<U,R>>;
export function parseUnit(input: unknown): ParseResult<AbstractUnit>;
export function parseUnit(input: unknown, expected?: {route: string; unitKind: UnitKind}): ParseResult<unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return {success: false, issues: [{code: "invalid_type", expected: "object", path: [], message: "Expected unit object"}]};
  const value = input as Record<string, unknown>;
  if ([value.language,value.family,value.kind].some(coordinate => typeof coordinate !== "string")) return {success:false, issues:[{code:"custom",path:[],message:"Coordinates must be strings"}]};
  const key = `${value.language}/${value.family}/${value.kind}`;
  const root = Object.hasOwn(registry.roots, key) ? registry.roots[key] : undefined;
  if (!root) return {success: false, issues: [{code: "custom", path: [], message: "Unknown grammatical route"}]};
  if (expected && (expected.route !== key || expected.unitKind !== value.unitKind)) return {success: false, issues: [{code: "custom", path: [], message: "Input does not match expected coordinates"}]};
  const artifact: ValidationArtifact = {version: 1, root, definitions: registry.definitions};
  const result = parseValidationArtifact(artifact, input, operations);
  return result instanceof ParsingError ? {success: false, issues: result.issues} : {success: true, data: result};
}
