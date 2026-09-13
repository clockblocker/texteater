import { readFile, writeFile } from "node:fs/promises";
import { loadRoutes } from "../../dumling/codegen/routes.js";
import { formatTypeScript } from "../../dumrel/codegen/format-typescript.js";

const routes = await loadRoutes();
const imports = routes
	.map(
		(route, index) =>
			`import * as R${index} from "dumling/schema/${route.modulePath.replace(/\.js$/, "")}";`,
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
	`// Generated from Dumling's concrete schema exports.\nimport {z} from "zod";\n${imports}\nexport const unitSchemas={${schemas}};\n`,
	target,
);
if (process.argv.includes("--check")) {
	if ((await readFile(target, "utf8").catch(() => "")) !== output)
		throw Error("Stale Dumdict unit schemas");
} else await writeFile(target, output);
