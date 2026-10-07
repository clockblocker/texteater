import type { ZodValidationOperationRegistration } from "common-utils/validation-compiler";
import { operationTable } from "../src/validation/operation-table.js";

/** Dumling's operation table as Zod compiler registrations, which sibling generators link against through `dumling/codegen`. */
export const registrations =
	operationTable satisfies readonly ZodValidationOperationRegistration[];
