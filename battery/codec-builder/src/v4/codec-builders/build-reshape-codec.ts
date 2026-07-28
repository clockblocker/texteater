import { z } from "zod/v4";
import type { SchemaCodec, SchemaShapeOf } from "../core/types";

export function buildReshapeCodec<
	TInputSchema extends z.ZodObject,
	const TFieldName extends string,
	TFieldSchema extends z.ZodTypeAny,
	const TDropFields extends readonly SchemaKeys<TInputSchema>[] = [],
>(
	inputSchema: TInputSchema,
	config: ReshapeCodecConfig<
		TInputSchema,
		TFieldName,
		TFieldSchema,
		TDropFields
	>,
) {
	const { fieldName, fieldSchema, dropFields, construct, reconstruct } =
		config;
	const dropFieldSet = new Set<string>((dropFields ?? []) as string[]);

	if (fieldName in inputSchema.shape) {
		throw new Error(
			`Cannot add field "${fieldName}" because it already exists in the input schema.`,
		);
	}

	const shapeWithoutDroppedEntries = Object.entries(inputSchema.shape).filter(
		([key]) => !dropFieldSet.has(key),
	);
	const shapeWithoutDropped = Object.fromEntries(shapeWithoutDroppedEntries);

	type OutputShape = OutputSchemaShape<
		TInputSchema,
		TFieldName,
		TFieldSchema,
		TDropFields
	>;

	const outputSchema = z.object({
		...shapeWithoutDropped,
		[fieldName]: fieldSchema,
	} as OutputShape) as z.ZodObject<OutputShape>;

	type InputType = z.infer<TInputSchema>;
	type OutputType = z.infer<typeof outputSchema>;

	const fromInput = (data: InputType): OutputType => {
		const constructedField = construct(data);
		const result = {
			...data,
			[fieldName]: constructedField,
		} as Record<string, unknown>;

		for (const dropField of dropFieldSet) {
			delete result[dropField];
		}

		return result as OutputType;
	};

	const fromOutput = (data: OutputType): InputType => {
		const fieldValue = (data as Record<string, unknown>)[
			fieldName
		] as z.output<TFieldSchema>;
		const reconstructedFields = reconstruct(
			fieldValue,
			data as OutputWithAddedField<
				TInputSchema,
				TFieldName,
				TFieldSchema,
				TDropFields
			>,
		);

		const result: Record<string, unknown> = {
			...(data as Record<string, unknown>),
			...(reconstructedFields as Record<string, unknown>),
		};
		delete result[fieldName];

		return result as InputType;
	};

	return {
		inputSchema,
		outputSchema,
		fromInput,
		fromOutput,
	} satisfies SchemaCodec<TInputSchema, typeof outputSchema>;
}

// -- Internals --

type IsTuple<T extends readonly unknown[]> = number extends T["length"]
	? false
	: true;

type SchemaKeys<TInputSchema extends z.ZodObject> = Extract<
	keyof SchemaShapeOf<TInputSchema>,
	string
>;

type OutputSchemaShape<
	TInputSchema extends z.ZodObject,
	TFieldName extends string,
	TFieldSchema extends z.ZodTypeAny,
	TDropFields extends readonly SchemaKeys<TInputSchema>[],
> =
	IsTuple<TDropFields> extends true
		? Omit<SchemaShapeOf<TInputSchema>, TDropFields[number]> &
				Record<TFieldName, TFieldSchema>
		: SchemaShapeOf<TInputSchema> & Record<TFieldName, TFieldSchema>;

type OutputWithAddedField<
	TInputSchema extends z.ZodObject,
	TFieldName extends string,
	TFieldSchema extends z.ZodTypeAny,
	TDropFields extends readonly SchemaKeys<TInputSchema>[],
> =
	IsTuple<TDropFields> extends true
		? Omit<z.infer<TInputSchema>, TDropFields[number]> &
				Record<TFieldName, z.output<TFieldSchema>>
		: Partial<Pick<z.infer<TInputSchema>, TDropFields[number]>> &
				Partial<Omit<z.infer<TInputSchema>, TDropFields[number]>> &
				Record<TFieldName, z.output<TFieldSchema>>;

type ReconstructedInputWithDroppedFields<
	TInputSchema extends z.ZodObject,
	TDropFields extends readonly SchemaKeys<TInputSchema>[],
> =
	IsTuple<TDropFields> extends true
		? Required<Pick<z.infer<TInputSchema>, TDropFields[number]>> &
				Partial<Omit<z.infer<TInputSchema>, TDropFields[number]>>
		: Partial<z.infer<TInputSchema>>;

type ReshapeCodecConfig<
	TInputSchema extends z.ZodObject,
	TFieldName extends string,
	TFieldSchema extends z.ZodTypeAny,
	TDropFields extends readonly SchemaKeys<TInputSchema>[],
> = {
	fieldName: TFieldName;
	fieldSchema: TFieldSchema;
	dropFields?: TDropFields;
	construct: (input: z.infer<TInputSchema>) => z.output<TFieldSchema>;
	reconstruct: (
		fieldValue: z.output<TFieldSchema>,
		output: OutputWithAddedField<
			TInputSchema,
			TFieldName,
			TFieldSchema,
			TDropFields
		>,
	) => ReconstructedInputWithDroppedFields<TInputSchema, TDropFields>;
};
