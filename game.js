'use strict';
/* AJUDE ROBERTO O ELETRICISTA - jogo HTML5 independente.
 REGRAS (decisões de design):
 - Um "movimento" = um trecho reto contínuo. Mudar de direção (ou voltar) começa um novo movimento.
 - COR limita movimentos VERTICAIS; SÍMBOLO limita movimentos HORIZONTAIS.
 - Definidos pelo documento: Vermelho V3, Azul V1, ▲ H4, ■ H2. Demais valores criados por mim.
   Pareamento cor↔símbolo escolhido (Vermelho■, Azul▲): como os trechos alternam H/V, assim os DOIS limites realmente restringem o jogador.
 - Fios não cruzam obstáculos nem outros fios. Para trocar a fase, edite WIRES e OBS. */
const COLS=7,ROWS=7,CELL=80,OX=120,OY=36,CW=800,CH=700;
const USE_AUDIO_FILES=false; // true = usa assets/audio/<nome>.mp3 (click,ring,err,spark,step,good,win,page) se existirem
const WIRES=[
 {n:'Vermelho',c:'#e53935',s:'■',sn:'Quadrado',v:3,h:2,af:0,az:1},
 {n:'Azul',c:'#1e88e5',s:'▲',sn:'Triângulo',v:1,h:4,af:1,az:3},
 {n:'Amarelo',c:'#fdd835',s:'●',sn:'Círculo',v:4,h:3,af:2,az:4},
 {n:'Verde',c:'#43a047',s:'◆',sn:'Losango',v:2,h:5,af:4,az:5},
 {n:'Preto',c:'#263238',s:'★',sn:'Estrela',v:5,h:4,af:6,az:6}];
const OBS={'4,0':'F','6,0':'F','4,2':'W','5,2':'W','0,3':'R'}; // W=parede isolante F=fusível R=resistência
const KEY=(c,r)=>c+','+r;
const S={wires:[],won:false,flash:0,msg:'',mt:0};
function reset(){S.wires=WIRES.map(w=>({path:[[0,w.af]],done:false}));S.won=false;S.flash=0;S.msg='';}
function legs(p){let v=0,h=0,ld=null;for(let i=1;i<p.length;i++){const dx=p[i][0]-p[i-1][0],dy=p[i][1]-p[i-1][1],d=dx+','+dy;if(d!==ld){if(dy)v++;else h++;ld=d;}}return{v,h};}
function inPath(c,r){return S.wires.findIndex(w=>w.path.some(q=>q[0]===c&&q[1]===r));}
function tryStep(i,c,r){ // 'ok' | 'undo' | 'goal' | 'bad:motivo'
 const w=S.wires[i],W=WIRES[i],p=w.path,h=p[p.length-1];
 if(Math.abs(c-h[0])+Math.abs(r-h[1])!==1)return'bad:far';
 if(c<0||r<0||c>=COLS||r>=ROWS)return'bad:far';
 if(p.length>1&&p[p.length-2][0]===c&&p[p.length-2][1]===r){p.pop();w.done=false;return'undo';}
 if(w.done)return'bad:done';
 if(OBS[KEY(c,r)])return'bad:obs';
 if(inPath(c,r)>=0)return'bad:occ';
 if(c===COLS-1&&WIRES.some((x,j)=>j!==i&&x.az===r))return'bad:port';
 p.push([c,r]);const L=legs(p);
 if(L.v>W.v){p.pop();return'bad:vert';}
 if(L.h>W.h){p.pop();return'bad:horiz';}
 if(c===COLS-1&&r===W.az){w.done=true;return'goal';}
 return'ok';}
function validPath(i){const W=WIRES[i],p=S.wires[i].path;if(p[0][0]!==0||p[0][1]!==W.af)return false;
 const e=p[p.length-1];if(e[0]!==COLS-1||e[1]!==W.az)return false;
 for(let k=1;k<p.length;k++)if(Math.abs(p[k][0]-p[k-1][0])+Math.abs(p[k][1]-p[k-1][1])!==1)return false;
 if(p.some(q=>OBS[KEY(q[0],q[1])]))return false;const L=legs(p);return L.v<=W.v&&L.h<=W.h;}
function allDone(){return S.wires.every((w,i)=>w.done&&validPath(i));}

