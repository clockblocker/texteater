import { modelSchemas } from "../../../generated/model-schemas.js";

type Scalar = string | number | boolean | null;
export type FeatureField = { values: Scalar[]; open: boolean };
type Schema = {
	type?: string;
	const?: Scalar;
	enum?: Scalar[];
	properties?: Record<string, Schema>;
	anyOf?: Schema[];
	allOf?: Schema[];
};
/** The domain schema owns legal values. Questions add uncertainty without overloading domain null. */
function fields(
	schema: Schema,
	path = "",
	output = new Map<string, FeatureField>(),
): Map<string, FeatureField> {
	for (const branch of [...(schema.anyOf ?? []), ...(schema.allOf ?? [])])
		fields(branch, path, output);
	for (const [key, value] of Object.entries(schema.properties ?? {}))
		fields(value, path ? `${path}.${key}` : key, output);
	if (
		Object.hasOwn(schema, "const") ||
		schema.enum ||
		schema.type === "null" ||
		(schema.type === "string" && !schema.enum)
	) {
		const field = output.get(path) ?? { values: [], open: false };
		for (const value of schema.enum ??
			(Object.hasOwn(schema, "const")
				? [schema.const!]
				: schema.type === "null"
					? [null]
					: []))
			if (!field.values.includes(value)) field.values.push(value);
		field.open ||=
			schema.type === "string" &&
			!schema.enum &&
			!Object.hasOwn(schema, "const");
		output.set(path, field);
	}
	return output;
}
const fieldCatalogs = new Map<string, Map<string, FeatureField>>();

export function grammarFeatureFields(
	route: string,
): ReadonlyMap<string, FeatureField> {
	const cached = fieldCatalogs.get(route);
	if (cached) return cached;
	const schema = modelSchemas[`grammar/${route}`];
	if (!schema) throw Error(`Missing grammar schema: ${route}`);
	const catalog = fields(schema as Schema);
	fieldCatalogs.set(route, catalog);
	return catalog;
}
