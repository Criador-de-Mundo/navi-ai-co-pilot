// NAVI v9.5 - SCRIPT COMPLETO COM PWA

// --- VARIÁVEIS GLOBAIS ---
var profile = JSON.parse(localStorage.getItem('navi_profile')) || null;
var flightHours = parseInt(localStorage.getItem('navi_hours')) || 0;
var streak = parseInt(localStorage.getItem('navi_streak')) || 0;
var lastActiveDate = localStorage.getItem('navi_last_active');
var isLightMode = localStorage.getItem('navi_theme_mode') === 'light';
var deferredPrompt = null;
var isPWAInstalled = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
var alwaysListening = false;
var alwaysRecognition = null;
var timerInterval = null;
var timeLeft = 25 * 60;
var audioCtx = null;
var currentNoiseNode = null;
var breathingInterval = null;
var isBreathing = false;
var currentMission = '';
var moodChartInstance = null;
var wakeLock = null;

var missions = [
    '📚 Estudar 3 palavras novas em inglês',
    '💻 Escrever 1 função em JavaScript',
    '🎸 Tocar 1 música completa no violão',
    '💧 Beber 500ml de água e fazer skincare',
    '📖 Ler 10 páginas de um livro',
    '🎯 Completar 1 exercício de programação',
    '🧘 Fazer 5 minutos de meditação',
    '✍️ Escrever 3 coisas pelas quais é grato'
];

// --- TOAST NOTIFICATIONS ---
function showToast(message, type) {
    if (!type) type = 'info';
    var container = document.getElementById('toast-container');
    if (!container) {
        console.log('Toast:', message);
        return;
    }
    var toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(function() {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3000);
}
// --- SPEAK (Text-to-Speech) ---
function speak(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(text);
        u.lang = 'pt-BR';
        u.rate = 1.0;
        u.pitch = 1.0;
        u.volume = 1.0;
        window.speechSynthesis.speak(u);
    }
}

// --- COMPRESSÃO DE IMAGENS ---
function compressImage(file, maxWidth, maxHeight, quality) {
    return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function(event) {
            var img = new Image();
            img.src = event.target.result;
            img.onload = function() {
                var canvas = document.createElement('canvas');
                var width = img.width;
                var height = img.height;
                if (width > height) {
                    if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
                } else {
                    if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
                }
                canvas.width = width;
                canvas.height = height;
                var ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = function(error) { reject(error); };
        };
        reader.onerror = function(error) { reject(error); };
    });
}

// --- BACKGROUND ---
function applyBackground() {
    if (profile && profile.backgroundImage) {
        document.body.style.backgroundImage = 'url(' + profile.backgroundImage + ')';
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.classList.add('has-background');
    } else {        document.body.style.backgroundImage = 'none';
        document.body.classList.remove('has-background');
    }
}

// --- TEMA ---
function applyThemeMode() {
    if (isLightMode) document.body.classList.add('light-mode');
    else document.body.classList.remove('light-mode');
    var btn = document.getElementById('themeBtn');
    if (btn) btn.innerText = isLightMode ? '🌙' : '☀️';
}

function toggleTheme() {
    isLightMode = !isLightMode;
    localStorage.setItem('navi_theme_mode', isLightMode ? 'light' : 'dark');
    applyThemeMode();
    showToast(isLightMode ? '☀️ Modo claro' : '🌙 Modo escuro', 'info');
}

// --- FECHAR TODOS OS MODAIS ---
function closeAllModals() {
    var modals = document.querySelectorAll('.overlay:not(#profile-modal)');
    modals.forEach(function(modal) {
        modal.classList.add('hidden');
    });
}

// --- MODAIS ---
function openModal(id) {
    console.log('Abrindo modal:', id);
    closeAllModals();
    var modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('hidden');
        if (id === 'analytics-modal') renderAnalytics();
        if (id === 'mission-modal') newMission();
    }
}

function closeModal(id) {
    var modal = document.getElementById(id);
    if (modal) modal.classList.add('hidden');
}

// --- PWA DETECTION ---
function updateAppMode() {
    var appModeEl = document.getElementById('appMode');
    if (appModeEl) {
        appModeEl.innerText = isPWAInstalled ? 'NAVI v9.5 (Instalado)' : 'NAVI v9.5 (Web)';    }
}

