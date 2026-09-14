import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { linkRegistries, type LinkInput } from "./link-registries";

export const linkedOwners = ["dumling", "dumrel", "dumgen"] as const;

export async function applyLinkedRules(root: string) {
	const inputs = await Promise.all(
		linkedOwners.map(async (owner) => ({
			owner,
			registry: JSON.parse(
				(
					await import(
						join(
							root,
							`battery/${owner}/src/generated/validation.ts`,
						)
					)
				).encodedValidation,
			) as LinkInput,
		})),
	);
	const linked = linkRegistries(inputs);
	for (const [index, entry] of linked.entries()) {
		const owner = entry.owner;
		const directory = join(root, `battery/${owner}`);
		const parent = linked[index - 1];
		const source = `import type { Constraint } from "common-utils";
${
	parent
		? `import { linkedRegistry as parent, artifactFingerprint as parentFingerprint } from "${parent.owner}/compiled-validation";
if (parentFingerprint !== ${JSON.stringify(entry.requiredFingerprint)}) throw Error("Incompatible ${parent.owner} compiled validation artifact; rebuild ${owner}");`
		: ""
}
export const artifactFingerprint = ${JSON.stringify(entry.fingerprint)};
export const linkedRegistry: {version:1; roots:Record<string,Constraint>; definitions:Record<string,Constraint>} = JSON.parse(${JSON.stringify(entry.encoded)});
${parent ? "Object.setPrototypeOf(linkedRegistry.definitions, parent.definitions);" : "Object.setPrototypeOf(linkedRegistry.definitions, null);"}
`;
		await writeFile(
			join(directory, "src/experiment-linked-registry.ts"),
			source,
		);
		const consumer = join(
			directory,
			"src",
			owner === "dumling"
				? "parse-unit.ts"
				: owner === "dumrel"
					? "validation.ts"
					: "universal/validation.ts",
		);
		const original = await readFile(consumer, "utf8");
		if (!original.includes("JSON.parse(encodedValidation)"))
			throw Error(`Consumer patch drift: ${owner}`);
		await writeFile(
			consumer,
			original
				.replace(
					/import \{ encodedValidation \} from "\.\.?\/generated\/validation.js";/,
					`import { linkedRegistry } from "${owner === "dumgen" ? ".." : "."}/experiment-linked-registry.js";`,
				)
				.replace(
					"JSON.parse(encodedValidation)",
					owner === "dumrel"
						? "linkedRegistry as Registry"
						: "linkedRegistry",
				),
		);
		const manifestPath = join(directory, "package.json");
		const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
		if (owner !== "dumgen")
			manifest.exports["./compiled-validation"] = {
				types: "./dist/experiment-linked-registry.d.ts",
				import: "./dist/experiment-linked-registry.js",
				default: "./dist/experiment-linked-registry.js",
			};
		// Splitting keeps the provider and its public parser on the SAME table instance.
		manifest.scripts["build:js"] = manifest.scripts["build:js"].replace(
			"--bundle",
			`${owner !== "dumgen" ? "src/experiment-linked-registry.ts " : ""}--bundle --splitting`,
		);
		await writeFile(
			manifestPath,
			JSON.stringify(manifest, null, "\t") + "\n",
		);
	}
	await writeFile(
		join(
			root,
			"battery/experiments/dum-validation/linked-rules-statistics.json",
		),
		JSON.stringify(
			linked.map(
				({ owner, fingerprint, requiredFingerprint, statistics }) => ({
					owner,
					fingerprint,
					requiredFingerprint,
					...statistics,
				}),
			),
			null,
			2,
		) + "\n",
	);
}
