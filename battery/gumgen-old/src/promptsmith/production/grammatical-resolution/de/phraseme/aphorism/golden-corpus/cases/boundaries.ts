import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

// Route and membership rejection belong upstream. Valid Aphorism cases keep
// Proverb, Idiom, slogan, quotation, and ordinary-assertion contrasts in
// unmarked context instead.
export const boundaryCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
