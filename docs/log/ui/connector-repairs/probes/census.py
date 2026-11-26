import json,sys,collections,numpy as np
d=json.load(open(sys.argv[1])); rows=d['rows']; print('three',d['three'],'decks',d['decks'],'samples',d['n'])
P=json.load(open('pipeline/prototypes/connector-footprint/underpass-floors.json'))
grids={'downtown':('pipeline/prototypes/downtown-ground','497158186b7ec48c45a4c08ab29a6ac1b9b27563f760ac32a0c1a437f04f67ac'),'north-band':('pipeline/prototypes/square-board/north-band','b0d6067e203525b424c91e5d05b2d1aa189ebbd1cf9d2559a20f13f6ce2b5650'),'south-band':('pipeline/prototypes/square-board/south-band','b6376e9e792edbf4ff76b4146abdab0c41f161701e46304d343a9a553dee0a51')}
pnodes={}
for a,(p,sha) in grids.items():
    m=json.load(open(p+'/ground.json')); pnodes[a]=(m,{i for i,_ in P[sha]})
def patched(area,x,z):
    if area not in pnodes: return False
    m,s=pnodes[area]; c=(x-m['bounds']['minX'])/5; r=(z-m['bounds']['minZ'])/5
    return any(int(rr)*m['cols']+int(cc) in s for rr in (np.floor(r),np.ceil(r)) for cc in (np.floor(c),np.ceil(c)))
lanes=collections.defaultdict(list)
for r in rows: lanes[(r[0],r[2])].append(r)
spikes=[]
for k,L in lanes.items():
    L.sort(key=lambda r:r[3]); s=np.array([r[3] for r in L]); y=np.array([r[7] for r in L])
    for i,r in enumerate(L):
        w=(abs(s-s[i])<=12)&(abs(s-s[i])>0)
        if w.sum()<3: continue
        res=y[i]-np.median(y[w])
        if abs(res)>1.0:
            drawn_navd=r[7]+323.8; g=r[8]; under=r[9] is not None
            over = g is not None and drawn_navd-g>0.5
            cause='override' if over else ('patch-taper' if patched(r[6],r[4],r[5]) else ('unpatched-under-deck' if under else 'other'))
            spikes.append(dict(way=r[0],dir=r[1],lane=r[2],s=r[3],x=r[4],z=r[5],area=r[6],y=r[7],res=round(float(res),2),gridNavd=g,deck=r[9],cause=cause))
print('spike samples',len(spikes),collections.Counter(sp['cause'] for sp in spikes))
cl=collections.defaultdict(list)
for sp in spikes: cl[(sp['area'],round(sp['x']/30)*30,round(sp['z']/30)*30)].append(sp)
for k,v in sorted(cl.items(),key=lambda kv:-max(abs(q['res']) for q in kv[1])):
    w=max(v,key=lambda q:abs(q['res'])); print(k,len(v),'worst %+.2f'%w['res'],'at',w['x'],w['z'],'way',w['way'],w['dir'],'lane',w['lane'],'s',w['s'],'causes',dict(collections.Counter(q['cause'] for q in v)),'deck',w['deck'])
json.dump(spikes,open(sys.argv[2],'w'))
