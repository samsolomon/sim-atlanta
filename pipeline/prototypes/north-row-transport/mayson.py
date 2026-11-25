"""Portable owner-selected surfaces. Each triangle vertex is [x, sceneY, z, sourceStation]."""
import bisect,json,math
import numpy as np
from shapely.geometry import Point
from inventory import HERE,load,ground

WIDTH={9270932:6.2,429349499:5,144485857:1.435,81137860:3.2,319512612:3.2}
PAIRS=[(81137860,9270932),(319512612,429349499),(144485857,9270932)]
def split_face(face,cut,sign):
    poly=[]
    for a,b in zip(face[-1:]+face,face):
        da,db=sign*(a[0]-cut),sign*(b[0]-cut)
        if (da<0)!=(db<0):poly.append([v+(w-v)*da/(da-db) for v,w in zip(a,b)])
        if db>=0:poly.append(b)
    return [[poly[0],b,c] for b,c in zip(poly[1:],poly[2:]) if abs((b[0]-poly[0][0])*(c[2]-poly[0][2])-(b[2]-poly[0][2])*(c[0]-poly[0][0]))>1e-8]
def bake():
    ways,axes,_,_=load()
    obs=json.loads((HERE/'mayson-observations.json').read_text())
    crossing=[dict(a=a,b=b,xz=list(axes[a].intersection(axes[b]).coords[0])) for a,b in PAIRS]
    cut=crossing[0]['xz'][0];surfaces=[]
    for key,width in WIDTH.items():
        axis=axes[key];at=[axis.project(Point(c['xz'])) for c in crossing if key in (c['a'],c['b'])]
        elevated=key in (81137860,319512612);anchors=[];held=None
        if elevated:
            for i,s,x,z,g in obs:
                if i!=key:continue
                # Dense elevated continuous band. No class-17 identification in these windows.
                choices=[group for group in g['other'] if group[0]>=20 and group[2]>ground(x,z)+3 and group[3]-group[1]<1.5]
                if len(choices)==1:
                    if abs(s-at[0])<.01:held=choices[0][2]
                    else:anchors.append((s,choices[0][2]))
            lo,hi=anchors[0][0],anchors[-1][0]
        else:lo=max(0,min(at)-35);hi=min(axis.length,max(at)+35)
        rows=[]
        for s in sorted({lo,hi,*at,*[v for v,h in anchors],*range(math.ceil(lo),math.ceil(hi))}):
            x,z=axis.interpolate(s).coords[0];p,q=[axis.interpolate(max(0,min(axis.length,s+d))) for d in [-.2,.2]]
            dx,dz=q.x-p.x,q.y-p.y;norm=math.hypot(dx,dz)
            y=float(np.interp(s,*zip(*anchors))) if elevated else ground(x,z)+.08
            rows.append([[x-dz/norm*d,y-323.8,z+dx/norm*d,s] for d in [-width/2,width/2]])
        tiles=[[],[]]
        for (a,b),(c,d) in zip(rows,rows[1:]):
            for face in [[a,b,d],[a,d,c]]:
                for side,sign in enumerate([-1,1]):tiles[side].extend(split_face(face,cut,sign))
        surfaces.append(dict(way=key,version=ways[key]['version'],widthM=width,rows=rows,tiles=tiles,sourceStationM=[lo,hi],
                        heightEvidence='inferred upper surface from unclassified elevated cluster' if elevated else 'DEM + illustrative 0.08 m',
                        heldOutUpperMedianNavd88M=held,physicalRailheadM=None,soffitM=None))
    return dict(cutX=cut,sceneZeroNavd88M=323.8,units='metres',crossings=crossing,surfaces=surfaces)
if __name__=='__main__':print(json.dumps(bake(),separators=(',',':'),allow_nan=False))
