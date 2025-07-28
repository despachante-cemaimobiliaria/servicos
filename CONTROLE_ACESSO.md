# Sistema de Controle de Acesso - CEMA Imobiliária

## Visão Geral

O sistema implementa um controle de acesso baseado em email que restringe funcionalidades específicas para usuários não autorizados, mantendo o layout e autenticação originais intactos. Além disso, utiliza diferentes Client IDs do Google OAuth2 baseado na autorização do email, integrado com o GitHub Actions.

## Emails Autorizados

Os seguintes emails têm acesso completo ao sistema:
- `adm@cemaimobiliaria.com.br`
- `laiza@cemaimobiliaria.com.br`
- `veroni@cemaimobiliaria.com.br`

## Sistema de Client IDs

O sistema utiliza diferentes Client IDs do Google OAuth2 baseado na autorização do email, ambos configurados via GitHub Actions:

### Client IDs Configurados:
- **Usuários Autorizados**: `CONFIG.GOOGLE_CLIENT_ID` (configurado via GitHub Secrets)
- **Usuários Não Autorizados**: `CONFIG.GOOGLE_CLIENT_ID_NAO_AUTORIZADO` (configurado via GitHub Secrets)

### Como Funciona:
1. **Email Autorizado** → Usa Client ID principal (`GOOGLE_CLIENT_ID`)
2. **Email Não Autorizado** → Usa Client ID secundário (`GOOGLE_CLIENT_ID_NAO_AUTORIZADO`)
3. **Seleção Automática** → O sistema escolhe o Client ID correto baseado no email digitado
4. **GitHub Actions** → Gera o `config.js` automaticamente com ambos os Client IDs

### Integração com GitHub Actions:
- O arquivo `config.js` é gerado automaticamente pelo GitHub Actions
- Usa dois secrets do GitHub para configurar os Client IDs
- Usuários autorizados usam o Client ID principal
- Usuários não autorizados usam o Client ID secundário

## Funcionalidades Restritas

Para usuários com emails não autorizados, as seguintes funcionalidades são desabilitadas:

### Botões Desabilitados:
- 🆕 **Criar Planilha Automática** - Desabilitado
- 📊 **Gerar Relatório** - Desabilitado
- ➕ **Adicionar Serviço** - Desabilitado
- 🗑️ **Remover Serviço** - Desabilitado

## Implementação Técnica

### Arquivos Modificados:
- `script.js` - Lógica principal do controle de acesso e seleção de Client ID
- `.github/workflows/deploy-gh-pages.yml` - Gera o config.js automaticamente

### Funções Principais:

1. **`verificarEmailAutorizado(email)`**
   - Verifica se o email está na lista de emails autorizados
   - Retorna `true` ou `false`

2. **`obterClientIdPorEmail(email)`**
   - Retorna o Client ID apropriado baseado na autorização do email
   - Usuários autorizados: `CONFIG.GOOGLE_CLIENT_ID`
   - Usuários não autorizados: `CONFIG.GOOGLE_CLIENT_ID_NAO_AUTORIZADO`

3. **`controlarAcessoPorEmail(email)`**
   - Aplica o controle de acesso baseado no email
   - Desabilita/habilita botões específicos
   - Mostra mensagens informativas sobre o Client ID usado

### Verificações de Permissão:

As seguintes funções incluem verificações de permissão:
- `criarPlanilhaAutomatica()`
- `criarCopiaPlanilhaComLimpeza()`
- `exportarRelatorioCompleto()`
- `adicionarNovoServico()`
- `removerServicoAdicionado()`

## Comportamento Visual

### Para Usuários Não Autorizados:
- Botões aparecem com opacidade reduzida (50%)
- Cursor muda para "not-allowed"
- Tooltip mostra "Acesso restrito - Apenas emails autorizados"
- Botões ficam desabilitados (não clicáveis)
- Mensagem informativa mostra qual Client ID está sendo usado

### Para Usuários Autorizados:
- Interface funciona normalmente
- Todos os botões estão habilitados
- Acesso completo a todas as funcionalidades
- Usa Client ID principal do GitHub Actions

## Como Adicionar Novos Emails Autorizados

Para adicionar novos emails à lista de autorizados, edite a constante `EMAILS_AUTORIZADOS` no arquivo `script.js`:

```javascript
const EMAILS_AUTORIZADOS = [
  'adm@cemaimobiliaria.com.br',
  'laiza@cemaimobiliaria.com.br',
  'veroni@cemaimobiliaria.com.br',
  'novo@email.com' // Adicione aqui
];
```

## Como Configurar Client IDs

### GitHub Secrets Necessários:
Configure no GitHub Secrets:
- `GOOGLE_CLIENT_ID`: Client ID para usuários autorizados
- `GOOGLE_CLIENT_ID_NAO_AUTORIZADO`: Client ID para usuários não autorizados
- `GOOGLE_SCOPE`: Escopo do Google OAuth2

### Workflow do GitHub Actions:
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

## Segurança

- O controle é aplicado tanto no frontend quanto no backend das funções
- Verificações duplas garantem que usuários não autorizados não possam executar ações restritas
- Mensagens de erro informativas explicam as restrições
- O sistema mantém a funcionalidade de visualização para todos os usuários
- Diferentes Client IDs garantem isolamento entre usuários autorizados e não autorizados
- Ambos os Client IDs são protegidos via GitHub Secrets

## Compatibilidade

- Mantém 100% de compatibilidade com o sistema existente
- Não altera a autenticação OAuth2 existente
- Preserva o layout original
- Funciona com ou sem login do Google
- Integra perfeitamente com o GitHub Actions

## Funcionamento

1. **GitHub Actions**: Gera o `config.js` com ambos os Client IDs
2. **Carregamento da Página**: O sistema verifica o email digitado e aplica o controle de acesso
3. **Digitação de Email**: Em tempo real, o controle é aplicado conforme o usuário digita
4. **Login OAuth2**: O sistema seleciona automaticamente o Client ID apropriado
5. **Login/Logout**: O controle é reaplicado após mudanças de estado de autenticação
6. **Persistência**: O email é salvo no localStorage e o controle é mantido entre sessões

## Mensagens do Sistema

- **Usuários Autorizados**: "Usando Client ID para usuários autorizados"
- **Usuários Não Autorizados**: "Usando Client ID para usuários não autorizados"
- **Login Sucesso**: "Login realizado com sucesso usando Client ID para usuários [tipo]"
- **Acesso Limitado**: "Acesso limitado para [email]. Usando Client ID: [client-id]" 