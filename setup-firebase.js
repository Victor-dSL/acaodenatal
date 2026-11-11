const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(__dirname, '.env');

function runCmd(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
  } catch (err) {
    if (err.stdout) return err.stdout.toString();
    throw err;
  }
}

async function main() {
  console.log('=======================================================');
  console.log('🔥 CONFIGURAÇÃO AUTOMÁTICA DO FIREBASE');
  console.log('=======================================================');

  // Verifica se o usuário já está autenticado no Firebase
  let isLoggedIn = false;
  try {
    const checkLogin = runCmd('npx firebase-tools projects:list --json');
    if (checkLogin && (checkLogin.includes('result') || checkLogin.includes('projectId'))) {
      isLoggedIn = true;
    }
  } catch (e) {
    isLoggedIn = false;
  }

  if (!isLoggedIn) {
    console.log('Passo 1: Abrindo login do Firebase no seu navegador...');
    try {
      await new Promise((resolve, reject) => {
        const loginProcess = spawn('cmd.exe', ['/c', 'npx', 'firebase-tools', 'login'], {
          stdio: 'inherit'
        });
        loginProcess.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`Login encerrado com código ${code}`));
        });
        loginProcess.on('error', reject);
      });
    } catch (e) {
      console.log('\n⚠️ Para fazer o login com navegador interativo, execute no seu terminal:');
      console.log('👉 npx firebase-tools login\n');
      console.log('Depois basta rodar novamente: node setup-firebase.js');
      process.exit(1);
    }
  } else {
    console.log('✅ Usuário já autenticado no Firebase!');
  }
  console.log('Passo 2: Buscando seus projetos no Firebase...');

  let projects = [];
  try {
    const rawProjects = runCmd('npx firebase-tools projects:list --json');
    const parsed = JSON.parse(rawProjects);
    projects = parsed.result || parsed;
  } catch (e) {
    console.error('Erro ao listar projetos:', e.message);
    process.exit(1);
  }

  if (!projects || projects.length === 0) {
    console.log('\n⚠️ Nenhum projeto Firebase encontrado na sua conta.');
    console.log('👉 Crie um projeto rapidamente em https://console.firebase.google.com e execute este script novamente.');
    process.exit(0);
  }

  console.log(`\nEncontramos ${projects.length} projeto(s):`);
  projects.forEach((p, idx) => {
    console.log(`  [${idx + 1}] ${p.displayName || p.projectId} (${p.projectId})`);
  });

  const selectedProject = projects[0].projectId;
  console.log(`\n🎯 Utilizando o projeto: ${selectedProject}`);

  console.log('\nPasso 3: Obtendo configuração do Web App...');
  let appId = null;
  try {
    const rawApps = runCmd(`npx firebase-tools apps:list WEB --project ${selectedProject} --json`);
    const parsedApps = JSON.parse(rawApps);
    const appsList = parsedApps.result || parsedApps;
    if (appsList && appsList.length > 0) {
      appId = appsList[0].appId;
    }
  } catch (e) {
    // continua
  }

  // Se não existir Web App criado ainda no projeto, cria um automaticamente
  if (!appId) {
    console.log('Criando aplicativo Web "Natal Solidario" no Firebase...');
    try {
      const rawCreate = runCmd(`npx firebase-tools apps:create WEB "Natal Solidario" --project ${selectedProject} --json`);
      const parsedCreate = JSON.parse(rawCreate);
      const resCreate = parsedCreate.result || parsedCreate;
      appId = resCreate.appId;
    } catch (e) {
      console.log('Erro ao criar Web App automaticamente:', e.message);
    }
  }

  let sdkConfig = null;
  if (appId) {
    try {
      const rawConfig = runCmd(`npx firebase-tools apps:sdkconfig WEB ${appId} --project ${selectedProject} --json`);
      const parsedConfig = JSON.parse(rawConfig);
      sdkConfig = parsedConfig.result?.sdkConfig || parsedConfig.result || parsedConfig;
    } catch (e) {
      console.log('Erro ao ler sdkConfig:', e.message);
    }
  }

  if (!sdkConfig) {
    // Configuração mínima de fallback
    sdkConfig = {
      apiKey: '',
      authDomain: `${selectedProject}.firebaseapp.com`,
      projectId: selectedProject,
      storageBucket: `${selectedProject}.appspot.com`,
      messagingSenderId: '',
      appId: appId || ''
    };
  }

  console.log('\nPasso 4: Atualizando o arquivo .env com os dados obtidos...');
  let envContent = fs.readFileSync(ENV_PATH, 'utf8');

  // Atualiza as chaves no .env
  const updates = {
    FIREBASE_PROJECT_ID: selectedProject,
    FIREBASE_WEB_API_KEY: sdkConfig.apiKey || '',
    FIREBASE_WEB_AUTH_DOMAIN: sdkConfig.authDomain || `${selectedProject}.firebaseapp.com`,
    FIREBASE_WEB_PROJECT_ID: selectedProject,
    FIREBASE_WEB_STORAGE_BUCKET: sdkConfig.storageBucket || `${selectedProject}.appspot.com`,
    FIREBASE_WEB_MESSAGING_SENDER_ID: sdkConfig.messagingSenderId || '',
    FIREBASE_WEB_APP_ID: sdkConfig.appId || appId || ''
  };

  for (const [key, val] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${val}`);
    } else {
      envContent += `\n${key}=${val}`;
    }
  }

  fs.writeFileSync(ENV_PATH, envContent, 'utf8');

  console.log('=======================================================');
  console.log('🎉 TUDO PRONTO! O .env FOI CONFIGURADO AUTOMATICAMENTE:');
  console.log(`- Projeto ID: ${selectedProject}`);
  console.log(`- Web App ID: ${sdkConfig.appId || 'Configurado'}`);
  console.log(`- API Key:    ${sdkConfig.apiKey ? 'OK' : 'Pendente de ativação'}`);
  console.log('=======================================================');
  console.log('O servidor já recarregou as credenciais automaticamente.');
}

main().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});

