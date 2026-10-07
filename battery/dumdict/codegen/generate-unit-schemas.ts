import { fileURLToPath } from "node:url";
import { defineCodegen, formatTypeScript } from "codegen";
import { dumlingRoutes as routes } from "dumling/codegen";

const imports = routes
	.map(
		(route, index) =>
			`import * as R${index} from "dumling/schema/${route.schemaPath}";`,
	)
	.join("\n");
const schemas = ["de", "en", "he"]
	.map(
		(language) =>
			`${language}:{${["lemma", "reading", "surface", "attestation"].map((unit) => `${unit}:z.union([${routes.flatMap((route, index) => (route.language === language ? [`R${index}.${unit}Schema`] : [])).join(",")}])`).join(",")}}`,
	)
	.join(",");
const generated = new URL("../src/generated/", import.meta.url);
export const unitSchemasRecipe = defineCodegen({
	inputs: {},
	outputs: { generated: { root: fileURLToPath(generated) } },
	build: async () => [
		{
			id: "unit-schemas",
			to: { target: "generated", path: "unit-schemas.ts" },
			content: await formatTypeScript(
				`// Generated from Dumling's concrete schema exports.\nimport type * as Dumling from "dumling/types";\nimport {type ZodType,z} from "zod";\n${imports}\ntype UnitSchemas<L extends Dumling.Language>={lemma:ZodType<Dumling.Lemma<L>>;reading:ZodType<Dumling.Reading<L>>;surface:ZodType<Dumling.Surface<L>>;attestation:ZodType<Dumling.Attestation<L>>};\n// Annotated so declaration emit need not serialize every route's schema type.\nexport const unitSchemas:{[L in Dumling.Language]:UnitSchemas<L>}={${schemas}};\n`,
				new URL("unit-schemas.ts", generated),
			),
			provenance: [],
			meta: null,
		},
	],
});
