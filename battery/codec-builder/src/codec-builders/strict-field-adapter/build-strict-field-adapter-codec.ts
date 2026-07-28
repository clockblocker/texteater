/* eslint-disable @typescript-eslint/no-explicit-any -- Library typecasts */
/** biome-ignore-all lint/suspicious/noExplicitAny: Library generic shape */

import { z } from "zod";
import type {
	CodecPair,
	NoOpCodec,
	SchemaCodec,
	SchemaShapeOf as SharedSchemaShapeOf,
} from "../../core/types";

// -- Exports --

export const noOpCodec = { __noOpCodec: true } as const satisfies NoOpCodec;

export type ShapeOfStrictFieldAdapter<TServer extends object> = {
	[K in KnownKeys<TServer>]-?: StrictFieldAdapterNodeForValue<TServer[K]>;
};

export type ShapeOfStrictFieldAdapterCodec<TServer extends object> =
	ShapeOfStrictFieldAdapter<TServer>;

export function arrayOfCodecShapes<
	const TItemShape extends RuntimeArrayItemShape,
>(itemShape: TItemShape): ArrayCodecShape<TItemShape> {
	return { __arrayCodecShape: true, itemShape };
}

export function buildStrictFieldAdapterCodec<
	TInputSchema extends z.AnyZodObject,
	const S extends RuntimeCodecShape,
>(
	inputSchema: TInputSchema,
	shape: S & CodecShapeForSchemaShape<SchemaShapeOf<TInputSchema>>,
) {
	const outputSchema = z.object(
		buildOutputZodShape(
			shape as RuntimeCodecShape,
			inputSchema.shape as z.ZodRawShape,
		),
	) as z.ZodObject<
		OutputZodShapeForSchemaShape<SchemaShapeOf<TInputSchema>, S>
	>;

	type InputType = z.infer<TInputSchema>;
	type OutputType = z.infer<typeof outputSchema>;

	const fromInput = (data: InputType): OutputType => {
		return convertFromInput(
			shape as RuntimeCodecShape,
			data as Record<string, unknown>,
		) as OutputType;
	};

	const fromOutput = (data: OutputType): InputType => {
		return convertFromOutput(
			shape as RuntimeCodecShape,
			data as Record<string, unknown>,
		) as InputType;
	};

	return {
		inputSchema,
		outputSchema,
		fromInput,
		fromOutput,
	} satisfies SchemaCodec<TInputSchema, typeof outputSchema>;
}

export function buildStrictFieldAdapter<InputType extends object>(): <
	const S extends RuntimeCodecShape,
>(
	shape: S & ShapeOfStrictFieldAdapter<InputType>,
) => CodecPair<InputType, OutputOfStrictFieldAdapter<InputType, S>>;

export function buildStrictFieldAdapter<
	InputType extends object,
	const S extends RuntimeCodecShape,
>(
	shape: S & ShapeOfStrictFieldAdapter<InputType>,
): CodecPair<InputType, OutputOfStrictFieldAdapter<InputType, S>>;

export function buildStrictFieldAdapter<
	InputType extends object,
	const S extends RuntimeCodecShape,
>(shape?: S & ShapeOfStrictFieldAdapter<InputType>) {
	if (shape === undefined) {
		return <const TShape extends RuntimeCodecShape>(
			deferredShape: TShape & ShapeOfStrictFieldAdapter<InputType>,
		) => buildStrictFieldAdapter<InputType, TShape>(deferredShape);
	}

	type OutputType = OutputOfStrictFieldAdapter<InputType, S>;

	const fromInput = (data: InputType): OutputType => {
		return convertFromInput(
			shape as RuntimeCodecShape,
			data as Record<string, unknown>,
		) as OutputType;
	};

	const fromOutput = (data: OutputType): InputType => {
		return convertFromOutput(
			shape as RuntimeCodecShape,
			data as Record<string, unknown>,
		) as InputType;
	};

	return {
		fromInput,
		fromOutput,
	} satisfies CodecPair<InputType, OutputType>;
}

// -- Internals --

type RuntimeCodecShape = Record<string, unknown>;
type KnownKeys<T> = {
	[K in keyof T]: string extends K
		? never
		: number extends K
			? never
			: symbol extends K
				? never
				: K;
}[keyof T];

