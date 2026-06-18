// NAVI v1.0 Beta - MODO LIVRE

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
var isBreathing = false;
var currentMission = '';
var moodChartInstance = null;
var wakeLock = null;
var currentTechnique = null;
var currentCycle = 0;
var breathTimer = null;
var totalBreathTime = 0;

var missions = [
    ' Estudar 3 palavras novas em inglês',
    '💻 Escrever 1 função em JavaScript',
    '🎸 Tocar 1 música completa no violão',
    '💧 Beber 500ml de água e fazer skincare',
    '📖 Ler 10 páginas de um livro',
    '🎯 Completar 1 exercício de programação',
    '🧘 Fazer 5 minutos de meditação',
    '✍️ Escrever 3 coisas pelas quais é grato'
];

var breathingTechniques = [
    { id: '478', name: 'Respiração 4-7-8', icon: '😴', goal: 'Acalmar / Dormir', badge: 'calm', description: 'Inspire por 4s, segure por 7s, expire por 8s. Reduz frequência cardíaca.', phases: { inspirar: 4, segurar: 7, expirar: 8, pausar: 0 }, cycles: 8 },
    { id: 'square', name: 'Respiração Quadrada', icon: '⬛', goal: 'Foco / Ansiedade', badge: 'focus', description: 'Inspire, segure, expire e pause, tudo por 4 segundos.', phases: { inspirar: 4, segurar: 4, expirar: 4, pausar: 4 }, cycles: 8 },
    { id: 'sigh', name: 'Suspiro Cíclico', icon: '💨', goal: 'Humor / Ansiedade', badge: 'calm', description: 'Inspiração profunda seguida de pausa breve, depois expiração lenta.', phases: { inspirar: 5, segurar: 2, expirar: 6, pausar: 2 }, cycles: 10 },
    { id: 'diaphragmatic', name: 'Respiração Diafragmática', icon: '🫁', goal: 'Relaxamento Profundo', badge: 'calm', description: 'Respire lentamente pelo nariz, sentindo o abdômen expandir.', phases: { inspirar: 5, segurar: 2, expirar: 7, pausar: 1 }, cycles: 10 },
    { id: 'nadi', name: 'Respiração Alternada', icon: '🔄', goal: 'Equilíbrio Mental', badge: 'focus', description: 'Equilibra os hemisférios cerebrais. Alterne narinas.', phases: { inspirar: 4, segurar: 4, expirar: 4, pausar: 2 }, cycles: 10 },
    { id: 'bee', name: 'Respiração da Abelha', icon: '🐝', goal: 'Insônia / Estresse', badge: 'sleep', description: 'Inspire profundamente e, ao expirar, emita um zumbido suave.', phases: { inspirar: 4, segurar: 2, expirar: 6, pausar: 2 }, cycles: 8 },
    { id: 'ocean', name: 'Respiração do Oceano', icon: '🌊', goal: 'Introspecção / Foco', badge: 'focus', description: 'Respire contraindo levemente a garganta, produzindo som de ondas.', phases: { inspirar: 5, segurar: 2, expirar: 5, pausar: 1 }, cycles: 12 },
    { id: 'bellows', name: 'Respiração de Fole', icon: '💨', goal: 'Energia / Disposição', badge: 'energy', description: 'Inspirações e expirações rápidas pelo nariz.', phases: { inspirar: 1, segurar: 0, expirar: 1, pausar: 0 }, cycles: 30 },
    { id: 'skull', name: 'Crânio Brilhante', icon: '✨', goal: 'Energia / Clareza', badge: 'energy', description: 'Exalações rápidas contraindo o abdômen.', phases: { inspirar: 1, segurar: 0, expirar: 1, pausar: 0 }, cycles: 30 }
];

function showToast(message, type) {
    if (!type) type = 'info';
    var container = document.getElementById('toast-container');    if (!container) return;
    var toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 3000);
}

function speak(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(text);
        u.lang = 'pt-BR';
        window.speechSynthesis.speak(u);
    }
}

