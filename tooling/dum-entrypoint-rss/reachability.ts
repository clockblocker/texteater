import { dirname, join, normalize } from "node:path";
import { findRepositoryRoot } from "../lib/workspaces";

const workspacePackages = new Set(["dumling", "dumrel", "dumdict", "dumgen"]);
const heavyweightPackages = new Set(["codec-builder-library", "openai", "zod"]);

export type EntrypointReachability = {
	readonly externalPackages: readonly string[];
	readonly heavyweightDependencies: readonly string[];
	readonly schemaEntrypoints: readonly string[];
	readonly workspaceEntrypoints: readonly string[];
};

function packageNameFor(specifier: string): string {
	if (!specifier.startsWith("@")) return specifier.split("/")[0] ?? specifier;
	return specifier.split("/").slice(0, 2).join("/");
}

function resolveRelativeImport(from: string, specifier: string): string {
	const unresolved = normalize(join(dirname(from), specifier));
	return unresolved.endsWith(".js") ? unresolved : `${unresolved}.js`;
}

export async function auditEntrypointReachability(
	rootSpecifier: string,
): Promise<EntrypointReachability> {
	const root = await findRepositoryRoot(import.meta.dir);
	const visitedFiles = new Set<string>();
	const workspaceEntrypoints = new Set<string>();
	const schemaEntrypoints = new Set<string>();
	const externalPackages = new Set<string>();
	const manifestCache = new Map<string, Record<string, unknown>>();

	async function resolveWorkspaceEntrypoint(
		specifier: string,
	): Promise<string> {
		const packageName = packageNameFor(specifier);
		let manifest = manifestCache.get(packageName);
		if (manifest === undefined) {
			const loadedManifest: Record<string, unknown> = await Bun.file(
				join(root, "battery", packageName, "package.json"),
			).json();
			manifestCache.set(packageName, loadedManifest);
			manifest = loadedManifest;
		}
		const subpath =
			specifier === packageName
				? "."
				: `./${specifier.slice(packageName.length + 1)}`;
		const exported = (
			manifest.exports as Record<string, { import?: string } | string>
		)[subpath];
		const relative =
			typeof exported === "string" ? exported : exported?.import;
		if (relative === undefined) {
			throw new Error(
				`Cannot resolve published entrypoint ${specifier}.`,
			);
		}
		return join(root, "battery", packageName, relative);
	}

	async function visitFile(file: string): Promise<void> {
		if (visitedFiles.has(file)) return;
		visitedFiles.add(file);
		const source = await Bun.file(file).text();
		const imports = new Bun.Transpiler({ loader: "js" }).scanImports(
			source,
		);
		for (const imported of imports) {
			const specifier = imported.path;
			if (specifier.startsWith(".")) {
				await visitFile(resolveRelativeImport(file, specifier));
				continue;
			}
			if (specifier.startsWith("node:")) continue;
			const packageName = packageNameFor(specifier);
			if (workspacePackages.has(packageName)) {
				workspaceEntrypoints.add(specifier);
				if (specifier.endsWith("/schema"))
					schemaEntrypoints.add(specifier);
				await visitFile(await resolveWorkspaceEntrypoint(specifier));
				continue;
			}
			externalPackages.add(packageName);
		}
	}

	workspaceEntrypoints.add(rootSpecifier);
	await visitFile(await resolveWorkspaceEntrypoint(rootSpecifier));

	return {
		externalPackages: [...externalPackages].sort(),
		heavyweightDependencies: [...externalPackages]
			.filter((dependency) => heavyweightPackages.has(dependency))
			.sort(),
		schemaEntrypoints: [...schemaEntrypoints].sort(),
		workspaceEntrypoints: [...workspaceEntrypoints].sort(),
	};
}
