import { GlobalRegistrator } from "@happy-dom/global-registrator";

// Kept apart from ./dom so the DOM exists before that module loads React DOM.
GlobalRegistrator.register();
