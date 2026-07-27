import { expect, test } from "bun:test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import {
	discoverWorkspaces,
	orderWorkspacesByDependencies,
} from "../lib/workspaces";
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

test("workspace command order puts declared dependencies first", async () => {
	const root = await temporaryRepository();
	await addWorkspace(root, { kind: "battery", name: "core" });
	await addWorkspace(root, {
		dependencies: { core: "workspace:^" },
		kind: "app",
		name: "docs",
	});

	const ordered = orderWorkspacesByDependencies(
		await discoverWorkspaces(root),
	);

	expect(ordered.map((workspace) => workspace.manifest.name)).toEqual([
		"core",
		"docs",
	]);
});
