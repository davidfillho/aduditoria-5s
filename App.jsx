// ============================================================
// 5S AUDIT — App.jsx
// Firebase Auth + Firestore
// Substitua firebaseConfig com suas credenciais
// ============================================================

import { useState, useEffect, useRef } from "react";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ─── CONFIGURAÇÃO FIREBASE ───────────────────────────────────
// Substitua pelos dados do seu projeto Firebase
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ─── DADOS DOS SENSOS ────────────────────────────────────────
const SENSOS = [
  {
    key: "seiri", nome: "1S — Seiri (Utilização)", cor: "#E05C2A", icone: "◈",
    criterios: [
      "Itens desnecessários foram identificados e removidos",
      "Apenas ferramentas e materiais de uso frequente estão no local",
      "Não há equipamentos quebrados ou obsoletos na área",
      "Documentos e registros desnecessários foram descartados",
      "Estoques em excesso foram eliminados ou realocados",
    ],
  },
  {
    key: "seiton", nome: "2S — Seiton (Organização)", cor: "#2A7BE0", icone: "◉",
    criterios: [
      "Cada item possui um lugar definido e identificado",
      "Itens são fáceis de encontrar, usar e devolver",
      "Identificações visuais estão presentes e legíveis",
      "Layout da área facilita o fluxo de trabalho",
      "Corredores e saídas de emergência estão desobstruídos",
    ],
  },
  {
    key: "seiso", nome: "3S — Seiso (Limpeza)", cor: "#2AC47A", icone: "◎",
    criterios: [
      "Área de trabalho está limpa e sem sujeira visível",
      "Equipamentos e máquinas estão limpos e conservados",
      "Fontes de sujeira foram identificadas e eliminadas",
      "Responsabilidades de limpeza estão definidas",
      "Materiais de limpeza estão disponíveis e organizados",
    ],
  },
  {
    key: "seiketsu", nome: "4S — Seiketsu (Padronização)", cor: "#A02AE0", icone: "◆",
    criterios: [
      "Padrões visuais estão afixados na área",
      "Procedimentos de trabalho estão documentados e acessíveis",
      "Todos os colaboradores conhecem os padrões estabelecidos",
      "Auditorias periódicas são realizadas e registradas",
      "Melhorias são comunicadas e implementadas sistematicamente",
    ],
  },
  {
    key: "shitsuke", nome: "5S — Shitsuke (Disciplina)", cor: "#E0A02A", icone: "◇",
    criterios: [
      "Colaboradores seguem os padrões sem necessidade de supervisão",
      "Há cultura de melhoria contínua na equipe",
      "Problemas são reportados e tratados rapidamente",
      "Novos colaboradores recebem treinamento em 5S",
      "Resultados das auditorias são compartilhados com a equipe",
    ],
  },
];

const NOTA_LABELS = ["Inexistente", "Inicial", "Básico", "Desenvolvido", "Excelente"];
const NOTA_CORES = ["#555", "#E05C2A", "#E0A02A", "#2A7BE0", "#2AC47A"];

// ─── UTILITÁRIOS ─────────────────────────────────────────────
function calcMedia(notas) {
  const vals = Object.values(notas || {}).filter((v) => v !== null && v !== undefined);
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function classificar(media) {
  if (media >= 3.5) return { label: "Excelente", cor: "#2AC47A" };
  if (media >= 2.5) return { label: "Bom", cor: "#2A7BE0" };
  if (media >= 1.5) return { label: "Regular", cor: "#E0A02A" };
  return { label: "Crítico", cor: "#E05C2A" };
}

function notasIniciais() {
  const init = {};
  SENSOS.forEach((s) => {
    init[s.key] = {};
    s.criterios.forEach((_, i) => (init[s.key][i] = null));
  });
  return init;
}

// ─── RADAR CHART ─────────────────────────────────────────────
function RadarChart({ notas, size = 240 }) {
  const cx = size / 2, cy = size / 2, r = size * 0.375;
  const angulos = SENSOS.map((_, i) => (Math.PI * 2 * i) / 5 - Math.PI / 2);
  const pts = angulos
    .map((a, i) => {
      const media = calcMedia(notas[SENSOS[i].key] || {});
      const p = (media / 4);
      return `${cx + r * p * Math.cos(a)},${cy + r * p * Math.sin(a)}`;
    })
    .join(" ");

  return (
    <svg width={size} height={size} style={{ display: "block", margin: "0 auto" }}>
      {[1, 0.75, 0.5, 0.25].map((f) => (
        <polygon
          key={f}
          points={angulos.map((a) => `${cx + r * f * Math.cos(a)},${cy + r * f * Math.sin(a)}`).join(" ")}
          fill="none" stroke="#2a2a2a" strokeWidth="1"
        />
      ))}
      {angulos.map((a, i) => (
        <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)} stroke="#2a2a2a" strokeWidth="1" />
      ))}
      <polygon points={pts} fill="rgba(42,123,224,0.2)" stroke="#2A7BE0" strokeWidth="2" />
      {angulos.map((a, i) => {
        const media = calcMedia(notas[SENSOS[i].key] || {});
        const p = media / 4;
        return <circle key={i} cx={cx + r * p * Math.cos(a)} cy={cy + r * p * Math.sin(a)} r="5" fill={SENSOS[i].cor} />;
      })}
      {angulos.map((a, i) => (
        <text key={i} x={cx + (r + 20) * Math.cos(a)} y={cy + (r + 20) * Math.sin(a)}
          textAnchor="middle" dominantBaseline="middle" fontSize="13" fill="#666" fontWeight="700">
          {SENSOS[i].icone}
        </text>
      ))}
    </svg>
  );
}

