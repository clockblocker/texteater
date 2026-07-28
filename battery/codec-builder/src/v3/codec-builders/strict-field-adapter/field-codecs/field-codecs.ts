import type { AnyCodec, NoOpCodec } from "../../../core/types";
import { noOpCodec } from "../build-strict-field-adapter-codec";
import { toNullish } from "../helpers/casters/to-nullish";
import { toOptional } from "../helpers/casters/to-optional";
import {
	dateAndNullishIsoString,
	isoStringAndDate,
	isoStringAndNullishDate,
	nullableDateAndIsoString,
	nullableDateAndNullishIsoString,
	nullableIsoStringAndDate,
} from "./atoms/derived/date";
import {
	nullableNumberAndNumericString,
	nullableNumericStringAndNumber,
	numberAndNullishNumericString,
	numberAndNumericString,
	numericStringAndNullishNumber,
	numericStringAndNumber,
} from "./atoms/derived/number";
import {
	nullableStringAndString,
	stringAndNullishString,
} from "./atoms/derived/string";
import {
	booleanAndNullishYesNo,
	booleanAndYesNo,
	nullableBooleanAndYesNo,
	nullableYesNoAndBoolean,
	yesNoAndBoolean,
	yesNoAndNullishBoolean,
} from "./atoms/derived/yes-no";
import { arrayOfNonEmptyStringsAndNullishArrayOfNullishStrings } from "./molecules/array-of-non-empty-strings-and-nullish-array-of-nullish-strings";
import {
	intAndNullishNumericString,
	intAndNumericString,
	nullableIntAndNumericString,
	nullableNumericStringAndInt,
	numericStringAndInt,
	numericStringAndNullishInt,
} from "./molecules/int-and-numeric-string";

type FieldCodecNamespace = {
	readonly [key: string]: AnyCodec | NoOpCodec | FieldCodecNamespace;
};

export const fieldCodecs = {
	nullable: {
		date: {
			and: {
				isoString: nullableDateAndIsoString,
			},
		},
		isoString: {
			and: {
				date: nullableIsoStringAndDate,
			},
		},
		string: {
			and: {
				string: nullableStringAndString,
			},
		},
		numericString: {
			and: {
				number: nullableNumericStringAndNumber,
				int: nullableNumericStringAndInt,
			},
		},
		number: {
			and: {
				numericString: nullableNumberAndNumericString,
			},
		},
		yesNo: {
			and: {
				boolean: nullableYesNoAndBoolean,
			},
		},
		boolean: {
			and: {
				yesNo: nullableBooleanAndYesNo,
			},
		},
		int: {
			and: {
				numericString: nullableIntAndNumericString,
			},
		},
		array: {
			nonEmptyString: {
				and: {
					nullishArrayOfNullishString:
						arrayOfNonEmptyStringsAndNullishArrayOfNullishStrings,
				},
			},
		},
	},
	optional: {
		date: {
			and: {
				isoString: toOptional(nullableDateAndNullishIsoString),
			},
		},
		isoString: {
			and: {
				date: toOptional(isoStringAndDate),
			},
		},
		numericString: {
			and: {
				number: toOptional(numericStringAndNumber),
				int: toOptional(numericStringAndInt),
			},
		},
		number: {
			and: {
				numericString: toOptional(numberAndNumericString),
			},
		},
		yesNo: {
			and: {
				boolean: toOptional(yesNoAndBoolean),
			},
		},
		boolean: {
			and: {
				yesNo: toOptional(booleanAndYesNo),
			},
		},
		int: {
			and: {
				numericString: toOptional(intAndNumericString),
			},
		},
	},
	nullish: {
		date: {
			and: {
				isoString: toNullish(nullableDateAndNullishIsoString),
			},
		},
		isoString: {
			and: {
				date: toNullish(isoStringAndDate),
			},
		},
		numericString: {
			and: {
				number: toNullish(numericStringAndNumber),
				int: toNullish(numericStringAndInt),
			},
		},
		number: {
			and: {
				numericString: toNullish(numberAndNumericString),
			},
		},
		yesNo: {
			and: {
				boolean: toNullish(yesNoAndBoolean),
			},
		},
		boolean: {
			and: {
				yesNo: toNullish(booleanAndYesNo),
			},
		},
		int: {
			and: {
				numericString: toNullish(intAndNumericString),
			},
		},
	},
	nonNullish: {
		date: {
			and: {
				isoString: dateAndNullishIsoString,
				nullish: {
					isoString: dateAndNullishIsoString,
				},
			},
		},
		isoString: {
			and: {
				date: isoStringAndDate,
				nullish: {
					date: isoStringAndNullishDate,
				},
			},
		},
		string: {
			and: {
				nullish: {
					string: stringAndNullishString,
				},
			},
		},
		numericString: {
			and: {
				number: numericStringAndNumber,
				int: numericStringAndInt,
				nullish: {
					number: numericStringAndNullishNumber,
					int: numericStringAndNullishInt,
				},
			},
		},
		number: {
			and: {
				numericString: numberAndNumericString,
				nullish: {
					numericString: numberAndNullishNumericString,
				},
			},
		},
		yesNo: {
			and: {
				boolean: yesNoAndBoolean,
				nullish: {
					boolean: yesNoAndNullishBoolean,
				},
			},
		},
		boolean: {
			and: {
				yesNo: booleanAndYesNo,
				nullish: {
					yesNo: booleanAndNullishYesNo,
				},
			},
		},
		int: {
			and: {
				numericString: intAndNumericString,
				nullish: {
					numericString: intAndNullishNumericString,
				},
			},
		},
		array: {
			nonEmptyString: {
				and: {
					nullishArrayOfNullishString:
						arrayOfNonEmptyStringsAndNullishArrayOfNullishStrings,
				},
			},
		},
	},

	// Returns the same type as the original field.
	noOp: noOpCodec,
} as const satisfies FieldCodecNamespace;
