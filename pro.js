/* VolleyBoard "Pro" look (preview): drawn icons in place of glyphs, serve marker and point flash on the score bug.
   Does nothing unless <html class="pro">. Turn on with ?preview, off with ?classic. */
(function(){
  const root=document.documentElement;
  if(!root.classList.contains('pro'))return;
  const P={
    match:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M12 5v14M7 10v4M17 10v4"/>',
    dashboard:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    lineup:'<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 4v5h-5"/>',
    board:'<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
    tourney:'<path d="M8 4h8v5a4 4 0 0 1-8 0V4z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8M10 17h4"/>',
    history:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    team:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
    undo:'<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    redo:'<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    ball:'<circle cx="12" cy="12" r="9"/><path d="M12 3a14 14 0 0 0 4 9M3.5 9a14 14 0 0 1 10 1M8 20.5a14 14 0 0 1 2-9.5M21 13.5a14 14 0 0 1-10 .5"/>',
    timer:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 1.5M9.5 2.5h5"/>',
    swap:'<path d="M4 8h14l-4-4M20 16H6l4 4"/>',
    serve:'<path d="M7 17L17 7M9 7h8v8"/>'
  };
  const svg=(k,c)=>`<svg class="pv-icon${c?' '+c:''}" viewBox="0 0 24 24" aria-hidden="true">${P[k]}</svg>`;
  const GLYPH={'▦':'match','▤':'dashboard','⟳':'lineup','✎':'board','🏆':'tourney','◷':'history','♟':'team','↶':'undo','⟲':'redo','✓':'check','🏐':'ball','↗':'serve','+':'plus','⏱':'timer','⇄':'swap'};

  // tabs: static markup, done once
  document.querySelectorAll('.tab').forEach(t=>{const g=t.querySelector('span[aria-hidden]');if(g)g.outerHTML=svg(t.dataset.tab)});

  // swap a leading glyph in buttons, small labels and empty-state icons for a drawn icon
  const RX=/^\s*(▦|▤|⟳|✎|🏆|◷|♟|↶|⟲|✓|🏐|↗|⏱|⇄|\+(?=\s))|🏐\s*$/;
  function icons(scope){
    scope.querySelectorAll('.empty-icon').forEach(e=>{const k=GLYPH[e.textContent.trim()];if(k)e.innerHTML=svg(k)});
    const w=document.createTreeWalker(scope,NodeFilter.SHOW_TEXT,{acceptNode:n=>{if(!RX.test(n.nodeValue))return 3;const p=n.parentElement;return p&&p.closest('button,small,a')?1:3}});
    const hits=[];while(w.nextNode())hits.push(w.currentNode);
    hits.forEach(n=>{
      const v=n.nodeValue,m=v.match(/^\s*(▦|▤|⟳|✎|🏆|◷|♟|↶|⟲|✓|🏐|↗|⏱|⇄|\+)\s*/);
      const span=document.createElement('span');span.style.display='contents';
      if(m){span.innerHTML=svg(GLYPH[m[1]])+' ';span.append(v.slice(m[0].length));}
      else{const t=v.replace(/\s*🏐\s*$/,'');span.append(t+' ');span.insertAdjacentHTML('beforeend',svg('ball','pv-ball'));}
      n.replaceWith(span);
    });
  }

  // score bug: mark who serves, flash the side that just scored
  let last=null;
  function bug(){
    const sb=document.querySelector('.v6-scoreboard');if(!sb){last=null;return}
    const sides=[sb.children[0],sb.children[2]];
    const chosen=[...document.querySelectorAll('.v6-serving button')].findIndex(b=>b.classList.contains('chosen'));
    sides.forEach((d,i)=>d&&d.classList.toggle('pv-serving',chosen===i));
    const now=sides.map(d=>d&&d.querySelector('strong')?.textContent);
    if(last&&now.join()!==last.join())now.forEach((v,i)=>{
      if(v!==last[i]&&Number(v)>Number(last[i])){const s=sides[i].querySelector('strong');s.classList.add('pv-bump');sides[i].classList.add('pv-flash');}
    });
    last=now;
  }

  const main=document.getElementById('main');
  const run=()=>{icons(main);bug();};
  new MutationObserver(run).observe(main,{childList:true});
  run();
  // toasts and anything outside main
  new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>n.nodeType===1&&n!==main&&icons(n)))).observe(document.body,{childList:true});
})();
