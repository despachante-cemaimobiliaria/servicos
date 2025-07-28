# Exemplo de Uso - Sistema de Controle de Acesso

## Cenários de Teste

### 1. Usuário Autorizado (Email da CEMA)

**Email**: `adm@cemaimobiliaria.com.br`

**Comportamento**:
- ✅ Todos os botões estão habilitados
- ✅ Usa Client ID principal (`CONFIG.GOOGLE_CLIENT_ID`)
- ✅ Acesso completo a todas as funcionalidades
- ✅ Mensagem: "Usando Client ID para usuários autorizados"

**Client ID Usado**: O valor de `CONFIG.GOOGLE_CLIENT_ID` (configurado via GitHub Secrets)

### 2. Usuário Não Autorizado (Outro Email)

**Email**: `teste@gmail.com`

**Comportamento**:
- ❌ Botões restritos ficam desabilitados (opacidade 50%)
- ❌ Usa Client ID secundário (`CONFIG.GOOGLE_CLIENT_ID_NAO_AUTORIZADO`)
- ❌ Acesso limitado (apenas visualização)
- ❌ Mensagem: "Acesso limitado para teste@gmail.com. Usando Client ID: [client-id-secundario]"

**Botões Desabilitados**:
- 🆕 Criar Planilha Automática
- 📊 Gerar Relatório
- ➕ Adicionar Serviço
- 🗑️ Remover Serviço

## Fluxo de Funcionamento

### 1. Carregamento da Página
```javascript
// O sistema verifica o email digitado
const email = document.getElementById("userEmail").value;
controlarAcessoPorEmail(email);
```

### 2. Digitação de Email
```javascript
// Em tempo real, o controle é aplicado
userEmailInput.addEventListener('input', function() {
  controlarAcessoPorEmail(this.value);
});
```

### 3. Login OAuth2
```javascript
// O sistema escolhe o Client ID apropriado
const clientId = obterClientIdPorEmail(userEmail);
// clientId será CONFIG.GOOGLE_CLIENT_ID ou CONFIG.GOOGLE_CLIENT_ID_NAO_AUTORIZADO
```

### 4. Verificação de Permissão
```javascript
// Todas as funções restritas verificam permissão
function adicionarNovoServico() {
  if (!verificarEmailAutorizado(userEmail)) {
    mostrarAlertaCentralizado('Acesso restrito. Apenas emails autorizados podem adicionar novos serviços.');
    return;
  }
  // ... resto da função
}
```

## Configuração no GitHub

### Secrets Necessários:
1. `GOOGLE_CLIENT_ID` - Client ID para usuários autorizados
2. `GOOGLE_CLIENT_ID_NAO_AUTORIZADO` - Client ID para usuários não autorizados
3. `GOOGLE_SCOPE` - Escopo do Google OAuth2

### Workflow do GitHub Actions:
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

## Mensagens do Sistema

### Durante o Login:
- **Autorizado**: "Usando Client ID para usuários autorizados. Email: adm@cemaimobiliaria.com.br"
- **Não Autorizado**: "Usando Client ID para usuários não autorizados. Email: teste@gmail.com"

### Após Login Bem-sucedido:
- **Autorizado**: "Login realizado com sucesso usando Client ID para usuários autorizado"
- **Não Autorizado**: "Login realizado com sucesso usando Client ID para usuários não autorizado"

### Acesso Limitado:
- **Não Autorizado**: "Acesso limitado para [email]. Usando Client ID: [client-id-secundario]"

## Vantagens da Implementação

1. **Segurança**: Ambos os Client IDs são protegidos via GitHub Secrets
2. **Flexibilidade**: Fácil de configurar novos emails autorizados
3. **Transparência**: Usuário sabe qual Client ID está sendo usado
4. **Integração**: Funciona perfeitamente com GitHub Actions
5. **Compatibilidade**: Mantém 100% da funcionalidade existente
6. **Isolamento**: Usuários autorizados e não autorizados usam Client IDs diferentes

## Troubleshooting

### Problema: Client ID não está sendo aplicado
**Solução**: Verifique se o `config.js` está sendo carregado corretamente e se ambos os secrets estão configurados

### Problema: Botões não ficam desabilitados
**Solução**: Verifique se o email está na lista `EMAILS_AUTORIZADOS`

### Problema: GitHub Actions não gera config.js
**Solução**: Verifique se os secrets `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_ID_NAO_AUTORIZADO` estão configurados corretamente no GitHub

### Problema: Erro de Client ID não encontrado
**Solução**: Verifique se o secret `GOOGLE_CLIENT_ID_NAO_AUTORIZADO` foi adicionado ao GitHub Secrets 