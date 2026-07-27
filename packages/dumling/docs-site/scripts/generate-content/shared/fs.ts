import {
	existsSync,
	mkdirSync,
	readdirSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { serializeFrontmatter } from "../docs/frontmatter";
import type { Frontmatter } from "./types";

export function listMarkdownFiles(dir: string): string[] {
	if (!existsSync(dir)) {
		return [];
	}

	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const entryPath = join(dir, entry.name);
		if (entry.isDirectory()) {
			return listMarkdownFiles(entryPath);
		}
		if (entry.isFile() && entry.name.endsWith(".md")) {
			return [entryPath];
		}
		return [];
	});
}

export function listTypeScriptFiles(dir: string): string[] {
	if (!existsSync(dir)) {
		return [];
	}

	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const entryPath = join(dir, entry.name);
		if (entry.isDirectory()) {
			return listTypeScriptFiles(entryPath);
		}
		if (
			entry.isFile() &&
			entry.name.endsWith(".ts") &&
			!entry.name.endsWith(".d.ts")
		) {
			return [entryPath];
		}
		return [];
	});
}

export function ensureCleanDir(dir: string): void {
	if (existsSync(dir)) {
		rmSync(dir, { recursive: true });
	}
	mkdirSync(dir, { recursive: true });
}

export function removeGeneratedPublicFiles(dir: string): void {
	if (!existsSync(dir)) {
		return;
	}

	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const entryPath = join(dir, entry.name);
		if (entry.isDirectory()) {
			removeGeneratedPublicFiles(entryPath);
			if (readdirSync(entryPath).length === 0) {
				rmSync(entryPath, { recursive: true });
			}
			continue;
		}
		if (
			entry.isFile() &&
			(entry.name.endsWith(".md") || entry.name === "nav.json")
		) {
			rmSync(entryPath);
		}
	}
}

export function removeEmptyDirectories(dir: string): void {
	if (!existsSync(dir)) {
		return;
	}

	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (!entry.isDirectory()) {
			continue;
		}
		const entryPath = join(dir, entry.name);
		removeEmptyDirectories(entryPath);
		if (readdirSync(entryPath).length === 0) {
			rmSync(entryPath, { recursive: true });
		}
	}
}

export function writeGeneratedMarkdown(
	generatedPath: string,
	frontmatter: Frontmatter,
	body: string,
	publicPath: string,
): void {
	mkdirSync(dirname(generatedPath), { recursive: true });
	writeFileSync(
		generatedPath,
		`${serializeFrontmatter(frontmatter)}\n${body}`,
	);

	mkdirSync(dirname(publicPath), { recursive: true });
	writeFileSync(publicPath, body);
}

export function ensureTextFile(path: string, text: string): void {
	if (!existsSync(path)) {
		writeFileSync(path, text);
	}
}
