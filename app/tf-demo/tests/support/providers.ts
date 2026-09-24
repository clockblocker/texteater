import type { DumgenOptions, ModelRequest } from "dumgen/types";

type Fixture = Pick<DumgenOptions, "execute" | "judge">;

/**
 * Answers the production Luna and TypeSafe HTTP transports from a Dumgen
 * fixture, so real actions run their real Dumgen against queued outputs.
 * Knowledge leaves, which carry an aspect, are answered apart from the queue.
 * A fixture that throws becomes an HTTP 503.
 */
export function fakeProviders(
	fixture: Fixture,
	knowledge: (input: { aspect: string; language?: string }) => string = ({
		aspect,
	}) => `${aspect} text`,
) {
	const previous = {
		fetch: globalThis.fetch,
		OPENAI_API_KEY: process.env.OPENAI_API_KEY,
		TYPESAFE_API_KEY: process.env.TYPESAFE_API_KEY,
	};
	const requests: string[] = [];
	process.env.OPENAI_API_KEY = "fixture";
	process.env.TYPESAFE_API_KEY = "fixture";
	globalThis.fetch = (async (url: string | URL | Request, init) => {
		requests.push(String(url));
		const body = JSON.parse(String(init?.body));
		try {
			if (String(url).endsWith("/v1/systemone"))
				return Response.json(await fixture.judge(body, {}));
			const content = body.input[1].content;
			const input = content.startsWith("{")
				? JSON.parse(content)
				: content;
			const output =
				input && typeof input === "object" && "aspect" in input
					? { text: knowledge(input) }
					: (
							await fixture.execute({
								stage:
									input &&
									typeof input === "object" &&
									"sourceText" in input
										? "segment"
										: "fixture",
								input,
							} as ModelRequest)
						).output;
			return Response.json({
				status: "completed",
				output: [
					{
						content: [
							{
								type: "output_text",
								text:
									body.text.format.type === "text"
										? typeof output === "string"
											? output
											: JSON.stringify(output)
										: JSON.stringify({ value: output }),
							},
						],
					},
				],
			});
		} catch (error) {
			return new Response(String(error), { status: 503 });
		}
	}) as typeof fetch;
	return {
		requests,
		restore() {
			globalThis.fetch = previous.fetch;
			for (const name of [
				"OPENAI_API_KEY",
				"TYPESAFE_API_KEY",
			] as const) {
				const value = previous[name];
				if (value === undefined) delete process.env[name];
				else process.env[name] = value;
			}
		},
	};
}

/** Every provider request fails. */
export function unavailableProviders() {
	return fakeProviders({
		execute: async () => {
			throw Error("unavailable");
		},
		judge: async () => {
			throw Error("unavailable");
		},
	});
}
