import { ParsingError } from "common-utils";
import type { SupportedLanguage } from "../../../types/public-types.js";
import type { ApiResult, ParseError } from "../../api-shape.js";

export function compatibilityParseResult<T>(
	language: SupportedLanguage,
	parsed: T | ParsingError<T>,
): ApiResult<T, ParseError> {
	if (!(parsed instanceof ParsingError)) {
		return { success: true, data: parsed };
	}
	return {
		success: false,
		error: {
			code: "InvalidInput",
			language,
			message: "Input did not match the requested Dumling schema",
			issues: parsed.issues.map((issue) => {
				const path =
					issue.path.length > 0 ? issue.path.join(".") : "input";
				return `${path}: ${issue.message}`;
			}),
		},
	};
}
