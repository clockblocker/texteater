export type { LinkInput } from "./validation-compiler/link-registries.js";
export {
	emitLinkedValidationRegistry,
	linkRegistries,
} from "./validation-compiler/link-registries.js";
export {
	type ExternalOutputTypes,
	emitInlineOutputType,
	emitValidationOutputTypes,
} from "./validation-compiler/validation-output-types.js";
export * from "./validation-compiler/zod-validation-artifact.js";
