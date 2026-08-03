import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Bank,
  Bell,
  Buildings,
  Camera,
  CaretDown,
  CaretLeft,
  CaretRight,
  CheckCircle,
  Code,
  Copy,
  CreditCard,
  Crosshair,
  CurrencyDollar,
  DeviceMobile,
  GlobeSimple,
  Headset,
  House,
  Link as LinkIcon,
  List,
  MagnifyingGlass,
  Megaphone,
  Package,
  PencilSimple,
  Plus,
  Receipt,
  SignOut,
  Sparkle,
  Storefront,
  TrendUp,
  Trash,
  Truck,
  Users,
  Wallet,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { supabase, supabaseConfigured } from "./supabase";
import QRCode from "qrcode";

const money = (cents = 0) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(cents) / 100,
  );
const brlToCents = (value = 0) => {
  const normalized = String(value).trim().replace(/\./g, "").replace(",", ".");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.max(0, Math.round(amount * 100)) : 0;
};
const date = (v) =>
  v
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(v))
    : "—";
const labels = {
  pending: "Pendente",
  processing: "Processando",
  approved: "Aprovado",
  refused: "Recusado",
  refunded: "Reembolsado",
  cancelled: "Cancelado",
  active: "Ativo",
  draft: "Rascunho",
  archived: "Arquivado",
  completed: "Concluído",
  failed: "Falhou",
  requested: "Solicitado",
  past_due: "Em atraso",
  paused: "Pausado",
  trialing: "Teste",
};

function Mark() {
  return (
    <button className="logo">
      maa<span>x</span>
      <i />
    </button>
  );
}
function Button({
  children,
  onClick,
  type = "button",
  secondary = false,
  disabled = false,
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`btn ${secondary ? "outline" : ""}`}
    >
      {children}
    </button>
  );
}

function CornerPhone() {
  const [minimized, setMinimized] = useState(() =>
    window.matchMedia("(max-width: 720px)").matches,
  );
  const [screen, setScreen] = useState("home");

  if (minimized)
    return (
      <button
        type="button"
        className="corner-phone-launcher"
        onClick={() => setMinimized(false)}
        aria-label="Abrir atalhos Maax"
      >
        <DeviceMobile weight="fill" />
        <span>Atalhos</span>
      </button>
    );

  return (
    <div className="corner-phone-scene" role="complementary" aria-label="Atalhos Maax">
      <div className="corner-iphone">
        <i className="iphone-side iphone-side-left" aria-hidden="true" />
        <i className="iphone-side iphone-side-right" aria-hidden="true" />
        <div className="iphone-screen">
          <div className="iphone-status">
            <b>09:41</b>
            <span><i /><i /><i /></span>
          </div>
          <div className="dynamic-island"><i /></div>
          <button
            type="button"
            className="iphone-minimize"
            onClick={() => setMinimized(true)}
            aria-label="Minimizar atalhos"
          >
            <X weight="bold" />
          </button>

          {screen === "home" ? (
            <div className="iphone-home">
              <header>
                <span>MAAX OS</span>
                <b>Seu negócio<br />na palma da mão.</b>
              </header>
              <div className="iphone-live-card">
                <span><i /> OPERAÇÃO ONLINE</span>
                <strong>Pronto para ajudar</strong>
                <small>Acesse suporte ou gerencie sua loja.</small>
              </div>
              <div className="iphone-apps">
                <button type="button" onClick={() => setScreen("support")}>
                  <i className="support-app"><Headset weight="fill" /></i>
                  <span>Suporte</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScreen("store")}
                >
                  <i className="store-app"><Storefront weight="fill" /></i>
                  <span>Store</span>
                </button>
              </div>
              <div className="iphone-dock">
                <span><Headset weight="fill" /></span>
                <span><Storefront weight="fill" /></span>
                <span><Sparkle weight="fill" /></span>
              </div>
            </div>
          ) : (
            <div className="iphone-app-view">
              <button type="button" onClick={() => setScreen("home")}>
                <CaretLeft /> Início
              </button>
              <div className={`iphone-app-icon ${screen === "support" ? "support-app" : "store-app"}`}>
                {screen === "support" ? <Headset weight="fill" /> : <Storefront weight="fill" />}
              </div>
              <span>{screen === "support" ? "SUPORTE MAAX" : "MAAX STORE"}</span>
              <b>{screen === "support" ? "Como podemos ajudar?" : "Ativos para sua operação."}</b>
              {screen === "support" ? (
                <>
                  <p>Nossa equipe está online. O canal de atendimento será conectado em breve.</p>
                  <i className="iphone-app-status"><em /> Disponível agora</i>
                </>
              ) : (
                <div className="iphone-store-list">
                  <article>
                    <i><Megaphone weight="fill" /></i>
                    <span><b>Contas de anúncios</b><small>Estruturas para mídia paga</small></span>
                  </article>
                  <article>
                    <i><Code weight="bold" /></i>
                    <span><b>Scripts</b><small>Automações para sua operação</small></span>
                  </article>
                  <em>LOJA EM PREPARAÇÃO</em>
                </div>
              )}
            </div>
          )}
          <div className="iphone-home-indicator" />
        </div>
      </div>
    </div>
  );
}

export function RealLogin({ navigate }) {
  const [mode, setMode] = useState("login"),
    [name, setName] = useState(""),
    [businessName, setBusinessName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [passwordConfirmation, setPasswordConfirmation] = useState(""),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  useEffect(() => {
    if (!supabase) return;
    if (new URLSearchParams(window.location.search).get("confirmed") === "1")
      setNotice("E-mail confirmado. Preparando seu ambiente...");
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/dashboard");
    });
  }, []);
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!supabaseConfigured) {
      setError("As variáveis da autenticação não estão configuradas.");
      return;
    }
    if (mode === "signup") {
      if (password !== passwordConfirmation) {
        setError("As senhas informadas não são iguais.");
        return;
      }
      setLoading(true);
      const result = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, business_name: businessName, email, password }),
      });
      const payload = await result.json().catch(() => ({}));
      setLoading(false);
      if (!result.ok) {
        setError(payload.error || "Não foi possível criar sua conta.");
        return;
      }
      setNotice("Enviamos um link de confirmação. Confira sua caixa de entrada e o spam.");
      return;
    }
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (authError) {
      setError(
        /confirm/i.test(authError.message || "")
          ? "Confirme seu e-mail antes de entrar."
          : "E-mail ou senha inválidos.",
      );
      return;
    }
    navigate("/dashboard");
  };
  const changeMode = (nextMode) => {
    setMode(nextMode);
    setError("");
    setNotice("");
    setPassword("");
    setPasswordConfirmation("");
  };
  return (
    <div className="login-page">
      <div className="login-brand">
        <div className="logo logo-light">
          maa<span>x</span>
          <i />
        </div>
        <div className="login-message">
          <span className="eyebrow dark">Ambiente seguro</span>
          <h1>
            Seu negócio
            <br />
            em movimento.
          </h1>
          <p>
            Dados reais, protegidos e disponíveis para você tomar decisões todos
            os dias.
          </p>
        </div>
        <div className="login-quote">
          <CheckCircle size={28} />
          <span>
            Autenticação e dados protegidos
            <br />
            pela infraestrutura Supabase.
          </span>
        </div>
      </div>
      <div className="login-form-wrap">
        <button className="close-login" onClick={() => navigate("/")}>
          <X />
        </button>
        <form className={mode === "signup" ? "signup-form" : ""} onSubmit={submit}>
          <span className="form-kicker">
            {mode === "login" ? "ACESSO À PLATAFORMA" : "COMECE NA MAAX"}
          </span>
          <h2>{mode === "login" ? "Acesse sua conta" : "Crie sua conta"}</h2>
          <p>
            {mode === "login"
              ? "Use suas credenciais para continuar."
              : "Confirme seu e-mail e prepare sua primeira operação."}
          </p>
          {mode === "signup" && (
            <div className="signup-fields">
              <label>
                Seu nome
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Como devemos chamar você?"
                  required
                  autoComplete="name"
                  maxLength="80"
                />
              </label>
              <label>
                Nome do negócio
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Ex.: Minha operação"
                  required
                  autoComplete="organization"
                  maxLength="60"
                />
              </label>
            </div>
          )}
          <label>
            E-mail
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@empresa.com"
              type="email"
              required
              autoComplete="email"
            />
          </label>
          <label>
            Senha
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha"
              type="password"
              required
              minLength="8"
              maxLength="72"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>
          {mode === "signup" && (
            <>
              <small className="password-rule">
                Use 8 caracteres ou mais, com maiúscula, minúscula e número.
              </small>
              <label>
                Confirme a senha
                <input
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  placeholder="Digite a senha novamente"
                  type="password"
                  required
                  minLength="8"
                  maxLength="72"
                  autoComplete="new-password"
                />
              </label>
            </>
          )}
          {error && <div className="form-error">{error}</div>}
          {notice && <div className="form-success">{notice}</div>}
          <Button type="submit" disabled={loading}>
            {loading ? (
              mode === "login" ? "Autenticando..." : "Criando conta..."
            ) : (
              <>
                {mode === "login" ? "Entrar na plataforma" : "Criar minha conta"}{" "}
                <ArrowRight />
              </>
            )}
          </Button>
          <small className="signup">
            {mode === "login" ? "Ainda não tem uma conta?" : "Já possui uma conta?"}{" "}
            <button
              type="button"
              onClick={() => changeMode(mode === "login" ? "signup" : "login")}
            >
              {mode === "login" ? "Criar conta" : "Entrar agora"}
            </button>
          </small>
        </form>
      </div>
    </div>
  );
}

const nav = [
  ["home", "Início", House],
  ["produtos", "Produtos", Package],
  ["checkout", "Checkout", CreditCard],
  ["domains", "Domínio", GlobeSimple],
  ["links", "Links de pagamento", LinkIcon],
  ["gateways", "Gateways", Bank],
  ["shipping", "Frete", Truck],
  ["tracking", "Rastreamento", Crosshair],
  ["clientes", "Clientes", Users],
  ["assinaturas", "Assinaturas", CreditCard],
];
const emptyCopy = {
  vendas: [
    "Nenhuma venda registrada",
    "As vendas aparecerão aqui quando seus clientes concluírem o checkout.",
  ],
  produtos: [
    "Nenhum produto cadastrado",
    "Crie seu primeiro produto para começar a vender.",
  ],
  links: [
    "Nenhum link criado",
    "Crie um link e compartilhe sua oferta com seus clientes.",
  ],
  gateways: [
    "Nenhum gateway cadastrado",
    "Conecte um provedor de pagamentos para processar seus checkouts.",
  ],
  extrato: ["Extrato vazio", "Suas movimentações financeiras aparecerão aqui."],
  clientes: [
    "Nenhum cliente ainda",
    "Clientes são cadastrados a partir das vendas ou manualmente.",
  ],
  assinaturas: [
    "Nenhuma assinatura",
    "Planos recorrentes ativos aparecerão aqui.",
  ],
};

function Modal({ title, children, onClose }) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="data-modal">
        <div className="modal-head">
          <h2>{title}</h2>
          <button onClick={onClose}>
            <X />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Field({ label, ...props }) {
  return (
    <label className="data-field">
      {label}
      <input {...props} />
    </label>
  );
}

