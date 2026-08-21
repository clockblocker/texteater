import type { z } from "zod";
import type { ParsingError, ParsingIssue } from "../src";

type Assert<Condition extends true> = Condition;

type _IssuesRemainStructurallyCompatible = Assert<
	ParsingIssue extends z.ZodIssue ? true : false
>;

type ParsingErrorProjection = Pick<ParsingError, "issues" | "message" | "name">;
type ZodErrorProjection = Pick<z.ZodError, "issues" | "message" | "name">;
type _ErrorProjectionRemainsStructurallyCompatible = Assert<
	ParsingErrorProjection extends ZodErrorProjection ? true : false
>;
