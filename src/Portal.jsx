import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Bank,
  Bell,
  ChartLineUp,
  CheckCircle,
  Copy,
  CreditCard,
  CurrencyDollar,
  House,
  Link as LinkIcon,
  List,
  MagnifyingGlass,
  Package,
  PencilSimple,
  Plus,
  Receipt,
  SignOut,
  Sparkle,
  TrendUp,
  Trash,
  Users,
  Wallet,
  X,
} from "@phosphor-icons/react";
import { supabase, supabaseConfigured } from "./supabase";

const money = (cents = 0) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(cents) / 100,
  );
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

export function RealLogin({ navigate }) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/dashboard");
    });
  }, []);
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!supabaseConfigured) {
      setError("As variáveis do Supabase não estão configuradas.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      setError("E-mail ou senha inválidos.");
      return;
    }
    navigate("/dashboard");
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
        <form onSubmit={submit}>
          <span className="form-kicker">ACESSO ADMINISTRATIVO</span>
          <h2>Acesse sua conta</h2>
          <p>Use as credenciais cadastradas para continuar.</p>
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
              autoComplete="current-password"
            />
          </label>
          {error && <div className="form-error">{error}</div>}
          <Button type="submit" disabled={loading}>
            {loading ? (
              "Autenticando..."
            ) : (
              <>
                Entrar na plataforma <ArrowRight />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

const nav = [
  ["home", "Início", House],
  ["vendas", "Vendas", ChartLineUp],
  ["produtos", "Produtos", Package],
  ["links", "Links de pagamento", LinkIcon],
  ["gateways", "Gateways", Bank],
  ["checkout", "Checkout", CreditCard],
  ["extrato", "Extrato", Receipt],
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

function GatewayModal({ workspace, onClose, onSaved }) {
  const [form, setForm] = useState({ environment: "production" }),
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
          required
          onChange={(e) =>
            setForm((v) => ({ ...v, display_name: e.target.value }))
          }
        />
        <label className="data-field">
          Provedor
          <select
            required
            onChange={(e) =>
              setForm((v) => ({ ...v, provider: e.target.value }))
            }
          >
            <option value="">Selecione</option>
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
    }),
    [active, setActive] = useState("home"),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [menu, setMenu] = useState(false),
    [modal, setModal] = useState("");
  const load = async () => {
    setLoading(true);
    setError("");
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
      return;
    }
    setSession(session);
    const { data: spaces, error: spaceError } = await supabase
      .from("workspaces")
      .select("*")
      .order("created_at")
      .limit(1);
    if (spaceError || !spaces?.length) {
      setError(spaceError?.message || "Nenhum workspace foi encontrado.");
      setLoading(false);
      return;
    }
    const ws = spaces[0];
    setWorkspace(ws);
    const tables = [
      "products",
      "customers",
      "payment_links",
      "orders",
      "subscriptions",
      "transactions",
      "payment_gateways",
      "product_images",
    ];
    const results = await Promise.all(
      tables.map((t) =>
        supabase
          .from(t)
          .select("*")
          .eq("workspace_id", ws.id)
          .order("created_at", { ascending: false }),
      ),
    );
    const next = {};
    tables.forEach((t, i) => (next[t] = results[i].data || []));
    const failed = results.find((r) => r.error);
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
    return () => subscription.unsubscribe();
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
    return {
      revenue,
      approved: approved.length,
      customers: data.customers.length,
      balance: charges - debits,
    };
  }, [data]);
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
          <div className="search">
            <MagnifyingGlass />
            <input placeholder="Buscar na plataforma..." />
            <kbd>⌘ K</kbd>
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
      {modal && (
        <CreateModal
          type={modal}
          workspace={workspace}
          products={data.products}
          onClose={() => setModal("")}
          onSaved={load}
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
function Stat({ label, value, icon: Icon = TrendUp }) {
  return (
    <article>
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

function HomeView({ metrics, data, workspace, onNavigate }) {
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
        <div className="balance-actions">
          <Button onClick={() => onNavigate("gateways")}>
            Ver gateways <ArrowRight />
          </Button>
        </div>
      </section>
      <div className="metrics">
        <Stat
          label="Faturamento aprovado"
          value={money(metrics.revenue)}
          icon={CurrencyDollar}
        />
        <Stat
          label="Pedidos aprovados"
          value={metrics.approved}
          icon={CheckCircle}
        />
        <Stat
          label="Produtos ativos"
          value={data.products.filter((p) => p.status === "active").length}
          icon={Package}
        />
        <Stat
          label="Gateways ativos"
          value={
            data.payment_gateways.filter((g) => g.status === "active").length
          }
          icon={Bank}
        />
      </div>
      <section className="resource-table">
        <div className="resource-head">
          <div>
            <span>ATIVIDADE REAL</span>
            <h2>Últimas vendas</h2>
          </div>
        </div>
        {data.orders.length ? (
          <OrderRows rows={data.orders.slice(0, 6)} />
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
};
const defaultModules = [
  { id: "contact", label: "Dados de contato", enabled: true },
  { id: "payment", label: "Pagamento", enabled: true },
  { id: "trust", label: "Compra segura", enabled: true },
  { id: "summary", label: "Resumo do pedido", enabled: true },
  { id: "coupon", label: "Cupom de desconto", enabled: true },
];
export function PublicCheckout({ slug }) {
  const [state, setState] = useState({
    loading: true,
    product: null,
    images: [],
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
      setState({
        loading: false,
        product,
        images: imageResult.data || [],
        settings: {
          ...defaultCheckout,
          ...(configResult.data?.settings || {}),
        },
        modules: configResult.data?.modules?.length
          ? configResult.data.modules
          : defaultModules,
        error: "",
      });
    };
    loadCheckout();
    return () => {
      active = false;
    };
  }, [slug]);
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
  const { product, settings, modules, images } = state;
  const paymentMethods = settings.payment_methods?.length
    ? settings.payment_methods
    : ["pix"];
  const selectedPayment = paymentMethods.includes(payment)
    ? payment
    : paymentMethods[0];
  const enabled = (id) =>
    modules.find((module) => module.id === id)?.enabled !== false;
  const isPhysical = ["physical", "fisico", "físico"].includes(
    (product.product_type || "").toLowerCase(),
  );
  const submit = (event) => {
    event.preventDefault();
    setSubmitState("Processando pagamento...");
    setTimeout(
      () =>
        setSubmitState(
          "Conecte um gateway ativo para receber pagamentos neste checkout.",
        ),
      700,
    );
  };
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
        <span>
          <Bank /> Ambiente seguro
        </span>
      </header>
      <main className={settings.layout === "compact" ? "compact" : ""}>
        <form className="public-checkout-form" onSubmit={submit}>
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
                <input type="email" required placeholder="voce@email.com" />
              </label>
              <div className="field-pair">
                <label>
                  Nome
                  <input required placeholder="Seu nome" />
                </label>
                <label>
                  CPF
                  <input
                    required
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                  />
                </label>
              </div>
            </section>
          )}
          {isPhysical && (
            <section className="shipping-section">
              <span>02</span>
              <h2>Endereço de entrega</h2>
              <label>
                CEP
                <input
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
                    required
                    autoComplete="street-address"
                    placeholder="Rua ou avenida"
                  />
                </label>
                <label>
                  Número
                  <input required inputMode="numeric" placeholder="123" />
                </label>
              </div>
              <div className="shipping-address-grid city">
                <label>
                  Bairro
                  <input required placeholder="Seu bairro" />
                </label>
                <label>
                  Cidade
                  <input
                    required
                    autoComplete="address-level2"
                    placeholder="Sua cidade"
                  />
                </label>
                <label>
                  Estado
                  <select
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
                <input placeholder="Apartamento, bloco ou referência" />
              </label>
            </section>
          )}
          {enabled("payment") && (
            <section>
              <span>{isPhysical ? "03" : "02"}</span>
              <h2>Pagamento</h2>
              <div className="payment-choice">
                <button
                  type="button"
                  hidden={!paymentMethods.includes("pix")}
                  className={selectedPayment === "pix" ? "selected" : ""}
                  onClick={() => setPayment("pix")}
                >
                  Pix<em>Aprovação imediata</em>
                </button>
                <button
                  type="button"
                  hidden={!paymentMethods.includes("card")}
                  className={selectedPayment === "card" ? "selected" : ""}
                  onClick={() => setPayment("card")}
                >
                  Cartão
                </button>
                {paymentMethods.includes("boleto") && (
                  <button
                    type="button"
                    className={selectedPayment === "boleto" ? "selected" : ""}
                    onClick={() => setPayment("boleto")}
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
              <strong>{money(product.price_cents)}</strong>
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
function CheckoutEditor({ workspace }) {
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
          setModules(data.modules?.length ? data.modules : defaultModules);
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
        <CheckoutPreview settings={settings} modules={modules} />
      </div>
    </div>
  );
}
function CheckoutPreview({ settings, modules }) {
  const [device, setDevice] = useState("desktop");
  const [previewPayment, setPreviewPayment] = useState("pix");
  const enabled = (id) => modules.find((m) => m.id === id)?.enabled;
  const previewMethods =
    settings.payment_methods || defaultCheckout.payment_methods;
  const activePreviewPayment = previewMethods.includes(previewPayment)
    ? previewPayment
    : previewMethods[0];
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
            <span>
              <Bank /> Compra segura
            </span>
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
                  <strong>R$ 197,00</strong>
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
  if (type === "checkout") return <CheckoutEditor workspace={workspace} />;
  const config = {
    vendas: [
      "OPERAÇÃO",
      "Vendas",
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
function ProductRows({ products, onEdit, onReload }) {
  const [feedback, setFeedback] = useState("");
  const copyLink = async (product) => {
    const url = `${location.origin}/checkout/${product.slug}`;
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
      {products.map((product) => (
        <div className="generic-row" key={product.id}>
          <span>
            <b>{product.name}</b>
            <small>/{product.slug}</small>
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
      ))}
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
