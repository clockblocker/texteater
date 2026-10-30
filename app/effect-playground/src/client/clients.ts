import { Context, Effect, Layer, ManagedRuntime, type Schema } from "effect";
import { FetchHttpClient, type HttpClientError } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import { RpcClient, type RpcClientError, RpcSerialization } from "effect/rpc";
import type { FileNotFound, NotTxtFile } from "../shared/errors.ts";
import { FilesApi } from "../shared/rest-api.ts";
import { FilesRpcs } from "../shared/rpc.ts";

// Vite proxies /api and /rpc to the Bun server, so both clients talk to the
// page's own origin.
const origin = window.location.origin;

// The REST client behind a declared signature, so hovering `read` shows the
// Effect instead of `MethodReturn<…>`. The compiler checks this type against
// the generated client, so the two can't drift apart.
export class RestFiles extends Context.Service<
	RestFiles,
	{
		readonly read: (
			name: string,
		) => Effect.Effect<
			string,
			| NotTxtFile
			| FileNotFound
			| HttpClientError.HttpClientError
			| Schema.SchemaError
		>;
	}
>()("effect-playground/RestFiles") {
	static readonly layer = Layer.effect(
		RestFiles,
		Effect.map(
			HttpApiClient.make(FilesApi, { baseUrl: origin }),
			(client) =>
				RestFiles.of({
					read: (name) => client.files.read({ params: { name } }),
				}),
		),
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
	Layer.mergeAll(RestFiles.layer, RpcFilesClient.layer).pipe(
		Layer.provide(FetchHttpClient.layer),
	),
);
