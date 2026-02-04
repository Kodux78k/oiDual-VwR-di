/**
 * DUAL ORIGIN // CONVERGENCE MODULE
 * Lê chaves locais (Origin) e sistêmicas (Fusion Orbs)
 */

(function(){
  // --- 1. CONFIG & REFERENCES ---
  const timeEl   = document.getElementById('timeNow');
  const timeSub  = document.getElementById('timeSub');
  const intentEl = document.getElementById('intentInput');
  
  // UI References
  const appsList   = document.getElementById('appsList');
  const appsCount  = document.getElementById('appsCount');
  const iframeDeck = document.getElementById('iframeDeck');
  const consolePanel = document.getElementById('consolePanel');
  const lsDump       = document.getElementById('consoleLsDump');

  // --- 2. ORB KEYS DEFINITION ---
  const ORB_KEYS = {
    INTENT:    'di_origin_intent',
    LOCAL:     'di_origin_apps_v3',      // Orb 1: Seus apps locais
    FUSION_V4: 'DI_SYSTEM_DUAL_APPS',    // Orb 2: Fusion OS v2.4 (Mestre)
    FUSION_V3: 'fusion_os_state_v2_3'    // Legacy: Backup da v2.3
  };

  // --- 3. TIME & PHRASES ENGINE ---
  const phrases = {
    morning: [
      'Bom dia · Sincronizando orbs de dados.',
      'Amanheceu · O sistema Fusion aguarda comando.',
      'Pulso da manhã · A intenção define a realidade.'
    ],
    afternoon: [
      'Boa tarde · Convergência de dados estável.',
      'Metade do dia · Foco no essencial, oculte o ruído.',
      'Tarde viva · Seus stacks estão prontos.'
    ],
    night: [
      'Boa noite · Modo noturno e economia de recursos.',
      'Noite acesa · Dados persistidos com segurança.',
      'Pulso noturno · Prepare o grid para amanhã.'
    ]
  };

  function setDynamicPhrase(){
    const now = new Date();
    const h   = now.getHours();
    let bucket = 'night';
    if(h >= 5 && h < 12) bucket = 'morning';
    else if(h >= 12 && h < 18) bucket = 'afternoon';
    const set = phrases[bucket] || phrases.night;
    const pick = set[Math.floor(Math.random() * set.length)];
    if(timeSub) timeSub.textContent = pick;
  }

  function tick(){
    const now = new Date();
    if(timeEl) timeEl.textContent = now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  }
  tick();
  setDynamicPhrase();
  setInterval(tick, 60000);

  function log(msg){
    const box = document.getElementById('logBox');
    const mirror = document.getElementById('consoleLogMirror');
    const time = new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
    const txt = `${time} · ${msg}`;

    if(box){
      const line = document.createElement('div');
      line.textContent = txt;
      box.prepend(line);
      if(box.childElementCount > 20) box.removeChild(box.lastElementChild);
    }
    
    // Espelho no console avançado
    if(mirror) {
        const line = document.createElement('div');
        line.textContent = txt;
        mirror.prepend(line);
        if(mirror.childElementCount > 10) mirror.removeChild(mirror.lastElementChild);
    }
  }

  // --- 4. INTENT LOGIC ---
  if(intentEl){
    try{
      const saved = localStorage.getItem(ORB_KEYS.INTENT);
      if(saved) intentEl.value = saved;
    }catch(e){}

    intentEl.addEventListener('input', e=>{
      try{ localStorage.setItem(ORB_KEYS.INTENT, e.target.value); }catch(e){}
      // Debounce log to avoid spam
      clearTimeout(window.intentLogTimer);
      window.intentLogTimer = setTimeout(() => log('Intenção atualizada.'), 1000);
    });
  }

  // --- 5. CORE: ORB CONVERGENCE (DATA MERGE) ---
  let apps = [];

  function loadLocalApps() {
      try {
          const raw = localStorage.getItem(ORB_KEYS.LOCAL);
          return raw ? (JSON.parse(raw) || []) : [];
      } catch(e) { return []; }
  }

  function getSystemOrbData() {
    let systemApps = [];
    
    // Helper para extrair lista de diferentes formatos de JSON
    const extract = (key, sourceName) => {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            
            // Fusion OS guarda dentro de { installed: [...] }
            const list = Array.isArray(parsed) ? parsed : (parsed.installed || []);
            
            list.forEach(item => {
                // Normaliza para o formato deste painel
                systemApps.push({
                    id: item.id || item.code || `sys_${Math.random()}`,
                    name: item.name || 'Módulo Fusion',
                    url: item.url || '',
                    // Fusion usa 'desc', aqui usamos 'group'. Adaptamos:
                    group: item.group || (sourceName + (item.desc ? ` / ${item.desc.substring(0,10)}...` : '')),
                    isSystem: true // Marca para não deletar permanentemente aqui
                });
            });
            if(list.length > 0) log(`Orb ${sourceName}: ${list.length} módulos detectados.`);
        } catch(e) { console.warn(`Falha ao ler ${key}`, e); }
    };

    // Leitura dos dois Orbs externos
    extract(ORB_KEYS.FUSION_V4, 'Fusion v2.4');
    extract(ORB_KEYS.FUSION_V3, 'Fusion Legacy');
    
    return systemApps;
  }

  function normalizeUrl(u){
    try{ return new URL(u, location.href).href.replace(/\/+$/, ''); }
    catch(e){ return (u || '').trim(); }
  }

  // A Grande Unificação
  (function convergeOrbs(){
    const local = loadLocalApps();
    const system = getSystemOrbData();
    
    // 1. Adiciona locais
    apps = [...local];
    
    // 2. Mescla sistema evitando duplicatas de URL
    const existingUrls = new Set(apps.filter(a=>a.url).map(a=>normalizeUrl(a.url)));
    
    system.forEach(sysApp => {
        if(sysApp.url && existingUrls.has(normalizeUrl(sysApp.url))) return;
        apps.push(sysApp);
        existingUrls.add(normalizeUrl(sysApp.url));
    });

    saveApps(false); // Salva, mas false = não sobrescrever localStorage com dados do sistema misturados
    renderApps();
    log(`Convergência completa: ${apps.length} cards ativos.`);
  })();

  function saveApps(persistToDisk = true){
    // Filtra apenas os que não são do sistema para salvar no Local Storage "Origin"
    // Isso evita que o Origin "roube" e duplique os dados do Fusion para sempre
    if(persistToDisk){
        const toSave = apps.filter(a => !a.isSystem);
        try{ localStorage.setItem(ORB_KEYS.LOCAL, JSON.stringify(toSave)); }
        catch(e){}
    }
    renderApps();
  }

  // --- 6. RENDERING ---
  function renderApps(){
    if(!appsList) return;
    appsList.innerHTML = '';
    if(appsCount) appsCount.textContent = apps.length + (apps.length === 1 ? ' orb' : ' orbs');

    apps.forEach(app=>{
      const card = document.createElement('div');
      card.className = 'app-card';
      if(app.isSystem) card.classList.add('is-system'); // Estilo visual opcional
      card.dataset.id = app.id;

      card.innerHTML = `
        <div class="app-main">
          <div class="app-title">
            ${app.isSystem ? '🔹 ' : ''}${escapeHtml(app.name)}
          </div>
          <div class="app-meta">
            <span class="app-group">${escapeHtml(app.group) || 'Geral'}</span>
            <span class="app-url">${escapeHtml(app.url).substring(0, 30)}...</span>
          </div>
        </div>
        <div class="app-actions">
          <button class="app-btn open"  data-action="open"   title="Abrir Card">▣</button>
          <button class="app-btn remove" data-action="remove" title="${app.isSystem ? 'Ocultar (Sistema)' : 'Remover'}">✕</button>
        </div>
      `;

      card.querySelectorAll('.app-btn').forEach(btn=>{
        btn.addEventListener('click', (e)=>{
          e.stopPropagation();
          const action = btn.dataset.action;
          if(action === 'open') openAppCard(app);
          if(action === 'remove') removeApp(app.id, app.isSystem);
        });
      });

      appsList.appendChild(card);
    });
  }

  function removeApp(id, isSystem){
    const idx = apps.findIndex(a => a.id === id);
    if(idx === -1) return;
    
    let msg = 'Remover este app da lista local?';
    if(isSystem) msg = 'Este é um módulo do Fusion OS. Remover aqui apenas o oculta nesta sessão.';
    
    if(!confirm(msg)) return;
    
    apps.splice(idx,1);
    log('Orb removido/ocultado.');
    saveApps(!isSystem); // Se for sistema, não salva no disco local para não corromper
  }

  function openAppCard(app){
    if(!app.url){ alert('URL inválida no Orb.'); return; }
    
    const card = document.createElement('section');
    card.className = 'iframe-card';
    card.dataset.id = app.id;

    card.innerHTML = `
      <div class="iframe-card-header">
        <div class="iframe-card-title">${escapeHtml(app.name)}</div>
        <div class="iframe-card-actions">
          <span class="iframe-card-group">${escapeHtml(app.group)}</span>
          <button type="button" data-action="open-new" title="Nova Aba">⧉</button>
          <button type="button" data-action="close" title="Fechar">✕</button>
        </div>
      </div>
      <iframe src="${escapeAttr(app.url)}" loading="lazy" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>
    `;

    card.querySelectorAll('.iframe-card-actions button').forEach(btn=>{
      const act = btn.dataset.action;
      btn.addEventListener('click', ()=>{
        if(act === 'close'){
          if(iframeDeck.contains(card)) iframeDeck.removeChild(card);
          log('Card fechado.');
        }else if(act === 'open-new'){
          window.open(app.url, '_blank');
        }
      });
    });

    if(iframeDeck) iframeDeck.appendChild(card);
    log(`Card expandido: ${app.name}`);
  }

  // --- 7. INTERACTIONS ---

  // Add Button
  const btnAdd = document.getElementById('btnAddApp');
  if(btnAdd) btnAdd.addEventListener('click', ()=>{
    const name = prompt('Nome do novo Orb:');
    if(!name) return;
    const url  = prompt('URL de destino:','https://');
    if(!url) return;
    const group = prompt('Grupo/Tag:') || 'Manual';

    const id = 'di_app_' + Date.now();
    apps.push({ id, name, url, group, isSystem: false });
    log('Novo Orb local criado.');
    saveApps(true);
  });

  // Docs Button
  const btnDocs = document.getElementById('btnDocs');
  if(btnDocs) btnDocs.addEventListener('click', ()=>{
    log('Acessando Documentação Unificada...');
    // Procura se já existe um app de docs nos orbs
    const docApp = apps.find(a => a.name.toLowerCase().includes('docs') || a.name.toLowerCase().includes('livro'));
    if(docApp) openAppCard(docApp);
    else alert('Nenhum módulo de documentação encontrado nos Orbs.');
  });

  // Console Logic
  const consoleToggle = document.getElementById('consoleToggle');
  const consoleClose  = document.getElementById('consoleClose');
  
  function setConsoleOpen(open){
    if(!consolePanel) return;
    if(open) {
        consolePanel.classList.add('open');
        consolePanel.setAttribute('aria-hidden','false');
        dumpLocalStorage(); // Atualiza ao abrir
    } else {
        consolePanel.classList.remove('open');
        consolePanel.setAttribute('aria-hidden','true');
    }
  }

  if(consoleToggle) consoleToggle.addEventListener('click', () => setConsoleOpen(!consolePanel.classList.contains('open')));
  if(consoleClose) consoleClose.addEventListener('click', () => setConsoleOpen(false));

  function dumpLocalStorage(){
    if(!lsDump) return;
    try{
      const lines = [];
      // Cabeçalho personalizado
      lines.push(`<div style="color:#00f2ff; margin-bottom:10px;">--- ORB STORAGE DUMP ---</div>`);
      
      for(let i=0;i<localStorage.length;i++){
        const key = localStorage.key(i);
        if(!key) continue;
        const val = localStorage.getItem(key);
        
        let displayVal = val.length > 50 ? val.substring(0,50) + '...' : val;
        let cssClass = '';
        
        // Destaca as chaves dos Orbs
        if(key === ORB_KEYS.FUSION_V4 || key === ORB_KEYS.FUSION_V3) cssClass = 'color: #bd00ff; font-weight:bold;'; // Roxo (Fusion)
        else if(key === ORB_KEYS.LOCAL) cssClass = 'color: #00f2ff; font-weight:bold;'; // Ciano (Local)
        else if(key.startsWith('di_')) cssClass = 'color: #ffff00;'; // Amarelo (Outros DI)

        lines.push(`<div style="border-bottom:1px solid #333; padding:2px 0;">
            <span style="${cssClass}">${escapeHtml(key)}</span>: 
            <span style="color:#888;">${escapeHtml(displayVal)}</span>
        </div>`);
      }
      lsDump.innerHTML = lines.join('');
    }catch(e){
      lsDump.textContent = 'Erro de leitura de armazenamento.';
    }
  }

  // Ações do Console (Limpeza e Dumps)
  document.querySelectorAll('[data-ls-action]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const action = btn.getAttribute('data-ls-action');
      if(action === 'dump') dumpLocalStorage();
      if(action === 'clear-intent') {
          localStorage.removeItem(ORB_KEYS.INTENT);
          if(intentEl) intentEl.value = '';
          log('Intenção resetada.');
          dumpLocalStorage();
      }
      if(action === 'clear-apps') {
          if(confirm('Isso apaga seus apps LOCAIS. Os do Fusion retornarão no próximo reload. Confirmar?')){
             localStorage.removeItem(ORB_KEYS.LOCAL);
             location.reload();
          }
      }
    });
  });

  // Helpers
  function escapeHtml(s){
    if(!s && s !== 0) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function escapeAttr(s){ return escapeHtml(s); }
})();
