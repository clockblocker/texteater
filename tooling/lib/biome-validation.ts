export function biomeFormatAndAssistArgs(options: {
	readonly biomePath: string;
	readonly configPath?: string;
	readonly scope: string;
}): string[] {
	return [
		"bun",
		options.biomePath,
		"ci",
		"--linter-enabled=false",
		...(options.configPath ? ["--config-path", options.configPath] : []),
		options.scope,
	];
}
