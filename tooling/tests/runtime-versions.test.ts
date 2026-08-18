import { expect, test } from "bun:test";
import { join } from "node:path";
import { discoverWorkspaces, findRepositoryRoot } from "../lib/workspaces";

test("Bun, Node.js, and Convex runtime versions stay aligned", async () => {
	const root = await findRepositoryRoot(import.meta.dir);
	const rootManifest = await Bun.file(join(root, "package.json")).json();
	const bunVersion = rootManifest.packageManager.replace(/^bun@/, "");
	const nodeVersion = rootManifest.devDependencies.node;
	const nodeMajor = nodeVersion.split(".")[0];

	expect(rootManifest.devDependencies["bun-types"]).toBe(bunVersion);
	expect(rootManifest.engines.node).toBe(`${nodeMajor}.x`);
	expect(await Bun.file(join(root, ".nvmrc")).text()).toBe(
		`${nodeVersion}\n`,
	);

	for (const workspace of await discoverWorkspaces(root)) {
		expect(workspace.manifest.packageManager).toBe(
			rootManifest.packageManager,
		);
		expect(workspace.manifest.engines).toEqual({ node: `${nodeMajor}.x` });
	}

	const convexConfig = await Bun.file(
		join(root, "app/tf-demo/convex.json"),
	).json();
	expect(convexConfig.node.nodeVersion).toBe(nodeMajor);
});
