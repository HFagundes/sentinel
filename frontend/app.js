const API_URL = 'http://localhost:8000/status';
const ADD_SITE_URL = 'http://localhost:8000/add-site';
const grid = document.getElementById('monitor-grid');
const totalCount = document.getElementById('total-count');
const activeCount = document.getElementById('active-count');
const incidentCount = document.getElementById('incident-count');
const clock = document.getElementById('current-time');
const globalLatency = document.getElementById('global-latency');

// Modal Elements
const modalOverlay = document.getElementById('modal-overlay');
const openModalBtn = document.getElementById('open-modal-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const addSiteForm = document.getElementById('add-site-form');
const siteNameInput = document.getElementById('site-name');
const siteUrlInput = document.getElementById('site-url');

// Chart Modal Elements
const chartModalOverlay = document.getElementById('chart-modal-overlay');
const closeChartModalBtn = document.getElementById('close-chart-modal-btn');
const chartSiteName = document.getElementById('chart-site-name');
const chartSiteUrl = document.getElementById('chart-site-url');
const peakLatencyText = document.getElementById('peak-latency');
const avgLatencyText = document.getElementById('avg-latency');
const peakPingText = document.getElementById('peak-ping');
const avgPingText = document.getElementById('avg-ping');

const themeToggle = document.getElementById('theme-toggle');
const themeIcon = themeToggle.querySelector('.theme-icon');

let lastFetchTime = Date.now();
let currentChart = null;
let sitesData = []; 
let isLightTheme = localStorage.getItem('theme') === 'light';

// Inicializa o tema
if (isLightTheme) {
    document.body.classList.add('light-theme');
    themeIcon.textContent = '☾';
}

// Atualiza o relógio
function updateClock() {
    const now = new Date();
    clock.textContent = now.toLocaleTimeString('pt-BR', { hour12: false });
}
setInterval(updateClock, 1000);

// Cria o HTML de um card de monitoramento
function createCard(site, index) {
    const statusColor = site.status === 'online' ? '#00ff9d' : (site.status === 'offline' ? '#ff3e3e' : '#ffd000');
    const displayStatus = site.status === 'online' ? 'ONLINE' : (site.status === 'offline' ? 'OFFLINE' : 'ALERTA');
    
    return `
        <div class="monitor-card" style="--status-color: ${statusColor}" onclick="openChart(${index})">
            <div class="card-header">
                <div class="site-info">
                    <h3>${site.name}</h3>
                    <div class="site-url">${site.url.replace('https://', '')}</div>
                </div>
                <div class="status-badge ${site.status}">${displayStatus}</div>
            </div>
            <div class="card-metrics dual-metrics">
                <div class="metric">
                    <span class="metric-label">NET (PING)</span>
                    <span class="metric-value ping-value">${(site.ping_latency !== undefined && site.ping_latency !== null) ? site.ping_latency + 'ms' : '--'}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">APP (HTTP)</span>
                    <span class="metric-value app-value">${(site.latency !== undefined && site.latency !== null) ? site.latency + 'ms' : '--'}</span>
                </div>
            </div>
            <div class="card-footer-info">
                <span class="last-check">VISTO: ${site.last_checked || '--'}</span>
            </div>
        </div>
    `;
}

// Busca os dados do backend
async function fetchStatus() {
    try {
        const start = Date.now();
        const response = await fetch(API_URL);
        const data = await response.json();
        const latency = Date.now() - start;
        
        globalLatency.textContent = `${latency}ms`;
        updateUI(data);
    } catch (error) {
        console.error('Failed to fetch status:', error);
        // Se falhar, mostra que o sistema de monitoramento está offline
        document.querySelector('.status-text').textContent = 'MONITOR OFFLINE';
        document.querySelector('.dot').style.backgroundColor = '#ff3e3e';
        document.querySelector('.dot').style.boxShadow = '0 0 10px #ff3e3e';
    }
}

// Atualiza a Interface de Usuário
function updateUI(sites) {
    sitesData = sites; // Update local copy
    grid.innerHTML = sites.map((site, index) => createCard(site, index)).join('');
    
    // Atualiza contadores
    totalCount.textContent = sites.length;
    const active = sites.filter(s => s.status === 'online').length;
    const incidents = sites.filter(s => s.status === 'offline' || s.status === 'issue').length;
    
    // Animação suave nos números
    animateNumber(activeCount, active);
    animateNumber(incidentCount, incidents);
}

function animateNumber(element, finalValue) {
    let startValue = parseInt(element.textContent) || 0;
    if (startValue === finalValue) return;
    
    const duration = 500;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const current = Math.floor(startValue + progress * (finalValue - startValue));
        
        element.textContent = current;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    requestAnimationFrame(update);
}

// Inicialização
fetchStatus();
setInterval(fetchStatus, 30000); // Atualiza a cada 30 segundos
updateClock();

// --- Lógica do Modal e Formulário ---

// Abrir modal
openModalBtn.addEventListener('click', () => {
    modalOverlay.classList.add('active');
    siteNameInput.focus();
});

// Fechar modal
const closeModal = () => {
    modalOverlay.classList.remove('active');
    addSiteForm.reset();
};

closeModalBtn.addEventListener('click', closeModal);

// Fechar ao clicar fora do modal
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
});

