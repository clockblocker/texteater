const appDirectory = import.meta.dir.replace(/\/scripts$/, "");
const repositoryEnvironment = `${appDirectory}/../../.env.local`;
const serverCommand = [
	"bun",
	...((await Bun.file(repositoryEnvironment).exists())
		? [`--env-file=${repositoryEnvironment}`]
		: []),
	"--hot",
	"src/server.ts",
];
const commands = [serverCommand, ["bun", "x", "vite"]];

const children = commands.map((command) =>
	Bun.spawn(command, {
		cwd: appDirectory,
		stdin: "inherit",
		stdout: "inherit",
		stderr: "inherit",
	}),
);

function stop(): void {
	for (const child of children) {
		child.kill();
	}
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

await Promise.race(children.map((child) => child.exited));
stop();
