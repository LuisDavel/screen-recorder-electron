import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { FileText, User, Building, Hash } from "lucide-react";

export function HeaderConfig() {
  const { headerConfig, updateHeaderConfig } = useHeaderConfigStore();
  const [isActive, setActive] = React.useState(false);

  const handleInputChange = (field: string, value: string | number) => {
    updateHeaderConfig({ [field]: value });
  };

  const toggleHeader = () => {
    updateHeaderConfig({ isEnabled: !headerConfig.isEnabled });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <CardTitle>Header Informativo</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActive(!isActive)}
            >
              Ocultar
            </Button>
            <Button
              variant={headerConfig.isEnabled ? "default" : "outline"}
              size="sm"
              onClick={toggleHeader}
            >
              {headerConfig.isEnabled ? "Header Ativo" : "Ativar Header"}
            </Button>
          </div>
        </div>
      </CardHeader>
      {isActive && (
        <CardContent className="space-y-6">
          <div>
            <h3 className="mb-4 text-lg font-semibold">
              Configuração do Header
            </h3>
            <p className="text-muted-foreground mb-4 text-sm">
              Preencha as informações que aparecerão no header superior da
              gravação
            </p>

            {/* Altura do Header */}
            <div className="mb-6">
              <Label htmlFor="height">Altura do Header (px)</Label>
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
                <Label htmlFor="examName" className="flex items-center gap-2">
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
                <Label htmlFor="examDate" className="flex items-center gap-2">
                  📅 Data do Exame
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
                  className="flex items-center gap-2"
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
                  <Label htmlFor="sex">Sexo</Label>
                  <Select
                    value={headerConfig.patientSex}
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
                  <Label htmlFor="age">Idade</Label>
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

            {/* Dados da Instituição */}
            <div className="mb-6 space-y-4">
              <div>
                <Label
                  htmlFor="institution"
                  className="flex items-center gap-2"
                >
                  <Building className="h-4 w-4" />
                  Nome da Instituição
                </Label>
                <Input
                  id="institution"
                  placeholder="Nome do hospital, clínica ou laboratório"
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
                <Label htmlFor="doctor">Médico Requisitante</Label>
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
                <Label htmlFor="crm">CRM</Label>
                <Input
                  id="crm"
                  placeholder="Ex: 12345/SP"
                  value={headerConfig.crm}
                  onChange={(e) => handleInputChange("crm", e.target.value)}
                />
              </div>
            </div>

            {/* ID Externo */}
            <div>
              <Label htmlFor="externalId" className="flex items-center gap-2">
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
          </div>
        </CardContent>
      )}
    </Card>
  );
}
