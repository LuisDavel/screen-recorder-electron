import { exposeThemeContext } from "./theme/theme-context";
import { exposeWindowContext } from "./window/window-context";
import { exposePlatformContext } from "./platform/platform-context";
import { exposeScreenRecorderContext } from "./screen-recorder/screen-recorder-context";

export default function exposeContexts() {
	exposeWindowContext();
	exposeThemeContext();
	exposePlatformContext();
	exposeScreenRecorderContext();
}