/* ---------- ÁUDIO (Web Audio sintetizado) ---------- */
let AC=null,muted=false,bgT=null,bgI=0;const FILES={};
function ac(){if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}}if(AC&&AC.state==='suspended')AC.resume();return AC;}
function tone(f,d,ty,v,t0,f2){const a=ac();if(!a||muted)return;const o=a.createOscillator(),gn=a.createGain(),t=a.currentTime+(t0||0);
 o.type=ty||'square';o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);
 gn.gain.setValueAtTime(v||.12,t);gn.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(gn);gn.connect(a.destination);o.start(t);o.stop(t+d+.02);}
function noise(d,v,t0,hp){const a=ac();if(!a||muted)return;const n=Math.floor(a.sampleRate*d),b=a.createBuffer(1,n,a.sampleRate),x=b.getChannelData(0);
 for(let i=0;i<n;i++)x[i]=(Math.random()*2-1)*(1-i/n);const s=a.createBufferSource(),f=a.createBiquadFilter(),gn=a.createGain();
 f.type='highpass';f.frequency.value=hp||1000;gn.gain.value=v||.2;s.buffer=b;s.connect(f);f.connect(gn);gn.connect(a.destination);s.start(a.currentTime+(t0||0));}
const SFX={
 click(){noise(.05,.3,0,3000);tone(2400,.12,'triangle',.2,.02,1700);tone(1300,.2,'triangle',.15,.1,900);noise(.08,.2,.16,2000);},
 ring(){for(let r=0;r<3;r++)for(let k=0;k<8;k++)tone(k%2?1040:880,.045,'square',.1,r*.9+k*.05);},
 err(){tone(320,.35,'sawtooth',.18,0,70);tone(160,.3,'square',.1,.05,60);},
 spark(){noise(.18,.25,0,4000);},step(){tone(500+Math.random()*100,.04,'square',.04);},
 good(){tone(660,.1,'square',.14);tone(990,.18,'square',.14,.1);},
 win(){[523,659,784,1047,784,1047,1319].forEach((f,i)=>tone(f,.2,'square',.14,i*.14));},
 page(){noise(.22,.15,0,800);}};
function play(n){if(muted)return;const f=FILES[n];if(f){f.currentTime=0;f.play().catch(()=>SFX[n]&&SFX[n]());}else if(SFX[n])SFX[n]();}
const MEL=[262,330,392,330,294,349,440,349,262,330,392,523,494,392,330,294];
function bgm(on){clearInterval(bgT);bgT=null;if(on)bgT=setInterval(()=>{if(muted)return;const f=MEL[bgI++%16];tone(f,.2,'square',.035);if(bgI%2)tone(f/4,.3,'triangle',.07);},230);}
if(USE_AUDIO_FILES&&typeof Audio!=='undefined')['click','ring','err','spark','step','good','win','page'].forEach(n=>{const a=new Audio('assets/audio/'+n+'.mp3');a.addEventListener('canplaythrough',()=>{FILES[n]=a;},{once:true});});

/* ---------- TEXTOS ---------- */
const INTRO=[['Roberto','Olá! Que bom ter você por aqui. O meu nome é Roberto!'],
['Roberto','Tenho 58 anos e já passei mais de metade da minha vida a mexer com cabos, disjuntores e quadros de força.'],
['Roberto','Ser eletricista não é só ligar fios... é resolver mistérios! Um bom circuito é como uma orquestra: se um instrumento desafina, a casa inteira fica no escuro.'],
['Roberto','Estava justamente a arrumar a minha caixa de ferramentas quando...']];
const CALL=[['Cliente (ao telefone)','Alô? É da oficina do Seu Roberto? Precisamos de ajuda urgente no Bairro da Luz!'],
['Cliente (ao telefone)','O quadro elétrico principal da central comunitária pifou e o labirinto de fiação está todo baralhado!'],
['Roberto (fora de campo)','Calma, dona Maria! O Roberto já está a caminho. Levo o meu assistente e o manual de campo!']];
const MSG={'bad:obs':'Obstáculo no caminho!','bad:occ':'Esse espaço já está ocupado por um fio!','bad:port':'Esse é o conector de outro fio!'};

