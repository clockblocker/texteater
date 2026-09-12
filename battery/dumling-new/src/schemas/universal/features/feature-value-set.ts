import { z } from "zod";

export function featureValueSetSchema<const Schema extends z.ZodType>(
	schema: Schema,
) {
	return z.union([schema, z.tuple([schema], schema)]);
}