interface ArrayCodecShape<
	TItemShape extends RuntimeArrayItemShape = RuntimeCodecShape,
> {
	readonly __arrayCodecShape: true;
	readonly itemShape: TItemShape;
}

type RuntimeArrayItemShape =
	| RuntimeCodecShape
	| SchemaCodec<z.ZodTypeAny, z.ZodTypeAny>
	| NoOpCodec;

type InputCompatibleCodecForValue<TInput> = SchemaCodec<
	z.ZodTypeAny,
	z.ZodTypeAny
> & {
	fromInput: (v: TInput) => unknown;
};

type ArrayItemOfValue<TValue> =
	NonNullable<TValue> extends readonly (infer TItem)[] ? TItem : never;

type IsArrayValue<TValue> =
	NonNullable<TValue> extends readonly unknown[] ? true : false;

type IsPlainObjectValue<TValue> =
	NonNullable<TValue> extends object
		? NonNullable<TValue> extends readonly unknown[]
			? false
			: NonNullable<TValue> extends (...args: any[]) => unknown
				? false
				: NonNullable<TValue> extends Date
					? false
					: true
		: false;

type StrictArrayItemNodeForValue<TValue> =
	IsPlainObjectValue<ArrayItemOfValue<TValue>> extends true
		?
				| ShapeOfStrictFieldAdapter<
						NonNullable<ArrayItemOfValue<TValue>>
				  >
				| InputCompatibleCodecForValue<ArrayItemOfValue<TValue>>
				| NoOpCodec
		: InputCompatibleCodecForValue<ArrayItemOfValue<TValue>> | NoOpCodec;

type StrictFieldAdapterNodeForValue<TValue> =
	IsArrayValue<TValue> extends true
		?
				| ArrayCodecShape<StrictArrayItemNodeForValue<TValue>>
				| InputCompatibleCodecForValue<TValue>
				| NoOpCodec
		: IsPlainObjectValue<TValue> extends true
			? ShapeOfStrictFieldAdapter<NonNullable<TValue>>
			: InputCompatibleCodecForValue<TValue> | NoOpCodec;

type OutputOfStrictFieldAdapterArrayItem<TInputItem, TShapeNode> =
	TShapeNode extends SchemaCodec<z.ZodTypeAny, infer TSchema>
		? z.output<TSchema>
		: TShapeNode extends NoOpCodec
			? TInputItem
			: TShapeNode extends RuntimeCodecShape
				? IsPlainObjectValue<TInputItem> extends true
					? OutputOfStrictFieldAdapter<
							NonNullable<TInputItem>,
							TShapeNode
						>
					: never
				: never;

type OutputOfStrictFieldAdapterNode<TInputValue, TShapeNode> =
	TShapeNode extends SchemaCodec<z.ZodTypeAny, infer TSchema>
		? z.output<TSchema>
		: TShapeNode extends NoOpCodec
			? TInputValue
			: TShapeNode extends ArrayCodecShape<infer TItemShape>
				? Array<
						OutputOfStrictFieldAdapterArrayItem<
							ArrayItemOfValue<TInputValue>,
							TItemShape
						>
					>
				: TShapeNode extends RuntimeCodecShape
					? IsPlainObjectValue<TInputValue> extends true
						? OutputOfStrictFieldAdapter<
								NonNullable<TInputValue>,
								TShapeNode
							>
						: never
					: never;

type OutputOfStrictFieldAdapter<
	TInput extends object,
	S extends RuntimeCodecShape,
> = {
	[K in KnownKeys<S>]: K extends keyof TInput
		? OutputOfStrictFieldAdapterNode<TInput[K], S[K]>
		: never;
};

type SchemaShapeOf<TSchema extends z.AnyZodObject> =
	SharedSchemaShapeOf<TSchema>;

type UnwrapOptionalNullableSchema<TSchema extends z.ZodTypeAny> =
	TSchema extends z.ZodOptional<infer TInner>
		? UnwrapOptionalNullableSchema<TInner>
		: TSchema extends z.ZodNullable<infer TInner>
			? UnwrapOptionalNullableSchema<TInner>
			: TSchema;

type ObjectSchemaOf<TSchema extends z.ZodTypeAny> =
	UnwrapOptionalNullableSchema<TSchema> extends z.AnyZodObject
		? UnwrapOptionalNullableSchema<TSchema>
		: never;

