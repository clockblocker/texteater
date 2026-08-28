import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import { playgroundRouteFromPathname } from "@/playground/playground-route";

const rootElement = document.getElementById("root");

if (!rootElement) {
	throw new Error("The #root element is required to mount tf-demo.");
}

const root = createRoot(rootElement);
const playgroundRoute = playgroundRouteFromPathname(window.location.pathname);

if (playgroundRoute) {
	void import("@/playground/playground-app").then(
		({ PlaygroundApp, PlaygroundProviders }) => {
			root.render(
				<StrictMode>
					<PlaygroundProviders>
						<PlaygroundApp route={playgroundRoute} />
					</PlaygroundProviders>
				</StrictMode>,
			);
		},
	);
} else {
	if (
		window.location.pathname !== "/" ||
		window.location.search !== "" ||
		window.location.hash !== ""
	) {
		window.history.replaceState(null, "", "/");
	}
	void Promise.all([
		import("./App"),
		import("@/components/app-provider"),
	]).then(([{ default: App }, { AppProvider }]) => {
		root.render(
			<StrictMode>
				<AppProvider>
					<App />
				</AppProvider>
			</StrictMode>,
		);
	});
}
