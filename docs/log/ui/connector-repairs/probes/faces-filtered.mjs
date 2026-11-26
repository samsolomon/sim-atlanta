// World-space XYZ in metres. Faces carry original triangle index and vertex colour.
function crossingFaces(root,boards,THREE,bounds) {
  const [xmin,xmax,zmin,zmax] = bounds;
  const output = {bounds, meshes:[]};
  const point = new THREE.Vector3(), matrix = new THREE.Matrix4(), instance = new THREE.Matrix4();
  const box = new THREE.Box3();
  root.updateWorldMatrix(true,true);
  root.traverseVisible(mesh => {
    if (!mesh.isMesh || mesh.isSkinnedMesh) return;
    const path = [];
    for (let obj=mesh; obj && obj!==root.parent; obj=obj.parent)
      path.unshift(obj.name || obj.type+'['+(obj.parent?.children.indexOf(obj)??0)+']');
    const label = path.join('/');
    if (/landmark|houses|yards|tree|traffic|buses|freight|prewarm|Streetcar cars|osm:|curated|lamp|Signal|Studio table|leaf|limbs|Tower|Building|Center|Hall|Library|Museum/i.test(label)) return;
    const geometry=mesh.geometry, pos=geometry.getAttribute('position');
    if (!pos) return;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    const idx=geometry.index, color=geometry.getAttribute('color'), count=idx?.count??pos.count;
    const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
    const groups=Array.isArray(mesh.material)?geometry.groups:[{start:0,count,materialIndex:0}];
    for(let k=0;k<(mesh.isInstancedMesh?mesh.count:1);k++) {
      matrix.copy(mesh.matrixWorld);
      if(mesh.isInstancedMesh){mesh.getMatrixAt(k,instance);matrix.multiply(instance);}
      box.copy(geometry.boundingBox).applyMatrix4(matrix);
      if(box.max.x<xmin||box.min.x>xmax||box.max.z<zmin||box.min.z>zmax)continue;
      const vertices=[], faces=[], remap=new Map();
      const xyz=i=>point.fromBufferAttribute(pos,i).applyMatrix4(matrix).toArray();
      for(const group of groups) {
        if(!materials[group.materialIndex??0]?.visible)continue;
        const start=Math.max(group.start,geometry.drawRange.start);
        const end=Math.min(group.start+group.count,geometry.drawRange.start+geometry.drawRange.count,count);
        for(let i=start;i+2<end;i+=3) {
          const ids=[0,1,2].map(d=>idx?idx.getX(i+d):i+d);
          const pts=ids.map(xyz);
          if(pts.every(v=>v[0]<xmin)||pts.every(v=>v[0]>xmax)||pts.every(v=>v[2]<zmin)||pts.every(v=>v[2]>zmax))continue;
          const face=ids.map((id,j)=>{
            if(!remap.has(id)){remap.set(id,vertices.length);vertices.push(pts[j]);}
            return remap.get(id);
          });
          let rgb=null;
          if(color) {
            const id=ids[0];
            const bytes=[color.getX(id),color.getY(id),color.getZ(id)].map(c=>Math.round(255*(c<=.0031308?12.92*c:1.055*c**(1/2.4)-.055)));
            rgb=bytes[0]*65536+bytes[1]*256+bytes[2];
          }
          faces.push([...face,i/3,rgb]);
        }
      }
      if(faces.length)output.meshes.push({label,board:boards.get(mesh)||null,materials:materials.map(m=>({name:m.name,color:m.color?.getHexString(),texture:m.map?.name})),instance:mesh.isInstancedMesh?k:null,vertices,faces});
    }
  });
  if(!output.meshes.some(m=>m.board))throw Error('Missing drawn board in crossing bounds');
  return output;
}