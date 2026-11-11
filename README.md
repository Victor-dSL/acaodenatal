# 🎄 Campanha de Natal Solidário - Natal de Esperança

Projeto estruturado com separação clara de responsabilidades entre **Front-end** e **Back-end**, com design 100% responsivo para dispositivos móveis, tablets e computadores.

---

## 📁 Estrutura do Projeto

```text
landpage natal/
├── frontend/
│   ├── index.html        # Página responsiva (Mobile, Tablet, Desktop)
│   ├── css/
│   │   └── style.css     # Estilos visuais, glassmorphism e animações
│   └── js/
│       └── app.js        # Lógica de interação, PIX, feed e conexão com API
│
├── backend/
│   ├── package.json      # Metadados e scripts do projeto Node.js
│   ├── server.js         # Servidor HTTP REST API e estático (porta 3000)
│   └── data/
│       └── campaign.json # Armazenamento de dados da campanha e doações
│
├── index.html            # Redirecionador raiz
└── README.md             # Instruções de execução e documentação
```

---

## 🚀 Como Executar

### 1. Iniciar o Back-end (com API REST e Front-end integrado)
No terminal, entre na pasta `backend` e execute:
```powershell
cd "C:\Users\JOAOLIMA0378\Desktop\landpage natal\backend"
node server.js
```
O servidor estará ativo em:
👉 **http://localhost:3000**

Ele já serve os arquivos do `frontend/` e expõe as rotas de API:
- `GET /api/campaign` (dados da meta, arrecadação e cestas)
- `GET /api/donations` (lista de doações recentes)
- `POST /api/donations` (adicionar nova doação com atualização em tempo real)
- `GET /api/angels` (doadores em destaque)

---

### 2. Acesso Direto ao Front-end
Você também pode abrir o front-end diretamente pelo arquivo:
`C:\Users\JOAOLIMA0378\Desktop\landpage natal\frontend\index.html` ou pelo servidor ativo na porta 8000:
👉 **http://localhost:8000**

---

## 📱 Responsividade Implementada
- **Mobile (< 640px):** Menu inferior fixo (*bottom bar*), cards em coluna única com botões de toque confortável (mínimo 44px) e fluxo rápido de PIX.
- **Tablet (640px - 1023px):** Grid de 8 colunas, cards de Anjos de Esperança em 3 colunas e espaçamento equilibrado.
- **Desktop (1024px+):** Layout completo em grid de 12 colunas, navegação no cabeçalho (*header* fixo), seção principal em 2 colunas (narrativa e impacto à esquerda, card de doação fixo à direita) e feed integrado com transparência paroquial.

