import { z } from "zod";
import type { Nullish } from "../../../../../core/helpers/nullish-utils";
import type { Codec } from "../../../../../core/types";
import { reverseCodecDirections } from "../../../helpers/casters/reverse-codec-directions";
import { toNonNullishWithDefault } from "../../../helpers/casters/to-non-nullish-with-default";
import { toNullable } from "../../../helpers/casters/to-nullable";

const stringSchema = z.string();
const nullishStringSchema = stringSchema.nullish();

export const stringAndNullish = {
	fromInput: (v) => v ?? "",
	fromOutput: (v) => v,
	inputSchema: nullishStringSchema,
	outputSchema: stringSchema,
} as const satisfies Codec<string, Nullish<string>>;

export const nullishStringAndString = reverseCodecDirections(stringAndNullish);

export const nullableStringAndString = toNullable(stringAndNullish);
export const stringAndNullishString = toNonNullishWithDefault(
	nullableStringAndString,
	"",
);
