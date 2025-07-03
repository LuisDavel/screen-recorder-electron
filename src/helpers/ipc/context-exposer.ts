import { exposeThemeContext } from "./theme/theme-context";
import { exposeWindowContext } from "./window/window-context";
import { exposePlatformContext } from "./platform/platform-context";

export default function exposeContexts() {
  exposeWindowContext();
  exposeThemeContext();
  exposePlatformContext();
}
