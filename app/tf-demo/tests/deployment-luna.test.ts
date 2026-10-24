import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { DumgenLive, JevTransport, operations } from "dumgen";
import * as Effect from "effect/Effect";
import { deploymentLuna } from "../server/deployment-luna";

test("generating actions use the shared deployment Layer", async () => {
	for (const path of [
		"../convex/knowledgeGenerationActions.ts",
		"../convex/translationAccumulationActions.ts",
	]) {
		const source = await readFile(new URL(path, import.meta.url), "utf8");
		expect(source).toContain("deploymentDumgen");
		expect(source).not.toContain("createOpenAILuna");
	}
});

test("generated deployment environment exposes both bridge variables", async () => {
	const declarations = await readFile(
		new URL("../convex/_generated/server.d.ts", import.meta.url),
		"utf8",
	);
	for (const name of ["OPENAI_BASE_URL", "LUNA_MODEL"])
		expect(declarations).toContain(`readonly ${name}: string | undefined;`);
});

test("without bridge configuration, Luna keeps Dumgen's default configuration", () => {
	const options = deploymentLuna({ OPENAI_API_KEY: "fixture" });
	expect(options.luna).toBeDefined();
	expect(options).not.toHaveProperty("lunaConfiguration");
});

test("bridge configuration selects its model without legacy Luna settings", () => {
	const options = deploymentLuna({
		OPENAI_API_KEY: "fixture",
		OPENAI_BASE_URL: "http://127.0.0.1:3250/v1",
		LUNA_MODEL: "gpt-6-luna",
	});
	expect(options.lunaConfiguration).toEqual({
		model: "gpt-6-luna",
		settings: {},
	});
});

for (const configuration of [
	{ OPENAI_BASE_URL: "http://127.0.0.1:3250/v1" },
	{ LUNA_MODEL: "gpt-6-luna" },
	{ OPENAI_BASE_URL: "", LUNA_MODEL: "gpt-6-luna" },
	{ OPENAI_BASE_URL: "http://127.0.0.1:3250/v1", LUNA_MODEL: "" },
	{ OPENAI_BASE_URL: "not-a-url", LUNA_MODEL: "gpt-6-luna" },
	{ OPENAI_BASE_URL: "http://remote.example/v1", LUNA_MODEL: "gpt-6-luna" },
	{
		OPENAI_BASE_URL: "http://127.0.0.1:3250/v1?token=private",
		LUNA_MODEL: "gpt-6-luna",
	},
	{
		OPENAI_BASE_URL: "http://user:private@127.0.0.1:3250/v1",
		LUNA_MODEL: "gpt-6-luna",
	},
	{
		OPENAI_BASE_URL: "http://127.0.0.1:3250/responses",
		LUNA_MODEL: "gpt-6-luna",
	},
	{
		OPENAI_BASE_URL: "http://127.0.0.1:3250/v1",
		LUNA_MODEL: " secret model ",
	},
]) {
	test(`invalid bridge configuration fails closed: ${JSON.stringify(configuration)}`, () => {
		expect(() =>
			deploymentLuna({ OPENAI_API_KEY: "private", ...configuration }),
		).toThrow(
			"OPENAI_BASE_URL and LUNA_MODEL must configure a local Luna bridge together.",
		);
	});
}

test("the real Dumgen transport sends the selected model and only its settings to the bridge", async () => {
	const previousFetch = globalThis.fetch;
	const requests: {
		url: string;
		body: Record<string, unknown>;
		authorization: string | null;
	}[] = [];
	globalThis.fetch = (async (url, init) => {
		requests.push({
			url: String(url),
			body: JSON.parse(String(init?.body)),
			authorization: new Headers(init?.headers).get("authorization"),
		});
		return Response.json({
			status: "completed",
			output: [
				{
					content: [
						{
							type: "output_text",
							text: JSON.stringify({ value: "Hello." }),
						},
					],
				},
			],
		});
	}) as typeof fetch;
	try {
		const layer = DumgenLive({
			jev: JevTransport.fromAsk(async () => {
				throw new Error("No jev call expected");
			}),
			...deploymentLuna(
				{
					OPENAI_API_KEY: "fixture-bridge-bearer",
					OPENAI_BASE_URL: "http://127.0.0.1:3250/v1",
					LUNA_MODEL: "gpt-6-luna",
				},
				1000,
			),
		});
		await Effect.runPromise(
			operations.translate
				.sentence({
					language: "de",
					sentence: "Hallo.",
					into: "en",
				})
				.pipe(Effect.provide(layer)),
		);
		expect(requests).toHaveLength(1);
		expect(requests[0]?.url).toBe("http://127.0.0.1:3250/v1/responses");
		expect(requests[0]?.authorization).toBe("Bearer fixture-bridge-bearer");
		expect(requests[0]?.body.model).toBe("gpt-6-luna");
		expect(requests[0]?.body).not.toHaveProperty("reasoning");
		expect(requests[0]?.body).not.toHaveProperty("service_tier");
	} finally {
		globalThis.fetch = previousFetch;
	}
});
