import { abstractSchemas as internalAbstractSchemas } from "./schemas/abstract-schemas.js";
import {
	getSchemaTreeFor as internalGetSchemaTreeFor,
	readingSchema as internalReadingSchema,
	schemasFor as internalSchemasFor,
} from "./schemas/public-schemas.js";

export const abstractSchemas: typeof internalAbstractSchemas =
	internalAbstractSchemas;
export const getSchemaTreeFor: typeof internalGetSchemaTreeFor =
	internalGetSchemaTreeFor;
export const schemasFor: typeof internalSchemasFor = internalSchemasFor;
export const readingSchema: typeof internalReadingSchema =
	internalReadingSchema;