function installPWA() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function(choiceResult) {
            if (choiceResult.outcome === 'accepted') {
                showToast('✅ NAVI instalado!', 'success');
                speak('NAVI instalado!');
            }
            deferredPrompt = null;
            dismissInstall();
        });
    } else {
        showToast('📲 Menu > Adicionar à tela inicial', 'info');
    }
}

function dismissInstall() {
    var banner = document.getElementById('install-banner');
    if (banner) banner.classList.add('hidden');
    localStorage.setItem('navi_install_dismissed', 'true');
}

// --- STREAK ---
function checkStreak() {
    var today = new Date().toDateString();
    if (lastActiveDate !== today) {
        var yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (lastActiveDate === yesterday.toDateString()) streak++;
        else streak = 1;
        lastActiveDate = today;
        localStorage.setItem('navi_streak', streak);
        localStorage.setItem('navi_last_active', today);
    }
}

// --- DASHBOARD ---
function initDashboard() {
    if (!profile) return;
    var bpName = document.getElementById('bpName');
    var bpTitle = document.getElementById('bpTitle');
    var bpHours = document.getElementById('bpHours');
    var bpStreak = document.getElementById('bpStreak');
    var bpImg = document.getElementById('bpImg');
    var greeting = document.getElementById('greeting');
    var userInfo = document.getElementById('userInfoDisplay');
        if (bpName) bpName.innerText = profile.name.toUpperCase();
    if (bpTitle) bpTitle.innerText = profile.title;
    if (bpHours) bpHours.innerText = flightHours;
    if (bpStreak) bpStreak.innerText = streak;
    if (bpImg) {
        bpImg.src = profile.image || 'https://ui-avatars.com/api/?name=' + profile.name + '&background=0D8ABC&color=fff&size=128';
    }
    if (greeting) greeting.innerText = 'Bem-vindo(a), ' + profile.title + ' ' + profile.name + '.';
    if (userInfo) userInfo.innerText = profile.name + ' | ' + profile.title;
}

// --- PERFIL ---
async function processImageAndStart() {
    var name = document.getElementById('inputName').value.trim();
    var title = document.getElementById('inputTitle').value.trim();
    var tone = document.getElementById('inputTone').value;
    var fileInput = document.getElementById('inputImageFile');
    var bgFileInput = document.getElementById('inputBackgroundFile');
    
    if (!name || !title) {
        showToast('Preencha nome e título!', 'error');
        return;
    }
    
    showToast('⏳ Processando...', 'info');
    
    var profileImage = profile ? profile.image : null;
    if (fileInput && fileInput.files && fileInput.files[0]) {
        try {
            profileImage = await compressImage(fileInput.files[0], 300, 300, 0.8);
        } catch (e) {
            showToast('Erro na foto', 'error');
        }
    }
    
    var backgroundImage = profile ? profile.backgroundImage : null;
    if (bgFileInput && bgFileInput.files && bgFileInput.files[0]) {
        try {
            backgroundImage = await compressImage(bgFileInput.files[0], 800, 800, 0.7);
        } catch (e) {
            showToast('Erro no fundo', 'error');
        }
    }
    
    profile = {
        name: name,
        title: title,
        tone: tone,
        image: profileImage,
        backgroundImage: backgroundImage    };
    
    try {
        localStorage.setItem('navi_profile', JSON.stringify(profile));
    } catch (e) {
        showToast('Imagem muito pesada', 'error');
        return;
    }
    
    document.getElementById('profile-modal').classList.add('hidden');
    initDashboard();
    checkStreak();
    applyBackground();
    speak('Bem-vindo(a), ' + title + ' ' + name);
    showToast('Perfil criado!', 'success');
}

function editProfile() {
    if (!profile) {
        showToast('Crie um perfil primeiro!', 'error');
        return;
    }
    closeAllModals();
    document.getElementById('profile-modal').classList.remove('hidden');
    document.getElementById('inputName').value = profile.name;
    document.getElementById('inputTitle').value = profile.title;
    document.getElementById('inputTone').value = profile.tone;
}

// --- MISSÃO ---
function newMission() {
    currentMission = missions[Math.floor(Math.random() * missions.length)];
    var textEl = document.getElementById('missionText');
    if (textEl) textEl.innerText = currentMission;
}

