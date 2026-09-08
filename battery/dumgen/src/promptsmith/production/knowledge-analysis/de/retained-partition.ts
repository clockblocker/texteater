import type { GermanKnowledgeFamily } from "../../../../knowledge-generation/de/families";
import type { GermanKnowledgeGenerationInput } from "../../../../knowledge-generation/de/runtime-schema";
import {
	type RetainedRelationCase,
	retainedRegistries,
} from "./retained-cases";

export type PartitionedRetainedCases = Readonly<{
	demonstrations: Readonly<Record<string, RetainedRelationCase>>;
	basic: Readonly<Record<string, RetainedRelationCase>>;
	adversarial: Readonly<Record<string, RetainedRelationCase>>;
	acceptance: Readonly<Record<string, RetainedRelationCase>>;
}>;

/**
 * Partitions the shared retained seed registry into one Family's slices. The
 * source Reading's Family decides the route, so the partition is deterministic.
 */
export function retainedCasesForFamily(
	family: GermanKnowledgeFamily,
): PartitionedRetainedCases {
	const select = (
		registry: Readonly<Record<string, RetainedRelationCase>>,
	): Readonly<Record<string, RetainedRelationCase>> =>
		Object.fromEntries(
			Object.entries(registry).filter(
				([, retained]) =>
					(
						retained.goldenCase
							.input as GermanKnowledgeGenerationInput
					).reading.lemma.family === family,
			),
		);
	return {
		demonstrations: select(retainedRegistries.demonstrations),
		basic: select(retainedRegistries.basic),
		adversarial: select(retainedRegistries.adversarial),
		acceptance: select(retainedRegistries.acceptance),
	};
}

/** Extracts the schema-bound golden case view from one retained slice. */
export function goldenCasesFor<
	const Registry extends Readonly<Record<string, RetainedRelationCase>>,
>(
	registry: Registry,
): { readonly [Key in keyof Registry]: Registry[Key]["goldenCase"] } {
	return Object.fromEntries(
		Object.entries(registry).map(([id, value]) => [id, value.goldenCase]),
	) as { readonly [Key in keyof Registry]: Registry[Key]["goldenCase"] };
}
