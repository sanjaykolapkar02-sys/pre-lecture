"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, BookOpen, Check, CheckCircle2, ChevronRight, CircleDot, ExternalLink, FileText, GraduationCap, Hash, Link2, LoaderCircle, LockKeyhole, Network, Play, Plus, RefreshCw, ShieldCheck, Sparkles, Users, Video, Wallet } from "lucide-react";
import { BrowserProvider, ContractFactory, Contract, keccak256, toUtf8Bytes } from "ethers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { REGISTRY_ABI, REGISTRY_BYTECODE } from "@/lib/prelecture-contract";

declare global {
  interface Window { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }
  interface Document { modelContext?: { registerTool: (tool: Record<string, unknown>, options?: { signal?: AbortSignal }) => void | Promise<void> } }
}

const MONAD = { chainId: "0x279f", chainName: "Monad Testnet", nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 }, rpcUrls: ["https://testnet-rpc.monad.xyz"], blockExplorerUrls: ["https://testnet.monadexplorer.com"] };
const DEFAULT_PREVIEW = "Dijkstra’s algorithm finds the shortest path by repeatedly choosing the nearest unvisited node and relaxing its outgoing edges.";
const resources = [
  { icon: Video, type: "Watch · 11 min", title: "Dijkstra’s shortest path, visually explained", source: "YouTube · Computer Science", href: "https://www.youtube.com/results?search_query=dijkstra%27s+algorithm+visual+explanation" },
  { icon: BookOpen, type: "Read · 8 min", title: "Dijkstra algorithm — free reference", source: "CP-Algorithms", href: "https://cp-algorithms.com/graph/dijkstra.html" },
  { icon: FileText, type: "Paper · Original work", title: "A note on two problems in connexion with graphs", source: "E. W. Dijkstra · 1959", href: "https://doi.org/10.1007/BF01386390" },
];

function shortAddress(address: string) { return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : ""; }

function ResourceCard({ resource }: { resource: (typeof resources)[number] }) {
  const Icon = resource.icon;
  return <a href={resource.href} target="_blank" rel="noreferrer" className="resource-card group"><span className="resource-icon"><Icon /></span><span className="min-w-0 flex-1"><span className="resource-type">{resource.type}</span><strong>{resource.title}</strong><span className="resource-source">{resource.source}</span></span><ArrowUpRight className="mt-1 size-4 text-slate-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-indigo-600" /></a>;
}

