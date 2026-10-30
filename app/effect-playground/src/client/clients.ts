import { Context, Layer, ManagedRuntime } from "effect";
import { FetchHttpClient } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import { RpcClient, type RpcClientError, RpcSerialization } from "effect/rpc";
import { FilesApi } from "../shared/rest-api.ts";
import { FilesRpcs } from "../shared/rpc.ts";

// Vite proxies /api and /rpc to the Bun server, so both clients talk to the
// page's own origin.
const origin = window.location.origin;

// A client derived from the REST contract: client.files.read({ params }).
export class RestClient extends Context.Service<
	RestClient,
	HttpApiClient.ForApi<typeof FilesApi>
>()("effect-playground/RestClient") {
	static readonly layer = Layer.effect(
		RestClient,
		HttpApiClient.make(FilesApi, { baseUrl: origin }),
	);
}

// A client derived from the RPC contract: client.ReadFile({ name }).
export class RpcFilesClient extends Context.Service<
	RpcFilesClient,
	RpcClient.FromGroup<typeof FilesRpcs, RpcClientError.RpcClientError>
>()("effect-playground/RpcFilesClient") {
	static readonly layer = Layer.effect(
		RpcFilesClient,
		RpcClient.make(FilesRpcs),
	).pipe(
		Layer.provide(RpcClient.layerProtocolHttp({ url: `${origin}/rpc` })),
		Layer.provide(RpcSerialization.layerJson),
	);
}

// Builds both clients once and keeps them for the page's lifetime.
export const runtime = ManagedRuntime.make(
	Layer.mergeAll(RestClient.layer, RpcFilesClient.layer).pipe(
		Layer.provide(FetchHttpClient.layer),
	),
);
