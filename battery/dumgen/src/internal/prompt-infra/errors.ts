export class PromptInfraValidationError extends Error {
	readonly issues: readonly string[];

	constructor(issues: readonly string[]) {
		super(`Prompt source validation failed:\n- ${issues.join("\n- ")}`);
		this.name = "PromptInfraValidationError";
		this.issues = issues;
	}
}

export class PromptExperimentConfigurationError extends Error {
	readonly issues: readonly string[];

	constructor(issues: readonly string[]) {
		super(
			`Prompt experiment configuration failed:\n- ${issues.join("\n- ")}`,
		);
		this.name = "PromptExperimentConfigurationError";
		this.issues = issues;
	}
}
