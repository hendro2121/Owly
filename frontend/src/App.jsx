import { useState, useMemo } from "react";

const DEALS = [
  {id:1,transaction_date:"2026-02-28",company:"Naspers",ticker:"NPN",director:"Phuthi Mahanyele-Dabengwa",role:"CEO",transaction_type:"Buy",shares:12500,price:3842.50,value:48031250,sector:"Technology"},
  {id:2,transaction_date:"2026-02-28",company:"Naspers",ticker:"NPN",director:"Basil Sgourdos",role:"CFO",transaction_type:"Buy",shares:8000,price:3845.00,value:30760000,sector:"Technology"},
  {id:3,transaction_date:"2026-02-27",company:"Naspers",ticker:"NPN",director:"Ervin Tu",role:"Non-Exec",transaction_type:"Buy",shares:5000,price:3810.00,value:19050000,sector:"Technology"},
  {id:4,transaction_date:"2026-02-27",company:"Standard Bank",ticker:"SBK",director:"Sim Tshabalala",role:"CEO",transaction_type:"Sell",shares:45000,price:218.30,value:9823500,sector:"Financials"},
  {id:5,transaction_date:"2026-02-26",company:"Shoprite",ticker:"SHP",director:"Pieter Engelbrecht",role:"CEO",transaction_type:"Buy",shares:30000,price:268.45,value:8053500,sector:"Consumer Staples"},
  {id:6,transaction_date:"2026-02-26",company:"Shoprite",ticker:"SHP",director:"Anton de Bruyn",role:"CFO",transaction_type:"Buy",shares:20000,price:267.90,value:5358000,sector:"Consumer Staples"},
  {id:7,transaction_date:"2026-02-25",company:"FirstRand",ticker:"FSR",director:"Alan Gillespie",role:"Chairman",transaction_type:"Buy",shares:100000,price:72.15,value:7215000,sector:"Financials"},
  {id:8,transaction_date:"2026-02-25",company:"Anglo American",ticker:"AGL",director:"Duncan Wanblad",role:"CEO",transaction_type:"Sell",shares:15000,price:485.20,value:7278000,sector:"Resources"},
  {id:9,transaction_date:"2026-02-24",company:"MTN Group",ticker:"MTN",director:"Ralph Mupita",role:"CEO",transaction_type:"Buy",shares:55000,price:118.40,value:6512000,sector:"Telecoms"},
  {id:10,transaction_date:"2026-02-24",company:"Capitec",ticker:"CPI",director:"Gerrie Fourie",role:"CEO",transaction_type:"Buy",shares:3000,price:2540.00,value:7620000,sector:"Financials"},
  {id:11,transaction_date:"2026-02-23",company:"Capitec",ticker:"CPI",director:"Andre du Plessis",role:"CFO",transaction_type:"Buy",shares:2000,price:2535.00,value:5070000,sector:"Financials"},
  {id:12,transaction_date:"2026-02-21",company:"Sasol",ticker:"SOL",director:"Fleetwood Grobler",role:"CEO",transaction_type:"Sell",shares:25000,price:142.80,value:3570000,sector:"Resources"},
  {id:13,transaction_date:"2026-02-21",company:"Discovery",ticker:"DSY",director:"Adrian Gore",role:"CEO",transaction_type:"Buy",shares:40000,price:168.50,value:6740000,sector:"Financials"},
  {id:14,transaction_date:"2026-02-20",company:"Woolworths",ticker:"WHL",director:"Roy Bagattini",role:"CEO",transaction_type:"Buy",shares:50000,price:62.30,value:3115000,sector:"Consumer Discretionary"},
  {id:15,transaction_date:"2026-02-20",company:"Absa Group",ticker:"ABG",director:"Arrie Rautenbach",role:"CEO",transaction_type:"Sell",shares:35000,price:235.10,value:8228500,sector:"Financials"},
  {id:16,transaction_date:"2026-02-19",company:"BHP Group",ticker:"BHG",director:"Mike Henry",role:"CEO",transaction_type:"Sell",shares:10000,price:520.40,value:5204000,sector:"Resources"},
  {id:17,transaction_date:"2026-02-19",company:"Remgro",ticker:"REM",director:"Jannie Durand",role:"CEO",transaction_type:"Buy",shares:22000,price:155.20,value:3414400,sector:"Industrials"},
  {id:18,transaction_date:"2026-02-18",company:"Vodacom",ticker:"VOD",director:"Shameel Joosub",role:"CEO",transaction_type:"Buy",shares:18000,price:98.60,value:1774800,sector:"Telecoms"},
  {id:19,transaction_date:"2026-02-18",company:"Sibanye-Stillwater",ticker:"SSW",director:"Neal Froneman",role:"CEO",transaction_type:"Buy",shares:200000,price:22.45,value:4490000,sector:"Resources"},
  {id:20,transaction_date:"2026-02-17",company:"Clicks Group",ticker:"CLS",director:"Bertina Engelbrecht",role:"CEO",transaction_type:"Buy",shares:8000,price:312.70,value:2501600,sector:"Consumer Staples"},
  {id:21,transaction_date:"2026-02-14",company:"Nedbank",ticker:"NED",director:"Mike Brown",role:"CEO",transaction_type:"Buy",shares:15000,price:288.40,value:4326000,sector:"Financials"},
  {id:22,transaction_date:"2026-02-14",company:"Old Mutual",ticker:"OMU",director:"Iain Williamson",role:"CEO",transaction_type:"Buy",shares:60000,price:12.85,value:771000,sector:"Financials"},
  {id:23,transaction_date:"2026-02-13",company:"Exxaro",ticker:"EXX",director:"Nombasa Tsengwa",role:"CEO",transaction_type:"Buy",shares:10000,price:178.90,value:1789000,sector:"Resources"},
  {id:24,transaction_date:"2026-02-17",company:"Mr Price",ticker:"MRP",director:"Mark Blair",role:"CEO",transaction_type:"Sell",shares:12000,price:205.80,value:2469600,sector:"Consumer Discretionary"},
];

