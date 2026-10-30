import { Effect, Layer } from "effect";
import { RpcSerialization, RpcServer } from "effect/rpc";
import { FilesRpcs } from "../shared/rpc.ts";
import { FileReader } from "./file-reader.ts";

const FilesHandlers = FilesRpcs.toLayer(
	Effect.gen(function* () {
		const reader = yield* FileReader;
		return FilesRpcs.of({
			ReadFile: ({ name }) => reader.read(name),
		});
	}),
);

export const RpcRoutes = RpcServer.layerHttp({
	group: FilesRpcs,
	path: "/rpc",
	protocol: "http",
}).pipe(Layer.provide([FilesHandlers, RpcSerialization.layerJson]));
