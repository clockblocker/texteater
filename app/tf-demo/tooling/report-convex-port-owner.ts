const port = process.argv[2];

if (!port || !/^\d+$/.test(port)) {
	process.exit(0);
}

const lsof = Bun.spawn(["lsof", "-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"], {
	stdout: "pipe",
	stderr: "ignore",
});
const [output, exitCode] = await Promise.all([
	new Response(lsof.stdout).text(),
	lsof.exited,
]);

if (exitCode === 0) {
	const processIds = [
		...new Set(
			output.split(/\s+/).filter((processId) => /^\d+$/.test(processId)),
		),
	];
	if (processIds.length > 0) {
		console.error(
			`To stop the process using port ${port}, run:\n  kill ${processIds.join(" ")}`,
		);
	}
}
