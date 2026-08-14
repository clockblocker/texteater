import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";

// Route and membership rejection cases belong to Target Classification. The
// valid Idiom corpus keeps those contrasts inside surrounding unmarked context.
export const boundaryCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
