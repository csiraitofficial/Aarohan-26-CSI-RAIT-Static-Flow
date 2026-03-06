import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PanicButton from './PanicButton';
import { OfflineBanner } from '../utils/offline';

// ─── BEAMS BACKGROUND ─────────────────────────────────────────────────────────
const BeamsBackground = () => {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { antialias: true, alpha: false });
    if (!gl) return;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; gl.viewport(0,0,canvas.width,canvas.height); };
    resize(); window.addEventListener('resize', resize);
    const vs = `attribute vec2 a_pos; void main(){gl_Position=vec4(a_pos,0.0,1.0);}`;
    const fs = `
      precision highp float;
      uniform float u_time; uniform vec2 u_res;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);float a=hash(i),b=hash(i+vec2(1,0)),c=hash(i+vec2(0,1)),d=hash(i+vec2(1,1));return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
      float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.0+vec2(0.3,0.7);a*=0.5;}return v;}
      float beam(vec2 uv,float angle,float offset,float width,float t){
        float c=cos(angle),s=sin(angle);vec2 rot=vec2(c*uv.x-s*uv.y,s*uv.x+c*uv.y);
        float d=abs(rot.x-offset+fbm(vec2(rot.y*0.4,t*0.3))*0.18);float hw=width*0.5;
        return smoothstep(hw*0.8,0.0,d)+smoothstep(hw*3.5,0.0,d)*0.35;}
      void main(){
        vec2 uv=(gl_FragCoord.xy-0.5*u_res)/min(u_res.x,u_res.y);
        float t=u_time*0.46;
        vec3 lc=vec3(0.306,0.682,0.776),lc2=vec3(0.18,0.52,0.72);
        float bw=0.027*2.7;
        vec3 col=vec3(0.020,0.027,0.065);
        col+=lc*beam(uv,0.38,sin(t*0.31)*0.6,bw,t)*0.85;
        col+=lc*beam(uv,-0.25,cos(t*0.27+1.2)*0.55,bw*0.9,t+1.0)*0.7;
        col+=lc2*beam(uv,1.05,sin(t*0.19+2.4)*0.7,bw*1.1,t+2.0)*0.65;
        col+=lc*beam(uv,-0.72,cos(t*0.23+0.8)*0.45,bw*0.85,t+3.5)*0.6;
        col+=lc*beam(uv,0.15,sin(t*0.35+3.1)*0.65,bw*1.2,t+4.0)*0.75;
        col+=lc*beam(uv,-0.55,cos(t*0.17+1.7)*0.8,bw*2.2,t+5.0)*0.22;
        col+=lc2*beam(uv,0.82,sin(t*0.29+0.5)*0.5,bw*0.95,t+6.5)*0.5;
        col+=lc*beam(uv,-1.2,cos(t*0.41+2.9)*0.6,bw*0.8,t+7.2)*0.55;
        float vign=1.0-smoothstep(0.5,1.4,length(uv)); col*=vign;
        vec2 src=vec2(0.0,0.55); col+=lc*exp(-length(uv-src)*3.8)*0.5;
        col=col/(col+0.7); col=pow(col,vec3(0.45));
        gl_FragColor=vec4(col,1.0);}`;
    const compile=(src,type)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);return s;};
    const prog=gl.createProgram();gl.attachShader(prog,compile(vs,gl.VERTEX_SHADER));gl.attachShader(prog,compile(fs,gl.FRAGMENT_SHADER));gl.linkProgram(prog);gl.useProgram(prog);
    const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    const aPos=gl.getAttribLocation(prog,'a_pos');gl.enableVertexAttribArray(aPos);gl.vertexAttribPointer(aPos,2,gl.FLOAT,false,0,0);
    const uTime=gl.getUniformLocation(prog,'u_time'),uRes=gl.getUniformLocation(prog,'u_res');
    const start=performance.now();
    const loop=(now)=>{const t=(now-start)*0.001;gl.uniform1f(uTime,t);gl.uniform2f(uRes,canvas.width,canvas.height);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);animRef.current=requestAnimationFrame(loop);};
    animRef.current=requestAnimationFrame(loop);
    return ()=>{cancelAnimationFrame(animRef.current);window.removeEventListener('resize',resize);gl.deleteProgram(prog);};
  },[]);
  return <canvas ref={canvasRef} style={{position:'fixed',inset:0,width:'100%',height:'100%',zIndex:0,pointerEvents:'none'}}/>;
};

