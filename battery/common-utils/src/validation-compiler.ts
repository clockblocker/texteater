export { emitLinkedValidationRegistry } from "./validation-compiler/link-registries.js";
export {
	type ExternalOutputTypes,
	emitInlineOutputType,
	emitValidationOutputTypes,
} from "./validation-compiler/validation-output-types.js";
export {
	compileZodValidationArtifacts,
	type ZodValidationOperationRegistration,
} from "./validation-compiler/zod-validation-artifact.js";
