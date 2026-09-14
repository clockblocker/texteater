import type {
	CompileZodValidationArtifactsOptions,
	ZodValidationArtifactRegistry,
} from "dumval/compiler";
import {
	ZodValidationCompilationError as CompilationError,
	compileZodValidationArtifacts as compile,
} from "dumval/compiler";
import type { z } from "zod";
import { CodegenError } from "./errors.js";

export type {
	CompileZodValidationArtifactsOptions,
	ZodValidationArtifactRegistry,
	ZodValidationOperationConstruct,
	ZodValidationOperationRegistration,
} from "dumval/compiler";

/** Compatibility for callers that catch the former CodegenError hierarchy. */
export class ZodValidationCompilationError extends CodegenError {
	override readonly name = "ZodValidationCompilationError";
}
/** @deprecated Import the compiler from dumval/compiler in new code. */
export function compileZodValidationArtifacts<
	const Schemas extends Readonly<Record<string, z.ZodType>>,
>(
	options: CompileZodValidationArtifactsOptions<Schemas>,
): ZodValidationArtifactRegistry<Schemas> {
	try {
		return compile(options);
	} catch (error) {
		if (error instanceof CompilationError)
			throw new ZodValidationCompilationError(error.message, {
				cause: error,
			});
		throw error;
	}
}
