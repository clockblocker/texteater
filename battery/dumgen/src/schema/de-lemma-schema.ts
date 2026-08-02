import { schemasFor } from "dumling/schema";
import type { Lemma } from "dumling/types";
import { z } from "zod";

const deLemmaLeafSchemas = Object.values(schemasFor.de.entity.Lemma).flatMap(
	(family) => Object.values(family).map((getSchema) => getSchema()),
);

export const deLemmaSchema = z.union(
	deLemmaLeafSchemas as unknown as readonly [
		z.ZodType<Lemma<"de">>,
		z.ZodType<Lemma<"de">>,
		...z.ZodType<Lemma<"de">>[],
	],
);
