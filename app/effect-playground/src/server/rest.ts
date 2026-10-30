import { Effect, Layer } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import { FilesApi } from "../shared/rest-api.ts";
import { FileReader } from "./file-reader.ts";

const FilesHandlers = HttpApiBuilder.group(
	FilesApi,
	"files",
	Effect.fn(function* (handlers) {
		const reader = yield* FileReader;
		return handlers.handle("read", ({ params }) =>
			reader.read(params.name),
		);
	}),
);

export const RestRoutes = HttpApiBuilder.layer(FilesApi).pipe(
	Layer.provide(FilesHandlers),
);
