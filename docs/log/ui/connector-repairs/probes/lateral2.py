"""Adjacent upper-deck treads across the Sweet Auburn viaduct: facing-edge steps (m) between
neighbouring tread pieces, from the drawn faces. Lowest face above board+3 m = tread under parapet tops."""
import json,sys,numpy as np
S,site,tier=sys.argv[1],sys.argv[2],sys.argv[3]; sys.path.insert(0,S+'/checker/pipeline/prototypes/crossing-checks')
from faces import Scene,Layer
sc=Scene(f'{S}/{site}/{tier}/faces-A-{tier}.json')
deck=Layer([t for (l,b,c),ts in sc.groups.items() if not b and 'Decks and embedded rails' in l for t in ts])
board=sc.layer(board=True)
out=[];worst=(0,None)
for z in range(-200,41,10):
    xs=np.arange(1150,1265,.05); tread=[]
    for x in xs:
        g=board.hits((x,z)); g=max(g) if g else -99
        h=sorted(y for y in deck.hits((x,z)) if y>g+3); tread.append(h[0] if h else None)
    segs=[];cur=None
    for x,y in zip(xs,tread):
        if y is None or (cur and abs(y-cur[3])>0.02):
            if cur and cur[1]-cur[0]>1.0: segs.append(cur)
            cur=None
        if y is not None:
            if not cur: cur=[x,x,y,y]
            cur[1]=x; cur[3]=y
    if cur and cur[1]-cur[0]>1.0: segs.append(cur)
    adj=[(round(float(b[0]-a[1]),2),round(float(b[2]-a[3]),3),round(float(a[1]),2)) for a,b in zip(segs,segs[1:])]
    touching=[t for t in adj if t[0]<=0.5]
    for t in touching:
        if abs(t[1])>abs(worst[0]): worst=(t[1],(z,t))
    out.append(dict(z=z,adjacent=adj))
print(site,tier,'worst touching-slab step',worst)
for o in out:
    if o['z'] in (-180,-120,-60,0): print('  z',o['z'],o['adjacent'])
json.dump(out,open(f'{S}/{site}/lateral-{tier}.json','w'))
