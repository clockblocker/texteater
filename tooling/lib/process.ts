export interface Command {
	args: string[];
	cwd: string;
	env?: Record<string, string>;
	label: string;
}

export interface CommandResult {
	command: Command;
	exitCode: number;
}

export type CommandRunner = (command: Command) => Promise<number>;

export async function runCommand(command: Command): Promise<number> {
	const child = Bun.spawn(command.args, {
		cwd: command.cwd,
		env: { ...process.env, ...command.env },
		stdin: "inherit",
		stdout: "inherit",
		stderr: "inherit",
	});
	return await child.exited;
}

export async function runAll(
	commands: Command[],
	runner: CommandRunner = runCommand,
): Promise<CommandResult[]> {
	const results: CommandResult[] = [];
	for (const command of commands) {
		console.log(`\n=== ${command.label} ===`);
		const exitCode = await runner(command);
		results.push({ command, exitCode });
	}
	return results;
}

export function reportFailures(results: CommandResult[]): number {
	const failures = results.filter((result) => result.exitCode !== 0);
	if (failures.length === 0) return 0;
	console.error("\nFailures:");
	for (const failure of failures) {
		console.error(`- ${failure.command.label} (exit ${failure.exitCode})`);
	}
	return 1;
}