/* ---------- ESTADO DE TELAS ---------- */
let cv,g,scene='start',paused=false,drag=-1,bad=null,lines=[],li=0,onEnd=null,tok=0,conf=[];const P=[];
const $=id=>document.getElementById(id);
const show=(id,on)=>$(id).classList.toggle('hid',!on);
const wins=()=>{try{return parseInt(localStorage.getItem('roberto_wins')||'0',10)||0;}catch(e){return 0;}};
function go(s){scene=s;paused=false;drag=-1;show('man',0);show('start',s==='start');show('dlg',s==='intro'||s==='call');show('hud',s==='puzzle');show('end',s==='win');
 if(s==='start')$('prog').textContent=wins()?'Casas iluminadas: '+wins():'';}
function say(arr,end){lines=arr;li=0;onEnd=end;sayRender();}
function sayRender(){$('who').textContent=lines[li][0];$('txt').textContent=lines[li][1];}
function next(){if(scene!=='intro'&&scene!=='call')return;play('step');if(++li>=lines.length){onEnd&&onEnd();}else sayRender();}
function startGame(){ac();play('click');bgm(true);setTimeout(()=>{go('intro');say(INTRO,()=>{play('ring');go('call');say(CALL,startPuzzle);});},350);}
function startPuzzle(){tok++;reset();go('puzzle');}
function openManual(on){if(scene!=='puzzle')return;paused=on;drag=-1;show('man',on);play('page');}
function win(){S.won=true;const my=++tok;play('win');setTimeout(()=>{if(my!==tok)return;try{localStorage.setItem('roberto_wins',wins()+1);}catch(e){}
 conf=[];for(let i=0;i<70;i++)conf.push({x:Math.random()*CW,y:-Math.random()*CH,v:1+Math.random()*3,c:['#e53935','#fdd835','#43a047','#1e88e5','#fff'][i%5]});go('win');},2200);}
function manualHTML(){let t='<p><b>Regra de ouro:</b> a <b>COR</b> manda no movimento <b>vertical</b> (↑ ↓) e o <b>SÍMBOLO</b> manda no movimento <b>horizontal</b> (← →).</p>'+
 '<p>Um <b>movimento</b> é um trecho reto. Andar vários quadrinhos na mesma direção conta <b>1 só</b>; mudar de direção conta um novo movimento.</p><table>';
 WIRES.forEach(w=>{t+=`<tr><td><i style="background:${w.c}"></i>${w.n}</td><td>até ${w.v} ↕</td><td>${w.s} ${w.sn}</td><td>até ${w.h} ↔</td></tr>`;});
 return t+'</table><p><b>Exemplo:</b> o Vermelho (■) pode subir/descer até 3 vezes, mas só anda <b>2 vezes</b> para os lados: vai → desce → vai... e pronto! O Azul (▲) só muda de linha <b>1 vez</b>.</p>'+
 '<p><b>Dicas:</b> fios não atravessam paredes listradas, fusíveis, resistências nem outros fios. Arraste de volta para desfazer. Toque na saída AF para recomeçar um fio. Movimento proibido = faísca e o fio volta ao último ponto válido!</p>';}

/* ---------- ENTRADA ---------- */
function cellAt(e){const r=cv.getBoundingClientRect();const x=(e.clientX-r.left)*CW/r.width,y=(e.clientY-r.top)*CH/r.height;return[Math.floor((x-OX)/CELL),Math.floor((y-OY)/CELL)];}
function onDown(e){if(scene!=='puzzle'||paused||S.won)return;e.preventDefault();let[c,r]=cellAt(e);if(c<0)c=0;
 for(let i=0;i<5;i++){const w=S.wires[i],k=w.path.findIndex(q=>q[0]===c&&q[1]===r);if(k>=0){w.path.length=k+1;w.done=false;drag=i;bad=null;try{cv.setPointerCapture(e.pointerId);}catch(x){}play('step');return;}}}
