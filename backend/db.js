const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'natal.db');
const JSON_BACKUP = path.join(__dirname, 'data', 'campaign.json');

// Garante que o diretório data exista
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new DatabaseSync(DB_PATH);

// Configurações de performance e segurança
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS campaign_stats (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    title TEXT NOT NULL,
    subtitle TEXT NOT NULL,
    target_amount REAL NOT NULL,
    current_amount REAL NOT NULL,
    target_baskets INTEGER NOT NULL,
    current_baskets INTEGER NOT NULL,
    beneficiaries INTEGER NOT NULL,
    pix_key TEXT,
    pix_receiver TEXT,
    pix_city TEXT
  );

  CREATE TABLE IF NOT EXISTS charges (
    id TEXT PRIMARY KEY,
    asaas_payment_id TEXT,
    amount REAL NOT NULL,
    donor_name TEXT,
    donor_email TEXT,
    message TEXT,
    anonymous INTEGER DEFAULT 0,
    status TEXT DEFAULT 'PENDING',
    pix_code TEXT,
    pix_qr_url TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS donations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    charge_id TEXT,
    donor TEXT NOT NULL,
    initials TEXT NOT NULL,
    amount REAL NOT NULL,
    time_str TEXT NOT NULL,
    message TEXT,
    anonymous INTEGER DEFAULT 0,
    verified INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS angels (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    badge TEXT,
    image TEXT,
    icon TEXT
  );

  CREATE TABLE IF NOT EXISTS webhook_events (
    id TEXT PRIMARY KEY,
    event_type TEXT,
    payment_id TEXT,
    payload TEXT,
    processed_at TEXT NOT NULL
  );
`);

// Migração inicial dos dados de campaign.json (se o banco for novo)
const statsCount = db.prepare('SELECT COUNT(*) as count FROM campaign_stats').get();
if (statsCount.count === 0 && fs.existsSync(JSON_BACKUP)) {
  try {
    const raw = fs.readFileSync(JSON_BACKUP, 'utf8');
    const initial = JSON.parse(raw);

    const c = initial.campaign;
    db.prepare(`
      INSERT INTO campaign_stats (id, title, subtitle, target_amount, current_amount, target_baskets, current_baskets, beneficiaries, pix_key, pix_receiver, pix_city)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      c.title || 'Campanha de Natal Solidário 2024',
      c.subtitle || 'Natal de Esperança - Multiplique o Amor neste Natal',
      c.targetAmount != null ? c.targetAmount : 10000,
      c.currentAmount != null ? c.currentAmount : 0,
      c.targetBaskets != null ? c.targetBaskets : 100,
      c.currentBaskets != null ? c.currentBaskets : 0,
      c.beneficiaries != null ? c.beneficiaries : 0,
      c.pixKey || '013253bc-5ac2-43d3-8845-376a205ae6ff',
      c.pixReceiver || 'JOAO VICTOR DE',
      c.pixCity || 'Caucaia'
    );

    if (Array.isArray(initial.angels)) {
      const insertAngel = db.prepare(`
        INSERT OR IGNORE INTO angels (id, name, amount, badge, image, icon)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const a of initial.angels) {
        insertAngel.run(a.id, a.name, a.amount, a.badge || null, a.image || null, a.icon || null);
      }
    }

    if (Array.isArray(initial.donations)) {
      const insertDonation = db.prepare(`
        INSERT INTO donations (id, donor, initials, amount, time_str, message, anonymous, verified, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const d of initial.donations) {
        insertDonation.run(
          d.id,
          d.donor,
          d.initials,
          d.amount,
          d.time,
          d.message || '',
          d.anonymous ? 1 : 0,
          d.verified ? 1 : 0,
          new Date().toISOString()
        );
      }
    }

    console.log('✅ Dados de campaign.json migrados com sucesso para natal.db!');
  } catch (err) {
    console.error('Erro na migração inicial para SQLite:', err);
  }
}

// Helper de formatação de data
function formatCurrentTime() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `Hoje, às ${h}:${m}`;
}

// 1. Obter Estatísticas da Campanha
function getCampaignStats() {
  const row = db.prepare('SELECT * FROM campaign_stats WHERE id = 1').get();
  if (!row) return null;
  return {
    title: row.title,
    subtitle: row.subtitle,
    targetAmount: row.target_amount,
    currentAmount: row.current_amount,
    targetBaskets: row.target_baskets,
    currentBaskets: row.current_baskets,
    beneficiaries: row.beneficiaries,
    pixKey: row.pix_key,
    pixReceiver: row.pix_receiver,
    pixCity: row.pix_city
  };
}

