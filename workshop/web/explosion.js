import * as THREE from 'three';

export function burstParticles(random = Math.random, count = 64) {
  return Array.from({length:count},()=>({
    offset:[(random()-.5)*.35,(random()-.5)*.2,(random()-.5)*.35],
    velocity:[(random()-.5)*6,2+random()*3,(random()-.5)*6],
    spin:[(random()-.5)*12,(random()-.5)*12,(random()-.5)*12],
    scale:[.5+random()*1.8,.4+random()*1.2,.5+random()*1.8],
    bounce:.15+random()*.3,color:Math.floor(random()*4),
  }));
}
export function createExplosion(scene, robot) {
  const debris=new THREE.InstancedMesh(new THREE.BoxGeometry(.1,.1,.1),new THREE.MeshStandardMaterial({roughness:.8}),64);
  const smoke=new THREE.InstancedMesh(new THREE.SphereGeometry(.22,8,6),new THREE.MeshBasicMaterial({color:0x68706a,transparent:true,opacity:.4,depthWrite:false}),12);
  const flash=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshBasicMaterial({color:0xffdda0,transparent:true,opacity:.8,depthWrite:false}));
  for(const mesh of [debris,smoke]){mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;mesh.visible=false;scene.add(mesh);}
  flash.visible=false;scene.add(flash);
  const object=new THREE.Object3D(),origin=new THREE.Vector3(),colors=[0xefb348,0xffd579,0x354640,0xff8545];
  let particles=[],puffs=[],started=null,previous=0;
  return {
    start(frame,time=performance.now()) {
      origin.set(frame.x/50,.5,-frame.y/50);started=previous=time;robot.visible=false;debris.visible=smoke.visible=flash.visible=true;
      particles=burstParticles().map((p,i)=>{debris.setColorAt(i,new THREE.Color(colors[p.color]));return {...p,position:new THREE.Vector3(...p.offset).add(origin),rotation:new THREE.Vector3()};});
      debris.instanceColor.needsUpdate=true;
      puffs=Array.from({length:12},()=>({x:(Math.random()-.5)*.9,z:(Math.random()-.5)*.9,rise:.4+Math.random()*.7,growth:.3+Math.random()*.7}));
      this.update(time);
    },
    clear(){started=null;debris.visible=smoke.visible=flash.visible=false;robot.visible=true;},
    update(time){
      if(started===null)return false;
      const age=Math.max(0,(time-started)/1000),dt=Math.max(0,Math.min((time-previous)/1000,.05));previous=time;
      particles.forEach((p,i)=>{
        p.velocity[1]-=8*dt;p.position.x+=p.velocity[0]*dt;p.position.y+=p.velocity[1]*dt;p.position.z+=p.velocity[2]*dt;
        if(p.position.y<.14){p.position.y=.14;p.velocity[1]=Math.abs(p.velocity[1])*p.bounce;p.velocity[0]*=.65;p.velocity[2]*=.65;p.spin=p.spin.map(v=>v*.7);}
        if(age>=2)p.position.y=.14;
        p.rotation.x+=p.spin[0]*dt;p.rotation.y+=p.spin[1]*dt;p.rotation.z+=p.spin[2]*dt;
        object.position.copy(p.position);object.rotation.set(p.rotation.x,p.rotation.y,p.rotation.z);object.scale.set(...p.scale);object.updateMatrix();debris.setMatrixAt(i,object.matrix);
      });
      puffs.forEach((p,i)=>{object.position.set(origin.x+p.x*age,origin.y+age*p.rise,origin.z+p.z*age);object.rotation.set(0,0,0);object.scale.setScalar(.3+age*p.growth);object.updateMatrix();smoke.setMatrixAt(i,object.matrix);});
      smoke.material.opacity=.4*Math.max(0,1-age/2);smoke.visible=age<2;
      flash.position.copy(origin);flash.scale.setScalar(.25+age*3);flash.material.opacity=.8*Math.max(0,1-age/.24);flash.visible=age<.24;
      debris.instanceMatrix.needsUpdate=smoke.instanceMatrix.needsUpdate=true;
      if(age>=2){started=null;smoke.visible=flash.visible=false;}
      return true;
    },
  };
}
