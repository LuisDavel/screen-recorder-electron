# Sistema de Header Informativo

O sistema de header informativo permite adicionar uma barra de informações no topo dos vídeos gravados, contendo dados importantes sobre o exame, paciente e instituição.

## Visão Geral

O header é uma overlay que aparece no topo do vídeo durante a gravação, exibindo informações configuráveis de forma organizada e profissional. É especialmente útil para gravações médicas, educacionais ou corporativas onde é necessário identificar claramente o conteúdo do vídeo.

## Características

- **Configurável**: Todos os campos podem ser personalizados
- **Altura Ajustável**: O header pode ter entre 60px e 120px de altura
- **Layout Responsivo**: Adapta-se automaticamente ao tamanho do vídeo
- **Integração Transparente**: Funciona com ou sem câmera overlay
- **Persistência**: As configurações são salvas localmente

## Como Configurar

### 1. Acessar as Configurações

Navegue até a página de configurações através do menu principal.

### 2. Configurar o Header

Na seção "Header Informativo", você encontrará:

- **Botão Ativar/Desativar**: Liga ou desliga o header
- **Altura do Header**: Define a altura em pixels (padrão: 80px)
- **Campos de Informação**:
  - Nome do Exame
  - Data do Exame
  - Nome do Paciente
  - Sexo e Idade
  - Nome da Instituição
  - Médico Requisitante e CRM
  - ID Externo

### 3. Habilitar na Gravação

Durante a configuração da gravação:

1. Configure todos os dados do header nas configurações
2. Na tela de gravação, ative a opção "Incluir header informativo"
3. O header será adicionado automaticamente ao vídeo gravado

## Arquitetura Técnica

### Componentes Principais

#### 1. `HeaderConfig.tsx`
Componente de configuração que permite ao usuário definir todas as informações do header.

#### 2. `RecordingHeader.tsx`
Componente visual que renderiza o header durante o preview da gravação.

#### 3. `VideoHeaderComposer.ts`
Classe responsável por compor o header com o vídeo usando Canvas API.

#### 4. `store-header-config.ts`
Store Zustand que gerencia o estado e persistência das configurações do header.

### Fluxo de Funcionamento

1. **Configuração**: O usuário define as informações no `HeaderConfig`
2. **Armazenamento**: Os dados são salvos no store local via Zustand
3. **Preview**: Durante a gravação, o `RecordingHeader` mostra como ficará
4. **Composição**: O `VideoHeaderComposer` renderiza o header sobre o vídeo
5. **Gravação**: O vídeo final inclui o header permanentemente

### Integração com o Sistema de Gravação

O header é integrado ao pipeline de gravação através do `AdvancedScreenRecorderManager`:

```typescript
// Aplicação do header durante a gravação
if (options.includeHeader && options.headerConfig?.isEnabled) {
  const headerComposer = new VideoHeaderComposer(options.headerConfig);
  currentStream = await headerComposer.composeWithHeader(
    currentStream,
    width,
    height
  );
}
```

## Personalização Visual

### Layout

O header utiliza um grid de 12 colunas para distribuir as informações:

- **Linha Principal** (sempre visível):
  - Nome do Exame (3 colunas)
  - Data (2 colunas)
  - Paciente (3 colunas)
  - Sexo/Idade (2 colunas)
  - ID (2 colunas)

- **Linha Secundária** (visível quando altura > 60px):
  - Instituição (4 colunas)
  - Médico (4 colunas)
  - CRM (4 colunas)

### Estilização

- **Fundo**: Cinza escuro semi-transparente (#111827/95%)
- **Texto Principal**: Branco (#FFFFFF)
- **Labels**: Cinza claro (#9CA3AF)
- **Fonte**: System UI nativa do sistema

## Limitações e Considerações

1. **Performance**: O header adiciona processamento extra durante a gravação
2. **Resolução**: Melhor visualização em vídeos 720p ou superior
3. **Texto Longo**: Textos muito longos são truncados com "..."
4. **Compatibilidade**: Requer navegadores com suporte a Canvas API

## Troubleshooting

### O header não aparece no vídeo

1. Verifique se o header está ativado nas configurações
2. Confirme que a opção "Incluir header informativo" está marcada
3. Certifique-se de que há pelo menos um campo preenchido

### Texto cortado ou ilegível

1. Aumente a altura do header para 100px ou mais
2. Use textos mais contos nos campos
3. Verifique a resolução do vídeo (mínimo recomendado: 1280x720)

### Performance degradada

1. Desative outros overlays (câmera) se não necessários
2. Reduza a resolução de gravação
3. Feche outras aplicações pesadas

## Exemplos de Uso

### Contexto Médico
```
Nome do Exame: Ultrassonografia Abdominal
Data: 05/07/2025
Paciente: João da Silva
Sexo/Idade: Masculino / 45 anos
Instituição: Hospital Central
Médico: Dr. Carlos Santos
CRM: 12345/SP
ID: USG-2025-0705-001
```

### Contexto Educacional
```
Nome do Exame: Aula de Física - Mecânica Quântica
Data: 05/07/2025
Paciente: Turma 3º Ano B
Instituição: Universidade Federal
Médico: Prof. Maria Silva
ID: AULA-FIS-2025-07
```

## Roadmap Futuro

- [ ] Templates pré-configurados para diferentes contextos
- [ ] Customização de cores e fontes
- [ ] Suporte para logos institucionais
- [ ] Exportação/importação de configurações
- [ ] Posicionamento do header (topo/rodapé)
- [ ] Animações de entrada/saída