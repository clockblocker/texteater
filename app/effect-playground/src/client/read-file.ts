import { Effect } from "effect";
import type { FileNotFound, NotTxtFile } from "../shared/errors.ts";
import { RestClient, RpcFilesClient } from "./clients.ts";

export type Outcome =
	| { readonly kind: "contents"; readonly text: string }
	| { readonly kind: "error"; readonly message: string };

const contents = (text: string): Outcome => ({ kind: "contents", text });
const notTxt = (error: NotTxtFile) =>
	Effect.succeed<Outcome>({
		kind: "error",
		message: `"${error.name}" is not a .txt file`,
	});
const notFound = (error: FileNotFound) =>
	Effect.succeed<Outcome>({
		kind: "error",
		message: `"${error.name}" does not exist`,
	});
const transport = (error: Error) =>
	Effect.succeed<Outcome>({
		kind: "error",
		message: `Request failed: ${error.message}`,
	});

// Hover `read` in each function: the error channel lists the two domain
// errors plus what the transport can fail with. catchTags must cover
// NotTxtFile and FileNotFound, and Effect.catch takes whatever is left.

export const readViaRest = (name: string) =>
	Effect.gen(function* () {
		const client = yield* RestClient;
		const read = client.files.read({ params: { name } });
		return yield* read.pipe(
			Effect.map(contents),
			Effect.catchTags({ NotTxtFile: notTxt, FileNotFound: notFound }),
			Effect.catch(transport),
		);
	});

export const readViaRpc = (name: string) =>
	Effect.gen(function* () {
		const client = yield* RpcFilesClient;
		const read = client.ReadFile({ name });
		return yield* read.pipe(
			Effect.map(contents),
			Effect.catchTags({ NotTxtFile: notTxt, FileNotFound: notFound }),
			Effect.catch(transport),
		);
	});
