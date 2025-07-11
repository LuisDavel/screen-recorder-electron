import React from "react";
import { UnifiedHeader } from "./UnifiedHeader";

interface RecordingHeaderProps {
	isVisible?: boolean;
}

export default function RecordingHeader({
	isVisible = true,
}: RecordingHeaderProps) {
	return <UnifiedHeader isVisible={isVisible} className="h-full w-full" />;
}
