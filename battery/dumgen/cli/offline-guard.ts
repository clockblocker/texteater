/**
 * Keeps a command off the network: once this module loads, `fetch` throws
 * and the provider keys are gone from the environment, so neither TypeSafe
 * nor OpenAI can be asked or paid. `request-baselines.ts` imports it, so
 * the guard is up before any of its work starts, and preloads it into the
 * commands it spawns:
 *
 *   bun --preload ./cli/offline-guard.ts cli/segment-in-units-lab.ts replay --run <id>
 */

/** Environment variables that name a provider credential. */
const credential = /API_KEY|_TOKEN|SECRET/u;

/** `env` without the provider keys, for a spawned command. */
export const offlineEnv = (env: NodeJS.ProcessEnv = process.env) =>
	Object.fromEntries(
		Object.entries(env).filter(([name]) => !credential.test(name)),
	);

globalThis.fetch = Object.assign(
	async (target: Parameters<typeof fetch>[0]) => {
		throw Error(
			`The offline guard refused a request to ${target instanceof Request ? target.url : String(target)}`,
		);
	},
	{ preconnect: () => undefined },
);
for (const name of Object.keys(process.env))
	if (credential.test(name)) delete process.env[name];
