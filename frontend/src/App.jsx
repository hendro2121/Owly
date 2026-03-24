import { useState, useMemo, useEffect } from "react";
import api from "./api";

const curSymbol=(c)=>({GBP:"£",USD:"$",EUR:"€",ZAR:"R"}[c]||"R");
const fmtCur=(v,market,currency)=>{const p=currency?curSymbol(currency):"R";if(!v)return p+"0";if(v>=1e9)return p+(v/1e9).toFixed(1)+"bn";if(v>=1e6)return p+(v/1e6).toFixed(1)+"m";if(v>=1e3)return p+(v/1e3).toFixed(0)+"k";return p+Math.round(v)};
const fmt={zar:v=>fmtCur(v,"JSE"),num:n=>(n||0).toLocaleString("en-ZA"),d:d=>d?new Date(d).toLocaleDateString("en-ZA",{day:"numeric",month:"short",year:"numeric"}):"",full:d=>d?new Date(d).toLocaleDateString("en-ZA",{day:"numeric",month:"long",year:"numeric"}):""};

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

const Loader = () => (
  <div style={{display:"flex",justifyContent:"center",alignItems:"center",padding:"80px 0"}}>
    <div style={{fontFamily:"var(--mono)",fontSize:13,color:"var(--g400)",display:"flex",alignItems:"center",gap:10}}>
      <div style={{width:8,height:8,borderRadius:"50%",background:"var(--or)",animation:"pulse 1.5s infinite"}}/>
      Loading data...
    </div>
  </div>
);

