import { expect, test } from "bun:test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { discoverWorkspaces, workspaceScope } from "../lib/workspaces";
import { addWorkspace, temporaryRepository } from "./helpers";

test("workspace discovery finds current and future app/* and battery/* packages", async () => {
	const root = await temporaryRepository();
	await addWorkspace(root, { kind: "app", name: "docs" });
	await addWorkspace(root, { kind: "battery", name: "core" });
	await addWorkspace(root, { kind: "battery", name: "future" });
	await mkdir(join(root, "app", "not-a-workspace"), { recursive: true });

	const workspaces = await discoverWorkspaces(root);

	expect(workspaces.map((workspace) => workspace.relativePath)).toEqual([
		"app/docs",
		"battery/core",
		"battery/future",
	]);
});

test("a run's scope is the workspace holding its cwd, or the whole repository at the root", async () => {
	const root = await temporaryRepository();
	await addWorkspace(root, { kind: "battery", name: "core" });
	await addWorkspace(root, { kind: "battery", name: "core-extra" });
	const workspaces = await discoverWorkspaces(root);
	const scopeOf = (cwd: string) =>
		workspaceScope(cwd, root, workspaces)?.relativePath;

	expect(scopeOf(root)).toBeUndefined();
	expect(scopeOf(join(root, "battery/core"))).toBe("battery/core");
	expect(scopeOf(join(root, "battery/core/src"))).toBe("battery/core");
	expect(scopeOf(join(root, "battery/core-extra"))).toBe(
		"battery/core-extra",
	);
	expect(() => scopeOf(join(root, "tooling"))).toThrow(
		"is neither the repository root nor a workspace",
	);
});
