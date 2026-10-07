class CodegenError extends Error {
	override readonly name: string = "CodegenError";
}

export class CodegenConfigurationError extends CodegenError {
	override readonly name = "CodegenConfigurationError";
}

export class CodegenInputError extends CodegenError {
	override readonly name = "CodegenInputError";
}

export class CodegenPlanError extends CodegenError {
	override readonly name = "CodegenPlanError";
}

export class CodegenOwnershipError extends CodegenError {
	override readonly name = "CodegenOwnershipError";
}

export class CodegenDriftError extends CodegenError {
	override readonly name = "CodegenDriftError";
}
