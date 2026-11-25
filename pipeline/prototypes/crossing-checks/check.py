"""Calibrate the crossing probes against Phone's frozen City render exports."""
import argparse
import json
from pathlib import Path

import numpy as np
from shapely.geometry import LineString
from terminal import transverse, peachtree_terminal
from protection import protection
from faces import Scene
from overlap import open_intervals, clearance
from shapely.ops import unary_union
from shapely.geometry import Polygon

HERE = Path(__file__).resolve().parent
FIXTURES = HERE.parents[2] / 'web/src/city/fixtures'
REGISTER = json.loads((HERE / 'capitol.json').read_text())


def location(line, s, offset=0):
    q = np.array(line.interpolate(max(0, min(s, line.length))).coords[0])
    a = np.array(line.interpolate(max(0,s-.01)).coords[0])
    b = np.array(line.interpolate(min(line.length,s+.01)).coords[0])
    v = (b-a)/np.linalg.norm(b-a)
    return q + v*(s-np.clip(s,0,line.length)) + offset*np.array([-v[1],v[0]])


def witness(way, station, p, **details):
    return dict(way=way,stationM=round(float(station),4),xz=list(p),
                camera=f'{p[0]:.2f},{p[1]:.2f},110,75,75',**details)


def capitol(scene):
    pavement = scene.layer(name='Decks and embedded rails',colors=[0x5d5f66])
    walk = scene.layer(name='Decks and embedded rails',colors=[0xd9d3c7])
    ground = scene.layer(board=True)
    approaches = scene.layer(name='bridge approaches')
    shell=scene.layer(name='Decks and embedded rails',colors=[0xa7a197])
    walk_rows = []
    missing=[]
    for idx in ['517','518','519','520']:
        data=REGISTER[idx]
        line=LineString(data['points'])
        for s in np.linspace(.02,line.length-.02,int(line.length*4)+1):
            for offset in [-.99,0,.99]:
                p=location(line,s,offset)
                top=walk.hits(p)
                if not top:
                    missing.append(witness(data["way"],s,p,offset=offset))
                    continue
                road=pavement.hits(p)
                owners=road+approaches.hits(p)+ground.hits(p)
                if not owners:raise ValueError(f'Missing supporting surface at {p}')
                # A pedestrian crossing painted on the street has no designed curb.
                gap=min(top)-max(owners)
                soffits=[y for y in shell.hits(p) if abs(min(top)-y-.4)<.025]
                walk_rows.append(witness(data['way'],s,p,offset=offset,gapM=gap,
                                         undersideGapM=min(soffits)-max(owners) if soffits else None,
                                         support='street' if road and max(owners)==max(road) else 'approach or board'))
    joints=[]
    for before,after in [('1011','238'),('357','30'),('355','798'),('364','355'),('798','1015'),('30','1017')]:
        u,v=REGISTER[before],REGISTER[after]
        p1,p2=u['points'],v['points']
        if p1[0] in [p2[0],p2[-1]]:p1=p1[::-1]
        if p1[-1]==p2[-1]:p2=p2[::-1]
        if p1[-1]!=p2[0]:raise ValueError((before,after))
        lines=list(map(LineString,[p1,p2]))
        far=min(8., min(line.length for line in lines)-.02)
        near=min(2.,far/4)
        def heights(i,dist):
            s=lines[0].length-dist if i==0 else dist
            p=location(lines[i],s)
            hs=pavement.hits(p)+approaches.hits(p)
            return max(hs or ground.hits(p))
        # Estimate the actual one-sided grades outside overlapping junction polygons.
        grades=[(heights(0,near)-heights(0,far))/(far-near),(heights(1,far)-heights(1,near))/(far-near)]
        src=[]
        for data,at_end,sign in [(u,p1==u['points'],1),(v,p2!=v['points'],-1)]:
            ar=np.array(data['class2'])
            if len(ar)<2:break
            dist=(LineString(data['points']).length-ar[:,0]) if at_end else ar[:,0]
            q=ar[np.argmin(abs(dist-near))];f=ar[np.argmin(abs(dist-far))]
            diff=abs(f[0]-q[0])
            if diff<1:break
            # Interquartile envelopes at each footprint, propagated across baseline.
            vals=[sign*(q[j]-f[k])/diff for j,k in [(2,4),(4,2)]]
            src.append(sorted(vals))
        if len(src)!=2:continue
        envelope=[src[1][0]-src[0][1],src[1][1]-src[0][0]]
        change=grades[1]-grades[0]
        joints.append(witness(u['way'],lines[0].length if p1==u['points'] else 0,p1[-1],
                    receivingWay=v['way'],gradeDistancesM=[near,far],oneSidedGradePct=np.multiply(grades,100).tolist(),
                    changePP=100*change,sourceChangeEnvelopePP=np.multiply(envelope,100).tolist(),
                    outside=bool(change<envelope[0] or change>envelope[1]),
                    stepM=heights(1,.001)-heights(0,.001)))
    floated=[r for r in walk_rows if r['undersideGapM'] is not None and r['undersideGapM']>.001 and r['support']!='street']
    return dict(walkSamples=len(walk_rows),missingWalkSamples=len(missing),firstMissing=next(iter(missing),None),firstUnsupported=next(iter(floated),None),
                lengthByWayAndOffsetM={f"{way}/{offset}":round(sum(1 for r in floated if r["way"]==way and r["offset"]==offset)*LineString(data["points"]).length/(int(LineString(data["points"]).length*4)+1),3) for key,data in REGISTER.items() if key in ["517","518","519","520"] for way in [data["way"]] for offset in [-.99,0,.99]},
                maxWalkGap=max(walk_rows,key=lambda r:r['gapM']),joints=joints)


