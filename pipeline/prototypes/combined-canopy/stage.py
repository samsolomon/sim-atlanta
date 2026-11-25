"""Apply the verified private landscape to a private copy of the combined data root."""
import gzip
import hashlib
import json
import sys
from pathlib import Path

pack = Path(__file__).parent
data = Path(sys.argv[1])/'scene/square-board'
manifest = json.loads((pack/'hashes.json').read_text())
pending = []
for row, expected in manifest.items():
    path = data/row/'context.json'
    current = hashlib.sha256(path.read_bytes()).hexdigest()
    if current == expected['result']:
        continue
    if current != expected['input']:
        raise ValueError(f'{row}: unexpected context hash {current}')
    contents = gzip.decompress((pack/(row+'.json.gz')).read_bytes())
    if hashlib.sha256(contents).hexdigest() != expected['result']:
        raise ValueError(f'{row}: bad packaged context')
    pending.append((path, contents))
for path, contents in pending:
    temp = path.with_suffix('.canopy.tmp')
    temp.write_bytes(contents)
    temp.replace(path)
print('Verified private contexts:', ', '.join(manifest))
