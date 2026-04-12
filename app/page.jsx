'use client'
import React, { useState, useEffect } from "react";

const FUNDS = [
  {ticker:"HGLG11", price:165, pvp:0.95, dy:0.085, sector:"Logística"},
  {ticker:"XPLG11", price:120, pvp:0.98, dy:0.082, sector:"Logística"},
  {ticker:"BTLG11", price:110, pvp:1.02, dy:0.09, sector:"Logística"},
  {ticker:"XPML11", price:105, pvp:0.97, dy:0.075, sector:"Shopping"},
  {ticker:"VISC11", price:98, pvp:0.92, dy:0.08, sector:"Shopping"},
  {ticker:"KNRI11", price:155, pvp:1.05, dy:0.07, sector:"Lajes"},
  {ticker:"HGRE11", price:130, pvp:0.93, dy:0.085, sector:"Lajes"},
];

export default function Page(){

  const [portfolio,setPortfolio]=useState([])
  const [ticker,setTicker]=useState("")
  const [aporte,setAporte]=useState(1500)

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

    setPortfolio(prev=>{
      const exists = prev.find(p=>p.ticker===ticker)
      if(exists) return prev
      return [...prev,{...fund,shares:1}]
    })

    setTicker("")
  }

  const updateShares = (i,value)=>{
    const updated=[...portfolio]
    updated[i].shares = Math.max(0,Number(value))
    setPortfolio(updated)
  }

  const removeFII = (i)=>{
    const updated=[...portfolio]
    updated.splice(i,1)
    setPortfolio(updated)
  }

  const enriched = portfolio.map(f=>({
    ...f,
    value: f.price * f.shares
  }))

  const total = enriched.reduce((a,b)=>a+b.value,0)

  // IA
  let suggestion = []
  if(portfolio.length > 0){
    suggestion = FUNDS.map(f=>{
      let score = 0

      if(f.pvp < 1) score += 4
      if(f.dy >= 0.08) score += 3
      if(f.sector==="Logística") score+=2

      const exists = portfolio.find(p=>p.ticker===f.ticker)
      if(exists){
        const weight = total>0 ? (exists.value/total) : 0
        if(weight > 0.3) score -= 4
      }

      return {...f,score}
    })
    .sort((a,b)=>b.score-a.score)
    .slice(0,3)
    .map(f=>({
      ticker:f.ticker,
      qty: Math.floor((aporte/3)/f.price)
    }))
  }

  return(
    <div className="min-h-screen bg-[#0b0f19] text-white p-6">

      <div className="max-w-7xl mx-auto">

        <h1 className="text-3xl font-bold mb-6">FII Dashboard</h1>

        {/* ADD */}
        <div className="bg-[#111827] p-4 rounded mb-6 flex gap-2">
          <select
            value={ticker}
            onChange={e=>setTicker(e.target.value)}
            className="bg-[#1f2937] p-2 w-full"
          >
            <option value="">Selecionar FII</option>
            {FUNDS.map(f=>(
              <option key={f.ticker}>{f.ticker}</option>
            ))}
          </select>

          <button onClick={addFII} className="bg-indigo-600 px-4 rounded">
            Add
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-[#111827] p-4 rounded">
            <p className="text-gray-400">Patrimônio</p>
            <p className="text-xl font-bold">R$ {total.toFixed(2)}</p>
          </div>

          <div className="bg-[#111827] p-4 rounded">
            <p className="text-gray-400">FIIs</p>
            <p className="text-xl font-bold">{portfolio.length}</p>
          </div>

          <div className="bg-[#111827] p-4 rounded">
            <p className="text-gray-400">Aporte</p>
            <input
              type="number"
              value={aporte}
              onChange={e=>setAporte(Number(e.target.value))}
              className="bg-[#1f2937] w-full mt-1 p-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">

          {/* CARTEIRA */}
          <div className="bg-[#111827] p-4 rounded">
            <h2 className="mb-3 font-semibold">Carteira</h2>

            {portfolio.map((f,i)=>(
              <div key={i} className="flex justify-between items-center mb-2">

                <span>{f.ticker}</span>

                <div className="flex items-center gap-1">
                  <button onClick={()=>updateShares(i,f.shares-1)}>-</button>

                  <input
                    type="number"
                    value={f.shares}
                    onChange={e=>updateShares(i,e.target.value)}
                    className="w-16 text-center bg-[#1f2937]"
                  />

                  <button onClick={()=>updateShares(i,f.shares+1)}>+</button>
                </div>

                <span>R$ {(f.price*f.shares).toFixed(2)}</span>

                <button onClick={()=>removeFII(i)} className="text-red-400">x</button>
              </div>
            ))}
          </div>

          {/* SUGESTÃO */}
          <div className="bg-[#111827] p-4 rounded">
            <h2 className="mb-3 font-semibold">Sugestão de aporte</h2>

            {portfolio.length === 0 && (
              <p className="text-gray-400">Monte sua carteira primeiro</p>
            )}

            {suggestion.map((s,i)=>(
              <div key={i} className="mb-2">
                <b>{s.ticker}</b> → {s.qty} cotas
              </div>
            ))}
          </div>

        </div>

      </div>
    </div>
  )
}