from render import Image,ImageDraw,font,paper,mesh,root
import subprocess,json

styles=['pixel','transit','box','classic','coronado']
script="""import {commercial} from './commercial.mjs';
console.log(JSON.stringify(process.argv.slice(1).map(s=>commercial(s))));"""
geometries=json.loads(subprocess.check_output(['node','--input-type=module','-e',script,*styles],cwd=root))
names=['Pixel-lamp EV hatch','High-roof cargo van','Chassis cab + 16 ft box','Modern classic tractor','Long-hood tractor']
hints=['3.00 m wheelbase','White panel body','Pickup-style nose','589-inspired option','Coronado-inspired option']
canvas=Image.new('RGB',(1360,1520),paper);d=ImageDraw.Draw(canvas)
d.text((24,18),'Hatchback and working vehicles',font=font(32),fill='#203138')
d.text((24,61),'Front, side and rear at 45 pixels per metre. Tractor options share the same trailer in the profiles below.',font=font(17),fill='#435257')
for i,g in enumerate(geometries):
    y=92+i*222
    d.line((24,y,1336,y),fill='#cbd1cd')
    d.text((24,y+47),names[i],font=font(18),fill='#203138')
    d.text((24,y+78),hints[i],font=font(15),fill='#435257')
    for j,a in enumerate([30,90,149]):
        canvas.paste(mesh(g,a,[10,2,10][j],378,218,45),(217+378*j,y+2))
d.line((24,1205,1336,1205),fill='#cbd1cd')
for i,s in enumerate(['classic','coronado']):
    full=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {commercial} from './commercial.mjs'; console.log(JSON.stringify(commercial(process.argv[1],{trailer:true})));",s],cwd=root))
    for f in full:
        f['points']=[[x,y,z+5.7] for x,y,z in f['points']]
    canvas.paste(mesh(full,90,4,644,208,31),(24+i*658,1220))
    d.text((34+i*658,1450),hints[3+i]+'  /  common 13.72 m trailer',font=font(17),fill='#203138')
canvas.save(root/'working-vehicles.png')
