
# CEMA Imobiliária - Sistema de Controle Financeiro de Serviços

Sistema web para controle financeiro dos serviços da CEMA Imobiliária, com integração ao Google Sheets, gestão de parceiros e controle de acesso por email.

## 📋 Índice

- [Funcionalidades](#funcionalidades)
- [Sistema de Controle de Acesso](#sistema-de-controle-de-acesso)
- [Configuração e Instalação](#configuração-e-instalação)
- [Como Usar](#como-usar)
- [Cenários de Uso](#cenários-de-uso)
- [Troubleshooting](#troubleshooting)
- [Personalização](#personalização)

## 🚀 Funcionalidades

### Funcionalidades Gerais
- ✅ Cadastro e controle de serviços realizados
- ✅ Integração OAuth2 com Google Sheets (envio e leitura de dados)
- ✅ Cadastro dinâmico de parceiros e percentuais
- ✅ Cálculo automático de valores (CEMA, parceiros, despesas)
- ✅ Exportação incremental para Google Sheets (não sobrescreve dados antigos)
- ✅ Criação automática de cópias de planilhas com limpeza seletiva
- ✅ Validação visual e centralizada de todos os campos obrigatórios
- ✅ Sessão expira automaticamente após 30 minutos de uso
- ✅ Interface responsiva, com labels flutuantes e campos modernos
- ✅ Avisos e alertas centralizados na tela para melhor UX
- ✅ Botão "olhinho" para mostrar/ocultar campos sensíveis
- ✅ Tabela de serviços com edição inline, campo de status e botão de remoção

### Funcionalidades de Controle de Acesso
- 🔐 Controle de acesso baseado em email
- 🔐 Diferentes Client IDs do Google OAuth2 para usuários autorizados/não autorizados
- 🔐 Restrições de funcionalidades para usuários não autorizados
- 🔐 Integração automática com GitHub Actions
- 🔐 Proteção via GitHub Secrets

## 🔐 Sistema de Controle de Acesso

### Emails Autorizados

Os seguintes emails têm acesso completo ao sistema:
- `adm@cemaimobiliaria.com.br`
- `laiza@cemaimobiliaria.com.br`
- `veroni@cemaimobiliaria.com.br`

### Funcionalidades Restritas
Para usuários com emails não autorizados, as seguintes funcionalidades são desabilitadas:

#### Botões Desabilitados:
- 🆕 **Criar Planilha Automática** - Desabilitado
- 📊 **Gerar Relatório** - Desabilitado
- ➕ **Adicionar Serviço** - Desabilitado
- 🗑️ **Remover Serviço** - Desabilitado
- 🔗 **Google Cloud Console** - Link desabilitado

#### Comportamento Visual:
- Botões aparecem com opacidade reduzida (50%)
- Cursor muda para "not-allowed"
- Tooltip mostra "Acesso restrito - Apenas emails autorizados"
- Seção "Para Desenvolvedores" fica oculta

### Sistema de Client IDs
O sistema utiliza diferentes Client IDs do Google OAuth2 baseado na autorização do email:

#### Client IDs Configurados:
- **Usuários Autorizados**: `CONFIG.GOOGLE_CLIENT_ID` (configurado via GitHub Secrets)
- **Usuários Não Autorizados**: `CONFIG.GOOGLE_CLIENT_ID_NAO_AUTORIZADO` (configurado via GitHub Secrets)

#### Como Funciona:
1. **Email Autorizado** → Usa Client ID principal (`GOOGLE_CLIENT_ID`)
2. **Email Não Autorizado** → Usa Client ID secundário (`GOOGLE_CLIENT_ID_NAO_AUTORIZADO`)
3. **Seleção Automática** → O sistema escolhe o Client ID correto baseado no email digitado
4. **GitHub Actions** → Gera o `config.js` automaticamente com ambos os Client IDs

## ⚙️ Configuração e Instalação

### Requisitos
- Navegador moderno (Chrome, Firefox, Edge, Safari)
- Conta Google com permissão para criar projetos e usar Google Sheets API
- Servidor local para rodar o HTML (ex: Python http.server, Live Server, etc)

### 1. Clonar o Projeto
```bash
git clone <repo-url>
cd <pasta-do-projeto>
```

### 2. Rodar Localmente
No terminal, execute:
```bash
python3 -m http.server 8000
```
Acesse [http://localhost:8000](http://localhost:8000) no navegador.

### 3. Configurar Google Cloud Console

#### Para Desenvolvimento Local:
1. Acesse [Google Cloud Console](https://console.cloud.google.com)
2. Crie um projeto ou selecione um existente
3. Ative as APIs:
   - **Google Sheets API**
   - **Google Drive API**
4. Vá em "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Configure como "Web application"
6. Adicione `http://localhost:8000` e `http://127.0.0.1:8000` como URIs autorizados
7. Copie o Client ID e cole no campo correspondente na tela
8. Crie uma planilha no Google Sheets e cole o ID dela no campo correspondente

#### Para Produção (GitHub Actions):
Configure no GitHub Secrets:
- `GOOGLE_CLIENT_ID`: Client ID para usuários autorizados
- `GOOGLE_CLIENT_ID_NAO_AUTORIZADO`: Client ID para usuários não autorizados
- `GOOGLE_SCOPE`: `https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive`

### 4. Configuração do GitHub Actions
O arquivo `.github/workflows/deploy-gh-pages.yml` gera automaticamente o `config.js`:

```yaml
- name: Gerar config.js com secrets
  run: |
    cat > public/config.js << 'EOF'
    window.CONFIG = {
      GOOGLE_CLIENT_ID: '${{ secrets.GOOGLE_CLIENT_ID }}',
      GOOGLE_CLIENT_ID_NAO_AUTORIZADO: '${{ secrets.GOOGLE_CLIENT_ID_NAO_AUTORIZADO }}',
      GOOGLE_REDIRECT_URI: 'https://despachante.cemaimobiliaria.com.br/',
      GOOGLE_SCOPE: '${{ secrets.GOOGLE_SCOPE }}'
    };
    EOF
```

## 📖 Como Usar

### 1. Login e Autenticação
- Digite seu email no campo "Email Gmail"
- Clique em **Fazer Login com Google** e autorize o acesso
- O sistema automaticamente seleciona o Client ID apropriado baseado no seu email
- O token expira automaticamente após 30 minutos (logout automático)

### 2. Cadastro de Parceiros
- Adicione parceiros com nome e percentual (a soma deve ser 35%)
- O sistema valida nome e percentual antes de permitir o envio
- Não é possível enviar dados sem pelo menos um parceiro válido

### 3. Cadastro de Serviços
- Preencha os campos da tabela de serviços
- O campo **Status** pode ser usado para anotações rápidas (ex: "Pendente", "Concluído")
- Remova linhas com o botão vermelho à direita

### 4. Envio para Google Sheets
- Clique em **Enviar para Google Sheets**
- Os dados são ACRESCENTADOS ao final da aba do mês selecionado (não sobrescreve)
- O cabeçalho não é duplicado
- Todos os campos obrigatórios são validados antes do envio

### 5. Criação de Planilhas Automáticas
- Clique em **Criar Planilha Automática**
- O sistema copia EXATAMENTE a planilha modelo com todas as fórmulas e formatação
- Limpa automaticamente as linhas a partir da linha 5 nas abas de janeiro a dezembro
- Mantém cabeçalhos, fórmulas, cores e estrutura das primeiras 4 linhas

## 🎯 Cenários de Uso

### Cenário 1: Usuário Autorizado (Email da CEMA)
**Email**: `adm@cemaimobiliaria.com.br`

**Comportamento**:
- ✅ Todos os botões estão habilitados
- ✅ Usa Client ID principal (`CONFIG.GOOGLE_CLIENT_ID`)
- ✅ Acesso completo a todas as funcionalidades
- ✅ Mensagem: "Usando Client ID para usuários autorizados"

### Cenário 2: Usuário Não Autorizado (Outro Email)
**Email**: `teste@gmail.com`

**Comportamento**:
- ❌ Botões restritos ficam desabilitados (opacidade 50%)
- ❌ Usa Client ID secundário (`CONFIG.GOOGLE_CLIENT_ID_NAO_AUTORIZADO`)
- ❌ Acesso limitado (apenas visualização)
- ❌ Link do Google Cloud Console fica desabilitado
- ❌ Seção "Para Desenvolvedores" fica oculta

## 🔧 Troubleshooting

### Problema: Client ID não está sendo aplicado
**Solução**: Verifique se o `config.js` está sendo carregado corretamente e se ambos os secrets estão configurados

### Problema: Botões não ficam desabilitados
**Solução**: Verifique se o email está na lista `EMAILS_AUTORIZADOS` no arquivo `script.js`

### Problema: GitHub Actions não gera config.js
**Solução**: Verifique se os secrets `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_ID_NAO_AUTORIZADO` estão configurados corretamente no GitHub

### Problema: Erro "Google Drive API has not been used"
**Solução**: Ative a Google Drive API no Google Cloud Console do seu projeto

### Problema: Erro de autenticação OAuth2
**Solução**: Verifique se os URIs autorizados estão configurados corretamente no Google Cloud Console

## 🎨 Personalização

### Adicionar Novos Emails Autorizados
Edite a constante `EMAILS_AUTORIZADOS` no arquivo `script.js`:

```javascript
const EMAILS_AUTORIZADOS = [
  'adm@cemaimobiliaria.com.br',
  'laiza@cemaimobiliaria.com.br',
  'veroni@cemaimobiliaria.com.br',
  'novo@email.com' // Adicione aqui
];
```

### Alterar Tempo de Expiração
Para alterar o tempo de expiração do login, edite o valor em `setTimeout` na função `processarCallbackOAuth2` (padrão: 30 minutos)

### Personalizar Layout
- Para mudar o layout ou cores, edite o arquivo `style.css`
- Para adicionar novos campos na tabela, edite o HTML e ajuste a função de exportação no JS

## 📝 Mensagens do Sistema

### Durante o Login:
- **Autorizado**: "Usando Client ID para usuários autorizados. Email: [email]"
- **Não Autorizado**: "Usando Client ID para usuários não autorizados. Email: [email]"

### Após Login Bem-sucedido:
- **Autorizado**: "Login realizado com sucesso usando Client ID para usuários autorizado"
- **Não Autorizado**: "Login realizado com sucesso usando Client ID para usuários não autorizado"

### Acesso Limitado:
- **Não Autorizado**: "Acesso limitado para [email]. Usando Client ID: [client-id-secundario]"

## 🔒 Segurança

- O controle é aplicado tanto no frontend quanto no backend das funções
- Verificações duplas garantem que usuários não autorizados não possam executar ações restritas
- Mensagens de erro informativas explicam as restrições
- O sistema mantém a funcionalidade de visualização para todos os usuários
- Diferentes Client IDs garantem isolamento entre usuários autorizados e não autorizados
- Ambos os Client IDs são protegidos via GitHub Secrets

## 📱 Experiência do Usuário

- Labels flutuantes nos campos (padrão Material/Bootstrap)
- Inputs e selects com foco azul, feedback visual e validação
- Botão "olhinho" para mostrar/ocultar campos sensíveis
- Alertas de erro e sucesso centralizados na tela
- Tabela de serviços com visual moderno, zebra, hover e responsividade
- Sistema responsivo que funciona em tablets e celulares

## 🆘 Suporte

Em caso de dúvidas ou problemas, entre em contato com o desenvolvedor responsável pelo sistema.

---

**Desenvolvido para CEMA Imobiliária** 🏢