const fmt={zar:v=>!v?"R0":v>=1e9?"R"+(v/1e9).toFixed(1)+"bn":v>=1e6?"R"+(v/1e6).toFixed(1)+"m":v>=1e3?"R"+(v/1e3).toFixed(0)+"k":"R"+Math.round(v),num:n=>(n||0).toLocaleString("en-ZA"),d:d=>d?new Date(d).toLocaleDateString("en-ZA",{day:"numeric",month:"short"}):"",full:d=>d?new Date(d).toLocaleDateString("en-ZA",{day:"numeric",month:"long",year:"numeric"}):""};

function mkClusters(deals,days=30){const c=new Date("2026-02-28");c.setDate(c.getDate()-days);const b=deals.filter(d=>d.transaction_type==="Buy"&&new Date(d.transaction_date)>=c);const g={};b.forEach(d=>{if(!g[d.ticker])g[d.ticker]=[];g[d.ticker].push(d)});return Object.entries(g).filter(([,a])=>new Set(a.map(x=>x.director)).size>=2).map(([t,a])=>({ticker:t,company:a[0].company,sector:a[0].sector,count:new Set(a.map(x=>x.director)).size,value:a.reduce((s,x)=>s+x.value,0),dirs:a.map(x=>({name:x.director,role:x.role,value:x.value,date:x.transaction_date}))})).sort((a,b)=>b.value-a.value)}
function mkSectors(deals){const m={};deals.forEach(d=>{const s=d.sector||"Other";if(!m[s])m[s]={sector:s,buy:0,sell:0,n:0};m[s].n++;d.transaction_type==="Buy"?m[s].buy+=d.value:m[s].sell+=d.value});return Object.values(m).sort((a,b)=>(b.buy-b.sell)-(a.buy-a.sell))}

// Geometric Raven Logo SVG
const RavenLogo = ({size=32,color="#FF5C00"}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <polygon points="20,85 50,15 58,15 88,55 72,55 62,70 50,55 38,72 30,60" fill={color}/>
    <circle cx="54" cy="32" r="3.5" fill="#0A0A0A"/>
  </svg>
);

