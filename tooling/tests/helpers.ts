import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

export async function temporaryRepository(): Promise<string> {
	const root = await mkdtemp(join(tmpdir(), "textfresser-tooling-"));
	await writeJson(join(root, "package.json"), {
		name: "fixture",
		private: true,
		packageManager: "bun@1.3.0",
		workspaces: ["app/*", "battery/*"],
		scripts: {
			build: "bun tooling/manifest-policy.ts repository && bun tooling/run-workspaces.ts build",
			validate: "bun tooling/validate-repository.ts",
		},
		devDependencies: {
			"@biomejs/biome": "^2.5.5",
		},
	});
	return root;
}

export async function writeJson(path: string, value: unknown): Promise<void> {
	await mkdir(join(path, ".."), { recursive: true });
	await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

export async function addWorkspace(
	root: string,
	options: {
		dependencies?: Record<string, string>;
		exports?: Record<string, unknown>;
		kind: "app" | "battery";
		name: string;
		private?: boolean;
		version?: string;
	},
): Promise<string> {
	const dir = join(root, options.kind, options.name.replace(/^@[^/]+\//, ""));
	const manifest = {
		name: options.name,
		version: options.version ?? "1.0.0",
		description: `${options.name} fixture`,
		private: options.private ?? true,
		type: "module",
		packageManager: "bun@1.3.0",
		license: "MIT",
		exports: options.exports ?? { ".": "./dist/index.js" },
		files: ["dist"],
		scripts: {
			build: "bun ../../tooling/manifest-policy.ts package && bun build src/index.ts",
			test: "bun test",
			validate: "bun ../../tooling/validate-package.ts",
		},
		dependencies: options.dependencies ?? {},
	};
	await writeJson(join(dir, "package.json"), manifest);
	await mkdir(join(dir, "src"), { recursive: true });
	return dir;
}

export async function writeSource(
	workspaceDir: string,
	relativePath: string,
	contents: string,
): Promise<void> {
	const path = join(workspaceDir, relativePath);
	await mkdir(join(path, ".."), { recursive: true });
	await writeFile(path, contents);
}