def reference(scene,site):
    if site=='seventeenth':
        rows=np.array(json.loads((FIXTURES/'seventeenth-street.json').read_text())['rows'])
        left,right=rows[:,[0,1]],rows[:,[3,4]]
        road=scene.layer(name='17th Street Bridge',colors=[0xa49e92])
        walks=scene.layer(name='17th Street Bridge',colors=[0xd2c5b2,0xa49e92])
        support=scene.layer(name='17th Street Bridge',colors=[0x9e997f])
        approaches=scene.layer(name='bridge approaches')
        way=1452444262
    else:
        line=LineString(json.loads((FIXTURES/'brookwood.json').read_text())['bridge'])
        way=38978515
        road=scene.layer(colors=[0x7f817c])
        walks=scene.layer(colors=[0xc5bdac])
        support=road
        approaches=road
    samples=[];seams=[];openings=[]
    if site=='seventeenth':
        line=LineString((left+right)*.5)
        stations=np.r_[0,np.cumsum(np.linalg.norm(np.diff((left+right)*.5,axis=0),axis=1))]
    for s in np.linspace(.025,line.length-.025,int(line.length*2)+1):
        if site=='seventeenth':
            a,b=[np.array([np.interp(s,stations,arr[:,i]) for i in (0,1)]) for arr in (left,right)]
            probes=[(a+(b-a)*f,walks if f<.205 or f>.845 else road) for f in [.025,.11,.19,.26,.43,.60,.80,.86,.915,.98]]
        else:
            probes=[(location(line,s,d),walks if abs(d)>13.4 else road) for d in [-16,-15,-14,-10,-6,-2,2,6,10,14,15,16]]
        for p,layer in probes:
            up,base=layer.hits(p),support.hits(p)
            samples.append(witness(way,s,p,hasSurface=bool(up),supported=bool(base),
                                   riseM=max(up)-max(base) if up and base else None))
    for end in (0,1):
        for f in [.025,.11,.19,.26,.43,.60,.80,.86,.915,.98]:
            if site=='seventeenth':
                j=-1 if end else 0
                p=left[j]+f*(right[j]-left[j])
                neighbor=-2 if end else 1
                v=p-(left[neighbor]+f*(right[neighbor]-left[neighbor]))
                inner=walks if f<.205 or f>.845 else road
                outer=approaches
            else:
                s=line.length if end else 0
                p=location(line,s,(f-.5)*32)
                v=p-location(line,s+(-.1 if end else .1),(f-.5)*32)
                inner=outer=walks if abs((f-.5)*32)>13.45 else road
            v/=np.linalg.norm(v)
            u,h=inner.hits(p-.001*v),outer.hits(p+.001*v)
            if site=="peachtree":
                spans=open_intervals(outer,p-.1*v,p+3*v)
                openings.append(witness(way,line.length if end else 0,p,offset=(f-.5)*32,
                    openM=[[lo-.1,hi-.1] for lo,hi in spans if hi-lo>.001]))
            grades=[]
            for layer,distances in [(inner,[-2.,-.1]),(outer,[.1,2.])]:
                first,last=[layer.hits(p+v*d) for d in distances]
                grades.append(100*(max(last)-max(first))/(distances[1]-distances[0]) if first and last else None)
            seams.append(witness(way,line.length if end else 0,p,fraction=f,gradesPct=grades,
                                 stepM=max(h)-max(u) if h and u else None))
    missing=[q for q in samples if not q['hasSurface'] or not q['supported']]
    gaps=[q['riseM'] for q in samples if q['riseM'] is not None]
    # Running footprint of the upper carrier, bounded by its skew terminal rows.
    if site=="seventeenth":
        mask=Polygon(np.concatenate([left,right[::-1]]))
    else:
        mask=line.buffer(17,cap_style="flat")
    if site=="seventeenth":
        full=[]
        for j,neighbor in [(0,1),(-1,-2)]:
            a,b=left[j],right[j]
            n=(a+b-left[neighbor]-right[neighbor]);n/=np.linalg.norm(n)
            for lo,hi,layer in [(0,.205,walks),(.205,.845,road),(.845,1,walks)]:
                full.append(dict(stationM=0 if j==0 else line.length,band=[lo,hi],
                            joint=transverse(layer,approaches,a+(b-a)*lo,a+(b-a)*hi,n)))
    else:
        full=peachtree_terminal(scene,line,road,walks,location)
    protectionResult=protection(scene,site,mask)
    markingColors=[0xd9b257] if site=='seventeenth' else [0xd7b770,0xd3d0bf]
    markings=scene.layer(name='17th Street Bridge' if site=='seventeenth' else '',colors=markingColors)
    painted=unary_union(markings.tree.geometries).intersection(mask)
    treadMask=unary_union(road.tree.geometries)
    outsidePaint=painted.difference(treadMask).area
    beyondBudget=painted.difference(treadMask.buffer(.001)).area
    extra={}
    if site=='seventeenth':
        row=next(r for ramp in json.loads((FIXTURES/'seventeenth-street.json').read_text())['ramps']
                 for part in ramp['parts'] for r in part['rows'] if r[1]==-4100.)
        a,b=np.array(row)[[0,1]],np.array(row)[[3,4]]
        # Both boards emit their own apron, walks and curbs. Follow the central
        # three vehicle lanes through the tile cut.
        observed=[]
        for r in rows:
            center=(r[[0,1]]+r[[3,4]])*.5
            ys=road.hits(center)
            if ys:observed.append(max(ys)+323.8-.5*(r[2]+r[5]))
        extra['centerResidualToSurveyM']=[min(observed),max(observed)]
        extra['tileSeam']=transverse(road,road,a+.1*(b-a),a+.9*(b-a),[0,1])
    else:
        rails=scene.layer(colors=[0xb0ae9f])
        extra['railheadToRoadTop']=clearance(road,rails,mask)
    return dict(extra=extra,markingAreaM2=painted.area,markingBeyondSeamToleranceM2=beyondBudget,markingOutsideTreadM2=outsidePaint,fullWidth=full,protection=protectionResult,sampleCount=len(samples),missing=len(missing),firstMissing=next(iter(missing),None),
                topMinusSupportRangeM=[min(gaps),max(gaps)],seams=seams,openings=openings)


