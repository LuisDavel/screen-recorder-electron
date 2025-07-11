import { createRoute } from "@tanstack/react-router";
import { RootRoute } from "./__root";
import HomePage from "@/pages/HomePage";
import ScreenRecorderPage from "@/pages/ScreenRecorderPage";
import ConfigPage from "@/pages/ConfigPage";

export const HomeRoute = createRoute({
	getParentRoute: () => RootRoute,
	path: "/",
	component: HomePage,
});

export const ConfigPageRoute = createRoute({
	getParentRoute: () => RootRoute,
	path: "/config",
	component: ConfigPage,
});

export const ScreenRecorderRoute = createRoute({
	getParentRoute: () => RootRoute,
	path: "/screen-recorder",
	component: ScreenRecorderPage,
});

export const rootTree = RootRoute.addChildren([
	HomeRoute,
	ConfigPageRoute,
	ScreenRecorderRoute,
]);