function onMove(e){if(drag<0||paused)return;e.preventDefault();const[cx,cy]=cellAt(e);const tc=Math.min(COLS-1,Math.max(0,cx)),tr=Math.min(ROWS-1,Math.max(0,cy));
 for(let n=0;n<14;n++){const p=S.wires[drag].path,h=p[p.length-1],dx=tc-h[0],dy=tr-h[1];if(!dx&&!dy){bad=null;break;}
  let nc=h[0],nr=h[1];if(Math.abs(dx)>=Math.abs(dy))nc+=Math.sign(dx);else nr+=Math.sign(dy);
  const res=tryStep(drag,nc,nr);
  if(res==='ok'){play('step');bad=null;}else if(res==='undo')bad=null;
  else if(res==='goal'){play('good');sparks(OX+nc*CELL+40,OY+nr*CELL+40,8);break;}
  else{fail(res,nc,nr);break;}}}
function onUp(){if(drag<0)return;drag=-1;bad=null;if(!S.won&&allDone())win();}
function fail(res,c,r){if(res==='bad:done'||res==='bad:far')return;const k=c+','+r;if(k===bad)return;bad=k;const W=WIRES[drag];
 S.msg=res==='bad:vert'?`${W.n}: só ${W.v} movimento(s) vertical(is) (cor)!`:res==='bad:horiz'?`${W.s} ${W.sn}: só ${W.h} movimento(s) horizontal(is)!`:MSG[res];
 S.mt=170;S.flash=14;sparks(OX+c*CELL+40,OY+r*CELL+40,16);play('err');play('spark');}
function sparks(x,y,n){for(let i=0;i<n;i++)P.push({x,y,vx:(Math.random()-.5)*7,vy:(Math.random()-.8)*7,l:22+Math.random()*16,c:Math.random()<.5?'#4fc3f7':'#ffeb3b'});}

/* ---------- DESENHO ---------- */
const R=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(x,y,w,h);};
function roberto(x,y,u,flip,pose,t){g.save();g.translate(x,y+Math.sin(t/300)*2);g.scale(flip?-u:u,u);
 const r=(a,b,w,h,c)=>{g.fillStyle=c;g.fillRect(a,b,w,h);},K='#f1c9a0',SH='#c8a951';
 r(3,19,3.5,9,'#1f3a6b');r(7.5,19,3.5,9,'#1f3a6b');r(2.5,28,4.5,2,'#3b2a1a');r(7.5,28,4.5,2,'#3b2a1a');r(2,10,10,10,SH);r(6.6,10,.8,10,'#a98b3a');
 if(pose==='cheer'){r(-.5,9,2.5,3,SH);r(-1.5,1,2.5,8,K);r(12,9,2.5,3,SH);r(13,1,2.5,8,K);}
 else{r(-.2,11,2.5,4,SH);r(-.2,15,2.5,4,K);
  if(pose==='point'){r(11.5,10,3,3,SH);r(14.5,10.3,4,1.8,K);r(18.5,9.6,1,1,K);}else{r(11.7,11,2.5,4,SH);r(11.7,15,2.5,4,K);}}
 r(3,1,8,9,K);r(2.4,4,.8,2.5,K);r(10.8,4,.8,2.5,K);r(3,0,8,2,'#f5f5f5');r(3,2,1,2.5,'#f5f5f5');r(10,2,1,2.5,'#f5f5f5');
 r(3.4,6.4,7.2,3.8,'#f5f5f5');r(6.5,5,1,1.2,'#d9a57a');r(4.3,2.9,2,.6,'#eee');r(7.7,2.9,2,.6,'#eee');
 r(4.5,3.8,1.6,1.6,'#9fdcff');r(7.9,3.8,1.6,1.6,'#9fdcff');r(5.1,4.2,.7,.8,'#12324a');r(8.5,4.2,.7,.8,'#12324a');r(5.3,7.9,3.4,1.2,'#b23a3a');r(5.9,7.9,2.2,.5,'#fff');
 g.restore();}
function shop(t){R(0,0,CW,CH,'#ead2a6');R(0,0,CW,60,'#a1724a');R(0,520,CW,180,'#7a4e2a');R(0,516,CW,6,'#5d3a1a');
 R(40,90,420,250,'#b9855a');const cs=['#9e9e9e','#cfd8dc','#d32f2f','#ffb300'];
 for(let i=0;i<6;i++){const x=70+i*62,y=110+(i%2)*90;R(x+10,y,12,90,cs[i%4]);R(x,y-6,32,16,cs[(i+1)%4]);}
 R(500,230,260,14,'#5d3a1a');R(520,180,60,50,'#1976d2');R(600,195,50,35,'#f9a825');R(670,170,70,60,'#6d4c41');
 [[540,60,560,200],[650,60,630,170],[730,60,745,130]].forEach((k,j)=>{g.strokeStyle='#263238';g.lineWidth=7;g.beginPath();g.moveTo(k[0],k[1]);g.lineTo(k[2],k[3]);g.stroke();
  R((k[0]+k[2])/2-5,(k[1]+k[3])/2-8,12,16,'#000');if(Math.sin(t/180+j*2)>.75){R(k[2]-4+Math.random()*8,k[3]+4,5,5,'#4fc3f7');R(k[2]+Math.random()*10,k[3]+8,4,4,'#ffeb3b');}});}
