'use client'
import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";

const COLORS = ["#6366f1","#22c55e","#f59e0b","#ef4444"];

const FII_LIST = [
  "HGLG11","XPLG11","BTLG11","XPML11","KNRI11",
  "VISC11","HSML11","MALL11","GGRC11","BRCO11"
];

export default function Page(){

  const [portfolio,setPortfolio]=useState([])
  const [prices,setPrices]=useState({})
  const [aporte,setAporte]=useState(1500)
  const [ticker,setTicker]=useState("")
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState(null)

  // 💾 persistência
  useEffect(()=>{
    const saved = localStorage.getItem("fii_app")
    if(saved){
      setPortfolio(JSON.parse(saved))
    }
  },[])

  useEffect(()=>{
    localStorage.setItem("fii_app", JSON.stringify(portfolio))
  },[portfolio])

  const addFII = ()=>{
    if(!ticker) return
    setPortfolio([...portfolio,{ticker:ticker.toUpperCase()+".SA",shares:1}])
    setTicker("")
  }

  const removeFII = (i)=>{
    const updated=[...portfolio]
    updated.splice(i,1)
    setPortfolio(updated)
  }

  const fetchPrices = async ()=>{
    setLoading(true)
    const map={}
    try{
      await Promise.all(portfolio.map(async p=>{
        try{
          const t=p.ticker.replace(".SA","")
          const res=await fetch(`https://brapi.dev/api/quote/${t}`)
          const data=await res.json()
          map[p.ticker]=data?.results?.[0]?.regularMarketPrice || 0
        }catch{
          map[p.ticker]=0
        }
      }))
      setError(null)
    }catch{
      setError("Erro ao buscar preços")
    }
    setPrices(map)
    setLoading(false)
  }

  useEffect(()=>{if(portfolio.length>0) fetchPrices()},[portfolio])

  const enriched = portfolio.map(p=>{
    const price=prices[p.ticker]||0
    return {...p,value:price*p.shares,price}
  })

  const total = enriched.reduce((a,b)=>a+b.value,0)

  // 🧠 IA melhorada
  const scored = enriched.map(f=>{
    let score = 0

    if(f.price>0) score += 2
    if(f.price<100) score += 1

    const weight = total>0 ? f.value/total : 0
    if(weight<0.2) score += 2
    else score -= 2

    if(portfolio.length < 5) score += 1

    return {...f,score}
  })

  const suggestion = scored
    .sort((a,b)=>b.score-a.score)
    .slice(0,3)
    .map(f=>({
      ticker:f.ticker,
      qty: Math.floor((aporte/3)/(f.price||1)),
      reason:[
        f.value<total*0.2 ? "Subalocado" : "Concentrado",
        f.price>0 ? "Preço válido" : "Sem preço"
      ]
    }))

  const chartData = enriched.map(f=>({name:f.ticker,value:f.value}))

  return(
    <div className="p-6 max-w-5xl mx-auto">

      <h1 className="text-2xl font-bold mb-6">FII App</h1>

      {/* 🔎 AUTOCOMPLETE */}
      <div className="relative w-full mb-4">
        <input 
          value={ticker}
          onChange={e=>setTicker(e.target.value.toUpperCase())}
          placeholder="Digite o ticker"
          className="border p-2 rounded w-full"
        />

        {ticker && (
          <div className="absolute bg-white border w-full z-10">
            {FII_LIST
              .filter(f=>f.includes(ticker))
              .map((f,i)=>(
                <div 
                  key={i}
                  onClick={()=>setTicker(f)}
                  className="p-2 hover:bg-gray-100 cursor-pointer"
                >
                  {f}
                </div>
              ))
            }
          </div>
        )}
      </div>

      <button onClick={addFII} className="bg-indigo-600 text-white px-4 rounded mb-4">
        Add
      </button>

      {loading && <p className="text-sm text-gray-500">Carregando preços...</p>}
      {error && <p className="text-red-500">{error}</p>}

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow">
          Patrimônio: R$ {total.toFixed(2)}
        </div>
        <div className="bg-white p-4 rounded shadow">
          FIIs: {portfolio.length}
        </div>
        <div className="bg-white p-4 rounded shadow">
          <input type="number" value={aporte} onChange={e=>setAporte(Number(e.target.value))}/>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="font-semibold mb-3">Carteira</h2>

        {scored.map((f,i)=>(
          <div key={i} className="flex justify-between items-center py-2 border-b">

            <span>{f.ticker}</span>

            <input 
              type="number" 
              value={f.shares}
              onChange={e=>{
                const updated=[...portfolio]
                updated[i].shares=Number(e.target.value)
                setPortfolio(updated)
              }}
              className="w-16 border rounded"
            />

            <span>R$ {f.value.toFixed(2)}</span>

            <div className={`text-sm ${
              f.score>=3 ? "text-green-600" :
              f.score>=1 ? "text-yellow-500" :
              "text-red-500"
            }`}>
              Score {f.score}
            </div>

            <button onClick={()=>removeFII(i)} className="text-red-500">X</button>
          </div>
        ))}
      </div>

      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="font-semibold mb-3">Sugestões</h2>

        {suggestion.map((s,i)=>(
          <div key={i} className="mb-2">
            <b>{s.ticker}</b> → {s.qty} cotas
            <div className="text-sm text-gray-500">
              {s.reason.join(" | ")}
            </div>
          </div>
        ))}
      </div>

      <PieChart width={300} height={250}>
        <Pie data={chartData} dataKey="value">
          {chartData.map((_,i)=>(<Cell key={i} fill={COLORS[i%COLORS.length]} />))}
        </Pie>
        <Tooltip/>
      </PieChart>

    </div>
  )
}