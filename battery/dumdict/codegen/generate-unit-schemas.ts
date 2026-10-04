import { readFile, writeFile } from "node:fs/promises";
import { formatTypeScript } from "codegen";
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
const target = new URL("../src/generated/unit-schemas.ts", import.meta.url);
const output = await formatTypeScript(
	`// Generated from Dumling's concrete schema exports.\nimport type * as Dumling from "dumling/types";\nimport {type ZodType,z} from "zod";\n${imports}\ntype UnitSchemas<L extends Dumling.Language>={lemma:ZodType<Dumling.Lemma<L>>;reading:ZodType<Dumling.Reading<L>>;surface:ZodType<Dumling.Surface<L>>;attestation:ZodType<Dumling.Attestation<L>>};\n// Annotated so declaration emit need not serialize every route's schema type.\nexport const unitSchemas:{[L in Dumling.Language]:UnitSchemas<L>}={${schemas}};\n`,
	target,
);
if (process.argv.includes("--check")) {
	if ((await readFile(target, "utf8").catch(() => "")) !== output)
		throw Error("Stale Dumdict unit schemas");
} else await writeFile(target, output);
