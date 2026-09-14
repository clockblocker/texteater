import { expect, test } from "bun:test";
import { compileZodValidationArtifacts as compile } from "dumval/compiler";
import { z } from "zod";
import {
	CodegenError,
	compileZodValidationArtifacts,
	ZodValidationCompilationError,
} from "../src";

test("legacy compilation forwards to Dumval while preserving CodegenError catches", () => {
	const options = { schemas: { text: z.string() }, operations: [] } as const;
	expect(compileZodValidationArtifacts(options)).toEqual(compile(options));
	try {
		compileZodValidationArtifacts({
			schemas: { unsupported: z.date() },
			operations: [],
		});
		throw Error("Unsupported schema accepted");
	} catch (error) {
		expect(error).toBeInstanceOf(CodegenError);
		expect(error).toBeInstanceOf(ZodValidationCompilationError);
	}
});
