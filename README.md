# 🛰️ SENTINEL.SYS - Network Monitoring Dashboard

**Sentinel** é um dashboard de monitoramento em tempo real projetado para acompanhar a disponibilidade e a latência de serviços web. Com uma interface futurista e minimalista, ele combina um backend robusto em Python com um frontend dinâmico e responsivo.

![Sentinel Preview](https://raw.githubusercontent.com/seu-usuario/seu-repositorio/main/screenshot.png) *(Substitua pela URL da sua imagem após o upload)*

## 🚀 Funcionalidades

- **Monitoramento Duplo:** Acompanha latência de aplicação (HTTP) e latência de rede (PING) simultaneamente.
- **Interface Futurista:** Design baseado em estética "Cyberpunk/Sci-Fi" com suporte nativo a Temas Escuro e Claro.
- **Gráficos Interativos:** Visualização histórica detalhada de performance usando Chart.js ao clicar em cada card.
- **Gestão de Sites:** Adicione novos serviços para monitoramento em tempo real através da interface.
- **Responsividade Total:** Adaptado para visualização em desktops e dispositivos móveis.

## 🛠️ Tecnologias Utilizadas

### Backend
- **Python 3.10+**
- **FastAPI:** Framework web moderno e de alta performance.
- **Httpx:** Cliente HTTP assíncrono para verificações rápidas.
- **Uvicorn:** Servidor ASGI para rodar a aplicação.

### Frontend
- **HTML5 & CSS3:** Estilização vanilla com variáveis CSS e animações avançadas.
- **JavaScript (ES6+):** Lógica assíncrona para consumo da API.
- **Chart.js:** Renderização de gráficos de latência.

## 📦 Como Rodar o Projeto

### 1. Clonar o repositório
```bash
git clone https://github.com/HFagundes/sentinel.git
cd sentinel
```

### 2. Configurar o Backend
Certifique-se de ter o Python instalado. Instale as dependências:
```bash
pip install fastapi uvicorn httpx pydantic
```
Inicie o servidor backend:
```bash
cd backend
python main.py
```
O servidor estará rodando em `http://localhost:8000`.

### 3. Configurar o Frontend
Você pode abrir o arquivo `frontend/index.html` diretamente no seu navegador ou usar um servidor estático simples:
```bash
cd frontend
python -m http.server 8080
```
Acesse o dashboard em `http://localhost:8080`.

## 📂 Estrutura do Projeto

```text
.
├── backend/
│   └── main.py          # Servidor FastAPI e lógica de monitoramento
├── frontend/
│   ├── index.html       # Estrutura da interface
│   ├── style.css        # Estilização e Temas
│   └── app.js           # Lógica de consumo da API e Gráficos
└── README.md            # Documentação do projeto
```

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---
Desenvolvido com 💙 por [HFagundes/GitHub]
