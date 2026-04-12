'use client'
import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis } from "recharts";

const COLORS = ["#6366f1","#22c55e","#f59e0b","#ef4444"];

// base consistente
const FUNDS = [
  {ticker:"HGLG11", price:165, pvp:0.95, dy:0.085, sector:"Logística"},
  {ticker:"XPLG11", price:120, pvp:0.98, dy:0.082, sector:"Logística"},
  {ticker:"BTLG11", price:110, pvp:1.02, dy:0.09, sector:"Logística"},
  {ticker:"XPML11", price:105, pvp:0.97, dy:0.075, sector:"Shopping"},
  {ticker:"VISC11", price:98, pvp:0.92, dy:0.08, sector:"Shopping"},
  {ticker:"KNRI11", price:155, pvp:1.05, dy:0.07, sector:"Lajes"},
  {ticker:"HGRE11", price:130, pvp:0.93, dy:0.085, sector:"Lajes"},
  {ticker:"RZAG11", price:95, pvp:0.99, dy:0.10, sector:"Agro"},
  {ticker:"VGIA11", price:92, pvp:0.97, dy:0.11, sector:"Agro"},
];

export default function Page(){

  const [portfolio,setPortfolio]=useState([])
  const [ticker,setTicker]=useState("")
  const [aporte,setAporte]=useState(1500)

  // persistência
  useEffect(()=>{
    const saved = localStorage.getItem("fii_pro")
    if(saved) setPortfolio(JSON.parse(saved))
  },[])

  useEffect(()=>{
    localStorage.setItem("fii_pro", JSON.stringify(portfolio))
  },[portfolio])

  const addFII = ()=>{
    const fund = FUNDS.find(f=>f.ticker===ticker)
    if(!fund) return
    setPortfolio([...portfolio,{...fund,shares:1}])
    setTicker("")
  }

  const removeFII = (i)=>{
    const updated=[...portfolio]
    updated.splice(i,1)
    setPortfolio(updated)
  }

  // carteira enriquecida
  const enriched = portfolio.map(f=>({
    ...f,
    value: f.price * f.shares
  }))

  const total = enriched.reduce((a,b)=>a+b.value,0)

  // IA real (universo completo)
  const ranked = FUNDS.map(f=>{
    let score = 0

    if(f.pvp < 1) score += 4
    else if(f.pvp < 1.05) score += 2
    else score -= 2

    if(f.dy >= 0.08 && f.dy <= 0.12) score += 3
    if(f.dy > 0.12) score -= 1

    if(f.sector==="Logística") score+=3
    if(f.sector==="Shopping") score+=2
    if(f.sector==="Lajes") score+=1

    const exists = portfolio.find(p=>p.ticker===f.ticker)
    if(exists) score -= 1

    return {...f,score}
  })
  .sort((a,b)=>b.score-a.score)

  const suggestion = ranked.slice(0,3).map(f=>({
    ticker:f.ticker,
    qty: Math.floor((aporte/3)/f.price),
    score:f.score
  }))

  const chartData = enriched.map(f=>({
    name:f.ticker,
    value:f.value
  }))

  return(
    <div className="p-6 max-w-6xl mx-auto">

      <h1 className="text-2xl font-bold mb-6">FII Analyzer PRO</h1>

      {/* INPUT */}
      <div className="flex gap-2 mb-6">
        <select
          value={ticker}
          onChange={e=>setTicker(e.target.value)}
          className="border p-2 w-full"
        >
          <option value="">Selecionar FII</option>
          {FUNDS.map(f=>(
            <option key={f.ticker}>{f.ticker}</option>
          ))}
        </select>

        <button onClick={addFII} className="bg-indigo-600 text-white px-4">
          Add
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-100 p-4 rounded">
          Patrimônio: R$ {total.toFixed(2)}
        </div>
        <div className="bg-gray-100 p-4 rounded">
          FIIs: {portfolio.length}
        </div>
        <div className="bg-gray-100 p-4 rounded">
          <input type="number" value={aporte} onChange={e=>setAporte(Number(e.target.value))}/>
        </div>
      </div>

      {/* CARTEIRA */}
      <div className="bg-gray-100 p-4 rounded mb-6">
        <h2 className="font-semibold mb-2">Carteira</h2>
        {enriched.map((f,i)=>(
          <div key={i} className="flex justify-between">
            <span>{f.ticker}</span>
            <span>{f.shares}</span>
            <span>R$ {f.value.toFixed(2)}</span>
            <button onClick={()=>removeFII(i)}>X</button>
          </div>
        ))}
      </div>

      {/* SUGESTÕES */}
      <div className="bg-gray-100 p-4 rounded mb-6">
        <h2 className="font-semibold mb-2">Melhores oportunidades</h2>
        {suggestion.map((s,i)=>(
          <div key={i}>
            {s.ticker} → {s.qty} cotas (score {s.score})
          </div>
        ))}
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-2 gap-6">
        <PieChart width={300} height={250}>
          <Pie data={chartData} dataKey="value">
            {chartData.map((_,i)=>(<Cell key={i} fill={COLORS[i%COLORS.length]} />))}
          </Pie>
          <Tooltip/>
        </PieChart>

        <BarChart width={300} height={250} data={ranked.slice(0,5)}>
          <XAxis dataKey="ticker"/>
          <YAxis/>
          <Tooltip/>
          <Bar dataKey="score"/>
        </BarChart>
      </div>

    </div>
  )
}