function completeMission() {
    if (!currentMission) {
        showToast('Nenhuma missão ativa!', 'error');
        return;
    }
    flightHours += 0.5;
    localStorage.setItem('navi_hours', flightHours);
    var bpHours = document.getElementById('bpHours');
    if (bpHours) bpHours.innerText = flightHours;
    showToast('✅ Missão cumprida! +0.5h', 'success');
    speak('Missão cumprida!');
    closeModal('mission-modal');
}
// --- POMODORO ---
function updateTimerDisplay() {
    var m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    var s = (timeLeft % 60).toString().padStart(2, '0');
    var el = document.getElementById('timerDisplay');
    if (el) el.innerText = m + ':' + s;
}

function startTimer() {
    if (timerInterval) return;
    timerInterval = setInterval(function() {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            flightHours += 0.5;
            localStorage.setItem('navi_hours', flightHours);
            var bpHours = document.getElementById('bpHours');
            if (bpHours) bpHours.innerText = flightHours;
            showToast('⏱️ Foco concluído! +0.5h', 'success');
            speak('Tempo de foco concluído!');
            resetTimer();
        }
    }, 1000);
    showToast('▶️ Timer iniciado', 'info');
}

function pauseTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    showToast('⏸️ Pausado', 'info');
}

function resetTimer() {
    pauseTimer();
    timeLeft = 25 * 60;
    updateTimerDisplay();
    showToast('🔄 Resetado', 'info');
}

// --- SONS AMBIENTE ---
function playSound(type) {
    stopSound();
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    var bufferSize = 2 * audioCtx.sampleRate;
    var buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    var data = buffer.getChannelData(0);
    var lastOut = 0;
        for (var i = 0; i < bufferSize; i++) {
        var white = Math.random() * 2 - 1;
        if (type === 'white') data[i] = white * 0.5;
        else if (type === 'brown') { data[i] = (lastOut + (0.02 * white)) / 1.02; lastOut = data[i]; data[i] *= 3.5; }
        else if (type === 'rain') data[i] = white * 0.5;
    }
    
    currentNoiseNode = audioCtx.createBufferSource();
    currentNoiseNode.buffer = buffer;
    currentNoiseNode.loop = true;
    
    var gain = audioCtx.createGain();
    gain.gain.value = type === 'rain' ? 0.15 : 0.1;
    
    if (type === 'rain') {
        var filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800;
        currentNoiseNode.connect(filter).connect(gain).connect(audioCtx.destination);
    } else {
        currentNoiseNode.connect(gain).connect(audioCtx.destination);
    }
    currentNoiseNode.start();
    showToast('🔊 Som ' + type + ' ativado', 'info');
}

function stopSound() {
    if (currentNoiseNode) { currentNoiseNode.stop(); currentNoiseNode = null; }
    if (audioCtx) { audioCtx.close(); audioCtx = null; }
    showToast('🔇 Som desativado', 'info');
}

// --- RESPIRAÇÃO ---
function toggleBreathing() {
    var circle = document.getElementById('breathCircle');
    var textEl = document.getElementById('breathText');
    var btn = document.getElementById('breathBtn');
    
    if (!isBreathing) {
        isBreathing = true;
        if (circle) circle.classList.add('active');
        if (btn) btn.innerText = '⏹️ Parar';
        var phase = 0;
        var phases = ['INSPIRE', 'SEGURE', 'EXPIRE'];
        if (textEl) textEl.innerText = phases[0];
        breathingInterval = setInterval(function() {
            phase = (phase + 1) % 3;
            if (textEl) textEl.innerText = phases[phase];
        }, 4000);
        speak('Respire comigo. Inspire...');    } else {
        isBreathing = false;
        if (circle) circle.classList.remove('active');
        if (btn) btn.innerText = '▶️ Iniciar';
        if (breathingInterval) { clearInterval(breathingInterval); breathingInterval = null; }
        speak('Respiração pausada.');
    }
}

// --- CHECKLIST ---
function confirmChecklist() {
    var items = document.querySelectorAll('#checklistContainer .checklist-item');
    var checked = 0;
    items.forEach(function(item) {
        if (item.classList.contains('checked')) checked++;
    });
    showToast('✅ ' + checked + '/' + items.length + ' itens!', 'success');
    speak('Checklist confirmado!');
    closeModal('checklist-modal');
}

