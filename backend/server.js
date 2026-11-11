const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
const firebase = require('./firebase');

// Carregar variáveis do arquivo .env (da raiz ou da pasta backend)
function loadEnv() {
  const envPaths = [
    path.join(__dirname, '..', '.env'),
    path.join(__dirname, '.env')
  ];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split(/\r?\n/).forEach(line => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const eqIndex = trimmed.indexOf('=');
            if (eqIndex !== -1) {
              const key = trimmed.substring(0, eqIndex).trim();
              let val = trimmed.substring(eqIndex + 1).trim();
              if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.substring(1, val.length - 1);
              }
              process.env[key] = val;
            }
          }
        });
      } catch (e) {
        console.error('Erro ao ler .env:', e);
      }
    }
  }
}
loadEnv();

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'campaign.json');
const CONFIG_FILE = path.join(__dirname, 'config.json');
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

// Helper to load config
function getConfig() {
  // Recarrega .env dinamicamente para aplicar alterações sem reiniciar
  loadEnv();

  let fileConfig = {};
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      fileConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Erro ao ler config.json:', e);
  }

  const asaasApiKey = (process.env.ASAAS_API_KEY || fileConfig.asaasApiKey || '').trim();
  const asaasEnvironment = (process.env.ASAAS_ENVIRONMENT || fileConfig.asaasEnvironment || 'sandbox').trim().toLowerCase();
  const parishPixKey = (process.env.PARISH_PIX_KEY || fileConfig.parishPixKey || 'pix@igrejacomunidade.org.br').trim();
  const parishName = (process.env.PARISH_NAME || fileConfig.parishName || 'Paroquia da Comunidade').trim();
  const parishCity = (process.env.PARISH_CITY || fileConfig.parishCity || 'SAO PAULO').trim();

  return {
    asaasApiKey,
    asaasEnvironment,
    parishPixKey,
    parishName,
    parishCity
  };
}

// Helper to read campaign data
function getCampaignData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Erro ao ler dados da campanha:', err);
    return null;
  }
}

// Helper to save campaign data
function saveCampaignData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Erro ao salvar dados da campanha:', err);
    return false;
  }
}

