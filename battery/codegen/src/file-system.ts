import type { Dirent, Stats } from "node:fs";
import {
	lstat,
	mkdir,
	readdir,
	readFile,
	rename,
	rm,
	writeFile,
} from "node:fs/promises";
import { basename, dirname, relative, resolve, sep } from "node:path";
import { CodegenInputError, CodegenPlanError } from "./errors.js";
import { isWithin } from "./paths.js";
import { errorCode, errorMessage } from "./values.js";

export interface CodegenFileSystem {
	assertSafePath(root: string, path: string): Promise<void>;
	listFiles(root: string, recursive: boolean): Promise<readonly string[]>;
	read(path: string): Promise<Uint8Array | undefined>;
	remove(path: string): Promise<void>;
	write(path: string, content: Uint8Array): Promise<void>;
}

let temporaryFileCounter = 0;

export const nodeFileSystem: CodegenFileSystem = {
	async assertSafePath(root, path) {
		const absoluteRoot = resolve(root);
		const absolutePath = resolve(path);
		if (!isWithin(absoluteRoot, absolutePath)) {
			throw new CodegenPlanError(
				`Path "${absolutePath}" escapes filesystem boundary "${absoluteRoot}".`,
			);
		}

		const segments = relative(absoluteRoot, absolutePath)
			.split(sep)
			.filter((segment) => segment.length > 0);
		let current = absoluteRoot;
		for (const [index, segment] of segments.entries()) {
			current = resolve(current, segment);
			let stats: Stats;
			try {
				stats = await lstat(current);
			} catch (error) {
				if (errorCode(error) === "ENOENT") {
					return;
				}
				throw new CodegenPlanError(
					`Cannot inspect output path "${current}": ${errorMessage(error)}`,
				);
			}
			if (stats.isSymbolicLink()) {
				throw new CodegenPlanError(
					`Output path "${absolutePath}" traverses symbolic link "${current}".`,
				);
			}
			if (index < segments.length - 1 && !stats.isDirectory()) {
				throw new CodegenPlanError(
					`Output path "${absolutePath}" traverses non-directory "${current}".`,
				);
			}
		}
	},
	async listFiles(root, recursive) {
		const files: string[] = [];

		async function visit(directory: string): Promise<void> {
			let entries: Dirent[];
			try {
				entries = await readdir(directory, { withFileTypes: true });
			} catch (error) {
				throw new CodegenInputError(
					`Cannot discover input directory "${directory}": ${errorMessage(error)}`,
				);
			}

			for (const entry of entries) {
				const path = resolve(directory, entry.name);
				if (entry.isFile()) {
					files.push(path);
				} else if (recursive && entry.isDirectory()) {
					await visit(path);
				}
			}
		}

		await visit(root);
		return files;
	},
	async read(path) {
		try {
			return await readFile(path);
		} catch (error) {
			if (errorCode(error) === "ENOENT") {
				return undefined;
			}
			throw error;
		}
	},
	async remove(path) {
		await rm(path, { force: true });
	},
	async write(path, content) {
		await mkdir(dirname(path), { recursive: true });
		const temporaryPath = resolve(
			dirname(path),
			`.${basename(path)}.codegen-${process.pid}-${temporaryFileCounter++}.tmp`,
		);
		try {
			await writeFile(temporaryPath, content, { flag: "wx" });
			await rename(temporaryPath, path);
		} catch (error) {
			await rm(temporaryPath, { force: true }).catch(() => undefined);
			throw error;
		}
	},
};
