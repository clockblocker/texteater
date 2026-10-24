import { isAbsolute, posix, relative, resolve, win32 } from "node:path";
import { CodegenConfigurationError } from "./errors.js";

export function validateRelativePath(path: string, label: string): string {
	if (
		typeof path !== "string" ||
		path.length === 0 ||
		path.includes("\0") ||
		path.includes("\\") ||
		isAbsolute(path) ||
		win32.isAbsolute(path)
	) {
		throw new CodegenConfigurationError(
			`The ${label} must be a safe relative path; received "${String(path)}".`,
		);
	}
	const normalized = posix.normalize(path);
	const hasNonPortableSegment = path
		.split("/")
		.some((segment) => isUnsupportedPathSegment(segment));
	if (
		normalized !== path ||
		normalized === "." ||
		normalized === ".." ||
		normalized.startsWith("../") ||
		path.endsWith("/") ||
		hasNonPortableSegment
	) {
		throw new CodegenConfigurationError(
			`The ${label} must be a normalized, portable relative file path; received "${path}".`,
		);
	}
	return normalized;
}

export function destinationWithin(root: string, path: string): string {
	const destination = resolve(root, path);
	if (!isWithin(root, destination)) {
		throw new CodegenConfigurationError(
			`Path "${path}" escapes output root "${root}".`,
		);
	}
	return destination;
}

export function resolveManifestDestination(
	root: string,
	manifest: string,
	target: string,
): string {
	if (manifest.includes("\0") || manifest.length === 0) {
		throw new CodegenConfigurationError(
			`Ownership manifest for output "${target}" has an invalid path.`,
		);
	}
	if (isAbsolute(manifest)) {
		const destination = resolve(manifest);
		validateConfiguredAbsolutePath(
			destination,
			`ownership manifest for output "${target}"`,
		);
		return destination;
	}
	if (win32.isAbsolute(manifest)) {
		throw new CodegenConfigurationError(
			`Ownership manifest "${manifest}" uses an absolute path for a different platform.`,
		);
	}
	return destinationWithin(
		root,
		validateRelativePath(
			manifest,
			`ownership manifest for output "${target}"`,
		),
	);
}

export function validateConfiguredAbsolutePath(
	path: string,
	label: string,
): void {
	if (process.platform !== "win32") {
		return;
	}
	const root = win32.parse(path).root;
	const segments = path
		.slice(root.length)
		.split(/[\\/]/u)
		.filter((segment) => segment.length > 0);
	if (segments.some((segment) => isUnsupportedPathSegment(segment))) {
		throw new CodegenConfigurationError(
			`The ${label} contains a path segment unsupported on Windows: "${path}".`,
		);
	}
}

function isUnsupportedPathSegment(segment: string): boolean {
	return (
		segment
			.split("")
			.some((character) => character.charCodeAt(0) <= 0x1f) ||
		/[<>:"|?*]/u.test(segment) ||
		/[. ]$/u.test(segment) ||
		(process.platform === "win32" &&
			/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(segment))
	);
}

export function isWithin(root: string, path: string): boolean {
	const remainder = relative(root, path);
	return (
		remainder === "" ||
		(!remainder.startsWith("..") && !isAbsolute(remainder))
	);
}

export function globToRegExp(glob: string): RegExp {
	if (
		glob.length === 0 ||
		glob.includes("\\") ||
		glob.startsWith("/") ||
		glob.includes("\0")
	) {
		throw new CodegenConfigurationError(`Invalid text-set glob "${glob}".`);
	}

	let source = "^";
	for (let index = 0; index < glob.length; index += 1) {
		const character = glob[index] ?? "";
		if (character === "*") {
			if (glob[index + 1] === "*") {
				index += 1;
				if (glob[index + 1] === "/") {
					index += 1;
					source += "(?:.*/)?";
				} else {
					source += ".*";
				}
			} else {
				source += "[^/]*";
			}
		} else if (character === "?") {
			source += "[^/]";
		} else {
			source += character.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
		}
	}
	return new RegExp(`${source}$`);
}

export function portablePath(path: string): string {
	return path.replaceAll("\\", "/");
}

export function compareCodeUnits(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

export function pathIdentity(path: string): string {
	return path.normalize("NFC").toUpperCase().toLowerCase();
}