const css = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500;1,600;1,700;1,800&family=Azeret+Mono:wght@400;500;600&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
:root{
  --white:#FFFFFF;--g50:#FAFAFA;--g100:#F4F4F4;--g200:#E5E5E5;--g300:#D1D1D1;
  --g400:#A0A0A0;--g500:#6E6E6E;--g600:#4A4A4A;--g700:#333;--g800:#1E1E1E;--g900:#141414;--black:#0A0A0A;
  --or:#FF5C00;--or-light:#FFF2EB;--or-dark:#CC4A00;
  --gn:#10B981;--gn-bg:#ECFDF5;--gn-b:#6EE7B7;
  --rd:#EF4444;--rd-bg:#FEF2F2;--rd-b:#FCA5A5;
  --f:'DM Sans',system-ui,sans-serif;--mono:'Azeret Mono',monospace;
}
body{background:var(--white);font-family:var(--f);color:var(--g900);-webkit-font-smoothing:antialiased}
::selection{background:var(--or-light);color:var(--or-dark)}
@keyframes rise{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
.rise{animation:rise .7s cubic-bezier(.22,1,.36,1) both}
.em{font-style:italic;color:var(--or)}
`;

const Tag=({type})=>{const b=type==="Buy";return<span style={{display:"inline-flex",alignItems:"center",gap:3,padding:"3px 9px",borderRadius:6,fontSize:11,fontWeight:600,fontFamily:"var(--mono)",background:b?"var(--gn-bg)":"var(--rd-bg)",color:b?"var(--gn)":"var(--rd)"}}>
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d={b?"M12 19V5M5 12l7-7 7 7":"M12 5v14M5 12l7 7 7-7"}/></svg>
  {type}</span>};

// ─── Nav ────────────────────────────────────────────────────────────────────
function Nav({page,go}){
  return(
    <nav style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"18px 40px",maxWidth:1300,margin:"0 auto"}}>
      <button onClick={()=>go("landing")} style={{display:"flex",alignItems:"center",gap:8,background:"none",border:"none",cursor:"pointer"}}>
        <RavenLogo size={30}/>
        <span style={{fontWeight:800,fontSize:20,color:"var(--g900)",letterSpacing:".08em",textTransform:"uppercase"}}>RAVEN</span>
      </button>
      <div style={{display:"flex",gap:4,alignItems:"center"}}>
        {["dashboard","pricing"].map(p=>(
          <button key={p} onClick={()=>go(p)} style={{padding:"8px 18px",borderRadius:8,border:"none",background:page===p?"var(--g100)":"transparent",color:page===p?"var(--g900)":"var(--g500)",fontFamily:"var(--f)",fontSize:14,fontWeight:600,cursor:"pointer",textTransform:"capitalize"}}>{p}</button>
        ))}
        <button onClick={()=>go("dashboard")} style={{marginLeft:12,padding:"9px 22px",borderRadius:8,border:"none",background:"var(--or)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"var(--f)"}}>Get Started</button>
      </div>
    </nav>
  );
}

// ─── Landing (Antler-inspired) ──────────────────────────────────────────────
function Landing({go}){
  const cl=mkClusters(DEALS);const buys=DEALS.filter(d=>d.transaction_type==="Buy");
  return(
    <div>
      {/* Hero — massive type, Antler style */}
      <div style={{padding:"100px 40px 80px",maxWidth:1300,margin:"0 auto"}}>
        <h1 className="rise" style={{fontSize:72,fontWeight:800,letterSpacing:"-.05em",lineHeight:.95,textTransform:"uppercase",maxWidth:900}}>
          WHERE INSIDERS PUT<br/>THEIR MONEY <span className="em">{"—"}FIRST</span>
        </h1>
        <p className="rise" style={{fontSize:20,color:"var(--g500)",lineHeight:1.65,maxWidth:520,marginTop:28,animationDelay:".08s"}}>
          Raven tracks every director trade on the Johannesburg Stock Exchange and turns it into structured, searchable intelligence.
        </p>
        <div className="rise" style={{display:"flex",gap:12,marginTop:32,animationDelay:".14s"}}>
          <button onClick={()=>go("dashboard")} style={{padding:"14px 32px",borderRadius:10,background:"var(--or)",color:"#fff",fontSize:16,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"var(--f)"}}>View Live Deals</button>
          <button onClick={()=>go("pricing")} style={{padding:"14px 32px",borderRadius:10,background:"transparent",color:"var(--g900)",fontSize:16,fontWeight:600,border:"1.5px solid var(--g200)",cursor:"pointer",fontFamily:"var(--f)"}}>See Pricing</button>
        </div>
      </div>

      {/* Divider line */}
      <div style={{borderTop:"1px solid var(--g200)",maxWidth:1220,margin:"0 auto"}}/>

      {/* Stats row — big numbers, Antler style */}
      <div className="rise" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",maxWidth:1220,margin:"0 auto",padding:"48px 40px",animationDelay:".18s"}}>
        {[
          {v:buys.length,l:"INSIDER BUYS",s:"this month"},
          {v:fmt.zar(buys.reduce((s,d)=>s+d.value,0)),l:"BUY VOLUME",s:"30 days"},
          {v:cl.length,l:"CLUSTER SIGNALS",s:"2+ insiders"},
          {v:"400+",l:"COMPANIES",s:"JSE listed"},
        ].map((s,i)=>(
          <div key={i} style={{paddingRight:40}}>
            <div style={{fontSize:48,fontWeight:800,letterSpacing:"-.04em",lineHeight:1}}>{s.v}</div>
            <div style={{fontSize:11,fontFamily:"var(--mono)",color:"var(--g400)",textTransform:"uppercase",letterSpacing:".1em",marginTop:8}}>{s.l}</div>
            <div style={{fontSize:13,color:"var(--g400)",marginTop:2}}>{s.s}</div>
          </div>
        ))}
      </div>

      <div style={{borderTop:"1px solid var(--g200)",maxWidth:1220,margin:"0 auto"}}/>

      {/* Live preview */}
      <div style={{maxWidth:1220,margin:"0 auto",padding:"56px 40px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:24}}>
          <h2 style={{fontSize:14,fontFamily:"var(--mono)",textTransform:"uppercase",letterSpacing:".1em",color:"var(--g400)"}}>Latest Director Deals</h2>
          <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:6,height:6,borderRadius:"50%",background:"var(--or)",animation:"pulse 2s infinite"}}/><span style={{fontSize:11,fontFamily:"var(--mono)",fontWeight:600,color:"var(--or)"}}>LIVE</span></div>
        </div>
        <div style={{borderTop:"2px solid var(--g900)"}}>
          {DEALS.slice(0,6).map((d,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 0",borderBottom:"1px solid var(--g100)"}}>
              <div style={{display:"flex",alignItems:"center",gap:16}}>
                <Tag type={d.transaction_type}/>
                <span style={{fontWeight:700,fontFamily:"var(--mono)",fontSize:14}}>{d.ticker}</span>
                <span style={{color:"var(--g500)",fontSize:14}}>{d.director}</span>
                <span style={{color:"var(--g300)",fontSize:11,fontFamily:"var(--mono)"}}>{d.role}</span>
              </div>
              <span style={{fontFamily:"var(--mono)",fontSize:14,fontWeight:700,color:d.transaction_type==="Buy"?"var(--gn)":"var(--rd)"}}>{fmt.zar(d.value)}</span>
            </div>
          ))}
        </div>
        <button onClick={()=>go("dashboard")} style={{marginTop:20,fontSize:14,fontWeight:600,color:"var(--or)",background:"none",border:"none",cursor:"pointer",fontFamily:"var(--f)",display:"flex",alignItems:"center",gap:6}}>
          View all deals <span style={{fontSize:18}}>{"→"}</span>
        </button>
      </div>

      <div style={{borderTop:"1px solid var(--g200)",maxWidth:1220,margin:"0 auto"}}/>

      {/* How it works — Antler editorial grid */}
      <div style={{maxWidth:1220,margin:"0 auto",padding:"64px 40px"}}>
        <h2 style={{fontSize:48,fontWeight:800,letterSpacing:"-.04em",textTransform:"uppercase",marginBottom:48}}>HOW <span className="em">RAVEN</span> WORKS</h2>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:0,borderTop:"2px solid var(--g900)"}}>
          {[
            {n:"01",t:"WE SCRAPE",d:"Every day at market close, Raven scans JSE company investor relations websites for new director dealing announcements."},
            {n:"02",t:"WE PARSE",d:"Our system reads each announcement and extracts who traded, what they bought or sold, how many shares, and at what price."},
            {n:"03",t:"YOU SEE IT",d:"The data appears on your dashboard within minutes. Filter, search, spot patterns — all in plain English."},
          ].map((s,i)=>(
            <div key={i} style={{padding:"32px 32px 32px 0",borderRight:i<2?"1px solid var(--g200)":"none",paddingLeft:i>0?32:0}}>
              <div style={{fontFamily:"var(--mono)",fontSize:13,fontWeight:600,color:"var(--or)",marginBottom:16}}>{s.n}</div>
              <div style={{fontWeight:800,fontSize:20,textTransform:"uppercase",letterSpacing:"-.02em",marginBottom:10}}>{s.t}</div>
              <div style={{fontSize:15,color:"var(--g500)",lineHeight:1.7}}>{s.d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA — dark */}
      <div style={{background:"var(--black)",padding:"80px 40px",textAlign:"center"}}>
        <h2 style={{fontSize:48,fontWeight:800,letterSpacing:"-.04em",color:"var(--white)",textTransform:"uppercase"}}>FOLLOW THE <span className="em">SMART MONEY</span></h2>
        <p style={{color:"var(--g500)",fontSize:16,marginTop:16,marginBottom:32}}>Join South African investors using Raven to spot insider conviction.</p>
        <button onClick={()=>go("dashboard")} style={{padding:"14px 36px",borderRadius:10,background:"var(--or)",color:"#fff",fontSize:16,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"var(--f)"}}>Open Dashboard</button>
      </div>

      <div style={{padding:"20px 40px",display:"flex",justifyContent:"space-between",maxWidth:1220,margin:"0 auto"}}>
        <span style={{fontSize:12,color:"var(--g400)",fontFamily:"var(--mono)"}}>Data scraped from company IR pages. Not financial advice.</span>
        <span style={{fontSize:12,color:"var(--g300)",fontFamily:"var(--mono)"}}>v0.3</span>
      </div>
    </div>
  );
}

// ─── Dashboard ──────────────────────────────────────────────────────────────
function Dash({go,setTicker}){
  const [tab,setTab]=useState("feed");const [tf,setTf]=useState("All");const [q,setQ]=useState("");const [mv,setMv]=useState(0);const [period,setPeriod]=useState("All");
  const cutoff=useMemo(()=>{if(period==="All")return null;const n=new Date("2026-02-28"),c=new Date(n);if(period==="1W")c.setDate(n.getDate()-7);else if(period==="1M")c.setMonth(n.getMonth()-1);else if(period==="3M")c.setMonth(n.getMonth()-3);else if(period==="6M")c.setMonth(n.getMonth()-6);else if(period==="YTD"){c.setMonth(0);c.setDate(1)}else if(period==="1Y")c.setFullYear(n.getFullYear()-1);return c},[period]);
  const fd=useMemo(()=>DEALS.filter(t=>{if(tf!=="All"&&t.transaction_type!==tf)return false;if(q){const s=q.toLowerCase();if(![t.company,t.ticker,t.director].some(x=>x.toLowerCase().includes(s)))return false}if(t.value<mv)return false;if(cutoff&&new Date(t.transaction_date)<cutoff)return false;return true}),[tf,q,mv,cutoff]);
  const buys=DEALS.filter(d=>d.transaction_type==="Buy"),sells=DEALS.filter(d=>d.transaction_type==="Sell");
  const bv=buys.reduce((s,d)=>s+d.value,0),sv=sells.reduce((s,d)=>s+d.value,0);
  const cl=mkClusters(DEALS);const secs=mkSectors(DEALS);const maxS=Math.max(...secs.map(s=>Math.max(s.buy,s.sell)),1);
  const pill=(l,a,fn,ac)=><button onClick={fn} style={{padding:"6px 14px",borderRadius:8,border:"1.5px solid "+(a?(ac||"var(--g900)"):"var(--g200)"),background:a?(ac||"var(--g900)"):"var(--white)",color:a?"#fff":"var(--g500)",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:ac?"var(--mono)":"var(--f)"}}>{l}</button>;

  return(
    <div style={{maxWidth:1220,margin:"0 auto",padding:"0 40px 64px"}}>
      <div className="rise" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,margin:"28px 0"}}>
        {[{l:"NET INSIDER FLOW",v:fmt.zar(bv-sv),c:"var(--gn)"},{l:"BUY VOLUME",v:fmt.zar(bv),c:"var(--gn)"},{l:"SELL VOLUME",v:fmt.zar(sv),c:"var(--rd)"},{l:"CLUSTER SIGNALS",v:String(cl.length),c:"var(--or)"}].map((s,i)=>(
          <div key={i} style={{padding:"20px",border:"1px solid var(--g200)",borderRadius:12}}>
            <div style={{fontSize:10,fontFamily:"var(--mono)",color:"var(--g400)",textTransform:"uppercase",letterSpacing:".1em",marginBottom:8}}>{s.l}</div>
            <div style={{fontSize:28,fontWeight:800,color:s.c,fontFamily:"var(--mono)",letterSpacing:"-.03em"}}>{s.v}</div>
          </div>
        ))}
      </div>

      <div style={{display:"flex",gap:0,marginBottom:20,borderBottom:"2px solid var(--g900)"}}>
        {["feed","clusters","sectors"].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{padding:"10px 22px",border:"none",background:"transparent",color:tab===t?"var(--g900)":"var(--g400)",fontFamily:"var(--f)",fontSize:14,fontWeight:700,cursor:"pointer",textTransform:"uppercase",letterSpacing:".04em",borderBottom:tab===t?"3px solid var(--or)":"3px solid transparent",marginBottom:-2}}>{t}</button>
        ))}
      </div>

      {tab==="feed"&&(
        <div className="rise">
          <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
            <div style={{position:"relative"}}>
              <svg style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)"}} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--g400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search..." style={{background:"var(--white)",border:"1.5px solid var(--g200)",borderRadius:8,padding:"8px 12px 8px 34px",fontSize:13,fontFamily:"var(--f)",color:"var(--g900)",outline:"none",width:200}}/>
            </div>
            {pill("All",tf==="All",()=>setTf("All"))}{pill("Buy",tf==="Buy",()=>setTf("Buy"),"var(--gn)")}{pill("Sell",tf==="Sell",()=>setTf("Sell"),"var(--rd)")}
            <div style={{width:1,height:20,background:"var(--g200)"}}/>
            {[{l:"All",v:0},{l:"R1m+",v:1e6},{l:"R5m+",v:5e6}].map(m=>pill(m.l,mv===m.v,()=>setMv(m.v)))}
            <div style={{width:1,height:20,background:"var(--g200)"}}/>
            {["1W","1M","3M","6M","YTD","1Y","All"].map(p=><button key={p} onClick={()=>setPeriod(p)} style={{padding:"5px 10px",borderRadius:7,border:"none",background:period===p?"var(--g900)":"transparent",color:period===p?"#fff":"var(--g400)",fontSize:11,fontFamily:"var(--mono)",fontWeight:600,cursor:"pointer"}}>{p}</button>)}
            <span style={{marginLeft:"auto",fontSize:12,fontFamily:"var(--mono)",color:"var(--g400)"}}>{fd.length}</span>
          </div>

          <div style={{borderTop:"2px solid var(--g900)"}}>
            <div style={{display:"grid",gridTemplateColumns:"72px 1.4fr 1.2fr 68px 90px 90px 90px",padding:"10px 0",fontSize:10,fontFamily:"var(--mono)",fontWeight:500,color:"var(--g400)",textTransform:"uppercase",letterSpacing:".1em",borderBottom:"1px solid var(--g200)"}}>
              <div>Date</div><div>Company</div><div>Director</div><div>Type</div><div style={{textAlign:"right"}}>Shares</div><div style={{textAlign:"right"}}>Price</div><div style={{textAlign:"right"}}>Value</div>
            </div>
            <div style={{maxHeight:520,overflowY:"auto"}}>
              {fd.map(d=>(
                <div key={d.id} onClick={()=>{setTicker(d.ticker);go("company")}} style={{display:"grid",gridTemplateColumns:"72px 1.4fr 1.2fr 68px 90px 90px 90px",padding:"13px 0",borderBottom:"1px solid var(--g100)",fontSize:13.5,cursor:"pointer",transition:"background .1s"}} onMouseEnter={e=>e.currentTarget.style.background="var(--g50)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div style={{fontFamily:"var(--mono)",fontSize:12,color:"var(--g400)"}}>{fmt.d(d.transaction_date)}</div>
                  <div><span style={{fontWeight:700,fontFamily:"var(--mono)",fontSize:13}}>{d.ticker}</span><span style={{color:"var(--g400)",marginLeft:8}}>{d.company}</span></div>
                  <div><span style={{color:"var(--g600)"}}>{d.director}</span><span style={{color:"var(--g300)",marginLeft:6,fontSize:10.5,fontFamily:"var(--mono)"}}>{d.role}</span></div>
                  <div><Tag type={d.transaction_type}/></div>
                  <div style={{textAlign:"right",fontFamily:"var(--mono)",fontSize:12,color:"var(--g500)"}}>{fmt.num(d.shares)}</div>
                  <div style={{textAlign:"right",fontFamily:"var(--mono)",fontSize:12,color:"var(--g500)"}}>R{d.price.toFixed(2)}</div>
                  <div style={{textAlign:"right",fontFamily:"var(--mono)",fontSize:12,fontWeight:700,color:d.transaction_type==="Buy"?"var(--gn)":"var(--rd)"}}>{fmt.zar(d.value)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab==="clusters"&&(
        <div className="rise">
          <p style={{fontSize:15,color:"var(--g500)",marginBottom:20,lineHeight:1.7,maxWidth:600}}>When multiple directors buy their own company's stock around the same time, it often signals they believe the price will rise. These are <strong style={{color:"var(--g900)"}}>cluster buys</strong>.</p>
          {cl.map((c,i)=>(
            <div key={i} onClick={()=>{setTicker(c.ticker);go("company")}} style={{borderTop:i===0?"2px solid var(--g900)":"none",borderBottom:"1px solid var(--g200)",padding:"24px 0",cursor:"pointer",transition:"all .2s"}} onMouseEnter={e=>e.currentTarget.style.paddingLeft="8px"} onMouseLeave={e=>e.currentTarget.style.paddingLeft="0"}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                <div><span style={{fontFamily:"var(--mono)",fontWeight:800,fontSize:22}}>{c.ticker}</span><span style={{color:"var(--g400)",marginLeft:12,fontSize:16}}>{c.company}</span></div>
                <div style={{padding:"4px 14px",borderRadius:8,background:"var(--or-light)",fontFamily:"var(--mono)",fontSize:12,fontWeight:700,color:"var(--or)"}}>{c.count} insiders buying</div>
              </div>
              {c.dirs.map((d,j)=>(
                <div key={j} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderTop:j>0?"1px solid var(--g100)":"none"}}>
                  <div><span style={{fontWeight:500,fontSize:14}}>{d.name}</span><span style={{color:"var(--g400)",fontSize:11,fontFamily:"var(--mono)",marginLeft:10}}>{d.role}</span></div>
                  <div style={{display:"flex",gap:20,alignItems:"center"}}><span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--g400)"}}>{fmt.d(d.date)}</span><span style={{fontFamily:"var(--mono)",fontSize:13,fontWeight:700,color:"var(--gn)"}}>{fmt.zar(d.value)}</span></div>
                </div>
              ))}
              <div style={{marginTop:14,fontSize:10,fontFamily:"var(--mono)",color:"var(--g400)",textTransform:"uppercase",letterSpacing:".08em"}}>Combined <span style={{fontWeight:800,color:"var(--g900)",fontSize:18,marginLeft:8}}>{fmt.zar(c.value)}</span></div>
            </div>
          ))}
        </div>
      )}

      {tab==="sectors"&&(
        <div className="rise">
          <p style={{fontSize:15,color:"var(--g500)",marginBottom:20,lineHeight:1.7,maxWidth:600}}>Which JSE sectors are directors putting their own money into? Green shows buying, red shows selling.</p>
          <div style={{borderTop:"2px solid var(--g900)"}}>
            {secs.map((s,i)=>(
              <div key={s.sector} style={{display:"flex",alignItems:"center",gap:20,padding:"18px 0",borderBottom:"1px solid var(--g100)"}}>
                <div style={{width:160,flexShrink:0}}><div style={{fontWeight:700,fontSize:15}}>{s.sector}</div><div style={{fontSize:11,fontFamily:"var(--mono)",color:"var(--g400)"}}>{s.n} trades</div></div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:2,height:8,borderRadius:4,overflow:"hidden",background:"var(--g100)"}}>
                    <div style={{width:(s.buy/maxS*100)+"%",background:"var(--gn)",borderRadius:4,transition:"width .5s"}}/>
                    <div style={{width:(s.sell/maxS*100)+"%",background:"var(--rd)",borderRadius:4,transition:"width .5s"}}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:5}}><span style={{fontSize:11,fontFamily:"var(--mono)",color:"var(--gn)"}}>{fmt.zar(s.buy)}</span><span style={{fontSize:11,fontFamily:"var(--mono)",color:"var(--rd)"}}>{fmt.zar(s.sell)}</span></div>
                </div>
                <div style={{width:100,textAlign:"right"}}><div style={{fontFamily:"var(--mono)",fontSize:14,fontWeight:800,color:s.buy-s.sell>=0?"var(--gn)":"var(--rd)"}}>{(s.buy-s.sell>=0?"+":"")+fmt.zar(Math.abs(s.buy-s.sell))}</div><div style={{fontSize:10,fontFamily:"var(--mono)",color:"var(--g400)"}}>net flow</div></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Company ────────────────────────────────────────────────────────────────
function Company({ticker,go}){
  const ds=DEALS.filter(d=>d.ticker===ticker);if(!ds.length)return null;
  const co=ds[0].company,sec=ds[0].sector;
  const buys=ds.filter(d=>d.transaction_type==="Buy"),sells=ds.filter(d=>d.transaction_type==="Sell");
  const bv=buys.reduce((s,d)=>s+d.value,0),sv=sells.reduce((s,d)=>s+d.value,0);
  return(
    <div style={{maxWidth:960,margin:"0 auto",padding:"0 40px 64px"}}>
      <button onClick={()=>go("dashboard")} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",color:"var(--or)",fontSize:14,fontWeight:600,fontFamily:"var(--f)",padding:"20px 0"}}>{"←"} Back</button>
      <div className="rise">
        <h1 style={{fontSize:52,fontWeight:800,letterSpacing:"-.05em",textTransform:"uppercase"}}>{ticker}</h1>
        <div style={{display:"flex",alignItems:"center",gap:12,marginTop:6}}><span style={{fontSize:20,color:"var(--g500)"}}>{co}</span><span style={{fontSize:12,fontFamily:"var(--mono)",color:"var(--g500)",background:"var(--g100)",padding:"4px 12px",borderRadius:6}}>{sec}</span></div>
      </div>
      <div className="rise" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,margin:"28px 0",animationDelay:".06s"}}>
        {[{l:"BUYS",v:fmt.zar(bv),c:"var(--gn)"},{l:"SELLS",v:fmt.zar(sv),c:"var(--rd)"},{l:"NET FLOW",v:fmt.zar(bv-sv),c:bv>=sv?"var(--gn)":"var(--rd)"},{l:"DIRECTORS",v:[...new Set(ds.map(d=>d.director))].length,c:"var(--g900)"}].map((s,i)=>(
          <div key={i} style={{padding:"18px 20px",border:"1px solid var(--g200)",borderRadius:12}}>
            <div style={{fontSize:10,fontFamily:"var(--mono)",color:"var(--g400)",textTransform:"uppercase",letterSpacing:".1em",marginBottom:6}}>{s.l}</div>
            <div style={{fontSize:26,fontWeight:800,color:s.c,fontFamily:"var(--mono)",letterSpacing:"-.03em"}}>{s.v}</div>
          </div>
        ))}
      </div>
      <h3 style={{fontSize:12,fontFamily:"var(--mono)",textTransform:"uppercase",letterSpacing:".1em",color:"var(--g400)",marginBottom:12}}>All Director Deals</h3>
      <div style={{borderTop:"2px solid var(--g900)"}}>
        {ds.map((d,i)=>(
          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 0",borderBottom:"1px solid var(--g100)"}}>
            <div style={{display:"flex",alignItems:"center",gap:14}}><Tag type={d.transaction_type}/><span style={{fontWeight:600}}>{d.director}</span><span style={{color:"var(--g400)",fontSize:11,fontFamily:"var(--mono)"}}>{d.role}</span></div>
            <div style={{display:"flex",alignItems:"center",gap:20}}><span style={{fontFamily:"var(--mono)",fontSize:12,color:"var(--g400)"}}>{fmt.full(d.transaction_date)}</span><span style={{fontFamily:"var(--mono)",fontSize:12,color:"var(--g500)"}}>{fmt.num(d.shares)} @ R{d.price.toFixed(2)}</span><span style={{fontFamily:"var(--mono)",fontSize:14,fontWeight:700,color:d.transaction_type==="Buy"?"var(--gn)":"var(--rd)",minWidth:80,textAlign:"right"}}>{fmt.zar(d.value)}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Pricing ────────────────────────────────────────────────────────────────
function Pricing({go}){
  const chk=()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--or)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
  const plans=[
    {name:"FREE",price:"R0",per:"forever",desc:"See what's happening on the JSE.",feats:["Latest 10 director deals","Basic search","24-hour delay"],dark:false},
    {name:"PRO",price:"R99",per:"/month",desc:"Full access for serious investors.",feats:["All deals in real-time","Cluster buy alerts","Sector flow analysis","Company profiles","Email watchlist alerts","CSV export"],dark:true,pop:true},
    {name:"API",price:"R499",per:"/month",desc:"For fintechs and developers.",feats:["Everything in Pro","REST API access","10,000 requests/month","Webhook notifications","Bulk data export","Priority support"],dark:false},
  ];
  return(
    <div style={{maxWidth:1060,margin:"0 auto",padding:"56px 40px 72px"}}>
      <h1 className="rise" style={{fontSize:52,fontWeight:800,letterSpacing:"-.05em",textTransform:"uppercase",textAlign:"center"}}>SIMPLE <span className="em">PRICING</span></h1>
      <p className="rise" style={{textAlign:"center",color:"var(--g500)",fontSize:16,marginTop:12,marginBottom:48,animationDelay:".05s"}}>Start free. Upgrade when Raven proves its value.</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
        {plans.map((p,i)=>(
          <div key={i} className="rise" style={{padding:32,background:p.dark?"var(--black)":"var(--white)",border:p.dark?"none":"1.5px solid var(--g200)",borderRadius:16,color:p.dark?"#fff":"var(--g900)",display:"flex",flexDirection:"column",animationDelay:(.1+i*.06)+"s",position:"relative"}}>
            {p.pop&&<div style={{position:"absolute",top:16,right:16,padding:"4px 12px",borderRadius:6,background:"var(--or)",fontSize:11,fontWeight:700,color:"#fff",textTransform:"uppercase",letterSpacing:".04em"}}>Popular</div>}
            <div style={{fontSize:13,fontWeight:700,letterSpacing:".06em",marginBottom:8}}>{p.name}</div>
            <div style={{marginBottom:12}}><span style={{fontSize:44,fontWeight:800,letterSpacing:"-.04em"}}>{p.price}</span><span style={{fontSize:14,color:p.dark?"var(--g500)":"var(--g400)",marginLeft:4}}>{p.per}</span></div>
            <div style={{fontSize:14,color:p.dark?"var(--g500)":"var(--g500)",marginBottom:28,lineHeight:1.5}}>{p.desc}</div>
            <div style={{flex:1}}>{p.feats.map((ft,j)=>(<div key={j} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,fontSize:14,color:p.dark?"var(--g300)":"var(--g600)"}}>{chk()}{ft}</div>))}</div>
            <button onClick={()=>go("dashboard")} style={{marginTop:28,padding:"13px 0",borderRadius:10,border:p.dark?"none":"1.5px solid var(--g200)",background:p.dark?"var(--or)":"var(--white)",color:p.dark?"#fff":"var(--g900)",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"var(--f)",width:"100%"}}>{p.dark?"Start Free Trial":"Get Started"}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── App ────────────────────────────────────────────────────────────────────
export default function App(){
  const [page,setPage]=useState("landing");const [ticker,setTicker]=useState(null);
  return(
    <div style={{minHeight:"100vh",background:"var(--white)"}}>
      <style>{css}</style>
      <Nav page={page} go={setPage}/>
      {page==="landing"&&<Landing go={setPage}/>}
      {page==="dashboard"&&<Dash go={setPage} setTicker={setTicker}/>}
      {page==="company"&&ticker&&<Company ticker={ticker} go={setPage}/>}
      {page==="pricing"&&<Pricing go={setPage}/>}
    </div>
  );
}
