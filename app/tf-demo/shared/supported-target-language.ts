import type * as Dumling from "dumling/types";

import { z } from "zod";

const SUPPORTED_TARGET_LANGUAGE_VALUES = [
	"de",
] as const satisfies readonly Dumling.Language[];

const supportedTargetLanguageSchema = z.enum(SUPPORTED_TARGET_LANGUAGE_VALUES);

export type SupportedTargetLanguage = z.infer<
	typeof supportedTargetLanguageSchema
>;
