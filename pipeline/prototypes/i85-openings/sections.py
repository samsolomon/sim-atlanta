"""Record mounted columns in the legal direction of the GA13 SB to I-85 SB ramp."""
import argparse
import csv
import json
from collections import defaultdict
from pathlib import Path


def lower(s, length):
    # Classified open-pavement samples from the Connector owner's station register.
    start, end = 252.61, 256.13
    u = (s-5)/length
    if u<0: return start+(s-5)*.014
    if u>1: return end+(s-length-5)*.014
    return start+(end-start)*u*u*(3-2*u)+.014*length*u*(1-u)*(1-2*u)


def run(folder, output):
    axis = json.loads((folder/'axis-probes.json').read_bytes())
    origin = next(p['route'] for p in axis if p['way']==38981788)
    length = max(p['along'] for p in axis if p['way']==38981788)
    with output.open('w') as fp:
        out=csv.writer(fp)
        out.writerow(['tier','way','s_from_east_m','offset_m','x','z','terrain_navd88',
                      'lower_inferred_navd88','terrain_minus_lower_m','transport_faces_navd88'])
        for tier in ('low','high'):
            data=json.loads((folder/f'route-{tier}-columns.json').read_bytes())
            hits=defaultdict(list)
            for i,o,face,y,drawn,color in data['hits']:
                if drawn: hits[i].append((data['objects'][o]['path'],y+323.8))
            for i,p in enumerate(axis):
                s=p['route']-origin
                g=[y for obj,y in hits[i] if obj.endswith('/Mesh[0]')]
                other=[round(y,4) for obj,y in hits[i] if not obj.endswith('/Mesh[0]')]
                # Exposed tie-ins are supplied separately by the road owner.
                h=lower(s,length) if 0<=s<=length+10 else None
                ground=max(g,default=None)
                out.writerow([tier,p['way'],s,p['offset'],p['x'],p['z'],ground,h,
                              ground-h if h is not None and ground is not None else None,other])


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('folder',type=Path)
    parser.add_argument('output',type=Path)
    args=parser.parse_args()
    run(args.folder,args.output)
