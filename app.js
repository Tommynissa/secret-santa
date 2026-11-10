'use strict';
const HATS=[['Muriel','Stephane','Anais','Thomas','Mae','Jeremy','Manon','Maxime'],['Isa','Gilles','Anthony','Maud','Lilian','Nicolas','Leo','Annick']];
const KEY='noel-famille-v1';
const $=id=>document.getElementById(id);
let state={results:[],pending:null}, busy=false, sound=false, audio, shared=false;

function avatar(name){
 const badge=document.createElement('span');badge.className='avatar';badge.setAttribute('aria-hidden','true');badge.textContent=name.slice(0,1).toUpperCase();
 const source=typeof PARTICIPANT_PHOTOS!=='undefined'&&PARTICIPANT_PHOTOS[name];
 if(source){const img=document.createElement('img');img.src=source;img.alt='';img.decoding='async';img.onerror=()=>img.remove();badge.append(img)}
 return badge;
}
function setReel(id,name){
 const reel=$(id);if(reel.dataset.name===name)return;reel.dataset.name=name;
 const content=document.createElement('span');content.className='reel-content';
 if(HATS.some(h=>h.includes(name)))content.append(avatar(name));
 const label=document.createElement('span');label.className='reel-name';label.textContent=name;content.append(label);reel.replaceChildren(content);
}

