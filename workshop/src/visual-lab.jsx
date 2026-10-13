import React, { useState } from 'react';
import CodeText from './code-text.jsx';
import JavaCode, { JavaInline } from './java-code.jsx';
import { Select } from '@radix-ui/themes';
import Icon from './icon.jsx';

const tiles = (count, filled = count) => Array.from({length:Math.min(24,Math.max(0,count))},(_,i)=><span key={i} className={`part-tile ${i<filled?'filled':''}`} aria-hidden="true" />);
function Memory({name,value,type='int',children}) { return <div className="memory-cell"><span>{/^[A-Za-z_$][\w$]*$/.test(name)?<JavaInline>{type} {name}</JavaInline>:<><JavaInline>{type}</JavaInline> {name}</>}</span><strong>{value==='?'?'?':<JavaInline>{String(value)}</JavaInline>}</strong>{children}</div>; }
function JavaSelect({label,value,onValueChange,options,placeholder}) {
  return <Select.Root value={value} onValueChange={onValueChange}>
    <Select.Trigger className="java-select" aria-label={label} placeholder={placeholder}/>
    <Select.Content>{options.map(([key,source])=><Select.Item className="java-select-option" key={key} value={key}><JavaInline>{source}</JavaInline></Select.Item>)}</Select.Content>
  </Select.Root>;
}
export default function VisualLab({ lesson, onComplete, done }) {
  const kind=lesson.visual?.kind;
  return <section className="visual-lab" aria-label="Interactive concept model"><div className="visual-heading"><strong>Try it</strong><span>{done?<Icon name="check" label="Explored" />:''}</span></div>
    {kind==='variable-series'?<VariableSeries lesson={lesson} complete={onComplete}/>:kind==='copy'?<PrimitiveCopy complete={onComplete}/>:kind==='declaration' ? <Declaration lesson={lesson} complete={onComplete}/> : kind==='assignment' ? <Assignment complete={onComplete} targetName={lesson.visual.targetName}/> : kind==='fraction' ? <Fraction complete={onComplete}/> : kind==='string' ? <StringLab complete={onComplete}/> : kind==='output' ? <OutputLab complete={onComplete}/> : kind==='loop' ? <LoopLab lesson={lesson} complete={onComplete}/> : kind==='grid' ? <GridLab lesson={lesson} complete={onComplete}/> : kind==='function' ? <FunctionLab lesson={lesson} complete={onComplete}/> : kind==='references' ? <ReferenceLab complete={onComplete}/> : kind==='tokens' ? <TokenLab complete={onComplete}/> : kind==='math' ? <MathLab complete={onComplete}/> : kind==='drive' ? <DriveLab complete={onComplete}/> : kind==='branch' ? <BranchLab lesson={lesson} complete={onComplete}/> : kind==='array' ? <ArrayLab lesson={lesson} complete={onComplete}/> : <p>Explore the robot scene below.</p>}

  </section>;
}
function Declaration({lesson,complete}) {
  const target=lesson.visual;
  const [type,setType]=useState(lesson.debug?'int':''),[name,setName]=useState(lesson.debug?target.name:''),[value,setValue]=useState(lesson.debug?target.value:''),[created,setCreated]=useState(false),[message,setMessage]=useState('Choose a type, type a name, and give it a value.');
  const build=()=>{
    setCreated(false);
    if(!['int','double'].includes(type)){setMessage('Pick a numeric type first.');return;}
    if(!/^[A-Za-z_$][\w$]*$/.test(name)){setMessage('A variable name starts with a letter; spaces are not allowed.');return;}
    if(type==='int'&&!/^-?\d+$/.test(value)){setMessage('An int cannot hold this fractional value. Try double to keep the fraction.');return;}
    if(!value.trim()||!Number.isFinite(Number(value))){setMessage('Give the variable a number to store.');return;}
    if(type!==target.type||name!==target.name||Number(value)!==Number(target.value)){setMessage(`For this task, build ${target.type} ${target.name} = ${target.value};`);return;}
    setCreated(true);setMessage(`Created \`${name}\`. The name identifies this stored value.`);complete();
  };
  return <><div className="declaration-builder"><label>Type<JavaSelect label="Variable type" value={type} onValueChange={setType} placeholder="Choose…" options={[['int','int'],['double','double']]}/></label><label>Name<input aria-label="Variable name" value={name} onChange={e=>setName(e.target.value)} placeholder={target.name}/></label><b aria-hidden="true">=</b><label>Value<input aria-label="Initial value" value={value} onChange={e=>setValue(e.target.value)} placeholder={target.value}/></label><JavaInline>;</JavaInline></div><button className="primary" onClick={build}>Create variable</button><div className="memory-stage"><span className="flow-arrow" aria-hidden="true"><Icon name="arrow-down" /></span>{created?<Memory name={name} value={value} type={type}><div className="part-tiles">{tiles(Math.ceil(Number(value)))}</div></Memory>:<div className="empty-memory">A named value will appear here.</div>}</div><p className="model-feedback" role="status"><CodeText>{message}</CodeText></p></>;
}
function Assignment({complete,targetName='parts'}) {
  const [used,setUsed]=useState(5),[value,setValue]=useState(12),[applied,setApplied]=useState(false);
  return <><label>Parts to use: <JavaInline>{used}</JavaInline><input aria-label="Parts to use" type="range" min="0" max="12" value={used} onChange={e=>{setUsed(Number(e.target.value));setApplied(false);setValue(12);}}/></label><div className="memory-flow"><Memory name="parts" value={12}/><span className="flow-arrow">− <JavaInline>{used}</JavaInline> <Icon name="arrow-right" /></span><Memory name={targetName} value={value}/></div><div className="part-tiles">{tiles(12,value)}</div><button onClick={()=>{setValue(12-used);setApplied(true);complete();}}>Apply <JavaInline>{targetName==='parts'?'parts = parts - used;':'int remaining = parts - used;'}</JavaInline></button><p className="model-feedback">{applied?'The result is now stored. Change the slider and try again.':targetName==='parts'?'Assignment replaces the stored value; it does not create a second variable.':'A new declaration can store the result under a different name.'}</p></>;
}
function PrimitiveCopy({complete}) {
  const [stage,setStage]=useState(0);
  return <><div className="memory-flow"><Memory name="parts" value={stage===2?7:12}/><span className="flow-arrow">{stage<2?<Icon name="arrow-right" />:'≠'}</span><Memory name="backup" value={stage===0?'?':12}/></div><button onClick={()=>{const next=stage===2?0:stage+1;setStage(next);if(next===2)complete();}}>{stage===2?'Reset':<JavaInline>{stage===0?'int backup = parts;':'parts = 7;'}</JavaInline>}</button><p><CodeText>{stage===2?'`backup` kept the copied number `12`. It is not linked to later changes in `parts`.':'First copy the value, then change the original variable.'}</CodeText></p></>;
}
function VariableSeries({lesson,complete}) {
  const [tab,setTab]=useState(0),[done,setDone]=useState([]),labels=['Declare','Reassign','Copy a value'];
  const finish=index=>{const next=[...new Set([...done,index])];setDone(next);if(next.length===3)complete();};
  return <><div className="model-options">{labels.map((label,i)=><button key={label} aria-pressed={tab===i} onClick={()=>setTab(i)}>{done.includes(i)?<><Icon name="check" label="Explored" /> </>:''}{label}</button>)}</div>{tab===0?<Declaration lesson={lesson} complete={()=>finish(0)}/>:tab===1?<Assignment complete={()=>finish(1)}/>:<PrimitiveCopy complete={()=>finish(2)}/>}<p className="model-note">{done.length} / 3 variable actions explored.</p></>;
}
function Fraction({complete}) {
  const [charged,setCharged]=useState(3),[decimal,setDecimal]=useState(false);
  const result=decimal?charged/4:Math.trunc(charged/4);
  const value=decimal&&Number.isInteger(result)?result.toFixed(1):result;
  return <><label>Charged cells: {charged} / 4<input aria-label="Charged cells" type="range" min="0" max="4" value={charged} onChange={e=>setCharged(Number(e.target.value))}/></label><div className="battery-cells">{tiles(4,charged)}</div><div className="model-options"><button aria-pressed={!decimal} onClick={()=>setDecimal(false)}><JavaInline>int / int</JavaInline></button><button aria-pressed={decimal} onClick={()=>{setDecimal(true);complete();}}><JavaInline>double / int</JavaInline></button></div><Memory name="fraction" type={decimal?'double':'int'} value={value}/><p><JavaInline>{decimal?'(double) ':''}{charged} / 4</JavaInline> produces <JavaInline>{value}</JavaInline>. {decimal?'The fractional part is kept.':'Integer division drops the fractional part.'}</p></>;
}
function StringLab({complete}) {
  const word='PIP-07',[index,setIndex]=useState(0);
  return <><div className="array-cells">{word.split('').map((char,i)=><button key={i} aria-pressed={index===i} onClick={()=>{setIndex(i);complete();}}><small>{i}</small><JavaInline>'{char}'</JavaInline></button>)}</div><label>Index<input aria-label="Character index" type="range" min="0" max={word.length} value={index} onChange={e=>{setIndex(Number(e.target.value));complete();}}/></label><p className={index===word.length?'model-feedback invalid':'model-feedback'}><JavaInline>label.charAt({index})</JavaInline> <Icon name="arrow-right" /> {index<word.length?<JavaInline>'{word[index]}'</JavaInline>:'Out of bounds. The final index is 5, not 6.'}</p></>;
}
function OutputLab({complete}) {
  const [count,setCount]=useState(0),lines=['Pip online','Ready to learn'];
  return <><div className="trace-code">{lines.map((line,i)=><div key={line} className={count===i?'trace-active':''}><JavaCode>{`System.out.println("${line}");`}</JavaCode></div>)}</div><span className="flow-arrow" aria-hidden="true"><Icon name="arrow-down" /></span><div className="tiny-terminal" aria-live="polite">{lines.slice(0,count).map(line=><div key={line}>{line}</div>)}{!count&&<span>Console is empty.</span>}</div><button onClick={()=>{const next=count===2?0:count+1;setCount(next);if(next===2)complete();}}>{count===2?'Reset trace':'Execute next statement'}</button></>;
}
function LoopLab({lesson,complete}) {
  const isWhile=(lesson.assessmentId||lesson.id)==='java-while',sum=(lesson.assessmentId||lesson.id)==='java-accumulator';
  const [count,setCount]=useState(4),[visited,setVisited]=useState(0),[inclusive,setInclusive]=useState(lesson.id!=='debug-loop-boundary'),[reset,setReset]=useState(lesson.id==='debug-reset-total');
  const limit=inclusive?count:Math.max(0,count-1),current=isWhile?count-visited:visited+1,total=reset?visited:visited*(visited+1)/2;
  return <><label>Loop target: {count}<input aria-label="Loop target" type="range" min="1" max="6" value={count} onChange={e=>{setCount(Number(e.target.value));setVisited(0);}}/></label>{!isWhile&&<label>Comparison<JavaSelect label="Loop comparison" value={inclusive?'inclusive':'exclusive'} onValueChange={value=>{setInclusive(value==='inclusive');setVisited(0);}} options={[['inclusive','i <= count'],['exclusive','i < count']]}/></label>}{sum&&<label><input type="checkbox" checked={reset} onChange={e=>{setReset(e.target.checked);setVisited(0);}}/> Reset <JavaInline>total</JavaInline> inside the loop</label>}<div className="iteration-track">{Array.from({length:count},(_,i)=><span key={i} className={i<visited?'visited':''}>{isWhile?count-i:i+1}</span>)}</div><div className="memory-flow"><Memory name={isWhile?'count':'i'} value={current}/>{sum&&<Memory name="total" value={total}/>}</div><button onClick={()=>{if(visited>=limit){setVisited(0);return;}setVisited(v=>v+1);if(visited+1>=limit&&(!sum||!reset)&&inclusive)complete();}}>{visited>=limit?'Reset trace':'Step one iteration'}</button><p className="model-feedback">{visited>=limit?(inclusive?'The condition is now false. The loop stops.':'The final value was skipped. Try the inclusive comparison.'):'Watch the counter change before the condition is checked again.'}</p></>;
}
function GridLab({lesson,complete}) {
  const map=(lesson.assessmentId||lesson.id)==='java-2d-arrays',[wide,setWide]=useState(false),[index,setIndex]=useState(-1),values=wide?[1,0,0,1,1,0]:[1,0,1,0,1,1],cols=wide?2:3;
  return <><div className="visual-grid" style={{gridTemplateColumns:`repeat(${cols},1fr)`}}>{values.map((value,i)=><div key={i} className={`${i<=index?'visited':''} ${i===index?'current':''}`}><small>[{Math.floor(i/cols)}][{i%cols}]</small><strong>{map?value:i<=index?'#':'·'}</strong></div>)}</div><p><JavaInline>row = {Math.max(0,Math.floor(index/cols))}</JavaInline> · <JavaInline>col = {Math.max(0,index%cols)}</JavaInline>{map&&<> · available: <JavaInline>{values.slice(0,index+1).filter(v=>v===1).length}</JavaInline></>}</p><div className="model-options"><button onClick={()=>{const next=index>=5?-1:index+1;setIndex(next);if(next===5)complete();}}>Visit next cell</button><button onClick={()=>{setWide(!wide);setIndex(-1);}}>Change grid shape</button></div></>;
}
function FunctionLab({lesson,complete}) {
  const announce=(lesson.assessmentId||lesson.id)==='java-methods',[name,setName]=useState('Pip'),[speed,setSpeed]=useState(2),[sent,setSent]=useState(false);
  return <><label>{announce?'Argument: robot name':'Argument: speed'}<input aria-label="Method argument" value={announce?name:speed} type={announce?'text':'number'} min="0" max="10" onChange={e=>{announce?setName(e.target.value.slice(0,16)):setSpeed(Number(e.target.value));setSent(false);}}/></label><div className="function-flow"><div><small>Argument</small><JavaInline>{announce?`"${name}"`:speed}</JavaInline></div><span><Icon name="arrow-right" /></span><div className="function-box"><JavaInline>{announce?'announce(name)':'distance(speed, 4)'}</JavaInline></div><span><Icon name="arrow-right" /></span><div><small>{announce?'Printed text':'Returned value'}</small>{sent?(announce?<code>{`Ready: ${name}`}</code>:<JavaInline>{speed*4}</JavaInline>):'?'}</div></div><button onClick={()=>{setSent(true);complete();}}>Send argument through the method</button></>;
}
function ReferenceLab({complete}) {
  const [shared,setShared]=useState(true),[changed,setChanged]=useState(false),[seen,setSeen]=useState([]);
  const write=()=>{setChanged(true);const next=[...new Set([...seen,shared])];setSeen(next);if(next.length===2)complete();};
  return <><div className="model-options"><button aria-pressed={shared} onClick={()=>{setShared(true);setChanged(false);}}>Shared reference</button><button aria-pressed={!shared} onClick={()=>{setShared(false);setChanged(false);}}>Separate copy</button></div><div className="reference-diagram"><div><JavaInline>readings</JavaInline><span><Icon name="arrow-right" /></span><Memory name="array A" type="int[]" value={`[${changed&&shared?99:10}, 20]`}/></div><div><JavaInline>backup</JavaInline><span><Icon name={shared?'arrow-up-right':'arrow-right'} /></span>{shared?<strong>same array A</strong>:<Memory name="array B" type="int[]" value={`[${changed?99:10}, 20]`}/>}</div></div><button onClick={write}>Write <JavaInline>backup[0] = 99;</JavaInline></button><p className="model-feedback">{changed?(shared?'Both names see the changed first element.':'Only the separate copy changed.'): 'Try the write in both modes.'}</p></>;
}
function TokenLab({complete}) {
  const [step,setStep]=useState(0),[name,setName]=useState('Pip');
  return <><label>Incoming robot name<input aria-label="Input robot name" value={name} onChange={e=>{setName(e.target.value.replace(/\s/g,'').slice(0,12));setStep(0);}}/></label><div className="token-stream"><span className={step===0?'current':''}>{name||'Pip'}</span><span className={step===1?'current':''}>4</span></div><div className="memory-flow"><Memory name="name" type="String" value={step>0?`"${name||'Pip'}"`:'?'}/><Memory name="load" value={step>1?4:'?'}/></div><button onClick={()=>{const next=step===2?0:step+1;setStep(next);if(next===2)complete();}}>{step===0?<JavaInline>input.next()</JavaInline>:step===1?<JavaInline>input.nextInt()</JavaInline>:'Reset input'}</button></>;
}
function MathLab({complete}) {
  const [raw,setRaw]=useState(-27),[roll,setRoll]=useState(0),[usedMath,setUsedMath]=useState(false);
  return <><label>Raw sensor value: <JavaInline>{raw}</JavaInline><input aria-label="Raw sensor value" type="range" min="-150" max="150" value={raw} onChange={e=>{setRaw(Number(e.target.value));setUsedMath(true);if(roll)complete();}}/></label><div className="function-flow"><Memory name="raw" value={raw}/><span><Icon name="arrow-right" /></span><Memory name="abs" value={Math.abs(raw)}/><span><Icon name="arrow-right" /></span><Memory name="capped" value={Math.min(100,Math.abs(raw))}/></div><div className="die"><span aria-label={`Die shows ${roll||'no roll'}`}>{roll?['⚀','⚁','⚂','⚃','⚄','⚅'][roll-1]:'□'}</span><button onClick={()=>{setRoll((roll%6)+1);if(usedMath)complete();}}>Try another die result</button></div><p><JavaInline>nextInt(6) + 1</JavaInline> can produce 1 through 6. These buttons explore possible outcomes; the Java random generator is separate.</p></>;
}
function BranchLab({lesson,complete}) {
  const robot=lesson.kind==='robot',[value,setValue]=useState(50),[seen,setSeen]=useState([false]),threshold=robot?30:20,stop=robot?value<=threshold:value<threshold;
  const change=v=>{setValue(v);const branch=robot?v<=threshold:v<threshold,next=[...new Set([...seen,branch])];setSeen(next);if(next.length===2)complete();};
  return <><label>{robot?'Distance to goal':'Battery level'}: <JavaInline>{value}</JavaInline><input aria-label="Sensor reading" type="range" min="0" max="100" value={value} onChange={e=>change(Number(e.target.value))}/></label><svg viewBox="0 0 320 100" role="img" aria-label={stop?'Left branch selected':'Right branch selected'}><path d="M160 5V35L65 75M160 35L255 75" className="branch-track"/><path d={stop?'M160 5V35L65 75':'M160 5V35L255 75'} className="branch-selected"/></svg><div className="branch-choices"><div className={stop?'selected':''}>{robot?'Stop / interact':'CHARGE'}{stop&&<> <Icon name="check" label="Selected" /></>}</div><div className={!stop?'selected':''}>{robot?'Keep approaching':'READY'}{!stop&&<> <Icon name="check" label="Selected" /></>}</div></div><p><JavaInline>{robot?'distance <= 30':'battery < 20'}</JavaInline> is <JavaInline>{String(stop)}</JavaInline>. Try both sides of the boundary.</p></>;
}
function ArrayLab({lesson,complete}) {
  const id=lesson.assessmentId||lesson.id,maximum=id==='java-array-patterns',countLow=id==='java-final-report',bounds=lesson.id==='debug-array-bounds';
  const [sample,setSample]=useState(0),[index,setIndex]=useState(-1),[safe,setSafe]=useState(!bounds);
  const values=countLow?[19,20,0,80]:sample===0?[2,4,6,1]:[-8,-3,-6,-9];
  const seen=values.slice(0,index+1),value=maximum?(seen.length?Math.max(...seen):'?'):countLow?seen.filter(v=>v<20).length:seen.reduce((a,b)=>a+b,0);
  return <>{bounds&&<label>Loop boundary<JavaSelect label="Array loop boundary" value={safe?'safe':'unsafe'} onValueChange={value=>{setSafe(value==='safe');setIndex(-1);}} options={[['unsafe','i <= values.length'],['safe','i < values.length']]}/></label>}<div className="array-cells">{values.map((v,i)=><div key={i} className={`${i<=index?'visited':''} ${i===index?'current':''}`}><small>index {i}</small><JavaInline>{v}</JavaInline></div>)}{index===values.length&&<div className="invalid">Out of bounds</div>}</div><Memory name={maximum?'maximum':countLow?'low':'total'} value={value}/><div className="model-options"><button onClick={()=>{const limit=safe?values.length-1:values.length,next=index>=limit?-1:index+1;setIndex(next);if(safe&&next===values.length-1)complete();}}>Scan next element</button><button onClick={()=>{setSample(1-sample);setIndex(-1);}}>Different samples</button></div><p>Follow the highlighted index. {maximum?'Notice that zero is not a valid starting maximum for all-negative data.':countLow?'Only values below 20 increase the count.':'The running total changes as each element is visited.'}</p></>;
}
function DriveLab({complete}) {
  const [left,setLeft]=useState(.3),[right,setRight]=useState(.3),bend=(left-right)*100;
  return <><div className="wheel-controls">{[['Left wheel',left,setLeft],['Right wheel',right,setRight]].map(([label,value,set])=><label key={label}>{label}: <JavaInline>{value.toFixed(1)}</JavaInline><input aria-label={label} type="range" min="-1" max="1" step=".1" value={value} onChange={e=>{set(Number(e.target.value));complete();}}/></label>)}</div><svg viewBox="0 0 320 150" role="img" aria-label={left===right?'Equal wheel power: straight motion':'Unequal wheel power: turning motion'}><path d={`M160 130 Q160 70 ${160+bend} 20`} className="drive-path"/><rect x="137" y="96" width="46" height="34" rx="8" className="robot-body"/><rect x="129" y="103" width="8" height="22" rx="3" className="robot-wheel"/><rect x="183" y="103" width="8" height="22" rx="3" className="robot-wheel"/></svg><p>{left===right?'Equal powers keep the wheels together.':left===-right?'Opposite powers turn the robot in place.':'Different powers make the robot curve.'} This diagram shows the steering idea; the 3D simulation tests the actual motion.</p></>;
}

export function OutputGraphic({check}) {
  if(!check)return null;
  const lines=check.output.trim().split('\n'),number=Number(lines[0]);
  return <div className="output-graphic" aria-label="Visual summary of actual output">{check.output.trim().length>0&&lines.length===1&&Number.isFinite(number)&&number>=0&&Number.isInteger(number)&&number<=24?<><div className="part-tiles">{tiles(number)}</div><strong>{number} reported</strong></>:<div className="output-lines">{lines.slice(0,8).map((line,i)=><div key={i}><span>{i+1}</span><code>{line||'(empty line)'}</code></div>)}{lines.length>8&&<small>{lines.length} lines in total</small>}</div>}</div>;
}
