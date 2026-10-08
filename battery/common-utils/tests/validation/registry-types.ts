import type { Equal, Expect } from "../../src";
import {
	type CompiledValidationRegistry,
	hasRoot,
	type ParsingError,
	parseCompiledValidation,
} from "../../src/validation";

declare const registry: CompiledValidationRegistry<"reading" | "lemma">;
declare const input: unknown;

// A registry's root is checked; Output stays the caller's explicit word.
const parsed = parseCompiledValidation<"reading" | "lemma", { id: string }>(
	registry,
	"reading",
	input,
);
type _ParsedOutput = Expect<
	Equal<typeof parsed, { id: string } | ParsingError<{ id: string }>>
>;
parseCompiledValidation(registry, "lemma", input);
// @ts-expect-error A misspelled root names no validator in the registry.
parseCompiledValidation(registry, "readng", input);
parseCompiledValidation<"reading" | "surface", unknown>(
	// @ts-expect-error A caller's root union may not be wider than the registry's.
	registry,
	"reading",
	input,
);

// hasRoot narrows a runtime string to one of the registry's roots.
declare const key: string;
if (hasRoot(registry, key)) {
	type _Narrowed = Expect<Equal<typeof key, "reading" | "lemma">>;
	parseCompiledValidation(registry, key, input);
}
// @ts-expect-error An unchecked string is not a root.
parseCompiledValidation(registry, key, input);