type ShapeOfObjectSchema<TSchema extends z.AnyZodObject> =
	TSchema extends z.ZodObject<infer TShape, any, any, any, any>
		? TShape
		: never;

type NestedSchemaShape<TSchema extends z.ZodTypeAny> =
	ObjectSchemaOf<TSchema> extends z.AnyZodObject
		? ShapeOfObjectSchema<ObjectSchemaOf<TSchema>>
		: never;

type ArrayItemSchemaOf<TSchema extends z.ZodTypeAny> =
	UnwrapOptionalNullableSchema<TSchema> extends z.ZodArray<infer TItem, any>
		? TItem
		: never;

type ArrayItemSchemaShape<TSchema extends z.ZodTypeAny> =
	ArrayItemSchemaOf<TSchema> extends z.ZodTypeAny
		? NestedSchemaShape<ArrayItemSchemaOf<TSchema>>
		: never;

type IsWideZodType<TSchema extends z.ZodTypeAny> = z.ZodTypeAny extends TSchema
	? true
	: false;

type FieldOutput<TSchema extends z.ZodTypeAny> = NonNullable<
	TSchema extends z.ZodType<infer TOutput, any, any> ? TOutput : never
>;

type ArrayItemOutput<TSchema extends z.ZodTypeAny> = ArrayItemOfValue<
	FieldOutput<TSchema>
>;

type ArrayItemObjectOutput<TSchema extends z.ZodTypeAny> =
	ArrayItemOutput<TSchema> extends object ? ArrayItemOutput<TSchema> : never;

type ObjectOutput<TSchema extends z.ZodTypeAny> =
	FieldOutput<TSchema> extends readonly unknown[]
		? never
		: FieldOutput<TSchema> extends object
			? FieldOutput<TSchema>
			: never;

type ZodTypeForValue<TValue> = z.ZodType<TValue, z.ZodTypeDef, TValue>;
type FieldInput<TField extends z.ZodTypeAny> = z.input<TField>;
type InputCompatibleCodecForField<TField extends z.ZodTypeAny> = SchemaCodec<
	z.ZodTypeAny,
	z.ZodTypeAny
> & {
	fromInput: (v: FieldInput<TField>) => unknown;
};
type ArrayItemInput<TField extends z.ZodTypeAny> =
	ArrayItemSchemaOf<TField> extends z.ZodTypeAny
		? z.input<ArrayItemSchemaOf<TField>>
		: never;
type InputCompatibleCodecForArrayItem<TField extends z.ZodTypeAny> =
	ArrayItemSchemaOf<TField> extends z.ZodTypeAny
		? SchemaCodec<z.ZodTypeAny, z.ZodTypeAny> & {
				fromInput: (v: ArrayItemInput<TField>) => unknown;
			}
		: never;
type IsArraySchema<TSchema extends z.ZodTypeAny> =
	ArrayItemSchemaOf<TSchema> extends never ? false : true;
type ArrayItemNodeForField<TField extends z.ZodTypeAny> =
	ArrayItemSchemaShape<TField> extends never
		? InputCompatibleCodecForArrayItem<TField> | NoOpCodec
		:
				| CodecShapeForSchemaShape<ArrayItemSchemaShape<TField>>
				| InputCompatibleCodecForArrayItem<TField>
				| NoOpCodec;

type WideObjectShapeNodeForField<TField extends z.ZodTypeAny> = [
	ObjectOutput<TField>,
] extends [never]
	? never
	: RuntimeCodecShape;

type WideArrayShapeNodeForField<TField extends z.ZodTypeAny> = [
	ArrayItemObjectOutput<TField>,
] extends [never]
	? never
	: ArrayCodecShape;

type CodecShapeNodeForField<TField extends z.ZodTypeAny> =
	IsArraySchema<TField> extends true
		?
				| ArrayCodecShape<ArrayItemNodeForField<TField>>
				| InputCompatibleCodecForField<TField>
				| NoOpCodec
		: NestedSchemaShape<TField> extends never
			? IsWideZodType<TField> extends true
				?
						| InputCompatibleCodecForField<TField>
						| NoOpCodec
						| WideObjectShapeNodeForField<TField>
						| WideArrayShapeNodeForField<TField>
				: InputCompatibleCodecForField<TField> | NoOpCodec
			: CodecShapeForSchemaShape<NestedSchemaShape<TField>>;