def main():
    p=argparse.ArgumentParser()
    p.add_argument('exports',type=Path)
    p.add_argument('--tier',choices=['low','high'],action='append')
    p.add_argument('--out',type=Path,required=True)
    p.add_argument('--expect',choices=['baseline','peachtree','combined'],required=True)
    args=p.parse_args();results={}
    mismatches=[]
    for tier in args.tier or ['low','high']:
        for site in ['seventeenth','peachtree','capitol']:
            face=args.exports/tier/f'faces-{site}-{tier}.json'
            wide=face.with_name(f'faces-{site}-wide-{tier}.json')
            if wide.is_file():face=wide
            scene=Scene(face)
            results[f'{site}-{tier}']=capitol(scene) if site=='capitol' else reference(scene,site)
            row=results[f'{site}-{tier}']
            if site=='capitol':
                failed=[]
                if row['firstUnsupported']:failed.append('walk support')
                if any(j['outside'] for j in row['joints']):failed.append('joint grade')
                wanted=['walk support','joint grade']
            else:
                failed=[]
                joins=[v[k] for v in row['fullWidth'] for k in ['joint','groundLanding'] if k in v]
                if row['missing'] or any(j['maxOpenWidthM']>.001 or j['minStep'] is None or
                        j['minStep'][0]<-.002 or j['maxStep'][0]>.002 for j in joins):
                    failed.append('landing')
                feet=row['protection']['feet']
                if site=='seventeenth' and len(feet)!=20:raise ValueError('Incomplete pier inventory')
                if any(f['seating']['areaM2']<f['areaM2']-1e-5 or
                       f['seating']['maximum'][0]>.001 for f in feet):failed.append('pier seating')
                for r in row['protection']['roads']:
                    target=10.05 if site=='peachtree' else 0
                    if not r['clearance']['minimum'] or r['clearance']['minimum'][0]<target:
                        failed.append('lower clearance');break
                if any(r['pierLaneAreaM2']>0 or r['pierShoulderAreaM2']>0 for r in row['protection']['roads']):
                    failed.append('pier footprint')
                if row['markingBeyondSeamToleranceM2']>1e-8:failed.append('marking outside tread')
                seam=row['extra'].get('tileSeam')
                if seam and (seam['maxOpenWidthM']>.001 or max(abs(seam[k][0]) for k in ['minStep','maxStep'])>.002):
                    failed.append('tile seam')
                wanted=[]
                if site=='seventeenth' and args.expect!='combined':wanted=['pier seating']
                if site=='peachtree' and args.expect=='baseline':wanted=['landing']
            row['failures']=failed
            if failed!=wanted:mismatches.append((site,tier,failed,wanted))
    args.out.write_text(json.dumps(results,indent=2,allow_nan=False)+'\n')

    if mismatches:raise SystemExit(f'Calibration mismatch {mismatches}')

if __name__=='__main__':
    main()
