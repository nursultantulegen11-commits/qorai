'use client';
import {useEffect,useState} from 'react';
import {ArrowLeft,ArrowRight,Download,Expand,ExternalLink} from 'lucide-react';
import pitch from './slides.json';
import './pitch.css';

export default function Pitch(){
 const [index,setIndex]=useState(0);
 const [screenError,setScreenError]=useState('');
 const slide=pitch[index];
 useEffect(()=>{
  const onKey=(event:KeyboardEvent)=>{
   if((event.target as HTMLElement)?.closest('input,textarea,[contenteditable]'))return;
   if(event.key===' '&&(event.target as HTMLElement)?.closest('button,a,summary'))return;
   if(['ArrowRight',' ','PageDown'].includes(event.key)){event.preventDefault();setIndex(v=>Math.min(v+1,pitch.length-1));}
   if(['ArrowLeft','PageUp'].includes(event.key)){event.preventDefault();setIndex(v=>Math.max(0,v-1));}
   if(event.key==='Home'){event.preventDefault();setIndex(0);}
   if(event.key==='End'){event.preventDefault();setIndex(pitch.length-1);}
  };
  window.addEventListener('keydown',onKey);
  return()=>window.removeEventListener('keydown',onKey);
 },[]);
 async function fullScreen(){
  try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();setScreenError('');}
  catch{setScreenError('Полноэкранный режим недоступен в этом браузере. Презентацию можно открыть в PowerPoint.');}
 }
 return <main className="pitch-view">
  <header className="pitch-toolbar">
   <a href="/" className="pitch-brand" aria-label="QorAI — открыть сайт">QorAI<span>Idea Battle 2026</span></a>
   <div className="pitch-toolbar-actions">
    <a className="pitch-text-link" href="/?demo=1">Демо сайта <ExternalLink size={16}/></a>
    <a className="pitch-tool pitch-pdf" href="/pitch/QorAI-Idea-Battle-2026.pdf" download aria-label="Скачать презентацию PDF"><Download size={17}/><span>PDF</span></a>
    <button className="pitch-tool" type="button" onClick={fullScreen} aria-label="Во весь экран"><Expand size={19}/></button>
   </div>
  </header>
  <section className="pitch-stage" aria-label={`Слайд ${index+1} из ${pitch.length}: ${slide.title}`}>
   <img src={`/pitch/slide-${String(index+1).padStart(2,'0')}.jpg`} width="1280" height="720" alt={slide.alt} fetchPriority={index===0?'high':'auto'}/>
  </section>
  <nav className="pitch-navigation" aria-label="Управление презентацией">
   <button className="pitch-arrow" onClick={()=>setIndex(v=>Math.max(0,v-1))} disabled={index===0} aria-label="Предыдущий слайд"><ArrowLeft size={20}/></button>
   <div className="pitch-current" aria-live="polite"><span>{String(index+1).padStart(2,'0')} / {pitch.length}</span><strong>{slide.title}</strong></div>
   <button className="pitch-arrow pitch-arrow-next" onClick={()=>setIndex(v=>Math.min(pitch.length-1,v+1))} disabled={index===pitch.length-1} aria-label="Следующий слайд"><ArrowRight size={20}/></button>
  </nav>
  <div className="pitch-progress" aria-hidden="true">{pitch.map((s,i)=><button type="button" key={s.title} className={i===index?'is-current':''} tabIndex={-1} onClick={()=>setIndex(i)} aria-label={`Слайд ${i+1}: ${s.title}`}/>)}</div>
  {screenError&&<p className="pitch-message" role="status">{screenError}</p>}
  <details className="pitch-notes">
   <summary>Заметки для выступления <span>{slide.time}</span></summary>
   <p>{slide.note}</p>
   <a href="/pitch/QorAI-pitch-script.md" download>Скачать текст на пять минут</a>
   <a className="pitch-pptx-link" href="/pitch/QorAI-Idea-Battle-2026.pptx" download>PowerPoint для редактирования</a>
   <footer>Фотографии для иллюстрации: <a href="https://unsplash.com/es/fotos/barista-trabajando-detras-de-un-mostrador-de-cafe-H7PLuaYW6UQ" target="_blank" rel="noreferrer">Long Chung</a>, <a href="https://unsplash.com/photos/fresh-lettuce-and-vegetables-displayed-at-a-market-V-j4JAw_mFk" target="_blank" rel="noreferrer">Sean Thoman</a> и <a href="https://unsplash.com/photos/a-vendor-arranges-fresh-produce-at-an-outdoor-market-oKw2DRoL2QM" target="_blank" rel="noreferrer">Lawrence Chismorie</a> / <a href="https://unsplash.com/license" target="_blank" rel="noreferrer">Unsplash</a>. На снимках сайта учебные данные.</footer>
  </details>
 </main>;
}
