import json,sys,collections,numpy as np
for t in ['high','low']:
  rows=json.load(open(f'{sys.argv[1]}/eval-{t}.json'))
  by=collections.defaultdict(list)
  for r in rows: by[r[0]].append(r)
  print('==',t)
  for w,rs in by.items():
    miss=[r for r in rs if r[5] is None]
    ok=[r for r in rs if r[5] is not None]
    d=np.array([r[5]-r[4] for r in ok])
    poke=[r for r in ok if r[6] is not None and r[6]>r[5]+0.01]
    # step: second difference of top along station
    steps=[]
    for a,b,c in zip(ok,ok[1:],ok[2:]):
      if c[1]-a[1]<0.6: steps.append((abs((b[5]-a[5])-(c[5]-b[5])),b[1],b[2],b[3]))
    st=max(steps) if steps else None
    print(w,'n',len(rs),'miss',len(miss),'dmed %.3f dmin %.3f dmax %.3f'%(np.median(d),d.min(),d.max()) if len(d) else '', 'poke',len(poke),'maxkink %.3f@%s'%(st[0],st[1:]) if st else '', 'miss@',[ (m[1]) for m in miss[:6]])
