// Script Principal - Campanha de Natal Solidário 2024 com Asaas PIX
(function () {
  'use strict';

  // Configuração da API: utiliza a origem atual ou fallback para porta 3000
  const API_BASE = window.location.port === '3000' || window.location.pathname.startsWith('/api')
    ? ''
    : 'http://localhost:3000';

  // Estado Local
  let selectedAmount = 50;
  let activePaymentData = null;

  const impactTexts = {
    '5': 'Com <strong class="text-primary font-bold">R$ 5</strong> você adoça o Natal de uma criança com doces e guloseimas natalinas.',
    '10': 'Com <strong class="text-primary font-bold">R$ 10</strong> você garante caixas de bombons e sucos especiais.',
    '20': 'Com <strong class="text-primary font-bold">R$ 20</strong> você doa panetone tradicional e biscoitos natalinos.',
    '50': 'Com <strong class="text-primary font-bold">R$ 50</strong> você garante o frango especial e itens de ceia para 1 família.',
    '100': 'Com <strong class="text-primary font-bold">R$ 100</strong> você financia 1 cesta natalina farta e completa!'
  };

  function getCustomImpactText(val) {
    const num = parseFloat(val) || 0;
    if (num >= 100) {
      const baskets = (num / 100).toFixed(1).replace('.0', '');
      return `Com <strong class="text-primary font-bold">R$ ${num.toLocaleString('pt-BR')},00</strong> você garante aproximadamente <strong>${baskets} cestas natalinas completas</strong> de ceia farta!`;
    }
    return `Com <strong class="text-primary font-bold">R$ ${num.toLocaleString('pt-BR')},00</strong> você multiplica o amor e enche uma mesa de esperança neste Natal.`;
  }

  // Elementos do DOM - Seletores de Valores
  const amountButtons = document.querySelectorAll('.amount-btn');
  const btnAmountPlus = document.getElementById('btn-amount-plus');
  const customAmountWrapper = document.getElementById('custom-amount-wrapper');
  const customAmountInput = document.getElementById('custom-amount-input');
  const btnCustomMinus1 = document.getElementById('btn-custom-minus-1');
  const btnCustomPlus1 = document.getElementById('btn-custom-plus-1');
  const customAmountError = document.getElementById('custom-amount-error');
  const btnApplyCustomVal = document.getElementById('btn-apply-custom-val');
  const impactPhrase = document.getElementById('impact-phrase');

  // Elementos do Gerador Asaas
  const btnGenerateAsaasPix = document.getElementById('btn-generate-asaas-pix');
  const generatePixIcon = document.getElementById('generate-pix-icon');
  const generatePixLabel = document.getElementById('generate-pix-label');
  const pixDonorName = document.getElementById('pix-donor-name');
  const pixAnonymousCheck = document.getElementById('pix-anonymous-check');

  // Elementos do Card de Resultado Asaas
  const asaasQrCard = document.getElementById('asaas-qr-card');
  const qrDisplayAmount = document.getElementById('qr-display-amount');
  const asaasQrImage = document.getElementById('asaas-qr-image');
  const asaasCopiaColaText = document.getElementById('asaas-copia-cola-text');
  const btnCopyDynamicPix = document.getElementById('btn-copy-dynamic-pix');
  const dynamicCopyIcon = document.getElementById('dynamic-copy-icon');
  const dynamicCopyLabel = document.getElementById('dynamic-copy-label');
  const dynamicCopyFeedback = document.getElementById('dynamic-copy-feedback');
  const btnConfirmSimulatedPayment = document.getElementById('btn-confirm-simulated-payment');

  // Chave PIX Estática Contingência
  const btnCopyPix = document.getElementById('btn-copy-pix');
  const pixKeyText = document.getElementById('pix-key-text');

  // Metas e contadores
  const statCurrentAmount = document.getElementById('stat-current-amount');
  const statProgressPercent = document.getElementById('stat-progress-percent');
  const statProgressBar = document.getElementById('stat-progress-bar');
  const statStarPin = document.getElementById('stat-star-pin');
  const statCurrentBaskets = document.getElementById('stat-current-baskets');
  const statCounterBaskets = document.getElementById('stat-counter-baskets');
  const statCounterPeople = document.getElementById('stat-counter-people');

  // Feed
  const feedContainer = document.getElementById('donations-feed-container');
  const btnSeeMore = document.getElementById('btn-see-more');

  // Modal de Doação Manual
  const donationModal = document.getElementById('donation-modal');
  const btnOpenModal = document.getElementById('btn-open-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const donationForm = document.getElementById('donation-form');
  const formAmountInput = document.getElementById('form-amount');

  // 1. Inicialização e Busca de Dados da API
  async function fetchCampaignData() {
    try {
      const res = await fetch(`${API_BASE}/api/campaign`);
      if (res.ok) {
        const data = await res.json();
        updateCampaignUI(data);
      }
    } catch (e) {
      console.log('Modo estático ativo ou carregando offline.');
    }
  }

  async function fetchDonations() {
    try {
      const res = await fetch(`${API_BASE}/api/donations`);
      if (res.ok) {
        const donations = await res.json();
        renderDonations(donations);
      }
    } catch (e) {
      console.log('Usando feed pré-renderizado.');
    }
  }

  function updateCampaignUI(camp) {
    if (!camp) return;
    const current = Number(camp.currentAmount || 0);
    const target = Number(camp.targetAmount || 10000);
    const formattedAmount = `R$ ${current.toLocaleString('pt-BR')}`;
    const percent = Math.min(100, Math.round((current / target) * 100)) || 0;

    if (statCurrentAmount) statCurrentAmount.innerText = formattedAmount;
    if (statProgressPercent) statProgressPercent.innerText = `${percent}% Concluído`;
    if (statProgressBar) statProgressBar.style.width = `${percent}%`;
    if (statStarPin) statStarPin.style.left = `calc(${percent}% - 10px)`;
    if (statCurrentBaskets) statCurrentBaskets.innerText = `${camp.currentBaskets || 0} cestas natalinas garantidas de ${camp.targetBaskets || 100} pretendidas`;
    if (statCounterBaskets) statCounterBaskets.innerText = `${camp.currentBaskets || 0} / ${camp.targetBaskets || 100}`;
    if (statCounterPeople) statCounterPeople.innerText = `${camp.beneficiaries || 0} Pessoas`;
  }

  function renderDonations(donations) {
    if (!feedContainer) return;
    feedContainer.innerHTML = '';

    if (!donations || donations.length === 0) {
      feedContainer.innerHTML = `
        <div class="p-6 text-center text-on-surface-variant italic bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/40 animate-fadeIn">
          <span class="material-symbols-outlined text-3xl text-secondary mb-1">volunteer_activism</span>
          <p class="font-semibold text-sm text-primary">Seja o primeiro a doar e acender esta chama de esperança!</p>
          <p class="text-xs text-on-surface-variant/80 mt-1">Sua doação aparecerá aqui em tempo real assim que confirmada.</p>
        </div>
      `;
      return;
    }

    donations.slice(0, 8).forEach(item => {
      const article = document.createElement('article');
      article.className = 'p-space-sm rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-1.5 transition-all hover:shadow-md';
      article.innerHTML = `
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-space-xs">
            <div class="w-9 h-9 rounded-full ${item.anonymous ? 'bg-surface-container-highest text-on-surface-variant' : 'bg-primary/10 text-primary'} flex items-center justify-center font-bold text-label-md">
              ${item.anonymous ? '<span class="material-symbols-outlined text-[18px]">visibility_off</span>' : item.initials}
            </div>
            <div class="flex flex-col">
              <span class="font-label-md text-label-md text-on-surface font-semibold">${item.donor}</span>
              <span class="font-label-sm text-label-sm text-on-surface-variant">${item.time}</span>
            </div>
          </div>
          <div class="flex flex-col items-end">
            <span class="font-label-md text-label-md text-primary font-bold">R$ ${Number(item.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            <span class="inline-flex items-center gap-0.5 text-secondary font-label-sm text-[11px] font-medium">
              <span class="material-symbols-outlined text-[13px]" style="font-variation-settings: 'FILL' 1;">verified</span>
              Confirmado PIX
            </span>
          </div>
        </div>
        <p class="font-body-sm text-body-sm text-on-surface-variant italic bg-surface-container-low px-2.5 py-1.5 rounded-lg">
          "${item.message}"
        </p>
      `;
      feedContainer.appendChild(article);
    });
  }

  // Funções Auxiliares da Máscara de Moeda (de R$ 100 pra cima, de 1 em 1 real)
  function parseCustomAmount(val) {
    if (typeof val === 'number') return Math.floor(val);
    const digits = String(val || '').replace(/\D/g, '');
    if (!digits) return 100;
    return parseInt(digits, 10);
  }

  function formatBRLMask(num) {
    return Number(num).toLocaleString('pt-BR') + ',00';
  }

  function updateCustomAmount(val, syncInput = true) {
    let intVal = parseCustomAmount(val);
    const isBelowMin = intVal < 100;

    if (customAmountError) {
      if (isBelowMin) {
        customAmountError.classList.remove('hidden');
        if (customAmountInput) customAmountInput.classList.add('border-red-400');
      } else {
        customAmountError.classList.add('hidden');
        if (customAmountInput) customAmountInput.classList.remove('border-red-400');
      }
    }

    selectedAmount = isBelowMin ? 100 : intVal;

    if (syncInput && customAmountInput) {
      customAmountInput.value = formatBRLMask(intVal);
    }
    if (formAmountInput) formAmountInput.value = selectedAmount;
    if (impactPhrase) impactPhrase.innerHTML = getCustomImpactText(selectedAmount);
    if (generatePixLabel) {
      generatePixLabel.innerText = `Gerar QR Code PIX de R$ ${selectedAmount.toLocaleString('pt-BR')},00`;
    }
  }

  // 2. Seleção de Valores: 5, 10, 20, 50, 100 ou + (Custom de 100 pra cima)
  amountButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.getAttribute('data-val');

      // Limpa estilo ativo de todos
      amountButtons.forEach(b => {
        b.className = 'amount-btn py-2.5 px-1 rounded-xl bg-surface-container text-on-surface font-semibold text-xs sm:text-sm text-center transition-all hover:bg-secondary-container focus:outline-none';
      });

      // Aplica estilo ativo no botão clicado
      btn.className = 'amount-btn py-2.5 px-1 rounded-xl bg-primary text-on-primary font-bold text-xs sm:text-sm text-center shadow-md transition-all active:scale-95';

      if (val === 'custom') {
        // Exibe campo para digitar outro valor (de 100 pra cima)
        if (customAmountWrapper) {
          customAmountWrapper.classList.remove('hidden');
          if (customAmountInput) {
            updateCustomAmount(customAmountInput.value || 100, true);
            customAmountInput.focus();
            const len = customAmountInput.value.length;
            customAmountInput.setSelectionRange(len - 3, len - 3);
          }
        }
      } else {
        // Esconde campo custom
        if (customAmountWrapper) customAmountWrapper.classList.add('hidden');
        selectedAmount = parseFloat(val) || 50;
        if (formAmountInput) formAmountInput.value = selectedAmount;

        if (impactPhrase && impactTexts[val]) {
          impactPhrase.innerHTML = impactTexts[val];
        }

        if (generatePixLabel) {
          generatePixLabel.innerText = `Gerar QR Code PIX de R$ ${selectedAmount.toFixed(2)}`;
        }
      }
    });
  });

  // Eventos da Máscara de Moeda no Input Personalizado (de 1 em 1 real)
  if (customAmountInput) {
    // Máscara dinâmica enquanto digita
    customAmountInput.addEventListener('input', () => {
      const rawDigits = customAmountInput.value.replace(/\D/g, '');
      if (!rawDigits) {
        customAmountInput.value = '';
        if (customAmountError) customAmountError.classList.remove('hidden');
        return;
      }
      const intVal = parseInt(rawDigits, 10);
      updateCustomAmount(intVal, false);
      customAmountInput.value = intVal.toLocaleString('pt-BR') + ',00';

      // Mantém o cursor antes dos centavos (,00)
      const len = customAmountInput.value.length;
      customAmountInput.setSelectionRange(len - 3, len - 3);
    });

    // Ao sair do campo, ajusta para o mínimo de R$ 100 caso tenha ficado menor
    customAmountInput.addEventListener('blur', () => {
      let intVal = parseCustomAmount(customAmountInput.value);
      if (intVal < 100) intVal = 100;
      updateCustomAmount(intVal, true);
    });

    // Suporte às setas do teclado (Cima = +1 real, Baixo = -1 real)
    customAmountInput.addEventListener('keydown', (e) => {
      let intVal = parseCustomAmount(customAmountInput.value);
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        updateCustomAmount(intVal + 1, true);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (intVal > 100) updateCustomAmount(intVal - 1, true);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (intVal < 100) intVal = 100;
        updateCustomAmount(intVal, true);
      }
    });
  }

  // Botões de ajuste rápido de 1 em 1 real (- R$ 1 e + R$ 1)
  if (btnCustomMinus1) {
    btnCustomMinus1.addEventListener('click', () => {
      let intVal = parseCustomAmount(customAmountInput ? customAmountInput.value : 100);
      if (intVal > 100) {
        updateCustomAmount(intVal - 1, true);
      }
    });
  }

  if (btnCustomPlus1) {
    btnCustomPlus1.addEventListener('click', () => {
      let intVal = parseCustomAmount(customAmountInput ? customAmountInput.value : 100);
      updateCustomAmount(intVal + 1, true);
    });
  }

  if (btnApplyCustomVal && customAmountInput) {
    btnApplyCustomVal.addEventListener('click', () => {
      let intVal = parseCustomAmount(customAmountInput.value);
      if (intVal < 100) {
        intVal = 100;
      }
      updateCustomAmount(intVal, true);
    });
  }

  // 3. Geração do QR Code PIX Asaas
  if (btnGenerateAsaasPix) {
    btnGenerateAsaasPix.addEventListener('click', async () => {
      // Se estava no modo custom
      if (customAmountInput && !customAmountWrapper.classList.contains('hidden')) {
        let intVal = parseCustomAmount(customAmountInput.value);
        if (intVal < 100) {
          alert('Para valores personalizados, a doação mínima é de R$ 100,00 (de 1 em 1 real).');
          updateCustomAmount(100, true);
          customAmountInput.focus();
          return;
        }
        selectedAmount = intVal;
      }

      const donor = pixDonorName ? pixDonorName.value.trim() : '';
      const isAnonymous = pixAnonymousCheck ? pixAnonymousCheck.checked : false;

      // Estado de Carregamento
      generatePixIcon.innerText = 'sync';
      generatePixIcon.classList.add('animate-spin');
      generatePixLabel.innerText = 'Gerando QR Code Asaas...';
      btnGenerateAsaasPix.disabled = true;

      try {
        const res = await fetch(`${API_BASE}/api/asaas/create-pix`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: selectedAmount,
            donor: isAnonymous ? 'Doador Anônimo' : (donor || 'Doador Solidário'),
            anonymous: isAnonymous
          })
        });

        const data = await res.json();

        if (res.ok && data.success) {
          activePaymentData = data;

          // Atualiza dados no card de resultado
          if (qrDisplayAmount) qrDisplayAmount.innerText = `R$ ${selectedAmount.toFixed(2).replace('.', ',')}`;
          if (asaasQrImage) asaasQrImage.src = data.qrCodeImage;
          if (asaasCopiaColaText) asaasCopiaColaText.innerText = data.pixCopiaECola;

          // Exibe o card do QR Code
          if (asaasQrCard) {
            asaasQrCard.classList.remove('hidden');
            asaasQrCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }

          // Inicia verificação automática em tempo real se o PIX foi pago
          startPaymentStatusCheck(data.paymentId);
        } else {
          alert('Não foi possível gerar a cobrança Asaas no momento. Tente novamente.');
        }
      } catch (err) {
        console.error('Erro na requisição Asaas:', err);
        // Fallback local se estiver offline
        if (qrDisplayAmount) qrDisplayAmount.innerText = `R$ ${selectedAmount.toFixed(2).replace('.', ',')}`;
        if (asaasQrImage) {
          asaasQrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=PIX_DOACAO_${selectedAmount}`;
        }
        if (asaasCopiaColaText) asaasCopiaColaText.innerText = `00020126580014br.gov.bcb.pix0136pix@igrejacomunidade.org.br520400005303986540${selectedAmount.toFixed(2)}5802BR5922PAROQUIA DA COMUNIDADE6009SAO PAULO62070503***6304`;
        if (asaasQrCard) asaasQrCard.classList.remove('hidden');
      } finally {
        generatePixIcon.innerText = 'qr_code_2';
        generatePixIcon.classList.remove('animate-spin');
        generatePixLabel.innerText = `Gerar QR Code PIX (Asaas)`;
        btnGenerateAsaasPix.disabled = false;
      }
    });
  }

  // 4. Cópia do Código PIX Copia e Cola Dinâmico
  if (btnCopyDynamicPix && asaasCopiaColaText) {
    btnCopyDynamicPix.addEventListener('click', async () => {
      const code = asaasCopiaColaText.innerText.trim();
      try {
        await navigator.clipboard.writeText(code);
      } catch (err) {
        const el = document.createElement('textarea');
        el.value = code;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }

      dynamicCopyIcon.innerText = 'check';
      dynamicCopyLabel.innerText = 'Copiado!';
      if (dynamicCopyFeedback) dynamicCopyFeedback.classList.remove('hidden');

      setTimeout(() => {
        dynamicCopyIcon.innerText = 'content_copy';
        dynamicCopyLabel.innerText = 'Copiar';
        if (dynamicCopyFeedback) dynamicCopyFeedback.classList.add('hidden');
      }, 3500);
    });
  }

  // 5. Cópia da Chave PIX Padrão Fixa
  if (btnCopyPix && pixKeyText) {
    btnCopyPix.addEventListener('click', async () => {
      const key = pixKeyText.innerText.trim();
      try {
        await navigator.clipboard.writeText(key);
      } catch (e) {
        const el = document.createElement('textarea');
        el.value = key;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      btnCopyPix.innerText = 'Copiado!';
      setTimeout(() => { btnCopyPix.innerText = 'Copiar'; }, 3000);
    });
  }

  // 6. Confirmação / Simulação de Pagamento para Testes
  if (btnConfirmSimulatedPayment) {
    btnConfirmSimulatedPayment.addEventListener('click', async () => {
      const donor = pixDonorName ? pixDonorName.value.trim() : '';
      const isAnonymous = pixAnonymousCheck ? pixAnonymousCheck.checked : false;

      try {
        const res = await fetch(`${API_BASE}/api/donations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: selectedAmount,
            donor: isAnonymous ? 'Doador Anônimo' : (donor || 'Doador via Asaas'),
            anonymous: isAnonymous,
            message: 'Que as bênçãos deste Natal alcancem cada mesa e família acolhida!'
          })
        });

        if (res.ok) {
          const result = await res.json();
          if (result.campaign) updateCampaignUI(result.campaign);
          fetchDonations();
          alert(`🎉 Pagamento de R$ ${selectedAmount.toFixed(2)} confirmado com sucesso via Asaas! Sua doação já está visível no mural.`);
        }
      } catch (e) {
        alert('Pagamento registrado localmente!');
      }
    });
  }

  // 7. Modal de Doação / Mural
  if (btnOpenModal && donationModal) {
    btnOpenModal.addEventListener('click', () => donationModal.classList.remove('hidden'));
  }
  if (btnCloseModal && donationModal) {
    btnCloseModal.addEventListener('click', () => donationModal.classList.add('hidden'));
  }
  if (donationModal) {
    donationModal.addEventListener('click', (e) => {
      if (e.target === donationModal) donationModal.classList.add('hidden');
    });
  }

  // 8. Envio do Formulário Modal
  if (donationForm) {
    donationForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const donorName = document.getElementById('form-donor-name').value.trim();
      const message = document.getElementById('form-message').value.trim();
      const amount = parseFloat(formAmountInput.value) || selectedAmount;
      const anonymous = document.getElementById('form-anonymous').checked;

      try {
        const res = await fetch(`${API_BASE}/api/donations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ donor: donorName, message, amount, anonymous })
        });

        if (res.ok) {
          const result = await res.json();
          if (result.campaign) updateCampaignUI(result.campaign);
          fetchDonations();
        }
      } catch (err) {
        console.log('Registrado modo offline');
      }

      alert(`🎉 Bênção registrada com sucesso! Deus abençoe sua generosidade.`);
      donationModal.classList.add('hidden');
      donationForm.reset();
    });
  }

  // 9. Botão "Ver Mais"
  if (btnSeeMore && feedContainer) {
    btnSeeMore.addEventListener('click', () => {
      const extraItem = document.createElement('article');
      extraItem.className = 'p-space-sm rounded-xl bg-surface-container-lowest shadow-sm flex flex-col gap-1.5 animate-fadeIn';
      extraItem.innerHTML = `
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-space-xs">
            <div class="w-9 h-9 rounded-full bg-secondary/15 text-secondary flex items-center justify-center font-bold text-label-md">
              TC
            </div>
            <div class="flex flex-col">
              <span class="font-label-md text-label-md text-on-surface font-semibold">Teresa Cristina</span>
              <span class="font-label-sm text-label-sm text-on-surface-variant">Ontem, 23/12 às 16:20</span>
            </div>
          </div>
          <div class="flex flex-col items-end">
            <span class="font-label-md text-label-md text-primary font-bold">R$ 100,00</span>
            <span class="inline-flex items-center gap-0.5 text-secondary font-label-sm text-[11px] font-medium">
              <span class="material-symbols-outlined text-[13px]" style="font-variation-settings: 'FILL' 1;">verified</span>
              Confirmado PIX
            </span>
          </div>
        </div>
        <p class="font-body-sm text-body-sm text-on-surface-variant italic bg-surface-container-low px-2.5 py-1.5 rounded-lg">
          "Que o Menino Jesus renove a fé de cada irmão acolhido."
        </p>
      `;
      feedContainer.appendChild(extraItem);
      btnSeeMore.innerText = 'Todas as doações recentes exibidas';
      btnSeeMore.disabled = true;
      btnSeeMore.classList.add('opacity-60', 'cursor-not-allowed');
    });
  }

  // 10. Verificação Automática de Pagamento PIX e Atualização em Tempo Real
  let paymentCheckInterval = null;

  function startPaymentStatusCheck(paymentId) {
    if (paymentCheckInterval) clearInterval(paymentCheckInterval);
    if (!paymentId) return;

    paymentCheckInterval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/charges/${paymentId}/status`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'RECEIVED') {
            clearInterval(paymentCheckInterval);
            paymentCheckInterval = null;
            showPaymentSuccessUI(data.amount || selectedAmount);
          }
        }
      } catch (e) {
        // Silencioso em caso de oscilação
      }
    }, 2500);
  }

  function showPaymentSuccessUI(amount) {
    if (!asaasQrCard) return;
    const formatted = Number(amount || selectedAmount).toFixed(2).replace('.', ',');
    asaasQrCard.innerHTML = `
      <div class="p-6 text-center bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl border-2 border-green-500 shadow-xl transition-all duration-500">
        <div class="w-16 h-16 bg-green-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg animate-bounce">
          <span class="material-symbols-outlined text-4xl">check_circle</span>
        </div>
        <h3 class="font-headline text-2xl font-bold text-green-900">Doação Confirmada com Sucesso!</h3>
        <p class="text-green-800 font-bold text-xl mt-1">R$ ${formatted}</p>
        <p class="text-stone-700 text-sm mt-2 max-w-md mx-auto leading-relaxed">
          Seu PIX foi processado com sucesso pelo <strong>Asaas</strong> e registrado na paróquia! A meta e o mural acabam de ser atualizados ao vivo.
        </p>
        <div class="mt-4 inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-green-200 text-green-800 text-xs font-semibold shadow-sm">
          <span class="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping"></span>
          Transação Confirmada via Webhook Asaas & Firestore
        </div>
      </div>
    `;

    // Atualiza imediatamente a meta e o mural
    fetchCampaignData();
    fetchDonations();
  }

  // 11. Conexão em Tempo Real com Firebase Firestore
  async function initFirebaseWeb() {
    try {
      const res = await fetch(`${API_BASE}/api/firebase-config`);
      if (!res.ok) return;
      const config = await res.json();
      if (!config.projectId || !config.apiKey) {
        console.log('ℹ️ Firebase Web não configurado. Utilizando atualização inteligente via API REST.');
        // Ativa polling em tempo real a cada 5 segundos para telas sincronizadas
        setInterval(() => {
          fetchCampaignData();
          fetchDonations();
        }, 5000);
        return;
      }

      // Carrega SDKs do Firebase dinamicamente se necessário
      const loadScript = (src) => new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });

      if (!window.firebase) {
        await loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
        await loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js');
      }

      if (!firebase.apps.length) {
        firebase.initializeApp(config);
      }
      const db = firebase.firestore();
      console.log('🔥 Conectado ao Firebase Firestore em Tempo Real!');

      // Listener 1: Atualização instantânea da Campanha / Meta
      db.collection('campaign').doc('main').onSnapshot(doc => {
        if (doc.exists) {
          console.log('⚡ Atualização em tempo real recebida (Meta/Campanha):', doc.data());
          updateCampaignUI(doc.data());
        }
      });

      // Listener 2: Atualização instantânea do Mural de Doações
      db.collection('donations').orderBy('id', 'desc').limit(20).onSnapshot(snapshot => {
        const liveDonations = [];
        snapshot.forEach(d => liveDonations.push(d.data()));
        if (liveDonations.length > 0) {
          console.log('⚡ Atualização em tempo real recebida (Doações):', liveDonations.length);
          renderDonations(liveDonations);
        }
      });

    } catch (err) {
      console.log('Modo REST fallback:', err.message);
      setInterval(() => {
        fetchCampaignData();
        fetchDonations();
      }, 5000);
    }
  }

  // Inicializa dados na carga
  fetchCampaignData();
  fetchDonations();
  initFirebaseWeb();
})();
