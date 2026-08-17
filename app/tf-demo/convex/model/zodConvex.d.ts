import type { Validator } from "convex/values";
import type { ZodType, z } from "zod";

// Typed companion for zodConvex.js; keep this signature aligned with convex-helpers.
export function zodOutputToConvex<Schema extends ZodType>(
	validator: Schema,
): Validator<z.output<Schema>, "required", string>;
