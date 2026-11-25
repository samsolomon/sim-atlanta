"""Apply three illustrative golf overlays to a private 74e0f9f0 data root."""
import hashlib,json,sys
from pathlib import Path
pack=Path(__file__).parent
root=Path(sys.argv[1])
sha=lambda b:hashlib.sha256(b).hexdigest()
pending=[]
for row, hashes in json.loads((pack/'sha256.json').read_text()).items():
    path=root/'scene/square-board'/row/'context.json'
    original=path.read_bytes()
    if sha(original)==hashes['result']:continue
    if sha(original)!=hashes['input']:raise ValueError('Unexpected input: '+row)
    data=json.loads(original); overlay=json.loads((pack/(row+'.json')).read_text())
    data.update(golfTees=overlay['golfTees'],golfPresentation=overlay['golfPresentation'])
    data['points']['golfMarkers']=overlay['golfMarkers']
    result=(json.dumps(data,separators=(',',':'))+'\n').encode()
    if sha(result)!=hashes['result']:raise ValueError('Unexpected result: '+row)
    pending.append((path,result))
for path,data in pending:
    tmp=path.with_suffix('.tee.tmp');tmp.write_bytes(data);tmp.replace(path)
print('Verified all three course rows.')