function drawP(){for(let i=P.length-1;i>=0;i--){const p=P[i];p.x+=p.vx;p.y+=p.vy;p.vy+=.25;if(--p.l<=0){P.splice(i,1);continue;}R(p.x,p.y,5,5,p.c);}}
function sym(s,x,y,col,sz){g.fillStyle=col;g.font='bold '+sz+'px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(s,x,y);}
function cc(i){return[OX+WIRES[i].az*0,0];}
function obstacle(k,t){const[c,r]=k.split(',').map(Number),x=OX+c*CELL,y=OY+r*CELL;
 if(t==='W'){R(x+2,y+2,76,76,'#424242');for(let j=0;j<5;j++)R(x+6+j*15,y+2,7,76,'#fbc02d');}
 else if(t==='F'){R(x+2,y+2,76,76,'#b0bec5');R(x+16,y+28,48,24,'#fff8e1');R(x+8,y+30,10,20,'#8d6e63');R(x+62,y+30,10,20,'#8d6e63');R(x+18,y+39,44,3,'#e53935');}
 else{R(x+2,y+2,76,76,'#b0bec5');R(x+16,y+27,48,26,'#d7b98a');R(x+24,y+27,6,26,'#e53935');R(x+38,y+27,6,26,'#212121');R(x+52,y+27,6,26,'#fdd835');R(x+4,y+38,12,4,'#555');R(x+64,y+38,12,4,'#555');}}
function puzzle(t){R(0,0,CW,CH,'#37474f');R(OX-12,OY-12,COLS*CELL+24,ROWS*CELL+24,S.flash>0&&S.flash%4<2?'#e53935':'#78909c');
 for(let c=0;c<COLS;c++)for(let r=0;r<ROWS;r++)R(OX+c*CELL+2,OY+r*CELL+2,76,76,S.won?'#c8e6c9':'#cfd8dc');
 for(const k in OBS)obstacle(k,OBS[k]);
 WIRES.forEach((W,i)=>{const w=S.wires[i],cy=OY+W.af*CELL+40,ay=OY+W.az*CELL+40;
  const pts=[[95,cy]].concat(w.path.map(q=>[OX+q[0]*CELL+40,OY+q[1]*CELL+40]));if(w.done)pts.push([705,ay]);
  [['rgba(255,255,255,.75)',20],[W.c,13]].forEach(([col,lw])=>{g.strokeStyle=col;g.lineWidth=lw;g.lineCap='round';g.lineJoin='round';g.beginPath();pts.forEach((p,j)=>j?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.stroke();});
  const L=legs(w.path),h=w.path[w.path.length-1];
  g.fillStyle=W.c;g.strokeStyle='#fff';g.lineWidth=4;g.beginPath();g.arc(95,cy,24,0,7);g.fill();g.stroke();sym(W.s,95,cy+1,i===4||i===0||i===1?'#fff':'#222',26);
  g.fillStyle=w.done?'#69f0ae':'#263238';g.beginPath();g.arc(705,ay,24,0,7);g.fill();g.strokeStyle=W.c;g.lineWidth=5;g.stroke();sym(W.s,705,ay+1,W.c==='#263238'?'#fff':W.c,26);
  g.textAlign='left';g.font='bold 15px monospace';g.fillStyle=L.v>=W.v?'#ffab91':'#fff';g.fillText('V '+L.v+'/'+W.v,4,cy-12);g.fillStyle=L.h>=W.h?'#ffab91':'#fff';g.fillText('H '+L.h+'/'+W.h,4,cy+10);
  if(!w.done){g.fillStyle=W.c;g.strokeStyle='#fff';g.lineWidth=3;g.beginPath();g.arc(OX+h[0]*CELL+40,OY+h[1]*CELL+40,14+Math.sin(t/150)*2,0,7);g.fill();g.stroke();sym(W.s,OX+h[0]*CELL+40,OY+h[1]*CELL+41,W.c==='#fdd835'||W.c==='#43a047'?'#222':'#fff',16);}});
 g.font='bold 18px sans-serif';g.textAlign='center';g.fillStyle='#ffe082';g.fillText('AF • Fonte',62,22);g.fillText('AZ • Zero',738,22);
 g.save();if(S.won){g.shadowColor='#69f0ae';g.shadowBlur=40;}g.fillStyle=S.won?(Math.floor(t/200)%2?'#69f0ae':'#b9f6ca'):'#546e7a';g.beginPath();g.arc(400,16,12,0,7);g.fill();g.restore();
 if(S.mt>0){g.fillStyle='rgba(0,0,0,.6)';g.fillRect(150,625,500,36);sym(S.msg,400,643,'#ffab40',17);}
 drawP();if(S.flash>0)S.flash--;if(S.mt>0)S.mt--;}
function loop(t){requestAnimationFrame(loop);frame(t);}
function frame(t){g.clearRect(0,0,CW,CH);
 if(scene==='start'){shop(t);roberto(780,200,10,true,'point',t);}
 else if(scene==='intro'){shop(t);roberto(40,200,10,false,'idle',t);}
 else if(scene==='call'){shop(t);R(0,0,CW,CH,'rgba(0,0,0,.35)');g.save();g.translate(560,230);g.rotate(Math.sin(t/35)*.08);
  R(-90,0,180,90,'#b71c1c');R(-60,-30,120,26,'#111');R(-85,-22,30,16,'#111');R(55,-22,30,16,'#111');R(-30,25,60,50,'#eee');g.fillStyle='#b71c1c';g.beginPath();g.arc(0,50,18,0,7);g.fill();g.restore();
  g.strokeStyle='#ffd54f';g.lineWidth=5;for(let k=1;k<4;k++){g.beginPath();g.arc(560,200,60+k*26+(t/12)%26,-2.3,-.8);g.stroke();}}
 else if(scene==='puzzle')puzzle(t);
 else if(scene==='win'){shop(t);R(0,0,CW,CH,'rgba(105,240,174,.18)');roberto(300,170,12,false,'cheer',t);
  conf.forEach(q=>{q.y+=q.v;q.x+=Math.sin(q.y/30);if(q.y>CH)q.y=-10;R(q.x,q.y,8,8,q.c);});if(!(t%40<1))0;drawP();}}

/* ---------- INICIALIZAÇÃO ---------- */
function init(){cv=$('cv');g=cv.getContext('2d');g.imageSmoothingEnabled=false;reset();$('mtxt').innerHTML=manualHTML();go('start');
 $('play').addEventListener('click',startGame);$('next').addEventListener('click',next);$('dlg').addEventListener('click',e=>{if(e.target.id!=='next')next();});
 $('bman').addEventListener('click',()=>openManual(true));$('mclose').addEventListener('click',()=>openManual(false));
 $('brst').addEventListener('click',()=>{if(!paused){tok++;reset();play('page');}});
 $('again').addEventListener('click',()=>{play('click');startPuzzle();});$('home').addEventListener('click',()=>{play('click');go('start');});
 $('mute').addEventListener('click',()=>{muted=!muted;$('mute').textContent=muted?'🔇':'🔊';});
 cv.addEventListener('pointerdown',onDown);cv.addEventListener('pointermove',onMove);cv.addEventListener('pointerup',onUp);cv.addEventListener('pointercancel',onUp);
 document.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){if(scene==='start')startGame();else next();}
  else if(e.key==='m'||e.key==='M')openManual(!paused);else if(e.key==='Escape'&&paused)openManual(false);else if((e.key==='r'||e.key==='R')&&scene==='puzzle'&&!paused){tok++;reset();}});
 requestAnimationFrame(loop);}
if(typeof document!=='undefined')init();
if(typeof module!=='undefined')module.exports={S,WIRES,OBS,tryStep,reset,allDone,legs,validPath,go,frame,init};
