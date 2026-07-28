import { z } from "zod/v4";
import { toNonNullishWithDefault } from "../../../helpers/casters/to-non-nullish-with-default";
import { toNullable } from "../../../helpers/casters/to-nullable";
import { intAndNumber } from "../core-non-nullable-codecs/int-and-number";

export { intAndNumber };

export const numberAndInt = z.invertCodec(intAndNumber);

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
