import json,sys,numpy as np
S=sys.argv[1]; sys.path.insert(0,S+'/checker/pipeline/prototypes/crossing-checks')
from faces import Scene,Layer
deck=[d for d in json.load(open('pipeline/prototypes/connector-footprint/street-bridges.json')) if d['outline']==1451196894][0]
rows=deck['rows']
for tier in ['high','low']:
    sc=Scene(f'{S}/jsites/{tier}/faces-J-{tier}.json')
    allf=Layer([t for (l,b,c),ts in sc.groups.items() for t in ts if 'Studio' not in l])
    for name,row,nxt in [('north',rows[0],rows[1]),('south',rows[-1],rows[-2])]:
        a=np.array(row[:2]);b=np.array(row[3:5]); n=(a+b)/2-(np.array(nxt[:2])+np.array(nxt[3:5]))/2; n/=np.linalg.norm(n)
        worst=[];gaps=0
        for f in np.linspace(.03,.97,25):
            p=a+f*(b-a)
            hin=allf.hits(p-.001*n); hout=allf.hits(p+.001*n)
            if not hin or not hout: gaps+=1; continue
            top=max(hin); out=min(hout,key=lambda y:abs(y-top))
            worst.append((round(out-top,4),round(f,2)))
        worst.sort(key=lambda w:-abs(w[0]))
        print(tier,name,'samples',len(worst),'open',gaps,'worst steps',worst[:4])
