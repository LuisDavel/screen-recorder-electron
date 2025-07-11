import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useHeaderConfigStore } from "@/store/store-header-config";
import { Settings, Square } from "lucide-react";
import { cn } from "@/utils/tailwind";
import {
	Dialog,
	DialogHeader,
	DialogContent,
	DialogTrigger,
	DialogTitle,
} from "../ui/dialog";
import { Switch } from "../ui/switch";

export function FooterConfig() {
	const { footerConfig, updateFooterConfig } = useHeaderConfigStore();
	const [isOpen, setIsOpen] = React.useState(false);

	const handleInputChange = (field: string, value: string | number) => {
		updateFooterConfig({ [field]: value });
	};

	const toggleFooter = () => {
		updateFooterConfig({ isEnabled: !footerConfig.isEnabled });
	};

	const handleOpenChange = (open: boolean) => {
		setIsOpen(open);
	};

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<div className="flex flex-col items-start gap-2">
				<div className="flex items-center justify-between w-full">
					<div className="flex items-center gap-2">
						<Square className="h-5 w-5" />
						<p>Footer (Rodapé)</p>
					</div>
					<DialogTrigger asChild>
						<Button
							disabled={!footerConfig.isEnabled}
							variant={footerConfig.isEnabled ? "default" : "outline"}
							size="icon"
							onClick={() => handleOpenChange(!isOpen)}
						>
							<Settings className="h-4 w-4" />
						</Button>
					</DialogTrigger>
				</div>
				<div className="flex items-center gap-2">
					<Switch
						checked={footerConfig.isEnabled}
						onCheckedChange={toggleFooter}
					/>
					<p>{footerConfig.isEnabled ? "Ativo" : "Inativo"}</p>
				</div>
			</div>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Configuração do Footer</DialogTitle>
				</DialogHeader>
				<div
					className={cn(
						"space-y-6 px-4 max-h-[calc(100vh-200px)] overflow-auto",
					)}
				>
					<div>
						<p className="text-muted-foreground mb-4 text-sm">
							Configure o rodapé que aparecerá na parte inferior da gravação
						</p>

						{/* Altura do Footer */}
						<div className="mb-6">
							<Label className="mb-2" htmlFor="footer-height">
								Altura do Footer (px)
							</Label>
							<Input
								id="footer-height"
								type="number"
								placeholder="40"
								value={footerConfig.height}
								onChange={(e) =>
									handleInputChange("height", parseInt(e.target.value) || 40)
								}
								className="max-w-[200px]"
							/>
							<p className="text-muted-foreground mt-2 text-xs">
								O footer aparecerá como um espaço vazio na parte inferior do
								vídeo
							</p>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
