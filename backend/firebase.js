const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const sqliteDb = require('./db');

let firestore = null;
let isFirebaseReady = false;

// Inicialização do Firebase Admin SDK
function initFirebase() {
  if (isFirebaseReady && firestore) return firestore;

  try {
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
      path.join(__dirname, 'serviceAccountKey.json');

    // 1. Inicialização por arquivo de Service Account (Local ou montado no Cloud Run)
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      firestore = admin.firestore();
      isFirebaseReady = true;
      console.log(`🔥 Firebase Admin conectado via Service Account (${serviceAccount.project_id || 'GCP'})`);
      return firestore;
    }

    // 2. Inicialização por variáveis de ambiente individuais (.env)
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;
      if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey
        })
      });
      firestore = admin.firestore();
      isFirebaseReady = true;
      console.log(`🔥 Firebase Admin conectado via variáveis de ambiente (${process.env.FIREBASE_PROJECT_ID})`);
      return firestore;
    }

    // 3. Inicialização no Google Cloud Run (Application Default Credentials - ADC nativo)
    if (process.env.K_SERVICE || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT) {
      admin.initializeApp();
      firestore = admin.firestore();
      isFirebaseReady = true;
      console.log('🔥 Firebase Admin conectado via Google Cloud Run (ADC)');
      return firestore;
    }

    console.log('⚠️ Firebase Admin não configurado no .env (utilizando banco SQLite local para testes)');
  } catch (err) {
    console.warn('⚠️ Erro ao inicializar Firebase Admin:', err.message);
  }

  return null;
}

// Inicializa no carregamento do módulo
initFirebase();

