import type { Effect } from "effect";
import { type FormEvent, useState } from "react";
import type { RestFiles, RpcFilesClient } from "./clients.ts";
import { runtime } from "./clients.ts";
import { type Outcome, readViaRest, readViaRpc } from "./read-file.ts";

export function App() {
	return (
		<main className="panels">
			<ReaderPanel title="REST" read={readViaRest} />
			<ReaderPanel title="RPC" read={readViaRpc} />
		</main>
	);
}

function ReaderPanel({
	title,
	read,
}: {
	title: string;
	read: (
		name: string,
	) => Effect.Effect<Outcome, never, RestFiles | RpcFilesClient>;
}) {
	const [name, setName] = useState("hello.txt");
	const [outcome, setOutcome] = useState<Outcome | null>(null);
	const [pending, setPending] = useState(false);

	async function submit(event: FormEvent) {
		event.preventDefault();
		setPending(true);
		// The error channel is `never`, so this promise only rejects on a defect.
		setOutcome(await runtime.runPromise(read(name)));
		setPending(false);
	}

	return (
		<section className="panel">
			<h2>{title}</h2>
			<form onSubmit={submit}>
				<input
					aria-label="File name"
					value={name}
					onChange={(event) => setName(event.target.value)}
				/>
				<button type="submit" disabled={pending}>
					Submit
				</button>
			</form>
			{outcome?.kind === "contents" && <pre>{outcome.text}</pre>}
			{outcome?.kind === "error" && <p role="alert">{outcome.message}</p>}
		</section>
	);
}
