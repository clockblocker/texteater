import type * as Dumling from "dumling/types";

import * as Effect from "effect/Effect";
import { planAppendReadingAttestation } from "../core/plan-mutation";
import type {
	AddAttestationRequest,
	DumdictInvalidInput,
	DumdictPreparationFailure,
	MutationResult,
	PreparedMutation,
} from "../public";
import { commitPrepared, prepared } from "./effect-mutation";
import type { DumdictServiceRuntimeOptions } from "./runtime-options";

function languageFailure<L extends Dumling.Language>(
	expectedLanguage: L,
	actualLanguage: Dumling.Language | undefined,
): DumdictInvalidInput {
	return {
		_tag: "DumdictInvalidInput",
		expectedLanguage,
		...(actualLanguage === undefined ? {} : { actualLanguage }),
		message: `Expected dumdict language ${expectedLanguage}, got ${actualLanguage ?? "unknown"}`,
	};
}

export function prepareAddAttestation<L extends Dumling.Language>(
	options: DumdictServiceRuntimeOptions<L>,
	request: AddAttestationRequest<L>,
): Effect.Effect<PreparedMutation<L>, DumdictPreparationFailure> {
	if (request.reading.lemma.language !== options.language)
		return Effect.fail(
			languageFailure(options.language, request.reading.lemma.language),
		);
	return options.storage
		.loadReadingForPatch({ reading: request.reading })
		.pipe(
			Effect.flatMap((slice) =>
				Effect.sync(() => {
					options.sliceValidation.readingPatch(
						slice,
						request.reading,
					);
					return planAppendReadingAttestation(slice, request);
				}),
			),
			Effect.flatMap((plan) => prepared(options, plan)),
			Effect.withSpan("dumdict.prepareAddAttestation", {
				attributes: { request },
			}),
		);
}

export function addAttestation<L extends Dumling.Language>(
	options: DumdictServiceRuntimeOptions<L>,
	request: AddAttestationRequest<L>,
): Effect.Effect<
	MutationResult<L>,
	DumdictPreparationFailure | import("../public").DumdictCommitFailure
> {
	return prepareAddAttestation(options, request).pipe(
		Effect.flatMap((value) => commitPrepared(options, value)),
	);
}
