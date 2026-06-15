// script.js - NAVI v6.0 OMNI (IA + PWA + Todas as Funções)

let model = null;
let profile = JSON.parse(localStorage.getItem('navi_profile')) || null;
let flightHours = parseInt(localStorage.getItem('navi_hours')) || 0;

// 1. INICIALIZAÇÃO DA IA
async function loadAI() {
    const statusEl = document.getElementById('ai-status');
    const btn = document.getElementById('btn-start');
    try {
        statusEl.innerText = " Baixando cérebro da IA (apenas 5MB)...";
        model = await mobilenet.load({ version: 1, alpha: 0.25 });
        statusEl.innerText = "✅ IA Pronta! Pode enviar a foto.";
        statusEl.style.color = "var(--hud-accent)";
        btn.disabled = false;
        if (profile) {
            document.getElementById('profile-modal').classList.add('hidden');
            initDashboard(profile);
        }
    } catch (error) {
        console.error("Erro na IA:", error);
        statusEl.innerText = "️ Falha na IA. Usando modo manual.";
        statusEl.style.color = "var(--hud-alert)";
        btn.disabled = false;
        btn.innerText = "Iniciar Sem IA";
    }
}
loadAI();

// 2. PROCESSAMENTO DA IMAGEM E TEMA
async function processImageAndStart() {
    const name = document.getElementById('inputName').value;
    const age = document.getElementById('inputAge').value;
    const fileInput = document.getElementById('inputImageFile');
    const statusEl = document.getElementById('ai-status');

    if (!name) { alert("Comandante, preciso do seu nome."); return; }

    statusEl.innerText = "🔍 Analisando imagem...";
    document.getElementById('btn-start').disabled = true;

    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        const imageData = await toBase64(file);
        const img = new Image();
        img.src = imageData;
        
        img.onload = async () => {
            let detectedTheme = 'theme-aviator';            let themeName = 'Aviador/Tech';
            let confidenceText = "Manual";

            if (model) {
                try {
                    const predictions = await model.classify(img);
                    const topPred = predictions[0].className.toLowerCase();
                    const conf = (predictions[0].probability * 100).toFixed(1);
                    confidenceText = `${conf}%`;

                    if (topPred.includes('guitar') || topPred.includes('microphone') || topPred.includes('music') || topPred.includes('stage') || topPred.includes('violin') || topPred.includes('art')) {
                        detectedTheme = 'theme-artist'; themeName = 'Artista/Música';
                    } else if (topPred.includes('plant') || topPred.includes('flower') || topPred.includes('nature') || topPred.includes('green')) {
                        detectedTheme = 'theme-nature'; themeName = 'Natureza/Calma';
                    } else if (topPred.includes('airplane') || topPred.includes('laptop') || topPred.includes('keyboard') || topPred.includes('screen') || topPred.includes('computer')) {
                        detectedTheme = 'theme-aviator'; themeName = 'Aviador/Tech';
                    }
                } catch (err) { console.log("Falha na classificação, usando padrão."); }
            }

            profile = { name, age: age || 'N/A', image: imageData, aiDetected: `${themeName} (${confidenceText})`, theme: detectedTheme };
            localStorage.setItem('navi_profile', JSON.stringify(profile));
            speak(`Perfil analisado. Tema ${themeName} ativado.`);
            document.getElementById('profile-modal').classList.add('hidden');
            initDashboard(profile);
        };
    } else {
        profile = { name, age: age || 'N/A', image: null, aiDetected: 'Padrão (Sem Foto)', theme: 'theme-aviator' };
        localStorage.setItem('navi_profile', JSON.stringify(profile));
        document.getElementById('profile-modal').classList.add('hidden');
        initDashboard(profile);
    }
}

// 3. APLICAÇÃO DO DASHBOARD
function initDashboard(data) {
    document.body.className = data.theme;
    document.getElementById('bpName').innerText = data.name.toUpperCase();
    document.getElementById('bpAge').innerText = data.age;
    document.getElementById('ai-detection').innerText = data.aiDetected;
    document.getElementById('bpHours').innerText = flightHours;
    
    if (data.image) document.getElementById('bpImg').src = data.image;
    else document.getElementById('bpImg').src = 'https://ui-avatars.com/api/?name=' + data.name + '&background=0D8ABC&color=fff&size=128';

    let welcomeMsg = `Sistemas prontos, Comandante ${data.name}.`;
    if (data.theme === 'theme-artist') welcomeMsg = `A criatividade é sua bússola, ${data.name}. O palco é seu.`;
    if (data.theme === 'theme-nature') welcomeMsg = `Conexão com a natureza estabelecida, ${data.name}.`;
    
    document.getElementById('greeting').innerText = welcomeMsg;    document.getElementById('userInfoDisplay').innerText = `${data.name}, ${data.age} anos`;
    
    const savedMood = localStorage.getItem('navi_mood');
    if(savedMood) document.getElementById('bpMood').innerText = savedMood;
}

// 4. FUNÇÕES AUXILIARES
function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function editProfile() {
    document.getElementById('profile-modal').classList.remove('hidden');
    document.getElementById('inputName').value = profile.name;
    document.getElementById('inputAge').value = profile.age;
    document.getElementById('ai-status').innerText = "Pronto para nova análise.";
    document.getElementById('btn-start').disabled = false;
    document.getElementById('btn-start').innerText = "Analisar e Reiniciar";
}

function speak(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'pt-BR'; u.rate = 0.95;
        window.speechSynthesis.speak(u);
    }
}