function compressImage(file, maxWidth, maxHeight, quality) {
    return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function(event) {
            var img = new Image();
            img.src = event.target.result;
            img.onload = function() {
                var canvas = document.createElement('canvas');
                var width = img.width; var height = img.height;
                if (width > height) { if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; } }
                else { if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; } }
                canvas.width = width; canvas.height = height;
                var ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = function(error) { reject(error); };
        };
        reader.onerror = function(error) { reject(error); };
    });
}

function applyBackground() {
    if (profile && profile.backgroundImage) {
        document.body.style.backgroundImage = 'url(' + profile.backgroundImage + ')';
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.classList.add('has-background');
    } else {
        document.body.style.backgroundImage = 'none';
        document.body.classList.remove('has-background');
    }}

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

function closeAllModals() {
    var modals = document.querySelectorAll('.overlay:not(#profile-modal)');
    modals.forEach(function(modal) { modal.classList.add('hidden'); });
}

function openModal(id) {
    closeAllModals();
    var modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('hidden');
        if (id === 'analytics-modal') renderAnalytics();
        if (id === 'mission-modal') newMission();
        if (id === 'calm-modal') {
            renderTechniques();
            var techList = document.getElementById('breathTechniques');
            var selected = document.getElementById('selectedTechnique');
            if (techList) techList.classList.remove('hidden');
            if (selected) selected.classList.add('hidden');
        }
    }
}

function closeModal(id) {
    var modal = document.getElementById(id);
    if (modal) modal.classList.add('hidden');
    if (id === 'calm-modal' && isBreathing) toggleBreathing();
}

function updateAppMode() {
    var appModeEl = document.getElementById('appMode');
    if (appModeEl) appModeEl.innerText = isPWAInstalled ? 'NAVI v1.0 Beta (Instalado)' : 'NAVI v1.0 Beta (Web)';
}

function installPWA() {    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function(choiceResult) {
            if (choiceResult.outcome === 'accepted') { showToast('✅ NAVI instalado!', 'success'); speak('NAVI instalado!'); }
            deferredPrompt = null;
            dismissInstall();
        });
    } else { showToast('📲 Menu > Adicionar à tela inicial', 'info'); }
}

function dismissInstall() {
    var banner = document.getElementById('install-banner');
    if (banner) banner.classList.add('hidden');
    localStorage.setItem('navi_install_dismissed', 'true');
}

function checkStreak() {
    var today = new Date().toDateString();
    if (lastActiveDate !== today) {
        var yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        if (lastActiveDate === yesterday.toDateString()) streak++; else streak = 1;
        lastActiveDate = today;
        localStorage.setItem('navi_streak', streak);
        localStorage.setItem('navi_last_active', today);
    }
}

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
    if (bpImg) bpImg.src = profile.image || 'https://ui-avatars.com/api/?name=' + profile.name + '&background=0D8ABC&color=fff&size=128';
    if (greeting) greeting.innerText = 'Bem-vindo(a), ' + profile.title + ' ' + profile.name + '.';
    if (userInfo) userInfo.innerText = profile.name + ' | ' + profile.title;
}

async function processImageAndStart() {
    var name = document.getElementById('inputName').value.trim();
    var title = document.getElementById('inputTitle').value.trim();
    var tone = document.getElementById('inputTone').value;
    var fileInput = document.getElementById('inputImageFile');    var bgFileInput = document.getElementById('inputBackgroundFile');
    if (!name || !title) { showToast('Preencha nome e título!', 'error'); return; }
    showToast('⏳ Processando...', 'info');
    var profileImage = profile ? profile.image : null;
    if (fileInput && fileInput.files && fileInput.files[0]) { try { profileImage = await compressImage(fileInput.files[0], 300, 300, 0.8); } catch (e) { showToast('Erro na foto', 'error'); } }
    var backgroundImage = profile ? profile.backgroundImage : null;
    if (bgFileInput && bgFileInput.files && bgFileInput.files[0]) { try { backgroundImage = await compressImage(bgFileInput.files[0], 800, 800, 0.7); } catch (e) { showToast('Erro no fundo', 'error'); } }
    profile = { name: name, title: title, tone: tone, image: profileImage, backgroundImage: backgroundImage };
    try { localStorage.setItem('navi_profile', JSON.stringify(profile)); } catch (e) { showToast('Imagem muito pesada', 'error'); return; }
    document.getElementById('profile-modal').classList.add('hidden');
    initDashboard(); checkStreak(); applyBackground();
    speak('Bem-vindo(a), ' + title + ' ' + name);
    showToast('Perfil criado!', 'success');
}

