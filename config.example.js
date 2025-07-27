// Exemplo de configuração - Copie este arquivo para config.js e preencha com suas credenciais
const CONFIG = {
    // Google OAuth2 Configuration
    // Obtenha estas credenciais em: https://console.cloud.google.com
    GOOGLE_CLIENT_ID: 'SEU_CLIENT_ID_AQUI',
    GOOGLE_REDIRECT_URI: 'http://127.0.0.1:5500/index.html', // Ajuste conforme seu ambiente
    GOOGLE_SCOPE: 'https://www.googleapis.com/auth/spreadsheets'
    
    // Nota: Os e-mails autorizados são configurados diretamente no Google Cloud Console
    // em "OAuth consent screen" → "Test users" ou "Publishing status"
  };
  
  // Exportar para uso global
  window.CONFIG = CONFIG; 