// 5. FUNCIONALIDADES DO APP
function checkMood() {
    const moods = ['️ Crítico', '☁️ Nublado', '⛅ Instável', '️ Limpo', '🚀 Decolando'];
    const choice = prompt(`Status da cabine?\n1. ${moods[0]}\n2. ${moods[1]}\n3. ${moods[2]}\n4. ${moods[3]}\n5. ${moods[4]}\n\nDigite o número:`);
    if (choice >= 1 && choice <= 5) {
        const mood = moods[choice-1];
        document.getElementById('bpMood').innerText = mood;
        localStorage.setItem('navi_mood', mood);
        speak(`Humor registrado: ${mood}.`);
    }
}

function shareProfile() {
    const data = btoa(JSON.stringify({ n: profile.name, h: flightHours, t: profile.theme }));
    const link = `${window.location.origin}${window.location.pathname}?navi=${data}`;
    navigator.clipboard.writeText(link).then(() => {        speak("Link copiado. Envie para a torre.");
        alert("Link do Comandante copiado!");
    });
}

const missions = ["Inglês: 3 palavras novas.", "Código: 1 função em JS.", "Violão: 1 música completa.", "Rotina: Skincare e 500ml de água."];

function startMission() {
    const actionArea = document.getElementById('action-area');
    const missao = missions[Math.floor(Math.random() * missions.length)];
    actionArea.innerHTML = `<h3>🗺️ MISSÃO</h3><p style="margin:10px 0">${missao}</p><button class="btn-action" onclick="completeMission('${missao}')">Cumprida</button><button class="btn-close" onclick="closeAction()">Cancelar</button>`;
    actionArea.classList.remove('hidden');
    speak("Missão atribuída.");
}

function completeMission(text) {
    flightHours++;
    localStorage.setItem('navi_hours', flightHours);
    document.getElementById('bpHours').innerText = flightHours;
    
    let log = JSON.parse(localStorage.getItem('navi_log') || '[]');
    const now = new Date();
    log.unshift({ date: now.toLocaleDateString('pt-BR') + ' ' + now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0'), text: text });
    if (log.length > 10) log.pop();
    localStorage.setItem('navi_log', JSON.stringify(log));

    speak("Missão cumprida. +1 hora de voo registrada.");
    closeAction();
}

function showLogbook() {
    const actionArea = document.getElementById('action-area');
    const log = JSON.parse(localStorage.getItem('navi_log') || '[]');
    let logHTML = `<h3>📓 DIÁRIO DE BORDO</h3>`;
    if (log.length === 0) logHTML += `<p style="color:#8892b0">Nenhum voo registrado ainda.</p>`;
    else log.forEach(entry => { logHTML += `<div class="log-entry"><span style="font-size:0.7rem; color:var(--hud-accent)">${entry.date}</span><br>${entry.text}</div>`; });
    logHTML += `<button class="btn-close" onclick="closeAction()">Fechar</button>`;
    actionArea.innerHTML = logHTML;
    actionArea.classList.remove('hidden');
}

function activateCalmMode() {
    const actionArea = document.getElementById('action-area');
    actionArea.innerHTML = `<h3>🌬️ ESTABILIZANDO</h3><p style="color:rgba(255,255,255,0.7); margin-bottom:10px">Siga o círculo.</p><div class="breathing-circle">RESPIRE</div><button class="btn-close" onclick="closeAction()">Ok</button>`;
    actionArea.classList.remove('hidden');
    speak("Respire comigo.");
}

function showChecklist() {
    const actionArea = document.getElementById('action-area');    actionArea.innerHTML = `<h3>✅ CHECKLIST</h3>
    <label class="checklist-item"><input type="checkbox" onchange="this.parentElement.classList.toggle('checked')"> 💧 Hidratação</label>
    <label class="checklist-item"><input type="checkbox" onchange="this.parentElement.classList.toggle('checked')"> ️ Aquecimento / Postura</label>
    <button class="btn-action" onclick="closeAction()">Confirmar</button>`;
    actionArea.classList.remove('hidden');
}

function activateVoiceCommand() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("Navegador não suporta voz."); return; }
    const rec = new SpeechRecognition();
    rec.lang = 'pt-BR';
    document.querySelector('.voice-btn').classList.add('listening');
    speak("Ouvindo...");
    rec.start();
    rec.onresult = (e) => {
        document.querySelector('.voice-btn').classList.remove('listening');
        const cmd = e.results[0][0].transcript.toLowerCase();
        if(cmd.includes('missão') || cmd.includes('missao')) startMission();
        else if(cmd.includes('calma') || cmd.includes('respirar')) activateCalmMode();
        else if(cmd.includes('checklist')) showChecklist();
        else if(cmd.includes('diário') || cmd.includes('diario')) showLogbook();
        else speak("Não entendi o comando.");
    };
    rec.onerror = () => document.querySelector('.voice-btn').classList.remove('listening');
}

function closeAction() { document.getElementById('action-area').classList.add('hidden'); }
function triggerMayday() { document.getElementById('mayday-overlay').classList.remove('hidden'); speak("Modo de emergência. Respire."); }
function closeMayday() { document.getElementById('mayday-overlay').classList.add('hidden'); speak("Sistemas normalizados."); }

window.onload = () => {
    const params = new URLSearchParams(window.location.search);
    const sharedData = params.get('navi');
    if (sharedData) {
        try {
            const decoded = JSON.parse(atob(sharedData));
            alert(` SINAL RECEBIDO: Comandante ${decoded.n} (Modo: ${decoded.t}) com ${decoded.h}h de voo.`);
        } catch (e) { console.log("Erro ao ler link"); }
    }
};