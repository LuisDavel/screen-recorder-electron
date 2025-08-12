# Sistema de Vídeos de Introdução e Encerramento

Este sistema permite adicionar automaticamente vídeos de introdução e encerramento aos vídeos gravados.

## Como Funciona

1. **Seleção da Instituição**: No HeaderConfig, selecione uma das instituições disponíveis
2. **Configuração de Vídeos**: 
   - **Vídeo de Introdução**: Sempre usa `me.mp4` (pode ser ativado/desativado)
   - **Vídeo de Encerramento**: Baseado na instituição selecionada (pode ser ativado/desativado)
3. **Concatenação**: Durante o salvamento, os vídeos são concatenados na ordem: Introdução → Gravação → Encerramento

## Mapeamento de Vídeos

### Vídeo de Introdução
- **Todas as instituições** → `me.mp4` (sempre o mesmo arquivo)

### Vídeos de Encerramento
Os vídeos de encerramento estão localizados na pasta `src/assets/videos/` e mapeados da seguinte forma:

- **Hospital São Jose** → `hsj.mp4`
- **Samuel Cesconetto** → `me.mp4`
- **Unimed** → `unimed.mp4`
- **Hospital São João Batista** → `hsj.mp4` (mesmo vídeo do São Jose)
- **Hospital São Donato** → `hsd.mp4`

## Requisitos

### FFmpeg
O sistema requer FFmpeg para concatenar os vídeos. O aplicativo verifica automaticamente se o FFmpeg está disponível.

**Instalação no macOS:**
```bash
brew install ffmpeg
```

**Instalação no Windows:**
1. Baixe FFmpeg de https://ffmpeg.org/download.html
2. Extraia e adicione ao PATH do sistema
3. Reinicie o aplicativo

**Instalação no Linux:**
```bash
# Ubuntu/Debian
sudo apt install ffmpeg

# CentOS/RHEL
sudo yum install ffmpeg

# Arch
sudo pacman -S ffmpeg
```

## Estrutura de Arquivos

```
assets/
├── hsj.mp4      # Hospital São Jose
├── me.mp4       # Samuel Cesconetto
├── unimed.mp4   # Unimed
└── hsd.mp4      # Hospital São Donato
```

## Como Adicionar Novos Vídeos

1. **Adicione o arquivo de vídeo** na pasta `assets/`
2. **Atualize o mapeamento** em `src/helpers/video-intro-manager.ts`:
   ```typescript
   export const HOSPITAL_INTRO_MAPPING = {
     "Nova Instituição": "novo_video.mp4",
     // ... outros mapeamentos
   } as const;
   ```
3. **Adicione a opção no select** em `src/components/recording-header/HeaderConfig.tsx`

## Processo de Concatenação

1. **Salvamento Temporário**: O vídeo gravado é salvo temporariamente
2. **Verificação**: Sistema verifica quais vídeos devem ser incluídos:
   - Introdução: sempre disponível (`me.mp4`)
   - Encerramento: baseado na instituição selecionada
3. **Concatenação**: FFmpeg concatena os vídeos usando filtros complexos:
   ```bash
   ffmpeg -i intro.mp4 -i gravacao.mp4 -i encerramento.mp4 \
     -filter_complex "[0:v]scale=1920:1080[v0];[1:v]scale=1920:1080[v1];[2:v]scale=1920:1080[v2];[v0][0:a][v1][1:a][v2][2:a]concat=n=3:v=1:a=1[outv][outa]" \
     -map "[outv]" -map "[outa]" video_final.mp4
   ```
4. **Arquivo Final**: O vídeo final é salvo com nomenclatura: `[CODIGO]-intro-recording-[TIMESTAMP].mp4`

## Códigos das Instituições

- **HSJ** - Hospital São Jose
- **SC** - Samuel Cesconetto
- **UNI** - Unimed
- **HSJB** - Hospital São João Batista
- **HSD** - Hospital São Donato

## Interface do Usuário

### HeaderConfig
- **Switch de Vídeo de Introdução**: Ativa/desativa a concatenação do vídeo de introdução (sempre `me.mp4`)
- **Switch de Vídeo de Encerramento**: Ativa/desativa a concatenação do vídeo de encerramento (baseado na instituição)
- **Indicadores Visuais**: 
  - Badge "Intro" aparece em todas as instituições (sempre disponível)
  - Badge "Outro" aparece nas instituições que possuem vídeo de encerramento
- **Status**: Mostra se os vídeos estão disponíveis para a instituição selecionada

### Página de Configurações
- **Teste de Vídeos**: Componente para testar a concatenação de vídeos de introdução e encerramento
- **Status do FFmpeg**: Mostra se o FFmpeg está disponível
- **Instalação Automática**: Botão para instalar FFmpeg (macOS com Homebrew)
- **Instruções**: Guia de instalação manual para outras plataformas

## Tratamento de Erros

- **FFmpeg não encontrado**: Vídeo é salvo sem introdução
- **Vídeo de introdução não encontrado**: Gravação normal é mantida
- **Erro na concatenação**: Arquivo original é preservado
- **Falha no salvamento**: Mensagens de erro detalhadas

## Logs e Debug

O sistema registra logs detalhados para debug:
- Verificação de disponibilidade de vídeos
- Processo de concatenação
- Erros e warnings
- Status do FFmpeg

## Limitações Atuais

1. **Seletor de Arquivo**: Vídeos de introdução só funcionam com local de salvamento específico
2. **Formatos**: Otimizado para MP4, pode ter limitações com outros formatos
3. **Tamanho**: Vídeos muito grandes podem demorar para concatenar
4. **Plataforma**: Instalação automática do FFmpeg apenas no macOS

## Próximos Passos

- [ ] Suporte a introdução com seletor de arquivo
- [ ] Preview dos vídeos de introdução
- [ ] Configuração de duração da introdução
- [ ] Suporte a outros formatos de vídeo
- [ ] Cache de verificação de disponibilidade