// ─── TELA DE LOGIN ────────────────────────────────────────────
function TelaLogin({ onLogin }) {
  const [modo, setModo] = useState("login"); // login | cadastro
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setErro(""); setLoading(true);
    try {
      if (modo === "login") {
        await signInWithEmailAndPassword(auth, email, senha);
      } else {
        await createUserWithEmailAndPassword(auth, email, senha);
      }
    } catch (e) {
      const msgs = {
        "auth/user-not-found": "Usuário não encontrado.",
        "auth/wrong-password": "Senha incorreta.",
        "auth/email-already-in-use": "E-mail já cadastrado.",
        "auth/weak-password": "Senha muito fraca (mínimo 6 caracteres).",
        "auth/invalid-email": "E-mail inválido.",
        "auth/invalid-credential": "E-mail ou senha incorretos.",
      };
      setErro(msgs[e.code] || "Erro: " + e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Mono', monospace" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Bebas+Neue&display=swap'); *{box-sizing:border-box;}`}</style>

      {/* Grade decorativa */}
      <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(#1a1a1a 1px, transparent 1px), linear-gradient(90deg, #1a1a1a 1px, transparent 1px)", backgroundSize: "40px 40px", opacity: 0.4, pointerEvents: "none" }} />

      <div style={{ position: "relative", width: 420, background: "#111", border: "1px solid #2a2a2a", borderRadius: 12, padding: 40 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 48, letterSpacing: 8, color: "#fff", lineHeight: 1 }}>5S AUDIT</div>
          <div style={{ fontSize: 10, color: "#444", letterSpacing: 3, marginTop: 6 }}>SISTEMA DE GESTÃO DE QUALIDADE</div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", background: "#0a0a0a", borderRadius: 6, padding: 3, marginBottom: 28 }}>
          {["login", "cadastro"].map((m) => (
            <button key={m} onClick={() => { setModo(m); setErro(""); }}
              style={{ flex: 1, padding: "8px", background: modo === m ? "#2A7BE0" : "transparent", color: modo === m ? "#fff" : "#555", border: "none", borderRadius: 4, fontFamily: "'DM Mono', monospace", fontSize: 11, cursor: "pointer", letterSpacing: 1, transition: "all .2s", textTransform: "uppercase" }}>
              {m}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {modo === "cadastro" && (
            <div>
              <div style={{ fontSize: 10, color: "#555", letterSpacing: 2, marginBottom: 6 }}>NOME</div>
              <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome"
                style={{ width: "100%", background: "#0a0a0a", border: "1px solid #2a2a2a", color: "#e8e8e8", padding: "12px 14px", borderRadius: 6, fontFamily: "'DM Mono', monospace", fontSize: 13, outline: "none" }} />
            </div>
          )}
          <div>
            <div style={{ fontSize: 10, color: "#555", letterSpacing: 2, marginBottom: 6 }}>E-MAIL</div>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com"
              style={{ width: "100%", background: "#0a0a0a", border: "1px solid #2a2a2a", color: "#e8e8e8", padding: "12px 14px", borderRadius: 6, fontFamily: "'DM Mono', monospace", fontSize: 13, outline: "none" }} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#555", letterSpacing: 2, marginBottom: 6 }}>SENHA</div>
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="••••••••"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              style={{ width: "100%", background: "#0a0a0a", border: "1px solid #2a2a2a", color: "#e8e8e8", padding: "12px 14px", borderRadius: 6, fontFamily: "'DM Mono', monospace", fontSize: 13, outline: "none" }} />
          </div>

          {erro && <div style={{ fontSize: 12, color: "#E05C2A", background: "#E05C2A11", border: "1px solid #E05C2A33", borderRadius: 6, padding: "10px 14px" }}>{erro}</div>}

          <button onClick={handleSubmit} disabled={loading}
            style={{ background: "#2A7BE0", color: "#fff", border: "none", padding: "14px", borderRadius: 6, fontFamily: "'DM Mono', monospace", fontSize: 13, cursor: loading ? "not-allowed" : "pointer", letterSpacing: 1, marginTop: 8, opacity: loading ? 0.7 : 1, transition: "opacity .2s" }}>
            {loading ? "AGUARDE..." : modo === "login" ? "ENTRAR" : "CRIAR CONTA"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── APP PRINCIPAL ────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tela, setTela] = useState("home");
  const [historico, setHistorico] = useState([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);

  // Form auditoria
  const [empresa, setEmpresa] = useState("");
  const [area, setArea] = useState("");
  const [auditor, setAuditor] = useState("");
  const [notas, setNotas] = useState(notasIniciais());
  const [acoes, setAcoes] = useState({});
  const [sensoAtivo, setSensoAtivo] = useState(0);
  const [salvando, setSalvando] = useState(false);

  // Detalhe
  const [auditoriaAtiva, setAuditoriaAtiva] = useState(null);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  // Carregar histórico quando logar
  useEffect(() => {
    if (user) carregarHistorico();
  }, [user]);

  const carregarHistorico = async () => {
    setLoadingHistorico(true);
    try {
      const q = query(
        collection(db, "auditorias"),
        where("uid", "==", user.uid),
        orderBy("criadoEm", "desc")
      );
      const snap = await getDocs(q);
      setHistorico(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("Erro ao carregar histórico:", e);
    }
    setLoadingHistorico(false);
  };

  const resetAuditoria = () => {
    setEmpresa(""); setArea(""); setAuditor("");
    setNotas(notasIniciais()); setAcoes({});
    setSensoAtivo(0);
  };

  const setNota = (senso, idx, val) =>
    setNotas((prev) => ({ ...prev, [senso]: { ...prev[senso], [idx]: val } }));

  const setAcao = (senso, idx, campo, val) =>
    setAcoes((prev) => ({
      ...prev,
      [`${senso}_${idx}`]: { ...prev[`${senso}_${idx}`], [campo]: val },
    }));

  const mediaGeral = () => {
    const todas = SENSOS.flatMap((s) => Object.values(notas[s.key]).filter((v) => v !== null));
    if (!todas.length) return 0;
    return todas.reduce((a, b) => a + b, 0) / todas.length;
  };

  const totalPreenchido = SENSOS.reduce((acc, s) =>
    acc + Object.values(notas[s.key]).filter((v) => v !== null).length, 0);
  const totalCriterios = SENSOS.reduce((acc, s) => acc + s.criterios.length, 0);

  const salvarAuditoria = async () => {
    setSalvando(true);
    try {
      const dados = {
        uid: user.uid,
        email: user.email,
        empresa, area, auditor,
        notas: JSON.parse(JSON.stringify(notas)),
        acoes: JSON.parse(JSON.stringify(acoes)),
        mediaGeral: mediaGeral(),
        data: new Date().toLocaleDateString("pt-BR"),
        criadoEm: serverTimestamp(),
      };
      await addDoc(collection(db, "auditorias"), dados);
      await carregarHistorico();
      alert("✅ Auditoria salva na nuvem!");
    } catch (e) {
      alert("Erro ao salvar: " + e.message);
    }
    setSalvando(false);
  };

  const excluirAuditoria = async (id) => {
    if (!confirm("Excluir esta auditoria?")) return;
    await deleteDoc(doc(db, "auditorias", id));
    await carregarHistorico();
  };

  const imprimirPDF = () => window.print();

  // ── Loading auth ──
  if (authLoading) return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", color: "#444", fontFamily: "monospace", fontSize: 13 }}>
      CARREGANDO...
    </div>
  );

  // ── Login ──
  if (!user) return <TelaLogin />;

  // ── CSS global ──
  const globalStyle = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Bebas+Neue&display=swap');
    * { box-sizing: border-box; }
    ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: #0a0a0a; } ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 3px; }
    input, select, textarea { background: #0e0e0e; border: 1px solid #2a2a2a; color: #e8e8e8; padding: 10px 14px; border-radius: 6px; font-family: 'DM Mono', monospace; font-size: 13px; width: 100%; outline: none; transition: border-color .2s; }
    input:focus, select:focus, textarea:focus { border-color: #2A7BE0; }
    @media print { .no-print { display: none !important; } body { background: white !important; color: black !important; font-size: 11px !important; } }
  `;

  // ── HOME ──
  if (tela === "home") return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#e8e8e8", fontFamily: "'DM Mono', monospace" }}>
      <style>{globalStyle}</style>

      {/* Header */}
      <div className="no-print" style={{ borderBottom: "1px solid #1a1a1a", padding: "20px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: 5, color: "#fff" }}>5S AUDIT</div>
          <div style={{ fontSize: 10, color: "#444", letterSpacing: 2 }}>SISTEMA DE GESTÃO DE QUALIDADE</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 11, color: "#444" }}>{user.email}</div>
          <button onClick={() => { resetAuditoria(); setTela("auditoria"); }}
            style={{ background: "#2A7BE0", color: "#fff", border: "none", padding: "10px 22px", borderRadius: 6, fontFamily: "'DM Mono', monospace", fontSize: 12, cursor: "pointer", letterSpacing: 1 }}>
            + NOVA AUDITORIA
          </button>
          <button onClick={() => setTela("historico")}
            style={{ background: "#111", color: "#aaa", border: "1px solid #2a2a2a", padding: "10px 22px", borderRadius: 6, fontFamily: "'DM Mono', monospace", fontSize: 12, cursor: "pointer", letterSpacing: 1 }}>
            HISTÓRICO ({historico.length})
          </button>
          <button onClick={() => signOut(auth)}
            style={{ background: "none", color: "#444", border: "1px solid #1a1a1a", padding: "10px 16px", borderRadius: 6, fontFamily: "'DM Mono', monospace", fontSize: 11, cursor: "pointer" }}>
            SAIR
          </button>
        </div>
      </div>

      <div style={{ padding: "40px" }}>
        {/* Cards dos sensos */}
        <div style={{ fontSize: 10, color: "#333", letterSpacing: 3, marginBottom: 20 }}>OS 5 SENSOS</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 40 }}>
          {SENSOS.map((s) => (
            <div key={s.key} style={{ background: "#111", border: `1px solid ${s.cor}22`, borderRadius: 8, padding: "18px 16px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: s.cor }} />
              <div style={{ fontSize: 26, color: s.cor, marginBottom: 8 }}>{s.icone}</div>
              <div style={{ fontSize: 9, color: "#444", letterSpacing: 2, marginBottom: 4 }}>{s.nome.split("—")[0].trim()}</div>
              <div style={{ fontSize: 12, color: "#ccc" }}>{s.nome.split("—")[1]?.trim()}</div>
              <div style={{ fontSize: 10, color: "#333", marginTop: 10 }}>{s.criterios.length} critérios</div>
            </div>
          ))}
        </div>

        {/* Stats */}
        {historico.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 40 }}>
            {[
              { l: "AUDITORIAS", v: historico.length, cor: "#2A7BE0" },
              { l: "ÚLTIMA MÉDIA", v: historico[0]?.mediaGeral?.toFixed(2) + " / 4", cor: classificar(historico[0]?.mediaGeral || 0).cor },
              { l: "ÚLTIMA DATA", v: historico[0]?.data, cor: "#A02AE0" },
              { l: "ÚLTIMA ÁREA", v: historico[0]?.area || "—", cor: "#2AC47A" },
            ].map((s) => (
              <div key={s.l} style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 8, padding: "18px 22px" }}>
                <div style={{ fontSize: 9, color: "#444", letterSpacing: 2, marginBottom: 8 }}>{s.l}</div>
                <div style={{ fontSize: 22, fontFamily: "'Bebas Neue', sans-serif", color: s.cor, letterSpacing: 2 }}>{s.v}</div>
              </div>
            ))}
          </div>
        )}

        {historico.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#333", fontSize: 13 }}>
            Nenhuma auditoria registrada ainda.{" "}
            <span onClick={() => { resetAuditoria(); setTela("auditoria"); }} style={{ color: "#2A7BE0", cursor: "pointer" }}>
              Criar a primeira →
            </span>
          </div>
        )}
      </div>
    </div>
  );

  // ── AUDITORIA ──
  if (tela === "auditoria") {
    const s = SENSOS[sensoAtivo];
    const progresso = Math.round((totalPreenchido / totalCriterios) * 100);

    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#e8e8e8", fontFamily: "'DM Mono', monospace" }}>
        <style>{globalStyle}</style>

        {/* Topbar */}
        <div className="no-print" style={{ borderBottom: "1px solid #1a1a1a", padding: "14px 28px", display: "flex", alignItems: "center", gap: 20 }}>
          <button onClick={() => setTela("home")} style={{ background: "none", border: "none", color: "#444", cursor: "pointer", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>← VOLTAR</button>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: 3, color: "#fff" }}>NOVA AUDITORIA</div>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 10, color: "#444" }}>{progresso}%</div>
          <div style={{ width: 100, height: 3, background: "#1a1a1a", borderRadius: 2 }}>
            <div style={{ width: `${progresso}%`, height: "100%", background: "#2A7BE0", borderRadius: 2, transition: "width .3s" }} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", minHeight: "calc(100vh - 53px)" }}>
          {/* Sidebar */}
          <div style={{ borderRight: "1px solid #1a1a1a", padding: 20, overflowY: "auto" }}>
            <div style={{ fontSize: 9, color: "#333", letterSpacing: 2, marginBottom: 14 }}>DADOS</div>
            {[
              { label: "Empresa", val: empresa, set: setEmpresa },
              { label: "Área / Setor", val: area, set: setArea },
              { label: "Auditor", val: auditor, set: setAuditor },
            ].map((f) => (
              <div key={f.label} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 9, color: "#444", marginBottom: 4 }}>{f.label.toUpperCase()}</div>
                <input value={f.val} onChange={(e) => f.set(e.target.value)} placeholder={f.label} />
              </div>
            ))}

            <div style={{ fontSize: 9, color: "#333", letterSpacing: 2, margin: "20px 0 12px" }}>SENSOS</div>
            {SENSOS.map((ss, i) => {
              const done = Object.values(notas[ss.key]).filter((v) => v !== null).length;
              return (
                <button key={ss.key} onClick={() => setSensoAtivo(i)}
                  style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", background: sensoAtivo === i ? "#161616" : "none", border: sensoAtivo === i ? `1px solid ${ss.cor}44` : "1px solid transparent", borderRadius: 6, padding: "9px 10px", cursor: "pointer", marginBottom: 4, textAlign: "left" }}>
                  <div style={{ fontSize: 16, color: ss.cor }}>{ss.icone}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: sensoAtivo === i ? "#fff" : "#666" }}>{ss.nome.split("—")[1]?.trim()}</div>
                    <div style={{ fontSize: 9, color: "#333", marginTop: 1 }}>{done}/{ss.criterios.length}</div>
                  </div>
                  {done === ss.criterios.length && <div style={{ fontSize: 10, color: "#2AC47A" }}>✓</div>}
                </button>
              );
            })}

            <div style={{ marginTop: 20 }}>
              <RadarChart notas={notas} size={200} />
              <div style={{ textAlign: "center", marginTop: 6 }}>
                <div style={{ fontSize: 22, fontFamily: "'Bebas Neue', sans-serif", color: classificar(mediaGeral()).cor, letterSpacing: 2 }}>
                  {mediaGeral().toFixed(2)} / 4
                </div>
                <div style={{ fontSize: 10, color: "#444" }}>{classificar(mediaGeral()).label}</div>
              </div>
            </div>
          </div>

          {/* Critérios */}
          <div style={{ padding: "28px 32px", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
              <div style={{ fontSize: 32, color: s.cor }}>{s.icone}</div>
              <div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, letterSpacing: 3, color: "#fff" }}>{s.nome}</div>
                <div style={{ fontSize: 10, color: "#444" }}>AVALIE CADA CRITÉRIO DE 0 A 4</div>
              </div>
            </div>

            {s.criterios.map((crit, idx) => {
              const nota = notas[s.key][idx];
              const chaveAcao = `${s.key}_${idx}`;
              const showAcao = nota !== null && nota < 2;
              return (
                <div key={idx} style={{ background: "#0e0e0e", border: `1px solid ${showAcao ? s.cor + "44" : "#1a1a1a"}`, borderRadius: 8, padding: 18, marginBottom: 14 }}>
                  <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                    <div style={{ fontSize: 9, color: "#333", paddingTop: 2, minWidth: 16 }}>0{idx + 1}</div>
                    <div style={{ fontSize: 13, color: "#bbb", lineHeight: 1.6 }}>{crit}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[0, 1, 2, 3, 4].map((n) => (
                      <button key={n} onClick={() => setNota(s.key, idx, n)}
                        style={{ flex: 1, padding: "7px 3px", borderRadius: 5, border: nota === n ? `2px solid ${NOTA_CORES[n]}` : "1px solid #1e1e1e", background: nota === n ? NOTA_CORES[n] + "1a" : "#0a0a0a", color: nota === n ? NOTA_CORES[n] : "#444", fontSize: 10, cursor: "pointer", fontFamily: "'DM Mono', monospace", transition: "all .12s" }}>
                        <div style={{ fontSize: 15, fontWeight: 700 }}>{n}</div>
                        <div style={{ fontSize: 8, marginTop: 1 }}>{NOTA_LABELS[n]}</div>
                      </button>
                    ))}
                  </div>

                  {showAcao && (
                    <div style={{ marginTop: 12, padding: 14, background: "#0a0a0a", borderRadius: 6, border: "1px solid #E05C2A22" }}>
                      <div style={{ fontSize: 9, color: "#E05C2A", letterSpacing: 2, marginBottom: 10 }}>⚠ PLANO DE AÇÃO</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 9, color: "#444", marginBottom: 4 }}>AÇÃO CORRETIVA</div>
                          <input placeholder="Descreva a ação..." value={acoes[chaveAcao]?.acao || ""} onChange={(e) => setAcao(s.key, idx, "acao", e.target.value)} />
                        </div>
                        <div>
                          <div style={{ fontSize: 9, color: "#444", marginBottom: 4 }}>RESPONSÁVEL</div>
                          <input placeholder="Nome" value={acoes[chaveAcao]?.responsavel || ""} onChange={(e) => setAcao(s.key, idx, "responsavel", e.target.value)} />
                        </div>
                        <div>
                          <div style={{ fontSize: 9, color: "#444", marginBottom: 4 }}>PRAZO</div>
                          <input type="date" value={acoes[chaveAcao]?.prazo || ""} onChange={(e) => setAcao(s.key, idx, "prazo", e.target.value)} />
                        </div>
                        <div>
                          <div style={{ fontSize: 9, color: "#444", marginBottom: 4 }}>STATUS</div>
                          <select value={acoes[chaveAcao]?.status || "aberto"} onChange={(e) => setAcao(s.key, idx, "status", e.target.value)}>
                            <option value="aberto">Aberto</option>
                            <option value="em_andamento">Em andamento</option>
                            <option value="concluido">Concluído</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              {sensoAtivo < SENSOS.length - 1 ? (
                <button onClick={() => setSensoAtivo((p) => p + 1)}
                  style={{ flex: 1, background: s.cor, color: "#fff", border: "none", padding: "13px", borderRadius: 7, fontFamily: "'DM Mono', monospace", fontSize: 12, cursor: "pointer", letterSpacing: 1 }}>
                  PRÓXIMO SENSO →
                </button>
              ) : (
                <>
                  <button onClick={salvarAuditoria} disabled={salvando}
                    style={{ flex: 1, background: "#2A7BE0", color: "#fff", border: "none", padding: "13px", borderRadius: 7, fontFamily: "'DM Mono', monospace", fontSize: 12, cursor: "pointer", letterSpacing: 1, opacity: salvando ? 0.7 : 1 }}>
                    {salvando ? "SALVANDO..." : "💾 SALVAR NA NUVEM"}
                  </button>
                  <button onClick={() => { salvarAuditoria().then(imprimirPDF); }}
                    style={{ flex: 1, background: "#111", color: "#aaa", border: "1px solid #2a2a2a", padding: "13px", borderRadius: 7, fontFamily: "'DM Mono', monospace", fontSize: 12, cursor: "pointer", letterSpacing: 1 }}>
                    🖨 SALVAR + PDF
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── HISTÓRICO ──
  if (tela === "historico") return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#e8e8e8", fontFamily: "'DM Mono', monospace" }}>
      <style>{globalStyle}</style>
      <div className="no-print" style={{ borderBottom: "1px solid #1a1a1a", padding: "14px 40px", display: "flex", alignItems: "center", gap: 20 }}>
        <button onClick={() => setTela("home")} style={{ background: "none", border: "none", color: "#444", cursor: "pointer", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>← VOLTAR</button>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: 3, color: "#fff" }}>HISTÓRICO DE AUDITORIAS</div>
        <div style={{ flex: 1 }} />
        <button onClick={() => { resetAuditoria(); setTela("auditoria"); }}
          style={{ background: "#2A7BE0", color: "#fff", border: "none", padding: "9px 20px", borderRadius: 6, fontFamily: "'DM Mono', monospace", fontSize: 11, cursor: "pointer", letterSpacing: 1 }}>
          + NOVA
        </button>
      </div>

      <div style={{ padding: "28px 40px" }}>
        {loadingHistorico ? (
          <div style={{ textAlign: "center", padding: 60, color: "#333", fontSize: 12 }}>CARREGANDO...</div>
        ) : historico.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "#333", fontSize: 12 }}>Nenhuma auditoria encontrada.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {historico.map((a) => {
              const cls = classificar(a.mediaGeral || 0);
              return (
                <div key={a.id} style={{ background: "#0e0e0e", border: "1px solid #1a1a1a", borderRadius: 8, padding: "18px 22px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 120px auto", alignItems: "center", gap: 20, transition: "border-color .2s" }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = "#2a2a2a"}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = "#1a1a1a"}>
                  <div>
                    <div style={{ fontSize: 9, color: "#333", letterSpacing: 2, marginBottom: 4 }}>EMPRESA / ÁREA</div>
                    <div style={{ fontSize: 13, color: "#ddd" }}>{a.empresa || "—"}</div>
                    <div style={{ fontSize: 11, color: "#444" }}>{a.area || "—"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: "#333", letterSpacing: 2, marginBottom: 4 }}>AUDITOR</div>
                    <div style={{ fontSize: 12, color: "#aaa" }}>{a.auditor || "—"}</div>
                    <div style={{ fontSize: 10, color: "#333" }}>{a.data}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: "#333", letterSpacing: 2, marginBottom: 4 }}>MÉDIA</div>
                    <div style={{ fontSize: 24, fontFamily: "'Bebas Neue', sans-serif", color: cls.cor, letterSpacing: 2 }}>{(a.mediaGeral || 0).toFixed(2)}</div>
                    <div style={{ fontSize: 10, color: cls.cor }}>{cls.label}</div>
                  </div>
                  <button onClick={() => { setAuditoriaAtiva(a); setTela("detalhe"); }}
                    style={{ background: "#111", color: "#2A7BE0", border: "1px solid #2A7BE044", padding: "8px 14px", borderRadius: 6, fontFamily: "'DM Mono', monospace", fontSize: 10, cursor: "pointer", letterSpacing: 1 }}>
                    VER →
                  </button>
                  <button onClick={() => excluirAuditoria(a.id)}
                    style={{ background: "none", color: "#444", border: "1px solid #1a1a1a", padding: "8px 12px", borderRadius: 6, fontFamily: "'DM Mono', monospace", fontSize: 10, cursor: "pointer" }}>
                    🗑
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // ── DETALHE / PDF ──
  if (tela === "detalhe" && auditoriaAtiva) {
    const a = auditoriaAtiva;
    const cls = classificar(a.mediaGeral || 0);
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#e8e8e8", fontFamily: "'DM Mono', monospace" }}>
        <style>{globalStyle}</style>

        <div className="no-print" style={{ borderBottom: "1px solid #1a1a1a", padding: "14px 40px", display: "flex", alignItems: "center", gap: 20 }}>
          <button onClick={() => setTela("historico")} style={{ background: "none", border: "none", color: "#444", cursor: "pointer", fontSize: 12, fontFamily: "'DM Mono', monospace" }}>← HISTÓRICO</button>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: 3, color: "#fff" }}>RELATÓRIO DA AUDITORIA</div>
          <div style={{ flex: 1 }} />
          <button onClick={imprimirPDF}
            style={{ background: "#111", color: "#aaa", border: "1px solid #2a2a2a", padding: "9px 20px", borderRadius: 6, fontFamily: "'DM Mono', monospace", fontSize: 11, cursor: "pointer" }}>
            🖨 EXPORTAR PDF
          </button>
        </div>

        <div style={{ padding: "32px 40px" }}>
          {/* Cabeçalho */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 32, marginBottom: 36 }}>
            <div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, letterSpacing: 4, color: "#fff", marginBottom: 16 }}>RELATÓRIO DE AUDITORIA 5S</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {[
                  { l: "EMPRESA", v: a.empresa },
                  { l: "ÁREA", v: a.area },
                  { l: "AUDITOR", v: a.auditor },
                  { l: "DATA", v: a.data },
                  { l: "CLASSIFICAÇÃO", v: cls.label },
                  { l: "MÉDIA GERAL", v: (a.mediaGeral || 0).toFixed(2) + " / 4" },
                ].map((i) => (
                  <div key={i.l} style={{ background: "#0e0e0e", border: "1px solid #1a1a1a", borderRadius: 6, padding: "10px 14px" }}>
                    <div style={{ fontSize: 8, color: "#333", letterSpacing: 2 }}>{i.l}</div>
                    <div style={{ fontSize: 13, color: "#ddd", marginTop: 4 }}>{i.v || "—"}</div>
                  </div>
                ))}
              </div>
            </div>
            <RadarChart notas={a.notas || {}} size={200} />
          </div>

          {/* Por senso */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 9, color: "#333", letterSpacing: 3, marginBottom: 14 }}>RESULTADO POR SENSO</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
              {SENSOS.map((s) => {
                const med = calcMedia((a.notas || {})[s.key] || {});
                const c = classificar(med);
                return (
                  <div key={s.key} style={{ background: "#0e0e0e", border: `1px solid ${s.cor}22`, borderRadius: 8, padding: 14, textAlign: "center" }}>
                    <div style={{ fontSize: 22, color: s.cor }}>{s.icone}</div>
                    <div style={{ fontSize: 10, color: "#555", margin: "5px 0" }}>{s.nome.split("—")[1]?.trim()}</div>
                    <div style={{ fontSize: 24, fontFamily: "'Bebas Neue', sans-serif", color: c.cor, letterSpacing: 2 }}>{med.toFixed(1)}</div>
                    <div style={{ fontSize: 9, color: c.cor }}>{c.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Plano de ação */}
          {Object.keys(a.acoes || {}).length > 0 && (
            <div>
              <div style={{ fontSize: 9, color: "#E05C2A", letterSpacing: 3, marginBottom: 14 }}>⚠ PLANO DE AÇÃO — NÃO CONFORMIDADES</div>
              <div style={{ display: "grid", gap: 8 }}>
                {Object.entries(a.acoes).map(([chave, ac]) => {
                  const [sensoKey, idxStr] = chave.split("_");
                  const senso = SENSOS.find((s) => s.key === sensoKey);
                  const criterio = senso?.criterios[parseInt(idxStr)];
                  const sCores = { aberto: "#E05C2A", em_andamento: "#E0A02A", concluido: "#2AC47A" };
                  const sLabels = { aberto: "ABERTO", em_andamento: "EM ANDAMENTO", concluido: "CONCLUÍDO" };
                  return (
                    <div key={chave} style={{ background: "#0e0e0e", border: "1px solid #E05C2A1a", borderRadius: 7, padding: "14px 18px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 14, alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 8, color: "#333", letterSpacing: 2, marginBottom: 3 }}>{senso?.nome}</div>
                        <div style={{ fontSize: 11, color: "#aaa" }}>{criterio}</div>
                        {ac.acao && <div style={{ fontSize: 11, color: "#666", marginTop: 3 }}>→ {ac.acao}</div>}
                      </div>
                      <div>
                        <div style={{ fontSize: 8, color: "#333", letterSpacing: 2, marginBottom: 3 }}>RESPONSÁVEL</div>
                        <div style={{ fontSize: 12, color: "#ddd" }}>{ac.responsavel || "—"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 8, color: "#333", letterSpacing: 2, marginBottom: 3 }}>PRAZO</div>
                        <div style={{ fontSize: 12, color: "#ddd" }}>{ac.prazo || "—"}</div>
                      </div>
                      <div style={{ fontSize: 10, color: sCores[ac.status || "aberto"], border: `1px solid ${sCores[ac.status || "aberto"]}44`, borderRadius: 4, padding: "3px 9px", whiteSpace: "nowrap" }}>
                        {sLabels[ac.status || "aberto"]}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
