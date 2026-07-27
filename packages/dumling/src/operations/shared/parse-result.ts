import type { z } from "zod/v3";
import type { SupportedLanguage } from "../../types/public-types";
import type { ApiResult, ParseError } from "../api-shape";

function invalidParseResult(
	language: SupportedLanguage,
	error: z.ZodError,
): ApiResult<never, ParseError> {
	return {
		success: false,
		error: {
			code: "InvalidInput",
			language,
			message: "Input did not match the requested Dumling schema",
			issues: error.issues.map((issue) => {
				const path =
					issue.path.length > 0 ? issue.path.join(".") : "input";
				return `${path}: ${issue.message}`;
			}),
		},
	};
}

export function parseWithSchema<T>(
	language: SupportedLanguage,
	runtimeSchema: z.ZodType<T>,
	input: unknown,
): ApiResult<T, ParseError> {
	const parsed = runtimeSchema.safeParse(input);

	if (!parsed.success) {
		return invalidParseResult(language, parsed.error);
	}

	return {
		success: true,
		data: parsed.data,
	};
}
