import { z } from "zod/v4";
import { toNonNullishWithDefault } from "../../../helpers/casters/to-non-nullish-with-default";
import { toNullable } from "../../../helpers/casters/to-nullable";
import { yesNoAndBoolean } from "../core-non-nullable-codecs/yes-no-and-boolean";

export { yesNoAndBoolean };

export const booleanAndYesNo = z.invertCodec(yesNoAndBoolean);

export const nullableYesNoAndBoolean = toNullable(yesNoAndBoolean);
export const yesNoAndNullishBoolean = toNonNullishWithDefault(
	nullableYesNoAndBoolean,
	"No",
);

export const nullableBooleanAndYesNo = toNullable(booleanAndYesNo);
export const booleanAndNullishYesNo = toNonNullishWithDefault(
	nullableBooleanAndYesNo,
	false,
);