function editProfile() {
    if (!profile) { showToast('Crie um perfil primeiro!', 'error'); return; }
    closeAllModals();
    document.getElementById('profile-modal').classList.remove('hidden');
    document.getElementById('inputName').value = profile.name;
    document.getElementById('inputTitle').value = profile.title;
    document.getElementById('inputTone').value = profile.tone;
}

function newMission() {
    currentMission = missions[Math.floor(Math.random() * missions.length)];
    var textEl = document.getElementById('missionText');
    if (textEl) textEl.innerText = currentMission;
}

function completeMission() {
    if (!currentMission) { showToast('Nenhuma missão ativa!', 'error'); return; }
    flightHours += 0.5;
    localStorage.setItem('navi_hours', flightHours);
    var bpHours = document.getElementById('bpHours');
    if (bpHours) bpHours.innerText = flightHours;
    showToast('✅ Missão cumprida! +0.5h', 'success');
    speak('Missão cumprida!');
    closeModal('mission-modal');
}

function updateTimerDisplay() {
    var m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    var s = (timeLeft % 60).toString().padStart(2, '0');
    var el = document.getElementById('timerDisplay');
    if (el) el.innerText = m + ':' + s;
}

function startTimer() {
    if (timerInterval) return;    timerInterval = setInterval(function() {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft <= 0) {
            clearInterval(timerInterval); timerInterval = null;
            flightHours += 0.5;
            localStorage.setItem('navi_hours', flightHours);
            var bpHours = document.getElementById('bpHours');
            if (bpHours) bpHours.innerText = flightHours;
            showToast('️ Foco concluído! +0.5h', 'success');
            speak('Tempo de foco concluído!');
            resetTimer();
        }
    }, 1000);
    showToast('▶️ Timer iniciado', 'info');
}

function pauseTimer() { clearInterval(timerInterval); timerInterval = null; showToast('⏸️ Pausado', 'info'); }
function resetTimer() { pauseTimer(); timeLeft = 25 * 60; updateTimerDisplay(); showToast(' Resetado', 'info'); }

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
        filter.type = 'lowpass'; filter.frequency.value = 800;
        currentNoiseNode.connect(filter).connect(gain).connect(audioCtx.destination);
    } else { currentNoiseNode.connect(gain).connect(audioCtx.destination); }
    currentNoiseNode.start();
    showToast('🔊 Som ' + type + ' ativado', 'info');
}

function stopSound() {
    if (currentNoiseNode) { currentNoiseNode.stop(); currentNoiseNode = null; }
    if (audioCtx) { audioCtx.close(); audioCtx = null; }    showToast('🔇 Som desativado', 'info');
}

function renderTechniques() {
    var container = document.getElementById('breathTechniques');
    if (!container) return;
    container.innerHTML = '';
    breathingTechniques.forEach(function(tech) {
        var card = document.createElement('div');
        card.className = 'technique-card';
        card.onclick = function() { selectTechnique(tech.id); };
        card.innerHTML = '<span class="tech-icon">' + tech.icon + '</span><div class="tech-info"><div class="tech-name">' + tech.name + '</div><span class="technique-badge badge-' + tech.badge + '">' + tech.goal + '</span></div>';
        container.appendChild(card);
    });
}