// 2. Obter Doações Recentes
function getDonations(limit = 20) {
  const rows = db.prepare(`
    SELECT id, donor, initials, amount, time_str as time, message, anonymous, verified, created_at
    FROM donations
    ORDER BY id DESC
    LIMIT ?
  `).all(limit);

  return rows.map(r => ({
    ...r,
    anonymous: Boolean(r.anonymous),
    verified: Boolean(r.verified)
  }));
}

// 3. Obter Anjos / Benfeitores
function getAngels() {
  return db.prepare('SELECT * FROM angels ORDER BY amount DESC').all();
}

// 4. Registrar Cobrança PIX Gerada (Pendente)
function createCharge({ id, asaasPaymentId, amount, donorName, donorEmail, message, anonymous, pixCode, pixQrUrl }) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO charges (id, asaas_payment_id, amount, donor_name, donor_email, message, anonymous, status, pix_code, pix_qr_url, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?)
  `).run(
    id,
    asaasPaymentId || null,
    amount,
    donorName || 'Doador Anônimo',
    donorEmail || null,
    message || null,
    anonymous ? 1 : 0,
    pixCode || null,
    pixQrUrl || null,
    now,
    now
  );
}

// 5. Consultar Status de uma Cobrança
function getCharge(id) {
  return db.prepare('SELECT * FROM charges WHERE id = ? OR asaas_payment_id = ?').get(id, id);
}

// 6. Confirmação Segura de Pagamento (Transação Atômica com Idempotência)
function confirmPayment({ paymentId, amount, donorName, message, anonymous, eventId, rawPayload }) {
  // Idempotência: se o evento já foi processado pelo webhook, ignora silenciosamente
  if (eventId) {
    const existing = db.prepare('SELECT id FROM webhook_events WHERE id = ?').get(eventId);
    if (existing) {
      console.log(`ℹ️ Evento ${eventId} já processado anteriormente. Ignorando.`);
      return { duplicate: true };
    }
  }

  const now = new Date().toISOString();
  const timeStr = formatCurrentTime();
  const names = (donorName || '').trim().split(' ');
  let initials = 'DA';
  if (!anonymous && names.length >= 2) {
    initials = (names[0][0] + names[names.length - 1][0]).toUpperCase();
  } else if (!anonymous && names.length === 1 && names[0]) {
    initials = names[0].substring(0, 2).toUpperCase();
  }

  // Bloco Transacional ACID
  db.exec('BEGIN TRANSACTION');
  try {
    // 1. Atualiza status da cobrança
    if (paymentId) {
      db.prepare(`
        UPDATE charges
        SET status = 'RECEIVED', updated_at = ?
        WHERE id = ? OR asaas_payment_id = ?
      `).run(now, paymentId, paymentId);
    }

    // 2. Insere a doação confirmada
    const insertDonation = db.prepare(`
      INSERT INTO donations (charge_id, donor, initials, amount, time_str, message, anonymous, verified, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);
    const donationRes = insertDonation.run(
      paymentId || null,
      anonymous ? 'Doador Anônimo' : (donorName || 'Doador Solidário'),
      anonymous ? 'DA' : initials,
      amount,
      timeStr,
      message || 'Doação realizada com sucesso!',
      anonymous ? 1 : 0,
      now
    );

    // 3. Atualiza os totais da campanha
    const addedBaskets = Math.floor(amount / 100);
    const addedBeneficiaries = addedBaskets * 4;

    db.prepare(`
      UPDATE campaign_stats
      SET current_amount = current_amount + ?,
          current_baskets = current_baskets + ?,
          beneficiaries = beneficiaries + ?
      WHERE id = 1
    `).run(amount, addedBaskets, addedBeneficiaries);

    // 4. Registra log do webhook para auditoria
    if (eventId) {
      db.prepare(`
        INSERT INTO webhook_events (id, event_type, payment_id, payload, processed_at)
        VALUES (?, 'PAYMENT_RECEIVED', ?, ?, ?)
      `).run(eventId, paymentId || '', JSON.stringify(rawPayload || {}), now);
    }

    db.exec('COMMIT');

    return {
      success: true,
      donationId: donationRes.lastInsertRowid,
      campaign: getCampaignStats()
    };
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('❌ Erro na transação de pagamento:', err);
    throw err;
  }
}

// 7. Adicionar Doação Manual Direta
function addManualDonation({ donor, initials, amount, message, anonymous }) {
  return confirmPayment({
    paymentId: `MANUAL_${Date.now()}`,
    amount,
    donorName: donor,
    message,
    anonymous
  });
}

module.exports = {
  db,
  getCampaignStats,
  getDonations,
  getAngels,
  createCharge,
  getCharge,
  confirmPayment,
  addManualDonation
};