export default function Home() {
  const [role, setRole] = useState("teacher");
  const [classroom, setClassroom] = useState({ name: "Data Structures & Algorithms", code: "DSA-7K4" });
  const [classNameDraft, setClassNameDraft] = useState("Advanced Algorithms");
  const [topic, setTopic] = useState("Dijkstra’s Shortest Path Algorithm");
  const [material, setMaterial] = useState("Module 4: Greedy strategy, graph relaxation, priority queues and shortest paths.");
  const [preview, setPreview] = useState(DEFAULT_PREVIEW);
  const [generating, setGenerating] = useState(false);
  const [verified, setVerified] = useState(false);
  const [approved, setApproved] = useState(false);
  const [students, setStudents] = useState(38);
  const [enrolled, setEnrolled] = useState(false);
  const [joinCode, setJoinCode] = useState("DSA-7K4");
  const [wallet, setWallet] = useState("");
  const [contractAddress, setContractAddress] = useState("");
  const [txHash, setTxHash] = useState("");
  const [chainBusy, setChainBusy] = useState(false);
  const contentHash = useMemo(() => keccak256(toUtf8Bytes(`${classroom.code}|${topic}|${preview}`)), [classroom.code, topic, preview]);

  const generatePreview = () => { setGenerating(true); setApproved(false); setVerified(false); window.setTimeout(() => { setPreview(DEFAULT_PREVIEW); setGenerating(false); toast.success("Grounded preview drafted", { description: "Only you can approve what students see." }); }, 750); };
  const approveDemo = () => { if (!verified) { toast.error("Teacher verification required", { description: "Confirm the preview matches your material first." }); return false; } setApproved(true); setTxHash(`demo-${contentHash.slice(2, 14)}`); toast.success("Preview approved", { description: "It is now visible in the student view." }); return true; };

  const connectWallet = async () => {
    if (!window.ethereum) { toast.error("Wallet not found", { description: "Install MetaMask for Monad. The full demo still works without it." }); return; }
    try { setChainBusy(true); try { await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: MONAD.chainId }] }); } catch { await window.ethereum.request({ method: "wallet_addEthereumChain", params: [MONAD] }); } const accounts = await window.ethereum.request({ method: "eth_requestAccounts" }) as string[]; setWallet(accounts[0] ?? ""); toast.success("Connected to Monad Testnet"); }
    catch { toast.error("Wallet connection cancelled"); } finally { setChainBusy(false); }
  };

  const deployRegistry = async () => {
    if (!window.ethereum || !wallet) return connectWallet();
    try { setChainBusy(true); const provider = new BrowserProvider(window.ethereum); const signer = await provider.getSigner(); const factory = new ContractFactory(REGISTRY_ABI, REGISTRY_BYTECODE, signer); const contract = await factory.deploy(); toast.info("Deploying the class registry…"); await contract.waitForDeployment(); const address = await contract.getAddress(); setContractAddress(address); const tx = await contract.createClassroom(keccak256(toUtf8Bytes(classroom.code))); await tx.wait(); toast.success("Solidity registry deployed", { description: "This classroom now has an on-chain trust record." }); }
    catch (error) { console.error(error); toast.error("Testnet action did not complete", { description: "Check your MON balance, or continue in demo mode." }); } finally { setChainBusy(false); }
  };

  const approveOnchain = async () => {
    if (!verified) return approveDemo();
    if (!contractAddress || !window.ethereum) { toast.info("Deploy the registry first", { description: "Or use Demo approval to test without a wallet." }); return; }
    try { setChainBusy(true); const provider = new BrowserProvider(window.ethereum); const signer = await provider.getSigner(); const registry = new Contract(contractAddress, REGISTRY_ABI, signer); const tx = await registry.approvePreview(keccak256(toUtf8Bytes(classroom.code)), keccak256(toUtf8Bytes(topic)), contentHash); toast.info("Recording approval on Monad…"); await tx.wait(); setTxHash(tx.hash); setApproved(true); toast.success("Teacher approval verified on Monad Testnet"); }
    catch (error) { console.error(error); toast.error("Approval was not recorded", { description: "No student content was changed." }); } finally { setChainBusy(false); }
  };

  const enrollStudent = () => { if (joinCode.trim().toUpperCase() !== classroom.code) { toast.error("Class code not found"); return false; } setEnrolled(true); setStudents((count) => count + 1); toast.success(`Joined ${classroom.name}`); return true; };

  useEffect(() => {
    const context = document.modelContext; if (!context?.registerTool) return; const lifecycle = new AbortController();
    const register = (tool: Record<string, unknown>) => { try { void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })); } catch {} };
    register({ name: "get_prelecture_status", title: "Get Pre-Lecture status", description: "Read the current classroom, topic, approval, and enrollment state.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false }, execute: () => ({ classroom, topic, approved, enrolled }) });
    register({ name: "approve_preview_demo", title: "Approve preview in demo", description: "Approve the visible AI preview after teacher verification.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: () => { if (!verified) throw new Error("Teacher verification is required"); setApproved(true); return { approved: true, contentHash }; } });
    return () => lifecycle.abort();
  }, [approved, classroom, contentHash, enrolled, topic, verified]);

  return <main className="app-shell"><Toaster position="top-center" richColors />
    <header className="topbar"><div className="brand"><span className="brand-mark"><BookOpen /></span><span>Pre-Lecture</span></div><div className="top-actions"><Badge variant="outline" className="network-badge"><span className="pulse-dot" />Monad Testnet</Badge><Button variant="outline" onClick={connectWallet} disabled={chainBusy} className="wallet-button">{chainBusy ? <LoaderCircle className="animate-spin" /> : <Wallet />}{wallet ? shortAddress(wallet) : "Connect wallet"}</Button></div></header>
    <div className="page-grid"><aside className="sidebar"><div className="class-picker"><span className="eyebrow">ACTIVE CLASSROOM</span><strong>{classroom.name}</strong><span><Users /> {students} students · {classroom.code}</span></div><div className="flow-card"><span className="eyebrow">TODAY’S FLOW</span>{[["1", "Post upcoming topic", true], ["2", "Review AI preview", verified], ["3", "Approve for students", approved]].map(([number,label,done]) => <div className="flow-step" key={String(number)}><span className={done ? "step-number done" : "step-number"}>{done ? <Check /> : number}</span><span>{label}</span></div>)}</div><div className="trust-note"><ShieldCheck /><div><strong>Teacher-controlled AI</strong><span>Drafts remain hidden until you approve them.</span></div></div></aside>
      <section className="workspace"><div className="workspace-heading"><div><span className="eyebrow">WEDNESDAY · 18 SEP</span><h1>Prepare the next lecture</h1><p>Give students just enough context before they enter class.</p></div><Dialog><DialogTrigger asChild><Button variant="outline"><Plus /> New classroom</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Create a classroom</DialogTitle><DialogDescription>Students will enroll using a short class code.</DialogDescription></DialogHeader><label className="field-label">Classroom name<Input value={classNameDraft} onChange={(e) => setClassNameDraft(e.target.value)} /></label><DialogFooter><Button onClick={() => { setClassroom({ name: classNameDraft || "New classroom", code: `CLS-${Math.floor(100 + Math.random() * 899)}` }); setStudents(0); toast.success("Classroom created"); }}>Create classroom</Button></DialogFooter></DialogContent></Dialog></div>
        <Tabs value={role} onValueChange={setRole} className="role-tabs"><TabsList className="role-list"><TabsTrigger value="teacher"><GraduationCap /> Teacher workspace</TabsTrigger><TabsTrigger value="student"><Users /> Student mobile view</TabsTrigger></TabsList>
          <TabsContent value="teacher" className="teacher-grid"><div className="main-column"><section className="panel composer-panel"><div className="panel-heading"><span className="panel-number">01</span><div><h2>Post the upcoming topic</h2><p>Ground the preview in your syllabus or notes.</p></div></div><label className="field-label">Topic<Input value={topic} onChange={(e) => setTopic(e.target.value)} /></label><label className="field-label">Syllabus / teacher material<Textarea value={material} onChange={(e) => setMaterial(e.target.value)} rows={3} /></label><Button onClick={generatePreview} disabled={generating} className="generate-button">{generating ? <LoaderCircle className="animate-spin" /> : <Sparkles />}{generating ? "Drafting grounded preview…" : "Generate ultra-short preview"}</Button></section>
            <section className="panel approval-panel"><div className="panel-heading"><span className="panel-number">02</span><div><h2>Review before students see it</h2><p>Edit the wording, verify accuracy, then approve.</p></div><Badge className={approved ? "approved-badge" : "draft-badge"}>{approved ? "Approved" : "Private draft"}</Badge></div><div className="preview-editor"><span className="preview-label"><Sparkles /> AI PREVIEW · {preview.split(/\s+/).length} WORDS</span><Textarea value={preview} onChange={(e) => { setPreview(e.target.value); setApproved(false); }} className="preview-textarea" /><div className="source-row"><Link2 /><span>Grounded in: {material}</span></div></div><label className="verify-row"><Checkbox checked={verified} onCheckedChange={(value) => setVerified(Boolean(value))} /><span><strong>I verified this preview</strong><small>It matches my material and is safe to show students.</small></span></label><div className="approval-actions"><Button onClick={approveDemo} disabled={!verified || approved}><CheckCircle2 /> Approve in demo</Button><Button variant="outline" onClick={approveOnchain} disabled={!verified || approved || chainBusy}><Network /> Approve on Monad</Button></div></section></div>
            <aside className="right-column"><section className="panel chain-panel"><div className="chain-heading"><span className="chain-icon"><Hash /></span><div><h3>Proof, not content</h3><p>Only hashes and approvals go on-chain.</p></div></div><div className="chain-stats"><div><span>Network</span><strong>Monad Testnet</strong></div><div><span>Contract</span><strong>{contractAddress ? shortAddress(contractAddress) : "Not deployed"}</strong></div></div>{!contractAddress && <Button variant="outline" onClick={deployRegistry} disabled={chainBusy} className="w-full">{chainBusy ? <LoaderCircle className="animate-spin" /> : <Network />} Deploy Solidity registry</Button>}{txHash && <a className="tx-link" href={txHash.startsWith("0x") ? `https://testnet.monadexplorer.com/tx/${txHash}` : undefined} target="_blank" rel="noreferrer"><CheckCircle2 /><span><strong>Approval recorded</strong><small>{txHash.slice(0, 18)}…</small></span>{txHash.startsWith("0x") && <ExternalLink />}</a>}<div className="privacy-list"><span><Check /> Lesson text stays private</span><span><Check /> Approval is tamper-evident</span><span><Check /> Low-cost classroom events</span></div></section><section className="panel student-peek"><span className="eyebrow">STUDENT VISIBILITY</span><h3>{approved ? "Live for enrolled students" : "Still hidden"}</h3><p>{approved ? "The approved preview and resources are now available." : "Students only see a waiting state until you approve."}</p><Button variant="ghost" onClick={() => setRole("student")}>Open student view <ChevronRight /></Button></section></aside></TabsContent>
          <TabsContent value="student"><div className="student-stage"><div className="phone-shell"><div className="phone-top"><div className="brand compact"><span className="brand-mark"><BookOpen /></span><span>Pre-Lecture</span></div><span className="avatar">AK</span></div>{!enrolled ? <div className="enroll-screen"><span className="student-illustration"><GraduationCap /></span><span className="eyebrow">JOIN YOUR CLASS</span><h2>One code. Ready before class.</h2><p>Enter the code shared by your teacher.</p><Input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} aria-label="Class code" className="code-input" /><Button onClick={enrollStudent} className="w-full">Join classroom <ChevronRight /></Button><button className="demo-link" onClick={() => { setEnrolled(true); toast.success("Demo student enrolled"); }}>Use sample student</button></div> : <div className="student-home"><div className="student-greeting"><span className="eyebrow">NEXT LECTURE · 10:30 AM</span><h2>Hi Aarya, you’re almost ready.</h2><p>{classroom.name}</p></div>{approved ? <><article className="approved-preview"><div className="approval-strip"><ShieldCheck /> Teacher approved <span>Verified</span></div><div className="topic-meta"><span>12–20 sec read</span><span>Module 4</span></div><h3>{topic}</h3><p>{preview}</p><div className="teacher-sign"><span>NK</span><div><strong>Approved by Dr. Neha Kulkarni</strong><small>{txHash.startsWith("0x") ? "Verified on Monad Testnet" : "Verified in prototype"}</small></div></div></article><section className="resources-section"><div><span className="eyebrow">EXPLORE IF YOU HAVE TIME</span><h3>Helpful resources</h3></div>{resources.map((resource) => <ResourceCard key={resource.title} resource={resource} />)}</section></> : <div className="waiting-card"><span className="waiting-icon"><LockKeyhole /></span><h3>Your next preview is being checked</h3><p>Your teacher is reviewing the AI draft. You will only see verified content.</p><Button variant="outline" onClick={() => setRole("teacher")}><RefreshCw /> Switch to teacher and approve</Button></div>}</div>}<nav className="phone-nav"><span className="active"><CircleDot />Today</span><span><BookOpen />Classes</span><span><Play />Saved</span></nav></div><div className="student-explainer"><Badge variant="outline">Minimal by design</Badge><h2>Students see only what matters.</h2><p>One approved idea, its source trail, and optional resources. No chatbot, no prompt writing, no searching before class.</p><div className="metric-row"><div><strong>12–20 sec</strong><span>preview length</span></div><div><strong>1 tap</strong><span>to start</span></div></div></div></div></TabsContent>
        </Tabs></section></div></main>;
}