function selectTechnique(id) {
    currentTechnique = breathingTechniques.find(function(t) { return t.id === id; });
    if (!currentTechnique) return;
    document.getElementById('breathTechniques').classList.add('hidden');
    document.getElementById('selectedTechnique').classList.remove('hidden');
    document.getElementById('techIcon').innerText = currentTechnique.icon;
    document.getElementById('techName').innerText = currentTechnique.name;
    document.getElementById('techDescription').innerText = currentTechnique.description;
    var badge = document.getElementById('techBadge');
    badge.innerText = currentTechnique.goal;
    badge.className = 'technique-badge badge-' + currentTechnique.badge;
    currentCycle = 0; totalBreathTime = 0;
    updateBreathInfo();
}

function backToTechniques() {
    if (isBreathing) toggleBreathing();
    document.getElementById('breathTechniques').classList.remove('hidden');
    document.getElementById('selectedTechnique').classList.add('hidden');
}

function updateBreathInfo() {
    var cycleEl = document.getElementById('breathCycle');
    var timeEl = document.getElementById('breathTime');
    if (cycleEl && currentTechnique) cycleEl.innerText = 'Ciclo: ' + currentCycle + '/' + currentTechnique.cycles;
    if (timeEl) {
        var m = Math.floor(totalBreathTime / 60);
        var s = totalBreathTime % 60;
        timeEl.innerText = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }
}

function toggleBreathing() {
    var circle = document.getElementById('breathCircle');    var btn = document.getElementById('breathBtn');
    if (!isBreathing) {
        isBreathing = true;
        if (btn) btn.innerText = '⏹️ Parar';
        runBreathCycle();
    } else {
        isBreathing = false;
        if (circle) circle.style.transform = 'scale(1)';
        if (btn) btn.innerText = '▶️ Iniciar';
        if (breathTimer) { clearInterval(breathTimer); breathTimer = null; }
        speak('Respiração pausada.');
    }
}

function runBreathCycle() {
    if (!isBreathing || !currentTechnique) return;
    currentCycle++;
    if (currentCycle > currentTechnique.cycles) {
        isBreathing = false;
        var circle = document.getElementById('breathCircle');
        if (circle) circle.style.transform = 'scale(1)';
        document.getElementById('breathBtn').innerText = '▶️ Iniciar';
        showToast('✅ Técnica concluída! ' + currentTechnique.cycles + ' ciclos.', 'success');
        speak('Técnica concluída.');
        currentCycle = 0;
        return;
    }
    var phases = currentTechnique.phases;
    var sequence = [];
    if (phases.inspirar > 0) sequence.push({ name: 'INSPIRE', time: phases.inspirar, scale: 1.2 });
    if (phases.segurar > 0) sequence.push({ name: 'SEGURE', time: phases.segurar, scale: 1.2 });
    if (phases.expirar > 0) sequence.push({ name: 'EXPIRE', time: phases.expirar, scale: 0.8 });
    if (phases.pausar > 0) sequence.push({ name: 'PAUSE', time: phases.pausar, scale: 0.8 });
    runPhaseSequence(sequence, 0);
}

