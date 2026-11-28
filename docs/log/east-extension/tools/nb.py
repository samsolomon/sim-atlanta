import json, math, sys
R=6371008.8; D=math.pi/180; O=(-84.3916,33.7539); k=math.cos(O[1]*D)
def sc(lon,lat): return ((lon-O[0])*D*R*k, -(lat-O[1])*D*R)
fc=json.load(open('neighborhoods.json'))
places=[]
for f in fc['features']:
    g=f['geometry']; polys=g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
    P=[[ [sc(*p) for p in ring] for ring in poly] for poly in polys]
    xs=[p[0] for poly in P for p in poly[0]]; zs=[p[1] for poly in P for p in poly[0]]
    places.append((f['properties']['name'],P,(min(xs),min(zs),max(xs),max(zs))))
def inring(x,z,r):
    ins=False; j=len(r)-1
    for i in range(len(r)):
        xi,zi=r[i]; xj,zj=r[j]
        if (zi>z)!=(zj>z) and x<(xj-xi)*(z-zi)/(zj-zi)+xi: ins=not ins
        j=i
    return ins
def at(x,z):
    for n,P,b in places:
        if x<b[0] or x>b[2] or z<b[1] or z>b[3]: continue
        for poly in P:
            if inring(x,z,poly[0]) and not any(inring(x,z,h) for h in poly[1:]): return n
    return None
STEP=50
def tally(x0,x1,z0,z1):
    t={}
    for xi in range(int(x0)+STEP//2,int(x1),STEP):
        for zi in range(int(z0)+STEP//2,int(z1),STEP):
            n=at(xi,zi) or '(outside city)'
            t[n]=t.get(n,0)+1
    return {n:c*STEP*STEP/1e6 for n,c in t.items()}
if __name__=='__main__':
    x0,x1,z0,z1=map(float,sys.argv[1:5])
    t=tally(x0,x1,z0,z1)
    # full area of each neighbourhood (approx via bbox raster)
    for n,a in sorted(t.items(),key=lambda kv:-kv[1]):
        full=None
        for nn,P,b in places:
            if nn==n:
                full=sum(1 for xi in range(int(b[0]),int(b[2]),STEP) for zi in range(int(b[1]),int(b[3]),STEP) if at(xi,zi)==n)*STEP*STEP/1e6
                bb=b
        if a>=0.05: print(f"{n:35s} {a:6.2f} km2 of {full if full else 0:6.2f}  bbox x {bb[0]:.0f}..{bb[2]:.0f} z {bb[1]:.0f}..{bb[3]:.0f}" if full else f"{n:35s} {a:6.2f}")
