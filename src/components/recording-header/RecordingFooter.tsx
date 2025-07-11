import React from "react";
import { UnifiedFooter } from "./UnifiedFooter";

interface RecordingFooterProps {
	isVisible?: boolean;
}

export default function RecordingFooter({
	isVisible = true,
}: RecordingFooterProps) {
	return <UnifiedFooter isVisible={isVisible} className="h-full w-full" />;
}
