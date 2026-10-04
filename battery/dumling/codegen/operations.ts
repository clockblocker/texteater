import type { ZodValidationOperationRegistration } from "dumval/compiler";
import { operationTable } from "../src/validation/operations.js";

/** Dumling's operation table as Zod compiler registrations, which sibling generators link against through `dumling/codegen`. */
export const registrations =
	operationTable satisfies readonly ZodValidationOperationRegistration[];
