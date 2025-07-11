import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface CountdownPopupProps {
	countdown: number | null;
	isOpen: boolean;
}

export const CountdownPopup = React.memo(
	({ countdown, isOpen }: CountdownPopupProps) => {
		if (isOpen) {
			return (
				<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm">
					<div className="text-center py-8 px-8 bg-black/95 rounded-lg border border-white/20">
						<div className="text-9xl font-bold text-white animate-pulse drop-shadow-2xl mb-4">
							{countdown === 0 ? "GO!" : countdown}
						</div>
						<div className="text-2xl text-white font-semibold mb-2">
							{countdown === 0
								? "Iniciando gravação!"
								: "Gravação iniciando em..."}
						</div>
						<div className="text-lg text-gray-300">
							{countdown === 0 ? "🎬" : "Prepare-se!"}
						</div>
					</div>
				</div>
			);
		}

		return (
			<Dialog open={isOpen}>
				<DialogContent
					showCloseButton={false}
					className="sm:max-w-md border-0 bg-black/95 text-white backdrop-blur-sm z-[999]"
				>
					<div className="text-center py-8">
						<div className="text-9xl font-bold text-white animate-pulse drop-shadow-2xl mb-4">
							{countdown === 0 ? "GO!" : countdown}
						</div>
						<div className="text-2xl text-white font-semibold mb-2">
							{countdown === 0
								? "Iniciando gravação!"
								: "Gravação iniciando em..."}
						</div>
						<div className="text-lg text-gray-300">
							{countdown === 0 ? "🎬" : "Prepare-se!"}
						</div>
					</div>
				</DialogContent>
			</Dialog>
		);
	},
);

CountdownPopup.displayName = "CountdownPopup";
