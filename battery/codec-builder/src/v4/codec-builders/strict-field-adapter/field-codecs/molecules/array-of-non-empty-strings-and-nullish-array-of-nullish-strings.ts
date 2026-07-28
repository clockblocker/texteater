import { z } from "zod/v4";
import { pipeCodecs } from "../../../../core/pipe-codecs";
import { buildFilteredNullishArrayCodec } from "../../helpers/builders/filtered-nullish-array";
import { toArrayOf } from "../../helpers/casters/to-array-of";
import { toNonNullishWithDefault } from "../../helpers/casters/to-non-nullish-with-default";
import { toNullable } from "../../helpers/casters/to-nullable";
import { stringAndNullishString } from "../atoms/derived/string";

const nonEmptyStringSchema = z.string().min(1);
const arrayOfNullishStrings = toArrayOf(stringAndNullishString);
const nullishArrayOfStrings = toNonNullishWithDefault(
	toNullable(arrayOfNullishStrings),
	[],
);

export const arrayOfNonEmptyStringsAndNullishArrayOfNullishStrings = pipeCodecs(
	nullishArrayOfStrings,
	buildFilteredNullishArrayCodec(z.string(), nonEmptyStringSchema),
);
