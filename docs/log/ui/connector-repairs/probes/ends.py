"""Open ribbon ends: an end (or start) with no continuing ribbon within 1 m. Track the drawn top
tread from 6 m inside to the end, then look 1 mm and 1 m beyond for any road/board surface.
'air' = nearest surface beyond lies > 0.5 m below the tread."""
import json,sys,numpy as np
sys.path.insert(0,sys.argv[1]+'/checker/pipeline/prototypes/crossing-checks')
from faces import Scene,Layer
S=sys.argv[1]; site=sys.argv[2]; tier=sys.argv[3]; box=list(map(float,sys.argv[4].split(',')))
rib=json.load(open(S+'/rib/eval-high.json'))
sc=Scene(f'{S}/sites/{tier}/faces-{site}-{tier}.json')
road=Layer([t for (l,b,c),ts in sc.groups.items() if not b and ('Decks and embedded rails' in l or 'Group' in l.split('/')[-2] or 'bridge approaches' in l) for t in ts])
board=sc.layer(board=True)
surf=lambda p: road.hits(p)+board.hits(p)
mid=lambda row: np.mean([row[1],row[2]],0)
S0=[mid(r['rows'][0]) for r in rib]; E0=[mid(r['rows'][-1]) for r in rib]
out=[]
for i,r in enumerate(rib):
    for end in ('end','start'):
        row,nb=(r['rows'][-1],r['rows'][-2]) if end=='end' else (r['rows'][0],r['rows'][1])
        c=mid(row)
        if not (box[0]<=c[0]<=box[1] and box[2]<=c[1]<=box[3]): continue
        others=S0 if end=='end' else E0
        if any(j!=i and np.linalg.norm(o-c)<1.0 for j,o in enumerate(others)): continue
        n=c-mid(nb); n/=np.linalg.norm(n)
        worst=None
        for f in np.linspace(.1,.9,5):
            p=np.array(row[1])+f*(np.array(row[2])-np.array(row[1]))
            h=road.hits(p-6*n)
            if not h: continue
            y=max(h)
            for d in [4,2,1,.5,.1,.001]:
                hh=surf(p-d*n)
                if not hh: y=None;break
                y=min(hh,key=lambda q:abs(q-y))
            if y is None: continue
            g=board.hits(p+1*n); g=max(g) if g else None
            b1=surf(p+.001*n); b2=surf(p+1.0*n)
            near1=min(b1,key=lambda q:abs(q-y)) if b1 else None
            near2=min(b2,key=lambda q:abs(q-y)) if b2 else None
            drop=None if near2 is None else y-near2
            rec=dict(f=round(f,2),xz=[round(float(p[0]),2),round(float(p[1]),2)],tread=round(y,3),beyond1mm=None if near1 is None else round(near1-y,3),beyond1m=None if near2 is None else round(near2-y,3),treadAboveBoard1m=None if g is None else round(y-g,3))
            if worst is None or (drop or 0)>(worst['drop'] or 0): worst=dict(rec,drop=drop)
        if worst: out.append(dict(site=site,tier=tier,way=r['id'],kind=r['kind'],dir=r['dir'],end=end,endXz=[round(float(c[0]),2),round(float(c[1]),2)],**worst))
json.dump(out,open(f'{S}/sites/ends-{site}-{tier}.json','w'),indent=1)
air=[o for o in out if o['drop'] is not None and o['drop']>0.5]
print(site,tier,'open ends',len(out),'ending in air (>0.5 m drop 1 m beyond)',len(air))
for o in sorted(air,key=lambda o:-o['drop']): print('  ',o['way'],o['kind'],o['dir'],o['end'],'end',o['endXz'],'tread',o['tread'],'drop 1m beyond %.3f'%o['drop'],'above board',o['treadAboveBoard1m'],'xz',o['xz'])