// ─── Nav ────────────────────────────────────────────────────────────────────
function Nav({page,go,user,onLogout}){
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
        {user ? (
          <div style={{display:"flex",alignItems:"center",gap:8,marginLeft:12}}>
            {user.subscription_status==="active"&&<span style={{padding:"3px 8px",borderRadius:5,background:"var(--or)",color:"#fff",fontSize:10,fontWeight:700,fontFamily:"var(--mono)",letterSpacing:".06em"}}>PRO</span>}
            <span style={{fontSize:13,color:"var(--g500)",fontFamily:"var(--mono)"}}>{user.email}</span>
            <button onClick={onLogout} style={{padding:"8px 16px",borderRadius:8,border:"1.5px solid var(--g200)",background:"transparent",color:"var(--g500)",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"var(--f)"}}>Log out</button>
          </div>
        ) : (
          <button onClick={()=>go("login")} style={{marginLeft:12,padding:"9px 22px",borderRadius:8,border:"none",background:"var(--or)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"var(--f)"}}>Log In</button>
        )}
      </div>
    </nav>
  );
}

// ─── Landing (Antler-inspired) ──────────────────────────────────────────────
function Landing({go}){
  const [deals,setDeals]=useState([]);
  const [stats,setStats]=useState(null);
  const [clusters,setClusters]=useState([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    Promise.all([
      api.latest(10).catch(()=>[]),
      api.stats(30).catch(()=>null),
      api.clusters(30,2).catch(()=>[]),
    ]).then(([d,s,c])=>{
      setDeals(d);
      setStats(s);
      setClusters(c);
      setLoading(false);
    });
  },[]);

  const buys=deals.filter(d=>d.transaction_type==="Buy");
  const buyVolume=stats?stats.buy_value:buys.reduce((s,d)=>s+(d.value||0),0);

  return(
    <div>
      {/* Hero — massive type, Antler style */}
      <div style={{padding:"100px 40px 80px",maxWidth:1300,margin:"0 auto"}}>
        <h1 className="rise" style={{fontSize:72,fontWeight:800,letterSpacing:"-.05em",lineHeight:.95,textTransform:"uppercase",maxWidth:900}}>
          WHERE INSIDERS PUT<br/>THEIR MONEY <span className="em">{"—"}FIRST</span>
        </h1>
        <p className="rise" style={{fontSize:20,color:"var(--g500)",lineHeight:1.65,maxWidth:520,marginTop:28,animationDelay:".08s"}}>
          Raven tracks every director trade on the JSE and turns it into structured, searchable intelligence.
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
          {v:stats?stats.buy_count:buys.length,l:"INSIDER BUYS",s:"last 30 days"},
          {v:fmt.zar(buyVolume),l:"BUY VOLUME",s:"30 days"},
          {v:clusters.length,l:"CLUSTER SIGNALS",s:"2+ insiders"},
          {v:stats?stats.active_companies:"—",l:"COMPANIES",s:"with deals"},
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
        {loading ? <Loader/> : deals.length===0 ? (
          <div style={{padding:"40px 0",textAlign:"center",color:"var(--g400)",fontFamily:"var(--mono)",fontSize:13}}>No deals found yet. Data will appear after the scraper runs.</div>
        ) : (
        <div style={{borderTop:"2px solid var(--g900)"}}>
          {deals.slice(0,6).map((d,i)=>(
            <div key={d.id||i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 0",borderBottom:"1px solid var(--g100)"}}>
              <div style={{display:"flex",alignItems:"center",gap:16}}>
                <Tag type={d.transaction_type}/>
                <span style={{fontWeight:700,fontFamily:"var(--mono)",fontSize:14}}>{d.ticker}</span>
                <span style={{color:"var(--g500)",fontSize:14}}>{d.director}</span>
                <span style={{color:"var(--g300)",fontSize:11,fontFamily:"var(--mono)"}}>{d.role}</span>
              </div>
              <span style={{fontFamily:"var(--mono)",fontSize:14,fontWeight:700,color:d.transaction_type==="Buy"?"var(--gn)":"var(--rd)"}}>{fmtCur(d.value,d.market||"JSE",d.currency)}</span>
            </div>
          ))}
        </div>
        )}
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
function Dash({go,setTicker,user,isPro}){
  const [tab,setTab]=useState("feed");
  const [tf,setTf]=useState("All");
  const [q,setQ]=useState("");
  const [mv,setMv]=useState(0);
  const [period,setPeriod]=useState("All");
  const [market,setMarket]=useState(null); // null=all, "JSE"

  const [allDeals,setAllDeals]=useState([]);
  const [clusters,setClusters]=useState([]);
  const [sectors,setSectors]=useState([]);
  const [companies,setCompanies]=useState([]);
  const [stats,setStats]=useState(null);
  const [loading,setLoading]=useState(true);
  const [companySearch,setCompanySearch]=useState("");
  const [sectorPeriod,setSectorPeriod]=useState("1Y");
  const [companyPeriod,setCompanyPeriod]=useState("1Y");
  const [sectorsLoading,setSectorsLoading]=useState(false);
  const [companiesLoading,setCompaniesLoading]=useState(false);

  const periodToDays=(p)=>{
    if(p==="1W")return 7;if(p==="1M")return 30;if(p==="3M")return 90;
    if(p==="6M")return 180;if(p==="1Y")return 365;
    if(p==="YTD"){const n=new Date();return Math.ceil((n-new Date(n.getFullYear(),0,1))/(1000*60*60*24))||1}
    return 365;
  };

  const loadAll=()=>{
    setLoading(true);
    Promise.all([
      api.deals({perPage:200,market:market||undefined}).catch(()=>({deals:[]})),
      api.clusters(365,2,market||undefined).catch(()=>[]),
      api.sectors(periodToDays(sectorPeriod),market||undefined).catch(()=>[]),
      api.stats(365,market||undefined).catch(()=>null),
      api.companies(undefined,periodToDays(companyPeriod),market||undefined).catch(()=>[]),
    ]).then(([d,c,s,st,co])=>{
      setAllDeals(d.deals||[]);
      setClusters(c);
      setSectors(s);
      setStats(st);
      setCompanies(co);
      setLoading(false);
    });
  };

  useEffect(()=>{loadAll()},[market]);

  useEffect(()=>{
    if(loading)return;
    setSectorsLoading(true);
    api.sectors(periodToDays(sectorPeriod),market||undefined).then(s=>{setSectors(s);setSectorsLoading(false)}).catch(()=>setSectorsLoading(false));
  },[sectorPeriod]);

  useEffect(()=>{
    if(loading)return;
    setCompaniesLoading(true);
    api.companies(undefined,periodToDays(companyPeriod),market||undefined).then(co=>{setCompanies(co);setCompaniesLoading(false)}).catch(()=>setCompaniesLoading(false));
  },[companyPeriod]);

  const cutoff=useMemo(()=>{
    if(period==="All")return null;
    const n=new Date(),c=new Date(n);
    if(period==="1W")c.setDate(n.getDate()-7);
    else if(period==="1M")c.setMonth(n.getMonth()-1);
    else if(period==="3M")c.setMonth(n.getMonth()-3);
    else if(period==="6M")c.setMonth(n.getMonth()-6);
    else if(period==="YTD"){c.setMonth(0);c.setDate(1)}
    else if(period==="1Y")c.setFullYear(n.getFullYear()-1);
    return c;
  },[period]);

  const fd=useMemo(()=>allDeals.filter(t=>{
    // Filter out non-SA tickers (safety net)
    if(t.ticker&&(/^\d/.test(t.ticker)||(/\d$/.test(t.ticker)&&t.ticker.length>=4)))return false;
    if(tf!=="All"&&t.transaction_type!==tf)return false;
    if(q){const s=q.toLowerCase();if(![t.company,t.ticker,t.director].some(x=>(x||"").toLowerCase().includes(s)))return false}
    if(t.value<mv)return false;
    if(cutoff&&new Date(t.transaction_date)<cutoff)return false;
    return true;
  }),[allDeals,tf,q,mv,cutoff]);

  const bv=stats?stats.buy_value:allDeals.filter(d=>d.transaction_type==="Buy").reduce((s,d)=>s+(d.value||0),0);
  const sv=stats?stats.sell_value:allDeals.filter(d=>d.transaction_type==="Sell").reduce((s,d)=>s+(d.value||0),0);
  const clusterCount=stats?stats.cluster_count:clusters.length;
  const cur=v=>fmtCur(v,market||"JSE");
  const dealCur=(v,d)=>fmtCur(v,d&&d.market||market||"JSE",d&&d.currency);

  const maxS=Math.max(...sectors.map(s=>Math.max(s.buy_value||0,s.sell_value||0)),1);
  const pill=(l,a,fn,ac)=><button onClick={fn} style={{padding:"6px 14px",borderRadius:8,border:"1.5px solid "+(a?(ac||"var(--g900)"):"var(--g200)"),background:a?(ac||"var(--g900)"):"var(--white)",color:a?"#fff":"var(--g500)",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:ac?"var(--mono)":"var(--f)"}}>{l}</button>;

  if(loading)return <div style={{maxWidth:1220,margin:"0 auto",padding:"0 40px 64px"}}><Loader/></div>;

  return(
    <div style={{maxWidth:1220,margin:"0 auto",padding:"0 40px 64px"}}>
      <div className="rise" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,margin:"28px 0"}}>
        {[{l:"NET INSIDER FLOW",v:cur(bv-sv),c:"var(--gn)"},{l:"BUY VOLUME",v:cur(bv),c:"var(--gn)"},{l:"SELL VOLUME",v:cur(sv),c:"var(--rd)"},{l:"CLUSTER SIGNALS",v:String(clusterCount),c:"var(--or)"}].map((s,i)=>(
          <div key={i} style={{padding:"20px",border:"1px solid var(--g200)",borderRadius:12}}>
            <div style={{fontSize:10,fontFamily:"var(--mono)",color:"var(--g400)",textTransform:"uppercase",letterSpacing:".1em",marginBottom:8}}>{s.l}</div>
            <div style={{fontSize:28,fontWeight:800,color:s.c,fontFamily:"var(--mono)",letterSpacing:"-.03em"}}>{s.v}</div>
          </div>
        ))}
      </div>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,borderBottom:"2px solid var(--g900)"}}>
        <div style={{display:"flex",gap:0}}>
          {["feed","clusters","sectors","companies"].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{padding:"10px 22px",border:"none",background:"transparent",color:tab===t?"var(--g900)":"var(--g400)",fontFamily:"var(--f)",fontSize:14,fontWeight:700,cursor:"pointer",textTransform:"uppercase",letterSpacing:".04em",borderBottom:tab===t?"3px solid var(--or)":"3px solid transparent",marginBottom:-2}}>{t}</button>
          ))}
        </div>
        <div style={{display:"flex",gap:4,alignItems:"center",marginBottom:-2}}>
          {/* Exchange filter removed — JSE only for now */}
        </div>
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

          {fd.length===0 ? (
            <div style={{padding:"40px 0",textAlign:"center",color:"var(--g400)",fontFamily:"var(--mono)",fontSize:13}}>No deals match your filters.</div>
          ) : (
          <div style={{borderTop:"2px solid var(--g900)"}}>
            <div style={{display:"grid",gridTemplateColumns:"72px 1.4fr 1.2fr 68px 90px 90px 90px",padding:"10px 0",fontSize:10,fontFamily:"var(--mono)",fontWeight:500,color:"var(--g400)",textTransform:"uppercase",letterSpacing:".1em",borderBottom:"1px solid var(--g200)"}}>
              <div>Date</div><div>Company</div><div>Director</div><div>Type</div><div style={{textAlign:"right"}}>Shares</div><div style={{textAlign:"right"}}>Price</div><div style={{textAlign:"right"}}>Value</div>
            </div>
            <div style={{maxHeight:520,overflowY:"auto"}}>
              {(isPro?fd:fd.slice(0,10)).map((d,i)=>(
                <div key={d.id||i} onClick={()=>{setTicker(d.ticker);go("company")}} style={{display:"grid",gridTemplateColumns:"72px 1.4fr 1.2fr 68px 90px 90px 90px",padding:"13px 0",borderBottom:"1px solid var(--g100)",fontSize:13.5,cursor:"pointer",transition:"background .1s"}} onMouseEnter={e=>e.currentTarget.style.background="var(--g50)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div style={{fontFamily:"var(--mono)",fontSize:12,color:"var(--g400)"}}>{fmt.d(d.transaction_date)}</div>
                  <div><span style={{fontWeight:700,fontFamily:"var(--mono)",fontSize:13}}>{d.ticker}</span>{d.exchange&&d.exchange!=="JSE"&&<span style={{marginLeft:4,fontSize:9,fontFamily:"var(--mono)",padding:"2px 6px",borderRadius:4,background:d.exchange==="LSE"?"#EFF6FF":d.exchange==="AMS"?"#FDF4FF":"var(--g100)",color:d.exchange==="LSE"?"#3B82F6":d.exchange==="AMS"?"#A855F7":"var(--g500)",fontWeight:600}}>{d.exchange}</span>}<span style={{color:"var(--g400)",marginLeft:8}}>{d.company}</span></div>
                  <div><span style={{color:"var(--g600)"}}>{d.director}</span><span style={{color:"var(--g300)",marginLeft:6,fontSize:10.5,fontFamily:"var(--mono)"}}>{d.role}</span></div>
                  <div><Tag type={d.transaction_type}/></div>
                  <div style={{textAlign:"right",fontFamily:"var(--mono)",fontSize:12,color:"var(--g500)"}}>{fmt.num(d.shares)}</div>
                  <div style={{textAlign:"right",fontFamily:"var(--mono)",fontSize:12,color:"var(--g500)"}}>{d.price!=null?curSymbol(d.currency||"ZAR")+Number(d.price).toFixed(2):"—"}</div>
                  <div style={{textAlign:"right",fontFamily:"var(--mono)",fontSize:12,fontWeight:700,color:d.transaction_type==="Buy"?"var(--gn)":"var(--rd)"}}>{dealCur(d.value,d)}</div>
                </div>
              ))}
              {!isPro&&fd.length>10&&<div style={{padding:"16px 0",textAlign:"center"}}><button onClick={()=>go("pricing")} style={{background:"none",border:"none",color:"var(--or)",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"var(--f)"}}>Upgrade to see all {fd.length} deals →</button></div>}
            </div>
          </div>
          )}
        </div>
      )}

      {tab==="clusters"&&(
        isPro ? (
        <div className="rise">
          <p style={{fontSize:15,color:"var(--g500)",marginBottom:20,lineHeight:1.7,maxWidth:600}}>When multiple directors buy their own company's stock around the same time, it often signals they believe the price will rise. These are <strong style={{color:"var(--g900)"}}>cluster buys</strong>.</p>
          {clusters.length===0 ? (
            <div style={{padding:"40px 0",textAlign:"center",color:"var(--g400)",fontFamily:"var(--mono)",fontSize:13}}>No cluster signals detected yet.</div>
          ) : clusters.map((c,i)=>(
            <div key={i} onClick={()=>{setTicker(c.ticker);go("company")}} style={{borderTop:i===0?"2px solid var(--g900)":"none",borderBottom:"1px solid var(--g200)",padding:"24px 0",cursor:"pointer",transition:"all .2s"}} onMouseEnter={e=>e.currentTarget.style.paddingLeft="8px"} onMouseLeave={e=>e.currentTarget.style.paddingLeft="0"}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                <div><span style={{fontFamily:"var(--mono)",fontWeight:800,fontSize:22}}>{c.ticker}</span><span style={{color:"var(--g400)",marginLeft:12,fontSize:16}}>{c.company}</span></div>
                <div style={{padding:"4px 14px",borderRadius:8,background:"var(--or-light)",fontFamily:"var(--mono)",fontSize:12,fontWeight:700,color:"var(--or)"}}>{c.insider_count} insiders buying</div>
              </div>
              {(c.directors||[]).map((d,j)=>(
                <div key={j} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderTop:j>0?"1px solid var(--g100)":"none"}}>
                  <div><span style={{fontWeight:500,fontSize:14}}>{d.name}</span><span style={{color:"var(--g400)",fontSize:11,fontFamily:"var(--mono)",marginLeft:10}}>{d.role}</span></div>
                  <div style={{display:"flex",gap:20,alignItems:"center"}}><span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--g400)"}}>{fmt.d(d.date)}</span><span style={{fontFamily:"var(--mono)",fontSize:13,fontWeight:700,color:"var(--gn)"}}>{cur(d.value)}</span></div>
                </div>
              ))}
              <div style={{marginTop:14,fontSize:10,fontFamily:"var(--mono)",color:"var(--g400)",textTransform:"uppercase",letterSpacing:".08em"}}>Combined <span style={{fontWeight:800,color:"var(--g900)",fontSize:18,marginLeft:8}}>{cur(c.total_value)}</span></div>
            </div>
          ))}
        </div>
        ) : (
        <ProGate go={go} label="Cluster signals require Pro">
          <div style={{padding:"60px 0",textAlign:"center"}}>
            <div style={{fontSize:48,fontWeight:800,color:"var(--or)",fontFamily:"var(--mono)"}}>{clusters.length}</div>
            <div style={{fontSize:13,color:"var(--g400)",fontFamily:"var(--mono)",marginTop:8}}>cluster signals detected</div>
          </div>
        </ProGate>
        )
      )}

      {tab==="sectors"&&(
        isPro ? (
        <div className="rise">
          <p style={{fontSize:15,color:"var(--g500)",marginBottom:16,lineHeight:1.7,maxWidth:600}}>Which JSE sectors are directors putting their own money into? Green shows buying, red shows selling.</p>
          <div style={{display:"flex",gap:4,marginBottom:20,alignItems:"center"}}>
            {["1W","1M","3M","YTD","6M","1Y"].map(p=><button key={p} onClick={()=>setSectorPeriod(p)} style={{padding:"5px 12px",borderRadius:7,border:"none",background:sectorPeriod===p?"var(--g900)":"transparent",color:sectorPeriod===p?"#fff":"var(--g400)",fontSize:11,fontFamily:"var(--mono)",fontWeight:600,cursor:"pointer"}}>{p}</button>)}
            {sectorsLoading&&<div style={{width:6,height:6,borderRadius:"50%",background:"var(--or)",animation:"pulse 1s infinite",marginLeft:8}}/>}
          </div>
          {sectors.length===0&&!sectorsLoading ? (
            <div style={{padding:"40px 0",textAlign:"center",color:"var(--g400)",fontFamily:"var(--mono)",fontSize:13}}>No sector data available yet.</div>
          ) : (
          <div style={{borderTop:"2px solid var(--g900)"}}>
            {sectors.map((s,i)=>(
              <div key={s.sector} style={{display:"flex",alignItems:"center",gap:20,padding:"18px 0",borderBottom:"1px solid var(--g100)"}}>
                <div style={{width:160,flexShrink:0}}><div style={{fontWeight:700,fontSize:15}}>{s.sector}</div><div style={{fontSize:11,fontFamily:"var(--mono)",color:"var(--g400)"}}>{s.trade_count} trades</div></div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:2,height:8,borderRadius:4,overflow:"hidden",background:"var(--g100)"}}>
                    <div style={{width:((s.buy_value||0)/maxS*100)+"%",background:"var(--gn)",borderRadius:4,transition:"width .5s"}}/>
                    <div style={{width:((s.sell_value||0)/maxS*100)+"%",background:"var(--rd)",borderRadius:4,transition:"width .5s"}}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:5}}><span style={{fontSize:11,fontFamily:"var(--mono)",color:"var(--gn)"}}>{cur(s.buy_value)}</span><span style={{fontSize:11,fontFamily:"var(--mono)",color:"var(--rd)"}}>{cur(s.sell_value)}</span></div>
                </div>
                <div style={{width:100,textAlign:"right"}}><div style={{fontFamily:"var(--mono)",fontSize:14,fontWeight:800,color:(s.net_flow||0)>=0?"var(--gn)":"var(--rd)"}}>{((s.net_flow||0)>=0?"+":"")+cur(Math.abs(s.net_flow||0))}</div><div style={{fontSize:10,fontFamily:"var(--mono)",color:"var(--g400)"}}>net flow</div></div>
              </div>
            ))}
          </div>
          )}
        </div>
        ) : (
        <ProGate go={go} label="Sector flow requires Pro">
          <div style={{padding:"60px 0",textAlign:"center"}}>
            <div style={{fontSize:48,fontWeight:800,color:"var(--or)",fontFamily:"var(--mono)"}}>{sectors.length}</div>
            <div style={{fontSize:13,color:"var(--g400)",fontFamily:"var(--mono)",marginTop:8}}>sectors tracked</div>
          </div>
        </ProGate>
        )
      )}

      {tab==="companies"&&(
        <div className="rise">
          <p style={{fontSize:15,color:"var(--g500)",marginBottom:16,lineHeight:1.7,maxWidth:600}}>Browse all JSE companies tracked by Raven. Click any company to see their full director dealing history.</p>
          <div style={{display:"flex",gap:4,marginBottom:16,alignItems:"center"}}>
            {["1M","3M","YTD","6M","1Y"].map(p=><button key={p} onClick={()=>setCompanyPeriod(p)} style={{padding:"5px 12px",borderRadius:7,border:"none",background:companyPeriod===p?"var(--g900)":"transparent",color:companyPeriod===p?"#fff":"var(--g400)",fontSize:11,fontFamily:"var(--mono)",fontWeight:600,cursor:"pointer"}}>{p}</button>)}
            {companiesLoading&&<div style={{width:6,height:6,borderRadius:"50%",background:"var(--or)",animation:"pulse 1s infinite",marginLeft:8}}/>}
          </div>
          <div style={{marginBottom:16}}>
            <div style={{position:"relative",display:"inline-block"}}>
              <svg style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)"}} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--g400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <input value={companySearch} onChange={e=>setCompanySearch(e.target.value)} placeholder="Search company or ticker..." style={{background:"var(--white)",border:"1.5px solid var(--g200)",borderRadius:8,padding:"8px 12px 8px 34px",fontSize:13,fontFamily:"var(--f)",color:"var(--g900)",outline:"none",width:300}}/>
            </div>
            <span style={{marginLeft:12,fontSize:12,fontFamily:"var(--mono)",color:"var(--g400)"}}>{companies.filter(c=>{if(!companySearch)return true;const s=companySearch.toLowerCase();return (c.name||"").toLowerCase().includes(s)||(c.ticker||"").toLowerCase().includes(s)||(c.sector||"").toLowerCase().includes(s)}).length} companies</span>
          </div>
          {companies.length===0 ? (
            <div style={{padding:"40px 0",textAlign:"center",color:"var(--g400)",fontFamily:"var(--mono)",fontSize:13}}>No companies loaded yet.</div>
          ) : (
          <div style={{borderTop:"2px solid var(--g900)"}}>
            <div style={{display:"grid",gridTemplateColumns:"80px 1.5fr 1fr 100px 100px",padding:"10px 0",fontSize:10,fontFamily:"var(--mono)",fontWeight:500,color:"var(--g400)",textTransform:"uppercase",letterSpacing:".1em",borderBottom:"1px solid var(--g200)"}}>
              <div>Ticker</div><div>Company</div><div>Sector</div><div style={{textAlign:"right"}}>Deals</div><div style={{textAlign:"right"}}>Status</div>
            </div>
            <div style={{maxHeight:520,overflowY:"auto"}}>
              {companies.filter(c=>{if(!companySearch)return true;const s=companySearch.toLowerCase();return (c.name||"").toLowerCase().includes(s)||(c.ticker||"").toLowerCase().includes(s)||(c.sector||"").toLowerCase().includes(s)}).map((c,i)=>(
                <div key={c.ticker} onClick={()=>{if(c.deal_count>0){setTicker(c.ticker);go("company")}}} style={{display:"grid",gridTemplateColumns:"80px 1.5fr 1fr 100px 100px",padding:"13px 0",borderBottom:"1px solid var(--g100)",fontSize:13.5,cursor:c.deal_count>0?"pointer":"default",transition:"background .1s",opacity:c.deal_count>0?1:0.5}} onMouseEnter={e=>{if(c.deal_count>0)e.currentTarget.style.background="var(--g50)"}} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div style={{fontWeight:700,fontFamily:"var(--mono)",fontSize:13,color:"var(--or)"}}>{c.ticker}</div>
                  <div style={{fontWeight:500}}>{c.name}</div>
                  <div style={{color:"var(--g500)",fontSize:12}}>{c.sector||"—"}</div>
                  <div style={{textAlign:"right",fontFamily:"var(--mono)",fontSize:12,fontWeight:c.deal_count>0?700:400,color:c.deal_count>0?"var(--g900)":"var(--g300)"}}>{c.deal_count||0}</div>
                  <div style={{textAlign:"right"}}><span style={{fontSize:10,fontFamily:"var(--mono)",padding:"2px 8px",borderRadius:4,background:c.status==="delisted"?"var(--rd-bg)":"var(--gn-bg)",color:c.status==="delisted"?"var(--rd)":"var(--gn)"}}>{c.status||"listed"}</span></div>
                </div>
              ))}
            </div>
          </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Company ────────────────────────────────────────────────────────────────
function Company({ticker,go,user,isPro}){
  const [deals,setDeals]=useState([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    api.companyDeals(ticker,100).then(d=>{setDeals(d);setLoading(false)}).catch(()=>setLoading(false));
  },[ticker]);

  if(loading)return <div style={{maxWidth:960,margin:"0 auto",padding:"0 40px 64px"}}><Loader/></div>;
  if(!deals.length)return(
    <div style={{maxWidth:960,margin:"0 auto",padding:"0 40px 64px"}}>
      <button onClick={()=>go("dashboard")} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",color:"var(--or)",fontSize:14,fontWeight:600,fontFamily:"var(--f)",padding:"20px 0"}}>{"←"} Back</button>
      <div style={{padding:"40px 0",textAlign:"center",color:"var(--g400)",fontFamily:"var(--mono)",fontSize:13}}>No deals found for {ticker}.</div>
    </div>
  );

  const co=deals[0].company;
  const mkt=deals[0].market||"JSE";
  const cc=v=>fmtCur(v,mkt);
  const buys=deals.filter(d=>d.transaction_type==="Buy"),sells=deals.filter(d=>d.transaction_type==="Sell");
  const bv=buys.reduce((s,d)=>s+(d.value||0),0),sv=sells.reduce((s,d)=>s+(d.value||0),0);
  const visibleDeals=isPro?deals:deals.slice(0,3);
  return(
    <div style={{maxWidth:960,margin:"0 auto",padding:"0 40px 64px"}}>
      <button onClick={()=>go("dashboard")} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",color:"var(--or)",fontSize:14,fontWeight:600,fontFamily:"var(--f)",padding:"20px 0"}}>{"←"} Back</button>
      <div className="rise">
        <h1 style={{fontSize:52,fontWeight:800,letterSpacing:"-.05em",textTransform:"uppercase"}}>{ticker}</h1>
        <div style={{display:"flex",alignItems:"center",gap:12,marginTop:6}}><span style={{fontSize:20,color:"var(--g500)"}}>{co}</span></div>
      </div>
      <div className="rise" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,margin:"28px 0",animationDelay:".06s"}}>
        {[{l:"BUYS",v:cc(bv),c:"var(--gn)"},{l:"SELLS",v:cc(sv),c:"var(--rd)"},{l:"NET FLOW",v:cc(bv-sv),c:bv>=sv?"var(--gn)":"var(--rd)"},{l:"DIRECTORS",v:[...new Set(deals.map(d=>d.director))].length,c:"var(--g900)"}].map((s,i)=>(
          <div key={i} style={{padding:"18px 20px",border:"1px solid var(--g200)",borderRadius:12}}>
            <div style={{fontSize:10,fontFamily:"var(--mono)",color:"var(--g400)",textTransform:"uppercase",letterSpacing:".1em",marginBottom:6}}>{s.l}</div>
            <div style={{fontSize:26,fontWeight:800,color:s.c,fontFamily:"var(--mono)",letterSpacing:"-.03em"}}>{s.v}</div>
          </div>
        ))}
      </div>
      <h3 style={{fontSize:12,fontFamily:"var(--mono)",textTransform:"uppercase",letterSpacing:".1em",color:"var(--g400)",marginBottom:12}}>All Director Deals</h3>
      <div style={{borderTop:"2px solid var(--g900)"}}>
        {visibleDeals.map((d,i)=>(
          <div key={d.id||i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 0",borderBottom:"1px solid var(--g100)"}}>
            <div style={{display:"flex",alignItems:"center",gap:14}}><Tag type={d.transaction_type}/><span style={{fontWeight:600}}>{d.director}</span><span style={{color:"var(--g400)",fontSize:11,fontFamily:"var(--mono)"}}>{d.role}</span></div>
            <div style={{display:"flex",alignItems:"center",gap:20}}><span style={{fontFamily:"var(--mono)",fontSize:12,color:"var(--g400)"}}>{fmt.full(d.transaction_date)}</span><span style={{fontFamily:"var(--mono)",fontSize:12,color:"var(--g500)"}}>{fmt.num(d.shares)}{d.price!=null?" @ "+curSymbol(d.currency||"ZAR")+Number(d.price).toFixed(2):""}</span><span style={{fontFamily:"var(--mono)",fontSize:14,fontWeight:700,color:d.transaction_type==="Buy"?"var(--gn)":"var(--rd)",minWidth:80,textAlign:"right"}}>{fmtCur(d.value,mkt,d.currency)}</span></div>
          </div>
        ))}
      </div>
      {!isPro&&deals.length>3&&(
        <div style={{padding:"24px 0",textAlign:"center"}}>
          <button onClick={()=>go("pricing")} style={{padding:"12px 28px",borderRadius:10,background:"var(--or)",color:"#fff",fontSize:14,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"var(--f)"}}>Upgrade to see all {deals.length} deals</button>
        </div>
      )}
    </div>
  );
}

// ─── Auth Page ──────────────────────────────────────────────────────────────
function AuthPage({go,setUser}){
  const [mode,setMode]=useState("login"); // "login" or "signup"
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);

  const submit=async(e)=>{
    e.preventDefault();
    setError("");setLoading(true);
    try{
      const fn=mode==="login"?api.login:api.signup;
      const res=await fn(email,password);
      setUser({email:res.email,subscription_status:res.subscription_status});
      go("dashboard");
    }catch(err){
      setError(err.message||"Something went wrong");
    }finally{setLoading(false)}
  };

  return(
    <div style={{maxWidth:400,margin:"80px auto",padding:"0 40px"}}>
      <h1 className="rise" style={{fontSize:36,fontWeight:800,letterSpacing:"-.04em",textTransform:"uppercase",marginBottom:8}}>{mode==="login"?"LOG IN":"SIGN UP"}</h1>
      <p style={{color:"var(--g500)",fontSize:15,marginBottom:32}}>{mode==="login"?"Welcome back.":"Create your free Raven account."}</p>
      <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:14}}>
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" required
          style={{padding:"12px 16px",borderRadius:8,border:"1.5px solid var(--g200)",fontSize:14,fontFamily:"var(--f)",outline:"none",color:"var(--g900)"}}/>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" required minLength={6}
          style={{padding:"12px 16px",borderRadius:8,border:"1.5px solid var(--g200)",fontSize:14,fontFamily:"var(--f)",outline:"none",color:"var(--g900)"}}/>
        {error&&<div style={{color:"var(--rd)",fontSize:13,fontFamily:"var(--mono)"}}>{error}</div>}
        <button type="submit" disabled={loading} style={{padding:"13px 0",borderRadius:10,border:"none",background:"var(--or)",color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"var(--f)",opacity:loading?.6:1}}>
          {loading?"...":(mode==="login"?"Log In":"Create Account")}
        </button>
      </form>
      <div style={{marginTop:20,textAlign:"center"}}>
        <button onClick={()=>{setMode(mode==="login"?"signup":"login");setError("")}} style={{background:"none",border:"none",color:"var(--or)",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"var(--f)"}}>
          {mode==="login"?"Don't have an account? Sign up":"Already have an account? Log in"}
        </button>
      </div>
    </div>
  );
}