// Submeter formulário
addSiteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = addSiteForm.querySelector('.btn-submit');
    const originalBtnText = submitBtn.textContent;
    
    const formData = {
        name: siteNameInput.value,
        url: siteUrlInput.value
    };

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'INICIALIZANDO...';

        const response = await fetch(ADD_SITE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) throw new Error('Failed to add site');

        const result = await response.json();
        
        if (result.status === 'success') {
            closeModal();
            fetchStatus(); // Atualiza a lista imediatamente
        } else {
            alert(result.message || 'Erro ao adicionar site');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Não foi possível conectar ao servidor backend.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
    }
});

// --- Lógica do Gráfico ---

function openChart(index) {
    const site = sitesData[index];
    if (!site || !site.history) return;

    chartSiteName.textContent = site.name;
    chartSiteUrl.textContent = site.url;
    chartModalOverlay.classList.add('active');

    renderLatencyChart(site.history);
}

function renderLatencyChart(history) {
    const ctx = document.getElementById('latency-chart').getContext('2d');
    
    // Cleanup previous chart
    if (currentChart) {
        currentChart.destroy();
    }

    const labels = history.map(h => h.time);
    const appData = history.map(h => h.latency);
    const pingData = history.map(h => h.ping_latency || 0);
    
    const peakApp = Math.max(...appData);
    const avgApp = appData.reduce((a, b) => a + b, 0) / appData.length;

    const peakPing = Math.max(...pingData);
    const avgPing = pingData.reduce((a, b) => a + b, 0) / pingData.length;

    peakLatencyText.textContent = `${peakApp.toFixed(2)}ms`;
    avgLatencyText.textContent = `${avgApp.toFixed(2)}ms`;
    peakPingText.textContent = `${peakPing.toFixed(2)}ms`;
    avgPingText.textContent = `${avgPing.toFixed(2)}ms`;

    const gridColor = document.body.classList.contains('light-theme') ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)';
    const textColor = document.body.classList.contains('light-theme') ? '#64748b' : '#94a3b8';

    currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'APP (HTTP)',
                    data: appData,
                    borderColor: '#00f2ff',
                    backgroundColor: 'rgba(0, 242, 255, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 2
                },
                {
                    label: 'NET (PING)',
                    data: pingData,
                    borderColor: '#ff00ff',
                    backgroundColor: 'rgba(255, 0, 255, 0.05)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    display: true,
                    labels: { color: textColor, font: { family: 'JetBrains Mono', size: 10 } }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: gridColor },
                    ticks: { color: textColor, font: { family: 'JetBrains Mono' } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: textColor, font: { family: 'JetBrains Mono' } }
                }
            }
        }
    });
}

// Lógica de Troca de Tema
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    themeIcon.textContent = isLight ? '☾' : '☼';
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    
    // Atualiza o gráfico se ele estiver aberto
    if (chartModalOverlay.classList.contains('active') && sitesData.length > 0) {
        // Encontra o site atualmente aberto (isso é uma simplificação)
        const currentSiteName = chartSiteName.textContent;
        const site = sitesData.find(s => s.name === currentSiteName);
        if (site) renderLatencyChart(site.history);
    }
});

closeChartModalBtn.addEventListener('click', () => {
    chartModalOverlay.classList.remove('active');
});

chartModalOverlay.addEventListener('click', (e) => {
    if (e.target === chartModalOverlay) {
        chartModalOverlay.classList.remove('active');
    }
});
