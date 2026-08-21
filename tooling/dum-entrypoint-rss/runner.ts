import { runRepresentativeOperation } from "./operations";

type Mode = "baseline" | "import-only" | "import-plus-operation";

function argument(name: string): string | undefined {
	const position = Bun.argv.indexOf(name);
	return position === -1 ? undefined : Bun.argv[position + 1];
}

const mode = argument("--mode") as Mode | undefined;
if (
	mode !== "baseline" &&
	mode !== "import-only" &&
	mode !== "import-plus-operation"
) {
	throw new Error(
		"RSS runner requires --mode baseline|import-only|import-plus-operation.",
	);
}

if (mode === "baseline") {
	await import("./empty-module");
} else {
	const specifier = argument("--specifier");
	if (specifier === undefined) {
		throw new Error(
			"RSS runner requires --specifier for an entrypoint mode.",
		);
	}
	const publicModule = await import(specifier);
	if (mode === "import-plus-operation") {
		const operation = argument("--operation");
		if (operation === undefined) {
			throw new Error(
				"RSS runner requires --operation for import-plus-operation mode.",
			);
		}
		await runRepresentativeOperation(operation, publicModule);
	}
}

process.stdout.write(`${process.resourceUsage().maxRSS}\n`);