function pick(items){if(!items.length)throw new Error('Chapeau vide');const n=items.length,max=Math.floor(4294967296/n)*n,a=new Uint32Array(1);do{crypto.getRandomValues(a)}while(a[0]>=max);return items[a[0]%n]}
function valid(s){if(!s||!Array.isArray(s.results)||s.results.length>16)return false;const from=new Set(),to=new Set();for(let i=0;i<s.results.length;i++){const r=s.results[i],h=i%2;if(!r||!HATS[h].includes(r.from)||!HATS[1-h].includes(r.to)||from.has(r.from)||to.has(r.to))return false;from.add(r.from);to.add(r.to)}return s.pending===null||(s.results.length<16&&HATS[s.results.length%2].includes(s.pending)&&!from.has(s.pending))}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch{$('status').textContent='La sauvegarde est indisponible. Téléchargez le carnet avant de fermer cette page.'}}
function migrateNames(s){if(s&&Array.isArray(s.results)){s.results=s.results.map(r=>({...r,from:r.from==='Anick'?'Annick':r.from,to:r.to==='Anick'?'Annick':r.to}));if(s.pending==='Anick')s.pending='Annick'}return s}
function restore(){try{if(location.hash.startsWith('#resultats=')){const s=migrateNames(JSON.parse(decodeURIComponent(location.hash.slice(11))));if(!valid(s))throw Error();state=s;state.pending=null;shared=true}else{const raw=localStorage.getItem(KEY);if(raw){const s=migrateNames(JSON.parse(raw));if(valid(s))state=s}}}catch{$('status').textContent='Impossible de lire la sauvegarde ou le lien. Un nouveau carnet est prêt.'}}
function render(){const n=state.results.length,h=state.pending?n%2:n?(n-1)%2:0;for(let k=0;k<2;k++){$('people-'+(k?'b':'a')).replaceChildren(...HATS[k].map(name=>{const el=document.createElement('span');el.className='person'+(state.results.some(r=>r.from===name)?' done':'');el.append(avatar(name));const label=document.createElement('span');label.textContent=name;el.append(label);el.title=state.results.some(r=>r.from===name)?'Cadeau attribué':'Cadeau à attribuer';return el}))}
$('counter').textContent=n+' / 16 cadeaux';$('progress-fill').style.width=n/16*100+'%';$('draw-button').disabled=busy||shared||n===16;$('draw-button').textContent=shared?'Carnet partagé · lecture seule':n===16?'Tous les cadeaux ont trouvé leur destinataire ✧':state.pending?'Découvrir à qui '+state.pending+' offre un cadeau ✧':n?'Tirer la personne suivante ✧':'Lancer le premier tirage ✧';$('hat-a').textContent='Chapeau '+(h+1)+' · '+(h?'les étoiles':'les sapins');$('hat-b').textContent='Chapeau '+(2-h)+' · '+(h?'les sapins':'les étoiles');$('share').disabled=!n||busy;$('export').disabled=!n||busy;$('reset').disabled=busy;$('reset').hidden=shared;
const list=$('results-list');if(n){list.replaceChildren(...state.results.map((r,i)=>{const row=document.createElement('div');row.className='result-row';for(const [tag,cls,txt] of [['span','number',String(i+1).padStart(2,'0')],['strong','',r.from],['span','arrow','offre à →'],['strong','',r.to]]){const el=document.createElement(tag);el.className=cls;if(tag==='strong'){el.append(avatar(txt));const label=document.createElement('span');label.textContent=txt;el.append(label)}else el.textContent=txt;row.append(el)}return row}))}else list.innerHTML='<div class="empty">✧<p>Les premières surprises s’écriront ici.</p></div>';
if(shared){$('status').textContent='Les résultats partagés sont visibles ci-dessous.';$('sharing-note').textContent='Ce carnet est une copie des résultats au moment du partage. Pour suivre la suite, demandez un nouveau lien à la personne qui organise.'}else if(n===16)$('status').textContent='La boucle est bouclée. À vous de jouer pour les cadeaux !';}
function tone(frequency=650,duration=.045){if(!sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.connect(g);g.connect(audio.destination);o.frequency.value=frequency;g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.start();o.stop(audio.currentTime+duration)}catch{}}
async function spin(id,names,chosen){const el=$(id);el.classList.remove('winner');el.classList.add('spinning');const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;const count=reduced?1:25;for(let i=0;i<count;i++){setReel(id,pick(names));tone(400+i*18);await new Promise(resolve=>setTimeout(resolve,reduced?100:45+Math.pow(i/count,3)*210))}el.classList.remove('spinning');el.classList.add('winner');setReel(id,chosen);tone(880,.2)}
let revealTimer;
function celebrate(result=state.results.at(-1),demo=false){
 if(!result)return;
 const dialog=$('gift-reveal');clearTimeout(revealTimer);
 dialog.classList.remove('burst');
 $('reveal-from').replaceChildren(avatar(result.from));$('reveal-to').replaceChildren(avatar(result.to));
 $('reveal-from-name').textContent=result.from;$('reveal-to-name').textContent=result.to;
 $('reveal-title').textContent=result.from+' offre un cadeau à '+result.to+' !';
 $('reveal-caption').textContent=demo?'Aperçu de l’animation · Aucun tirage enregistré':'Une belle attention se prépare…';
 const confetti=$('gold-confetti');confetti.replaceChildren();
 if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
  for(let i=0;i<90;i++){
   const piece=document.createElement('i');const angle=Math.random()*Math.PI*2;const distance=130+Math.random()*420;
   piece.style.setProperty('--x',Math.cos(angle)*distance+'px');piece.style.setProperty('--y',Math.sin(angle)*distance+'px');
   piece.style.setProperty('--rotation',Math.random()*1080-540+'deg');piece.style.setProperty('--delay',1.5+Math.random()*.25+'s');
   piece.style.setProperty('--gold',['#d4af37','#ffe8a0','#b68b29','#fff2c5'][i%4]);
   confetti.append(piece);
  }
 }
 if(dialog.open)dialog.close();dialog.showModal();
 // Restart the CSS sequence for every attribution, even consecutive previews.
 void dialog.offsetWidth;dialog.classList.add('burst');
 revealTimer=setTimeout(()=>dialog.close(),6800);
}
$('close-reveal').onclick=()=>{clearTimeout(revealTimer);$('gift-reveal').close()};
$('gift-reveal').addEventListener('close',()=>{clearTimeout(revealTimer);$('gold-confetti').replaceChildren()});
$('preview-reveal').onclick=()=>celebrate({from:'Anais',to:'Nicolas'},true);
$('draw-button').onclick=async()=>{if(busy||shared||state.results.length===16)return;busy=true;render();const h=state.results.length%2;try{if(!state.pending){const names=HATS[h].filter(x=>!state.results.some(r=>r.from===x));state.pending=pick(names);save();render();setReel('reel-b','Un peu de mystère');$('reel-b').classList.remove('winner');$('status').textContent='Les prénoms dansent…';await spin('reel-a',names,state.pending);$('status').textContent=state.pending+' a été choisi(e). Place au deuxième chapeau !'}else{const names=HATS[1-h].filter(x=>!state.results.some(r=>r.to===x));const to=pick(names),from=state.pending;state.results.push({from,to});state.pending=null;save();$('status').textContent='Qui recevra cette belle attention ?';await spin('reel-b',names,to);$('status').textContent=from+' offre un cadeau à '+to+' !';celebrate()}}finally{busy=false;render()}};
$('sound').onclick=()=>{sound=!sound;$('sound').textContent=sound?'Son activé ♫':'Son désactivé ♫';$('sound').setAttribute('aria-pressed',String(sound));tone()};
$('reset').onclick=()=>$('reset-dialog').showModal();$('cancel-reset').onclick=()=>$('reset-dialog').close();$('confirm-reset').onclick=()=>{state={results:[],pending:null};save();$('reset-dialog').close();setReel('reel-a','À vous de jouer');setReel('reel-b','Un peu de mystère');document.querySelectorAll('.winner').forEach(x=>x.classList.remove('winner'));$('status').textContent='Le hasard fait bien les cadeaux.';render()};
$('share').onclick=()=>{const url=new URL(location.href);url.hash='resultats='+encodeURIComponent(JSON.stringify({results:state.results,pending:null}));$('share-url').value=url.href;$('share-dialog').showModal();$('share-url').select()};$('close-share').onclick=()=>$('share-dialog').close();
$('export').onclick=()=>{const text='SECRET SANTA · UN NOËL ENSEMBLE\n\n'+state.results.map((r,i)=>(i+1)+'. '+r.from+' offre un cadeau à '+r.to).join('\n');const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='notre-secret-santa.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
restore();render();if(state.pending){setReel('reel-a',state.pending);$('status').textContent='Le tirage reprend : découvrez le destinataire de '+state.pending+'.'}else if(state.results.length&&!shared){const r=state.results.at(-1);setReel('reel-a',r.from);setReel('reel-b',r.to);}
