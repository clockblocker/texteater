import type { FunctionReturnType, RegisteredQuery } from "convex/server";
import type { api } from "../convex/_generated/api";
import type { playground } from "./playground-fixtures";

export type PlaygroundSnapshot = {
	catalog: typeof playground extends RegisteredQuery<
		"public",
		Record<string, never>,
		infer Result
	>
		? Awaited<Result>
		: never;
	notes: Record<
		string,
		NonNullable<
			| FunctionReturnType<typeof api.readingNotes.get>
			| FunctionReturnType<typeof api.routeNotes.get>
			| FunctionReturnType<typeof api.shadowNotes.get>
		>
	>;
	texts: Record<
		string,
		NonNullable<FunctionReturnType<typeof api.textViews.get>>
	>;
};