function runPhaseSequence(sequence, index) {
    if (!isBreathing || index >= sequence.length) { if (isBreathing) runBreathCycle(); return; }
    var phase = sequence[index];
    var textEl = document.getElementById('breathText');
    var circle = document.getElementById('breathCircle');
    if (textEl) textEl.innerText = phase.name;
    if (circle) { circle.style.transform = 'scale(' + phase.scale + ')'; circle.style.transition = 'transform ' + phase.time + 's ease-in-out'; }
    var remaining = phase.time;
    breathTimer = setInterval(function() {
        remaining--; totalBreathTime++;
        updateBreathInfo();
        if (remaining <= 0) { clearInterval(breathTimer); breathTimer = null; runPhaseSequence(sequence, index + 1); }
    }, 1000);
}
function confirmChecklist() {
    var items = document.querySelectorAll('#checklistContainer .checklist-item');
    var checked = 0;
    items.forEach(function(item) { if (item.classList.contains('checked')) checked++; });
    showToast('✅ ' + checked + '/' + items.length + ' itens!', 'success');
    speak('Checklist confirmado!');
    closeModal('checklist-modal');
}

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
            var d = new Date(); d.setDate(d.getDate() - i);
            var isActive = d.toDateString() === new Date().toDateString();
            grid.innerHTML += '<div class="cal-day ' + (isActive ? 'active' : '') + '"><span class="day-name">' + days[d.getDay()] + '</span>' + d.getDate() + '</div>';
        }
    }
    var ctx = document.getElementById('moodChart');
    if (ctx && typeof Chart !== 'undefined') {
        if (moodChartInstance) moodChartInstance.destroy();
        moodChartInstance = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: { labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'], datasets: [{ label: 'Energia', data: [3, 4, 2, 5, 4, 5, 3], borderColor: '#00ff9d', backgroundColor: 'rgba(0, 255, 157, 0.1)', tension: 0.4, fill: true }] },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 5 } } }
        });
    }
}

function generatePDF() {
    if (typeof window.jspdf === 'undefined') { showToast('jsPDF não carregado', 'error'); return; }
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF();
    doc.setFontSize(22); doc.setTextColor(0, 240, 255);
    doc.text("NAVI | Relatório de Voo", 105, 20, null, null, "center");
    doc.setFontSize(12); doc.setTextColor(0, 0, 0);
    doc.text("Comandante: " + profile.name + " (" + profile.title + ")", 20, 40);
    doc.text("Horas de Voo: " + flightHours + "h", 20, 50);
    doc.text("Streak: " + streak + " dias", 20, 60);
    doc.save("NAVI_Relatorio_" + profile.name + ".pdf");
    showToast('📄 PDF gerado!', 'success');}

