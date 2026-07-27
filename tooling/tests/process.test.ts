import { expect, test } from "bun:test";
import { runAll, type Command } from "../lib/process";

test("validation aggregation attempts every command after failures", async () => {
	const commands: Command[] = ["first", "second", "third"].map((label) => ({
		args: ["bun"],
		cwd: ".",
		label,
	}));
	const attempted: string[] = [];

	const results = await runAll(commands, async (command) => {
		attempted.push(command.label);
		return command.label === "second" ? 1 : 0;
	});

	expect(attempted).toEqual(["first", "second", "third"]);
	expect(results.map((result) => result.exitCode)).toEqual([0, 1, 0]);
});
