'use client'
import React, { useState, useEffect, useRef } from "react";

const FUNDS = [
  "HGLG11","XPLG11","BTLG11","XPML11","VISC11","MALL11",
  "HSML11","HGBS11","KNRI11","HGRE11","PVBI11","VINO11",
  "JSRE11","BRCR11","GGRC11","BRCO11","RZAG11","VGIA11",
  "RZTR11","SNAG11","FGAA11"
];

const FUND_DATA = {
  HGLG11:{price:165,pvp:0.95,dy:0.085},
  XPLG11:{price:120,pvp:0.98,dy:0.082},
  BTLG11:{price:110,pvp:1.02,dy:0.09},
  XPML11:{price:105,pvp:0.97,dy:0.075},
  VISC11:{price:98,pvp:0.92,dy:0.08},
};

export default function Page(){

  const [portfolio,setPortfolio]=useState([])
  const [query,setQuery]=useState("")
  const [show,setShow]=useState(false)
  const [aporte,setAporte]=useState(1500)

  const ref = useRef(null)

  useEffect(()=>{
    const saved = localStorage.getItem("fii_app")
    if(saved) setPortfolio(JSON.parse(saved))
  },[])

  useEffect(()=>{
    localStorage.setItem("fii_app", JSON.stringify(portfolio))
  },[portfolio])

  useEffect(()=>{
    const handler = e=>{
      if(ref.current && !ref.current.contains(e.target)){
        setShow(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return ()=>document.removeEventListener("mousedown", handler)
  },[])

  const filtered = FUNDS.filter(f=>f.includes(query.toUpperCase()))

  const addFII = (ticker)=>{
    const base = FUND_DATA[ticker] || {price:100,pvp:1,dy:0.08}

    setPortfolio(prev=>{
      const exists = prev.find(p=>p.ticker===ticker)
      if(exists) return prev
      return [...prev,{ticker,...base,shares:1}]
    })

    setQuery("")
    setShow(false)
  }

  const updateShares = (i,val)=>{
    const updated=[...portfolio]
    updated[i].shares = Math.max(0,Number(val))
    setPortfolio(updated)
  }

  const total = portfolio.reduce((acc,f)=>acc+(f.price*f.shares),0)

  return(
    <div className="min-h-screen bg-[#0b0f19] text-white p-6">

      <div className="max-w-6xl mx-auto">

        <h1 className="text-3xl mb-6">FII Dashboard</h1>

        {/* SEARCH */}
        <div ref={ref} className="mb-6 relative">

          <input
            value={query}
            onFocus={()=>setShow(true)}
            onChange={e=>{
              setQuery(e.target.value.toUpperCase())
              setShow(true)
            }}
            placeholder="Buscar FII..."
            className="w-full p-3 bg-[#111827]"
          />

          {show && query && (
            <div className="absolute bg-[#1f2937] w-full max-h-40 overflow-y-auto">
              {filtered.map((f,i)=>(
                <div key={i}
                  onClick={()=>addFII(f)}
                  className="p-2 hover:bg-gray-700 cursor-pointer">
                  {f}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CARTEIRA */}
        <div className="bg-[#111827] p-4 rounded mb-6">
          <h2 className="mb-3">Carteira</h2>

          {portfolio.map((f,i)=>(
            <div key={i} className="flex justify-between items-center mb-2">

              <span>{f.ticker}</span>

              <input
                type="number"
                value={f.shares}
                onChange={e=>updateShares(i,e.target.value)}
                className="w-20 bg-[#1f2937] text-center"
              />

              <span>R$ {(f.price*f.shares).toFixed(2)}</span>

            </div>
          ))}
        </div>

        {/* TOTAL */}
        <div className="mb-6">
          Total: R$ {total.toFixed(2)}
        </div>

      </div>
    </div>
  )
}