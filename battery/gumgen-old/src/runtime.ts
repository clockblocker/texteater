import { traceStage } from "common-utils/workflow";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { type ModelGenerator, ModelGeneratorService } from "./ai-sdk/ai-sdk";
import { RUNTIME_PROMPT_CATALOG } from "./catalog/runtime-prompt-catalog";
import type { Dumgen, DumgenDomainFailure } from "./dumgen";
import { createDumgenImplementation } from "./dumgen/implementation";
import { installEncodedRuntimePromptData } from "./generated/runtime-prompt-artifacts.js";
import { buildGeneratorCatalog } from "./generator/generator";
import { DumgenError } from "./generator/generator-error";
export type DumgenRuntimeOptions = {
	readonly modelGenerator: ModelGenerator;
	readonly runtimePromptData?: string;
};
function expected<A, E, R>(
	program: Effect.Effect<A, E, R>,
): Effect.Effect<A, E | DumgenError, R> {
	return program.pipe(
		Effect.catchAllDefect((cause) =>
			cause instanceof DumgenError
				? Effect.fail(cause)
				: Effect.die(cause),
		),
	);
}
function complete<A extends { readonly decision: string }, E, R>(
	program: Effect.Effect<A, E, R>,
) {
	return expected(program).pipe(
		Effect.flatMap((result) => {
			if (
				result.decision === "Unresolved" ||
				result.decision === "NotImplemented" ||
				result.decision === "CatalogMiss"
			)
				return Effect.fail({
					_tag: "DumgenDomainFailure" as const,
					result,
				} as DumgenDomainFailure<
					Extract<
						A,
						{
							decision:
								| "Unresolved"
								| "NotImplemented"
								| "CatalogMiss";
						}
					>
				>);
			return Effect.succeed(
				result as Exclude<
					A,
					{
						decision:
							| "Unresolved"
							| "NotImplemented"
							| "CatalogMiss";
					}
				>,
			);
		}),
	);
}
/** Constructs one cache-owning resolution instance without importing a provider. */
export function buildDumgenRuntime(options: DumgenRuntimeOptions): Dumgen {
	if (options.runtimePromptData !== undefined)
		installEncodedRuntimePromptData(options.runtimePromptData);
	const implementation = createDumgenImplementation(
		buildGeneratorCatalog(RUNTIME_PROMPT_CATALOG, options.modelGenerator),
	);
	const instance: Dumgen = {
		segment: (sentences) =>
			traceStage(
				"dumgen.segment",
				expected(implementation.segment(sentences)).pipe(
					Effect.flatMap((result) =>
						result.ok
							? Effect.succeed(result.value)
							: Effect.fail(
									new DumgenError(
										"invalid-input",
										result.error.message,
									),
								),
					),
				),
				{ sentences },
			),
		resolve: Object.freeze({
			grammatical: (language, input) =>
				traceStage(
					"dumgen.grammatical",
					complete(
						implementation.resolve.grammatical(language, input),
					),
					{ language, input },
				),
			reading: (language, input) =>
				traceStage(
					"dumgen.reading",
					complete(implementation.resolve.reading(language, input)),
					{ language, input },
				),
		}),
	};
	return Object.freeze(instance);
}
export class DumgenService extends Context.Tag("dum/Dumgen")<
	DumgenService,
	Dumgen
>() {}
export const DumgenLive = Layer.effect(
	DumgenService,
	Effect.map(ModelGeneratorService, (modelGenerator) =>
		buildDumgenRuntime({ modelGenerator }),
	),
);
export type { ModelGenerator };
