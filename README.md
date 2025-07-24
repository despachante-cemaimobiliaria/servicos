# CEMA Imobiliária - Controle Financeiro de Serviços

Este sistema web permite o controle financeiro do setor de serviços da CEMA Imobiliária, com integração ao Google Sheets, gestão de parceiros, validação de dados e experiência de usuário moderna.

## Funcionalidades

- Cadastro e controle de serviços realizados
- Integração OAuth2 com Google Sheets (envio e leitura de dados)
- Cadastro dinâmico de parceiros e percentuais
- Cálculo automático de valores (CEMA, parceiros, despesas)
- Exportação incremental para Google Sheets (não sobrescreve dados antigos)
- Validação visual e centralizada de todos os campos obrigatórios
- Sessão expira automaticamente após 30 minutos de uso
- Interface responsiva, com labels flutuantes e campos modernos
- Avisos e alertas centralizados na tela para melhor UX
- Botão "olhinho" para mostrar/ocultar campos sensíveis
- Tabela de serviços com edição inline, campo de status e botão de remoção

## Requisitos

- Navegador moderno (Chrome, Firefox, Edge, Safari)
- Conta Google com permissão para criar projetos e usar Google Sheets API
- Servidor local para rodar o HTML (ex: Python http.server, Live Server, etc)

## Como usar

### 1. Clonar o projeto

```bash
git clone <repo-url>
cd <pasta-do-projeto>
```

### 2. Rodar localmente

No terminal, execute:

```bash
python3 -m http.server 8000
```

Acesse [http://localhost:8000](http://localhost:8000) no navegador.

### 3. Configurar Google Sheets API

1. Acesse [Google Cloud Console](https://console.cloud.google.com)
2. Crie um projeto ou selecione um existente
3. Ative a Google Sheets API
4. Vá em "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Configure como "Web application"
6. Adicione `http://localhost:8000` e `http://127.0.0.1:8000` como URIs autorizados
7. Copie o Client ID e cole no campo correspondente na tela
8. Crie uma planilha no Google Sheets e cole o ID dela no campo correspondente

### 4. Login e uso

- Clique em **Fazer Login com Google** e autorize o acesso
- O token expira automaticamente após 30 minutos (logout automático)
- O Client ID permanece preenchido após login

### 5. Cadastro de parceiros

- Adicione parceiros com nome e percentual (a soma deve ser 35%)
- O sistema valida nome e percentual antes de permitir o envio
- Não é possível enviar dados sem pelo menos um parceiro válido

### 6. Cadastro de serviços

- Preencha os campos da tabela de serviços
- O campo **Status** pode ser usado para anotações rápidas (ex: "Pendente", "Concluído")
- Remova linhas com o botão vermelho à direita

### 7. Envio para Google Sheets

- Clique em **Enviar para Google Sheets**
- Os dados são ACRESCENTADOS ao final da aba do mês selecionado (não sobrescreve)
- O cabeçalho não é duplicado
- Todos os campos obrigatórios são validados antes do envio
- Avisos de erro aparecem centralizados na tela

### 8. Experiência do usuário

- Labels flutuantes nos campos (padrão Material/Bootstrap)
- Inputs e selects com foco azul, feedback visual e validação
- Botão "olhinho" para mostrar/ocultar campos sensíveis
- Alertas de erro e sucesso centralizados na tela
- Tabela de serviços com visual moderno, zebra, hover e responsividade

## Personalização

- Para alterar o tempo de expiração do login, edite o valor em `setTimeout` na função `processarCallbackOAuth2` (padrão: 30 minutos)
- Para mudar o layout ou cores, edite o arquivo `style.css`
- Para adicionar novos campos na tabela, edite o HTML e ajuste a função de exportação no JS

## Dicas

- Sempre preencha todos os campos obrigatórios antes de enviar
- Use o campo Status para controle interno (ex: "Aguardando pagamento", "Finalizado")
- O sistema é responsivo e pode ser usado em tablets e celulares

## Suporte

Em caso de dúvidas ou problemas, entre em contato com o desenvolvedor responsável pelo sistema. # servicos
# servicos
# servicos