// Sincroniza dados iniciais no Firestore se a coleção estiver vazia
async function seedFirestoreIfEmpty() {
  if (!firestore) return;
  try {
    const campaignDocRef = firestore.collection('campaign').doc('main');
    const docSnap = await campaignDocRef.get();

    if (!docSnap.exists) {
      const stats = sqliteDb.getCampaignStats();
      if (stats) {
        await campaignDocRef.set({
          ...stats,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log('🌱 Firestore: dados da campanha inicializados em campaign/main');
      }

      // Migra doações existentes
      const donations = sqliteDb.getDonations(10);
      const batch = firestore.batch();
      for (const d of donations) {
        const dRef = firestore.collection('donations').doc(String(d.id));
        batch.set(dRef, {
          ...d,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      await batch.commit();
      console.log(`🌱 Firestore: ${donations.length} doações iniciais sincronizadas`);
    }
  } catch (err) {
    console.error('Erro ao verificar/semear Firestore:', err);
  }
}

// 1. Obter Estatísticas da Campanha
async function getCampaignStats() {
  if (!firestore) return sqliteDb.getCampaignStats();

  try {
    const doc = await firestore.collection('campaign').doc('main').get();
    if (doc.exists) {
      return doc.data();
    }
  } catch (e) {
    console.error('Erro ao ler Firestore:', e);
  }
  return sqliteDb.getCampaignStats();
}

// 2. Obter Doações Recentes
async function getDonations(limitCount = 20) {
  if (!firestore) return sqliteDb.getDonations(limitCount);

  try {
    const snap = await firestore.collection('donations')
      .orderBy('id', 'desc')
      .limit(limitCount)
      .get();

    if (!snap.empty) {
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
  } catch (e) {
    console.error('Erro ao ler doações do Firestore:', e);
  }
  return sqliteDb.getDonations(limitCount);
}

// 3. Obter Anjos
async function getAngels() {
  return sqliteDb.getAngels();
}

// 4. Registrar Cobrança PIX Gerada (Pendente)
async function createCharge(chargeData) {
  // Salva no SQLite local
  sqliteDb.createCharge(chargeData);

  // Se Firestore estiver ativo, salva também no Firestore para escuta em tempo real
  if (firestore) {
    try {
      const docId = String(chargeData.asaasPaymentId || chargeData.id);
      await firestore.collection('charges').doc(docId).set({
        ...chargeData,
        status: 'PENDING',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`🔥 Cobrança PIX registrada no Firestore: charges/${docId}`);
    } catch (err) {
      console.error('Erro ao salvar cobrança no Firestore:', err);
    }
  }
}

// 5. Consultar Status de Cobrança
async function getCharge(id) {
  if (firestore) {
    try {
      const docSnap = await firestore.collection('charges').doc(String(id)).get();
      if (docSnap.exists) {
        return docSnap.data();
      }
    } catch (e) {
      console.error('Erro ao consultar cobrança no Firestore:', e);
    }
  }
  return sqliteDb.getCharge(id);
}

// 6. Confirmação Segura de Pagamento (Transação Atômica Asaas Webhook -> Firestore)
async function confirmPayment({ paymentId, amount, donorName, message, anonymous, eventId, rawPayload }) {
  // 1. Confirma no banco SQLite local
  const localResult = sqliteDb.confirmPayment({
    paymentId,
    amount,
    donorName,
    message,
    anonymous,
    eventId,
    rawPayload
  });

  if (localResult && localResult.duplicate) {
    return { duplicate: true };
  }

  // 2. Sincroniza em transação atômica no Firestore
  if (firestore) {
    try {
      const now = new Date();
      const timeStr = `Hoje, às ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const docChargeId = String(paymentId);
      const donationId = String(Date.now());

      const names = (donorName || '').trim().split(' ');
      let initials = 'DA';
      if (!anonymous && names.length >= 2) {
        initials = (names[0][0] + names[names.length - 1][0]).toUpperCase();
      } else if (!anonymous && names.length === 1 && names[0]) {
        initials = names[0].substring(0, 2).toUpperCase();
      }

      const addedBaskets = Math.floor(amount / 100);
      const addedBeneficiaries = addedBaskets * 4;

      const batch = firestore.batch();

      // a) Atualiza status da cobrança
      const chargeRef = firestore.collection('charges').doc(docChargeId);
      batch.set(chargeRef, {
        status: 'RECEIVED',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      // b) Adiciona documento da doação confirmada
      const donationRef = firestore.collection('donations').doc(donationId);
      batch.set(donationRef, {
        id: Number(donationId),
        chargeId: docChargeId,
        donor: anonymous ? 'Doador Anônimo' : (donorName || 'Doador Solidário'),
        initials: anonymous ? 'DA' : initials,
        amount: Number(amount),
        time: timeStr,
        message: message || 'Que Deus abençoe essa causa!',
        anonymous: Boolean(anonymous),
        verified: true,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      // c) Incrementa atômico na campanha principal
      const campaignRef = firestore.collection('campaign').doc('main');
      batch.update(campaignRef, {
        currentAmount: admin.firestore.FieldValue.increment(Number(amount)),
        currentBaskets: admin.firestore.FieldValue.increment(addedBaskets),
        beneficiaries: admin.firestore.FieldValue.increment(addedBeneficiaries),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // d) Registra log do webhook
      if (eventId) {
        const eventRef = firestore.collection('webhook_events').doc(String(eventId));
        batch.set(eventRef, {
          eventId: String(eventId),
          paymentId: docChargeId,
          amount: Number(amount),
          processedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      await batch.commit();
      console.log(`🔥 Doação de R$ ${amount} propagada em tempo real no Firestore!`);
    } catch (err) {
      console.error('Erro ao propagar pagamento no Firestore:', err);
    }
  }

  return localResult;
}

// 7. Retorna configuração Web do Firebase para o Frontend
function getFirebaseWebConfig() {
  return {
    apiKey: process.env.FIREBASE_WEB_API_KEY || '',
    authDomain: process.env.FIREBASE_WEB_AUTH_DOMAIN || '',
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.FIREBASE_WEB_PROJECT_ID || '',
    storageBucket: process.env.FIREBASE_WEB_STORAGE_BUCKET || '',
    messagingSenderId: process.env.FIREBASE_WEB_MESSAGING_SENDER_ID || '',
    appId: process.env.FIREBASE_WEB_APP_ID || ''
  };
}

module.exports = {
  initFirebase,
  seedFirestoreIfEmpty,
  getCampaignStats,
  getDonations,
  getAngels,
  createCharge,
  getCharge,
  confirmPayment,
  getFirebaseWebConfig,
  isConfigured: () => Boolean(firestore && isFirebaseReady)
};