// ─── CLICK SPARK ──────────────────────────────────────────────────────────────
const ClickSpark = ({ children }) => {
  const [sparks, setSparks] = useState([]);
  const idRef = useRef(0);
  const fire = useCallback((e) => {
    const x=e.clientX,y=e.clientY,id=++idRef.current,count=18;
    const ns=Array.from({length:count},(_,i)=>({
      id:`${id}-${i}`,x,y,
      angle:(i/count)*360,
      dist:(40+Math.random()*30)*1.2,
      size:2.5+Math.random()*3,
      color:['#4eaec6','#93d8e8','#ffffff','#2a8fa8','#60d8f0'][Math.floor(Math.random()*5)],
    }));
    setSparks(s=>[...s,...ns]);
    setTimeout(()=>setSparks(s=>s.filter(sp=>!ns.find(n=>n.id===sp.id))),700);
  },[]);
  return (
    <div style={{position:'relative',width:'100%',minHeight:'100vh'}} onClick={fire}>
      {sparks.map(sp=>(
        <span key={sp.id} style={{
          position:'fixed',left:sp.x,top:sp.y,
          width:sp.size,height:sp.size,borderRadius:'50%',
          background:sp.color,pointerEvents:'none',zIndex:9999,
          transform:'translate(-50%,-50%)',
          boxShadow:`0 0 ${sp.size*2}px ${sp.color}`,
          animation:`spk${Math.round(sp.angle)} 0.65s ease-out forwards`,
        }}/>
      ))}
      <style>{`
        ${Array.from({length:360},(_,i)=>`@keyframes spk${i}{0%{opacity:1;transform:translate(-50%,-50%) scale(1);}100%{opacity:0;transform:translate(-50%,-50%) translate(${Math.cos(i*Math.PI/180)*72}px,${Math.sin(i*Math.PI/180)*72}px) scale(0);}}`).join('')}
      `}</style>
      {children}
    </div>
  );
};

