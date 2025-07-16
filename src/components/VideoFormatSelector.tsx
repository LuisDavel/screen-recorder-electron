import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	useVideoFormatStore,
	type VideoFormat,
} from "@/store/store-video-format";
import { Video, Settings } from "lucide-react";

export function VideoFormatSelector() {
	const {
		format,
		codec,
		quality,
		maxResolution,
		targetFileSize,
		setFormat,
		setCodec,
		setQuality,
		getSupportedCodecs,
		getMimeType,
		getQualityBasedSettings,
		getQualityDescription,
	} = useVideoFormatStore();

	const [isOpen, setIsOpen] = useState(false);
	const [supportedCodecs, setSupportedCodecs] = useState<string[]>([]);

	// Update supported codecs when format changes
	useEffect(() => {
		const codecs = getSupportedCodecs();
		setSupportedCodecs(codecs);
	}, [format, getSupportedCodecs]);

	const handleFormatChange = (newFormat: VideoFormat) => {
		// Detectar se está no Windows		

		setFormat(newFormat);
	};

	const handleCodecChange = (newCodec: string) => {
		setCodec(newCodec);
	};

	const handleQualityChange = (newQuality: "low" | "medium" | "high") => {
		setQuality(newQuality);
	};

	const formatOptions = [
		{ value: "webm", label: "WebM (Padrão)" },
		{ value: "mp4", label: "MP4 (Compatível)" },
		{ value: "whatsapp", label: "WhatsApp (Otimizado)" },
	];

	const qualityOptions = [
		{ value: "low", label: "Baixa" },
		{ value: "medium", label: "Média" },
		{ value: "high", label: "Alta" },
	];

	// Get display name for codec
	const getCodecDisplayName = (codecValue: string) => {
		const codecMap: Record<string, string> = {
			vp9: "VP9 (Alta qualidade)",
			vp8: "VP8 (Compatível)",
			av01: "AV1 (Eficiente)",
			h264: "H.264 (Padrão)",
			avc1: "AVC1 (Compatível)",
		};
		return codecMap[codecValue] || codecValue;
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Video className="h-5 w-5" />
					<div>
						<Label className="text-base font-medium">Formato do Vídeo</Label>
						<p className="text-muted-foreground text-sm">
							Escolha o formato de exportação dos vídeos
						</p>
					</div>
				</div>
				<Dialog open={isOpen} onOpenChange={setIsOpen}>
					<DialogTrigger asChild>
						<Button variant="outline" size="sm">
							<Settings className="mr-2 h-4 w-4" />
							Configurar
						</Button>
					</DialogTrigger>
					<DialogContent className="sm:max-w-[500px]">
						<DialogHeader>
							<DialogTitle className="flex items-center gap-2">
								<Video className="h-5 w-5" />
								Configurações de Formato de Vídeo
							</DialogTitle>
						</DialogHeader>
						<div className="space-y-6 py-4">
							{/* Format Selection */}
							<div className="space-y-2">
								<Label htmlFor="format-select">Formato</Label>
								<Select value={format} onValueChange={handleFormatChange}>
									<SelectTrigger id="format-select">
										<SelectValue placeholder="Selecione o formato" />
									</SelectTrigger>
									<SelectContent>
										{formatOptions.map((option) => (
											<SelectItem key={option.value} value={option.value}>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<p className="text-muted-foreground text-sm">
									{format === "webm"
										? "WebM oferece boa qualidade e compactação, mas pode ter compatibilidade limitada."
										: format === "whatsapp"
											? "Formato otimizado para WhatsApp: tamanho reduzido (max 15MB), resolução adequada para mobile."
											: "MP4 tem ampla compatibilidade mas pode ter qualidade ligeiramente inferior."}
								</p>
							</div>

							{/* Codec Selection */}
							<div className="space-y-2">
								<Label htmlFor="codec-select">Codec</Label>
								<Select value={codec} onValueChange={handleCodecChange}>
									<SelectTrigger id="codec-select">
										<SelectValue placeholder="Selecione o codec" />
									</SelectTrigger>
									<SelectContent>
										{supportedCodecs.map((codecOption) => (
											<SelectItem key={codecOption} value={codecOption}>
												{getCodecDisplayName(codecOption)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<p className="text-muted-foreground text-sm">
									{supportedCodecs.length === 0
										? "Nenhum codec disponível para este formato"
										: `Codec selecionado: ${getCodecDisplayName(codec)}`}
								</p>
							</div>

							{/* Quality Selection */}
							<div className="space-y-2">
								<Label htmlFor="quality-select">Qualidade</Label>
								<Select value={quality} onValueChange={handleQualityChange}>
									<SelectTrigger id="quality-select">
										<SelectValue placeholder="Selecione a qualidade" />
									</SelectTrigger>
									<SelectContent>
										{qualityOptions.map((option) => (
											<SelectItem key={option.value} value={option.value}>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<div className="text-muted-foreground space-y-2 text-sm">
									<p>{getQualityDescription().description}</p>
									<div className="grid grid-cols-2 gap-2 text-xs">
										<div>
											<span className="font-medium">Bitrate:</span>{" "}
											{getQualityDescription().bitrate}
										</div>
										<div>
											<span className="font-medium">Frame Rate:</span>{" "}
											{getQualityDescription().frameRate}
										</div>
									</div>
									<p className="text-xs text-green-600 dark:text-green-400">
										<span className="font-medium">Ideal para:</span>{" "}
										{getQualityDescription().suitableFor}
									</p>
								</div>
							</div>

							{/* WhatsApp Information */}

							{/* Current Configuration Display */}
							<div className="bg-muted space-y-3 rounded-lg p-4">
								<h4 className="font-medium">Configuração Atual</h4>
								<div className="space-y-2 text-sm">
									<div className="grid grid-cols-2 gap-4">
										<div>
											<p>
												<strong>Formato:</strong> {format.toUpperCase()}
											</p>
											<p>
												<strong>Codec:</strong> {getCodecDisplayName(codec)}
											</p>
											<p>
												<strong>Qualidade:</strong>{" "}
												{getQualityDescription().label}
											</p>
										</div>
										<div>
											<p>
												<strong>Bitrate:</strong>{" "}
												{getQualityDescription().bitrate}
											</p>
											<p>
												<strong>Frame Rate:</strong>{" "}
												{getQualityDescription().frameRate}
											</p>
											<p>
												<strong>Otimizado para:</strong>{" "}
												{getQualityBasedSettings().optimizedFor}
											</p>
										</div>
									</div>
									<div className="border-border border-t pt-2">
										<p className="text-xs">
											<strong>MIME Type:</strong> {getMimeType()}
										</p>
										{format === "whatsapp" && (
											<>
												<p className="text-xs">
													<strong>Resolução máxima:</strong>{" "}
													{maxResolution
														? `${maxResolution.width}x${maxResolution.height}`
														: "720x720"}
												</p>
												<p className="text-xs">
													<strong>Tamanho alvo:</strong>{" "}
													{targetFileSize ? `${targetFileSize}MB` : "15MB"}
												</p>
											</>
										)}
									</div>
								</div>
							</div>
						</div>
					</DialogContent>
				</Dialog>
			</div>

			{/* Current format display */}
			<div className="text-muted-foreground flex items-center gap-2 text-sm">
				<div className="flex items-center gap-1">
					<div
						className={`h-2 w-2 rounded-full ${format === "whatsapp" ? "animate-pulse bg-green-500" : "bg-green-500"}`}
					></div>
					<span>Formato atual: {format.toUpperCase()}</span>
				</div>
				<span>•</span>
				<span>Codec: {getCodecDisplayName(codec)}</span>
				<span>•</span>
				<span>
					Qualidade: {qualityOptions.find((q) => q.value === quality)?.label}
				</span>
				{format === "whatsapp" && (
					<>
						<span>•</span>
						<span className="text-green-600 dark:text-green-400">
							Otimizado
						</span>
					</>
				)}
			</div>
		</div>
	);
}
