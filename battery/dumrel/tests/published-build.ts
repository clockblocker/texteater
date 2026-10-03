import { resolve } from "node:path";

const packageRoot = resolve(import.meta.dir, "..");

/** A file of the published build. */
export const distFile = (path: string) => resolve(packageRoot, "dist", path);

/**
 * Builds dumrel and its workspace dependencies through Turbo, for the tests
 * of the published build. A cached build is nearly free.
 */
export async function buildPublishedPackage(): Promise<void> {
	const child = Bun.spawn([process.execPath, "run", "build"], {
		cwd: packageRoot,
		stdout: "pipe",
		stderr: "pipe",
	});
	const [output, error, exit] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
		child.exited,
	]);
	if (exit) throw Error(output + error);
}
