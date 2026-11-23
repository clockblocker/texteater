import { canonicalJson } from "common-utils";
import type * as Dumrel from "dumrel/types";
import * as Effect from "effect/Effect";
import type { AccumulateValencyInput, ValencyAccumulation } from "../types.js";
import { produceHebrewKnowledge } from "./produce.js";

const patternKey = (pattern: Dumrel.ValencyPattern): string =>
	canonicalJson(
		pattern.map((complement) => canonicalJson(complement)).sort(),
	);

/** Extracts this Hebrew occurrence's concrete pattern through the same validated producer as its first Card. */
export const accumulateHebrewValency = (input: AccumulateValencyInput<"he">) =>
	Effect.gen(function* () {
		const produced = yield* produceHebrewKnowledge<never>({
			language: "he",
			reading: input.reading,
			attestation: input.attestation,
			sentence: input.sentence,
			origin: "TopUp",
			request: { valency: null },
		});
		const changes = produced.changes.flatMap((change) =>
			change.aspect === "valency" && change.kind === "Contribute"
				? [change]
				: [],
		);
		const realizedPattern =
			changes.flatMap((change) => change.value)[0] ?? null;
		const known =
			realizedPattern === null
				? undefined
				: input.valency.find(
						(pattern) =>
							patternKey(pattern) === patternKey(realizedPattern),
					);
		return {
			changes: known ? [] : changes,
			realizedPattern: known ?? realizedPattern,
			failures: produced.failures,
		} satisfies ValencyAccumulation<"he">;
	});