// CRC16-CCITT para cálculo oficial de BRCode PIX (BACEN)
function crc16(str) {
  let crc = 0xFFFF;
  for (let c = 0; c < str.length; c++) {
    crc ^= str.charCodeAt(c) << 8;
    for (let i = 0; i < 8; i++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// Gerador EMVCo BRCode PIX (Padrão Banco Central do Brasil)
function generateBRCodePix({ key, name, city, amount, txid }) {
  const cleanName = (name || 'PAROQUIA COMUNIDADE').normalize('NFD').replace(/[\u0300-\u036f]/g, '').substring(0, 25).toUpperCase();
  const cleanCity = (city || 'SAO PAULO').normalize('NFD').replace(/[\u0300-\u036f]/g, '').substring(0, 15).toUpperCase();
  const cleanTxid = (txid || 'NATAL2024').replace(/[^a-zA-Z0-9]/g, '').substring(0, 25);
  const formattedAmount = Number(amount).toFixed(2);

  const formatField = (id, value) => {
    const len = String(value.length).padStart(2, '0');
    return `${id}${len}${value}`;
  };

  // Merchant Account Info (PIX)
  const gui = formatField('00', 'br.gov.bcb.pix');
  const pixKey = formatField('01', key);
  const merchantAccount = formatField('26', `${gui}${pixKey}`);

  // Additional Data Field (TXID)
  const txidField = formatField('05', cleanTxid);
  const additionalData = formatField('62', txidField);

  let raw = 
    formatField('00', '01') + // Format indicator
    formatField('01', '12') + // Point of initiation (12 = dynamic/specified value)
    merchantAccount +
    formatField('52', '0000') + // Category code
    formatField('53', '986') +  // Currency BRL
    formatField('54', formattedAmount) + // Amount
    formatField('58', 'BR') +   // Country
    formatField('59', cleanName) +
    formatField('60', cleanCity) +
    additionalData +
    '6304'; // CRC prefix

  const checksum = crc16(raw);
  return `${raw}${checksum}`;
}

// Chamada HTTPS para API do Asaas
function asaasRequest({ endpoint, method, data, apiKey, environment }) {
  return new Promise((resolve, reject) => {
    const isProd = environment === 'production';
    const host = isProd ? 'api.asaas.com' : 'api-sandbox.asaas.com';
    const postData = data ? JSON.stringify(data) : null;

    const options = {
      hostname: host,
      port: 443,
      path: `/v3${endpoint}`,
      method: method || 'GET',
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json',
        'User-Agent': 'NatalSolidario/1.0'
      }
    };

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(options, (res) => {
      let resBody = '';
      res.on('data', chunk => { resBody += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(resBody);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject({ status: res.statusCode, body: parsed });
          }
        } catch (e) {
          reject({ status: res.statusCode, raw: resBody });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (postData) req.write(postData);
    req.end();
  });
}

// MIME types for static files
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, access_token');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API ROUTES
  if (pathname.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    // GET /api/campaign
    if (pathname === '/api/campaign' && req.method === 'GET') {
      const data = await firebase.getCampaignStats();
      if (!data) {
        res.writeHead(500);
        return res.end(JSON.stringify({ error: 'Erro ao carregar dados' }));
      }
      res.writeHead(200);
      return res.end(JSON.stringify(data));
    }

    // GET /api/angels
    if (pathname === '/api/angels' && req.method === 'GET') {
      const angels = await firebase.getAngels();
      res.writeHead(200);
      return res.end(JSON.stringify(angels || []));
    }

    // GET /api/donations
    if (pathname === '/api/donations' && req.method === 'GET') {
      const donations = await firebase.getDonations(50);
      res.writeHead(200);
      return res.end(JSON.stringify(donations || []));
    }

    // GET /api/firebase-config
    if (pathname === '/api/firebase-config' && req.method === 'GET') {
      res.writeHead(200);
      return res.end(JSON.stringify(firebase.getFirebaseWebConfig()));
    }

    // GET /api/charges/:id/status
    if (pathname.startsWith('/api/charges/') && pathname.endsWith('/status') && req.method === 'GET') {
      const parts = pathname.split('/');
      const chargeId = parts[3];
      const charge = await firebase.getCharge(chargeId);
      if (!charge) {
        res.writeHead(404);
        return res.end(JSON.stringify({ error: 'Cobrança não encontrada' }));
      }
      res.writeHead(200);
      return res.end(JSON.stringify({
        id: chargeId,
        status: charge.status || 'PENDING',
        amount: charge.amount
      }));
    }

    // POST /api/asaas/create-pix - Gerar QR Code PIX (Asaas ou BRCode Oficial)
    if (pathname === '/api/asaas/create-pix' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body);
          const amount = parseFloat(payload.amount);
          if (isNaN(amount) || amount <= 0) {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: 'Valor de doação inválido' }));
          }

          const donorName = (payload.donor || 'Doador Anônimo').trim();
          const message = (payload.message || 'Que Deus abençoe as famílias!').trim();
          const anonymous = Boolean(payload.anonymous);
          const config = getConfig();

          const txid = `NATAL${Date.now().toString().slice(-8)}`;

          // Se houver chave Asaas configurada, tenta criar cobrança real via Asaas
          if (config.asaasApiKey && config.asaasApiKey.length > 10) {
            try {
              // 1. Criar ou buscar cliente
              const customer = await asaasRequest({
                endpoint: '/customers',
                method: 'POST',
                apiKey: config.asaasApiKey,
                environment: config.asaasEnvironment,
                data: {
                  name: anonymous ? 'Doador Solidário Anônimo' : donorName,
                  email: 'doacao@nataldeesperanca.com.br'
                }
              });

              // 2. Criar cobrança PIX
              const today = new Date().toISOString().split('T')[0];
              const payment = await asaasRequest({
                endpoint: '/payments',
                method: 'POST',
                apiKey: config.asaasApiKey,
                environment: config.asaasEnvironment,
                data: {
                  customer: customer.id,
                  billingType: 'PIX',
                  value: amount,
                  dueDate: today,
                  description: `Doação Natal de Esperança 2024 - ${donorName}`
                }
              });

              // 3. Obter QR Code PIX do Asaas
              const pixData = await asaasRequest({
                endpoint: `/payments/${payment.id}/pixQrCode`,
                method: 'GET',
                apiKey: config.asaasApiKey,
                environment: config.asaasEnvironment
              });

              // Salva a cobrança no Firebase / SQLite
              await firebase.createCharge({
                id: payment.id,
                asaasPaymentId: payment.id,
                amount: amount,
                donorName: anonymous ? 'Doador Anônimo' : donorName,
                message: message,
                anonymous: anonymous,
                pixCode: pixData.payload,
                pixQrUrl: `data:image/png;base64,${pixData.encodedImage}`
              });

              res.writeHead(200);
              return res.end(JSON.stringify({
                success: true,
                paymentId: payment.id,
                amount: amount,
                pixCopiaECola: pixData.payload,
                qrCodeImage: `data:image/png;base64,${pixData.encodedImage}`,
                expirationDate: pixData.expirationDate,
                provider: 'asaas',
                mode: config.asaasEnvironment
              }));
            } catch (asaasErr) {
              console.warn('⚠️ Erro ao comunicar com API Asaas, utilizando gerador padrão BRCode:', asaasErr);
              // Continua para o gerador de fallback em caso de erro na chave ou sandbox
            }
          }

          // Fallback / Modo Direto: Gerar BRCode Oficial com QR Code instantâneo
          const pixPayload = generateBRCodePix({
            key: config.parishPixKey || 'pix@igrejacomunidade.org.br',
            name: config.parishName || 'PAROQUIA DA COMUNIDADE',
            city: config.parishCity || 'SAO PAULO',
            amount: amount,
            txid: txid
          });

          // QR Code em formato de imagem segura
          const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=8&data=${encodeURIComponent(pixPayload)}`;

          // Salva cobrança no Firebase / SQLite
          await firebase.createCharge({
            id: txid,
            asaasPaymentId: txid,
            amount: amount,
            donorName: anonymous ? 'Doador Anônimo' : donorName,
            message: message,
            anonymous: anonymous,
            pixCode: pixPayload,
            pixQrUrl: qrCodeUrl
          });

          res.writeHead(200);
          return res.end(JSON.stringify({
            success: true,
            paymentId: txid,
            amount: amount,
            pixCopiaECola: pixPayload,
            qrCodeImage: qrCodeUrl,
            expirationDate: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            provider: 'asaas-simulator',
            mode: config.asaasEnvironment || 'sandbox',
            instructions: 'Aponte a câmera do aplicativo do seu banco para o QR Code ou copie o código Pix.'
          }));

        } catch (err) {
          res.writeHead(500);
          return res.end(JSON.stringify({ error: 'Erro ao gerar cobrança PIX', details: err.message }));
        }
      });
      return;
    }

    // POST /api/donations - Registrar nova doação confirmada (ou teste manual)
    if (pathname === '/api/donations' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const payload = JSON.parse(body);
          const amount = parseFloat(payload.amount);
          if (isNaN(amount) || amount <= 0) {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: 'Valor de doação inválido' }));
          }

          const donorName = (payload.donor || 'Doador Anônimo').trim();
          const message = (payload.message || 'Que Deus abençoe essa linda causa!').trim();
          const anonymous = Boolean(payload.anonymous);
          const paymentId = payload.paymentId || `PAY_${Date.now()}`;

          const result = await firebase.confirmPayment({
            paymentId: paymentId,
            amount: amount,
            donorName: donorName,
            message: message,
            anonymous: anonymous,
            eventId: `MANUAL_${Date.now()}`,
            rawPayload: payload
          });

          res.writeHead(201);
          return res.end(JSON.stringify({
            success: true,
            donation: {
              id: Date.now(),
              donor: anonymous ? 'Doador Anônimo' : donorName,
              amount: amount,
              message: message,
              anonymous: anonymous
            },
            campaign: result.campaign || (await firebase.getCampaignStats())
          }));
        } catch (err) {
          res.writeHead(400);
          return res.end(JSON.stringify({ error: 'Erro ao processar doação', details: err.message }));
        }
      });
      return;
    }

    // Webhook Asaas (Notificação oficial em tempo real de pagamento recebido)
    if (pathname === '/api/asaas/webhook' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const evt = JSON.parse(body);
          console.log(`📩 Webhook Asaas recebido: Evento=${evt.event}, ID=${evt.id}`);
          if (evt.event === 'PAYMENT_RECEIVED' || evt.event === 'PAYMENT_CONFIRMED') {
            const p = evt.payment;
            const donorName = p.description ? p.description.split('-')[1]?.trim() : 'Doador Asaas';
            
            await firebase.confirmPayment({
              paymentId: p.id,
              amount: p.value,
              donorName: donorName || 'Benfeitor Asaas',
              message: 'Doação confirmada via Asaas PIX!',
              anonymous: false,
              eventId: evt.id,
              rawPayload: evt
            });
            console.log(`✅ Pagamento confirmado e propagado: R$ ${p.value} (${p.id})`);
          }
          res.writeHead(200);
          return res.end(JSON.stringify({ received: true }));
        } catch (e) {
          console.error('Erro no webhook Asaas:', e);
          res.writeHead(400);
          return res.end(JSON.stringify({ error: 'Erro no webhook' }));
        }
      });
      return;
    }

    // Health check
    if (pathname === '/api/health') {
      const config = getConfig();
      res.writeHead(200);
      return res.end(JSON.stringify({
        status: 'ok',
        firebaseReady: firebase.isConfigured(),
        asaasConfigured: Boolean(config.asaasApiKey && config.asaasApiKey.length > 10),
        environment: config.asaasEnvironment,
        time: new Date().toISOString()
      }));
    }

    res.writeHead(404);
    return res.end(JSON.stringify({ error: 'Endpoint não encontrado' }));
  }

  // STATIC FRONTEND FILES
  let reqPath = pathname === '/' ? '/index.html' : pathname;
  let safePath = path.normalize(path.join(FRONTEND_DIR, reqPath));

  if (!safePath.startsWith(FRONTEND_DIR)) {
    res.writeHead(403);
    return res.end('Acesso negado');
  }

  fs.stat(safePath, (err, stats) => {
    if (err || !stats.isFile()) {
      const fallback = path.join(FRONTEND_DIR, 'index.html');
      fs.readFile(fallback, (errFallback, content) => {
        if (errFallback) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          return res.end('Arquivo não encontrado');
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(content);
      });
      return;
    }

    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(safePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500);
        return res.end('Erro interno do servidor');
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🎄 Servidor Campanha de Natal Solidário Ativo!`);
  console.log(`📍 URL Local: http://localhost:${PORT}`);
  console.log(`💳 Integração Asaas PIX ativa`);
  console.log(`⚡ API Endpoints disponíveis:`);
  console.log(`   - POST /api/asaas/create-pix (Gera QR Code + Pix Copia/Cola)`);
  console.log(`   - POST /api/asaas/webhook    (Recebe confirmação Asaas)`);
  console.log(`   - GET  /api/campaign         (Estatísticas em tempo real)`);
  console.log(`   - GET  /api/donations        (Feed de doações)`);
  console.log(`   - POST /api/donations        (Adicionar doação confirmada)`);
  console.log(`=======================================================`);
});
