
    (function(){
      const timeEl   = document.getElementById('timeNow');
      const timeSub  = document.getElementById('timeSub');
      const intentEl = document.getElementById('intentInput');

      // NOVAS CHAVES (padronizadas com prefixo di_)
      const di_INTENT_KEY = 'di_origin_intent';
      const di_APPS_KEY   = 'di_origin_apps_v3';
      const di_SYSTEM_KEY = 'di_system_dual_apps';

      /* Horário + frases dinâmicas */
      const phrases = {
        morning: [
          'Bom dia · hoje é um bom dia pra testar um app novo.',
          'Amanheceu · organiza o mínimo e o resto a gente improvisa.',
          'Pulso da manhã · uma intenção sincera já muda o dia inteiro.'
        ],
        afternoon: [
          'Boa tarde · esse card é sua mesa limpa de trabalho.',
          'Metade do dia · abrir um app certo vale mais que abrir dez.',
          'Tarde viva · testa um stack de cada vez e sente o efeito.'
        ],
        night: [
          'Boa noite · esse card é seu modo noturno de cuidado.',
          'Noite acesa · fecha o que pesa, guarda só o que brilha.',
          'Pulso noturno · um app certo antes de dormir já é ritual.'
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
        timeSub.textContent = pick;
      }

      function tick(){
        const now = new Date();
        timeEl.textContent = now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
      }
      tick();
      setDynamicPhrase();
      setInterval(tick, 60000);

      function log(msg){
        const box = document.getElementById('logBox');
        if(!box) return;
        const line = document.createElement('div');
        line.textContent = new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}) + ' · ' + msg;
        box.prepend(line);
        while(box.childElementCount > 20){
          box.removeChild(box.lastElementChild);
        }
      }

      /* Intenção */
      try{
        const saved = localStorage.getItem(di_INTENT_KEY);
        if(saved) intentEl.value = saved;
      }catch(e){}

      intentEl.addEventListener('input', e=>{
        try{
          localStorage.setItem(di_INTENT_KEY, e.target.value);
        }catch(e){}
        log('Intenção atualizada.');
      });

      /* Apps / Stacks */

      const appsList   = document.getElementById('appsList');
      const appsCount  = document.getElementById('appsCount');
      const iframeDeck = document.getElementById('iframeDeck');

      let apps = [];
      try{
        const raw = localStorage.getItem(di_APPS_KEY);
        if(raw) apps = JSON.parse(raw) || [];
      }catch(e){ apps = []; }

      // --- Leitura do sistema mestre e merge (se houver) ---
      function getDualSystemApps(){
        try{
          const raw = localStorage.getItem(di_SYSTEM_KEY);
          if(!raw) return [];
          const parsed = JSON.parse(raw);
          // possível formato: { installed: [...] } ou array direto
          if(Array.isArray(parsed)) return parsed;
          return parsed && parsed.installed ? parsed.installed : [];
        }catch(err){
          console.error('Dual System read fail', err);
          return [];
        }
      }

      (function mergeSystemApps(){
        try{
          const systemApps = getDualSystemApps();
          if(!systemApps || !systemApps.length) return;
          // dedupe por URL preferencialmente; se não tiver url, por nome
          const existingUrls = new Set(apps.filter(a=>a.url).map(a=>normalizeUrl(a.url)));
          systemApps.forEach(sa=>{
            const url = sa.url || '';
            const name = sa.name || sa.title || 'Sem nome';
            if(url && existingUrls.has(normalizeUrl(url))) return;
            // gerar id padronizado di_app_
            const id = sa.id || ('di_app_' + Date.now() + '_' + Math.floor(Math.random()*9999));
            apps.push({
              id,
              name,
              url,
              group: sa.group || sa.tag || ''
            });
            if(url) existingUrls.add(normalizeUrl(url));
          });
          saveApps(); // persiste merge
          log('Merge com di_system_dual_apps concluído ('+ systemApps.length +' itens).');
        }catch(e){}
      })();

      function normalizeUrl(u){
        try{
          return new URL(u, location.href).href.replace(/\/+$/, '');
        }catch(e){
          return (u || '').trim();
        }
      }

      function saveApps(){
        try{
          localStorage.setItem(di_APPS_KEY, JSON.stringify(apps));
        }catch(e){}
        renderApps();
      }

      function renderApps(){
        appsList.innerHTML = '';
        appsCount.textContent = apps.length + (apps.length === 1 ? ' app' : ' apps');

        apps.forEach(app=>{
          const card = document.createElement('div');
          card.className = 'app-card';
          card.dataset.id = app.id;

          card.innerHTML = `
            <div class="app-main">
              <div class="app-title">${escapeHtml(app.name) || 'Sem nome'}</div>
              <div class="app-meta">
                <span class="app-group">${escapeHtml(app.group) || 'Sem grupo'}</span>
                <span class="app-url">${escapeHtml(app.url) || ''}</span>
              </div>
            </div>
            <div class="app-actions">
              <button class="app-btn open"  data-action="open"   title="Abrir em card" type="button">▣</button>
              <button class="app-btn remove" data-action="remove" title="Remover" type="button">✕</button>
            </div>
          `;

          card.querySelectorAll('.app-btn').forEach(btn=>{
            btn.addEventListener('click', ()=>{
              const action = btn.dataset.action;
              if(action === 'open'){
                openAppCard(app);
              }else if(action === 'remove'){
                removeApp(app.id);
              }
            });
          });

          appsList.appendChild(card);
        });
      }

      function removeApp(id){
        const idx = apps.findIndex(a => a.id === id);
        if(idx === -1) return;
        if(!confirm('Remover este app da sua lista?')) return;
        apps.splice(idx,1);
        log('App removido.');
        saveApps();
      }

      function openAppCard(app){
        if(!app.url){
          alert('Este app ainda não tem URL definida.');
          return;
        }
        const card = document.createElement('section');
        card.className = 'iframe-card';
        card.dataset.id = app.id;

        card.innerHTML = `
          <div class="iframe-card-header">
            <div class="iframe-card-title">${escapeHtml(app.name) || 'App sem nome'}</div>
            <div class="iframe-card-actions">
              <span class="iframe-card-group">${escapeHtml(app.group) || 'Sem grupo'}</span>
              <button type="button" data-action="open-new" title="Abrir em nova aba">⧉</button>
              <button type="button" data-action="close" title="Fechar card">✕</button>
            </div>
          </div>
          <iframe src="${escapeAttr(app.url)}" loading="lazy"></iframe>
        `;

        card.querySelectorAll('.iframe-card-actions button').forEach(btn=>{
          const act = btn.dataset.action;
          btn.addEventListener('click', ()=>{
            if(act === 'close'){
              iframeDeck.removeChild(card);
              log('Card de app fechado.');
            }else if(act === 'open-new'){
              window.open(app.url, '_blank');
              log('App aberto em nova aba.');
            }
          });
        });

        iframeDeck.appendChild(card);
        log('App aberto em card: ' + (app.name || 'sem nome'));
      }

      // Criar novo app
      document.getElementById('btnAddApp').addEventListener('click', ()=>{
        const name = prompt('Nome do app / stack:');
        if(!name) return;
        const url  = prompt('URL do app (pode ser http://, https:// ou arquivo local):','https://');
        if(url === null) return;
        const group = prompt('Nome do grupo (ex: Chat, Solar, Docs, Índia...):') || '';

        const id = 'di_app_' + Date.now() + '_' + Math.floor(Math.random()*9999);
        apps.push({ id, name, url, group });
        log('Novo app criado: ' + name + (group ? ' (grupo: '+group+')' : ''));
        saveApps();
      });

      // Docs
      document.getElementById('btnDocs').addEventListener('click', ()=>{
        log('Docs / Apps acionado.');
        alert('Aqui você pode linkar seu stack de docs (Hub1, LivrLiv, etc). No monólito, este botão vai abrir o stack-docs.');
      });

      renderApps();

      /* Console */

      const consolePanel  = document.getElementById('consolePanel');
      const consoleToggle = document.getElementById('consoleToggle');
      const consoleClose  = document.getElementById('consoleClose');
      const lsDump        = document.getElementById('consoleLsDump');
      const logMirror     = document.getElementById('consoleLogMirror');
      const cardOrigem    = document.getElementById('cardOrigem');
      const toggleOrigemBtn = document.getElementById('toggleOrigemBtn');
      const openGroupBtn    = document.getElementById('openGroupBtn');

      function setConsoleOpen(open){
        if(open){
          consolePanel.classList.add('open');
          consolePanel.setAttribute('aria-hidden','false');
        }else{
          consolePanel.classList.remove('open');
          consolePanel.setAttribute('aria-hidden','true');
        }
      }

      consoleToggle.addEventListener('click', ()=>{
        const isOpen = consolePanel.classList.contains('open');
        setConsoleOpen(!isOpen);
      });
      consoleClose.addEventListener('click', ()=> setConsoleOpen(false));

      toggleOrigemBtn.addEventListener('click', ()=>{
        const visible = cardOrigem.style.display !== 'none';
        cardOrigem.style.display = visible ? 'none' : '';
        log('Card de origem ' + (visible ? 'ocultado' : 'mostrado') + '.');
      });

      openGroupBtn.addEventListener('click', ()=>{
        if(!apps.length){
          alert('Você ainda não tem apps salvos.');
          return;
        }
        const g = prompt('Nome do grupo que você quer abrir (ex: Chat, Solar, Índia):');
        if(!g) return;
        const groupName = g.trim();
        const subset = apps.filter(a => (a.group || '').trim().toLowerCase() === groupName.toLowerCase());
        if(!subset.length){
          alert('Nenhum app encontrado com esse grupo.');
          return;
        }
        subset.forEach(openAppCard);
        log('Grupo aberto: ' + groupName + ' (' + subset.length + ' apps).');
      });

      function dumpLocalStorage(){
        if(!lsDump) return;
        try{
          const lines = [];
          for(let i=0;i<localStorage.length;i++){
            const key = localStorage.key(i);
            if(!key) continue;
            const val = localStorage.getItem(key);
            // destacar chaves di_ (visual)
            if(key.indexOf('di_') === 0){
              lines.push('%c' + key + ': ' + val, 'di'); // usamos texto marcado; será tratado abaixo
            }else{
              lines.push(key + ': ' + val);
            }
          }
          // como não podemos aplicar styles no <pre> com console formatting,
          // aplicamos uma conversão simples para marcar chaves di_ com classname em HTML
          const html = lines.map(l=>{
            if(typeof l === 'string' && l.indexOf('di_') === 0){
              return '<span class="di-key">' + escapeHtml(l) + '</span>';
            }
            // fallback: se veio formatado como array (por `%c`) converta
            if(Array.isArray(l) && l[0] && typeof l[0] === 'string' && l[0].indexOf('di_') === 0){
              return '<span class="di-key">' + escapeHtml(l[0]) + '</span>';
            }
            return '<span>' + escapeHtml(String(l)) + '</span>';
          }).join('\n');
          lsDump.innerHTML = html || '(sem chaves no localStorage)';
        }catch(e){
          lsDump.textContent = 'Erro ao ler localStorage.';
        }
      }

      document.querySelectorAll('[data-ls-action]').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          const action = btn.getAttribute('data-ls-action');
          if(action === 'dump'){
            dumpLocalStorage();
          }else if(action === 'clear-intent'){
            if(confirm('Limpar intenção salva?')){
              try{ localStorage.removeItem(di_INTENT_KEY); }catch(e){}
              intentEl.value = '';
              log('Intenção limpa.');
              dumpLocalStorage();
            }
          }else if(action === 'clear-apps'){
            if(!apps.length) return;
            if(confirm('Limpar todos os apps salvos?')){
              apps = [];
              saveApps();
              log('Apps limpos.');
              dumpLocalStorage();
            }
          }
        });
      });

      // Espelho do log
      const logBox = document.getElementById('logBox');
      if(logBox && logMirror){
        const observer = new MutationObserver(()=>{
          const last = logBox.firstElementChild;
          if(!last) return;
          const clone = last.cloneNode(true);
          logMirror.prepend(clone);
          while(logMirror.childElementCount > 8){
            logMirror.removeChild(logMirror.lastElementChild);
          }
        });
        observer.observe(logBox,{childList:true});
      }

      // --- pequenas helpers de segurança/escape ---
      function escapeHtml(s){
        if(!s && s !== 0) return '';
        return String(s)
          .replace(/&/g,'&amp;')
          .replace(/</g,'&lt;')
          .replace(/>/g,'&gt;')
          .replace(/"/g,'&quot;')
          .replace(/'/g,'&#39;');
      }
      function escapeAttr(s){
        return escapeHtml(s);
      }
    })();
  