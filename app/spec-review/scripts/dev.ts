/**
 * Starts the record server and Vite together; Vite proxies `/api` to the
 * server. Stopping either stops both.
 *
 *   bun run --cwd app/spec-review dev
 */
const appDirectory = import.meta.dir.replace(/\/scripts$/, "");
const commands = [
	["bun", "--hot", "src/server.ts"],
	["bun", "x", "vite"],
];

const children = commands.map((command) =>
	Bun.spawn(command, {
		cwd: appDirectory,
		stdin: "inherit",
		stdout: "inherit",
		stderr: "inherit",
	}),
);

function stop(): void {
	for (const child of children) child.kill();
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

await Promise.race(children.map((child) => child.exited));
stop();
