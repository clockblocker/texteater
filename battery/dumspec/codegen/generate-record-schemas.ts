import { readdir, readFile, writeFile } from "node:fs/promises";
import { z } from "zod";
import { recordFileSchema } from "../src/record-schema.js";

// Emits one record JSON Schema per language, with each target's Attestation
// drawn from Dumling's per-route schemas, so a record's `$schema` gives
// editors completion and validation.
const dumlingSchemas = new URL(
	"../../dumling/src/generated/schemas/",
	import.meta.url,
);
const check = process.argv.includes("--check");
const stale: string[] = [];

for (const language of ["de", "en", "he"] as const) {
	const routes = (
		await readdir(new URL(`${language}/`, dumlingSchemas), {
			recursive: true,
		})
	)
		.filter((path) => path.endsWith(".ts"))
		.map((path) => path.slice(0, -".ts".length))
		.toSorted();
	const attestations = await Promise.all(
		routes.map(
			async (route) =>
				(
					(await import(`dumling/schema/${language}/${route}`)) as {
						attestationSchema: z.ZodType;
					}
				).attestationSchema,
		),
	);
	const [first, ...rest] = attestations;
	if (!first) throw Error(`Dumling has no ${language} routes`);
	const { $schema, ...body } = z.toJSONSchema(
		recordFileSchema(z.union([first, ...rest])),
		{ io: "input", unrepresentable: "any" },
	);
	const schema = {
		$schema,
		$id: `https://unpkg.com/dumspec/schema/spec-record.${language}.json`,
		title: `Dumspec ${language} Spec Record`,
		...body,
	};
	const output = new URL(
		`../schema/spec-record.${language}.json`,
		import.meta.url,
	);
	const content = `${JSON.stringify(schema, null, "\t")}\n`;
	if (!check) await writeFile(output, content);
	else if ((await readFile(output, "utf8").catch(() => "")) !== content)
		stale.push(output.pathname);
}
if (stale.length > 0)
	throw Error(
		`Stale record JSON Schema: ${stale.join(", ")}; run bun run generate`,
	);
