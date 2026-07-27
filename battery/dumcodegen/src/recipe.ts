import {
	type CodegenRecipe,
	type Inputs,
	type Outputs,
	type RecipeDefinition,
	recipeDefinition,
} from "./types.js";

export function defineCodegen<
	const I extends Inputs,
	const O extends Outputs,
	Metadata,
>(definition: RecipeDefinition<I, O, Metadata>): CodegenRecipe<I, O, Metadata> {
	return Object.freeze({
		[recipeDefinition]: Object.freeze(definition),
	});
}
