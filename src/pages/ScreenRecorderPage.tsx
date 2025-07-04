import React from "react";
import ScreenRecorder from "@/components/screen-recorder/ScreenRecorder";

export default function ScreenRecorderPage() {
	return (
		<div className="flex h-full flex-col">
			<div className="flex-1 overflow-auto">
				<ScreenRecorder />
			</div>
		</div>
	);
}
