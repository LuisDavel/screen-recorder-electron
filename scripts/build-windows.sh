#!/bin/bash

# Script para build da aplicação Video Recorder para Windows 64-bits
# Gera executável, instalador Squirrel e MSI

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Video Recorder - Build para Windows 64-bits${NC}"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Execute este script a partir do diretório raiz do projeto.${NC}"
    exit 1
fi

# Verificar dependências
echo -e "${YELLOW}🔧 Verificando dependências...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js não encontrado. Instale o Node.js primeiro.${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm não encontrado. Instale o npm primeiro.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js e npm encontrados${NC}"

# Instalar dependências se necessário
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Instalando dependências...${NC}"
    npm install
fi

# Limpar builds anteriores
echo -e "${YELLOW}🧹 Limpando builds anteriores...${NC}"
rm -rf out/

# Build para Windows
echo -e "${PURPLE}🔨 Fazendo build para Windows 64-bits...${NC}"
echo -e "${CYAN}   Isso pode levar alguns minutos...${NC}"

npm run make:win

# Verificar se o build foi bem-sucedido
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 Build concluído com sucesso!${NC}"
    echo ""
    
    # Listar arquivos gerados
    echo -e "${BLUE}📦 Arquivos gerados:${NC}"
    
    if [ -d "out/make" ]; then
        find out/make -type f \( -name "*.exe" -o -name "*.msi" -o -name "*.zip" \) | while read file; do
            size=$(ls -lh "$file" | awk '{print $5}')
            echo -e "   📄 $(basename "$file") ${CYAN}($size)${NC}"
        done
        echo ""
        
        # Mostrar localização dos arquivos
        echo -e "${BLUE}📍 Localização dos arquivos:${NC}"
        echo -e "   ${PWD}/out/make/"
        echo ""
        
        # Instruções de uso
        echo -e "${YELLOW}📋 Instruções:${NC}"
        echo -e "   • ${GREEN}Setup Squirrel${NC}: Para distribuição com auto-update"
        echo -e "   • ${GREEN}MSI Installer${NC}: Para instalação tradicional no Windows"
        echo -e "   • ${GREEN}ZIP${NC}: Para execução portátil"
        echo ""
        
        # Comandos úteis
        echo -e "${BLUE}🔧 Comandos úteis:${NC}"
        echo -e "   ${CYAN}npm run make:win${NC}     - Build apenas Windows"
        echo -e "   ${CYAN}npm run package:win${NC}  - Apenas empacotamento (sem instaladores)"
        echo -e "   ${CYAN}npm run make${NC}         - Build para plataforma atual"
        echo ""
        
    else
        echo -e "${RED}❌ Diretório out/make não encontrado. Build pode ter falhado.${NC}"
        exit 1
    fi
    
else
    echo -e "${RED}❌ Falha no build. Verifique os logs acima.${NC}"
    exit 1
fi

# Verificar tamanho total
total_size=$(du -sh out/make 2>/dev/null | cut -f1)
echo -e "${BLUE}📊 Tamanho total dos arquivos: ${CYAN}$total_size${NC}"
echo ""

echo -e "${GREEN}✅ Processo concluído!${NC}" 