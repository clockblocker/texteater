import { Popover } from "@base-ui/react/popover";
import {
	ArrowLeftIcon,
	ArrowUpRightIcon,
	RotateCcwIcon,
	SettingsIcon,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { AppProvider } from "@/components/app-provider";
import {
	findPlaygroundExperiment,
	PLAYGROUND_EXPERIMENTS,
} from "@/playground/playground-registry";
import {
	PLAYGROUND_PATH,
	type PlaygroundRoute,
	playgroundExperimentHref,
	playgroundRouteFromPathname,
} from "@/playground/playground-route";
import { PlaygroundControlsContext } from "./playground-controls";
import "./playground.css";

export function PlaygroundProviders({
	children,
}: {
	readonly children: ReactNode;
}) {
	return <AppProvider>{children}</AppProvider>;
}

export function PlaygroundApp({
	route: initialRoute,
}: {
	readonly route: PlaygroundRoute;
}) {
	const [route, setRoute] = useState(initialRoute);

	useEffect(() => {
		const handleClick = (event: MouseEvent) => {
			if (
				event.defaultPrevented ||
				event.button !== 0 ||
				event.metaKey ||
				event.ctrlKey ||
				event.shiftKey ||
				event.altKey ||
				!(event.target instanceof Element)
			) {
				return;
			}

			const link = event.target.closest("a[href]");
			if (
				!(link instanceof HTMLAnchorElement) ||
				(link.target !== "" && link.target !== "_self") ||
				link.hasAttribute("download") ||
				link.relList.contains("external")
			) {
				return;
			}

			const destination = new URL(link.href, window.location.href);
			const nextRoute = playgroundRouteFromPathname(destination.pathname);
			if (destination.origin !== window.location.origin || !nextRoute) {
				return;
			}

			event.preventDefault();
			if (destination.href === window.location.href) return;

			window.history.pushState(null, "", destination.href);
			setRoute(nextRoute);
		};
		const handlePopState = () => {
			const nextRoute = playgroundRouteFromPathname(
				window.location.pathname,
			);
			if (nextRoute) setRoute(nextRoute);
		};

		document.addEventListener("click", handleClick);
		window.addEventListener("popstate", handlePopState);
		return () => {
			document.removeEventListener("click", handleClick);
			window.removeEventListener("popstate", handlePopState);
		};
	}, []);

	return route.kind === "Index" ? (
		<PlaygroundIndex />
	) : (
		<ExperimentRoute
			key={route.experimentId}
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
	const [controlsOpen, setControlsOpen] = useState(false);
	const [controlsContainer, setControlsContainer] =
		useState<HTMLDivElement | null>(null);

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
			<h1 className="sr-only">{experiment.title}</h1>
			<Popover.Root
				open={controlsOpen}
				onOpenChange={setControlsOpen}
				modal={false}
			>
				<Popover.Trigger
					className="playground-specimen__cog"
					aria-label="Playground controls"
				>
					<SettingsIcon aria-hidden="true" />
				</Popover.Trigger>
				<Popover.Portal>
					<Popover.Positioner
						side="top"
						align="end"
						sideOffset={10}
						className="playground-controls-positioner"
					>
						<Popover.Popup className="playground-controls-popover">
							<Popover.Title className="sr-only">
								Playground controls
							</Popover.Title>
							<nav
								className="playground-specimen__controls"
								aria-label="Experiment controls"
							>
								<a
									href={backHref}
									onClick={() => setControlsOpen(false)}
								>
									<ArrowLeftIcon aria-hidden="true" />
									{detailId
										? "Back to notes"
										: "Back to registry"}
								</a>
								{canReset ? (
									<button
										type="button"
										onClick={() => {
											setRevision((value) => value + 1);
											setControlsOpen(false);
										}}
									>
										<RotateCcwIcon aria-hidden="true" />{" "}
										Reset fixture
									</button>
								) : null}
							</nav>
							<div
								ref={setControlsContainer}
								className="playground-controls-popover__extra"
							/>
						</Popover.Popup>
					</Popover.Positioner>
				</Popover.Portal>
			</Popover.Root>
			<PlaygroundControlsContext.Provider value={controlsContainer}>
				<section
					className="playground-specimen__stage"
					aria-label={`${experiment.title} experiment`}
				>
					<Experiment
						key={`${detailId ?? "index"}:${revision}`}
						detailId={detailId}
					/>
				</section>
			</PlaygroundControlsContext.Provider>
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
