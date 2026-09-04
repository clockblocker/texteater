import { ArrowLeftIcon, ArrowUpRightIcon, RotateCcwIcon } from "lucide-react";
import { type ReactNode, useState } from "react";

import { AppProvider } from "@/components/app-provider";
import {
	findPlaygroundExperiment,
	PLAYGROUND_EXPERIMENTS,
} from "@/playground/playground-registry";
import {
	PLAYGROUND_PATH,
	type PlaygroundRoute,
	playgroundExperimentHref,
} from "@/playground/playground-route";
import "./playground.css";

export function PlaygroundProviders({
	children,
}: {
	readonly children: ReactNode;
}) {
	return <AppProvider>{children}</AppProvider>;
}

export function PlaygroundApp({ route }: { readonly route: PlaygroundRoute }) {
	return route.kind === "Index" ? (
		<PlaygroundIndex />
	) : (
		<ExperimentRoute
			experimentId={route.experimentId}
			detailId={route.detailId}
		/>
	);
}

function PlaygroundIndex() {
	return (
		<main className="playground-index">
			<header className="playground-index__masthead">
				<a className="playground-brand" href={PLAYGROUND_PATH}>
					<span className="playground-brand__mark" aria-hidden="true">
						TF
					</span>
					<span>
						<strong>Playground</strong>
						<small>UI experiment registry</small>
					</span>
				</a>
				<a className="playground-app-link" href="/">
					Open tf-demo <ArrowUpRightIcon aria-hidden="true" />
				</a>
			</header>

			<section className="playground-index__intro">
				<div>
					<p className="playground-eyebrow">Prototype ledger</p>
					<h1>Experiments need a room of their own.</h1>
				</div>
				<p>
					Deterministic fixtures, isolated state, and stable URLs for
					testing interactions before they enter the application.
				</p>
			</section>

			<section
				className="playground-ledger"
				aria-labelledby="experiment-heading"
			>
				<header>
					<h2 id="experiment-heading">Available experiments</h2>
					<span>
						{String(PLAYGROUND_EXPERIMENTS.length).padStart(2, "0")}{" "}
						live
					</span>
				</header>
				<ol>
					{PLAYGROUND_EXPERIMENTS.map((experiment, index) => (
						<li key={experiment.id}>
							<span className="playground-ledger__number">
								{String(index + 1).padStart(2, "0")}
							</span>
							<div>
								<code>{experiment.id}</code>
								<h3>{experiment.title}</h3>
								<p>{experiment.description}</p>
							</div>
							<a href={playgroundExperimentHref(experiment.id)}>
								Launch <ArrowUpRightIcon aria-hidden="true" />
							</a>
						</li>
					))}
				</ol>
			</section>

			<footer className="playground-index__footer">
				<span>Add experiments in</span>
				<code>src/playground/playground-registry.tsx</code>
			</footer>
		</main>
	);
}

function ExperimentRoute({
	detailId,
	experimentId,
}: {
	readonly detailId?: string;
	readonly experimentId: string;
}) {
	const experiment = findPlaygroundExperiment(experimentId);
	const [revision, setRevision] = useState(0);

	if (!experiment || (detailId && !experiment.supportsDetails)) {
		return (
			<MissingExperiment
				experimentId={
					detailId ? `${experimentId}/${detailId}` : experimentId
				}
			/>
		);
	}

	const Experiment = experiment.component;
	const backHref = detailId
		? playgroundExperimentHref(experimentId)
		: PLAYGROUND_PATH;
	const canReset = !experiment.supportsDetails || Boolean(detailId);
	return (
		<main className="playground-specimen">
			<nav
				className="playground-specimen__controls"
				aria-label="Experiment controls"
			>
				<h1 className="sr-only">{experiment.title}</h1>
				<a
					href={backHref}
					aria-label={detailId ? "Back to notes" : "Back to registry"}
				>
					<ArrowLeftIcon aria-hidden="true" />
				</a>
				{canReset ? (
					<button
						type="button"
						aria-label="Reset fixture"
						onClick={() => setRevision((value) => value + 1)}
					>
						<RotateCcwIcon aria-hidden="true" />
					</button>
				) : null}
			</nav>
			<section
				className="playground-specimen__stage"
				aria-label={`${experiment.title} experiment`}
			>
				<Experiment key={revision} detailId={detailId} />
			</section>
		</main>
	);
}

function MissingExperiment({
	experimentId,
}: {
	readonly experimentId: string;
}) {
	return (
		<main className="playground-missing">
			<p className="playground-eyebrow">Unknown experiment</p>
			<h1>No fixture is registered as “{experimentId}”.</h1>
			<p>
				Check the URL or return to the registry to choose a live
				experiment.
			</p>
			<a href={PLAYGROUND_PATH}>
				<ArrowLeftIcon aria-hidden="true" /> Back to playground
			</a>
		</main>
	);
}
