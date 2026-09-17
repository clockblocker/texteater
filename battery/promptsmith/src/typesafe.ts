import type {
	Questions,
	RequestOptions,
	SystemOneRequest,
	SystemOneResult,
} from "@typesafe-ai/sdk";
import { TypeSafeClient, type TypeSafeClientConfig } from "@typesafe-ai/sdk";

export type {
	ChoiceCriteria,
	ChoiceQuestion,
	ChoiceResponse,
	EntryType,
	JsonValue,
	NoulQuestion,
	NoulResponse,
	Question,
	Questions,
	RequestOptions,
	ScoreCriteria,
	ScoreQuestion,
	ScoreResponse,
	SystemOneRequest,
	SystemOneResult,
	TypeSafeClientConfig,
	Usage,
} from "@typesafe-ai/sdk";
export { choice, noul, score } from "@typesafe-ai/sdk";

export type TypeSafeExecutor = <const Q extends Questions>(
	request: SystemOneRequest<Q>,
	options?: RequestOptions,
) => Promise<SystemOneResult<Q> & { readonly requestId?: string }>;

/** System One transport preserving the SDK's question-to-answer type inference. */
export function createTypeSafeExecutor(
	config: TypeSafeClientConfig = {},
): TypeSafeExecutor {
	const client = new TypeSafeClient({
		...config,
		apiKey:
			config.apiKey ??
			process.env.TYPESAFE_API_KEY ??
			process.env.TYPESAFE_TOKEN,
		retry: { ...config.retry, maxRetries: 0 },
	});
	return async (request, options) => {
		const result = await client
			.systemOne(request, {
				...options,
				retry: { ...options?.retry, maxRetries: 0 },
			})
			.withResponse();
		return {
			...result.data,
			...(result.requestId ? { requestId: result.requestId } : {}),
		};
	};
}
