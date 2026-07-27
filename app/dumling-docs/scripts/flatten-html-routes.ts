import { existsSync, readdirSync, renameSync, rmSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const distDir = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");

function flattenHtmlRouteDirs(dir: string): void {
	if (!existsSync(dir)) {
		return;
	}

	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (!entry.isDirectory()) {
			continue;
		}

		const entryPath = join(dir, entry.name);
		flattenHtmlRouteDirs(entryPath);

		if (!basename(entryPath).endsWith(".html")) {
			continue;
		}

		const indexPath = join(entryPath, "index.html");
		if (!existsSync(indexPath)) {
			continue;
		}

		const temporaryPath = `${entryPath}.__flatten_tmp__`;
		renameSync(indexPath, temporaryPath);
		rmSync(entryPath, { force: true, recursive: true });
		renameSync(temporaryPath, entryPath);
	}
}

flattenHtmlRouteDirs(distDir);
