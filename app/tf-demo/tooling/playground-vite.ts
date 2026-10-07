import { execFile } from "node:child_process";
import { relative, sep } from "node:path";
import { promisify } from "node:util";
import type { Plugin } from "vite";

/** The directories `tooling/print-playground-snapshot.ts` builds the snapshot from. */
const snapshotSources = [
	"convex/",
	"server/",
	"shared/",
	"tests/support/",
	"tooling/",
];

/** No fixture endpoints or payloads are included in a production build. */
export function playgroundFixtures(): Plugin {
	let snapshot: Promise<string> | undefined;
	return {
		name: "isolated-playground-fixtures",
		apply: "serve",
		configureServer(server) {
			server.watcher.on("change", (file) => {
				const path = relative(server.config.root, file)
					.split(sep)
					.join("/");
				if (snapshotSources.some((source) => path.startsWith(source)))
					snapshot = undefined;
			});
			server.middlewares.use(
				"/__playground/notes",
				async (_request, response) => {
					try {
						snapshot ??= promisify(execFile)(
							"bun",
							["tooling/print-playground-snapshot.ts"],
							{
								cwd: server.config.root,
								maxBuffer: 32 * 1024 * 1024,
							},
						).then(({ stdout }) => stdout);
						response.setHeader("Content-Type", "application/json");
						response.setHeader("Cache-Control", "no-store");
						response.end(await snapshot);
					} catch (error) {
						snapshot = undefined;
						server.config.logger.error(String(error));
						response.statusCode = 500;
						response.end("Could not build playground fixtures.");
					}
				},
			);
		},
	};
}