type OutputZodArrayItemFromCodecNode<TItemShape> =
	TItemShape extends SchemaCodec<z.ZodTypeAny, infer TSchema>
		? TSchema
		: TItemShape extends NoOpCodec
			? z.ZodUnknown
			: TItemShape extends RuntimeCodecShape
				? z.ZodObject<OutputZodShapeFromCodecShape<TItemShape>>
				: never;

type OutputZodArrayItemFromOutputValue<TValue, TItemShape> =
	TItemShape extends SchemaCodec<z.ZodTypeAny, infer TSchema>
		? TSchema
		: TItemShape extends NoOpCodec
			? ZodTypeForValue<TValue>
			: TItemShape extends RuntimeCodecShape
				? TValue extends object
					? z.ZodObject<
							OutputZodShapeFromOutputObject<TValue, TItemShape>
						>
					: never
				: never;

type OutputZodArrayItemForInputField<
	TInputField extends z.ZodTypeAny,
	TItemShape,
> =
	TItemShape extends SchemaCodec<z.ZodTypeAny, infer TSchema>
		? TSchema
		: TItemShape extends NoOpCodec
			? ArrayItemSchemaOf<TInputField>
			: TItemShape extends RuntimeCodecShape
				? ArrayItemSchemaShape<TInputField> extends never
					? IsWideZodType<TInputField> extends true
						? [ArrayItemObjectOutput<TInputField>] extends [never]
							? z.ZodObject<
									OutputZodShapeFromCodecShape<TItemShape>
								>
							: z.ZodObject<
									OutputZodShapeFromOutputObject<
										ArrayItemObjectOutput<TInputField>,
										TItemShape
									>
								>
						: never
					: z.ZodObject<
							OutputZodShapeForSchemaShape<
								ArrayItemSchemaShape<TInputField>,
								TItemShape
							>
						>
				: never;

type CodecShapeForSchemaShape<TShape extends z.ZodRawShape> = {
	[K in keyof TShape]: TShape[K] extends z.ZodTypeAny
		? CodecShapeNodeForField<TShape[K]>
		: never;
};

type OutputZodShapeFromCodecShape<S extends RuntimeCodecShape> = {
	[K in KnownKeys<S>]: S[K] extends SchemaCodec<z.ZodTypeAny, infer TSchema>
		? TSchema
		: S[K] extends NoOpCodec
			? z.ZodUnknown
			: S[K] extends ArrayCodecShape<infer TItemShape>
				? z.ZodArray<OutputZodArrayItemFromCodecNode<TItemShape>>
				: S[K] extends RuntimeCodecShape
					? z.ZodObject<OutputZodShapeFromCodecShape<S[K]>>
					: never;
};

type OutputZodShapeFromOutputObject<
	TObj extends object,
	S extends RuntimeCodecShape,
> = {
	[K in KnownKeys<S>]: S[K] extends SchemaCodec<z.ZodTypeAny, infer TSchema>
		? TSchema
		: S[K] extends NoOpCodec
			? K extends keyof TObj
				? ZodTypeForValue<TObj[K]>
				: z.ZodUnknown
			: S[K] extends ArrayCodecShape<infer TItemShape>
				? K extends keyof TObj
					? z.ZodArray<
							OutputZodArrayItemFromOutputValue<
								ArrayItemOfValue<TObj[K]>,
								TItemShape
							>
						>
					: z.ZodArray<OutputZodArrayItemFromCodecNode<TItemShape>>
				: S[K] extends RuntimeCodecShape
					? K extends keyof TObj
						? NonNullable<TObj[K]> extends object
							? z.ZodObject<
									OutputZodShapeFromOutputObject<
										NonNullable<TObj[K]>,
										S[K]
									>
								>
							: never
						: z.ZodObject<OutputZodShapeFromCodecShape<S[K]>>
					: never;
};

