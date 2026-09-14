import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { emitSplitRegistry, operationGroup } from "./split-registries";

export async function applyOperationSplitting(
	root: string,
	allPackages: boolean,
) {
	const statistics = [];
	for (const owner of allPackages
		? ["dumling", "dumrel", "dumgen"]
		: ["dumgen"]) {
		const directory = join(root, "battery", owner);
		const artifact = await import(
			join(directory, "src/generated/validation.ts")
		);
		const registry = JSON.parse(artifact.encodedValidation);
		const generated = emitSplitRegistry(registry, (name) =>
			operationGroup(owner, name),
		);
		await writeFile(
			join(directory, "src/experiment-operation-registry.ts"),
			generated.source,
		);
		const consumer = join(
			directory,
			"src",
			owner === "dumling"
				? "parse-unit.ts"
				: owner === "dumgen"
					? "universal/validation.ts"
					: "validation.ts",
		);
		const source = await readFile(consumer, "utf8");
		if (!source.includes("JSON.parse(encodedValidation)"))
			throw new Error(`Consumer patch drift: ${consumer}`);
		await writeFile(
			consumer,
			source
				.replace(
					/import \{ encodedValidation \} from "[^"]+";/,
					`import { operationRegistry } from "${owner === "dumgen" ? ".." : "."}/experiment-operation-registry.js";`,
				)
				.replace("JSON.parse(encodedValidation)", "operationRegistry"),
		);
		statistics.push({ owner, ...generated.statistics });
	}
	await writeFile(
		join(
			root,
			"battery/experiments/dum-validation/operation-splitting-statistics.json",
		),
		JSON.stringify(
			{
				mode: "Synchronous per-operation decoding with per-package shared definitions. Encoded strings remain in the initial bundle. No new public exports or cross-package raw artifact API.",
				packages: statistics,
			},
			null,
			2,
		) + "\n",
	);
}
