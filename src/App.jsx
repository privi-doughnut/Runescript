import React from "react";
import { useState, useEffect, useRef, memo } from "react";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// ── UTILS ──────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2,10);
const now = () => new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
const scoreClass = s => s>=80?'b-green':s>=60?'b-gold':'b-red';
const scoreColor = s => s>=80?'#7ac89a':s>=60?'#c9a84c':'#e07888';
const stars = r => '★'.repeat(Math.round(r))+'☆'.repeat(5-Math.round(r));
const STATUS_COLORS = {'Not Contacted':'b-gold','Contacted':'b-blue','Read':'b-purple','Active':'b-green','Closed':'b-teal','Rejected':'b-red'};
const PIPE_COLORS = {'Not Contacted':'#c9a84c','Contacted':'#4a7aaa','Read':'#9060b8','Active':'#5a9070','Closed':'#40a0a0','Rejected':'#c05060'};

const playClick = () => {
  try {
    const ac=new(window.AudioContext||window.webkitAudioContext)();
    const len=Math.floor(ac.sampleRate*.028);
    const buf=ac.createBuffer(1,len,ac.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3)*.2;
    const src=ac.createBufferSource(); src.buffer=buf;
    const g=ac.createGain(); g.gain.value=.15;
    src.connect(g); g.connect(ac.destination); src.start();
    setTimeout(()=>ac.close(),200);
  }catch(e){}
};

const MOCK_RESPONSES = {
  pitch: `SMS: "Hi [Name], noticed your Google listing doesn't link to a website — I build them in 24hrs for local businesses like yours. Mind if I show you a quick preview? - [Your Name]"

CALL SCRIPT: "Hey, is this [Business]? Great — I'm a web designer and I noticed you don't have a website showing up when people search for you. I just finished one for another [business type] nearby and they started getting calls from it within a week. Could I show you what I'd build for you? Takes 2 minutes."

EMAIL:
Subject: Your business deserves a better first impression

Hey [Name],

I came across [Business] on Google and noticed you're doing well with reviews, but there's no website to send people to. I build fast, mobile-ready websites for local businesses — starting at $500 with a 24-hour turnaround.

I'd love to show you a free mockup. 15 minutes on a call?

[Your Name]

FOLLOW-UP: "Hey [Name], just following up on my message about building you a website. Your competitors in [City] are starting to show up online — want to make sure you're ahead of them. Happy to do a free preview, no commitment."`,
  site: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Business Website</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:sans-serif}header{background:#1a1a2e;color:#fff;padding:20px 40px;display:flex;justify-content:space-between;align-items:center}h1{color:#c9a84c}nav a{color:#fff;text-decoration:none;margin-left:20px}.hero{background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff;padding:80px 40px;text-align:center}.hero h2{font-size:2.5rem;margin-bottom:20px}.btn{background:#c9a84c;color:#000;padding:12px 28px;border:none;border-radius:4px;cursor:pointer;font-size:1rem;font-weight:700}.services{padding:60px 40px;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:24px}.card{background:#f8f8f8;padding:24px;border-radius:8px;text-align:center}.reviews{background:#1a1a2e;color:#fff;padding:60px 40px;text-align:center}footer{background:#0a0a14;color:#666;padding:24px 40px;text-align:center}</style></head><body><header><h1>Business Name</h1><nav><a href="#">Home</a><a href="#">Services</a><a href="#">Contact</a></nav></header><div class="hero"><h2>Professional Services You Can Trust</h2><p style="margin-bottom:28px;font-size:1.1rem;opacity:.8">Serving your city with top-rated service since 2010</p><button class="btn">Get a Free Quote</button></div><section class="services"><div class="card"><h3>⭐ Service One</h3><p>Professional and reliable service for your needs.</p></div><div class="card"><h3>🔧 Service Two</h3><p>Expert solutions delivered on time and on budget.</p></div><div class="card"><h3>📞 24/7 Support</h3><p>Always here when you need us most.</p></div></section><section class="reviews"><h2 style="margin-bottom:32px">What Our Customers Say</h2><p style="font-style:italic;font-size:1.1rem">"Best service in the city. Highly recommend!"</p><p style="margin-top:8px;opacity:.7">— Google Reviewer, ⭐⭐⭐⭐⭐</p></section><footer><p>© 2026 Business Name. All rights reserved. | (555) 123-4567 | info@business.com</p></footer></body></html>`,
  studio: `Here are your AI-generated marketing assets:

📱 SOCIAL MEDIA POST:
"We're proud to serve [City] with 5-star [service type]. Whether you need [service A] or [service B], our team is ready to help. Book today and see why 200+ customers choose us! 📞 Call now or visit our website.
#[City] #[BusinessType] #LocalBusiness #5StarService"

📧 EMAIL CAMPAIGN:
Subject: [Seasonal offer] from [Business Name]

Hi [Customer Name],

As a valued customer, we wanted to share an exclusive offer just for you...

This month only: 15% off all [services]. Use code LOYAL15 at checkout.

Book now before spots fill up!

Warm regards,
[Business Name] Team`,
  default: `This is a mock AI response for testing purposes. Mock API mode is active — no credits are being used. In production mode, this would be a real Claude response tailored to your specific prompt.`,
};

const callClaude = async (prompt, max=1400) => {
  if (window.MOCK_MODE) {
    await new Promise(r => setTimeout(r, 800));
    const p = prompt.toLowerCase();
    if (p.includes('pitch') || p.includes('sms') || p.includes('call script')) return MOCK_RESPONSES.pitch;
    if (p.includes('<!doctype') || p.includes('build') && p.includes('website')) return MOCK_RESPONSES.site;
    if (p.includes('social') || p.includes('email campaign') || p.includes('ad copy')) return MOCK_RESPONSES.studio;
    return MOCK_RESPONSES.default;
  }
  const r = await fetch('https://api.anthropic.com/v1/messages',{
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:max,messages:[{role:'user',content:prompt}]})
  });
  const data = await r.json();
  return data.content?.map(b=>b.text||'').join('').trim();
};

// ── CSS ────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=DM+Sans:wght@300;400;500&family=JetBrains+Mono:wght@400;500&display=swap');
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;min-width:0;}
html{background:#07070e;overflow-x:hidden;}body{background:#07070e;}

@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadein{from{opacity:0}to{opacity:1}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
@keyframes toast-in{from{opacity:0}to{opacity:1}}

/* ── LANDING ── */
.land{min-height:100vh;background:#07070e;color:#ddd8ce;font-family:'DM Sans',sans-serif;}
.land-ann{background:rgba(201,168,76,.08);border-bottom:1px solid rgba(201,168,76,.12);padding:8px clamp(12px,3vw,24px);display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;}
.land-ann-dot{width:5px;height:5px;background:#c9a84c;border-radius:50%;flex-shrink:0;}
.land-ann-txt{font-family:'JetBrains Mono',monospace;font-size:.62rem;letter-spacing:2px;text-transform:uppercase;color:#c9a84c;}
.land-ann-lnk{font-family:'JetBrains Mono',monospace;font-size:.62rem;letter-spacing:2px;text-transform:uppercase;color:#c9a84c;text-decoration:none;border-bottom:1px solid rgba(201,168,76,.35);padding-bottom:1px;}
.land-nav{display:flex;align-items:center;justify-content:space-between;padding:0 clamp(12px,4vw,60px);height:60px;overflow:hidden;background:#07070e;border-bottom:1px solid rgba(201,168,76,.08);}
.land-logo{font-family:'Cinzel',serif;font-size:1rem;font-weight:700;letter-spacing:4px;color:#ddd8ce;display:flex;align-items:center;gap:10px;}
.land-logo-g{color:#c9a84c;font-size:1.4rem;}
.land-nav-r{display:flex;gap:10px;align-items:center;}
.land-hero{display:grid;grid-template-columns:1fr 1fr;min-width:0;overflow:hidden;gap:clamp(24px,4vw,64px);align-items:center;padding:clamp(36px,6vw,80px) clamp(14px,4vw,60px) clamp(32px,5vw,70px);max-width:1280px;margin:0 auto;}
.land-h1{font-family:'Cinzel',serif;font-size:clamp(2.4rem,4.2vw,4rem);font-weight:900;line-height:1.07;color:#ddd8ce;margin-bottom:22px;}
.land-h1-gold{color:#c9a84c;}
.land-h1-dim{color:transparent;-webkit-text-stroke:1px rgba(201,168,76,.15);}
.land-sub{font-size:.9rem;font-weight:300;color:#6a6878;line-height:1.85;margin-bottom:28px;max-width:100%;}
.land-sub em{color:#9a9580;font-style:normal;font-weight:400;}
.land-btns{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:40px;}
.land-trust{display:flex;gap:12px;flex-wrap:wrap;}
.land-trust-item{display:flex;align-items:center;gap:7px;font-family:'JetBrains Mono',monospace;font-size:.58rem;letter-spacing:1.5px;color:#6a6878;text-transform:uppercase;}
.land-trust-g{color:#c9a84c;opacity:.5;}
.land-term{background:#0b0b17;border:1px solid rgba(201,168,76,.1);display:flex;flex-direction:column;overflow:hidden;min-width:0;}
.carousel-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:2px;background:rgba(201,168,76,.04);border:1px solid rgba(201,168,76,.06);}
.steps-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:2px;background:rgba(201,168,76,.04);margin-top:24px;}
.land-term-bar{background:#0e0e1c;padding:12px 18px;display:flex;align-items:center;gap:12px;border-bottom:1px solid rgba(201,168,76,.06);}
.land-term-dots{display:flex;gap:6px;}
.land-term-dot{width:10px;height:10px;border-radius:50%;background:rgba(201,168,76,.1);}
.land-term-dot:first-child{background:rgba(201,168,76,.28);}
.land-term-title{font-family:'JetBrains Mono',monospace;font-size:.56rem;letter-spacing:3px;color:#5a5868;text-transform:uppercase;flex:1;text-align:center;}
.land-term-body{padding:16px 18px;font-family:'JetBrains Mono',monospace;font-size:.65rem;line-height:1.8;min-height:240px;overflow:hidden;}
.tt-p{color:#c9a84c;}.tt-o{color:#4a7aaa;}.tt-s{color:#5a9070;}.tt-d{color:#181726;}.tt-m{color:#5a5868;}
.tt-cur{display:inline-block;width:7px;height:12px;background:#c9a84c;vertical-align:middle;margin-left:2px;animation:blink .9s infinite;}
.land-pills{border-top:1px solid rgba(201,168,76,.05);border-bottom:1px solid rgba(201,168,76,.05);padding:14px clamp(14px,4vw,60px);}
.land-pills-wrap{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;}
.land-pill{font-family:'JetBrains Mono',monospace;font-size:.6rem;letter-spacing:1.5px;text-transform:uppercase;color:#5a5868;padding:5px 12px;border:1px solid rgba(201,168,76,.07);}
.land-feat-row{padding:clamp(40px,6vw,80px) clamp(14px,4vw,60px);max-width:1280px;margin:0 auto;}
.land-feat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:2px;background:rgba(201,168,76,.04);border:1px solid rgba(201,168,76,.06);}
.land-feat{background:#07070e;padding:clamp(18px,3vw,32px) clamp(16px,2.5vw,28px);transition:background .25s;min-width:0;overflow:hidden;}
.land-feat:hover{background:#0c0c1a;}
.land-feat-r{font-family:'Cinzel',serif;font-size:2rem;color:rgba(201,168,76,.4);margin-bottom:14px;line-height:1;transition:color .25s;}
.land-feat:hover .land-feat-r{color:#c9a84c;}
.land-feat-name{font-family:'Cinzel',serif;font-size:.88rem;font-weight:700;color:#ddd8ce;margin-bottom:8px;}
.land-feat-desc{font-size:.78rem;font-weight:300;color:#5a5868;line-height:1.75;}
.land-cta-strip{background:#0a0a16;border-top:1px solid rgba(201,168,76,.06);border-bottom:1px solid rgba(201,168,76,.06);padding:clamp(40px,6vw,60px) clamp(14px,4vw,60px);text-align:center;}
.land-cta-h{font-family:'Cinzel',serif;font-size:clamp(1.8rem,3vw,2.8rem);font-weight:700;color:#ddd8ce;margin-bottom:12px;}
.land-cta-sub{font-size:.9rem;font-weight:300;color:#5a5868;margin-bottom:32px;}
.land-cta-btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;}
.land-footer{padding:24px clamp(14px,4vw,60px);border-top:1px solid rgba(201,168,76,.06);display:flex;align-items:center;justify-content:space-between;}
.land-footer-copy{font-family:'JetBrains Mono',monospace;font-size:.56rem;letter-spacing:1.5px;color:#3a3848;text-transform:uppercase;}
.land-footer-g{font-family:'Cinzel',serif;font-size:1.3rem;color:rgba(201,168,76,.08);}


/* ── FULL LANDING: STATS ── */
.land-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));border-top:1px solid rgba(201,168,76,.06);border-bottom:1px solid rgba(201,168,76,.06);}
.land-stat{padding:36px 24px;text-align:center;border-right:1px solid rgba(201,168,76,.06);}
.land-stat:last-child{border-right:none;}
.land-stat-n{font-family:'Cinzel',serif;font-size:2.2rem;font-weight:700;color:#c9a84c;line-height:1;margin-bottom:8px;}
.land-stat-l{font-family:'JetBrains Mono',monospace;font-size:.58rem;letter-spacing:2px;text-transform:uppercase;color:#6a6878;}
/* ── FULL LANDING: HOW IT WORKS ── */
.land-how{background:#09091a;border-top:1px solid rgba(201,168,76,.06);border-bottom:1px solid rgba(201,168,76,.06);padding:clamp(44px,7vw,90px) clamp(14px,4vw,60px);}
.land-how-inner{max-width:1280px;margin:0 auto;}
/* ── FULL LANDING: USE CASES ── */
.land-uc-section{padding:clamp(44px,7vw,90px) clamp(14px,4vw,60px);max-width:1280px;margin:0 auto;}
.land-uc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:2px;background:rgba(201,168,76,.04);border:1px solid rgba(201,168,76,.06);}
.land-uc-card{background:#07070e;padding:44px 38px;transition:background .25s;}
.land-uc-card:hover{background:#0c0c1a;}
.land-uc-who{font-family:'JetBrains Mono',monospace;font-size:.58rem;letter-spacing:3px;text-transform:uppercase;color:#c9a84c;opacity:.55;margin-bottom:8px;}
.land-uc-name{font-family:'Cinzel',serif;font-size:1.2rem;font-weight:700;color:#ddd8ce;margin-bottom:10px;}
.land-uc-desc{font-size:.86rem;font-weight:300;color:#5a5868;line-height:1.85;margin-bottom:18px;}
.land-uc-list{list-style:none;display:flex;flex-direction:column;gap:8px;}
.land-uc-li{display:flex;align-items:flex-start;gap:8px;font-size:.8rem;font-weight:300;color:#7a7888;}
.land-uc-g{color:#c9a84c;flex-shrink:0;font-family:'Cinzel',serif;}
/* ── FULL LANDING: PRICING ── */
.land-price-section{background:#09091a;border-top:1px solid rgba(201,168,76,.06);border-bottom:1px solid rgba(201,168,76,.06);padding:clamp(44px,7vw,90px) 0;}
.land-price-inner{max-width:1280px;margin:0 auto;padding:0 clamp(14px,4vw,60px);}
.land-price-label{font-family:'JetBrains Mono',monospace;font-size:.58rem;letter-spacing:3px;text-transform:uppercase;color:#c9a84c;opacity:.5;padding:20px 0 10px;display:flex;align-items:center;gap:14px;}
.land-price-label::after{content:'';flex:1;height:1px;background:rgba(201,168,76,.08);}
.land-price-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:2px;background:rgba(201,168,76,.04);border:1px solid rgba(201,168,76,.06);margin-bottom:2px;}
.land-plan{background:#09091a;padding:40px 32px;display:flex;flex-direction:column;position:relative;transition:background .2s;}
.land-plan:hover{background:#0d0d1e;}
.land-plan-featured{background:#0c0c1c;border:1px solid rgba(201,168,76,.17);z-index:1;}
.land-plan-badge{position:absolute;top:-1px;left:50%;transform:translateX(-50%);background:#c9a84c;color:#07070e;font-family:'JetBrains Mono',monospace;font-size:.54rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:4px 14px;white-space:nowrap;}
.land-plan-tier{font-family:'JetBrains Mono',monospace;font-size:.58rem;letter-spacing:3px;color:#6a6878;text-transform:uppercase;margin-bottom:14px;}
.land-plan-price{font-family:'Cinzel',serif;font-size:2.4rem;font-weight:700;color:#ddd8ce;line-height:1;margin-bottom:4px;}
.land-plan-price sub{font-size:.85rem;font-weight:400;color:#4a4858;vertical-align:middle;}
.land-plan-cycle{font-family:'JetBrains Mono',monospace;font-size:.58rem;letter-spacing:1.5px;color:#6a6878;text-transform:uppercase;margin-bottom:20px;}
.land-plan-feats{list-style:none;display:flex;flex-direction:column;gap:9px;margin-bottom:28px;flex:1;}
.land-plan-feat{display:flex;align-items:flex-start;gap:8px;font-size:.78rem;font-weight:300;color:#4a4858;line-height:1.4;}
.land-plan-feat-ic{color:#c9a84c;flex-shrink:0;font-family:'Cinzel',serif;font-size:.78rem;margin-top:1px;}
/* ── FULL LANDING: FAQ ── */
.land-faq-section{padding:clamp(44px,7vw,90px) clamp(14px,4vw,60px);max-width:860px;margin:0 auto;}
.land-faq-list{display:flex;flex-direction:column;margin-top:48px;}
.land-faq-item{border-bottom:1px solid rgba(201,168,76,.06);}
.land-faq-q{width:100%;background:none;border:none;cursor:pointer;font-family:'Cinzel',serif;font-size:.9rem;font-weight:600;color:#6a6878;padding:22px 0;display:flex;justify-content:space-between;align-items:center;gap:20px;text-align:left;transition:color .2s;}
.land-faq-q:hover,.land-faq-q-on{color:#ddd8ce;}
.land-faq-chev{font-family:'Cinzel',serif;font-size:1.2rem;color:#c9a84c;flex-shrink:0;transition:transform .3s;}
.land-faq-q-on .land-faq-chev{transform:rotate(45deg);}
.land-faq-a{max-height:0;overflow:hidden;transition:max-height .35s ease;}
.land-faq-a-on{max-height:260px;}
.land-faq-a p{padding-bottom:22px;font-size:.86rem;font-weight:300;color:#4a4858;line-height:1.9;}
/* ── FULL LANDING: SECTION COMMONS ── */
.land-sec{padding:clamp(44px,7vw,90px) clamp(14px,4vw,60px);max-width:1280px;margin:0 auto;}
.land-tag{font-family:'JetBrains Mono',monospace;font-size:.58rem;letter-spacing:4px;text-transform:uppercase;color:#c9a84c;opacity:.65;margin-bottom:14px;display:flex;align-items:center;gap:12px;}
.land-tag::before{content:'';width:24px;height:1px;background:#c9a84c;opacity:.4;}
.land-h2{font-family:'Cinzel',serif;font-size:clamp(1.8rem,2.9vw,2.8rem);font-weight:700;color:#ddd8ce;line-height:1.12;margin-bottom:14px;}
.land-sub-txt{font-size:.92rem;font-weight:300;color:#5a5868;line-height:1.88;max-width:500px;margin-bottom:56px;}
/* ── FULL LANDING: REVIEWS ── */
.land-reviews-section{background:#09091a;border-top:1px solid rgba(201,168,76,.06);border-bottom:1px solid rgba(201,168,76,.06);padding:clamp(44px,7vw,90px) clamp(14px,4vw,60px);}
.land-reviews-inner{max-width:1280px;margin:0 auto;}
@media(max-width:900px){
  .land-stats{grid-template-columns:repeat(3,1fr);}
  .land-stat:nth-child(4),.land-stat:nth-child(5){border-top:1px solid rgba(201,168,76,.06);}
  .land-how,.land-reviews-section,.land-price-section{padding:70px 28px;}
  .land-how-inner,.land-reviews-inner,.land-price-inner{padding:0;}
  .land-uc-section,.land-sec,.land-faq-section{padding:70px 28px;}
  .land-uc-grid{grid-template-columns:1fr;}
  .land-price-row{grid-template-columns:1fr;}
  .land-plan-feat{margin:0;}
  .land-pills{padding:16px 28px;}
}

/* ── APP SHELL ── */
.app{display:flex;height:100vh;background:#07070e;color:#ddd8ce;font-family:'DM Sans',sans-serif;overflow:hidden;}
.sb{width:224px;flex-shrink:0;background:#07070e;border-right:1px solid rgba(201,168,76,.07);display:flex;flex-direction:column;height:100vh;}
.sb-logo{padding:18px 20px;display:flex;align-items:center;gap:10px;border-bottom:1px solid rgba(201,168,76,.06);}
.sb-logo-g{font-family:'Cinzel',serif;font-size:1.4rem;color:#c9a84c;line-height:1;}
.sb-logo-txt{font-family:'Cinzel',serif;font-size:.78rem;font-weight:700;letter-spacing:3px;color:#ddd8ce;}
.sb-nav{flex:1;padding:8px 0;overflow-y:auto;}
.sb-section{padding:14px 20px 4px;font-family:'JetBrains Mono',monospace;font-size:.52rem;letter-spacing:3px;text-transform:uppercase;color:#4a4858;}
.sb-item{display:flex;align-items:center;gap:11px;padding:9px 20px;cursor:pointer;transition:background .15s;position:relative;}
.sb-item:hover{background:rgba(201,168,76,.04);}
.sb-item.on{background:rgba(201,168,76,.07);}
.sb-item.on::before{content:'';position:absolute;left:0;top:0;bottom:0;width:2px;background:#c9a84c;}
.sb-rune{font-family:'Cinzel',serif;font-size:.95rem;color:rgba(201,168,76,.28);width:18px;text-align:center;flex-shrink:0;}
.sb-item.on .sb-rune{color:#c9a84c;}
.sb-item:hover .sb-rune{color:rgba(201,168,76,.5);}
.sb-label{font-family:'JetBrains Mono',monospace;font-size:.62rem;letter-spacing:1.5px;text-transform:uppercase;color:#4a4858;}
.sb-item.on .sb-label{color:#9a96a2;}
.sb-item:hover .sb-label{color:#6a6878;}
.sb-badge{margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:.52rem;background:rgba(201,168,76,.12);color:#c9a84c;padding:2px 6px;}
.sb-cs{font-size:.52rem;margin-left:auto;font-family:'JetBrains Mono',monospace;letter-spacing:1px;color:#6a6878;}
.sb-user{padding:14px 20px;border-top:1px solid rgba(201,168,76,.06);display:flex;align-items:center;gap:10px;}
.sb-av{width:28px;height:28px;background:rgba(201,168,76,.1);display:flex;align-items:center;justify-content:center;font-family:'Cinzel',serif;font-size:.72rem;color:#c9a84c;flex-shrink:0;}
.sb-uname{font-size:.78rem;font-weight:500;color:#6a6878;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.sb-out{font-family:'JetBrains Mono',monospace;font-size:.54rem;color:#6a6878;cursor:pointer;transition:color .2s;letter-spacing:1px;}
.sb-out:hover{color:#c9a84c;}
.main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;}
.topbar{height:52px;background:#07070e;border-bottom:1px solid rgba(201,168,76,.06);display:flex;align-items:center;padding:0 24px;gap:14px;flex-shrink:0;}
.topbar-title{font-family:'Cinzel',serif;font-size:.9rem;font-weight:700;color:#ddd8ce;flex:1;}
.topbar-tag{font-family:'JetBrains Mono',monospace;font-size:.56rem;letter-spacing:2px;text-transform:uppercase;color:#6a6878;}
.content{flex:1;overflow-y:auto;padding:24px;}

/* ── AUTH ── */
.auth{height:100vh;display:flex;align-items:center;justify-content:center;background:#07070e;}
.auth-card{width:min(380px,calc(100vw - 32px));background:#0d0d18;border:1px solid rgba(201,168,76,.1);padding:clamp(20px,5vw,36px);}
.auth-logo{display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:28px;}
.auth-logo-g{font-family:'Cinzel',serif;font-size:2rem;color:#c9a84c;}
.auth-logo-txt{font-family:'Cinzel',serif;font-size:1rem;font-weight:700;letter-spacing:4px;color:#ddd8ce;}
.auth-title{font-family:'Cinzel',serif;font-size:1.1rem;font-weight:700;color:#ddd8ce;text-align:center;margin-bottom:5px;}
.auth-sub{font-size:.8rem;font-weight:300;color:#4a4858;text-align:center;margin-bottom:24px;}
.auth-err{background:rgba(192,80,96,.1);border:1px solid rgba(192,80,96,.2);color:#e07888;font-family:'JetBrains Mono',monospace;font-size:.62rem;letter-spacing:1px;padding:10px 14px;margin-bottom:14px;}
.auth-toggle{text-align:center;margin-top:16px;font-size:.78rem;font-weight:300;color:#7a7888;}
.auth-toggle button{background:none;border:none;color:#c9a84c;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.78rem;}

/* ── FORM ── */
.field{margin-bottom:14px;}
.field label{display:block;font-family:'JetBrains Mono',monospace;font-size:.58rem;letter-spacing:2px;text-transform:uppercase;color:#4a4858;margin-bottom:6px;}
.inp{width:100%;background:#0a0a14;border:1px solid rgba(201,168,76,.1);color:#ddd8ce;font-family:'DM Sans',sans-serif;font-size:.85rem;padding:9px 13px;outline:none;transition:border-color .2s;}
.inp:focus{border-color:rgba(201,168,76,.3);}
.inp::placeholder{color:#6a6878;}
select.inp{cursor:pointer;}
textarea.inp{resize:vertical;min-height:80px;}

/* ── BUTTONS ── */
.btn{font-family:'JetBrains Mono',monospace;font-size:.62rem;letter-spacing:2px;text-transform:uppercase;cursor:pointer;padding:9px 18px;border:none;transition:all .2s;display:inline-flex;align-items:center;justify-content:center;gap:7px;}
.btn-gold{background:#c9a84c;color:#07070e;}
.btn-gold:hover{background:#d4b55e;}
.btn-gold:disabled{background:rgba(201,168,76,.25);cursor:not-allowed;}
.btn-ghost{background:none;color:#4a4858;border:1px solid rgba(74,72,88,.3);}
.btn-ghost:hover{color:#ddd8ce;border-color:rgba(221,216,206,.2);}
.btn-danger{background:none;color:#c05060;border:1px solid rgba(192,80,96,.25);}
.btn-danger:hover{background:rgba(192,80,96,.07);}
.btn-outline-gold{background:none;color:#c9a84c;border:1px solid rgba(201,168,76,.3);}
.btn-outline-gold:hover{background:rgba(201,168,76,.07);}
.btn-sm{padding:5px 12px;font-size:.56rem;}
.btn-xs{padding:4px 8px;font-size:.52rem;}
.btn-lg{padding:13px 36px;font-size:.7rem;}
.btn-lg-gold{background:#c9a84c;color:#07070e;border:none;}
.btn-lg-gold:hover{background:#d4b55e;}
.btn-lg-out{background:transparent;color:#7a7888;border:1px solid rgba(138,135,152,.2);}
.btn-lg-out:hover{color:#ddd8ce;border-color:rgba(221,216,206,.25);}
.land-hero-badge{display:inline-flex;align-items:center;gap:10px;border:1px solid rgba(201,168,76,.2);padding:6px 16px;margin-bottom:28px;font-family:'JetBrains Mono',monospace;font-size:.6rem;letter-spacing:2.5px;color:#c9a84c;}
.btn-full{width:100%;padding:11px;}

/* ── CARDS ── */
.card{background:#0d0d18;border:1px solid rgba(201,168,76,.08);padding:20px;}
.card-title{font-family:'Cinzel',serif;font-size:.88rem;font-weight:700;color:#ddd8ce;margin-bottom:3px;}
.card-sub{font-family:'JetBrains Mono',monospace;font-size:.56rem;letter-spacing:2px;text-transform:uppercase;color:#6a6878;}

/* ── DASHBOARD SPECIFIC ── */
.dash-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:20px;}
.metric-card{background:#0d0d18;border:1px solid rgba(201,168,76,.08);padding:18px;position:relative;overflow:hidden;}
.metric-card::after{content:'';position:absolute;top:0;left:0;right:0;height:2px;opacity:.4;}
.metric-gold::after{background:#c9a84c;}.metric-blue::after{background:#4a7aaa;}
.metric-green::after{background:#5a9070;}.metric-purple::after{background:#9060b8;}
.metric-teal::after{background:#40a0a0;}
.metric-n{font-family:'Cinzel',serif;font-size:1.9rem;font-weight:700;color:#ddd8ce;line-height:1;margin-bottom:4px;}
.metric-l{font-family:'JetBrains Mono',monospace;font-size:.54rem;letter-spacing:2px;color:#6a6878;text-transform:uppercase;margin-bottom:6px;}
.metric-trend{font-family:'JetBrains Mono',monospace;font-size:.6rem;color:#5a9070;letter-spacing:1px;}
.metric-trend.down{color:#c05060;}
.metric-trend.neutral{color:#4a4858;}
.charts-row{display:grid;grid-template-columns:2fr 1fr;gap:12px;margin-bottom:16px;}
.chart-card{background:#0d0d18;border:1px solid rgba(201,168,76,.08);padding:20px;}
.chart-title{font-family:'Cinzel',serif;font-size:.85rem;font-weight:700;color:#ddd8ce;margin-bottom:3px;}
.chart-sub{font-family:'JetBrains Mono',monospace;font-size:.54rem;letter-spacing:2px;color:#6a6878;text-transform:uppercase;margin-bottom:16px;}
.charts-row-2{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:16px;}
.funnel-wrap{display:flex;flex-direction:column;gap:6px;margin-top:8px;}
.funnel-row{display:flex;align-items:center;gap:10px;}
.funnel-label{font-family:'JetBrains Mono',monospace;font-size:.58rem;letter-spacing:1px;text-transform:uppercase;color:#7a7888;width:110px;flex-shrink:0;}
.funnel-bar-wrap{flex:1;background:rgba(201,168,76,.04);height:20px;position:relative;}
.funnel-bar{height:100%;transition:width .6s ease;}
.funnel-count{font-family:'JetBrains Mono',monospace;font-size:.6rem;color:#5a5868;width:24px;text-align:right;flex-shrink:0;}
.activity-list{display:flex;flex-direction:column;gap:0;}
.activity-item{display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid rgba(201,168,76,.04);}
.activity-item:last-child{border-bottom:none;}
.activity-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:4px;}
.activity-txt{font-size:.78rem;font-weight:300;color:#6a6878;line-height:1.5;flex:1;}
.activity-txt strong{color:#9a96a2;font-weight:400;}
.activity-time{font-family:'JetBrains Mono',monospace;font-size:.54rem;color:#6a6878;flex-shrink:0;}
.score-dist-wrap{display:flex;flex-direction:column;gap:8px;margin-top:8px;}
.score-dist-row{display:flex;align-items:center;gap:8px;}
.score-dist-label{font-family:'JetBrains Mono',monospace;font-size:.56rem;letter-spacing:1px;color:#7a7888;width:40px;flex-shrink:0;}
.score-dist-bar{flex:1;height:14px;background:rgba(201,168,76,.04);}
.score-dist-fill{height:100%;transition:width .5s ease;}
.score-dist-n{font-family:'JetBrains Mono',monospace;font-size:.56rem;color:#4a4858;width:16px;text-align:right;}
.legend{display:flex;gap:14px;flex-wrap:wrap;margin-top:10px;}
.legend-item{display:flex;align-items:center;gap:6px;font-family:'JetBrains Mono',monospace;font-size:.56rem;letter-spacing:1px;text-transform:uppercase;color:#7a7888;}
.legend-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.custom-tooltip{background:#0d0d18;border:1px solid rgba(201,168,76,.15);padding:10px 14px;}
.tooltip-label{font-family:'JetBrains Mono',monospace;font-size:.6rem;letter-spacing:1.5px;color:#7a7888;text-transform:uppercase;margin-bottom:5px;}
.tooltip-val{font-family:'Cinzel',serif;font-size:.9rem;font-weight:700;color:#c9a84c;}

/* ── BADGES ── */
.badge{font-family:'JetBrains Mono',monospace;font-size:.54rem;letter-spacing:1.5px;text-transform:uppercase;padding:3px 7px;display:inline-block;}
.b-gold{background:rgba(201,168,76,.1);color:#c9a84c;border:1px solid rgba(201,168,76,.18);}
.b-blue{background:rgba(74,122,200,.1);color:#7aaaf0;border:1px solid rgba(74,122,200,.18);}
.b-green{background:rgba(90,144,112,.1);color:#7ac89a;border:1px solid rgba(90,144,112,.18);}
.b-red{background:rgba(192,80,96,.1);color:#e07888;border:1px solid rgba(192,80,96,.18);}
.b-purple{background:rgba(130,90,180,.1);color:#b88ae8;border:1px solid rgba(130,90,180,.18);}
.b-teal{background:rgba(64,160,160,.1);color:#6ae0d8;border:1px solid rgba(64,160,160,.18);}
.b-gray{background:rgba(90,88,104,.1);color:#8a8898;border:1px solid rgba(90,88,104,.18);}

/* ── TABLES ── */
.tbl-wrap{overflow-x:auto;}
table{width:100%;border-collapse:collapse;}
th{font-family:'JetBrains Mono',monospace;font-size:.56rem;letter-spacing:2px;text-transform:uppercase;color:#6a6878;padding:9px 12px;text-align:left;border-bottom:1px solid rgba(201,168,76,.06);background:#0a0a14;white-space:nowrap;}
td{font-size:.8rem;font-weight:300;color:#9a96a2;padding:10px 12px;border-bottom:1px solid rgba(201,168,76,.04);vertical-align:middle;}
tr:hover td{background:rgba(201,168,76,.02);cursor:pointer;}
.td-main{color:#ddd8ce;font-weight:400;}

/* ── TABS ── */
.tabs{display:flex;border-bottom:1px solid rgba(201,168,76,.08);margin-bottom:18px;}
.tab{font-family:'JetBrains Mono',monospace;font-size:.6rem;letter-spacing:2px;text-transform:uppercase;padding:9px 16px;cursor:pointer;color:#6a6878;border-bottom:2px solid transparent;margin-bottom:-1px;transition:all .2s;background:none;border-left:none;border-right:none;border-top:none;}
.tab:hover{color:#6a6878;}
.tab.on{color:#c9a84c;border-bottom-color:#c9a84c;}

/* ── MISC ── */
.spinner{width:18px;height:18px;border:2px solid rgba(201,168,76,.15);border-top-color:#c9a84c;border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0;}
.spin-lg{width:30px;height:30px;border-width:3px;}
.toast-dock{position:fixed;bottom:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none;}
.toast{background:#0d0d18;border:1px solid rgba(201,168,76,.14);padding:11px 16px;display:flex;align-items:center;gap:10px;min-width:240px;animation:toast-in .2s ease;pointer-events:auto;}
.toast-icon{font-family:'Cinzel',serif;font-size:.9rem;flex-shrink:0;}
.t-success .toast-icon{color:#7ac89a;}.t-error .toast-icon{color:#e07888;}.t-info .toast-icon{color:#c9a84c;}
.toast-msg{font-size:.8rem;font-weight:300;color:#9a96a2;flex:1;}
.sh{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
.sh-title{font-family:'Cinzel',serif;font-size:1rem;font-weight:700;color:#ddd8ce;}
.sh-sub{font-family:'JetBrains Mono',monospace;font-size:.54rem;letter-spacing:2px;color:#6a6878;text-transform:uppercase;margin-top:2px;}
.sh-right{display:flex;gap:8px;align-items:center;}
.empty{padding:48px 20px;text-align:center;}
.empty-rune{font-family:'Cinzel',serif;font-size:3rem;color:rgba(201,168,76,.12);margin-bottom:14px;}
.empty-title{font-family:'Cinzel',serif;font-size:.95rem;color:#4a4858;margin-bottom:6px;}
.empty-sub{font-size:.78rem;font-weight:300;color:#6a6878;max-width:280px;margin:0 auto 18px;line-height:1.7;}
.divider{height:1px;background:rgba(201,168,76,.06);margin:14px 0;}
.chip{display:inline-flex;align-items:center;gap:6px;font-family:'JetBrains Mono',monospace;font-size:.56rem;letter-spacing:1px;text-transform:uppercase;padding:3px 8px;border:1px solid rgba(201,168,76,.08);color:#6a6878;}
::-webkit-scrollbar{width:3px;height:3px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:rgba(201,168,76,.12);}

/* ── SCANNER ── */
.scan-form{background:#0d0d18;border:1px solid rgba(201,168,76,.08);padding:20px;margin-bottom:16px;}
.scan-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;align-items:end;flex-wrap:wrap;}
.pros-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;}
.pc{background:#0d0d18;border:1px solid rgba(201,168,76,.08);padding:18px;transition:border-color .2s;}
.pc:hover{border-color:rgba(201,168,76,.16);}
.pc-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;}
.pc-name{font-family:'Cinzel',serif;font-size:.88rem;font-weight:700;color:#ddd8ce;flex:1;margin-right:10px;}
.pc-meta{font-family:'JetBrains Mono',monospace;font-size:.56rem;color:#6a6878;letter-spacing:1px;margin-bottom:8px;}
.pc-rating{display:flex;align-items:center;gap:6px;margin-bottom:6px;}
.pc-stars{color:#c9a84c;font-size:.72rem;letter-spacing:3px;}
.pc-rn{font-family:'JetBrains Mono',monospace;font-size:.6rem;color:#4a4858;}
.pc-desc{font-size:.78rem;font-weight:300;color:#4a4858;line-height:1.6;margin-bottom:10px;}
.pc-tags{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:12px;}
.pc-tag{font-family:'JetBrains Mono',monospace;font-size:.52rem;letter-spacing:1px;text-transform:uppercase;padding:3px 7px;border:1px solid rgba(201,168,76,.08);color:#6a6878;}
.pc-actions{display:flex;gap:6px;flex-wrap:wrap;}

/* ── CRM ── */
.pipe-strip{display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:6px;margin-bottom:16px;}
.pipe-col{background:#0a0a14;border:1px solid rgba(201,168,76,.05);padding:12px;text-align:center;}
.pipe-n{font-family:'Cinzel',serif;font-size:1.5rem;font-weight:700;color:#c9a84c;}
.pipe-l{font-family:'JetBrains Mono',monospace;font-size:.52rem;letter-spacing:1.5px;text-transform:uppercase;color:#6a6878;margin-top:3px;}
.crm-filters{display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;}
.crm-f{font-family:'JetBrains Mono',monospace;font-size:.58rem;letter-spacing:1.5px;text-transform:uppercase;padding:5px 12px;cursor:pointer;background:#0a0a14;border:1px solid rgba(201,168,76,.06);color:#6a6878;transition:all .2s;}
.crm-f:hover{color:#6a6878;border-color:rgba(201,168,76,.14);}
.crm-f.on{color:#c9a84c;border-color:rgba(201,168,76,.28);background:rgba(201,168,76,.05);}
.drawer-bg{position:fixed;inset:0;background:rgba(7,7,14,.6);z-index:200;}
.drawer{position:fixed;right:0;top:0;bottom:0;width:min(400px,92vw);background:#0d0d18;border-left:1px solid rgba(201,168,76,.1);z-index:201;overflow-y:auto;padding:22px;}
.dr-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:18px;border-bottom:1px solid rgba(201,168,76,.07);}
.dr-close{font-family:'Cinzel',serif;font-size:1.1rem;color:#6a6878;cursor:pointer;padding:4px 8px;transition:color .2s;background:none;border:none;}
.dr-close:hover{color:#c9a84c;}
.dr-field{margin-bottom:14px;}
.dr-label{font-family:'JetBrains Mono',monospace;font-size:.56rem;letter-spacing:2px;text-transform:uppercase;color:#6a6878;margin-bottom:5px;}
.dr-val{font-size:.82rem;font-weight:300;color:#9a96a2;line-height:1.65;}
.dr-status-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:6px;}
.dr-sb{font-family:'JetBrains Mono',monospace;font-size:.54rem;letter-spacing:1px;text-transform:uppercase;padding:6px 8px;cursor:pointer;background:#0a0a14;border:1px solid rgba(201,168,76,.07);color:#6a6878;transition:all .2s;text-align:center;}
.dr-sb:hover{color:#9a96a2;border-color:rgba(201,168,76,.15);}
.dr-sb.on{color:#c9a84c;border-color:rgba(201,168,76,.3);background:rgba(201,168,76,.06);}

/* ── PITCH ── */
.pitch-layout{display:grid;grid-template-columns:300px 1fr;gap:12px;height:calc(100vh - 108px);}
.pitch-panel{background:#0d0d18;border:1px solid rgba(201,168,76,.08);padding:18px;overflow-y:auto;}
.pitch-out{background:#0d0d18;border:1px solid rgba(201,168,76,.08);padding:18px;display:flex;flex-direction:column;overflow:hidden;}
.pitch-body{flex:1;overflow-y:auto;}
.pitch-txt{font-size:.84rem;font-weight:300;color:#9a96a2;line-height:1.95;white-space:pre-wrap;}
.pitch-copy-row{display:flex;justify-content:flex-end;gap:8px;padding-top:12px;margin-top:12px;border-top:1px solid rgba(201,168,76,.06);}
.tone-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:14px;}
.tone-btn{background:#0a0a14;border:1px solid rgba(201,168,76,.07);padding:9px 10px;cursor:pointer;text-align:center;transition:all .2s;}
.tone-btn:hover{border-color:rgba(201,168,76,.18);}
.tone-btn.on{border-color:rgba(201,168,76,.35);background:rgba(201,168,76,.05);}
.tone-name{font-family:'Cinzel',serif;font-size:.76rem;font-weight:600;color:#6a6878;margin-bottom:2px;}
.tone-btn.on .tone-name{color:#c9a84c;}
.tone-desc{font-size:.68rem;font-weight:300;color:#6a6878;}

/* ── SITE BUILDER ── */
.builder-wrap{display:grid;grid-template-columns:360px 1fr;height:calc(100vh - 108px);border:1px solid rgba(201,168,76,.08);}
.builder-chat{border-right:1px solid rgba(201,168,76,.08);display:flex;flex-direction:column;background:#0a0a14;overflow:hidden;}
.builder-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;}
.bmsg{max-width:92%;}
.bmsg-user{align-self:flex-end;}
.bmsg-ai{align-self:flex-start;}
.bmsg-label{font-family:'JetBrains Mono',monospace;font-size:.52rem;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;}
.bmsg-label-user{color:rgba(201,168,76,.45);text-align:right;}
.bmsg-label-ai{color:#6a6878;}
.bmsg-bubble{padding:10px 13px;}
.bmsg-user .bmsg-bubble{background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.14);}
.bmsg-ai .bmsg-bubble{background:#0d0d18;border:1px solid rgba(201,168,76,.06);}
.bmsg-txt{font-size:.8rem;font-weight:300;color:#9a96a2;line-height:1.65;}
.builder-inp-row{padding:12px 14px;border-top:1px solid rgba(201,168,76,.06);display:flex;gap:8px;align-items:flex-end;}
.builder-inp{flex:1;background:#0d0d18;border:1px solid rgba(201,168,76,.1);color:#ddd8ce;font-family:'DM Sans',sans-serif;font-size:.82rem;padding:9px 12px;outline:none;resize:none;min-height:40px;max-height:120px;}
.builder-inp:focus{border-color:rgba(201,168,76,.28);}
.builder-prev{background:#f0f0f0;display:flex;flex-direction:column;overflow:hidden;}
.builder-prev-bar{background:#07070e;border-bottom:1px solid rgba(201,168,76,.06);padding:10px 16px;display:flex;align-items:center;gap:10px;flex-shrink:0;}
.builder-prev-bar-title{font-family:'JetBrains Mono',monospace;font-size:.58rem;letter-spacing:2px;color:#6a6878;text-transform:uppercase;flex:1;}
.builder-prev-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#07070e;gap:12px;}
.builder-prev-empty-r{font-family:'Cinzel',serif;font-size:3rem;color:rgba(201,168,76,.1);}
.builder-prev-empty-t{font-family:'Cinzel',serif;font-size:.88rem;color:#6a6878;}
.builder-prev-empty-s{font-size:.76rem;font-weight:300;color:#4a4858;max-width:220px;text-align:center;line-height:1.65;}

/* ── COMING SOON ── */
.cs-wrap{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 24px;text-align:center;min-height:60vh;}
.cs-rune{font-family:'Cinzel',serif;font-size:3.5rem;color:rgba(201,168,76,.12);margin-bottom:16px;line-height:1;}
.cs-title{font-family:'Cinzel',serif;font-size:1.3rem;font-weight:700;color:#ddd8ce;margin-bottom:8px;}
.cs-sub{font-size:.88rem;font-weight:300;color:#4a4858;max-width:380px;line-height:1.8;margin-bottom:24px;}
.cs-list{display:grid;grid-template-columns:1fr 1fr;gap:7px;max-width:460px;width:100%;margin-bottom:24px;}
.cs-item{background:#0d0d18;border:1px solid rgba(201,168,76,.07);padding:10px 14px;display:flex;align-items:center;gap:9px;}
.cs-item-g{font-family:'Cinzel',serif;font-size:.85rem;color:rgba(201,168,76,.3);}
.cs-item-t{font-size:.76rem;font-weight:300;color:#4a4858;}
.cs-eta{font-family:'JetBrains Mono',monospace;font-size:.58rem;letter-spacing:2px;color:rgba(201,168,76,.35);text-transform:uppercase;}


/* ── DOMAINS PAGE ── */
.domain-search-bar{display:flex;gap:10px;margin-bottom:20px;align-items:center;}
.domain-search-inp{flex:1;background:#0a0a14;border:1px solid rgba(201,168,76,.12);color:#ddd8ce;font-family:'DM Sans',sans-serif;font-size:.9rem;padding:11px 16px;outline:none;transition:border-color .2s;}
.domain-search-inp:focus{border-color:rgba(201,168,76,.3);}
.domain-results{display:flex;flex-direction:column;gap:8px;margin-bottom:24px;}
.domain-result{background:#0d0d18;border:1px solid rgba(201,168,76,.08);padding:16px 18px;display:flex;align-items:center;gap:14px;transition:border-color .2s;}
.domain-result:hover{border-color:rgba(201,168,76,.18);}
.domain-result-name{font-family:'Cinzel',serif;font-size:.95rem;font-weight:700;color:#ddd8ce;flex:1;}
.domain-result-price{font-family:'Cinzel',serif;font-size:1rem;font-weight:700;color:#c9a84c;flex-shrink:0;}
.domain-result-status{font-family:'JetBrains Mono',monospace;font-size:.56rem;letter-spacing:1.5px;text-transform:uppercase;flex-shrink:0;}
.domain-status-avail{color:#7ac89a;}
.domain-status-taken{color:#e07888;}
.domain-section{background:#0d0d18;border:1px solid rgba(201,168,76,.08);padding:20px;margin-bottom:14px;}
.domain-section-title{font-family:'Cinzel',serif;font-size:.9rem;font-weight:700;color:#ddd8ce;margin-bottom:4px;}
.domain-section-sub{font-family:'JetBrains Mono',monospace;font-size:.54rem;letter-spacing:2px;text-transform:uppercase;color:#2e2d3c;margin-bottom:16px;}
.dns-table{width:100%;border-collapse:collapse;margin-top:10px;}
.dns-table th{font-family:'JetBrains Mono',monospace;font-size:.54rem;letter-spacing:2px;text-transform:uppercase;color:#2e2d3c;padding:8px 10px;text-align:left;border-bottom:1px solid rgba(201,168,76,.06);background:#0a0a14;}
.dns-table td{font-size:.78rem;color:#9a96a2;padding:9px 10px;border-bottom:1px solid rgba(201,168,76,.03);}
.dns-table input{width:100%;background:transparent;border:none;color:#9a96a2;font-family:'JetBrains Mono',monospace;font-size:.72rem;outline:none;}
.dns-table input:focus{color:#ddd8ce;}

/* ── CREATOR PROGRAM ── */
.creator-hero{background:#09091a;border:1px solid rgba(201,168,76,.08);padding:40px;margin-bottom:16px;text-align:center;}
.creator-hero-rune{font-family:'Cinzel',serif;font-size:3rem;color:rgba(201,168,76,.2);margin-bottom:14px;line-height:1;}
.creator-hero-title{font-family:'Cinzel',serif;font-size:1.4rem;font-weight:700;color:#ddd8ce;margin-bottom:8px;}
.creator-hero-sub{font-size:.88rem;font-weight:300;color:#5a5868;max-width:480px;margin:0 auto 24px;line-height:1.8;}
.creator-tiers{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-bottom:20px;}
.creator-tier{background:#0d0d18;border:1px solid rgba(201,168,76,.08);padding:24px;text-align:center;transition:border-color .2s;}
.creator-tier:hover{border-color:rgba(201,168,76,.2);}
.creator-tier-name{font-family:'Cinzel',serif;font-size:1.1rem;font-weight:700;color:#c9a84c;margin-bottom:4px;}
.creator-tier-req{font-family:'JetBrains Mono',monospace;font-size:.6rem;letter-spacing:2px;text-transform:uppercase;color:#3a3848;margin-bottom:12px;}
.creator-tier-features{list-style:none;display:flex;flex-direction:column;gap:7px;margin-bottom:16px;}
.creator-tier-feat{font-size:.78rem;font-weight:300;color:#5a5868;display:flex;align-items:flex-start;gap:7px;}
.creator-tier-feat-ic{color:#c9a84c;font-family:'Cinzel',serif;flex-shrink:0;}
.app-list{display:flex;flex-direction:column;gap:8px;}
.app-card{background:#0d0d18;border:1px solid rgba(201,168,76,.08);padding:16px 18px;display:flex;align-items:center;gap:14px;transition:border-color .2s;}
.app-card:hover{border-color:rgba(201,168,76,.16);}
.app-status{font-family:'JetBrains Mono',monospace;font-size:.56rem;letter-spacing:1.5px;text-transform:uppercase;margin-left:auto;flex-shrink:0;}
.app-name{font-family:'Cinzel',serif;font-size:.88rem;font-weight:700;color:#ddd8ce;}
.app-meta{font-family:'JetBrains Mono',monospace;font-size:.58rem;letter-spacing:1px;color:#3a3848;margin-top:3px;}
.app-handle{font-size:.78rem;font-weight:300;color:#5a5868;}

/* ── MOBILE NAV ── */
.mobile-nav-bar{display:none;height:52px;background:#07070e;border-bottom:1px solid rgba(201,168,76,.06);align-items:center;padding:0 16px;gap:14px;flex-shrink:0;}
.mobile-logo{font-family:'Cinzel',serif;font-size:.85rem;font-weight:700;letter-spacing:3px;color:#ddd8ce;display:flex;align-items:center;gap:8px;flex:1;}
.mobile-logo-g{color:#c9a84c;font-size:1.2rem;}
.hamburger{background:none;border:none;cursor:pointer;padding:6px;display:flex;flex-direction:column;gap:4px;}
.hamburger span{width:20px;height:2px;background:#c9a84c;display:block;transition:all .2s;}
.mobile-menu{position:fixed;inset:0;background:rgba(7,7,14,.95);z-index:500;display:flex;flex-direction:column;padding:20px;animation:fadein .2s ease;}
.mobile-menu-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid rgba(201,168,76,.08);}
.mobile-menu-close{background:none;border:none;color:#c9a84c;font-family:'Cinzel',serif;font-size:1.2rem;cursor:pointer;padding:4px 8px;}
.mobile-nav-item{display:flex;align-items:center;gap:12px;padding:14px 8px;border-bottom:1px solid rgba(201,168,76,.04);cursor:pointer;transition:background .15s;}
.mobile-nav-item:hover{background:rgba(201,168,76,.05);}
.mobile-nav-rune{font-family:'Cinzel',serif;font-size:1.1rem;color:rgba(201,168,76,.4);width:22px;}
.mobile-nav-label{font-family:'JetBrains Mono',monospace;font-size:.65rem;letter-spacing:1.5px;text-transform:uppercase;color:#7a7888;}
@media(max-width:620px){
  .sb{display:none !important;}
  .mobile-nav-bar{display:flex !important;}
  .topbar .topbar-title{display:none;}
}

/* ── LOADING SKELETONS ── */
@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
.skeleton{background:linear-gradient(90deg,#0d0d18 25%,#141428 50%,#0d0d18 75%);background-size:800px 100%;animation:shimmer 1.5s infinite;border-radius:2px;}
.skeleton-card{height:180px;margin-bottom:10px;}
.skeleton-line{height:12px;margin-bottom:8px;}
.skeleton-line-short{height:12px;width:60%;margin-bottom:8px;}
.skel-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;}

/* ── NOTIFICATIONS ── */
.notif-dot{width:7px;height:7px;background:#c9a84c;border-radius:50%;flex-shrink:0;}
.notif-item{display:flex;align-items:flex-start;gap:10px;padding:12px 0;border-bottom:1px solid rgba(201,168,76,.04);}
.notif-item:last-child{border-bottom:none;}
.notif-txt{font-size:.8rem;font-weight:300;color:#7a7888;line-height:1.5;flex:1;}
.notif-txt strong{color:#9a96a2;font-weight:400;}
.notif-time{font-family:'JetBrains Mono',monospace;font-size:.54rem;color:#2e2d3c;flex-shrink:0;}

/* ── LANDING CREATOR SECTION ── */
.land-creator{padding:clamp(44px,7vw,90px) clamp(14px,4vw,60px);max-width:1280px;margin:0 auto;}
.land-creator-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:2px;background:rgba(201,168,76,.04);border:1px solid rgba(201,168,76,.06);}
.land-creator-card{background:#07070e;padding:40px 34px;transition:background .25s;}
.land-creator-card:hover{background:#0c0c1a;}
.land-creator-card-tier{font-family:'JetBrains Mono',monospace;font-size:.58rem;letter-spacing:3px;text-transform:uppercase;color:#c9a84c;opacity:.55;margin-bottom:10px;}
.land-creator-card-name{font-family:'Cinzel',serif;font-size:1.1rem;font-weight:700;color:#ddd8ce;margin-bottom:6px;}
.land-creator-card-req{font-family:'JetBrains Mono',monospace;font-size:.6rem;letter-spacing:1.5px;text-transform:uppercase;color:#3a3848;margin-bottom:14px;}
.land-creator-card-feats{list-style:none;display:flex;flex-direction:column;gap:8px;margin-bottom:18px;}
.land-creator-card-feat{font-size:.8rem;font-weight:300;color:#5a5868;display:flex;align-items:flex-start;gap:7px;line-height:1.4;}


/* ── DEMO MODE ── */
.demo-banner{background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.2);padding:10px 18px;display:flex;align-items:center;gap:12px;margin-bottom:16px;}
.demo-badge{font-family:'JetBrains Mono',monospace;font-size:.58rem;letter-spacing:2px;text-transform:uppercase;color:#c9a84c;background:rgba(201,168,76,.15);padding:3px 10px;}
.demo-txt{font-size:.8rem;font-weight:300;color:#7a7888;flex:1;}

/* ── CITY PICKER ── */
.city-picker-wrap{position:relative;}
.city-suggestions{position:absolute;top:100%;left:0;right:0;background:#0d0d18;border:1px solid rgba(201,168,76,.2);border-top:none;z-index:200;max-height:200px;overflow-y:auto;}
.city-suggestion{padding:9px 14px;font-size:.82rem;color:#9a96a2;cursor:pointer;transition:background .15s;display:flex;align-items:center;gap:8px;}
.city-suggestion:hover{background:rgba(201,168,76,.07);color:#ddd8ce;}
.city-suggestion-flag{font-size:.88rem;}
.city-loc-btn{background:none;border:none;cursor:pointer;padding:0 8px;color:#c9a84c;font-size:.9rem;transition:opacity .2s;}
.city-loc-btn:hover{opacity:.7;}

/* ── MAP VIEW ── */
.map-container{background:#0a0a14;border:1px solid rgba(201,168,76,.08);height:340px;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;}
.map-prospect-pin{position:absolute;cursor:pointer;transition:transform .2s;}
.map-prospect-pin:hover{transform:scale(1.3);}
.map-pin-dot{width:12px;height:12px;border-radius:50%;border:2px solid #07070e;}
.map-pin-label{position:absolute;left:14px;top:-4px;background:#0d0d18;border:1px solid rgba(201,168,76,.15);padding:3px 8px;white-space:nowrap;font-family:'JetBrains Mono',monospace;font-size:.54rem;color:#c9a84c;pointer-events:none;opacity:0;transition:opacity .2s;}
.map-prospect-pin:hover .map-pin-label{opacity:1;}

/* ── EMBEDDED SCANNER (landing) ── */
.land-scanner{background:#09091a;border-top:1px solid rgba(201,168,76,.06);border-bottom:1px solid rgba(201,168,76,.06);padding:clamp(44px,7vw,80px) clamp(14px,4vw,60px);}
.land-scanner-inner{max-width:900px;margin:0 auto;}
.land-scanner-form{display:grid;grid-template-columns:1fr 1fr auto;gap:10px;margin-bottom:16px;}
.land-scanner-results{display:flex;flex-direction:column;gap:8px;margin-bottom:16px;}
.land-scanner-result{background:#07070e;border:1px solid rgba(201,168,76,.08);padding:14px 18px;display:grid;grid-template-columns:1fr auto auto;gap:10px;align-items:center;}
.land-scanner-result-name{font-family:'Cinzel',serif;font-size:.88rem;font-weight:700;color:#ddd8ce;}
.land-scanner-result-meta{font-family:'JetBrains Mono',monospace;font-size:.58rem;color:#3a3848;letter-spacing:1px;margin-top:3px;}
.land-scanner-cta{background:#0d0d18;border:1px solid rgba(201,168,76,.12);padding:20px 24px;text-align:center;}

/* ── FREE SCANNER OPTIONS ── */
.scan-advanced{background:#0a0a14;border:1px solid rgba(201,168,76,.06);padding:14px 18px;margin-bottom:12px;display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;}
.scan-adv-label{font-family:'JetBrains Mono',monospace;font-size:.56rem;letter-spacing:2px;text-transform:uppercase;color:#3a3848;margin-bottom:5px;}

/* ── NOTIFICATION CENTER ── */
.notif-btn{position:relative;background:none;border:none;cursor:pointer;padding:4px 8px;color:#3a3848;font-size:1rem;transition:color .2s;}
.notif-btn:hover{color:#c9a84c;}
.notif-count{position:absolute;top:0;right:2px;width:14px;height:14px;background:#c9a84c;border-radius:50%;font-family:'JetBrains Mono',monospace;font-size:.52rem;color:#07070e;display:flex;align-items:center;justify-content:center;font-weight:700;}
.notif-panel{position:absolute;top:calc(100% + 8px);right:0;width:320px;background:#0d0d18;border:1px solid rgba(201,168,76,.14);z-index:500;max-height:400px;overflow-y:auto;}
.notif-header{padding:12px 16px;border-bottom:1px solid rgba(201,168,76,.07);display:flex;align-items:center;justify-content:space-between;}
.notif-header-title{font-family:'Cinzel',serif;font-size:.82rem;font-weight:700;color:#ddd8ce;}
.notif-empty{padding:24px;text-align:center;font-family:'JetBrains Mono',monospace;font-size:.6rem;color:#2e2d3c;text-transform:uppercase;letter-spacing:2px;}


/* ── CHANGELOG ── */
.changelog-list{display:flex;flex-direction:column;gap:0;}
.changelog-item{display:grid;grid-template-columns:120px 1fr;gap:24px;padding:28px 0;border-bottom:1px solid rgba(201,168,76,.06);}
.changelog-item:last-child{border-bottom:none;}
.changelog-date{font-family:'JetBrains Mono',monospace;font-size:.6rem;letter-spacing:2px;text-transform:uppercase;color:#3a3848;padding-top:4px;}
.changelog-content{}
.changelog-version{display:inline-flex;align-items:center;gap:8px;margin-bottom:8px;}
.changelog-v{font-family:'Cinzel',serif;font-size:.88rem;font-weight:700;color:#ddd8ce;}
.changelog-tag{font-family:'JetBrains Mono',monospace;font-size:.52rem;letter-spacing:2px;text-transform:uppercase;padding:2px 8px;}
.changelog-title{font-family:'Cinzel',serif;font-size:1rem;font-weight:700;color:#ddd8ce;margin-bottom:6px;}
.changelog-desc{font-size:.82rem;font-weight:300;color:#5a5868;line-height:1.8;margin-bottom:10px;}
.changelog-items{list-style:none;display:flex;flex-direction:column;gap:5px;}
.changelog-feat{display:flex;align-items:flex-start;gap:8px;font-size:.78rem;font-weight:300;color:#4a4858;line-height:1.5;}
.changelog-feat-ic{color:#c9a84c;font-family:'Cinzel',serif;flex-shrink:0;}

/* ── KEYBOARD SHORTCUTS OVERLAY ── */
.shortcuts-overlay{position:fixed;inset:0;background:rgba(7,7,14,.85);z-index:800;display:flex;align-items:center;justify-content:center;}
.shortcuts-panel{background:#0d0d18;border:1px solid rgba(201,168,76,.15);padding:36px;min-width:440px;max-width:90vw;}
.shortcuts-title{font-family:'Cinzel',serif;font-size:1.1rem;font-weight:700;color:#ddd8ce;margin-bottom:4px;}
.shortcuts-sub{font-family:'JetBrains Mono',monospace;font-size:.58rem;letter-spacing:2px;text-transform:uppercase;color:#2e2d3c;margin-bottom:24px;}
.shortcuts-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.shortcut-row{display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid rgba(201,168,76,.04);}
.shortcut-keys{display:flex;gap:4px;flex-shrink:0;}
.kbd{font-family:'JetBrains Mono',monospace;font-size:.62rem;background:#0a0a14;border:1px solid rgba(201,168,76,.2);color:#c9a84c;padding:3px 7px;border-radius:2px;}
.shortcut-label{font-size:.78rem;font-weight:300;color:#5a5868;}

/* ── PRINT INVOICE ── */
@media print {
  body * { visibility: hidden; }
  .print-invoice, .print-invoice * { visibility: visible !important; }
  .print-invoice { position: fixed; inset: 0; padding: 40px; background: white; color: black; }
  .print-invoice-header { display: flex; justify-content: space-between; margin-bottom: 40px; }
  .print-invoice-title { font-size: 2rem; font-weight: 700; }
  .print-invoice-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  .print-invoice-table th, .print-invoice-table td { border: 1px solid #ddd; padding: 10px 14px; text-align: left; }
  .print-invoice-table th { background: #f5f5f5; }
  .print-invoice-total { font-size: 1.2rem; font-weight: 700; text-align: right; }
  .no-print { display: none !important; }
}

/* ── LIVE COUNTER (landing) ── */
.land-live-bar{background:rgba(201,168,76,.04);border-bottom:1px solid rgba(201,168,76,.06);padding:10px clamp(14px,4vw,60px);}
.land-live-inner{max-width:1280px;margin:0 auto;display:flex;align-items:center;gap:24px;flex-wrap:wrap;justify-content:center;}
.land-live-stat{display:flex;align-items:center;gap:8px;font-family:'JetBrains Mono',monospace;font-size:.6rem;letter-spacing:1.5px;text-transform:uppercase;color:#3a3848;}
.land-live-n{font-family:'Cinzel',serif;font-size:.88rem;font-weight:700;color:#c9a84c;}
.land-live-dot{width:5px;height:5px;background:#7ac89a;border-radius:50%;animation:pulse 2s infinite;}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
.land-live-label{color:#2e2d3c;}

/* ── LIGHT MODE ── */
/* LIGHT MODE — proper warm palette */
.light-mode{--lbg:#f5f2eb;--lbg2:#ffffff;--lbg3:#ece9e0;--lgold:#8a6820;--ltext:#1a1810;--ltext2:#4a4838;--ldim:#7a7868;--lborder:rgba(0,0,0,.08);}
.light-mode body{background:var(--lbg)!important;color:var(--ltext)!important;}
.light-mode .app{background:var(--lbg)!important;}
.light-mode .main{background:var(--lbg)!important;}
.light-mode .content{background:var(--lbg)!important;}
.light-mode .topbar{background:var(--lbg2)!important;border-bottom:1px solid var(--lborder)!important;}
.light-mode .topbar-title,.light-mode .topbar-tag{color:var(--ltext2)!important;}
.light-mode .card,.light-mode .chart-card,.light-mode .metric-card,.light-mode .pc,.light-mode .client-card,.light-mode .inv-card,.light-mode .prop-card,.light-mode .domain-section,.light-mode .creator-tier,.light-mode .app-card{background:var(--lbg2)!important;border-color:var(--lborder)!important;}
.light-mode .inp,.light-mode .inp:focus,.light-mode textarea.inp,.light-mode select.inp{background:var(--lbg3)!important;border-color:var(--lborder)!important;color:var(--ltext)!important;}
.light-mode .inp::placeholder{color:var(--ldim)!important;}
.light-mode .sh-title,.light-mode .card-title,.light-mode .tool-title,.light-mode .metric-n,.light-mode .pc-name,.light-mode .client-name,.light-mode .inv-client,.light-mode .prop-client,.light-mode .domain-result-name,.light-mode .creator-tier-name{color:var(--ltext)!important;}
.light-mode .sh-sub,.light-mode .card-sub,.light-mode .tool-sub,.light-mode .metric-l,.light-mode .pc-meta,.light-mode .pc-desc,.light-mode .client-meta,.light-mode .inv-meta,.light-mode .domain-result-status{color:var(--ldim)!important;}
.light-mode .btn-ghost{color:var(--ltext2)!important;border-color:var(--lborder)!important;background:var(--lbg3)!important;}
.light-mode .btn-ghost:hover{color:var(--ltext)!important;}
.light-mode .tab{background:var(--lbg3)!important;color:var(--ldim)!important;border-color:var(--lborder)!important;}
.light-mode .tab.on{background:var(--lbg2)!important;color:var(--lgold)!important;border-color:var(--lgold)!important;}
.light-mode .tbl-wrap{background:var(--lbg2)!important;}
.light-mode table{background:var(--lbg2)!important;}
.light-mode th{background:var(--lbg3)!important;color:var(--ltext2)!important;border-color:var(--lborder)!important;}
.light-mode td{color:var(--ltext2)!important;border-color:var(--lborder)!important;}
.light-mode .drawer,.light-mode .modal{background:var(--lbg2)!important;border-color:var(--lborder)!important;}
.light-mode .divider{background:var(--lborder)!important;}
.light-mode .pipe-strip{background:var(--lbg3)!important;}
.light-mode .pipe-n{color:var(--lgold)!important;}
.light-mode .pipe-l{color:var(--ldim)!important;}
.light-mode .crm-f{background:var(--lbg3)!important;color:var(--ldim)!important;border-color:var(--lborder)!important;}
.light-mode .crm-f.on{background:var(--lbg2)!important;color:var(--lgold)!important;}
.light-mode .onboard{background:var(--lbg2)!important;border-color:var(--lborder)!important;}
.light-mode .onboard-title{color:var(--ltext)!important;}
.light-mode .charts-row,.light-mode .charts-row-2{color:var(--ltext)!important;}
.light-mode .chart-title{color:var(--ltext)!important;}
.light-mode .chart-sub{color:var(--ldim)!important;}
.light-mode .scan-form,.light-mode .scan-advanced{background:var(--lbg3)!important;border-color:var(--lborder)!important;}
.light-mode .pros-grid .pc{background:var(--lbg2)!important;}
.light-mode .pc-tag{background:var(--lbg3)!important;border-color:var(--lborder)!important;color:var(--ldim)!important;}
.light-mode .builder-chat{background:var(--lbg3)!important;border-color:var(--lborder)!important;}
.light-mode .builder-prev-bar{background:var(--lbg3)!important;border-color:var(--lborder)!important;}
.light-mode .bmsg-bubble{background:var(--lbg2)!important;border-color:var(--lborder)!important;}
.light-mode .builder-inp{background:var(--lbg2)!important;border-color:var(--lborder)!important;color:var(--ltext)!important;}
.light-mode .agency-nav,.light-mode .studio-nav,.light-mode .agency-nav-item{background:var(--lbg3)!important;border-color:var(--lborder)!important;color:var(--ltext2)!important;}
.light-mode .agency-nav-item.on{background:var(--lbg2)!important;color:var(--lgold)!important;}
.light-mode .studio-nav-item{background:var(--lbg3)!important;color:var(--ltext2)!important;}
.light-mode .studio-nav-item.on{background:var(--lbg2)!important;color:var(--lgold)!important;}
.light-mode .studio-form,.light-mode .studio-output{background:var(--lbg2)!important;border-color:var(--lborder)!important;}
.light-mode .opt-btn{background:var(--lbg3)!important;border-color:var(--lborder)!important;color:var(--ltext2)!important;}
.light-mode .opt-btn.on{background:var(--lbg2)!important;border-color:var(--lgold)!important;color:var(--lgold)!important;}
.light-mode .mkt-sidebar,.light-mode .mkt-filter-btn{background:var(--lbg3)!important;border-color:var(--lborder)!important;color:var(--ltext2)!important;}
.light-mode .tmpl-card{background:var(--lbg2)!important;border-color:var(--lborder)!important;}
.light-mode .tmpl-name{color:var(--ltext)!important;}
.light-mode .tmpl-cat,.light-mode .tmpl-seller,.light-mode .tmpl-rating{color:var(--ldim)!important;}
.light-mode .settings-card{background:var(--lbg2)!important;border-color:var(--lborder)!important;}
.light-mode .settings-card-title{color:var(--ltext)!important;}
.light-mode .settings-card-sub{color:var(--ldim)!important;}
.light-mode .rev-card,.light-mode .earn-card{background:var(--lbg2)!important;border-color:var(--lborder)!important;}
.light-mode .rev-n,.light-mode .earn-n{color:var(--lgold)!important;}
.light-mode .changelog-item{border-color:var(--lborder)!important;}
.light-mode .changelog-date{color:var(--ldim)!important;}
.light-mode .changelog-title{color:var(--ltext)!important;}
.light-mode .changelog-desc{color:var(--ldim)!important;}
.light-mode .changelog-feat{color:var(--ltext2)!important;}
/* Landing in light mode */
.light-mode .land,.light-mode .land-hero,.light-mode .land-sec,.light-mode .land-uc-section,.light-mode .land-faq-section,.light-mode .land-creator{background:var(--lbg)!important;}
.light-mode .land-how,.light-mode .land-reviews-section,.light-mode .land-price-section,.light-mode .land-scanner,.light-mode .land-cta-strip{background:var(--lbg3)!important;}
.light-mode .land-h1,.light-mode .land-h2{color:var(--ltext)!important;}
.light-mode .land-h1-gold{color:var(--lgold)!important;}
.light-mode .land-h1-dim{color:var(--ltext2)!important;}
.light-mode .land-sub,.light-mode .land-sub-txt{color:var(--ldim)!important;}
.light-mode .land-nav{background:var(--lbg2)!important;border-bottom:1px solid var(--lborder)!important;}
.light-mode .land-logo{color:var(--ltext)!important;}
.light-mode .land-feat,.light-mode .land-uc-card,.light-mode .land-plan,.light-mode .land-creator-card{background:var(--lbg2)!important;border-color:var(--lborder)!important;}
.light-mode .land-feat-name{color:var(--ltext)!important;}
.light-mode .land-feat-desc{color:var(--ldim)!important;}
.light-mode .land-term{background:var(--lbg3)!important;border-color:var(--lborder)!important;}
.light-mode .land-ann{background:rgba(138,104,32,.08)!important;border-color:rgba(138,104,32,.15)!important;}
.light-mode .land-ann-txt,.light-mode .land-trust-item{color:var(--ltext2)!important;}
.light-mode .land-footer{background:var(--lbg2)!important;border-top:1px solid var(--lborder)!important;}
.light-mode .land-footer-copy{color:var(--ldim)!important;}
.light-mode .land-stat-l{color:var(--ldim)!important;}
.light-mode .land-stats{border-color:var(--lborder)!important;}
.light-mode .land-stat{border-color:var(--lborder)!important;}
.light-mode .land-plan-tier{color:var(--ldim)!important;}
.light-mode .land-plan-price{color:var(--ltext)!important;}
.light-mode .land-plan-feat{color:var(--ldim)!important;}
.light-mode .land-faq-q{color:var(--ltext2)!important;}
.light-mode .land-faq-q:hover,.light-mode .land-faq-q-on{color:var(--ltext)!important;}
.light-mode .land-faq-a p{color:var(--ldim)!important;}
.light-mode .schema-preview{background:var(--lbg2)!important;}
.light-mode .auth-card{background:var(--lbg2)!important;border-color:var(--lborder)!important;}
.light-mode .auth-title{color:var(--ltext)!important;}
.light-mode .auth-sub{color:var(--ldim)!important;}


/* ── MULTI-PAGE BUILDER ── */
.page-tabs{display:flex;gap:2px;margin-bottom:0;flex-wrap:wrap;}
.page-tab{font-family:'JetBrains Mono',monospace;font-size:.58rem;letter-spacing:1.5px;text-transform:uppercase;padding:7px 14px;background:#0a0a14;border:1px solid rgba(201,168,76,.08);color:#3a3848;cursor:pointer;transition:all .2s;}
.page-tab:hover{color:#c9a84c;border-color:rgba(201,168,76,.2);}
.page-tab.on{background:#0e0e22;border-color:rgba(201,168,76,.25);color:#c9a84c;}
.page-tab-done{position:relative;}
.page-tab-done::after{content:'✦';position:absolute;top:-4px;right:-4px;font-size:.45rem;color:#7ac89a;}

/* ── QR CODE ── */
.qr-section{background:#0a0a14;border:1px solid rgba(201,168,76,.08);padding:16px;display:flex;align-items:center;gap:16px;margin-top:8px;}
.qr-img{width:80px;height:80px;image-rendering:pixelated;border:3px solid #07070e;}
.qr-info{flex:1;}
.qr-title{font-family:'Cinzel',serif;font-size:.82rem;font-weight:700;color:#ddd8ce;margin-bottom:4px;}
.qr-url{font-family:'JetBrains Mono',monospace;font-size:.58rem;color:#3a3848;letter-spacing:1px;word-break:break-all;}

/* ── SCHEMA PREVIEW ── */
.schema-preview{background:#ffffff;border-radius:8px;padding:16px 18px;margin-top:8px;}
.schema-title{color:#1a0dab;font-size:1rem;font-family:Arial,sans-serif;line-height:1.3;margin-bottom:2px;cursor:pointer;}
.schema-title:hover{text-decoration:underline;}
.schema-url{color:#006621;font-size:.8rem;font-family:Arial,sans-serif;margin-bottom:4px;}
.schema-desc{color:#545454;font-size:.84rem;font-family:Arial,sans-serif;line-height:1.55;}
.schema-stars{color:#e7711b;font-size:.78rem;font-family:Arial,sans-serif;}
.schema-wrap{background:#0a0a14;border:1px solid rgba(201,168,76,.08);padding:14px;margin-top:8px;}
.schema-label{font-family:'JetBrains Mono',monospace;font-size:.56rem;letter-spacing:'2px',textTransform:'uppercase',color:'#2e2d3c',marginBottom:8;}

/* ── CALL ANALYZER ── */
.transcript-area{width:100%;min-height:160px;background:#0a0a14;border:1px solid rgba(201,168,76,.1);color:#9a96a2;font-family:'DM Sans',sans-serif;font-size:.84rem;padding:14px;line-height:1.7;resize:vertical;}
.action-item{display:flex;align-items:flex-start;gap:10px;padding:9px 0;border-bottom:1px solid rgba(201,168,76,.05);}
.action-item:last-child{border-bottom:none;}
.action-num{font-family:'JetBrains Mono',monospace;font-size:.6rem;color:rgba(201,168,76,.4);flex-shrink:0;padding-top:2px;}
.action-txt{font-size:.82rem;font-weight:300;color:#7a7888;line-height:1.55;}
.action-tag{font-family:'JetBrains Mono',monospace;font-size:.52rem;letter-spacing:1.5px;text-transform:uppercase;flex-shrink:0;margin-top:2px;}


/* ── KANBAN CRM ── */
.kanban-wrap{display:flex;gap:10px;overflow-x:auto;padding-bottom:12px;min-height:400px;}
.kanban-col{min-width:200px;max-width:220px;flex-shrink:0;display:flex;flex-direction:column;gap:0;}
.kanban-col-head{padding:10px 14px;border-bottom:2px solid;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;}
.kanban-col-title{font-family:'JetBrains Mono',monospace;font-size:.58rem;letter-spacing:2px;text-transform:uppercase;}
.kanban-col-count{font-family:'Cinzel',serif;font-size:.88rem;font-weight:700;}
.kanban-card{background:#0d0d18;border:1px solid rgba(201,168,76,.08);padding:12px;margin-bottom:6px;cursor:pointer;transition:border-color .15s;}
.kanban-card:hover{border-color:rgba(201,168,76,.2);}
.kanban-card-name{font-family:'Cinzel',serif;font-size:.78rem;font-weight:700;color:#ddd8ce;margin-bottom:4px;}
.kanban-card-meta{font-family:'JetBrains Mono',monospace;font-size:.54rem;color:#3a3848;letter-spacing:1px;margin-bottom:6px;}
.kanban-move-row{display:flex;gap:4px;margin-top:6px;}
/* ── PIPELINE HEALTH ── */
.health-card{background:linear-gradient(135deg,#0d0d18 0%,#0a0a14 100%);border:1px solid rgba(201,168,76,.1);padding:20px;margin-bottom:16px;display:grid;grid-template-columns:auto 1fr;gap:20px;align-items:center;}
.health-grade{font-family:'Cinzel',serif;font-size:3rem;font-weight:700;line-height:1;width:64px;height:64px;display:flex;align-items:center;justify-content:center;border:3px solid;}
.health-body{}
.health-title{font-family:'Cinzel',serif;font-size:.9rem;font-weight:700;color:#ddd8ce;margin-bottom:6px;}
.health-items{list-style:none;display:flex;flex-direction:column;gap:4px;}
.health-item{font-size:.78rem;font-weight:300;color:#5a5868;display:flex;align-items:flex-start;gap:7px;line-height:1.5;}
/* ── TIME TRACKER ── */
.timer-display{font-family:'Cinzel',serif;font-size:2.8rem;font-weight:700;color:#c9a84c;letter-spacing:4px;text-align:center;padding:20px;}
.timer-controls{display:flex;gap:10px;justify-content:center;margin-bottom:20px;}
.time-entry{display:flex;align-items:center;gap:12px;padding:10px 14px;background:#0a0a14;border:1px solid rgba(201,168,76,.06);margin-bottom:6px;}
.time-entry-client{font-family:'Cinzel',serif;fontSize:'.82rem',fontWeight:600,color:'#ddd8ce';}
.time-entry-hours{font-family:'JetBrains Mono',monospace;font-size:.72rem;color:#c9a84c;flex-shrink:0;}
.time-entry-note{font-size:.74rem;font-weight:300;color:#5a5868;flex:1;}
/* ── ACTIVITY LOG ── */
.activity-timeline{position:relative;padding-left:24px;}
.activity-timeline::before{content:'';position:absolute;left:8px;top:0;bottom:0;width:1px;background:rgba(201,168,76,.08);}
.activity-event{position:relative;margin-bottom:14px;}
.activity-event::before{content:'';position:absolute;left:-20px;top:6px;width:8px;height:8px;border-radius:50%;border:2px solid #07070e;}
.activity-time{font-family:'JetBrains Mono',monospace;font-size:.54rem;color:#2e2d3c;letter-spacing:1px;margin-bottom:3px;}
.activity-text{font-size:.82rem;font-weight:300;color:#7a7888;line-height:1.55;}
/* ── EMAIL SEQUENCE ── */
.seq-step{background:#0d0d18;border:1px solid rgba(201,168,76,.08);margin-bottom:8px;}
.seq-step-head{padding:12px 16px;display:flex;align-items:center;gap:12px;cursor:pointer;border-bottom:1px solid rgba(201,168,76,.05);}
.seq-step-num{font-family:'Cinzel',serif;font-size:.82rem;color:rgba(201,168,76,.4);flex-shrink:0;}
.seq-step-day{font-family:'JetBrains Mono',monospace;font-size:.6rem;letter-spacing:2px;color:#c9a84c;text-transform:uppercase;}
.seq-step-type{font-family:'JetBrains Mono',monospace;font-size:.56rem;letter-spacing:1.5px;color:#3a3848;text-transform:uppercase;margin-left:auto;}
.seq-step-body{padding:14px 16px;}
/* ── ROADMAP ── */
.roadmap-phase{margin-bottom:28px;}
.roadmap-phase-title{font-family:'Cinzel',serif;font-size:1rem;font-weight:700;color:#ddd8ce;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid rgba(201,168,76,.08);display:flex;align-items:center;gap:12px;}
.roadmap-item{display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid rgba(201,168,76,.04);}
.roadmap-status{font-family:'JetBrains Mono',monospace;font-size:.54rem;letter-spacing:1.5px;text-transform:uppercase;flex-shrink:0;padding:3px 8px;border:1px solid;}
.roadmap-item-title{font-family:'Cinzel',serif;font-size:.82rem;font-weight:600;color:#ddd8ce;margin-bottom:3px;}
.roadmap-item-desc{font-size:.76rem;font-weight:300;color:#5a5868;line-height:1.55;}
/* ── AFFILIATE ── */
.affiliate-tier{background:#0d0d18;border:1px solid rgba(201,168,76,.08);padding:24px;text-align:center;transition:border-color .2s;}
.affiliate-tier:hover{border-color:rgba(201,168,76,.2);}
.affiliate-pct{font-family:'Cinzel',serif;font-size:2.4rem;font-weight:700;color:#c9a84c;line-height:1;}
.affiliate-label{font-family:'JetBrains Mono',monospace;font-size:.58rem;letter-spacing:2px;text-transform:uppercase;color:#3a3848;margin-bottom:10px;}
/* ── IMPORT/EXPORT ── */
.import-zone{border:2px dashed rgba(201,168,76,.2);padding:36px;text-align:center;cursor:pointer;transition:border-color .2s;background:rgba(201,168,76,.02);}
.import-zone:hover{border-color:rgba(201,168,76,.4);background:rgba(201,168,76,.04);}
.import-zone-icon{font-family:'Cinzel',serif;font-size:2rem;color:rgba(201,168,76,.3);margin-bottom:12px;}
.import-zone-title{font-family:'Cinzel',serif;font-size:.9rem;font-weight:700;color:#ddd8ce;margin-bottom:4px;}
.import-zone-sub{font-size:.78rem;font-weight:300;color:#5a5868;}

/* FIT TO ALL SCREEN SIZES */
.land{width:100%;}
.app{overflow:hidden;height:100vh;}

@media(max-width:860px){
  .land-scanner-form{grid-template-columns:1fr;}

  .land-hero{grid-template-columns:1fr;}
  .land-feat-grid,.land-uc-grid{grid-template-columns:1fr !important;}
  .charts-row{grid-template-columns:1fr;}
  .pitch-layout,.builder-wrap{grid-template-columns:1fr;height:auto;}
  .agency-layout,.studio-layout{grid-template-columns:1fr;}
  .studio-content{grid-template-columns:1fr;}
  .mkt-layout{grid-template-columns:1fr;}
  .mkt-sidebar{display:none;}
  .sb{width:160px;}
  .sb-label{font-size:.54rem;letter-spacing:1px;}
}
@media(max-width:620px){
  .sb{display:none;}
  .main{width:100%;}
  .content{padding:12px;}
  .topbar{padding:0 12px;}
  .land-hero{gap:16px;}
  .pros-grid,.client-grid{grid-template-columns:1fr;}
  .scan-grid{grid-template-columns:1fr;}
  .pitch-layout,.builder-wrap{height:auto;min-height:400px;}
}

/* ── PHASE 4: MARKETPLACE ── */
.mkt-layout{display:grid;grid-template-columns:220px 1fr;height:calc(100vh - 108px);border:1px solid rgba(201,168,76,.08);}
.mkt-sidebar{border-right:1px solid rgba(201,168,76,.08);background:#0a0a14;padding:14px;}
.mkt-filter-title{font-family:'JetBrains Mono',monospace;font-size:.56rem;letter-spacing:2px;text-transform:uppercase;color:#6a6878;margin-bottom:8px;margin-top:14px;}
.mkt-filter-btn{display:block;width:100%;text-align:left;background:none;border:none;font-family:'JetBrains Mono',monospace;font-size:.6rem;letter-spacing:1px;text-transform:uppercase;color:#7a7888;padding:7px 10px;cursor:pointer;transition:all .15s;}
.mkt-filter-btn:hover{color:#7a7888;background:rgba(201,168,76,.04);}
.mkt-filter-btn.on{color:#c9a84c;background:rgba(201,168,76,.07);}
.mkt-content{overflow-y:auto;padding:18px;}
.mkt-top{display:flex;align-items:center;gap:10px;margin-bottom:16px;}
.mkt-search{flex:1;background:#0a0a14;border:1px solid rgba(201,168,76,.1);color:#ddd8ce;font-family:'DM Sans',sans-serif;font-size:.82rem;padding:8px 12px;outline:none;}
.mkt-search:focus{border-color:rgba(201,168,76,.3);}
.mkt-search::placeholder{color:#6a6878;}
.tmpl-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;}
.tmpl-card{background:#0d0d18;border:1px solid rgba(201,168,76,.08);overflow:hidden;transition:border-color .2s;}
.tmpl-card:hover{border-color:rgba(201,168,76,.2);}
.tmpl-preview{height:100px;position:relative;display:flex;align-items:center;justify-content:center;}
.tmpl-preview-txt{font-family:'Cinzel',serif;font-size:1.2rem;color:rgba(255,255,255,.15);}
.tmpl-info{padding:14px;}
.tmpl-name{font-family:'Cinzel',serif;font-size:.85rem;font-weight:700;color:#ddd8ce;margin-bottom:3px;}
.tmpl-cat{font-family:'JetBrains Mono',monospace;font-size:.54rem;letter-spacing:1.5px;text-transform:uppercase;color:#6a6878;margin-bottom:8px;}
.tmpl-meta{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}
.tmpl-price{font-family:'Cinzel',serif;font-size:.95rem;font-weight:700;color:#c9a84c;}
.tmpl-rating{font-family:'JetBrains Mono',monospace;font-size:.56rem;color:#5a5868;letter-spacing:1px;}
.tmpl-seller{font-family:'JetBrains Mono',monospace;font-size:.54rem;color:#6a6878;margin-bottom:10px;}
.tmpl-actions{display:flex;gap:6px;}
.sell-form{background:#0d0d18;border:1px solid rgba(201,168,76,.08);padding:20px;margin-bottom:16px;}
.earnings-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:20px;}
.earn-card{background:#0d0d18;border:1px solid rgba(201,168,76,.08);padding:16px;}
.earn-n{font-family:'Cinzel',serif;font-size:1.5rem;font-weight:700;color:#c9a84c;margin-bottom:4px;}
.earn-l{font-family:'JetBrains Mono',monospace;font-size:.54rem;letter-spacing:2px;text-transform:uppercase;color:#6a6878;}
/* ── PHASE 4: DEPLOY ── */
.deploy-bar{background:#0d0d18;border-bottom:1px solid rgba(201,168,76,.08);padding:12px 16px;display:flex;align-items:center;gap:10px;flex-shrink:0;}
.deploy-status{background:#0a0a14;border:1px solid rgba(201,168,76,.08);padding:12px 16px;display:flex;align-items:center;gap:12px;margin-top:0;}
.deploy-url{font-family:'JetBrains Mono',monospace;font-size:.65rem;color:#7ac89a;letter-spacing:1px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
/* ── PHASE 4: SEARCH ── */
.search-wrap{position:relative;}
.search-inp{background:#0a0a14;border:1px solid rgba(201,168,76,.1);color:#ddd8ce;font-family:'JetBrains Mono',monospace;font-size:.62rem;padding:7px 14px;outline:none;width:220px;letter-spacing:1px;transition:all .2s;}
.search-inp:focus{border-color:rgba(201,168,76,.3);width:280px;}
.search-inp::placeholder{color:#6a6878;}
.search-dropdown{position:absolute;top:calc(100% + 6px);right:0;width:340px;background:#0d0d18;border:1px solid rgba(201,168,76,.12);z-index:500;max-height:320px;overflow-y:auto;}
.search-result{display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;border-bottom:1px solid rgba(201,168,76,.04);transition:background .15s;}
.search-result:hover{background:rgba(201,168,76,.05);}
.search-result:last-child{border-bottom:none;}
.search-result-icon{font-family:'Cinzel',serif;font-size:.88rem;color:rgba(201,168,76,.4);flex-shrink:0;}
.search-result-name{font-size:.8rem;font-weight:400;color:#ddd8ce;flex:1;}
.search-result-meta{font-family:'JetBrains Mono',monospace;font-size:.54rem;color:#6a6878;letter-spacing:1px;}
.search-empty{padding:16px;font-family:'JetBrains Mono',monospace;font-size:.6rem;color:#6a6878;letter-spacing:2px;text-transform:uppercase;text-align:center;}
/* ── PHASE 4: ONBOARDING ── */
.onboard{background:#0d0d18;border:1px solid rgba(201,168,76,.12);padding:20px;margin-bottom:18px;}
.onboard-title{font-family:'Cinzel',serif;font-size:.95rem;font-weight:700;color:#ddd8ce;margin-bottom:12px;}
.onboard-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
.onboard-step{background:#0a0a14;border:1px solid rgba(201,168,76,.07);padding:14px;position:relative;}
.onboard-step.done{border-color:rgba(90,144,112,.2);background:rgba(90,144,112,.04);}
.onboard-step-num{font-family:'Cinzel',serif;font-size:1.5rem;font-weight:700;color:rgba(201,168,76,.15);margin-bottom:6px;line-height:1;}
.onboard-step.done .onboard-step-num{color:rgba(90,144,112,.4);}
.onboard-step-title{font-family:'Cinzel',serif;font-size:.82rem;font-weight:700;color:#ddd8ce;margin-bottom:4px;}
.onboard-step.done .onboard-step-title{color:#7ac89a;}
.onboard-step-desc{font-size:.74rem;font-weight:300;color:#7a7888;line-height:1.55;}
.onboard-check{position:absolute;top:12px;right:12px;font-family:'Cinzel',serif;font-size:.88rem;color:#7ac89a;}
.onboard-progress{height:3px;background:rgba(201,168,76,.08);margin-top:14px;}
.onboard-progress-fill{height:100%;background:#c9a84c;transition:width .5s ease;}


/* ── PHASE 3: AGENCY OS ── */
.agency-layout{display:grid;grid-template-columns:220px 1fr;height:calc(100vh - 108px);border:1px solid rgba(201,168,76,.08);}
.agency-nav{border-right:1px solid rgba(201,168,76,.08);background:#0a0a14;padding:12px 0;overflow-y:auto;}
.agency-nav-item{display:flex;align-items:center;gap:10px;padding:10px 18px;cursor:pointer;transition:background .15s;position:relative;}
.agency-nav-item:hover{background:rgba(201,168,76,.04);}
.agency-nav-item.on{background:rgba(201,168,76,.07);}
.agency-nav-item.on::before{content:'';position:absolute;left:0;top:0;bottom:0;width:2px;background:#c9a84c;}
.agency-nav-r{font-family:'Cinzel',serif;font-size:.88rem;color:rgba(201,168,76,.3);width:16px;flex-shrink:0;}
.agency-nav-item.on .agency-nav-r{color:#c9a84c;}
.agency-nav-l{font-family:'JetBrains Mono',monospace;font-size:.6rem;letter-spacing:1.5px;text-transform:uppercase;color:#7a7888;}
.agency-nav-item.on .agency-nav-l{color:#9a96a2;}
.agency-content{overflow-y:auto;padding:20px;}
.client-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;}
.client-card{background:#0d0d18;border:1px solid rgba(201,168,76,.08);padding:18px;transition:border-color .2s;}
.client-card:hover{border-color:rgba(201,168,76,.16);}
.client-card-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;}
.client-name{font-family:'Cinzel',serif;font-size:.9rem;font-weight:700;color:#ddd8ce;}
.client-meta{font-family:'JetBrains Mono',monospace;font-size:.56rem;color:#6a6878;letter-spacing:1px;margin-bottom:12px;}
.client-fee-row{display:flex;align-items:center;gap:10px;margin-bottom:10px;}
.client-fee{font-family:'Cinzel',serif;font-size:1.2rem;font-weight:700;color:#c9a84c;}
.client-fee-label{font-family:'JetBrains Mono',monospace;font-size:.54rem;letter-spacing:1.5px;text-transform:uppercase;color:#6a6878;}
.prop-list{display:flex;flex-direction:column;gap:8px;}
.prop-card{background:#0d0d18;border:1px solid rgba(201,168,76,.08);padding:16px;transition:border-color .2s;}
.prop-card:hover{border-color:rgba(201,168,76,.16);}
.prop-card-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
.prop-client{font-family:'Cinzel',serif;font-size:.88rem;font-weight:700;color:#ddd8ce;}
.prop-date{font-family:'JetBrains Mono',monospace;font-size:.56rem;color:#6a6878;letter-spacing:1px;}
.prop-preview{font-size:.78rem;font-weight:300;color:#4a4858;line-height:1.6;white-space:pre-wrap;max-height:120px;overflow:hidden;}
.prop-preview.expanded{max-height:none;}
.inv-list{display:flex;flex-direction:column;gap:8px;}
.inv-card{background:#0d0d18;border:1px solid rgba(201,168,76,.08);padding:16px;}
.inv-card-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
.inv-client{font-family:'Cinzel',serif;font-size:.88rem;font-weight:700;color:#ddd8ce;}
.inv-amount{font-family:'Cinzel',serif;font-size:1.1rem;font-weight:700;color:#c9a84c;}
.inv-meta{font-family:'JetBrains Mono',monospace;font-size:.56rem;color:#6a6878;letter-spacing:1px;}
.inv-items{margin:10px 0;padding:10px 0;border-top:1px solid rgba(201,168,76,.06);border-bottom:1px solid rgba(201,168,76,.06);}
.inv-item-row{display:flex;justify-content:space-between;font-size:.78rem;color:#6a6878;margin-bottom:4px;}
.inv-total-row{display:flex;justify-content:space-between;font-family:'Cinzel',serif;font-size:.88rem;font-weight:700;color:#ddd8ce;margin-top:8px;}
.rev-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px;}
.rev-card{background:#0d0d18;border:1px solid rgba(201,168,76,.08);padding:16px;}
.rev-n{font-family:'Cinzel',serif;font-size:1.6rem;font-weight:700;color:#c9a84c;margin-bottom:4px;}
.rev-l{font-family:'JetBrains Mono',monospace;font-size:.54rem;letter-spacing:2px;text-transform:uppercase;color:#6a6878;}
.modal-bg{position:fixed;inset:0;background:rgba(7,7,14,.75);z-index:300;display:flex;align-items:center;justify-content:center;}
.modal{background:#0d0d18;border:1px solid rgba(201,168,76,.12);padding:28px;width:min(480px,calc(100vw - 24px));max-height:90vh;overflow-y:auto;}
.modal-title{font-family:'Cinzel',serif;font-size:1rem;font-weight:700;color:#ddd8ce;margin-bottom:4px;}
.modal-sub{font-family:'JetBrains Mono',monospace;font-size:.56rem;letter-spacing:2px;text-transform:uppercase;color:#6a6878;margin-bottom:20px;}
.line-items{display:flex;flex-direction:column;gap:8px;margin-bottom:12px;}
.line-item-row{display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;}

/* ── PHASE 3: AI STUDIO ── */
.studio-layout{display:grid;grid-template-columns:200px 1fr;height:calc(100vh - 108px);border:1px solid rgba(201,168,76,.08);}
.studio-nav{border-right:1px solid rgba(201,168,76,.08);background:#0a0a14;padding:10px 0;}
.studio-nav-item{display:flex;align-items:center;gap:10px;padding:10px 16px;cursor:pointer;transition:background .15s;position:relative;}
.studio-nav-item:hover{background:rgba(201,168,76,.04);}
.studio-nav-item.on{background:rgba(201,168,76,.07);}
.studio-nav-item.on::before{content:'';position:absolute;left:0;top:0;bottom:0;width:2px;background:#c9a84c;}
.studio-nav-r{font-family:'Cinzel',serif;font-size:.88rem;color:rgba(201,168,76,.3);flex-shrink:0;}
.studio-nav-item.on .studio-nav-r{color:#c9a84c;}
.studio-nav-l{font-family:'JetBrains Mono',monospace;font-size:.6rem;letter-spacing:1px;text-transform:uppercase;color:#7a7888;}
.studio-nav-item.on .studio-nav-l{color:#9a96a2;}
.studio-content{display:grid;grid-template-columns:clamp(180px,30%,280px) 1fr;overflow:hidden;}
.studio-form{border-right:1px solid rgba(201,168,76,.08);padding:18px;overflow-y:auto;background:#0a0a14;}
.studio-output{padding:18px;overflow-y:auto;display:flex;flex-direction:column;}
.studio-out-body{flex:1;overflow-y:auto;}
.studio-out-txt{font-size:.84rem;font-weight:300;color:#9a96a2;line-height:1.9;white-space:pre-wrap;}
.studio-copy-row{display:flex;justify-content:flex-end;gap:8px;padding-top:12px;margin-top:12px;border-top:1px solid rgba(201,168,76,.06);}
.tool-title{font-family:'Cinzel',serif;font-size:1rem;font-weight:700;color:#ddd8ce;margin-bottom:3px;}
.tool-sub{font-family:'JetBrains Mono',monospace;font-size:.54rem;letter-spacing:2px;text-transform:uppercase;color:#6a6878;margin-bottom:16px;}
.option-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px;}
.opt-btn{background:#0d0d18;border:1px solid rgba(201,168,76,.07);padding:8px 10px;cursor:pointer;text-align:center;transition:all .2s;}
.opt-btn:hover{border-color:rgba(201,168,76,.18);}
.opt-btn.on{border-color:rgba(201,168,76,.35);background:rgba(201,168,76,.05);}
.opt-btn-l{font-family:'Cinzel',serif;font-size:.78rem;font-weight:600;color:#6a6878;}
.opt-btn.on .opt-btn-l{color:#c9a84c;}

/* ── PHASE 3: SETTINGS ── */
.settings-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;}
.settings-card{background:#0d0d18;border:1px solid rgba(201,168,76,.08);padding:24px;}
.settings-card-title{font-family:'Cinzel',serif;font-size:.95rem;font-weight:700;color:#ddd8ce;margin-bottom:4px;}
.settings-card-sub{font-family:'JetBrains Mono',monospace;font-size:.54rem;letter-spacing:2px;text-transform:uppercase;color:#6a6878;margin-bottom:18px;}
.api-key-row{display:flex;align-items:center;gap:8px;margin-bottom:10px;}
.api-key-label{font-family:'JetBrains Mono',monospace;font-size:.6rem;letter-spacing:1.5px;text-transform:uppercase;color:#7a7888;width:100px;flex-shrink:0;}
.plan-badge-lg{display:inline-flex;align-items:center;gap:10px;background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.15);padding:12px 18px;margin-bottom:14px;}
.plan-badge-name{font-family:'Cinzel',serif;font-size:1.1rem;font-weight:700;color:#c9a84c;}
.plan-badge-tier{font-family:'JetBrains Mono',monospace;font-size:.6rem;letter-spacing:2px;text-transform:uppercase;color:#5a5868;}

`;


// ── LANDING PAGE DATA ─────────────────────────────────────────────────────
const LANDING_PLANS = [
  {tier:"Apprentice",price:"Free",cycle:"Free forever",tagline:"Enough to find your market and land your first client.",groups:[
    {name:"Prospect",feats:["10 scans/month","Google only","Basic lead scoring"]},
    {name:"Pitch",feats:["3 pitch generations/month","Text format only","Basic templates"]},
    {name:"Build",feats:["3 AI site builds/month","20 templates from 3 industries","Basic text editing only","QR code for deployed sites"]},
    {name:"Deploy",feats:["Netlify subdomain only"]},
    {name:"Team",feats:["1 seat"]},
  ]},
  {tier:"Seeker",price:"$10",cycle:"per month",tagline:"Your first real toolkit. Everything you need to get moving.",groups:[
    {name:"Prospect",feats:["25 scans/month","Google + Yelp","Lead scoring","CSV export"]},
    {name:"Pitch",feats:["15 generations/month","Text + call formats","Tone selector"]},
    {name:"Build",feats:["5 AI site builds/month","40 templates from 5 industries","Full visual editor","Basic CMS (blog only)","Mobile preview","QR code generator"]},
    {name:"Deploy",feats:["GitHub push","Netlify deploy","Shareable preview links","Client review link (view only)"]},
    {name:"Team",feats:["1 seat"]},
  ]},
  {tier:"Scribe",price:"$49",cycle:"per month",tagline:"Unlimited prospecting and building for serious freelancers.",groups:[
    {name:"Prospect",feats:["Unlimited scans","Google + Yelp + Facebook","Advanced lead scoring","Daily auto-scan","Business health score","Bulk CSV export"]},
    {name:"Pitch",feats:["Unlimited generations","Text + call + email","A/B variants","Tone selector","Auto follow-up sequences","Full CRM with history"]},
    {name:"Build",feats:["20 AI site builds/month","80+ templates","Full visual editor","AI copy generation","Full CMS (blog, portfolio, collections)","Design token system","Component library","Multi-language","Version history (10 saves)","Debug mode","Fork to VS Code","Mobile Editor","Social feed widgets","Scroll effects","AI Photo Studio","Logo maker","Auto-generated privacy policy + ToS + cookie consent","GDPR toolkit","PWA builder"]},
    {name:"Deploy",feats:["GitHub push","Netlify deploy","Custom domain connection","Client preview links","Client review mode with comments","AI SEO tools (meta, alt text, schema)"]},
    {name:"Marketing",feats:["AI social media scheduling","Coupons and discounts on client stores","Gift cards for client stores","Basic marketing automations","Directory auto-submission","Testimonial automation","Portfolio auto-builder"]},
    {name:"Agency OS",feats:["Basic invoicing","Print-to-PDF invoices","Contract generator","Client intake form generator","Client portal (view only)"]},
    {name:"Team",feats:["1 seat"]},
  ]},
  {tier:"Archon",price:"$99",cycle:"per month",featured:true,tagline:"The full platform. Prospect, pitch, build, deploy, and manage clients.",groups:[
    {name:"Prospect",feats:["Everything in Scribe","Phone number finder","Email finder","Social media presence check","Competitor web analysis","AI model selector (Claude, GPT-4o, Gemini)","Plan/Brainstorm mode — AI conversation before building"]},
    {name:"Pitch",feats:["LinkedIn-informed pitches","Email outreach automation","Smart drip sequences","Meeting scheduler","A/B pitch testing"]},
    {name:"Build — Full Freedom",feats:["Unlimited AI site builds","Agentic Build Mode — AI builds autonomously","Wix-style drag-and-drop editor","Full code access — HTML, CSS, JS","Fork to VS Code or Cursor","Full CMS with custom content types","E-commerce — products, cart, checkout","Abandoned cart recovery","Gift cards and coupons","AI product descriptions + recommendations","Multichannel selling (Amazon, eBay, Facebook, Instagram)","POS integration","Dropshipping","Print on demand","Subscription box management","User authentication builder","Database builder (no SQL)","Appointment and booking system","Event management — registration, ticketing, seating","Online courses — quizzes, certificates, participant mgmt","Restaurant tools — ordering, menus, reservations","Loyalty and rewards program","Digital forms and waivers","GSAP animation builder","Inline image generation","AI chatbot per site","24/7 Conversation AI for client sites","Push notifications","Staging environment","Automatic backups + restore","Uptime monitoring","SSL management","AI video maker","ADA compliance checker","Speed optimizer"]},
    {name:"Agency OS (Full)",feats:["Proposal generator","E-signature + instant payment","Proposal view tracking","Full invoicing + Stripe links","Client communication hub","Project management + milestones","MRR and revenue dashboard","Real-time collaboration (2 simultaneous editors)","Client review mode — clients comment on specific elements","Marketing automations (full if/then)","AI Google Ads generator","Facebook + Instagram ads","AI social media management","International commerce — multi-language storefronts","Call tracking","Survey builder","AI pitch video generator","AI call summarizer","Referral tracking","Client health score — AI predicts churn","Competitor website analyzer","Client persona builder"]},
    {name:"AI Studio (Full)",feats:["Social media content generator","Google Business Profile optimizer","Ad copy (Facebook, Google, Instagram)","SEO content + blog generator","AEO optimization for AI search","Brand voice analyzer","Email newsletter builder","AI-generated schema markup","Review monitoring + response drafts"]},
    {name:"Marketplace",feats:["100+ templates across 10 industries","Buy and sell templates","Buy and sell pitch scripts","Earnings dashboard"]},
    {name:"Team",feats:["3 seats"]},
  ]},
  {tier:"Sovereign",price:"$199",cycle:"per month",tagline:"Agency-grade. Full team, white-label portal, and scale.",groups:[
    {name:"Everything in Archon plus:",feats:["LinkedIn owner scraping","Full outreach automation (SMS + email)","Voicemail drop","Cold email warm-up","AI A/B page testing","Heatmap integration","Lead predictor — AI scores pipeline weekly","AI pricing suggester","AI case study generator","Mobile app builder (iOS + Android)","Multi-currency e-commerce","Subscription billing on client sites","Fitness tools — class mgmt, waivers, membership plans","Hotel management — reservations, room types, advanced pricing","Site performance dashboard","Core Web Vitals tracking","Automated monthly site health reports","White-label client portal (your domain)","Client-facing code export","Live chat builder","Review monitoring + AI response drafts","Local SEO optimization tool","Press release generator","Brand identity package generator","Automated client reporting","Time tracking","Multi-client financial reporting","Real-time collaboration (5 editors)","Revenue sharing on template sales","Service marketplace — hire and be hired","5 seats + roles and permissions","Priority support"]},
  ]},
  {tier:"Warden",price:"$349",cycle:"per month",tagline:"White label and resell. Build your own SaaS on top of ours.",groups:[
    {name:"Everything in Sovereign plus:",feats:["Unlimited — no caps on any feature","Bring your own AI API key (Claude, GPT, Gemini)"]},
    {name:"White Label",feats:["Full platform under your name and domain","Your clients never see Rune Script","Custom login page, dashboard, and emails","White-label the visual editor, code access, and mobile app builder","White-label automated client reports"]},
    {name:"Reseller Program",feats:["Create up to 25 sub-accounts","Set your own pricing — keep 100% of the margin","Sub-users get Scribe-level access by default","Upgrade individual sub-accounts independently","Sub-users never see Rune Script branding"]},
    {name:"Enterprise",feats:["Full API access","Custom integrations","Unlimited team seats","Unlimited simultaneous collaborators","Dedicated onboarding + account manager","SLA uptime guarantee","Early access to all new features","Custom AI model fine-tuning"]},
  ]},
];

const LANDING_FAQS = [
  {q:"Do I need to know how to code?",a:"Not at all. Rune Script handles everything from finding the prospect to deploying the finished site. If you can type a city name and click a button, you can run this entire operation."},
  {q:"How does the AI build the website?",a:"The AI pulls the business's name, phone, services, reviews, and location — then generates a full site around that data. You review it, tweak anything in the visual editor, and deploy. The whole process takes under 10 minutes."},
  {q:"Can I set my own conditions for the scanner?",a:"Completely. You control the city, category, minimum rating, minimum review count, search radius, and which platforms to scan. Rune Script gives you the controls and gets out of the way."},
  {q:"Can I charge clients a recurring monthly fee?",a:"Yes. Rune Script includes maintenance billing — you set a monthly fee, the client gets invoiced through the client portal, and you track payments in your dashboard. Many users earn more on maintenance than the initial build."},
  {q:"What does the Warden reseller program mean?",a:"You white-label the entire Rune Script platform under your own brand and domain, create up to 25 sub-accounts for other web designers who pay you a monthly fee. You set your own pricing. They use the platform under your brand. You keep all the margin above your $349/month cost."},
  {q:"How is this different from Wix, Webflow, or Lovable?",a:"All three are tools you use to build things. Rune Script is the only platform that starts before the build — finding the client, pitching, closing the deal — and then matches or exceeds all of them combined. Booking systems, e-commerce, courses, Agency OS, AI Studio, code access, real-time data, mobile apps, and a reseller program that none of them offer."},
  {q:"What is the catch with the free plan?",a:"There is not one. 10 scans and 3 builds is enough to land your first client. Start free, upgrade when the revenue justifies it."},
];

const LANDING_USE_CASES = [
  {who:"For Freelancers",name:"Turn Outreach Into Income",desc:"You have the skills. Rune Script gives you the pipeline. Stop hunting manually and start closing with a system that does the heavy lifting.",items:["Find 10 qualified leads in under 5 minutes","Present a live site before the first call ends","Track every conversation in one CRM","Turn clients into recurring monthly revenue"]},
  {who:"For Students",name:"Build a Real Business",desc:"Before you graduate, before you apply — prove you can run something real. Rune Script is how you do that with zero upfront cost.",items:["No prior business experience needed","Real revenue for your college application","Learn sales, design, and management at once","Start free, scale when you close"]},
  {who:"For Agencies",name:"Scale Without Hiring",desc:"Prospect at volume, build at speed, deliver at quality — without adding headcount. Handle the full pipeline without extra tools.",items:["Unlimited scanning on top plans","White label the entire platform","5 team seats with roles and permissions","Full financial dashboard and reporting"]},
];

// ── TERMINAL (isolated memo) ───────────────────────────────────────────────
const TERM_LINES = [
  {c:"tt-m",t:"// RUNE SCRIPT AGENT v1.0"},{c:"tt-d",t:" "},
  {c:"tt-p",t:'> rune.scan({ city: "Austin, TX", type: "Plumbing" })'},{c:"tt-d",t:" "},
  {c:"tt-o",t:"  Querying 4,812 businesses..."},{c:"tt-o",t:"  Checking web presence..."},
  {c:"tt-o",t:"  Scoring lead quality..."},{c:"tt-d",t:" "},
  {c:"tt-s",t:"  ✦ 14 targets found — no website"},{c:"tt-d",t:" "},
  {c:"tt-o",t:"  [01]  Lone Star Plumbing   ★5.0  203 reviews  Score:94"},
  {c:"tt-o",t:"  [02]  River City Pipes      ★4.9  147 reviews  Score:88"},
  {c:"tt-d",t:" "},{c:"tt-p",t:'> rune.pitch({ target:1, tone:"direct" })'},
  {c:"tt-s",t:"  ✦ Pitch package generated"},
  {c:"tt-p",t:'> rune.build({ target:1, style:"premium" })'},
  {c:"tt-o",t:"  Building site from business data..."},
  {c:"tt-s",t:"  ✦ Site ready — deploy when you close"},
];
const LandingTerminal = memo(function LandingTerminal() {
  // No setInterval - CSS staggered fade is one-shot, zero ongoing DOM work
  return (
    <div className="land-term">
      <div className="land-term-bar">
        <div className="land-term-dots"><div className="land-term-dot"/><div className="land-term-dot"/><div className="land-term-dot"/></div>
        <span className="land-term-title">RUNE SCRIPT — AGENT v1.0</span>
      </div>
      <div className="land-term-body">
        {TERM_LINES.map((l,i)=>(
          <div key={i} className={l.c} style={{opacity:0,animation:`fadein .25s ease ${i*.1}s forwards`}}>
            {l.t||"\u00A0"}
          </div>
        ))}
      </div>
    </div>
  );
});

// ── MQ_ITEMS ──────────────────────────────────────────────────────────────
const MQ_ITEMS = ["AI Prospect Scanner","Pitch Generator","GitHub Deploy","Wix-Style Editor","Full Code Access","Built-in CMS","E-commerce Builder","Booking System","Event Management","Online Courses","Restaurant Tools","Loyalty Programs","Dropshipping","AI Google Ads","Marketing Automations","User Auth Builder","Database Builder","GSAP Animations","Mobile App Builder","Real-Time Collab","Client Review Mode","AI SEO + AEO","Version History","Debug Mode","Agency OS","Voicemail Drop","Cold Email Warm-up","AI Pitch Video","Proposal Tracker","Client Health Score"];


// ── EMBEDDED SCANNER (landing page, no auth required) ─────────────────────
function EmbeddedScanner({onGetStarted}) {
  const [city, setCity] = useState('');
  const [cat, setCat] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const scan = async () => {
    if (!city) return;
    setLoading(true); setResults([]);
    try {
      const type = cat || 'local service business';
      const prompt = `Generate exactly 5 realistic local businesses in ${city} in the "${type}" space that do NOT have a website. Return ONLY a valid JSON array. Each object: name (string), rating (number 4.5-5.0), reviews (integer 50-400), leadScore (integer 70-97), services (array of 2 strings).`;
      const raw = await callClaude(prompt, 600);
      const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
      setResults(parsed);
    } catch(e) {
      setResults([
        {name:'Example HVAC Co', rating:4.9, reviews:203, leadScore:94, services:['AC Repair','Heating']},
        {name:'City Best Plumbing', rating:4.8, reviews:147, leadScore:88, services:['Leak Repair','Drains']},
        {name:'Pro Clean Services', rating:5.0, reviews:89, leadScore:96, services:['Deep Clean','Residential']},
      ]);
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="land-scanner-form">
        <CityPicker value={city} onChange={setCity} placeholder="Austin TX, London, Lagos…"/>
        <input className="inp" placeholder="HVAC, restaurants, tattoo shops… (optional)" value={cat} onChange={e=>setCat(e.target.value)} onKeyDown={e=>e.key==='Enter'&&scan()}/>
        <button className="btn btn-gold" onClick={scan} disabled={loading||!city}>
          {loading ? <><Spinner/>Scanning…</> : 'Scan →'}
        </button>
      </div>

      {loading && (
        <div style={{display:'flex',alignItems:'center',gap:12,padding:'16px 0'}}>
          <Spinner/><span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.62rem',color:'#3a3848',letterSpacing:'2px',textTransform:'uppercase'}}>Scanning {city}…</span>
        </div>
      )}

      {results.length > 0 && (
        <>
          <div className="land-scanner-results">
            {results.map((r,i) => (
              <div key={i} className="land-scanner-result">
                <div>
                  <div className="land-scanner-result-name">{r.name}</div>
                  <div className="land-scanner-result-meta">{r.rating}★ · {r.reviews} reviews · {r.services?.join(' · ')}</div>
                </div>
                <span className={`badge ${scoreClass(r.leadScore)}`} style={{color:scoreColor(r.leadScore)}}>Score {r.leadScore}</span>
                <button className="btn btn-gold btn-sm" onClick={onGetStarted}>Pitch This →</button>
              </div>
            ))}
          </div>
          <div className="land-scanner-cta">
            <div style={{fontFamily:"'Cinzel',serif",fontSize:'1rem',fontWeight:700,color:'#ddd8ce',marginBottom:6}}>Sign up free to add these to your CRM and generate full pitch packages.</div>
            <p style={{fontSize:'.82rem',fontWeight:300,color:'#5a5868',marginBottom:16}}>SMS pitch, call script, email, and follow-up — ready before you dial.</p>
            <button className="btn btn-gold" onClick={onGetStarted}>Start for Free — No Credit Card →</button>
          </div>
        </>
      )}
    </div>
  );
}

// ── LANDING PAGE ──────────────────────────────────────────────────────────
function LandingPage({onSignIn,onGetStarted,user,onDashboard}) {
  const [faq, setFaq] = useState(null);

  const FEATS=[
    {r:"ᚦ",name:"Prospect + Pitch",desc:"Find businesses with no website in any city. AI generates a full pitch package — SMS, call script, and email — before you even dial.",pills:["Any city, any category","Lead scoring","Text + call + email","A/B variants","Auto follow-up","CRM sync"]},
    {r:"ᚲ",name:"Build — Full Freedom",desc:"Agentic AI builds the site from the business's own data. Then complete control: Wix-style editor, full code access, CMS, e-commerce, booking, courses — no restrictions.",pills:["Agentic Build Mode","Wix-style drag-and-drop","Full code access","Built-in CMS","E-commerce + booking","React export"]},
    {r:"ᚱ",name:"Deploy + Optimize",desc:"One click to GitHub and Netlify. AI SEO + AEO, schema markup, GSAP animations, client review mode, uptime monitoring, staging environments.",pills:["GitHub + Netlify","Custom domains","AI SEO + AEO","GSAP animations","Client review mode","Uptime monitoring"]},
    {r:"ᛏ",name:"Full Agency OS",desc:"Proposals, contracts, invoices, deal pipeline, client health score, pitch video generator, voicemail drop, maintenance billing, and a template marketplace.",pills:["Proposals + e-signature","Stripe invoicing","Client health score","Voicemail drop","Maintenance billing","Marketplace"]},
  ];

  return (
    <div className="land">
      {/* ANNOUNCEMENT */}
      <div className="land-ann">
        <div className="land-ann-dot"/>
        <span className="land-ann-txt">Early access is now open — limited spots available</span>
        <a href="#pricing" className="land-ann-lnk">See pricing →</a>
      </div>

      {/* NAV */}
      <nav className="land-nav">
        <div className="land-logo"><span className="land-logo-g">ᚱ</span>RUNE SCRIPT</div>
        <div className="land-nav-r">
          {user ? (
            <>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.62rem',letterSpacing:'1.5px',color:'#5a5868',textTransform:'uppercase'}}>
                {user.name?.split(' ')[0]}
              </span>
              <button className="btn btn-gold" onClick={onDashboard}>Dashboard →</button>
            </>
          ) : (
            <>
              <button className="btn btn-ghost" onClick={onSignIn}>Sign In</button>
              <button className="btn btn-gold" onClick={onGetStarted}>Get Started Free</button>
            </>
          )}
        </div>
      </nav>

      {/* HERO */}
      <section className="land-hero">
        <div>
          <div className="land-hero-badge"><div className="land-ann-dot"/>EARLY ACCESS — NOW OPEN</div>
          <h1 className="land-h1">
            Build Websites.<br/>
            <span className="land-h1-gold">Build an Empire.</span><br/>
            <span className="land-h1-dim">Build Your Future.</span>
          </h1>
          <p className="land-sub">
            Rune Script finds businesses that need you, <em>gives you the words to win them over</em>, and builds their site — before you hang up the phone.
          </p>
          <div className="land-btns">
            {user ? (
              <button className="btn btn-lg btn-lg-gold" onClick={onDashboard}>Go to Dashboard →</button>
            ) : (
              <>
                <button className="btn btn-lg btn-lg-gold" onClick={onGetStarted}>Start for Free</button>
                <button className="btn btn-lg btn-lg-out" onClick={onSignIn}>Sign In →</button>
              </>
            )}
          </div>
          <div className="land-trust">
            {["No credit card","Deploy to GitHub","AI-powered builds","Cancel anytime"].map(t=>(
              <span key={t} className="land-trust-item"><span className="land-trust-g">ᚱ</span>{t}</span>
            ))}
          </div>
        </div>
        <LandingTerminal/>
      </section>

      {/* LIVE STATS BAR */}
      <div className="land-live-bar">
        <div className="land-live-inner">
          <div className="land-live-dot"/>
          {[{n:"3,412",l:"Prospects Found"},  {n:"1,847",l:"Sites Built"},{n:"512",l:"Clients Closed"},{n:"$847K",l:"Revenue Tracked"},{n:"218",l:"Agencies Running"}].map((s,i)=>(
            <div key={i} className="land-live-stat">
              <span className="land-live-n">{s.n}</span>
              <span className="land-live-label">{s.l}</span>
              {i<4&&<span style={{color:"rgba(201,168,76,.15)",marginLeft:8}}>·</span>}
            </div>
          ))}
        </div>
      </div>

      {/* PILL STRIP — static, no animation, no jitter */}
      <div className="land-pills">
        <div className="land-pills-wrap">
          {["AI Prospect Scanner","Pitch Generator","GitHub Deploy","Wix-Style Editor","Full Code Access","Built-in CMS","E-commerce","Booking System","Online Courses","Agentic Build Mode","Agency OS","AI Studio","Marketplace","White Label","Reseller Program","Mobile App Builder","GSAP Animations","Real-Time Collab","Client Review Mode","AI SEO + AEO","Voicemail Drop","Version History"].map(p=>(
            <span key={p} className="land-pill">{p}</span>
          ))}
        </div>
      </div>

      {/* STATS */}
      <div className="land-stats">
        {[{n:"50+",l:"Min Reviews Required"},{n:"14min",l:"Avg Site Build Time"},{n:"150+",l:"Built-in Features"},{n:"6",l:"Competitors Obliterated"},{n:"100%",l:"No Code Required"}].map((s,i)=>(
          <div key={i} className="land-stat">
            <div className="land-stat-n">{s.n}</div>
            <div className="land-stat-l">{s.l}</div>
          </div>
        ))}
      </div>

      {/* FEATURES */}
      <section className="land-sec">
        <div className="land-tag">Features</div>
        <h2 className="land-h2">Everything You Need<br/>To Close the Deal</h2>
        <p className="land-sub-txt">One platform. Find the prospect. Write the pitch. Build the site. Run the agency. Keep the client.</p>
        <div className="land-feat-grid">
          {FEATS.map((f,i)=>(
            <div key={i} className="land-feat">
              <div className="land-feat-r">{f.r}</div>
              <div className="land-feat-name">{f.name}</div>
              <p className="land-feat-desc" style={{marginBottom:14}}>{f.desc}</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {f.pills.map(p=><span key={p} style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".54rem",letterSpacing:"1px",textTransform:"uppercase",padding:"3px 8px",color:"#5a5868"}}>{p}</span>)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS — reuses StepSection memo component */}
      <div className="land-how">
        <div className="land-how-inner">
          <div className="land-tag">How It Works</div>
          <h2 className="land-h2">Three Moves.<br/>One New Client.</h2>
          <p className="land-sub-txt">The full pipeline from blank search to live site in under an hour.</p>
          <StepSection/>
        </div>
      </div>

      {/* USE CASES */}
      <section className="land-uc-section">
        <div className="land-tag">Use Cases</div>
        <h2 className="land-h2">Built for Builders<br/>at Every Level</h2>
        <p className="land-sub-txt">Whether you are just starting or scaling fast, Rune Script meets you where you are.</p>
        <div className="land-uc-grid">
          {LANDING_USE_CASES.map((u,i)=>(
            <div key={i} className="land-uc-card">
              <div className="land-uc-who">{u.who}</div>
              <div className="land-uc-name">{u.name}</div>
              <p className="land-uc-desc">{u.desc}</p>
              <ul className="land-uc-list">
                {u.items.map(it=><li key={it} className="land-uc-li"><span className="land-uc-g">ᚱ</span>{it}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* REVIEWS — reuses Carousel + REVIEW_DATA */}
      <div className="land-reviews-section">
        <div className="land-reviews-inner">
          <div className="land-tag" style={{justifyContent:"center",marginBottom:12}}>What Builders Are Saying</div>
          <h2 className="land-h2" style={{textAlign:"center",marginBottom:8}}>Trusted by Designers Across the Country</h2>
          <p style={{textAlign:"center",fontSize:".9rem",fontWeight:300,color:"#5a5868",marginBottom:36}}>Real results from real web designers who closed real clients.</p>
          <Carousel/>
        </div>
      </div>

      {/* PRICING */}
      <div id="pricing" className="land-price-section">
        <div className="land-price-inner">
          <div className="land-tag">Pricing</div>
          <h2 className="land-h2">Start Free.<br/>Scale When Ready.</h2>
          <p className="land-sub-txt">No contracts, no surprises. Every feature listed — exactly what you get at each tier.</p>

          <div className="land-price-label">// STARTER PLANS</div>
          <div className="land-price-row">
            {LANDING_PLANS.slice(0,3).map((p,i)=>(
              <div key={i} className="land-plan">
                <div className="land-plan-tier">{p.tier}</div>
                <div className="land-plan-price">{p.price}{p.price!=="Free"&&<sub>/mo</sub>}</div>
                <div className="land-plan-cycle">{p.cycle}</div>
                <p style={{fontSize:".76rem",fontWeight:300,color:"#5a5868",lineHeight:1.6,marginBottom:20,paddingBottom:16,borderBottom:"1px solid rgba(201,168,76,.07)"}}>{p.tagline}</p>
                <ul className="land-plan-feats">
                  {p.groups?.flatMap(g=>g.feats).map((f,j)=><li key={j} className="land-plan-feat"><span className="land-plan-feat-ic">ᚱ</span>{f}</li>)}
                </ul>
                <button className="btn btn-ghost" style={{width:"100%",padding:"11px"}} onClick={onGetStarted}>
                  {p.price==="Free"?"Start Free":"Get Started"}
                </button>
              </div>
            ))}
          </div>

          <div className="land-price-label" style={{marginTop:24}}>// PRO PLANS — For Agencies</div>
          <div className="land-price-row">
            {LANDING_PLANS.slice(3).map((p,i)=>(
              <div key={i} className={`land-plan${p.featured?" land-plan-featured":""}`}>
                {p.featured&&<div className="land-plan-badge">Most Popular</div>}
                <div className="land-plan-tier">{p.tier}</div>
                <div className="land-plan-price">{p.price}<sub>/mo</sub></div>
                <div className="land-plan-cycle">{p.cycle}</div>
                <p style={{fontSize:".76rem",fontWeight:300,color:"#5a5868",lineHeight:1.6,marginBottom:16,paddingBottom:14,borderBottom:"1px solid rgba(201,168,76,.07)"}}>{p.tagline}</p>
                {p.groups?.map((g,gi)=>(
                  <div key={gi} style={{marginBottom:14}}>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".54rem",letterSpacing:"2.5px",textTransform:"uppercase",color:"#c9a84c",opacity:.5,marginBottom:8}}>{g.name}</div>
                    <ul className="land-plan-feats">
                      {g.feats.map((f,j)=><li key={j} className="land-plan-feat"><span className="land-plan-feat-ic">ᚱ</span>{f}</li>)}
                    </ul>
                  </div>
                ))}
                <button className={p.featured?"btn btn-gold":"btn btn-ghost"} style={{width:"100%",padding:"11px",marginTop:8}} onClick={onGetStarted}>
                  Get Started
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <section className="land-faq-section">
        <div className="land-tag">FAQ</div>
        <h2 className="land-h2">Questions,<br/>Answered.</h2>
        <div className="land-faq-list">
          {LANDING_FAQS.map((f,i)=>(
            <div key={i} className="land-faq-item">
              <button className={`land-faq-q${faq===i?" land-faq-q-on":""}`} onClick={()=>setFaq(faq===i?null:i)}>
                {f.q}<span className="land-faq-chev">+</span>
              </button>
              <div className={`land-faq-a${faq===i?" land-faq-a-on":""}`}><p>{f.a}</p></div>
            </div>
          ))}
        </div>
      </section>


      {/* LIVE SCANNER DEMO — no signup required */}
      <div className="land-scanner">
        <div className="land-scanner-inner">
          <div className="land-tag">Try It Live</div>
          <h2 className="land-h2" style={{marginBottom:8}}>Find Your First Prospect<br/>Right Now. No Sign-Up.</h2>
          <p style={{fontSize:".88rem",fontWeight:300,color:"#5a5868",lineHeight:1.8,marginBottom:24}}>Type any city and any type of business. Watch the AI find you real targets in seconds.</p>
          <EmbeddedScanner onGetStarted={onGetStarted}/>
        </div>
      </div>

      {/* CREATOR PROGRAM TEASER */}
      <section className="land-creator">
        <div className="land-tag">Creator Program</div>
        <h2 className="land-h2">Build With Us.<br/>Get Paid in Access.</h2>
        <p className="land-sub-txt">If you have an audience of web designers, freelancers, or entrepreneurs — we want to work with you. Free plan access in exchange for authentic content. No scripts. No minimums.</p>
        <div className="land-creator-grid">
          {[
            {tier:"Archon Partner",req:"10K+ followers on any platform",value:"Free $99/mo plan",feats:["Full platform access — pitch, build, deploy","Agency OS and AI Studio","3 team seats","Everything you need to show real results"]},
            {tier:"Sovereign Partner",req:"50K+ followers · agency / freelance audience",value:"Free $199/mo plan",feats:["Everything in Archon","Mobile app builder","Full automation suite","White-label client portal — show what's possible"]},
            {tier:"Collab Program",req:"Any size — strong engagement over raw numbers",value:"Free Scribe plan",feats:["Unlimited scanning and building","Full pitch generator","GitHub deploy","Best for showcasing the core workflow"]},
          ].map((t,i)=>(
            <div key={i} className="land-creator-card">
              <div className="land-creator-card-tier">{t.tier}</div>
              <div className="land-creator-card-name">{t.value}</div>
              <div className="land-creator-card-req">{t.req}</div>
              <ul className="land-creator-card-feats">
                {t.feats.map(f=><li key={f} className="land-plan-feat"><span className="land-plan-feat-ic">ᚱ</span>{f}</li>)}
              </ul>
              <button className="btn btn-ghost btn-sm" onClick={onGetStarted}>Apply →</button>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="land-cta-strip">
        <h2 className="land-h2" style={{textAlign:"center",marginBottom:12}}>Ready to Cast<br/>Your First Spell?</h2>
        <p className="land-cta-sub">Join web designers turning cold searches into paying clients.</p>
        <div className="land-cta-btns">
          {user ? (
            <button className="btn btn-lg btn-lg-gold" onClick={onDashboard}>Go to Dashboard →</button>
          ) : (
            <>
              <button className="btn btn-lg btn-lg-gold" onClick={onGetStarted}>Start Building Free</button>
              <button className="btn btn-lg btn-lg-out" onClick={onSignIn}>Sign In</button>
            </>
          )}
        </div>
      </div>

      {/* FOOTER */}
      <div className="land-footer">
        <div className="land-logo"><span className="land-logo-g">ᚱ</span>RUNE SCRIPT</div>
        <div style={{display:"flex",gap:28,flexWrap:"wrap"}}>
          {["Features","How It Works","Pricing","FAQ"].map(l=>(
            <a key={l} href={`#${l.toLowerCase().replace(/ /g,'')}`} style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".6rem",letterSpacing:"2px",textTransform:"uppercase",color:"#2e2d3c",textDecoration:"none"}}>{l}</a>
          ))}
        </div>
        <span className="land-footer-copy">© 2026 Rune Script — All rights reserved</span>
      </div>
    </div>
  );
}



// ── DATA & SHARED ─────────────────────────────────────────────────────────
const REVIEW_DATA=[
  {text:"Closed my first client two hours after finding Rune Script. Sent the site link mid-call. They didn't even ask for changes.",author:"Jordan M.",role:"Freelance Web Designer"},
  {text:"The only platform that starts with finding the client. That's the hard part — solved.",author:"Darius K.",role:"Agency Owner, Atlanta"},
  {text:"Built six sites in a weekend. Two clients by Tuesday.",author:"Priya S.",role:"CS Student, Side Hustle"},
  {text:"The pitch generator alone is worth the subscription.",author:"Marcus T.",role:"Freelance Designer, Dallas"},
  {text:"Rune Script automated the whole front end of our pipeline.",author:"Sofia R.",role:"Agency Owner, Miami"},
  {text:"My first site took 8 minutes. Client thought I had a whole team.",author:"Alex P.",role:"Solo Web Designer"},
  {text:"Agency OS alone justifies Archon. Shut down four separate subscriptions.",author:"James O.",role:"Web Agency Owner, Chicago"},
  {text:"Pitched a roofing company Thursday, had a signed contract by the weekend.",author:"Tyler N.",role:"Freelance Designer, Houston"},
  {text:"GBP tool earns me recurring revenue. 10 minutes per client.",author:"Camille B.",role:"Digital Agency, Nashville"},
  {text:"Set up a blog for a restaurant client. They update it themselves now.",author:"Devon L.",role:"Freelance Designer, Portland"},
  {text:"Added e-commerce to a bakery in 20 minutes. First order before I left the call.",author:"Yara F.",role:"Web Designer, Austin"},
  {text:"Client review mode is a game changer. Comments on specific elements, no email chain.",author:"Nathan W.",role:"Agency Lead, Seattle"},
  {text:"I was a plumber who hated my job. Used Rune Script on nights and weekends. Six months later I quit and went full-time. This thing changed my life.",author:"Ray D.",role:"Former Plumber, Now Full-Time Designer"},
  {text:"Ran a scan on Saturday morning while drinking coffee. By noon I had three callbacks. By Sunday night I had two signed deals. I don't even know what happened.",author:"Keisha T.",role:"Weekend Side Hustler, Charlotte"},
  {text:"I manage 14 clients with two employees. Before Rune Script I was drowning. Now I have time to actually think.",author:"Marco V.",role:"Agency Owner, Phoenix"},
  {text:"The Domain Manager alone saved me three different subscriptions I was paying for. Everything is in one place now.",author:"Sasha L.",role:"Freelance Designer, Denver"},
  {text:"My marketing professor literally used my Rune Script business as a case study. I'm a sophomore.",author:"Amara O.",role:"Sophomore, University of Michigan"},
  {text:"Applied to the Creator Program, got approved in 24 hours, did a walkthrough on TikTok. My DMs haven't stopped since.",author:"Luis F.",role:"Content Creator & Designer, 180K followers"},
  {text:"Showed a client a live site during our first call. They asked me how long it would take to build. I said it was already done. I got the job.",author:"Preet K.",role:"Freelance Web Designer, Toronto"},
  {text:"I've tried Webflow, Wix, Squarespace, Framer, and probably five others. None of them found me the client. Rune Script did.",author:"Danielle H.",role:"Designer, Los Angeles"},
  {text:"I white-labeled the whole thing under my agency brand. My clients have no idea Rune Script exists. They just think I built an incredibly sophisticated internal tool.",author:"Victor A.",role:"Agency Owner, Warden Plan"},
  {text:"Used the AI Studio to generate a month of social content for a dental clinic. Client paid me $600 extra for it. Took me 20 minutes.",author:"Lena W.",role:"Digital Marketing Freelancer"},
  {text:"The cold call script it generates doesn't sound like AI. It sounds like someone who actually read their Google reviews.",author:"Chris B.",role:"Sales-Focused Web Designer"},
  {text:"I run a design agency in Lagos. Finding clients with no website in a city of 20 million is like having a cheat code.",author:"Tunde A.",role:"Agency Owner, Lagos"},
];


const MOCK_TEMPLATES=[{"id":"t1","name":"CoolAir Pro","cat":"HVAC","desc":"Emergency HVAC with seasonal packages, financing badge, and service area map.","price":42,"rating":4.7,"reviews":85,"seller":"Keisha T.","colors":["#0a1428","#4a90c8","#e8f4fc"],"featured":true,"tags":["HVAC","Responsive","SEO-Ready"]},{"id":"t2","name":"HeatRight","cat":"HVAC","desc":"Heating specialist with energy savings calculator, maintenance plans, smart thermostat promo.","price":39,"rating":4.7,"reviews":68,"seller":"Camille B.","colors":["#1a0808","#c84820","#fff4ee"],"featured":true,"tags":["HVAC","Responsive","SEO-Ready"]},{"id":"t3","name":"AirFlow Elite","cat":"HVAC","desc":"Commercial HVAC with equipment gallery, ROI calculator, and preventive maintenance tab.","price":55,"rating":4.9,"reviews":63,"seller":"Devon L.","colors":["#0a0a14","#c9a84c","#1a1a28"],"featured":true,"tags":["HVAC","Responsive","SEO-Ready"]},{"id":"t4","name":"CoolBreeze Systems","cat":"HVAC","desc":"Residential AC with UV light add-on, air quality badge, and 24/7 emergency CTA.","price":45,"rating":4.7,"reviews":39,"seller":"Ray D.","colors":["#081428","#40b0e0","#f0f8fc"],"featured":true,"tags":["HVAC","Responsive","SEO-Ready"]},{"id":"t5","name":"ThermalPro","cat":"HVAC","desc":"Industrial HVAC with project portfolio, compliance certifications, and quote builder.","price":59,"rating":4.9,"reviews":25,"seller":"Chris B.","colors":["#0a0a14","#60a040","#f0f8ec"],"featured":true,"tags":["HVAC","Responsive","SEO-Ready"]},{"id":"t6","name":"ClimateKing","cat":"HVAC","desc":"Full HVAC suite with before/after gallery, brand comparison, and financing options.","price":48,"rating":4.9,"reviews":45,"seller":"Devon L.","colors":["#0a1428","#5090c0","#f0f4fc"],"featured":true,"tags":["HVAC","Responsive","SEO-Ready"]},{"id":"t7","name":"ArcticAir","cat":"HVAC","desc":"Ice-cold branding, emergency banner, service video section, and customer reviews widget.","price":44,"rating":4.9,"reviews":52,"seller":"Marcus T.","colors":["#0a1428","#40c0e0","#e8f8fc"],"featured":true,"tags":["HVAC","Responsive","SEO-Ready"]},{"id":"t8","name":"ComfortZone HVAC","cat":"HVAC","desc":"Family-owned feel with neighborhood map, loyalty program, and seasonal tune-up CTA.","price":38,"rating":4.8,"reviews":74,"seller":"Sasha L.","colors":["#0a1428","#c09030","#f8f4e8"],"featured":true,"tags":["HVAC","Responsive","SEO-Ready"]},{"id":"t9","name":"PurAir Systems","cat":"HVAC","desc":"IAQ focus with air testing CTA, filter subscription service, and allergen info section.","price":49,"rating":4.8,"reviews":65,"seller":"Jordan M.","colors":["#081428","#5098b0","#f0f8fc"],"featured":true,"tags":["HVAC","Responsive","SEO-Ready"]},{"id":"t10","name":"EliteClimate","cat":"HVAC","desc":"Luxury HVAC branding with white-glove service badge, dedicated account manager.","price":65,"rating":4.7,"reviews":12,"seller":"Amara O.","colors":["#0a0a14","#c9a84c","#2a2a3a"],"featured":false,"tags":["HVAC","Responsive","SEO-Ready"]},{"id":"t11","name":"FlowMaster","cat":"Plumbing","desc":"Emergency plumbing hero, pipe camera service, drain cleaning, and senior discount badge.","price":35,"rating":4.8,"reviews":66,"seller":"Tyler N.","colors":["#0a1428","#4080a0","#f0f8fc"],"featured":false,"tags":["Plumbing","Responsive","SEO-Ready"]},{"id":"t12","name":"PipePro Elite","cat":"Plumbing","desc":"Commercial plumbing with project gallery, code compliance section, and bulk contract form.","price":49,"rating":4.7,"reviews":39,"seller":"Amara O.","colors":["#0a0a14","#c9a84c","#1a1a28"],"featured":false,"tags":["Plumbing","Responsive","SEO-Ready"]},{"id":"t13","name":"DrainDoctor","cat":"Plumbing","desc":"Clog specialist with symptom checker, hydro-jetting info, and camera inspection service.","price":39,"rating":4.6,"reviews":58,"seller":"Jordan M.","colors":["#0a1428","#40a0b0","#f0f8fc"],"featured":false,"tags":["Plumbing","Responsive","SEO-Ready"]},{"id":"t14","name":"AquaFlow","cat":"Plumbing","desc":"Residential plumbing with water heater comparison, fixture gallery, and maintenance plan.","price":42,"rating":4.9,"reviews":66,"seller":"Jordan M.","colors":["#0a1428","#3090c0","#f0f4fc"],"featured":false,"tags":["Plumbing","Responsive","SEO-Ready"]},{"id":"t15","name":"LeakStop Pro","cat":"Plumbing","desc":"Water damage prevention focus, moisture detection, slab leak repair, and insurance help.","price":45,"rating":4.9,"reviews":86,"seller":"Ray D.","colors":["#080a18","#4070b0","#f0f4fc"],"featured":false,"tags":["Plumbing","Responsive","SEO-Ready"]},{"id":"t16","name":"BlueLine Plumbing","cat":"Plumbing","desc":"Clean blue branding, 5-star highlight, same-day service badge, and satisfaction guarantee.","price":38,"rating":4.6,"reviews":88,"seller":"Lena W.","colors":["#0a1428","#4090d0","#f0f8fc"],"featured":false,"tags":["Plumbing","Responsive","SEO-Ready"]},{"id":"t17","name":"GreenFlow","cat":"Plumbing","desc":"Eco-friendly plumbing with water conservation tips, tankless water heaters, and rebate info.","price":44,"rating":4.8,"reviews":72,"seller":"Priya S.","colors":["#081808","#50a840","#f0f8ec"],"featured":false,"tags":["Plumbing","Responsive","SEO-Ready"]},{"id":"t18","name":"QuickFix Plumbing","cat":"Plumbing","desc":"Speed-focused with under-1-hour response CTA, pricing transparency, and booking widget.","price":36,"rating":4.9,"reviews":46,"seller":"Jordan M.","colors":["#0a1428","#e04020","#fff4ee"],"featured":false,"tags":["Plumbing","Responsive","SEO-Ready"]},{"id":"t19","name":"PipeLine Pro","cat":"Plumbing","desc":"Full-service with trenchless technology, repiping info, and lifetime warranty section.","price":55,"rating":4.6,"reviews":17,"seller":"Sasha L.","colors":["#0a0a14","#c9a84c","#1a1a28"],"featured":false,"tags":["Plumbing","Responsive","SEO-Ready"]},{"id":"t20","name":"TotalPlumb","cat":"Plumbing","desc":"Comprehensive with sewer line, water main, gas line sections and 24/7 dispatch.","price":47,"rating":4.9,"reviews":87,"seller":"Danielle H.","colors":["#0a1428","#4090b0","#f0f8fc"],"featured":false,"tags":["Plumbing","Responsive","SEO-Ready"]},{"id":"t21","name":"WireUp Pro","cat":"Electrical","desc":"Panel upgrades, EV charger installation, smart home section, and safety inspection CTA.","price":45,"rating":5.0,"reviews":11,"seller":"Chris B.","colors":["#0a0a14","#f0c040","#2a2808"],"featured":false,"tags":["Electrical","Responsive","SEO-Ready"]},{"id":"t22","name":"SparkRight","cat":"Electrical","desc":"Residential electrical with troubleshooting guide, permit help, and energy audit.","price":39,"rating":4.7,"reviews":75,"seller":"Amara O.","colors":["#0a0a14","#e0a020","#2a2000"],"featured":false,"tags":["Electrical","Responsive","SEO-Ready"]},{"id":"t23","name":"CurrentElectric","cat":"Electrical","desc":"Commercial electrical with code compliance badge, emergency generator, and load calculation.","price":55,"rating":4.7,"reviews":78,"seller":"Sasha L.","colors":["#0a0a14","#c9a84c","#1a1a28"],"featured":false,"tags":["Electrical","Responsive","SEO-Ready"]},{"id":"t24","name":"BrightWire","cat":"Electrical","desc":"Home electrical with Instagram gallery, before/after panel photos, and licensed badge.","price":41,"rating":4.8,"reviews":39,"seller":"Priya S.","colors":["#080808","#f0c040","#2a2800"],"featured":false,"tags":["Electrical","Responsive","SEO-Ready"]},{"id":"t25","name":"PowerHouse Electric","cat":"Electrical","desc":"Industrial power with HV expertise, project portfolio, and union certification badge.","price":59,"rating":4.7,"reviews":79,"seller":"Chris B.","colors":["#0a0808","#d09020","#f8f4e8"],"featured":false,"tags":["Electrical","Responsive","SEO-Ready"]},{"id":"t26","name":"EcoElectric","cat":"Electrical","desc":"Solar integration, EV chargers, smart panels, energy storage \u2014 green electrical focus.","price":49,"rating":4.6,"reviews":83,"seller":"Camille B.","colors":["#081808","#60b040","#f0f8ec"],"featured":false,"tags":["Electrical","Responsive","SEO-Ready"]},{"id":"t27","name":"24/7 Electric","cat":"Electrical","desc":"Emergency banner, fast response guarantee, all-hours availability, and surge protection.","price":43,"rating":4.9,"reviews":52,"seller":"Marco V.","colors":["#0a0808","#e03020","#fff4ee"],"featured":false,"tags":["Electrical","Responsive","SEO-Ready"]},{"id":"t28","name":"SmartHome Electric","cat":"Electrical","desc":"Automation specialist with Lutron, Nest, Ring integrations, and demo video section.","price":58,"rating":4.8,"reviews":76,"seller":"Yara F.","colors":["#080a18","#4060c0","#f0f4fc"],"featured":false,"tags":["Electrical","Responsive","SEO-Ready"]},{"id":"t29","name":"SafeWire","cat":"Electrical","desc":"Safety-focused with GFCI/AFCI info, inspection checklist, and senior safety discount.","price":38,"rating":5.0,"reviews":44,"seller":"Sofia R.","colors":["#0a1428","#40a0b0","#f0f8fc"],"featured":false,"tags":["Electrical","Responsive","SEO-Ready"]},{"id":"t30","name":"VoltPro Electric","cat":"Electrical","desc":"Licensed + insured badge, union membership, BBB rating highlight, and testimonial wall.","price":46,"rating":4.6,"reviews":55,"seller":"Devon M.","colors":["#0a0a14","#d09830","#f8f4e8"],"featured":false,"tags":["Electrical","Responsive","SEO-Ready"]},{"id":"t31","name":"RoofRight Pro","cat":"Roofing","desc":"Storm damage hero, insurance claim guide, before/after gallery, and free inspection CTA.","price":45,"rating":5.0,"reviews":21,"seller":"Darius K.","colors":["#1a1a2a","#e05050","#ffffff"],"featured":false,"tags":["Roofing","Responsive","SEO-Ready"]},{"id":"t32","name":"ShieldRoof","cat":"Roofing","desc":"Lifetime warranty badge, material comparison table, drone inspection video, and financing.","price":52,"rating":4.9,"reviews":83,"seller":"Marcus T.","colors":["#0a0a14","#c9a84c","#1a1a28"],"featured":false,"tags":["Roofing","Responsive","SEO-Ready"]},{"id":"t33","name":"StormPro Roofing","cat":"Roofing","desc":"Hurricane/hail specialist, emergency tarp service, insurance adjuster coordination.","price":48,"rating":5.0,"reviews":84,"seller":"Yara F.","colors":["#0a0814","#e04030","#fff4ee"],"featured":false,"tags":["Roofing","Responsive","SEO-Ready"]},{"id":"t34","name":"PeakLine Roofing","cat":"Roofing","desc":"Architectural shingles showcase, manufacturer certifications, and neighborhood reference map.","price":44,"rating":4.9,"reviews":56,"seller":"Marco V.","colors":["#0a0a14","#c08830","#f8f4e8"],"featured":false,"tags":["Roofing","Responsive","SEO-Ready"]},{"id":"t35","name":"GreenRoof Systems","cat":"Roofing","desc":"Solar-ready roofing, cool roof technology, LEED certification, and energy savings.","price":55,"rating":4.8,"reviews":76,"seller":"Lena W.","colors":["#081808","#60a840","#f0f8ec"],"featured":false,"tags":["Roofing","Responsive","SEO-Ready"]},{"id":"t36","name":"CommercialRoof Co","cat":"Roofing","desc":"Flat roof specialist, TPO/EPDM comparison, preventive maintenance program, portfolio.","price":59,"rating":4.8,"reviews":51,"seller":"Darius K.","colors":["#0a0a14","#c9a84c","#1a1a28"],"featured":false,"tags":["Roofing","Responsive","SEO-Ready"]},{"id":"t37","name":"RoofGuard","cat":"Roofing","desc":"Gutter + roof combo, ventilation upgrade section, winter protection tips, and warranties.","price":41,"rating":5.0,"reviews":30,"seller":"Yara F.","colors":["#0a1428","#5080a0","#f0f4fc"],"featured":false,"tags":["Roofing","Responsive","SEO-Ready"]},{"id":"t38","name":"TileRoof Masters","cat":"Roofing","desc":"Clay and concrete tile specialist, Spanish/Mediterranean style gallery, HOA compliance.","price":49,"rating":4.8,"reviews":67,"seller":"Keisha T.","colors":["#1a0808","#c06030","#fff4ee"],"featured":false,"tags":["Roofing","Responsive","SEO-Ready"]},{"id":"t39","name":"MetalRoof Pro","cat":"Roofing","desc":"Standing seam metal with 50-year life stats, noise reduction info, and insurance savings.","price":56,"rating":4.8,"reviews":32,"seller":"Chris B.","colors":["#0a0a14","#8090a0","#f0f4f8"],"featured":false,"tags":["Roofing","Responsive","SEO-Ready"]},{"id":"t40","name":"FastRoof","cat":"Roofing","desc":"72-hour complete replacement guarantee, streamlined process, before/after timeline photos.","price":47,"rating":5.0,"reviews":69,"seller":"Ray D.","colors":["#0a0808","#e04020","#fff4ee"],"featured":false,"tags":["Roofing","Responsive","SEO-Ready"]},{"id":"t41","name":"TableSix","cat":"Restaurant","desc":"Upscale dining with full menu sections, reservation widget, chef profile, and wine list.","price":69,"rating":4.7,"reviews":42,"seller":"Marco V.","colors":["#1a0808","#c89030","#f8f4ee"],"featured":false,"tags":["Restaurant","Responsive","SEO-Ready"]},{"id":"t42","name":"Ember BBQ","cat":"Restaurant","desc":"Pit master story, catering packages, online ordering, and family meal deals.","price":59,"rating":4.6,"reviews":75,"seller":"Danielle H.","colors":["#1a0800","#c84020","#fff0e8"],"featured":false,"tags":["Restaurant","Responsive","SEO-Ready"]},{"id":"t43","name":"Sakura Garden","cat":"Restaurant","desc":"Japanese with photo menu, chef's table booking, omakase packages, and loyalty cards.","price":65,"rating":4.7,"reviews":77,"seller":"Lena W.","colors":["#1a0810","#e87090","#fff0f4"],"featured":false,"tags":["Restaurant","Responsive","SEO-Ready"]},{"id":"t44","name":"Vegan Roots","cat":"Restaurant","desc":"Plant-based with allergen filter, meal kit subscription, and nutrition info sections.","price":49,"rating":4.9,"reviews":72,"seller":"Sasha L.","colors":["#081a0a","#60c060","#f0f8f0"],"featured":false,"tags":["Restaurant","Responsive","SEO-Ready"]},{"id":"t45","name":"Pizza Underground","cat":"Restaurant","desc":"Customizable order builder, delivery tracking CTA, monthly specials, and loyalty.","price":55,"rating":4.8,"reviews":31,"seller":"Marco V.","colors":["#1a0800","#e84020","#fff4ee"],"featured":false,"tags":["Restaurant","Responsive","SEO-Ready"]},{"id":"t46","name":"CaterCo","cat":"Restaurant","desc":"Full-service catering with package comparison, taste-testing booking, event gallery.","price":79,"rating":4.8,"reviews":27,"seller":"Luis F.","colors":["#0a1428","#c09040","#f8f4ee"],"featured":false,"tags":["Restaurant","Responsive","SEO-Ready"]},{"id":"t47","name":"Morning Cup Caf\u00e9","cat":"Restaurant","desc":"Cozy caf\u00e9 with menu cards, seasonal specials, loyalty program, and location hours.","price":49,"rating":4.9,"reviews":27,"seller":"Lena W.","colors":["#1a1008","#c07830","#fff8f0"],"featured":false,"tags":["Restaurant","Responsive","SEO-Ready"]},{"id":"t48","name":"Tap & Barrel","cat":"Restaurant","desc":"Craft bar with rotating tap list, events calendar, brewery tour booking, merchandise.","price":59,"rating":4.8,"reviews":19,"seller":"Danielle H.","colors":["#0a0a08","#c89030","#2a2010"],"featured":false,"tags":["Restaurant","Responsive","SEO-Ready"]},{"id":"t49","name":"Street Eats","cat":"Restaurant","desc":"Food truck with weekly schedule map, menu board, catering booking, and social feed.","price":39,"rating":4.7,"reviews":57,"seller":"Luis F.","colors":["#1a0a00","#f06030","#fff4ee"],"featured":false,"tags":["Restaurant","Responsive","SEO-Ready"]},{"id":"t50","name":"The Bistro","cat":"Restaurant","desc":"European bistro with prix fixe menu, wine pairing, private dining room, and events.","price":72,"rating":4.7,"reviews":39,"seller":"Amara O.","colors":["#1a0808","#c09040","#f8f4ee"],"featured":false,"tags":["Restaurant","Responsive","SEO-Ready"]},{"id":"t51","name":"Noodle House","cat":"Restaurant","desc":"Asian noodle bar with broth customizer, topping options, loyalty stamps, and catering.","price":52,"rating":4.8,"reviews":37,"seller":"Devon L.","colors":["#1a0808","#e07030","#fff4ee"],"featured":false,"tags":["Restaurant","Responsive","SEO-Ready"]},{"id":"t52","name":"Smokehouse BBQ","cat":"Restaurant","desc":"Texas-style with daily specials board, pit photos, bulk ordering, and delivery zone map.","price":58,"rating":4.7,"reviews":86,"seller":"Marco V.","colors":["#1a0800","#c84020","#fff0e8"],"featured":false,"tags":["Restaurant","Responsive","SEO-Ready"]},{"id":"t53","name":"The Taco Spot","cat":"Restaurant","desc":"Colorful Mexican with visual menu, combo builder, party trays, and late-night hours.","price":44,"rating":4.6,"reviews":30,"seller":"Alex P.","colors":["#1a0808","#e07030","#fff4f0"],"featured":false,"tags":["Restaurant","Responsive","SEO-Ready"]},{"id":"t54","name":"FreshBowl","cat":"Restaurant","desc":"Healthy fast-casual with macro calculator, ingredient guide, subscription bowls, and delivery.","price":48,"rating":4.9,"reviews":74,"seller":"Danielle H.","colors":["#081a08","#60c060","#f0f8f0"],"featured":false,"tags":["Restaurant","Responsive","SEO-Ready"]},{"id":"t55","name":"Cloud Kitchen","cat":"Restaurant","desc":"Ghost kitchen with multiple brand showcase, delivery-only focus, and driver pickup info.","price":55,"rating":4.9,"reviews":46,"seller":"Priya S.","colors":["#0a0a14","#c9a84c","#1a1a28"],"featured":false,"tags":["Restaurant","Responsive","SEO-Ready"]},{"id":"t56","name":"SmileFirst Dental","cat":"Health & Wellness","desc":"Modern dental with service icons, before/after gallery, new patient offer.","price":75,"rating":5.0,"reviews":32,"seller":"Tunde A.","colors":["#0a1428","#40a0c8","#f0f8fc"],"featured":false,"tags":["Health & Wellness","Responsive","SEO-Ready"]},{"id":"t57","name":"BackInLine Chiro","cat":"Health & Wellness","desc":"Chiropractic with condition navigation, adjustment video, insurance info.","price":65,"rating":4.6,"reviews":10,"seller":"Darius K.","colors":["#0a1a28","#50b0d0","#f0f8fc"],"featured":false,"tags":["Health & Wellness","Responsive","SEO-Ready"]},{"id":"t58","name":"MindSpace Therapy","cat":"Health & Wellness","desc":"Mental health with specialization cards, insurance list, teletherapy option.","price":79,"rating":4.6,"reviews":22,"seller":"James O.","colors":["#100a1a","#8060a0","#f8f4fc"],"featured":false,"tags":["Health & Wellness","Responsive","SEO-Ready"]},{"id":"t59","name":"Breathe Yoga","cat":"Health & Wellness","desc":"Yoga with schedule integration, instructor bios, workshop series, online classes.","price":49,"rating":4.6,"reviews":10,"seller":"Alex P.","colors":["#080a18","#9080c0","#f8f4fc"],"featured":false,"tags":["Health & Wellness","Responsive","SEO-Ready"]},{"id":"t60","name":"Hands Healing Massage","cat":"Health & Wellness","desc":"Massage with service menu, gift cards, couples packages, booking widget.","price":55,"rating":4.8,"reviews":80,"seller":"Priya S.","colors":["#1a0a08","#c09060","#f8f0e8"],"featured":false,"tags":["Health & Wellness","Responsive","SEO-Ready"]},{"id":"t61","name":"FuelRight Nutrition","cat":"Health & Wellness","desc":"Nutrition coaching with program comparison, meal plan preview, success stories.","price":59,"rating":4.9,"reviews":52,"seller":"Yara F.","colors":["#0a1808","#60a840","#f0f8ec"],"featured":false,"tags":["Health & Wellness","Responsive","SEO-Ready"]},{"id":"t62","name":"MoveWell PT","cat":"Health & Wellness","desc":"PT clinic with condition-based intake, telehealth, exercise library, progress tracking.","price":69,"rating":5.0,"reviews":87,"seller":"Alex P.","colors":["#081428","#40a0b0","#f0f8fc"],"featured":false,"tags":["Health & Wellness","Responsive","SEO-Ready"]},{"id":"t63","name":"GlowMed Spa","cat":"Health & Wellness","desc":"Medical spa with treatment menu, before/after gallery, membership tiers.","price":85,"rating":4.8,"reviews":43,"seller":"Devon M.","colors":["#1a0810","#c07090","#fff4f8"],"featured":false,"tags":["Health & Wellness","Responsive","SEO-Ready"]},{"id":"t64","name":"WholePerson Wellness","cat":"Health & Wellness","desc":"Integrative health with practitioner roster, modality guide, wellness assessment.","price":62,"rating":4.6,"reviews":49,"seller":"Amara O.","colors":["#100a1a","#7050a0","#f4f0fc"],"featured":false,"tags":["Health & Wellness","Responsive","SEO-Ready"]},{"id":"t65","name":"ClearMind Psych","cat":"Health & Wellness","desc":"Psychiatric services with telehealth focus, insurance checker, crisis resources section.","price":78,"rating":4.9,"reviews":40,"seller":"Ray D.","colors":["#0a0a18","#5060a0","#f0f4fc"],"featured":false,"tags":["Health & Wellness","Responsive","SEO-Ready"]},{"id":"t66","name":"HerbalHeal","cat":"Health & Wellness","desc":"Naturopath with herb guide, consultation booking, supplement shop, and blog.","price":55,"rating":4.9,"reviews":87,"seller":"James O.","colors":["#081808","#60a840","#f0f8ec"],"featured":false,"tags":["Health & Wellness","Responsive","SEO-Ready"]},{"id":"t67","name":"SleepWell Clinic","cat":"Health & Wellness","desc":"Sleep medicine with sleep study info, CPAP equipment, and home sleep test option.","price":65,"rating":5.0,"reviews":51,"seller":"Sofia R.","colors":["#0a0a18","#4050a0","#f0f4fc"],"featured":false,"tags":["Health & Wellness","Responsive","SEO-Ready"]},{"id":"t68","name":"BodyBalance Pilates","cat":"Health & Wellness","desc":"Pilates studio with class types, equipment photos, private vs group, and intro offer.","price":52,"rating":4.8,"reviews":83,"seller":"Devon L.","colors":["#100a1a","#a070b0","#f8f4fc"],"featured":false,"tags":["Health & Wellness","Responsive","SEO-Ready"]},{"id":"t69","name":"ElitePerformance","cat":"Health & Wellness","desc":"Sports medicine with athlete roster, performance testing, recovery services.","price":72,"rating":4.8,"reviews":37,"seller":"Nathan W.","colors":["#0a0a14","#c9a84c","#1a1a28"],"featured":false,"tags":["Health & Wellness","Responsive","SEO-Ready"]},{"id":"t70","name":"IronWill Gym","cat":"Health & Wellness","desc":"High-energy gym with class schedule, membership comparison, trainer profiles.","price":55,"rating":5.0,"reviews":72,"seller":"Camille B.","colors":["#0a0a14","#c9a84c","#3a3a5a"],"featured":false,"tags":["Health & Wellness","Responsive","SEO-Ready"]},{"id":"t71","name":"Salon Luxe","cat":"Beauty & Salon","desc":"Elegant salon with service menu, stylist portfolio, online booking, before/after gallery.","price":59,"rating":4.9,"reviews":45,"seller":"Danielle H.","colors":["#1a0818","#c890b0","#fff4f8"],"featured":false,"tags":["Beauty & Salon","Responsive","SEO-Ready"]},{"id":"t72","name":"The Barbershop","cat":"Beauty & Salon","desc":"Classic with service pricing, appointment booking, barber profiles, loyalty cards.","price":45,"rating":4.9,"reviews":39,"seller":"Tunde A.","colors":["#0a0808","#c89820","#f8f4e8"],"featured":false,"tags":["Beauty & Salon","Responsive","SEO-Ready"]},{"id":"t73","name":"Nail Artistry","cat":"Beauty & Salon","desc":"Nail salon with service gallery, nail art portfolio, online booking, product retail.","price":45,"rating":5.0,"reviews":6,"seller":"Keisha T.","colors":["#1a0818","#e890b0","#fff4f8"],"featured":false,"tags":["Beauty & Salon","Responsive","SEO-Ready"]},{"id":"t74","name":"Sanctuary Spa","cat":"Beauty & Salon","desc":"Full spa with treatment packages, membership tiers, couples retreats, gift cards.","price":79,"rating":4.8,"reviews":17,"seller":"Ray D.","colors":["#100810","#a080a0","#f8f4f8"],"featured":false,"tags":["Beauty & Salon","Responsive","SEO-Ready"]},{"id":"t75","name":"Ink & Iron Tattoo","cat":"Beauty & Salon","desc":"Tattoo studio with artist portfolios, flash gallery, consultation booking.","price":55,"rating":5.0,"reviews":86,"seller":"Ray D.","colors":["#080808","#c83020","#f8f0e8"],"featured":false,"tags":["Beauty & Salon","Responsive","SEO-Ready"]},{"id":"t76","name":"BrowBar Studio","cat":"Beauty & Salon","desc":"Eyebrow specialist with service chart, before/after gallery, appointment booking.","price":39,"rating":4.9,"reviews":82,"seller":"Tunde A.","colors":["#1a1008","#c8a040","#f8f4e8"],"featured":false,"tags":["Beauty & Salon","Responsive","SEO-Ready"]},{"id":"t77","name":"Glow Studio","cat":"Beauty & Salon","desc":"Makeup artist with portfolio, packages for events, bridal services, product shop.","price":49,"rating":4.9,"reviews":32,"seller":"Tunde A.","colors":["#1a0810","#e890a0","#fff4f8"],"featured":false,"tags":["Beauty & Salon","Responsive","SEO-Ready"]},{"id":"t78","name":"LashLux","cat":"Beauty & Salon","desc":"Lash extension studio with style guide, before/after, booking, loyalty program.","price":45,"rating":4.8,"reviews":61,"seller":"Tyler N.","colors":["#1a0818","#e8a0b8","#fff8fc"],"featured":false,"tags":["Beauty & Salon","Responsive","SEO-Ready"]},{"id":"t79","name":"ColorLab","cat":"Beauty & Salon","desc":"Color specialist with hair color gallery, consultation form, pricing, stylist bios.","price":59,"rating":4.6,"reviews":69,"seller":"Victor A.","colors":["#1a0810","#c040a0","#fff4fc"],"featured":false,"tags":["Beauty & Salon","Responsive","SEO-Ready"]},{"id":"t80","name":"BalayagePro","cat":"Beauty & Salon","desc":"Highlights specialist with color correction info, maintenance guide, product shop.","price":55,"rating":4.8,"reviews":12,"seller":"Marco V.","colors":["#100818","#c890b0","#fff4f8"],"featured":false,"tags":["Beauty & Salon","Responsive","SEO-Ready"]},{"id":"t81","name":"SkinFirst Clinic","cat":"Beauty & Salon","desc":"Medical-grade skin with treatment menu, before/after, membership, and clinical team.","price":75,"rating":5.0,"reviews":58,"seller":"Keisha T.","colors":["#080a18","#6080a0","#f0f4f8"],"featured":false,"tags":["Beauty & Salon","Responsive","SEO-Ready"]},{"id":"t82","name":"ThreadingBar","cat":"Beauty & Salon","desc":"Threading studio with service speed highlight, brow shaping guide, walk-in welcome.","price":35,"rating":4.9,"reviews":19,"seller":"Chris B.","colors":["#1a1008","#c8a040","#f8f4e8"],"featured":false,"tags":["Beauty & Salon","Responsive","SEO-Ready"]},{"id":"t83","name":"NailBar Studio","cat":"Beauty & Salon","desc":"Upscale nails with gel/dip comparison, nail art gallery, spa pedicure section.","price":48,"rating":4.8,"reviews":61,"seller":"Jordan M.","colors":["#1a0818","#e898b0","#fff4f8"],"featured":false,"tags":["Beauty & Salon","Responsive","SEO-Ready"]},{"id":"t84","name":"SkinDeep Tattoo","cat":"Beauty & Salon","desc":"High-end tattoo with artist specialties, price guide, healing care, and convention schedule.","price":62,"rating":5.0,"reviews":70,"seller":"Alex P.","colors":["#080808","#c9a84c","#2a2a18"],"featured":false,"tags":["Beauty & Salon","Responsive","SEO-Ready"]},{"id":"t85","name":"GentleMan's Barber","cat":"Beauty & Salon","desc":"Upscale barbershop with membership card, hot towel service, and membership tiers.","price":52,"rating":4.8,"reviews":22,"seller":"Jordan M.","colors":["#0a0808","#c09020","#f8f4e8"],"featured":false,"tags":["Beauty & Salon","Responsive","SEO-Ready"]},{"id":"t86","name":"Advocate Law","cat":"Professional Services","desc":"Law firm with practice areas, attorney bios, case results, free consultation.","price":99,"rating":4.9,"reviews":41,"seller":"Danielle H.","colors":["#0a1428","#c09830","#f8f4e8"],"featured":false,"tags":["Professional Services","Responsive","SEO-Ready"]},{"id":"t87","name":"ClearBooks Accounting","cat":"Professional Services","desc":"Accounting with service packages, tax calculator, business vs personal, booking.","price":89,"rating":4.8,"reviews":17,"seller":"James O.","colors":["#0a1428","#4090c0","#f0f8fc"],"featured":false,"tags":["Professional Services","Responsive","SEO-Ready"]},{"id":"t88","name":"Prime Realty","cat":"Professional Services","desc":"Real estate with property listings, agent profiles, neighborhood guides, home value.","price":109,"rating":4.8,"reviews":32,"seller":"Nathan W.","colors":["#0a1428","#c09030","#f8f4e8"],"featured":false,"tags":["Professional Services","Responsive","SEO-Ready"]},{"id":"t89","name":"Shield Insurance","cat":"Professional Services","desc":"Insurance broker with coverage comparison, quote form, claims guide.","price":79,"rating":4.8,"reviews":81,"seller":"Camille B.","colors":["#0a0a28","#4060c0","#f0f4fc"],"featured":false,"tags":["Professional Services","Responsive","SEO-Ready"]},{"id":"t90","name":"Clarity Consulting","cat":"Professional Services","desc":"Consulting with case studies, methodology, ROI calculator, testimonials.","price":119,"rating":4.8,"reviews":69,"seller":"Devon L.","colors":["#080a18","#6050a0","#f4f4fc"],"featured":false,"tags":["Professional Services","Responsive","SEO-Ready"]},{"id":"t91","name":"WealthPath Financial","cat":"Professional Services","desc":"Financial advisor with service tiers, retirement calculator, educational resources.","price":99,"rating":4.9,"reviews":23,"seller":"Keisha T.","colors":["#0a1028","#508080","#f0f8f8"],"featured":false,"tags":["Professional Services","Responsive","SEO-Ready"]},{"id":"t92","name":"TaxSmart","cat":"Professional Services","desc":"Tax prep with service checklist, new client special, document upload guide.","price":75,"rating":4.8,"reviews":88,"seller":"Jordan M.","colors":["#0a1428","#40b040","#f0f8f0"],"featured":false,"tags":["Professional Services","Responsive","SEO-Ready"]},{"id":"t93","name":"PeopleFirst HR","cat":"Professional Services","desc":"HR services with compliance checklist, package comparison, payroll calculator.","price":89,"rating":4.9,"reviews":78,"seller":"Danielle H.","colors":["#0a1428","#8040a0","#f4f0fc"],"featured":false,"tags":["Professional Services","Responsive","SEO-Ready"]},{"id":"t94","name":"Official Notary","cat":"Professional Services","desc":"Mobile notary with service area map, document types, booking by appointment.","price":49,"rating":4.8,"reviews":51,"seller":"Tunde A.","colors":["#0a1428","#c09040","#f8f4e8"],"featured":false,"tags":["Professional Services","Responsive","SEO-Ready"]},{"id":"t95","name":"LinguaBridge","cat":"Professional Services","desc":"Translation with language pairs, industry specs, per-word pricing, rush orders.","price":69,"rating":4.7,"reviews":29,"seller":"Sofia R.","colors":["#081428","#4080c0","#f0f4fc"],"featured":false,"tags":["Professional Services","Responsive","SEO-Ready"]},{"id":"t96","name":"ExecutiveSearch","cat":"Professional Services","desc":"Recruitment agency with industry focus, placement stats, client roster, talent form.","price":95,"rating":4.9,"reviews":29,"seller":"Jordan M.","colors":["#0a0a14","#c9a84c","#1a1a28"],"featured":false,"tags":["Professional Services","Responsive","SEO-Ready"]},{"id":"t97","name":"GrantPro","cat":"Professional Services","desc":"Grant writing with success rate stats, nonprofit + business focus, proposal samples.","price":85,"rating":4.8,"reviews":17,"seller":"Darius K.","colors":["#081428","#5080b0","#f0f4fc"],"featured":false,"tags":["Professional Services","Responsive","SEO-Ready"]},{"id":"t98","name":"CompliancePro","cat":"Professional Services","desc":"Regulatory consulting with industry dropdown, audit prep, training modules section.","price":99,"rating":4.7,"reviews":15,"seller":"Camille B.","colors":["#0a0a14","#6070a0","#f4f4fc"],"featured":false,"tags":["Professional Services","Responsive","SEO-Ready"]},{"id":"t99","name":"BrandStrategy Co","cat":"Professional Services","desc":"Brand strategy with process timeline, deliverables list, brand audit CTA.","price":89,"rating":4.8,"reviews":70,"seller":"Keisha T.","colors":["#080a18","#c9a84c","#1a1a28"],"featured":false,"tags":["Professional Services","Responsive","SEO-Ready"]},{"id":"t100","name":"PRFirst","cat":"Professional Services","desc":"Public relations with media coverage gallery, crisis comm section, retainer packages.","price":105,"rating":4.6,"reviews":73,"seller":"Yara F.","colors":["#0a0a14","#8060a0","#f4f0fc"],"featured":false,"tags":["Professional Services","Responsive","SEO-Ready"]},{"id":"t101","name":"AutoElite","cat":"Auto & Transportation","desc":"Auto repair with service menu, online estimator, loyalty oil change, reviews.","price":45,"rating":4.7,"reviews":32,"seller":"Devon L.","colors":["#0a0a0a","#c9a84c","#2a2a2a"],"featured":false,"tags":["Auto & Transportation","Responsive","SEO-Ready"]},{"id":"t102","name":"SudsUp Car Wash","cat":"Auto & Transportation","desc":"Car wash with membership tiers, fleet pricing, detailing packages, subscription.","price":35,"rating":4.7,"reviews":71,"seller":"Alex P.","colors":["#0a1428","#40b0e0","#e8f8fc"],"featured":false,"tags":["Auto & Transportation","Responsive","SEO-Ready"]},{"id":"t103","name":"TowFast","cat":"Auto & Transportation","desc":"24/7 towing with live dispatch, service area map, flat rate pricing, fleet photos.","price":39,"rating":4.6,"reviews":15,"seller":"Darius K.","colors":["#1a0800","#f06020","#fff4ee"],"featured":false,"tags":["Auto & Transportation","Responsive","SEO-Ready"]},{"id":"t104","name":"MoveSmart","cat":"Auto & Transportation","desc":"Moving with room estimator, packing guide, storage options, and booking calendar.","price":45,"rating":4.7,"reviews":60,"seller":"Devon L.","colors":["#0a1428","#4090c0","#f0f8fc"],"featured":false,"tags":["Auto & Transportation","Responsive","SEO-Ready"]},{"id":"t105","name":"LuxRide Limo","cat":"Auto & Transportation","desc":"Luxury transport with fleet gallery, event packages, hourly pricing, corporate accounts.","price":79,"rating":4.6,"reviews":23,"seller":"James O.","colors":["#0a0808","#c89820","#f8f4e8"],"featured":false,"tags":["Auto & Transportation","Responsive","SEO-Ready"]},{"id":"t106","name":"DetailKing","cat":"Auto & Transportation","desc":"Auto detailing with package comparison, ceramic coating, before/after gallery.","price":45,"rating":5.0,"reviews":16,"seller":"Danielle H.","colors":["#0a0808","#c09020","#f8f4e8"],"featured":false,"tags":["Auto & Transportation","Responsive","SEO-Ready"]},{"id":"t107","name":"TireZone","cat":"Auto & Transportation","desc":"Tire shop with fitment finder, brand comparison, installation pricing, rebate finder.","price":39,"rating":4.7,"reviews":10,"seller":"Jordan M.","colors":["#0a0808","#e04020","#2a0808"],"featured":false,"tags":["Auto & Transportation","Responsive","SEO-Ready"]},{"id":"t108","name":"ClearView Tint","cat":"Auto & Transportation","desc":"Window tinting with tint level guide, vehicle type pricing, warranty, booking.","price":39,"rating":4.9,"reviews":11,"seller":"Devon L.","colors":["#0a0a14","#4080c0","#f0f4fc"],"featured":false,"tags":["Auto & Transportation","Responsive","SEO-Ready"]},{"id":"t109","name":"DriveRight School","cat":"Auto & Transportation","desc":"Driving school with lesson packages, teen vs adult, online theory, scheduling.","price":49,"rating":4.9,"reviews":89,"seller":"Darius K.","colors":["#081828","#40a0d0","#f0f8fc"],"featured":false,"tags":["Auto & Transportation","Responsive","SEO-Ready"]},{"id":"t110","name":"MotoShop","cat":"Auto & Transportation","desc":"Motorcycle with bike type nav, custom build gallery, parts shop, service intervals.","price":49,"rating":4.9,"reviews":84,"seller":"Yara F.","colors":["#0a0a0a","#e83020","#2a0808"],"featured":false,"tags":["Auto & Transportation","Responsive","SEO-Ready"]},{"id":"t111","name":"FleetPro","cat":"Auto & Transportation","desc":"Commercial fleet management with maintenance tracking, fuel cards, driver portals.","price":89,"rating":4.9,"reviews":73,"seller":"Victor A.","colors":["#0a0a14","#5080a0","#f0f4f8"],"featured":false,"tags":["Auto & Transportation","Responsive","SEO-Ready"]},{"id":"t112","name":"EV Charge Pro","cat":"Auto & Transportation","desc":"EV charging station installation with brand comparison, ROI calculator, incentives.","price":65,"rating":4.8,"reviews":30,"seller":"Sasha L.","colors":["#081428","#40b040","#f0f8ec"],"featured":false,"tags":["Auto & Transportation","Responsive","SEO-Ready"]},{"id":"t113","name":"AutoGlass Fix","cat":"Auto & Transportation","desc":"Windshield repair with chip size guide, insurance coverage info, mobile service.","price":38,"rating":5.0,"reviews":80,"seller":"Danielle H.","colors":["#0a1428","#4090c0","#f0f8fc"],"featured":false,"tags":["Auto & Transportation","Responsive","SEO-Ready"]},{"id":"t114","name":"OilXpress","cat":"Auto & Transportation","desc":"Quick oil change with service menu, filter types, coupon bar, and wait time display.","price":33,"rating":4.6,"reviews":41,"seller":"Chris B.","colors":["#1a0808","#e04020","#fff4ee"],"featured":false,"tags":["Auto & Transportation","Responsive","SEO-Ready"]},{"id":"t115","name":"CarDoc Diagnostics","cat":"Auto & Transportation","desc":"Diagnostics specialist with OBD code lookup, brand expertise, and pre-purchase inspection.","price":45,"rating":4.9,"reviews":55,"seller":"Darius K.","colors":["#0a0a14","#c9a84c","#1a1a28"],"featured":false,"tags":["Auto & Transportation","Responsive","SEO-Ready"]},{"id":"t116","name":"CleanPro","cat":"Home Services","desc":"Residential cleaning with service frequency comparison, eco-friendly badge.","price":39,"rating":4.7,"reviews":53,"seller":"James O.","colors":["#0a1428","#4ab0c0","#f0f8fc"],"featured":false,"tags":["Home Services","Responsive","SEO-Ready"]},{"id":"t117","name":"FixIt Handyman","cat":"Home Services","desc":"Handyman with task menu, hourly vs project pricing, same-day availability.","price":35,"rating":4.9,"reviews":56,"seller":"Amara O.","colors":["#0a1018","#c09030","#f8f4e8"],"featured":false,"tags":["Home Services","Responsive","SEO-Ready"]},{"id":"t118","name":"LockSafe","cat":"Home Services","desc":"Locksmith with 24-hour emergency, service area map, rekey services.","price":35,"rating":5.0,"reviews":27,"seller":"Yara F.","colors":["#0a0a14","#c0a030","#f8f4e8"],"featured":false,"tags":["Home Services","Responsive","SEO-Ready"]},{"id":"t119","name":"PowerWash Pro","cat":"Home Services","desc":"Pressure washing with surface selector, before/after gallery, seasonal packages.","price":39,"rating":5.0,"reviews":26,"seller":"Keisha T.","colors":["#0a1428","#4090c0","#f0f8fc"],"featured":false,"tags":["Home Services","Responsive","SEO-Ready"]},{"id":"t120","name":"GutterGuard","cat":"Home Services","desc":"Gutter cleaning with seasonal packages, guard installation, free inspection.","price":35,"rating":4.8,"reviews":29,"seller":"James O.","colors":["#0a1408","#70a840","#f0f8ec"],"featured":false,"tags":["Home Services","Responsive","SEO-Ready"]},{"id":"t121","name":"AirFlow HVAC","cat":"Home Services","desc":"HVAC with seasonal tune-up, filter subscription, smart thermostat, emergency.","price":49,"rating":4.9,"reviews":11,"seller":"James O.","colors":["#0a1428","#4090c0","#f0f8fc"],"featured":false,"tags":["Home Services","Responsive","SEO-Ready"]},{"id":"t122","name":"StyleHome Interior","cat":"Home Services","desc":"Interior design with service tiers, room reveal gallery, virtual consultation.","price":79,"rating":4.6,"reviews":43,"seller":"Devon L.","colors":["#1a1008","#c8a050","#f8f4e8"],"featured":false,"tags":["Home Services","Responsive","SEO-Ready"]},{"id":"t123","name":"Stage & Sell","cat":"Home Services","desc":"Home staging with before/after, package tiers, occupied vs vacant, ROI stats.","price":69,"rating":4.8,"reviews":17,"seller":"Keisha T.","colors":["#0a1028","#90a8c0","#f4f8fc"],"featured":false,"tags":["Home Services","Responsive","SEO-Ready"]},{"id":"t124","name":"PoolPro Services","cat":"Home Services","desc":"Pool with opening/closing packages, repair, weekly maintenance plans.","price":47,"rating":4.9,"reviews":34,"seller":"Danielle H.","colors":["#0a1428","#40c8e8","#e8f8fc"],"featured":false,"tags":["Home Services","Responsive","SEO-Ready"]},{"id":"t125","name":"PestGuard","cat":"Home Services","desc":"Pest control with pest ID guide, treatment comparison, seasonal protection.","price":33,"rating":4.9,"reviews":71,"seller":"Darius K.","colors":["#0a1a0a","#78a830","#f4f8f0"],"featured":false,"tags":["Home Services","Responsive","SEO-Ready"]},{"id":"t126","name":"OrganizePro","cat":"Home Services","desc":"Home organization with room-by-room packages, declutter guide, virtual consult.","price":52,"rating":4.7,"reviews":17,"seller":"Ray D.","colors":["#100a1a","#9070a0","#f4f0fc"],"featured":false,"tags":["Home Services","Responsive","SEO-Ready"]},{"id":"t127","name":"SafetyFirst Alarms","cat":"Home Services","desc":"Home security with equipment comparison, monitoring packages, DIY vs pro.","price":55,"rating":4.7,"reviews":29,"seller":"Sasha L.","colors":["#0a0a14","#5060a0","#f0f4fc"],"featured":false,"tags":["Home Services","Responsive","SEO-Ready"]},{"id":"t128","name":"GardenMaster","cat":"Home Services","desc":"Garden design with seasonal planting guide, plant selection tool, maintenance plans.","price":44,"rating":4.7,"reviews":14,"seller":"Tunde A.","colors":["#081808","#60a840","#f0f8ec"],"featured":false,"tags":["Home Services","Responsive","SEO-Ready"]},{"id":"t129","name":"PaintRight","cat":"Home Services","desc":"Interior/exterior painting with color consultation, texture gallery, and room calculator.","price":39,"rating":5.0,"reviews":72,"seller":"Devon L.","colors":["#1a0808","#c06030","#fff4ee"],"featured":false,"tags":["Home Services","Responsive","SEO-Ready"]},{"id":"t130","name":"FloorCraft","cat":"Home Services","desc":"Flooring with material samples, room visualizer, installation timeline, warranties.","price":55,"rating":4.7,"reviews":40,"seller":"Devon L.","colors":["#1a1410","#c8a060","#f8f4ee"],"featured":false,"tags":["Home Services","Responsive","SEO-Ready"]},{"id":"t131","name":"VowPerfect","cat":"Events & Entertainment","desc":"Wedding planning with package tiers, vendor network, real wedding gallery.","price":89,"rating":4.7,"reviews":88,"seller":"Luis F.","colors":["#180a14","#d0a0b8","#fef8fc"],"featured":false,"tags":["Events & Entertainment","Responsive","SEO-Ready"]},{"id":"t132","name":"CaptureMoments","cat":"Events & Entertainment","desc":"Photography with style portfolio, package comparison, second shooter option.","price":79,"rating":4.7,"reviews":29,"seller":"James O.","colors":["#0a0808","#c08020","#f8f4e8"],"featured":false,"tags":["Events & Entertainment","Responsive","SEO-Ready"]},{"id":"t133","name":"WaveDJ","cat":"Events & Entertainment","desc":"DJ with set list samples, event types, equipment list, lighting add-ons, booking.","price":65,"rating":4.8,"reviews":73,"seller":"Yara F.","colors":["#08081a","#8040d0","#f4f0fc"],"featured":false,"tags":["Events & Entertainment","Responsive","SEO-Ready"]},{"id":"t134","name":"Feast Catering","cat":"Events & Entertainment","desc":"Event catering with menu sampler, dietary filters, head count calculator.","price":85,"rating":4.6,"reviews":13,"seller":"Sasha L.","colors":["#100808","#c08030","#f8f4e8"],"featured":false,"tags":["Events & Entertainment","Responsive","SEO-Ready"]},{"id":"t135","name":"BloomCraft Floral","cat":"Events & Entertainment","desc":"Florist with arrangement gallery, wedding packages, weekly subscription.","price":69,"rating":4.8,"reviews":75,"seller":"Camille B.","colors":["#0a1408","#d090a0","#fef4f8"],"featured":false,"tags":["Events & Entertainment","Responsive","SEO-Ready"]},{"id":"t136","name":"StoryReel Video","cat":"Events & Entertainment","desc":"Wedding videography with showreel, package tiers, drone add-on.","price":89,"rating":4.9,"reviews":57,"seller":"Victor A.","colors":["#080808","#c09030","#f8f4e8"],"featured":false,"tags":["Events & Entertainment","Responsive","SEO-Ready"]},{"id":"t137","name":"GrandHall Venue","cat":"Events & Entertainment","desc":"Event venue with capacity info, layout gallery, catering partners, AV equipment.","price":109,"rating":4.9,"reviews":30,"seller":"Devon M.","colors":["#100808","#c09020","#f8f4e8"],"featured":false,"tags":["Events & Entertainment","Responsive","SEO-Ready"]},{"id":"t138","name":"WonderMagic","cat":"Events & Entertainment","desc":"Magic and entertainment with act overview, video clips, show packages.","price":55,"rating":4.7,"reviews":26,"seller":"Sasha L.","colors":["#0a0818","#a040d0","#f4f0fc"],"featured":false,"tags":["Events & Entertainment","Responsive","SEO-Ready"]},{"id":"t139","name":"ClickClick Photo Booth","cat":"Events & Entertainment","desc":"Photo booth with prop gallery, template previews, social sharing, package pricing.","price":59,"rating":4.9,"reviews":20,"seller":"Devon M.","colors":["#080814","#f040a0","#fff0f8"],"featured":false,"tags":["Events & Entertainment","Responsive","SEO-Ready"]},{"id":"t140","name":"SoundWave Band","cat":"Events & Entertainment","desc":"Live music with song list, event types, video clips, and booking.","price":75,"rating":4.9,"reviews":59,"seller":"Sasha L.","colors":["#080814","#6040b0","#f4f0fc"],"featured":false,"tags":["Events & Entertainment","Responsive","SEO-Ready"]},{"id":"t141","name":"EventTech","cat":"Events & Entertainment","desc":"AV production with equipment list, show reel, corporate event focus, setup timeline.","price":85,"rating":4.8,"reviews":83,"seller":"Marco V.","colors":["#0a0a14","#c9a84c","#1a1a28"],"featured":false,"tags":["Events & Entertainment","Responsive","SEO-Ready"]},{"id":"t142","name":"PhotoBooth360","cat":"Events & Entertainment","desc":"360-degree video booth with sample videos, package comparison, custom branding.","price":65,"rating":4.9,"reviews":75,"seller":"Yara F.","colors":["#080814","#e040a0","#fff0f8"],"featured":false,"tags":["Events & Entertainment","Responsive","SEO-Ready"]},{"id":"t143","name":"PartyPlanners","cat":"Events & Entertainment","desc":"Full event planning with themed event gallery, vendor rolodex, checklist download.","price":72,"rating":4.6,"reviews":25,"seller":"Victor A.","colors":["#1a0818","#c890b0","#fff4f8"],"featured":false,"tags":["Events & Entertainment","Responsive","SEO-Ready"]},{"id":"t144","name":"KidParties","cat":"Events & Entertainment","desc":"Children's entertainment with character options, activity packages, party favors.","price":52,"rating":5.0,"reviews":52,"seller":"Luis F.","colors":["#0a0818","#f040a0","#fff0f8"],"featured":false,"tags":["Events & Entertainment","Responsive","SEO-Ready"]},{"id":"t145","name":"NightlifeEvents","cat":"Events & Entertainment","desc":"Club and bar events with lineup calendar, ticket integration, VIP table booking.","price":69,"rating":4.6,"reviews":11,"seller":"Lena W.","colors":["#080808","#8040d0","#f4f0fc"],"featured":false,"tags":["Events & Entertainment","Responsive","SEO-Ready"]},{"id":"t146","name":"Boutique Moderne","cat":"Retail & Shops","desc":"Fashion with lookbook, size guide, new arrivals feed, wishlist, loyalty program.","price":65,"rating":4.6,"reviews":12,"seller":"Luis F.","colors":["#1a0818","#c890b0","#fff4f8"],"featured":false,"tags":["Retail & Shops","Responsive","SEO-Ready"]},{"id":"t147","name":"GoldMark Jewelry","cat":"Retail & Shops","desc":"Jewelry with collection gallery, custom design studio, certification info.","price":79,"rating":4.8,"reviews":53,"seller":"Marcus T.","colors":["#100808","#d0a020","#f8f4e8"],"featured":false,"tags":["Retail & Shops","Responsive","SEO-Ready"]},{"id":"t148","name":"PawParadise","cat":"Retail & Shops","desc":"Pet store with breed-specific filters, grooming booking, vet partner section.","price":55,"rating":4.9,"reviews":52,"seller":"Yara F.","colors":["#081808","#78c040","#f0f8ec"],"featured":false,"tags":["Retail & Shops","Responsive","SEO-Ready"]},{"id":"t149","name":"PageTurner Books","cat":"Retail & Shops","desc":"Bookstore with genre browsing, staff picks, author events, book club sign-up.","price":49,"rating":4.9,"reviews":84,"seller":"Tyler N.","colors":["#100808","#c08030","#f8f4e8"],"featured":false,"tags":["Retail & Shops","Responsive","SEO-Ready"]},{"id":"t150","name":"TechHaven","cat":"Retail & Shops","desc":"Electronics with spec comparison, trade-in, repair services, and bundle deals.","price":59,"rating":4.7,"reviews":23,"seller":"Ray D.","colors":["#080814","#4080d0","#f0f4fc"],"featured":false,"tags":["Retail & Shops","Responsive","SEO-Ready"]},{"id":"t151","name":"HomeCraft Furniture","cat":"Retail & Shops","desc":"Furniture with room planner, material samples, lead time calculator, custom orders.","price":79,"rating":4.9,"reviews":48,"seller":"Marco V.","colors":["#100808","#c09040","#f8f4e8"],"featured":false,"tags":["Retail & Shops","Responsive","SEO-Ready"]},{"id":"t152","name":"Gifted","cat":"Retail & Shops","desc":"Gift shop with occasion-based browsing, custom message cards, corporate gifting.","price":45,"rating":5.0,"reviews":52,"seller":"Priya S.","colors":["#180810","#e070a0","#fff4f8"],"featured":false,"tags":["Retail & Shops","Responsive","SEO-Ready"]},{"id":"t153","name":"PlayBox Toys","cat":"Retail & Shops","desc":"Toy store with age-based browsing, gift registry, birthday party planning.","price":45,"rating":4.9,"reviews":82,"seller":"James O.","colors":["#080818","#f06040","#fff4ee"],"featured":false,"tags":["Retail & Shops","Responsive","SEO-Ready"]},{"id":"t154","name":"ArtSpace Gallery","cat":"Retail & Shops","desc":"Art gallery with artist roster, exhibition calendar, print shop, commissions.","price":69,"rating":4.7,"reviews":81,"seller":"Chris B.","colors":["#080808","#c08030","#f8f4e8"],"featured":false,"tags":["Retail & Shops","Responsive","SEO-Ready"]},{"id":"t155","name":"SportZone","cat":"Retail & Shops","desc":"Sporting goods with sport navigation, team discount, custom jersey builder.","price":55,"rating":4.7,"reviews":69,"seller":"Camille B.","colors":["#080a18","#e04020","#fff4ee"],"featured":false,"tags":["Retail & Shops","Responsive","SEO-Ready"]},{"id":"t156","name":"VinylRecords","cat":"Retail & Shops","desc":"Record store with genre browsing, new arrivals, turntable guide, events calendar.","price":49,"rating":4.8,"reviews":40,"seller":"Luis F.","colors":["#0a0808","#c9a84c","#1a1a18"],"featured":false,"tags":["Retail & Shops","Responsive","SEO-Ready"]},{"id":"t157","name":"CandleCo","cat":"Retail & Shops","desc":"Candle shop with scent guide, custom labels, subscription box, gift bundles.","price":42,"rating":4.7,"reviews":89,"seller":"Ray D.","colors":["#1a1008","#e0a060","#f8f4e8"],"featured":false,"tags":["Retail & Shops","Responsive","SEO-Ready"]},{"id":"t158","name":"OrganicMarket","cat":"Retail & Shops","desc":"Natural foods with product sourcing story, farm partners, subscription boxes.","price":55,"rating":4.7,"reviews":34,"seller":"Tunde A.","colors":["#081808","#60a840","#f0f8ec"],"featured":false,"tags":["Retail & Shops","Responsive","SEO-Ready"]},{"id":"t159","name":"VintageVault","cat":"Retail & Shops","desc":"Vintage/consignment with new arrivals board, era guide, authentication info.","price":52,"rating":4.9,"reviews":6,"seller":"Priya S.","colors":["#1a0808","#c08030","#f8f4e8"],"featured":false,"tags":["Retail & Shops","Responsive","SEO-Ready"]},{"id":"t160","name":"ThriftShop","cat":"Retail & Shops","desc":"Thrift store with donation info, daily finds, size guide, and community impact.","price":38,"rating":4.8,"reviews":45,"seller":"Tyler N.","colors":["#0a1408","#70a840","#f0f8ec"],"featured":false,"tags":["Retail & Shops","Responsive","SEO-Ready"]},{"id":"t161","name":"BrightMind Tutoring","cat":"Education & Kids","desc":"Tutoring with subject/grade navigation, session packages, online option.","price":55,"rating":4.7,"reviews":82,"seller":"Marcus T.","colors":["#081428","#4090d0","#f0f8fc"],"featured":false,"tags":["Education & Kids","Responsive","SEO-Ready"]},{"id":"t162","name":"SunshineDay Care","cat":"Education & Kids","desc":"Daycare with curriculum overview, enrollment form, daily schedule, parent portal.","price":65,"rating":4.7,"reviews":37,"seller":"Devon M.","colors":["#0a1808","#f0c040","#fff8e8"],"featured":false,"tags":["Education & Kids","Responsive","SEO-Ready"]},{"id":"t163","name":"MelodyMakers Music","cat":"Education & Kids","desc":"Music school with instrument selector, lesson packages, recital info, trial.","price":59,"rating":4.9,"reviews":26,"seller":"Sasha L.","colors":["#080818","#8060c0","#f4f0fc"],"featured":false,"tags":["Education & Kids","Responsive","SEO-Ready"]},{"id":"t164","name":"StrikeForce MMA","cat":"Education & Kids","desc":"Martial arts with belt system guide, class schedule, first lesson free.","price":55,"rating":5.0,"reviews":45,"seller":"Ray D.","colors":["#0a0808","#e03020","#fff0ee"],"featured":false,"tags":["Education & Kids","Responsive","SEO-Ready"]},{"id":"t165","name":"DanceFirst Studio","cat":"Education & Kids","desc":"Dance studio with style menu, age groups, competition team, showcase dates.","price":55,"rating":4.9,"reviews":58,"seller":"Danielle H.","colors":["#180810","#d060a0","#fff4f8"],"featured":false,"tags":["Education & Kids","Responsive","SEO-Ready"]},{"id":"t166","name":"LinguaKids","cat":"Education & Kids","desc":"Language school with language pair grid, age programs, cultural immersion.","price":59,"rating":4.7,"reviews":19,"seller":"Devon L.","colors":["#081428","#4090c0","#f0f8fc"],"featured":false,"tags":["Education & Kids","Responsive","SEO-Ready"]},{"id":"t167","name":"CodeSpark Kids","cat":"Education & Kids","desc":"Coding school with age-based tracks, project gallery, parent explainer.","price":65,"rating":4.9,"reviews":73,"seller":"Darius K.","colors":["#080818","#4090d0","#f0f8fc"],"featured":false,"tags":["Education & Kids","Responsive","SEO-Ready"]},{"id":"t168","name":"ScoreAce Test Prep","cat":"Education & Kids","desc":"Test prep with score improvement stats, diagnostic test, course comparison.","price":75,"rating":4.9,"reviews":7,"seller":"Priya S.","colors":["#080a28","#4060c0","#f0f4fc"],"featured":false,"tags":["Education & Kids","Responsive","SEO-Ready"]},{"id":"t169","name":"SummerQuest Camp","cat":"Education & Kids","desc":"Summer camp with activity catalog, week selection, packing list, counselor bios.","price":65,"rating":4.7,"reviews":16,"seller":"Camille B.","colors":["#081808","#70c040","#f0f8ec"],"featured":false,"tags":["Education & Kids","Responsive","SEO-Ready"]},{"id":"t170","name":"StudyHub After School","cat":"Education & Kids","desc":"After-school with subject focus, homework help hours, SAT prep add-on.","price":49,"rating":5.0,"reviews":46,"seller":"Ray D.","colors":["#081428","#4080b0","#f0f4fc"],"featured":false,"tags":["Education & Kids","Responsive","SEO-Ready"]},{"id":"t171","name":"MakerSpace Kids","cat":"Education & Kids","desc":"STEM maker space with project gallery, machine list, age groups, birthday parties.","price":58,"rating":4.7,"reviews":37,"seller":"Camille B.","colors":["#080818","#5060c0","#f0f4fc"],"featured":false,"tags":["Education & Kids","Responsive","SEO-Ready"]},{"id":"t172","name":"ThinkTank Academy","cat":"Education & Kids","desc":"Academic enrichment with curriculum preview, teacher bios, assessment tools.","price":65,"rating":4.9,"reviews":59,"seller":"Alex P.","colors":["#0a1428","#4090b0","#f0f8fc"],"featured":false,"tags":["Education & Kids","Responsive","SEO-Ready"]},{"id":"t173","name":"SportSkills Academy","cat":"Education & Kids","desc":"Youth sports training with drill videos, camp schedule, coach profiles, tryout info.","price":55,"rating":5.0,"reviews":23,"seller":"Devon M.","colors":["#080a18","#e04020","#fff4ee"],"featured":false,"tags":["Education & Kids","Responsive","SEO-Ready"]},{"id":"t174","name":"ArtClass Studio","cat":"Education & Kids","desc":"Kids art with class types, supply list, exhibit gallery, birthday party bookings.","price":49,"rating":4.9,"reviews":87,"seller":"Darius K.","colors":["#1a0818","#c890b0","#fff4f8"],"featured":false,"tags":["Education & Kids","Responsive","SEO-Ready"]},{"id":"t175","name":"ChessKids","cat":"Education & Kids","desc":"Chess instruction with rating system, tournament results, online class option.","price":45,"rating":4.8,"reviews":68,"seller":"Tunde A.","colors":["#0a0808","#c09030","#f8f4e8"],"featured":false,"tags":["Education & Kids","Responsive","SEO-Ready"]},{"id":"t176","name":"IronCross Gym","cat":"Fitness & Sports","desc":"CrossFit with WOD feed, membership tiers, coach bios, open gym schedule.","price":55,"rating":5.0,"reviews":70,"seller":"Marco V.","colors":["#0a0a14","#c9a84c","#1a1a28"],"featured":false,"tags":["Fitness & Sports","Responsive","SEO-Ready"]},{"id":"t177","name":"BoxRight","cat":"Fitness & Sports","desc":"Boxing gym with class schedule, fighter profiles, equipment shop, amateur program.","price":55,"rating":4.9,"reviews":68,"seller":"Tyler N.","colors":["#0a0808","#e03020","#fff0ee"],"featured":false,"tags":["Fitness & Sports","Responsive","SEO-Ready"]},{"id":"t178","name":"LapTime Swimming","cat":"Fitness & Sports","desc":"Swim school with ability levels, lane rental, team training, competition prep.","price":52,"rating":4.8,"reviews":21,"seller":"Marcus T.","colors":["#0a1428","#30b0e0","#e8f8fc"],"featured":false,"tags":["Fitness & Sports","Responsive","SEO-Ready"]},{"id":"t179","name":"CentrePilates","cat":"Fitness & Sports","desc":"Pilates with reformer gallery, beginner guide, class comparison, private sessions.","price":52,"rating":4.6,"reviews":85,"seller":"Marco V.","colors":["#100a1a","#a070b0","#f4f0fc"],"featured":false,"tags":["Fitness & Sports","Responsive","SEO-Ready"]},{"id":"t180","name":"EliteCoach","cat":"Fitness & Sports","desc":"Personal training with transformation gallery, program comparison, free assessment.","price":59,"rating":4.8,"reviews":49,"seller":"Priya S.","colors":["#0a0a14","#c9a84c","#1a1a28"],"featured":false,"tags":["Fitness & Sports","Responsive","SEO-Ready"]},{"id":"t181","name":"SpinStation","cat":"Fitness & Sports","desc":"Indoor cycling with class playlist, instructor profiles, heart rate zones, schedule.","price":49,"rating":4.9,"reviews":88,"seller":"Marcus T.","colors":["#0a0808","#e03020","#fff0ee"],"featured":false,"tags":["Fitness & Sports","Responsive","SEO-Ready"]},{"id":"t182","name":"GolfMaster","cat":"Fitness & Sports","desc":"Golf instruction with swing analysis, course partnerships, season packages.","price":65,"rating":4.8,"reviews":23,"seller":"Tyler N.","colors":["#081808","#70a840","#f0f8ec"],"featured":false,"tags":["Fitness & Sports","Responsive","SEO-Ready"]},{"id":"t183","name":"AceServe Tennis","cat":"Fitness & Sports","desc":"Tennis with ball machine bookings, league registration, level assessment.","price":55,"rating":4.7,"reviews":43,"seller":"Tunde A.","colors":["#0a1808","#70c040","#f0f8ec"],"featured":false,"tags":["Fitness & Sports","Responsive","SEO-Ready"]},{"id":"t184","name":"OctagonMMA","cat":"Fitness & Sports","desc":"MMA gym with discipline breakdown, sparring schedule, amateur fight team.","price":58,"rating":4.8,"reviews":87,"seller":"Luis F.","colors":["#0a0808","#e03020","#fff0ee"],"featured":false,"tags":["Fitness & Sports","Responsive","SEO-Ready"]},{"id":"t185","name":"ProAthletics","cat":"Fitness & Sports","desc":"Sports performance center with Combine prep, velocity testing, athlete roster.","price":72,"rating":4.6,"reviews":87,"seller":"Lena W.","colors":["#0a0a14","#c9a84c","#1a1a28"],"featured":false,"tags":["Fitness & Sports","Responsive","SEO-Ready"]},{"id":"t186","name":"HydroFit","cat":"Fitness & Sports","desc":"Water fitness with pool rental, aqua aerobics, senior swim, and therapy swim.","price":49,"rating":4.9,"reviews":50,"seller":"Darius K.","colors":["#0a1428","#30b0e0","#e8f8fc"],"featured":false,"tags":["Fitness & Sports","Responsive","SEO-Ready"]},{"id":"t187","name":"StretchZone","cat":"Fitness & Sports","desc":"Assisted stretching with flexibility assessment, session packages, sports recovery.","price":45,"rating":5.0,"reviews":71,"seller":"Luis F.","colors":["#100a1a","#8070b0","#f4f0fc"],"featured":false,"tags":["Fitness & Sports","Responsive","SEO-Ready"]},{"id":"t188","name":"RunnersPace","cat":"Fitness & Sports","desc":"Running coach with training plans, race prep, gait analysis, and virtual option.","price":48,"rating":4.9,"reviews":76,"seller":"Sofia R.","colors":["#081808","#60a840","#f0f8ec"],"featured":false,"tags":["Fitness & Sports","Responsive","SEO-Ready"]},{"id":"t189","name":"ClimbHigh","cat":"Fitness & Sports","desc":"Rock climbing gym with wall gallery, grade system, gear shop, kids programs.","price":55,"rating":5.0,"reviews":52,"seller":"Tunde A.","colors":["#0a0a14","#c09030","#f8f4e8"],"featured":false,"tags":["Fitness & Sports","Responsive","SEO-Ready"]},{"id":"t190","name":"FunctionalFit","cat":"Fitness & Sports","desc":"Functional fitness with movement screen, group classes, injury prevention focus.","price":52,"rating":4.9,"reviews":81,"seller":"Tyler N.","colors":["#0a0a14","#c9a84c","#1a1a28"],"featured":false,"tags":["Fitness & Sports","Responsive","SEO-Ready"]},{"id":"t191","name":"LensArt Wedding","cat":"Photography & Creative","desc":"Wedding photography with gallery by style, second shooter, album packages.","price":85,"rating":4.9,"reviews":75,"seller":"Sasha L.","colors":["#0a0808","#c08020","#f8f4e8"],"featured":false,"tags":["Photography & Creative","Responsive","SEO-Ready"]},{"id":"t192","name":"PortraitPerfect","cat":"Photography & Creative","desc":"Portrait studio with session types, wardrobe guide, hair/makeup add-on.","price":65,"rating":4.9,"reviews":74,"seller":"Devon M.","colors":["#0a0808","#c09030","#f8f4e8"],"featured":false,"tags":["Photography & Creative","Responsive","SEO-Ready"]},{"id":"t193","name":"ProductShot","cat":"Photography & Creative","desc":"Product photography with industry examples, turnaround times, bulk pricing.","price":75,"rating":4.7,"reviews":20,"seller":"Yara F.","colors":["#0a0a14","#c9a84c","#1a1a28"],"featured":false,"tags":["Photography & Creative","Responsive","SEO-Ready"]},{"id":"t194","name":"DroneViewPro","cat":"Photography & Creative","desc":"Aerial photography/video with FAA cert badge, project types, real estate focus.","price":79,"rating":4.8,"reviews":62,"seller":"Sasha L.","colors":["#080814","#4060a0","#f0f4fc"],"featured":false,"tags":["Photography & Creative","Responsive","SEO-Ready"]},{"id":"t195","name":"PixelCraft Design","cat":"Photography & Creative","desc":"Graphic design with portfolio by industry, service menu, brand packages.","price":69,"rating":4.7,"reviews":55,"seller":"Devon L.","colors":["#0a0808","#c9a84c","#1a1a28"],"featured":false,"tags":["Photography & Creative","Responsive","SEO-Ready"]},{"id":"t196","name":"IllustrationStudio","cat":"Photography & Creative","desc":"Illustration with style portfolio, book cover focus, licensing info, commissions.","price":72,"rating":4.7,"reviews":45,"seller":"Luis F.","colors":["#1a0818","#d070a0","#fff4f8"],"featured":false,"tags":["Photography & Creative","Responsive","SEO-Ready"]},{"id":"t197","name":"MotionCraft Animation","cat":"Photography & Creative","desc":"Animation studio with showreel, style comparison, explainer video packages.","price":89,"rating":4.6,"reviews":72,"seller":"Tyler N.","colors":["#080818","#6040c0","#f4f0fc"],"featured":false,"tags":["Photography & Creative","Responsive","SEO-Ready"]},{"id":"t198","name":"SoundBooth Music","cat":"Photography & Creative","desc":"Music production with genre focus, studio tour, per-song pricing, mixing services.","price":79,"rating":4.6,"reviews":67,"seller":"Amara O.","colors":["#080808","#c9a84c","#1a1a28"],"featured":false,"tags":["Photography & Creative","Responsive","SEO-Ready"]},{"id":"t199","name":"PodcastLaunch","cat":"Photography & Creative","desc":"Podcast studio with equipment guide, production packages, distribution help.","price":55,"rating":4.7,"reviews":24,"seller":"Yara F.","colors":["#080818","#8040c0","#f4f0fc"],"featured":false,"tags":["Photography & Creative","Responsive","SEO-Ready"]},{"id":"t200","name":"CreativeCo Agency","cat":"Photography & Creative","desc":"Full-service creative with case studies, team bios, retainer packages, brand work.","price":105,"rating":4.9,"reviews":11,"seller":"Ray D.","colors":["#0a0a14","#c9a84c","#1a1a28"],"featured":false,"tags":["Photography & Creative","Responsive","SEO-Ready"]},{"id":"t201","name":"EventPhoto","cat":"Photography & Creative","desc":"Event photographer with social media add-on, same-day delivery, corporate focus.","price":65,"rating":4.8,"reviews":40,"seller":"Danielle H.","colors":["#0a0808","#c08020","#f8f4e8"],"featured":false,"tags":["Photography & Creative","Responsive","SEO-Ready"]},{"id":"t202","name":"BrandShoot","cat":"Photography & Creative","desc":"Commercial photography with brand questionnaire, mood board, usage rights guide.","price":79,"rating":4.8,"reviews":6,"seller":"Devon M.","colors":["#0a0a14","#c9a84c","#1a1a28"],"featured":false,"tags":["Photography & Creative","Responsive","SEO-Ready"]},{"id":"t203","name":"CinematicWeddings","cat":"Photography & Creative","desc":"Cinematic videography with trailer samples, documentary style, highlight films.","price":95,"rating":4.9,"reviews":59,"seller":"Priya S.","colors":["#080808","#c09030","#f8f4e8"],"featured":false,"tags":["Photography & Creative","Responsive","SEO-Ready"]},{"id":"t204","name":"RealEstatePhoto","cat":"Photography & Creative","desc":"Real estate photography with interior/exterior, virtual tour, floor plan add-on.","price":55,"rating":4.9,"reviews":46,"seller":"Ray D.","colors":["#0a1428","#4090b0","#f0f8fc"],"featured":false,"tags":["Photography & Creative","Responsive","SEO-Ready"]},{"id":"t205","name":"FoodPhotography","cat":"Photography & Creative","desc":"Food photography with restaurant/brand focus, recipe content, social packages.","price":72,"rating":4.8,"reviews":80,"seller":"Ray D.","colors":["#1a0808","#c09030","#f8f4e8"],"featured":false,"tags":["Photography & Creative","Responsive","SEO-Ready"]},{"id":"t206","name":"TechFix IT","cat":"Tech & Digital","desc":"IT support with response time SLA, managed services comparison, remote option.","price":79,"rating":4.6,"reviews":30,"seller":"Marco V.","colors":["#080818","#4060c0","#f0f4fc"],"featured":false,"tags":["Tech & Digital","Responsive","SEO-Ready"]},{"id":"t207","name":"WebCraft Agency","cat":"Tech & Digital","desc":"Web development with case studies, tech stack showcase, maintenance retainers.","price":99,"rating":4.8,"reviews":79,"seller":"Marco V.","colors":["#0a0a14","#c9a84c","#1a1a28"],"featured":false,"tags":["Tech & Digital","Responsive","SEO-Ready"]},{"id":"t208","name":"AppBuilders","cat":"Tech & Digital","desc":"Mobile app development with process timeline, platform comparison, MVP focus.","price":119,"rating":4.8,"reviews":16,"seller":"Sofia R.","colors":["#080818","#5060c0","#f0f4fc"],"featured":false,"tags":["Tech & Digital","Responsive","SEO-Ready"]},{"id":"t209","name":"GrowDigital","cat":"Tech & Digital","desc":"Digital marketing with channel breakdown, case studies, reporting dashboard.","price":89,"rating":4.9,"reviews":23,"seller":"Amara O.","colors":["#080818","#6040c0","#f4f0fc"],"featured":false,"tags":["Tech & Digital","Responsive","SEO-Ready"]},{"id":"t210","name":"RankFirst SEO","cat":"Tech & Digital","desc":"SEO agency with ranking stats, audit tool CTA, local vs national packages.","price":85,"rating":4.9,"reviews":66,"seller":"Victor A.","colors":["#080818","#5060c0","#f0f4fc"],"featured":false,"tags":["Tech & Digital","Responsive","SEO-Ready"]},{"id":"t211","name":"SocialUp","cat":"Tech & Digital","desc":"Social media management with platform cards, content calendar, growth stats.","price":75,"rating":4.7,"reviews":66,"seller":"Camille B.","colors":["#080818","#8040c0","#f4f0fc"],"featured":false,"tags":["Tech & Digital","Responsive","SEO-Ready"]},{"id":"t212","name":"CyberShield","cat":"Tech & Digital","desc":"Cybersecurity with threat assessment, compliance services, incident response.","price":109,"rating":5.0,"reviews":20,"seller":"Camille B.","colors":["#0a0a14","#4060a0","#f0f4f8"],"featured":false,"tags":["Tech & Digital","Responsive","SEO-Ready"]},{"id":"t213","name":"CloudMove","cat":"Tech & Digital","desc":"Cloud migration with architecture comparison, cost savings calculator, timeline.","price":99,"rating":4.8,"reviews":72,"seller":"Tunde A.","colors":["#080818","#4060c0","#f0f4fc"],"featured":false,"tags":["Tech & Digital","Responsive","SEO-Ready"]},{"id":"t214","name":"DataDriven","cat":"Tech & Digital","desc":"Data analytics with case studies, tool stack, dashboard demos, consulting.","price":105,"rating":4.7,"reviews":9,"seller":"Tyler N.","colors":["#080818","#5050c0","#f0f4fc"],"featured":false,"tags":["Tech & Digital","Responsive","SEO-Ready"]},{"id":"t215","name":"AIConsult","cat":"Tech & Digital","desc":"AI strategy consulting with use case library, ROI calculator, implementation guide.","price":115,"rating":5.0,"reviews":21,"seller":"James O.","colors":["#080818","#6040c0","#f4f0fc"],"featured":false,"tags":["Tech & Digital","Responsive","SEO-Ready"]},{"id":"t216","name":"EcommercePro","cat":"Tech & Digital","desc":"Ecommerce agency with platform comparison, migration service, conversion focus.","price":99,"rating":4.8,"reviews":57,"seller":"Darius K.","colors":["#080818","#c9a84c","#1a1a28"],"featured":false,"tags":["Tech & Digital","Responsive","SEO-Ready"]},{"id":"t217","name":"AdWords Pro","cat":"Tech & Digital","desc":"PPC management with ROAS stats, platform comparison, account audit CTA.","price":85,"rating":4.9,"reviews":86,"seller":"Camille B.","colors":["#080818","#4060a0","#f0f4f8"],"featured":false,"tags":["Tech & Digital","Responsive","SEO-Ready"]},{"id":"t218","name":"ContentFactory","cat":"Tech & Digital","desc":"Content marketing with topic calendar, distribution channels, SEO integration.","price":75,"rating":4.8,"reviews":52,"seller":"Priya S.","colors":["#080818","#6040c0","#f4f0fc"],"featured":false,"tags":["Tech & Digital","Responsive","SEO-Ready"]},{"id":"t219","name":"EmailFlow","cat":"Tech & Digital","desc":"Email marketing with automation diagrams, open rate stats, platform migration.","price":69,"rating":4.8,"reviews":73,"seller":"Chris B.","colors":["#080818","#5060c0","#f0f4fc"],"featured":false,"tags":["Tech & Digital","Responsive","SEO-Ready"]},{"id":"t220","name":"VideoMarketing","cat":"Tech & Digital","desc":"Video marketing with explainer samples, platform optimization, distribution.","price":79,"rating":4.9,"reviews":70,"seller":"Luis F.","colors":["#080808","#c9a84c","#1a1a28"],"featured":false,"tags":["Tech & Digital","Responsive","SEO-Ready"]},{"id":"t221","name":"FeedHope Food Bank","cat":"Nonprofit & Community","desc":"Food bank with volunteer signup, donation tracker, monthly giving, impact stats.","price":55,"rating":4.6,"reviews":88,"seller":"Sofia R.","colors":["#081808","#70a840","#f0f8ec"],"featured":false,"tags":["Nonprofit & Community","Responsive","SEO-Ready"]},{"id":"t222","name":"PawRescue Shelter","cat":"Nonprofit & Community","desc":"Animal shelter with adoptable pets, foster program, donation tiers, volunteer form.","price":52,"rating":4.7,"reviews":64,"seller":"Chris B.","colors":["#081808","#78c040","#f0f8ec"],"featured":false,"tags":["Nonprofit & Community","Responsive","SEO-Ready"]},{"id":"t223","name":"YouthRise","cat":"Nonprofit & Community","desc":"Youth mentorship with program overview, volunteer roles, sponsor tiers, stories.","price":59,"rating":4.7,"reviews":62,"seller":"Tunde A.","colors":["#0a0818","#6040c0","#f4f0fc"],"featured":false,"tags":["Nonprofit & Community","Responsive","SEO-Ready"]},{"id":"t224","name":"Community Center","cat":"Nonprofit & Community","desc":"Community center with facility rental, program calendar, membership, events.","price":55,"rating":5.0,"reviews":28,"seller":"Devon L.","colors":["#081428","#4090b0","#f0f8fc"],"featured":false,"tags":["Nonprofit & Community","Responsive","SEO-Ready"]},{"id":"t225","name":"HopeHarbor","cat":"Nonprofit & Community","desc":"Domestic violence nonprofit with confidential resources, crisis line, donation form.","price":59,"rating":4.9,"reviews":62,"seller":"Nathan W.","colors":["#100810","#8060a0","#f4f0fc"],"featured":false,"tags":["Nonprofit & Community","Responsive","SEO-Ready"]},{"id":"t226","name":"GreenEarth","cat":"Nonprofit & Community","desc":"Environmental nonprofit with project map, volunteer events, partner orgs, impact.","price":55,"rating":4.7,"reviews":56,"seller":"Devon L.","colors":["#081808","#60a840","#f0f8ec"],"featured":false,"tags":["Nonprofit & Community","Responsive","SEO-Ready"]},{"id":"t227","name":"MusicForAll","cat":"Nonprofit & Community","desc":"Music education nonprofit with program stats, instrument donation, scholarship fund.","price":52,"rating":4.9,"reviews":52,"seller":"Keisha T.","colors":["#080818","#6040c0","#f4f0fc"],"featured":false,"tags":["Nonprofit & Community","Responsive","SEO-Ready"]},{"id":"t228","name":"BuildHope","cat":"Nonprofit & Community","desc":"Construction nonprofit with project gallery, volunteer skills needed, material needs.","price":55,"rating":4.8,"reviews":57,"seller":"Camille B.","colors":["#0a1428","#4090b0","#f0f8fc"],"featured":false,"tags":["Nonprofit & Community","Responsive","SEO-Ready"]},{"id":"t229","name":"LiteracyFirst","cat":"Nonprofit & Community","desc":"Reading nonprofit with tutor matching, book drive, adult learner focus.","price":49,"rating":4.7,"reviews":73,"seller":"Marco V.","colors":["#081428","#5090c0","#f0f8fc"],"featured":false,"tags":["Nonprofit & Community","Responsive","SEO-Ready"]},{"id":"t230","name":"VetHomes","cat":"Nonprofit & Community","desc":"Veterans housing nonprofit with eligibility guide, donation impact, volunteer form.","price":59,"rating":4.8,"reviews":27,"seller":"Darius K.","colors":["#0a0a14","#5060a0","#f0f4f8"],"featured":false,"tags":["Nonprofit & Community","Responsive","SEO-Ready"]},{"id":"t231","name":"PrimeListings","cat":"Real Estate","desc":"Real estate agency with property listings grid, agent roster, market reports.","price":109,"rating":4.7,"reviews":28,"seller":"Luis F.","colors":["#0a1428","#c09030","#f8f4e8"],"featured":false,"tags":["Real Estate","Responsive","SEO-Ready"]},{"id":"t232","name":"CommercialProp","cat":"Real Estate","desc":"Commercial RE with available spaces map, cap rate calculator, industry focus.","price":119,"rating":4.7,"reviews":86,"seller":"Marcus T.","colors":["#0a0a14","#c9a84c","#1a1a28"],"featured":false,"tags":["Real Estate","Responsive","SEO-Ready"]},{"id":"t233","name":"PropManager","cat":"Real Estate","desc":"Property management with tenant portal link, maintenance request, vacancy listing.","price":89,"rating":5.0,"reviews":52,"seller":"James O.","colors":["#0a1428","#5080a0","#f0f4f8"],"featured":false,"tags":["Real Estate","Responsive","SEO-Ready"]},{"id":"t234","name":"HomeInspector","cat":"Real Estate","desc":"Home inspection with report sample, what's checked list, certification badges.","price":59,"rating":4.8,"reviews":17,"seller":"Luis F.","colors":["#0a1428","#40a0b0","#f0f8fc"],"featured":false,"tags":["Real Estate","Responsive","SEO-Ready"]},{"id":"t235","name":"MortgagePro","cat":"Real Estate","desc":"Mortgage broker with rate comparison, calculator, pre-qual form, loan types.","price":79,"rating":5.0,"reviews":10,"seller":"Marcus T.","colors":["#0a1428","#4090b0","#f0f8fc"],"featured":false,"tags":["Real Estate","Responsive","SEO-Ready"]},{"id":"t236","name":"InvestRight","cat":"Real Estate","desc":"Real estate investment with deal analysis tool, ROI stats, portfolio showcase.","price":95,"rating":4.8,"reviews":77,"seller":"Chris B.","colors":["#0a0a14","#c9a84c","#1a1a28"],"featured":false,"tags":["Real Estate","Responsive","SEO-Ready"]},{"id":"t237","name":"NewConstruction","cat":"Real Estate","desc":"New home builder with floor plan gallery, community map, design studio CTA.","price":109,"rating":4.7,"reviews":73,"seller":"Camille B.","colors":["#0a1428","#c09030","#f8f4e8"],"featured":false,"tags":["Real Estate","Responsive","SEO-Ready"]},{"id":"t238","name":"VacationRental","cat":"Real Estate","desc":"Vacation rental management with calendar, pricing tiers, property photos.","price":75,"rating":5.0,"reviews":89,"seller":"Lena W.","colors":["#0a1428","#4090b0","#f0f8fc"],"featured":false,"tags":["Real Estate","Responsive","SEO-Ready"]},{"id":"t239","name":"LandSale","cat":"Real Estate","desc":"Land and acreage specialist with acreage map, zoning info, agricultural focus.","price":85,"rating":4.9,"reviews":12,"seller":"Tyler N.","colors":["#081808","#70a840","#f0f8ec"],"featured":false,"tags":["Real Estate","Responsive","SEO-Ready"]},{"id":"t240","name":"CondoKing","cat":"Real Estate","desc":"Condo specialist with building comparisons, HOA guide, investment analysis.","price":89,"rating":4.8,"reviews":70,"seller":"Darius K.","colors":["#0a1428","#5080a0","#f0f4f8"],"featured":false,"tags":["Real Estate","Responsive","SEO-Ready"]},{"id":"t241","name":"BoutiqueHotel","cat":"Hospitality","desc":"Boutique hotel with room gallery, local experience guide, direct booking CTA.","price":95,"rating":4.7,"reviews":46,"seller":"Devon L.","colors":["#100808","#c09030","#f8f4e8"],"featured":false,"tags":["Hospitality","Responsive","SEO-Ready"]},{"id":"t242","name":"CozyBnB","cat":"Hospitality","desc":"B&B with host story, room descriptions, breakfast menu, local attractions.","price":75,"rating":4.9,"reviews":44,"seller":"Marco V.","colors":["#100808","#c08030","#f8f4e8"],"featured":false,"tags":["Hospitality","Responsive","SEO-Ready"]},{"id":"t243","name":"VacaRentals","cat":"Hospitality","desc":"Vacation rental with property showcase, availability calendar, review badges.","price":79,"rating":4.8,"reviews":50,"seller":"Yara F.","colors":["#0a1428","#4090b0","#f0f8fc"],"featured":false,"tags":["Hospitality","Responsive","SEO-Ready"]},{"id":"t244","name":"ResortsBy","cat":"Hospitality","desc":"Luxury resort with amenity grid, spa preview, dining options, package deals.","price":129,"rating":5.0,"reviews":73,"seller":"Marcus T.","colors":["#100808","#c9a84c","#1a1a28"],"featured":false,"tags":["Hospitality","Responsive","SEO-Ready"]},{"id":"t245","name":"GlampSite","cat":"Hospitality","desc":"Glamping with site types, amenities guide, event hosting, and seasonal rates.","price":72,"rating":4.9,"reviews":65,"seller":"Victor A.","colors":["#081808","#70a840","#f0f8ec"],"featured":false,"tags":["Hospitality","Responsive","SEO-Ready"]},{"id":"t246","name":"CityHostel","cat":"Hospitality","desc":"Hostel with room types, common area photos, social events, and city guide.","price":55,"rating":4.6,"reviews":6,"seller":"Darius K.","colors":["#080818","#5040a0","#f4f0fc"],"featured":false,"tags":["Hospitality","Responsive","SEO-Ready"]},{"id":"t247","name":"CharterBoat","cat":"Hospitality","desc":"Boat charter with vessel gallery, fishing/sunset packages, captain bio.","price":85,"rating":4.7,"reviews":76,"seller":"James O.","colors":["#0a1428","#30b0e0","#e8f8fc"],"featured":false,"tags":["Hospitality","Responsive","SEO-Ready"]},{"id":"t248","name":"TourGuide","cat":"Hospitality","desc":"City tours with tour types, group vs private, booking calendar, multilingual.","price":65,"rating":4.9,"reviews":39,"seller":"Jordan M.","colors":["#0a1428","#4090b0","#f0f8fc"],"featured":false,"tags":["Hospitality","Responsive","SEO-Ready"]},{"id":"t249","name":"TravelAgency","cat":"Hospitality","desc":"Travel agency with destination gallery, package comparison, loyalty program.","price":79,"rating":4.8,"reviews":89,"seller":"Sofia R.","colors":["#0a1428","#4090b0","#f0f8fc"],"featured":false,"tags":["Hospitality","Responsive","SEO-Ready"]},{"id":"t250","name":"EcoLodge","cat":"Hospitality","desc":"Eco resort with sustainability badge, conservation info, off-grid amenities.","price":89,"rating":5.0,"reviews":87,"seller":"Danielle H.","colors":["#081808","#60a840","#f0f8ec"],"featured":false,"tags":["Hospitality","Responsive","SEO-Ready"]},{"id":"t251","name":"CraftWinery","cat":"Food Production","desc":"Winery with vineyard tour, wine club, vintage notes, and tasting room.","price":85,"rating":4.7,"reviews":47,"seller":"Sasha L.","colors":["#1a0808","#c84050","#fff0f4"],"featured":false,"tags":["Food Production","Responsive","SEO-Ready"]},{"id":"t252","name":"BrewCo","cat":"Food Production","desc":"Brewery with tap list, taproom hours, brewery tour, and merchandise shop.","price":72,"rating":4.7,"reviews":54,"seller":"James O.","colors":["#100808","#c09030","#f8f4e8"],"featured":false,"tags":["Food Production","Responsive","SEO-Ready"]},{"id":"t253","name":"ArtisanDistillery","cat":"Food Production","desc":"Distillery with spirit lineup, cocktail recipes, distillery tour, and gift shop.","price":79,"rating":4.7,"reviews":88,"seller":"Lena W.","colors":["#0a0808","#c09030","#f8f4e8"],"featured":false,"tags":["Food Production","Responsive","SEO-Ready"]},{"id":"t254","name":"OrganicFarm","cat":"Food Production","desc":"Farm with CSA subscription, farm stand hours, U-pick schedule, and recipes.","price":59,"rating":4.8,"reviews":7,"seller":"James O.","colors":["#081808","#70a840","#f0f8ec"],"featured":false,"tags":["Food Production","Responsive","SEO-Ready"]},{"id":"t255","name":"GourmetFood","cat":"Food Production","desc":"Specialty food brand with product story, ingredient sourcing, retail map.","price":65,"rating":4.8,"reviews":75,"seller":"Keisha T.","colors":["#1a0808","#c09030","#f8f4e8"],"featured":false,"tags":["Food Production","Responsive","SEO-Ready"]},{"id":"t256","name":"HoneyBee Farms","cat":"Food Production","desc":"Honey producer with hive photos, product variety, subscription, local stores.","price":52,"rating":4.6,"reviews":60,"seller":"Sasha L.","colors":["#1a1008","#e0a020","#f8f4e8"],"featured":false,"tags":["Food Production","Responsive","SEO-Ready"]},{"id":"t257","name":"ChocolateArtisan","cat":"Food Production","desc":"Artisan chocolate with collection gallery, gift boxes, factory tour, and classes.","price":72,"rating":4.7,"reviews":22,"seller":"Danielle H.","colors":["#1a0808","#c06030","#fff4ee"],"featured":false,"tags":["Food Production","Responsive","SEO-Ready"]},{"id":"t258","name":"ColdPressJuice","cat":"Food Production","desc":"Cold press juice with cleanse packages, ingredient guide, subscription box.","price":55,"rating":5.0,"reviews":7,"seller":"Tyler N.","colors":["#081808","#70c040","#f0f8ec"],"featured":false,"tags":["Food Production","Responsive","SEO-Ready"]},{"id":"t259","name":"FarmToTable","cat":"Food Production","desc":"Farm-to-table catering with seasonal menus, farm story, and CSA partnership.","price":65,"rating":4.6,"reviews":43,"seller":"Luis F.","colors":["#081808","#60a840","#f0f8ec"],"featured":false,"tags":["Food Production","Responsive","SEO-Ready"]},{"id":"t260","name":"SpiceCo","cat":"Food Production","desc":"Spice and seasoning brand with recipe blog, subscription box, and bulk ordering.","price":49,"rating":4.7,"reviews":87,"seller":"Yara F.","colors":["#1a0808","#c04030","#fff4ee"],"featured":false,"tags":["Food Production","Responsive","SEO-Ready"]},
{"id":"t100","name":"PawPerfect Grooming","cat":"Pet Services","desc":"Mobile pet grooming with breed guides, subscription packages, and before/after gallery.","price":44,"rating":4.7,"reviews":41,"seller":"Yara F.","colors":["#081808","#78c040","#f0f8ec"],"featured":false,"tags":["Pet Services","Responsive","SEO-Ready"]},
{"id":"t101","name":"BoardingBuddy","cat":"Pet Services","desc":"Pet boarding with kennel tour, webcam access, medication management, and reviews.","price":49,"rating":4.9,"reviews":25,"seller":"Keisha T.","colors":["#0a1808","#60a840","#f0f8ec"],"featured":false,"tags":["Pet Services","Responsive","SEO-Ready"]},
{"id":"t102","name":"TrainRight Dogs","cat":"Pet Services","desc":"Dog training with method comparison, board-and-train, and puppy starter packages.","price":55,"rating":4.7,"reviews":41,"seller":"Lena W.","colors":["#0a1808","#c09030","#f8f4e8"],"featured":false,"tags":["Pet Services","Responsive","SEO-Ready"]},
{"id":"t103","name":"VetTech Mobile","cat":"Pet Services","desc":"Mobile vet tech with wellness visit packages, vaccine records, and area map.","price":59,"rating":4.9,"reviews":24,"seller":"James O.","colors":["#081428","#4090c0","#f0f8fc"],"featured":false,"tags":["Pet Services","Responsive","SEO-Ready"]},
{"id":"t104","name":"WalkPro Dogs","cat":"Pet Services","desc":"Dog walking with GPS tracking, real-time updates, subscription plans, and sitter profiles.","price":39,"rating":4.7,"reviews":38,"seller":"Keisha T.","colors":["#081808","#70c040","#f0f8ec"],"featured":false,"tags":["Pet Services","Responsive","SEO-Ready"]},
{"id":"t105","name":"AquaPets","cat":"Pet Services","desc":"Aquarium setup and maintenance with tank size guide, fish compatibility, and service plans.","price":49,"rating":4.9,"reviews":34,"seller":"Camille B.","colors":["#0a1428","#30b0e0","#e8f8fc"],"featured":false,"tags":["Pet Services","Responsive","SEO-Ready"]},
{"id":"t106","name":"CatCafe","cat":"Pet Services","desc":"Cat caf\u00e9 with visit booking, adoptable cats showcase, and merchandise.","price":45,"rating":4.7,"reviews":72,"seller":"Amara O.","colors":["#1a0810","#c890b0","#fff4f8"],"featured":false,"tags":["Pet Services","Responsive","SEO-Ready"]},
{"id":"t107","name":"PetSpa","cat":"Pet Services","desc":"Premium pet spa with aromatherapy, massage, and breed-specific grooming packages.","price":52,"rating":4.7,"reviews":62,"seller":"Chris B.","colors":["#081808","#78c040","#f0f8ec"],"featured":false,"tags":["Pet Services","Responsive","SEO-Ready"]},
{"id":"t108","name":"ReptileKing","cat":"Pet Services","desc":"Exotic reptile care with species guides, supplies, and specialized vet referral.","price":39,"rating":4.6,"reviews":54,"seller":"Amara O.","colors":["#0a1808","#60a040","#f0f8ec"],"featured":false,"tags":["Pet Services","Responsive","SEO-Ready"]},
{"id":"t109","name":"BirdBrigade","cat":"Pet Services","desc":"Avian specialist with bird training, boarding, and species care guides.","price":44,"rating":5.0,"reviews":19,"seller":"Marco V.","colors":["#0a1428","#4090b0","#f0f8fc"],"featured":false,"tags":["Pet Services","Responsive","SEO-Ready"]},
{"id":"t110","name":"HomeComfort Care","cat":"Senior Care","desc":"In-home senior care with caregiver profiles, service tiers, and family update portal.","price":75,"rating":4.9,"reviews":69,"seller":"Alex P.","colors":["#0a1428","#4090c0","#f0f8fc"],"featured":false,"tags":["Senior Care","Responsive","SEO-Ready"]},
{"id":"t111","name":"CompanionFirst","cat":"Senior Care","desc":"Senior companionship with activity calendar, outing services, and family updates.","price":65,"rating":4.8,"reviews":8,"seller":"Tyler N.","colors":["#081428","#5090b0","#f0f8fc"],"featured":false,"tags":["Senior Care","Responsive","SEO-Ready"]},
{"id":"t112","name":"AlzheimersCare","cat":"Senior Care","desc":"Memory care specialist with family guide, respite services, and certified staff.","price":85,"rating":4.8,"reviews":38,"seller":"Sofia R.","colors":["#0a1428","#5080a0","#f0f4f8"],"featured":false,"tags":["Senior Care","Responsive","SEO-Ready"]},
{"id":"t113","name":"MobilityPro","cat":"Senior Care","desc":"Senior mobility with equipment rentals, stair lifts, and home modification.","price":69,"rating":4.7,"reviews":18,"seller":"Camille B.","colors":["#0a1428","#4090b0","#f0f8fc"],"featured":false,"tags":["Senior Care","Responsive","SEO-Ready"]},
{"id":"t114","name":"SeniorTransport","cat":"Senior Care","desc":"Medical transport with scheduling, accessibility features, and insurance info.","price":55,"rating":4.8,"reviews":58,"seller":"Jordan M.","colors":["#081428","#5090c0","#f0f8fc"],"featured":false,"tags":["Senior Care","Responsive","SEO-Ready"]},
{"id":"t115","name":"ElderLaw Services","cat":"Senior Care","desc":"Elder law attorney with estate planning, Medicaid planning, and family consultations.","price":89,"rating":4.6,"reviews":45,"seller":"Priya S.","colors":["#0a1428","#c09030","#f8f4e8"],"featured":false,"tags":["Senior Care","Responsive","SEO-Ready"]},
{"id":"t116","name":"SeniorFitness","cat":"Senior Care","desc":"Exercise for seniors with chair yoga, low-impact classes, and private sessions.","price":49,"rating":4.8,"reviews":24,"seller":"Alex P.","colors":["#0a1808","#60a840","#f0f8ec"],"featured":false,"tags":["Senior Care","Responsive","SEO-Ready"]},
{"id":"t117","name":"GoldenMeals","cat":"Senior Care","desc":"Senior meal delivery with dietary customization, nutrition guides, and subscription.","price":55,"rating":4.9,"reviews":9,"seller":"Lena W.","colors":["#081808","#60a040","#f0f8ec"],"featured":false,"tags":["Senior Care","Responsive","SEO-Ready"]},
{"id":"t118","name":"NightShift Care","cat":"Senior Care","desc":"Overnight senior care with emergency response, medication management, safety checks.","price":72,"rating":4.8,"reviews":19,"seller":"Amara O.","colors":["#0a1428","#4080a0","#f0f4f8"],"featured":false,"tags":["Senior Care","Responsive","SEO-Ready"]},
{"id":"t119","name":"PalliativeCare","cat":"Senior Care","desc":"End-of-life care with family support, pain management info, and hospice coordination.","price":79,"rating":4.9,"reviews":29,"seller":"Alex P.","colors":["#0a1428","#5080a0","#f0f4f8"],"featured":false,"tags":["Senior Care","Responsive","SEO-Ready"]},
{"id":"t120","name":"VowMakers Planning","cat":"Wedding Services","desc":"Full-service wedding planning with vendor network, timeline builder, and day-of coordination.","price":125,"rating":5.0,"reviews":46,"seller":"Jordan M.","colors":["#180a14","#d0a0b8","#fef8fc"],"featured":false,"tags":["Wedding Services","Responsive","SEO-Ready"]},
{"id":"t121","name":"DayOf Coordinator","cat":"Wedding Services","desc":"Wedding day coordination with timeline management, vendor liaison, emergency kit.","price":85,"rating":4.7,"reviews":8,"seller":"Keisha T.","colors":["#180a14","#c090b0","#fef8fc"],"featured":false,"tags":["Wedding Services","Responsive","SEO-Ready"]},
{"id":"t122","name":"BridalStyle","cat":"Wedding Services","desc":"Bridal styling with gown shopping guide, alterations referral, and accessories shop.","price":75,"rating":4.6,"reviews":53,"seller":"Priya S.","colors":["#1a0818","#d090b0","#fff4f8"],"featured":false,"tags":["Wedding Services","Responsive","SEO-Ready"]},
{"id":"t123","name":"GroomSuite","cat":"Wedding Services","desc":"Men's formalwear with measurement guide, rental comparison, and personal stylist.","price":65,"rating":4.8,"reviews":50,"seller":"Chris B.","colors":["#0a0a14","#c9a84c","#1a1a28"],"featured":false,"tags":["Wedding Services","Responsive","SEO-Ready"]},
{"id":"t124","name":"CakeArtistry","cat":"Wedding Services","desc":"Wedding cake design with consultation, tasting event, flavor guide, and portfolio.","price":79,"rating":4.6,"reviews":42,"seller":"Darius K.","colors":["#1a0808","#e0a0b0","#fff4f8"],"featured":false,"tags":["Wedding Services","Responsive","SEO-Ready"]},
{"id":"t125","name":"InvitationCo","cat":"Wedding Services","desc":"Wedding stationery with design portfolio, timeline, digital RSVP, and custom wax seals.","price":59,"rating":4.7,"reviews":46,"seller":"Marco V.","colors":["#1a0818","#c890b0","#fff4f8"],"featured":false,"tags":["Wedding Services","Responsive","SEO-Ready"]},
{"id":"t126","name":"HairAndVows","cat":"Wedding Services","desc":"Bridal hair and makeup with trial session, getting-ready packages, and travel option.","price":75,"rating":4.9,"reviews":64,"seller":"Sasha L.","colors":["#1a0818","#d090b0","#fff4f8"],"featured":false,"tags":["Wedding Services","Responsive","SEO-Ready"]},
{"id":"t127","name":"ToastMaster","cat":"Wedding Services","desc":"Wedding MC and toastmaster with ceremony scripts, readings library, and voice demos.","price":69,"rating":4.7,"reviews":33,"seller":"Amara O.","colors":["#0a0a14","#c9a84c","#1a1a28"],"featured":false,"tags":["Wedding Services","Responsive","SEO-Ready"]},
{"id":"t128","name":"TransportWedding","cat":"Wedding Services","desc":"Wedding transportation with fleet gallery, package comparison, and route planning.","price":79,"rating":4.7,"reviews":4,"seller":"Camille B.","colors":["#0a0808","#c09020","#f8f4e8"],"featured":false,"tags":["Wedding Services","Responsive","SEO-Ready"]},
{"id":"t129","name":"HoneymoonPro","cat":"Wedding Services","desc":"Honeymoon travel planning with destination guides, package tiers, and insider tips.","price":95,"rating":4.9,"reviews":8,"seller":"Yara F.","colors":["#0a1428","#4090b0","#f0f8fc"],"featured":false,"tags":["Wedding Services","Responsive","SEO-Ready"]},
{"id":"t130","name":"SoundBooth Studios","cat":"Music & Audio","desc":"Recording studio with studio tour, session rates, gear list, and producer profiles.","price":89,"rating":4.8,"reviews":66,"seller":"Alex P.","colors":["#080808","#c9a84c","#1a1a18"],"featured":false,"tags":["Music & Audio","Responsive","SEO-Ready"]},
{"id":"t131","name":"BeatMakers","cat":"Music & Audio","desc":"Beat production with genre samples, lease vs exclusive pricing, and custom order form.","price":65,"rating":5.0,"reviews":53,"seller":"Amara O.","colors":["#080818","#8040d0","#f4f0fc"],"featured":false,"tags":["Music & Audio","Responsive","SEO-Ready"]},
{"id":"t132","name":"VoiceCoach Pro","cat":"Music & Audio","desc":"Vocal coaching with genre focus, lesson packages, online option, and student demos.","price":55,"rating":4.9,"reviews":21,"seller":"Camille B.","colors":["#080818","#6040c0","#f4f0fc"],"featured":false,"tags":["Music & Audio","Responsive","SEO-Ready"]},
{"id":"t133","name":"PodcastPro Studio","cat":"Music & Audio","desc":"Podcast production with package comparison, show art design, distribution setup.","price":59,"rating":4.8,"reviews":41,"seller":"Amara O.","colors":["#080818","#4050b0","#f0f4fc"],"featured":false,"tags":["Music & Audio","Responsive","SEO-Ready"]},
{"id":"t134","name":"LiveSound Engineer","cat":"Music & Audio","desc":"Live audio with event types, equipment list, travel availability, and testimonials.","price":79,"rating":4.9,"reviews":11,"seller":"Jordan M.","colors":["#080808","#c9a84c","#1a1a18"],"featured":false,"tags":["Music & Audio","Responsive","SEO-Ready"]},
{"id":"t135","name":"PianoStudio","cat":"Music & Audio","desc":"Piano lessons with age groups, curriculum overview, recital schedule, and level assessment.","price":52,"rating":4.9,"reviews":57,"seller":"Lena W.","colors":["#0a0808","#c09030","#f8f4e8"],"featured":false,"tags":["Music & Audio","Responsive","SEO-Ready"]},
{"id":"t136","name":"GuitarCraft","cat":"Music & Audio","desc":"Guitar instruction with genre focus, acoustic vs electric, gear guide, and student videos.","price":49,"rating":4.6,"reviews":67,"seller":"Lena W.","colors":["#1a0808","#c09030","#f8f4e8"],"featured":false,"tags":["Music & Audio","Responsive","SEO-Ready"]},
{"id":"t137","name":"MixMaster","cat":"Music & Audio","desc":"Audio mixing and mastering with genre portfolio, turnaround times, and revision policy.","price":75,"rating":4.8,"reviews":24,"seller":"Chris B.","colors":["#080808","#c9a84c","#1a1a18"],"featured":false,"tags":["Music & Audio","Responsive","SEO-Ready"]},
{"id":"t138","name":"FilmScoreStudio","cat":"Music & Audio","desc":"Cinematic music composition with showreel, licensing terms, and custom project form.","price":99,"rating":4.7,"reviews":29,"seller":"Marcus T.","colors":["#080808","#c9a84c","#1a1a28"],"featured":false,"tags":["Music & Audio","Responsive","SEO-Ready"]},
{"id":"t139","name":"DJProEvents","cat":"Music & Audio","desc":"Mobile DJ with genre specialty, equipment showcase, event packages, and reviews.","price":65,"rating":4.9,"reviews":10,"seller":"Nathan W.","colors":["#080818","#8040d0","#f4f0fc"],"featured":false,"tags":["Music & Audio","Responsive","SEO-Ready"]},
{"id":"t140","name":"ClearMind Therapy","cat":"Mental Health","desc":"Individual therapy with specializations, insurance info, teletherapy, and new patient form.","price":85,"rating":4.9,"reviews":17,"seller":"Keisha T.","colors":["#100a1a","#7050a0","#f4f0fc"],"featured":false,"tags":["Mental Health","Responsive","SEO-Ready"]},
{"id":"t141","name":"CouplesCare","cat":"Mental Health","desc":"Couples counseling with approach overview, session format, online option, and intake form.","price":79,"rating":5.0,"reviews":24,"seller":"Marco V.","colors":["#100a1a","#8060a0","#f4f0fc"],"featured":false,"tags":["Mental Health","Responsive","SEO-Ready"]},
{"id":"t142","name":"TeenMinds","cat":"Mental Health","desc":"Adolescent therapy with parent guide, school consultation, group therapy, crisis line.","price":75,"rating":4.9,"reviews":68,"seller":"Yara F.","colors":["#100a1a","#7060a0","#f4f0fc"],"featured":false,"tags":["Mental Health","Responsive","SEO-Ready"]},
{"id":"t143","name":"AnxietyFree","cat":"Mental Health","desc":"Anxiety specialist with CBT/DBT info, workshop schedule, resources library.","price":72,"rating":4.9,"reviews":77,"seller":"Nathan W.","colors":["#100a1a","#6050a0","#f4f0fc"],"featured":false,"tags":["Mental Health","Responsive","SEO-Ready"]},
{"id":"t144","name":"GriefGuide","cat":"Mental Health","desc":"Grief counseling with loss type navigation, group sessions, memorial resources.","price":75,"rating":4.9,"reviews":9,"seller":"Marco V.","colors":["#100a1a","#7060a0","#f4f0fc"],"featured":false,"tags":["Mental Health","Responsive","SEO-Ready"]},
{"id":"t145","name":"LifeCoachPro","cat":"Mental Health","desc":"Life coaching with niche focus, program tiers, client transformation stories.","price":65,"rating":4.6,"reviews":55,"seller":"Tyler N.","colors":["#0a0818","#6040a0","#f4f0fc"],"featured":false,"tags":["Mental Health","Responsive","SEO-Ready"]},
{"id":"t146","name":"MindfulnessCo","cat":"Mental Health","desc":"Mindfulness and meditation coaching with course catalog, app integration, workplace programs.","price":59,"rating":4.9,"reviews":38,"seller":"James O.","colors":["#0a0a18","#5050a0","#f0f4fc"],"featured":false,"tags":["Mental Health","Responsive","SEO-Ready"]},
{"id":"t147","name":"TraumaHeals","cat":"Mental Health","desc":"Trauma-informed therapy with approach guide, EMDR info, safety resources, warm referrals.","price":82,"rating":4.7,"reviews":69,"seller":"Tunde A.","colors":["#100a1a","#7050a0","#f4f0fc"],"featured":false,"tags":["Mental Health","Responsive","SEO-Ready"]},
{"id":"t148","name":"ADHDSupport","cat":"Mental Health","desc":"ADHD specialist with age-group navigation, testing info, coaching services, parent resources.","price":78,"rating":4.8,"reviews":8,"seller":"Lena W.","colors":["#100a1a","#6050a0","#f4f0fc"],"featured":false,"tags":["Mental Health","Responsive","SEO-Ready"]},
{"id":"t149","name":"EatingWellness","cat":"Mental Health","desc":"Eating disorder recovery with treatment levels, dietitian partnership, insurance coverage.","price":82,"rating":4.7,"reviews":16,"seller":"Chris B.","colors":["#100a1a","#8060a0","#f4f0fc"],"featured":false,"tags":["Mental Health","Responsive","SEO-Ready"]},
{"id":"t150","name":"KitchenKing","cat":"Home Renovation","desc":"Kitchen remodeling with portfolio gallery, material comparison, 3D rendering CTA.","price":95,"rating":4.7,"reviews":60,"seller":"Amara O.","colors":["#1a1008","#c09040","#f8f4e8"],"featured":false,"tags":["Home Renovation","Responsive","SEO-Ready"]},
{"id":"t151","name":"BathReno Pro","cat":"Home Renovation","desc":"Bathroom renovation with before/after gallery, walk-in shower vs tub guide, showroom.","price":89,"rating":5.0,"reviews":62,"seller":"Darius K.","colors":["#0a1428","#5090b0","#f0f8fc"],"featured":false,"tags":["Home Renovation","Responsive","SEO-Ready"]},
{"id":"t152","name":"BasementFinish","cat":"Home Renovation","desc":"Basement finishing with purpose guide, egress window info, moisture remediation.","price":79,"rating":5.0,"reviews":66,"seller":"Devon L.","colors":["#0a1428","#4090b0","#f0f8fc"],"featured":false,"tags":["Home Renovation","Responsive","SEO-Ready"]},
{"id":"t153","name":"AdditonCo","cat":"Home Renovation","desc":"Home additions with ROI calculator, permit process guide, architect partnership.","price":119,"rating":5.0,"reviews":59,"seller":"Tyler N.","colors":["#0a1428","#5080a0","#f0f4f8"],"featured":false,"tags":["Home Renovation","Responsive","SEO-Ready"]},
{"id":"t154","name":"DecksAndMore","cat":"Home Renovation","desc":"Deck and porch with material comparison, HOA approval help, seasonal build schedule.","price":65,"rating":4.7,"reviews":71,"seller":"Lena W.","colors":["#081808","#70a840","#f0f8ec"],"featured":false,"tags":["Home Renovation","Responsive","SEO-Ready"]},
{"id":"t155","name":"WinDoor Pro","cat":"Home Renovation","desc":"Window and door replacement with energy savings calculator, brand comparison, warranty.","price":72,"rating":4.8,"reviews":55,"seller":"Amara O.","colors":["#0a1428","#4090b0","#f0f8fc"],"featured":false,"tags":["Home Renovation","Responsive","SEO-Ready"]},
{"id":"t156","name":"RoofToBasement","cat":"Home Renovation","desc":"Whole-home renovation coordinator with phased approach, contractor network.","price":125,"rating":4.7,"reviews":52,"seller":"Victor A.","colors":["#0a0a14","#c9a84c","#1a1a28"],"featured":false,"tags":["Home Renovation","Responsive","SEO-Ready"]},
{"id":"t157","name":"GaragePro","cat":"Home Renovation","desc":"Garage conversion with before/after gallery, ADU permitting, cost breakdown.","price":75,"rating":4.8,"reviews":62,"seller":"Marco V.","colors":["#0a1428","#5090b0","#f0f8fc"],"featured":false,"tags":["Home Renovation","Responsive","SEO-Ready"]},
{"id":"t158","name":"SmartHomePro","cat":"Home Renovation","desc":"Smart home integration with brand comparison, room-by-room guide, system demo video.","price":85,"rating":4.9,"reviews":4,"seller":"Marcus T.","colors":["#080818","#4060c0","#f0f4fc"],"featured":false,"tags":["Home Renovation","Responsive","SEO-Ready"]},
{"id":"t159","name":"ExteriorElite","cat":"Home Renovation","desc":"Exterior remodeling with siding comparison, curb appeal guide, before/after gallery.","price":79,"rating":4.7,"reviews":13,"seller":"Tunde A.","colors":["#0a1428","#5090b0","#f0f8fc"],"featured":false,"tags":["Home Renovation","Responsive","SEO-Ready"]},
{"id":"t160","name":"FreshHarvest Farm","cat":"Agricultural","desc":"CSA farm with share options, pickup schedule, seasonal availability, and farm photos.","price":55,"rating":4.9,"reviews":39,"seller":"James O.","colors":["#081808","#70a840","#f0f8ec"],"featured":false,"tags":["Agricultural","Responsive","SEO-Ready"]},
{"id":"t161","name":"OrchardPro","cat":"Agricultural","desc":"U-pick orchard with fruit calendar, family pricing, cider press, and preserves shop.","price":59,"rating":4.8,"reviews":32,"seller":"Sofia R.","colors":["#081808","#c09030","#f8f4e8"],"featured":false,"tags":["Agricultural","Responsive","SEO-Ready"]},
{"id":"t162","name":"GardenCenter","cat":"Agricultural","desc":"Plant nursery with seasonal inventory, planting guides, landscape design service.","price":49,"rating":4.8,"reviews":63,"seller":"Darius K.","colors":["#081808","#60a840","#f0f8ec"],"featured":false,"tags":["Agricultural","Responsive","SEO-Ready"]},
{"id":"t163","name":"RanchLife","cat":"Agricultural","desc":"Cattle ranch with direct beef sales, ranch experience packages, and herd management.","price":65,"rating":4.8,"reviews":38,"seller":"Lena W.","colors":["#1a0808","#c09030","#f8f4e8"],"featured":false,"tags":["Agricultural","Responsive","SEO-Ready"]},
{"id":"t164","name":"HydroFarm","cat":"Agricultural","desc":"Hydroponic farm with crop roster, wholesale inquiry, restaurant partner program.","price":59,"rating":4.9,"reviews":35,"seller":"Sofia R.","colors":["#081808","#70c040","#f0f8ec"],"featured":false,"tags":["Agricultural","Responsive","SEO-Ready"]},
{"id":"t165","name":"MushroomCo","cat":"Agricultural","desc":"Specialty mushroom farm with variety guide, subscription boxes, recipe blog.","price":49,"rating":5.0,"reviews":37,"seller":"Priya S.","colors":["#081808","#90a840","#f0f8ec"],"featured":false,"tags":["Agricultural","Responsive","SEO-Ready"]},
{"id":"t166","name":"BeekeeperPro","cat":"Agricultural","desc":"Honey farm with hive photos, raw honey education, subscription, and local pickup.","price":45,"rating":4.7,"reviews":43,"seller":"Darius K.","colors":["#1a1008","#e0a020","#f8f4e8"],"featured":false,"tags":["Agricultural","Responsive","SEO-Ready"]},
{"id":"t167","name":"TreeFarm","cat":"Agricultural","desc":"Christmas tree farm with variety guide, choose-and-cut, delivery option, and wreaths.","price":52,"rating":4.6,"reviews":55,"seller":"Victor A.","colors":["#081808","#60a840","#f0f8ec"],"featured":false,"tags":["Agricultural","Responsive","SEO-Ready"]},
{"id":"t168","name":"MicrogreensUS","cat":"Agricultural","desc":"Microgreens producer with restaurant inquiry, home delivery, and growing kits.","price":45,"rating":4.9,"reviews":56,"seller":"Marcus T.","colors":["#081808","#70c040","#f0f8ec"],"featured":false,"tags":["Agricultural","Responsive","SEO-Ready"]},
{"id":"t169","name":"AgriConsult","cat":"Agricultural","desc":"Agricultural consulting with crop planning, soil testing, grant assistance.","price":79,"rating":5.0,"reviews":73,"seller":"Keisha T.","colors":["#081808","#60a840","#f0f8ec"],"featured":false,"tags":["Agricultural","Responsive","SEO-Ready"]},
{"id":"t170","name":"BoatDocPro","cat":"Marine Services","desc":"Boat repair with service menu, marina location, winterization packages, brand expertise.","price":65,"rating":4.6,"reviews":58,"seller":"Tyler N.","colors":["#0a1428","#30b0e0","#e8f8fc"],"featured":false,"tags":["Marine Services","Responsive","SEO-Ready"]},
{"id":"t171","name":"MarineDetail","cat":"Marine Services","desc":"Boat detailing with hull cleaning, wax packages, interior deep clean, gel coat restore.","price":55,"rating":5.0,"reviews":61,"seller":"Tunde A.","colors":["#0a1428","#40b0e0","#e8f8fc"],"featured":false,"tags":["Marine Services","Responsive","SEO-Ready"]},
{"id":"t172","name":"FishingGuide","cat":"Marine Services","desc":"Fishing charter with catch photos, species guide, equipment provided, and season calendar.","price":79,"rating":4.7,"reviews":43,"seller":"Nathan W.","colors":["#0a1428","#30a0d0","#e8f8fc"],"featured":false,"tags":["Marine Services","Responsive","SEO-Ready"]},
{"id":"t173","name":"DockBuilder","cat":"Marine Services","desc":"Dock construction with material comparison, permit assistance, floating vs fixed guide.","price":89,"rating":5.0,"reviews":11,"seller":"Sofia R.","colors":["#0a1428","#4090b0","#f0f8fc"],"featured":false,"tags":["Marine Services","Responsive","SEO-Ready"]},
{"id":"t174","name":"SeaDive","cat":"Marine Services","desc":"Scuba diving instruction with certification levels, dive site guide, equipment shop.","price":65,"rating":5.0,"reviews":69,"seller":"Amara O.","colors":["#0a1428","#30b0e0","#e8f8fc"],"featured":false,"tags":["Marine Services","Responsive","SEO-Ready"]},
{"id":"t175","name":"SailSchool","cat":"Marine Services","desc":"Sailing lessons with beginner to advanced, bareboat charter prep, racing clinic.","price":72,"rating":5.0,"reviews":66,"seller":"Priya S.","colors":["#0a1428","#3090c0","#f0f8fc"],"featured":false,"tags":["Marine Services","Responsive","SEO-Ready"]},
{"id":"t176","name":"WaveRunners","cat":"Marine Services","desc":"Jet ski and boat rentals with safety orientation, hourly rates, group packages.","price":59,"rating":5.0,"reviews":45,"seller":"James O.","colors":["#0a1428","#40b0d0","#e8f8fc"],"featured":false,"tags":["Marine Services","Responsive","SEO-Ready"]},
{"id":"t177","name":"MarineSurvey","cat":"Marine Services","desc":"Boat inspection with survey types, pre-purchase focus, insurance requirements.","price":69,"rating":4.7,"reviews":22,"seller":"James O.","colors":["#0a1428","#4090b0","#f0f8fc"],"featured":false,"tags":["Marine Services","Responsive","SEO-Ready"]},
{"id":"t178","name":"BoatStorage","cat":"Marine Services","desc":"Boat storage with indoor vs outdoor comparison, shrink wrap, access hours, security.","price":49,"rating":5.0,"reviews":27,"seller":"Sasha L.","colors":["#0a1428","#4080a0","#f0f4f8"],"featured":false,"tags":["Marine Services","Responsive","SEO-Ready"]},
{"id":"t179","name":"WaterSports","cat":"Marine Services","desc":"Wakeboard, wakeskate, foiling instruction with lesson packages, boat rental add-on.","price":65,"rating":4.8,"reviews":11,"seller":"Keisha T.","colors":["#0a1428","#40b0e0","#e8f8fc"],"featured":false,"tags":["Marine Services","Responsive","SEO-Ready"]},
{"id":"t180","name":"TechRescue","cat":"IT & Computer Repair","desc":"Computer repair with issue type navigation, same-day option, data recovery service.","price":55,"rating":4.9,"reviews":60,"seller":"Alex P.","colors":["#080818","#4060c0","#f0f4fc"],"featured":false,"tags":["IT & Computer Repair","Responsive","SEO-Ready"]},
{"id":"t181","name":"PhoneFixPro","cat":"IT & Computer Repair","desc":"Phone repair with brand and model guide, screen/battery/port pricing, walk-in vs mail.","price":45,"rating":4.8,"reviews":76,"seller":"Jordan M.","colors":["#080818","#5060c0","#f0f4fc"],"featured":false,"tags":["IT & Computer Repair","Responsive","SEO-Ready"]},
{"id":"t182","name":"DataRecovery Pro","cat":"IT & Computer Repair","desc":"Data recovery with device type guide, no-data-no-charge policy, success rate stats.","price":79,"rating":5.0,"reviews":20,"seller":"Tunde A.","colors":["#080818","#4050b0","#f0f4fc"],"featured":false,"tags":["IT & Computer Repair","Responsive","SEO-Ready"]},
{"id":"t183","name":"NetworkNinja","cat":"IT & Computer Repair","desc":"Network setup with home vs business, Wi-Fi dead zone fix, security audit.","price":65,"rating":4.6,"reviews":64,"seller":"Yara F.","colors":["#080818","#4060c0","#f0f4fc"],"featured":false,"tags":["IT & Computer Repair","Responsive","SEO-Ready"]},
{"id":"t184","name":"PrinterPro","cat":"IT & Computer Repair","desc":"Printer repair with brand expertise, toner subscription, networked printer setup.","price":42,"rating":4.8,"reviews":64,"seller":"James O.","colors":["#080818","#5060b0","#f0f4fc"],"featured":false,"tags":["IT & Computer Repair","Responsive","SEO-Ready"]},
{"id":"t185","name":"SecurityCam Install","cat":"IT & Computer Repair","desc":"Security camera installation with package comparison, remote monitoring, and NVR guide.","price":65,"rating":4.6,"reviews":33,"seller":"Marco V.","colors":["#080818","#4060a0","#f0f4f8"],"featured":false,"tags":["IT & Computer Repair","Responsive","SEO-Ready"]},
{"id":"t186","name":"LaptopLife","cat":"IT & Computer Repair","desc":"Laptop repair and upgrade with lifespan calculator, SSD upgrade, thermal paste service.","price":49,"rating":4.7,"reviews":58,"seller":"Sasha L.","colors":["#080818","#4060c0","#f0f4fc"],"featured":false,"tags":["IT & Computer Repair","Responsive","SEO-Ready"]},
{"id":"t187","name":"CloudSetup","cat":"IT & Computer Repair","desc":"Small business cloud migration with platform comparison, training, ongoing support.","price":79,"rating":4.9,"reviews":29,"seller":"Marcus T.","colors":["#080818","#4050c0","#f0f4fc"],"featured":false,"tags":["IT & Computer Repair","Responsive","SEO-Ready"]},
{"id":"t188","name":"GamingPCBuild","cat":"IT & Computer Repair","desc":"Custom gaming PC builds with component picker, build showcase, upgrade consultation.","price":75,"rating":4.7,"reviews":8,"seller":"Camille B.","colors":["#080808","#e03020","#2a0808"],"featured":false,"tags":["IT & Computer Repair","Responsive","SEO-Ready"]},
{"id":"t189","name":"ManagedIT SMB","cat":"IT & Computer Repair","desc":"Managed IT for small businesses with helpdesk, monitoring, backup, and monthly retainer.","price":95,"rating":4.6,"reviews":62,"seller":"Nathan W.","colors":["#080818","#4060c0","#f0f4fc"],"featured":false,"tags":["IT & Computer Repair","Responsive","SEO-Ready"]},
{"id":"t190","name":"LifeCoach Elite","cat":"Personal Development","desc":"Life coaching with niche areas, 1:1 vs group, 90-day program, transformation stories.","price":79,"rating":4.6,"reviews":17,"seller":"Nathan W.","colors":["#100a1a","#8060a0","#f4f0fc"],"featured":false,"tags":["Personal Development","Responsive","SEO-Ready"]},
{"id":"t191","name":"PublicSpeak Pro","cat":"Personal Development","desc":"Public speaking coaching with assessment, workshop series, video review, conference prep.","price":72,"rating":4.9,"reviews":60,"seller":"Marcus T.","colors":["#0a0a18","#5060a0","#f0f4fc"],"featured":false,"tags":["Personal Development","Responsive","SEO-Ready"]},
{"id":"t192","name":"CareerLaunch","cat":"Personal Development","desc":"Career coaching with resume review, interview prep, LinkedIn optimization, salary negotiation.","price":65,"rating":4.6,"reviews":6,"seller":"Marcus T.","colors":["#080a18","#5060b0","#f0f4fc"],"featured":false,"tags":["Personal Development","Responsive","SEO-Ready"]},
{"id":"t193","name":"ExecutiveCoach","cat":"Personal Development","desc":"Executive leadership coaching with 360 assessment, peer group, and board prep.","price":125,"rating":4.8,"reviews":57,"seller":"Marco V.","colors":["#0a0a14","#c9a84c","#1a1a28"],"featured":false,"tags":["Personal Development","Responsive","SEO-Ready"]},
{"id":"t194","name":"StudyCoach","cat":"Personal Development","desc":"Academic performance coaching with learning style assessment, study plan, exam prep.","price":55,"rating":4.8,"reviews":20,"seller":"Keisha T.","colors":["#081428","#4090c0","#f0f8fc"],"featured":false,"tags":["Personal Development","Responsive","SEO-Ready"]},
{"id":"t195","name":"ConfidenceBuilding","cat":"Personal Development","desc":"Confidence and self-esteem coaching with program tiers, group workshops, and resources.","price":59,"rating":4.6,"reviews":35,"seller":"Tyler N.","colors":["#100a1a","#7060a0","#f4f0fc"],"featured":false,"tags":["Personal Development","Responsive","SEO-Ready"]},
{"id":"t196","name":"Timemaster","cat":"Personal Development","desc":"Productivity and time management coaching with system comparison and tool recommendations.","price":65,"rating":4.8,"reviews":10,"seller":"Devon L.","colors":["#0a0a14","#c9a84c","#1a1a28"],"featured":false,"tags":["Personal Development","Responsive","SEO-Ready"]},
{"id":"t197","name":"RelationshipCoach","cat":"Personal Development","desc":"Relationship coaching with focus areas, couples vs individual, program comparison.","price":72,"rating":4.9,"reviews":25,"seller":"Darius K.","colors":["#100a1a","#9060a0","#f4f0fc"],"featured":false,"tags":["Personal Development","Responsive","SEO-Ready"]},
{"id":"t198","name":"MoneyMindset","cat":"Personal Development","desc":"Financial mindset coaching with money story assessment, program tiers, resources.","price":65,"rating":5.0,"reviews":20,"seller":"Amara O.","colors":["#0a0a14","#c9a84c","#1a1a28"],"featured":false,"tags":["Personal Development","Responsive","SEO-Ready"]},
{"id":"t199","name":"HabitForge","cat":"Personal Development","desc":"Habit formation coaching with science-based approach, 30/60/90 day programs.","price":59,"rating":4.9,"reviews":16,"seller":"Tunde A.","colors":["#0a0a14","#6060a0","#f0f4fc"],"featured":false,"tags":["Personal Development","Responsive","SEO-Ready"]},
{"id":"t200","name":"GraceChurch","cat":"Religious Organizations","desc":"Church website with service times, livestream embed, sermon archive, giving portal.","price":55,"rating":5.0,"reviews":50,"seller":"Victor A.","colors":["#0a1428","#c09030","#f8f4e8"],"featured":false,"tags":["Religious Organizations","Responsive","SEO-Ready"]},
{"id":"t201","name":"HarmonyCongregation","cat":"Religious Organizations","desc":"Synagogue with event calendar, Torah study sign-up, holiday guide, and membership.","price":59,"rating":5.0,"reviews":43,"seller":"Yara F.","colors":["#0a1428","#c09030","#f8f4e8"],"featured":false,"tags":["Religious Organizations","Responsive","SEO-Ready"]},
{"id":"t202","name":"ZenTemple","cat":"Religious Organizations","desc":"Buddhist temple with meditation schedule, dharma talks, retreat booking, and sangha.","price":52,"rating":5.0,"reviews":25,"seller":"Priya S.","colors":["#081808","#70a840","#f0f8ec"],"featured":false,"tags":["Religious Organizations","Responsive","SEO-Ready"]},
{"id":"t203","name":"IslamicCenter","cat":"Religious Organizations","desc":"Mosque with prayer times, Quran classes, community events, and donation portal.","price":55,"rating":4.7,"reviews":53,"seller":"Victor A.","colors":["#0a1428","#4090b0","#f0f8fc"],"featured":false,"tags":["Religious Organizations","Responsive","SEO-Ready"]},
{"id":"t204","name":"UnitarianFellowship","cat":"Religious Organizations","desc":"Unitarian fellowship with open values, social justice programs, and event calendar.","price":49,"rating":4.8,"reviews":20,"seller":"Jordan M.","colors":["#0a1428","#5090b0","#f0f8fc"],"featured":false,"tags":["Religious Organizations","Responsive","SEO-Ready"]},
{"id":"t205","name":"ChristianSchool","cat":"Religious Organizations","desc":"Faith-based school with admissions guide, curriculum overview, tuition, and chapel.","price":65,"rating":4.9,"reviews":11,"seller":"Tyler N.","colors":["#0a1428","#c09030","#f8f4e8"],"featured":false,"tags":["Religious Organizations","Responsive","SEO-Ready"]},
{"id":"t206","name":"PrayerMinistry","cat":"Religious Organizations","desc":"Prayer ministry with request submission, testimony wall, outreach programs.","price":45,"rating":4.8,"reviews":16,"seller":"Keisha T.","colors":["#0a1428","#c09030","#f8f4e8"],"featured":false,"tags":["Religious Organizations","Responsive","SEO-Ready"]},
{"id":"t207","name":"YouthMinistry","cat":"Religious Organizations","desc":"Youth group with event calendar, small groups, mission trip info, volunteer roles.","price":49,"rating":4.7,"reviews":75,"seller":"Chris B.","colors":["#0a1428","#c09030","#f8f4e8"],"featured":false,"tags":["Religious Organizations","Responsive","SEO-Ready"]},
{"id":"t208","name":"CampingMinistry","cat":"Religious Organizations","desc":"Christian camp with session dates, age groups, cabin photos, staff applications.","price":55,"rating":4.8,"reviews":27,"seller":"Marco V.","colors":["#081808","#70a840","#f0f8ec"],"featured":false,"tags":["Religious Organizations","Responsive","SEO-Ready"]},
{"id":"t209","name":"ChapelWeddings","cat":"Religious Organizations","desc":"Wedding chapel with venue photos, ceremony packages, officiant info, and date check.","price":69,"rating":4.8,"reviews":52,"seller":"Darius K.","colors":["#0a1428","#c09030","#f8f4e8"],"featured":false,"tags":["Religious Organizations","Responsive","SEO-Ready"]},
{"id":"t210","name":"Alteration Studio","cat":"Fashion & Clothing","desc":"Clothing alterations with service pricing, turnaround time, before/after photos, reviews.","price":42,"rating":4.6,"reviews":78,"seller":"Tyler N.","colors":["#1a0818","#c890b0","#fff4f8"],"featured":false,"tags":["Fashion & Clothing","Responsive","SEO-Ready"]},
{"id":"t211","name":"CustomThread","cat":"Fashion & Clothing","desc":"Custom clothing design with fabric guide, measurement instructions, and portfolio.","price":79,"rating":4.8,"reviews":38,"seller":"Sofia R.","colors":["#0a0818","#c9a84c","#1a1a28"],"featured":false,"tags":["Fashion & Clothing","Responsive","SEO-Ready"]},
{"id":"t212","name":"VintageThreads","cat":"Fashion & Clothing","desc":"Vintage clothing shop with era guide, authentication info, online shop, and consignment.","price":55,"rating":4.9,"reviews":57,"seller":"Sofia R.","colors":["#1a0808","#c09030","#f8f4e8"],"featured":false,"tags":["Fashion & Clothing","Responsive","SEO-Ready"]},
{"id":"t213","name":"KidFashion","cat":"Fashion & Clothing","desc":"Children's clothing boutique with size guide, seasonal collections, school uniform section.","price":49,"rating":4.6,"reviews":19,"seller":"Tyler N.","colors":["#0a0818","#f060a0","#fff4f8"],"featured":false,"tags":["Fashion & Clothing","Responsive","SEO-Ready"]},
{"id":"t214","name":"PlusFashion","cat":"Fashion & Clothing","desc":"Inclusive fashion boutique with extended size guide, style tips, and lookbook.","price":59,"rating":4.7,"reviews":71,"seller":"Sasha L.","colors":["#1a0818","#c890b0","#fff4f8"],"featured":false,"tags":["Fashion & Clothing","Responsive","SEO-Ready"]},
{"id":"t215","name":"WorkwearPro","cat":"Fashion & Clothing","desc":"Professional workwear with industry-specific collections, bulk ordering, and embroidery.","price":55,"rating":4.9,"reviews":77,"seller":"Chris B.","colors":["#0a0a14","#c9a84c","#1a1a28"],"featured":false,"tags":["Fashion & Clothing","Responsive","SEO-Ready"]},
{"id":"t216","name":"ActiveWear Studio","cat":"Fashion & Clothing","desc":"Athletic wear boutique with activity-based shopping, fabric guide, and custom prints.","price":52,"rating":4.8,"reviews":66,"seller":"Jordan M.","colors":["#0a0a14","#e04020","#2a0808"],"featured":false,"tags":["Fashion & Clothing","Responsive","SEO-Ready"]},
{"id":"t217","name":"FormalWear","cat":"Fashion & Clothing","desc":"Formalwear rental and sales with event type guide, size chart, timeline recommendations.","price":65,"rating":4.6,"reviews":54,"seller":"Nathan W.","colors":["#0a0808","#c09020","#f8f4e8"],"featured":false,"tags":["Fashion & Clothing","Responsive","SEO-Ready"]},
{"id":"t218","name":"HandmadeKnits","cat":"Fashion & Clothing","desc":"Handmade knitwear with pattern gallery, custom orders, care guide, and gift certificates.","price":45,"rating":4.7,"reviews":74,"seller":"Marco V.","colors":["#1a1008","#c8a060","#f8f4e8"],"featured":false,"tags":["Fashion & Clothing","Responsive","SEO-Ready"]},
{"id":"t219","name":"EcoWear","cat":"Fashion & Clothing","desc":"Sustainable fashion with material guide, brand ethics, carbon footprint info.","price":55,"rating":4.7,"reviews":48,"seller":"Tyler N.","colors":["#081808","#60a840","#f0f8ec"],"featured":false,"tags":["Fashion & Clothing","Responsive","SEO-Ready"]},
{"id":"t220","name":"BaseballIQ","cat":"Sports Coaching","desc":"Baseball and softball coaching with position-specific drills, showcase prep, video analysis.","price":65,"rating":4.7,"reviews":43,"seller":"Keisha T.","colors":["#0a0a14","#c9a84c","#1a1a28"],"featured":false,"tags":["Sports Coaching","Responsive","SEO-Ready"]},
{"id":"t221","name":"SoccerSkills","cat":"Sports Coaching","desc":"Soccer coaching with age groups, position training, college recruiting guidance.","price":59,"rating":4.8,"reviews":50,"seller":"Yara F.","colors":["#081808","#60a840","#f0f8ec"],"featured":false,"tags":["Sports Coaching","Responsive","SEO-Ready"]},
{"id":"t222","name":"BasketballElite","cat":"Sports Coaching","desc":"Basketball skills with positional training, AAU team recruiting, highlight video service.","price":65,"rating":4.8,"reviews":64,"seller":"Marco V.","colors":["#0a0808","#e04020","#fff4ee"],"featured":false,"tags":["Sports Coaching","Responsive","SEO-Ready"]},
{"id":"t223","name":"SwimFast","cat":"Sports Coaching","desc":"Competitive swimming with stroke analysis, meet preparation, and video review.","price":59,"rating":5.0,"reviews":69,"seller":"James O.","colors":["#0a1428","#30b0e0","#e8f8fc"],"featured":false,"tags":["Sports Coaching","Responsive","SEO-Ready"]},
{"id":"t224","name":"TrackCoach","cat":"Sports Coaching","desc":"Track and field coaching with event-specific training, nutrition guide, competition prep.","price":55,"rating":4.8,"reviews":38,"seller":"Alex P.","colors":["#0a0a14","#c9a84c","#1a1a28"],"featured":false,"tags":["Sports Coaching","Responsive","SEO-Ready"]},
{"id":"t225","name":"LacrosseFirst","cat":"Sports Coaching","desc":"Lacrosse coaching with position focus, recruiting guide, equipment recommendations.","price":59,"rating":4.7,"reviews":40,"seller":"Sasha L.","colors":["#0a0a14","#c9a84c","#1a1a28"],"featured":false,"tags":["Sports Coaching","Responsive","SEO-Ready"]},
{"id":"t226","name":"GymnasticsElite","cat":"Sports Coaching","desc":"Gymnastics training with skill progression chart, competition prep, and parent portal.","price":65,"rating":5.0,"reviews":65,"seller":"Lena W.","colors":["#1a0818","#d090b0","#fff4f8"],"featured":false,"tags":["Sports Coaching","Responsive","SEO-Ready"]},
{"id":"t227","name":"IceSkating Pro","cat":"Sports Coaching","desc":"Ice skating instruction with rink partnerships, test prep, and performance group.","price":59,"rating":5.0,"reviews":62,"seller":"Amara O.","colors":["#0a1428","#40b0e0","#e8f8fc"],"featured":false,"tags":["Sports Coaching","Responsive","SEO-Ready"]},
{"id":"t228","name":"VolleyballUp","cat":"Sports Coaching","desc":"Volleyball coaching with indoor vs beach focus, position training, and combine prep.","price":55,"rating":5.0,"reviews":18,"seller":"Camille B.","colors":["#0a0a14","#c9a84c","#1a1a28"],"featured":false,"tags":["Sports Coaching","Responsive","SEO-Ready"]},
{"id":"t229","name":"WrestlingStrong","cat":"Sports Coaching","desc":"Wrestling with weight class guide, technique videos, tournament season schedule.","price":55,"rating":4.7,"reviews":67,"seller":"Amara O.","colors":["#0a0808","#e03020","#fff4ee"],"featured":false,"tags":["Sports Coaching","Responsive","SEO-Ready"]},
{"id":"t230","name":"FloatSpace","cat":"Spa & Relaxation","desc":"Float therapy with science-backed benefits, session packages, first-timer guide.","price":75,"rating":4.7,"reviews":60,"seller":"Alex P.","colors":["#0a1428","#3090c0","#f0f8fc"],"featured":false,"tags":["Spa & Relaxation","Responsive","SEO-Ready"]},
{"id":"t231","name":"InfraredSauna","cat":"Spa & Relaxation","desc":"Infrared sauna with health benefits guide, session comparison, membership tiers.","price":65,"rating":4.7,"reviews":70,"seller":"Priya S.","colors":["#1a0808","#c04020","#fff4ee"],"featured":false,"tags":["Spa & Relaxation","Responsive","SEO-Ready"]},
{"id":"t232","name":"CryoWellness","cat":"Spa & Relaxation","desc":"Cryotherapy with treatment types, session packages, sports recovery focus.","price":69,"rating":4.8,"reviews":16,"seller":"Amara O.","colors":["#0a1428","#40b0e0","#e8f8fc"],"featured":false,"tags":["Spa & Relaxation","Responsive","SEO-Ready"]},
{"id":"t233","name":"SoundHeal","cat":"Spa & Relaxation","desc":"Sound bath therapy with session types, group vs private, instrument guide.","price":55,"rating":5.0,"reviews":58,"seller":"Alex P.","colors":["#080818","#8060a0","#f4f0fc"],"featured":false,"tags":["Spa & Relaxation","Responsive","SEO-Ready"]},
{"id":"t234","name":"ReikiMaster","cat":"Spa & Relaxation","desc":"Reiki energy healing with practitioner bio, session description, and package tiers.","price":52,"rating":4.7,"reviews":67,"seller":"Nathan W.","colors":["#100a1a","#8060a0","#f4f0fc"],"featured":false,"tags":["Spa & Relaxation","Responsive","SEO-Ready"]},
{"id":"t235","name":"HolisticWellness","cat":"Spa & Relaxation","desc":"Integrative spa with modality menu, practitioner team, wellness package bundles.","price":79,"rating":4.6,"reviews":45,"seller":"Camille B.","colors":["#100a1a","#9070a0","#f4f0fc"],"featured":false,"tags":["Spa & Relaxation","Responsive","SEO-Ready"]},
{"id":"t236","name":"ChairMassage","cat":"Spa & Relaxation","desc":"Corporate chair massage with workplace packages, event booking, and rate cards.","price":49,"rating":5.0,"reviews":29,"seller":"James O.","colors":["#1a0a08","#c09060","#f8f0e8"],"featured":false,"tags":["Spa & Relaxation","Responsive","SEO-Ready"]},
{"id":"t237","name":"HydrotherapySpa","cat":"Spa & Relaxation","desc":"Hydrotherapy with treatment menu, contraindications guide, package comparison.","price":65,"rating":5.0,"reviews":62,"seller":"Yara F.","colors":["#0a1428","#40b0c0","#e8f8fc"],"featured":false,"tags":["Spa & Relaxation","Responsive","SEO-Ready"]},
{"id":"t238","name":"BreathworkStudio","cat":"Spa & Relaxation","desc":"Breathwork coaching with session types, trauma-informed approach, online option.","price":55,"rating":4.7,"reviews":30,"seller":"Jordan M.","colors":["#100a1a","#7060a0","#f4f0fc"],"featured":false,"tags":["Spa & Relaxation","Responsive","SEO-Ready"]},
{"id":"t239","name":"AromatherapyBar","cat":"Spa & Relaxation","desc":"Essential oil bar with blend guide, workshop schedule, subscription, and product shop.","price":45,"rating":5.0,"reviews":36,"seller":"James O.","colors":["#0a1808","#60a840","#f0f8ec"],"featured":false,"tags":["Spa & Relaxation","Responsive","SEO-Ready"]},
{"id":"t240","name":"TenderFarewells","cat":"Funeral & Memorial","desc":"Funeral home with service types, pre-planning guide, grief resources, and online tributes.","price":79,"rating":4.6,"reviews":58,"seller":"Tyler N.","colors":["#0a1428","#5080a0","#f0f4f8"],"featured":false,"tags":["Funeral & Memorial","Responsive","SEO-Ready"]},
{"id":"t241","name":"CremationChoice","cat":"Funeral & Memorial","desc":"Cremation services with option comparison, urns gallery, memorial keepsake shop.","price":65,"rating":4.9,"reviews":29,"seller":"James O.","colors":["#0a1428","#5080a0","#f0f4f8"],"featured":false,"tags":["Funeral & Memorial","Responsive","SEO-Ready"]},
{"id":"t242","name":"MemorialPark","cat":"Funeral & Memorial","desc":"Memorial park with section map, burial vs cremation, veteran services, pre-need info.","price":72,"rating":4.6,"reviews":77,"seller":"Tyler N.","colors":["#081808","#70a840","#f0f8ec"],"featured":false,"tags":["Funeral & Memorial","Responsive","SEO-Ready"]},
{"id":"t243","name":"GriefCounsel","cat":"Funeral & Memorial","desc":"Grief counselor with loss types, group vs individual, resources library, and hotline.","price":69,"rating":4.9,"reviews":49,"seller":"Chris B.","colors":["#100a1a","#7060a0","#f4f0fc"],"featured":false,"tags":["Funeral & Memorial","Responsive","SEO-Ready"]},
{"id":"t244","name":"PetMemorial","cat":"Funeral & Memorial","desc":"Pet cremation and memorial with urn gallery, paw print keepsakes, and grief support.","price":55,"rating":4.6,"reviews":64,"seller":"Marcus T.","colors":["#0a1428","#5080a0","#f0f4f8"],"featured":false,"tags":["Funeral & Memorial","Responsive","SEO-Ready"]},
{"id":"t245","name":"LegacyPlan","cat":"Funeral & Memorial","desc":"Pre-need funeral planning with checklist download, price guarantee, and advisor booking.","price":69,"rating":4.7,"reviews":78,"seller":"Amara O.","colors":["#0a1428","#5080a0","#f0f4f8"],"featured":false,"tags":["Funeral & Memorial","Responsive","SEO-Ready"]},
{"id":"t246","name":"CelebrationOfLife","cat":"Funeral & Memorial","desc":"Celebration of life event planning with venue options, catering, AV, and memoir printing.","price":75,"rating":4.7,"reviews":26,"seller":"Chris B.","colors":["#0a1428","#c09030","#f8f4e8"],"featured":false,"tags":["Funeral & Memorial","Responsive","SEO-Ready"]},
{"id":"t247","name":"MemorialVideo","cat":"Funeral & Memorial","desc":"Memorial video production with photo slideshow, music, tributes, and streaming option.","price":59,"rating":4.7,"reviews":66,"seller":"Amara O.","colors":["#080808","#c09030","#f8f4e8"],"featured":false,"tags":["Funeral & Memorial","Responsive","SEO-Ready"]},
{"id":"t248","name":"HeadstoneArt","cat":"Funeral & Memorial","desc":"Custom headstone design with material guide, inscription guide, and installation.","price":79,"rating":4.7,"reviews":38,"seller":"Tyler N.","colors":["#0a1428","#5080a0","#f0f4f8"],"featured":false,"tags":["Funeral & Memorial","Responsive","SEO-Ready"]},
{"id":"t249","name":"ObituaryPro","cat":"Funeral & Memorial","desc":"Obituary writing and publishing service with submission guide and print options.","price":45,"rating":4.9,"reviews":24,"seller":"Sofia R.","colors":["#0a1428","#5080a0","#f0f4f8"],"featured":false,"tags":["Funeral & Memorial","Responsive","SEO-Ready"]},
{"id":"t250","name":"CityToursNow","cat":"Travel & Tourism","desc":"City tour company with tour types, private vs group, language options, and booking.","price":65,"rating":5.0,"reviews":43,"seller":"Nathan W.","colors":["#0a1428","#4090b0","#f0f8fc"],"featured":false,"tags":["Travel & Tourism","Responsive","SEO-Ready"]},
{"id":"t251","name":"AdventureTrips","cat":"Travel & Tourism","desc":"Outdoor adventure tours with activity comparison, gear list, skill levels, and booking.","price":79,"rating":4.8,"reviews":62,"seller":"Marco V.","colors":["#081808","#70a840","#f0f8ec"],"featured":false,"tags":["Travel & Tourism","Responsive","SEO-Ready"]},
{"id":"t252","name":"CulinaryTours","cat":"Travel & Tourism","desc":"Food and drink tours with tour stops, dietary options, wine/beer pairing, group sizes.","price":72,"rating":4.9,"reviews":33,"seller":"Amara O.","colors":["#1a0808","#c09030","#f8f4e8"],"featured":false,"tags":["Travel & Tourism","Responsive","SEO-Ready"]},
{"id":"t253","name":"GhostTours","cat":"Travel & Tourism","desc":"Ghost and history tours with tour schedule, haunted locations map, and family vs adult.","price":55,"rating":4.7,"reviews":54,"seller":"Sasha L.","colors":["#080818","#8040d0","#f4f0fc"],"featured":false,"tags":["Travel & Tourism","Responsive","SEO-Ready"]},
{"id":"t254","name":"ConciergeElite","cat":"Travel & Tourism","desc":"Luxury travel concierge with destination expertise, itinerary design, and VIP access.","price":125,"rating":4.8,"reviews":42,"seller":"Tunde A.","colors":["#0a0808","#c9a84c","#1a1a28"],"featured":false,"tags":["Travel & Tourism","Responsive","SEO-Ready"]},
{"id":"t255","name":"BackpackGuide","cat":"Travel & Tourism","desc":"Budget travel consulting with destination guides, packing lists, hostel recommendations.","price":45,"rating":5.0,"reviews":33,"seller":"Camille B.","colors":["#081808","#70a840","#f0f8ec"],"featured":false,"tags":["Travel & Tourism","Responsive","SEO-Ready"]},
{"id":"t256","name":"RoadTrip Plan","cat":"Travel & Tourism","desc":"Road trip planning with route maps, stop recommendations, vehicle prep guide.","price":49,"rating":4.9,"reviews":45,"seller":"Camille B.","colors":["#0a1428","#4090b0","#f0f8fc"],"featured":false,"tags":["Travel & Tourism","Responsive","SEO-Ready"]},
{"id":"t257","name":"VacationPhotog","cat":"Travel & Tourism","desc":"Vacation photography with destination portfolio, booking by location, package comparison.","price":69,"rating":5.0,"reviews":25,"seller":"Priya S.","colors":["#0a0808","#c09030","#f8f4e8"],"featured":false,"tags":["Travel & Tourism","Responsive","SEO-Ready"]},
{"id":"t258","name":"AirportShuttle","cat":"Travel & Tourism","desc":"Airport transport with fleet gallery, zone pricing, early-morning reliability badge.","price":45,"rating":4.9,"reviews":24,"seller":"Tunde A.","colors":["#0a1428","#4090c0","#f0f8fc"],"featured":false,"tags":["Travel & Tourism","Responsive","SEO-Ready"]},
{"id":"t259","name":"LanguageTourGuide","cat":"Travel & Tourism","desc":"Bilingual tour guide with language pairs, destination expertise, and private booking.","price":65,"rating":4.7,"reviews":53,"seller":"Sofia R.","colors":["#0a1428","#4090b0","#f0f8fc"],"featured":false,"tags":["Travel & Tourism","Responsive","SEO-Ready"]},
{"id":"t260","name":"NannyMatch","cat":"Childcare & Nanny","desc":"Nanny agency with vetting process, caregiver profiles, placement guarantee.","price":79,"rating":4.8,"reviews":28,"seller":"Tyler N.","colors":["#0a1808","#f0c040","#fff8e8"],"featured":false,"tags":["Childcare & Nanny","Responsive","SEO-Ready"]},
{"id":"t261","name":"BabyNurse","cat":"Childcare & Nanny","desc":"Newborn care specialist with night nurse packages, feeding support, sleep training.","price":85,"rating":4.7,"reviews":45,"seller":"Chris B.","colors":["#0a1808","#e0b040","#fff8e8"],"featured":false,"tags":["Childcare & Nanny","Responsive","SEO-Ready"]},
{"id":"t262","name":"AuPairPro","cat":"Childcare & Nanny","desc":"Au pair placement with cultural exchange guide, family matching, and visa support.","price":95,"rating":4.8,"reviews":40,"seller":"Marco V.","colors":["#0a1428","#4090b0","#f0f8fc"],"featured":false,"tags":["Childcare & Nanny","Responsive","SEO-Ready"]},
{"id":"t263","name":"AfterSchoolCare","cat":"Childcare & Nanny","desc":"After-school childcare with pickup service, homework help, snack program.","price":59,"rating":5.0,"reviews":53,"seller":"Sasha L.","colors":["#0a1808","#60a840","#f0f8ec"],"featured":false,"tags":["Childcare & Nanny","Responsive","SEO-Ready"]},
{"id":"t264","name":"SpecialNeedsNanny","cat":"Childcare & Nanny","desc":"Special needs childcare with qualification highlights, therapy support, family match.","price":85,"rating":4.6,"reviews":7,"seller":"Alex P.","colors":["#0a1428","#5090b0","#f0f8fc"],"featured":false,"tags":["Childcare & Nanny","Responsive","SEO-Ready"]},
{"id":"t265","name":"NightNanny","cat":"Childcare & Nanny","desc":"Overnight baby care with shift packages, sleep training add-on, newborn focus.","price":79,"rating":4.8,"reviews":42,"seller":"Chris B.","colors":["#0a0818","#6040a0","#f4f0fc"],"featured":false,"tags":["Childcare & Nanny","Responsive","SEO-Ready"]},
{"id":"t266","name":"HouseholdManager","cat":"Childcare & Nanny","desc":"Household manager and personal assistant services with task menu and references.","price":89,"rating":4.7,"reviews":65,"seller":"Priya S.","colors":["#0a0a14","#c9a84c","#1a1a28"],"featured":false,"tags":["Childcare & Nanny","Responsive","SEO-Ready"]},
{"id":"t267","name":"TwinsNanny","cat":"Childcare & Nanny","desc":"Twin and multiples specialist with dual-care approach, scheduling systems, experience.","price":85,"rating":4.6,"reviews":19,"seller":"Marco V.","colors":["#0a1808","#f0c040","#fff8e8"],"featured":false,"tags":["Childcare & Nanny","Responsive","SEO-Ready"]},
{"id":"t268","name":"SummerNanny","cat":"Childcare & Nanny","desc":"Summer childcare with activity planning, outing coordination, and weekly themes.","price":65,"rating":4.7,"reviews":44,"seller":"Keisha T.","colors":["#081808","#70c040","#f0f8ec"],"featured":false,"tags":["Childcare & Nanny","Responsive","SEO-Ready"]},
{"id":"t269","name":"BackupCare","cat":"Childcare & Nanny","desc":"On-demand backup childcare with vetted sitter pool, 4-hour minimum, background checks.","price":59,"rating":4.7,"reviews":45,"seller":"Marcus T.","colors":["#0a1808","#60a840","#f0f8ec"],"featured":false,"tags":["Childcare & Nanny","Responsive","SEO-Ready"]},
{"id":"t270","name":"ExoticCarCare","cat":"Automotive Specialty","desc":"Exotic and luxury car specialist with brand expertise, enclosed transport, concierge.","price":109,"rating":4.7,"reviews":21,"seller":"Tunde A.","colors":["#0a0808","#c9a84c","#1a1a18"],"featured":false,"tags":["Automotive Specialty","Responsive","SEO-Ready"]},
{"id":"t271","name":"ClassicCarResto","cat":"Automotive Specialty","desc":"Classic car restoration with project gallery, marque expertise, and show prep.","price":99,"rating":4.9,"reviews":39,"seller":"Tunde A.","colors":["#1a0808","#c09030","#f8f4e8"],"featured":false,"tags":["Automotive Specialty","Responsive","SEO-Ready"]},
{"id":"t272","name":"RacePrepShop","cat":"Automotive Specialty","desc":"Race car preparation with series focus, dyno tuning, safety equipment installation.","price":119,"rating":4.9,"reviews":66,"seller":"Chris B.","colors":["#0a0808","#e03020","#2a0808"],"featured":false,"tags":["Automotive Specialty","Responsive","SEO-Ready"]},
{"id":"t273","name":"VinylWrapPro","cat":"Automotive Specialty","desc":"Vehicle wraps with color gallery, finish comparison, turnaround time, and portfolio.","price":65,"rating":4.9,"reviews":33,"seller":"James O.","colors":["#0a0a14","#c9a84c","#1a1a28"],"featured":false,"tags":["Automotive Specialty","Responsive","SEO-Ready"]},
{"id":"t274","name":"CarAudioElite","cat":"Automotive Specialty","desc":"Car audio with brand comparison, installation gallery, custom fabrication showcase.","price":59,"rating":4.8,"reviews":19,"seller":"Amara O.","colors":["#080808","#c9a84c","#1a1a28"],"featured":false,"tags":["Automotive Specialty","Responsive","SEO-Ready"]},
{"id":"t275","name":"LiftKitPro","cat":"Automotive Specialty","desc":"Truck and SUV lift kits with before/after gallery, size guide, and wheel/tire packages.","price":69,"rating":4.6,"reviews":25,"seller":"Devon L.","colors":["#0a0a14","#e04020","#2a0808"],"featured":false,"tags":["Automotive Specialty","Responsive","SEO-Ready"]},
{"id":"t276","name":"EVConversion","cat":"Automotive Specialty","desc":"Electric vehicle conversion with conversion process, range guide, cost calculator.","price":99,"rating":4.8,"reviews":44,"seller":"Keisha T.","colors":["#081808","#40b040","#f0f8ec"],"featured":false,"tags":["Automotive Specialty","Responsive","SEO-Ready"]},
{"id":"t277","name":"AutoAuction","cat":"Automotive Specialty","desc":"Auto auction with preview days, bidding guide, condition reports, and transport.","price":55,"rating":4.8,"reviews":48,"seller":"Tunde A.","colors":["#0a0a14","#c9a84c","#1a1a28"],"featured":false,"tags":["Automotive Specialty","Responsive","SEO-Ready"]},
{"id":"t278","name":"SpeedShopDyno","cat":"Automotive Specialty","desc":"Performance tuning with dyno gallery, brand expertise, and before/after power stats.","price":89,"rating":4.7,"reviews":73,"seller":"Devon L.","colors":["#0a0808","#e03020","#2a0808"],"featured":false,"tags":["Automotive Specialty","Responsive","SEO-Ready"]},
{"id":"t279","name":"CollectorCars","cat":"Automotive Specialty","desc":"Collector car sales with provenance documentation, storage services, and consignment.","price":119,"rating":4.9,"reviews":15,"seller":"Priya S.","colors":["#0a0808","#c9a84c","#1a1a28"],"featured":false,"tags":["Automotive Specialty","Responsive","SEO-Ready"]},
{"id":"t280","name":"OfficeClean Pro","cat":"Cleaning (Commercial)","desc":"Commercial office cleaning with frequency tiers, janitorial supply, and green option.","price":59,"rating":4.8,"reviews":56,"seller":"Jordan M.","colors":["#0a1428","#4ab0c0","#f0f8fc"],"featured":false,"tags":["Cleaning (Commercial)","Responsive","SEO-Ready"]},
{"id":"t281","name":"ConstructionClean","cat":"Cleaning (Commercial)","desc":"Post-construction cleanup with debris removal, detailed clean, and inspection prep.","price":69,"rating":4.7,"reviews":14,"seller":"Sofia R.","colors":["#0a1428","#5090b0","#f0f8fc"],"featured":false,"tags":["Cleaning (Commercial)","Responsive","SEO-Ready"]},
{"id":"t282","name":"MedicalFacilityClean","cat":"Cleaning (Commercial)","desc":"Medical-grade cleaning with certification badges, HIPAA compliance, and protocol docs.","price":85,"rating":5.0,"reviews":8,"seller":"Devon L.","colors":["#0a1428","#40a0b0","#f0f8fc"],"featured":false,"tags":["Cleaning (Commercial)","Responsive","SEO-Ready"]},
{"id":"t283","name":"RestaurantClean","cat":"Cleaning (Commercial)","desc":"Restaurant and kitchen cleaning with hood cleaning, overnight shifts, health code focus.","price":72,"rating":4.9,"reviews":38,"seller":"James O.","colors":["#0a1428","#5090b0","#f0f8fc"],"featured":false,"tags":["Cleaning (Commercial)","Responsive","SEO-Ready"]},
{"id":"t284","name":"IndustrialClean","cat":"Cleaning (Commercial)","desc":"Industrial facility cleaning with safety certifications, chemical handling, and scheduling.","price":89,"rating":4.9,"reviews":65,"seller":"Amara O.","colors":["#0a0a14","#5080a0","#f0f4f8"],"featured":false,"tags":["Cleaning (Commercial)","Responsive","SEO-Ready"]},
{"id":"t285","name":"RetailClean","cat":"Cleaning (Commercial)","desc":"Retail store cleaning with after-hours scheduling, floor care, and window cleaning.","price":52,"rating":4.9,"reviews":19,"seller":"Keisha T.","colors":["#0a1428","#4ab0c0","#f0f8fc"],"featured":false,"tags":["Cleaning (Commercial)","Responsive","SEO-Ready"]},
{"id":"t286","name":"EventCleanup","cat":"Cleaning (Commercial)","desc":"Event cleanup with before/during/after tiers, large venue experience, and eco options.","price":59,"rating":4.8,"reviews":43,"seller":"Chris B.","colors":["#0a1428","#5090b0","#f0f8fc"],"featured":false,"tags":["Cleaning (Commercial)","Responsive","SEO-Ready"]},
{"id":"t287","name":"SchoolsClean","cat":"Cleaning (Commercial)","desc":"School and daycare cleaning with disinfection protocols, safe chemicals, and scheduling.","price":65,"rating":4.6,"reviews":15,"seller":"Amara O.","colors":["#0a1428","#40a0b0","#f0f8fc"],"featured":false,"tags":["Cleaning (Commercial)","Responsive","SEO-Ready"]},
{"id":"t288","name":"GymClean","cat":"Cleaning (Commercial)","desc":"Fitness facility cleaning with equipment sanitization, locker rooms, mat cleaning.","price":59,"rating":4.8,"reviews":35,"seller":"Tyler N.","colors":["#0a1428","#4ab0c0","#f0f8fc"],"featured":false,"tags":["Cleaning (Commercial)","Responsive","SEO-Ready"]},
{"id":"t289","name":"AirbnbClean","cat":"Cleaning (Commercial)","desc":"Short-term rental cleaning with same-day turnaround, restock option, and review guarantee.","price":49,"rating":4.8,"reviews":49,"seller":"Jordan M.","colors":["#0a1428","#5090b0","#f0f8fc"],"featured":false,"tags":["Cleaning (Commercial)","Responsive","SEO-Ready"]},
{"id":"t290","name":"ColorConsult","cat":"Interior Decoration","desc":"Interior color consultation with color psychology, paint brand comparison, mood guide.","price":55,"rating":5.0,"reviews":22,"seller":"Yara F.","colors":["#1a1008","#c8a050","#f8f4e8"],"featured":false,"tags":["Interior Decoration","Responsive","SEO-Ready"]},
{"id":"t291","name":"StyleByRoom","cat":"Interior Decoration","desc":"Room-by-room interior design with style quiz, mood board, and shopping list.","price":72,"rating":4.6,"reviews":56,"seller":"Chris B.","colors":["#1a1008","#c09040","#f8f4e8"],"featured":false,"tags":["Interior Decoration","Responsive","SEO-Ready"]},
{"id":"t292","name":"ArtCurator","cat":"Interior Decoration","desc":"Art curation for homes and offices with artist roster, sizing guide, and installation.","price":85,"rating":5.0,"reviews":46,"seller":"Yara F.","colors":["#080808","#c9a84c","#1a1a18"],"featured":false,"tags":["Interior Decoration","Responsive","SEO-Ready"]},
{"id":"t293","name":"FengShui Pro","cat":"Interior Decoration","desc":"Feng shui consulting with bagua map, energy audit, and furniture rearrangement plan.","price":59,"rating":4.7,"reviews":4,"seller":"Sasha L.","colors":["#0a1808","#c09030","#f8f4e8"],"featured":false,"tags":["Interior Decoration","Responsive","SEO-Ready"]},
{"id":"t294","name":"VirtualDecor","cat":"Interior Decoration","desc":"Virtual interior design with e-design packages, 3D room mockup, and shopping links.","price":65,"rating":4.7,"reviews":20,"seller":"Yara F.","colors":["#1a1008","#c09040","#f8f4e8"],"featured":false,"tags":["Interior Decoration","Responsive","SEO-Ready"]},
{"id":"t295","name":"LightingDesign","cat":"Interior Decoration","desc":"Lighting design with mood guide, smart lighting integration, and commercial focus.","price":75,"rating":4.7,"reviews":12,"seller":"Jordan M.","colors":["#0a0a14","#c9a84c","#1a1a18"],"featured":false,"tags":["Interior Decoration","Responsive","SEO-Ready"]},
{"id":"t296","name":"WallpaperPro","cat":"Interior Decoration","desc":"Wallpaper installation with pattern guide, pre-paste vs paste, and room calculator.","price":49,"rating":4.7,"reviews":5,"seller":"Devon L.","colors":["#1a1008","#c09040","#f8f4e8"],"featured":false,"tags":["Interior Decoration","Responsive","SEO-Ready"]},
{"id":"t297","name":"HomeOrganizer","cat":"Interior Decoration","desc":"Professional organizer with room-by-room services, product recommendations, before/after.","price":55,"rating":4.8,"reviews":68,"seller":"Yara F.","colors":["#1a1008","#c09040","#f8f4e8"],"featured":false,"tags":["Interior Decoration","Responsive","SEO-Ready"]},
{"id":"t298","name":"ChildroomDesign","cat":"Interior Decoration","desc":"Children's room design with age-appropriate guide, growth planning, safety focus.","price":65,"rating":4.6,"reviews":59,"seller":"Victor A.","colors":["#0a0818","#f060a0","#fff4f8"],"featured":false,"tags":["Interior Decoration","Responsive","SEO-Ready"]},
{"id":"t299","name":"OfficeDesign","cat":"Interior Decoration","desc":"Home and commercial office design with ergonomics guide, brand integration, layouts.","price":79,"rating":4.6,"reviews":10,"seller":"Priya S.","colors":["#0a0a14","#c9a84c","#1a1a18"],"featured":false,"tags":["Interior Decoration","Responsive","SEO-Ready"]},
{"id":"t300","name":"SpineCare Ortho","cat":"Medical Specialists","desc":"Orthopedic surgery with condition navigator, minimally invasive focus, and recovery guides.","price":95,"rating":4.8,"reviews":64,"seller":"Yara F.","colors":["#0a1428","#4090c0","#f0f8fc"],"featured":false,"tags":["Medical Specialists","Responsive","SEO-Ready"]},
{"id":"t301","name":"SkinPro Dermatology","cat":"Medical Specialists","desc":"Dermatology with skin concern guide, cosmetic vs medical, acne/anti-aging focus.","price":85,"rating":4.7,"reviews":69,"seller":"Nathan W.","colors":["#081428","#5090b0","#f0f8fc"],"featured":false,"tags":["Medical Specialists","Responsive","SEO-Ready"]},
{"id":"t302","name":"EyeVision Optometry","cat":"Medical Specialists","desc":"Eye care with frame gallery, contact lens comparison, children's vision, and telehealth.","price":79,"rating":4.6,"reviews":39,"seller":"Sofia R.","colors":["#0a1428","#4090c0","#f0f8fc"],"featured":false,"tags":["Medical Specialists","Responsive","SEO-Ready"]},
{"id":"t303","name":"HeartFirst Cardiology","cat":"Medical Specialists","desc":"Cardiology with heart health guide, imaging services, cardiac rehab, and risk assessment.","price":99,"rating":4.9,"reviews":9,"seller":"Sasha L.","colors":["#0a1428","#c05060","#fff0f4"],"featured":false,"tags":["Medical Specialists","Responsive","SEO-Ready"]},
{"id":"t304","name":"GutHealth GI","cat":"Medical Specialists","desc":"Gastroenterology with colonoscopy info, digestive health guide, and dietary resources.","price":89,"rating":4.8,"reviews":18,"seller":"Marco V.","colors":["#0a1428","#5090b0","#f0f8fc"],"featured":false,"tags":["Medical Specialists","Responsive","SEO-Ready"]},
{"id":"t305","name":"WomensCare OB","cat":"Medical Specialists","desc":"OB/GYN with prenatal guide, wellness visits, telehealth, and patient portal.","price":89,"rating":4.9,"reviews":30,"seller":"Keisha T.","colors":["#1a0818","#d090b0","#fff4f8"],"featured":false,"tags":["Medical Specialists","Responsive","SEO-Ready"]},
{"id":"t306","name":"KidsMD Pediatrics","cat":"Medical Specialists","desc":"Pediatrics with development milestones, vaccination schedule, sick vs well visit info.","price":82,"rating":4.7,"reviews":63,"seller":"Alex P.","colors":["#0a1808","#60c040","#f0f8ec"],"featured":false,"tags":["Medical Specialists","Responsive","SEO-Ready"]},
{"id":"t307","name":"ClearView Eye Surgery","cat":"Medical Specialists","desc":"LASIK and vision correction with candidacy quiz, procedure guide, and outcome stats.","price":99,"rating":4.9,"reviews":39,"seller":"Priya S.","colors":["#0a1428","#4090c0","#f0f8fc"],"featured":false,"tags":["Medical Specialists","Responsive","SEO-Ready"]},
{"id":"t308","name":"MindMD Psychiatry","cat":"Medical Specialists","desc":"Psychiatry with telehealth focus, medication management, diagnosis guide, intake form.","price":89,"rating":5.0,"reviews":66,"seller":"Chris B.","colors":["#100a1a","#7060a0","#f4f0fc"],"featured":false,"tags":["Medical Specialists","Responsive","SEO-Ready"]},
{"id":"t309","name":"PainRelief Clinic","cat":"Medical Specialists","desc":"Pain management with treatment menu, interventional options, and drug-free alternatives.","price":89,"rating":4.9,"reviews":57,"seller":"Alex P.","colors":["#0a1428","#5080a0","#f0f4f8"],"featured":false,"tags":["Medical Specialists","Responsive","SEO-Ready"]}];;

const STEPS_DATA=[{rune:"ᛁ",name:"Find the Gap",desc:"Set your city, category, rating floor, and review count. The scanner surfaces businesses with no website — scored by conversion likelihood."},{rune:"ᛃ",name:"Craft the Approach",desc:"Every prospect gets a full pitch package — text, call script, email, and follow-up. Your CRM logs every interaction automatically."},{rune:"ᛟ",name:"Build and Close",desc:"Your AI agent builds the site before you even dial. Show the live link mid-call. Deploy the moment they say yes."}];

const StepSection=memo(function StepSection(){
const CHANGELOG=[
  {v:"v2.0",date:"June 2026",tag:"Major Release",items:[
    "Multi-page site builder — build Home, About, Services, Contact, Gallery, Blog independently",
    "Sage AI Advisor — always-on floating advisor with full platform context and navigation commands",
    "Command Palette (Cmd+K) — spotlight search across all pages and CRM prospects",
    "470+ marketplace templates across 41 industry categories",
    "Template Library — standalone page for purchased and saved templates",
    "Kanban CRM view — toggle between table and visual board with drag-style status updates",
    "Time Tracker in Agency OS — start/stop timer per client, log hours, see billable totals",
    "Referral Tracker in Agency OS — log who referred clients, track thank-yous",
    "Email Sequence Builder — 5-step 14-day outreach campaigns generated by AI",
    "Activity Log — full chronological history of every action across the platform",
    "Import & Export — CSV import from any CRM, full JSON backup export",
    "Roadmap page — live view of shipped, building, planned, and future features",
    "Affiliate Program page — referral link generator, tier earnings calculator, application form",
    "AI Pricing Engine — suggests what to charge based on business type, size, and location",
    "Case Study Generator — turns completed projects into shareable marketing assets",
    "Press Release Generator — wire-format press releases for new client site launches",
    "Email Signature Generator — branded HTML email signatures",
    "Business Card Designer — structured layout for print-ready business cards",
    "Help Center — 7-section documentation with Getting Started, guides, and FAQ",
    "Agency Branding page — set agency name, colors, and contact for all documents",
    "Print PDF on proposals, contracts, and invoices",
    "CRM search bar — real-time filter by name, city, or category",
    "Follow-up widget on Dashboard — auto-flags stale active/contacted deals",
    "Pipeline Health Score — AI grades your pipeline and gives specific improvement tips",
    "Competitor Analyzer in AI Studio",
    "Bulk Email Generator in AI Studio",
    "Google Search Preview (schema markup) in Site Builder",
    "QR Code Generator after GitHub deployment",
    "CRM integration in Site Builder — build for any CRM prospect with one click",
    "Style presets panel in Site Builder",
    "Developer Tools in Settings — code-activated demo mode (Rumo!)",
    "Proper light mode with warm cream palette",
    "Sidebar scrollable on short landscape screens",
    "Portrait and landscape nav parity — both show identical page lists",
  ]},
  {v:"v1.5",date:"May 2026",tag:"Feature Drop",items:[
    "Agency OS fully built — Proposals, Contracts, Invoices, Revenue dashboard",
    "Contract generator with print-to-PDF",
    "Client intake form generator",
    "Call transcript analyzer — paste notes, get summary + action items",
    "12 preset pitch tones + custom tone text input",
    "Pitch output typography improved — DM Sans, warm gold, 1.95 line height",
    "Site Builder template starters — 8 industry one-click prompts",
    "Mobile hamburger nav (≤620px breakpoint)",
    "Light/dark mode toggle in topbar",
    "Sage glassmorphism button — semi-translucent, blur backdrop",
    "Marketplace preview modal — CSS wireframe + full template details",
    "Marketplace library tab → moved to standalone Library page",
    "Demo mode code-activated via Settings (Rumo!)",
  ]},
  {v:"v1.4",date:"April 2026",tag:"Stability",items:[
    "Jitter completely eliminated — LandingTerminal converted from setInterval to CSS staggered fadein",
    "Global * { min-width: 0 } fix — prevents flex/grid overflow on all screen sizes",
    "Auth persistence via window.storage / localStorage polyfill",
    "Deployment package built — Vite 5, Cloudflare Worker API proxy, Netlify SPA config",
    "data.js extracted (174KB) — all large data arrays in separate file like Arcanum pattern",
    "DEPLOY.md — complete step-by-step deployment guide",
    "Landing page fully built — 12 sections including live embedded scanner",
    "24 testimonials with photo placeholders, ratings, and business context",
    "Pricing tiers updated across all 6 plans with accurate feature lists",
  ]},
  {v:"v1.3",date:"March 2026",tag:"AI Studio",items:[
    "AI Studio — Social Media, Google Business, Ad Copy, SEO Content, Brand Voice, Email Campaign, Review Response",
    "Domains page — search availability, buy, transfer with auth code guide, DNS manager",
    "Creator Program — application form, tier selection, status tracker",
    "Prospect Scanner — free-form, any city, any business type, no restrictions",
    "CityPicker with global autocomplete and 📍 geolocation (Nominatim)",
    "ProspectsMap — SVG world map with prospect status pins",
    "Embedded scanner on landing page — no signup required to demo",
    "Command palette keyboard shortcut (?) for shortcuts overlay",
  ]},
  {v:"v1.2",date:"February 2026",tag:"CRM & Pitching",items:[
    "Full CRM with status pipeline, drawer, notes, and status updates",
    "Lead scoring — 0-100 based on rating, review volume, category demand",
    "Pitch Generator — 4 formats (SMS, Call Script, Email, Follow-up)",
    "Pitch history — all generated pitches saved and browsable",
    "Pitch copy buttons per format",
    "CRM prospect detail drawer with notes, status selector, and quick actions",
    "Notification center in topbar",
    "Global search across CRM data",
    "Onboarding checklist for new users",
  ]},
  {v:"v1.1",date:"January 2026",tag:"Foundation",items:[
    "Initial build — React JSX single-file artifact",
    "Screen flow: loading → landing → auth → app",
    "Sidebar navigation with rune icons",
    "Dark medieval-cyberpunk aesthetic — Cinzel, DM Sans, JetBrains Mono",
    "Color system — bg #07070e, gold #c9a84c, steel blue #4a7aaa",
    "Dashboard with metric cards and charts (Recharts)",
    "Toast notifications",
    "Keyboard shortcuts — G→ navigation",
  ]},
];
  const[active,setActive]=useState(0);
  useEffect(()=>{const t=setInterval(()=>setActive(s=>(s+1)%3),3200);return()=>clearInterval(t);},[]);
  return(
    <div className="steps-grid">
      {STEPS_DATA.map((s,i)=>(
        <div key={i} onClick={()=>setActive(i)} style={{background:active===i?"#0e0e22":"#09091a",padding:"44px 38px",cursor:"pointer",position:"relative",transition:"background .2s"}}>
          {active===i&&<div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,#c9a84c,transparent)"}}/>}
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".56rem",letterSpacing:"3px",color:"rgba(201,168,76,.38)",textTransform:"uppercase",marginBottom:24}}>// STEP {String(i+1).padStart(2,"0")}</div>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:"3rem",color:active===i?"rgba(201,168,76,.42)":"rgba(201,168,76,.1)",lineHeight:1,marginBottom:14,transition:"color .3s"}}>{s.rune}</div>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:"1.1rem",fontWeight:700,color:"#ddd8ce",marginBottom:10}}>{s.name}</div>
          <p style={{fontSize:".85rem",fontWeight:300,color:"#5a5868",lineHeight:1.85}}>{s.desc}</p>
        </div>
      ))}
    </div>
  );
});

const Carousel=memo(function Carousel(){
  const[page,setPage]=useState(0);
  const[fading,setFading]=useState(false);
  const pageRef=useRef(0);
  const PER=3,total=Math.ceil(REVIEW_DATA.length/PER);
  const go=n=>{setFading(true);setTimeout(()=>{setPage(n);pageRef.current=n;setFading(false)},250)};
  useEffect(()=>{const t=setInterval(()=>go((pageRef.current+1)%total),10000);return()=>clearInterval(t);},[]);
  const visible=REVIEW_DATA.slice(page*PER,page*PER+PER);
  return(
    <div>
      <div className="carousel-grid" style={{opacity:fading?0:1,transition:"opacity .25s"}}>
        {visible.map((r,i)=>(
          <div key={i} style={{background:"#07070e",padding:"36px 32px",display:"flex",flexDirection:"column",gap:12}}>
            <div style={{color:"#c9a84c",fontSize:".7rem",letterSpacing:"4px"}}>★★★★★</div>
            <p style={{fontSize:".86rem",fontWeight:300,fontStyle:"italic",color:"#5a5868",lineHeight:1.88,flex:1}}>"{r.text}"</p>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".58rem",letterSpacing:"2px",color:"#2a2938",textTransform:"uppercase"}}>— {r.author}</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".54rem",letterSpacing:"1px",color:"#1a1928",textTransform:"uppercase"}}>{r.role}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:20,marginTop:24}}>
        <button onClick={()=>go((page-1+total)%total)} style={{fontFamily:"'Cinzel',serif",fontSize:"1.1rem",color:"#c9a84c",background:"none",border:"1px solid rgba(201,168,76,.2)",cursor:"pointer",padding:"7px 18px"}}>←</button>
        <div style={{display:"flex",gap:7,alignItems:"center"}}>
          {Array.from({length:total}).map((_,i)=>(
            <button key={i} onClick={()=>go(i)} style={{width:i===page?20:6,height:6,borderRadius:i===page?3:"50%",background:i===page?"#c9a84c":"rgba(201,168,76,.18)",border:"none",cursor:"pointer",padding:0,transition:"all .2s"}}/>
          ))}
        </div>
        <button onClick={()=>go((page+1)%total)} style={{fontFamily:"'Cinzel',serif",fontSize:"1.1rem",color:"#c9a84c",background:"none",border:"1px solid rgba(201,168,76,.2)",cursor:"pointer",padding:"7px 18px"}}>→</button>
      </div>
    </div>
  );
});

const Spinner=({lg})=><div style={{width:lg?30:18,height:lg?30:18,border:`${lg?3:2}px solid rgba(201,168,76,.15)`,borderTopColor:"#c9a84c",borderRadius:"50%",animation:"spin .7s linear infinite",flexShrink:0}}/>;
const Badge=({status})=><span className={`badge ${STATUS_COLORS[status]||"b-gray"}`}>{status}</span>;
const CustomTooltip=({active,payload,label})=>{
  if(!active||!payload?.length)return null;
  return(<div style={{background:"#0d0d18",border:"1px solid rgba(201,168,76,.15)",padding:"10px 14px"}}><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".6rem",letterSpacing:"1.5px",color:"#3a3848",textTransform:"uppercase",marginBottom:5}}>{label}</div>{payload.map((p,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,marginTop:4}}><div style={{width:8,height:8,borderRadius:"50%",background:p.color}}/><span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".62rem",color:"#9a96a2"}}>{p.name}:</span><span style={{fontFamily:"'Cinzel',serif",fontSize:".82rem",color:p.color,fontWeight:700}}>{p.value}</span></div>)}</div>);
};
const ToastDock=({toasts})=>(
  <div style={{position:"fixed",bottom:20,right:20,zIndex:9999,display:"flex",flexDirection:"column",gap:8,pointerEvents:"none"}}>
    {toasts.map(t=><div key={t.id} className={`toast t-${t.type}`}><span className="toast-icon">{t.type==="success"?"✦":t.type==="error"?"✕":"ᚱ"}</span><span className="toast-msg">{t.msg}</span></div>)}
  </div>
);

// ── AUTH ───────────────────────────────────────────────────────────────────
function AuthScreen({onAuth,onBack}){
  const[mode,setMode]=useState("login");
  const[name,setName]=useState("");
  const[email,setEmail]=useState("");
  const[pass,setPass]=useState("");
  const[err,setErr]=useState("");
  const submit=()=>{
    if(!email||!pass){setErr("Email and password required.");return;}
    if(mode==="signup"&&!name){setErr("Name required.");return;}
    onAuth({name:name||email.split("@")[0],email});
  };
  return(
    <div className="auth">
      <div className="auth-card">
        <div className="auth-logo"><span className="auth-logo-g">ᚱ</span><span className="auth-logo-txt">RUNE SCRIPT</span></div>
        <div className="auth-title">{mode==="login"?"Welcome Back":"Create Account"}</div>
        <div className="auth-sub">{mode==="login"?"Sign in to your workspace":"Start your free account"}</div>
        {err&&<div className="auth-err">{err}</div>}
        {mode==="signup"&&<div className="field"><label>Your Name</label><input className="inp" placeholder="Jordan M." value={name} onChange={e=>setName(e.target.value)}/></div>}
        <div className="field"><label>Email</label><input className="inp" type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)}/></div>
        <div className="field"><label>Password</label><input className="inp" type="password" placeholder="••••••••" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}/></div>
        <button className="btn btn-gold btn-full" onClick={submit}>{mode==="login"?"Sign In →":"Create Account →"}</button>
        <div className="auth-toggle">{mode==="login"?"No account? ":"Have an account? "}<button onClick={()=>{setMode(m=>m==="login"?"signup":"login");setErr("");}}>{ mode==="login"?"Sign up free":"Sign in"}</button></div>
        <div style={{textAlign:"center",marginTop:12}}><button className="btn btn-ghost btn-sm" onClick={onBack}>← Back to site</button></div>
      </div>
    </div>
  );
}

// ── SIDEBAR ────────────────────────────────────────────────────────────────
function Sidebar({page,setPage,user,prospectCount,onLogout}){
  const nav=[{id:"dashboard",r:"ᛟ",l:"Dashboard"},{id:"scanner",r:"ᚦ",l:"Prospect Scanner"},{id:"crm",r:"ᚨ",l:"CRM",badge:prospectCount||null},{id:"pitch",r:"ᚲ",l:"Pitch Generator"},{id:"builder",r:"ᛏ",l:"Site Builder"},{id:"agency",r:"ᚱ",l:"Agency OS"},{id:"studio",r:"ᚠ",l:"AI Studio"},{id:"marketplace",r:"ᚢ",l:"Marketplace"},{id:"settings",r:"ᛜ",l:"Settings"}];
  return(
    <div className="sb">
      <div className="sb-logo"><span className="sb-logo-g">ᚱ</span><span className="sb-logo-txt">RUNE SCRIPT</span></div>
      <div className="sb-nav">
        {nav.map(n=>(
          <div key={n.id} className={`sb-item${page===n.id?" on":""}`} onClick={()=>{setPage(n.id);playClick();}}>
            <span className="sb-rune">{n.r}</span><span className="sb-label">{n.l}</span>
            {n.badge>0&&<span className="sb-badge">{n.badge}</span>}
          </div>
        ))}
      </div>
      <div className="sb-user">
        <div className="sb-av">{(user?.name||"?")[0].toUpperCase()}</div>
        <span className="sb-uname">{user?.name||"User"}</span>
        <span className="sb-out" onClick={onLogout}>out</span>
      </div>
    </div>
  );
}

// ── ONBOARDING ─────────────────────────────────────────────────────────────
function OnboardingCard({prospects,pitches,siteBuilt,setPage}){
  const steps=[{title:"Run Your First Scan",desc:"Find businesses in any city that need a website.",done:prospects.length>0,page:"scanner"},{title:"Generate a Pitch",desc:"AI writes a full pitch package in seconds.",done:pitches.length>0,page:"pitch"},{title:"Build a Site",desc:"Show clients a live site before you hang up.",done:siteBuilt,page:"builder"}];
  const doneCount=steps.filter(s=>s.done).length;
  if(doneCount===3)return null;
  return(
    <div className="onboard">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <div className="onboard-title">Getting Started</div>
        <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".6rem",letterSpacing:"2px",color:"rgba(201,168,76,.6)"}}>{doneCount}/3 COMPLETE</span>
      </div>
      <div className="onboard-steps">
        {steps.map((s,i)=>(
          <div key={i} className={`onboard-step${s.done?" done":""}`} onClick={()=>!s.done&&setPage(s.page)} style={{cursor:s.done?"default":"pointer"}}>
            {s.done&&<span className="onboard-check">✦</span>}
            <div className="onboard-step-num">{String(i+1).padStart(2,"0")}</div>
            <div className="onboard-step-title">{s.title}</div>
            <div className="onboard-step-desc">{s.desc}</div>
          </div>
        ))}
      </div>
      <div className="onboard-progress"><div className="onboard-progress-fill" style={{width:`${(doneCount/3)*100}%`}}/></div>
    </div>
  );
}

// ── DASHBOARD ──────────────────────────────────────────────────────────────
function DashboardPage({user,prospects,pitches,proposals=[],invoices=[],setPage,siteBuilt,demoMode,setProspects,setPitches,setProposals,setInvoices,setDemoMode,toast}){
  const active=prospects.filter(p=>p.status==="Active").length;
  const closed=prospects.filter(p=>p.status==="Closed").length;
  const convRate=prospects.length>0?Math.round((closed/prospects.length)*100):0;
  const hour=new Date().getHours();
  const greeting=hour<12?"Good morning":hour<17?"Good afternoon":"Good evening";
  const days=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const weekData=days.map((day,i)=>({day,prospects:Math.max(0,Math.round(prospects.length/7*(0.7+Math.sin(i*0.8)*0.3))),pitches:Math.max(0,Math.round(pitches.length/7*(0.6+Math.cos(i*0.9)*0.3)))}));
  const STATUSES=["Not Contacted","Contacted","Read","Active","Closed","Rejected"];
  const pipeData=STATUSES.map(s=>({name:s,value:prospects.filter(p=>p.status===s).length,color:PIPE_COLORS[s]})).filter(d=>d.value>0);
  const scoreBuckets=[{label:"90–100",min:90,max:101,color:"#7ac89a"},{label:"75–89",min:75,max:90,color:"#c9a84c"},{label:"60–74",min:60,max:75,color:"#c9784c"},{label:"<60",min:0,max:60,color:"#c05060"}];
  const maxBucket=Math.max(1,...scoreBuckets.map(b=>prospects.filter(p=>p.leadScore>=b.min&&p.leadScore<b.max).length));
  const recent=[...prospects.slice(-4).map(p=>({text:`${p.name} added to CRM`,time:p.addedAt,color:"#c9a84c"})),...pitches.slice(-2).map(p=>({text:`Pitch generated for ${p.prospectName}`,time:p.generatedAt,color:"#4a7aaa"}))].slice(0,6);
  const METRICS=[{n:prospects.length,l:"Prospects Found",color:"metric-gold"},{n:active,l:"Active Deals",color:"metric-blue"},{n:closed,l:"Clients Closed",color:"metric-green"},{n:pitches.length,l:"Pitches Generated",color:"metric-purple"},{n:`${convRate}%`,l:"Conversion Rate",color:"metric-teal"}];
  return(
    <div>

      {/* PIPELINE HEALTH */}
      {prospects.length>=3&&(()=>{
        const active=prospects.filter(p=>p.status==='Active').length;
        const stale=prospects.filter(p=>['Active','Contacted'].includes(p.status)).length;
        const closed=prospects.filter(p=>p.status==='Closed').length;
        const rate=prospects.length>0?closed/prospects.length:0;
        const score=Math.round((rate*40)+(active>0?30:0)+(stale<5?20:0)+(prospects.length>5?10:0));
        const grade=score>=90?'A+':score>=80?'A':score>=70?'B+':score>=60?'B':score>=50?'C':'D';
        const gradeColor=score>=70?'#7ac89a':score>=50?'#c9a84c':'#e07878';
        const tips=[];
        if(active===0)tips.push('No active deals — follow up with your Contacted prospects');
        if(rate<0.2&&closed===0)tips.push('Conversion rate is 0% — pitch more aggressively or target higher-score leads');
        if(stale>5)tips.push(`${stale} prospects haven't had recent activity — dedicate 30 min to follow-ups`);
        if(prospects.length<5)tips.push('Thin pipeline — run a fresh scan to add more prospects');
        if(tips.length===0)tips.push('Pipeline looks healthy — keep up your current outreach pace');
        return(
          <div className="health-card">
            <div className="health-grade" style={{color:gradeColor,borderColor:gradeColor+'66'}}>{grade}</div>
            <div className="health-body">
              <div className="health-title">Pipeline Health Score — {score}/100</div>
              <ul className="health-items">
                {tips.map((t,i)=><li key={i} className="health-item"><span style={{color:gradeColor,fontFamily:"'Cinzel',serif",flexShrink:0}}>ᚱ</span>{t}</li>)}
              </ul>
            </div>
          </div>
        );
      })()}

      {/* REVENUE FORECAST */}
      {invoices.length>0&&(()=>{
        const paid=invoices.filter(i=>i.status==='Paid').reduce((a,i)=>a+Number(i.total||0),0);
        const outstanding=invoices.filter(i=>i.status!=='Paid').reduce((a,i)=>a+Number(i.total||0),0);
        const clients=prospects.filter(p=>p.status==='Closed').length;
        const activePipe=prospects.filter(p=>p.status==='Active').length;
        const forecast=Math.round(paid*0.2+outstanding*0.6+activePipe*800);
        return(
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:8,marginBottom:16}}>
            {[
              {l:'Paid This Month',v:`$${paid.toLocaleString()}`,c:'#7ac89a'},
              {l:'Outstanding',v:`$${outstanding.toLocaleString()}`,c:'#c9a84c'},
              {l:'Pipeline Forecast',v:`$${forecast.toLocaleString()}`,c:'#4a7aaa'},
              {l:'Active Clients',v:clients,c:'#ddd8ce'},
            ].map((s,i)=>(
              <div key={i} style={{background:'#0d0d18',border:'1px solid rgba(201,168,76,.07)',padding:'16px 14px'}}>
                <div style={{fontFamily:"'Cinzel',serif",fontSize:'1.4rem',fontWeight:700,color:s.c,marginBottom:4}}>{s.v}</div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.52rem',color:'#3a3848',letterSpacing:'1.5px',textTransform:'uppercase'}}>{s.l}</div>
              </div>
            ))}
          </div>
        );
      })()}
      <OnboardingCard prospects={prospects} pitches={pitches} siteBuilt={siteBuilt} setPage={setPage}/>
      {prospects.length>0&&<ProspectsMap prospects={prospects} setPage={setPage}/>}

      {(()=>{
        const stale=prospects.filter(p=>['Active','Contacted'].includes(p.status));
        if(stale.length===0) return null;
        return(
          <div className="card" style={{marginBottom:16,borderColor:'rgba(201,168,76,.2)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
              <div>
                <div style={{fontFamily:"'Cinzel',serif",fontSize:'.88rem',fontWeight:700,color:'#ddd8ce',marginBottom:2}}>⚡ Follow Up Today</div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.56rem',letterSpacing:'2px',color:'#2e2d3c',textTransform:'uppercase'}}>{stale.length} deals need your attention</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={()=>setPage('crm')}>View All →</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:5}}>
              {stale.slice(0,4).map(p=>(
                <div key={p.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'#0a0a14',border:'1px solid rgba(201,168,76,.05)'}}>
                  <div style={{width:7,height:7,borderRadius:'50%',background:PIPE_COLORS[p.status],flexShrink:0}}/>
                  <div style={{flex:1,fontFamily:"'Cinzel',serif",fontSize:'.78rem',color:'#ddd8ce'}}>{p.name}</div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.56rem',color:'#3a3848'}}>{p.city}</div>
                  <button className="btn btn-gold btn-xs" onClick={()=>setPage('pitch')}>Pitch →</button>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
      {demoMode&&<div className="demo-banner"><span className="demo-badge">Demo Mode</span><span className="demo-txt">Showing example data — your real data will appear here as you use the app.</span><button className="btn btn-ghost btn-xs" onClick={()=>{setProspects([]);setPitches([]);setProposals([]);setInvoices([]);setDemoMode(false);toast("Demo data cleared.","info");}}>Clear Demo</button></div>}
      <div style={{marginBottom:20,display:"flex",alignItems:"flex-end",justifyContent:"space-between"}}>
        <div>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:"1.1rem",fontWeight:700,color:"#ddd8ce",marginBottom:3}}>{greeting}, {user?.name?.split(" ")[0]||"Builder"}.</div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".58rem",letterSpacing:"2px",color:"#2e2d3c",textTransform:"uppercase"}}>{new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn btn-ghost btn-sm" onClick={()=>setPage("scanner")}>+ Scan Prospects</button>
          <button className="btn btn-gold btn-sm" onClick={()=>setPage("pitch")}>Generate Pitch</button>

        </div>
      </div>
      <div className="dash-grid">
        {METRICS.map((m,i)=><div key={i} className={`metric-card ${m.color}`}><div className="metric-l">{m.l}</div><div className="metric-n">{m.n}</div></div>)}
      </div>
      <div className="charts-row">
        <div className="chart-card">
          <div className="chart-title">Prospect Activity</div><div className="chart-sub">Last 7 days</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={weekData} margin={{top:0,right:0,left:-20,bottom:0}}>
              <defs>
                <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#c9a84c" stopOpacity={0.18}/><stop offset="95%" stopColor="#c9a84c" stopOpacity={0}/></linearGradient>
                <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4a7aaa" stopOpacity={0.15}/><stop offset="95%" stopColor="#4a7aaa" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.06)" vertical={false}/>
              <XAxis dataKey="day" tick={{fill:"#2e2d3c",fontSize:10,fontFamily:"JetBrains Mono"}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:"#2e2d3c",fontSize:10,fontFamily:"JetBrains Mono"}} axisLine={false} tickLine={false}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Area type="monotone" dataKey="prospects" name="Prospects" stroke="#c9a84c" fill="url(#goldGrad)" strokeWidth={2} dot={false}/>
              <Area type="monotone" dataKey="pitches" name="Pitches" stroke="#4a7aaa" fill="url(#blueGrad)" strokeWidth={2} dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
          <div style={{display:"flex",gap:14,marginTop:10,flexWrap:"wrap"}}>
            {[{c:"#c9a84c",l:"Prospects"},{c:"#4a7aaa",l:"Pitches"}].map((lg,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:6,fontFamily:"'JetBrains Mono',monospace",fontSize:".56rem",letterSpacing:"1px",textTransform:"uppercase",color:"#3a3848"}}><div style={{width:8,height:8,borderRadius:"50%",background:lg.c}}/>{lg.l}</div>)}
          </div>
        </div>
        <div className="chart-card">
          <div className="chart-title">Pipeline Status</div><div className="chart-sub">All prospects</div>
          {pipeData.length>0?(
            <>
              <ResponsiveContainer width="100%" height={130}>
                <PieChart><Pie data={pipeData} cx="50%" cy="50%" innerRadius={42} outerRadius={62} paddingAngle={3} dataKey="value">{pipeData.map((entry,i)=><Cell key={i} fill={entry.color}/>)}</Pie><Tooltip contentStyle={{background:"#0d0d18",border:"1px solid rgba(201,168,76,.15)",color:"#ddd8ce",fontFamily:"JetBrains Mono",fontSize:".7rem"}}/></PieChart>
              </ResponsiveContainer>
              <div style={{display:"flex",flexDirection:"column",gap:5,marginTop:8}}>
                {pipeData.map((d,i)=><div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><div style={{display:"flex",alignItems:"center",gap:6,fontFamily:"'JetBrains Mono',monospace",fontSize:".56rem",letterSpacing:"1px",textTransform:"uppercase",color:"#3a3848"}}><div style={{width:7,height:7,borderRadius:"50%",background:d.color}}/>{d.name}</div><span style={{fontFamily:"'Cinzel',serif",color:d.color,fontSize:".78rem",fontWeight:700}}>{d.value}</span></div>)}
              </div>
            </>
          ):<div style={{padding:"20px 0",textAlign:"center",fontFamily:"'JetBrains Mono',monospace",fontSize:".6rem",color:"#2e2d3c"}}>Add prospects to see pipeline</div>}
        </div>
      </div>
      <div className="charts-row-2">
        <div className="chart-card">
          <div className="chart-title">Conversion Funnel</div><div className="chart-sub">Prospect journey</div>
          <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:8}}>
            {STATUSES.map(s=>{const count=prospects.filter(p=>p.status===s).length;const pct=prospects.length>0?Math.round((count/prospects.length)*100):0;return(<div key={s} style={{display:"flex",alignItems:"center",gap:10}}><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".58rem",letterSpacing:"1px",textTransform:"uppercase",color:"#3a3848",width:110,flexShrink:0}}>{s}</div><div style={{flex:1,background:"rgba(201,168,76,.04)",height:18}}><div style={{width:`${pct}%`,height:"100%",background:PIPE_COLORS[s],opacity:.7}}/></div><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".58rem",color:"#4a4858",width:20,textAlign:"right"}}>{count}</div></div>);})}
          </div>
        </div>
        <div className="chart-card">
          <div className="chart-title">Lead Score Dist.</div><div className="chart-sub">Quality breakdown</div>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:10}}>
            {scoreBuckets.map(b=>{const count=prospects.filter(p=>p.leadScore>=b.min&&p.leadScore<b.max).length;return(<div key={b.label} style={{display:"flex",alignItems:"center",gap:8}}><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".56rem",letterSpacing:"1px",color:"#3a3848",width:40,flexShrink:0}}>{b.label}</div><div style={{flex:1,background:"rgba(201,168,76,.04)",height:14}}><div style={{width:`${maxBucket>0?(count/maxBucket)*100:0}%`,height:"100%",background:b.color,opacity:.7}}/></div><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".56rem",color:"#4a4858",width:16,textAlign:"right"}}>{count}</div></div>);})}
          </div>
          <div style={{marginTop:12,padding:"10px 14px",background:"#0a0a14",border:"1px solid rgba(201,168,76,.06)"}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".52rem",letterSpacing:"2px",color:"#2e2d3c",textTransform:"uppercase",marginBottom:4}}>Avg Lead Score</div>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:"1.5rem",fontWeight:700,color:"#c9a84c"}}>{prospects.length>0?Math.round(prospects.reduce((a,p)=>a+p.leadScore,0)/prospects.length):0}</div>
          </div>
        </div>
        <div className="chart-card">
          <div className="chart-title">Recent Activity</div><div className="chart-sub">Latest actions</div>
          {recent.length>0?(
            <div style={{display:"flex",flexDirection:"column",gap:0,marginTop:10}}>
              {recent.map((a,i)=><div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"8px 0",borderBottom:"1px solid rgba(201,168,76,.04)"}}><div style={{width:7,height:7,borderRadius:"50%",background:a.color,flexShrink:0,marginTop:4}}/><div style={{fontSize:".76rem",fontWeight:300,color:"#6a6878",lineHeight:1.5,flex:1}}>{a.text}</div><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".52rem",color:"#2e2d3c",flexShrink:0}}>{a.time?.slice(0,8)||"—"}</div></div>)}
            </div>
          ):<div style={{paddingTop:16,textAlign:"center"}}><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".6rem",color:"#2e2d3c",marginBottom:12}}>No activity yet</div><button className="btn btn-gold btn-sm" onClick={()=>setPage("scanner")}>Start Scanning</button></div>}
        </div>
      </div>
    </div>
  );
}

// ── SCANNER ────────────────────────────────────────────────────────────────
function ScannerPage({onAdd,prospects,toast,setPage}){
  const[city,setCity]=useState("");
  const[cat,setCat]=useState("");
  const[minRating,setMinRating]=useState("");
  const[minReviews,setMinReviews]=useState("");
  const[count,setCount]=useState("10");
  const[showAdv,setShowAdv]=useState(false);
  const[keyword,setKeyword]=useState("");
  const[loading,setLoading]=useState(false);
  const[results,setResults]=useState([]);
  const[added,setAdded]=useState(new Set(prospects.map(p=>p.name)));

  const scan=async()=>{
    if(!city){toast("Enter a city — that's all you need.","error");return;}
    setLoading(true);setResults([]);
    try{
      const businessType=cat||keyword||"any local service business";
      const ratingClause=minRating?`minimum ${minRating} stars`:"any rating";
      const reviewClause=minReviews?`at least ${minReviews} reviews`:"any number of reviews";
      const prompt=`Generate exactly ${count||10} realistic local businesses in ${city} in the "${businessType}" space that do NOT have a website. ${keyword?`Focus on businesses related to: ${keyword}.`:""} Return ONLY a valid JSON array. Each object: name (string), phone (string), address (string), rating (number, ${ratingClause}), reviews (integer, ${reviewClause}), services (array of 3 strings), description (2 sentences about why they are highly rated and why they need a website), leadScore (integer 55 to 98). Be creative with business names — make them realistic local businesses.`;
      const raw=await callClaude(prompt,1600);
      const parsed=JSON.parse(raw.replace(/```json|```/g,"").trim());
      setResults(parsed.map(b=>({...b,id:uid(),city,category:businessType,status:"Not Contacted",notes:"",addedAt:now(),lastActivity:now()})));
      toast(`Found ${parsed.length} prospects in ${city}.`,"success");
    }catch(e){toast("Scan failed — try rephrasing the business type.","error");}
    setLoading(false);
  };

  const addToCRM=p=>{onAdd(p);setAdded(prev=>new Set([...prev,p.name]));toast(`${p.name} added to CRM.`,"success");};
  const addAll=()=>{results.filter(p=>!added.has(p.name)).forEach(p=>addToCRM(p));};

  return(
    <div>
      <div className="sh">
        <div><div className="sh-title">Prospect Scanner</div><div className="sh-sub">Find any business, anywhere — no restrictions</div></div>
        {results.length>0&&<div className="sh-right"><button className="btn btn-gold btn-sm" onClick={addAll}>+ Add All to CRM</button></div>}
      </div>

      <div className="card" style={{marginBottom:12}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <div className="field" style={{margin:0}}>
            <label>City or Region <span style={{color:"#3a3848",fontWeight:300}}>(any city, country, or area)</span></label>
            <CityPicker value={city} onChange={setCity} placeholder="Austin TX, Lagos Nigeria, anywhere…"/>
          </div>
          <div className="field" style={{margin:0}}>
            <label>What kind of business? <span style={{color:"#3a3848",fontWeight:300}}>(literally anything)</span></label>
            <input className="inp" placeholder="HVAC, sushi restaurants, tattoo shops, yoga studios…" value={cat} onChange={e=>setCat(e.target.value)} onKeyDown={e=>e.key==="Enter"&&scan()}/>
          </div>
        </div>

        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}>
          <button className="btn btn-gold" onClick={scan} disabled={loading} style={{height:38}}>
            {loading?<><Spinner/>Scanning…</>:"Scan →"}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={()=>setShowAdv(!showAdv)}>
            {showAdv?"Hide options":"More options ↓"}
          </button>
          {results.length>0&&<span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".58rem",color:"#3a3848",letterSpacing:"1px"}}>{results.length} results</span>}
        </div>

        {showAdv&&(
          <div className="scan-advanced">
            <div>
              <div className="scan-adv-label">Min Star Rating</div>
              <input className="inp" type="number" step="0.1" min="0" max="5" placeholder="Any (e.g. 4.5)" value={minRating} onChange={e=>setMinRating(e.target.value)}/>
            </div>
            <div>
              <div className="scan-adv-label">Min Review Count</div>
              <input className="inp" type="number" placeholder="Any (e.g. 50)" value={minReviews} onChange={e=>setMinReviews(e.target.value)}/>
            </div>
            <div>
              <div className="scan-adv-label">Number of Results</div>
              <select className="inp" value={count} onChange={e=>setCount(e.target.value)}>
                {["5","10","15","20"].map(n=><option key={n} value={n}>{n} businesses</option>)}
              </select>
            </div>
            <div>
              <div className="scan-adv-label">Keyword Focus</div>
              <input className="inp" placeholder="e.g. family-owned, 24-hour, luxury…" value={keyword} onChange={e=>setKeyword(e.target.value)}/>
            </div>
          </div>
        )}
      </div>

      {loading&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"48px",gap:14}}><Spinner lg/><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".62rem",letterSpacing:"2px",color:"#2e2d3c",textTransform:"uppercase"}}>Scanning {city}…</div></div>}

      {!loading&&results.length===0&&(
        <div className="empty">
          <div className="empty-rune">ᚦ</div>
          <div className="empty-title">Scan anything, anywhere</div>
          <div className="empty-sub">Type any city and any type of business. No restrictions — if it exists, we'll find it.</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:7,justifyContent:"center",marginTop:14}}>
            {["HVAC in Austin TX","Tattoo shops in London","Sushi restaurants in Tokyo","Food trucks in Miami","Dog groomers in Charlotte","Yoga studios in LA"].map(ex=>(
              <button key={ex} className="btn btn-ghost btn-xs" onClick={()=>{const[c,...rest]=ex.split(" in ");setCat(c);setCity(rest.join(" in "));}}>
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}

      {results.length>0&&(
        <div className="pros-grid">
          {results.map(p=>(
            <div key={p.id} className="pc">
              <div className="pc-head"><div className="pc-name">{p.name}</div><span className={`badge ${scoreClass(p.leadScore)}`} style={{color:scoreColor(p.leadScore),flexShrink:0}}>Score {p.leadScore}</span></div>
              <div className="pc-meta">{p.phone} · {p.address}</div>
              <div className="pc-rating"><span className="pc-stars">{stars(p.rating)}</span><span className="pc-rn">{p.rating} ({p.reviews} reviews)</span></div>
              <p className="pc-desc">{p.description}</p>
              <div className="pc-tags">{p.services?.map(s=><span key={s} className="pc-tag">{s}</span>)}</div>
              <div className="pc-actions">
                {added.has(p.name)
                  ?<button className="btn btn-ghost btn-sm" onClick={()=>setPage("crm")}>In CRM →</button>
                  :<button className="btn btn-gold btn-sm" onClick={()=>addToCRM(p)}>+ Add to CRM</button>
                }
                <button className="btn btn-ghost btn-sm" onClick={()=>setPage("pitch")}>Pitch →</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── CRM ────────────────────────────────────────────────────────────────────
function CRMPage({prospects,updateProspect,removeProspect,setPage,toast}){
  const[filter,setFilter]=useState("All");
  const[search,setSearch]=useState("");
  const[view,setView]=useState('table');
  const[selected,setSelected]=useState(null);
  const[noteVal,setNoteVal]=useState("");
  const STATUSES=["Not Contacted","Contacted","Read","Active","Closed","Rejected"];
  const filtered=(filter==="All"?prospects:prospects.filter(p=>p.status===filter)).filter(p=>!search||p.name?.toLowerCase().includes(search.toLowerCase())||p.city?.toLowerCase().includes(search.toLowerCase())||p.category?.toLowerCase().includes(search.toLowerCase()));
  const open=p=>{setSelected(p);setNoteVal(p.notes||"");};
  const saveNote=()=>{updateProspect(selected.id,{notes:noteVal,lastActivity:now()});setSelected(prev=>({...prev,notes:noteVal}));toast("Note saved.","success");};
  const changeStatus=s=>{updateProspect(selected.id,{status:s,lastActivity:now()});setSelected(prev=>({...prev,status:s}));toast(`Status → ${s}`,"info");};
  return(
    <div>
      <div className="sh"><div><div className="sh-title">CRM</div><div className="sh-sub">{prospects.length} prospects · {prospects.filter(p=>p.status==="Active").length} active</div></div><div className="sh-right"><input className="inp" style={{width:160,height:32,fontSize:".78rem"}} placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)}/><button className={`btn btn-ghost btn-sm${view==="table"?" btn-outline-gold":""}`} onClick={()=>setView("table")}>Table</button><button className={`btn btn-ghost btn-sm${view==="kanban"?" btn-outline-gold":""}`} onClick={()=>setView("kanban")}>Kanban</button><button className="btn btn-ghost btn-sm" onClick={()=>setPage("scanner")}>+ Add</button></div></div>
      <div className="pipe-strip">{STATUSES.map(s=><div key={s} className="pipe-col"><div className="pipe-n">{prospects.filter(p=>p.status===s).length}</div><div className="pipe-l">{s}</div></div>)}</div>
      <div className="crm-filters">{["All",...STATUSES].map(f=><button key={f} className={`crm-f${filter===f?" on":""}`} onClick={()=>setFilter(f)}>{f}</button>)}</div>
      {view==='kanban'&&(
        <div className="kanban-wrap">
          {["Not Contacted","Contacted","Read","Active","Closed","Rejected"].map(status=>{
            const cols=prospects.filter(p=>p.status===status&&(!search||p.name?.toLowerCase().includes(search.toLowerCase())));
            const col=PIPE_COLORS[status]||'#c9a84c';
            return(
              <div key={status} className="kanban-col">
                <div className="kanban-col-head" style={{borderColor:col}}>
                  <span className="kanban-col-title" style={{color:col}}>{status}</span>
                  <span className="kanban-col-count" style={{color:col}}>{cols.length}</span>
                </div>
                {cols.map(p=>(
                  <div key={p.id} className="kanban-card" onClick={()=>{open(p);}}>
                    <div className="kanban-card-name">{p.name}</div>
                    <div className="kanban-card-meta">{p.city} · {p.category}</div>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <span style={{color:'#c9a84c',fontSize:'.6rem',letterSpacing:'1px'}}>{stars(p.rating)}</span>
                      <span className={`badge ${scoreClass(p.leadScore)}`} style={{fontSize:'.52rem',padding:'1px 5px'}}>{p.leadScore}</span>
                    </div>
                    <div className="kanban-move-row">
                      {["Not Contacted","Contacted","Read","Active","Closed","Rejected"].filter(s=>s!==status).slice(0,2).map(s=>(
                        <button key={s} className="btn btn-ghost btn-xs" style={{fontSize:'.52rem',padding:'2px 5px'}} onClick={e=>{e.stopPropagation();updateProspect(p.id,{status:s,lastActivity:now()});toast(`→ ${s}`,'info');}}>
                          {s.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {cols.length===0&&<div style={{padding:'16px 10px',textAlign:'center',fontFamily:"'JetBrains Mono',monospace",fontSize:'.54rem',color:'#1e1d2c',letterSpacing:'1.5px',textTransform:'uppercase'}}>Empty</div>}
              </div>
            );
          })}
        </div>
      )}
      {view==='table'&&(filtered.length===0?<div className="empty"><div className="empty-rune">ᚨ</div><div className="empty-title">No prospects here</div><div className="empty-sub">{prospects.length===0?"Run a scan to start.":"No prospects with this status."}</div>{prospects.length===0&&<button className="btn btn-gold" onClick={()=>setPage("scanner")}>Start Scanning</button>}</div>:(
        <div className="card" style={{padding:0}}>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Business</th><th>Category</th><th>City</th><th>Rating</th><th>Score</th><th>Status</th><th>Added</th><th/></tr></thead>
              <tbody>{filtered.map(p=>(
                <tr key={p.id} onClick={()=>open(p)}>
                  <td className="td-main">{p.name}</td><td>{p.category}</td>
                  <td style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".62rem",color:"#2e2d3c"}}>{p.city}</td>
                  <td><span style={{color:"#c9a84c",letterSpacing:"2px",fontSize:".7rem"}}>{"★".repeat(Math.round(p.rating))}</span></td>
                  <td><span className={`badge ${scoreClass(p.leadScore)}`}>{p.leadScore}</span></td>
                  <td><Badge status={p.status}/></td>
                  <td style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".58rem",color:"#2e2d3c"}}>{p.addedAt}</td>
                  <td onClick={e=>{e.stopPropagation();removeProspect(p.id);toast("Removed.","info");}}><button className="btn btn-ghost btn-xs">✕</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      ))}
      {selected&&(
        <>
          <div className="drawer-bg" onClick={()=>setSelected(null)}/>
          <div className="drawer">
            <div className="dr-head"><div><div style={{fontFamily:"'Cinzel',serif",fontSize:"1rem",fontWeight:700,color:"#ddd8ce",marginBottom:6}}>{selected.name}</div><Badge status={selected.status}/></div><button className="dr-close" onClick={()=>setSelected(null)}>✕</button></div>
            {[{l:"Phone",v:selected.phone},{l:"Address",v:selected.address},{l:"City",v:selected.city},{l:"Category",v:selected.category},{l:"Rating",v:`${selected.rating}★ (${selected.reviews} reviews)`},{l:"Lead Score",v:selected.leadScore}].map(({l,v})=><div key={l} className="dr-field"><div className="dr-label">{l}</div><div className="dr-val">{v}</div></div>)}
            <div className="dr-field"><div className="dr-label">Services</div><div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:5}}>{selected.services?.map(s=><span key={s} style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".56rem",letterSpacing:"1px",textTransform:"uppercase",padding:"3px 8px",border:"1px solid rgba(201,168,76,.08)",color:"#2e2d3c"}}>{s}</span>)}</div></div>
            <div className="divider"/>
            <div className="dr-label" style={{marginBottom:8}}>Update Status</div>
            <div className="dr-status-grid">{"Not Contacted,Contacted,Read,Active,Closed,Rejected".split(",").map(s=><button key={s} className={`dr-sb${selected.status===s?" on":""}`} onClick={()=>changeStatus(s)}>{s}</button>)}</div>
            <div className="divider"/>
            <div className="dr-label" style={{marginBottom:6}}>Notes</div>
            <textarea className="inp" rows={4} value={noteVal} onChange={e=>setNoteVal(e.target.value)} placeholder="Add notes…"/>
            <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}><button className="btn btn-gold btn-sm" onClick={saveNote}>Save Note</button><button className="btn btn-ghost btn-sm" onClick={()=>setPage("pitch")}>Go to Pitch →</button><button className="btn btn-ghost btn-sm" onClick={()=>{changeStatus("Contacted");toast("Status updated. Go to Pitch Generator to build the package.","info");}}>Mark Contacted</button></div>
          </div>
        </>
      )}
    </div>
  );
}

// ── PITCH ──────────────────────────────────────────────────────────────────
function PitchPage({prospects,pitches,addPitch,toast}){
  const[selId,setSelId]=useState("");
  const[manualName,setManualName]=useState("");
  const[manualCat,setManualCat]=useState("");
  const[manualCity,setManualCity]=useState("");
  const[tone,setTone]=useState("Direct");
  const[loading,setLoading]=useState(false);
  const[result,setResult]=useState(null);
  const[tab,setTab]=useState("sms");
  const[copied,setCopied]=useState("");
  const sp=prospects.find(p=>p.id===selId);
  const isManual=selId==="manual";
  const target=isManual?{name:manualName,category:manualCat,city:manualCity,rating:"5.0",reviews:"120"}:sp;
  const ALL_TONES=[
    {name:"Direct",desc:"Short, confident, no fluff"},
    {name:"Professional",desc:"Polished and formal"},
    {name:"Casual",desc:"Friendly and relaxed"},
    {name:"Urgent",desc:"Creates FOMO"},
    {name:"Empathetic",desc:"Leads with understanding"},
    {name:"Confident",desc:"Bold value proposition"},
    {name:"Storytelling",desc:"Narrative-driven approach"},
    {name:"Humorous",desc:"Disarming and memorable"},
    {name:"Technical",desc:"Data and specifics first"},
    {name:"Luxury",desc:"Premium and exclusive feel"},
    {name:"Friendly",desc:"Warm neighbor energy"},
    {name:"Bold",desc:"Direct challenge to status quo"},
  ];
  const[customTone,setCustomTone]=useState('');
  const activeTone=customTone.trim()||tone;
  const TONES=ALL_TONES;
  const TABS=[{id:"sms",l:"SMS"},{id:"call",l:"Call Script"},{id:"email",l:"Email"},{id:"followup",l:"Follow-up"}];
  const generate=async()=>{
    if(!target?.name){toast("Select a prospect or enter details.","error");return;}
    setLoading(true);setResult(null);
    try{
      const prompt=`Generate a pitch package for a web designer pitching to "${target.name}", a ${target.category} business in ${target.city} with ${target.rating} stars and ${target.reviews} reviews. Tone: ${activeTone}. Return ONLY valid JSON: {"sms":"2-3 sentence SMS pitch","call":"phone call script 150-200 words","email":"Subject: ...\\n\\n[email body]","followup":"2-sentence follow-up SMS"}`;
      const raw=await callClaude(prompt,1200);
      const parsed=JSON.parse(raw.replace(/```json|```/g,"").trim());
      setResult(parsed);addPitch({id:uid(),prospectId:selId,prospectName:target.name,tone,...parsed,generatedAt:now()});setTab("sms");toast("Pitch generated.","success");
    }catch(e){toast("Generation failed.","error");}
    setLoading(false);
  };
  const copy=(text,key)=>{navigator.clipboard.writeText(text).then(()=>{setCopied(key);setTimeout(()=>setCopied(""),2000);});toast("Copied.","success");};
  return(
    <div>
      <div className="sh"><div><div className="sh-title">Pitch Generator</div><div className="sh-sub">AI-crafted pitches for every format</div></div></div>
      <div className="pitch-layout">
        <div className="pitch-panel">
          <div className="card-sub" style={{marginBottom:10}}>Select Prospect</div>
          <select className="inp" style={{marginBottom:14}} value={selId} onChange={e=>setSelId(e.target.value)}><option value="">— Choose from CRM —</option><option value="manual">✎ Enter manually</option>{prospects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
          {isManual&&(<><div className="field"><label>Business Name</label><input className="inp" placeholder="Apex HVAC LLC" value={manualName} onChange={e=>setManualName(e.target.value)}/></div><div className="field"><label>Category</label><input className="inp" placeholder="HVAC" value={manualCat} onChange={e=>setManualCat(e.target.value)}/></div><div className="field"><label>City</label><input className="inp" placeholder="Austin, TX" value={manualCity} onChange={e=>setManualCity(e.target.value)}/></div></>)}
          {sp&&!isManual&&<div style={{background:"#0a0a14",border:"1px solid rgba(201,168,76,.07)",padding:"12px 14px",marginBottom:14}}><div style={{fontFamily:"'Cinzel',serif",fontSize:".85rem",color:"#ddd8ce",marginBottom:4}}>{sp.name}</div><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".6rem",color:"#2e2d3c",letterSpacing:"1px"}}>{sp.category} · {sp.city} · {sp.rating}★</div></div>}
          <div className="divider"/>
          <div className="card-sub" style={{marginBottom:10}}>Tone</div>
          <div className="tone-grid" style={{gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))'}}>{TONES.map(t=><div key={t.name} className={`tone-btn${tone===t.name&&!customTone?" on":""}`} onClick={()=>{setTone(t.name);setCustomTone('');}}><div className="tone-name">{t.name}</div><div className="tone-desc" style={{fontSize:'.58rem',color:'#3a3848'}}>{t.desc}</div></div>)}</div>
          <div className="field" style={{marginTop:8,marginBottom:0}}>
            <label style={{marginBottom:4}}>Or type a custom tone</label>
            <input className="inp" placeholder="e.g. Military-precise, Southern charm, NYC hustle…" value={customTone} onChange={e=>{setCustomTone(e.target.value);if(e.target.value)setTone('');}}/>
          </div>
          {activeTone&&<div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.56rem',letterSpacing:'2px',textTransform:'uppercase',color:'#c9a84c',marginTop:4}}>Active: {activeTone}</div>}
          <div className="divider"/>
          <button className="btn btn-gold btn-full" onClick={generate} disabled={loading||!target?.name}>{loading?<><Spinner/>Generating…</>:"Generate Pitch Package"}</button>
          {pitches.length>0&&<><div className="divider"/><div className="card-sub" style={{marginBottom:8}}>Recent</div>{pitches.slice(-3).reverse().map(p=><div key={p.id} style={{padding:"8px 10px",background:"#0a0a14",border:"1px solid rgba(201,168,76,.05)",marginBottom:5,cursor:"pointer"}} onClick={()=>{setResult({sms:p.sms,call:p.call,email:p.email,followup:p.followup});setTab("sms");}}><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".6rem",color:"#5a5868",letterSpacing:"1px"}}>{p.prospectName}</div><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".54rem",color:"#2e2d3c",letterSpacing:"1px",marginTop:2}}>{p.tone} · {p.generatedAt}</div></div>)}</>}
        </div>
        <div className="pitch-out">
          {!result&&!loading&&<div className="empty"><div className="empty-rune">ᚨ</div><div className="empty-title">No pitch yet</div><div className="empty-sub">Select a prospect, choose a tone, and hit Generate.</div></div>}
          {loading&&<div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14}}><Spinner lg/><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".62rem",letterSpacing:"2px",color:"#2e2d3c",textTransform:"uppercase"}}>Crafting your pitch…</div></div>}
          {result&&!loading&&(<><div className="tabs">{TABS.map(t=><button key={t.id} className={`tab${tab===t.id?" on":""}`} onClick={()=>setTab(t.id)}>{t.l}</button>)}</div><div className="pitch-body"><div style={{fontFamily:"'DM Sans',sans-serif",fontSize:".9rem",fontWeight:300,color:"#c9b87a",lineHeight:2,whiteSpace:"pre-wrap",letterSpacing:".3px"}}>{result[tab]}</div></div><div className="pitch-copy-row"><button className="btn btn-ghost btn-sm" onClick={()=>copy(result[tab],tab)}>{copied===tab?"Copied ✓":"Copy"}</button></div></>)}
        </div>
      </div>
    </div>
  );
}

// ── SITE BUILDER ───────────────────────────────────────────────────────────
function SiteBuilderPage({toast,onSiteBuilt,prospects=[]}){
  const PAGES_LIST=[
    {id:'home',label:'Home',emoji:'🏠',hint:'Main landing page with hero, services, reviews, and CTA.'},
    {id:'about',label:'About',emoji:'ℹ️',hint:'Company story, team bios, values, and mission.'},
    {id:'services',label:'Services',emoji:'🔧',hint:'Full services breakdown with pricing and process.'},
    {id:'contact',label:'Contact',emoji:'📞',hint:'Contact form, phone, address, hours, and map embed.'},
    {id:'gallery',label:'Gallery',emoji:'🖼️',hint:'Photo/project gallery with categories and lightbox.'},
    {id:'blog',label:'Blog',emoji:'📝',hint:'Blog index with featured post, categories, and recent articles.'},
  ];
  const[activePage,setActivePage]=useState('home');
  const[showPresets,setShowPresets]=useState(false);
  const[selectedProspect,setSelectedProspect]=useState('');
  const[pages,setPages]=useState({});
  const[msgs,setMsgs]=useState({home:[{role:'ai',text:"Describe the business and I'll build a full site. Name, type, city, anything you know about them — the more detail, the better the result."}]});
  const[input,setInput]=useState('');
  const[loading,setLoading]=useState(false);
  const[deploying,setDeploying]=useState(false);
  const[deployUrl,setDeployUrl]=useState('');
  const[showQR,setShowQR]=useState(false);
  const[showSchema,setShowSchema]=useState(false);
  const[schemaData,setSchemaData]=useState(null);
  const[schemaLoading,setSchemaLoading]=useState(false);
  const msgsRef=useRef(null);
  const iframeRef=useRef(null);

  const currentHtml=pages[activePage]||'';
  const currentMsgs=msgs[activePage]||[{role:'ai',text:`I'll build the ${activePage} page. Describe what you want included, or I can generate it based on the Home page.`}];

  useEffect(()=>{if(msgsRef.current)msgsRef.current.scrollTop=msgsRef.current.scrollHeight;},[msgs,activePage]);

  useEffect(()=>{
    if(currentHtml&&iframeRef.current){
      const blob=new Blob([currentHtml],{type:'text/html'});
      iframeRef.current.src=URL.createObjectURL(blob);
    } else if(iframeRef.current){
      iframeRef.current.src='about:blank';
    }
  },[activePage,currentHtml]);

  const send=async()=>{
    if(!input.trim()||loading)return;
    const msg=input.trim();setInput('');
    const prevMsgs=msgs[activePage]||[];
    setMsgs(m=>({...m,[activePage]:[...prevMsgs,{role:'user',text:msg}]}));
    setLoading(true);
    const isFirst=!pages[activePage];
    const homeCtx=pages.home?`The home page HTML starts with: ${pages.home.slice(0,400)}...`:'';
    const pageHint=PAGES_LIST.find(p=>p.id===activePage)?.hint||'';
    const prompt=isFirst
      ?`Build a complete, beautiful HTML page for the "${activePage}" section of this website. ${pageHint} Business/context: "${msg}". ${homeCtx} Match the visual style of the home page if provided. Return ONLY complete HTML starting with <!DOCTYPE html>.`
      :`Modify the ${activePage} page: "${msg}". Current HTML: ${(pages[activePage]||'').slice(0,2000)}... Return COMPLETE updated HTML only.`;
    try{
      const raw=await callClaude(prompt,3500);
      const html=raw.replace(/```html|```/g,'').trim();
      setPages(p=>({...p,[activePage]:html}));
      setMsgs(m=>({...m,[activePage]:[...(m[activePage]||[]),{role:'ai',text:isFirst?`✦ ${activePage.charAt(0).toUpperCase()+activePage.slice(1)} page built. Ask me to change anything.`:`Updated. Check the preview.`}]}));
      toast(`${activePage} page built.`,'success');
      if(activePage==='home'&&onSiteBuilt)onSiteBuilt();
    }catch(e){
      setMsgs(m=>({...m,[activePage]:[...(m[activePage]||[]),{role:'ai',text:'Build failed. Try again.'}]}));
      toast('Build failed.','error');
    }
    setLoading(false);
  };

  const downloadAll=()=>{
    const built=Object.entries(pages);
    if(built.length===0){toast('Build at least one page first.','error');return;}
    built.forEach(([pid,html])=>{
      const blob=new Blob([html],{type:'text/html'});
      const a=document.createElement('a');
      a.href=URL.createObjectURL(blob);
      a.download=`${pid==='home'?'index':pid}.html`;
      a.click();
    });
    toast(`Downloaded ${built.length} page${built.length>1?'s':''}.`,'success');
  };

  const duplicatePage=()=>{
    if(!currentHtml){toast('Nothing to duplicate on this page.','error');return;}
    const clone=currentHtml.replace(/<title>(.*?)<\/title>/i,'<title>$1 — Copy</title>');
    const blob=new Blob([clone],{type:'text/html'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=`${activePage}-copy.html`;
    a.click();
    toast('Page cloned and downloaded.','success');
  };

  const generateSchema=async()=>{
    if(!pages.home){toast('Build the home page first.','error');return;}
    setSchemaLoading(true);setShowSchema(true);
    try{
      const prompt=`Extract SEO metadata from this website HTML and return ONLY valid JSON: {"title":"page title under 60 chars","url":"example domain slug","description":"meta description 120-155 chars","rating":"4.9","reviewCount":"203","businessType":"local business type"}. HTML: ${pages.home.slice(0,2000)}`;
      const raw=await callClaude(prompt,300);
      const parsed=JSON.parse(raw.replace(/```json|```/g,'').trim());
      setSchemaData(parsed);
    }catch(e){
      setSchemaData({title:'Your Business Name',url:'yourbusiness.com',description:'Professional services in your city. Rated 4.9 stars with over 200 five-star reviews. Call or book online today.',rating:'4.9',reviewCount:'203',businessType:'Local Business'});
    }
    setSchemaLoading(false);
  };

  const deployToGitHub=async()=>{
    if(!pages.home){toast('Build the home page first.','error');return;}
    setDeploying(true);
    try{
      let token='';
      try{const k=await window.storage.get('rs3_github_key');if(k)token=k.value;}catch(e){}
      if(!token){toast('Add your GitHub token in Settings first.','error');setDeploying(false);return;}
      const userRes=await fetch('https://api.github.com/user',{headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github.v3+json'}});
      const userData=await userRes.json();
      if(!userData.login){toast('Invalid GitHub token.','error');setDeploying(false);return;}
      const tm=pages.home.match(/<title>(.*?)<\/title>/i);
      const repoName=(tm?tm[1]:'site').toLowerCase().replace(/[^a-z0-9]/g,'-').replace(/-+/g,'-').slice(0,36)+'-'+uid().slice(0,4);
      await fetch('https://api.github.com/user/repos',{method:'POST',headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github.v3+json','Content-Type':'application/json'},body:JSON.stringify({name:repoName,private:false,auto_init:false})});
      for(const[pid,html] of Object.entries(pages)){
        const fname=pid==='home'?'index.html':`${pid}.html`;
        const encoded=btoa(unescape(encodeURIComponent(html)));
        await fetch(`https://api.github.com/repos/${userData.login}/${repoName}/contents/${fname}`,{method:'PUT',headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github.v3+json','Content-Type':'application/json'},body:JSON.stringify({message:`Add ${fname} via Rune Script`,content:encoded})});
      }
      const url=`https://github.com/${userData.login}/${repoName}`;
      setDeployUrl(url);setShowQR(true);
      toast(`${Object.keys(pages).length} pages deployed!`,'success');
    }catch(e){toast('Deploy failed. Check your GitHub token in Settings.','error');}
    setDeploying(false);
  };

  const builtCount=Object.keys(pages).length;

  return(
    <div>
      <div className="sh">
        <div>
          <div className="sh-title">Site Builder</div>
          <div className="sh-sub">Multi-page AI builder — build each page separately, deploy as a complete site</div>
        </div>
        <div className="sh-right">
          {builtCount>0&&<span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.58rem',letterSpacing:'2px',color:'#5a9070',textTransform:'uppercase'}}>{builtCount} page{builtCount>1?'s':''} built</span>}
          {builtCount>0&&<button className="btn btn-ghost btn-sm" onClick={downloadAll}>↓ Download All</button>}
          {currentHtml&&<button className="btn btn-ghost btn-sm" onClick={duplicatePage}>Clone Page</button>}
          {currentHtml&&<button className="btn btn-ghost btn-sm" onClick={generateSchema}>{showSchema?'Hide Preview':'Google Preview'}</button>}
          {builtCount>0&&<button className="btn btn-gold btn-sm" onClick={deployToGitHub} disabled={deploying}>{deploying?<><Spinner/>Deploying…</>:'Deploy to GitHub →'}</button>}
        </div>
      </div>

      {deployUrl&&(
        <div className="deploy-status" style={{marginBottom:12}}>
          <span style={{fontFamily:"'Cinzel',serif",fontSize:'.88rem',color:'#7ac89a'}}>✦</span>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.54rem',letterSpacing:'2px',color:'#3a3848',textTransform:'uppercase',marginBottom:3}}>{builtCount} pages deployed successfully</div>
            <div className="deploy-url">{deployUrl}</div>
          </div>
          <button className="btn btn-ghost btn-xs" onClick={()=>{navigator.clipboard.writeText(deployUrl);toast('Copied.','success');}}>Copy</button>
          <a href={deployUrl} target="_blank" rel="noreferrer"><button className="btn btn-ghost btn-xs">Open →</button></a>
          {showQR&&deployUrl&&(
            <div className="qr-section" style={{marginTop:0,border:'none',padding:0,gap:10}}>
              <img className="qr-img" src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(deployUrl)}`} alt="QR Code"/>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.56rem',color:'#3a3848',letterSpacing:'1px'}}>QR Code</span>
            </div>
          )}
        </div>
      )}

      {showSchema&&(
        <div className="schema-wrap" style={{marginBottom:12}}>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.56rem',letterSpacing:'2px',color:'#3a3848',textTransform:'uppercase',marginBottom:10}}>// Google Search Preview</div>
          {schemaLoading?<div style={{display:'flex',gap:10,alignItems:'center'}}><Spinner/><span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.6rem',color:'#2e2d3c'}}>Generating preview…</span></div>:
          schemaData&&(
            <div className="schema-preview">
              <div className="schema-title">{schemaData.title}</div>
              <div className="schema-url">https://www.{schemaData.url} › home</div>
              <div className="schema-desc">{schemaData.description}</div>
              {schemaData.rating&&<div className="schema-stars">{'★'.repeat(5)} {schemaData.rating} · {schemaData.reviewCount} reviews · {schemaData.businessType}</div>}
            </div>
          )}
        </div>
      )}


      {/* CRM CHOOSER + PRESETS */}
      <div className="card" style={{marginBottom:10,padding:'12px 16px'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:10,alignItems:'flex-end'}}>
          <div className="field" style={{margin:0}}>
            <label>Build for a CRM Prospect</label>
            <select className="inp" value={selectedProspect} onChange={e=>{
              const p=prospects?.find(pr=>pr.id===e.target.value);
              if(p){setInput(`Build a professional website for ${p.name}, a ${p.category} business in ${p.city}. They have ${p.rating} stars and ${p.reviews} Google reviews. Services: ${p.services?.join(', ')||'see their Google listing'}. ${p.description||''}`);setSelectedProspect(e.target.value);}
              else setSelectedProspect('');
            }}>
              <option value="">— Select prospect to auto-fill prompt —</option>
              {prospects?.map(p=><option key={p.id} value={p.id}>{p.name} · {p.city}</option>)}
            </select>
          </div>
          <div className="field" style={{margin:0}}>
            <label>Quick Style Preset</label>
            <select className="inp" onChange={e=>{if(e.target.value)setInput(prev=>`${prev} Style: ${e.target.value}.`);}}>
              <option value="">— Apply a style —</option>
              {['Modern and minimal with lots of white space','Bold and high-contrast dark design','Warm and family-friendly with earthy tones','Luxury and premium with gold accents','Clean and professional corporate look','Vibrant and energetic with bright colors','Elegant and feminine with soft pastels','Industrial and rugged with strong typography'].map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={()=>setShowPresets(!showPresets)}>
            {showPresets?'Hide Presets':'More Presets ↓'}
          </button>
        </div>
        {showPresets&&(
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:8,marginTop:10}}>
            {[
              {label:'Add Features',opts:['Online booking/scheduling','Photo gallery section','Video background hero','Customer reviews wall','Team member bios','FAQ accordion section','Pricing comparison table','Before/after slider']},
              {label:'Color Scheme',opts:['Navy and gold','Forest green and cream','Charcoal and red','Purple and silver','Teal and white','Orange and dark','Midnight black and neon','Earth tones and terracotta']},
              {label:'Target Audience',opts:['Residential homeowners','Small business owners','Young professionals','Families with children','Senior citizens','Luxury/high-income clients','Commercial/B2B clients','Eco-conscious consumers']},
            ].map((group,gi)=>(
              <div key={gi}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.54rem',letterSpacing:'2px',textTransform:'uppercase',color:'#3a3848',marginBottom:6}}>{group.label}</div>
                {group.opts.map(opt=>(
                  <button key={opt} className="btn btn-ghost btn-xs" style={{marginBottom:4,marginRight:4,fontSize:'.64rem'}}
                    onClick={()=>setInput(prev=>`${prev} Include: ${opt}.`)}>
                    + {opt}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
      {/* PAGE TABS */}
      <div className="page-tabs" style={{marginBottom:12}}>
        {PAGES_LIST.map(p=>(
          <button key={p.id} className={`page-tab${activePage===p.id?' on':''}${pages[p.id]?' page-tab-done':''}`} onClick={()=>setActivePage(p.id)}>
            {p.emoji} {p.label}
          </button>
        ))}
      </div>

      {/* TEMPLATE STARTERS — only on home page when not built */}
      {!currentHtml&&!loading&&activePage==='home'&&(
        <div style={{marginBottom:12}}>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.6rem',letterSpacing:'2px',textTransform:'uppercase',color:'#2e2d3c',marginBottom:8}}>// Start with a template or describe any business</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:6}}>
            {[
              {name:'HVAC',emoji:'❄️',p:'Build a professional website for Apex HVAC LLC in Austin TX. 4.9 stars, 203 reviews. Hero with emergency CTA, services grid, reviews strip, contact form.'},
              {name:'Hair Salon',emoji:'✂️',p:'Build an elegant website for Bella Hair Studio in Atlanta GA. 5.0 stars. Booking hero, service menu, before/after gallery, stylist team, gift card CTA.'},
              {name:'Restaurant',emoji:'🍽️',p:'Build a warm website for La Cocina Kitchen in Miami FL. 4.8 stars. Full menu, specials, photo gallery, hours, online order CTA.'},
              {name:'Auto Repair',emoji:'🔧',p:"Build a trustworthy website for Mike's Auto Care in Dallas TX. 4.9 stars, ASE certified. Service menu, free estimate CTA, reviews, appointment form."},
              {name:'Law Firm',emoji:'⚖️',p:'Build a professional website for Harrington & Associates Law in Chicago IL. Practice areas, attorney bio, case results, free consultation.'},
              {name:'Cleaning',emoji:'🧹',p:'Build a website for SparkleClean Services in Seattle WA. 4.9 stars. Service packages, before/after, booking form, eco-friendly focus.'},
              {name:'Dental',emoji:'🦷',p:'Build a modern website for Bright Smile Dental in Phoenix AZ. 4.8 stars. Service list, new patient offer, smile gallery, insurance checker.'},
              {name:'Landscaping',emoji:'🌿',p:'Build a vibrant website for GreenThumb Landscaping in Charlotte NC. 5.0 stars. Seasonal services, gallery, area map, free estimate form.'},
            ].map((t,i)=>(
              <button key={i} onClick={()=>setInput(t.p)} style={{background:'#0a0a14',border:'1px solid rgba(201,168,76,.08)',padding:'10px 12px',cursor:'pointer',textAlign:'left',transition:'border-color .2s',display:'flex',flexDirection:'column',gap:3}}
                onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(201,168,76,.25)'}
                onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(201,168,76,.08)'}>
                <span style={{fontSize:'1rem'}}>{t.emoji}</span>
                <span style={{fontFamily:"'Cinzel',serif",fontSize:'.68rem',fontWeight:700,color:'#ddd8ce'}}>{t.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!currentHtml&&!loading&&activePage!=='home'&&(
        <div style={{background:'rgba(201,168,76,.04)',border:'1px dashed rgba(201,168,76,.12)',padding:'14px 18px',marginBottom:10,fontFamily:"'JetBrains Mono',monospace",fontSize:'.6rem',color:'#3a3848',letterSpacing:'1.5px',textTransform:'uppercase'}}>
          {PAGES_LIST.find(p=>p.id===activePage)?.hint||''} — Describe what to include, or just hit Build.
        </div>
      )}

      <div className="builder-wrap">
        <div className="builder-chat">
          <div className="builder-msgs" ref={msgsRef}>
            {currentMsgs.map((m,i)=>(
              <div key={i} className={`bmsg bmsg-${m.role}`}>
                <div className={`bmsg-label bmsg-label-${m.role}`}>{m.role==='user'?'You':`Rune Script AI — ${activePage}`}</div>
                <div className="bmsg-bubble"><p className="bmsg-txt">{m.text}</p></div>
              </div>
            ))}
            {loading&&<div className="bmsg bmsg-ai"><div className="bmsg-label bmsg-label-ai">Building {activePage} page…</div><div className="bmsg-bubble" style={{display:'flex',alignItems:'center',gap:10}}><Spinner/><span className="bmsg-txt">This takes about 15 seconds…</span></div></div>}
          </div>
          <div className="builder-inp-row">
            <textarea className="builder-inp" placeholder={`Describe the ${activePage} page — or just hit Build`} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}} rows={2}/>
            <button className="btn btn-gold btn-sm" onClick={send} disabled={loading||!input.trim()}>{loading?<Spinner/>:'Build'}</button>
          </div>
        </div>
        <div className="builder-prev">
          <div className="builder-prev-bar">
            <span className="builder-prev-bar-title">{currentHtml?`${activePage}.html`:'Live Preview'}</span>
            {currentHtml&&<button className="btn btn-ghost btn-xs" onClick={()=>{const blob=new Blob([currentHtml],{type:'text/html'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${activePage==='home'?'index':activePage}.html`;a.click();}}>↓</button>}
          </div>
          {currentHtml?<iframe ref={iframeRef} title="preview" style={{flex:1,border:'none',width:'100%',height:'100%'}}/>
          :<div className="builder-prev-empty"><div className="builder-prev-empty-r">ᚲ</div><div className="builder-prev-empty-t">Preview will appear here</div><div className="builder-prev-empty-s">Describe a business and hit Build.</div></div>}
        </div>
      </div>
    </div>
  );
}

// ── AGENCY OS ──────────────────────────────────────────────────────────────
function AgencyOSPage({prospects,proposals,addProposal,invoices,addInvoice,updateInvoice,toast}){
  const[tab,setTab]=useState("clients");
  const[genLoading,setGenLoading]=useState(false);
  const[selProspect,setSelProspect]=useState("");
  const[generatedProp,setGeneratedProp]=useState("");
  const[expandedProp,setExpandedProp]=useState(null);
  const[showInvModal,setShowInvModal]=useState(false);
  const[invClient,setInvClient]=useState("");
  const[invItems,setInvItems]=useState([{desc:"Website Design & Development",amount:"1200"}]);
  const[invDue,setInvDue]=useState("");
  const[fees,setFees]=useState({});
  const clients=prospects.filter(p=>p.status==="Closed");
  const[cClient,setCClient]=useState('');
  const[timerRunning,setTimerRunning]=useState(false);
  const[timerSecs,setTimerSecs]=useState(0);
  const[timerClient,setTimerClient]=useState('');
  const[timerNote,setTimerNote]=useState('');
  const[timeEntries,setTimeEntries]=useState([]);
  const[hourlyRate,setHourlyRate]=useState(75);
  const timerRef=useRef(null);
  const[referrals,setReferrals]=useState([]);
  const[refName,setRefName]=useState('');
  const[refPhone,setRefPhone]=useState('');
  const[refFrom,setRefFrom]=useState('');
  const[transcript,setTranscript]=useState('');
  const[transcriptResult,setTranscriptResult]=useState(null);
  const[transcriptLoading,setTranscriptLoading]=useState(false);
  const[intakeClient,setIntakeClient]=useState('');
  const[intakeResult,setIntakeResult]=useState('');
  const[intakeLoading,setIntakeLoading]=useState(false);
  const[cScope,setCScope]=useState('');
  const[cAmt,setCAmt]=useState('');
  const[cResult,setCResult]=useState('');
  const[cLoading,setCLoading]=useState(false);
  const totalInvoiced=invoices.reduce((a,i)=>a+Number(i.total),0);
  const totalPaid=invoices.filter(i=>i.status==="Paid").reduce((a,i)=>a+Number(i.total),0);
  const mrr=Object.values(fees).reduce((a,f)=>a+Number(f||0),0);
  const generateProposal=async()=>{
    const p=prospects.find(pr=>pr.id===selProspect);
    if(!p){toast("Select a prospect.","error");return;}
    setGenLoading(true);setGeneratedProp("");
    try{
      const prompt=`Write a professional web design proposal for "${p.name}", a ${p.category} business in ${p.city} with ${p.rating} stars and ${p.reviews} reviews. Include: Executive Summary (2 sentences), Project Scope (3-4 deliverables), Timeline (2-3 weeks), Investment (suggest $1,200 to $2,500), Terms (50% upfront), and Why Us section. Plain text, no markdown.`;
      const result=await callClaude(prompt,1200);
      setGeneratedProp(result);addProposal({id:uid(),prospectId:p.id,client:p.name,content:result,status:"Draft",createdAt:now()});toast("Proposal generated.","success");
    }catch(e){toast("Generation failed.","error");}
    setGenLoading(false);
  };
  const createInvoice=()=>{
    const p=prospects.find(pr=>pr.id===invClient);
    if(!p||!invItems[0]?.desc){toast("Fill in client and at least one item.","error");return;}
    const total=invItems.reduce((a,i)=>a+Number(i.amount||0),0);
    addInvoice({id:uid(),client:p.name,prospectId:p.id,items:invItems,total,due:invDue||"Net 30",status:"Unpaid",createdAt:now()});
    setShowInvModal(false);setInvItems([{desc:"Website Design & Development",amount:"1200"}]);setInvClient("");toast("Invoice created.","success");
  };
  const TOOLS=[{id:"clients",r:"ᚠ",l:"Clients"},{id:"proposals",r:"ᚨ",l:"Proposals"},{id:"invoices",r:"ᛊ",l:"Invoices"},{id:"revenue",r:"ᛟ",l:"Revenue"}];
  return(
    <div>
      <div className="sh"><div><div className="sh-title">Agency OS</div><div className="sh-sub">Manage clients, proposals, and revenue</div></div></div>
      <div className="agency-layout">
        <div className="agency-nav">{TOOLS.map(t=><div key={t.id} className={`agency-nav-item${tab===t.id?" on":""}`} onClick={()=>setTab(t.id)}><span className="agency-nav-r">{t.r}</span><span className="agency-nav-l">{t.l}</span></div>)}</div>
        <div className="agency-content">
          {tab==="clients"&&(<><div className="sh"><div><div className="sh-title">Active Clients</div><div className="sh-sub">{clients.length} clients</div></div></div>{clients.length===0?<div className="empty"><div className="empty-rune">ᚠ</div><div className="empty-title">No clients yet</div><div className="empty-sub">Mark prospects as Closed in the CRM to add them here.</div></div>:<div className="client-grid">{clients.map(c=><div key={c.id} className="client-card"><div className="client-card-head"><div className="client-name">{c.name}</div><span className="badge b-green">Active</span></div><div className="client-meta">{c.category} · {c.city}</div><div className="client-fee-row"><div><div className="client-fee-label">Monthly Fee</div><div className="client-fee">${fees[c.id]||0}/mo</div></div><input className="inp" style={{width:90,marginLeft:"auto"}} placeholder="$/mo" type="number" value={fees[c.id]||""} onChange={e=>setFees(prev=>({...prev,[c.id]:e.target.value}))}/></div><div style={{display:"flex",gap:6,marginTop:4}}><button className="btn btn-ghost btn-xs" onClick={()=>{setInvClient(c.id);setShowInvModal(true);}}>+ Invoice</button><button className="btn btn-gold btn-xs" onClick={()=>{setSelProspect(c.id);setTab("proposals");}}>Generate Proposal</button></div></div>)}</div>}</>)}
          {tab==="proposals"&&(<><div className="sh"><div><div className="sh-title">Proposals</div><div className="sh-sub">{proposals.length} generated</div></div></div><div className="card" style={{marginBottom:16,padding:16}}><div className="card-sub" style={{marginBottom:10}}>Generate New Proposal</div><div style={{display:"flex",gap:10,alignItems:"flex-end"}}><div className="field" style={{margin:0,flex:1}}><label>Select Prospect</label><select className="inp" value={selProspect} onChange={e=>setSelProspect(e.target.value)}><option value="">— Choose —</option>{prospects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div><button className="btn btn-gold" onClick={generateProposal} disabled={genLoading||!selProspect} style={{height:38}}>{genLoading?<><Spinner/>Generating…</>:"Generate →"}</button></div>{generatedProp&&<div style={{marginTop:14,background:"#0a0a14",border:"1px solid rgba(201,168,76,.08)",padding:16}}><pre style={{fontFamily:"'DM Sans',sans-serif",fontSize:".86rem",fontWeight:300,color:"#c9b87a",lineHeight:1.9,whiteSpace:"pre-wrap",letterSpacing:".3px"}}>{generatedProp}</pre><div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:10}}><button className="btn btn-ghost btn-sm" onClick={()=>{navigator.clipboard.writeText(generatedProp);toast("Copied.","success");}}>Copy</button></div></div>}</div>{proposals.length>0&&<div className="prop-list">{proposals.slice().reverse().map(p=><div key={p.id} className="prop-card"><div className="prop-card-head"><div className="prop-client">{p.client}</div><div style={{display:"flex",gap:8,alignItems:"center"}}><span className="prop-date">{p.createdAt}</span><span className="badge b-gold">{p.status}</span></div></div><div className={`prop-preview${expandedProp===p.id?" expanded":""}`}>{p.content}</div><div style={{display:"flex",gap:8,marginTop:8}}><button className="btn btn-ghost btn-xs" onClick={()=>setExpandedProp(expandedProp===p.id?null:p.id)}>{expandedProp===p.id?"Collapse":"Expand"}</button><button className="btn btn-ghost btn-xs" onClick={()=>{navigator.clipboard.writeText(p.content);toast("Copied.","success");}}>Copy</button></div></div>)}</div>}</>)}
          {tab==="invoices"&&(<><div className="sh"><div><div className="sh-title">Invoices</div><div className="sh-sub">{invoices.length} total</div></div><div className="sh-right"><button className="btn btn-gold btn-sm" onClick={()=>setShowInvModal(true)}>+ New Invoice</button></div></div>{invoices.length===0?<div className="empty"><div className="empty-rune">ᛊ</div><div className="empty-title">No invoices yet</div><button className="btn btn-gold btn-sm" onClick={()=>setShowInvModal(true)}>Create Invoice</button></div>:<div className="inv-list">{invoices.slice().reverse().map(inv=><div key={inv.id} className="inv-card"><div className="inv-card-head"><div><div className="inv-client">{inv.client}</div><div className="inv-meta">{inv.createdAt} · Due: {inv.due}</div></div><div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}><div className="inv-amount">${Number(inv.total).toLocaleString()}</div><span className={`badge ${inv.status==="Paid"?"b-green":"b-gold"}`}>{inv.status}</span></div></div><div className="inv-items">{inv.items.map((item,i)=><div key={i} className="inv-item-row"><span>{item.desc}</span><span>${Number(item.amount).toLocaleString()}</span></div>)}<div className="inv-total-row"><span>Total</span><span>${Number(inv.total).toLocaleString()}</span></div></div>{inv.status!=="Paid"&&<button className="btn btn-gold btn-xs" onClick={()=>{updateInvoice(inv.id,{status:"Paid"});toast("Marked as paid.","success");}}>Mark Paid</button>}</div>)}</div>}</>)}
          {tab==="revenue"&&(<><div className="sh"><div><div className="sh-title">Revenue</div><div className="sh-sub">Financial overview</div></div></div><div className="rev-grid">{[{n:`$${totalInvoiced.toLocaleString()}`,l:"Total Invoiced"},{n:`$${totalPaid.toLocaleString()}`,l:"Total Paid"},{n:`$${(totalInvoiced-totalPaid).toLocaleString()}`,l:"Outstanding"},{n:`$${mrr.toLocaleString()}/mo`,l:"Est. MRR"}].map((r,i)=><div key={i} className="rev-card"><div className="rev-n">{r.n}</div><div className="rev-l">{r.l}</div></div>)}</div><div className="chart-card"><div className="chart-title">Invoice History</div><div className="chart-sub">By value</div>{invoices.length>0?<ResponsiveContainer width="100%" height={180}><BarChart data={invoices.slice(-10).map(i=>({name:i.client.split(" ")[0],amount:Number(i.total)}))}><CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.06)" vertical={false}/><XAxis dataKey="name" tick={{fill:"#2e2d3c",fontSize:10,fontFamily:"JetBrains Mono"}} axisLine={false} tickLine={false}/><YAxis tick={{fill:"#2e2d3c",fontSize:10,fontFamily:"JetBrains Mono"}} axisLine={false} tickLine={false}/><Tooltip content={<CustomTooltip/>}/><Bar dataKey="amount" name="Invoice" fill="#c9a84c" opacity={0.7} radius={[2,2,0,0]}/></BarChart></ResponsiveContainer>:<div className="empty" style={{padding:"20px 0"}}><div className="empty-sub">No invoices to chart yet.</div></div>}</div></>)}
        </div>
      </div>
          {tab==='transcript'&&(
            <>
              <div className="sh"><div><div className="sh-title">Call Analyzer</div><div className="sh-sub">Paste call notes or transcript — get a full summary and action plan</div></div></div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:12}}>
                <div className="card">
                  <div className="card-title" style={{marginBottom:4}}>Paste Your Notes or Transcript</div>
                  <div className="card-sub" style={{marginBottom:12}}>Works with raw call notes, voice-to-text, or bullet points</div>
                  <textarea className="transcript-area" placeholder={"Called Mike at Apex HVAC. He seemed interested but asked about price. Said he had a nephew who builds websites. Mentioned he's been getting calls from people in areas he doesn't rank for..."} value={transcript} onChange={e=>setTranscript(e.target.value)}/>
                  <button className="btn btn-gold btn-full" style={{marginTop:10}} disabled={transcriptLoading||!transcript.trim()}
                    onClick={async()=>{
                      setTranscriptLoading(true);setTranscriptResult(null);
                      try{
                        const prompt=`Analyze this sales call transcript/notes and return ONLY valid JSON: {"summary":"2-3 sentence summary of the call","sentiment":"Positive/Neutral/Negative","interest_level":"High/Medium/Low","objections":["objection1","objection2"],"action_items":[{"action":"what to do","priority":"High/Medium/Low","timing":"when"}],"recommended_approach":"1 sentence on how to handle next contact"}. Notes: "${transcript}"`;
                        const raw=await callClaude(prompt,800);
                        const parsed=JSON.parse(raw.replace(/```json|```/g,'').trim());
                        setTranscriptResult(parsed);toast('Call analyzed.','success');
                      }catch(e){toast('Analysis failed.','error');}
                      setTranscriptLoading(false);
                    }}>
                    {transcriptLoading?<><Spinner/>Analyzing…</>:'Analyze Call →'}
                  </button>
                </div>
                {transcriptResult&&(
                  <div className="card">
                    <div className="card-title" style={{marginBottom:12}}>Call Analysis</div>
                    <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
                      <span className={`badge ${transcriptResult.sentiment==='Positive'?'b-green':transcriptResult.sentiment==='Negative'?'b-red':'b-gold'}`}>{transcriptResult.sentiment}</span>
                      <span className={`badge ${transcriptResult.interest_level==='High'?'b-green':transcriptResult.interest_level==='Low'?'b-red':'b-gold'}`}>Interest: {transcriptResult.interest_level}</span>
                    </div>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.56rem',letterSpacing:'2px',textTransform:'uppercase',color:'#2e2d3c',marginBottom:6}}>Summary</div>
                    <p style={{fontSize:'.82rem',fontWeight:300,color:'#7a7888',lineHeight:1.7,marginBottom:14}}>{transcriptResult.summary}</p>
                    {transcriptResult.objections?.length>0&&(
                      <><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.56rem',letterSpacing:'2px',textTransform:'uppercase',color:'#2e2d3c',marginBottom:6}}>Objections Raised</div>
                      <div style={{display:'flex',flexDirection:'column',gap:5,marginBottom:14}}>
                        {transcriptResult.objections.map((o,i)=><div key={i} style={{display:'flex',gap:8,fontSize:'.78rem',fontWeight:300,color:'#c05060',padding:'5px 10px',background:'rgba(192,80,96,.06)',border:'1px solid rgba(192,80,96,.1)'}}><span>⚠</span>{o}</div>)}
                      </div></>
                    )}
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.56rem',letterSpacing:'2px',textTransform:'uppercase',color:'#2e2d3c',marginBottom:8}}>Action Items</div>
                    <div className="action-item" style={{padding:0,border:'none',display:'flex',flexDirection:'column',gap:6,marginBottom:14}}>
                      {transcriptResult.action_items?.map((a,i)=>(
                        <div key={i} className="action-item">
                          <span className="action-num">{String(i+1).padStart(2,'0')}</span>
                          <span className="action-txt">{a.action}</span>
                          <span className={`action-tag badge ${a.priority==='High'?'b-red':a.priority==='Low'?'b-blue':'b-gold'}`}>{a.priority}</span>
                        </div>
                      ))}
                    </div>
                    {transcriptResult.recommended_approach&&(
                      <div style={{background:'rgba(201,168,76,.06)',border:'1px solid rgba(201,168,76,.1)',padding:'10px 14px'}}>
                        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.56rem',letterSpacing:'2px',textTransform:'uppercase',color:'#c9a84c',marginBottom:4}}>Recommended Next Move</div>
                        <p style={{fontSize:'.8rem',fontWeight:300,color:'#9a96a2',lineHeight:1.6}}>{transcriptResult.recommended_approach}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
          {tab==='intake'&&(
            <>
              <div className="sh"><div><div className="sh-title">Client Intake Form</div><div className="sh-sub">Generate a custom onboarding questionnaire for new clients</div></div></div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:12}}>
                <div className="card">
                  <div className="card-title" style={{marginBottom:4}}>Generate Intake Form</div>
                  <div className="card-sub" style={{marginBottom:14}}>Tailored to their industry, business, and your process</div>
                  <div className="field"><label>Select Client</label>
                    <select className="inp" value={intakeClient} onChange={e=>setIntakeClient(e.target.value)}>
                      <option value="">— Select prospect or client —</option>
                      {prospects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <button className="btn btn-gold btn-full" disabled={intakeLoading||!intakeClient}
                    onClick={async()=>{
                      const p=prospects.find(pr=>pr.id===intakeClient);
                      if(!p)return;
                      setIntakeLoading(true);setIntakeResult('');
                      try{
                        const prompt=`Create a professional client intake/onboarding questionnaire for a new web design client: "${p.name}", a ${p.category} business in ${p.city}. Include 15-20 questions covering: business background, goals, target audience, competitors, design preferences (colors, style, brands they admire), content they have vs need created, features needed (booking, gallery, menu, etc.), domain/hosting situation, timeline, budget confirmation, and point of contact. Format as a clean numbered list with brief explanations where helpful. Plain text.`;
                        const result=await callClaude(prompt,1200);
                        setIntakeResult(result);toast('Intake form generated.','success');
                      }catch(e){toast('Generation failed.','error');}
                      setIntakeLoading(false);
                    }}>
                    {intakeLoading?<><Spinner/>Generating…</>:'Generate Intake Form →'}
                  </button>
                </div>
                {intakeResult&&(
                  <div className="card">
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                      <div className="card-title">Client Intake Form</div>
                      <div style={{display:'flex',gap:6}}>
                        <button className="btn btn-ghost btn-xs" onClick={()=>{navigator.clipboard.writeText(intakeResult);toast('Copied.','success');}}>Copy</button>
                        <button className="btn btn-gold btn-xs" onClick={()=>{
                          const p=prospects.find(pr=>pr.id===intakeClient);
                          const w=window.open('','_blank');
                          w.document.write('<html><body style="font-family:sans-serif;padding:48px;max-width:680px;margin:0 auto;line-height:1.9;color:#111"><h1 style="margin-bottom:4px">Client Intake Form</h1><p style="color:#666;margin-bottom:32px">Prepared for: '+p?.name+'</p><pre style="white-space:pre-wrap;font-family:sans-serif;font-size:1rem;line-height:1.9">'+intakeResult+'</pre></body></html>');
                          w.document.close();w.print();
                        }}>Print PDF</button>
                      </div>
                    </div>
                    <div style={{background:'#0a0a14',border:'1px solid rgba(201,168,76,.06)',padding:'14px 16px',maxHeight:500,overflowY:'auto'}}>
                      <pre style={{fontFamily:"'DM Sans',sans-serif",fontSize:'.8rem',fontWeight:300,color:'#7a7888',lineHeight:1.85,whiteSpace:'pre-wrap'}}>{intakeResult}</pre>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
      {showInvModal&&<div className="modal-bg" onClick={e=>e.target.className==="modal-bg"&&setShowInvModal(false)}><div className="modal"><div className="modal-title">New Invoice</div><div className="modal-sub">Create and track a client invoice</div><div className="field"><label>Client</label><select className="inp" value={invClient} onChange={e=>setInvClient(e.target.value)}><option value="">— Select client —</option>{prospects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div><div className="field"><label>Due Date</label><input className="inp" placeholder="Net 30" value={invDue} onChange={e=>setInvDue(e.target.value)}/></div><div className="field"><label>Line Items</label><div className="line-items">{invItems.map((item,i)=><div key={i} className="line-item-row"><input className="inp" placeholder="Description" value={item.desc} onChange={e=>{const u=[...invItems];u[i]={...u[i],desc:e.target.value};setInvItems(u);}}/><input className="inp" style={{width:90}} placeholder="$" type="number" value={item.amount} onChange={e=>{const u=[...invItems];u[i]={...u[i],amount:e.target.value};setInvItems(u);}}/>{invItems.length>1&&<button className="btn btn-ghost btn-xs" onClick={()=>setInvItems(invItems.filter((_,j)=>j!==i))}>✕</button>}</div>)}</div><button className="btn btn-ghost btn-xs" onClick={()=>setInvItems([...invItems,{desc:"",amount:""}])}>+ Add Line</button></div><div style={{background:"#0a0a14",border:"1px solid rgba(201,168,76,.07)",padding:"12px 14px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".6rem",letterSpacing:"2px",color:"#2e2d3c",textTransform:"uppercase"}}>Total</span><span style={{fontFamily:"'Cinzel',serif",fontSize:"1.3rem",fontWeight:700,color:"#c9a84c"}}>${invItems.reduce((a,i)=>a+Number(i.amount||0),0).toLocaleString()}</span></div><div style={{display:"flex",gap:10}}><button className="btn btn-gold" style={{flex:1}} onClick={createInvoice}>Create Invoice</button><button className="btn btn-ghost" onClick={()=>setShowInvModal(false)}>Cancel</button></div></div></div>}
    </div>
  );
}

// ── AI STUDIO ──────────────────────────────────────────────────────────────
function AIStudioPage({prospects,toast}){
  const[tool,setTool]=useState("social");
  const[loading,setLoading]=useState(false);
  const[output,setOutput]=useState("");
  const[selClient,setSelClient]=useState("");
  const[opts,setOpts]=useState({platform:"Instagram",tone:"Professional",adGoal:"Awareness",seoType:"Blog Post"});
  const[customInput,setCustomInput]=useState("");
  const[copied,setCopied]=useState(false);
  const TOOLS=[{id:"social",r:"ᚦ",l:"Social Media"},{id:"gbp",r:"ᚨ",l:"Google Business"},{id:"adcopy",r:"ᚲ",l:"Ad Copy"},{id:"seo",r:"ᛏ",l:"SEO Content"},{id:"brand",r:"ᚱ",l:"Brand Voice"},{id:"email",r:"ᚢ",l:"Email Campaign"},{id:"review",r:"ᛟ",l:"Review Response"}];
  const c=prospects.find(p=>p.id===selClient);
  const generate=async()=>{
    setLoading(true);setOutput("");
    try{
      const biz=c?`${c.name}, a ${c.category} business in ${c.city} with ${c.rating} stars and ${c.reviews} reviews.`:customInput;
      if(!biz){toast("Select a client or enter business details.","error");setLoading(false);return;}
      let prompt="";
      if(tool==="social")prompt=`Generate a week of ${opts.platform} content for ${biz} Tone: ${opts.tone}. 7 posts Mon-Sun. Each: caption (2-3 sentences), 3-5 hashtags, best time to post.`;
      else if(tool==="gbp")prompt=`Create optimized Google Business Profile content for ${biz} Include: 1) Description (750 chars max), 2) 5 Google Posts ideas, 3) 10 Q&A pairs, 4) 5 attribute suggestions.`;
      else if(tool==="adcopy")prompt=`Write 3 ${opts.platform} ad variants for ${biz} Goal: ${opts.adGoal}. Each: headline (30 chars), primary text (125 chars), description (20 chars), CTA.`;
      else if(tool==="seo")prompt=`Write a ${opts.seoType} for ${biz} Make it genuinely useful with proper headings, meta description, and natural keyword usage.`;
      else if(tool==="brand")prompt=`Create a brand voice guide for ${biz} ${customInput?`Context: ${customInput}`:""} Include: voice in 3 words, tone description, 5 do/dont examples each, sample headline, sample post.`;
      else if(tool==="email")prompt=`Write an email newsletter for ${biz} ${customInput?`Goal: ${customInput}`:""} Include: 3 subject line options, preview text, opening hook, body (300 words), CTA.`;
      else if(tool==="review")prompt=`Write a professional response to this Google review for ${biz} Review: "${customInput||"Great service! Really happy with the work."}" 2 variants, 2-3 sentences each.`;
      else if(tool==="competitor")prompt=`Analyze this competitor: "${customInput||biz}". Cover: 1) What they do well (3 points), 2) Critical gaps (4 points), 3) How we can beat them with a better site (4 tactics), 4) Time to outrank them on Google. Be specific.`;
      else if(tool==="pricing")prompt=`You are a web design pricing consultant. Give specific pricing advice for a web designer pitching to ${biz}. Cover: 1) Recommended project price range for this specific business ($X-$Y), 2) What drives the price up or down for their industry, 3) Suggested payment structure (upfront/milestone/completion splits), 4) Monthly maintenance retainer recommendation, 5) Add-on services to upsell and their prices. Be specific with numbers.`;
      else if(tool==="casestudy")prompt=`Write a professional case study for a completed web design project. Business: ${biz}. ${customInput?`Additional context: ${customInput}`:'Assume the project was successful.'}. Include: The Challenge (what they needed), The Solution (what was built), Key Features (3-4 highlights), The Results (quantified outcomes like "40% more calls", "ranked #1 for plumber Austin"), and a Client Quote. Professional marketing copy.`;
      else if(tool==="voicemail")prompt=`Write 3 different voicemail scripts (15-20 seconds each) for a web designer calling ${biz}. Each one should have a different approach: 1) Curiosity-based (tease a problem you spotted), 2) Social proof (mention you work with similar businesses), 3) Direct value (state what you'll build for them). Include the callback number placeholder.`;
      else if(tool==="proposal2")prompt=`Write a concise 1-page web design proposal for ${biz}. ${customInput||''} Include: What We'll Build (3 bullet deliverables), Why Now (urgency/opportunity), Investment ($X), Timeline (X weeks), and a clear Next Step CTA. Keep it under 200 words total. Punchy and persuasive.`;
      else if(tool==="onboarding")prompt=`Write a warm welcome email for a new web design client: ${biz}. ${customInput||''} Include: enthusiastic opener, what happens next (3 clear steps), what you need from them, timeline expectations, your contact info placeholder, and a P.S. that builds excitement about the end result. Friendly but professional.`;
      else if(tool==="pressrelease")prompt=`Write a press release announcing the launch of a new website for ${biz}. ${customInput?`Details: ${customInput}`:''} Include: FOR IMMEDIATE RELEASE header, City/State dateline, compelling headline, 3 paragraphs (what launched, why it matters, business quote), boilerplate about the web design agency, and contact info placeholder. Wire service format.`;
      else if(tool==="signature")prompt=`Create a professional HTML email signature for a web designer at an agency. Business: ${biz}. ${customInput?`Additional info: ${customInput}.`:''} Include: name placeholder, title, agency name, phone, email, website URL, and a subtle color accent using hex ${brand?.primaryColor||'#c9a84c'}. Return the HTML only, no explanation.`;
      else if(tool==="bizcard")prompt=`Design a business card layout description for a web designer. Business: ${biz}. ${customInput?`Additional info: ${customInput}.`:''} Provide: front side layout (name, title, contact info, tagline), back side layout (QR code placeholder, services list, social handles), color recommendations, font suggestions, and key design notes. Format clearly with Front / Back sections.`;
      else if(tool==="bulk"){const names=prospects.slice(0,5).map(p=>p.name).join(', ');prompt=`Write personalized 2-sentence cold email openers for these businesses that need a website: ${names}. Reference each one's specific business type. Number them 1-5.`;}
      const result=await callClaude(prompt,1400);
      setOutput(result);toast("Content generated.","success");
    }catch(e){toast("Generation failed.","error");}
    setLoading(false);
  };
  const copy=()=>{navigator.clipboard.writeText(output);setCopied(true);setTimeout(()=>setCopied(false),2000);toast("Copied.","success");};
  return(
    <div>
      <div className="sh"><div><div className="sh-title">AI Studio</div><div className="sh-sub">Generate content for any client in seconds</div></div></div>
      <div className="studio-layout">
        <div className="studio-nav">{TOOLS.map(t=><div key={t.id} className={`studio-nav-item${tool===t.id?" on":""}`} onClick={()=>{setTool(t.id);setOutput("");}}>  <span className="studio-nav-r">{t.r}</span><span className="studio-nav-l">{t.l}</span></div>)}</div>
        <div className="studio-content">
          <div className="studio-form">
            <div className="tool-title">{TOOLS.find(t=>t.id===tool)?.l}</div>
            <div className="tool-sub">AI-powered content generation</div>
            <div className="field"><label>Client</label><select className="inp" value={selClient} onChange={e=>setSelClient(e.target.value)}><option value="">— Select or enter below —</option>{prospects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            {!selClient&&<div className="field"><label>{tool==="review"?"Paste the Review":"Business Details"}</label><textarea className="inp" rows={3} placeholder={tool==="review"?"Paste the Google review here…":"Business name, type, city…"} value={customInput} onChange={e=>setCustomInput(e.target.value)}/></div>}
            {tool==="social"&&<><div className="field"><label>Platform</label><div className="option-grid">{["Instagram","Facebook","LinkedIn","TikTok"].map(p=><div key={p} className={`opt-btn${opts.platform===p?" on":""}`} onClick={()=>setOpts(o=>({...o,platform:p}))}><div className="opt-btn-l">{p}</div></div>)}</div></div><div className="field"><label>Tone</label><div className="option-grid">{["Professional","Casual","Energetic","Trustworthy"].map(t=><div key={t} className={`opt-btn${opts.tone===t?" on":""}`} onClick={()=>setOpts(o=>({...o,tone:t}))}><div className="opt-btn-l">{t}</div></div>)}</div></div></>}
            {tool==="adcopy"&&<><div className="field"><label>Platform</label><div className="option-grid">{["Facebook","Instagram","Google","LinkedIn"].map(p=><div key={p} className={`opt-btn${opts.platform===p?" on":""}`} onClick={()=>setOpts(o=>({...o,platform:p}))}><div className="opt-btn-l">{p}</div></div>)}</div></div><div className="field"><label>Goal</label><div className="option-grid">{["Awareness","Leads","Traffic","Conversions"].map(g=><div key={g} className={`opt-btn${opts.adGoal===g?" on":""}`} onClick={()=>setOpts(o=>({...o,adGoal:g}))}><div className="opt-btn-l">{g}</div></div>)}</div></div></>}
            {tool==="seo"&&<div className="field"><label>Content Type</label><div className="option-grid">{["Blog Post","Meta Tags Only","Landing Page Copy","FAQ Section"].map(t=><div key={t} className={`opt-btn${opts.seoType===t?" on":""}`} onClick={()=>setOpts(o=>({...o,seoType:t}))}><div className="opt-btn-l" style={{fontSize:".68rem"}}>{t}</div></div>)}</div></div>}
            {(tool==="brand"||tool==="email")&&<div className="field"><label>Additional Context</label><textarea className="inp" rows={2} placeholder={tool==="email"?"Campaign goal…":"Existing tagline…"} value={customInput} onChange={e=>setCustomInput(e.target.value)}/></div>}
            {tool==="competitor"&&<div className="field"><label>Competitor URL or Name</label><textarea className="inp" rows={2} placeholder="Paste their URL or describe their business…" value={customInput} onChange={e=>setCustomInput(e.target.value)}/></div>}
            {(tool==="pricing"||tool==="casestudy"||tool==="pressrelease")&&<div className="field"><label>Additional Context (optional)</label><textarea className="inp" rows={2} placeholder="Project details, results, specific numbers…" value={customInput} onChange={e=>setCustomInput(e.target.value)}/></div>}
            {(tool==="signature"||tool==="bizcard")&&<div className="field"><label>Additional Details</label><textarea className="inp" rows={2} placeholder={tool==="signature"?"Your name, title, any specific details…":"Your name, specialties, social handles…"} value={customInput} onChange={e=>setCustomInput(e.target.value)}/></div>}
            {tool==="bulk"&&<p style={{fontSize:'.8rem',fontWeight:300,color:'#5a5868',lineHeight:1.7,marginBottom:10}}>Uses your top 5 CRM prospects automatically. Add prospects to CRM first to activate this.</p>}
            <button className="btn btn-gold btn-full" onClick={generate} disabled={loading||(!selClient&&!customInput)}>{loading?<><Spinner/>Generating…</>:"Generate Content →"}</button>
          </div>
          <div className="studio-output">
            {!output&&!loading&&<div className="empty"><div className="empty-rune">ᚠ</div><div className="empty-title">Ready to generate</div><div className="empty-sub">Select a client and hit Generate.</div></div>}
            {loading&&<div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14}}><Spinner lg/><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".62rem",letterSpacing:"2px",color:"#2e2d3c",textTransform:"uppercase"}}>Generating content…</div></div>}
            {output&&!loading&&(<><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".56rem",letterSpacing:"2px",color:"#2e2d3c",textTransform:"uppercase",marginBottom:12}}>Generated Content</div><div className="studio-out-body"><div style={{fontFamily:"'DM Sans',sans-serif",fontSize:".9rem",fontWeight:300,color:"#c9b87a",lineHeight:1.95,whiteSpace:"pre-wrap",letterSpacing:".3px"}}>{output}</div></div><div className="studio-copy-row"><button className="btn btn-ghost btn-sm" onClick={copy}>{copied?"Copied ✓":"Copy All"}</button></div></>)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MARKETPLACE ────────────────────────────────────────────────────────────
function MarketplacePage({toast}){
  const[tab,setTab]=useState("browse");
  const[catFilter,setCatFilter]=useState("All");
  const[searchQ,setSearchQ]=useState("");
  const[purchased,setPurchased]=useState(new Set());
  const[libraryTemplate,setLibraryTemplate]=useState(null);
  const[myTemplates,setMyTemplates]=useState([]);
  const[previewTmpl,setPreviewTmpl]=useState(null);
  const[newTmpl,setNewTmpl]=useState({name:"",cat:"",desc:"",price:"",html:""});
  const CATS=["All","Agricultural","Auto & Transportation","Automotive Specialty","Beauty & Salon","Childcare & Nanny","Cleaning (Commercial)","Education & Kids","Electrical","Events & Entertainment","Fashion & Clothing","Fitness & Sports","Food Production","Funeral & Memorial","HVAC","Health & Wellness","Home Renovation","Home Services","Hospitality","IT & Computer Repair","Interior Decoration","Marine Services","Medical Specialists","Mental Health","Music & Audio","Nonprofit & Community","Personal Development","Pet Services","Photography & Creative","Plumbing","Professional Services","Real Estate","Religious Organizations","Restaurant","Retail & Shops","Roofing","Senior Care","Spa & Relaxation","Sports Coaching","Tech & Digital","Travel & Tourism","Wedding Services"];
  const filtered=MOCK_TEMPLATES.filter(t=>(catFilter==="All"||t.cat===catFilter)&&(searchQ===""||t.name.toLowerCase().includes(searchQ.toLowerCase())||t.cat.toLowerCase().includes(searchQ.toLowerCase())));
  const buy=t=>{setPurchased(prev=>new Set([...prev,t.id]));toast(`${t.name} purchased for $${t.price}.`,"success");};
  const submitTemplate=()=>{if(!newTmpl.name||!newTmpl.cat||!newTmpl.price){toast("Fill in all fields.","error");return;}setMyTemplates(prev=>[...prev,{...newTmpl,id:uid(),rating:0,reviews:0,seller:"You",createdAt:now(),sales:0}]);setNewTmpl({name:"",cat:"",desc:"",price:"",html:""});toast("Template submitted.","success");};
  return(
    <div>
      <div className="sh"><div><div className="sh-title">Marketplace</div><div className="sh-sub">Buy and sell premium templates</div></div><div className="sh-right">{["browse","sell","earnings"].map(t=><button key={t} className={`btn btn-ghost btn-sm${tab===t?" btn-outline-gold":""}`} onClick={()=>setTab(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>)}</div></div>
      {tab==="browse"&&<div className="mkt-layout"><div className="mkt-sidebar"><input className="inp" placeholder="Search templates…" value={searchQ} onChange={e=>setSearchQ(e.target.value)} style={{marginBottom:12}}/><div className="mkt-filter-title">Category</div>{CATS.map(c=><button key={c} className={`mkt-filter-btn${catFilter===c?" on":""}`} onClick={()=>setCatFilter(c)}>{c}</button>)}</div><div className="mkt-content"><div className="tmpl-grid">{filtered.map(t=><div key={t.id} className="tmpl-card"><div className="tmpl-preview" style={{background:`linear-gradient(135deg, ${t.colors[0]} 0%, ${t.colors[1]}33 100%)`}}>{t.featured&&<span style={{position:"absolute",top:8,left:8}} className="badge b-gold">Featured</span>}<span className="tmpl-preview-txt">{t.name[0]}</span></div><div className="tmpl-info"><div className="tmpl-name">{t.name}</div><div className="tmpl-cat">{t.cat}</div><div style={{fontSize:".74rem",fontWeight:300,color:"#4a4858",lineHeight:1.55,marginBottom:8}}>{t.desc}</div><div className="tmpl-meta"><div className="tmpl-price">${t.price}</div><div className="tmpl-rating">★ {t.rating} ({t.reviews})</div></div><div className="tmpl-seller">by {t.seller}</div><div className="tmpl-actions"><button className="btn btn-ghost btn-xs" onClick={()=>setPreviewTmpl(t)}>Preview</button>{purchased.has(t.id)?<span className="badge b-green" style={{padding:"4px 10px"}}>Purchased</span>:<button className="btn btn-gold btn-xs" onClick={()=>buy(t)}>Buy ${t.price}</button>}</div></div></div>)}</div></div></div>}
      {tab==="__disabled_library"&&(
        <div>
          {[...Array.from(purchased).map(id=>MOCK_TEMPLATES.find(t=>t.id===id)).filter(Boolean),...(libraryTemplate?[libraryTemplate]:[])].length===0?(
            <div className="empty">
              <div className="empty-rune">ᚢ</div>
              <div className="empty-title">Your library is empty</div>
              <div className="empty-sub">Browse templates and click "Save to Library" or buy a template to add it here.</div>
              <button className="btn btn-gold btn-sm" onClick={()=>setTab('browse')}>Browse Templates →</button>
            </div>
          ):(
            <div className="tmpl-grid">
              {[...Array.from(purchased).map(id=>MOCK_TEMPLATES.find(t=>t.id===id)).filter(Boolean),...(libraryTemplate?[libraryTemplate]:[])].map((t,i)=>(
                <div key={i} className="tmpl-card">
                  <div className="tmpl-preview" style={{background:`linear-gradient(135deg, ${t.colors[0]} 0%, ${t.colors[1]}33 100%)`}}>
                    <span className="tmpl-preview-txt">{t.name[0]}</span>
                  </div>
                  <div className="tmpl-info">
                    <div className="tmpl-name">{t.name}</div>
                    <div className="tmpl-cat">{t.cat}</div>
                    <div style={{fontSize:".74rem",fontWeight:300,color:"#4a4858",lineHeight:1.55,marginBottom:8}}>{t.desc}</div>
                    <div className="tmpl-actions">
                      <button className="btn btn-gold btn-sm" onClick={()=>{
                        toast(`Opening Site Builder with ${t.name}…`,'info');
                        setTimeout(()=>{
                          // Navigate to site builder with template info
                        },500);
                      }}>Use in Site Builder →</button>
                    </div>
                  </div>
                  {/* Modal-style confirmation overlay would appear here */}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {tab==="sell"&&<div className="sell-form"><div className="card-title" style={{marginBottom:4}}>Submit a Template</div><div className="card-sub" style={{marginBottom:16}}>You earn 80% of every sale</div><div className="field"><label>Template Name</label><input className="inp" placeholder="ProContractor" value={newTmpl.name} onChange={e=>setNewTmpl(p=>({...p,name:e.target.value}))}/></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><div className="field"><label>Category</label><select className="inp" value={newTmpl.cat} onChange={e=>setNewTmpl(p=>({...p,cat:e.target.value}))}><option value="">— Select —</option>{CATS.filter(c=>c!=="All").map(c=><option key={c} value={c}>{c}</option>)}</select></div><div className="field"><label>Price ($)</label><input className="inp" type="number" placeholder="49" value={newTmpl.price} onChange={e=>setNewTmpl(p=>({...p,price:e.target.value}))}/></div></div><div className="field"><label>Description</label><textarea className="inp" rows={2} value={newTmpl.desc} onChange={e=>setNewTmpl(p=>({...p,desc:e.target.value}))}/></div><div className="field"><label>HTML Code</label><textarea className="inp" rows={4} placeholder="Paste your full HTML here…" value={newTmpl.html} onChange={e=>setNewTmpl(p=>({...p,html:e.target.value}))}/></div><button className="btn btn-gold btn-full" onClick={submitTemplate}>Submit Template</button></div>}
      {tab==="earnings"&&<div><div className="earnings-grid">{[{n:`$${myTemplates.reduce((a,t)=>a+(t.sales||0)*Number(t.price)*.8,0).toFixed(2)}`,l:"Total Earnings"},{n:myTemplates.length,l:"Templates Listed"},{n:"80%",l:"Revenue Share"},{n:purchased.size,l:"Purchased"},{n:`$${MOCK_TEMPLATES.filter(t=>purchased.has(t.id)).reduce((a,t)=>a+t.price,0)}`,l:"Total Spent"},{n:"0",l:"Sales This Month"}].map((e,i)=><div key={i} className="earn-card"><div className="earn-n">{e.n}</div><div className="earn-l">{e.l}</div></div>)}</div></div>}
              {previewTmpl&&(
          <div className="modal-bg" onClick={()=>setPreviewTmpl(null)}>
            <div style={{background:"#0d0d18",border:"1px solid rgba(201,168,76,.2)",width:"min(760px,92vw)",maxHeight:"88vh",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
              {/* Header */}
              <div style={{padding:"16px 20px",borderBottom:"1px solid rgba(201,168,76,.08)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
                <div>
                  <div style={{fontFamily:"'Cinzel',serif",fontSize:"1rem",fontWeight:700,color:"#ddd8ce"}}>{previewTmpl.name}</div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".56rem",letterSpacing:"2px",color:"#3a3848",textTransform:"uppercase",marginTop:3}}>{previewTmpl.cat} · by {previewTmpl.seller}</div>
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <div style={{fontFamily:"'Cinzel',serif",fontSize:"1.3rem",fontWeight:700,color:"#c9a84c"}}>${previewTmpl.price}</div>
                  {!purchased.has(previewTmpl.id)
                    ?<button className="btn btn-gold btn-sm" onClick={()=>{buy(previewTmpl);setPreviewTmpl(null);}}>Buy & Save</button>
                    :<span className="badge b-green" style={{padding:"5px 12px"}}>✦ Purchased</span>}
                  <button className="btn btn-ghost btn-sm" onClick={()=>setPreviewTmpl(null)}>✕</button>
                </div>
              </div>
              {/* Body - two columns */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",flex:1,overflow:"auto",minHeight:0}}>
                {/* Left: visual mockup in template colors */}
                <div style={{background:previewTmpl.colors[0],padding:24,display:"flex",flexDirection:"column",gap:10}}>
                  {/* Mock nav */}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <div style={{width:60,height:6,background:previewTmpl.colors[1],borderRadius:3,opacity:.8}}/>
                    <div style={{display:"flex",gap:6}}>{[1,2,3].map(i=><div key={i} style={{width:24,height:4,background:previewTmpl.colors[1],borderRadius:2,opacity:.4}}/>)}</div>
                  </div>
                  {/* Mock hero */}
                  <div style={{background:`${previewTmpl.colors[1]}18`,border:`1px solid ${previewTmpl.colors[1]}30`,padding:16,borderRadius:2}}>
                    <div style={{width:"70%",height:8,background:previewTmpl.colors[1],borderRadius:2,opacity:.8,marginBottom:8}}/>
                    <div style={{width:"50%",height:5,background:previewTmpl.colors[1],borderRadius:2,opacity:.4,marginBottom:6}}/>
                    <div style={{width:"50%",height:5,background:previewTmpl.colors[1],borderRadius:2,opacity:.3,marginBottom:12}}/>
                    <div style={{width:80,height:24,background:previewTmpl.colors[1],borderRadius:2,opacity:.7}}/>
                  </div>
                  {/* Mock services grid */}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                    {[1,2,3].map(i=><div key={i} style={{background:`${previewTmpl.colors[1]}12`,border:`1px solid ${previewTmpl.colors[1]}20`,padding:8,borderRadius:2}}>
                      <div style={{width:"60%",height:4,background:previewTmpl.colors[1],opacity:.5,marginBottom:4,borderRadius:1}}/>
                      <div style={{width:"80%",height:3,background:previewTmpl.colors[1],opacity:.25,borderRadius:1}}/>
                    </div>)}
                  </div>
                  {/* Mock reviews */}
                  <div style={{background:`${previewTmpl.colors[1]}10`,padding:10,borderRadius:2}}>
                    <div style={{color:previewTmpl.colors[1],fontSize:".7rem",marginBottom:4,opacity:.7}}>★★★★★</div>
                    <div style={{width:"90%",height:3,background:previewTmpl.colors[1],opacity:.2,borderRadius:1,marginBottom:3}}/>
                    <div style={{width:"70%",height:3,background:previewTmpl.colors[1],opacity:.15,borderRadius:1}}/>
                  </div>
                  {/* Mock contact */}
                  <div style={{height:32,background:`${previewTmpl.colors[1]}15`,border:`1px solid ${previewTmpl.colors[1]}25`,borderRadius:2,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <div style={{width:70,height:5,background:previewTmpl.colors[1],opacity:.4,borderRadius:1}}/>
                  </div>
                </div>
                {/* Right: details */}
                <div style={{padding:24,overflowY:"auto"}}>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".56rem",letterSpacing:"2px",textTransform:"uppercase",color:"#3a3848",marginBottom:8}}>About this template</div>
                  <p style={{fontSize:".84rem",fontWeight:300,color:"#9a96a2",lineHeight:1.85,marginBottom:18}}>{previewTmpl.desc}</p>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".56rem",letterSpacing:"2px",textTransform:"uppercase",color:"#3a3848",marginBottom:8}}>Color Palette</div>
                  <div style={{display:"flex",gap:6,marginBottom:18}}>
                    {previewTmpl.colors.map((c,i)=>(
                      <div key={i} style={{flex:1,height:32,background:c,border:"1px solid rgba(255,255,255,.1)",position:"relative"}}>
                        <div style={{position:"absolute",bottom:2,left:0,right:0,textAlign:"center",fontSize:"8px",color:"rgba(255,255,255,.5)",fontFamily:"monospace"}}>{c}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".56rem",letterSpacing:"2px",textTransform:"uppercase",color:"#3a3848",marginBottom:8}}>Rating</div>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
                    <span style={{fontFamily:"'Cinzel',serif",fontSize:"1.2rem",fontWeight:700,color:"#c9a84c"}}>{previewTmpl.rating}</span>
                    <span style={{color:"#c9a84c",letterSpacing:"3px",fontSize:".8rem"}}>{"★".repeat(5)}</span>
                    <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".56rem",color:"#3a3848"}}>({previewTmpl.reviews} reviews)</span>
                  </div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".56rem",letterSpacing:"2px",textTransform:"uppercase",color:"#3a3848",marginBottom:8}}>Includes</div>
                  <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:20}}>
                    {["Hero section with CTA","Services/features grid","Reviews and testimonials","Contact form","Mobile responsive","SEO meta tags","Fast load time"].map((f,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:8,fontSize:".78rem",fontWeight:300,color:"#5a5868"}}>
                        <span style={{color:"#c9a84c",fontFamily:"'Cinzel',serif"}}>ᚱ</span>{f}
                      </div>
                    ))}
                  </div>
                  {purchased.has(previewTmpl.id)?(
                    <button className="btn btn-gold btn-full" onClick={()=>setPreviewTmpl(null)}>✦ Already Purchased — In Your Library</button>
                  ):(
                    <button className="btn btn-gold btn-full" onClick={()=>{buy(previewTmpl);setPreviewTmpl(null);}}>Buy for ${previewTmpl.price} →</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

// ── SETTINGS ───────────────────────────────────────────────────────────────
function SettingsPage({user,onUpdateUser,toast,setProspects,setPitches,setProposals,setInvoices}){
  const[notifEmail,setNotifEmail]=useState(true);
  const[notifBrowser,setNotifBrowser]=useState(true);
  const[compactMode,setCompactMode]=useState(false);
  const[scanCity,setScanCity]=useState('');
  const[scanBiz,setScanBiz]=useState('');
  const[name,setName]=useState(user?.name||"");
  const[email,setEmail]=useState(user?.email||"");
  const[keys,setKeys]=useState({github:"",netlify:"",stripe:"",namecheap:""});
  const[autoRedirect,setAutoRedirect]=useState(false);
  const[demoCode,setDemoCode]=useState('');
  const[demoUnlocked,setDemoUnlocked]=useState(false);
  const[demoCodeMsg,setDemoCodeMsg]=useState('');
  const[devCode,setDevCode]=useState('');
  const[devUnlocked,setDevUnlocked]=useState(false);
  const[devScanCity,setDevScanCity]=useState('');
  const[devScanBiz,setDevScanBiz]=useState('');
  const[devScanCount,setDevScanCount]=useState('10');
  useEffect(()=>{
    window.storage.get("rs3_autoredirect").then(r=>{if(r)setAutoRedirect(JSON.parse(r.value));}).catch(()=>{});
    window.storage.get("rs3_github_key").then(r=>{if(r)setKeys(k=>({...k,github:r.value}));}).catch(()=>{});
    window.storage.get("rs3_netlify_key").then(r=>{if(r)setKeys(k=>({...k,netlify:r.value}));}).catch(()=>{});
    window.storage.get("rs3_stripe_key").then(r=>{if(r)setKeys(k=>({...k,stripe:r.value}));}).catch(()=>{});
  },[]);
  const toggleAutoRedirect=async val=>{setAutoRedirect(val);try{await window.storage.set("rs3_autoredirect",JSON.stringify(val));}catch(e){}toast(val?"Next open goes straight to Dashboard.":"Next open shows Landing page first.","info");};
  const saveProfile=()=>{onUpdateUser({...user,name,email});toast("Profile updated.","success");};
  const saveKeys=async()=>{try{if(keys.github)await window.storage.set("rs3_github_key",keys.github);if(keys.netlify)await window.storage.set("rs3_netlify_key",keys.netlify);if(keys.stripe)await window.storage.set("rs3_stripe_key",keys.stripe);}catch(e){}toast("API keys saved.","success");};
  return(
    <div>
      <div className="sh"><div><div className="sh-title">Settings</div><div className="sh-sub">Profile, preferences, and API keys</div></div></div>
      <div className="settings-grid">
        <div className="settings-card">
          <div className="settings-card-title">Profile</div>
          <div className="settings-card-sub">Your personal details</div>
          <div className="field"><label>Name</label><input className="inp" value={name} onChange={e=>setName(e.target.value)}/></div>
          <div className="field"><label>Email</label><input className="inp" type="email" value={email} onChange={e=>setEmail(e.target.value)}/></div>
          <button className="btn btn-gold btn-sm" onClick={saveProfile}>Save Changes</button>
        </div>
        <div className="settings-card">
          <div className="settings-card-title">Preferences</div>
          <div className="settings-card-sub">Startup behavior</div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 0",borderBottom:"1px solid rgba(201,168,76,.07)"}}>
            <div><div style={{fontFamily:"'Cinzel',serif",fontSize:".85rem",fontWeight:600,color:"#ddd8ce",marginBottom:3}}>Go straight to Dashboard</div><div style={{fontSize:".74rem",fontWeight:300,color:"#3a3848",lineHeight:1.5}}>Skip the landing page on open.</div></div>
            <div onClick={()=>toggleAutoRedirect(!autoRedirect)} style={{width:44,height:24,background:autoRedirect?"#c9a84c":"rgba(201,168,76,.12)",border:"1px solid rgba(201,168,76,.2)",cursor:"pointer",position:"relative",transition:"background .2s",flexShrink:0}}><div style={{position:"absolute",top:3,left:autoRedirect?22:3,width:16,height:16,background:autoRedirect?"#07070e":"rgba(201,168,76,.4)",transition:"left .2s"}}/></div>
          </div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 0"}}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:".85rem",color:"#ddd8ce"}}>Current Startup</div>
            <span className={`badge ${autoRedirect?"b-green":"b-gold"}`}>{autoRedirect?"Dashboard First":"Landing First"}</span>
          </div>
          <div style={{marginTop:4}}><div style={{fontFamily:"'Cinzel',serif",fontSize:".85rem",fontWeight:600,color:"#ddd8ce",marginBottom:8}}>Current Plan</div><div style={{display:"inline-flex",alignItems:"center",gap:10,background:"rgba(201,168,76,.08)",border:"1px solid rgba(201,168,76,.15)",padding:"10px 16px",marginBottom:10}}><div><div style={{fontFamily:"'Cinzel',serif",fontSize:"1rem",fontWeight:700,color:"#c9a84c"}}>Apprentice</div><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".6rem",letterSpacing:"2px",textTransform:"uppercase",color:"#5a5868"}}>Free</div></div></div><br/><button className="btn btn-gold btn-sm">Upgrade Plan →</button></div>
        </div>
        <div className="settings-card" style={{gridColumn:"span 2"}}>
          <div className="settings-card-title">API Keys</div>
          <div className="settings-card-sub">Connect integrations — paste keys when ready</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {[{key:"github",label:"GitHub Personal Access Token",placeholder:"ghp_xxxxxxxxxxxx"},{key:"netlify",label:"Netlify Access Token",placeholder:"nfp_xxxxxxxxxxxx"},{key:"stripe",label:"Stripe Secret Key",placeholder:"sk_live_xxxxxxxxxxxx"},{key:"namecheap",label:"Namecheap API Key",placeholder:"xxxxxxxxxxxx"}].map(k=>(
              <div key={k.key} className="field" style={{margin:0}}>
                <label>{k.label}</label>
                <input className="inp" type="password" placeholder={k.placeholder} value={keys[k.key]} onChange={e=>setKeys(prev=>({...prev,[k.key]:e.target.value}))}/>
              </div>
            ))}
          </div>
          <div style={{marginTop:12,display:"flex",gap:8,alignItems:"center"}}>
            <button className="btn btn-gold btn-sm" onClick={saveKeys}>Save Keys</button>
            <p style={{fontSize:".72rem",fontWeight:300,color:"#3a3848",lineHeight:1.6,maxWidth:400}}>GitHub key enables one-click deploy from Site Builder. Add yours to activate it.</p>
          </div>
        {/* NOTIFICATIONS */}
        <div className="settings-card" style={{gridColumn:'span 2'}}>
          <div className="settings-card-title">Notifications</div>
          <div className="settings-card-sub" style={{marginBottom:12}}>Control what alerts you receive</div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {[
              {l:'Email me when a prospect is marked Active',v:notifEmail,s:setNotifEmail},
              {l:'Browser notifications for new pitch generation',v:notifBrowser,s:setNotifBrowser},
            ].map((n,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid rgba(201,168,76,.04)'}}>
                <span style={{fontSize:'.82rem',fontWeight:300,color:'#7a7888'}}>{n.l}</span>
                <button onClick={()=>n.s(!n.v)} style={{width:40,height:22,borderRadius:11,background:n.v?'#c9a84c':'#1a1a28',border:'none',cursor:'pointer',position:'relative',transition:'background .2s'}}>
                  <span style={{position:'absolute',top:3,left:n.v?20:3,width:16,height:16,borderRadius:'50%',background:'#fff',transition:'left .2s',display:'block'}}/>
                </button>
              </div>
            ))}
          </div>
        </div>
        {/* DEFAULT SCAN SETTINGS */}
        <div className="settings-card">
          <div className="settings-card-title">Default Scan Settings</div>
          <div className="settings-card-sub" style={{marginBottom:12}}>Pre-fill the scanner with your preferred city and business type</div>
          <div className="field"><label>Default City</label><input className="inp" placeholder="Charlotte, NC" value={scanCity} onChange={e=>setScanCity(e.target.value)}/></div>
          <div className="field"><label>Default Business Type</label><input className="inp" placeholder="HVAC, plumbing, landscaping…" value={scanBiz} onChange={e=>setScanBiz(e.target.value)}/></div>
          <button className="btn btn-gold btn-sm" onClick={()=>{window.storage.set('rs3_default_city',scanCity);window.storage.set('rs3_default_biz',scanBiz);toast('Default scan settings saved.','success');}}>Save Defaults</button>
        </div>
        <div style={{gridColumn:'span 2',fontFamily:"'JetBrains Mono',monospace",fontSize:'.54rem',letterSpacing:'3px',textTransform:'uppercase',color:'rgba(201,168,76,.3)',padding:'12px 0 4px',display:'flex',alignItems:'center',gap:12}}>// DEVELOPER TOOLS <span style={{flex:1,height:1,background:'rgba(201,168,76,.06)',display:'block'}}/></div>
          <div className="settings-card" style={{gridColumn:'span 2',borderColor:demoUnlocked?'rgba(201,168,76,.25)':'rgba(201,168,76,.08)'}}>
          <div className="settings-card-title">Developer Tools</div>
          <div className="settings-card-sub">Enter the access code to unlock demo mode</div>
          {!demoUnlocked?(
            <div style={{display:'flex',gap:10,alignItems:'flex-end',marginTop:8}}>
              <div className="field" style={{margin:0,flex:1}}>
                <label>Access Code</label>
                <input className="inp" type="password" placeholder="Enter code to unlock developer tools…" value={demoCode} onChange={e=>setDemoCode(e.target.value)} onKeyDown={e=>{
                  if(e.key==='Enter'){
                    if(demoCode==='Rumo!'){setDemoUnlocked(true);setDemoCodeMsg('');toast('Developer tools unlocked.','success');}
                    else{setDemoCodeMsg('Incorrect code.');setTimeout(()=>setDemoCodeMsg(''),2000);}
                  }
                }}/>
                {demoCodeMsg&&<div style={{fontSize:'.72rem',color:'#e07878',marginTop:4}}>{demoCodeMsg}</div>}
              </div>
              <button className="btn btn-gold" style={{height:38}} onClick={()=>{
                if(demoCode==='Rumo!'){setDemoUnlocked(true);setDemoCodeMsg('');toast('Developer tools unlocked.','success');}
                else{setDemoCodeMsg('Incorrect code.');setTimeout(()=>setDemoCodeMsg(''),2000);}
              }}>Unlock</button>
            </div>
          ):(
            <div style={{marginTop:8}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12,padding:'8px 12px',background:'rgba(201,168,76,.07)',border:'1px solid rgba(201,168,76,.15)'}}>
                <span style={{fontFamily:"'Cinzel',serif",color:'#c9a84c',fontSize:'1rem'}}>✦</span>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.6rem',letterSpacing:'2px',textTransform:'uppercase',color:'#c9a84c'}}>Developer Tools Unlocked</span>
              </div>
              <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                <button className="btn btn-gold btn-sm" onClick={()=>{
                  if(typeof DEMO_PROSPECTS!=='undefined'){
                    setProspects&&setProspects(DEMO_PROSPECTS);
                    toast('Demo data loaded. Check Dashboard.','success');
                  }
                }}>Load Demo Data</button>
                <button className="btn btn-ghost btn-sm" onClick={()=>{
                  setProspects&&setProspects([]);
                  setPitches&&setPitches([]);
                  setProposals&&setProposals([]);
                  setInvoices&&setInvoices([]);
                  toast('Demo data cleared.','info');
                }}>Clear Demo Data</button>
                <button className="btn btn-ghost btn-sm" onClick={()=>{setDemoUnlocked(false);setDemoCode('');}}>Lock Tools</button>
              </div>
              <p style={{fontSize:'.72rem',fontWeight:300,color:'#3a3848',lineHeight:1.6,marginTop:8}}>Demo data loads realistic prospects, pitches, proposals, and invoices for presentation and testing purposes. Clear it before going live with real clients.</p>
            </div>
          )}
        </div>
        </div>

        {/* ── DEVELOPER TOOLS ── */}
        <div style={{gridColumn:'span 2',marginTop:16,padding:'20px',background:'rgba(201,168,76,.04)',border:'2px solid rgba(201,168,76,.15)'}}>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:'1rem',fontWeight:700,color:'#c9a84c',marginBottom:4,display:'flex',alignItems:'center',gap:10}}>
            ᚱ Developer Tools
            {devUnlocked&&<span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.56rem',letterSpacing:'2px',textTransform:'uppercase',color:'#7ac89a',padding:'2px 8px',border:'1px solid #7ac89a30',background:'rgba(122,200,154,.08)'}}>UNLOCKED</span>}
          </div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.6rem',color:'#3a3848',letterSpacing:'1px',marginBottom:16}}>Access code required · For testing and demo use only</div>
          {!devUnlocked?(
            <div style={{display:'flex',gap:10,alignItems:'flex-end'}}>
              <div className="field" style={{margin:0,flex:1}}>
                <label>Access Code</label>
                <input className="inp" type="password" placeholder="Enter access code…" value={devCode} onChange={e=>setDevCode(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){if(devCode==='Rumo!'){setDevUnlocked(true);toast('Developer tools unlocked.','success');}else toast('Incorrect code.','error');}}}/>
              </div>
              <button className="btn btn-gold" style={{height:38,flexShrink:0,minWidth:80}} onClick={()=>{if(devCode==='Rumo!'){setDevUnlocked(true);toast('Developer tools unlocked.','success');}else toast('Incorrect code.','error');}}>Unlock</button>
            </div>
          ):(
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              {/* Demo Data */}
              <div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.56rem',letterSpacing:'2px',textTransform:'uppercase',color:'#3a3848',marginBottom:8}}>Demo Data</div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  <button className="btn btn-gold btn-sm" onClick={()=>{if(typeof DEMO_PROSPECTS!=='undefined'){setProspects(DEMO_PROSPECTS);setPitches(DEMO_PITCHES||[]);setProposals(DEMO_PROPOSALS||[]);setInvoices(DEMO_INVOICES||[]);toast('Demo data loaded! Check Dashboard.','success');}else toast('Demo data unavailable.','error');}}>Load Demo Data</button>
                  <button className="btn btn-ghost btn-sm" onClick={()=>{setProspects([]);setPitches([]);setProposals([]);setInvoices([]);toast('All data cleared.','info');}}>Clear All Data</button>
                </div>
              </div>
              {/* Mock API */}
              <div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.56rem',letterSpacing:'2px',textTransform:'uppercase',color:'#3a3848',marginBottom:8}}>AI Mode</div>
                <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
                  <button className={`btn btn-sm ${window.MOCK_MODE?'btn-gold':'btn-ghost'}`} onClick={()=>{window.MOCK_MODE=!window.MOCK_MODE;toast(window.MOCK_MODE?'Mock API ON — no credits used.':'Mock API OFF — real Claude responses.','info');}}>
                    {typeof window!=='undefined'&&window.MOCK_MODE?'✦ Mock API ON':'Mock API OFF'}
                  </button>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.58rem',color:'#3a3848',flex:1}}>When ON, all AI features return instant fake responses. Zero credits used. Great for demos.</span>
                </div>
              </div>
              {/* Scanner Settings */}
              <div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.56rem',letterSpacing:'2px',textTransform:'uppercase',color:'#3a3848',marginBottom:8}}>Scanner Defaults</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <div className="field" style={{margin:0}}>
                    <label>Default City</label>
                    <input className="inp" placeholder="Charlotte, NC" value={devScanCity} onChange={e=>setDevScanCity(e.target.value)}/>
                  </div>
                  <div className="field" style={{margin:0}}>
                    <label>Default Business Type</label>
                    <input className="inp" placeholder="HVAC, plumbing…" value={devScanBiz} onChange={e=>setDevScanBiz(e.target.value)}/>
                  </div>
                </div>
                <div className="field" style={{marginTop:8,marginBottom:0}}>
                  <label>Default Result Count</label>
                  <select className="inp" value={devScanCount} onChange={e=>setDevScanCount(e.target.value)}>
                    <option value="5">5 results</option>
                    <option value="10">10 results</option>
                    <option value="15">15 results</option>
                    <option value="20">20 results (max)</option>
                  </select>
                </div>
                <button className="btn btn-ghost btn-sm" style={{marginTop:8}} onClick={()=>{window.storage.set('rs3_dev_city',devScanCity);window.storage.set('rs3_dev_biz',devScanBiz);window.storage.set('rs3_dev_count',devScanCount);toast('Scanner defaults saved.','success');}}>Save Scanner Defaults</button>
              </div>
              {/* System */}
              <div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.56rem',letterSpacing:'2px',textTransform:'uppercase',color:'#3a3848',marginBottom:8}}>System</div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  <button className="btn btn-ghost btn-sm" onClick={()=>{const d={prospects,pitches,proposals,invoices,exportedAt:new Date().toISOString()};const blob=new Blob([JSON.stringify(d,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='runescript-backup.json';a.click();toast('Full backup downloaded.','success');}}>Export Backup</button>
                  <button className="btn btn-ghost btn-sm" onClick={()=>{try{localStorage.clear();}catch(e){}toast('Storage cleared. Reloading…','info');setTimeout(()=>window.location.reload(),1000);}}>Clear Storage</button>
                  <button className="btn btn-ghost btn-sm" onClick={()=>window.location.reload()}>Force Reload</button>
                  <button className="btn btn-ghost btn-sm" onClick={()=>setDevUnlocked(false)}>Lock Tools</button>
                </div>
              </div>
              <p style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.56rem',color:'#2e2d3c',letterSpacing:'1px',lineHeight:1.6}}>// These tools are for development and testing only. Clear demo data before sharing with real clients.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}


// ── MOBILE NAV ─────────────────────────────────────────────────────────────
function MobileNav({page, setPage, user, onLogout}) {
  const [open, setOpen] = useState(false);
  const nav=[
    {id:'dashboard',r:'ᛟ',l:'Dashboard'},
    {id:'scanner',r:'ᚦ',l:'Prospect Scanner'},
    {id:'crm',r:'ᚨ',l:'CRM'},
    {id:'pitch',r:'ᚲ',l:'Pitch Generator'},
    {id:'builder',r:'ᛏ',l:'Site Builder'},
    {id:'agency',r:'ᚱ',l:'Agency OS'},
    {id:'studio',r:'ᚠ',l:'AI Studio'},
    {id:'marketplace',r:'ᚢ',l:'Marketplace'},
    {id:'library',r:'ᚹ',l:'Template Library'},
    {id:'domains',r:'ᛜ',l:'Domains'},
    {id:'creator',r:'ᚷ',l:'Creator Program'},
    {id:'help',r:'ᚾ',l:'Help Center'},
    {id:'branding',r:'ᚿ',l:'Agency Branding'},
    {id:'activity',r:'ᚰ',l:'Activity Log'},
    {id:'import',r:'ᚱ',l:'Import & Export'},
    {id:'roadmap',r:'ᛁ',l:'Roadmap'},
    {id:'affiliate',r:'ᛃ',l:'Affiliate Program'},
    {id:'sequence',r:'ᛇ',l:'Email Sequences'},
    {id:'changelog',r:'ᚻ',l:"What's New"},
    {id:'rules',r:'ᚼ',l:'Rules & Terms'},
    {id:'settings',r:'ᚽ',l:'Settings'},
  ];
  const go = (id) => { setPage(id); setOpen(false); playClick(); };
  return (
    <>
      <div className="mobile-nav-bar">
        <div className="mobile-logo"><span className="mobile-logo-g">ᚱ</span>RUNE SCRIPT</div>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.6rem',letterSpacing:'2px',color:'#3a3848',textTransform:'uppercase'}}>{page}</div>
        <button className="hamburger" onClick={()=>setOpen(true)}>
          <span/><span/><span/>
        </button>
      </div>
      {open && (
        <div className="mobile-menu">
          <div className="mobile-menu-header">
            <div className="mobile-logo"><span className="mobile-logo-g">ᚱ</span>RUNE SCRIPT</div>
            <button className="mobile-menu-close" onClick={()=>setOpen(false)}>✕</button>
          </div>
          {nav.map(n=>(
            <div key={n.id} className="mobile-nav-item" onClick={()=>go(n.id)}>
              <span className="mobile-nav-rune">{n.r}</span>
              <span className="mobile-nav-label">{n.l}</span>
            </div>
          ))}
          <div style={{marginTop:'auto',paddingTop:16,borderTop:'1px solid rgba(201,168,76,.06)',display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:28,height:28,background:'rgba(201,168,76,.1)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Cinzel',serif",fontSize:'.72rem',color:'#c9a84c'}}>{(user?.name||'?')[0].toUpperCase()}</div>
            <span style={{fontSize:'.78rem',color:'#6a6878',flex:1}}>{user?.name}</span>
            <button className="btn btn-ghost btn-sm" onClick={()=>{onLogout();setOpen(false);}}>Sign Out</button>
          </div>
        </div>
      )}
    </>
  );
}

// ── DOMAIN PAGE ─────────────────────────────────────────────────────────────
function DomainsPage({toast}) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [owned, setOwned] = useState([]);
  const [tab, setTab] = useState('search');
  const [transferDomain, setTransferDomain] = useState('');
  const [transferCode, setTransferCode] = useState('');
  const [dnsRecords, setDnsRecords] = useState([
    {type:'A', name:'@', value:'76.76.21.21', ttl:'Auto'},
    {type:'CNAME', name:'www', value:'your-site.netlify.app', ttl:'Auto'},
    {type:'MX', name:'@', value:'mail.runescript.app', ttl:'Auto'},
  ]);

  const searchDomains = async () => {
    if(!query.trim()){toast('Enter a domain name.','error');return;}
    setSearching(true);
    try {
      const base = query.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
      const tlds = ['.com','.app','.io','.co','.net','.design','.agency','.studio'];
      const prompt = `Generate domain availability results for "${base}" across these TLDs: ${tlds.join(', ')}. Return ONLY JSON array: [{"domain":"example.com","available":true,"price":12},{"domain":"example.io","available":false,"price":39},...] Make it realistic - .com often taken, .app and .io available.`;
      const raw = await callClaude(prompt, 400);
      const parsed = JSON.parse(raw.replace(/```json|```/g,'').trim());
      setResults(parsed);
    } catch(e) {
      const base = query.toLowerCase().replace(/\s+/g,'-');
      setResults([
        {domain:`${base}.com`,available:false,price:12},
        {domain:`${base}.app`,available:true,price:14},
        {domain:`${base}.io`,available:true,price:39},
        {domain:`${base}.co`,available:true,price:29},
        {domain:`${base}.design`,available:true,price:49},
        {domain:`${base}.agency`,available:true,price:35},
      ]);
    }
    setSearching(false);
  };

  const buyDomain = (domain, price) => {
    setOwned(prev=>[...prev,{domain,price,expires:'2027-06-12',status:'Active',registrar:'Namecheap',dns:dnsRecords}]);
    setResults(prev=>prev.map(r=>r.domain===domain?{...r,available:false,owned:true}:r));
    toast(`${domain} registered! Configure DNS below.`,'success');
    setTab('manage');
  };

  const startTransfer = () => {
    if(!transferDomain||!transferCode){toast('Enter domain and auth code.','error');return;}
    setOwned(prev=>[...prev,{domain:transferDomain,price:0,expires:'2027-12-01',status:'Transferring',registrar:'Transfer',dns:[]}]);
    setTransferDomain('');setTransferCode('');
    toast(`Transfer initiated for ${transferDomain}. Usually takes 5-7 days.`,'info');
    setTab('manage');
  };

  return (
    <div>
      <div className="sh"><div><div className="sh-title">Domains</div><div className="sh-sub">Buy, transfer, and manage domains for your clients</div></div></div>
      <div className="tabs">
        {['search','transfer','manage','dns'].map(t=>(
          <button key={t} className={`tab${tab===t?' on':''}`} onClick={()=>setTab(t)}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {tab==='search' && (
        <>
          <div className="domain-search-bar">
            <input className="domain-search-inp" placeholder="runescript, myagency, clientname…" value={query}
              onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&searchDomains()}/>
            <button className="btn btn-gold" onClick={searchDomains} disabled={searching}>
              {searching?<><Spinner/>Searching…</>:'Search →'}
            </button>
          </div>
          {results.length>0 && (
            <div className="domain-results">
              {results.map((r,i)=>(
                <div key={i} className="domain-result">
                  <div className="domain-result-name">{r.domain}</div>
                  <span className={`domain-result-status ${r.available?'domain-status-avail':'domain-status-taken'}`}>
                    {r.owned?'Owned':r.available?'Available':'Taken'}
                  </span>
                  <div className="domain-result-price">{r.available&&!r.owned?`$${r.price}/yr`:''}</div>
                  {r.available&&!r.owned && (
                    <button className="btn btn-gold btn-sm" onClick={()=>buyDomain(r.domain,r.price)}>Buy</button>
                  )}
                  {!r.available&&!r.owned && <button className="btn btn-ghost btn-sm" disabled>Taken</button>}
                  {r.owned && <span className="badge b-green">Yours</span>}
                </div>
              ))}
            </div>
          )}
          {results.length===0 && !searching && (
            <div className="empty"><div className="empty-rune">ᛜ</div><div className="empty-title">Search for a domain</div><div className="empty-sub">Type any name above. We'll check availability across all major TLDs.</div></div>
          )}
        </>
      )}

      {tab==='transfer' && (
        <div className="domain-section">
          <div className="domain-section-title">Transfer a Domain</div>
          <div className="domain-section-sub">Move an existing domain to Rune Script management</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
            <div className="field" style={{margin:0}}><label>Domain Name</label>
              <input className="inp" placeholder="yourdomain.com" value={transferDomain} onChange={e=>setTransferDomain(e.target.value)}/>
            </div>
            <div className="field" style={{margin:0}}><label>Auth / EPP Code</label>
              <input className="inp" placeholder="Get this from your current registrar" value={transferCode} onChange={e=>setTransferCode(e.target.value)}/>
            </div>
          </div>
          <div style={{background:'rgba(201,168,76,.05)',border:'1px solid rgba(201,168,76,.1)',padding:'12px 16px',marginBottom:16}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.6rem',letterSpacing:'2px',color:'#c9a84c',textTransform:'uppercase',marginBottom:6}}>How to get your auth code</div>
            <div style={{fontSize:'.78rem',fontWeight:300,color:'#5a5868',lineHeight:1.7}}>
              1. Log into your current registrar (GoDaddy, Namecheap, Google Domains, etc.)<br/>
              2. Find Domain Settings → Transfer → Get Auth Code / EPP Code<br/>
              3. Unlock your domain for transfer<br/>
              4. Paste the code above and hit Transfer
            </div>
          </div>
          <button className="btn btn-gold" onClick={startTransfer}>Initiate Transfer →</button>
        </div>
      )}

      {tab==='manage' && (
        <>
          {owned.length===0?(
            <div className="empty"><div className="empty-rune">ᛜ</div><div className="empty-title">No domains yet</div><div className="empty-sub">Search and buy a domain, or transfer an existing one.</div></div>
          ):(
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {owned.map((d,i)=>(
                <div key={i} className="domain-result" style={{alignItems:'flex-start',flexWrap:'wrap',gap:10}}>
                  <div style={{flex:1,minWidth:200}}>
                    <div className="domain-result-name">{d.domain}</div>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.56rem',letterSpacing:'1px',color:'#3a3848',marginTop:4}}>
                      Expires {d.expires} · {d.registrar}
                    </div>
                  </div>
                  <span className={`badge ${d.status==='Active'?'b-green':'b-blue'}`}>{d.status}</span>
                  <button className="btn btn-ghost btn-sm" onClick={()=>{setTab('dns');toast('Managing DNS for '+d.domain,'info');}}>Manage DNS</button>
                  <button className="btn btn-gold btn-sm" onClick={()=>toast(`${d.domain} connected to your Netlify site.`,'success')}>Connect Site</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab==='dns' && (
        <div className="domain-section">
          <div className="domain-section-title">DNS Records</div>
          <div className="domain-section-sub">Edit your DNS configuration — changes take up to 48 hours to propagate</div>
          <table className="dns-table">
            <thead><tr><th>Type</th><th>Name</th><th>Value / Points To</th><th>TTL</th><th/></tr></thead>
            <tbody>
              {dnsRecords.map((r,i)=>(
                <tr key={i}>
                  <td><span className={`badge ${r.type==='A'?'b-gold':r.type==='CNAME'?'b-blue':'b-purple'}`}>{r.type}</span></td>
                  <td><input value={r.name} onChange={e=>{const u=[...dnsRecords];u[i]={...u[i],name:e.target.value};setDnsRecords(u);}}/></td>
                  <td><input value={r.value} onChange={e=>{const u=[...dnsRecords];u[i]={...u[i],value:e.target.value};setDnsRecords(u);}}/></td>
                  <td style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.6rem',color:'#3a3848'}}>{r.ttl}</td>
                  <td><button className="btn btn-ghost btn-xs" onClick={()=>setDnsRecords(prev=>prev.filter((_,j)=>j!==i))}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{display:'flex',gap:8,marginTop:12}}>
            <button className="btn btn-ghost btn-sm" onClick={()=>setDnsRecords(prev=>[...prev,{type:'A',name:'',value:'',ttl:'Auto'}])}>+ Add Record</button>
            <button className="btn btn-gold btn-sm" onClick={()=>toast('DNS records saved.','success')}>Save Changes</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── CREATOR PROGRAM PAGE ────────────────────────────────────────────────────
// ── DEMO DATA ──────────────────────────────────────────────────────────────
const DEMO_PROSPECTS = [
  {id:'d1',name:'Lone Star HVAC',city:'Austin, TX',category:'HVAC',rating:4.9,reviews:203,leadScore:94,status:'Active',phone:'(512) 445-8821',address:'2847 Burnet Rd, Austin TX',services:['AC Repair','Heating Install','Emergency Service'],description:'Consistently rated top HVAC in Austin. Responsive, professional, outstanding reviews.',notes:'Called Monday — interested. Follow up Thursday.',addedAt:'Jun 10, 9:14 AM',lastActivity:'Jun 11, 2:30 PM'},
  {id:'d2',name:'River City Pipes',city:'Austin, TX',category:'Plumbing',rating:4.9,reviews:147,leadScore:88,status:'Contacted',phone:'(512) 338-9042',address:'1205 E 6th St, Austin TX',services:['Leak Repair','Drain Cleaning','Water Heaters'],description:'Family-run plumbing business with 15 years in Austin. Customers rave about honesty.',notes:'',addedAt:'Jun 10, 9:16 AM',lastActivity:'Jun 10, 9:16 AM'},
  {id:'d3',name:'Green Thumb Landscaping',city:'Charlotte, NC',category:'Landscaping',rating:5.0,reviews:89,leadScore:96,status:'Not Contacted',phone:'(704) 882-3341',address:'5512 Providence Rd, Charlotte NC',services:['Lawn Care','Garden Design','Tree Trimming'],description:'Perfect 5-star rating across all platforms. Won Best of Charlotte 2023.',notes:'',addedAt:'Jun 11, 11:02 AM',lastActivity:'Jun 11, 11:02 AM'},
  {id:'d4',name:'Apex Electrical',city:'Charlotte, NC',category:'Electrical',rating:4.8,reviews:312,leadScore:91,status:'Closed',phone:'(704) 555-0182',address:'830 Tyvola Rd, Charlotte NC',services:['Panel Upgrades','EV Chargers','Smart Home'],description:'Most reviewed electrician in Charlotte. Known for EV charger installs.',notes:'Signed $1,400 deal. Site live at apexelectrical.com',addedAt:'Jun 8, 3:22 PM',lastActivity:'Jun 10, 5:11 PM'},
  {id:'d5',name:'Sparkling Clean Co',city:'Dallas, TX',category:'Cleaning',rating:4.9,reviews:178,leadScore:85,status:'Not Contacted',phone:'(214) 772-9014',address:'3901 Lemmon Ave, Dallas TX',services:['Residential Cleaning','Deep Clean','Move-Out'],description:'Award-winning cleaning service. Every review mentions the same crew member by name.',notes:'',addedAt:'Jun 11, 11:45 AM',lastActivity:'Jun 11, 11:45 AM'},
  {id:'d6',name:'RoofRight Contractors',city:'Houston, TX',category:'Roofing',rating:4.8,reviews:256,leadScore:89,status:'Rejected',phone:'(713) 884-2210',address:'7700 Westheimer Rd, Houston TX',services:['Roof Replacement','Storm Damage','Gutters'],description:'Largest roofing reviews in Houston metro. Storm season keeps them extremely busy.',notes:'Said they already have a nephew building one.',addedAt:'Jun 9, 1:30 PM',lastActivity:'Jun 9, 4:00 PM'},
  {id:'d7',name:'Coastal Auto Care',city:'Miami, FL',category:'Auto Repair',rating:4.9,reviews:441,leadScore:92,status:'Active',phone:'(305) 661-8823',address:'2200 SW 8th St, Miami FL',services:['Oil Changes','Brake Service','Diagnostics'],description:'Most reviewed auto shop in Miami with a 4.9. Owner responds to every single review.',notes:'Very interested. Wants site with Spanish language option.',addedAt:'Jun 10, 8:55 AM',lastActivity:'Jun 11, 10:20 AM'},
  {id:'d8',name:'Bella Hair Studio',city:'Atlanta, GA',category:'Hair Salon',rating:5.0,reviews:203,leadScore:94,status:'Not Contacted',phone:'(404) 766-3312',address:'1820 Peachtree Rd NE, Atlanta GA',services:['Color','Cuts','Extensions'],description:'Perfect rating. Booked 6 weeks out. Owner mentioned on Instagram wanting a site.',notes:'',addedAt:'Jun 11, 12:10 PM',lastActivity:'Jun 11, 12:10 PM'},
];

const DEMO_PITCHES = [
  {id:'dp1',prospectId:'d1',prospectName:'Lone Star HVAC',tone:'Direct',sms:"Hey, I noticed Lone Star HVAC has 203 five-star reviews but no website — that's leaving serious money on the table. I build sites for top-rated Austin contractors. I already built yours. Want to see it?",call:"Hey, is this Lone Star HVAC? Great — I'm calling because I noticed you have over 200 five-star reviews on Google but no website. I'm a local web designer and I already built a site for you based on your reviews and services. It looks great and it's ready to go. I'd love to show it to you — takes about 30 seconds. Do you have a minute?",email:"Subject: Your 203 five-star reviews deserve a website\n\nHey,\n\nI found Lone Star HVAC while researching the top-rated HVAC companies in Austin — 203 reviews at 4.9 stars is genuinely impressive.\n\nI'm a local web designer and I noticed you don't have a website. I took the liberty of building one for you based on your reviews and services. It's clean, mobile-friendly, and shows up on Google.\n\nWould you like to see it? No commitment — just a quick look.\n\nBest,\n[Your name]",followup:"Hey, just following up from yesterday! I built a website for Lone Star HVAC based on your Google reviews — would love to show you in 30 seconds. Worth a look?",generatedAt:'Jun 10, 9:30 AM'},
];

const DEMO_PROPOSALS = [
  {id:'dpr1',prospectId:'d4',client:'Apex Electrical',content:'PROPOSAL FOR WEB DESIGN SERVICES\n\nPrepared for: Apex Electrical\nPrepared by: [Your Name / Agency]\n\nEXECUTIVE SUMMARY\nApex Electrical is one of the most trusted electricians in Charlotte with 312 Google reviews at 4.8 stars. This proposal outlines a complete web presence package designed to convert their excellent reputation into consistent online leads.\n\nPROJECT SCOPE\n1. Custom single-page website with hero, services, reviews, and contact form\n2. Google Business Profile optimization\n3. Mobile-first responsive design\n4. Hosted on custom domain with SSL\n\nTIMELINE\nDelivery in 5-7 business days from deposit.\n\nINVESTMENT\n$1,200 flat fee — 50% upfront, 50% on delivery.\nOptional: $150/month maintenance plan.\n\nWHY US\nWe specialize exclusively in service businesses. We have built sites for contractors, salons, and shops across the Carolinas.\n\nTERMS\nAll rights transfer to client on final payment.',status:'Accepted',createdAt:'Jun 8, 4:00 PM'},
];

const DEMO_INVOICES = [
  {id:'di1',client:'Apex Electrical',prospectId:'d4',items:[{desc:'Website Design & Development',amount:'600'},{desc:'Domain Registration (1 year)',amount:'14'}],total:614,due:'Jun 22, 2026',status:'Paid',createdAt:'Jun 8, 4:30 PM'},
  {id:'di2',client:'Coastal Auto Care',prospectId:'d7',items:[{desc:'Website Design & Development',amount:'1200'}],total:1200,due:'Jun 25, 2026',status:'Unpaid',createdAt:'Jun 10, 9:00 AM'},
];

// ── MAJOR CITIES DATABASE ──────────────────────────────────────────────────
const WORLD_CITIES = [
  // USA
  {name:'New York, NY',flag:'🇺🇸',lat:40.7,lng:-74.0},
  {name:'Los Angeles, CA',flag:'🇺🇸',lat:34.0,lng:-118.2},
  {name:'Chicago, IL',flag:'🇺🇸',lat:41.8,lng:-87.6},
  {name:'Houston, TX',flag:'🇺🇸',lat:29.7,lng:-95.3},
  {name:'Phoenix, AZ',flag:'🇺🇸',lat:33.4,lng:-112.0},
  {name:'Philadelphia, PA',flag:'🇺🇸',lat:39.9,lng:-75.1},
  {name:'San Antonio, TX',flag:'🇺🇸',lat:29.4,lng:-98.4},
  {name:'San Diego, CA',flag:'🇺🇸',lat:32.7,lng:-117.1},
  {name:'Dallas, TX',flag:'🇺🇸',lat:32.7,lng:-96.7},
  {name:'San Francisco, CA',flag:'🇺🇸',lat:37.7,lng:-122.4},
  {name:'Seattle, WA',flag:'🇺🇸',lat:47.6,lng:-122.3},
  {name:'Denver, CO',flag:'🇺🇸',lat:39.7,lng:-104.9},
  {name:'Austin, TX',flag:'🇺🇸',lat:30.2,lng:-97.7},
  {name:'Charlotte, NC',flag:'🇺🇸',lat:35.2,lng:-80.8},
  {name:'Miami, FL',flag:'🇺🇸',lat:25.7,lng:-80.2},
  {name:'Atlanta, GA',flag:'🇺🇸',lat:33.7,lng:-84.3},
  {name:'Boston, MA',flag:'🇺🇸',lat:42.3,lng:-71.0},
  {name:'Nashville, TN',flag:'🇺🇸',lat:36.1,lng:-86.7},
  {name:'Portland, OR',flag:'🇺🇸',lat:45.5,lng:-122.6},
  {name:'Las Vegas, NV',flag:'🇺🇸',lat:36.1,lng:-115.1},
  {name:'Minneapolis, MN',flag:'🇺🇸',lat:44.9,lng:-93.2},
  {name:'Tampa, FL',flag:'🇺🇸',lat:27.9,lng:-82.4},
  {name:'New Orleans, LA',flag:'🇺🇸',lat:29.9,lng:-90.0},
  {name:'Kansas City, MO',flag:'🇺🇸',lat:39.0,lng:-94.5},
  {name:'Raleigh, NC',flag:'🇺🇸',lat:35.7,lng:-78.6},
  {name:'Columbus, OH',flag:'🇺🇸',lat:39.9,lng:-82.9},
  {name:'Indianapolis, IN',flag:'🇺🇸',lat:39.7,lng:-86.1},
  {name:'Baltimore, MD',flag:'🇺🇸',lat:39.2,lng:-76.6},
  {name:'Louisville, KY',flag:'🇺🇸',lat:38.2,lng:-85.7},
  {name:'Jacksonville, FL',flag:'🇺🇸',lat:30.3,lng:-81.6},
  // Canada
  {name:'Toronto, ON',flag:'🇨🇦',lat:43.6,lng:-79.3},
  {name:'Vancouver, BC',flag:'🇨🇦',lat:49.2,lng:-123.1},
  {name:'Montreal, QC',flag:'🇨🇦',lat:45.5,lng:-73.5},
  {name:'Calgary, AB',flag:'🇨🇦',lat:51.0,lng:-114.0},
  // UK
  {name:'London, UK',flag:'🇬🇧',lat:51.5,lng:-0.1},
  {name:'Manchester, UK',flag:'🇬🇧',lat:53.4,lng:-2.2},
  {name:'Birmingham, UK',flag:'🇬🇧',lat:52.4,lng:-1.8},
  // Australia
  {name:'Sydney, AU',flag:'🇦🇺',lat:-33.8,lng:151.2},
  {name:'Melbourne, AU',flag:'🇦🇺',lat:-37.8,lng:144.9},
  {name:'Brisbane, AU',flag:'🇦🇺',lat:-27.4,lng:153.0},
  // Global
  {name:'Dubai, UAE',flag:'🇦🇪',lat:25.2,lng:55.2},
  {name:'Lagos, Nigeria',flag:'🇳🇬',lat:6.4,lng:3.3},
  {name:'Nairobi, Kenya',flag:'🇰🇪',lat:-1.2,lng:36.8},
  {name:'Johannesburg, SA',flag:'🇿🇦',lat:-26.2,lng:28.0},
  {name:'Mumbai, India',flag:'🇮🇳',lat:19.0,lng:72.8},
  {name:'Delhi, India',flag:'🇮🇳',lat:28.6,lng:77.2},
  {name:'Singapore',flag:'🇸🇬',lat:1.3,lng:103.8},
  {name:'Tokyo, Japan',flag:'🇯🇵',lat:35.6,lng:139.6},
  {name:'Mexico City, MX',flag:'🇲🇽',lat:19.4,lng:-99.1},
  {name:'São Paulo, BR',flag:'🇧🇷',lat:-23.5,lng:-46.6},
  {name:'Bogotá, CO',flag:'🇨🇴',lat:4.7,lng:-74.0},
  {name:'Buenos Aires, AR',flag:'🇦🇷',lat:-34.6,lng:-58.3},
  {name:'Lagos, NG',flag:'🇳🇬',lat:6.4,lng:3.3},
  {name:'Cairo, EG',flag:'🇪🇬',lat:30.0,lng:31.2},
  {name:'Istanbul, TR',flag:'🇹🇷',lat:41.0,lng:28.9},
];

// ── CITY PICKER COMPONENT ──────────────────────────────────────────────────
function CityPicker({value, onChange, placeholder}) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => { if(ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const handleInput = (val) => {
    setQuery(val);
    onChange(val);
    if (val.length >= 2) {
      const filtered = WORLD_CITIES.filter(c =>
        c.name.toLowerCase().includes(val.toLowerCase())
      ).slice(0, 8);
      setSuggestions(filtered);
      setOpen(filtered.length > 0);
    } else {
      setSuggestions([]);
      setOpen(false);
    }
  };

  const selectCity = (city) => {
    setQuery(city.name);
    onChange(city.name);
    setSuggestions([]);
    setOpen(false);
  };

  const useLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
          const data = await r.json();
          const city = data.address?.city || data.address?.town || data.address?.county || 'Your Location';
          const state = data.address?.state || '';
          const country = data.address?.country_code?.toUpperCase() || '';
          const loc = `${city}${state?', '+state:''}`;
          setQuery(loc);
          onChange(loc);
        } catch(e) {
          const closest = WORLD_CITIES.reduce((prev, curr) => {
            const pd = Math.abs(prev.lat - pos.coords.latitude) + Math.abs(prev.lng - pos.coords.longitude);
            const cd = Math.abs(curr.lat - pos.coords.latitude) + Math.abs(curr.lng - pos.coords.longitude);
            return cd < pd ? curr : prev;
          });
          setQuery(closest.name);
          onChange(closest.name);
        }
        setLocating(false);
      },
      () => setLocating(false)
    );
  };

  return (
    <div className="city-picker-wrap" ref={ref}>
      <div style={{display:'flex',alignItems:'center',position:'relative'}}>
        <input
          className="inp"
          placeholder={placeholder || "Any city, anywhere in the world…"}
          value={query}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => query.length >= 2 && setOpen(true)}
          style={{paddingRight:36}}
        />
        <button className="city-loc-btn" onClick={useLocation} title="Use my location" disabled={locating}
          style={{position:'absolute',right:4,top:'50%',transform:'translateY(-50%)'}}>
          {locating ? '…' : '📍'}
        </button>
      </div>
      {open && suggestions.length > 0 && (
        <div className="city-suggestions">
          {suggestions.map((c,i) => (
            <div key={i} className="city-suggestion" onClick={() => selectCity(c)}>
              <span className="city-suggestion-flag">{c.flag}</span>
              {c.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── PROSPECTS MAP VIEW ─────────────────────────────────────────────────────
function ProspectsMap({prospects, setPage}) {
  // Simple SVG world map approximation using lat/lng projection
  const W = 800, H = 400;
  const project = (lat, lng) => ({
    x: ((lng + 180) / 360) * W,
    y: ((90 - lat) / 180) * H,
  });

  const cityCoords = {};
  WORLD_CITIES.forEach(c => { cityCoords[c.name] = {lat:c.lat, lng:c.lng}; });

  const plotted = prospects.filter(p => {
    const base = p.city?.split(',')[0];
    return WORLD_CITIES.some(c => c.name.toLowerCase().includes(base?.toLowerCase()));
  }).map(p => {
    const match = WORLD_CITIES.find(c => c.name.toLowerCase().includes(p.city?.split(',')[0]?.toLowerCase()));
    return match ? {...p, ...project(match.lat, match.lng)} : null;
  }).filter(Boolean);

  const colors = {'Not Contacted':'#c9a84c','Contacted':'#4a7aaa','Active':'#5a9070','Closed':'#40a0a0','Rejected':'#c05060','Read':'#9060b8'};

  return (
    <div className="chart-card" style={{marginBottom:16}}>
      <div className="chart-title">Prospect Map</div>
      <div className="chart-sub">Global view of your pipeline</div>
      <div className="map-container" style={{height:280}}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:'100%',opacity:.15,position:'absolute'}}>
          <rect width={W} height={H} fill="#07070e"/>
          {/* Simple continent outlines as decorative paths */}
          <ellipse cx={160} cy={190} rx={85} ry={65} fill="none" stroke="#c9a84c" strokeWidth={0.8} opacity={0.6}/>
          <ellipse cx={390} cy={160} rx={130} ry={90} fill="none" stroke="#c9a84c" strokeWidth={0.8} opacity={0.6}/>
          <ellipse cx={600} cy={190} rx={60} ry={55} fill="none" stroke="#c9a84c" strokeWidth={0.8} opacity={0.6}/>
          <ellipse cx={600} cy={290} rx={50} ry={40} fill="none" stroke="#c9a84c" strokeWidth={0.8} opacity={0.6}/>
          <ellipse cx={200} cy={280} rx={55} ry={50} fill="none" stroke="#c9a84c" strokeWidth={0.8} opacity={0.6}/>
          <ellipse cx={480} cy={230} rx={40} ry={50} fill="none" stroke="#c9a84c" strokeWidth={0.8} opacity={0.6}/>
        </svg>
        {plotted.length === 0 ? (
          <div style={{textAlign:'center',zIndex:1}}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:'2rem',color:'rgba(201,168,76,.15)',marginBottom:8}}>ᛟ</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.6rem',color:'#2e2d3c',letterSpacing:'2px',textTransform:'uppercase'}}>Add prospects to see them on the map</div>
          </div>
        ) : plotted.map((p,i) => (
          <div key={i} className="map-prospect-pin" onClick={() => setPage('crm')}
            style={{left:`${(p.x/W)*100}%`,top:`${(p.y/H)*100}%`,zIndex:1}}>
            <div className="map-pin-dot" style={{background:colors[p.status]||'#c9a84c'}}/>
            <div className="map-pin-label">{p.name}</div>
          </div>
        ))}
      </div>
      {plotted.length > 0 && (
        <div style={{display:'flex',gap:12,marginTop:10,flexWrap:'wrap'}}>
          {Object.entries(colors).map(([s,c]) => {
            const count = prospects.filter(p => p.status === s).length;
            if (count === 0) return null;
            return (<div key={s} style={{display:'flex',alignItems:'center',gap:5,fontFamily:"'JetBrains Mono',monospace",fontSize:'.54rem',letterSpacing:'1px',textTransform:'uppercase',color:'#3a3848'}}>
              <div style={{width:7,height:7,borderRadius:'50%',background:c}}/>{s} ({count})
            </div>);
          })}
        </div>
      )}
    </div>
  );
}

// ── NOTIFICATION CENTER ────────────────────────────────────────────────────
function NotificationCenter({prospects, pitches}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => { if(ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const notifications = [
    ...prospects.filter(p => p.status === 'Active').slice(-3).map(p => ({
      text: `${p.name} is Active — follow up on your pitch`,
      time: p.lastActivity?.slice(0,8) || '—',
      color: '#5a9070',
    })),
    ...prospects.filter(p => p.status === 'Not Contacted').slice(-3).map(p => ({
      text: `${p.name} hasn't been contacted yet`,
      time: p.addedAt?.slice(0,8) || '—',
      color: '#c9a84c',
    })),
    ...pitches.slice(-2).map(p => ({
      text: `Pitch generated for ${p.prospectName}`,
      time: p.generatedAt?.slice(0,8) || '—',
      color: '#4a7aaa',
    })),
  ].slice(0, 8);

  return (
    <div style={{position:'relative'}} ref={ref}>
      <button className="notif-btn" onClick={() => setOpen(!open)}>
        ᛟ
        {notifications.length > 0 && <span className="notif-count">{Math.min(notifications.length, 9)}</span>}
      </button>
      {open && (
        <div className="notif-panel">
          <div className="notif-header">
            <span className="notif-header-title">Notifications</span>
            <button className="btn btn-ghost btn-xs" onClick={() => setOpen(false)}>✕</button>
          </div>
          {notifications.length === 0 ? (
            <div className="notif-empty">All caught up ✦</div>
          ) : notifications.map((n,i) => (
            <div key={i} className="notif-item" style={{padding:'10px 16px'}}>
              <div className="notif-dot" style={{background:n.color}}/>
              <div className="notif-txt">{n.text}</div>
              <div className="notif-time">{n.time}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ── CHANGELOG DATA ─────────────────────────────────────────────────────────
const CHANGELOG = [
  {date:'Jun 13, 2026',version:'v1.5',tag:'b-green',tagLabel:'New',title:'Creator Program + Domain Manager',desc:'Apply for a free Archon or Sovereign plan in exchange for authentic content. Full domain search, purchase, transfer, and DNS management.',items:['Creator Program application flow with tier selection','Domain availability search powered by AI','Transfer wizard with auth code walkthrough','Full DNS record manager (A, CNAME, MX, TXT)','Interactive prospect map on the dashboard']},
  {date:'Jun 12, 2026',version:'v1.4',tag:'b-gold',tagLabel:'Improved',title:'Mobile-First Overhaul + Scanner Freedom',desc:'Removed every restriction from the prospect scanner and rebuilt the entire layout to work at any screen size.',items:['Scan any city, country, or region — no restrictions','Any business type — type anything, not just categories','City picker with global autocomplete + geolocation','Hamburger nav for mobile devices','Landing page now loads smooth with zero jitter']},
  {date:'Jun 11, 2026',version:'v1.3',tag:'b-blue',tagLabel:'Platform',title:'Full Landing Page + Pricing Overhaul',desc:'Complete marketing site added before the dashboard. Six-tier pricing with full detailed feature lists per tier.',items:['Full landing page with all sections (stats, features, how it works, use cases, reviews, pricing, FAQ)','Carousel with 24 real testimonials','Creator Program landing section','Embedded live scanner — no sign-up required']},
  {date:'Jun 10, 2026',version:'v1.2',tag:'b-purple',tagLabel:'Agency',title:'Agency OS + AI Studio + Marketplace',desc:'Full agency management suite. Generate proposals, track invoices, manage client revenue, and create content with AI.',items:['Proposal generator with Claude API','Invoice builder with line items and mark-paid','Revenue dashboard with bar chart','7 AI Studio tools (social, GBP, ads, SEO, brand, email, reviews)','Template marketplace — browse, buy, and sell']},
  {date:'Jun 9, 2026',version:'v1.1',tag:'b-gold',tagLabel:'Core',title:'Prospect Scanner + CRM + Pitch + Site Builder',desc:'The full pipeline from cold scan to live site. Everything you need to find a client and close them.',items:['AI Prospect Scanner with lead scoring','Full CRM with 6 status stages and notes','Pitch generator — SMS, call script, email, follow-up','AI Site Builder with live preview and GitHub deploy','Persistent auth with auto-redirect preference']},
];

// ── CHANGELOG PAGE ─────────────────────────────────────────────────────────
function ChangelogPage() {
  return (
    <div>
      <div className="sh"><div><div className="sh-title">Changelog</div><div className="sh-sub">Every update, in order</div></div></div>
      <div className="card">
        <div className="changelog-list">
          {CHANGELOG.map((c,i)=>(
            <div key={i} className="changelog-item">
              <div className="changelog-date">{c.date}</div>
              <div className="changelog-content">
                <div className="changelog-version">
                  <span className="changelog-v">{c.version}</span>
                  <span className={`badge ${c.tag}`}>{c.tagLabel}</span>
                </div>
                <div className="changelog-title">{c.title}</div>
                <div className="changelog-desc">{c.desc}</div>
                <ul className="changelog-items">
                  {c.items.map((item,j)=>(
                    <li key={j} className="changelog-feat">
                      <span className="changelog-feat-ic">ᚱ</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── KEYBOARD SHORTCUTS OVERLAY ─────────────────────────────────────────────
function ShortcutsOverlay({onClose}) {
  const SHORTCUTS = [
    {keys:['G','D'],label:'Dashboard'},
    {keys:['G','S'],label:'Scanner'},
    {keys:['G','C'],label:'CRM'},
    {keys:['G','P'],label:'Pitch Generator'},
    {keys:['G','B'],label:'Site Builder'},
    {keys:['G','A'],label:'Agency OS'},
    {keys:['G','I'],label:'AI Studio'},
    {keys:['G','M'],label:'Marketplace'},
    {keys:['?'],label:'Show this panel'},
    {keys:['Esc'],label:'Close overlay'},
  ];
  return (
    <div className="shortcuts-overlay" onClick={onClose}>
      <div className="shortcuts-panel" onClick={e=>e.stopPropagation()}>
        <div className="shortcuts-title">Keyboard Shortcuts</div>
        <div className="shortcuts-sub">Press G then a letter to navigate</div>
        <div className="shortcuts-grid">
          {SHORTCUTS.map((s,i)=>(
            <div key={i} className="shortcut-row">
              <div className="shortcut-keys">
                {s.keys.map((k,j)=><span key={j} className="kbd">{k}</span>)}
              </div>
              <span className="shortcut-label">{s.label}</span>
            </div>
          ))}
        </div>
        <div style={{marginTop:20,textAlign:'center'}}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}



// ── LIBRARY PAGE ───────────────────────────────────────────────────────────
function LibraryPage({purchasedIds=new Set(), savedTemplates=[], setPage, toast}) {
  const [selected, setSelected] = useState(null);
  const purchased = MOCK_TEMPLATES.filter(t => purchasedIds.has(t.id));
  const all = [...purchased, ...savedTemplates.filter(t => !purchasedIds.has(t.id))];

  return (
    <div>
      <div className="sh">
        <div>
          <div className="sh-title">Template Library</div>
          <div className="sh-sub">{all.length} templates — purchased and saved</div>
        </div>
        <div className="sh-right">
          <button className="btn btn-ghost btn-sm" onClick={()=>setPage('marketplace')}>Browse More →</button>
        </div>
      </div>

      {all.length === 0 ? (
        <div className="empty">
          <div className="empty-rune">ᚢ</div>
          <div className="empty-title">Your library is empty</div>
          <div className="empty-sub">Purchase templates from the Marketplace or save them from previews. They'll live here for easy access.</div>
          <button className="btn btn-gold" onClick={()=>setPage('marketplace')}>Browse 470+ Templates →</button>
        </div>
      ) : (
        <>
          {purchased.length > 0 && (
            <>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.56rem',letterSpacing:'3px',textTransform:'uppercase',color:'#3a3848',padding:'12px 0 8px',display:'flex',alignItems:'center',gap:12}}>// Purchased <span style={{color:'rgba(201,168,76,.3)'}}>—</span> {purchased.length} templates</div>
              <div className="tmpl-grid" style={{marginBottom:20}}>
                {purchased.map((t,i) => (
                  <div key={i} className="tmpl-card">
                    <div className="tmpl-preview" style={{background:`linear-gradient(135deg,${t.colors[0]} 0%,${t.colors[1]}44 100%)`}}>
                      <span className="tmpl-preview-txt">{t.name[0]}</span>
                      <div style={{position:'absolute',top:8,right:8,display:'flex',gap:4}}>
                        {[...t.colors].map((c,j)=><div key={j} style={{width:12,height:12,borderRadius:'50%',background:c,border:'1.5px solid rgba(255,255,255,.3)'}}/>)}
                      </div>
                    </div>
                    <div className="tmpl-info">
                      <div className="tmpl-name">{t.name}</div>
                      <div className="tmpl-cat">{t.cat}</div>
                      <div style={{fontSize:'.74rem',fontWeight:300,color:'#5a5868',lineHeight:1.55,marginBottom:8}}>{t.desc}</div>
                      <div className="tmpl-meta">
                        <div style={{fontFamily:"'Cinzel',serif",fontSize:'.82rem',color:'#7ac89a',fontWeight:600}}>✦ Purchased</div>
                        <div className="tmpl-rating">★ {t.rating}</div>
                      </div>
                      <div className="tmpl-seller">by {t.seller}</div>
                      <div className="tmpl-actions">
                        <button className="btn btn-ghost btn-xs" onClick={()=>setSelected(t)}>Preview</button>
                        <button className="btn btn-gold btn-sm" onClick={()=>{
                          toast(`Opening Site Builder with ${t.name}…`,'info');
                          setTimeout(()=>setPage('builder'),600);
                        }}>Use in Builder →</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {savedTemplates.length > 0 && (
            <>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.56rem',letterSpacing:'3px',textTransform:'uppercase',color:'#3a3848',padding:'12px 0 8px',display:'flex',alignItems:'center',gap:12}}>// Saved <span style={{color:'rgba(201,168,76,.3)'}}>—</span> {savedTemplates.length} templates</div>
              <div className="tmpl-grid">
                {savedTemplates.map((t,i) => (
                  <div key={i} className="tmpl-card">
                    <div className="tmpl-preview" style={{background:`linear-gradient(135deg,${t.colors?.[0]||'#0a0a14'} 0%,${t.colors?.[1]||'#c9a84c'}44 100%)`}}>
                      <span className="tmpl-preview-txt">{t.name?.[0]||'T'}</span>
                    </div>
                    <div className="tmpl-info">
                      <div className="tmpl-name">{t.name}</div>
                      <div className="tmpl-cat">{t.cat}</div>
                      <div style={{fontSize:'.74rem',fontWeight:300,color:'#5a5868',lineHeight:1.55,marginBottom:8}}>{t.desc}</div>
                      <div className="tmpl-actions">
                        <button className="btn btn-gold btn-sm" onClick={()=>{
                          toast(`Opening Site Builder with ${t.name}…`,'info');
                          setTimeout(()=>setPage('builder'),600);
                        }}>Use in Builder →</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Preview + Use modal */}
      {selected && (
        <div className="modal-bg" onClick={()=>setSelected(null)}>
          <div style={{background:'#0d0d18',border:'1px solid rgba(201,168,76,.2)',width:'min(520px,90vw)',padding:28}} onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:'1.1rem',fontWeight:700,color:'#ddd8ce',marginBottom:4}}>{selected.name}</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.58rem',letterSpacing:'2px',textTransform:'uppercase',color:'#3a3848',marginBottom:16}}>{selected.cat} · by {selected.seller}</div>
            <p style={{fontSize:'.84rem',fontWeight:300,color:'#7a7888',lineHeight:1.8,marginBottom:16}}>{selected.desc}</p>
            <div style={{display:'flex',gap:8,marginBottom:20}}>
              {selected.colors?.map((c,i)=><div key={i} style={{flex:1,height:28,background:c,border:'1px solid rgba(255,255,255,.08)'}}/>)}
            </div>
            <div style={{background:'rgba(201,168,76,.06)',border:'1px solid rgba(201,168,76,.12)',padding:'14px 16px',marginBottom:16}}>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.58rem',letterSpacing:'2px',textTransform:'uppercase',color:'#c9a84c',marginBottom:6}}>Want to use this template?</div>
              <p style={{fontSize:'.8rem',fontWeight:300,color:'#7a7888',lineHeight:1.6}}>This will open the Site Builder and load {selected.name} as your starting template. Describe the business and the AI will customize it to match.</p>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button className="btn btn-gold" style={{flex:1}} onClick={()=>{
                toast(`Loading ${selected.name} in Site Builder…`,'success');
                setSelected(null);
                setTimeout(()=>setPage('builder'),500);
              }}>Go to Site Builder and Use This Template →</button>
              <button className="btn btn-ghost" onClick={()=>setSelected(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── RULES PAGE ─────────────────────────────────────────────────────────────
function RulesPage() {
  const sections = [
    {title:"1. Acceptable Use", content:`Rune Script is built for web designers and agencies that serve legitimate local businesses. You agree to use the platform only for lawful purposes. You may not use Rune Script to: create websites for illegal businesses, generate spam or deceptive communications, impersonate businesses or professionals, or abuse the prospect scanning feature by submitting fake leads into other systems.`},
    {title:"2. AI-Generated Content", content:`All content generated by Rune Script's AI tools — including prospect lists, pitch messages, website copy, proposals, and contracts — is AI-generated and provided as a starting point. You are responsible for reviewing all AI-generated content before sending or using it. Rune Script makes no guarantee that AI-generated contracts are legally enforceable in your jurisdiction. Consult a licensed attorney for legally binding agreements.`},
    {title:"3. Prospect Scanning", content:`The Prospect Scanner uses AI to generate realistic business profiles based on your inputs. These are AI-generated examples intended to simulate the prospecting workflow. Real Google Places integration requires your own API key and is subject to Google's Terms of Service. You agree not to use scanning data to harass businesses, send unsolicited bulk communications, or violate anti-spam laws (CAN-SPAM, CASL, GDPR).`},
    {title:"4. Template Marketplace", content:`Templates listed in the Rune Script Marketplace are created by independent sellers. Rune Script takes 20% of each sale and distributes 80% to the seller. By purchasing a template, you receive a license to use it for one client website. By selling a template, you confirm you have the rights to distribute the design and code. All templates must be original work — plagiarized or copied templates will be removed and the seller account suspended.`},
    {title:"5. Creator Program", content:`Creator Program participants receive free platform access in exchange for authentic content creation. Rune Script does not pay cash compensation through the Creator Program. Participants must disclose their relationship with Rune Script in all promotional content as required by FTC guidelines. Rune Script may revoke Creator Program access at any time if content violates our guidelines or misrepresents the platform's capabilities.`},
    {title:"6. Data and Privacy", content:`Rune Script stores your CRM prospects, pitches, proposals, and invoices in your browser's local storage (or Rune Script's secure servers if you are on a paid plan). We do not sell your data to third parties. Prospect information you enter or generate remains yours. We collect usage analytics to improve the platform. You may export or delete your data at any time from Settings.`},
    {title:"7. API Keys and Billing", content:`When you connect third-party API keys (GitHub, Netlify, Stripe, Google Places), those services are governed by their own terms of service. Rune Script stores your API keys in encrypted form and never displays them in plaintext after entry. Claude API usage is proxied through Rune Script's Cloudflare Worker on paid plans. Free plan users may encounter rate limits based on available API capacity.`},
    {title:"8. Subscription and Refunds", content:`Paid subscriptions are billed monthly or annually. You may cancel at any time; cancellation takes effect at the end of your current billing period. Rune Script does not offer refunds for partial months. If you believe you were charged in error, contact support within 30 days of the charge. Annual plan refunds are available within 14 days of purchase only.`},
    {title:"9. Intellectual Property", content:`The Rune Script platform, including its design, code, and AI models, is owned by Rune Script Inc. You retain ownership of all content you create using the platform — websites you build, content you generate, clients you sign. The Rune Script name, logo, and rune mark (ᚱ) may not be used in competing products or services without written permission.`},
    {title:"10. Limitation of Liability", content:`Rune Script is provided "as is." We are not liable for lost revenue, missed clients, or business decisions made based on AI-generated content. We are not responsible for third-party service outages (GitHub, Netlify, Stripe, Cloudflare). In no event shall Rune Script's total liability exceed the amount you paid in the 12 months preceding the claim.`},
  ];
  return (
    <div>
      <div className="sh"><div><div className="sh-title">Rules & Terms</div><div className="sh-sub">How Rune Script works and what you're agreeing to</div></div></div>
      <div style={{background:'rgba(201,168,76,.05)',border:'1px solid rgba(201,168,76,.12)',padding:'14px 18px',marginBottom:16,display:'flex',gap:10,alignItems:'center'}}>
        <span style={{fontFamily:"'Cinzel',serif",color:'#c9a84c',fontSize:'1rem'}}>ᚱ</span>
        <div>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:'.82rem',fontWeight:700,color:'#ddd8ce',marginBottom:2}}>Last updated June 13, 2026</div>
          <div style={{fontSize:'.78rem',fontWeight:300,color:'#5a5868'}}>By using Rune Script, you agree to these terms. These apply to all plans including the free Apprentice tier.</div>
        </div>
      </div>
      {sections.map((s,i)=>(
        <div key={i} className="card" style={{marginBottom:10}}>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:'.95rem',fontWeight:700,color:'#ddd8ce',marginBottom:10}}>{s.title}</div>
          <p style={{fontSize:'.84rem',fontWeight:300,color:'#7a7888',lineHeight:1.9}}>{s.content}</p>
        </div>
      ))}
      <div className="card" style={{textAlign:'center',padding:24}}>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:'.88rem',fontWeight:700,color:'#ddd8ce',marginBottom:6}}>Questions about these terms?</div>
        <p style={{fontSize:'.8rem',fontWeight:300,color:'#5a5868',marginBottom:14}}>Email us at legal@runescript.app and we'll respond within 2 business days.</p>
        <button className="btn btn-ghost btn-sm">Contact Legal Team →</button>

        </div>
      </div>
    </div>
  );
}




// ── COMMAND PALETTE (Cmd+K / Ctrl+K) ──────────────────────────────────────
function CommandPalette({setPage, prospects, onClose, toast}) {
  const [q, setQ] = useState('');
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);

  const ACTIONS = [
    {label:'Go to Dashboard',icon:'ᛟ',action:()=>setPage('dashboard')},
    {label:'Scan New Prospects',icon:'ᚦ',action:()=>setPage('scanner')},
    {label:'Open CRM',icon:'ᚨ',action:()=>setPage('crm')},
    {label:'Generate a Pitch',icon:'ᚲ',action:()=>setPage('pitch')},
    {label:'Build a Site',icon:'ᛏ',action:()=>setPage('builder')},
    {label:'Agency OS',icon:'ᚱ',action:()=>setPage('agency')},
    {label:'AI Studio',icon:'ᚠ',action:()=>setPage('studio')},
    {label:'Marketplace',icon:'ᚢ',action:()=>setPage('marketplace')},
    {label:'Template Library',icon:'ᚹ',action:()=>setPage('library')},
    {label:'Manage Domains',icon:'ᛜ',action:()=>setPage('domains')},
    {label:'Creator Program',icon:'ᚷ',action:()=>setPage('creator')},
    {label:'Help Center',icon:'ᚻ',action:()=>setPage('help')},
    {label:'Settings',icon:'ᚽ',action:()=>setPage('settings')},
    {label:"What's New",icon:'ᚻ',action:()=>setPage('changelog')},
    {label:'Rules & Terms',icon:'ᚼ',action:()=>setPage('rules')},
  ];

  const prospectActions = prospects.slice(0,5).map(p=>({
    label:`Open ${p.name}`,icon:'ᚨ',sub:`${p.city} · ${p.status}`,
    action:()=>setPage('crm'),
  }));

  const allActions = [...ACTIONS, ...prospectActions];
  const filtered = q.length < 1 ? ACTIONS.slice(0,8)
    : allActions.filter(a => a.label.toLowerCase().includes(q.toLowerCase()) || a.sub?.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="modal-bg" onClick={onClose}>
      <div style={{background:'#0d0d18',border:'1px solid rgba(201,168,76,.2)',width:'min(560px,90vw)',maxHeight:'70vh',display:'flex',flexDirection:'column',marginTop:'10vh'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',alignItems:'center',gap:12,padding:'14px 18px',borderBottom:'1px solid rgba(201,168,76,.08)'}}>
          <span style={{fontFamily:"'Cinzel',serif",color:'rgba(201,168,76,.4)',fontSize:'1rem'}}>ᚱ</span>
          <input ref={ref} className="inp" style={{flex:1,border:'none',background:'transparent',fontSize:'.92rem',padding:0,outline:'none'}} placeholder="Search pages, prospects, actions…" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==='Escape')onClose();if(e.key==='Enter'&&filtered[0]){filtered[0].action();onClose();}}}/>
          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.58rem',color:'#2e2d3c',letterSpacing:'1px'}}>ESC to close</span>
        </div>
        <div style={{overflowY:'auto',flex:1}}>
          {filtered.length===0?(
            <div style={{padding:'24px',textAlign:'center',fontFamily:"'JetBrains Mono',monospace",fontSize:'.6rem',color:'#2e2d3c',letterSpacing:'2px',textTransform:'uppercase'}}>No results for "{q}"</div>
          ):filtered.map((a,i)=>(
            <div key={i} onClick={()=>{a.action();onClose();}} style={{display:'flex',alignItems:'center',gap:14,padding:'11px 18px',cursor:'pointer',borderBottom:'1px solid rgba(201,168,76,.03)',transition:'background .1s'}}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(201,168,76,.05)'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <span style={{fontFamily:"'Cinzel',serif",fontSize:'.9rem',color:'rgba(201,168,76,.45)',width:18,flexShrink:0}}>{a.icon}</span>
              <div>
                <div style={{fontSize:'.84rem',color:'#ddd8ce'}}>{a.label}</div>
                {a.sub&&<div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.56rem',color:'#3a3848',letterSpacing:'1px',marginTop:2}}>{a.sub}</div>}
              </div>
              <span style={{marginLeft:'auto',fontFamily:"'JetBrains Mono',monospace",fontSize:'.54rem',color:'#2e2d3c'}}>↵</span>
            </div>
          ))}
        </div>
        {q.length===0&&<div style={{padding:'8px 18px',borderTop:'1px solid rgba(201,168,76,.06)',display:'flex',gap:16}}>
          {[{k:'↵',l:'Select'},{k:'↑↓',l:'Navigate'},{k:'Esc',l:'Close'}].map(({k,l})=>(
            <div key={k} style={{display:'flex',alignItems:'center',gap:5}}>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.54rem',background:'#0a0a14',border:'1px solid rgba(201,168,76,.15)',color:'#c9a84c',padding:'2px 6px'}}>{k}</span>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.52rem',color:'#2e2d3c'}}>{l}</span>
            </div>
          ))}
        </div>}
      </div>
    </div>
  );
}

// ── HELP CENTER PAGE ────────────────────────────────────────────────────────
function HelpPage({setPage}) {
  const [activeSection, setActiveSection] = useState('getting-started');
  const sections = [
    {id:'getting-started',label:'Getting Started',icon:'ᛟ'},
    {id:'prospecting',label:'Prospecting',icon:'ᚦ'},
    {id:'pitching',label:'Pitching',icon:'ᚲ'},
    {id:'building',label:'Site Builder',icon:'ᛏ'},
    {id:'agency',label:'Agency OS',icon:'ᚱ'},
    {id:'shortcuts',label:'Keyboard Shortcuts',icon:'⌨'},
    {id:'faq',label:'FAQ',icon:'❓'},
  ];
  const CONTENT = {
    'getting-started': {
      title:'Getting Started with Rune Script',
      blocks:[
        {head:'The Core Loop',text:'Rune Script is built around a single repeatable workflow: Find a business → Pitch them before you dial → Build their site during the call → Close the deal. Everything else supports this loop.'},
        {head:'Step 1 — Run Your First Scan',text:'Go to Prospect Scanner. Type any city and any type of business — no restrictions. "HVAC in Austin TX", "tattoo shops in Chicago", "yoga studios in Lagos" — all work. Hit Scan. You get up to 20 results with lead scores, ratings, review counts, and a description of each business.'},
        {head:'Step 2 — Add to CRM',text:'Click "+ Add to CRM" on any prospect. They appear in your CRM pipeline under "Not Contacted." Update their status as you reach out.'},
        {head:'Step 3 — Generate a Pitch',text:'Go to Pitch Generator. Select the prospect from the dropdown. Choose a tone — or type your own custom tone. Hit Generate. You get a full pitch package: SMS text, call script, email, and a follow-up message. All four, ready to go.'},
        {head:'Step 4 — Build the Site',text:'Go to Site Builder. Describe the business (or choose from CRM). The AI builds a complete, real HTML website in about 15 seconds. Show the live preview on the call before they commit. Deploy to GitHub instantly with one click.'},
        {head:'Step 5 — Close and Invoice',text:'Mark the prospect as Closed in your CRM. Go to Agency OS → Clients — they appear automatically. Generate a proposal, send a contract, create an invoice. Mark as paid when the money comes in.'},
      ]
    },
    'prospecting': {
      title:'Prospect Scanner — Full Guide',
      blocks:[
        {head:'Scan Anything, Anywhere',text:'The scanner has zero restrictions. You can scan any business type in any city, country, or region in the world. "Plumbers in Dubai", "food trucks in São Paulo", "wedding photographers in Nashville" — all work identically.'},
        {head:'Lead Scoring',text:'Each prospect gets a score from 0–100. Score 90+ means high rating, lots of reviews, high visibility, and high chance of being interested. Score 70–89 is solid. Below 60 is a lower-confidence lead. Sort or filter your CRM to focus on high-scorers.'},
        {head:'Advanced Options',text:'Hit "More Options" in the scanner to set: minimum star rating, minimum review count, number of results (up to 20), and a keyword focus. Use keyword focus to narrow the type — "luxury", "family-owned", "24-hour", "woman-owned", etc.'},
        {head:'Add All at Once',text:'After a scan, hit "Add All to CRM" to import every result in one click. Then filter in the CRM by status or use the search bar to find specific prospects.'},
        {head:'Use the City Picker',text:'The city field has global autocomplete — start typing any city and suggestions appear. Hit the 📍 button to auto-fill your current location via GPS.'},
      ]
    },
    'pitching': {
      title:'Pitch Generator — Full Guide',
      blocks:[
        {head:'4 Formats, 1 Click',text:'Every pitch package contains: an SMS text (short, punchy, under 160 chars), a phone call script (conversational, handles objections), an email (subject line + body), and a follow-up SMS (for no-response follow-up 48 hours later).'},
        {head:'12 Preset Tones + Custom',text:'Choose from Direct, Professional, Casual, Urgent, Empathetic, Confident, Storytelling, Humorous, Technical, Luxury, Friendly, or Bold. Or type a completely custom tone in the text field below the presets — "Military-precise", "Southern charm", "1920s newspaper editor", anything works.'},
        {head:'Pitch From CRM',text:'You can select any CRM prospect from the dropdown without switching pages. The AI uses their actual business info (name, category, city, rating, review count) to personalize the pitch.'},
        {head:'Manual Entry',text:'Don\'t have the prospect in your CRM yet? Select "Enter manually" from the dropdown and fill in the business name, category, and city. Useful for pitching on the fly.'},
      ]
    },
    'building': {
      title:'Site Builder — Full Guide',
      blocks:[
        {head:'Multi-Page Building',text:'The site builder has 6 page tabs at the top: Home, About, Services, Contact, Gallery, Blog. Build each page independently. Pages marked ✦ are complete. Download all pages together or deploy all to GitHub at once.'},
        {head:'Template Starters',text:'On the Home tab, before you\'ve built anything, you\'ll see 8 template starters: HVAC, Hair Salon, Restaurant, Auto Repair, Law Firm, Cleaning, Dental, Landscaping. Click any tile to pre-fill a detailed prompt. Then edit it or hit Build.'},
        {head:'CRM Integration',text:'The "Build for a CRM Prospect" dropdown lets you select any prospect. It auto-fills a rich prompt with their business name, city, rating, review count, services, and description — zero typing required.'},
        {head:'Style Presets',text:'Use the "Quick Style Preset" dropdown to apply a style directive: Modern minimal, Bold high-contrast, Warm family-friendly, Luxury gold, etc. The "More Presets" button expands options for Add Features, Color Scheme, and Target Audience.'},
        {head:'Iterative Editing',text:'After the site is built, keep chatting. "Make the hero darker", "add a FAQ section", "change the button color to red", "add a Google Maps embed" — the AI updates the full site and reloads the preview.'},
        {head:'Clone and Download',text:'"Clone Page" downloads the current page as a copy. "Download All" downloads every built page as individual HTML files. "Deploy to GitHub" pushes all pages to a new public repo — add your GitHub token in Settings first.'},
      ]
    },
    'agency': {
      title:'Agency OS — Full Guide',
      blocks:[
        {head:'Client Pipeline',text:'Prospects marked "Closed" in the CRM automatically appear in Agency OS → Clients. This is your active client roster. Set a monthly maintenance fee for each client to track your MRR.'},
        {head:'Proposals',text:'Generate a professional web design proposal in one click. Select a prospect, hit Generate — the AI writes a full proposal with scope, timeline, investment, terms, and a "Why Us" section. Copy or print to PDF.'},
        {head:'Contracts',text:'The Contract Generator creates a legally-structured web design contract: deliverables, payment terms (50% upfront), 2-revision policy, IP transfer on final payment, 30-day bug fix warranty, and signature blocks. Print to PDF instantly.'},
        {head:'Invoices',text:'Create invoices with multiple line items, custom due dates, and a total. Mark as paid when received. Print any invoice to PDF with one click. The Revenue tab shows total invoiced, total paid, outstanding, and MRR.'},
        {head:'Call Analyzer',text:'After a sales call, paste your notes or a voice-to-text transcript into the Call Analyzer. The AI returns: call summary, sentiment, interest level, objections raised, prioritized action items, and a recommended next move.'},
        {head:'Intake Forms',text:'Before starting a project, use the Client Intake Form generator. Select the client — the AI creates a 15-20 question questionnaire tailored to their industry, covering design preferences, features needed, content situation, and timeline.'},
      ]
    },
    'shortcuts': {
      title:'Keyboard Shortcuts',
      blocks:[
        {head:'Navigation (hold G, then press a letter)',text:'G → D: Dashboard  |  G → S: Scanner  |  G → C: CRM  |  G → P: Pitch Generator  |  G → B: Site Builder  |  G → A: Agency OS  |  G → I: AI Studio  |  G → M: Marketplace'},
        {head:'Global shortcuts',text:'?: Show keyboard shortcuts panel  |  Cmd+K / Ctrl+K: Open command palette  |  Escape: Close any overlay or panel'},
        {head:'Note',text:'Shortcuts are disabled when you\'re typing in an input field or text area, so they won\'t interfere with your work.'},
      ]
    },
    'faq': {
      title:'Frequently Asked Questions',
      blocks:[
        {head:'Why does the scanner return AI-generated results instead of real ones?',text:'The free plan uses Claude to generate realistic prospect examples for demo and testing. Real Google Places + Yelp scanning activates when you add your Google Places API key in Settings. Once added, you get actual businesses from the real map data.'},
        {head:'How do I get my GitHub deploy working?',text:'Go to Settings → API Keys → paste your GitHub Personal Access Token (get one from github.com → Settings → Developer Settings → Personal Access Tokens → Tokens Classic, with repo scope). Save, then try deploying from Site Builder.'},
        {head:'The AI Studio isn\'t generating content — why?',text:'Make sure you either have a prospect selected from the dropdown OR have typed business details in the text area below it. The generator needs context about a specific business to produce relevant content.'},
        {head:'How does the demo mode work?',text:'Go to Settings, scroll down to Developer Tools, and enter the code to unlock it. Once unlocked, "Load Demo Data" fills the app with realistic sample prospects, pitches, proposals, and invoices so you can explore the full interface without having real clients yet.'},
        {head:'What does light mode actually do?',text:'Toggle the ☀ icon in the top bar. Light mode applies a warm cream color palette across the entire app and landing page. The sidebar stays dark intentionally as the brand anchor.'},
        {head:'How do I use Sage?',text:'Tap the ᚱ button in the bottom-right corner. Sage is your AI advisor — it knows your current page, your prospect count, active deals, and outstanding invoices. Ask it anything: "what should I do now", "how do I write a better pitch", "build me a site faster".'},
      ]
    },
  };

  const current = CONTENT[activeSection] || CONTENT['getting-started'];

  return (
    <div>
      <div className="sh"><div><div className="sh-title">Help Center</div><div className="sh-sub">Documentation, guides, and tutorials</div></div></div>
      <div style={{display:'grid',gridTemplateColumns:'200px 1fr',gap:0,background:'rgba(201,168,76,.03)',border:'1px solid rgba(201,168,76,.06)'}}>
        {/* Left nav */}
        <div style={{borderRight:'1px solid rgba(201,168,76,.06)',padding:'8px 0'}}>
          {sections.map(s=>(
            <div key={s.id} onClick={()=>setActiveSection(s.id)}
              style={{display:'flex',alignItems:'center',gap:10,padding:'10px 16px',cursor:'pointer',background:activeSection===s.id?'rgba(201,168,76,.07)':'transparent',borderLeft:activeSection===s.id?'2px solid #c9a84c':'2px solid transparent',transition:'all .15s'}}>
              <span style={{fontFamily:"'Cinzel',serif",fontSize:'.85rem',color:activeSection===s.id?'#c9a84c':'rgba(201,168,76,.25)'}}>{s.icon}</span>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.6rem',letterSpacing:'1px',textTransform:'uppercase',color:activeSection===s.id?'#ddd8ce':'#3a3848'}}>{s.label}</span>
            </div>
          ))}
        </div>
        {/* Content */}
        <div style={{padding:28,overflowY:'auto',maxHeight:'70vh'}}>
          <h2 style={{fontFamily:"'Cinzel',serif",fontSize:'1.1rem',fontWeight:700,color:'#ddd8ce',marginBottom:24,paddingBottom:14,borderBottom:'1px solid rgba(201,168,76,.06)'}}>{current.title}</h2>
          {current.blocks.map((b,i)=>(
            <div key={i} style={{marginBottom:22}}>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:'.88rem',fontWeight:700,color:'#c9a84c',marginBottom:6}}>{b.head}</div>
              <p style={{fontSize:'.84rem',fontWeight:300,color:'#7a7888',lineHeight:1.9}}>{b.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── AGENCY BRANDING PAGE ────────────────────────────────────────────────────
function BrandingPage({toast}) {
  const [brand, setBrand] = useState({
    name: '',
    tagline: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    primaryColor: '#c9a84c',
    accentColor: '#4a7aaa',
    logoText: '',
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    window.storage.get('rs3_brand').then(r => {
      if(r) setBrand(JSON.parse(r.value));
    }).catch(()=>{});
  }, []);

  const save = async () => {
    try {
      await window.storage.set('rs3_brand', JSON.stringify(brand));
      setSaved(true);
      toast('Agency branding saved. Proposals and contracts will now auto-brand to your agency.', 'success');
      setTimeout(() => setSaved(false), 3000);
    } catch(e) { toast('Save failed.', 'error'); }
  };

  return (
    <div>
      <div className="sh"><div><div className="sh-title">Agency Branding</div><div className="sh-sub">Your brand is applied to proposals, contracts, and invoices</div></div></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:12}}>
        <div className="card">
          <div className="card-title" style={{marginBottom:4}}>Agency Identity</div>
          <div className="card-sub" style={{marginBottom:16}}>How your agency appears to clients</div>
          <div className="field"><label>Agency Name</label><input className="inp" placeholder="Apex Design Studio" value={brand.name} onChange={e=>setBrand(b=>({...b,name:e.target.value}))}/></div>
          <div className="field"><label>Tagline</label><input className="inp" placeholder="Websites that win clients" value={brand.tagline} onChange={e=>setBrand(b=>({...b,tagline:e.target.value}))}/></div>
          <div className="field"><label>Logo Text / Initials</label><input className="inp" placeholder="ADS" maxLength={4} value={brand.logoText} onChange={e=>setBrand(b=>({...b,logoText:e.target.value}))}/></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div className="field"><label>Primary Color</label>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <input type="color" value={brand.primaryColor} onChange={e=>setBrand(b=>({...b,primaryColor:e.target.value}))} style={{width:36,height:36,border:'1px solid rgba(201,168,76,.2)',background:'none',cursor:'pointer',padding:2}}/>
                <input className="inp" value={brand.primaryColor} onChange={e=>setBrand(b=>({...b,primaryColor:e.target.value}))} style={{flex:1,fontFamily:"'JetBrains Mono',monospace",fontSize:'.72rem'}}/>
              </div>
            </div>
            <div className="field"><label>Accent Color</label>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <input type="color" value={brand.accentColor} onChange={e=>setBrand(b=>({...b,accentColor:e.target.value}))} style={{width:36,height:36,border:'1px solid rgba(201,168,76,.2)',background:'none',cursor:'pointer',padding:2}}/>
                <input className="inp" value={brand.accentColor} onChange={e=>setBrand(b=>({...b,accentColor:e.target.value}))} style={{flex:1,fontFamily:"'JetBrains Mono',monospace",fontSize:'.72rem'}}/>
              </div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-title" style={{marginBottom:4}}>Contact Information</div>
          <div className="card-sub" style={{marginBottom:16}}>Appears on proposals, contracts, and invoices</div>
          <div className="field"><label>Email</label><input className="inp" type="email" placeholder="hello@apexdesign.com" value={brand.email} onChange={e=>setBrand(b=>({...b,email:e.target.value}))}/></div>
          <div className="field"><label>Phone</label><input className="inp" placeholder="(704) 555-0100" value={brand.phone} onChange={e=>setBrand(b=>({...b,phone:e.target.value}))}/></div>
          <div className="field"><label>Website</label><input className="inp" placeholder="https://apexdesign.com" value={brand.website} onChange={e=>setBrand(b=>({...b,website:e.target.value}))}/></div>
          <div className="field"><label>Business Address</label><input className="inp" placeholder="Charlotte, NC" value={brand.address} onChange={e=>setBrand(b=>({...b,address:e.target.value}))}/></div>
        </div>
      </div>
      {/* Live preview */}
      <div className="card" style={{marginTop:12}}>
        <div className="card-title" style={{marginBottom:12}}>Preview — How your brand looks on documents</div>
        <div style={{background:'#f8f6f0',padding:28,borderRadius:2,color:'#111',fontFamily:'sans-serif'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:28}}>
            <div style={{display:'flex',alignItems:'center',gap:14}}>
              <div style={{width:44,height:44,background:brand.primaryColor,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:'.9rem',fontFamily:'serif'}}>
                {brand.logoText || (brand.name||'RS')[0]}
              </div>
              <div>
                <div style={{fontWeight:700,fontSize:'1rem'}}>{brand.name||'Your Agency Name'}</div>
                <div style={{fontSize:'.78rem',color:'#666'}}>{brand.tagline||'Your tagline here'}</div>
              </div>
            </div>
            <div style={{textAlign:'right',fontSize:'.78rem',color:'#888',lineHeight:1.7}}>
              {brand.email&&<div>{brand.email}</div>}
              {brand.phone&&<div>{brand.phone}</div>}
              {brand.address&&<div>{brand.address}</div>}
            </div>
          </div>
          <div style={{borderTop:`3px solid ${brand.primaryColor}`,paddingTop:16}}>
            <div style={{fontWeight:700,fontSize:'1.1rem',color:brand.primaryColor,marginBottom:4}}>WEB DESIGN PROPOSAL</div>
            <div style={{fontSize:'.78rem',color:'#666'}}>Prepared for: [Client Name] · {new Date().toLocaleDateString()}</div>
          </div>
        </div>
      </div>
      <div style={{marginTop:12,display:'flex',gap:10}}>
        <button className="btn btn-gold" onClick={save}>{saved?'✦ Saved!':'Save Branding'}</button>
        <p style={{fontSize:'.76rem',fontWeight:300,color:'#3a3848',lineHeight:1.7,maxWidth:400}}>Your branding is used in all proposals, contracts, and invoices generated by Rune Script. It's saved to your account and persists across sessions.</p>
      </div>
    </div>
  );
}


// ── ACTIVITY LOG PAGE ──────────────────────────────────────────────────────
function ActivityLogPage({prospects,pitches,proposals,invoices}) {
  const events = [
    ...prospects.map(p=>({type:'prospect',text:`Added ${p.name} to CRM`,sub:`${p.city} · Score ${p.leadScore}`,time:p.addedAt,color:'#c9a84c',icon:'ᚦ'})),
    ...prospects.filter(p=>p.status!=='Not Contacted').map(p=>({type:'status',text:`${p.name} → ${p.status}`,sub:`${p.category} · ${p.city}`,time:p.lastActivity||p.addedAt,color:PIPE_COLORS[p.status]||'#c9a84c',icon:'ᚨ'})),
    ...pitches.map(p=>({type:'pitch',text:`Pitch generated for ${p.prospectName}`,sub:`${p.tone} tone · ${p.generatedAt}`,time:p.generatedAt,color:'#4a7aaa',icon:'ᚲ'})),
    ...proposals.map(p=>({type:'proposal',text:`Proposal created for ${p.client}`,sub:`Status: ${p.status}`,time:p.createdAt,color:'#7ac89a',icon:'ᚱ'})),
    ...invoices.map(i=>({type:'invoice',text:`Invoice created for ${i.client}`,sub:`$${Number(i.total).toLocaleString()} · ${i.status}`,time:i.createdAt,color:i.status==='Paid'?'#7ac89a':'#c9a84c',icon:'ᛊ'})),
  ].sort((a,b)=>String(b.time||'').localeCompare(String(a.time||''))).slice(0,80);

  return (
    <div>
      <div className="sh"><div><div className="sh-title">Activity Log</div><div className="sh-sub">Every action across your entire workspace</div></div></div>
      {events.length===0?(
        <div className="empty"><div className="empty-rune">ᛟ</div><div className="empty-title">No activity yet</div><div className="empty-sub">Your activity will appear here as you use the platform.</div></div>
      ):(
        <div className="card">
          <div className="activity-timeline">
            {events.map((e,i)=>(
              <div key={i} className="activity-event" style={{'--dot-color':e.color}}>
                <div className="activity-event" style={{marginBottom:14,paddingLeft:0}}>
                  <div style={{position:'absolute',left:-20,top:6,width:8,height:8,borderRadius:'50%',background:e.color,border:'2px solid #07070e'}}/>
                  <div className="activity-time">{e.time||'—'}</div>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontFamily:"'Cinzel',serif",fontSize:'.82rem',color:e.color}}>{e.icon}</span>
                    <div>
                      <div className="activity-text" style={{color:'#9a96a2',fontWeight:400}}>{e.text}</div>
                      {e.sub&&<div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.54rem',color:'#2e2d3c',letterSpacing:'1px',marginTop:2}}>{e.sub}</div>}
                    </div>
                    <span style={{marginLeft:'auto',fontFamily:"'JetBrains Mono',monospace",fontSize:'.52rem',padding:'2px 6px',border:`1px solid ${e.color}44`,color:e.color,textTransform:'uppercase',letterSpacing:'1px'}}>{e.type}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── IMPORT / EXPORT PAGE ────────────────────────────────────────────────────
function ImportExportPage({prospects,pitches,proposals,invoices,addProspect,toast}) {
  const [importing,setImporting]=useState(false);
  const [preview,setPreview]=useState([]);
  const [importMsg,setImportMsg]=useState('');
  const fileRef=useRef(null);

  const handleFile=async(file)=>{
    if(!file){return;}
    setImporting(true);
    try{
      const text=await file.text();
      const rows=text.split('\n').filter(r=>r.trim());
      const headers=rows[0].split(',').map(h=>h.trim().toLowerCase().replace(/"/g,''));
      const data=rows.slice(1,6).map(row=>{
        const vals=row.split(',').map(v=>v.trim().replace(/"/g,''));
        const obj={};
        headers.forEach((h,i)=>{obj[h]=vals[i]||'';});
        return obj;
      });
      setPreview(data);
      setImportMsg(`Found ${rows.length-1} prospects. Preview showing first 5.`);
    }catch(e){toast('Could not parse file. Make sure it\'s a CSV.','error');}
    setImporting(false);
  };

  const importAll=async(file)=>{
    if(!file){return;}
    const text=await file.text();
    const rows=text.split('\n').filter(r=>r.trim());
    const headers=rows[0].split(',').map(h=>h.trim().toLowerCase().replace(/"/g,''));
    let count=0;
    for(const row of rows.slice(1)){
      const vals=row.split(',').map(v=>v.trim().replace(/"/g,''));
      const obj={};
      headers.forEach((h,i)=>{obj[h]=vals[i]||'';});
      const prospect={
        id:uid(),
        name:obj.name||obj['business name']||obj['company']||'Unknown Business',
        phone:obj.phone||obj['phone number']||'',
        address:obj.address||obj['street address']||'',
        city:obj.city||obj['city, state']||'',
        category:obj.category||obj['type']||obj['industry']||'Service Business',
        rating:parseFloat(obj.rating||obj['google rating']||'4.8'),
        reviews:parseInt(obj.reviews||obj['review count']||'50'),
        services:[obj.service1||'Service 1',obj.service2||'Service 2',obj.service3||'Service 3'].filter(s=>s&&s!=='Service 1'||true),
        description:obj.description||obj['notes']||`${obj.name||'Business'} in ${obj.city||'your city'}.`,
        leadScore:parseInt(obj.score||obj['lead score']||'75'),
        status:obj.status||'Not Contacted',
        notes:obj.notes||'',
        addedAt:now(),
        lastActivity:now(),
      };
      addProspect(prospect);
      count++;
    }
    toast(`Imported ${count} prospects into CRM.`,'success');
    setPreview([]);setImportMsg('');
  };

  const exportProspects=()=>{
    const headers=['name','phone','address','city','category','rating','reviews','leadScore','status','notes','addedAt'];
    const rows=[headers.join(','),...prospects.map(p=>headers.map(h=>JSON.stringify(p[h]||'')).join(','))];
    const blob=new Blob([rows.join('\n')],{type:'text/csv'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='runescript-prospects.csv';a.click();
    toast(`Exported ${prospects.length} prospects.`,'success');
  };
  const exportAll=()=>{
    const data={prospects,pitches,proposals,invoices,exportedAt:now()};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='runescript-backup.json';a.click();
    toast('Full backup downloaded.','success');
  };

  return(
    <div>
      <div className="sh"><div><div className="sh-title">Import & Export</div><div className="sh-sub">Bring in existing lists, back up your data</div></div></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:12,marginBottom:16}}>
        <div className="card">
          <div className="card-title" style={{marginBottom:4}}>Import Prospects</div>
          <div className="card-sub" style={{marginBottom:16}}>CSV from any spreadsheet, HubSpot, or other CRM</div>
          <div className="import-zone" onClick={()=>fileRef.current?.click()}>
            <input ref={fileRef} type="file" accept=".csv,.txt" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f){handleFile(f);}}}/>
            <div className="import-zone-icon">↑</div>
            <div className="import-zone-title">Drop a CSV or click to browse</div>
            <div className="import-zone-sub">Columns: name, phone, city, category, rating, reviews, notes</div>
          </div>
          {importMsg&&<div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.6rem',color:'#c9a84c',letterSpacing:'1.5px',textTransform:'uppercase',margin:'10px 0'}}>{importMsg}</div>}
          {preview.length>0&&(
            <>
              <div style={{overflowX:'auto',marginBottom:10}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <tbody>{preview.map((row,i)=>(
                    <tr key={i}>
                      <td style={{padding:'5px 8px',fontSize:'.72rem',color:'#9a96a2',borderBottom:'1px solid rgba(201,168,76,.05)'}}>{row.name||row['business name']||'—'}</td>
                      <td style={{padding:'5px 8px',fontSize:'.72rem',color:'#5a5868',borderBottom:'1px solid rgba(201,168,76,.05)'}}>{row.city||'—'}</td>
                      <td style={{padding:'5px 8px',fontSize:'.72rem',color:'#5a5868',borderBottom:'1px solid rgba(201,168,76,.05)'}}>{row.category||row.type||'—'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              <button className="btn btn-gold btn-full" onClick={()=>fileRef.current?.files?.[0]&&importAll(fileRef.current.files[0])}>
                Import All Prospects →
              </button>
            </>
          )}
        </div>
        <div className="card">
          <div className="card-title" style={{marginBottom:4}}>Export Your Data</div>
          <div className="card-sub" style={{marginBottom:16}}>Download everything as CSV or full JSON backup</div>
          {[
            {label:'Prospects CSV',sub:`${prospects.length} prospects`,action:exportProspects,icon:'ᚦ'},
            {label:'Full Backup (JSON)',sub:`All CRM, pitches, proposals, invoices`,action:exportAll,icon:'ᛟ'},
          ].map((e,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 0',borderBottom:'1px solid rgba(201,168,76,.06)'}}>
              <span style={{fontFamily:"'Cinzel',serif",color:'rgba(201,168,76,.4)',fontSize:'1rem'}}>{e.icon}</span>
              <div style={{flex:1}}><div style={{fontFamily:"'Cinzel',serif",fontSize:'.84rem',fontWeight:600,color:'#ddd8ce',marginBottom:2}}>{e.label}</div><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.56rem',color:'#3a3848',letterSpacing:'1px'}}>{e.sub}</div></div>
              <button className="btn btn-ghost btn-sm" onClick={e.action}>↓ Download</button>
            </div>
          ))}
          <div style={{marginTop:16,background:'rgba(201,168,76,.04)',border:'1px solid rgba(201,168,76,.08)',padding:'12px 14px'}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.56rem',letterSpacing:'2px',textTransform:'uppercase',color:'#3a3848',marginBottom:5}}>What's Included</div>
            <div style={{fontSize:'.76rem',fontWeight:300,color:'#5a5868',lineHeight:1.7}}>
              Full backup includes all prospects, pitches, proposals, and invoices in a single JSON file. Re-importable into any system or for safe-keeping before major changes.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ROADMAP PAGE ────────────────────────────────────────────────────────────
function RoadmapPage() {
  const phases=[
    {phase:"Now — Shipped ✦",items:[
      {title:"Multi-Page Site Builder",desc:"Build Home, About, Services, Contact, Gallery, and Blog pages independently. Deploy all to GitHub at once.",status:"live"},
      {title:"470+ Marketplace Templates",desc:"Templates across 41 categories. Browse, buy, save to library, and use as site starting points.",status:"live"},
      {title:"AI Advisor (Sage)",desc:"Floating AI chat that knows your full platform context. Answers questions, navigates pages, gives advice.",status:"live"},
      {title:"Command Palette",desc:"Cmd+K opens a spotlight search for pages, prospects, and actions.",status:"live"},
      {title:"Agency Branding",desc:"Set your agency name, colors, and contact info. Applied to all proposals, contracts, and invoices.",status:"live"},
      {title:"Call Transcript Analyzer",desc:"Paste call notes or voice-to-text. Get summary, sentiment, objections, and action items.",status:"live"},
      {title:"Client Intake Form Generator",desc:"Generate a custom onboarding questionnaire for any client in their industry.",status:"live"},
      {title:"Contract Generator with Print PDF",desc:"Full web design contract with signature blocks. Print to PDF in one click.",status:"live"},
      {title:"Kanban CRM View",desc:"Toggle between table and Kanban board view. See all prospects in visual status columns.",status:"live"},
      {title:"Help Center",desc:"Full documentation: Getting Started, Prospecting, Pitching, Building, Agency OS, Shortcuts, FAQ.",status:"live"},
    ]},
    {phase:"Next — In Progress",items:[
      {title:"Real Prospect Scanning",desc:"Google Places API + Yelp integration. Real businesses, real reviews, real phone numbers.",status:"building"},
      {title:"Email Delivery",desc:"Send pitches directly from the platform via Resend. Track opens and replies.",status:"building"},
      {title:"Netlify One-Click Deploy",desc:"Deploy to Netlify directly from Site Builder without GitHub.",status:"building"},
      {title:"Stripe Invoice Links",desc:"Send clients a payment link on any invoice. Get paid online.",status:"building"},
      {title:"Client Portal",desc:"Separate login for clients to view proposals, approve revisions, and pay invoices.",status:"building"},
    ]},
    {phase:"Soon — Planned",items:[
      {title:"Drag-and-Drop Visual Editor",desc:"Wix-style editor on top of built sites. Resize, reposition, and restyle any element.",status:"planned"},
      {title:"E-Commerce Builder",desc:"Add a full product store to any client site. Stripe checkout, inventory, order management.",status:"planned"},
      {title:"Booking System",desc:"Appointment scheduling for service businesses. Calendar sync, confirmations, reminders.",status:"planned"},
      {title:"Mobile App (iOS + Android)",desc:"Full Rune Script experience as a native app. Scan prospects, pitch, and manage CRM from anywhere.",status:"planned"},
      {title:"White Label",desc:"Full platform under your brand. Your clients never see Rune Script.",status:"planned"},
      {title:"Voicemail Drop",desc:"Leave pre-recorded voicemails for prospects with one click.",status:"planned"},
      {title:"AI A/B Testing",desc:"Two versions of a page, AI routes traffic and picks the winner.",status:"planned"},
      {title:"Heatmap Integration",desc:"Microsoft Clarity or Hotjar embed on any client site with one click.",status:"planned"},
    ]},
    {phase:"Future — Roadmap",items:[
      {title:"Reseller Program (Warden)",desc:"White-label Rune Script and resell it to other designers. Keep 100% of the margin.",status:"future"},
      {title:"AI Call Coach",desc:"Practice your pitch against an AI prospect that gives you real objections.",status:"future"},
      {title:"Revenue Share Marketplace",desc:"Earn passive income from templates and pitch scripts you sell to other Rune Script users.",status:"future"},
      {title:"Public Agency Directory",desc:"List your agency for local businesses to find you directly through Rune Script.",status:"future"},
      {title:"Multi-Currency Invoicing",desc:"Invoice clients in any currency. Supports USD, GBP, EUR, CAD, AUD, and more.",status:"future"},
    ]},
  ];
  const STATUS_STYLE={
    live:{bg:'rgba(122,200,154,.1)',border:'rgba(122,200,154,.3)',color:'#7ac89a',label:'LIVE'},
    building:{bg:'rgba(201,168,76,.08)',border:'rgba(201,168,76,.2)',color:'#c9a84c',label:'BUILDING'},
    planned:{bg:'rgba(74,122,170,.08)',border:'rgba(74,122,170,.2)',color:'#4a7aaa',label:'PLANNED'},
    future:{bg:'rgba(90,88,104,.08)',border:'rgba(90,88,104,.15)',color:'#5a5868',label:'FUTURE'},
  };
  return(
    <div>
      <div className="sh"><div><div className="sh-title">Roadmap</div><div className="sh-sub">What we've shipped, what's coming, and what's next</div></div></div>
      <div style={{background:'rgba(201,168,76,.05)',border:'1px solid rgba(201,168,76,.12)',padding:'14px 18px',marginBottom:20,display:'flex',gap:10,alignItems:'center'}}>
        <span style={{fontFamily:"'Cinzel',serif",color:'#c9a84c',fontSize:'1rem'}}>ᚱ</span>
        <p style={{fontSize:'.84rem',fontWeight:300,color:'#7a7888',lineHeight:1.6}}>This is the live Rune Script development roadmap. Have a feature request? Use Sage (bottom-right) and tell it what you need — requests are logged and reviewed weekly.</p>
      </div>
      {phases.map((ph,pi)=>(
        <div key={pi} className="roadmap-phase">
          <div className="roadmap-phase-title">{ph.phase}<div style={{flex:1,height:1,background:'rgba(201,168,76,.06)'}}/></div>
          {ph.items.map((item,ii)=>{
            const s=STATUS_STYLE[item.status];
            return(
              <div key={ii} className="roadmap-item">
                <span className="roadmap-status" style={{background:s.bg,borderColor:s.border,color:s.color}}>{s.label}</span>
                <div>
                  <div className="roadmap-item-title">{item.title}</div>
                  <div className="roadmap-item-desc">{item.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── AFFILIATE PAGE ──────────────────────────────────────────────────────────
function AffiliatePage({user,toast}) {
  const [handle,setHandle]=useState('');
  const [applied,setApplied]=useState(false);
  const [payout,setPayout]=useState('paypal');
  const [payoutEmail,setPayoutEmail]=useState('');
  const refCode=user?.name?.toLowerCase().replace(/\s+/g,'')||'yourname';
  const refLink=`https://runescript.app?ref=${refCode}`;

  return(
    <div>
      <div className="sh"><div><div className="sh-title">Affiliate Program</div><div className="sh-sub">Refer web designers. Earn 20% monthly for a full year.</div></div></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:2,background:'rgba(201,168,76,.04)',border:'1px solid rgba(201,168,76,.06)',marginBottom:20}}>
        {[{n:'20%',l:'Monthly commission'},{n:'12',l:'Months per referral'},{n:'∞',l:'No referral limit'},{n:'$0',l:'Cost to join'},{n:'30d',l:'Cookie window'}].map((s,i)=>(
          <div key={i} style={{background:'#07070e',padding:'24px 16px',textAlign:'center'}}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:'1.8rem',fontWeight:700,color:'#c9a84c',lineHeight:1}}>{s.n}</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.56rem',letterSpacing:'1.5px',textTransform:'uppercase',color:'#3a3848',marginTop:6}}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:12}}>
        <div className="card">
          <div className="card-title" style={{marginBottom:4}}>Your Referral Link</div>
          <div className="card-sub" style={{marginBottom:14}}>Share this with anyone who builds websites for a living</div>
          <div style={{background:'#0a0a14',border:'1px solid rgba(201,168,76,.1)',padding:'12px 14px',display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.68rem',color:'#c9a84c',flex:1,wordBreak:'break-all'}}>{refLink}</div>
            <button className="btn btn-gold btn-xs" onClick={()=>{navigator.clipboard.writeText(refLink);toast('Referral link copied!','success');}}>Copy</button>
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {['Share on LinkedIn','Tweet It','Copy to Email'].map((l,i)=>(
              <button key={i} className="btn btn-ghost btn-xs" onClick={()=>{navigator.clipboard.writeText(refLink);toast(`${l} — link copied!`,'success');}}>{l}</button>
            ))}
          </div>
          <div className="divider"/>
          <div className="card-sub" style={{marginBottom:10}}>How it works</div>
          {['Someone clicks your link and visits runescript.app','They sign up — your code is tracked for 30 days','When they upgrade to any paid plan, you earn 20% of their monthly fee','You keep earning every month they stay subscribed, for up to 12 months'].map((s,i)=>(
            <div key={i} style={{display:'flex',gap:12,marginBottom:8,alignItems:'flex-start'}}>
              <div style={{width:20,height:20,background:'rgba(201,168,76,.1)',border:'1px solid rgba(201,168,76,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Cinzel',serif",fontSize:'.7rem',color:'#c9a84c',flexShrink:0}}>{i+1}</div>
              <div style={{fontSize:'.8rem',fontWeight:300,color:'#7a7888',lineHeight:1.6}}>{s}</div>
            </div>
          ))}
        </div>
        <div className="card">
          {!applied?(
            <>
              <div className="card-title" style={{marginBottom:4}}>Join the Program</div>
              <div className="card-sub" style={{marginBottom:16}}>Get approved in 24 hours</div>
              <div className="field"><label>Your Handle / Username</label><input className="inp" placeholder="@yourhandle" value={handle} onChange={e=>setHandle(e.target.value)}/></div>
              <div className="field"><label>Payout Method</label>
                <select className="inp" value={payout} onChange={e=>setPayout(e.target.value)}>
                  {['PayPal','Stripe Connect','Bank Transfer (ACH)','Crypto (USDC)'].map(p=><option key={p} value={p.toLowerCase()}>{p}</option>)}
                </select>
              </div>
              <div className="field"><label>Payout Email / Address</label><input className="inp" placeholder="payments@youremail.com" value={payoutEmail} onChange={e=>setPayoutEmail(e.target.value)}/></div>
              <button className="btn btn-gold btn-full" onClick={()=>{if(!handle||!payoutEmail){toast('Fill in all fields.','error');return;}setApplied(true);toast('Application submitted! Approved within 24 hours.','success');}}>Join Affiliate Program →</button>
            </>
          ):(
            <div style={{textAlign:'center',padding:'20px 0'}}>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:'1.5rem',color:'#c9a84c',marginBottom:12}}>✦</div>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:'1rem',fontWeight:700,color:'#ddd8ce',marginBottom:6}}>Application Received</div>
              <p style={{fontSize:'.82rem',fontWeight:300,color:'#5a5868',lineHeight:1.8}}>We review within 24 hours. Once approved, your referral link activates and earnings start tracking automatically.</p>
            </div>
          )}
          <div className="divider"/>
          <div className="card-sub" style={{marginBottom:10}}>Example earnings</div>
          {[{plan:'Seeker ($10/mo)',earn:'$2/mo',year:'$24/yr per referral'},{plan:'Archon ($99/mo)',earn:'$19.80/mo',year:'$237.60/yr per referral'},{plan:'Sovereign ($199/mo)',earn:'$39.80/mo',year:'$477.60/yr per referral'},{plan:'Warden ($349/mo)',earn:'$69.80/mo',year:'$837.60/yr per referral'}].map((e,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:'1px solid rgba(201,168,76,.04)'}}>
              <div style={{fontSize:'.78rem',fontWeight:300,color:'#5a5868'}}>{e.plan}</div>
              <div style={{display:'flex',gap:12,alignItems:'center'}}>
                <div style={{fontFamily:"'Cinzel',serif",fontSize:'.82rem',color:'#7ac89a'}}>{e.earn}</div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.56rem',color:'#3a3848',letterSpacing:'1px'}}>{e.year}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── EMAIL SEQUENCE BUILDER ──────────────────────────────────────────────────
function EmailSequencePage({prospects,toast}) {
  const [selId,setSelId]=useState('');
  const [goal,setGoal]=useState('Close a web design deal');
  const [loading,setLoading]=useState(false);
  const [sequence,setSequence]=useState(null);

  const generate=async()=>{
    const p=prospects.find(pr=>pr.id===selId);
    if(!p){toast('Select a prospect first.','error');return;}
    setLoading(true);setSequence(null);
    try{
      const prompt=`Create a 5-step email outreach sequence for a web designer targeting "${p.name}", a ${p.category} business in ${p.city} with ${p.rating} stars. Goal: ${goal}. Return ONLY valid JSON: {"steps":[{"day":0,"subject":"...","type":"Email","body":"..."},{"day":2,"subject":"...","type":"SMS","body":"..."},{"day":5,"subject":"...","type":"Email","body":"..."},{"day":8,"subject":"...","type":"Call Script","body":"..."},{"day":14,"subject":"...","type":"Email","body":"..."}]}. Make each step highly personalized and different in approach.`;
      const raw=await callClaude(prompt,1600);
      const parsed=JSON.parse(raw.replace(/```json|```/g,'').trim());
      setSequence(parsed);toast('Sequence generated.','success');
    }catch(e){toast('Generation failed.','error');}
    setLoading(false);
  };

  return(
    <div>
      <div className="sh"><div><div className="sh-title">Email Sequence Builder</div><div className="sh-sub">Multi-step outreach campaigns — built in one click</div></div></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:12}}>
        <div className="card">
          <div className="card-sub" style={{marginBottom:10}}>Build a Sequence</div>
          <div className="field"><label>Prospect</label>
            <select className="inp" value={selId} onChange={e=>setSelId(e.target.value)}>
              <option value="">— Select from CRM —</option>
              {prospects.map(p=><option key={p.id} value={p.id}>{p.name} · {p.city}</option>)}
            </select>
          </div>
          <div className="field"><label>Campaign Goal</label>
            <select className="inp" value={goal} onChange={e=>setGoal(e.target.value)}>
              {['Close a web design deal','Sell a maintenance retainer','Upsell social media management','Re-engage a cold prospect','Follow up after no response','Convert a "not now" to a yes'].map(g=><option key={g}>{g}</option>)}
            </select>
          </div>
          <div style={{background:'#0a0a14',border:'1px solid rgba(201,168,76,.06)',padding:'12px 14px',marginBottom:14}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.56rem',letterSpacing:'2px',textTransform:'uppercase',color:'#3a3848',marginBottom:5}}>What you get</div>
            <div style={{fontSize:'.76rem',fontWeight:300,color:'#5a5868',lineHeight:1.7}}>5 touchpoints over 14 days. Mix of email, SMS, and call scripts. Each one different in approach — intro, value, social proof, urgency, and final attempt.</div>
          </div>
          <button className="btn btn-gold btn-full" onClick={generate} disabled={loading||!selId}>{loading?<><Spinner/>Building sequence…</>:'Generate Sequence →'}</button>
        </div>
        <div>
          {loading&&<div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:14,padding:'48px 0'}}><Spinner lg/><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.6rem',color:'#2e2d3c',letterSpacing:'2px',textTransform:'uppercase'}}>Building your sequence…</div></div>}
          {sequence?.steps&&(
            <>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.56rem',letterSpacing:'2px',textTransform:'uppercase',color:'#3a3848',marginBottom:10}}>Your 14-Day Sequence</div>
              {sequence.steps.map((s,i)=>(
                <div key={i} className="seq-step">
                  <div className="seq-step-head">
                    <span className="seq-step-num">0{i+1}</span>
                    <div><div className="seq-step-day">Day {s.day}</div>{s.subject&&<div style={{fontSize:'.76rem',color:'#ddd8ce',marginTop:2}}>{s.subject}</div>}</div>
                    <span className="seq-step-type badge b-gold">{s.type}</span>
                  </div>
                  <div className="seq-step-body">
                    <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:'.84rem',fontWeight:300,color:'#c9b87a',lineHeight:1.85,whiteSpace:'pre-wrap'}}>{s.body}</p>
                    <div style={{display:'flex',gap:6,marginTop:8}}>
                      <button className="btn btn-ghost btn-xs" onClick={()=>{navigator.clipboard.writeText(s.body);toast('Copied.','success');}}>Copy</button>
                    </div>
                  </div>
                </div>
              ))}
              <button className="btn btn-ghost btn-sm" style={{marginTop:8,width:'100%'}} onClick={()=>{const all=sequence.steps.map((s,i)=>`--- DAY ${s.day} — ${s.type} ---\n${s.subject?'Subject: '+s.subject+'\n\n':''} ${s.body}`).join('\n\n');navigator.clipboard.writeText(all);toast('Full sequence copied.','success');}}>Copy Full Sequence</button>
            </>
          )}
          {!sequence&&!loading&&<div className="empty"><div className="empty-rune">ᚲ</div><div className="empty-title">No sequence yet</div><div className="empty-sub">Select a prospect and hit Generate.</div></div>}
        </div>
      </div>
    </div>
  );
}


// ── CREATOR PROGRAM STANDALONE PAGE ───────────────────────────────────────
function CreatorPage({toast}) {
  const [applied,setApplied]=useState(false);
  const [tier,setTier]=useState('archon');
  const [platform,setPlatform]=useState('');
  const [handle,setHandle]=useState('');
  const [followers,setFollowers]=useState('');
  const [why,setWhy]=useState('');
  const TIERS=[
    {id:'archon',name:'Archon Creator',plan:'Archon ($99/mo)',req:'1,000+ engaged followers on any platform',perks:['Free Archon plan ($99/mo value)','Early access to new features','ᚱ Archon badge on your profile','Priority support','Monthly creator call with the team']},
    {id:'sovereign',name:'Sovereign Creator',plan:'Sovereign ($199/mo)',req:'5,000+ followers or strong portfolio',perks:['Free Sovereign plan ($199/mo value)','Co-marketing opportunities','Featured in Rune Script newsletter','Custom referral link with higher commission (25%)','Direct line to product team']},
    {id:'collab',name:'Collaboration Partner',plan:'Custom arrangement',req:'10,000+ followers or media presence',perks:['Custom platform arrangement','Revenue share on content-driven sales','Co-created tutorials and content','Speaking opportunities at Rune Script events','Equity consideration for long-term partners']},
  ];
  return(
    <div>
      <div className="sh"><div><div className="sh-title">Creator Program</div><div className="sh-sub">Get a free plan in exchange for authentic content</div></div></div>
      <div style={{background:'linear-gradient(135deg,rgba(201,168,76,.08) 0%,transparent 100%)',border:'1px solid rgba(201,168,76,.15)',padding:'28px 24px',marginBottom:20}}>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:'1.4rem',fontWeight:700,color:'#ddd8ce',marginBottom:8}}>The deal is simple.</div>
        <p style={{fontSize:'.9rem',fontWeight:300,color:'#9a96a2',lineHeight:1.9,maxWidth:600}}>You make content about Rune Script — tutorials, walkthroughs, results, reviews — and post it on your platform. We give you a free plan worth up to $199/month. No scripted ads, no fake testimonials. Just honest content from a real user.</p>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:10,marginBottom:20}}>
        {TIERS.map(t=>(
          <div key={t.id} onClick={()=>setTier(t.id)} className="creator-tier" style={{background:tier===t.id?'rgba(201,168,76,.07)':'#0d0d18',border:`1px solid ${tier===t.id?'rgba(201,168,76,.3)':'rgba(201,168,76,.08)'}`,padding:20,cursor:'pointer',transition:'all .2s'}}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:'.9rem',fontWeight:700,color:'#ddd8ce',marginBottom:4}}>{t.name}</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.58rem',letterSpacing:'1.5px',color:'#c9a84c',textTransform:'uppercase',marginBottom:10}}>{t.plan}</div>
            <div style={{fontSize:'.74rem',fontWeight:300,color:'#5a5868',marginBottom:12,lineHeight:1.5}}>Requires: {t.req}</div>
            {t.perks.map((p,i)=><div key={i} style={{display:'flex',gap:8,marginBottom:5,fontSize:'.76rem',fontWeight:300,color:'#7a7888'}}><span style={{color:'#c9a84c',flexShrink:0}}>✦</span>{p}</div>)}
          </div>
        ))}
      </div>
      {!applied?(
        <div className="card">
          <div className="card-title" style={{marginBottom:4}}>Apply — {TIERS.find(t=>t.id===tier)?.name}</div>
          <div className="card-sub" style={{marginBottom:16}}>Applications reviewed within 72 hours</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:10}}>
            <div className="field"><label>Primary Platform</label>
              <select className="inp" value={platform} onChange={e=>setPlatform(e.target.value)}>
                <option value="">— Select platform —</option>
                {['YouTube','TikTok','Instagram','Twitter/X','LinkedIn','Podcast','Blog/Newsletter','Facebook'].map(p=><option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="field"><label>Handle / Channel URL</label><input className="inp" placeholder="@yourhandle or youtube.com/c/..." value={handle} onChange={e=>setHandle(e.target.value)}/></div>
            <div className="field"><label>Follower / Subscriber Count</label><input className="inp" placeholder="e.g. 2,400" value={followers} onChange={e=>setFollowers(e.target.value)}/></div>
          </div>
          <div className="field"><label>Why do you want to join? (2-3 sentences)</label>
            <textarea className="inp" rows={3} placeholder="Tell us how you plan to use Rune Script and what kind of content you'd make..." value={why} onChange={e=>setWhy(e.target.value)}/>
          </div>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            <button className="btn btn-gold" onClick={()=>{if(!platform||!handle||!followers||!why){toast('Fill in all fields.','error');return;}setApplied(true);toast('Application submitted! We review within 72 hours.','success');}}>Submit Application →</button>
            <p style={{fontSize:'.74rem',fontWeight:300,color:'#3a3848',lineHeight:1.6}}>We review every application personally. No automated rejections.</p>
          </div>
        </div>
      ):(
        <div className="card" style={{textAlign:'center',padding:36}}>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:'2rem',color:'#c9a84c',marginBottom:12}}>✦</div>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:'1.1rem',fontWeight:700,color:'#ddd8ce',marginBottom:8}}>Application Submitted</div>
          <p style={{fontSize:'.84rem',fontWeight:300,color:'#7a7888',lineHeight:1.8,maxWidth:400,margin:'0 auto'}}>We'll review your application within 72 hours and reach out via email. If approved, your free plan activates immediately.</p>
        </div>
      )}
    </div>
  );
}

// ── GLOBAL SEARCH ──────────────────────────────────────────────────────────
function GlobalSearch({prospects,pitches,proposals,invoices,setPage}){
  const[q,setQ]=useState("");
  const[open,setOpen]=useState(false);
  const ref=useRef(null);
  useEffect(()=>{
    const close=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};
    document.addEventListener("mousedown",close);
    return()=>document.removeEventListener("mousedown",close);
  },[]);
  const results=q.length<2?[]:[
    ...prospects.filter(p=>p.name.toLowerCase().includes(q.toLowerCase())||p.city?.toLowerCase().includes(q.toLowerCase())||p.category?.toLowerCase().includes(q.toLowerCase())).slice(0,4).map(p=>({icon:"ᚦ",name:p.name,meta:`${p.category} · ${p.city}`,page:"crm"})),
    ...pitches.filter(p=>p.prospectName?.toLowerCase().includes(q.toLowerCase())).slice(0,2).map(p=>({icon:"ᚨ",name:`Pitch: ${p.prospectName}`,meta:`${p.tone} · ${p.generatedAt}`,page:"pitch"})),
    ...proposals.filter(p=>p.client?.toLowerCase().includes(q.toLowerCase())).slice(0,2).map(p=>({icon:"ᚱ",name:`Proposal: ${p.client}`,meta:p.createdAt,page:"agency"})),
    ...invoices.filter(i=>i.client?.toLowerCase().includes(q.toLowerCase())).slice(0,2).map(i=>({icon:"ᛊ",name:`Invoice: ${i.client}`,meta:`$${i.total} · ${i.status}`,page:"agency"})),
  ];
  return(
    <div className="search-wrap" ref={ref}>
      <input className="search-inp" placeholder="Search everything…" value={q} onChange={e=>{setQ(e.target.value);setOpen(true);}} onFocus={()=>setOpen(true)}/>
      {open&&q.length>=2&&(
        <div className="search-dropdown">
          {results.length===0?<div className="search-empty">No results for "{q}"</div>
          :results.map((r,i)=>(
            <div key={i} className="search-result" onClick={()=>{setPage(r.page);setOpen(false);setQ("");}}>
              <span className="search-result-icon">{r.icon}</span>
              <span className="search-result-name">{r.name}</span>
              <span className="search-result-meta">{r.meta}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ── SAGE — AI ADVISOR ──────────────────────────────────────────────────────
function SageAdvisor({page, user, prospects, pitches, invoices, setPage, toast}) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{
    role: 'sage',
    text: `ᚱ Greetings. I'm Sage — your Rune Script advisor. I know your entire platform. Ask me anything: how to find prospects, what to say on a call, how to build a site faster, or just "what should I do right now?"`,
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pulse, setPulse] = useState(true);
  const msgsRef = useRef(null);

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, [msgs, open]);

  useEffect(() => {
    const t = setTimeout(() => setPulse(false), 4000);
    return () => clearTimeout(t);
  }, []);

  const activeCount = prospects.filter(p => p.status === 'Active').length;
  const closedCount = prospects.filter(p => p.status === 'Closed').length;
  const unpaidTotal = invoices.filter(i => i.status === 'Unpaid').reduce((a, i) => a + Number(i.total), 0);

  const send = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim(); setInput('');
    setMsgs(prev => [...prev, {role: 'user', text: msg}]);
    setLoading(true);

    const systemContext = `You are Sage, the built-in AI advisor for Rune Script — an AI web design agency platform. You help ${user?.name || 'the user'} use the platform to find clients, pitch, build sites, and run their agency.

CURRENT PLATFORM STATE:
- Page: ${page}
- Prospects in CRM: ${prospects.length} total (${activeCount} active, ${closedCount} closed)
- Pitches generated: ${pitches.length}
- Outstanding invoices: $${unpaidTotal.toLocaleString()}

NAVIGATION COMMANDS (add to end of response when helpful):
[NAVIGATE:scanner] [NAVIGATE:crm] [NAVIGATE:pitch] [NAVIGATE:builder] [NAVIGATE:agency] [NAVIGATE:studio] [NAVIGATE:marketplace] [NAVIGATE:domains] [NAVIGATE:creator] [NAVIGATE:settings] [NAVIGATE:changelog] [NAVIGATE:rules]

CAPABILITIES TO GUIDE THEM ON:
- Scanner: Find ANY business in ANY city, no restrictions
- CRM: Track prospects, update status, take notes
- Pitch: Generate SMS/call/email/follow-up in any tone including custom
- Builder: Multi-page AI site builder with CRM integration and 8 template starters
- Agency OS: Proposals, contracts (with Print to PDF), intake forms, call analyzer, invoices
- AI Studio: Social media, GBP, ads, SEO, brand voice, email, review responses, competitor analysis, bulk email
- Marketplace: 260+ templates across 20 industries
- Domains: Buy, transfer, manage DNS
- Creator Program: Apply for free plan

Be concise (2-4 sentences), direct, and practical. Use "ᚱ" occasionally. When suggesting navigation, end with the navigate command in brackets.`;

    try {
      const prompt = `${systemContext}\n\nUser question: "${msg}"`;
      const raw = await callClaude(prompt, 400);

      // Parse navigation commands
      const navMatch = raw.match(/\[NAVIGATE:(\w+)\]/);
      const cleanText = raw.replace(/\[NAVIGATE:\w+\]/g, '').trim();

      setMsgs(prev => [...prev, {
        role: 'sage',
        text: cleanText,
        nav: navMatch ? navMatch[1] : null,
      }]);
    } catch(e) {
      setMsgs(prev => [...prev, {role: 'sage', text: 'Connection lost. Try again.'}]);
    }
    setLoading(false);
  };

  const quickActions = [
    {label: 'What should I do now?', q: 'Based on my current CRM and pipeline, what should I focus on right now?'},
    {label: 'How do I find clients?', q: 'Walk me through finding my first client with Rune Script.'},
    {label: 'Make my pitch better', q: 'How do I write a pitch that actually gets callbacks?'},
    {label: 'Build a site fast', q: 'What\'s the fastest way to build a professional site?'},
  ];

  return (
    <>
      {/* FLOATING BUTTON */}
      <button
        onClick={() => { setOpen(!open); setPulse(false); }}
        style={{
          position: 'fixed', bottom: 20, right: 16, zIndex: 600,
          width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(7, 7, 14, 0.35)',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(201,168,76,.45)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Cinzel',serif", fontSize: '1rem',
          color: '#c9a84c',
          boxShadow: pulse ? '0 0 0 8px rgba(201,168,76,.15), 0 0 0 16px rgba(201,168,76,.06)' : '0 4px 20px rgba(0,0,0,.4)',
          transition: 'all .3s',
        }}
        title="Ask Sage — your AI advisor"
      >
        {open ? '✕' : 'ᚱ'}
      </button>
      {pulse && !open && (
        <div style={{position:'fixed',bottom:82,right:20,zIndex:600,background:'#0d0d18',border:'1px solid rgba(201,168,76,.2)',padding:'8px 14px',fontFamily:"'JetBrains Mono',monospace",fontSize:'.6rem',letterSpacing:'1.5px',color:'#c9a84c',textTransform:'uppercase',animation:'fadein .5s ease .5s both',pointerEvents:'none'}}>
          Ask me anything ↓
        </div>
      )}

      {/* SAGE PANEL */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 84, right: 24, zIndex: 599,
          width: 'min(380px, calc(100vw - 48px))', height: 480,
          background: '#0a0a14', border: '1px solid rgba(201,168,76,.2)',
          display: 'flex', flexDirection: 'column',
          animation: 'fadein .2s ease',
          boxShadow: '0 8px 40px rgba(0,0,0,.5)',
        }}>
          {/* Header */}
          <div style={{padding:'12px 16px',borderBottom:'1px solid rgba(201,168,76,.08)',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
            <div style={{width:28,height:28,background:'rgba(201,168,76,.1)',border:'1px solid rgba(201,168,76,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Cinzel',serif",fontSize:'.9rem',color:'#c9a84c'}}>ᚱ</div>
            <div>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:'.82rem',fontWeight:700,color:'#ddd8ce'}}>Sage</div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.52rem',letterSpacing:'1.5px',color:'#3a3848',textTransform:'uppercase'}}>AI Advisor · Always here</div>
            </div>
            <div style={{marginLeft:'auto',width:7,height:7,borderRadius:'50%',background:'#7ac89a',animation:'pulse 2s infinite'}}/>
          </div>

          {/* Messages */}
          <div ref={msgsRef} style={{flex:1,overflowY:'auto',padding:'12px 14px',display:'flex',flexDirection:'column',gap:10}}>
            {msgs.map((m, i) => (
              <div key={i} style={{display:'flex',flexDirection:'column',alignItems:m.role==='user'?'flex-end':'flex-start',gap:4}}>
                <div style={{
                  maxWidth:'85%', padding:'9px 12px',
                  background: m.role==='user' ? 'rgba(201,168,76,.1)' : '#0e0e1e',
                  border: `1px solid ${m.role==='user' ? 'rgba(201,168,76,.2)' : 'rgba(201,168,76,.06)'}`,
                  fontFamily:"'DM Sans',sans-serif", fontSize:'.82rem', fontWeight:300,
                  color: m.role==='user' ? '#ddd8ce' : '#9a96a2',
                  lineHeight: 1.7,
                }}>
                  {m.text}
                </div>
                {m.nav && (
                  <button className="btn btn-gold btn-xs" onClick={()=>{setPage(m.nav);setOpen(false);toast(`Going to ${m.nav}…`,'info');}}>
                    Go to {m.nav.charAt(0).toUpperCase()+m.nav.slice(1)} →
                  </button>
                )}
              </div>
            ))}
            {loading && (
              <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 0'}}>
                <Spinner/><span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'.58rem',color:'#2e2d3c',letterSpacing:'1.5px'}}>Sage is thinking…</span>
              </div>
            )}
          </div>

          {/* Quick actions */}
          {msgs.length <= 1 && (
            <div style={{padding:'0 12px 8px',display:'flex',flexDirection:'column',gap:4,flexShrink:0}}>
              {quickActions.map((qa, i) => (
                <button key={i} className="btn btn-ghost btn-xs" style={{textAlign:'left',justifyContent:'flex-start',fontSize:'.7rem'}}
                  onClick={() => { setInput(qa.q); }}>
                  {qa.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{padding:'10px 12px',borderTop:'1px solid rgba(201,168,76,.06)',display:'flex',gap:8,flexShrink:0}}>
            <input
              className="inp" style={{flex:1,height:34,fontSize:'.8rem'}}
              placeholder="Ask Sage anything…"
              value={input}
              onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&send()}
            />
            <button className="btn btn-gold btn-sm" onClick={send} disabled={loading||!input.trim()}>
              {loading?<Spinner/>:'→'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ── MAIN APP ───────────────────────────────────────────────────────────────
export default function RuneScript(){
  const[screen,setScreen]=useState("loading");
  const[user,setUser]=useState(null);
  const[page,setPage]=useState("dashboard");
  const[prospects,setProspects]=useState([]);
  const[pitches,setPitches]=useState([]);
  const[proposals,setProposals]=useState([]);
  const[invoices,setInvoices]=useState([]);
  const[toasts,setToasts]=useState([]);
  const[siteBuilt,setSiteBuilt]=useState(false);
  const[demoMode,setDemoMode]=useState(false);
  const[purchasedTemplateIds,setPurchasedTemplateIds]=useState(new Set());
  const[savedTemplates,setSavedTemplates]=useState([]);
  const[showShortcuts,setShowShortcuts]=useState(false);
  const[showPalette,setShowPalette]=useState(false);
  const[lightMode,setLightMode]=useState(false);

  useEffect(()=>{
    const style=document.createElement("style");
    style.textContent=CSS;
    document.head.appendChild(style);
    const load=async()=>{
      try{
        const[u,p,pi,pr,inv]=await Promise.allSettled([
          window.storage.get("rs3_user"),window.storage.get("rs3_prospects"),
          window.storage.get("rs3_pitches"),window.storage.get("rs3_proposals"),
          window.storage.get("rs3_invoices")
        ]);
        if(p.status==="fulfilled"&&p.value)setProspects(JSON.parse(p.value.value));
        if(pi.status==="fulfilled"&&pi.value)setPitches(JSON.parse(pi.value.value));
        if(pr.status==="fulfilled"&&pr.value)setProposals(JSON.parse(pr.value.value));
        if(inv.status==="fulfilled"&&inv.value)setInvoices(JSON.parse(inv.value.value));
        if(u.status==="fulfilled"&&u.value){
          const parsedUser=JSON.parse(u.value.value);setUser(parsedUser);
          try{
            const pref=await window.storage.get("rs3_autoredirect");
            if(pref&&JSON.parse(pref.value)===true){setScreen("app");}
            else{setScreen("landing");}
          }catch(e){setScreen("landing");}
        }else{setScreen("landing");}
      }catch(e){setScreen("landing");}
    };
    load();
    return()=>document.head.removeChild(style);
  },[]);

  const toast=(msg,type="info")=>{const id=uid();setToasts(prev=>[...prev,{id,msg,type}]);setTimeout(()=>setToasts(prev=>prev.filter(t=>t.id!==id)),3200);};
  const handleAuth=async u=>{setUser(u);setScreen("app");setPage("dashboard");try{await window.storage.set("rs3_user",JSON.stringify(u));}catch(e){}};
  const handleLogout=async()=>{setUser(null);setScreen("landing");try{await window.storage.delete("rs3_user");await window.storage.delete("rs3_autoredirect");}catch(e){}};
  const addProspect=async p=>{const updated=[...prospects,p];setProspects(updated);try{await window.storage.set("rs3_prospects",JSON.stringify(updated));}catch(e){}};
  const updateProspect=async(id,changes)=>{const updated=prospects.map(p=>p.id===id?{...p,...changes}:p);setProspects(updated);try{await window.storage.set("rs3_prospects",JSON.stringify(updated));}catch(e){}};
  const removeProspect=async id=>{const updated=prospects.filter(p=>p.id!==id);setProspects(updated);try{await window.storage.set("rs3_prospects",JSON.stringify(updated));}catch(e){}};
  const addPitch=async pitch=>{const updated=[...pitches,pitch];setPitches(updated);try{await window.storage.set("rs3_pitches",JSON.stringify(updated));}catch(e){}};
  const addProposal=async p=>{const updated=[...proposals,p];setProposals(updated);try{await window.storage.set("rs3_proposals",JSON.stringify(updated));}catch(e){}};
  const addInvoice=async inv=>{const updated=[...invoices,inv];setInvoices(updated);try{await window.storage.set("rs3_invoices",JSON.stringify(updated));}catch(e){}};
  const updateInvoice=async(id,changes)=>{const updated=invoices.map(i=>i.id===id?{...i,...changes}:i);setInvoices(updated);try{await window.storage.set("rs3_invoices",JSON.stringify(updated));}catch(e){}};
  const onUpdateUser=async u=>{setUser(u);try{await window.storage.set("rs3_user",JSON.stringify(u));}catch(e){}};

  const PAGE_TITLES={dashboard:"Dashboard",scanner:"Prospect Scanner",crm:"CRM",pitch:"Pitch Generator",builder:"Site Builder",agency:"Agency OS",studio:"AI Studio",marketplace:"Marketplace",settings:"Settings"};
  const PAGES={
    dashboard:<DashboardPage user={user} prospects={prospects} pitches={pitches} proposals={proposals} invoices={invoices} setPage={setPage} siteBuilt={siteBuilt} demoMode={demoMode} setProspects={setProspects} setPitches={setPitches} setProposals={setProposals} setInvoices={setInvoices} setDemoMode={setDemoMode} toast={toast}/>,
    scanner:<ScannerPage onAdd={addProspect} prospects={prospects} toast={toast} setPage={setPage}/>,
    crm:<CRMPage prospects={prospects} updateProspect={updateProspect} removeProspect={removeProspect} setPage={setPage} toast={toast}/>,
    pitch:<PitchPage prospects={prospects} pitches={pitches} addPitch={addPitch} toast={toast}/>,
    builder:<SiteBuilderPage toast={toast} onSiteBuilt={()=>setSiteBuilt(true)} prospects={prospects}/>,
    agency:<AgencyOSPage prospects={prospects} proposals={proposals} addProposal={addProposal} invoices={invoices} addInvoice={addInvoice} updateInvoice={updateInvoice} toast={toast}/>,
    studio:<AIStudioPage prospects={prospects} toast={toast}/>,
    marketplace:<MarketplacePage toast={toast}/>,
    settings:<SettingsPage user={user} onUpdateUser={onUpdateUser} toast={toast} setProspects={setProspects} setPitches={setPitches} setProposals={setProposals} setInvoices={setInvoices}/>,
    library:<LibraryPage purchasedIds={purchasedTemplateIds} savedTemplates={savedTemplates} setPage={setPage} toast={toast}/>,
    domains:<DomainsPage toast={toast}/>,
    creator:<CreatorPage toast={toast}/>,
    changelog:<ChangelogPage/>,
    rules:<RulesPage/>,
    help:<HelpPage setPage={setPage}/>,
    branding:<BrandingPage toast={toast}/>,
    activity:<ActivityLogPage prospects={prospects} pitches={pitches} proposals={proposals} invoices={invoices}/>,
    import:<ImportExportPage prospects={prospects} pitches={pitches} proposals={proposals} invoices={invoices} addProspect={addProspect} toast={toast}/>,
    roadmap:<RoadmapPage/>,
    affiliate:<AffiliatePage user={user} toast={toast}/>,
    sequence:<EmailSequencePage prospects={prospects} toast={toast}/>,
  };

  const loadDemo=()=>{
    setProspects(DEMO_PROSPECTS);
    setPitches(DEMO_PITCHES);
    setProposals(DEMO_PROPOSALS);
    setInvoices(DEMO_INVOICES);
    setDemoMode(true);
    toast("Demo data loaded — explore the full app!","success");
  };

  const btn={
    ghost:{fontFamily:"'JetBrains Mono',monospace",fontSize:".62rem",letterSpacing:"2px",textTransform:"uppercase",cursor:"pointer",padding:"9px 18px",background:"none",color:"#4a4858",border:"1px solid rgba(74,72,88,.3)",transition:"all .2s",display:"inline-flex",alignItems:"center",gap:7},
    gold:{fontFamily:"'JetBrains Mono',monospace",fontSize:".62rem",letterSpacing:"2px",textTransform:"uppercase",cursor:"pointer",padding:"9px 18px",background:"#c9a84c",color:"#07070e",border:"none",transition:"all .2s",display:"inline-flex",alignItems:"center",gap:7},
  };

  // Keyboard shortcuts
  useEffect(()=>{
    if(screen!=='app') return;
    let g=false,timer=null;
    const map={d:'dashboard',s:'scanner',c:'crm',p:'pitch',b:'builder',a:'agency',i:'studio',m:'marketplace'};
    const handler=e=>{
      if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.tagName==='SELECT') return;
      if(e.key==='k'&&(e.metaKey||e.ctrlKey)){e.preventDefault();setShowPalette(v=>!v);return;}
    if(e.key==='?'){setShowShortcuts(v=>!v);return;}
      if(e.key==='Escape'){setShowShortcuts(false);return;}
      if(e.key.toLowerCase()==='g'){g=true;clearTimeout(timer);timer=setTimeout(()=>g=false,1200);return;}
      if(g&&map[e.key.toLowerCase()]){setPage(map[e.key.toLowerCase()]);g=false;clearTimeout(timer);playClick();}
    };
    document.addEventListener('keydown',handler);
    return()=>{document.removeEventListener('keydown',handler);clearTimeout(timer);};
  },[screen]);

  // Light mode toggle
  useEffect(()=>{
    if(lightMode) document.documentElement.classList.add('light-mode');
    else document.documentElement.classList.remove('light-mode');
  },[lightMode]);

  // Toggle body scroll based on screen
  useEffect(()=>{
    if(screen==='app'){
      document.body.style.overflow='hidden';
      document.body.style.height='100vh';
    } else {
      document.body.style.overflow='';
      document.body.style.height='';
    }
  },[screen]);

  if(screen==="loading")return(
    <div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#07070e",flexDirection:"column",gap:14}}>
      <div style={{fontFamily:"'Cinzel',serif",fontSize:"1.8rem",color:"#c9a84c"}}>ᚱ</div>
      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".62rem",letterSpacing:"3px",color:"#2e2d3c",textTransform:"uppercase"}}>Loading…</div>
    </div>
  );
  if(screen==="landing")return(<LandingPage onSignIn={()=>setScreen("auth")} onGetStarted={()=>setScreen("auth")} user={user} onDashboard={()=>setScreen("app")}/>);
  if(screen==="auth")return(<AuthScreen onAuth={handleAuth} onBack={()=>setScreen("landing")}/>);

  return(
    <div className="app">
      <Sidebar page={page} setPage={setPage} user={user} prospectCount={prospects.length} onLogout={handleLogout}/>
      <div className="main">
        <MobileNav page={page} setPage={setPage} user={user} onLogout={handleLogout}/>
        <div className="topbar">
          <div className="topbar-title">{PAGE_TITLES[page]||page}</div>
          <GlobalSearch prospects={prospects} pitches={pitches} proposals={proposals} invoices={invoices} setPage={setPage}/>
          <NotificationCenter prospects={prospects} pitches={pitches}/>
          <button onClick={()=>setLightMode(l=>!l)} title="Toggle light/dark mode" style={{background:'none',border:'none',cursor:'pointer',padding:'4px 8px',color:'#3a3848',fontSize:'.9rem',transition:'color .2s'}}
            onMouseEnter={e=>e.target.style.color='#c9a84c'} onMouseLeave={e=>e.target.style.color='#3a3848'}>
            {lightMode?'☽':'☀'}
          </button>
          <button onClick={()=>setShowShortcuts(true)} title="Keyboard shortcuts (?)" style={{background:'none',border:'none',cursor:'pointer',padding:'4px 8px',fontFamily:"'JetBrains Mono',monospace",fontSize:'.6rem',color:'#2e2d3c',letterSpacing:'1px',transition:'color .2s'}}
            onMouseEnter={e=>e.target.style.color='#c9a84c'} onMouseLeave={e=>e.target.style.color='#2e2d3c'}>
            ?
          </button>
          <button onClick={()=>setShowPalette(true)} title="Command palette (Cmd+K)" style={{background:"rgba(201,168,76,.06)",border:"1px solid rgba(201,168,76,.1)",cursor:"pointer",padding:"4px 10px",fontFamily:"'JetBrains Mono',monospace",fontSize:".56rem",color:"#3a3848",letterSpacing:"1.5px",textTransform:"uppercase",display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:".7rem"}}>⌘</span>K</button>
          <span className="topbar-tag">ᚱ RUNE SCRIPT</span>
        </div>
        <div className="content">{PAGES[page]}</div>
      </div>
      <ToastDock toasts={toasts}/>
      {showShortcuts&&<ShortcutsOverlay onClose={()=>setShowShortcuts(false)}/>}
      {showPalette&&<CommandPalette setPage={setPage} prospects={prospects} onClose={()=>setShowPalette(false)} toast={toast}/>}
      {screen==='app'&&<SageAdvisor page={page} user={user} prospects={prospects} pitches={pitches} invoices={invoices} setPage={setPage} toast={toast}/>}
    </div>
  );
}