// roles: undefined = everyone, ['committee','admin'] = staff only
const NAV_ITEMS = [
  { path:'/dashboard',     icon:null, label:'Dashboard' },
  { path:'/events',        icon:null, label:'Events' },
  { path:'/registrations', icon:null, label:'Registrations' },
  { path:'/polls',         icon:'💬', label:'Polls' },
  { path:'/crowd',         icon:null, label:'Crowd Monitor',  staffOnly:true },
  { path:'/admin',         icon:null, label:'Admin Demo',     adminOnly:true },
  { path:'/control',       icon:null, label:'Control Panel',  staffOnly:true },
];

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const getRoleColor=(r)=>r==='admin'?'#f59e0b':r==='committee'?'#4eaec6':'#93d8e8';
  const getRoleBg=(r)=>r==='admin'?'rgba(245,158,11,0.12)':r==='committee'?'rgba(78,174,198,0.12)':'rgba(78,174,198,0.08)';
  const isStaff = user?.role === 'admin' || user?.role === 'committee';
  const isAdmin = user?.role === 'admin';
  const studentItems = NAV_ITEMS.filter(i => !i.staffOnly && !i.adminOnly);
  const staffItems   = NAV_ITEMS.filter(i => i.staffOnly);
  const adminItems   = NAV_ITEMS.filter(i => i.adminOnly);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        *,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
        body{background:#05071a;}

        .ly-root{min-height:100vh;display:flex;font-family:'Space Grotesk', sans-serif;color:white;position:relative;}

        /* ── GLASS SIDEBAR ── */
        .ly-sidebar {
          width:260px; min-height:100vh;
          background:rgba(2,5,18,0.75);
          border-right:1px solid rgba(78,174,198,0.22);
          display:flex; flex-direction:column;
          position:fixed; top:0; left:0; z-index:100;
          transition:transform 0.3s cubic-bezier(.16,1,.3,1);
          backdrop-filter:blur(28px); -webkit-backdrop-filter:blur(28px);
          box-shadow:4px 0 32px rgba(0,0,0,0.5), inset -1px 0 0 rgba(78,174,198,0.08);
        }

        /* subtle teal shimmer line at top */
        .ly-sidebar::before {
          content:'';position:absolute;top:0;left:0;right:0;height:1px;
          background:linear-gradient(90deg,transparent,rgba(78,174,198,0.5),transparent);
        }

        .ly-sidebar-brand{
          padding:26px 22px 22px;
          border-bottom:1px solid rgba(255,255,255,0.05);
          display:flex;align-items:center;gap:12px;
        }
        .ly-brand-icon{
          width:40px;height:40px;
          background:linear-gradient(135deg,#1d7a96,#1560a0);
          border-radius:11px;display:flex;align-items:center;justify-content:center;
          font-size:18px;box-shadow:0 0 20px rgba(78,174,198,0.5);flex-shrink:0;
        }
        .ly-brand-name{font-family:'Space Grotesk', sans-serif;font-size:16px;font-weight:800;color:white;letter-spacing:-0.5px;display:block;}
        .ly-brand-sub{font-size:10px;color:rgba(255,255,255,0.28);text-transform:uppercase;letter-spacing:0.9px;font-weight:500;}

        .ly-nav{flex:1;padding:14px 10px;overflow-y:auto;}
        .ly-nav-section{
          font-size:10.5px;font-weight:700;color:rgba(78,174,198,0.7);
          text-transform:uppercase;letter-spacing:1.2px;
          padding:0 12px;margin-bottom:7px;margin-top:14px;
        }

        .ly-nav-item{
          display:flex;align-items:center;gap:11px;padding:10px 13px;
          border-radius:11px;text-decoration:none;color:rgba(255,255,255,0.72);
          font-size:15px;font-weight:600;transition:all 0.2s ease;
          margin-bottom:2px;cursor:pointer;border:1px solid transparent;position:relative;
        }
        .ly-nav-item:hover{background:rgba(78,174,198,0.09);color:rgba(255,255,255,0.95);border-color:rgba(78,174,198,0.14);}
        .ly-nav-item.active{
          background:rgba(78,174,198,0.14);color:#ffffff;
          border-color:rgba(78,174,198,0.28);font-weight:700;
          box-shadow:inset 0 1px 0 rgba(78,174,198,0.1);
        }
        .ly-nav-item.active::before{
          content:'';position:absolute;left:0;top:25%;bottom:25%;width:3px;
          background:linear-gradient(to bottom,#4eaec6,#1d7a96);border-radius:0 4px 4px 0;
        }
        .ly-nav-icon{
          width:30px;height:30px;border-radius:8px;display:flex;align-items:center;
          justify-content:center;font-size:14px;background:rgba(255,255,255,0.04);flex-shrink:0;
          transition:all 0.2s ease;
        }
        .ly-nav-item.active .ly-nav-icon{background:rgba(78,174,198,0.18);}

        .ly-nav-emergency{
          display:flex;align-items:center;gap:11px;padding:10px 13px;border-radius:11px;
          text-decoration:none;color:rgba(239,68,68,0.85);font-size:15px;font-weight:600;
          transition:all 0.2s ease;margin-bottom:2px;cursor:pointer;border:1px solid transparent;
        }
        .ly-nav-emergency:hover{background:rgba(239,68,68,0.07);color:#f87171;border-color:rgba(239,68,68,0.14);}
        .ly-nav-emergency.active{background:rgba(239,68,68,0.1);color:#f87171;border-color:rgba(239,68,68,0.2);}
        .ly-nav-emergency .ly-nav-icon{background:rgba(239,68,68,0.1);}

        .ly-user{padding:14px 10px;border-top:1px solid rgba(255,255,255,0.05);}
        .ly-user-card{
          display:flex;align-items:center;gap:11px;padding:11px;border-radius:11px;
          background:rgba(78,174,198,0.06);border:1px solid rgba(78,174,198,0.12);margin-bottom:8px;
        }
        .ly-avatar{
          width:34px;height:34px;border-radius:9px;display:flex;align-items:center;
          justify-content:center;font-size:15px;font-weight:700;color:white;flex-shrink:0;
        }
        .ly-user-name{font-family:'Space Grotesk', sans-serif;font-size:12.5px;font-weight:700;color:white;display:block;letter-spacing:-0.2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .ly-user-role{font-size:9.5px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;display:inline-block;padding:2px 8px;border-radius:100px;margin-top:2px;}
        .ly-logout-btn{
          width:100%;display:flex;align-items:center;gap:8px;padding:9px 13px;border-radius:10px;
          background:transparent;border:1px solid rgba(255,255,255,0.06);color:rgba(255,255,255,0.32);
          font-size:12.5px;font-weight:500;cursor:pointer;font-family:'Space Grotesk', sans-serif;transition:all 0.2s ease;
        }
        .ly-logout-btn:hover{background:rgba(239,68,68,0.07);border-color:rgba(239,68,68,0.18);color:#f87171;}

        /* ── MAIN ── */
        .ly-main{flex:1;margin-left:260px;min-height:100vh;display:flex;flex-direction:column;position:relative;z-index:1;}

        /* glass top bar */
        .ly-header{
          height:66px;
          background:rgba(5,10,28,0.5);
          border-bottom:1px solid rgba(78,174,198,0.1);
          display:flex;align-items:center;justify-content:space-between;
          padding:0 32px;position:sticky;top:0;z-index:50;
          backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px);
          box-shadow:0 1px 0 rgba(78,174,198,0.06);
        }
        .ly-header-left{display:flex;align-items:center;gap:14px;}
        .ly-hamburger{
          display:none;width:34px;height:34px;border-radius:8px;
          background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);
          align-items:center;justify-content:center;cursor:pointer;font-size:15px;color:white;
        }
        .ly-page-title{font-family:'Space Grotesk', sans-serif;font-size:17px;font-weight:700;color:white;letter-spacing:-0.5px;}

        /* teal accent pill for page title */
        .ly-page-pill{
          font-size:10px;font-weight:600;color:#4eaec6;background:rgba(78,174,198,0.1);
          border:1px solid rgba(78,174,198,0.2);border-radius:100px;
          padding:3px 10px;letter-spacing:0.5px;text-transform:uppercase;
        }

        .ly-header-right{display:flex;align-items:center;gap:12px;}
        .ly-header-user{font-size:13px;color:rgba(255,255,255,0.32);font-weight:300;}

        .ly-content{flex:1;padding:30px 32px;overflow-y:auto;}

        .ly-overlay{
          display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);
          z-index:99;backdrop-filter:blur(6px);
        }

        @media(max-width:768px){
          .ly-sidebar{transform:translateX(-100%);}
          .ly-sidebar.open{transform:translateX(0);}
          .ly-main{margin-left:0;}
          .ly-hamburger{display:flex;}
          .ly-overlay.show{display:block;}
          .ly-content{padding:18px 16px;}
          .ly-header{padding:0 16px;}
        }
      `}</style>

      <div className="ly-root">
        <BeamsBackground />

        <div className={`ly-overlay ${sidebarOpen?'show':''}`} onClick={()=>setSidebarOpen(false)}/>

        {/* ── GLASS SIDEBAR ── */}
        <aside className={`ly-sidebar ${sidebarOpen?'open':''}`}>
          <div className="ly-sidebar-brand">
            <div>
              <span className="ly-brand-name">CampusFlow</span>
              <span className="ly-brand-sub">Event Platform</span>
            </div>
          </div>

          <nav className="ly-nav">
            <div className="ly-nav-section">Main Menu</div>
            {studentItems.map(item=>(
              <Link key={item.path} to={item.path}
                className={`ly-nav-item ${location.pathname===item.path?'active':''}`}
                onClick={()=>setSidebarOpen(false)}>
                {item.icon && <div className="ly-nav-icon">{item.icon}</div>}
                {item.label}
              </Link>
            ))}
            {isStaff && staffItems.length > 0 && (
              <>
                <div className="ly-nav-section">Management</div>
                {staffItems.map(item=>(
                  <Link key={item.path} to={item.path}
                    className={`ly-nav-item ${location.pathname===item.path?'active':''}`}
                    onClick={()=>setSidebarOpen(false)}>
                    {item.icon && <div className="ly-nav-icon">{item.icon}</div>}
                    {item.label}
                  </Link>
                ))}
              </>
            )}
            {isAdmin && adminItems.length > 0 && (
              <>
                <div className="ly-nav-section">Admin Only</div>
                {adminItems.map(item=>(
                  <Link key={item.path} to={item.path}
                    className={`ly-nav-item ${location.pathname===item.path?'active':''}`}
                    onClick={()=>setSidebarOpen(false)}>
                    {item.icon && <div className="ly-nav-icon">{item.icon}</div>}
                    {item.label}
                  </Link>
                ))}
              </>
            )}
            <div className="ly-nav-section">Safety</div>
            <Link to="/emergency"
              className={`ly-nav-emergency ${location.pathname==='/emergency'?'active':''}`}
              onClick={()=>setSidebarOpen(false)}>
              <div className="ly-nav-icon">🚨</div>
              Emergency
            </Link>
          </nav>

          <div className="ly-user">
            <div className="ly-user-card">
              <div className="ly-avatar" style={{background:`linear-gradient(135deg,${getRoleColor(user?.role)},${getRoleColor(user?.role)}88)`}}>
                {user?.name?.charAt(0)?.toUpperCase()||'?'}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <span className="ly-user-name">{user?.name||'User'}</span>
                <span className="ly-user-role" style={{color:getRoleColor(user?.role),background:getRoleBg(user?.role)}}>
                  {user?.role||'student'}
                </span>
              </div>
            </div>
            <button className="ly-logout-btn" onClick={handleLogout}>Sign Out</button>
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <div className="ly-main">
          <header className="ly-header">
            <div className="ly-header-left">
              <button className="ly-hamburger" onClick={()=>setSidebarOpen(!sidebarOpen)}>☰</button>
              <span className="ly-page-title">
                {[...NAV_ITEMS,{path:'/emergency',label:'Emergency'},{path:'/control',label:'Control Panel'}].find(i=>i.path===location.pathname)?.label||'CampusFlow'}
              </span>
              <span className="ly-page-pill">Live</span>
            </div>
            <div className="ly-header-right">
              <span className="ly-header-user">{user?.name?.split(' ')[0]}</span>
            </div>
          </header>

          <main className="ly-content">
            <ClickSpark>
              {children}
            </ClickSpark>
          </main>
        </div>
      </div>

      <OfflineBanner />
      <PanicButton />
    </>
  );
};

export default Layout;