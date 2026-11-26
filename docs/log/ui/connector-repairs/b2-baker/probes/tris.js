(async()=>{const {scene}=__cityDev;__setView(150,60,200,1000,-790);await new Promise(r=>setTimeout(r,6000));let deck=0,all=0;
scene.traverse(m=>{if(!m.isMesh||!m.visible)return;const g=m.geometry;const c=(g.index?g.index.count:g.attributes.position.count)/3;all+=c;if((m.name||'').includes('Decks and embedded rails'))deck+=c;});
return {deck:Math.round(deck),all:Math.round(all)};})()
