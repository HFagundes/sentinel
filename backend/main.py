from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx
import asyncio
import time
from pydantic import BaseModel
from typing import List, Dict
from contextlib import asynccontextmanager
from urllib.parse import urlparse
import re

# Armazenamento global par o cliente HTTP
http_client = None

BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Cache-Control": "max-age=0"
}

@asynccontextmanager
async def lifespan(app: FastAPI):
    global http_client
    # Inicializa o cliente com headers d navegador real
    http_client = httpx.AsyncClient(
        headers=BROWSER_HEADERS,
        follow_redirects=True, 
        timeout=10.0
    )
    # Inicia a tarefa de monitoramento em background
    monitor_task = asyncio.create_task(background_monitoring())
    yield
    # Cancela o monitoramento e fecha o cliente na descida
    monitor_task.cancel()
    await http_client.aclose()

app = FastAPI(lifespan=lifespan)

class SiteBase(BaseModel):
    name: str
    url: str

# Configuração de CORS para permitir que o frontend acesse o backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lista inicial de sites para monitorar
sites_to_monitor = [
    {"name": "Google", "url": "https://www.google.com"},
    {"name": "GitHub", "url": "https://github.com"},
    {"name": "YouTube", "url": "https://www.youtube.com"},
    {"name": "Stack Overflow", "url": "https://stackoverflow.com"},
]

# Armazenamento simples em memória para os resultados
# Estrutura: { "Name": { "status": "online", "latency": 120, "history": [{"time": "12:00", "latency": 120}, ...] } }
monitoring_results = {}
MAX_HISTORY = 20

async def get_ping_latency(url: str):
    try:
        # Extrai o hostname da URL
        hostname = urlparse(url).netloc
        if not hostname:
            hostname = url.split('/')[0] # Fallback
            
        # Executa o comando ping (específico para Windows no formato de saída)
        process = await asyncio.create_subprocess_exec(
            'ping', '-n', '1', hostname,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await process.communicate()
        output = stdout.decode('cp1252', errors='ignore') # Usando cp1252 para Windows PT-BR
        
        # Regex mais robusto para capturar tempo=Xms ou tempo<1ms (PT-BR ou EN)
        # Suporta: tempo26ms, time=26ms, tempo<1ms, time<1ms (com ou sem espaços)
        match = re.search(r'(?:tempo|time)\s*[=<]\s*([\d.]+)\s*ms', output, re.IGNORECASE)
        if match:
            return float(match.group(1))
        
        # Log para depuração se não encontrar o padrão mas houver resposta
        if "Resposta de" in output or "Reply from" in output:
            print(f"DEBUG: Padrao de ping nao encontrado no output de {hostname}")
            
        return 0
    except Exception as e:
        print(f"Ping error for {url}: {str(e)}")
        return 0

async def check_site(name: str, url: str):
    try:
        # Executa HTTP e Ping concorrentemente
        http_task = check_http(url)
        ping_task = get_ping_latency(url)
        
        (status_code, http_lat), ping_lat = await asyncio.gather(http_task, ping_task)
        print(f"CHECK: {name} ({url}) -> HTTP: {status_code}, PING: {ping_lat}ms")

        # Atualiza o histórico
        if name not in monitoring_results:
            monitoring_results[name] = {"history": []}
        
        new_result = {
            "status": "online" if status_code < 400 else "issue",
            "status_code": status_code,
            "latency": http_lat,
            "ping_latency": ping_lat,
            "last_checked": time.strftime("%H:%M:%S")
        }
        
        # Adiciona ao histórico para o grafico
        monitoring_results[name]["history"].append({
            "time": time.strftime("%H:%M:%S"),
            "latency": http_lat,
            "ping_latency": ping_lat
        })
        
        # Limita o tamanho do histórico
        if len(monitoring_results[name]["history"]) > MAX_HISTORY:
            monitoring_results[name]["history"].pop(0)
            
        # Atualiza os dados principais preservando o histórico
        monitoring_results[name].update(new_result)

    except Exception as e:
        error_result = {
            "status": "offline",
            "status_code": None,
            "latency": 0,
            "ping_latency": 0,
            "error": str(e),
            "last_checked": time.strftime("%H:%M:%S")
        }
        if name not in monitoring_results:
            monitoring_results[name] = {"history": []}
            
        monitoring_results[name]["history"].append({
            "time": time.strftime("%H:%M:%S"),
            "latency": 0,
            "ping_latency": 0
        })
        if len(monitoring_results[name]["history"]) > MAX_HISTORY:
            monitoring_results[name]["history"].pop(0)
            
        monitoring_results[name].update(error_result)

async def check_http(url: str):
    """Realiza apenas a parte HTTP da verificação"""
    try:
        start_time = time.time()
        try:
            response = await http_client.head(url)
            if response.status_code == 405:
                response = await http_client.get(url)
        except (httpx.RequestError, httpx.HTTPStatusError):
            response = await http_client.get(url)
        
        latency = round((time.time() - start_time) * 1000, 2)
        return response.status_code, latency
    except:
        return 500, 0

async def background_monitoring():
    while True:
        tasks = [check_site(site["name"], site["url"]) for site in sites_to_monitor]
        await asyncio.gather(*tasks)
        await asyncio.sleep(30)  # Verifica a cada 30 segundos

# Removido @app.on_event("startup") pois usamos lifespan agora

@app.post("/add-site")
async def add_site(site: SiteBase):
    new_site = {"name": site.name, "url": site.url}
    # Verifica se já não existe
    if any(s["name"] == site.name for s in sites_to_monitor):
        return {"status": "error", "message": "Site already exists"}
    
    sites_to_monitor.append(new_site)
    # Força um check imediato para o novo site
    asyncio.create_task(check_site(site.name, site.url))
    return {"status": "success", "site": new_site}

@app.get("/status")
async def get_status():
    return [
        {**site, **monitoring_results.get(site["name"], {"status": "pending"})}
        for site in sites_to_monitor
    ]

@app.get("/")
async def root():
    return {"message": "Sentinel API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
