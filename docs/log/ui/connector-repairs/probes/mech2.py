import json,math,re,numpy as np,collections
from pathlib import Path
from shapely.geometry import Polygon,Point
from shapely.strtree import STRtree
rib=json.load(open('S/rib/eval-high.json'.replace('S',__import__('sys').argv[1])))
polys=[];meta=[]
for r in rib:
    rows=r['rows']
    for a,b in zip(rows,rows[1:]):
        p=Polygon([a[1],a[2],b[2],b[1]]).buffer(0)
        if p.area>0: polys.append(p); meta.append((r['id'],r['kind'],r['dir'],r['link']))
tree=STRtree(polys)
def owner(x,z):
    idx=tree.query(Point(x,z),predicate='intersects'); return [meta[i] for i in idx]
H=Path('pipeline/prototypes/connector-footprint')
src=(H/'underpass-floors.py').read_text(); sections=eval(re.search(r'sections = (\{.*?\n\})',src,re.S).group(1))
patches=json.loads((H/'underpass-floors.json').read_text())
override={(375,-1425)}
res=collections.Counter(); rows=[]
for source in ["downtown-ground","square-board/north-band","square-board/south-band"]:
    d=Path('pipeline/prototypes')/source; m=json.loads((d/'ground.json').read_text())
    raw=np.fromfile(d/'ground.i16',dtype='<i2').reshape(m['rows'],m['cols']); old=raw*.1
    j,i=np.indices(old.shape); x=m['bounds']['minX']+i*5; z=m['bounds']['minZ']+j*5
    cover=np.zeros_like(old)
    for sid,secs in sections.items():
        for wid,ax,az,bx,bz,width in secs:
            L=math.hypot(bx-ax,bz-az); dx,dz=(bx-ax)/L,(bz-az)/L
            s=(x-ax)*dx+(z-az)*dz; t=(z-az)*dx-(x-ax)*dz
            cover=np.maximum(cover,np.clip(np.minimum.reduce([(width+20-abs(t))/9,(s+44)/16,(L+44-s)/16]),0,1))
    edge=np.minimum.reduce([i,j,m['cols']-1-i,m['rows']-1-j]); cover*=np.clip(edge/2,0,1)
    for k,q in patches[m['sha256']]:
        r_,c_=divmod(k,m['cols']); cv=cover[r_,c_]
        if not (0<cv<1): continue
        fit=old[r_,c_]+(q-old[r_,c_])/cv; dev=q-fit
        own=[o for o in owner(x[r_,c_],z[r_,c_]) if o[1]=='ground']
        if own and dev>1.0:
            rows.append((source.split('/')[-1],int(x[r_,c_]),int(z[r_,c_]),round(float(old[r_,c_]),2),q,round(float(fit),2),round(float(dev),2),round(float(cv),3),own[0][0],own[0][2]))
print('mechanism 2: partial-cover patch nodes inside a ground lane band lifted >1 m above the fitted pavement:',len(rows))
c=collections.Counter((r[0],r[8]) for r in rows)
for k,v in c.items(): 
    w=max([r for r in rows if (r[0],r[8])==k],key=lambda r:r[6]); print('  ',k,v,'worst',w)
json.dump(rows,open(__import__('sys').argv[1]+'/mech2.json','w'))
