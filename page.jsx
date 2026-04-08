
'use client'
import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis } from "recharts";

const COLORS = ["#6366f1","#22c55e","#f59e0b","#ef4444"];
const STORAGE_KEY = "fii_final_app";

const SECTOR_LIMITS = {
  "Logística": 0.35,
  "Shopping": 0.25,
  "Lajes": 0.20,
  "Papel": 0.15,
  "Agro": 0.15
};

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

  const handleUpload = (e)=>{
    const file=e.target.files[0];
    if(!file) return;
    const reader=new FileReader();
    reader.onload=(ev)=>{
      try{
        setFundamentals(JSON.parse(ev.target.result));
        alert("Base carregada");
      }catch{
        alert("Erro JSON");
      }
    };
    reader.readAsText(file);
  };

  const addFII = ()=>{
    setPortfolio([...portfolio,{ticker:"HGLG11.SA",shares:1}])
  }

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
    else if(f.pvp<1.05) s+=2;
    else s-=2;

    if(f.dy>=0.08 && f.dy<=0.12) s+=3;
    if(f.dy>0.12) s+=1;

    if(f.sector==="Logística") s+=3;
    if(f.sector==="Shopping") s+=2;
    if(f.sector==="Lajes") s+=1;
    if(f.sector==="Papel") s-=2;

    if(f.dy>0.13) s-=1.5;
    if(f.pvp>1.1) s-=2;

    const w=total>0?f.value/total:0;
    if(w>0.25) s-=3;

    return {...f,score:s};
  });

  const ranking=[...scored].sort((a,b)=>b.score-a.score);

  const suggestion = ranking
    .map(f=>{
      const totalScore = ranking.reduce((a,b)=>a+b.score,0)||1;
      const idealWeight = f.score/totalScore;

      if((sectorTotals[f.sector]||0) > (SECTOR_LIMITS[f.sector]||1)) return null;

      const idealValue = total*idealWeight;
      const gap = idealValue - f.value;

      return {...f,gap};
    })
    .filter(f=>f && f.gap>0)
    .sort((a,b)=>b.gap-a.gap)
    .slice(0,5)
    .map(f=>({
      ticker:f.ticker,
      qty:Math.floor((aporte/5)/(f.price||1))
    }));

  const chartData = enriched.map(f=>({name:f.ticker,value:f.value}));

  return(
    <div style={{padding:20,maxWidth:1000,margin:"auto",background:"#f5f7fb",minHeight:"100vh"}}>

      <h1 style={{fontSize:24,fontWeight:700}}>FII App Final</h1>

      <input type="file" onChange={handleUpload}/>
      <button onClick={addFII}>Adicionar FII</button>

      <h3>Carteira</h3>
      {scored.map((f,i)=>(
        <div key={i}>
          {f.ticker} R$ {f.value.toFixed(2)} Score {f.score.toFixed(1)}
        </div>
      ))}

      <h3>Otimização</h3>
      {suggestion.map((s,i)=>(
        <div key={i}>{s.ticker} → {s.qty}</div>
      ))}

      <PieChart width={400} height={300}>
        <Pie data={chartData} dataKey="value" nameKey="name">
          {chartData.map((_,i)=>(<Cell key={i} fill={COLORS[i%COLORS.length]} />))}
        </Pie>
        <Tooltip/>
      </PieChart>

      <BarChart width={400} height={250} data={suggestion}>
        <XAxis dataKey="ticker"/>
        <YAxis/>
        <Tooltip/>
        <Bar dataKey="qty"/>
      </BarChart>

    </div>
  )
}
