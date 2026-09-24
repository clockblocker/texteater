import type * as Dumling from "dumling/types";

import * as Effect from "effect/Effect";
import type { ReadingEntryContext } from "../storage";
import {
	type ReadingEntryContextLoad,
	storageRequestFor,
} from "./context-request";
import type { DumdictServiceRuntimeOptions } from "./runtime-options";

type ContextFor<
	L extends Dumling.Language,
	Load extends ReadingEntryContextLoad<L>,
> = Extract<ReadingEntryContext<L>, { intent: Load["intent"] }>;

export function loadReadingEntryContext<
	L extends Dumling.Language,
	Load extends ReadingEntryContextLoad<L>,
>(
	options: DumdictServiceRuntimeOptions<L>,
	load: Load,
): Effect.Effect<
	ContextFor<L, Load>,
	import("../public").DumdictStorageFailure
> {
	const request = storageRequestFor(load);
	return options.storage.loadReadingEntryContext(request).pipe(
		Effect.map((context) => {
			options.sliceValidation.readingEntryContext(context, request);
			return context as ContextFor<L, Load>;
		}),
	);
}
