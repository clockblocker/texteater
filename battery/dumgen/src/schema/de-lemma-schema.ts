import { schemasFor } from "dumling/schema";
import type { Lemma } from "dumling/types";
import { z } from "zod";

const deLemmaLeafSchemas = Object.values(schemasFor.de.entity.Lemma).flatMap(
	(family) => Object.values(family).map((getSchema) => getSchema()),
);

// Keep Dumling's internal schema helper types out of Dumgen's declarations.
export const deLemmaSchema: z.ZodType<Lemma<"de">> = z.union(
	deLemmaLeafSchemas as unknown as readonly [
		z.ZodType<Lemma<"de">>,
		z.ZodType<Lemma<"de">>,
		...z.ZodType<Lemma<"de">>[],
	],
);
