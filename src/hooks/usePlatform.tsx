import { isMacOS as isMacOSHelper, isWindows as isWindowsHelper, isLinux as isLinuxHelper, getPlatformName } from "@/helpers/platform_helpers";
import { useEffect, useState } from "react";

export default function usePlatform() {
  const [platform, setPlatform] = useState<string>("");
  const [isMacOS, setIsMacOS] = useState<boolean>(false);
  const [isWindows, setIsWindows] = useState<boolean>(false);
  const [isLinux, setIsLinux] = useState<boolean>(false);
  const detectPlatform = async () => {
    const platformName = await getPlatformName();
    
    if (await isMacOSHelper()) {
      setIsMacOS(true);
    } else if (await isWindowsHelper()) {
      setIsWindows(true);
    } else if (await isLinuxHelper()) {
      setIsLinux(true);
    }
    setPlatform(platformName);

  };
  useEffect(() => {
    return () => {
      detectPlatform();
    };
  }, []);

  return { platform, isMacOS, isWindows, isLinux };
}