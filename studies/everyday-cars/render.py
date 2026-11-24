"""Render the design plates from the same polygons used for the City study."""
import json
import subprocess
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parent
models = json.loads(subprocess.check_output(['node', 'sheet.mjs'], cwd=root))
paper = (246, 246, 240)
font_path = '/System/Library/Fonts/Helvetica.ttc'
def font(n):
    return ImageFont.truetype(font_path, n)

def mesh(faces, angle, tilt, width, height, scale):
    az, el = np.radians([angle, tilt])
    across = np.array([np.cos(az), 0, -np.sin(az)])
    toward = np.array([np.sin(az)*np.cos(el), np.sin(el), np.cos(az)*np.cos(el)])
    up = np.cross(toward, across)
    image = np.full((height,width,3), paper, dtype=np.uint8)
    depth = np.full((height,width), -np.inf)
    for face in faces:
        p = np.asarray(face['points'], dtype=float)
        v = np.column_stack([width/2 + scale*(p@across), height*.76-scale*(p@up), p@toward])
        n = np.cross(p[1]-p[0],p[2]-p[0])
        n /= max(np.linalg.norm(n),.000001)
        if n@toward < 0: n = -n
        shade = .76+.24*max(0,n@np.array([.4,.85,.34]))
        rgb = np.array(list(bytes.fromhex(face['color'][1:])))*shade
        for i in range(1,len(v)-1):
            a,b,c=v[[0,i,i+1]]
            x0,y0=np.maximum(np.floor(np.min([a[:2],b[:2],c[:2]],axis=0)).astype(int),[0,0])
            x1,y1=np.minimum(np.ceil(np.max([a[:2],b[:2],c[:2]],axis=0)).astype(int)+1,[width,height])
            if x1<=x0 or y1<=y0: continue
            yy,xx=np.mgrid[y0:y1,x0:x1]
            den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
            if abs(den)<1e-7: continue
            u=((b[1]-c[1])*(xx-c[0])+(c[0]-b[0])*(yy-c[1]))/den
            w=((c[1]-a[1])*(xx-c[0])+(a[0]-c[0])*(yy-c[1]))/den
            z=u*a[2]+w*b[2]+(1-u-w)*c[2]
            region=depth[y0:y1,x0:x1]
            use=(u>=0)&(w>=0)&(u+w<=1)&(z>=region)
            region[use]=z[use]
            image[y0:y1,x0:x1][use]=rgb
    return Image.fromarray(image)

for group,title,filename in [(models[:7],'Everyday cars','lineup'),(models[7:],'Existing traffic models','retained')]:
    utilities = filename=='retained'
    scale = 17 if utilities else 53
    canvas=Image.new('RGB',(1280,126+len(group)*160),paper)
    d=ImageDraw.Draw(canvas)
    d.text((26,14),title,font=font(31),fill='#192a30')
    d.text((26,55),f'Shape comparison  /  common body paint  /  {scale} pixels per metre',font=font(17),fill='#41575e')
    for j,text in enumerate(['Front three-quarter','Side','Rear three-quarter']):
        d.text((380+350*j,96),text,anchor='mt',font=font(16),fill='#34434b')
    for row,item in enumerate(group):
        y=126+160*row
        d.line((24,y,1256,y),fill='#ccd1cd')
        label=item['label'].replace(' · alternate','\nalternate').replace('Illustrative robotaxi concept','Robotaxi concept\nIllustrative').replace('Rounded electric crossover','Rounded electric\ncrossover')
        d.multiline_text((26,y+63),label,font=font(18),fill='#263638')
        for j,angle in enumerate([30,90,148]):
            frame=mesh(item['faces'],angle,[10,2,10][j],350,153,scale)
            canvas.paste(frame,(205+350*j,y+3))
    canvas.save(root/(filename+'.png'))

# Actual concept finish alongside two surrounding body types at the same scale.
examples = [('compact','#765452'),('taxi','#edece6'),('electric','#415467'),('compact','#aca99b')]
canvas=Image.new('RGB',(1120,252),paper)
d=ImageDraw.Draw(canvas)
d.text((24,18),'Street paint study',font=font(27),fill='#192a30')
d.text((24,55),'Illustrative robotaxi between compact crossovers · matched distance and lighting',font=font(15),fill='#41575e')
for j,(key,paint) in enumerate(examples):
    item=next(m for m in models if m['style']==key)
    faces=[dict(face,color=paint if face['color']=='#8099a6' else face['color']) for face in item['faces']]
    frame=mesh(faces,60,8,280,140,50)
    canvas.paste(frame,(280*j,78))
    d.text((140+280*j,220),item['label'],font=font(15),anchor='mt',fill='#263638')
canvas.save(root/'concept-paints.png')