function processVoiceCommand(command) {
    console.log('Comando:', command);
    var lower = command.toLowerCase().trim();
    var hotwords = ['navi', 'nave', 'navy', 'naby'];
    for (var i = 0; i < hotwords.length; i++) {
        if (lower.indexOf(hotwords[i]) !== -1) { lower = lower.replace(hotwords[i], '').trim(); break; }
    }
    if (lower.indexOf('missão') !== -1 || lower.indexOf('missao') !== -1 || lower.indexOf('plano de voo') !== -1) { openModal('mission-modal'); speak('Plano de voo aberto'); return; }
    if (lower.indexOf('foco') !== -1 || lower.indexOf('pomodoro') !== -1 || lower.indexOf('timer') !== -1) { openModal('pomodoro-modal'); speak('Modo foco ativado'); return; }
    if (lower.indexOf('4-7-8') !== -1 || lower.indexOf('quatro sete oito') !== -1) { openModal('calm-modal'); setTimeout(function() { selectTechnique('478'); }, 300); speak('Respiração 4-7-8'); return; }
    if (lower.indexOf('quadrada') !== -1) { openModal('calm-modal'); setTimeout(function() { selectTechnique('square'); }, 300); speak('Respiração quadrada'); return; }
    if (lower.indexOf('abelha') !== -1) { openModal('calm-modal'); setTimeout(function() { selectTechnique('bee'); }, 300); speak('Respiração da abelha'); return; }
    if (lower.indexOf('oceano') !== -1) { openModal('calm-modal'); setTimeout(function() { selectTechnique('ocean'); }, 300); speak('Respiração do oceano'); return; }
    if (lower.indexOf('alternada') !== -1 || lower.indexOf('nadi') !== -1) { openModal('calm-modal'); setTimeout(function() { selectTechnique('nadi'); }, 300); speak('Respiração alternada'); return; }
    if (lower.indexOf('fole') !== -1) { openModal('calm-modal'); setTimeout(function() { selectTechnique('bellows'); }, 300); speak('Respiração de fole'); return; }
    if (lower.indexOf('crânio') !== -1 || lower.indexOf('cranio') !== -1) { openModal('calm-modal'); setTimeout(function() { selectTechnique('skull'); }, 300); speak('Crânio brilhante'); return; }
    if (lower.indexOf('diafragm') !== -1) { openModal('calm-modal'); setTimeout(function() { selectTechnique('diaphragmatic'); }, 300); speak('Respiração diafragmática'); return; }
    if (lower.indexOf('suspiro') !== -1) { openModal('calm-modal'); setTimeout(function() { selectTechnique('sigh'); }, 300); speak('Suspiro cíclico'); return; }
    if (lower.indexOf('respirar') !== -1 || lower.indexOf('calma') !== -1 || lower.indexOf('turbulencia') !== -1 || lower.indexOf('turbulência') !== -1 || lower.indexOf('ansiedade') !== -1) { openModal('calm-modal'); speak('Controle de turbulência'); return; }
    if (lower.indexOf('checklist') !== -1 || lower.indexOf('check list') !== -1) { openModal('checklist-modal'); speak('Checklist aberto'); return; }
    if (lower.indexOf('estatisticas') !== -1 || lower.indexOf('estatísticas') !== -1 || lower.indexOf('grafico') !== -1 || lower.indexOf('gráfico') !== -1 || lower.indexOf('analytics') !== -1) { openModal('analytics-modal'); speak('Analytics aberto'); return; }
    if (lower.indexOf('perfil') !== -1 || lower.indexOf('editar') !== -1 || lower.indexOf('edita') !== -1) { editProfile(); speak('Abrindo perfil'); return; }
    if (lower.indexOf('ajuda') !== -1 || lower.indexOf('comandos') !== -1) { openModal('voice-commands-modal'); speak('Comandos disponíveis'); return; }
    if (lower.indexOf('mayday') !== -1 || lower.indexOf('emergencia') !== -1 || lower.indexOf('emergência') !== -1) { triggerMayday(); speak('Modo emergência'); return; }
    if (lower.indexOf('reset') !== -1 || lower.indexOf('resetar') !== -1) { confirmReset(); return; }
    if (lower.indexOf('claro') !== -1 || lower.indexOf('light') !== -1) { if (!isLightMode) { toggleTheme(); speak('Tema claro'); } return; }
    if (lower.indexOf('escuro') !== -1 || lower.indexOf('dark') !== -1) { if (isLightMode) { toggleTheme(); speak('Tema escuro'); } return; }
    if (lower.indexOf('parar') !== -1 || lower.indexOf('fechar') !== -1 || lower.indexOf('tchau') !== -1 || lower.indexOf('desativar tudo') !== -1) { closeAllModals(); if (alwaysListening) toggleAlwaysListening(); speak('Até logo'); return; }
    console.log('Não reconhecido:', lower);
}

async function toggleAlwaysListening() {
    var micFab = document.getElementById('micFab');
    var micLabel = document.getElementById('micLabel');
    var indicator = document.getElementById('voice-indicator');
    if (!alwaysListening) {
        var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) { showToast('❌ Navegador não suporta voz', 'error'); return; }
        try { if ('wakeLock' in navigator) { wakeLock = await navigator.wakeLock.request('screen'); } } catch (err) {}
        alwaysRecognition = new SpeechRecognition();
        alwaysRecognition.lang = 'pt-BR';
        alwaysRecognition.continuous = true;
        alwaysRecognition.interimResults = false;
        alwaysRecognition.onstart = function() {
            alwaysListening = true;
            if (micFab) micFab.classList.add('listening');
            if (micLabel) micLabel.innerText = 'Ativo';
            if (indicator) indicator.classList.remove('hidden');            showToast('🎙️ Escuta ativada!', 'success');
        };
        alwaysRecognition.onresult = function(event) {
            var command = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
            processVoiceCommand(command);
        };
        alwaysRecognition.onerror = function(event) {
            if (event.error === 'not-allowed') {
                showToast('❌ Microfone bloqueado', 'error');
                alwaysListening = false;
                if (micFab) micFab.classList.remove('listening');
                if (micLabel) micLabel.innerText = 'Ativar';
                if (indicator) indicator.classList.add('hidden');
            }
        };
        alwaysRecognition.onend = function() {
            if (alwaysListening) { setTimeout(function() { if (alwaysListening && alwaysRecognition) { try { alwaysRecognition.start(); } catch(e) {} } }, 500); }
        };
        try { alwaysRecognition.start(); } catch(e) { showToast('Erro ao iniciar voz', 'error'); }
    } else {
        alwaysListening = false;
        if (alwaysRecognition) { alwaysRecognition.stop(); alwaysRecognition = null; }
        if (wakeLock) { wakeLock.release(); wakeLock = null; }
        if (micFab) micFab.classList.remove('listening');
        if (micLabel) micLabel.innerText = 'Ativar';
        if (indicator) indicator.classList.add('hidden');
        showToast('🎙️ Escuta desativada.', 'info');
        speak('Escuta desativada.');
    }
    localStorage.setItem('navi_always_listening', alwaysListening ? 'true' : 'false');
}

