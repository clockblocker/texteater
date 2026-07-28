import { z } from "zod";
import type { Nullish } from "../../../../core/helpers/nullish-utils";
import { pipeCodecs } from "../../../../core/pipe-codecs";
import type { Codec } from "../../../../core/types";
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

const {
	inputSchema,
	outputSchema,
	fromOutput: fromArrayOfNullishStrings,
	fromInput: fromArrayOfNonEmptyStrings,
} = pipeCodecs(
	nullishArrayOfStrings,
	buildFilteredNullishArrayCodec(z.string(), nonEmptyStringSchema),
);

export const arrayOfNonEmptyStringsAndNullishArrayOfNullishStrings = {
	fromInput: fromArrayOfNonEmptyStrings,
	fromOutput: fromArrayOfNullishStrings,
	inputSchema,
	outputSchema,
} as const satisfies Codec<string[], Nullish<Nullish<string>[]>>;
