'use client'
import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis } from "recharts";

const COLORS = ["#4f46e5","#22c55e","#f59e0b","#ef4444","#0ea5e9"];

// Base consistente (produto usa isso mesmo no início)
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

  // adicionar
  const addFII = ()=>{
    const fund = FUNDS.find(f=>f.ticker===ticker)
    if(!fund) return

    setPortfolio(prev=>{
      const exists = prev.find(p=>p.ticker===ticker)
      if(exists){
        return prev.map(p=>p.ticker===ticker ? {...p,shares:p.shares+1} : p)
      }
      return [...prev,{...fund,shares:1}]
    })

    setTicker("")
  }

  const removeFII = (i)=>{
    const updated=[...portfolio]
    updated.splice(i,1)
    setPortfolio(updated)
  }

  // carteira
  const enriched = portfolio.map(f=>({
    ...f,
    value: f.price * f.shares
  }))

  const total = enriched.reduce((a,b)=>a+b.value,0)

  // IA PROFISSIONAL
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
    if(exists){
      const weight = total>0 ? (f.price*exists.shares)/total : 0
      if(weight > 0.25) score -= 4
      else score -= 1
    }

    return {...f,score}
  }).sort((a,b)=>b.score-a.score)

  const suggestion = ranked.slice(0,3).map(f=>({
    ticker:f.ticker,
    qty: Math.floor((aporte/3)/f.price),
    score:f.score
  }))

  const pieData = enriched.map(f=>({name:f.ticker,value:f.value}))

  return(
    <div className="min-h-screen bg-gray-50 p-6">

      <div className="max-w-6xl mx-auto">

        <h1 className="text-3xl font-bold mb-6">FII Analyzer</h1>

        {/* INPUT */}
        <div className="bg-white p-4 rounded shadow mb-6 flex gap-2">
          <select
            value={ticker}
            onChange={e=>setTicker(e.target.value)}
            className="border p-2 w-full rounded"
          >
            <option value="">Selecionar FII</option>
            {FUNDS.map(f=>(
              <option key={f.ticker}>{f.ticker}</option>
            ))}
          </select>

          <button onClick={addFII} className="bg-indigo-600 text-white px-4 rounded">
            Adicionar
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded shadow">
            <p className="text-sm text-gray-500">Patrimônio</p>
            <p className="text-xl font-bold">R$ {total.toFixed(2)}</p>
          </div>

          <div className="bg-white p-4 rounded shadow">
            <p className="text-sm text-gray-500">FIIs</p>
            <p className="text-xl font-bold">{portfolio.length}</p>
          </div>

          <div className="bg-white p-4 rounded shadow">
            <p className="text-sm text-gray-500">Aporte</p>
            <input
              type="number"
              value={aporte}
              onChange={e=>setAporte(Number(e.target.value))}
              className="w-full mt-1 border p-1"
            />
          </div>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-2 gap-6">

          {/* CARTEIRA */}
          <div className="bg-white p-4 rounded shadow">
            <h2 className="font-semibold mb-3">Carteira</h2>

            {enriched.map((f,i)=>(
              <div key={i} className="flex justify-between mb-2">
                <span>{f.ticker}</span>
                <span>{f.shares}</span>
                <span>R$ {f.value.toFixed(2)}</span>
                <button onClick={()=>removeFII(i)}>X</button>
              </div>
            ))}
          </div>

          {/* SUGESTÕES */}
          <div className="bg-white p-4 rounded shadow">
            <h2 className="font-semibold mb-3">Melhores oportunidades</h2>

            {suggestion.map((s,i)=>(
              <div key={i} className="mb-2">
                <b>{s.ticker}</b> → {s.qty} cotas
                <div className="text-sm text-gray-500">
                  Score: {s.score}
                </div>
              </div>
            ))}
          </div>

          {/* GRÁFICO 1 */}
          <div className="bg-white p-4 rounded shadow">
            <h2 className="font-semibold mb-3">Distribuição</h2>

            <PieChart width={300} height={250}>
              <Pie data={pieData} dataKey="value">
                {pieData.map((_,i)=>(<Cell key={i} fill={COLORS[i%COLORS.length]} />))}
              </Pie>
              <Tooltip/>
            </PieChart>
          </div>

          {/* GRÁFICO 2 */}
          <div className="bg-white p-4 rounded shadow">
            <h2 className="font-semibold mb-3">Ranking</h2>

            <BarChart width={300} height={250} data={ranked.slice(0,5)}>
              <XAxis dataKey="ticker"/>
              <YAxis/>
              <Tooltip/>
              <Bar dataKey="score"/>
            </BarChart>
          </div>

        </div>

      </div>
    </div>
  )
}