// --- ANALYTICS ---
function renderAnalytics() {
    var statHours = document.getElementById('statHours');
    var statMissions = document.getElementById('statMissions');
    var statStreak = document.getElementById('statStreak');
    
    if (statHours) statHours.innerText = flightHours;
    if (statMissions) statMissions.innerText = Math.floor(flightHours * 2);
    if (statStreak) statStreak.innerText = streak;

    var grid = document.getElementById('calendarGrid');
    if (grid) {
        grid.innerHTML = '';
        var days = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
        for (var i = 6; i >= 0; i--) {
            var d = new Date();
            d.setDate(d.getDate() - i);
            var isActive = d.toDateString() === new Date().toDateString();
            grid.innerHTML += '<div class="cal-day ' + (isActive ? 'active' : '') + '"><span class="day-name">' + days[d.getDay()] + '</span>' + d.getDate() + '</div>';
        }
    }

    var ctx = document.getElementById('moodChart');
    if (ctx && typeof Chart !== 'undefined') {
        if (moodChartInstance) moodChartInstance.destroy();
        moodChartInstance = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],                datasets: [{
                    label: 'Energia',
                    data: [3, 4, 2, 5, 4, 5, 3],
                    borderColor: '#00ff9d',
                    backgroundColor: 'rgba(0, 255, 157, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, max: 5 } }
            }
        });
    }
}

// --- PDF ---
function generatePDF() {
    if (typeof window.jspdf === 'undefined') {
        showToast('jsPDF não carregado', 'error');
        return;
    }
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(0, 240, 255);
    doc.text("NAVI | Relatório de Voo", 105, 20, null, null, "center");
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("Comandante: " + profile.name + " (" + profile.title + ")", 20, 40);
    doc.text("Horas de Voo: " + flightHours + "h", 20, 50);
    doc.text("Streak: " + streak + " dias", 20, 60);
    doc.save("NAVI_Relatorio_" + profile.name + ".pdf");
    showToast('📄 PDF gerado!', 'success');
}

