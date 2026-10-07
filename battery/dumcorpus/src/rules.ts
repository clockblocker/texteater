import { createHash } from "node:crypto";
import type * as Dumling from "dumling/types";
import type { Rule } from "./corpus-types.js";
import { germanRules } from "./de/rules.js";

/** Each language's classification Rules (ADR 0037). A language missing here has none yet. */
const rulesByLanguage: { readonly [L in Dumling.Language]?: readonly Rule[] } =
	{ de: germanRules };

/** The classification Rules of every language (ADR 0037). */
export const rules: readonly Rule[] = Object.values(rulesByLanguage).flatMap(
	(languageRules) => languageRules ?? [],
);

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
