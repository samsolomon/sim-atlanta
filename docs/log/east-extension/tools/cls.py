import json,sys
sys.path.insert(0,'.')
import nb
def load(fn,key):
    out=[]
    for f in json.load(open(fn))['features']:
        g=f['geometry']; polys=g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
        P=[[[nb.sc(*p) for p in r] for r in poly] for poly in polys]
        xs=[p[0] for poly in P for p in poly[0]]; zs=[p[1] for poly in P for p in poly[0]]
        out.append((f['properties'][key],P,(min(xs),min(zs),max(xs),max(zs))))
    return out
city=load('layer0.json','NAME'); npu=load('layer2.json','NAME'); cdp=load('cdp.json','NAME')
def hit(L,x,z):
    for n,P,b in L:
        if b[0]<=x<=b[2] and b[1]<=z<=b[3]:
            for poly in P:
                if nb.inring(x,z,poly[0]) and not any(nb.inring(x,z,h) for h in poly[1:]): return n
def label(x,z):
    n=nb.at(x,z)
    if n: return n
    if hit(city,x,z): return '(in city, no neighbourhood polygon)'
    c=hit(cdp,x,z)
    return f'(outside city: {c})' if c else '(outside city, no CDP)'
def tally(x0,x1,z0,z1,S=50):
    t={}
    for x in range(int(x0)+S//2,int(x1),S):
        for z in range(int(z0)+S//2,int(z1),S):
            k=label(x,z); t[k]=t.get(k,0)+S*S/1e6
    return t
if __name__=='__main__':
    for box in [list(map(float,a.split(','))) for a in sys.argv[1:]]:
        t=tally(*box); print(box, round(sum(t.values()),2))
        for k,v in sorted(t.items(),key=lambda kv:-kv[1]):
            if v>=0.04: print(f'   {k:45s} {v:5.2f}')