type OutputZodNode<TInputField extends z.ZodTypeAny, TShapeNode> =
	TShapeNode extends SchemaCodec<z.ZodTypeAny, infer TSchema>
		? TSchema
		: TShapeNode extends NoOpCodec
			? TInputField
			: TShapeNode extends ArrayCodecShape<infer TItemShape>
				? z.ZodArray<
						OutputZodArrayItemForInputField<TInputField, TItemShape>
					>
				: TShapeNode extends Record<string, any>
					? NestedSchemaShape<TInputField> extends never
						? IsWideZodType<TInputField> extends true
							? [ObjectOutput<TInputField>] extends [never]
								? z.ZodObject<
										OutputZodShapeFromCodecShape<TShapeNode>
									>
								: z.ZodObject<
										OutputZodShapeFromOutputObject<
											ObjectOutput<TInputField>,
											TShapeNode
										>
									>
							: never
						: z.ZodObject<
								OutputZodShapeForSchemaShape<
									NestedSchemaShape<TInputField>,
									TShapeNode
								>
							>
					: never;

type OutputZodShapeForSchemaShape<
	TShape extends z.ZodRawShape,
	S extends RuntimeCodecShape,
> = {
	[K in KnownKeys<S>]: K extends keyof TShape
		? TShape[K] extends z.ZodTypeAny
			? OutputZodNode<TShape[K], S[K]>
			: never
		: never;
};

function isCodec(v: unknown): v is SchemaCodec<z.ZodTypeAny, z.ZodTypeAny> {
	return (
		typeof v === "object" &&
		v !== null &&
		"fromInput" in v &&
		"fromOutput" in v &&
		"inputSchema" in v &&
		"outputSchema" in v
	);
}

function isNoOpCodec(v: unknown): v is NoOpCodec {
	return (
		typeof v === "object" &&
		v !== null &&
		"__noOpCodec" in v &&
		(v as NoOpCodec).__noOpCodec === true
	);
}

function isArrayCodecShape(v: unknown): v is ArrayCodecShape {
	return (
		typeof v === "object" &&
		v !== null &&
		"__arrayCodecShape" in v &&
		(v as ArrayCodecShape).__arrayCodecShape === true &&
		"itemShape" in v
	);
}

function isZodSchema(v: unknown): v is z.ZodTypeAny {
	return (
		typeof v === "object" &&
		v !== null &&
		"_def" in v &&
		"safeParse" in v &&
		typeof (v as { safeParse?: unknown }).safeParse === "function"
	);
}

function getSchemaTypeName(
	schema: z.ZodTypeAny,
): z.ZodFirstPartyTypeKind | undefined {
	const typeName = (
		schema as { _def?: { typeName?: z.ZodFirstPartyTypeKind | string } }
	)._def?.typeName;

	return typeof typeName === "string"
		? (typeName as z.ZodFirstPartyTypeKind)
		: undefined;
}

function hasSchemaType(
	schema: z.ZodTypeAny,
	typeName: z.ZodFirstPartyTypeKind,
): boolean {
	return getSchemaTypeName(schema) === typeName;
}

function isZodObjectSchema(schema: z.ZodTypeAny): schema is z.AnyZodObject {
	return (
		hasSchemaType(schema, z.ZodFirstPartyTypeKind.ZodObject) &&
		"shape" in schema
	);
}

function isZodArraySchema(
	schema: z.ZodTypeAny,
): schema is z.ZodArray<z.ZodTypeAny> {
	return (
		hasSchemaType(schema, z.ZodFirstPartyTypeKind.ZodArray) &&
		"element" in schema
	);
}

function getSchemaNode(schemaShape: z.ZodRawShape, key: string): z.ZodTypeAny {
	const schemaNode = schemaShape[key];
	if (schemaNode === undefined) {
		throw new Error(`Codec shape key "${key}" is not in schema.`);
	}

	if (!isZodSchema(schemaNode)) {
		throw new Error(`Schema key "${key}" is not a Zod schema.`);
	}

	return schemaNode;
}

function unwrapOptionalNullableSchema(schema: z.ZodTypeAny): z.ZodTypeAny {
	let current: z.ZodTypeAny = schema;
	while (
		hasSchemaType(current, z.ZodFirstPartyTypeKind.ZodOptional) ||
		hasSchemaType(current, z.ZodFirstPartyTypeKind.ZodNullable)
	) {
		const unwrap = (current as { unwrap?: () => z.ZodTypeAny }).unwrap;
		if (typeof unwrap !== "function") {
			throw new Error(
				"Expected an unwrap-able optional or nullable schema.",
			);
		}

		current = unwrap.call(current);
	}
	return current;
}

