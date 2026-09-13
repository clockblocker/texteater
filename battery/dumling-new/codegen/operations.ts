import type { ZodValidationOperationRegistration } from "codegen";
import {
	emojiDescriptionError,
	hasMarkedFeature,
	isEmojiDescription,
	nonEmptyFeatureBagError,
	normalizeForm,
} from "../src/validation/semantics.js";

export const registrations = [
	{
		construct: "custom",
		implementation: hasMarkedFeature,
		error: nonEmptyFeatureBagError,
		name: "dumling.feature-bag.marked",
		version: 1,
	},
	{
		construct: "custom",
		implementation: isEmojiDescription,
		error: emojiDescriptionError,
		name: "dumling.emoji-description",
		version: 1,
	},
	{
		construct: "overwrite",
		implementation: normalizeForm,
		name: "dumling.normalize-form",
		version: 1,
	},
] as const satisfies readonly ZodValidationOperationRegistration[];
