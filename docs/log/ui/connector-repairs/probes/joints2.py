"""Ribbon-joint continuity on drawn faces, tracking two candidate treads from 6 m upstream:
'top' (highest road-layer face: deck, approach or street ribbon) and 'board' (the drawn ground
or a road face within 1 m of it). Each track follows the nearest surface step by step to the joint,
then the receiving surface 1 mm past it. Limits as the checker: 2 mm flush step; >0.5 m = unsupported."""
import json,sys,numpy as np
sys.path.insert(0,sys.argv[1]+'/checker/pipeline/prototypes/crossing-checks')
from faces import Scene,Layer
S=sys.argv[1]; site=sys.argv[2]; tier=sys.argv[3]; box=list(map(float,sys.argv[4].split(',')))
rib=json.load(open(S+'/rib/eval-high.json'))
sc=Scene(f'{S}/sites/{tier}/faces-{site}-{tier}.json')
road=Layer([t for (l,b,c),ts in sc.groups.items() if not b and ('Decks and embedded rails' in l or 'Group' in l.split('/')[-2] or 'bridge approaches' in l) for t in ts])
board=sc.layer(board=True)
def surf(p): return road.hits(p)+board.hits(p)
starts=[(r,np.mean([r['rows'][0][1],r['rows'][0][2]],0)) for r in rib]
out=[]
for u in rib:
    last=u['rows'][-1]; c=np.mean([last[1],last[2]],0)
    if not (box[0]<=c[0]<=box[1] and box[2]<=c[1]<=box[3]): continue
    prev=u['rows'][-2]; n=c-np.mean([prev[1],prev[2]],0); n/=np.linalg.norm(n)
    for v in [v for v,s in starts if v is not u and np.linalg.norm(s-c)<1.0]:
        for track in ['top','board']:
            rows=[]
            for f in np.linspace(.05,.95,10):
                p=np.array(last[1])+f*(np.array(last[2])-np.array(last[1]))
                g=board.hits(p-6*n); g=max(g) if g else None; h=surf(p-6*n)
                if g is None or not h: continue
                if track=='top':
                    up=road.hits(p-6*n)
                    if not up: continue
                    y=max(up)
                else: y=min(h,key=lambda q:abs(q-g))
                for d in [4,2,1,.5,.1,.001]:
                    hh=surf(p-d*n)
                    if not hh: y=None;break
                    y=min(hh,key=lambda q:abs(q-y))
                if y is None: continue
                ho=surf(p+.001*n)
                if not ho: rows.append(dict(f=round(f,2),xz=[round(float(p[0]),2),round(float(p[1]),2)],yin=round(y,3),status='nothing beyond'));continue
                yo=min(ho,key=lambda q:abs(q-y)); st='ok' if abs(yo-y)<=.002 else ('step' if abs(yo-y)<=.5 else 'unsupported')
                rows.append(dict(f=round(f,2),xz=[round(float(p[0]),2),round(float(p[1]),2)],yin=round(y,3),yout=round(yo,3),stepM=round(yo-y,4),status=st))
            if not rows: continue
            bad=[r for r in rows if r['status']!='ok']
            out.append(dict(site=site,tier=tier,track=track,incoming=u['id'],incomingKind=u['kind'],receiving=v['id'],receivingKind=v['kind'],xz=[round(float(c[0]),2),round(float(c[1]),2)],samples=len(rows),fails=len(bad),worst=max(bad,key=lambda r:abs(r.get('stepM') if r.get('stepM') is not None else 99)) if bad else None,rows=rows))
json.dump(out,open(f'{S}/sites/joints2-{site}-{tier}.json','w'),indent=1)
fail=[j for j in out if j['fails']]
print(site,tier,'joint-tracks',len(out),'failing',len(fail))
for j in sorted(fail,key=lambda j:-abs(j['worst'].get('stepM') if j['worst'].get('stepM') is not None else 99)):
    w=j['worst']; print('  ',j['track'],j['incoming'],j['incomingKind'],'->',j['receiving'],j['receivingKind'],'at',j['xz'],'fails %d/%d'%(j['fails'],j['samples']),w['status'],w.get('stepM'),'yin',w.get('yin'),'xz',w.get('xz'))