document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible' && alwaysListening) { if (!alwaysRecognition) toggleAlwaysListening(); }
});

function triggerMayday() { closeAllModals(); var overlay = document.getElementById('mayday-overlay'); if (overlay) overlay.classList.remove('hidden'); speak('Modo emergência. Respire.'); }
function closeMayday() { var overlay = document.getElementById('mayday-overlay'); if (overlay) overlay.classList.add('hidden'); speak('Sistemas normalizados.'); }

function confirmReset() {
    if (confirm('⚠️ ATENÇÃO!\n\nIsso vai apagar TODO seu progresso:\n- Perfil\n- Horas de voo\n- Streak\n- Imagens\n- Configurações\n\nTem certeza?')) {
        if (confirm('🔒 Última chance! Confirma o reset?')) { resetAll(); }
    }
}

function resetAll() {
    if (alwaysListening) toggleAlwaysListening();
    var keys = ['navi_profile', 'navi_hours', 'navi_streak', 'navi_last_active', 'navi_theme_mode', 'navi_voice_settings', 'navi_always_listening', 'navi_install_dismissed'];
    keys.forEach(function(key) { localStorage.removeItem(key); });
    showToast('🔄 App resetado!', 'success');    speak('App resetado. Reiniciando...');
    setTimeout(function() { window.location.reload(); }, 2000);
}

window.addEventListener('DOMContentLoaded', function() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').then(function(registration) { console.log('✅ SW registrado'); }).catch(function(error) { console.log('❌ Erro SW:', error); });
    }
    updateAppMode();
    var btn = document.getElementById('btn-start');
    var statusEl = document.getElementById('ai-status');
    if (btn && statusEl) {
        if (typeof mobilenet !== 'undefined') {
            mobilenet.load({ version: 1, alpha: 0.25 }).then(function() { statusEl.innerText = '✅ IA Pronta!'; btn.disabled = false; }).catch(function() { statusEl.innerText = '⚠️ IA falhou.'; btn.disabled = false; });
        } else { statusEl.innerText = 'MobileNet não disponível.'; btn.disabled = false; }
    }
    if (profile) { var modal = document.getElementById('profile-modal'); if (modal) modal.classList.add('hidden'); initDashboard(); checkStreak(); applyBackground(); }
    if (!isPWAInstalled && localStorage.getItem('navi_install_dismissed') !== 'true') {
        window.addEventListener('beforeinstallprompt', function(e) { e.preventDefault(); deferredPrompt = e; var banner = document.getElementById('install-banner'); if (banner) banner.classList.remove('hidden'); });
    }
    if (localStorage.getItem('navi_always_listening') === 'true') { setTimeout(function() { toggleAlwaysListening(); }, 1000); }
    var urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('wake') === 'true') { showToast(' NAVI acordado!', 'info'); speak('Estou aqui.'); setTimeout(function() { if (!alwaysListening) toggleAlwaysListening(); }, 1500); }
});