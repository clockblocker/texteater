import type { ValidationOperation, ValidationOperations } from "common-utils";
import {
	emojiDescriptionError,
	hasMarkedFeature,
	isEmojiDescription,
	nonEmptyFeatureBagError,
	normalizeForm,
} from "./semantics.js";

function check(
	predicate: (value: never) => boolean,
	error: () => string,
): ValidationOperation {
	return (value) =>
		predicate(value as never)
			? { value }
			: {
					value,
					issues: [{ code: "custom", path: [], message: error() }],
				};
}
export const validationOperations: ValidationOperations = {
	"dumling.feature-bag.marked": check(
		hasMarkedFeature,
		nonEmptyFeatureBagError,
	),
	"dumling.emoji-description": check(
		isEmojiDescription,
		emojiDescriptionError,
	),
	"dumling.normalize-form": (value) => ({
		value: normalizeForm(value as string),
	}),
};
