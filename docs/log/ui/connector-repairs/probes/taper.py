import json,math,re,sys,numpy as np
from pathlib import Path
H=Path('pipeline/prototypes/connector-footprint')
src=(H/'underpass-floors.py').read_text()
sections=eval(re.search(r'sections = (\{.*?\n\})',src,re.S).group(1))
patches=json.loads((H/'underpass-floors.json').read_text())
out=[]
for source in ["downtown-ground","square-board/north-band","square-board/south-band"]:
    d=Path('pipeline/prototypes')/source; m=json.loads((d/'ground.json').read_text())
    raw=np.fromfile(d/'ground.i16',dtype='<i2').reshape(m['rows'],m['cols']); old=raw*m['scaleM']+m['offsetM']
    j,i=np.indices(old.shape); x=m['bounds']['minX']+i*m['stepM']; z=m['bounds']['minZ']+j*m['stepM']
    cover=np.zeros_like(old); lane=np.zeros(old.shape,bool); owner=np.full(old.shape,-1)
    best=np.zeros_like(old)
    for sid,secs in sections.items():
        for wid,ax,az,bx,bz,width in secs:
            L=math.hypot(bx-ax,bz-az); dx,dz=(bx-ax)/L,(bz-az)/L
            s=(x-ax)*dx+(z-az)*dz; t=(z-az)*dx-(x-ax)*dz
            w=np.clip(np.minimum.reduce([(width+20-abs(t))/9,(s+44)/16,(L+44-s)/16]),0,1)
            cover=np.maximum(cover,w)
            inl=(abs(t)<width)&(s>-44)&(s<L+44)
            lane|=inl; upd=inl&(w>best); owner[upd]=wid; best=np.maximum(best,np.where(inl,w,0))
    edge=np.minimum.reduce([i,j,m['cols']-1-i,m['rows']-1-j]); cover*=np.clip(edge/2,0,1)
    q=old.copy().ravel()
    for k,v in patches[m['sha256']]: q[k]=v
    q=q.reshape(old.shape)
    with np.errstate(divide='ignore',invalid='ignore'):
        fit=np.where(cover>1e-6, old+(q-old)/cover, np.nan)
    # full-cover nodes define the intended plane; partial cover keeps (1-cover) of raw
    dev=(1-cover)*(old-fit)   # = q - fit
    sel=lane&(cover>0)&(cover<1)&(abs(dev)>0.5)
    for jj,ii in zip(*np.nonzero(sel)):
        out.append(dict(board=source.split('/')[-1],x=float(x[jj,ii]),z=float(z[jj,ii]),node=int(jj*m['cols']+ii),cover=round(float(cover[jj,ii]),3),rawNavd=round(float(old[jj,ii]),2),patchNavd=round(float(q[jj,ii]),2),fitNavd=round(float(fit[jj,ii]),2),devM=round(float(dev[jj,ii]),2),lowerWay=int(owner[jj,ii])))
json.dump(out,open(sys.argv[1],'w'),indent=0)
import collections
print(len(out),'nodes; >+2m:',sum(r['devM']>2 for r in out),'<-2m:',sum(r['devM']<-2 for r in out))
c=collections.defaultdict(list)
for r in out: c[(r['board'],r['lowerWay'])].append(r)
for k,v in sorted(c.items(),key=lambda kv:-max(abs(r['devM']) for r in kv[1])):
    w=max(v,key=lambda r:abs(r['devM'])); print(k,len(v),'worst',w['devM'],'at',w['x'],w['z'],'raw',w['rawNavd'],'fit',w['fitNavd'],'cover',w['cover'])
