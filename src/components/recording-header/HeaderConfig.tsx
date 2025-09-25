import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useHeaderConfigStore } from "@/store/store-header-config";
import {
  FileText,
  User,
  Building,
  Hash,
  Calendar,
  Settings,
  Video,
} from "lucide-react";
import { cn } from "@/utils/tailwind";
import {
  Dialog,
  DialogHeader,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "../ui/dialog";
import { Switch } from "../ui/switch";
import { VideoSelectComponent } from "../VideoSelectComponent";
import { S3AccessTest } from "../S3AccessTest";

export function HeaderConfig() {
  const { headerConfig, updateHeaderConfig } = useHeaderConfigStore();
  const [isOpen, setIsOpen] = React.useState(false);

  const handleInputChange = (
    field: string,
    value: string | number | boolean,
  ) => {
    console.log("🔍 HeaderConfig - Atualizando campo:", field, "valor:", value);
    updateHeaderConfig({ [field]: value });
  };

  const handleVideoConfigChange = (config: {
    introVideo: { key: string; url: string };
    outroVideo: { key: string; url: string };
  }) => {
    console.log(
      "🎬 HeaderConfig - Atualizando configuração de vídeos:",
      config,
    );
    updateHeaderConfig({
      introVideo: config.introVideo,
      outroVideo: config.outroVideo,
    });
  };

  const handleIntroVideoChange = (key: string, url: string) => {
    console.log("🎬 HeaderConfig - Vídeo de introdução selecionado:", {
      key,
      url,
    });
    updateHeaderConfig({
      introVideo: { key, url },
    });
  };

  const handleOutroVideoChange = (key: string, url: string) => {
    console.log("🎭 HeaderConfig - Vídeo de encerramento selecionado:", {
      key,
      url,
    });
    updateHeaderConfig({
      outroVideo: { key, url },
    });
  };

  const toggleHeader = () => {
    updateHeaderConfig({ isEnabled: !headerConfig.isEnabled });
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex flex-col items-start gap-2">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <p>Header Informativo</p>
          </div>
          <DialogTrigger asChild>
            <Button
              disabled={!headerConfig.isEnabled}
              variant={headerConfig.isEnabled ? "default" : "outline"}
              size="icon"
              onClick={() => handleOpenChange(!isOpen)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </DialogTrigger>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={headerConfig.isEnabled}
            onCheckedChange={toggleHeader}
          />
          <p>{headerConfig.isEnabled ? "Ativo" : "Inativo"}</p>
        </div>
      </div>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Configuração do Header</DialogTitle>
        </DialogHeader>
        <div
          className={cn(
            "max-h-[calc(100vh-200px)] space-y-6 overflow-auto px-4",
          )}
        >
          <div>
            <p className="text-muted-foreground mb-4 text-sm">
              Preencha as informações que aparecerão no header superior da
              gravação
            </p>

            {/* Altura do Header */}
            <div className="mb-6">
              <Label className="mb-2" htmlFor="height">
                Altura do Header (px)
              </Label>
              <Input
                id="height"
                type="number"
                placeholder="80"
                value={headerConfig.height}
                onChange={(e) =>
                  handleInputChange("height", parseInt(e.target.value) || 80)
                }
                className="max-w-[200px]"
              />
            </div>

            {/* Nome e Data do Exame */}
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label
                  htmlFor="examName"
                  className="mb-2 flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Nome do Exame
                </Label>
                <Input
                  id="examName"
                  placeholder="Ex: Ultrassonografia Abdominal"
                  value={headerConfig.examName}
                  onChange={(e) =>
                    handleInputChange("examName", e.target.value)
                  }
                />
              </div>
              <div>
                <Label
                  htmlFor="examDate"
                  className="mb-2 flex items-center gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  Data do Exame
                </Label>
                <Input
                  id="examDate"
                  type="date"
                  value={headerConfig.examDate}
                  onChange={(e) =>
                    handleInputChange("examDate", e.target.value)
                  }
                />
              </div>
            </div>

            {/* Dados do Paciente */}
            <div className="mb-6 space-y-4">
              <div>
                <Label
                  htmlFor="patientName"
                  className="mb-2 flex items-center gap-2"
                >
                  <User className="h-4 w-4" />
                  Nome do Paciente
                </Label>
                <Input
                  id="patientName"
                  placeholder="Nome completo do paciente"
                  value={headerConfig.patientName}
                  onChange={(e) =>
                    handleInputChange("patientName", e.target.value)
                  }
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="sex" className="mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Sexo
                  </Label>
                  <Select
                    value={headerConfig.patientSex || undefined}
                    onValueChange={(value) =>
                      handleInputChange("patientSex", value)
                    }
                  >
                    <SelectTrigger id="sex">
                      <SelectValue placeholder="Sexo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Masculino">Masculino</SelectItem>
                      <SelectItem value="Feminino">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="age" className="mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Idade
                  </Label>
                  <Input
                    id="age"
                    placeholder="Ex: 35 anos"
                    value={headerConfig.patientAge}
                    onChange={(e) =>
                      handleInputChange("patientAge", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            {/* Dados da Instituição - Agora como campo de texto livre */}
            <div className="mb-6 space-y-4">
              <div>
                <Label
                  htmlFor="institution"
                  className="mb-2 flex items-center gap-2"
                >
                  <Building className="h-4 w-4" />
                  Nome da Instituição
                </Label>
                <Input
                  id="institution"
                  placeholder="Digite o nome da instituição"
                  value={headerConfig.institutionName}
                  onChange={(e) =>
                    handleInputChange("institutionName", e.target.value)
                  }
                />
              </div>
            </div>

            {/* Médico e CRM */}
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label
                  htmlFor="doctor"
                  className="mb-2 flex items-center gap-2"
                >
                  <User className="h-4 w-4" />
                  Médico Requisitante
                </Label>
                <Input
                  id="doctor"
                  placeholder="Nome do médico"
                  value={headerConfig.requestingDoctor}
                  onChange={(e) =>
                    handleInputChange("requestingDoctor", e.target.value)
                  }
                />
              </div>
              <div>
                <Label htmlFor="crm" className="mb-2 flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  CRM
                </Label>
                <Input
                  id="crm"
                  placeholder="Ex: 12345/SP"
                  value={headerConfig.crm}
                  onChange={(e) => handleInputChange("crm", e.target.value)}
                />
              </div>
            </div>

            {/* ID Externo */}
            <div className="mb-6">
              <Label
                htmlFor="externalId"
                className="mb-2 flex items-center gap-2"
              >
                <Hash className="h-4 w-4" />
                ID Externo
              </Label>
              <Input
                id="externalId"
                placeholder="Código ou ID do sistema externo"
                value={headerConfig.externalId}
                onChange={(e) =>
                  handleInputChange("externalId", e.target.value)
                }
              />
            </div>

            {/* Seleção de Vídeos S3 */}
            <div className="mb-6 space-y-6">
              <div className="border-t pt-6">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  <Video className="h-5 w-5" />
                  Vídeos de Introdução e Encerramento
                </h3>
                <p className="text-muted-foreground mb-6 text-sm">
                  Selecione os vídeos que serão utilizados no início e fim da
                  gravação.
                </p>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <VideoSelectComponent
                      label="🎬 Vídeo de Introdução"
                      selectedVideo={headerConfig.introVideo?.key || ""}
                      onVideoChange={handleIntroVideoChange}
                      placeholder="Selecione o vídeo de abertura..."
                      className="h-full"
                    />
                  </div>

                  <div>
                    <VideoSelectComponent
                      label="🎭 Vídeo de Encerramento"
                      selectedVideo={headerConfig.outroVideo?.key || ""}
                      onVideoChange={handleOutroVideoChange}
                      placeholder="Selecione o vídeo de fechamento..."
                      className="h-full"
                    />
                  </div>
                </div>

                {/* Status da configuração de vídeos */}
                <div className="mt-6 rounded-lg bg-gray-50 p-4">
                  <h4 className="mb-3 font-medium">Status da Configuração</h4>
                  <div className="grid gap-3 text-sm md:grid-cols-2">
                    <div className="flex items-center space-x-2">
                      <div
                        className={`h-3 w-3 rounded-full ${
                          headerConfig.introVideo?.url
                            ? "bg-green-500"
                            : "bg-gray-300"
                        }`}
                      ></div>
                      <span
                        className={
                          headerConfig.introVideo?.url
                            ? "text-green-700"
                            : "text-gray-500"
                        }
                      >
                        Vídeo de Introdução:{" "}
                        {headerConfig.introVideo?.url
                          ? "Configurado"
                          : "Não selecionado"}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div
                        className={`h-3 w-3 rounded-full ${
                          headerConfig.outroVideo?.url
                            ? "bg-green-500"
                            : "bg-gray-300"
                        }`}
                      ></div>
                      <span
                        className={
                          headerConfig.outroVideo?.url
                            ? "text-green-700"
                            : "text-gray-500"
                        }
                      >
                        Vídeo de Encerramento:{" "}
                        {headerConfig.outroVideo?.url
                          ? "Configurado"
                          : "Não selecionado"}
                      </span>
                    </div>
                  </div>

                  {headerConfig.introVideo?.url &&
                    headerConfig.outroVideo?.url && (
                      <div className="mt-4 space-y-4">
                        <div className="rounded-md border border-green-200 bg-green-50 p-3">
                          <div className="flex items-center space-x-2">
                            <div className="h-4 w-4 text-green-600">✅</div>
                            <p className="text-sm text-green-800">
                              <strong>Configuração completa!</strong> Os vídeos
                              estão prontos para serem usados na gravação.
                            </p>
                          </div>
                        </div>

                        {/* Testes de diagnóstico FFmpeg */}
                        <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
                          <h4 className="mb-3 flex items-center gap-2 font-medium text-blue-900">
                            🔧 Diagnóstico FFmpeg
                          </h4>
                          <p className="mb-4 text-sm text-blue-800">
                            Teste se o FFmpeg consegue acessar diretamente suas
                            URLs S3:
                          </p>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <h5 className="mb-2 font-medium text-blue-900">
                                Vídeo de Introdução
                              </h5>
                              <S3AccessTest
                                videoUrl={headerConfig.introVideo?.url}
                                videoName={
                                  headerConfig.introVideo?.key || "Introdução"
                                }
                                testLabel="Testar Introdução"
                              />
                            </div>

                            <div>
                              <h5 className="mb-2 font-medium text-blue-900">
                                Vídeo de Encerramento
                              </h5>
                              <S3AccessTest
                                videoUrl={headerConfig.outroVideo?.url}
                                videoName={
                                  headerConfig.outroVideo?.key || "Encerramento"
                                }
                                testLabel="Testar Encerramento"
                              />
                            </div>
                          </div>

                          <div className="mt-4 rounded-md bg-blue-100 p-3">
                            <p className="text-xs text-blue-800">
                              💡 <strong>Como interpretar:</strong>
                              <br />• ✅ <strong>Sucesso:</strong> FFmpeg
                              consegue acessar - concatenação funcionará
                              <br />• ❌ <strong>Falha:</strong> Problema de
                              rede ou URL expirada - configurar novamente
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
