import { reverseCodecDirections } from "../../../helpers/casters/reverse-codec-directions";
import { toNonNullishWithDefault } from "../../../helpers/casters/to-non-nullish-with-default";
import { toNullable } from "../../../helpers/casters/to-nullable";
import { intAndNumber } from "../core-non-nullable-codecs/int-and-number";

export { intAndNumber };

export const numberAndInt = reverseCodecDirections(intAndNumber);

export const nullableIntAndNumber = toNullable(intAndNumber);
export const intAndNullishNumber = toNonNullishWithDefault(
	nullableIntAndNumber,
	0,
);

export const nullableNumberAndInt = toNullable(numberAndInt);
export const numberAndNullishInt = toNonNullishWithDefault(
	nullableNumberAndInt,
	0,
);
