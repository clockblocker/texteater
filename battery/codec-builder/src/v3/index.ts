import { buildReshapeCodec } from "./codec-builders/build-reshape-codec";
import {
	arrayOfCodecShapes,
	buildStrictFieldAdapter,
	buildStrictFieldAdapterCodec,
} from "./codec-builders/strict-field-adapter/build-strict-field-adapter-codec";
import { fieldCodecs } from "./codec-builders/strict-field-adapter/field-codecs/field-codecs";
import { buildFilteredNullishArrayCodec } from "./codec-builders/strict-field-adapter/helpers/builders/filtered-nullish-array";
import { buildNullableUnionAndNullishString } from "./codec-builders/strict-field-adapter/helpers/builders/union-and-string";
import { reverseCodecDirections } from "./codec-builders/strict-field-adapter/helpers/casters/reverse-codec-directions";
import { toArrayOf } from "./codec-builders/strict-field-adapter/helpers/casters/to-array-of";
import { toNonNullishWithDefault } from "./codec-builders/strict-field-adapter/helpers/casters/to-non-nullish-with-default";
import { toNullable } from "./codec-builders/strict-field-adapter/helpers/casters/to-nullable";
import { toNullish } from "./codec-builders/strict-field-adapter/helpers/casters/to-nullish";
import { toOptional } from "./codec-builders/strict-field-adapter/helpers/casters/to-optional";
import { pipeCodecs } from "./core/pipe-codecs";

export const codecBuilder3 = {
	fieldCodec: { ...fieldCodecs, arrayOf: arrayOfCodecShapes },
	helpers: {
		toArrayOf,
		toOptional,
		toNullable,
		toNullish,
		toNonNullishWithDefault,
		reverseCodecDirections,
		buildNullableUnionAndNullishString,
		buildFilteredNullishArrayCodec,
		pipeCodecs,
	},
	buildStrictFieldAdapter,
	buildStrictFieldAdapterCodec,
	buildReshapeCodec,
} as const;

export const codecBuilder = codecBuilder3;

export type {
	ShapeOfStrictFieldAdapter,
	ShapeOfStrictFieldAdapterCodec,
} from "./codec-builders/strict-field-adapter/build-strict-field-adapter-codec";
export type { Codec } from "./core/types";
