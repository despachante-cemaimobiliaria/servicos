// Boas práticas: Encapsulamento, comentários e organização modular
// Este script manipula a tabela de serviços, integra com Google Sheets e atualiza o resumo financeiro.
(function() {
  // Array para armazenar os parceiros
  let parceiros = [];
  
  // Configurações OAuth2
  let accessToken = null;
  let userProfile = null;
  
  // Configuração do Google OAuth2
  const GOOGLE_OAUTH_CONFIG = {
    clientId: CONFIG.GOOGLE_CLIENT_ID,
    scope: CONFIG.GOOGLE_SCOPE,
    redirectUri: CONFIG.GOOGLE_REDIRECT_URI
  };
  
  const servicosValores = {
    "Registro com financiamento": 800.0,
    "Registro à vista": 500.0,
    Averbação: 300.0,
    "Guia de Laudêmio do SPU": 100.0,
    "Laudêmio da prefeitura": 700.0,
    "Laudêmio das famílias": 700.0,
    "Laudêmio do São Bento": 700.0,
    "Laudêmio da Igreja da Glória": 700.0,
    "Laudêmio da Mitra": 700.0,
    "Emissão de guia de ITBI": 100.0,
    "Emissão de certidão por nome": 100.0,
    "Transferência de conta": 100.0,
  };

  // Função para mostrar alertas de sucesso personalizados
  function mostrarAlertaSucesso(titulo, mensagem, detalhes = "") {
    const alertaCompleto = `🎉 ${titulo}\n\n${mensagem}${detalhes ? '\n\n' + detalhes : ''}\n\n✅ Operação realizada com êxito!`;
    mostrarAlertaCentralizado(alertaCompleto);
  }

  // Função para mostrar status com alerta de sucesso
  function mostrarStatus(mensagem, tipo = "info") {
    // Só mostrar alerta centralizado para erros de interação do usuário
    if (tipo === "error") {
      mostrarAlertaCentralizado(mensagem);
      return;
    }

    // Adicionar alerta de sucesso para operações importantes
    if (tipo === "success") {
      // Mostrar alerta nativo do navegador
      setTimeout(() => {
        mostrarAlertaCentralizado(`✅ Sucesso!\n\n${mensagem}`);
      }, 1000);
    }

  }

  // Funções OAuth2
  function iniciarLoginGmail() {
    const userEmail = document.getElementById("userEmail").value.trim();
    const spreadsheetId = document.getElementById("spreadsheetId").value.trim();
    
    if (!userEmail) {
      mostrarStatus("Por favor, insira seu e-mail Gmail", "error");
      return;
    }
    
    if (!spreadsheetId) {
      mostrarStatus("Por favor, insira o ID da planilha", "error");
      return;
    }
    
    // Validar formato do e-mail
    const emailRegex = /^[^\s@]+@gmail\.com$/;
    if (!emailRegex.test(userEmail)) {
      mostrarStatus("Por favor, insira um e-mail Gmail válido", "error");
      return;
    }
    
    const state = Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('oauth_state', state);
    sessionStorage.setItem('user_email', userEmail);
    
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_OAUTH_CONFIG.clientId);
    authUrl.searchParams.set('redirect_uri', GOOGLE_OAUTH_CONFIG.redirectUri);
    authUrl.searchParams.set('scope', GOOGLE_OAUTH_CONFIG.scope);
    authUrl.searchParams.set('response_type', 'token');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('login_hint', userEmail);
    
    // Redirecionar na mesma janela (mais confiável que popup)
    window.location.href = authUrl.toString();
  }

  function processarCallbackOAuth2() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    
    const accessTokenParam = params.get('access_token');
    const stateParam = params.get('state');
    const errorParam = params.get('error');
    
    const savedState = sessionStorage.getItem('oauth_state');
    
    if (errorParam) {
      let errorMessage = `Erro na autenticação: ${errorParam}`;
      
      // Mensagens específicas para erros comuns
      if (errorParam === 'access_denied') {
        errorMessage = `Acesso negado. Verifique se:\n\n1. O e-mail está correto\n2. A credencial OAuth2 permite este e-mail\n3. Você autorizou o acesso na janela do Google`;
      } else if (errorParam === 'invalid_client') {
        errorMessage = `Erro de configuração OAuth2!\n\nO Client ID não está configurado corretamente.\n\nPara resolver:\n1. Acesse https://console.cloud.google.com\n2. Crie um projeto e ative a Google Sheets API\n3. Crie credenciais OAuth2 (Web application)\n4. Substitua o Client ID no arquivo script.js\n5. Adicione os URIs autorizados: ${window.location.origin}`;
      } else if (errorParam === 'unauthorized_client') {
        errorMessage = `Cliente não autorizado. O e-mail não tem permissão para usar esta aplicação.`;
      }
      
      mostrarStatus(errorMessage, "error");
      return;
    }
    
    if (stateParam !== savedState) {
      mostrarStatus("Erro de segurança na autenticação", "error");
      return;
    }
    
    if (accessTokenParam) {
      accessToken = accessTokenParam;
      sessionStorage.setItem('oauth_access_token', accessToken);
      sessionStorage.removeItem('oauth_state');
      
      // Limpar hash da URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Obter informações do usuário
      obterPerfilUsuario();
      
      const userEmail = sessionStorage.getItem('user_email');
      // Remover mensagem de sucesso do login
      // Iniciar temporizador de expiração do token (30 minutos)
      if (window._oauthExpireTimeout) clearTimeout(window._oauthExpireTimeout);
      window._oauthExpireTimeout = setTimeout(() => {
        fazerLogout();
        mostrarStatus("Sessão expirada. Faça login novamente.", "error");
      }, 30 * 60 * 1000); // 30 minutos
    }
  }

  async function obterPerfilUsuario() {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (response.ok) {
        userProfile = await response.json();
        
        // Verificar se o e-mail logado corresponde ao e-mail inserido
        const userEmailInput = document.getElementById("userEmail");
        const expectedEmail = sessionStorage.getItem('user_email');
        
        if (userProfile.email && expectedEmail && userProfile.email.toLowerCase() !== expectedEmail.toLowerCase()) {
          mostrarStatus(`E-mail logado (${userProfile.email}) não corresponde ao e-mail inserido (${expectedEmail})`, "error");
          fazerLogout();
          return;
        }
        
        atualizarInterfaceUsuario();
        
        // Atualizar display do e-mail
        const userEmailDisplay = document.getElementById("userEmailDisplay");
        if (userEmailDisplay) {
          userEmailDisplay.textContent = userProfile.email || "";
        }
        
        salvarConfiguracoes();
      } else {        
        const userEmail = sessionStorage.getItem('user_email');
        if (userEmail) {
          userProfile = { email: userEmail, name: 'Usuário' };
          
          // Salvar e-mail no localStorage para persistir
          localStorage.setItem("cema_user_email", userEmail);
          
          // Atualizar campo de e-mail na interface
          const emailInput = document.getElementById("userEmail");
          if (emailInput) {
            emailInput.value = userEmail;
          }
          
          atualizarInterfaceUsuario();
          
          // Atualizar display do e-mail
          const userEmailDisplay = document.getElementById("userEmailDisplay");
          if (userEmailDisplay) {
            userEmailDisplay.textContent = userEmail;
          }
          
          salvarConfiguracoes();
        } else {
          fazerLogout();
        }
      }
    } catch (error) {
      console.error('Erro ao obter perfil do usuário:', error);
      // Erro de conexão - usar e-mail do sessionStorage como fallback
      const userEmail = sessionStorage.getItem('user_email');
      if (userEmail) {
        userProfile = { email: userEmail, name: 'Usuário' };
        
        // Salvar e-mail no localStorage para persistir
        localStorage.setItem("cema_user_email", userEmail);
        
        // Atualizar campo de e-mail na interface
        const emailInput = document.getElementById("userEmail");
        if (emailInput) {
          emailInput.value = userEmail;
        }
        
        atualizarInterfaceUsuario();
        
        // Atualizar display do e-mail
        const userEmailDisplay = document.getElementById("userEmailDisplay");
        if (userEmailDisplay) {
          userEmailDisplay.textContent = userEmail;
        }
        
        salvarConfiguracoes();
      } else {
        fazerLogout();
      }
    }
  }

  function atualizarInterfaceUsuario() {
    const loginButton = document.getElementById("loginButton");
    const logoutButton = document.getElementById("logoutButton");
    const userInfo = document.getElementById("userInfo");
    const userName = document.getElementById("userName");
    const userEmail = document.getElementById("userEmail");
    
    if (accessToken && userProfile) {
      loginButton.style.display = "none";
      if (logoutButton) logoutButton.style.display = "inline-block";
      if (userInfo) userInfo.style.display = "block";
      
      if (userName) userName.textContent = userProfile.name || "Usuário";
      if (userEmail) userEmail.textContent = userProfile.email || "";
      
      // Manter o campo de e-mail como password quando logado
      const emailInput = document.getElementById("userEmail");
      if (emailInput) {
        emailInput.disabled = true;
        emailInput.style.backgroundColor = "#f8f9fa";
        // Garantir que o tipo seja password
        if (emailInput.type !== 'password') {
          emailInput.type = 'password';
        }
      }
    } else {
      loginButton.style.display = "inline-block";
      if (logoutButton) logoutButton.style.display = "none";
      if (userInfo) userInfo.style.display = "none";
      
      // Habilitar o campo de e-mail quando não logado
      const emailInput = document.getElementById("userEmail");
      if (emailInput) {
        emailInput.disabled = false;
        emailInput.style.backgroundColor = "white";
        // Garantir que o tipo seja password
        if (emailInput.type !== 'password') {
          emailInput.type = 'password';
        }
      }
    }
  }

  function fazerLogout() {
    accessToken = null;
    userProfile = null;
    sessionStorage.removeItem('oauth_access_token');
    sessionStorage.removeItem('user_email');
    
    // NÃO limpar o campo de e-mail - manter o e-mail digitado pelo usuário
    const emailInput = document.getElementById("userEmail");
    if (emailInput) {
      emailInput.disabled = false;
      emailInput.style.backgroundColor = "white";
    }
    
    atualizarInterfaceUsuario();
  }

  function verificarTokenSalvo() {
    const savedToken = sessionStorage.getItem('oauth_access_token');
    if (savedToken) {
      accessToken = savedToken;
      obterPerfilUsuario();
    } else {
    }
  }

  // Funções para gerenciar parceiros
  function mostrarAlertaParceiro(msg) {
    mostrarAlertaCentralizado(msg);
  }

  // Atualizar função adicionarParceiro para mostrar alerta se inválido
  function adicionarParceiro() {
    const btnAdd = document.getElementById("btnAddPartner");
    
    const nome = document.getElementById("partnerName").value.trim();
    const percentual = parseFloat(document.getElementById("partnerPercentage").value);
    

    // Verificar se apenas um dos campos está preenchido
    if (nome && (isNaN(percentual) || percentual === "")) {
      mostrarAlertaParceiro("Por favor, preencha também o percentual do parceiro");
      return;
    }

    if (!nome && !isNaN(percentual) && percentual > 0) {
      mostrarAlertaParceiro("Por favor, preencha também o nome do parceiro");
      return;
    }

    // Verificar se ambos os campos estão vazios
    if (!nome && (isNaN(percentual) || percentual === "")) {
      mostrarAlertaParceiro("Por favor, preencha o nome e o percentual do parceiro");
      return;
    }

    // Verificar se o nome está vazio (caso específico)
    if (!nome) {
      mostrarAlertaParceiro("Por favor, insira o nome do parceiro");
      return;
    }

    // Verificar se o percentual é inválido
    if (isNaN(percentual) || percentual <= 0 || percentual > 100) {
      mostrarAlertaParceiro("Por favor, insira um percentual válido (0-100)");
      return;
    }

    // Verificar se o nome já existe
    if (parceiros.some(p => p.nome.toLowerCase() === nome.toLowerCase())) {
      mostrarAlertaParceiro("Já existe um parceiro com este nome");
      return;
    }

    // Calcular percentual total atual
    const percentualTotal = parceiros.reduce((total, p) => total + p.percentual, 0) + percentual;

    // Adicionar parceiro
    parceiros.push({ nome, percentual });
    
    // Limpar campos
    document.getElementById("partnerName").value = "";
    document.getElementById("partnerPercentage").value = "";
    
    // Atualizar interface
    atualizarInterfaceParceiros();
    calcularValores();
    salvarParceiros();
    
    // Remover mensagem de sucesso da adição de parceiro
  }

  function removerParceiro(nome) {
    parceiros = parceiros.filter(p => p.nome !== nome);
    atualizarInterfaceParceiros();
    calcularValores();
    salvarParceiros();
    mostrarStatus(`Parceiro "${nome}" removido!`, "success");
  }

  function atualizarInterfaceParceiros() {
    const partnersList = document.getElementById("partnersList");
    
    if (!partnersList) {
      console.error("Elemento partnersList não encontrado!");
      return;
    }
    
    partnersList.innerHTML = "";

    parceiros.forEach(parceiro => {
      const partnerItem = document.createElement("div");
      partnerItem.className = "partner-item";
      partnerItem.innerHTML = `
        <span class="partner-name">${parceiro.nome}</span>
        <span class="partner-percentage">${parceiro.percentual}%</span>
        <button class="remove-partner" onclick="removerParceiro('${parceiro.nome}')">×</button>
      `;
      partnersList.appendChild(partnerItem);
    });
  }

  function salvarParceiros() {
    localStorage.setItem("cema_parceiros", JSON.stringify(parceiros));
  }

  function carregarParceiros() {
    const parceirosSalvos = localStorage.getItem("cema_parceiros");
    
    if (parceirosSalvos) {
      parceiros = JSON.parse(parceirosSalvos);
      atualizarInterfaceParceiros();
    }
  }

  function adicionarLinha() {
    const tbody = document.getElementById("corpoTabela");
    
    if (!tbody) {
      return;
    }
    
    const novaLinha = document.createElement("tr");

    novaLinha.innerHTML = `
                <td><input type="date" onchange="calcularValores()"></td>
                <td><input type="text" placeholder="Nome do comprador" onchange="calcularValores()"></td>
                <td><input type="tel" placeholder="(00) 00000-0000" onchange="calcularValores()"></td>
                <td><input type="text" placeholder="Nome do vendedor" onchange="calcularValores()"></td>
                <td><input type="tel" placeholder="(00) 00000-0000" onchange="calcularValores()"></td>
                <td><input type="text" placeholder="Endereço completo" onchange="calcularValores()"></td>
                <td>
                    <select onchange="atualizarValor(this); calcularValores()">
                        <option value="">Selecione o serviço</option>
                    </select>
                </td>
                <td><input type="date" onchange="calcularValores()"></td>
                <td><input type="text" placeholder="RGI" onchange="calcularValores()"></td>
                <td><input type="text" placeholder="Número do protocolo" onchange="calcularValores()"></td>
                <td><input type="number" step="0.01" class="valor-field" placeholder="0,00" onchange="calcularValores()"></td>
                <td><input type="number" step="0.01" class="valor-field" placeholder="0,00" onchange="calcularValores()"></td>
                <td class="valor-field" style="background-color: #e8f5e8;">R$ 0,00</td>
                <td class="valor-field" style="background-color: #f0f8ff;">R$ 0,00</td>
                <td><input type="text" class="status-input" placeholder="Status"></td>
                <td class="acao"><button class="btn-remove" onclick="removerLinha(this)">Remover</button></td>
            `;

    tbody.appendChild(novaLinha);
    
    // Atualizar os selects para incluir todos os serviços (padrão + personalizados)
    atualizarSelectsServicos();
  }

  function atualizarValor(selectElement) {
    const linha = selectElement.closest("tr");
    const inputValor = linha.querySelector('input[type="number"]');
    const servicoSelecionado = selectElement.value;

    if (servicoSelecionado && servicosValores[servicoSelecionado]) {
      inputValor.value = servicosValores[servicoSelecionado].toFixed(2);
    }
  }

  function removerLinha(botao) {
    const linha = botao.closest("tr");
    linha.remove();
    calcularValores();
  }

  function calcularValores() {
    const linhas = document.querySelectorAll("#corpoTabela tr");
    let totalFaturado = 0;
    let totalDespesas = 0;

    if (linhas.length === 0) {
      return;
    }

    linhas.forEach((linha) => {
      const inputValor = linha.querySelector('input[type="number"]');
      const inputDespesas = linha.querySelectorAll('input[type="number"]')[1];
      
      if (!inputValor || !inputDespesas) {
        return;
      }
      
      const valorCobrado = parseFloat(inputValor.value) || 0;
      const despesas = parseFloat(inputDespesas.value) || 0;

      totalFaturado += valorCobrado;
      totalDespesas += despesas;

      // Cálculo dos percentuais
      const valorCema = valorCobrado * 0.65 - despesas;
      const valorParceiros = valorCobrado * 0.35 + despesas;

      // Atualizar as células de valores calculados
      const valorFields = linha.querySelectorAll(".valor-field");
      if (valorFields.length >= 4) {
        valorFields[2].textContent = `R$ ${valorCema.toFixed(2)}`;
        valorFields[3].textContent = `R$ ${valorParceiros.toFixed(2)}`;
      }
    });

    // Atualizar resumo apenas se os elementos existirem
    const totalLiquido = totalFaturado - totalDespesas;
    const cemaBruto = totalFaturado * 0.65;
    const cemaLiquido = cemaBruto - totalDespesas;
    const parceirosBase = totalFaturado * 0.35;
    const parceirosTotal = parceirosBase + totalDespesas;

    const totalFaturadoElement = document.getElementById("totalFaturado");
    const totalDespesasElement = document.getElementById("totalDespesas");
    const totalLiquidoElement = document.getElementById("totalLiquido");
    const cemaBrutoElement = document.getElementById("cemaBruto");
    const cemaDespesasElement = document.getElementById("cemaDespesas");
    const cemaLiquidoElement = document.getElementById("cemaLiquido");

    if (totalFaturadoElement) totalFaturadoElement.textContent = `R$ ${totalFaturado.toFixed(2)}`;
    if (totalDespesasElement) totalDespesasElement.textContent = `R$ ${totalDespesas.toFixed(2)}`;
    if (totalLiquidoElement) totalLiquidoElement.textContent = `R$ ${totalLiquido.toFixed(2)}`;
    if (cemaBrutoElement) cemaBrutoElement.textContent = `R$ ${cemaBruto.toFixed(2)}`;
    if (cemaDespesasElement) cemaDespesasElement.textContent = `R$ ${totalDespesas.toFixed(2)}`;
    if (cemaLiquidoElement) cemaLiquidoElement.textContent = `R$ ${cemaLiquido.toFixed(2)}`;

    // Atualizar resumo dos parceiros
    atualizarResumoParceiros(totalFaturado, totalDespesas);
  }

  function atualizarResumoParceiros(totalFaturado, totalDespesas) {
    const partnersSummary = document.getElementById("partnersSummary");
    
    if (!partnersSummary) {
      console.error("Elemento partnersSummary não encontrado!");
      return;
    }
    
    partnersSummary.innerHTML = "";

    if (parceiros.length === 0) {
      partnersSummary.innerHTML = `
        <div class="partner-summary-item">
          <span class="partner-summary-name">Sem parceiros cadastrados</span>
          <span class="partner-summary-value">R$ 0,00</span>
        </div>
      `;
      return;
    }

    // Calcular valores por parceiro
    const valorBaseParceiros = totalFaturado * 0.35;
    const despesasPorParceiro = totalDespesas / parceiros.length;

    parceiros.forEach(parceiro => {
      const valorBase = valorBaseParceiros * (parceiro.percentual / 35);
      const valorTotal = valorBase + despesasPorParceiro;

      const partnerItem = document.createElement("div");
      partnerItem.className = "partner-summary-item";
      partnerItem.innerHTML = `
        <span class="partner-summary-name">${parceiro.nome} (${parceiro.percentual}%)</span>
        <span class="partner-summary-value">R$ ${valorTotal.toFixed(2)}</span>
      `;
      partnersSummary.appendChild(partnerItem);
    });

    // Adicionar total dos parceiros
    const totalParceiros = valorBaseParceiros + totalDespesas;
    const totalItem = document.createElement("div");
    totalItem.className = "partner-summary-item";
    totalItem.style.borderTop = "2px solid #27ae60";
    totalItem.style.marginTop = "10px";
    totalItem.style.paddingTop = "10px";
    totalItem.innerHTML = `
      <span class="partner-summary-name"><strong>Total Parceiros</strong></span>
      <span class="partner-summary-value"><strong>R$ ${totalParceiros.toFixed(2)}</strong></span>
    `;
    partnersSummary.appendChild(totalItem);
  }

  async function enviarParaGoogleSheets() {
    // Verificar se o token foi carregado corretamente
    if (!accessToken) {
      const savedToken = sessionStorage.getItem('oauth_access_token');
      if (savedToken) {
        accessToken = savedToken;
      }
    }
    
    const spreadsheetId = document.getElementById("spreadsheetId").value;
    const mesAno = document.getElementById("mes").selectedOptions[0].text;
    const userEmail = document.getElementById("userEmail").value.trim();
    
    if (!accessToken) {
      mostrarAlertaCentralizado("Por favor, faça login com Gmail primeiro");
      return;
    }
    if (!spreadsheetId) {
      mostrarStatus("Por favor, configure o ID da planilha", "error");
      return;
    }
    if (!userEmail) {
      mostrarAlertaCentralizado("Por favor, preencha o e-mail Gmail antes de enviar.");
      return;
    }
    if (!parceiros || parceiros.length === 0) {
      mostrarAlertaCentralizado("Por favor, adicione pelo menos um parceiro antes de enviar.");
      return;
    }
    // Validação dos campos de parceiros
    for (const parceiro of parceiros) {
      if (!parceiro.nome || parceiro.nome.trim() === "" || parceiro.percentual === undefined || parceiro.percentual === null || parceiro.percentual === "" || isNaN(parceiro.percentual) || parceiro.percentual <= 0) {
        mostrarAlertaCentralizado("Preencha corretamente o nome e o percentual de todos os parceiros antes de enviar.");
        return;
      }
    }
    mostrarStatus("Enviando dados para Google Sheets...", "info");

    try {
      // Preparar os dados
      const dados = [];

      // Cabeçalho
      dados.push([
        "Data",
        "Cliente Comprador",
        "Tel. Comprador",
        "Cliente Vendedor",
        "Tel. Vendedor",
        "Endereço Imóvel",
        "Tipo de Serviço",
        "Previsão de Conclusão",
        "RGI",
        "Protocolo",
        "Valor Cobrado",
        "Despesas",
        "CEMA (65%)",
        "Parceiros (35%)",
        "Status",
        "Parceiros Configurados"
      ]);

      // Dados das linhas
      const linhas = document.querySelectorAll("#corpoTabela tr");
      linhas.forEach((linha) => {
        const inputs = linha.querySelectorAll("input, select");
        const valorCobrado = parseFloat(inputs[10].value) || 0;
        const despesas = parseFloat(inputs[11].value) || 0;
        const statusInput = linha.querySelector('.status-input');
        const status = statusInput ? statusInput.value : "";

        if (valorCobrado > 0) {
          const valorCema = valorCobrado * 0.65 - despesas;
          const valorParceiros = valorCobrado * 0.35 + despesas;

          dados.push([
            inputs[0].value, // Data
            inputs[1].value, // Comprador
            inputs[2].value, // Tel Comprador
            inputs[3].value, // Vendedor
            inputs[4].value, // Tel Vendedor
            inputs[5].value, // Endereço
            inputs[6].value, // Serviço
            inputs[7].value, // Previsão de Conclusão
            inputs[8].value, // RGI
            inputs[9].value, // Protocolo
            valorCobrado,
            despesas,
            valorCema,
            valorParceiros,
            status,
            parceiros.map(p => `${p.nome} (${p.percentual}%)`).join(", ") || "Nenhum"
          ]);
        }
      });

      // Criar ou atualizar a aba
      const sheetName = mesAno.replace(" ", "_");

      // Primeiro, tentar criar a aba
      try {
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              requests: [
                {
                  addSheet: {
                    properties: {
                      title: sheetName,
                    },
                  },
                },
              ],
            }),
          },
        );
      } catch (error) {
        // Aba já existe, continuar
      }

      // Enviar dados para a aba usando append (NÃO sobrescrever)
      // Não envie o cabeçalho, só os dados das linhas
      if (dados.length > 1) {
        const appendResponse = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A5:append?valueInputOption=RAW`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              values: dados.slice(1), // só os dados, sem o cabeçalho
            }),
          }
        );

        if (appendResponse.ok) {
          mostrarStatus("Dados adicionados com sucesso ao Google Sheets!", "success");
      } else {
          const error = await appendResponse.json();
          mostrarStatus(`Erro ao adicionar dados: ${error.error.message}`, "error");
        }
      } else {
        mostrarAlertaCentralizado("Nenhum dado para enviar.");
      }
    } catch (error) {
      mostrarStatus(
        `Erro ao conectar com Google Sheets: ${error.message}`,
        "error",
      );
    }
  }

  async function carregarDadosGoogleSheets() {
    // Verificar se o token foi carregado corretamente
    if (!accessToken) {
      const savedToken = sessionStorage.getItem('oauth_access_token');
      if (savedToken) {
        accessToken = savedToken;
      }
    }
    
    const spreadsheetId = document.getElementById("spreadsheetId").value;
    const mesAno = document.getElementById("mes").selectedOptions[0].text;

    if (!accessToken) {
      mostrarStatus("Por favor, faça login com Gmail primeiro", "error");
      return;
    }

    if (!spreadsheetId) {
      mostrarStatus("Por favor, configure o ID da planilha", "error");
      return;
    }

    mostrarStatus("Carregando dados do Google Sheets...", "info");

    try {
      const sheetName = mesAno.replace(" ", "_");

      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:O1000`,
        {
          headers: {
            "Authorization": `Bearer ${accessToken}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();

        if (data.values && data.values.length > 4) {
          // Limpar tabela atual
          document.getElementById("corpoTabela").innerHTML = "";

          // Pular cabeçalho (primeiras 4 linhas)
          const rows = data.values.slice(4);

          rows.forEach((row) => {
            if (row.length > 0 && row[0]) {
              // Se tem data
              const tbody = document.getElementById("corpoTabela");
              const novaLinha = document.createElement("tr");

              novaLinha.innerHTML = `
                                    <td><input type="date" value="${
                                      row[0] || ""
                                    }" onchange="calcularValores()"></td>
                                    <td><input type="text" value="${
                                      row[1] || ""
                                    }" onchange="calcularValores()"></td>
                                    <td><input type="tel" value="${
                                      row[2] || ""
                                    }" onchange="calcularValores()"></td>
                                    <td><input type="text" value="${
                                      row[3] || ""
                                    }" onchange="calcularValores()"></td>
                                    <td><input type="tel" value="${
                                      row[4] || ""
                                    }" onchange="calcularValores()"></td>
                                    <td><input type="text" value="${
                                      row[5] || ""
                                    }" onchange="calcularValores()"></td>
                                    <td>
                                        <select onchange="atualizarValor(this); calcularValores()">
                                            <option value="">Selecione o serviço</option>
                                            <option value="Registro com financiamento" ${
                                              row[6] ===
                                              "Registro com financiamento"
                                                ? "selected"
                                                : ""
                                            }>Registro com financiamento</option>
                                            <option value="Registro à vista" ${
                                              row[6] === "Registro à vista"
                                                ? "selected"
                                                : ""
                                            }>Registro à vista</option>
                                            <option value="Averbação" ${
                                              row[6] === "Averbação"
                                                ? "selected"
                                                : ""
                                            }>Averbação</option>
                                            <option value="Guia de Laudêmio do SPU" ${
                                              row[6] ===
                                              "Guia de Laudêmio do SPU"
                                                ? "selected"
                                                : ""
                                            }>Guia de Laudêmio do SPU</option>
                                            <option value="Laudêmio da prefeitura" ${
                                              row[6] ===
                                              "Laudêmio da prefeitura"
                                                ? "selected"
                                                : ""
                                            }>Laudêmio da prefeitura</option>
                                            <option value="Laudêmio das famílias" ${
                                              row[6] === "Laudêmio das famílias"
                                                ? "selected"
                                                : ""
                                            }>Laudêmio das famílias</option>
                                            <option value="Laudêmio do São Bento" ${
                                              row[6] === "Laudêmio do São Bento"
                                                ? "selected"
                                                : ""
                                            }>Laudêmio do São Bento</option>
                                            <option value="Laudêmio da Igreja da Glória" ${
                                              row[6] ===
                                              "Laudêmio da Igreja da Glória"
                                                ? "selected"
                                                : ""
                                            }>Laudêmio da Igreja da Glória</option>
                                            <option value="Laudêmio da Mitra" ${
                                              row[6] === "Laudêmio da Mitra"
                                                ? "selected"
                                                : ""
                                            }>Laudêmio da Mitra</option>
                                            <option value="Emissão de guia de ITBI" ${
                                              row[6] ===
                                              "Emissão de guia de ITBI"
                                                ? "selected"
                                                : ""
                                            }>Emissão de guia de ITBI</option>
                                            <option value="Emissão de certidão por nome" ${
                                              row[6] ===
                                              "Emissão de certidão por nome"
                                                ? "selected"
                                                : ""
                                            }>Emissão de certidão por nome</option>
                                            <option value="Transferência de conta" ${
                                              row[6] ===
                                              "Transferência de conta"
                                                ? "selected"
                                                : ""
                                            }>Transferência de conta</option>
                                        </select>
                                    </td>
                                    <td><input type="date" value="${
                                      row[7] || ""
                                    }" onchange="calcularValores()"></td>
                                    <td><input type="text" value="${
                                      row[8] || ""
                                    }" onchange="calcularValores()"></td>
                                    <td><input type="text" value="${
                                      row[9] || ""
                                    }" onchange="calcularValores()"></td>
                                    <td><input type="number" step="0.01" class="valor-field" value="${
                                      row[10] || ""
                                    }" onchange="calcularValores()"></td>
                                    <td><input type="number" step="0.01" class="valor-field" value="${
                                      row[11] || ""
                                    }" onchange="calcularValores()"></td>
                                    <td class="valor-field" style="background-color: #e8f5e8;">R$ 0,00</td>
                                    <td class="valor-field" style="background-color: #f0f8ff;">R$ 0,00</td>
                                    <td><input type="text" class="status-input" value="${
                                      row[14] || ""
                                    }" placeholder="Status"></td>
                                    <td class="acao"><button class="btn-remove" onclick="removerLinha(this)">Remover</button></td>
                                `;

              tbody.appendChild(novaLinha);
            }
          });

          calcularValores();
          mostrarStatus(
            "Dados carregados com sucesso do Google Sheets!",
            "success",
          );
        } else {
          mostrarAlertaCentralizado("A tabela está vazia. Nenhum registro encontrado para este mês.");
        }
      } else {
        const error = await response.json();
        if (error.error && error.error.message && error.error.message.includes('Unable to parse range')) {
          mostrarStatus("Planilha está vazia", "info");
        } else {
          if (error.error && error.error.message && error.error.message.includes('Requested entity was not found')) {
            mostrarAlertaCentralizado("A tabela está vazia. Nenhum registro encontrado para este mês.");
          } else {
            mostrarStatus(`Erro ao carregar dados: ${error.error.message}`, "error");
          }
        }
      }
    } catch (error) {
      mostrarStatus(
        `Erro ao conectar com Google Sheets: ${error.message}`,
        "error",
      );
    }
  }

  // Função para criar a planilha automaticamente
  async function criarPlanilhaAutomatica() {
    if (!accessToken) {
      mostrarStatus("Por favor, faça login com Gmail primeiro", "error");
      return;
    }

    mostrarStatus("Criando nova planilha...", "info");

    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            properties: {
              title: "CEMA Imobiliária - Controle Financeiro",
            },
            sheets: [
              {
                properties: {
                  title: "Configuração",
                },
              },
            ],
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        document.getElementById("spreadsheetId").value = data.spreadsheetId;
        salvarConfiguracoes();

        // Criar cabeçalho na aba de configuração
        const configData = [
          ["CEMA IMOBILIÁRIA - CONTROLE FINANCEIRO"],
          [""],
          ["Esta planilha foi criada automaticamente pelo sistema."],
          ["Cada mês será criado em uma aba separada."],
          [""],
          ["Link da planilha:", data.spreadsheetUrl],
        ];

        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${data.spreadsheetId}/values/Configuração!A1?valueInputOption=RAW`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              values: configData,
            }),
          },
        );

        const mensagemSucesso = `Planilha criada com sucesso!\n\nID da Planilha: ${data.spreadsheetId}\nTítulo: CEMA Imobiliária - Controle Financeiro\nLink: ${data.spreadsheetUrl}\n\nA planilha foi configurada automaticamente!`;
        mostrarStatus(mensagemSucesso, "success");
      } else {
        const error = await response.json();
        mostrarStatus(`Erro ao criar planilha: ${error.error.message}`, "error");
      }
    } catch (error) {
      mostrarStatus(`Erro ao criar planilha: ${error.message}`, "error");
    }
  }

  async function criarCopiaPlanilhaComLimpeza() {
    const spreadsheetId = document.getElementById("spreadsheetId").value;
    if (!spreadsheetId) {
      mostrarAlertaCentralizado("Por favor, informe o ID da planilha modelo");
      return;
    }
    // 1. Solicitar autorização temporária para o Drive
    const userEmail = document.getElementById("userEmail").value.trim();
    const state = Math.random().toString(36).substring(2, 15);
    const redirectUri = window.location.origin + window.location.pathname;
    const driveScope = 'https://www.googleapis.com/auth/drive';
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_OAUTH_CONFIG.clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', driveScope);
    authUrl.searchParams.set('response_type', 'token');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('include_granted_scopes', 'false');

    mostrarAlertaCentralizado("Solicitando permissão temporária para criar a planilha...");
    // Abrir popup para autorização
    const popup = window.open(authUrl.toString(), 'DriveAuth', 'width=500,height=600');
    // Listener para receber o token do popup
    return new Promise((resolve) => {
      window.addEventListener('message', async function handleDriveOAuth(event) {
        if (event.origin !== window.location.origin) return;
        if (event.data && event.data.type === 'oauth_token_drive') {
          window.removeEventListener('message', handleDriveOAuth);
          if (popup) popup.close();
          const tempAccessToken = event.data.token;
          // Chamar a função de cópia usando o token temporário
          await criarCopiaPlanilhaComLimpezaComToken(tempAccessToken, spreadsheetId);
          resolve();
        }
      });
    });
  }

  // Função auxiliar para criar a cópia usando o token temporário
  async function criarCopiaPlanilhaComLimpezaComToken(tempAccessToken, spreadsheetId) {
    try {
      mostrarAlertaCentralizado("Criando cópia da planilha, aguarde...");
      // 1. Copiar a planilha modelo
      const copyResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${spreadsheetId}/copy`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${tempAccessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: "CEMA Imobiliária - Controle Financeiro"
          })
        }
      );
      const copyData = await copyResponse.json();
      if (!copyData.id) {
        mostrarAlertaCentralizado("Erro ao copiar planilha: " + (copyData.error && copyData.error.message ? copyData.error.message : ""));
        return;
      }
      const newSpreadsheetId = copyData.id;
      // 2. Buscar sheetIds das abas desejadas
      const abasParaLimpar = [
        "total no ano", "janeiro", "fevereiro", "março", "abril", "maio", "junho",
        "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
      ];
      const sheetsResp = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${newSpreadsheetId}`,
        {
          headers: { "Authorization": `Bearer ${tempAccessToken}` }
        }
      );
      const sheetsData = await sheetsResp.json();
      const sheetIdMap = {};
      if (sheetsData.sheets) {
        sheetsData.sheets.forEach(s => {
          if (abasParaLimpar.includes(s.properties.title.toLowerCase())) {
            sheetIdMap[s.properties.title.toLowerCase()] = s.properties.sheetId;
          }
        });
      }
      // 3. Limpar linhas 5+ das abas desejadas
      const requests = [];
      abasParaLimpar.forEach(nomeAba => {
        const sheetId = sheetIdMap[nomeAba];
        if (sheetId !== undefined) {
          requests.push({
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: "ROWS",
                startIndex: 4 // Linha 5 (zero-based)
              }
            }
          });
        }
      });
      if (requests.length > 0) {
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${newSpreadsheetId}:batchUpdate`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${tempAccessToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ requests })
          }
        );
      }
      mostrarAlertaCentralizado(
        `Planilha criada com sucesso!<br><a href="https://docs.google.com/spreadsheets/d/${newSpreadsheetId}" target="_blank">Abrir nova planilha</a>`
      );
    } catch (error) {
      mostrarAlertaCentralizado("Erro ao criar cópia: " + error.message);
    }
  }
  // No popup, envie o token temporário de volta para a janela principal
  if (window.opener && window.location.hash.includes('access_token')) {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const token = params.get('access_token');
    // Detecta se é para o fluxo temporário do Drive
    if (window.name === 'DriveAuth') {
      window.opener.postMessage({ type: 'oauth_token_drive', token }, window.location.origin);
    } else {
      window.opener.postMessage({ type: 'oauth_token', hash: window.location.hash }, window.location.origin);
    }
  }

  // Função para salvar configurações no localStorage
  function salvarConfiguracoes() {
    const userEmail = document.getElementById("userEmail").value;
    const spreadsheetId = document.getElementById("spreadsheetId").value;
    
    localStorage.setItem("cema_user_email", userEmail);
    localStorage.setItem("cema_spreadsheet_id", spreadsheetId);
  }

  // Função para carregar configurações do localStorage
  function carregarConfiguracoes() {
    const userEmail = localStorage.getItem("cema_user_email");
    const spreadsheetId = localStorage.getItem("cema_spreadsheet_id");
    
    if (userEmail) {
      const emailInput = document.getElementById("userEmail");
      if (emailInput) {
        emailInput.value = userEmail;
      }
    }
    
    if (spreadsheetId) {
      const spreadsheetInput = document.getElementById("spreadsheetId");
      if (spreadsheetInput) {
        spreadsheetInput.value = spreadsheetId;
      }
    }
  }

  // Event listeners para salvar configurações
  const userEmailElement = document.getElementById("userEmail");
  const spreadsheetIdElement = document.getElementById("spreadsheetId");
  if (userEmailElement) {
    userEmailElement.addEventListener("change", salvarConfiguracoes);
  }
  if (spreadsheetIdElement) {
    spreadsheetIdElement.addEventListener("change", salvarConfiguracoes);
  }

  // Salvar parceiros quando modificados
  function salvarParceirosAposModificacao() {
    salvarParceiros();
  }

  // Função para formatar data brasileira
  function formatarDataBrasileira(data) {
    if (!data) return "";
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
  }

  // Função para converter data brasileira para formato ISO
  function converterDataParaISO(data) {
    if (!data) return "";
    const [dia, mes, ano] = data.split("/");
    return `${ano}-${mes}-${dia}`;
  }

  // Função para exportar relatório completo
  async function exportarRelatorioCompleto() {
    // Verificar se o token foi carregado corretamente
    if (!accessToken) {
      const savedToken = sessionStorage.getItem('oauth_access_token');
      if (savedToken) {
        accessToken = savedToken;
      }
    }
    
    const spreadsheetId = document.getElementById("spreadsheetId").value;
    const userEmail = document.getElementById("userEmail").value.trim();

    if (!accessToken) {
      mostrarAlertaCentralizado("Por favor, faça login com Gmail primeiro");
      return;
    }
    if (!spreadsheetId) {
      mostrarAlertaCentralizado("Por favor, informe o ID da planilha");
      return;
    }
    if (!userEmail) {
      mostrarAlertaCentralizado("Por favor, preencha o e-mail Gmail antes de gerar o relatório.");
      return;
    }

    mostrarStatus("Gerando relatório completo...", "info");

    try {
      // Criar aba de relatório
      const relatorioData = [];

      // Cabeçalho do relatório
      relatorioData.push(["CEMA IMOBILIÁRIA - RELATÓRIO ANUAL"]);
      relatorioData.push(["Gerado em:", new Date().toLocaleDateString("pt-BR")]);
      relatorioData.push([]);

      // Resumo por mês
      relatorioData.push(["RESUMO POR MÊS"]);
      relatorioData.push([
        "Mês",
        "Total Faturado",
        "Total Despesas",
        "Líquido",
        "CEMA",
        "Felipe",
      ]);

      // Tabela de serviços
      relatorioData.push([]);
      relatorioData.push(["TABELA DE SERVIÇOS"]);
      relatorioData.push(["Serviço", "Valor"]);

      Object.entries(servicosValores).forEach(([servico, valor]) => {
        relatorioData.push([servico, valor]);
      });

      // Criar/atualizar aba de relatório
      const sheetName = "Relatório_Anual";

      try {
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              requests: [
                {
                  addSheet: {
                    properties: {
                      title: sheetName,
                    },
                  },
                },
              ],
            }),
          },
        );
      } catch (error) {
        // Aba já existe
      }

      // Limpar e adicionar dados
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:clear`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`
          }
        },
      );

      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1?valueInputOption=RAW`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            values: relatorioData,
          }),
        },
      );

      if (response.ok) {
        const mensagemSucesso = `Relatório completo gerado com sucesso!\n\nPlanilha: ${spreadsheetId}\nAba: Relatório_Anual\nData: ${new Date().toLocaleDateString("pt-BR")}\n\nO relatório está disponível na planilha!`;
        mostrarStatus(mensagemSucesso, "success");
        // Abrir a planilha em nova aba
        window.open(`https://docs.google.com/spreadsheets/d/${spreadsheetId}`, '_blank');
      } else {
        throw new Error("Erro ao gerar relatório");
      }
    } catch (error) {
      mostrarStatus(`Erro ao gerar relatório: ${error.message}`, "error");
    }
  }

  // Validação dos campos de parceiro
  function validarCamposParceiro() {
    const nomeInput = document.getElementById("partnerName");
    const percentualInput = document.getElementById("partnerPercentage");
    const btnAdd = document.getElementById("btnAddPartner");
    const nomeFeedback = document.getElementById("partnerNameFeedback");
    const percentualFeedback = document.getElementById("partnerPercentageFeedback");

    let nome = nomeInput.value.trim();
    let percentual = percentualInput.value.trim();
    let percentualNum = parseFloat(percentual);
    let nomeValido = nome.length > 0;
    let percentualValido = percentual.length > 0 && !isNaN(percentualNum) && percentualNum > 0 && percentualNum <= 100;

    // Reset classes e feedback
    nomeInput.classList.remove("is-invalid", "is-valid");
    percentualInput.classList.remove("is-invalid", "is-valid");
    nomeFeedback.style.display = "none";
    percentualFeedback.style.display = "none";

    // Validação visual estilo Bootstrap
    if (!nomeValido && nome.length > 0) {
      nomeInput.classList.add("is-invalid");
      nomeFeedback.style.display = "block";
    } else if (nomeValido) {
      nomeInput.classList.add("is-valid");
    }
    if (!percentualValido && percentual.length > 0) {
      percentualInput.classList.add("is-invalid");
      percentualFeedback.style.display = "block";
    } else if (percentualValido) {
      percentualInput.classList.add("is-valid");
    }

    // Não desabilitar o botão - deixar a função adicionarParceiro mostrar os alertas
    btnAdd.disabled = false;
    return nomeValido && percentualValido;
  }

  // Função para mostrar alerta centralizado na tela
  function mostrarAlertaCentralizado(msg) {
    let alerta = document.getElementById('centeredAlert');
    if (!alerta) {
      alerta = document.createElement('div');
      alerta.id = 'centeredAlert';
      alerta.className = 'centered-alert';
      document.body.appendChild(alerta);
    }
    alerta.textContent = msg;
    alerta.style.display = 'block';
    // Esconde após 3 segundos
    clearTimeout(window._centeredAlertTimeout);
    window._centeredAlertTimeout = setTimeout(() => {
      alerta.style.display = 'none';
    }, 3000);
  }

  // Função para adicionar novo serviço personalizado
  function adicionarNovoServico() {
    const nomeInput = document.getElementById('novoServicoNome');
    const valorInput = document.getElementById('novoServicoValor');
    const nome = nomeInput.value.trim();
    const valor = parseFloat(valorInput.value);
    if (!nome) {
      mostrarAlertaCentralizado('Preencha o nome do novo serviço.');
      return;
    }
    if (isNaN(valor) || valor <= 0) {
      mostrarAlertaCentralizado('Preencha um valor válido para o novo serviço.');
      return;
    }
    if (servicosValores[nome]) {
      mostrarAlertaCentralizado('Já existe um serviço com esse nome.');
      return;
    }
    // Adicionar ao objeto de valores
    servicosValores[nome] = valor;
    // Adicionar visualmente
    const grid = document.getElementById('servicesGrid');
    const div = document.createElement('div');
    div.className = 'service-item';
    div.innerHTML = `<span>${nome}</span><input type="number" class="service-value-input" data-nome="${nome}" value="${valor}" min="0" step="0.01" style="width: 90px; margin-left: 8px;">`;
    grid.appendChild(div);
    // Limpar campos
    nomeInput.value = '';
    valorInput.value = '';
    // Atualizar selects de serviço nas linhas da tabela
    atualizarSelectsServicos();
    ativarListenersValoresServicos();
  }

  // Função para remover serviços adicionados
  function removerServicoAdicionado() {
    const nomeInput = document.getElementById('novoServicoNome');
    const nome = nomeInput.value.trim();
    
    if (!nome) {
      mostrarAlertaCentralizado('Digite o nome do serviço que deseja remover.');
      return;
    }
    
    // Verificar se é um serviço padrão (não pode ser removido)
    const servicosPadrao = [
      "Registro com financiamento", "Registro à vista", "Averbação", 
      "Guia de Laudêmio do SPU", "Laudêmio da prefeitura", "Laudêmio das famílias",
      "Laudêmio do São Bento", "Laudêmio da Igreja da Glória", "Laudêmio da Mitra",
      "Emissão de guia de ITBI", "Emissão de certidão por nome", "Transferência de conta"
    ];
    
    if (servicosPadrao.includes(nome)) {
      mostrarAlertaCentralizado('Não é possível remover serviços padrão do sistema.');
      return;
    }
    
    if (!servicosValores[nome]) {
      mostrarAlertaCentralizado('Serviço não encontrado.');
      return;
    }
    
    // Remover do objeto
    delete servicosValores[nome];
    
    // Remover visualmente
    const grid = document.getElementById('servicesGrid');
    const serviceItems = grid.querySelectorAll('.service-item');
    serviceItems.forEach(item => {
      const span = item.querySelector('span');
      if (span && span.textContent === nome) {
        item.remove();
      }
    });
    
    // Limpar campos
    nomeInput.value = '';
    document.getElementById('novoServicoValor').value = '';
    
    // Atualizar selects de serviço nas linhas da tabela
    atualizarSelectsServicos();
    ativarListenersValoresServicos();
    
    mostrarAlertaCentralizado(`Serviço "${nome}" removido com sucesso!`);
  }

  // Atualizar selects de serviço nas linhas da tabela
  function atualizarSelectsServicos() {
    const selects = document.querySelectorAll('#corpoTabela select');
    selects.forEach(select => {
      const valorAtual = select.value;
      // Limpar opções
      select.innerHTML = '<option value="">Selecione o serviço</option>';
      Object.keys(servicosValores).forEach(nome => {
        const opt = document.createElement('option');
        opt.value = nome;
        opt.textContent = nome;
        if (nome === valorAtual) opt.selected = true;
        select.appendChild(opt);
      });
    });
  }

  // Função para ativar listeners nos inputs de valor dos serviços
  function ativarListenersValoresServicos() {
    document.querySelectorAll('.service-value-input').forEach(input => {
      input.addEventListener('input', function() {
        const nome = input.getAttribute('data-nome');
        const valor = parseFloat(input.value);
        if (nome && !isNaN(valor) && valor > 0) {
          servicosValores[nome] = valor;
          atualizarSelectsServicos();
        }
      });
    });
  }

  function limparTabelaServicos() {
    const corpoTabela = document.getElementById("corpoTabela");
    if (corpoTabela) {
      corpoTabela.innerHTML = "";
      adicionarLinha(); // Isso já chama atualizarSelectsServicos()
      calcularValores(); // Atualiza o resumo após limpar
      mostrarAlertaCentralizado("Tabela limpa! Pronto para nova inserção.");
    }
  }

  // Inicialização
  document.addEventListener("DOMContentLoaded", function () {
    // Verificar se há um callback OAuth2 na URL
    if (window.location.hash && window.location.hash.includes('access_token')) {
      processarCallbackOAuth2();
    }
    
    // Carregar valores salvos antes de qualquer manipulação
    carregarConfiguracoes();
    // Adicionar listeners após restaurar valores
    const userEmailInput = document.getElementById("userEmail");
    const spreadsheetIdInput = document.getElementById("spreadsheetId");
    
    if (userEmailInput) {
      userEmailInput.addEventListener('input', function() {
        localStorage.setItem("cema_user_email", this.value);
      });
    }
    
    if (spreadsheetIdInput) {
      spreadsheetIdInput.addEventListener('input', function() {
        localStorage.setItem("cema_spreadsheet_id", this.value);
      });
    }
    carregarParceiros();
    verificarTokenSalvo();
    adicionarLinha();

    // Definir mês atual
    const hoje = new Date();
    const mesAtual = hoje.getFullYear() + "-" + String(hoje.getMonth() + 1).padStart(2, "0");
    const mesElement = document.getElementById("mes");
    if (mesElement) {
      mesElement.value = mesAtual;
    }
    
    // Calcular valores iniciais
    setTimeout(() => {
      calcularValores();
    }, 100);

    // Configurar ícones de olho para mostrar/esconder senhas
    configurarIconesOlho();
    
    // Ativar listeners de valores dos serviços
    ativarListenersValoresServicos();
  });

  // Função para configurar os ícones de olho
  function configurarIconesOlho() {
    // ID da Planilha
    const olhoSpreadsheet = document.getElementById('olho-spreadsheet');
    const inputSpreadsheet = document.getElementById('spreadsheetId');
    if (olhoSpreadsheet && inputSpreadsheet) {
      olhoSpreadsheet.addEventListener('click', function () {
        if (inputSpreadsheet.type === 'password') {
          inputSpreadsheet.type = 'text';
          olhoSpreadsheet.style.opacity = 0.5; // opcional: visual feedback
        } else {
          inputSpreadsheet.type = 'password';
          olhoSpreadsheet.style.opacity = 1;
        }
      });
    }

    // E-mail Gmail
    const olhoEmail = document.getElementById('olho-email');
    const inputEmail = document.getElementById('userEmail');
    if (olhoEmail && inputEmail) {
      olhoEmail.addEventListener('click', function () {
        if (inputEmail.type === 'password') {
          inputEmail.type = 'text';
          olhoEmail.style.opacity = 0.5; // opcional: visual feedback
        } else {
          inputEmail.type = 'password';
          olhoEmail.style.opacity = 1;
        }
      });
    }
  }

  // Script para popup OAuth2 - enviar token para janela principal
  if (window.opener && window.location.hash.includes('access_token')) {
    try {
      window.opener.postMessage({ type: 'oauth_token', hash: window.location.hash }, window.location.origin);
    } catch (e) {}
  }

  // Exportar funções para uso global
  window.adicionarParceiro = adicionarParceiro;
  window.removerParceiro = removerParceiro;
  window.adicionarLinha = adicionarLinha;
  window.removerLinha = removerLinha;
  window.calcularValores = calcularValores;
  window.atualizarValor = atualizarValor;
  window.enviarParaGoogleSheets = enviarParaGoogleSheets;
  window.carregarDadosGoogleSheets = carregarDadosGoogleSheets;
  window.criarPlanilhaAutomatica = criarPlanilhaAutomatica;
  window.criarCopiaPlanilhaComLimpeza = criarCopiaPlanilhaComLimpeza;
  window.exportarRelatorioCompleto = exportarRelatorioCompleto;
  window.limparTabelaServicos = limparTabelaServicos;
  window.adicionarNovoServico = adicionarNovoServico;
  window.removerServicoAdicionado = removerServicoAdicionado;
  window.iniciarLoginGmail = iniciarLoginGmail;
  window.fazerLogout = fazerLogout;
  window.verificarTokenSalvo = verificarTokenSalvo;
  window.validarCamposParceiro = validarCamposParceiro;
})();

