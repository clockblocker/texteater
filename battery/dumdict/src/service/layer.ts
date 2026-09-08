import type { SupportedLanguage } from "dumling/types";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type { DumdictService } from "../public";
import type { DumdictStoragePort } from "../storage";
import { createDumdictService } from "./create-dumdict-service";

/** Language-bound tags and a layer that constructs one dictionary from its storage adapter. */
export function createDumdictLayer<const L extends SupportedLanguage>(
	language: L,
) {
	const Service = Context.GenericTag<DumdictService<L>>(
		`dumdict/service/${language}`,
	);
	const Storage = Context.GenericTag<DumdictStoragePort<L>>(
		`dumdict/storage/${language}`,
	);
	const Live = Layer.effect(
		Service,
		Effect.map(Storage, (storage) =>
			createDumdictService({ language, storage }),
		),
	);
	return Object.freeze({ Service, Storage, Live });
}
