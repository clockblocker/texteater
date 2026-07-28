import { pipeCodecs } from "../../../../core/pipe-codecs";
import { reverseCodecDirections } from "../../helpers/casters/reverse-codec-directions";
import { toNonNullishWithDefault } from "../../helpers/casters/to-non-nullish-with-default";
import { toNullable } from "../../helpers/casters/to-nullable";
import { numericStringAndNumber } from "../atoms/core-non-nullable-codecs/numeric-string-and-number";
import { numberAndInt } from "../atoms/derived/int";

export const numericStringAndInt = pipeCodecs(
	numberAndInt,
	numericStringAndNumber,
);

export const intAndNumericString = reverseCodecDirections(numericStringAndInt);

export const nullableNumericStringAndInt = toNullable(numericStringAndInt);
export const numericStringAndNullishInt = toNonNullishWithDefault(
	nullableNumericStringAndInt,
	"0",
);

export const nullableIntAndNumericString = toNullable(intAndNumericString);
export const intAndNullishNumericString = toNonNullishWithDefault(
	nullableIntAndNumericString,
	0,
);

export const nullableNumericStringAndNullishInt = nullableNumericStringAndInt;
export const nullishIntAndNullableNumericString = reverseCodecDirections(
	nullableNumericStringAndNullishInt,
);
