// Original procedural shaders. Bloom pipeline follows Three.js's UnrealBloom example.
export const stageFragment = `
precision highp float;
uniform float time, drive, variant, hue;
varying vec2 vUv;
vec3 pal(float x){return pow(.5+.5*cos(6.28318*(vec3(.05,.36,.68)+x+hue)),vec3(2.));}
void main(){
 vec2 p=(vUv-.5)*vec2(1.65,1.)*2.;
 float r=length(p),a=atan(p.y,p.x),t=time*.3;
 vec3 c=vec3(.008,.002,.04);
 if(variant<.5){
   for(int i=0;i<6;i++){
    float f=float(i); vec2 q=p;
    q*=mat2(cos(t*.08+f),-sin(t*.08+f),sin(t*.08+f),cos(t*.08+f));
    float spir=sin(a*(3.+mod(f,3.))+r*(7.+f)-t*(1.+f*.15)+sin(q.x*4.+t));
    float fire=.012/(abs(spir)*(.2+r)+.018);
    c+=pal(r*.25+f*.11-t*.08)*fire*(.7+drive);
   }
   c+=pal(r-t*.08)*.08/(r+.12);
 }else if(variant<1.5){
   float z=2./max(r,.06);
   float twist=a+sin(z*.3-t)*.25+t*.12;
   float grid=abs(sin(twist*8.+sin(z-t)*.6))*abs(sin(z*2.-t*5.));
   c+=pal(z*.065+sin(a)*.08-t*.1)*.06/(grid+.035);
   c*=smoothstep(.02,.15,r);
 }else{
   vec2 q=p;
   for(int i=0;i<5;i++){
    float f=float(i); float ang=abs(mod(atan(q.y,q.x)+t*.1,1.0472)-.5236);
    q=vec2(cos(ang),sin(ang))*length(q);
    q=abs(q)*1.35-vec2(.68,.3);
    float d=abs(length(q)-.5-.1*sin(t+f));
    c+=pal(f*.18+length(q)*.2+t*.05)*.014/(d+.025);
   }
 }
 c*=1.-smoothstep(.5,1.9,r)*.65;
 gl_FragColor=vec4(c*.34,1.);
}`;
export const surfaceVertex = `
uniform float time,drive; varying vec3 n,pos;
void main(){
 vec3 p=position;
 p+=normal*sin(p.y*4.+p.x*3.+time*1.8)*(.06+drive*.18);
 n=normalize(normalMatrix*normal);pos=p;
 gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
}`;
export const surfaceFragment = `
uniform float time,drive,hue;varying vec3 n,pos;
void main(){
 float rim=pow(1.-abs(n.z),2.2);
 float bands=pow(.5+.5*sin(pos.y*11.+pos.x*5.-time*2.),7.);
 vec3 color=.5+.5*cos(6.28318*(hue+pos.z*.1+vec3(.0,.33,.67)+time*.035));
 gl_FragColor=vec4(pow(color,vec3(1.8))*(.10+rim*2.5+bands*(.9+drive)),1.);
}`;