function BusinessSwitcher({
  workspaces,
  workspace,
  open,
  onToggle,
  onClose,
  onSelect,
  onCreate,
  onManage,
}) {
  const root = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const closeOutside = (event) => {
      if (!root.current?.contains(event.target)) onClose();
    };
    const closeWithEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, [open, onClose]);
  return (
    <div className="business-switcher" ref={root}>
      <button
        type="button"
        className="business-trigger"
        onClick={onToggle}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span>
          <small>Negócio</small>
          <b>{workspace?.name || "Selecionar"}</b>
        </span>
        <CaretDown className={open ? "open" : ""} />
      </button>
      {open && (
        <div
          className="business-menu"
          role="listbox"
          aria-label="Seus negócios"
        >
          <header>
            <span>SUAS OPERAÇÕES</span>
            <small>{workspaces.length}</small>
          </header>
          <div className="business-options">
            {workspaces.map((item) => (
              <div
                className={item.id === workspace?.id ? "selected" : ""}
                role="option"
                aria-selected={item.id === workspace?.id}
                key={item.id}
              >
                <button
                  type="button"
                  className="business-option-main"
                  onClick={() => onSelect(item)}
                >
                  <i>
                    {item.logo_url ? (
                      <img src={item.logo_url} alt="" />
                    ) : (
                      item.name.slice(0, 1).toUpperCase()
                    )}
                  </i>
                  <span>
                    <b>{item.name}</b>
                    <small>
                      {item.id === workspace?.id
                        ? "Operação atual"
                        : "Abrir operação"}
                    </small>
                  </span>
                  {item.id === workspace?.id && <CheckCircle />}
                </button>
                <button
                  type="button"
                  className="business-manage"
                  onClick={() => onManage(item)}
                  aria-label={`Editar ${item.name}`}
                >
                  <PencilSimple />
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="business-create" onClick={onCreate}>
            <Plus /> Novo negócio
          </button>
        </div>
      )}
    </div>
  );
}

function CreateBusinessModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const { data, error: saveError } = await supabase.rpc(
      "create_business_workspace",
      { p_name: name.trim() },
    );
    if (saveError) {
      setError(saveError.message);
      setSaving(false);
      return;
    }
    onCreated(Array.isArray(data) ? data[0] : data);
  };
  return (
    <Modal title="Criar novo negócio" onClose={onClose}>
      <div className="business-modal-intro">
        <i>
          <Buildings />
        </i>
        <div>
          <b>Uma operação totalmente nova</b>
          <p>
            Produtos, gateways, chaves, checkout, clientes e rastreamento
            começarão vazios.
          </p>
        </div>
      </div>
      <form className="data-form business-form" onSubmit={save}>
        <Field
          label="Nome do negócio"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ex.: Operação Brasil"
          minLength="2"
          maxLength="60"
          autoFocus
          required
        />
        <small>Use um nome que ajude você a identificar esta operação.</small>
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions">
          <Button secondary onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving || name.trim().length < 2}>
            {saving ? "Criando..." : "Criar negócio"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ManageBusinessModal({
  business,
  canDelete,
  onClose,
  onSaved,
  onDeleted,
}) {
  const [name, setName] = useState(business.name);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(business.logo_url || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmation, setConfirmation] = useState("");

  useEffect(
    () => () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const chooseLogo = (event) => {
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;
    if (
      !["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(
        nextFile.type,
      )
    ) {
      setError("Use uma imagem PNG, JPEG, WebP ou SVG.");
      return;
    }
    if (nextFile.size > 2 * 1024 * 1024) {
      setError("A imagem deve ter no máximo 2 MB.");
      return;
    }
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setFile(nextFile);
    setPreview(URL.createObjectURL(nextFile));
    setError("");
  };

  const save = async (event) => {
    event.preventDefault();
    const cleanName = name.trim();
    if (cleanName.length < 2)
      return setError("Use um nome com pelo menos 2 caracteres.");
    setSaving(true);
    setError("");
    let logoUrl = business.logo_url || null;
    if (file) {
      const extension = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${business.id}/business-logo-${Date.now()}.${extension}`;
      const upload = await supabase.storage
        .from("checkout-assets")
        .upload(path, file, { cacheControl: "3600", upsert: true });
      if (upload.error) {
        setSaving(false);
        return setError(
          `Não foi possível enviar a imagem: ${upload.error.message}`,
        );
      }
      logoUrl = supabase.storage.from("checkout-assets").getPublicUrl(path)
        .data.publicUrl;
    }
    const { data, error: saveError } = await supabase
      .from("workspaces")
      .update({
        name: cleanName,
        logo_url: logoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", business.id)
      .select()
      .single();
    setSaving(false);
    if (saveError) return setError(saveError.message);
    onSaved(data);
  };

  const remove = async () => {
    if (confirmation !== business.name) return;
    setSaving(true);
    setError("");
    const { error: deleteError } = await supabase.rpc(
      "delete_business_workspace",
      { p_workspace_id: business.id },
    );
    setSaving(false);
    if (deleteError) return setError(deleteError.message);
    onDeleted(business.id);
  };

  return (
    <Modal title="Configurar negócio" onClose={onClose}>
      <form className="data-form business-manage-form" onSubmit={save}>
        <div className="business-logo-editor">
          <div className="business-logo-preview">
            {preview ? (
              <img src={preview} alt="Prévia da marca" />
            ) : (
              <b>{name.slice(0, 1).toUpperCase()}</b>
            )}
          </div>
          <div>
            <b>Imagem do negócio</b>
            <p>PNG, JPEG, WebP ou SVG. Quadrada, 512 × 512 px e até 2 MB.</p>
            <label className="business-logo-action">
              <Camera /> {preview ? "Trocar imagem" : "Adicionar imagem"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={chooseLogo}
              />
            </label>
          </div>
        </div>
        <Field
          label="Nome do negócio"
          value={name}
          onChange={(event) => setName(event.target.value)}
          minLength="2"
          maxLength="60"
          required
        />
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions">
          <Button secondary onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </form>
      <section className="business-danger-zone">
        <div>
          <b>Excluir este negócio</b>
          <p>
            Produtos, pedidos, clientes, gateways e configurações desta operação
            serão excluídos.
          </p>
        </div>
        {!confirmDelete ? (
          <button
            type="button"
            disabled={!canDelete}
            onClick={() => setConfirmDelete(true)}
          >
            <Trash /> Excluir negócio
          </button>
        ) : (
          <div className="business-delete-confirm">
            <label>
              Digite <b>{business.name}</b> para confirmar
              <input
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </label>
            <button
              type="button"
              disabled={saving || confirmation !== business.name}
              onClick={remove}
            >
              Excluir definitivamente
            </button>
          </div>
        )}
        {!canDelete && (
          <small>Crie outro negócio antes de excluir o único existente.</small>
        )}
      </section>
    </Modal>
  );
}

function GatewayModal({ workspace, onClose, onSaved }) {
  const [form, setForm] = useState({
      display_name: "Pagamaster",
      provider: "pagamaster",
      environment: "production",
    }),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const { error } = await supabase.from("payment_gateways").insert({
      workspace_id: workspace.id,
      display_name: form.display_name,
      provider: form.provider,
      environment: form.environment,
      status: "inactive",
      credentials_configured: false,
      public_identifier_hint: form.public_identifier_hint || null,
    });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    onSaved();
    onClose();
  };
  return (
    <Modal title="Cadastrar gateway" onClose={onClose}>
      <form className="data-form" onSubmit={save}>
        <Field
          label="Nome da integração"
          placeholder="Gateway principal"
          value={form.display_name}
          required
          onChange={(e) =>
            setForm((v) => ({ ...v, display_name: e.target.value }))
          }
        />
        <label className="data-field">
          Provedor
          <select
            required
            value={form.provider}
            onChange={(e) =>
              setForm((v) => ({ ...v, provider: e.target.value }))
            }
          >
            <option value="">Selecione</option>
            <option value="pagamaster">Pagamaster</option>
            <option value="stripe">Stripe</option>
            <option value="mercadopago">Mercado Pago</option>
            <option value="pagarme">Pagar.me</option>
            <option value="asaas">Asaas</option>
            <option value="primecash">PrimeCash</option>
            <option value="custom">Outro</option>
          </select>
        </label>
        <label className="data-field">
          Ambiente
          <select
            value={form.environment}
            onChange={(e) =>
              setForm((v) => ({ ...v, environment: e.target.value }))
            }
          >
            <option value="production">Produção</option>
            <option value="sandbox">Sandbox</option>
          </select>
        </label>
        <Field
          label="Identificador público (opcional)"
          placeholder="•••• 2808"
          onChange={(e) =>
            setForm((v) => ({ ...v, public_identifier_hint: e.target.value }))
          }
        />
        <div className="gateway-security-note">
          <Bank /> Credenciais secretas nunca são exibidas ou armazenadas no
          navegador.
        </div>
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions">
          <Button secondary onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Cadastrar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function LegacyGatewayView({ gateways, onAction }) {
  const [connection, setConnection] = useState({
    loading: true,
    configured: false,
  });

  useEffect(() => {
    let active = true;
    fetch("/api/pagamaster/status")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((result) => {
        if (active)
          setConnection({
            loading: false,
            configured: Boolean(result.configured),
          });
      })
      .catch(() => {
        if (active) setConnection({ loading: false, configured: false });
      });
    return () => {
      active = false;
    };
  }, []);

  const registered = gateways.some(
    (gateway) => gateway.provider === "pagamaster",
  );
  const connected = connection.configured && registered;

  return (
    <div className="page-enter gateway-page">
      <PageTitle
        kicker="PAGAMENTOS"
        title="Gateways"
        description="Provedores conectados para processar seus checkouts"
      />
      <section className="gateway-catalog" aria-label="Gateways disponíveis">
        <article className="gateway-provider-card">
          <header>
            <img src="/pagamaster-logo.png" alt="Pagamaster" />
            <div>
              <strong>Pagamaster</strong>
              <span>Pix, boleto e cartão de crédito</span>
            </div>
            <em className={connected ? "connected" : "pending"}>
              {connection.loading
                ? "Verificando"
                : connected
                  ? "Conectado"
                  : "Aguardando credenciais"}
            </em>
          </header>
          <div className="gateway-provider-body">
            <p>
              Integração server-side com autenticação Basic Auth. As chaves
              ficam protegidas nas variáveis de ambiente da Vercel.
            </p>
            <div>
              <span>
                <CheckCircle /> Cobranças em centavos
              </span>
              <span>
                <CheckCircle /> Confirmação por webhook
              </span>
              <span>
                <CheckCircle /> KYC obrigatório
              </span>
            </div>
          </div>
          <footer>
            <a
              href="https://developers.pagamaster.com/docs/getting-started"
              target="_blank"
              rel="noreferrer"
            >
              Ver documentação <ArrowRight />
            </a>
            {!registered && (
              <Button onClick={onAction}>Cadastrar Pagamaster</Button>
            )}
          </footer>
        </article>
      </section>
    </div>
  );
}

function GatewayView({ workspace }) {
  const [connection, setConnection] = useState({
    loading: true,
    configured: false,
    active: false,
  });
  const [keys, setKeys] = useState({ publicKey: "", secretKey: "" });
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [busy, setBusy] = useState("");
  const [editingKeys, setEditingKeys] = useState(false);

  const request = async (options = {}) => {
    const { data } = await supabase.auth.getSession();
    const response = await fetch(
      `/api/pagamaster/config${options.method ? "" : `?workspaceId=${workspace.id}`}`,
      {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session?.access_token}`,
          ...options.headers,
        },
      },
    );
    const result = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(result.error || "Não foi possível concluir a operação.");
    return result;
  };

  useEffect(() => {
    let mounted = true;
    request()
      .then((result) => {
        if (!mounted) return;
        setConnection({
          loading: false,
          configured: Boolean(result.configured),
          active: Boolean(result.active),
        });
        if (result.publicKeyHint)
          setKeys((current) => ({
            ...current,
            publicKey: result.publicKeyHint,
          }));
      })
      .catch(
        () =>
          mounted &&
          setConnection({ loading: false, configured: false, active: false }),
      );
    return () => {
      mounted = false;
    };
  }, [workspace.id]);

  const credentialsAction = async (action) => {
    setBusy(action);
    setFeedback({ type: "", message: "" });
    try {
      const result = await request({
        method: "POST",
        body: JSON.stringify({ workspaceId: workspace.id, action, ...keys }),
      });
      setFeedback({
        type: "success",
        message:
          action === "test"
            ? "Conexão realizada com sucesso."
            : "Chaves testadas e salvas com segurança.",
      });
      if (action === "save") {
        setConnection((current) => ({ ...current, configured: true }));
        setKeys({
          publicKey: result.publicKeyHint || keys.publicKey,
          secretKey: "",
        });
        setEditingKeys(false);
      }
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    } finally {
      setBusy("");
    }
  };

  const toggleGateway = async () => {
    const active = !connection.active;
    setBusy("toggle");
    setFeedback({ type: "", message: "" });
    try {
      await request({
        method: "POST",
        body: JSON.stringify({
          workspaceId: workspace.id,
          action: "toggle",
          active,
        }),
      });
      setConnection((current) => ({ ...current, active }));
      setFeedback({
        type: "success",
        message: active
          ? "Pagamaster ativada nos checkouts."
          : "Pagamaster desativada.",
      });
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="page-enter gateway-page">
      <PageTitle
        kicker="PAGAMENTOS"
        title="Gateways"
        description="Configure e controle os provedores que processam seus checkouts"
      />
      <section className="gateway-catalog" aria-label="Gateways disponíveis">
        <article className="gateway-provider-card">
          <header>
            <img src="/pagamaster-logo.png" alt="Pagamaster" />
            <div>
              <strong>Pagamaster</strong>
              <span>Pix, boleto e cartão de crédito</span>
            </div>
            <em className={connection.active ? "connected" : "pending"}>
              {connection.loading
                ? "Verificando"
                : connection.active
                  ? "Ativo"
                  : connection.configured
                    ? "Inativo"
                    : "Aguardando credenciais"}
            </em>
          </header>
          <div className="gateway-provider-body gateway-credentials">
            <p>
              Informe as chaves de produção disponíveis em Integrações no painel
              Pagamaster.
            </p>
            <div className="gateway-key-grid">
              <label>
                Public Key
                <input
                  value={keys.publicKey}
                  disabled={connection.configured && !editingKeys}
                  placeholder="pk_live_..."
                  autoComplete="off"
                  onChange={(event) =>
                    setKeys((current) => ({
                      ...current,
                      publicKey: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Secret Key
                <input
                  value={keys.secretKey}
                  disabled={connection.configured && !editingKeys}
                  type="password"
                  placeholder={
                    connection.configured
                      ? "Chave salva e protegida"
                      : "sk_live_..."
                  }
                  autoComplete="new-password"
                  onChange={(event) =>
                    setKeys((current) => ({
                      ...current,
                      secretKey: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            {feedback.message && (
              <p className={`gateway-feedback ${feedback.type}`} role="status">
                {feedback.message}
              </p>
            )}
            <div className="gateway-config-actions">
              {connection.configured && !editingKeys && (
                <button
                  type="button"
                  className="gateway-test"
                  onClick={() => {
                    setEditingKeys(true);
                    setKeys({ publicKey: "", secretKey: "" });
                    setFeedback({ type: "", message: "" });
                  }}
                >
                  Trocar chaves
                </button>
              )}
              <button
                type="button"
                className="gateway-test"
                disabled={
                  Boolean(busy) ||
                  !keys.secretKey ||
                  (connection.configured && !editingKeys)
                }
                onClick={() => credentialsAction("test")}
              >
                {busy === "test" ? "Testando..." : "Testar conexão"}
              </button>
              <Button
                disabled={Boolean(busy) || !keys.secretKey}
                onClick={() => credentialsAction("save")}
              >
                {busy === "save"
                  ? "Salvando..."
                  : connection.configured
                    ? "Atualizar chaves"
                    : "Salvar chaves"}
              </Button>
            </div>
          </div>
          <footer>
            <a
              href="https://developers.pagamaster.com/docs/getting-started"
              target="_blank"
              rel="noreferrer"
            >
              Ver documentação <ArrowRight />
            </a>
            <label
              className={`gateway-toggle ${connection.active ? "active" : ""}`}
            >
              <span>
                {connection.active ? "Gateway ativo" : "Gateway inativo"}
              </span>
              <input
                type="checkbox"
                checked={connection.active}
                disabled={Boolean(busy) || !connection.configured}
                onChange={toggleGateway}
              />
              <i />
            </label>
          </footer>
        </article>
      </section>
    </div>
  );
}

function CreateModal({ type, workspace, products, onClose, onSaved }) {
  const [form, setForm] = useState({}),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const set = (key, value) => setForm((v) => ({ ...v, [key]: value }));
  if (type === "gateways")
    return (
      <GatewayModal workspace={workspace} onClose={onClose} onSaved={onSaved} />
    );
  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    let table, payload;
    if (type === "produtos") {
      table = "products";
      payload = {
        workspace_id: workspace.id,
        name: form.name,
        slug: (form.slug || form.name || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
        description: form.description || null,
        price_cents: Math.round(Number(form.price) * 100),
        billing_type: form.billing_type || "one_time",
        status: "active",
      };
    }
    if (type === "clientes") {
      table = "customers";
      payload = {
        workspace_id: workspace.id,
        name: form.name,
        email: form.email,
        phone: form.phone || null,
      };
    }
    if (type === "links") {
      table = "payment_links";
      const product = products.find((p) => p.id === form.product_id);
      payload = {
        workspace_id: workspace.id,
        product_id: form.product_id || null,
        title: form.title || product?.name,
        slug: (form.slug || form.title || product?.name || "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
        amount_cents:
          product?.price_cents || Math.round(Number(form.price) * 100),
        active: true,
      };
    }
    if (type === "saldo") {
      table = "payouts";
      payload = {
        workspace_id: workspace.id,
        amount_cents: Math.round(Number(form.amount) * 100),
        bank_name: form.bank_name,
        bank_account_last4: form.last4,
        status: "requested",
      };
    }
    const { error } = await supabase.from(table).insert(payload);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    onSaved();
    onClose();
  };
  const title = {
    produtos: "Novo produto",
    clientes: "Adicionar cliente",
    links: "Criar link de pagamento",
    saldo: "Solicitar saque",
  }[type];
  return (
    <Modal title={title} onClose={onClose}>
      <form className="data-form" onSubmit={save}>
        {type === "produtos" && (
          <>
            <Field
              label="Nome"
              required
              onChange={(e) => set("name", e.target.value)}
            />
            <Field
              label="Descrição"
              onChange={(e) => set("description", e.target.value)}
            />
            <Field
              label="Preço em reais"
              type="number"
              step="0.01"
              min="0"
              required
              onChange={(e) => set("price", e.target.value)}
            />
            <label className="data-field">
              Cobrança
              <select onChange={(e) => set("billing_type", e.target.value)}>
                <option value="one_time">Pagamento único</option>
                <option value="subscription">Assinatura</option>
              </select>
            </label>
          </>
        )}
        {type === "clientes" && (
          <>
            <Field
              label="Nome"
              required
              onChange={(e) => set("name", e.target.value)}
            />
            <Field
              label="E-mail"
              type="email"
              required
              onChange={(e) => set("email", e.target.value)}
            />
            <Field
              label="Telefone"
              onChange={(e) => set("phone", e.target.value)}
            />
          </>
        )}
        {type === "links" && (
          <>
            <Field
              label="Título"
              required
              onChange={(e) => set("title", e.target.value)}
            />
            <label className="data-field">
              Produto
              <select
                required
                onChange={(e) => set("product_id", e.target.value)}
              >
                <option value="">Selecione</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {money(p.price_cents)}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="Endereço do link"
              placeholder="minha-oferta"
              onChange={(e) => set("slug", e.target.value)}
            />
          </>
        )}
        {type === "saldo" && (
          <>
            <Field
              label="Valor do saque"
              type="number"
              step="0.01"
              min="1"
              required
              onChange={(e) => set("amount", e.target.value)}
            />
            <Field
              label="Banco"
              required
              onChange={(e) => set("bank_name", e.target.value)}
            />
            <Field
              label="Últimos 4 dígitos da conta"
              maxLength="4"
              required
              onChange={(e) => set("last4", e.target.value)}
            />
          </>
        )}
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions">
          <Button secondary onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function RealDashboard({ navigate }) {
  const [session, setSession] = useState(),
    [workspaces, setWorkspaces] = useState([]),
    [workspace, setWorkspace] = useState(),
    [data, setData] = useState({
      products: [],
      customers: [],
      payment_links: [],
      orders: [],
      subscriptions: [],
      transactions: [],
      payment_gateways: [],
      product_images: [],
      payment_attempts: [],
      checkout_event_counters: [],
      checkout_presence: [],
      checkout_configs: [],
    }),
    [active, setActive] = useState("home"),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [menu, setMenu] = useState(false),
    [modal, setModal] = useState(""),
    [businessMenu, setBusinessMenu] = useState(false),
    [businessModal, setBusinessModal] = useState(false),
    [managedBusiness, setManagedBusiness] = useState(null),
    [searchQuery, setSearchQuery] = useState(""),
    [searchOpen, setSearchOpen] = useState(false);
  const workspaceIdRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchRootRef = useRef(null);
  const load = async (
    retried = false,
    silent = false,
    targetWorkspaceId = null,
  ) => {
    if (!silent) setLoading(true);
    setError("");
    const { data: sessionData } = await supabase.auth.getSession();
    let currentSession = sessionData.session;
    const expiresSoon =
      currentSession?.expires_at &&
      currentSession.expires_at * 1000 <= Date.now() + 60000;
    if (currentSession && expiresSoon) {
      const { data: refreshed, error: refreshError } =
        await supabase.auth.refreshSession();
      if (refreshError || !refreshed.session) {
        await supabase.auth.signOut({ scope: "local" });
        navigate("/login");
        return;
      }
      currentSession = refreshed.session;
    }
    if (!currentSession) {
      navigate("/login");
      return;
    }
    setSession(currentSession);
    const { data: spaces, error: spaceError } = await supabase
      .from("workspaces")
      .select("*")
      .order("created_at");
    if (!spaceError && !spaces?.length && !retried) {
      const firstWorkspaceName =
        currentSession.user.user_metadata?.business_name || "Meu negócio";
      const { error: createWorkspaceError } = await supabase.rpc(
        "create_business_workspace",
        { p_name: firstWorkspaceName },
      );
      if (!createWorkspaceError) return load(true, silent);
      setError(createWorkspaceError.message);
      setLoading(false);
      return;
    }
    if (spaceError || !spaces?.length) {
      if (!retried && /jwt|token|session/i.test(spaceError?.message || "")) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        if (refreshed.session) return load(true, silent);
        await supabase.auth.signOut({ scope: "local" });
        navigate("/login");
        return;
      }
      setError(spaceError?.message || "Nenhum workspace foi encontrado.");
      setLoading(false);
      return;
    }
    const preferredWorkspaceId =
      targetWorkspaceId ||
      workspaceIdRef.current ||
      window.localStorage.getItem("maax_active_workspace");
    const ws =
      spaces.find((item) => item.id === preferredWorkspaceId) || spaces[0];
    setWorkspaces(spaces);
    setWorkspace(ws);
    workspaceIdRef.current = ws.id;
    window.localStorage.setItem("maax_active_workspace", ws.id);
    const tables = [
      "products",
      "customers",
      "payment_links",
      "orders",
      "subscriptions",
      "transactions",
      "payment_gateways",
      "product_images",
      "payment_attempts",
      "checkout_event_counters",
      "checkout_presence",
      "checkout_configs",
    ];
    const results = await Promise.all(
      tables.map((t) =>
        supabase
          .from(t)
          .select("*")
          .eq("workspace_id", ws.id)
          .order(
            t === "checkout_event_counters"
              ? "updated_at"
              : t === "checkout_presence"
                ? "last_seen_at"
                : "created_at",
            { ascending: false },
          )
          .limit(1000),
      ),
    );
    const next = {};
    tables.forEach((t, i) => (next[t] = results[i].data || []));
    const failed = results.find((r) => r.error);
    if (!retried && /jwt|token|session/i.test(failed?.error?.message || "")) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      if (refreshed.session) return load(true, silent);
      await supabase.auth.signOut({ scope: "local" });
      navigate("/login");
      return;
    }
    if (failed) setError(failed.error.message);
    setData(next);
    setLoading(false);
  };
  useEffect(() => {
    if (!supabaseConfigured) {
      setError(
        "Configure as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.",
      );
      setLoading(false);
      return;
    }
    load();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!s) navigate("/login");
    });
    const liveCounters = supabase
      .channel("checkout-live-counters")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "checkout_event_counters",
        },
        ({ new: counter }) =>
          setData((current) =>
            counter.workspace_id !== workspaceIdRef.current
              ? current
              : {
                  ...current,
                  checkout_event_counters: [
                    counter,
                    ...current.checkout_event_counters.filter(
                      (item) => item.event_type !== counter.event_type,
                    ),
                  ],
                },
          ),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "checkout_presence" },
        ({ eventType, new: presence, old }) =>
          setData((current) => {
            if (
              eventType !== "DELETE" &&
              presence.workspace_id !== workspaceIdRef.current
            )
              return current;
            return {
              ...current,
              checkout_presence:
                eventType === "DELETE"
                  ? current.checkout_presence.filter(
                      (item) => item.session_id !== old.session_id,
                    )
                  : [
                      presence,
                      ...current.checkout_presence.filter(
                        (item) => item.session_id !== presence.session_id,
                      ),
                    ],
            };
          }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        ({ eventType, new: order, old }) =>
          setData((current) => {
            if (eventType === "DELETE") {
              return {
                ...current,
                orders: current.orders.filter((item) => item.id !== old.id),
              };
            }
            if (order.workspace_id !== workspaceIdRef.current) return current;
            const orders = [
              order,
              ...current.orders.filter((item) => item.id !== order.id),
            ]
              .sort(
                (a, b) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime(),
              )
              .slice(0, 1000);
            return { ...current, orders };
          }),
      )
      .subscribe();
    const refreshTimer = window.setInterval(() => load(false, true), 30000);
    return () => {
      window.clearInterval(refreshTimer);
      supabase.removeChannel(liveCounters);
      subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    const shortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        searchInputRef.current?.blur();
      }
    };
    const closeOutside = (event) => {
      if (!searchRootRef.current?.contains(event.target)) setSearchOpen(false);
    };
    window.addEventListener("keydown", shortcut);
    document.addEventListener("mousedown", closeOutside);
    return () => {
      window.removeEventListener("keydown", shortcut);
      document.removeEventListener("mousedown", closeOutside);
    };
  }, []);
  const metrics = useMemo(() => {
    const approved = data.orders.filter((o) => o.status === "approved");
    const revenue = approved.reduce((n, o) => n + Number(o.total_cents), 0);
    const charges = data.transactions
      .filter((t) => t.type === "charge" && t.status === "completed")
      .reduce((n, t) => n + Number(t.amount_cents), 0);
    const debits = data.transactions
      .filter(
        (t) =>
          ["fee", "refund", "payout"].includes(t.type) &&
          t.status === "completed",
      )
      .reduce((n, t) => n + Math.abs(Number(t.amount_cents)), 0);
    const generatedAttempts = data.payment_attempts.filter(
      (attempt) => !["creating", "create_failed"].includes(attempt.status),
    );
    const paidAttempts = generatedAttempts.filter(
      (attempt) => attempt.status === "APPROVED",
    );
    const suspiciousApproved = paidAttempts.filter(
      (attempt) => attempt.risk_status === "suspected",
    );
    return {
      revenue,
      approved: approved.length,
      customers: data.customers.length,
      balance: charges - debits,
      generated: data.orders.length,
      paid: approved.length,
      suspiciousApproved: suspiciousApproved.length,
    };
  }, [data]);
  const searchResults = useMemo(() => {
    const normalize = (value) =>
      String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    const term = normalize(searchQuery.trim());
    if (!term) return [];
    const matches = (value) => normalize(value).includes(term);
    return [
      ...data.products
        .filter((item) => matches(item.name) || matches(item.slug))
        .map((item) => ({
          id: `product-${item.id}`,
          label: item.name,
          detail: `${money(item.price_cents)} · ${labels[item.status] || item.status}`,
          type: "Produto",
          route: `product_edit:${item.id}`,
          Icon: Package,
        })),
      ...data.customers
        .filter(
          (item) =>
            matches(item.name) || matches(item.email) || matches(item.phone),
        )
        .map((item) => ({
          id: `customer-${item.id}`,
          label: item.name,
          detail: item.email,
          type: "Cliente",
          route: "clientes",
          Icon: Users,
        })),
      ...data.payment_links
        .filter((item) => matches(item.title) || matches(item.slug))
        .map((item) => ({
          id: `link-${item.id}`,
          label: item.title,
          detail: `/${item.slug}`,
          type: "Link",
          route: "links",
          Icon: LinkIcon,
        })),
      ...data.payment_gateways
        .filter((item) => matches(item.display_name) || matches(item.provider))
        .map((item) => ({
          id: `gateway-${item.id}`,
          label: item.display_name,
          detail: labels[item.status] || item.status,
          type: "Gateway",
          route: "gateways",
          Icon: Bank,
        })),
    ].slice(0, 8);
  }, [data, searchQuery]);
  const openSearchResult = (result) => {
    setActive(result.route);
    setSearchQuery("");
    setSearchOpen(false);
  };
  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };
  const actionFor = () => {
    if (active === "produtos") {
      setActive("product_new");
      return;
    }
    if (["clientes", "links", "gateways"].includes(active)) setModal(active);
  };
  const switchWorkspace = async (nextWorkspace) => {
    if (nextWorkspace.id === workspace?.id) {
      setBusinessMenu(false);
      return;
    }
    setBusinessMenu(false);
    setMenu(false);
    setActive("home");
    await load(false, false, nextWorkspace.id);
  };
  const businessCreated = async (newWorkspace) => {
    setBusinessModal(false);
    setBusinessMenu(false);
    setActive("home");
    await load(false, false, newWorkspace.id);
  };
  const businessSaved = async (updatedWorkspace) => {
    setManagedBusiness(null);
    await load(false, false, updatedWorkspace.id);
  };
  const businessDeleted = async (deletedId) => {
    setManagedBusiness(null);
    const remaining = workspaces.find((item) => item.id !== deletedId);
    workspaceIdRef.current = remaining?.id || null;
    if (remaining)
      window.localStorage.setItem("maax_active_workspace", remaining.id);
    await load(false, false, remaining?.id || null);
  };
  if (loading)
    return (
      <div className="app-loading">
        <div className="skeleton-logo" />
        <div className="skeleton-line" />
        <div className="skeleton-grid">
          <i />
          <i />
          <i />
        </div>
      </div>
    );
  const userName =
    session?.user?.user_metadata?.full_name ||
    session?.user?.email?.split("@")[0] ||
    "Administrador";
  return (
    <div className="dashboard">
      <aside className={menu ? "open" : ""}>
        <div className="side-head">
          <Mark />
          <BusinessSwitcher
            workspaces={workspaces}
            workspace={workspace}
            open={businessMenu}
            onToggle={() => setBusinessMenu((current) => !current)}
            onClose={() => setBusinessMenu(false)}
            onSelect={switchWorkspace}
            onManage={(item) => {
              setBusinessMenu(false);
              setManagedBusiness(item);
            }}
            onCreate={() => {
              setBusinessMenu(false);
              setBusinessModal(true);
            }}
          />
          <button onClick={() => setMenu(false)}>
            <X />
          </button>
        </div>
        <nav className="side-nav">
          <span>PLATAFORMA</span>
          {nav.map(([id, label, Icon]) => (
            <a
              key={id}
              className={active === id ? "active" : ""}
              onClick={() => {
                setActive(id);
                setMenu(false);
              }}
            >
              <Icon />
              {label}
              {id === "vendas" && data.orders.length > 0 ? (
                <b>{data.orders.length}</b>
              ) : null}
            </a>
          ))}
        </nav>
        <div className="side-help">
          <Sparkle />
          <b>Dados em produção</b>
          <small>Conectado ao workspace {workspace?.name}.</small>
          <button onClick={load}>Atualizar dados</button>
        </div>
        <button className="logout" onClick={logout}>
          <SignOut /> Sair da conta
        </button>
      </aside>
      <div className="dash-main">
        <header>
          <button className="mobile-menu" onClick={() => setMenu(true)}>
            <List />
          </button>
          <div className="search" ref={searchRootRef}>
            <MagnifyingGlass />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Buscar na plataforma..."
              aria-label="Buscar na plataforma"
              aria-expanded={searchOpen && Boolean(searchQuery.trim())}
            />
            <button
              type="button"
              className="search-shortcut"
              onClick={() => searchInputRef.current?.focus()}
              aria-label="Ativar busca"
            >
              Ctrl K
            </button>
            {searchOpen && searchQuery.trim() && (
              <div className="search-results" role="listbox">
                <header>
                  <span>RESULTADOS NESTE NEGÓCIO</span>
                  <small>{searchResults.length}</small>
                </header>
                {searchResults.length ? (
                  searchResults.map((result) => {
                    const ResultIcon = result.Icon;
                    return (
                      <button
                        type="button"
                        onClick={() => openSearchResult(result)}
                        role="option"
                        key={result.id}
                      >
                        <i>
                          <ResultIcon />
                        </i>
                        <span>
                          <b>{result.label}</b>
                          <small>{result.detail}</small>
                        </span>
                        <em>{result.type}</em>
                      </button>
                    );
                  })
                ) : (
                  <div className="search-empty">
                    <MagnifyingGlass />
                    <span>
                      <b>Nenhum resultado</b>
                      <small>Tente buscar por outro nome ou contato.</small>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="header-actions">
            <button className="notify">
              <Bell />
            </button>
            <div className="user">
              <span>
                {userName
                  .split(" ")
                  .map((x) => x[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <div>
                <b>{userName}</b>
                <small>Administrador</small>
              </div>
            </div>
          </div>
        </header>
        <main className="dash-content">
          {error && (
            <div className="data-error">
              {error}
              <button onClick={load}>Tentar novamente</button>
            </div>
          )}
          {active === "home" ? (
            <HomeView
              metrics={metrics}
              data={data}
              workspace={workspace}
              onNavigate={setActive}
            />
          ) : (
            <DataView
              type={active}
              data={data}
              metrics={metrics}
              workspace={workspace}
              onAction={actionFor}
              onNavigate={setActive}
              onReload={load}
            />
          )}
        </main>
      </div>
      <CornerPhone />
      {modal && (
        <CreateModal
          type={modal}
          workspace={workspace}
          products={data.products}
          onClose={() => setModal("")}
          onSaved={load}
        />
      )}
      {businessModal && (
        <CreateBusinessModal
          onClose={() => setBusinessModal(false)}
          onCreated={businessCreated}
        />
      )}
      {managedBusiness && (
        <ManageBusinessModal
          business={managedBusiness}
          canDelete={workspaces.length > 1}
          onClose={() => setManagedBusiness(null)}
          onSaved={businessSaved}
          onDeleted={businessDeleted}
        />
      )}
    </div>
  );
}

function PageTitle({ kicker, title, description, action, onAction }) {
  return (
    <div className="dash-title">
      <div>
        <span>{kicker}</span>
        <h1>
          {title}
          <i />
        </h1>
        <p>{description}</p>
      </div>
      {action && (
        <div>
          <Button onClick={onAction}>
            <Plus />
            {action}
          </Button>
        </div>
      )}
    </div>
  );
}
function Stat({ label, value, icon: Icon = TrendUp, tone = "default" }) {
  return (
    <article className={tone === "danger" ? "metric-danger" : ""}>
      <span>
        {label}
        <Icon />
      </span>
      <b>{value}</b>
    </article>
  );
}
function Empty({ type }) {
  const copy = emptyCopy[type] || [
    "Nenhum registro",
    "Os dados aparecerão aqui quando estiverem disponíveis.",
  ];
  return (
    <div className="real-empty">
      <div>
        <Sparkle />
      </div>
      <h3>{copy[0]}</h3>
      <p>{copy[1]}</p>
    </div>
  );
}

function CheckoutLiveFeed({ counters = [], presence = [] }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(timer);
  }, []);
  const activeSessions = presence.filter(
    (item) => now - new Date(item.last_seen_at).getTime() < 30000,
  );
  const activeAt = (...eventTypes) =>
    activeSessions.filter((item) => eventTypes.includes(item.stage)).length;
  const stages = [
    ["Acessos agora", activeSessions.length],
    [
      "Preenchimentos",
      activeAt("form_started", "address_started", "payment_method_selected"),
    ],
    [
      "Pagamentos enviados",
      activeAt("payment_submitted", "payment_created", "payment_failed"),
    ],
    ["Pix gerados", activeAt("pix_generated")],
  ];
  return (
    <div className="checkout-live-feed">
      <div className="live-feed-head">
        <div>
          <span className="live-dot" />
          <b>Eventos ao vivo</b>
        </div>
        <small>tempo real</small>
      </div>
      <div className="live-counter-grid" aria-live="polite">
        {stages.map(([label, total]) => (
          <div className="live-counter" key={label}>
            <strong>{new Intl.NumberFormat("pt-BR").format(total)}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getCampaignTouch(order) {
  const touch = order.metadata?.attribution?.last_touch || {};
  const source =
    touch.utm_source ||
    (touch.gclid || touch.gbraid || touch.wbraid
      ? "google"
      : touch.fbclid
        ? "meta"
        : touch.ttclid
          ? "tiktok"
          : touch.msclkid
            ? "microsoft"
            : "direct");
  return {
    source,
    medium: touch.utm_medium || (source === "direct" ? "none" : "paid"),
    campaign: touch.utm_campaign || "Sem campanha",
    content: touch.utm_content || null,
    clickId:
      touch.gclid ||
      touch.gbraid ||
      touch.wbraid ||
      touch.fbclid ||
      touch.ttclid ||
      touch.msclkid ||
      null,
  };
}

function CampaignAttributionPanel({ orders = [] }) {
  const approved = [...orders]
    .filter(
      (order) =>
        order.status === "approved" && order.metadata?.attribution?.last_touch,
    )
    .sort(
      (a, b) =>
        new Date(b.paid_at || b.created_at).getTime() -
        new Date(a.paid_at || a.created_at).getTime(),
    );
  const recent = approved.slice(0, 30).map((order) => ({
    ...order,
    campaignTouch: getCampaignTouch(order),
  }));
  const attributed = approved.filter(
    (order) => getCampaignTouch(order).source !== "direct",
  );
  const rankingMap = new Map();
  attributed.forEach((order) => {
    const touch = getCampaignTouch(order);
    const key = `${touch.source}::${touch.campaign}`;
    const current = rankingMap.get(key) || {
      source: touch.source,
      campaign: touch.campaign,
      sales: 0,
      revenue: 0,
    };
    current.sales += 1;
    current.revenue += Number(order.total_cents || 0);
    rankingMap.set(key, current);
  });
  const ranking = [...rankingMap.values()]
    .sort((a, b) => b.revenue - a.revenue || b.sales - a.sales)
    .slice(0, 10);
  const attributedRevenue = attributed.reduce(
    (total, order) => total + Number(order.total_cents || 0),
    0,
  );
  const attributionRate = approved.length
    ? Math.round((attributed.length / approved.length) * 100)
    : 0;

  return (
    <section className="campaign-panel">
      <header className="campaign-panel-head">
        <div>
          <span>INTELIGÊNCIA DE AQUISIÇÃO</span>
          <h2>Campanhas que geram receita.</h2>
          <p>Somente pedidos aprovados e conciliados pelo gateway.</p>
        </div>
        <div className="campaign-panel-live">
          <i /> Atribuição ativa
        </div>
      </header>
      <div className="campaign-summary">
        <div>
          <span>Receita atribuída</span>
          <strong>{money(attributedRevenue)}</strong>
        </div>
        <div>
          <span>Vendas identificadas</span>
          <strong>{attributed.length}</strong>
        </div>
        <div>
          <span>Taxa de atribuição</span>
          <strong>{attributionRate}%</strong>
        </div>
      </div>
      <div className="campaign-panel-grid">
        <div className="campaign-ranking">
          <header>
            <span>TOP 10</span>
            <b>Melhores campanhas</b>
            <small>Ordenado por faturamento aprovado</small>
          </header>
          {ranking.length ? (
            <ol>
              {ranking.map((campaign, index) => (
                <li key={`${campaign.source}-${campaign.campaign}`}>
                  <em>{String(index + 1).padStart(2, "0")}</em>
                  <span>
                    <b>{campaign.campaign}</b>
                    <small>
                      {campaign.source} · {campaign.sales}{" "}
                      {campaign.sales === 1 ? "venda" : "vendas"}
                    </small>
                  </span>
                  <strong>{money(campaign.revenue)}</strong>
                </li>
              ))}
            </ol>
          ) : (
            <div className="campaign-ranking-empty">
              <Crosshair />
              <b>Aguardando a primeira campanha</b>
              <small>
                As vendas atribuídas formarão o ranking automaticamente.
              </small>
            </div>
          )}
        </div>
        <div className="campaign-sales">
          <header>
            <div>
              <span>ÚLTIMAS CONVERSÕES</span>
              <b>Origem de cada venda</b>
            </div>
            <small>{recent.length}/30 linhas</small>
          </header>
          {recent.length ? (
            <div className="campaign-sales-scroll">
              <div className="campaign-sale-row campaign-sale-th">
                <span>Campanha</span>
                <span>Origem</span>
                <span>Pedido</span>
                <span>Valor</span>
                <span>Data</span>
              </div>
              {recent.map((order) => (
                <div className="campaign-sale-row" key={order.id}>
                  <span>
                    <b>{order.campaignTouch.campaign}</b>
                    <small>
                      {order.campaignTouch.content ||
                        order.campaignTouch.medium}
                    </small>
                  </span>
                  <span>
                    <i /> {order.campaignTouch.source}
                  </span>
                  <span>{order.code}</span>
                  <span>
                    <b>{money(order.total_cents)}</b>
                  </span>
                  <span>{date(order.paid_at || order.created_at)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="campaign-sales-empty">
              <TrendUp />
              <b>Nenhuma venda aprovada ainda</b>
              <small>As conversões aparecerão aqui em tempo real.</small>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function HomeView({ metrics, data, workspace, onNavigate }) {
  const attributionEnabled =
    data.checkout_configs?.[0]?.settings?.campaign_attribution_enabled === true;
  return (
    <div className="page-enter">
      <PageTitle
        kicker="VISÃO GERAL"
        title={`Olá, ${workspace?.name}.`}
        description="Resumo atualizado do seu checkout."
      />
      <section className="balance">
        <div className="balance-copy">
          <span>Volume processado</span>
          <strong>{money(metrics.revenue)}</strong>
          <p>
            <CheckCircle /> Total de pagamentos aprovados
          </p>
        </div>
        <CheckoutLiveFeed
          counters={data.checkout_event_counters}
          presence={data.checkout_presence}
        />
      </section>
      <div className="metrics">
        <Stat label="Pedidos pagos" value={metrics.paid} icon={CheckCircle} />
        <Stat
          label="Pedidos gerados"
          value={metrics.generated}
          icon={Receipt}
        />
        <Stat
          label="Produtos ativos"
          value={data.products.filter((p) => p.status === "active").length}
          icon={Package}
        />
        <Stat
          label="Vendas com divergência"
          value={metrics.suspiciousApproved}
          icon={WarningCircle}
          tone="danger"
        />
      </div>
      {attributionEnabled && <CampaignAttributionPanel orders={data.orders} />}
      <section className="resource-table">
        <div className="resource-head">
          <div>
            <span>ATIVIDADE REAL</span>
            <h2>Últimas vendas</h2>
          </div>
          <div className="sales-live-status">
            <i /> Tempo real <small>10 mais recentes</small>
          </div>
        </div>
        {data.orders.length ? (
          <OrderRows rows={data.orders.slice(0, 10)} />
        ) : (
          <Empty type="vendas" />
        )}
      </section>
    </div>
  );
}

function OrderRows({ rows }) {
  return (
    <div className="generic-table">
      <div className="generic-row generic-th">
        <span>Pedido</span>
        <span>Pagamento</span>
        <span>Valor</span>
        <span>Status</span>
        <span>Data</span>
      </div>
      {rows.map((o) => (
        <div className="generic-row" key={o.id}>
          <span>
            <b>{o.code}</b>
          </span>
          <span>{o.payment_method || "—"}</span>
          <span>
            <b>{money(o.total_cents)}</b>
          </span>
          <span>
            <em
              className={
                ["approved", "completed", "active"].includes(o.status)
                  ? ""
                  : "pending"
              }
            >
              {labels[o.status] || o.status}
            </em>
          </span>
          <span>{date(o.created_at)}</span>
        </div>
      ))}
    </div>
  );
}

const defaultCheckout = {
  template: "maax",
  brand_name: "Minha loja",
  accent: "#cbff35",
  background: "#f5f5f2",
  surface: "#ffffff",
  secondary_surface: "#f4f5f1",
  text_color: "#20211e",
  muted_color: "#74776f",
  input_background: "#ffffff",
  card_color: "#242520",
  card_text_color: "#ffffff",
  radius: 12,
  layout: "split",
  button_text: "Finalizar pagamento",
  logo_url: "",
  banner_url: "",
  payment_methods: ["pix", "card", "boleto"],
  shopper_header_title: "Finalizar compra",
  shopper_shipping_estimate: "Receba em até 6 dias úteis",
  shopper_protection_price: "12,90",
  order_bump_enabled: false,
  order_bump_title: "Aproveite esta oferta",
  order_bump_description: "Adicione ao seu pedido com apenas um clique.",
  order_bump_product_ids: [],
  shipping_options: [],
  checkout_shipping_option_ids: [],
};
const defaultModules = [
  { id: "secure_badge", label: "Selo Compra segura", enabled: true },
  { id: "contact", label: "Dados de contato", enabled: true },
  { id: "payment", label: "Pagamento", enabled: true },
  { id: "trust", label: "Compra segura", enabled: true },
  { id: "summary", label: "Resumo do pedido", enabled: true },
  { id: "coupon", label: "Cupom de desconto", enabled: true },
  {
    id: "shopper_protection",
    label: "Shopper: Proteção da compra",
    enabled: true,
  },
  {
    id: "shopper_message",
    label: "Shopper: Nome e contato",
    enabled: true,
  },
  {
    id: "shopper_invoice",
    label: "Shopper: CPF do cliente",
    enabled: true,
  },
  { id: "shopper_shipping", label: "Shopper: Opção de entrega", enabled: true },
];
const mergeCheckoutModules = (saved = []) => [
  ...saved,
  ...defaultModules.filter(
    (module) => !saved.some((item) => item.id === module.id),
  ),
];

const attributionKeys = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_id",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "gbraid",
  "wbraid",
  "ttclid",
  "msclkid",
];

function captureCampaignAttribution() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const current = Object.fromEntries(
    attributionKeys
      .map((key) => [key, params.get(key)?.trim()])
      .filter(([, value]) => value),
  );
  const hasCampaignSignal = Object.keys(current).length > 0;
  const now = new Date().toISOString();
  const touch = {
    ...current,
    landing_path: `${window.location.pathname}${window.location.search}`.slice(
      0,
      1800,
    ),
    referrer: document.referrer.slice(0, 1800) || null,
    captured_at: now,
  };
  const storageKey = "maax_campaign_attribution_v1";
  let stored = null;
  try {
    stored = JSON.parse(window.localStorage.getItem(storageKey) || "null");
  } catch {
    stored = null;
  }
  const inferredTouch = hasCampaignSignal
    ? touch
    : stored?.last_touch || {
        ...touch,
        utm_source: document.referrer ? "referral" : "direct",
        utm_medium: document.referrer ? "referral" : "none",
        utm_campaign: "Sem campanha",
      };
  const firstCapturedAt = new Date(
    stored?.first_touch?.captured_at || 0,
  ).getTime();
  const firstTouchExpired =
    Date.now() - firstCapturedAt > 90 * 24 * 60 * 60 * 1000;
  const attribution = {
    first_touch:
      !stored?.first_touch || firstTouchExpired
        ? inferredTouch
        : stored.first_touch,
    last_touch: hasCampaignSignal
      ? inferredTouch
      : stored?.last_touch || inferredTouch,
  };
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(attribution));
  } catch {
    // Attribution still travels with the current checkout when storage is unavailable.
  }
  return attribution;
}

export function PublicCheckout({ slug }) {
  const checkoutSessionId = useRef(crypto.randomUUID());
  const humanVerifiedRef = useRef(false);
  const [campaignAttribution] = useState(() => captureCampaignAttribution());
  const trackedInteraction = useRef({ form: false, address: false });
  const [state, setState] = useState({
    loading: true,
    product: null,
    images: [],
    orderBumps: [],
    shippingOptions: [],
    settings: defaultCheckout,
    modules: defaultModules,
    error: "",
  });
  const [payment, setPayment] = useState("pix");
  const [card, setCard] = useState({
    number: "",
    name: "",
    expiry: "",
    cvv: "",
  });
  const [submitState, setSubmitState] = useState("");
  const [paymentResult, setPaymentResult] = useState(null);
  const [protectionSelected, setProtectionSelected] = useState(false);
  const [selectedBumpIds, setSelectedBumpIds] = useState([]);
  const [selectedShippingId, setSelectedShippingId] = useState("");
  const trackCheckoutEvent = (eventType, paymentMethod, productId) => {
    const targetProductId = productId || state.product?.id;
    if (!targetProductId) return;
    fetch("/api/checkout/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        productId: targetProductId,
        sessionId: checkoutSessionId.current,
        eventType,
        paymentMethod: paymentMethod || null,
        humanVerified: humanVerifiedRef.current,
      }),
    }).catch(() => undefined);
  };
  useEffect(() => {
    let active = true;
    const loadCheckout = async () => {
      const { data: product, error } = await supabase
        .from("products")
        .select("*")
        .eq("slug", slug)
        .eq("status", "active")
        .maybeSingle();
      if (!active) return;
      if (error || !product) {
        setState((current) => ({
          ...current,
          loading: false,
          error: "Este checkout não está disponível.",
        }));
        return;
      }
      const [configResult, imageResult] = await Promise.all([
        supabase
          .from("checkout_configs")
          .select("settings,modules,status")
          .eq("workspace_id", product.workspace_id)
          .maybeSingle(),
        supabase
          .from("product_images")
          .select("*")
          .eq("product_id", product.id)
          .order("position"),
      ]);
      if (!active) return;
      const checkoutSettings = {
        ...defaultCheckout,
        ...(configResult.data?.settings || {}),
      };
      const currentHost = window.location.hostname.toLowerCase();
      const platformHost =
        currentHost === "localhost" ||
        currentHost === "127.0.0.1" ||
        currentHost.endsWith(".vercel.app");
      const configuredHost = String(
        checkoutSettings.custom_domain?.hostname || "",
      ).toLowerCase();
      if (
        !platformHost &&
        (!checkoutSettings.custom_domain?.verified || configuredHost !== currentHost)
      ) {
        setState((current) => ({
          ...current,
          loading: false,
          error: "Este domínio não está autorizado para este checkout.",
        }));
        return;
      }
      const configuredBumpIds = checkoutSettings.order_bump_enabled
        ? (checkoutSettings.order_bump_product_ids || []).filter(
            (id) => id !== product.id,
          )
        : [];
      let orderBumps = [];
      if (configuredBumpIds.length) {
        const [bumpResult, bumpImagesResult] = await Promise.all([
          supabase
            .from("products")
            .select("id,name,description,price_cents,product_type")
            .eq("workspace_id", product.workspace_id)
            .eq("status", "active")
            .in("id", configuredBumpIds),
          supabase
            .from("product_images")
            .select("product_id,url,position")
            .eq("workspace_id", product.workspace_id)
            .in("product_id", configuredBumpIds)
            .order("position"),
        ]);
        orderBumps = (bumpResult.data || [])
          .sort(
            (a, b) =>
              configuredBumpIds.indexOf(a.id) - configuredBumpIds.indexOf(b.id),
          )
          .map((bump) => ({
            ...bump,
            image_url: (bumpImagesResult.data || []).find(
              (image) => image.product_id === bump.id,
            )?.url,
          }));
      }
      const configuredShippingIds =
        checkoutSettings.checkout_shipping_option_ids || [];
      const shippingOptions = (checkoutSettings.shipping_options || [])
        .filter(
          (option) =>
            option.active !== false &&
            configuredShippingIds.includes(option.id),
        )
        .slice(0, 3);
      if (!active) return;
      setSelectedBumpIds([]);
      setSelectedShippingId(shippingOptions[0]?.id || "");
      setState({
        loading: false,
        product,
        images: imageResult.data || [],
        orderBumps,
        shippingOptions,
        settings: checkoutSettings,
        modules: mergeCheckoutModules(configResult.data?.modules || []),
        error: "",
      });
      trackCheckoutEvent("checkout_opened", null, product.id);
    };
    loadCheckout();
    return () => {
      active = false;
    };
  }, [slug]);
  useEffect(() => {
    const productId = state.product?.id;
    if (!productId) return undefined;
    let humanVerified = false;
    let heartbeatTimer;
    const payload = (action) =>
      JSON.stringify({
        productId,
        sessionId: checkoutSessionId.current,
        action,
        humanVerified,
      });
    const heartbeat = () => {
      if (!humanVerified || document.visibilityState !== "visible") return;
      return fetch("/api/checkout/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload("heartbeat"),
      }).catch(() => undefined);
    };
    const leave = () => {
      const body = payload("leave");
      if (navigator.sendBeacon)
        navigator.sendBeacon(
          "/api/checkout/presence",
          new Blob([body], { type: "application/json" }),
        );
      else
        fetch("/api/checkout/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        }).catch(() => undefined);
    };
    const verifyHuman = (event) => {
      if (
        humanVerified ||
        !event.isTrusted ||
        navigator.webdriver ||
        document.visibilityState !== "visible"
      )
        return;
      humanVerified = true;
      humanVerifiedRef.current = true;
      heartbeat();
      heartbeatTimer = window.setInterval(heartbeat, 10000);
      humanEvents.forEach((eventName) =>
        window.removeEventListener(eventName, verifyHuman),
      );
    };
    const visibilityChanged = () => {
      if (document.visibilityState === "hidden") leave();
      else if (humanVerified) heartbeat();
    };
    const humanEvents = [
      "pointerdown",
      "pointermove",
      "touchstart",
      "keydown",
      "scroll",
    ];
    humanEvents.forEach((eventName) =>
      window.addEventListener(eventName, verifyHuman, { passive: true }),
    );
    window.addEventListener("pagehide", leave);
    document.addEventListener("visibilitychange", visibilityChanged);
    return () => {
      if (heartbeatTimer) window.clearInterval(heartbeatTimer);
      humanEvents.forEach((eventName) =>
        window.removeEventListener(eventName, verifyHuman),
      );
      window.removeEventListener("pagehide", leave);
      document.removeEventListener("visibilitychange", visibilityChanged);
      leave();
    };
  }, [state.product?.id]);
  if (state.loading)
    return (
      <div className="public-checkout-loading">
        <div />
        <div />
        <div />
      </div>
    );
  if (state.error)
    return (
      <div className="public-checkout-error">
        <Mark />
        <h1>Checkout indisponível</h1>
        <p>{state.error}</p>
      </div>
    );
  const { product, settings, modules, images, orderBumps, shippingOptions } =
    state;
  const paymentMethods = settings.payment_methods?.length
    ? settings.payment_methods
    : ["pix"];
  const selectedPayment = paymentMethods.includes(payment)
    ? payment
    : paymentMethods[0];
  const choosePayment = (method) => {
    setPayment(method);
    trackCheckoutEvent("payment_method_selected", method);
  };
  const trackFormProgress = (event) => {
    const fieldName = event.target?.name || "";
    if (
      fieldName.startsWith("address_") &&
      !trackedInteraction.current.address
    ) {
      trackedInteraction.current.address = true;
      trackCheckoutEvent("address_started", selectedPayment);
      return;
    }
    if (!trackedInteraction.current.form) {
      trackedInteraction.current.form = true;
      trackCheckoutEvent("form_started", selectedPayment);
    }
  };
  const enabled = (id) =>
    modules.find((module) => module.id === id)?.enabled !== false;
  const isPhysical = ["physical", "fisico", "físico"].includes(
    (product.product_type || "").toLowerCase(),
  );
  const protectionAvailable =
    isPhysical &&
    enabled("shopper_protection") &&
    settings.template === "shopper";
  const protectionCents = protectionAvailable
    ? brlToCents(settings.shopper_protection_price)
    : 0;
  const selectedShipping = isPhysical
    ? shippingOptions.find((option) => option.id === selectedShippingId)
    : null;
  const shippingCents = Number(selectedShipping?.price_cents || 0);
  const totalCents =
    Number(product.price_cents || 0) +
    shippingCents +
    (protectionSelected ? protectionCents : 0) +
    orderBumps
      .filter((bump) => selectedBumpIds.includes(bump.id))
      .reduce((total, bump) => total + Number(bump.price_cents || 0), 0);
  const toggleOrderBump = (productId) =>
    setSelectedBumpIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  const submit = async (event) => {
    event.preventDefault();
    trackCheckoutEvent("payment_submitted", selectedPayment);
    setSubmitState("Processando pagamento...");
    setPaymentResult(null);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch("/api/pagamaster/payin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          slug,
          paymentMethod: selectedPayment,
          customer: {
            name: values.customer_name,
            email: values.customer_email,
            phone: values.customer_phone,
            document: values.customer_document,
          },
          address: {
            zipCode: values.address_zip_code,
            street: values.address_street,
            number: values.address_number,
            neighborhood: values.address_neighborhood,
            city: values.address_city,
            state: values.address_state,
            complement: values.address_complement,
          },
          card,
          protectionSelected,
          orderBumpProductIds: selectedBumpIds,
          shippingOptionId: selectedShipping?.id || null,
          attribution: campaignAttribution,
          checkoutSessionId: checkoutSessionId.current,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(result.error || "Não foi possível criar a cobrança.");
      setPaymentResult(result);
      trackCheckoutEvent(
        result.pix?.qrcode ? "pix_generated" : "payment_created",
        selectedPayment,
      );
      setSubmitState(
        result.status === "APPROVED"
          ? "Pagamento aprovado."
          : "Cobrança criada. Conclua o pagamento abaixo.",
      );
    } catch (error) {
      trackCheckoutEvent("payment_failed", selectedPayment);
      setSubmitState(error.message);
    }
  };
  if (settings.template === "shopper") {
    return (
      <ShopperCheckout
        product={product}
        images={images}
        settings={settings}
        modules={modules}
        isPhysical={isPhysical}
        paymentMethods={paymentMethods}
        payment={selectedPayment}
        setPayment={choosePayment}
        card={card}
        setCard={setCard}
        submit={submit}
        submitState={submitState}
        protectionSelected={protectionSelected}
        setProtectionSelected={setProtectionSelected}
        protectionCents={protectionCents}
        orderBumps={orderBumps}
        shippingOptions={shippingOptions}
        selectedShippingId={selectedShippingId}
        onSelectShipping={setSelectedShippingId}
        selectedBumpIds={selectedBumpIds}
        onToggleOrderBump={toggleOrderBump}
        totalCents={totalCents}
        paymentResult={paymentResult}
        onFormFocus={trackFormProgress}
      />
    );
  }
  return (
    <div
      className="public-checkout"
      style={{
        "--checkout-accent": settings.accent,
        "--checkout-bg": settings.background,
        "--checkout-surface": settings.surface,
        "--checkout-secondary": settings.secondary_surface,
        "--checkout-text": settings.text_color,
        "--checkout-muted": settings.muted_color,
        "--checkout-input": settings.input_background,
        "--checkout-card": settings.card_color,
        "--checkout-card-text": settings.card_text_color,
        "--shopper-bg": settings.background,
        "--shopper-surface": settings.surface,
        "--shopper-secondary": settings.secondary_surface,
        "--shopper-input": settings.input_background,
        "--checkout-radius": `${settings.radius}px`,
      }}
    >
      {settings.banner_url && (
        <div className="public-checkout-banner">
          <img src={settings.banner_url} alt="Banner da loja" />
        </div>
      )}
      <header>
        {settings.logo_url ? (
          <img src={settings.logo_url} alt={settings.brand_name} />
        ) : (
          <strong>{settings.brand_name}</strong>
        )}
        {enabled("secure_badge") && (
          <span>
            <Bank /> Ambiente seguro
          </span>
        )}
      </header>
      <main className={settings.layout === "compact" ? "compact" : ""}>
        <form
          className="public-checkout-form"
          onSubmit={submit}
          onFocusCapture={trackFormProgress}
        >
          <div className="public-product-mobile">
            {images[0] ? (
              <img src={images[0].url} alt={product.name} />
            ) : (
              <Package />
            )}
            <span>
              <b>{product.name}</b>
              <small>{money(product.price_cents)}</small>
            </span>
          </div>
          {enabled("contact") && (
            <section>
              <span>01</span>
              <h2>Seus dados</h2>
              <label>
                E-mail
                <input
                  name="customer_email"
                  type="email"
                  required
                  placeholder="voce@email.com"
                />
              </label>
              <div className="field-pair">
                <label>
                  Nome
                  <input name="customer_name" required placeholder="Seu nome" />
                </label>
                <label>
                  CPF
                  <input
                    name="customer_document"
                    required
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                  />
                </label>
              </div>
              <label>
                Telefone
                <input
                  name="customer_phone"
                  required
                  type="tel"
                  autoComplete="tel"
                  placeholder="(11) 99999-9999"
                />
              </label>
            </section>
          )}
          {!isPhysical && (
            <section className="shipping-section">
              <span>02</span>
              <h2>Endereço de cobrança</h2>
              <div className="field-pair">
                <label>
                  CEP
                  <input
                    name="address_zip_code"
                    required
                    inputMode="numeric"
                    placeholder="00000-000"
                  />
                </label>
                <label>
                  Número
                  <input name="address_number" required placeholder="123" />
                </label>
              </div>
              <label>
                Endereço
                <input
                  name="address_street"
                  required
                  placeholder="Rua ou avenida"
                />
              </label>
              <div className="shipping-address-grid city">
                <label>
                  Bairro
                  <input name="address_neighborhood" required />
                </label>
                <label>
                  Cidade
                  <input name="address_city" required />
                </label>
                <label>
                  Estado
                  <input
                    name="address_state"
                    required
                    maxLength="2"
                    placeholder="UF"
                  />
                </label>
              </div>
              <label>
                Complemento <small>Opcional</small>
                <input name="address_complement" />
              </label>
            </section>
          )}
          {isPhysical && (
            <section className="shipping-section">
              <span>02</span>
              <h2>Endereço de entrega</h2>
              <label>
                CEP
                <input
                  name="address_zip_code"
                  required
                  inputMode="numeric"
                  autoComplete="postal-code"
                  placeholder="00000-000"
                />
              </label>
              <div className="shipping-address-grid">
                <label>
                  Endereço
                  <input
                    name="address_street"
                    required
                    autoComplete="street-address"
                    placeholder="Rua ou avenida"
                  />
                </label>
                <label>
                  Número
                  <input
                    name="address_number"
                    required
                    inputMode="numeric"
                    placeholder="123"
                  />
                </label>
              </div>
              <div className="shipping-address-grid city">
                <label>
                  Bairro
                  <input
                    name="address_neighborhood"
                    required
                    placeholder="Seu bairro"
                  />
                </label>
                <label>
                  Cidade
                  <input
                    name="address_city"
                    required
                    autoComplete="address-level2"
                    placeholder="Sua cidade"
                  />
                </label>
                <label>
                  Estado
                  <select
                    name="address_state"
                    required
                    autoComplete="address-level1"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      UF
                    </option>
                    {[
                      "AC",
                      "AL",
                      "AP",
                      "AM",
                      "BA",
                      "CE",
                      "DF",
                      "ES",
                      "GO",
                      "MA",
                      "MT",
                      "MS",
                      "MG",
                      "PA",
                      "PB",
                      "PR",
                      "PE",
                      "PI",
                      "RJ",
                      "RN",
                      "RS",
                      "RO",
                      "RR",
                      "SC",
                      "SP",
                      "SE",
                      "TO",
                    ].map((uf) => (
                      <option key={uf}>{uf}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Complemento <small>Opcional</small>
                <input
                  name="address_complement"
                  placeholder="Apartamento, bloco ou referência"
                />
              </label>
            </section>
          )}
          {isPhysical && (
            <ShippingSelector
              options={shippingOptions}
              selectedId={selectedShippingId}
              onSelect={setSelectedShippingId}
            />
          )}
          <OrderBumpBlock
            bumps={orderBumps}
            selectedIds={selectedBumpIds}
            onToggle={toggleOrderBump}
            settings={settings}
          />
          {enabled("payment") && (
            <section>
              <span>{isPhysical ? "03" : "02"}</span>
              <h2>Pagamento</h2>
              <div className="payment-choice">
                <button
                  type="button"
                  hidden={!paymentMethods.includes("pix")}
                  className={selectedPayment === "pix" ? "selected" : ""}
                  onClick={() => choosePayment("pix")}
                >
                  Pix<em>Aprovação imediata</em>
                </button>
                <button
                  type="button"
                  hidden={!paymentMethods.includes("card")}
                  className={selectedPayment === "card" ? "selected" : ""}
                  onClick={() => choosePayment("card")}
                >
                  Cartão
                </button>
                {paymentMethods.includes("boleto") && (
                  <button
                    type="button"
                    className={selectedPayment === "boleto" ? "selected" : ""}
                    onClick={() => choosePayment("boleto")}
                  >
                    Boleto <em>Vencimento em 3 dias</em>
                  </button>
                )}
              </div>
              {selectedPayment === "card" && (
                <div className="card-payment">
                  <div className="virtual-card">
                    <div className="virtual-card-top">
                      <span className="virtual-chip" />
                      <b>maax</b>
                    </div>
                    <strong>{card.number || "0000 0000 0000 0000"}</strong>
                    <div>
                      <span>
                        <small>NOME NO CARTÃO</small>
                        {card.name || "SEU NOME"}
                      </span>
                      <span>
                        <small>VALIDADE</small>
                        {card.expiry || "MM/AA"}
                      </span>
                    </div>
                  </div>
                  <div className="card-fields">
                    <label>
                      Número do cartão
                      <input
                        required
                        inputMode="numeric"
                        autoComplete="cc-number"
                        maxLength="19"
                        value={card.number}
                        placeholder="0000 0000 0000 0000"
                        onChange={(e) =>
                          setCard((current) => ({
                            ...current,
                            number: e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 16)
                              .replace(/(.{4})/g, "$1 ")
                              .trim(),
                          }))
                        }
                      />
                    </label>
                    <label>
                      Nome impresso
                      <input
                        required
                        autoComplete="cc-name"
                        value={card.name}
                        placeholder="Como aparece no cartão"
                        onChange={(e) =>
                          setCard((current) => ({
                            ...current,
                            name: e.target.value.toUpperCase().slice(0, 24),
                          }))
                        }
                      />
                    </label>
                    <div className="field-pair">
                      <label>
                        Validade
                        <input
                          required
                          inputMode="numeric"
                          autoComplete="cc-exp"
                          maxLength="5"
                          value={card.expiry}
                          placeholder="MM/AA"
                          onChange={(e) =>
                            setCard((current) => ({
                              ...current,
                              expiry: e.target.value
                                .replace(/\D/g, "")
                                .slice(0, 4)
                                .replace(/^(\d{2})(\d)/, "$1/$2"),
                            }))
                          }
                        />
                      </label>
                      <label>
                        CVV
                        <input
                          required
                          inputMode="numeric"
                          autoComplete="cc-csc"
                          maxLength="4"
                          value={card.cvv}
                          placeholder="123"
                          onChange={(e) =>
                            setCard((current) => ({
                              ...current,
                              cvv: e.target.value
                                .replace(/\D/g, "")
                                .slice(0, 4),
                            }))
                          }
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}
              {selectedPayment === "boleto" && (
                <p className="payment-note">
                  O boleto será gerado após a confirmação dos dados.
                </p>
              )}
            </section>
          )}
          {enabled("trust") && (
            <div className="checkout-trust">
              <CheckCircle /> Seus dados estão protegidos e criptografados.
            </div>
          )}
          {submitState && (
            <p className="public-submit-state" role="status">
              {submitState}
            </p>
          )}
          <PaymentResult result={paymentResult} />
          <button className="checkout-submit" type="submit">
            {settings.button_text}
            <ArrowRight />
          </button>
        </form>
        {enabled("summary") && (
          <aside className="public-order-summary">
            <small>SEU PEDIDO</small>
            <div className="public-product-image">
              {images[0] ? (
                <img src={images[0].url} alt={product.name} />
              ) : (
                <Package />
              )}
            </div>
            <h1>{product.name}</h1>
            {product.description && <p>{product.description}</p>}
            {product.compare_at_price_cents && (
              <del>{money(product.compare_at_price_cents)}</del>
            )}
            <strong>{money(product.price_cents)}</strong>
            {enabled("coupon") && (
              <div className="coupon-preview">
                <input placeholder="Cupom de desconto" />
                <button type="button">Aplicar</button>
              </div>
            )}
            <div className="preview-total">
              <span>Total</span>
              <strong>{money(totalCents)}</strong>
            </div>
            <p className="public-guarantee">
              <CheckCircle /> Compra protegida
            </p>
          </aside>
        )}
      </main>
      <footer>Pagamento processado com segurança por Maax</footer>
    </div>
  );
}
function PaymentResult({ result }) {
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const resultRef = useRef(null);
  const pixCode = result?.pix?.qrcode || "";
  useEffect(() => {
    let active = true;
    if (!pixCode) {
      setQrCodeUrl("");
      return undefined;
    }
    QRCode.toDataURL(pixCode, {
      width: 260,
      margin: 2,
      errorCorrectionLevel: "M",
    })
      .then((url) => active && setQrCodeUrl(url))
      .catch(() => active && setQrCodeUrl(""));
    return () => {
      active = false;
    };
  }, [pixCode]);
  useEffect(() => {
    if (!pixCode) return undefined;
    const timer = window.setTimeout(() => {
      resultRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [pixCode]);
  if (!result) return null;
  return (
    <div ref={resultRef} className="payment-result" role="status">
      {pixCode && (
        <>
          <b>Pix gerado</b>
          <p>Copie o código abaixo e pague no aplicativo do seu banco.</p>
          {qrCodeUrl && (
            <img className="pix-qr-code" src={qrCodeUrl} alt="QR Code Pix" />
          )}
          <textarea readOnly value={pixCode} />
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(pixCode);
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            }}
          >
            <Copy /> {copied ? "Código copiado" : "Copiar código Pix"}
          </button>
        </>
      )}
      {result.boleto?.barcode && (
        <>
          <b>Boleto gerado</b>
          <p>{result.boleto.barcode}</p>
          <a href={result.boleto.url} target="_blank" rel="noreferrer">
            Abrir boleto <ArrowRight />
          </a>
        </>
      )}
      {result.status === "APPROVED" && (
        <>
          <CheckCircle />
          <b>Pagamento aprovado</b>
        </>
      )}
    </div>
  );
}

function OrderBumpBlock({ bumps = [], selectedIds = [], onToggle, settings }) {
  if (!bumps.length) return null;
  return (
    <section className="checkout-order-bumps">
      <div className="order-bump-heading">
        <span>OFERTA ESPECIAL</span>
        <b>{settings.order_bump_title}</b>
        <small>{settings.order_bump_description}</small>
      </div>
      <div className="order-bump-list">
        {bumps.map((bump) => {
          const selected = selectedIds.includes(bump.id);
          return (
            <label className={selected ? "selected" : ""} key={bump.id}>
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onToggle?.(bump.id)}
              />
              <i>
                {bump.image_url ? (
                  <img src={bump.image_url} alt="" loading="lazy" />
                ) : (
                  <Package />
                )}
              </i>
              <span>
                <b>{bump.name}</b>
                <small>{bump.description || "Adicionar ao meu pedido"}</small>
              </span>
              <strong>+ {money(bump.price_cents)}</strong>
            </label>
          );
        })}
      </div>
    </section>
  );
}

function ShippingSelector({
  options = [],
  selectedId,
  onSelect,
  compact = false,
}) {
  if (!options.length) return null;
  return (
    <section
      className={compact ? "checkout-shipping compact" : "checkout-shipping"}
    >
      <div className="checkout-shipping-heading">
        <span>
          <Truck />
        </span>
        <div>
          <b>Escolha a entrega</b>
          <small>Prazo e valor calculados no total do pedido</small>
        </div>
      </div>
      <div className="checkout-shipping-options">
        {options.map((option) => {
          const selected = selectedId === option.id;
          return (
            <label className={selected ? "selected" : ""} key={option.id}>
              <input
                type="radio"
                name="shipping_option"
                value={option.id}
                checked={selected}
                onChange={() => onSelect?.(option.id)}
                required
              />
              <i />
              <span>
                <b>{option.title || option.name}</b>
                <small>
                  {option.description || `${option.name} · ${option.estimate}`}
                </small>
              </span>
              <strong>
                {Number(option.price_cents || 0)
                  ? money(option.price_cents)
                  : "Grátis"}
              </strong>
            </label>
          );
        })}
      </div>
    </section>
  );
}

function ShopperCheckout({
  product,
  images,
  settings,
  modules,
  isPhysical,
  paymentMethods,
  payment,
  setPayment,
  card,
  setCard,
  submit,
  submitState,
  protectionSelected,
  setProtectionSelected,
  protectionCents,
  orderBumps,
  shippingOptions = [],
  selectedShippingId,
  onSelectShipping,
  selectedBumpIds,
  onToggleOrderBump,
  totalCents,
  paymentResult,
  onFormFocus,
  preview = false,
}) {
  const enabled = (id) =>
    modules.find((module) => module.id === id)?.enabled !== false;
  return (
    <div
      className={
        preview
          ? "shopper-checkout shopper-checkout-preview"
          : "shopper-checkout"
      }
      style={{
        "--checkout-accent": settings.accent,
        "--checkout-text": settings.text_color,
        "--checkout-muted": settings.muted_color,
        "--shopper-bg": settings.background,
        "--shopper-surface": settings.surface,
        "--shopper-secondary": settings.secondary_surface,
        "--shopper-input": settings.input_background,
        "--checkout-card": settings.card_color,
        "--checkout-card-text": settings.card_text_color,
      }}
    >
      <header>
        <button type="button">←</button>
        <b>{settings.shopper_header_title}</b>
        {enabled("secure_badge") ? <Bank /> : <i />}
      </header>
      <form onSubmit={submit} onFocusCapture={onFormFocus}>
        <section className="shopper-store">
          <div className="shopper-store-name">
            <span className={settings.logo_url ? "has-logo" : ""}>
              {settings.logo_url ? (
                <img src={settings.logo_url} alt={settings.brand_name} />
              ) : (
                <b>M</b>
              )}
            </span>
            <strong>{settings.brand_name}</strong>
          </div>
          <div className="shopper-product">
            {images[0] ? (
              <img src={images[0].url} alt={product.name} />
            ) : (
              <Package />
            )}
            <div>
              <b>{product.name}</b>
              <small>
                {product.description ||
                  (isPhysical
                    ? "Produto com entrega para todo o Brasil"
                    : "Acesso digital liberado após a confirmação")}
              </small>
              <strong>{money(product.price_cents)}</strong>
            </div>
            <span>1 un.</span>
          </div>
          {isPhysical && enabled("shopper_protection") && (
            <label className="shopper-protection">
              <input
                type="checkbox"
                checked={protectionSelected}
                onChange={(event) =>
                  setProtectionSelected(event.target.checked)
                }
              />
              <span>
                <b>Proteção da compra</b>
                <small>
                  Proteja seu pedido contra danos ou extravio durante a entrega.
                </small>
              </span>
              <strong>{money(protectionCents)}</strong>
            </label>
          )}
        </section>
        {enabled("coupon") && (
          <section className="shopper-options">
            <label>
              <span>Cupom de desconto</span>
              <input name="coupon_code" placeholder="Digite o código" />
            </label>
          </section>
        )}
        {(enabled("shopper_message") || enabled("shopper_invoice")) && (
          <section className="shopper-customer">
            <div className="shopper-customer-heading">
              <b>Dados pessoais</b>
              <small>Usados somente para processar seu pagamento</small>
            </div>
            <div className="shopper-customer-grid">
              {enabled("shopper_message") && (
                <label>
                  <span>Nome completo</span>
                  <input
                    required
                    name="customer_name"
                    autoComplete="name"
                    minLength="3"
                    placeholder="Digite seu nome completo"
                  />
                </label>
              )}
              {enabled("shopper_message") && (
                <label>
                  <span>E-mail</span>
                  <input
                    required
                    type="email"
                    name="customer_email"
                    autoComplete="email"
                    placeholder="voce@exemplo.com"
                  />
                </label>
              )}
              {enabled("shopper_message") && (
                <label>
                  <span>Telefone</span>
                  <input
                    required
                    type="tel"
                    name="customer_phone"
                    autoComplete="tel"
                    inputMode="tel"
                    maxLength="15"
                    placeholder="(11) 99999-9999"
                  />
                </label>
              )}
              {enabled("shopper_invoice") && (
                <label>
                  <span>CPF</span>
                  <input
                    required
                    name="customer_document"
                    autoComplete="off"
                    inputMode="numeric"
                    maxLength="14"
                    placeholder="000.000.000-00"
                  />
                </label>
              )}
            </div>
          </section>
        )}
        {enabled("shopper_shipping") && (
          <section className="shopper-shipping">
            <div>
              <b>{isPhysical ? "Entrega" : "Endereço de cobrança"}</b>
              <small>Dados obrigatórios</small>
            </div>
            {isPhysical && (
              <ShippingSelector
                compact
                options={shippingOptions}
                selectedId={selectedShippingId}
                onSelect={onSelectShipping}
              />
            )}
            <div className="shopper-address">
              <input
                name="address_zip_code"
                required
                placeholder="CEP"
                inputMode="numeric"
              />
              <input name="address_street" required placeholder="Endereço" />
              <input name="address_number" required placeholder="Número" />
              <input
                name="address_neighborhood"
                required
                placeholder="Bairro"
              />
              <input name="address_city" required placeholder="Cidade" />
              <input
                name="address_state"
                required
                maxLength="2"
                placeholder="UF"
              />
              <input
                name="address_complement"
                placeholder="Complemento (opcional)"
              />
            </div>
          </section>
        )}
        <OrderBumpBlock
          bumps={orderBumps}
          selectedIds={selectedBumpIds}
          onToggle={onToggleOrderBump}
          settings={settings}
        />
        {enabled("payment") && (
          <section className="shopper-payment">
            <b>Forma de pagamento</b>
            <div className="payment-choice">
              {paymentMethods.map((method) => (
                <button
                  type="button"
                  key={method}
                  className={payment === method ? "selected" : ""}
                  onClick={() => setPayment(method)}
                >
                  {method === "pix"
                    ? "Pix"
                    : method === "card"
                      ? "Cartão"
                      : "Boleto"}
                </button>
              ))}
            </div>
            {payment === "card" && (
              <div className="shopper-card-area">
                <div className="virtual-card">
                  <div className="virtual-card-top">
                    <span className="virtual-chip" />
                    <b>maax</b>
                  </div>
                  <strong>{card.number || "0000 0000 0000 0000"}</strong>
                  <div>
                    <span>
                      <small>NOME</small>
                      {card.name || "SEU NOME"}
                    </span>
                    <span>
                      <small>VALIDADE</small>
                      {card.expiry || "MM/AA"}
                    </span>
                  </div>
                </div>
                <div className="card-fields">
                  <input
                    required
                    value={card.number}
                    inputMode="numeric"
                    placeholder="Número do cartão"
                    onChange={(e) =>
                      setCard((c) => ({
                        ...c,
                        number: e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 16)
                          .replace(/(.{4})/g, "$1 ")
                          .trim(),
                      }))
                    }
                  />
                  <input
                    required
                    value={card.name}
                    placeholder="Nome impresso"
                    onChange={(e) =>
                      setCard((c) => ({
                        ...c,
                        name: e.target.value.toUpperCase(),
                      }))
                    }
                  />
                  <div>
                    <input
                      required
                      value={card.expiry}
                      placeholder="MM/AA"
                      onChange={(e) =>
                        setCard((c) => ({
                          ...c,
                          expiry: e.target.value.slice(0, 5),
                        }))
                      }
                    />
                    <input
                      required
                      value={card.cvv}
                      placeholder="CVV"
                      onChange={(e) =>
                        setCard((c) => ({
                          ...c,
                          cvv: e.target.value.replace(/\D/g, "").slice(0, 4),
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
        <section className="shopper-total">
          <span>
            Total ({1 + selectedBumpIds.length}{" "}
            {1 + selectedBumpIds.length === 1 ? "item" : "itens"})
          </span>
          <strong>{money(totalCents)}</strong>
        </section>
        <button className="shopper-submit" type="submit">
          {settings.button_text}
        </button>
        {submitState && <p className="public-submit-state">{submitState}</p>}
        <PaymentResult result={paymentResult} />
      </form>
    </div>
  );
}
function CheckoutEditor({ workspace, products = [], productImages = [] }) {
  const [settings, setSettings] = useState(defaultCheckout),
    [modules, setModules] = useState(defaultModules),
    [configId, setConfigId] = useState(),
    [status, setStatus] = useState("draft"),
    [saveState, setSaveState] = useState("Carregando..."),
    [uploading, setUploading] = useState("");
  const ready = useRef(false);
  useEffect(() => {
    supabase
      .from("checkout_configs")
      .select("*")
      .eq("workspace_id", workspace.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setConfigId(data.id);
          setSettings({ ...defaultCheckout, ...data.settings });
          setModules(mergeCheckoutModules(data.modules || []));
          setStatus(data.status);
        }
        ready.current = true;
        setSaveState("Alterações salvas");
      });
  }, [workspace.id]);
  useEffect(() => {
    if (!ready.current) return;
    setSaveState("Salvando...");
    const timer = setTimeout(async () => {
      const payload = {
        workspace_id: workspace.id,
        name: "Checkout principal",
        settings,
        modules,
        updated_at: new Date().toISOString(),
      };
      const result = configId
        ? await supabase
            .from("checkout_configs")
            .update(payload)
            .eq("id", configId)
            .select()
            .single()
        : await supabase
            .from("checkout_configs")
            .insert(payload)
            .select()
            .single();
      if (result.data && !configId) setConfigId(result.data.id);
      setSaveState(result.error ? "Erro ao salvar" : "Alterações salvas");
    }, 450);
    return () => clearTimeout(timer);
  }, [settings, modules]);
  const change = (key, value) => setSettings((s) => ({ ...s, [key]: value }));
  const selectedOrderBumpIds = settings.order_bump_product_ids || [];
  const activeOrderBumpProducts = products.filter(
    (product) => product.status === "active",
  );
  const availableShippingOptions = (settings.shipping_options || []).filter(
    (option) => option.active !== false,
  );
  const selectedShippingOptionIds = settings.checkout_shipping_option_ids || [];
  const toggleOrderBumpProduct = (productId) => {
    const selected = selectedOrderBumpIds.includes(productId);
    if (!selected && selectedOrderBumpIds.length >= 3) return;
    change(
      "order_bump_product_ids",
      selected
        ? selectedOrderBumpIds.filter((id) => id !== productId)
        : [...selectedOrderBumpIds, productId],
    );
  };
  const togglePaymentMethod = (method) => {
    const current = settings.payment_methods?.length
      ? settings.payment_methods
      : ["pix", "card", "boleto"];
    if (current.includes(method) && current.length === 1) {
      setSaveState("Mantenha ao menos uma forma de pagamento");
      return;
    }
    change(
      "payment_methods",
      current.includes(method)
        ? current.filter((item) => item !== method)
        : [...current, method],
    );
  };
  const toggleShippingOption = (optionId) => {
    change(
      "checkout_shipping_option_ids",
      selectedShippingOptionIds.includes(optionId)
        ? selectedShippingOptionIds.filter((id) => id !== optionId)
        : [...selectedShippingOptionIds, optionId],
    );
  };
  const uploadAsset = async (kind, file) => {
    if (!file) return;
    const allowed = ["image/png", "image/jpeg", "image/svg+xml"];
    const maxSize = kind === "logo" ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
    if (!allowed.includes(file.type)) {
      setSaveState("Use PNG, JPEG ou SVG");
      return;
    }
    if (file.size > maxSize) {
      setSaveState(
        kind === "logo" ? "Logo deve ter até 2 MB" : "Banner deve ter até 5 MB",
      );
      return;
    }
    setUploading(kind);
    const extension = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${workspace.id}/${kind}-${Date.now()}.${extension}`;
    const { error } = await supabase.storage
      .from("checkout-assets")
      .upload(path, file, { cacheControl: "3600", upsert: true });
    if (error) {
      setSaveState(`Erro no upload: ${error.message}`);
      setUploading("");
      return;
    }
    const { data } = supabase.storage
      .from("checkout-assets")
      .getPublicUrl(path);
    change(`${kind}_url`, data.publicUrl);
    setUploading("");
  };
  const toggle = (id) =>
    setModules((ms) =>
      ms.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m)),
    );
  const move = (index, dir) =>
    setModules((ms) => {
      const next = [...ms],
        to = index + dir;
      if (to < 0 || to >= next.length) return ms;
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });
  const publish = async () => {
    setSaveState("Publicando...");
    const payload = {
      workspace_id: workspace.id,
      name: "Checkout principal",
      settings,
      modules,
      status: "published",
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { data, error } = configId
      ? await supabase
          .from("checkout_configs")
          .update(payload)
          .eq("id", configId)
          .select()
          .single()
      : await supabase
          .from("checkout_configs")
          .insert(payload)
          .select()
          .single();
    if (data) {
      setConfigId(data.id);
      setStatus("published");
    }
    setSaveState(error ? "Erro ao publicar" : "Publicado");
  };
  return (
    <div className="checkout-editor page-enter">
      <div className="editor-top">
        <div>
          <span>EXPERIÊNCIA DE COMPRA</span>
          <h1>
            Editor de Checkout
            <i />
          </h1>
          <p>Monte uma experiência clara, rápida e focada em conversão.</p>
        </div>
        <div className="editor-status">
          <small>{saveState}</small>
          <em className={status}>
            {status === "published" ? "Publicado" : "Rascunho"}
          </em>
          <Button onClick={publish}>Publicar</Button>
        </div>
      </div>
      <div className="editor-workspace">
        <aside className="editor-controls">
          <section>
            <b>Templates</b>
            <small>Escolha a estrutura principal do checkout.</small>
            <div className="template-picker">
              {[
                ["maax", "Maax", "Checkout em etapas com resumo lateral"],
                [
                  "shopper",
                  "Shopper",
                  "Compra compacta inspirada em marketplaces",
                ],
              ].map(([id, name, description]) => (
                <button
                  type="button"
                  key={id}
                  className={settings.template === id ? "active" : ""}
                  onClick={() => change("template", id)}
                >
                  <span className={`template-thumb ${id}`}>
                    <i />
                    <i />
                    <i />
                  </span>
                  <span>
                    <b>{name}</b>
                    <small>{description}</small>
                  </span>
                  <CheckCircle />
                </button>
              ))}
            </div>
            {settings.template === "shopper" && (
              <div className="shopper-template-settings">
                <label>
                  Título do cabeçalho
                  <input
                    value={settings.shopper_header_title}
                    onChange={(e) =>
                      change("shopper_header_title", e.target.value)
                    }
                  />
                </label>
                <label>
                  Valor da proteção
                  <input
                    value={settings.shopper_protection_price}
                    inputMode="decimal"
                    onChange={(e) =>
                      change(
                        "shopper_protection_price",
                        e.target.value.replace(/[^0-9,]/g, ""),
                      )
                    }
                  />
                </label>
                <small>
                  A visibilidade das seções Shopper fica em “Blocos do
                  checkout”.
                </small>
              </div>
            )}
          </section>
          <section>
            <b>Marca e aparência</b>
            <label>
              Nome da marca
              <input
                value={settings.brand_name}
                onChange={(e) => change("brand_name", e.target.value)}
              />
            </label>
            <div className="asset-upload">
              <div className="asset-upload-head">
                <b>Logo do checkout</b>
                {settings.logo_url && (
                  <button onClick={() => change("logo_url", "")}>
                    Remover
                  </button>
                )}
              </div>
              <label className="upload-drop">
                <Package />
                <span>
                  {uploading === "logo" ? "Enviando..." : "Enviar logo"}
                </span>
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
                  onChange={(e) => uploadAsset("logo", e.target.files?.[0])}
                />
              </label>
              <small>
                Recomendado: <b>600 × 200 px</b> (proporção 3:1), PNG ou SVG com
                fundo transparente. Máximo de 2 MB.
              </small>
            </div>
            <div className="asset-upload">
              <div className="asset-upload-head">
                <b>Banner do checkout</b>
                {settings.banner_url && (
                  <button onClick={() => change("banner_url", "")}>
                    Remover
                  </button>
                )}
              </div>
              <label className="upload-drop">
                <Package />
                <span>
                  {uploading === "banner" ? "Enviando..." : "Enviar banner"}
                </span>
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
                  onChange={(e) => uploadAsset("banner", e.target.files?.[0])}
                />
              </label>
              <small>
                Recomendado: <b>1600 × 500 px</b>. Mantenha textos e elementos
                importantes nos 70% centrais. Máximo de 5 MB.
              </small>
            </div>
            <div className="editor-colors">
              <label>
                Cor principal
                <input
                  type="color"
                  value={settings.accent}
                  onChange={(e) => change("accent", e.target.value)}
                />
              </label>
              <label>
                Fundo
                <input
                  type="color"
                  value={settings.background}
                  onChange={(e) => change("background", e.target.value)}
                />
              </label>
            </div>
            <div className="editor-colors editor-colors-extended">
              {[
                ["surface", "Área do formulário"],
                ["secondary_surface", "Resumo do pedido"],
                ["text_color", "Texto principal"],
                ["muted_color", "Texto secundário"],
                ["input_background", "Fundo dos campos"],
                ["card_color", "Cartão virtual"],
                ["card_text_color", "Texto do cartão"],
              ].map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    type="color"
                    value={settings[key]}
                    onChange={(e) => change(key, e.target.value)}
                  />
                </label>
              ))}
            </div>
            <label>
              Raio dos elementos <span>{settings.radius}px</span>
              <input
                type="range"
                min="0"
                max="24"
                value={settings.radius}
                onChange={(e) => change("radius", Number(e.target.value))}
              />
            </label>
            <label>
              Texto do botão
              <input
                value={settings.button_text}
                onChange={(e) => change("button_text", e.target.value)}
              />
            </label>
            <label>
              Layout
              <select
                value={settings.layout}
                onChange={(e) => change("layout", e.target.value)}
              >
                <option value="split">Resumo lateral</option>
                <option value="compact">Coluna única</option>
              </select>
            </label>
          </section>
          <section className="order-bump-editor">
            <div className="order-bump-editor-head">
              <span>
                <b>Order bumps</b>
                <small>Ofertas opcionais exibidas antes do pagamento.</small>
              </span>
              <button
                type="button"
                className={settings.order_bump_enabled ? "toggle on" : "toggle"}
                onClick={() =>
                  change("order_bump_enabled", !settings.order_bump_enabled)
                }
                aria-label="Ativar order bumps"
              >
                <i />
              </button>
            </div>
            {settings.order_bump_enabled && (
              <div className="order-bump-editor-body">
                <label>
                  Título da oferta
                  <input
                    value={settings.order_bump_title}
                    maxLength="60"
                    onChange={(event) =>
                      change("order_bump_title", event.target.value)
                    }
                  />
                </label>
                <label>
                  Texto de apoio
                  <input
                    value={settings.order_bump_description}
                    maxLength="100"
                    onChange={(event) =>
                      change("order_bump_description", event.target.value)
                    }
                  />
                </label>
                <div className="order-bump-product-picker">
                  <div>
                    <b>Selecionar produtos</b>
                    <small>{selectedOrderBumpIds.length}/3 selecionados</small>
                  </div>
                  {activeOrderBumpProducts.length ? (
                    activeOrderBumpProducts.map((product) => {
                      const selected = selectedOrderBumpIds.includes(
                        product.id,
                      );
                      const cover = productImages
                        .filter((image) => image.product_id === product.id)
                        .sort(
                          (a, b) =>
                            Number(a.position || 0) - Number(b.position || 0),
                        )[0];
                      return (
                        <button
                          type="button"
                          className={selected ? "selected" : ""}
                          onClick={() => toggleOrderBumpProduct(product.id)}
                          disabled={
                            !selected && selectedOrderBumpIds.length >= 3
                          }
                          key={product.id}
                        >
                          <i>
                            {cover ? (
                              <img src={cover.url} alt="" />
                            ) : (
                              <Package />
                            )}
                          </i>
                          <span>
                            <b>{product.name}</b>
                            <small>{money(product.price_cents)}</small>
                          </span>
                          <CheckCircle />
                        </button>
                      );
                    })
                  ) : (
                    <p>
                      Cadastre e ative produtos para usá-los como order bump.
                    </p>
                  )}
                </div>
                <small className="order-bump-help">
                  Recomendação: use até 3 ofertas complementares para preservar
                  a conversão.
                </small>
              </div>
            )}
          </section>
          <section className="shipping-editor-section">
            <div className="shipping-editor-heading">
              <span>
                <b>Fretes do checkout</b>
                <small>
                  Selecione as opções que o cliente poderá escolher.
                </small>
              </span>
              <Truck />
            </div>
            {availableShippingOptions.length ? (
              <div className="shipping-editor-options">
                {availableShippingOptions.map((option) => {
                  const selected = selectedShippingOptionIds.includes(
                    option.id,
                  );
                  return (
                    <button
                      type="button"
                      className={selected ? "selected" : ""}
                      onClick={() => toggleShippingOption(option.id)}
                      key={option.id}
                    >
                      <i>
                        <Truck />
                      </i>
                      <span>
                        <b>{option.title || option.name}</b>
                        <small>
                          {option.description || `${option.name} · ${option.estimate}`}
                        </small>
                      </span>
                      <strong>
                        {Number(option.price_cents || 0)
                          ? money(option.price_cents)
                          : "Grátis"}
                      </strong>
                      <CheckCircle />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="shipping-editor-empty">
                <Truck />
                <span>
                  <b>Nenhum frete cadastrado</b>
                  <small>Crie opções na página Frete do menu lateral.</small>
                </span>
              </div>
            )}
          </section>
          <section>
            <b>Formas de pagamento</b>
            <small>Escolha uma ou combine diferentes opções.</small>
            <div className="payment-method-editor">
              {[
                ["pix", "Pix", "Aprovação imediata"],
                ["card", "Cartão", "Crédito à vista"],
                ["boleto", "Boleto", "Vencimento em 3 dias"],
              ].map(([id, label, detail]) => {
                const active = (
                  settings.payment_methods || defaultCheckout.payment_methods
                ).includes(id);
                return (
                  <button
                    type="button"
                    key={id}
                    className={active ? "active" : ""}
                    onClick={() => togglePaymentMethod(id)}
                  >
                    <span>
                      <b>{label}</b>
                      <small>{detail}</small>
                    </span>
                    <i />
                  </button>
                );
              })}
            </div>
          </section>
          <section>
            <b>Blocos do checkout</b>
            <small>Ative e organize os módulos.</small>
            <div className="module-list">
              {modules.map((m, i) => (
                <div className="module-item" key={m.id}>
                  <span>
                    <button onClick={() => move(i, -1)}>↑</button>
                    <button onClick={() => move(i, 1)}>↓</button>
                  </span>
                  <b>{m.label}</b>
                  <button
                    className={m.enabled ? "toggle on" : "toggle"}
                    onClick={() => toggle(m.id)}
                  >
                    <i />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </aside>
        <CheckoutPreview
          settings={settings}
          modules={modules}
          products={products}
          productImages={productImages}
        />
      </div>
    </div>
  );
}
function CheckoutPreview({ settings, modules, products, productImages }) {
  const [device, setDevice] = useState("desktop");
  const [previewPayment, setPreviewPayment] = useState("pix");
  const [selectedPreviewBumpIds, setSelectedPreviewBumpIds] = useState([]);
  const previewShippingOptions = (settings.shipping_options || []).filter(
    (option) =>
      option.active !== false &&
      (settings.checkout_shipping_option_ids || []).includes(option.id),
  );
  const [selectedPreviewShippingId, setSelectedPreviewShippingId] =
    useState("");
  useEffect(() => {
    if (
      !previewShippingOptions.some(
        (option) => option.id === selectedPreviewShippingId,
      )
    )
      setSelectedPreviewShippingId(previewShippingOptions[0]?.id || "");
  }, [settings.shipping_options, settings.checkout_shipping_option_ids]);
  const enabled = (id) => modules.find((m) => m.id === id)?.enabled;
  const previewMethods =
    settings.payment_methods || defaultCheckout.payment_methods;
  const activePreviewPayment = previewMethods.includes(previewPayment)
    ? previewPayment
    : previewMethods[0];
  const previewBumps = settings.order_bump_enabled
    ? products
        .filter((product) =>
          (settings.order_bump_product_ids || []).includes(product.id),
        )
        .map((product) => ({
          ...product,
          image_url: productImages
            .filter((image) => image.product_id === product.id)
            .sort(
              (a, b) => Number(a.position || 0) - Number(b.position || 0),
            )[0]?.url,
        }))
    : [];
  const togglePreviewBump = (productId) =>
    setSelectedPreviewBumpIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  const previewBumpTotal = previewBumps
    .filter((bump) => selectedPreviewBumpIds.includes(bump.id))
    .reduce((total, bump) => total + Number(bump.price_cents || 0), 0);
  const previewShippingTotal = Number(
    previewShippingOptions.find(
      (option) => option.id === selectedPreviewShippingId,
    )?.price_cents || 0,
  );
  if (settings.template === "shopper")
    return (
      <ShopperPreview
        settings={settings}
        modules={modules}
        products={products}
        productImages={productImages}
      />
    );
  return (
    <div
      className={`preview-stage preview-${device}`}
      style={{
        "--checkout-accent": settings.accent,
        "--checkout-bg": settings.background,
        "--checkout-surface": settings.surface,
        "--checkout-secondary": settings.secondary_surface,
        "--checkout-text": settings.text_color,
        "--checkout-muted": settings.muted_color,
        "--checkout-input": settings.input_background,
        "--checkout-card": settings.card_color,
        "--checkout-card-text": settings.card_text_color,
        "--checkout-radius": `${settings.radius}px`,
      }}
    >
      <div className="preview-toolbar">
        <span>
          <i /> Preview em tempo real
        </span>
        <div className="device-switch">
          <button
            className={device === "desktop" ? "active" : ""}
            onClick={() => setDevice("desktop")}
          >
            Desktop
          </button>
          <button
            className={device === "mobile" ? "active" : ""}
            onClick={() => setDevice("mobile")}
          >
            Mobile
          </button>
        </div>
      </div>
      <div className="preview-viewport">
        <div className={`checkout-canvas ${settings.layout}`}>
          {settings.banner_url && (
            <div className="checkout-banner">
              <img src={settings.banner_url} alt="Banner do checkout" />
            </div>
          )}
          <header>
            {settings.logo_url ? (
              <img
                className="checkout-logo"
                src={settings.logo_url}
                alt={settings.brand_name}
              />
            ) : (
              <strong>{settings.brand_name}</strong>
            )}
            {enabled("secure_badge") && (
              <span>
                <Bank /> Compra segura
              </span>
            )}
          </header>
          <main>
            <div className="checkout-form">
              {enabled("contact") && (
                <section>
                  <small>01</small>
                  <h3>Seus dados</h3>
                  <label>
                    E-mail
                    <input placeholder="voce@email.com" />
                  </label>
                  <div className="field-pair">
                    <label>
                      Nome
                      <input placeholder="Seu nome" />
                    </label>
                    <label>
                      CPF
                      <input placeholder="000.000.000-00" />
                    </label>
                  </div>
                </section>
              )}
              <ShippingSelector
                options={previewShippingOptions}
                selectedId={selectedPreviewShippingId}
                onSelect={setSelectedPreviewShippingId}
              />
              <OrderBumpBlock
                bumps={previewBumps}
                selectedIds={selectedPreviewBumpIds}
                onToggle={togglePreviewBump}
                settings={settings}
              />
              {enabled("payment") && (
                <section>
                  <small>02</small>
                  <h3>Pagamento</h3>
                  <div className="payment-choice">
                    {previewMethods.map((method) => (
                      <button
                        key={method}
                        className={
                          activePreviewPayment === method ? "selected" : ""
                        }
                        onClick={() => setPreviewPayment(method)}
                      >
                        {method === "pix"
                          ? "Pix"
                          : method === "card"
                            ? "Cartão"
                            : "Boleto"}
                        {method === "pix" && <em>Aprovação imediata</em>}
                      </button>
                    ))}
                  </div>
                  {activePreviewPayment === "card" && (
                    <div className="preview-virtual-card">
                      <div>
                        <span className="virtual-chip" />
                        <b>maax</b>
                      </div>
                      <strong>0000 0000 0000 0000</strong>
                      <small>SEU NOME&nbsp;&nbsp;&nbsp; MM/AA</small>
                    </div>
                  )}
                </section>
              )}
              {enabled("trust") && (
                <div className="checkout-trust">
                  <CheckCircle /> Seus dados estão protegidos e criptografados.
                </div>
              )}
              <button className="checkout-submit">
                {settings.button_text}
                <ArrowRight />
              </button>
            </div>
            {enabled("summary") && (
              <aside className="order-preview">
                <small>SEU PEDIDO</small>
                <div className="preview-product">
                  <i>
                    <Package />
                  </i>
                  <span>
                    <b>Produto digital</b>
                    <small>Acesso imediato</small>
                  </span>
                  <strong>R$ 197,00</strong>
                </div>
                {enabled("coupon") && (
                  <div className="coupon-preview">
                    <input placeholder="Cupom de desconto" />
                    <button>Aplicar</button>
                  </div>
                )}
                <div className="preview-total">
                  <span>Total</span>
                  <strong>
                    {money(19700 + previewBumpTotal + previewShippingTotal)}
                  </strong>
                </div>
                <p>
                  <CheckCircle /> Garantia de 7 dias
                </p>
              </aside>
            )}
          </main>
          <footer>Pagamento processado com segurança por Maax</footer>
        </div>
      </div>
    </div>
  );
}
function ShopperPreview({
  settings,
  modules,
  products = [],
  productImages = [],
}) {
  const [device, setDevice] = useState("mobile");
  const [protectionSelected, setProtectionSelected] = useState(false);
  const [selectedBumpIds, setSelectedBumpIds] = useState([]);
  const previewShippingOptions = (settings.shipping_options || []).filter(
    (option) =>
      option.active !== false &&
      (settings.checkout_shipping_option_ids || []).includes(option.id),
  );
  const [selectedShippingId, setSelectedShippingId] = useState("");
  useEffect(() => {
    if (
      !previewShippingOptions.some((option) => option.id === selectedShippingId)
    )
      setSelectedShippingId(previewShippingOptions[0]?.id || "");
  }, [settings.shipping_options, settings.checkout_shipping_option_ids]);
  const [payment, setPayment] = useState(
    (settings.payment_methods || defaultCheckout.payment_methods)[0],
  );
  const [card, setCard] = useState({
    number: "",
    name: "",
    expiry: "",
    cvv: "",
  });
  const enabled = (id) =>
    modules.find((module) => module.id === id)?.enabled !== false;
  const demoProduct = {
    name: "Produto da sua loja",
    description: "Descrição curta do produto",
    price_cents: 19700,
  };
  const protectionCents = brlToCents(settings.shopper_protection_price);
  const orderBumps = settings.order_bump_enabled
    ? products
        .filter((product) =>
          (settings.order_bump_product_ids || []).includes(product.id),
        )
        .map((product) => ({
          ...product,
          image_url: productImages
            .filter((image) => image.product_id === product.id)
            .sort(
              (a, b) => Number(a.position || 0) - Number(b.position || 0),
            )[0]?.url,
        }))
    : [];
  const toggleBump = (productId) =>
    setSelectedBumpIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  const bumpTotal = orderBumps
    .filter((bump) => selectedBumpIds.includes(bump.id))
    .reduce((total, bump) => total + Number(bump.price_cents || 0), 0);
  const shippingTotal = Number(
    previewShippingOptions.find((option) => option.id === selectedShippingId)
      ?.price_cents || 0,
  );
  if (settings.template === "shopper")
    return (
      <div className={`preview-stage preview-${device}`}>
        <div className="preview-toolbar">
          <span>
            <i /> Preview em tempo real
          </span>
          <div className="device-switch">
            <button
              className={device === "desktop" ? "active" : ""}
              onClick={() => setDevice("desktop")}
            >
              Desktop
            </button>
            <button
              className={device === "mobile" ? "active" : ""}
              onClick={() => setDevice("mobile")}
            >
              Mobile
            </button>
          </div>
        </div>
        <div className="shopper-live-preview">
          <ShopperCheckout
            preview
            product={demoProduct}
            images={[]}
            settings={settings}
            modules={modules}
            isPhysical
            paymentMethods={
              settings.payment_methods || defaultCheckout.payment_methods
            }
            payment={payment}
            setPayment={setPayment}
            card={card}
            setCard={setCard}
            submit={(event) => event.preventDefault()}
            submitState=""
            protectionSelected={protectionSelected}
            setProtectionSelected={setProtectionSelected}
            protectionCents={protectionCents}
            orderBumps={orderBumps}
            shippingOptions={previewShippingOptions}
            selectedShippingId={selectedShippingId}
            onSelectShipping={setSelectedShippingId}
            selectedBumpIds={selectedBumpIds}
            onToggleOrderBump={toggleBump}
            totalCents={
              demoProduct.price_cents +
              shippingTotal +
              (protectionSelected ? protectionCents : 0) +
              bumpTotal
            }
          />
        </div>
      </div>
    );
  return (
    <div
      className={`preview-stage preview-${device}`}
      style={{
        "--checkout-accent": settings.accent,
        "--checkout-text": settings.text_color,
        "--checkout-muted": settings.muted_color,
        "--shopper-bg": settings.background,
        "--shopper-surface": settings.surface,
        "--shopper-secondary": settings.secondary_surface,
      }}
    >
      <div className="preview-toolbar">
        <span>
          <i /> Preview em tempo real
        </span>
        <div className="device-switch">
          <button
            className={device === "desktop" ? "active" : ""}
            onClick={() => setDevice("desktop")}
          >
            Desktop
          </button>
          <button
            className={device === "mobile" ? "active" : ""}
            onClick={() => setDevice("mobile")}
          >
            Mobile
          </button>
        </div>
      </div>
      <div className="shopper-preview-wrap">
        <div className="shopper-preview">
          <header>
            <span>←</span>
            <b>{settings.shopper_header_title}</b>
            {enabled("secure_badge") ? <Bank /> : <i />}
          </header>
          <section>
            <div className="shopper-store-name">
              <span>
                <b>M</b>
              </span>
              <strong>{settings.brand_name}</strong>
            </div>
            <div className="shopper-product">
              <Package />
              <div>
                <b>Produto da sua loja</b>
                <small>Descrição curta do produto</small>
                <strong>R$ 197,00</strong>
              </div>
              <span>1 un.</span>
            </div>
          </section>
          <section className="shopper-options">
            {enabled("coupon") && (
              <label>
                <span>Cupom de desconto</span>
                <small>Inserir código ›</small>
              </label>
            )}
            {enabled("shopper_message") && (
              <label>
                <span>Mensagem para a loja</span>
                <small>Adicionar mensagem ›</small>
              </label>
            )}
            {enabled("shopper_invoice") && (
              <label>
                <span>CPF na nota fiscal</span>
                <small>Informar CPF ›</small>
              </label>
            )}
          </section>
          {enabled("shopper_shipping") && (
            <section className="shopper-shipping">
              <div>
                <b>Entrega</b>
                <small>Alterar ›</small>
              </div>
              <div className="shopper-shipping-card">
                <i />
                <span>
                  <b>Entrega padrão</b>
                  <small>{settings.shopper_shipping_estimate}</small>
                </span>
                <strong>Grátis</strong>
              </div>
            </section>
          )}
          <section className="shopper-total">
            <span>Total (1 item)</span>
            <strong>R$ 197,00</strong>
          </section>
          <button className="shopper-submit">{settings.button_text}</button>
        </div>
      </div>
    </div>
  );
}

function ProductEditor({
  workspace,
  product,
  productImages = [],
  onBack,
  onSaved,
}) {
  const [form, setForm] = useState(
    product
      ? {
          ...product,
          price: Number(product.price_cents || 0) / 100,
          compare_at_price:
            product.compare_at_price_cents == null
              ? ""
              : Number(product.compare_at_price_cents) / 100,
          cost:
            product.cost_cents == null ? "" : Number(product.cost_cents) / 100,
          tags: Array.isArray(product.tags) ? product.tags.join(", ") : "",
        }
      : {
          status: "active",
          billing_type: "one_time",
          track_inventory: false,
          product_type: "digital",
        },
  );
  const [images, setImages] = useState([]);
  const [savedImages, setSavedImages] = useState(productImages);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const previews = useMemo(
    () => images.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [images],
  );
  useEffect(
    () => () => previews.forEach((item) => URL.revokeObjectURL(item.url)),
    [previews],
  );
  const set = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  const addImages = (files) => {
    const incoming = Array.from(files || []).filter(
      (file) =>
        ["image/png", "image/jpeg", "image/webp"].includes(file.type) &&
        file.size <= 5 * 1024 * 1024,
    );
    setImages((current) =>
      [...current, ...incoming].slice(0, Math.max(0, 10 - savedImages.length)),
    );
  };
  const save = async (event) => {
    event.preventDefault();
    setError("");
    const price = Math.round(Number(form.price || 0) * 100);
    const compareAt = form.compare_at_price
      ? Math.round(Number(form.compare_at_price) * 100)
      : null;
    if (!form.name?.trim() || price < 0)
      return setError("Informe o título e um preço válido.");
    if (compareAt && compareAt <= price)
      return setError("O preço comparativo deve ser maior que o preço atual.");
    setSaving(true);
    const slug = (form.slug || form.name)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const payload = {
      workspace_id: workspace.id,
      name: form.name.trim(),
      slug,
      description: form.description || null,
      price_cents: price,
      compare_at_price_cents: compareAt,
      cost_cents: form.cost ? Math.round(Number(form.cost) * 100) : null,
      billing_type: form.billing_type,
      sku: form.sku || null,
      barcode: form.barcode || null,
      track_inventory: form.track_inventory,
      inventory_quantity: form.track_inventory
        ? Number(form.inventory_quantity || 0)
        : 0,
      product_type: form.product_type === "physical" ? "physical" : "digital",
      tags: form.tags
        ? form.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [],
      seo_title: form.seo_title || null,
      seo_description: form.seo_description || null,
      status: form.status,
    };
    const request = product
      ? supabase.from("products").update(payload).eq("id", product.id)
      : supabase.from("products").insert(payload);
    const { data: savedProduct, error: productError } = await request
      .select()
      .single();
    if (productError) {
      setSaving(false);
      setError(productError.message);
      return;
    }
    const uploaded = [];
    for (let index = 0; index < images.length; index += 1) {
      const file = images[index];
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${workspace.id}/${savedProduct.id}/${savedImages.length + index}-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(path, file, { cacheControl: "3600" });
      if (uploadError) continue;
      const { data } = supabase.storage
        .from("product-images")
        .getPublicUrl(path);
      uploaded.push({
        workspace_id: workspace.id,
        product_id: savedProduct.id,
        url: data.publicUrl,
        alt_text: form.name,
        position: savedImages.length + index,
      });
    }
    if (uploaded.length) await supabase.from("product_images").insert(uploaded);
    setSaving(false);
    await onSaved();
    onBack();
  };
  return (
    <form className="product-editor page-enter" onSubmit={save}>
      <div className="product-editor-top">
        <div>
          <button type="button" onClick={onBack}>
            ← Produtos
          </button>
          <h1>
            {product ? "Editar produto" : "Adicionar produto"}
            <i />
          </h1>
        </div>
        <div>
          <Button secondary onClick={onBack}>
            Descartar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar produto"}
          </Button>
        </div>
      </div>
      <div className="product-editor-grid">
        <div className="product-main-column">
          <section className="product-panel">
            <Field
              label="Título"
              value={form.name || ""}
              onChange={(e) => set("name", e.target.value)}
              required
            />
            <label className="data-field">
              Descrição
              <textarea
                rows="7"
                value={form.description || ""}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Descreva os benefícios, conteúdo e condições do produto"
              />
            </label>
          </section>
          <section className="product-panel">
            <div className="product-section-title">
              <b>Mídia</b>
              <span>{savedImages.length + images.length}/10 imagens</span>
            </div>
            <label className="product-media-drop">
              <Package />
              <b>Adicionar imagens</b>
              <small>PNG, JPEG ou WebP • até 5 MB por arquivo</small>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={(e) => addImages(e.target.files)}
              />
            </label>
            {(savedImages.length > 0 || previews.length > 0) && (
              <div className="product-gallery">
                {savedImages.map((item, index) => (
                  <div key={item.id} className={index === 0 ? "featured" : ""}>
                    <img src={item.url} alt={item.alt_text || form.name} />
                    <button
                      type="button"
                      aria-label="Remover imagem"
                      onClick={async () => {
                        const { error: imageError } = await supabase
                          .from("product_images")
                          .delete()
                          .eq("id", item.id);
                        if (imageError) return setError(imageError.message);
                        setSavedImages((current) =>
                          current.filter((image) => image.id !== item.id),
                        );
                      }}
                    >
                      <X />
                    </button>
                    {index === 0 && <span>Principal</span>}
                  </div>
                ))}
                {previews.map((item, index) => (
                  <div
                    key={item.url}
                    className={
                      !savedImages.length && index === 0 ? "featured" : ""
                    }
                  >
                    <img src={item.url} alt="Prévia do produto" />
                    <button
                      type="button"
                      onClick={() =>
                        setImages((current) =>
                          current.filter((_, i) => i !== index),
                        )
                      }
                    >
                      <X />
                    </button>
                    {!savedImages.length && index === 0 && (
                      <span>Principal</span>
                    )}
                  </div>
                ))}
              </div>
            )}
            <p className="product-media-help">
              Recomendado: imagens quadradas de <b>1200 × 1200 px</b>. A
              primeira imagem será a principal no checkout. Máximo de 10
              imagens.
            </p>
          </section>
          <section className="product-panel">
            <b>Preços</b>
            <div className="product-field-grid">
              <Field
                label="Preço"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0,00"
                value={form.price ?? ""}
                onChange={(e) => set("price", e.target.value)}
              />
              <Field
                label="Preço comparativo"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={form.compare_at_price ?? ""}
                onChange={(e) => set("compare_at_price", e.target.value)}
              />
              <Field
                label="Custo por item"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={form.cost ?? ""}
                onChange={(e) => set("cost", e.target.value)}
              />
              <label className="data-field">
                Tipo de cobrança
                <select
                  value={form.billing_type}
                  onChange={(e) => set("billing_type", e.target.value)}
                >
                  <option value="one_time">Pagamento único</option>
                  <option value="subscription">Assinatura</option>
                </select>
              </label>
            </div>
            <p className="panel-help">
              O preço comparativo aparece riscado no checkout e deve ser maior
              que o preço atual.
            </p>
          </section>
          <section className="product-panel">
            <b>Estoque e identificação</b>
            <div className="product-field-grid">
              <Field
                label="SKU"
                value={form.sku || ""}
                onChange={(e) => set("sku", e.target.value)}
              />
              <Field
                label="Código de barras"
                value={form.barcode || ""}
                onChange={(e) => set("barcode", e.target.value)}
              />
            </div>
            <label className="product-check">
              <input
                type="checkbox"
                checked={form.track_inventory}
                onChange={(e) => set("track_inventory", e.target.checked)}
              />
              Controlar quantidade disponível
            </label>
            {form.track_inventory && (
              <Field
                label="Quantidade"
                type="number"
                min="0"
                value={form.inventory_quantity || 0}
                onChange={(e) => set("inventory_quantity", e.target.value)}
              />
            )}
          </section>
          <section className="product-panel">
            <b>Listagem nos buscadores</b>
            <Field
              label="Título da página"
              maxLength="70"
              value={form.seo_title || ""}
              onChange={(e) => set("seo_title", e.target.value)}
            />
            <label className="data-field">
              Descrição para SEO
              <textarea
                rows="3"
                maxLength="320"
                value={form.seo_description || ""}
                onChange={(e) => set("seo_description", e.target.value)}
              />
            </label>
          </section>
        </div>
        <aside className="product-side-column">
          <section className="product-panel">
            <label className="data-field">
              Status
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
              >
                <option value="active">Ativo</option>
                <option value="draft">Rascunho</option>
              </select>
            </label>
          </section>
          <section className="product-panel">
            <b>Organização</b>
            <label className="data-field">
              Tipo de produto
              <select
                value={
                  ["physical", "fisico", "físico"].includes(
                    (form.product_type || "").toLowerCase(),
                  )
                    ? "physical"
                    : "digital"
                }
                onChange={(e) => set("product_type", e.target.value)}
              >
                <option value="digital">Digital</option>
                <option value="physical">Físico</option>
              </select>
              <small className="product-type-help">
                Produtos físicos solicitam endereço de entrega no checkout.
              </small>
            </label>
            <Field
              label="Tags"
              placeholder="curso, oferta, digital"
              value={form.tags || ""}
              onChange={(e) => set("tags", e.target.value)}
            />
          </section>
          <section className="product-panel">
            <b>Link do produto</b>
            <Field
              label="URL amigável"
              placeholder="meu-produto"
              value={form.slug || ""}
              onChange={(e) => set("slug", e.target.value)}
            />
            <p className="panel-help">
              Se ficar vazio, criaremos automaticamente a partir do título.
            </p>
          </section>
        </aside>
      </div>
      {error && <div className="product-error">{error}</div>}
    </form>
  );
}

const trackingPlatforms = [
  {
    id: "meta",
    name: "Meta",
    icon: "facebook",
    description: "Facebook e Instagram Ads",
    placeholder: "Ex.: 123456789012345",
  },
  {
    id: "google",
    name: "Google",
    icon: "google",
    description: "Google Ads e Google Analytics",
    placeholder: "Ex.: G-XXXXXXXXXX ou AW-XXXXXXXXX",
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: "music",
    description: "TikTok Ads Manager",
    placeholder: "Ex.: CXXXXXXXXXXXXXXX",
  },
];

function TrackingPage({ workspace, onReload }) {
  const [config, setConfig] = useState(null);
  const [pixels, setPixels] = useState({ meta: [], google: [], tiktok: [] });
  const [drafts, setDrafts] = useState({ meta: "", google: "", tiktok: "" });
  const [attributionEnabled, setAttributionEnabled] = useState(false);
  const [state, setState] = useState("Carregando...");

  useEffect(() => {
    let active = true;
    supabase
      .from("checkout_configs")
      .select("id,settings,modules,status")
      .eq("workspace_id", workspace.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setState(error.message);
          return;
        }
        setConfig(data);
        setPixels({
          meta: data?.settings?.tracking_pixels?.meta || [],
          google: data?.settings?.tracking_pixels?.google || [],
          tiktok: data?.settings?.tracking_pixels?.tiktok || [],
        });
        setAttributionEnabled(
          data?.settings?.campaign_attribution_enabled === true,
        );
        setState("");
      });
    return () => {
      active = false;
    };
  }, [workspace.id]);

  const persist = async (
    nextPixels,
    nextAttributionEnabled = attributionEnabled,
  ) => {
    setState("Salvando...");
    const settings = {
      ...defaultCheckout,
      ...(config?.settings || {}),
      tracking_pixels: nextPixels,
      campaign_attribution_enabled: nextAttributionEnabled,
    };
    const query = config?.id
      ? supabase
          .from("checkout_configs")
          .update({ settings })
          .eq("id", config.id)
      : supabase
          .from("checkout_configs")
          .insert({
            workspace_id: workspace.id,
            settings,
            modules: defaultModules,
            status: "draft",
          })
          .select("id,settings,modules,status")
          .single();
    const { data, error } = await query;
    if (error) {
      setState(error.message);
      return false;
    }
    if (data) setConfig(data);
    setPixels(nextPixels);
    setAttributionEnabled(nextAttributionEnabled);
    setState("Alterações salvas");
    onReload?.(false, true);
    setTimeout(() => setState(""), 2200);
    return true;
  };

  const addPixel = async (platform) => {
    const value = drafts[platform].trim();
    if (!value) return setState("Informe o ID do pixel");
    if (pixels[platform].some((item) => item.id === value))
      return setState("Este pixel já está cadastrado");
    const next = {
      ...pixels,
      [platform]: [
        ...pixels[platform],
        { id: value, created_at: new Date().toISOString() },
      ],
    };
    if (await persist(next))
      setDrafts((current) => ({ ...current, [platform]: "" }));
  };

  const removePixel = (platform, id) =>
    persist({
      ...pixels,
      [platform]: pixels[platform].filter((item) => item.id !== id),
    });

  const toggleAttribution = () => persist(pixels, !attributionEnabled);

  const totalPixels = Object.values(pixels).reduce(
    (total, platformPixels) => total + platformPixels.length,
    0,
  );

  return (
    <div className="page-enter tracking-page">
      <PageTitle
        kicker="MARKETING"
        title="Rastreamento"
        description="Conecte seus canais de aquisição e acompanhe conversões reais do checkout."
      />
      <div className="tracking-note">
        <div className="tracking-note-copy">
          <span>CENTRAL DE EVENTOS</span>
          <h2>Dados limpos para decisões melhores.</h2>
          <p>
            Organize múltiplos pixels por canal. Cada configuração fica isolada
            neste negócio e recebe somente vendas confirmadas.
          </p>
        </div>
        <div className="tracking-note-stats">
          <div>
            <strong>{totalPixels}</strong>
            <span>Pixels conectados</span>
          </div>
          <div>
            <strong>Pago</strong>
            <span>Evento de conversão</span>
          </div>
        </div>
        <div className={`tracking-save-state ${state ? "visible" : ""}`}>
          <i /> {state || "Sincronizado"}
        </div>
      </div>
      <section className="attribution-control">
        <div className="attribution-control-icon">
          <Crosshair />
        </div>
        <div className="attribution-control-copy">
          <span>ATRIBUIÇÃO DE CAMPANHAS</span>
          <b>Conectar cada venda à origem correta</b>
          <p>
            Captura UTMs, origem, mídia, criativo e identificadores de clique
            usando primeiro e último toque por até 90 dias.
          </p>
        </div>
        <div className="attribution-control-action">
          <small>
            {attributionEnabled ? "Ativo neste negócio" : "Recurso opcional"}
          </small>
          <button
            type="button"
            role="switch"
            aria-checked={attributionEnabled}
            className={attributionEnabled ? "active" : ""}
            onClick={toggleAttribution}
          >
            <i />
          </button>
        </div>
      </section>
      <div className="tracking-grid">
        {trackingPlatforms.map((platform, index) => (
          <section
            className={`tracking-card tracking-${platform.id}`}
            key={platform.id}
          >
            <header>
              <div className="tracking-brand">
                <span>
                  <iconsax-icon
                    name={platform.icon}
                    type="bold"
                    size="22"
                    color="currentColor"
                  />
                </span>
                <div>
                  <em>0{index + 1} · CANAL</em>
                  <b>{platform.name}</b>
                  <small>{platform.description}</small>
                </div>
              </div>
              <div className="tracking-card-count">
                <i /> {pixels[platform.id].length} ativos
              </div>
            </header>
            <div className="tracking-add">
              <label>
                Identificador do pixel
                <input
                  value={drafts[platform.id]}
                  placeholder={platform.placeholder}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [platform.id]: event.target.value,
                    }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") addPixel(platform.id);
                  }}
                />
              </label>
              <button onClick={() => addPixel(platform.id)}>
                <Plus /> Conectar pixel
              </button>
            </div>
            <div className="tracking-list">
              {pixels[platform.id].length ? (
                pixels[platform.id].map((pixel) => (
                  <div key={pixel.id}>
                    <i />
                    <span>
                      <b>{pixel.id}</b>
                      <small>Configurado em {date(pixel.created_at)}</small>
                    </span>
                    <button
                      title="Remover pixel"
                      onClick={() => removePixel(platform.id, pixel.id)}
                    >
                      <Trash />
                    </button>
                  </div>
                ))
              ) : (
                <p>
                  <Crosshair />
                  <span>
                    <b>Nenhum pixel conectado</b>
                    <small>Adicione um identificador para começar.</small>
                  </span>
                </p>
              )}
            </div>
          </section>
        ))}
      </div>
      <div className="tracking-assurance">
        <CheckCircle />
        <div>
          <b>Conversões protegidas contra eventos falsos</b>
          <span>
            Os pixels recebem a conversão somente depois que o gateway confirma
            o pagamento do pedido.
          </span>
        </div>
        <small>SERVER-SIDE</small>
      </div>
    </div>
  );
}

function SubscriptionPlansPreview({ revenue }) {
  const plans = [
    {
      name: "Essencial",
      range: "Até R$ 10 mil/mês",
      description:
        "Para operações que estão começando a faturar pelo checkout.",
      features: [
        "Checkout completo",
        "Pix, cartão e boleto",
        "Painel de vendas",
      ],
    },
    {
      name: "Crescimento",
      range: "De R$ 10 mil a R$ 50 mil/mês",
      description: "Para operações com volume recorrente e mais controle.",
      features: [
        "Tudo do Essencial",
        "Rastreamento avançado",
        "Suporte prioritário",
      ],
      featured: true,
    },
    {
      name: "Escala",
      range: "Acima de R$ 50 mil/mês",
      description: "Condições preparadas para operações de maior volume.",
      features: [
        "Tudo do Crescimento",
        "Condições personalizadas",
        "Acompanhamento dedicado",
      ],
    },
  ];
  return (
    <div className="page-enter">
      <PageTitle
        kicker="PLANOS"
        title="Assinaturas"
        description="Planos futuros definidos pelo faturamento pago no checkout."
      />
      <section className="plans-showcase">
        <div className="plans-preview-note">
          <div>
            <span>
              <i /> Prévia não ativa
            </span>
            <h2>Um plano que acompanha o seu volume.</h2>
          </div>
          <p>
            Faturamento pago atual <b>{money(revenue)}</b>
            <small>Nenhuma mensalidade será cobrada nesta fase.</small>
          </p>
        </div>
        <div className="subscription-plan-grid">
          {plans.map((plan, index) => (
            <article
              className={`subscription-plan ${plan.featured ? "featured" : ""}`}
              key={plan.name}
            >
              <header>
                <span>0{index + 1}</span>
                <small>Em breve</small>
              </header>
              {plan.featured && <em>MAIS INDICADO</em>}
              <h2>{plan.name}</h2>
              <strong>{plan.range}</strong>
              <p>{plan.description}</p>
              <div className="plan-price-placeholder">
                <b>Valor em definição</b>
                <small>mensalidade ainda não configurada</small>
              </div>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <CheckCircle /> {feature}
                  </li>
                ))}
              </ul>
              <button type="button" disabled>
                Indisponível no momento
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function CustomersView({ customers = [], orders = [] }) {
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const rows = useMemo(
    () =>
      customers
        .map((customer) => {
          const customerOrders = orders.filter(
            (order) => order.customer_id === customer.id,
          );
          const approvedOrders = customerOrders.filter(
            (order) => order.status === "approved",
          );
          const latestOrder = [...customerOrders].sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at),
          )[0];
          return {
            ...customer,
            orders: customerOrders.length,
            approvedOrders: approvedOrders.length,
            paid: approvedOrders.length > 0,
            paidCents: approvedOrders.reduce(
              (total, order) => total + Number(order.total_cents || 0),
              0,
            ),
            latestOrderAt: latestOrder?.created_at || customer.created_at,
          };
        })
        .filter((customer) => customer.orders > 0)
        .sort((a, b) => new Date(b.latestOrderAt) - new Date(a.latestOrderAt)),
    [customers, orders],
  );
  const filteredRows = rows.filter((customer) =>
    filter === "all"
      ? true
      : filter === "paid"
        ? customer.paid
        : !customer.paid,
  );
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const visibleRows = filteredRows.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );
  useEffect(() => setPage(1), [filter]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <div className="page-enter">
      <PageTitle
        kicker="RELACIONAMENTO"
        title="Clientes"
        description="Compradores com pedidos pagos e pagamentos pendentes."
      />
      <section className="resource-table customer-resource">
        <div className="resource-head customer-head">
          <div>
            <span>REGISTROS</span>
            <h2>Clientes</h2>
          </div>
          <div
            className="customer-filters"
            role="group"
            aria-label="Filtrar clientes"
          >
            {[
              ["all", "Todos"],
              ["paid", "Pagos"],
              ["unpaid", "Não pagos"],
            ].map(([id, label]) => (
              <button
                type="button"
                className={filter === id ? "active" : ""}
                onClick={() => setFilter(id)}
                key={id}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {visibleRows.length ? (
          <div className="customer-table-wrap">
            <div className="customer-table">
              <div className="customer-row customer-th">
                <span>Cliente</span>
                <span>Contato</span>
                <span>Pedidos</span>
                <span>Total pago</span>
                <span>Situação</span>
                <span>Último pedido</span>
              </div>
              {visibleRows.map((customer) => (
                <div className="customer-row" key={customer.id}>
                  <span className="customer-identity">
                    <i>{customer.name.slice(0, 1).toUpperCase()}</i>
                    <b>{customer.name}</b>
                  </span>
                  <span>
                    <b>{customer.email}</b>
                    <small>{customer.phone || "Telefone não informado"}</small>
                  </span>
                  <span>
                    <b>{customer.orders}</b>
                    <small>{customer.approvedOrders} pagos</small>
                  </span>
                  <span>
                    <b>{money(customer.paidCents)}</b>
                  </span>
                  <span>
                    <em className={customer.paid ? "paid" : "unpaid"}>
                      {customer.paid ? "Pago" : "Não pago"}
                    </em>
                  </span>
                  <span>{date(customer.latestOrderAt)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <Empty type="clientes" />
        )}
        <footer className="customer-pagination">
          <span>
            {filteredRows.length
              ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filteredRows.length)} de ${filteredRows.length}`
              : "0 clientes"}
          </span>
          <div>
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((current) => current - 1)}
              aria-label="Página anterior"
            >
              <CaretLeft />
            </button>
            <b>
              {page} / {totalPages}
            </b>
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage((current) => current + 1)}
              aria-label="Próxima página"
            >
              <CaretRight />
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function DomainPage({ workspace }) {
  const [domain, setDomain] = useState(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [copied, setCopied] = useState("");

  const request = async (options = {}) => {
    const { data } = await supabase.auth.getSession();
    const response = await fetch(
      `/api/domains/config${options.method ? "" : `?workspaceId=${workspace.id}`}`,
      {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session?.access_token}`,
          ...options.headers,
        },
      },
    );
    const result = await response.json().catch(() => ({}));
    if (!response.ok)
      throw Object.assign(
        new Error(result.error || "Não foi possível configurar o domínio."),
        { code: result.code },
      );
    return result;
  };

  const loadDomain = async () => {
    setLoading(true);
    setFeedback({ type: "", message: "" });
    try {
      const result = await request();
      setDomain(result.domain || null);
      setDraft(result.domain?.hostname || "");
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadDomain();
  }, [workspace.id]);

  const connect = async () => {
    setBusy("add");
    setFeedback({ type: "", message: "" });
    try {
      const result = await request({
        method: "POST",
        body: JSON.stringify({
          workspaceId: workspace.id,
          action: "add",
          domain: draft,
        }),
      });
      setDomain(result.domain);
      setDraft(result.domain.hostname);
      setFeedback({
        type: "success",
        message: result.domain.verified
          ? "Domínio conectado e pronto para uso."
          : "Domínio adicionado. Configure o DNS indicado abaixo.",
      });
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    } finally {
      setBusy("");
    }
  };
  const verify = async () => {
    setBusy("verify");
    setFeedback({ type: "", message: "" });
    try {
      const result = await request({
        method: "POST",
        body: JSON.stringify({
          workspaceId: workspace.id,
          action: "verify",
          domain: domain?.hostname,
        }),
      });
      setDomain(result.domain);
      setFeedback({
        type: result.domain.verified ? "success" : "warning",
        message: result.domain.verified
          ? "Conexão confirmada. O SSL será emitido automaticamente."
          : "O DNS ainda não propagou. Aguarde alguns minutos e teste novamente.",
      });
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    } finally {
      setBusy("");
    }
  };
  const remove = async () => {
    if (!window.confirm("Remover este domínio dos checkouts públicos?")) return;
    setBusy("remove");
    try {
      await request({
        method: "DELETE",
        body: JSON.stringify({ workspaceId: workspace.id }),
      });
      setDomain(null);
      setDraft("");
      setFeedback({ type: "success", message: "Domínio removido." });
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    } finally {
      setBusy("");
    }
  };
  const copyValue = async (key, value) => {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(""), 1600);
  };
  const dns = domain?.dns;

  return (
    <div className="domain-page page-enter">
      <PageTitle
        kicker="IDENTIDADE DIGITAL"
        title="Domínio"
        description="Use seu próprio endereço nos checkouts públicos deste negócio."
      />
      <section className="domain-hero">
        <div className="domain-hero-copy">
          <span>DOMÍNIO DO CHECKOUT</span>
          <h2>Seu endereço. A estrutura da Maax.</h2>
          <p>
            O domínio personalizado funciona apenas nas páginas públicas de
            checkout. O painel administrativo continua seguro em
            maaxcheckout.vercel.app.
          </p>
          <div className="domain-boundaries">
            <span><CheckCircle /> Checkout público personalizado</span>
            <span><CheckCircle /> Plataforma Maax preservada</span>
            <span><CheckCircle /> SSL automático após a validação</span>
          </div>
        </div>
        <div className="domain-address-preview">
          <small>SEU LINK PÚBLICO</small>
          <div>
            <GlobeSimple />
            <span>
              <b>{domain?.verified ? domain.hostname : "checkout.sualoja.com"}</b>
              <small>/checkout/seu-produto</small>
            </span>
          </div>
          <em className={domain?.verified ? "verified" : ""}>
            <i /> {domain?.verified ? "Conectado" : "Aguardando conexão"}
          </em>
        </div>
      </section>

      <div className="domain-layout">
        <section className="domain-config-card">
          <header>
            <div>
              <span>CONFIGURAÇÃO</span>
              <h2>Conectar domínio</h2>
            </div>
            {domain && (
              <em className={domain.verified ? "verified" : "pending"}>
                {domain.verified ? "Ativo" : "DNS pendente"}
              </em>
            )}
          </header>
          {loading ? (
            <div className="domain-skeleton"><i /><i /><i /></div>
          ) : (
            <>
              <label className="domain-input-label">
                Domínio ou subdomínio
                <div>
                  <GlobeSimple />
                  <input
                    value={draft}
                    disabled={Boolean(domain)}
                    placeholder="checkout.sualoja.com"
                    autoCapitalize="none"
                    autoCorrect="off"
                    onChange={(event) => setDraft(event.target.value)}
                  />
                </div>
                <small>
                  Recomendado: use um subdomínio como checkout.sualoja.com.
                </small>
              </label>
              {!domain ? (
                <Button onClick={connect} disabled={busy === "add" || !draft.trim()}>
                  {busy === "add" ? "Conectando..." : "Adicionar domínio"}
                  <ArrowRight />
                </Button>
              ) : (
                <div className="domain-actions">
                  <Button onClick={verify} disabled={Boolean(busy)}>
                    {busy === "verify" ? "Testando..." : "Testar conexão"}
                  </Button>
                  <Button secondary onClick={remove} disabled={Boolean(busy)}>
                    <Trash /> Remover domínio
                  </Button>
                </div>
              )}
              {feedback.message && (
                <div className={`domain-feedback ${feedback.type}`}>
                  {feedback.type === "success" ? <CheckCircle /> : <WarningCircle />}
                  {feedback.message}
                </div>
              )}
              {domain && dns && (
                <div className="dns-record">
                  <div className="dns-record-title">
                    <span>
                      <b>Registro necessário no provedor</b>
                      <small>
                        {dns.ownershipRequired
                          ? "Validação de propriedade solicitada pela Vercel"
                          : "Copie estes dados exatamente como aparecem"}
                      </small>
                    </span>
                    <em>{dns.type}</em>
                  </div>
                  {[["Nome / Host", dns.name, "name"], ["Valor / Destino", dns.value, "value"]].map(
                    ([label, value, key]) => (
                      <div className="dns-value" key={key}>
                        <span><small>{label}</small><b>{value}</b></span>
                        <button onClick={() => copyValue(key, value)}>
                          {copied === key ? <CheckCircle /> : <Copy />}
                          {copied === key ? "Copiado" : "Copiar"}
                        </button>
                      </div>
                    ),
                  )}
                  <small className="dns-ttl">TTL recomendado: Automático ou 300 segundos.</small>
                </div>
              )}
            </>
          )}
        </section>

        <aside className="domain-tutorial">
          <header>
            <span>GUIA RÁPIDO</span>
            <h2>Do provedor até a Maax</h2>
            <p>O processo costuma levar poucos minutos.</p>
          </header>
          <ol>
            <li>
              <i>01</i>
              <span><b>Na Maax</b><small>Digite o domínio acima e clique em “Adicionar domínio”.</small></span>
            </li>
            <li>
              <i>02</i>
              <span><b>No seu provedor</b><small>Abra a área DNS do domínio e escolha “Adicionar registro”.</small></span>
            </li>
            <li>
              <i>03</i>
              <span><b>Copie sem alterar</b><small>Informe o Tipo, Nome e Valor exibidos pela Maax. Remova registros conflitantes.</small></span>
            </li>
            <li>
              <i>04</i>
              <span><b>Volte para testar</b><small>Salve no provedor e clique em “Testar conexão”. A propagação pode levar até 48 horas.</small></span>
            </li>
          </ol>
          <div className="domain-provider-note">
            <WarningCircle />
            <span>
              <b>Cloudflare, Registro.br, GoDaddy ou Hostinger</b>
              <small>Use sempre a seção DNS. No Cloudflare, deixe o proxy desativado durante a primeira validação.</small>
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ShippingPage({ workspace }) {
  const [configId, setConfigId] = useState(null);
  const [settings, setSettings] = useState(defaultCheckout);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    supabase
      .from("checkout_configs")
      .select("id,settings")
      .eq("workspace_id", workspace.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (data) {
          setConfigId(data.id);
          setSettings({ ...defaultCheckout, ...(data.settings || {}) });
        }
        setMessage(error ? error.message : "");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [workspace.id]);

  const options = settings.shipping_options || [];
  const updateOption = (id, key, value) =>
    setSettings((current) => ({
      ...current,
      shipping_options: (current.shipping_options || []).map((option) =>
        option.id === id ? { ...option, [key]: value } : option,
      ),
    }));
  const addOption = () => {
    if (options.length >= 3) return;
    setSettings((current) => ({
      ...current,
      shipping_options: [
        ...(current.shipping_options || []),
        {
          id: crypto.randomUUID(),
          title: "Entrega padrão",
          description: "Envio seguro com acompanhamento até a entrega.",
          name: "Entrega padrão",
          estimate: "Receba em até 6 dias úteis",
          price_cents: 0,
          active: true,
        },
      ],
    }));
  };
  const removeOption = (id) =>
    setSettings((current) => ({
      ...current,
      shipping_options: (current.shipping_options || []).filter(
        (option) => option.id !== id,
      ),
      checkout_shipping_option_ids: (
        current.checkout_shipping_option_ids || []
      ).filter((optionId) => optionId !== id),
    }));
  const save = async () => {
    setSaving(true);
    setMessage("");
    const normalizedSettings = {
      ...settings,
      shipping_options: options.map((option) => ({
        ...option,
        title: String(option.title || option.name || "").trim(),
        description: String(option.description || "").trim(),
        name: String(option.name || "").trim(),
        estimate: String(option.estimate || "").trim(),
        price_cents: Math.max(0, Number(option.price_cents || 0)),
      })),
    };
    if (
      normalizedSettings.shipping_options.some(
        (option) =>
          !option.title ||
          !option.description ||
          !option.name ||
          !option.estimate,
      )
    ) {
      setMessage("Preencha título, descrição, forma de envio e prazo.");
      setSaving(false);
      return;
    }
    const payload = {
      workspace_id: workspace.id,
      name: "Checkout principal",
      settings: normalizedSettings,
      updated_at: new Date().toISOString(),
    };
    const result = configId
      ? await supabase
          .from("checkout_configs")
          .update(payload)
          .eq("id", configId)
          .select("id")
          .single()
      : await supabase
          .from("checkout_configs")
          .insert({ ...payload, modules: defaultModules })
          .select("id")
          .single();
    if (result.data?.id) setConfigId(result.data.id);
    if (!result.error) setSettings(normalizedSettings);
    setMessage(result.error ? result.error.message : "Opções de frete salvas.");
    setSaving(false);
  };

  if (loading)
    return (
      <div className="shipping-page-loading">Carregando opções de frete...</div>
    );
  return (
    <div className="shipping-page page-enter">
      <PageTitle
        kicker="LOGÍSTICA"
        title="Frete"
        description="Configure até três formas de entrega para usar nos seus checkouts."
        action={options.length < 3 ? "Nova opção" : null}
        onAction={addOption}
      />
      <section className="shipping-manager">
        <header>
          <div>
            <span>OPÇÕES DE ENTREGA</span>
            <h2>Como seus pedidos chegam ao cliente</h2>
            <p>
              O valor selecionado será validado no servidor e somado à cobrança.
            </p>
          </div>
          <em>{options.length}/3</em>
        </header>
        {options.length ? (
          <div className="shipping-option-grid">
            {options.map((option, index) => (
              <article className="shipping-option-card" key={option.id}>
                <div className="shipping-option-card-head">
                  <i>
                    <Truck />
                  </i>
                  <span>
                    <small>OPÇÃO {String(index + 1).padStart(2, "0")}</small>
                    <b>{option.title || option.name || "Nova entrega"}</b>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeOption(option.id)}
                    className="shipping-delete"
                    aria-label={`Excluir ${option.title || option.name}`}
                  >
                    <Trash />
                    Excluir
                  </button>
                </div>
                <label>
                  Título do frete
                  <input
                    value={option.title ?? option.name ?? ""}
                    maxLength="48"
                    placeholder="Ex.: Entrega econômica"
                    onChange={(event) =>
                      updateOption(option.id, "title", event.target.value)
                    }
                  />
                </label>
                <label>
                  Descrição
                  <textarea
                    value={option.description || ""}
                    maxLength="140"
                    rows="3"
                    placeholder="Explique ao cliente como funciona esta entrega."
                    onChange={(event) =>
                      updateOption(option.id, "description", event.target.value)
                    }
                  />
                  <small>{String(option.description || "").length}/140 caracteres</small>
                </label>
                <label>
                  Forma de envio
                  <input
                    value={option.name}
                    maxLength="48"
                    placeholder="Ex.: Entrega expressa"
                    onChange={(event) =>
                      updateOption(option.id, "name", event.target.value)
                    }
                  />
                </label>
                <label>
                  Prazo informado ao cliente
                  <input
                    value={option.estimate}
                    maxLength="80"
                    placeholder="Ex.: Receba em até 3 dias úteis"
                    onChange={(event) =>
                      updateOption(option.id, "estimate", event.target.value)
                    }
                  />
                </label>
                <label>
                  Valor do frete
                  <div className="shipping-price-input">
                    <span>R$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={Number(option.price_cents || 0) / 100}
                      onChange={(event) =>
                        updateOption(
                          option.id,
                          "price_cents",
                          Math.max(
                            0,
                            Math.round(Number(event.target.value || 0) * 100),
                          ),
                        )
                      }
                    />
                  </div>
                  <small>Use R$ 0,00 para oferecer frete grátis.</small>
                </label>
              </article>
            ))}
          </div>
        ) : (
          <div className="shipping-empty">
            <i>
              <Truck />
            </i>
            <h3>Nenhuma opção de frete</h3>
            <p>
              Crie a primeira forma de entrega para disponibilizá-la no editor.
            </p>
            <Button onClick={addOption}>
              <Plus /> Criar opção
            </Button>
          </div>
        )}
        <footer>
          <span className={message.includes("salvas") ? "success" : ""}>
            {message ||
              "As alterações só entram no checkout após serem salvas."}
          </span>
          <Button onClick={save} disabled={saving}>
            {saving ? "Salvando..." : "Salvar fretes"}
          </Button>
        </footer>
      </section>
    </div>
  );
}

function DataView({
  type,
  data,
  metrics,
  workspace,
  onAction,
  onNavigate,
  onReload,
}) {
  if (type === "product_new")
    return (
      <ProductEditor
        workspace={workspace}
        onBack={() => onNavigate("produtos")}
        onSaved={onReload}
      />
    );
  if (type.startsWith("product_edit:")) {
    const productId = type.split(":")[1];
    const product = data.products.find((item) => item.id === productId);
    if (!product) return <Empty type="produtos" />;
    return (
      <ProductEditor
        workspace={workspace}
        product={product}
        productImages={data.product_images.filter(
          (image) => image.product_id === product.id,
        )}
        onBack={() => onNavigate("produtos")}
        onSaved={onReload}
      />
    );
  }
  if (type === "checkout")
    return (
      <CheckoutEditor
        workspace={workspace}
        products={data.products}
        productImages={data.product_images}
      />
    );
  if (type === "tracking")
    return <TrackingPage workspace={workspace} onReload={onReload} />;
  if (type === "domains") return <DomainPage workspace={workspace} />;
  if (type === "shipping") return <ShippingPage workspace={workspace} />;
  if (type === "gateways") return <GatewayView workspace={workspace} />;
  if (type === "clientes")
    return <CustomersView customers={data.customers} orders={data.orders} />;
  if (type === "assinaturas")
    return <SubscriptionPlansPreview revenue={metrics.revenue} />;
  const config = {
    vendas: [
      "OPERAÇÃO",
      "Pedidos",
      "Pagamentos e pedidos registrados no checkout",
      null,
    ],
    produtos: [
      "CATÁLOGO",
      "Produtos",
      "Ofertas disponíveis para seus clientes",
      "Novo produto",
    ],
    links: [
      "CONVERSÃO",
      "Links de pagamento",
      "Links ativos para compartilhar e receber",
      "Criar link",
    ],
    gateways: [
      "PAGAMENTOS",
      "Gateways",
      "Provedores conectados para processar seus checkouts",
      "Cadastrar gateway",
    ],
    extrato: [
      "FINANCEIRO",
      "Extrato",
      "Movimentações financeiras do workspace",
      null,
    ],
    clientes: [
      "RELACIONAMENTO",
      "Clientes",
      "Pessoas que compram de você",
      "Adicionar cliente",
    ],
    assinaturas: [
      "RECORRÊNCIA",
      "Assinaturas",
      "Planos e cobranças recorrentes",
      null,
    ],
  }[type];
  let rows = [];
  if (type === "vendas")
    return (
      <div className="page-enter">
        <PageTitle
          kicker={config[0]}
          title={config[1]}
          description={config[2]}
        />
        <div className="sub-metrics">
          <Stat label="Faturamento" value={money(metrics.revenue)} />
          <Stat label="Aprovadas" value={metrics.approved} />
          <Stat label="Total de pedidos" value={data.orders.length} />
        </div>
        <section className="resource-table">
          {data.orders.length ? (
            <OrderRows rows={data.orders} />
          ) : (
            <Empty type={type} />
          )}
        </section>
      </div>
    );
  if (type === "produtos")
    rows = data.products.map((x) => [
      x.name,
      x.billing_type === "subscription" ? "Assinatura" : "Pagamento único",
      money(x.price_cents),
      labels[x.status] || x.status,
      date(x.created_at),
    ]);
  if (type === "links")
    rows = data.payment_links.map((x) => [
      x.title,
      `/${x.slug}`,
      money(x.amount_cents),
      String(x.visits || 0),
      x.active ? "Ativo" : "Pausado",
    ]);
  if (type === "clientes")
    rows = data.customers.map((x) => [
      x.name,
      x.email,
      x.phone || "—",
      date(x.created_at),
      "Ativo",
    ]);
  if (type === "assinaturas")
    rows = data.subscriptions.map((x) => [
      data.customers.find((c) => c.id === x.customer_id)?.name || "Cliente",
      data.products.find((p) => p.id === x.product_id)?.name || "Produto",
      money(x.amount_cents),
      date(x.current_period_end),
      labels[x.status] || x.status,
    ]);
  if (type === "extrato")
    rows = data.transactions.map((x) => [
      x.description || labels[x.type] || x.type,
      labels[x.type] || x.type,
      money(x.amount_cents),
      labels[x.status] || x.status,
      date(x.created_at),
    ]);
  if (type === "gateways")
    rows = data.payment_gateways.map((x) => [
      x.display_name,
      x.provider,
      x.environment === "production" ? "Produção" : "Sandbox",
      x.credentials_configured ? "Configurado" : "Configuração pendente",
      labels[x.status] || x.status,
    ]);
  return (
    <div className="page-enter">
      <PageTitle
        kicker={config[0]}
        title={config[1]}
        description={config[2]}
        action={config[3]}
        onAction={onAction}
      />
      <section className="resource-table">
        <div className="resource-head">
          <div>
            <span>REGISTROS</span>
            <h2>{config[1]}</h2>
          </div>
          <button className="filter-search" onClick={() => location.reload()}>
            <MagnifyingGlass /> Atualizar
          </button>
        </div>
        {type === "produtos" && data.products.length ? (
          <ProductRows
            products={data.products}
            productImages={data.product_images}
            checkoutOrigin={
              data.checkout_configs?.[0]?.settings?.custom_domain?.verified
                ? `https://${data.checkout_configs[0].settings.custom_domain.hostname}`
                : location.origin
            }
            onEdit={(product) => onNavigate(`product_edit:${product.id}`)}
            onReload={onReload}
          />
        ) : rows.length ? (
          <SimpleRows rows={rows} />
        ) : (
          <Empty type={type} />
        )}
      </section>
    </div>
  );
}
function ProductRows({
  products,
  productImages,
  checkoutOrigin = location.origin,
  onEdit,
  onReload,
}) {
  const [feedback, setFeedback] = useState("");
  const copyLink = async (product) => {
    const url = `${checkoutOrigin}/checkout/${product.slug}`;
    await navigator.clipboard.writeText(url);
    setFeedback(`Link de ${product.name} copiado.`);
    setTimeout(() => setFeedback(""), 2500);
  };
  const remove = async (product) => {
    if (
      !confirm(
        `Excluir o produto “${product.name}”? Esta ação não pode ser desfeita.`,
      )
    )
      return;
    const { error: imageError } = await supabase
      .from("product_images")
      .delete()
      .eq("product_id", product.id);
    if (imageError) return setFeedback(imageError.message);
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id);
    if (error) return setFeedback(error.message);
    await onReload();
    setFeedback("Produto excluído.");
  };
  return (
    <div className="generic-table product-table">
      <div className="generic-row generic-th">
        <span>Produto</span>
        <span>Tipo</span>
        <span>Preço</span>
        <span>Status</span>
        <span>Ações</span>
      </div>
      {products.map((product) => {
        const cover = productImages
          .filter((image) => image.product_id === product.id)
          .sort((a, b) => Number(a.position || 0) - Number(b.position || 0))[0];
        return (
          <div className="generic-row" key={product.id}>
            <span className="product-list-identity">
              <i className={`product-list-thumb${cover ? " has-image" : ""}`}>
                {cover ? (
                  <img src={cover.url} alt="" loading="lazy" />
                ) : (
                  <Package aria-hidden="true" />
                )}
              </i>
              <span>
                <b>{product.name}</b>
                <small>/{product.slug}</small>
              </span>
            </span>
            <span>
              {product.billing_type === "subscription"
                ? "Assinatura"
                : "Pagamento único"}
            </span>
            <span>{money(product.price_cents)}</span>
            <span>{labels[product.status] || product.status}</span>
            <span className="product-actions">
              <button
                type="button"
                onClick={() => copyLink(product)}
                aria-label={`Copiar link de ${product.name}`}
                title="Copiar link"
              >
                <Copy />
              </button>
              <button
                type="button"
                onClick={() => onEdit(product)}
                aria-label={`Editar ${product.name}`}
                title="Editar"
              >
                <PencilSimple />
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => remove(product)}
                aria-label={`Excluir ${product.name}`}
                title="Excluir"
              >
                <Trash />
              </button>
            </span>
          </div>
        );
      })}
      {feedback && (
        <div className="table-feedback" role="status">
          {feedback}
        </div>
      )}
    </div>
  );
}
function SimpleRows({ rows }) {
  return (
    <div className="generic-table">
      <div className="generic-row generic-th">
        <span>Nome</span>
        <span>Detalhe</span>
        <span>Valor / Contato</span>
        <span>Status / Data</span>
        <span>Situação</span>
      </div>
      {rows.map((row, i) => (
        <div className="generic-row" key={i}>
          {row.map((v, j) => (
            <span key={j}>{j === 0 ? <b>{v}</b> : v}</span>
          ))}
        </div>
      ))}
    </div>
  );
}
