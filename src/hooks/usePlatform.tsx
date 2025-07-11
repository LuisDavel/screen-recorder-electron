import {
	isMacOS as isMacOSHelper,
	isWindows as isWindowsHelper,
	isLinux as isLinuxHelper,
	getPlatformName,
} from "@/helpers/platform_helpers";
import { useEffect, useState, useCallback } from "react";

export default function usePlatform() {
	const [platform, setPlatform] = useState<string>("");
	const [isMacOS, setIsMacOS] = useState<boolean>(false);
	const [isWindows, setIsWindows] = useState<boolean>(false);
	const [isLinux, setIsLinux] = useState<boolean>(false);

	const detectPlatform = useCallback(async () => {
		try {
			const platformName = await getPlatformName();
			setPlatform(platformName);

			if (await isMacOSHelper()) {
				setIsMacOS(true);
			} else if (await isWindowsHelper()) {
				setIsWindows(true);
			} else if (await isLinuxHelper()) {
				setIsLinux(true);
			}
		} catch (error) {
			console.error("Error detecting platform:", error);
		}
	}, []);

	useEffect(() => {
		detectPlatform();
	}, [detectPlatform]);

	return { platform, isMacOS, isWindows, isLinux };
}
