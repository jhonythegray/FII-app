
'use client'
import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis } from "recharts";

const COLORS = ["#6366f1","#22c55e","#f59e0b","#ef4444"];
const STORAGE_KEY = "fii_saas_app";

const SECTOR_LIMITS = {
  "Logística": 0.35,
  "Shopping": 0.25,
  "Lajes": 0.20,
  "Papel": 0.15,
  "Agro": 0.15
};

const Box = ({title, children}) => (
  <div style={{
    background:"#fff",
    borderRadius:16,
    padding:16,
    boxShadow:"0 4px 20px rgba(0,0,0,0.05)"
  }}>
    <h3 style={{marginBottom:10,fontWeight:600}}>{title}</h3>
    {children}
  </div>
);

const KPI = ({label, value}) => (
  <div style={{
    background:"#fff",
    padding:16,
    borderRadius:16,
    boxShadow:"0 4px 20px rgba(0,0,0,0.05)"
  }}>
    <div style={{fontSize:12,color:"#666"}}>{label}</div>
    <div style={{fontSize:20,fontWeight:700}}>{value}</div>
  </div>
);

export default function Page(){

  const [portfolio,setPortfolio]=useState([]);
  const [prices,setPrices]=useState({});
  const [fundamentals,setFundamentals]=useState({});
  const [aporte,setAporte]=useState(1500);

  useEffect(()=>{
    const saved = localStorage.getItem(STORAGE_KEY);
    if(saved) setPortfolio(JSON.parse(saved));
  },[])

  useEffect(()=>{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio));
  },[portfolio])

  const fetchPrices = async ()=>{
    const map={}
    await Promise.all(portfolio.map(async p=>{
      try{
        const t=p.ticker.replace(".SA","");
        const res=await fetch(`https://brapi.dev/api/quote/${t}`);
        const data=await res.json();
        const price=data?.results?.[0]?.regularMarketPrice;
        if(price) map[p.ticker]=price;
      }catch{}
    }));
    setPrices(map);
  };

  useEffect(()=>{fetchPrices()},[portfolio]);

  const enriched = portfolio.map(p=>{
    const price=prices[p.ticker]||0;
    const fund=fundamentals[p.ticker]||{dy:0.08,pvp:1,sector:"Outro"};
    return {...p,...fund,value:price*p.shares,price};
  });

  const total = enriched.reduce((a,b)=>a+b.value,0);

  const sectorTotals={}
  enriched.forEach(f=>{
    const w=total>0?f.value/total:0;
    sectorTotals[f.sector]=(sectorTotals[f.sector]||0)+w;
  });

  const scored = enriched.map(f=>{
    let s=0;
    if(f.pvp<1) s+=4;
    if(f.dy>=0.08 && f.dy<=0.12) s+=3;
    if(f.sector==="Logística") s+=3;
    if(f.sector==="Shopping") s+=2;

    const w=total>0?f.value/total:0;
    if(w>0.25) s-=3;

    return {...f,score:s};
  });

  const ranking=[...scored].sort((a,b)=>b.score-a.score);

  const suggestion = ranking.map(f=>{
    const totalScore = ranking.reduce((a,b)=>a+b.score,0)||1;
    const idealWeight = f.score/totalScore;
    const idealValue = total*idealWeight;
    const gap = idealValue - f.value;
    return {...f,gap};
  }).filter(f=>f.gap>0)
    .sort((a,b)=>b.gap-a.gap)
    .slice(0,3)
    .map(f=>({
      ticker:f.ticker,
      qty:Math.floor((aporte/3)/(f.price||1))
    }));

  const chartData = enriched.map(f=>({name:f.ticker,value:f.value}));

  return(
    <div style={{background:"#f5f7fb",minHeight:"100vh",padding:20}}>

      <h1 style={{fontSize:24,fontWeight:700,marginBottom:20}}>FII SaaS Premium</h1>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
        <KPI label="Patrimônio" value={`R$ ${total.toFixed(2)}`} />
        <KPI label="FIIs" value={portfolio.length} />
        <KPI label="Aporte" value={`R$ ${aporte}`} />
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginTop:20}}>
        <Box title="Distribuição">
          <PieChart width={300} height={250}>
            <Pie data={chartData} dataKey="value" nameKey="name">
              {chartData.map((_,i)=>(<Cell key={i} fill={COLORS[i%COLORS.length]} />))}
            </Pie>
            <Tooltip/>
          </PieChart>
        </Box>

        <Box title="Otimização">
          {suggestion.map((s,i)=>(
            <div key={i}>{s.ticker} → {s.qty} cotas</div>
          ))}
        </Box>
      </div>

      <div style={{marginTop:20}}>
        <Box title="Carteira">
          {scored.map((f,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0"}}>
              <span>{f.ticker}</span>
              <span>R$ {f.value.toFixed(2)}</span>
              <span>Score {f.score.toFixed(1)}</span>
            </div>
          ))}
        </Box>
      </div>

    </div>
  );
}
