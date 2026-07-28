import { relative, resolve } from "node:path";
import type { CodegenFileSystem } from "../src/runner.js";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export class MemoryFileSystem implements CodegenFileSystem {
	readonly mutations: string[] = [];
	readonly #files = new Map<string, Uint8Array>();

	constructor(files: Readonly<Record<string, string>> = {}) {
		for (const [path, content] of Object.entries(files)) {
			this.#files.set(resolve(path), encoder.encode(content));
		}
	}

	async assertSafePath(root: string, path: string): Promise<void> {
		const remainder = relative(resolve(root), resolve(path));
		if (remainder.startsWith("..") || remainder.startsWith("/")) {
			throw new Error(`${path} escapes ${root}`);
		}
	}

	async listFiles(
		root: string,
		recursive: boolean,
	): Promise<readonly string[]> {
		const absoluteRoot = resolve(root);
		return [...this.#files.keys()]
			.filter((path) => {
				const remainder = relative(absoluteRoot, path);
				return (
					remainder !== "" &&
					!remainder.startsWith("..") &&
					(recursive || !remainder.includes("/"))
				);
			})
			.toReversed();
	}

	async read(path: string): Promise<Uint8Array | undefined> {
		const content = this.#files.get(resolve(path));
		return content === undefined ? undefined : new Uint8Array(content);
	}

	async remove(path: string): Promise<void> {
		const absolute = resolve(path);
		this.mutations.push(`remove:${absolute}`);
		this.#files.delete(absolute);
	}

	async write(path: string, content: Uint8Array): Promise<void> {
		const absolute = resolve(path);
		this.mutations.push(`write:${absolute}`);
		this.#files.set(absolute, new Uint8Array(content));
	}

	clearMutations(): void {
		this.mutations.length = 0;
	}

	text(path: string): string | undefined {
		const content = this.#files.get(resolve(path));
		return content === undefined ? undefined : decoder.decode(content);
	}
}
