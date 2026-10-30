import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/rpc";
import { FileNotFound, NotTxtFile } from "./errors.ts";

// One procedure, no URL design: every call is a POST to /rpc carrying
// { tag: "ReadFile", payload: { name } }.
export class FilesRpcs extends RpcGroup.make(
	Rpc.make("ReadFile", {
		payload: { name: Schema.String },
		success: Schema.String,
		error: Schema.Union([NotTxtFile, FileNotFound]),
	}),
) {}
