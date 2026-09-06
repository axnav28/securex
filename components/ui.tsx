import {Confidence} from '@/lib/mock-data';
export function Tag({value}:{value:Confidence}){return <span className={`tag ${value.toLowerCase()}`}>{value}</span>}
export function PageHeader({eyebrow,title,sub}:{eyebrow:string,title:string,sub:string}){return <><div className="eyebrow">{eyebrow}</div><h1 className="page-title">{title}</h1><p className="page-sub">{sub}</p></>}
export function Toggle({on,onClick}:{on:boolean,onClick:()=>void}){return <button aria-label="Toggle control" className={`switch ${on?'on':''}`} onClick={onClick}><i/></button>}
