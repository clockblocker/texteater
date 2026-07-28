import { z } from "zod/v4";
import { toNonNullishWithDefault } from "../../../helpers/casters/to-non-nullish-with-default";
import { toNullable } from "../../../helpers/casters/to-nullable";
import { numericStringAndNumber } from "../core-non-nullable-codecs/numeric-string-and-number";

export { numericStringAndNumber };

export const numberAndNumericString = z.invertCodec(numericStringAndNumber);

export const nullableNumericStringAndNumber = toNullable(
	numericStringAndNumber,
);
export const numericStringAndNullishNumber = toNonNullishWithDefault(
	nullableNumericStringAndNumber,
	"0",
);

export const nullableNumberAndNumericString = toNullable(
	numberAndNumericString,
);
export const numberAndNullishNumericString = toNonNullishWithDefault(
	nullableNumberAndNumericString,
	0,
);
