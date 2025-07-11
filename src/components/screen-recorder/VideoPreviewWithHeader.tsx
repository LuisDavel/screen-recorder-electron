import React, { useRef, useEffect } from "react";
import { useHeaderConfigStore } from "@/store/store-header-config";

interface VideoPreviewWithHeaderProps {
	stream: MediaStream | null;
	isRecording?: boolean;
	className?: string;
}

export default function VideoPreviewWithHeader({
	stream,
	className = "",
}: VideoPreviewWithHeaderProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const { headerConfig } = useHeaderConfigStore();

	useEffect(() => {
		if (videoRef.current && stream) {
			videoRef.current.srcObject = stream;
			videoRef.current.play().catch(console.error);
		}

		return () => {
			if (videoRef.current) {
				videoRef.current.srcObject = null;
			}
		};
	}, [stream]);

	const formatDate = (dateString: string) => {
		if (!dateString) return "";
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString("pt-BR");
		} catch {
			return dateString;
		}
	};

	const getSexAge = () => {
		if (headerConfig.patientSex && headerConfig.patientAge) {
			return `${headerConfig.patientSex} / ${headerConfig.patientAge}`;
		}
		return (
			headerConfig.patientSex || headerConfig.patientAge || "Não informado"
		);
	};

	return (
		<div className={`relative h-full w-full bg-black ${className}`}>
			{/* Preview do vídeo */}
			<video
				ref={videoRef}
				className="h-full w-full object-contain"
				autoPlay
				muted
				playsInline
			/>

			{/* Indicador quando não há stream */}
			{!stream && (
				<div className="absolute inset-0 flex items-center justify-center text-gray-500">
					<div className="text-center">
						<p className="text-lg">Nenhuma fonte selecionada</p>
						<p className="mt-2 text-sm">
							Selecione uma fonte para visualizar o preview
						</p>
					</div>
				</div>
			)}

			{/* Header sobreposto na parte superior */}
			{stream && headerConfig.isEnabled && (
				<div
					className="absolute top-0 right-0 left-0 z-50 bg-gray-900/95 text-white shadow-lg backdrop-blur-sm"
					style={{ height: `${headerConfig.height}px` }}
				>
					<div className="flex h-full items-center px-6">
						<div className="grid w-full grid-cols-12 gap-4">
							{/* Nome do Exame */}
							<div className="col-span-3">
								<div className="mb-1 text-xs text-gray-400">Exame</div>
								<div className="truncate text-sm font-medium">
									{headerConfig.examName || "Não informado"}
								</div>
							</div>

							{/* Data do Exame */}
							<div className="col-span-2">
								<div className="mb-1 text-xs text-gray-400">Data</div>
								<div className="text-sm font-medium">
									{formatDate(headerConfig.examDate) || "Não informada"}
								</div>
							</div>

							{/* Nome do Paciente */}
							<div className="col-span-3">
								<div className="mb-1 text-xs text-gray-400">Paciente</div>
								<div className="truncate text-sm font-medium">
									{headerConfig.patientName || "Não informado"}
								</div>
							</div>

							{/* Sexo e Idade */}
							<div className="col-span-2">
								<div className="mb-1 text-xs text-gray-400">Sexo / Idade</div>
								<div className="text-sm font-medium">{getSexAge()}</div>
							</div>

							{/* ID Externo */}
							<div className="col-span-2">
								<div className="mb-1 text-xs text-gray-400">ID</div>
								<div className="truncate text-sm font-medium">
									{headerConfig.externalId || "Não informado"}
								</div>
							</div>
						</div>
					</div>

					{/* Segunda linha com informações adicionais se a altura permitir */}
					{headerConfig.height > 60 && (
						<div className="absolute right-0 bottom-0 left-0 px-6 pt-2">
							<div className="grid w-full grid-cols-12 gap-4 text-xs">
								{/* Instituição */}
								<div className="col-span-4">
									<span className="text-gray-400">Instituição: </span>
									<span className="font-medium">
										{headerConfig.institutionName || "Não informada"}
									</span>
								</div>

								{/* Médico Requisitante */}
								<div className="col-span-4">
									<span className="text-gray-400">Médico: </span>
									<span className="font-medium">
										{headerConfig.requestingDoctor || "Não informado"}
									</span>
								</div>

								{/* CRM */}
								<div className="col-span-4">
									<span className="text-gray-400">CRM: </span>
									<span className="font-medium">
										{headerConfig.crm || "Não informado"}
									</span>
								</div>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
