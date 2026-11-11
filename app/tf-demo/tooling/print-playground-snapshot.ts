import { createPlaygroundSnapshot } from "./build-playground-snapshot";

const payload = JSON.stringify(await createPlaygroundSnapshot());
await new Promise<void>((resolve, reject) => {
	process.stdout.write(payload, (error) =>
		error ? reject(error) : resolve(),
	);
});
