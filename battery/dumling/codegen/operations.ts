import type { ZodValidationOperationRegistration } from "dumval/compiler";
import { operationTable } from "../src/validation/operations.js";

/** Dumling's operation table as Zod compiler registrations. Dumrel's and Dumdict's codegen import it from this path. */
export const registrations =
	operationTable satisfies readonly ZodValidationOperationRegistration[];