// --- COMANDO DE VOZ (REFINADO v9.5) ---
function processVoiceCommand(command) {
    console.log('Comando recebido:', command);
    
    // Remove a hotword se presente
    var clean = command;
    var hotwords = ['navi', 'nave', 'navy', 'naby'];
    for (var i = 0; i < hotwords.length; i++) {
        if (command.indexOf(hotwords[i]) !== -1) {
            clean = command.replace(hotwords[i], '').trim();
            break;
        }    }
    
    console.log('Comando limpo:', clean);
    var lower = clean.toLowerCase();

    // 1. MISSÃO / PLANO DE VOO
    if (lower.indexOf('missão') !== -1 || 
        lower.indexOf('missao') !== -1 || 
        lower.indexOf('nova missão') !== -1 ||
        lower.indexOf('nova missao') !== -1 ||
        lower.indexOf('plano de voo') !== -1) {
        openModal('mission-modal');
        speak('Plano de voo aberto');
        return;
    }

    // 2. POMODORO / FOCO / TIMER
    if (lower.indexOf('foco') !== -1 || 
        lower.indexOf('pomodoro') !== -1 || 
        lower.indexOf('timer') !== -1 ||
        lower.indexOf('temporizador') !== -1) {
        openModal('pomodoro-modal');
        speak('Modo foco ativado');
        return;
    }

    // 3. CONTROLE DE TURBULÊNCIA
    if (lower.indexOf('respirar') !== -1 || 
        lower.indexOf('calma') !== -1 || 
        lower.indexOf('controle de turbulencia') !== -1 ||
        lower.indexOf('controle de turbulência') !== -1) {
        openModal('calm-modal');
        speak('Controle de turbulência ativado');
        return;
    }

    // 4. CHECKLIST
    if (lower.indexOf('checklist') !== -1 || 
        lower.indexOf('check list') !== -1 ||
        lower.indexOf('lista de decolagem') !== -1) {
        openModal('checklist-modal');
        speak('Checklist aberto');
        return;
    }

    // 5. ANALYTICS / ESTATÍSTICAS / GRÁFICO
    if (lower.indexOf('estatisticas') !== -1 ||
        lower.indexOf('estatísticas') !== -1 ||
        lower.indexOf('grafico') !== -1 || 
        lower.indexOf('gráfico') !== -1 ||        lower.indexOf('analytics') !== -1 ||
        lower.indexOf('calendario') !== -1 ||
        lower.indexOf('calendário') !== -1) {
        openModal('analytics-modal');
        speak('Analytics aberto');
        return;
    }

    // 6. PERFIL / EDITAR
    if (lower.indexOf('perfil') !== -1 || 
        lower.indexOf('editar') !== -1 || 
        lower.indexOf('edita') !== -1 ||
        lower.indexOf('identidade') !== -1) {
        editProfile();
        speak('Abrindo perfil');
        return;
    }

    // 7. AJUDA / LISTA DE COMANDOS
    if (lower.indexOf('ajuda') !== -1 || 
        lower.indexOf('lista de comandos') !== -1 ||
        lower.indexOf('comandos') !== -1 ||
        lower.indexOf('help') !== -1) {
        openModal('voice-commands-modal');
        speak('Aqui estão os comandos disponíveis');
        return;
    }

    // 8. MAYDAY / EMERGÊNCIA
    if (lower.indexOf('mayday') !== -1 || 
        lower.indexOf('emergencia') !== -1 || 
        lower.indexOf('emergência') !== -1 ||
        lower.indexOf('socorro') !== -1 ||
        lower.indexOf('panico') !== -1 ||
        lower.indexOf('pânico') !== -1) {
        triggerMayday();
        speak('Modo emergência');
        return;
    }

    // 9. TEMA CLARO
    if (lower.indexOf('claro') !== -1 || 
        lower.indexOf('light') !== -1 || 
        lower.indexOf('branco') !== -1 ||
        lower.indexOf('dia') !== -1) {
        if (!isLightMode) {
            toggleTheme();
            speak('Tema claro ativado');
        }
        return;    }

    // 10. TEMA ESCURO
    if (lower.indexOf('escuro') !== -1 || 
        lower.indexOf('dark') !== -1 || 
        lower.indexOf('preto') !== -1 ||
        lower.indexOf('noite') !== -1) {
        if (isLightMode) {
            toggleTheme();
            speak('Tema escuro ativado');
        }
        return;
    }

    // 11. PARAR / DESATIVAR TUDO
    if (lower.indexOf('parar') !== -1 || 
        lower.indexOf('fechar') !== -1 || 
        lower.indexOf('sair') !== -1 ||
        lower.indexOf('cancelar') !== -1 ||
        lower.indexOf('tchau') !== -1 ||
        lower.indexOf('desativar tudo') !== -1 ||
        lower.indexOf('desligar') !== -1) {
        closeAllModals();
        if (alwaysListening) {
            toggleAlwaysListening();
        }
        speak('Até logo');
        return;
    }

    // Se nada foi reconhecido
    showToast('Não entendi. Diga: missão, foco, perfil, etc.', 'error');
    speak('Não entendi o comando');
}

// --- ESCUTA PERMANENTE ---
async function toggleAlwaysListening() {
    console.log('Toggle listening:', alwaysListening);
    var micFab = document.getElementById('micFab');
    var micLabel = document.getElementById('micLabel');
    var indicator = document.getElementById('voice-indicator');
    
    if (!alwaysListening) {
        var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            showToast('❌ Navegador não suporta voz', 'error');
            return;
        }
        
        try {            if ('wakeLock' in navigator) {
                wakeLock = await navigator.wakeLock.request('screen');
                console.log('Wake Lock adquirido');
            }
        } catch (err) {
            console.error('Erro Wake Lock:', err);
        }
        
        alwaysRecognition = new SpeechRecognition();
        alwaysRecognition.lang = 'pt-BR';
        alwaysRecognition.continuous = true;
        alwaysRecognition.interimResults = false;
        
        alwaysRecognition.onstart = function() {
            console.log('Recognition started');
            alwaysListening = true;
            if (micFab) micFab.classList.add('listening');
            if (micLabel) micLabel.innerText = 'Ativo';
            if (indicator) indicator.classList.remove('hidden');
            showToast('🎙️ Escuta ativada! Diga "NAVI".', 'success');
        };
        
        alwaysRecognition.onresult = function(event) {
            var command = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
            console.log('Voice result:', command);
            
            if (command.indexOf('navi') !== -1 || command.indexOf('nave') !== -1) {
                showToast('🎙️ "' + command + '"', 'info');
            }
            
            processVoiceCommand(command);
        };
        
        alwaysRecognition.onerror = function(event) {
            console.error('Voice error:', event.error);
            if (event.error === 'not-allowed') {
                showToast('❌ Microfone bloqueado', 'error');
                alwaysListening = false;
                if (micFab) micFab.classList.remove('listening');
                if (micLabel) micLabel.innerText = 'Ativar';
                if (indicator) indicator.classList.add('hidden');
            } else if (event.error === 'no-speech') {
                if (alwaysListening) {
                    setTimeout(function() {
                        try { alwaysRecognition.start(); } catch(e) {}
                    }, 1000);
                }
            }
        };
                alwaysRecognition.onend = function() {
            console.log('Recognition ended, listening:', alwaysListening);
            if (alwaysListening) {
                setTimeout(function() {
                    if (alwaysListening && alwaysRecognition) {
                        try { alwaysRecognition.start(); } catch(e) {}
                    }
                }, 500);
            }
        };
        
        try {
            alwaysRecognition.start();
        } catch(e) {
            console.error('Erro ao iniciar:', e);
            showToast('Erro ao iniciar voz', 'error');
        }
    } else {
        alwaysListening = false;
        if (alwaysRecognition) {
            alwaysRecognition.stop();
            alwaysRecognition = null;
        }
        if (wakeLock) {
            wakeLock.release();
            wakeLock = null;
        }
        if (micFab) micFab.classList.remove('listening');
        if (micLabel) micLabel.innerText = 'Ativar';
        if (indicator) indicator.classList.add('hidden');
        showToast('🎙️ Escuta desativada.', 'info');
        speak('Escuta desativada.');
    }
    localStorage.setItem('navi_always_listening', alwaysListening ? 'true' : 'false');
}

