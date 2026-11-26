import json,sys,numpy as np
sys.path.insert(0,sys.argv[1]+'/checker/pipeline/prototypes/crossing-checks')
from faces import Scene,Layer
S=sys.argv[1]; tier=sys.argv[2]
sc=Scene(f'{S}/sites/{tier}/faces-A-{tier}.json')
deck=Layer([t for (l,b,c),ts in sc.groups.items() if not b and 'Decks and embedded rails' in l for t in ts])
board=sc.layer(board=True)
out=[]
for z in range(-200,40,10):
    xs=np.arange(1150,1265,.1); prof=[]
    for x in xs:
        bh=board.hits((x,z)); g=max(bh) if bh else None
        h=[y for y in deck.hits((x,z)) if g is None or y>g+3]
        prof.append(max(h) if h else None)
    # segments of upper deck
    segs=[];cur=None
    for x,y in zip(xs,prof):
        if y is None:
            if cur: segs.append(cur); cur=None
        else:
            if cur and abs(y-cur['last'])>0.25: segs.append(cur); cur=None
            if not cur: cur=dict(x0=round(float(x),1),y0=round(y,3))
            cur['x1']=round(float(x),1); cur['last']=y
    if cur: segs.append(cur)
    gaps=[(round(b['x0']-a['x1'],1),round(b['y0']-a['last'],3)) for a,b in zip(segs,segs[1:])]
    out.append(dict(z=z,segments=len(segs),gaps=gaps,span=[segs[0]['x0'],segs[-1]['x1']] if segs else None))
    print(z,len(segs),'pieces; gaps(widthM,stepM):',gaps)
json.dump(out,open(f'{S}/sites/lateral-A-{tier}.json','w'))
