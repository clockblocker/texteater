// Emitted operational interface. Runtime counterpart is index.ts / compiled.bundle.mjs.
import type { ParsingIssue } from "../../../common-utils/src/parsing-error.ts";
import type { Route, Unit, UnitKind } from "./dto.js";
export type { DumlingUnit, Unit, UnitKind, Route } from "./dto.js";
export type ParseResult<T> = {success: true; data: T} | {success: false; issues: readonly ParsingIssue[]};
interface AbstractUnit {language:string;family:string;kind:string;unitKind:UnitKind;value:unknown}
export declare const schemaCount: number;
export declare function parseUnit<R extends Route, U extends UnitKind>(input: unknown, expected: {route:R;unitKind:U}): ParseResult<Unit<U,R>>;
export declare function parseUnit(input:unknown): ParseResult<AbstractUnit>;