// --- VISIBILITY CHANGE ---
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible' && alwaysListening) {
        console.log('App visible, checking recognition...');
        if (!alwaysRecognition) {
            console.log('Restarting recognition');
            toggleAlwaysListening();
        }
    }
});

// --- MAYDAY ---
function triggerMayday() {
    closeAllModals();    var overlay = document.getElementById('mayday-overlay');
    if (overlay) overlay.classList.remove('hidden');
    speak('Modo emergência. Respire.');
}

function closeMayday() {
    var overlay = document.getElementById('mayday-overlay');
    if (overlay) overlay.classList.add('hidden');
    speak('Sistemas normalizados.');
}

// --- INICIALIZAÇÃO ---
window.addEventListener('DOMContentLoaded', function() {
    console.log('NAVI v9.5 - DOM loaded');
    
    // REGISTRAR SERVICE WORKER PARA PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('✅ Service Worker registrado:', registration);
                showToast('🚀 PWA pronto para instalação', 'success');
            })
            .catch(function(error) {
                console.log('❌ Erro ao registrar Service Worker:', error);
                showToast('⚠️ PWA não disponível', 'error');
            });
    }
    
    updateAppMode();
    
    var btn = document.getElementById('btn-start');
    var statusEl = document.getElementById('ai-status');
    if (btn && statusEl) {
        if (typeof mobilenet !== 'undefined') {
            mobilenet.load({ version: 1, alpha: 0.25 }).then(function() {
                statusEl.innerText = '✅ IA Pronta!';
                btn.disabled = false;
            }).catch(function() {
                statusEl.innerText = '⚠️ IA falhou.';
                btn.disabled = false;
            });
        } else {
            statusEl.innerText = 'MobileNet não disponível.';
            btn.disabled = false;
        }
    }
    
    if (profile) {
        var modal = document.getElementById('profile-modal');
        if (modal) modal.classList.add('hidden');        initDashboard();
        checkStreak();
        applyBackground();
    }
    
    if (!isPWAInstalled && localStorage.getItem('navi_install_dismissed') !== 'true') {
        window.addEventListener('beforeinstallprompt', function(e) {
            e.preventDefault();
            deferredPrompt = e;
            var banner = document.getElementById('install-banner');
            if (banner) banner.classList.remove('hidden');
        });
    }
    
    if (localStorage.getItem('navi_always_listening') === 'true') {
        setTimeout(function() {
            console.log('Restoring listening');
            toggleAlwaysListening();
        }, 1000);
    }
    
    var urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('wake') === 'true') {
        showToast('🔔 NAVI acordado!', 'info');
        speak('Estou aqui.');
        setTimeout(function() {
            if (!alwaysListening) toggleAlwaysListening();
        }, 1500);
    }
    
    console.log('NAVI v9.5 - Ready');
});