import { createHash } from "node:crypto";
import type { Rule } from "./types.js";

/** The classification Rules. They arrive with the Rules work (ADR 0037). */
export const rules: readonly Rule[] = [];

/**
 * The hash a Rule citation stores: the first 16 hex digits of the SHA-256 of
 * the statement, NFC-normalized with whitespace runs collapsed, so reflowing a
 * statement keeps its citations while rewording reopens them.
 */
export function ruleStatementHash(statement: string): string {
	return createHash("sha256")
		.update(statement.normalize("NFC").trim().replace(/\s+/gu, " "))
		.digest("hex")
		.slice(0, 16);
}
