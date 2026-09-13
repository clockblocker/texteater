import { z } from "zod";

type ObjectShapeFor<Value extends object> = {
	[Key in keyof Value]: z.ZodType<Value[Key], Value[Key]>;
};

export function asObjectSchema<Value extends object>(
	schema: z.ZodType<Value>,
): z.ZodObject<ObjectShapeFor<Value>> {
	if (!(schema instanceof z.ZodObject)) {
		throw new Error("Expected a Dumling object schema.");
	}
	return schema as unknown as z.ZodObject<ObjectShapeFor<Value>>;
}