// ─── Upgrade Gate Overlay ────────────────────────────────────────────────────
function ProGate({go,children,label}){
  return(
    <div style={{position:"relative"}}>
      <div style={{filter:"blur(6px)",pointerEvents:"none",userSelect:"none"}}>{children}</div>
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"rgba(255,255,255,0.7)",borderRadius:12}}>
        <div style={{fontSize:13,fontFamily:"var(--mono)",color:"var(--g500)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:12}}>{label||"Pro feature"}</div>
        <button onClick={()=>go("pricing")} style={{padding:"12px 28px",borderRadius:10,background:"var(--or)",color:"#fff",fontSize:14,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"var(--f)"}}>Upgrade to Pro</button>
      </div>
    </div>
  );
}

// ─── Pricing ────────────────────────────────────────────────────────────────
function Pricing({go,user}){
  const [loading,setLoading]=useState(false);
  const isPro=user&&user.subscription_status==="active";

  const handleUpgrade=async()=>{
    if(!user){go("login");return}
    if(isPro){
      // Already pro — open portal to manage
      try{setLoading(true);const r=await api.createPortal();window.location.href=r.portal_url}catch(e){alert(e.message)}finally{setLoading(false)}
      return;
    }
    try{setLoading(true);const r=await api.createCheckout();window.location.href=r.checkout_url}catch(e){alert(e.message)}finally{setLoading(false)}
  };

  const chk=()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--or)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
  const plans=[
    {name:"FREE",price:"R0",per:"forever",desc:"See what's happening on the JSE.",feats:["Latest 10 director deals","Basic search","24-hour delay"],dark:false,action:()=>go("dashboard"),btn:"Get Started"},
    {name:"PRO",price:"R70",per:"/month",desc:"Full access for serious investors.",feats:["All deals in real-time","Cluster buy alerts","Sector flow analysis","Company profiles","Email watchlist alerts","CSV export"],dark:true,pop:true,action:handleUpgrade,btn:isPro?"Manage Subscription":user?"Upgrade Now":"Sign Up to Upgrade"},
  ];
  return(
    <div style={{maxWidth:1060,margin:"0 auto",padding:"56px 40px 72px"}}>
      <h1 className="rise" style={{fontSize:52,fontWeight:800,letterSpacing:"-.05em",textTransform:"uppercase",textAlign:"center"}}>SIMPLE <span className="em">PRICING</span></h1>
      <p className="rise" style={{textAlign:"center",color:"var(--g500)",fontSize:16,marginTop:12,marginBottom:48,animationDelay:".05s"}}>Start free. Upgrade when Raven proves its value.</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:16,maxWidth:700,margin:"0 auto"}}>
        {plans.map((p,i)=>(
          <div key={i} className="rise" style={{padding:32,background:p.dark?"var(--black)":"var(--white)",border:p.dark?"none":"1.5px solid var(--g200)",borderRadius:16,color:p.dark?"#fff":"var(--g900)",display:"flex",flexDirection:"column",animationDelay:(.1+i*.06)+"s",position:"relative"}}>
            {p.pop&&<div style={{position:"absolute",top:16,right:16,padding:"4px 12px",borderRadius:6,background:"var(--or)",fontSize:11,fontWeight:700,color:"#fff",textTransform:"uppercase",letterSpacing:".04em"}}>Popular</div>}
            <div style={{fontSize:13,fontWeight:700,letterSpacing:".06em",marginBottom:8}}>{p.name}</div>
            <div style={{marginBottom:12}}><span style={{fontSize:44,fontWeight:800,letterSpacing:"-.04em"}}>{p.price}</span><span style={{fontSize:14,color:p.dark?"var(--g500)":"var(--g400)",marginLeft:4}}>{p.per}</span></div>
            <div style={{fontSize:14,color:p.dark?"var(--g500)":"var(--g500)",marginBottom:28,lineHeight:1.5}}>{p.desc}</div>
            <div style={{flex:1}}>{p.feats.map((ft,j)=>(<div key={j} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,fontSize:14,color:p.dark?"var(--g300)":"var(--g600)"}}>{chk()}{ft}</div>))}</div>
            <button onClick={p.action} disabled={loading} style={{marginTop:28,padding:"13px 0",borderRadius:10,border:p.dark?"none":"1.5px solid var(--g200)",background:p.dark?"var(--or)":"var(--white)",color:p.dark?"#fff":"var(--g900)",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"var(--f)",width:"100%",opacity:loading?.6:1}}>{loading?"...":(p.btn)}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── App ────────────────────────────────────────────────────────────────────
export default function App(){
  const [page,setPage]=useState("landing");
  const [ticker,setTicker]=useState(null);
  const [user,setUser]=useState(null);
  const [authLoading,setAuthLoading]=useState(true);

  // Check for existing session on mount
  useEffect(()=>{
    if(api.getToken()){
      api.me().then(u=>setUser(u)).catch(()=>{api.logout();setUser(null)}).finally(()=>setAuthLoading(false));
    }else{setAuthLoading(false)}
    // Check for Stripe checkout redirect
    const params=new URLSearchParams(window.location.search);
    if(params.get("checkout")==="success"){
      // Refresh user to get updated subscription status
      if(api.getToken()){api.me().then(u=>setUser(u)).catch(()=>{})}
      window.history.replaceState({},"","/");
      setPage("dashboard");
    }
  },[]);

  const isPro=user&&user.subscription_status==="active";
  const handleLogout=()=>{api.logout();setUser(null);setPage("landing")};

  return(
    <div style={{minHeight:"100vh",background:"var(--white)"}}>
      <style>{css}</style>
      <Nav page={page} go={setPage} user={user} onLogout={handleLogout}/>
      {page==="landing"&&<Landing go={setPage}/>}
      {page==="dashboard"&&<Dash go={setPage} setTicker={setTicker} user={user} isPro={isPro}/>}
      {page==="company"&&ticker&&<Company ticker={ticker} go={setPage} user={user} isPro={isPro}/>}
      {page==="pricing"&&<Pricing go={setPage} user={user}/>}
      {page==="login"&&<AuthPage go={setPage} setUser={setUser}/>}
    </div>
  );
}