function getNestedObjectSchema(schema: z.ZodTypeAny): z.AnyZodObject {
	const current = unwrapOptionalNullableSchema(schema);

	if (!isZodObjectSchema(current)) {
		throw new Error("Codec shape does not match nested object schema.");
	}

	return current;
}

function getArrayItemSchema(schema: z.ZodTypeAny): z.ZodTypeAny {
	const current = unwrapOptionalNullableSchema(schema);

	if (!isZodArraySchema(current)) {
		throw new Error("Codec shape expects an array schema.");
	}

	return current.element;
}

function asRecord(v: unknown): Record<string, unknown> {
	return typeof v === "object" && v !== null
		? (v as Record<string, unknown>)
		: {};
}
function buildOutputZodArrayItem(
	itemShape: RuntimeArrayItemShape,
	itemSchema: z.ZodTypeAny,
): z.ZodTypeAny {
	if (isCodec(itemShape)) {
		return itemShape.outputSchema;
	}

	if (isNoOpCodec(itemShape)) {
		return itemSchema;
	}

	const nestedObjectSchema = getNestedObjectSchema(itemSchema);
	return z.object(
		buildOutputZodShape(
			itemShape as RuntimeCodecShape,
			nestedObjectSchema.shape,
		),
	);
}

function convertArrayItemFromInput(
	itemShape: RuntimeArrayItemShape,
	item: unknown,
): unknown {
	if (isCodec(itemShape)) {
		return itemShape.fromInput(item);
	}

	if (isNoOpCodec(itemShape)) {
		return item;
	}

	return convertFromInput(itemShape as RuntimeCodecShape, asRecord(item));
}

function convertArrayItemFromOutput(
	itemShape: RuntimeArrayItemShape,
	item: unknown,
): unknown {
	if (isCodec(itemShape)) {
		return itemShape.fromOutput(item);
	}

	if (isNoOpCodec(itemShape)) {
		return item;
	}

	return convertFromOutput(itemShape as RuntimeCodecShape, asRecord(item));
}

function buildOutputZodShape(
	shape: RuntimeCodecShape,
	schemaShape: z.ZodRawShape,
): Record<string, z.ZodTypeAny> {
	const result: Record<string, z.ZodTypeAny> = {};
	for (const key in shape) {
		const node = shape[key];
		const schemaNode = getSchemaNode(schemaShape, key);

		if (isCodec(node)) {
			result[key] = node.outputSchema;
		} else if (isNoOpCodec(node)) {
			result[key] = schemaNode;
		} else if (isArrayCodecShape(node)) {
			const itemSchema = getArrayItemSchema(schemaNode);
			result[key] = z.array(
				buildOutputZodArrayItem(node.itemShape, itemSchema),
			);
		} else {
			const nestedObjectSchema = getNestedObjectSchema(schemaNode);
			result[key] = z.object(
				buildOutputZodShape(
					node as RuntimeCodecShape,
					nestedObjectSchema.shape,
				),
			);
		}
	}
	return result;
}
function convertFromInput(
	shape: RuntimeCodecShape,
	data: Record<string, unknown>,
): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const key in shape) {
		const node = shape[key];
		if (isCodec(node)) {
			result[key] = node.fromInput(data[key]);
		} else if (isNoOpCodec(node)) {
			result[key] = data[key];
		} else if (isArrayCodecShape(node)) {
			const value = data[key];
			result[key] = Array.isArray(value)
				? value.map((item) =>
						convertArrayItemFromInput(node.itemShape, item),
					)
				: value;
		} else {
			result[key] = convertFromInput(
				node as RuntimeCodecShape,
				asRecord(data[key]),
			);
		}
	}
	return result;
}

function convertFromOutput(
	shape: RuntimeCodecShape,
	data: Record<string, unknown>,
): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const key in shape) {
		const node = shape[key];
		if (isCodec(node)) {
			result[key] = node.fromOutput(data[key]);
		} else if (isNoOpCodec(node)) {
			result[key] = data[key];
		} else if (isArrayCodecShape(node)) {
			const value = data[key];
			result[key] = Array.isArray(value)
				? value.map((item) =>
						convertArrayItemFromOutput(node.itemShape, item),
					)
				: value;
		} else {
			result[key] = convertFromOutput(
				node as RuntimeCodecShape,
				asRecord(data[key]),
			);
		}
	}

	return result;
}
