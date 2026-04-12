'use client'
import React, { useState, useEffect } from "react";

const FUNDS = [
  {ticker:"HGLG11", price:165, pvp:0.95, dy:0.085, sector:"Logística"},
  {ticker:"XPLG11", price:120, pvp:0.98, dy:0.082, sector:"Logística"},
  {ticker:"BTLG11", price:110, pvp:1.02, dy:0.09, sector:"Logística"},
  {ticker:"XPML11", price:105, pvp:0.97, dy:0.075, sector:"Shopping"},
  {ticker:"VISC11", price:98, pvp:0.92, dy:0.08, sector:"Shopping"},
  {ticker:"KNRI11", price:155, pvp:1.05, dy:0.07, sector:"Lajes"},
];

export default function Page(){

  const [portfolio,setPortfolio]=useState([])
  const [ticker,setTicker]=useState("")
  const [aporte,setAporte]=useState(1500)

  useEffect(()=>{
    const saved = localStorage.getItem("fii_app")
    if(saved) setPortfolio(JSON.parse(saved))
  },[])

  useEffect(()=>{
    localStorage.setItem("fii_app", JSON.stringify(portfolio))
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

  const enriched = portfolio.map(f=>({
    ...f,
    value: f.price * f.shares
  }))

  const total = enriched.reduce((a,b)=>a+b.value,0)

  // IA só roda se tiver carteira
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
    <div className="p-6 max-w-4xl mx-auto">

      <h1 className="text-2xl font-bold mb-6">FII Analyzer</h1>

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

      {/* CARTEIRA */}
      <div className="mb-6">
        <h2 className="font-semibold mb-2">Sua carteira</h2>

        {portfolio.map((f,i)=>(
          <div key={i} className="flex gap-2 items-center mb-2">
            <span className="w-20">{f.ticker}</span>

            <button onClick={()=>updateShares(i,f.shares-1)}>-</button>

            <input
              type="number"
              value={f.shares}
              onChange={e=>updateShares(i,e.target.value)}
              className="w-16 border text-center"
            />

            <button onClick={()=>updateShares(i,f.shares+1)}>+</button>

            <span>R$ {(f.shares*f.price).toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* KPIs */}
      <div className="mb-6">
        <p><b>Total:</b> R$ {total.toFixed(2)}</p>
      </div>

      {/* IA */}
      {portfolio.length > 0 && (
        <div>
          <h2 className="font-semibold mb-2">Sugestão de aporte</h2>

          {suggestion.map((s,i)=>(
            <div key={i}>
              {s.ticker} → {s.qty} cotas
            </div>
          ))}
        </div>
      )}

    </div>
  )
}