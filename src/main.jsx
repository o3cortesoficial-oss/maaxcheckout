import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import 'iconsax';
import {
  ArrowRight, ArrowUpRight, Bank, Bell, ChartLineUp, Check, CheckCircle,
  Clock, Copy, CreditCard, CurrencyDollar, Eye, EyeSlash, House, Link as LinkIcon,
  List, LockKey, MagnifyingGlass, Package, Plus, Receipt, ShieldCheck, SignOut,
  Sparkle, TrendUp, Users, Wallet, X
} from '@phosphor-icons/react';
import './styles.css';
import { PublicCheckout, RealDashboard, RealLogin } from './Portal';

const PLATFORM_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  'maaxcheckout.lat',
  'www.maaxcheckout.lat',
  'maaxcheckout.vercel.app',
  'www.maaxcheckout.vercel.app',
]);
const currentHostname = window.location.hostname.toLowerCase();
const isPlatformHostname = PLATFORM_HOSTS.has(currentHostname) || currentHostname.endsWith('.vercel.app');
const isPublicCheckoutPath = /^\/checkout\/[^/]+\/?$/.test(window.location.pathname);

// A custom domain is only an address for a published checkout. The platform,
// login and dashboard remain exclusively under maaxcheckout.lat.
if (!isPlatformHostname && !isPublicCheckoutPath) {
  window.location.replace(`https://maaxcheckout.lat${window.location.pathname === '/' ? '' : '/'}${window.location.search}${window.location.hash}`);
}

const go = (path) => { window.history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo({top: 0, behavior: 'smooth'}); };

function Logo({light=false}) { return <button className={`logo ${light?'logo-light':''}`} onClick={()=>go('/')} aria-label="Ir para início">maa<span>x</span><i/></button> }
function Btn({children, variant='', onClick, type='button'}) { return <button type={type} onClick={onClick} className={`btn ${variant}`}>{children}</button> }

function CardArt({className='', tone='pink'}) {
  return <div className={`card-art ${tone} ${className}`}>
    <div className="card-brand">maax<i/></div><div className="chip"/><div className="contactless">)))</div>
    <div className="card-bottom"><span>•••• 2808</span><b>VISA</b></div>
  </div>
}

function HomePage() {
  return <div className="home-page">
    <section className="hero shell-dark">
      <nav><Logo light/><div className="nav-links"><a href="#recursos">Recursos</a><a href="#sobre">Sobre</a><a href="#como">Como funciona</a></div><Btn variant="nav-btn" onClick={()=>go('/login')}>Acessar plataforma</Btn></nav>
      <div className="hero-grid">
        <div className="hero-copy reveal"><span className="eyebrow dark"><i/> Checkout brasileiro, sem atrito</span><h1>Venda mais.<br/>Complica <em>menos.</em></h1><p>Crie checkouts que passam confiança, recebem via Pix e cartão e transformam visitas em receita.</p><div className="hero-actions"><Btn onClick={()=>go('/login')}>Começar agora <ArrowRight size={17}/></Btn><a href="#recursos">Ver como funciona</a></div></div>
        <div className="hero-visual" aria-label="Cartões Maax"><div className="orbit one"/><div className="orbit two"/><CardArt tone="mint" className="card-left"/><CardArt tone="pink" className="card-main"/><CardArt tone="gold" className="card-right"/><div className="live-pill"><span/><b>+R$ 247,80</b><small>Venda aprovada agora</small></div></div>
      </div>
      <div className="hero-proof"><div><ShieldCheck size={25}/><span><b>PCI DSS</b><small>Segurança em cada venda</small></span></div><div className="avatars"><i>LA</i><i>RM</i><i>CV</i><span><b>12 mil+</b><small>negócios vendendo</small></span></div><div className="scroll-note">Role para descobrir <ArrowRight size={14}/></div></div>
    </section>

    <main className="reference-flow">
      <section className="section reference-features" id="recursos">
        <div className="reference-feature-copy"><span className="eyebrow">Recursos</span><h2>O melhor checkout<br/>para vender mais.</h2><p>Uma estrutura completa para criar ofertas, reduzir atritos e acompanhar cada etapa da compra em tempo real.</p><div><Btn onClick={()=>go('/login')}>Começar agora</Btn><a href="#como">Ver como funciona</a></div></div>
        <div className="reference-feature-grid">
          <article><ShieldCheck/><b>Proteção</b><small>Pagamentos e dados protegidos</small></article>
          <article className="active"><ChartLineUp/><b>Rastreamento</b><small>Atribuição precisa de cada venda</small></article>
          <article><Package/><b>Flexibilidade</b><small>Produtos físicos e digitais</small></article>
          <article><Sparkle/><b>Facilidade</b><small>Checkout pronto sem código</small></article>
        </div>
      </section>

      <section className="section reference-about" id="sobre">
        <div><span className="eyebrow">Sobre a Maax</span><h2>Conheça uma nova<br/>forma de vender.</h2></div><p>A Maax conecta produto, checkout, pagamentos e rastreamento em uma operação clara, rápida e preparada para crescer.</p>
        <div className="reference-stats"><article><b>Tempo real</b><small>Eventos do checkout acompanhados ao vivo</small></article><article><b>3 meios</b><small>Pix, cartão e boleto configuráveis</small></article><article><b>10 imagens</b><small>Galeria completa em cada produto</small></article></div>
      </section>

      <section className="section reference-banner"><div><span className="eyebrow dark">Feito para conversão</span><h2>Seu checkout pronto<br/>para a próxima venda.</h2><Btn onClick={()=>go('/login')}>Criar minha conta</Btn></div><div className="reference-banner-art"><CardArt tone="pink"/><CardArt tone="mint"/><span className="banner-orbit"/></div></section>

      <section className="section reference-partners"><div className="section-heading"><div><span className="eyebrow">Ferramentas</span><h2>Controle cada detalhe<br/>da sua operação.</h2></div><p>Recursos próprios para identificar a origem das vendas, conferir divergências e tomar decisões usando dados reais.</p></div><div className="partner-grid">{['Auditoria de vendas','Origem da campanha','Eventos ao vivo','Editor visual','Calculadora de ROI','Links de pagamento','Domínio próprio','Fretes','Order bumps'].map((item)=><article key={item}>{item}</article>)}</div></section>

      <section className="section reference-strategy" id="como"><div className="section-heading"><div><span className="eyebrow">Estratégia</span><h2>Veja como a Maax<br/>funciona.</h2></div><p>Crie o produto, personalize o checkout e acompanhe todo o caminho da venda — da campanha de origem à confirmação e à auditoria do valor recebido.</p></div><div className="strategy-screen"><div className="strategy-logo"><span>M</span><b>Maax</b><button aria-label="Reproduzir demonstração"><ArrowRight/></button></div><div className="strategy-steps"><span>01 Produto</span><span>02 Checkout</span><span>03 Rastreamento</span><span>04 Auditoria</span></div></div></section>

      <section className="section cta reference-cta"><div><span className="eyebrow dark">Sua operação começa aqui</span><h2>Venda com clareza.<br/>Cresça com controle.</h2><Btn onClick={()=>go('/login')}>Entrar na Maax <ArrowRight/></Btn></div><div className="cta-rings"/><Logo light/><footer><span>© 2026 Maax Checkout</span><span>Termos & Privacidade</span></footer></section>
    </main>
  </div>
}

function LoginPage() {
  const [show,setShow]=useState(false), [email,setEmail]=useState(''), [password,setPassword]=useState(''), [error,setError]=useState('');
  const submit=e=>{e.preventDefault(); if(!email.includes('@')||password.length<4){setError('Confira seu e-mail e use uma senha com pelo menos 4 caracteres.');return;} sessionStorage.setItem('maaxUser', email); go('/dashboard')};
  return <div className="login-page"><div className="login-brand"><Logo light/><div className="login-message"><span className="eyebrow dark">Tudo em um só lugar</span><h1>Seu negócio<br/>em movimento.</h1><p>Acompanhe cada venda, entenda seus números e receba com tranquilidade.</p></div><div className="login-card-stack"><CardArt tone="pink"/><CardArt tone="mint"/></div><div className="login-quote"><div className="avatars"><i>MS</i><i>RL</i><i>AV</i></div><span>Mais de 12 mil negócios<br/>crescem com a Maax.</span></div></div><div className="login-form-wrap"><button className="close-login" onClick={()=>go('/')} aria-label="Fechar"><X/></button><form onSubmit={submit}><span className="form-kicker">BEM-VINDO DE VOLTA</span><h2>Acesse sua conta</h2><p>Insira seus dados para continuar.</p><label>E-mail<input value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@empresa.com" type="email"/></label><label>Senha<div className="password"><input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Sua senha" type={show?'text':'password'}/><button type="button" onClick={()=>setShow(!show)}>{show?<EyeSlash/>:<Eye/>}</button></div></label><div className="form-row"><label className="remember"><input type="checkbox"/> Lembrar de mim</label><button type="button">Esqueci minha senha</button></div>{error&&<div className="form-error">{error}</div>}<Btn type="submit">Entrar na plataforma <ArrowRight/></Btn><div className="or"><span/>ou<span/></div><button className="google" type="button"><b>G</b> Continuar com Google</button><small className="signup">Ainda não tem conta? <button type="button">Crie agora</button></small></form></div></div>
}

const sales=[['#MX-92841','Clube Criadores','Rafaela Monteiro','R$ 297,00','Aprovado','Hoje, 14:32'],['#MX-92840','Método Agenda Livre','Caio Vidal','R$ 189,90','Aprovado','Hoje, 13:58'],['#MX-92839','Pack Motion Pro','Bianca Noronha','R$ 87,00','Pendente','Hoje, 13:41'],['#MX-92838','Clube Criadores','Enzo Martins','R$ 297,00','Aprovado','Hoje, 12:26']];

const pageData={
 vendas:{kicker:'OPERAÇÃO',title:'Vendas',description:'Acompanhe pagamentos, aprovações e reembolsos em um só lugar.',action:'Nova venda',metrics:[['Faturamento bruto','R$ 18.429,70','+12,8%'],['Vendas aprovadas','142','+8,2%'],['Em análise','7','−1,4%']],columns:['Pedido','Produto / Cliente','Valor','Status','Horário'],rows:sales},
 produtos:{kicker:'CATÁLOGO',title:'Produtos',description:'Organize ofertas, preços e páginas de checkout.',action:'Novo produto',metrics:[['Produtos ativos','8','+2 este mês'],['Receita total','R$ 48.219,30','+16,2%'],['Conversão média','47,6%','+4,3%']],columns:['Produto','Tipo','Preço','Vendas','Status'],rows:[['Clube Criadores','Assinatura','R$ 297,00','618','Ativo'],['Método Agenda Livre','Pagamento único','R$ 189,90','284','Ativo'],['Pack Motion Pro','Pagamento único','R$ 87,00','197','Ativo'],['Mentoria Essencial','Assinatura','R$ 459,00','86','Rascunho']]},
 links:{kicker:'CONVERSÃO',title:'Links de pagamento',description:'Compartilhe ofertas prontas para receber em poucos cliques.',action:'Criar link',metrics:[['Links ativos','6','+1 esta semana'],['Visitas','3.842','+21,7%'],['Conversão','52,1%','+6,4%']],columns:['Link','Produto','Visitas','Conversão','Status'],rows:[['/clube-criadores','Clube Criadores','1.284','52,1%','Ativo'],['/agenda-livre','Método Agenda Livre','986','48,7%','Ativo'],['/motion-pro','Pack Motion Pro','742','43,2%','Ativo'],['/mentoria-essencial','Mentoria Essencial','319','—','Pausado']]},
 saldo:{kicker:'FINANCEIRO',title:'Saldo e saques',description:'Veja seus recebíveis e transfira o saldo disponível.',action:'Solicitar saque',metrics:[['Saldo disponível','R$ 24.816,42','Disponível agora'],['A receber','R$ 8.492,18','Próximos 30 dias'],['Total sacado','R$ 92.340,60','Desde o início']],columns:['Movimentação','Destino','Valor','Status','Data'],rows:[['Saque #8421','Banco Maax • 2808','− R$ 4.800,00','Concluído','01 ago.'],['Recebíveis','Agenda Livre','+ R$ 3.842,19','Agendado','03 ago.'],['Saque #8398','Banco Maax • 2808','− R$ 7.250,00','Concluído','28 jul.']]},
 extrato:{kicker:'FINANCEIRO',title:'Extrato',description:'Consulte todas as entradas, taxas e transferências da sua conta.',action:'Exportar extrato',metrics:[['Entradas','R$ 31.284,10','Últimos 30 dias'],['Saídas','R$ 12.486,80','Últimos 30 dias'],['Taxas','R$ 1.029,44','3,2% efetiva']],columns:['Descrição','Categoria','Valor','Status','Data'],rows:[['Venda #MX-92841','Recebimento','+ R$ 297,00','Confirmado','Hoje, 14:32'],['Taxa Maax','Tarifa','− R$ 9,50','Processado','Hoje, 14:32'],['Saque #8421','Transferência','− R$ 4.800,00','Concluído','01 ago.'],['Venda #MX-92796','Recebimento','+ R$ 189,90','Confirmado','01 ago.']]},
 clientes:{kicker:'RELACIONAMENTO',title:'Clientes',description:'Conheça quem compra de você e acompanhe seu histórico.',action:'Adicionar cliente',metrics:[['Clientes ativos','2.418','+128 este mês'],['Novos clientes','184','+18,9%'],['Recorrência','31,7%','+2,8%']],columns:['Cliente','E-mail','Pedidos','Total gasto','Desde'],rows:[['Rafaela Monteiro','rafaela@studio.com','8','R$ 1.864,00','Fev. 2026'],['Caio Vidal','caio@vidal.co','4','R$ 759,60','Abr. 2026'],['Bianca Noronha','bia@noronha.design','6','R$ 982,00','Mar. 2026'],['Enzo Martins','enzo@criativo.com','3','R$ 891,00','Jun. 2026']]},
 assinaturas:{kicker:'RECORRÊNCIA',title:'Assinaturas',description:'Gerencie planos, renovações e receita recorrente.',action:'Novo plano',metrics:[['Receita recorrente','R$ 38.742,00','+14,3%'],['Assinaturas ativas','286','+22 este mês'],['Cancelamentos','2,8%','−0,6%']],columns:['Assinante','Plano','Próxima cobrança','Valor','Status'],rows:[['Marina Avelar','Clube Criadores','08 ago.','R$ 297,00','Ativa'],['Pedro Alencar','Clube Criadores','09 ago.','R$ 297,00','Ativa'],['Luiza Ferraz','Mentoria Essencial','11 ago.','R$ 459,00','Ativa'],['Davi Campos','Clube Criadores','12 ago.','R$ 297,00','Pendente']]}
};

function AdminPage({type}){
 const d=pageData[type]; const [filter,setFilter]=useState('Todos');
 return <div className="admin-page page-enter"><div className="dash-title"><div><span>{d.kicker}</span><h1>{d.title}<i/></h1><p>{d.description}</p></div><div><Btn variant="outline">Exportar</Btn><Btn><Plus/>{d.action}</Btn></div></div><div className="sub-metrics">{d.metrics.map((m,i)=><article key={m[0]}><span>{m[0]}{i===0?<TrendUp/>:i===1?<ChartLineUp/>:<Receipt/>}</span><b>{m[1]}</b><small className={m[2].startsWith('+')?'up':''}>{m[2]}</small></article>)}</div>{type==='saldo'&&<section className="withdraw-panel"><div><span>SALDO DISPONÍVEL</span><strong>R$ 24.816<small>,42</small></strong><p><CheckCircle/> Conta bancária verificada e pronta para receber.</p></div><Btn>Transferir para minha conta <ArrowRight/></Btn></section>}<section className="resource-table"><div className="resource-head"><div><span>VISÃO COMPLETA</span><h2>{type==='vendas'?'Todos os pedidos':d.title}</h2></div><div className="resource-controls"><div className="filter-tabs">{['Todos','Ativos','Pendentes'].map(x=><button key={x} className={filter===x?'active':''} onClick={()=>setFilter(x)}>{x}</button>)}</div><button className="filter-search"><MagnifyingGlass/> Buscar</button></div></div><div className="generic-table"><div className="generic-row generic-th">{d.columns.map(c=><span key={c}>{c}</span>)}</div>{d.rows.map((row,i)=><div className="generic-row" key={i}>{row.map((cell,j)=><span key={j} className={j===0?'primary-cell':''}><b>{cell}</b>{j===d.columns.length-1&&['Ativo','Ativa','Aprovado','Concluído','Confirmado'].includes(cell)?<em>{cell}</em>:null}{j===d.columns.length-1&&['Pendente','Pausado','Rascunho','Agendado'].includes(cell)?<em className="pending">{cell}</em>:null}</span>)}</div>)}</div></section></div>
}
function DashboardSubPage({active,onNavigate,username}){
 const [menu,setMenu]=useState(false); const items=[['home','Início',House],['vendas','Vendas',ChartLineUp],['produtos','Produtos',Package],['links','Links de pagamento',LinkIcon],['saldo','Saldo e saques',Wallet],['extrato','Extrato',Receipt],['clientes','Clientes',Users],['assinaturas','Assinaturas',CreditCard]];
 return <div className="dashboard"><aside className={menu?'open':''}><div className="side-head"><Logo/><button onClick={()=>setMenu(false)}><X/></button></div><nav className="side-nav"><span>PLATAFORMA</span>{items.map(([id,label,Icon])=><a key={id} className={active===id?'active':''} onClick={()=>{onNavigate(id);setMenu(false)}}><Icon/>{label}{id==='vendas'?<b>12</b>:null}</a>)}</nav><div className="side-help"><Sparkle/><b>Central de ajuda</b><small>Tire dúvidas ou fale com a gente.</small><button>Acessar suporte</button></div><button className="logout" onClick={()=>go('/')}><SignOut/> Sair da conta</button></aside><div className="dash-main"><header><button className="mobile-menu" onClick={()=>setMenu(true)}><List/></button><div className="search"><MagnifyingGlass/><input placeholder="Buscar na plataforma..."/><kbd>⌘ K</kbd></div><div className="header-actions"><button className="notify"><Bell/><i/></button><div className="user"><span>SM</span><div><b>{username}</b><small>Administrador</small></div></div></div></header><main className="dash-content"><AdminPage type={active}/></main></div></div>
}

function Dashboard() {
 const [range,setRange]=useState('7 dias'), [copied,setCopied]=useState(false), [menu,setMenu]=useState(false), [active,setActive]=useState('home');
 const username=(sessionStorage.getItem('maaxUser')||'samuel@maax.com').split('@')[0];
 const copy=()=>{navigator.clipboard?.writeText('https://pay.maax.com/clube-criadores');setCopied(true);setTimeout(()=>setCopied(false),1800)};
 const openPage=(page)=>{setActive(page);setMenu(false);window.scrollTo({top:0,behavior:'smooth'})};
 useEffect(()=>{const links=document.querySelectorAll('.side-nav a');const pages=['home','vendas','produtos','links','saldo','extrato','clientes','assinaturas'];links.forEach((link,i)=>{link.onclick=()=>openPage(pages[i])});return()=>links.forEach(link=>{link.onclick=null})},[]);
 if(active!=='home') return <DashboardSubPage active={active} onNavigate={openPage} username={username}/>;
 return <div className="dashboard"><aside className={menu?'open':''}><div className="side-head"><Logo/><button onClick={()=>setMenu(false)}><X/></button></div><nav className="side-nav"><span>VISÃO GERAL</span><a className="active"><House/> Início</a><a><ChartLineUp/> Vendas <b>12</b></a><a><Package/> Produtos</a><a><LinkIcon/> Links de pagamento</a><span>FINANCEIRO</span><a><Wallet/> Saldo e saques</a><a><Receipt/> Extrato</a><span>GESTÃO</span><a><Users/> Clientes</a><a><CreditCard/> Assinaturas</a></nav><div className="side-help"><Sparkle/><b>Central de ajuda</b><small>Tire dúvidas ou fale com a gente.</small><button>Acessar suporte</button></div><button className="logout" onClick={()=>go('/')}><SignOut/> Sair da conta</button></aside><div className="dash-main"><header><button className="mobile-menu" onClick={()=>setMenu(true)}><List/></button><div className="search"><MagnifyingGlass/><input placeholder="Buscar vendas, clientes..."/><kbd>⌘ K</kbd></div><div className="header-actions"><button className="notify"><Bell/><i/></button><div className="user"><span>SM</span><div><b>{username}</b><small>Administrador</small></div></div></div></header><main className="dash-content"><div className="dash-title"><div><span>DOMINGO, 02 DE AGOSTO</span><h1>Olá, {username}. <i/></h1><p>Aqui está o que aconteceu com seu negócio hoje.</p></div><div><Btn variant="outline"><ArrowUpRight/> Ver minha loja</Btn><Btn><Plus/> Nova venda</Btn></div></div><section className="balance"><div className="balance-copy"><span>Saldo disponível <Eye size={16}/></span><strong>R$ 24.816<small>,42</small></strong><p><TrendUp/> 18,4% <span>comparado ao período anterior</span></p></div><div className="balance-actions"><Btn>Solicitar saque <ArrowRight/></Btn><small>Próximo recebimento</small><b>R$ 3.842,19 <span>em 03 ago.</span></b></div><div className="balance-art"><div/><div/></div></section><div className="metrics"><article><span>Vendas no período <CurrencyDollar/></span><b>R$ 18.429,70</b><p className="up">+12,8% <small>vs. período anterior</small></p></article><article><span>Pedidos aprovados <CheckCircle/></span><b>142</b><p className="up">+8,2% <small>vs. período anterior</small></p></article><article><span>Ticket médio <Receipt/></span><b>R$ 129,78</b><p className="down">−2,1% <small>vs. período anterior</small></p></article><article><span>Taxa de conversão <TrendUp/></span><b>47,6%</b><p className="up">+4,3% <small>vs. período anterior</small></p></article></div><div className="dash-grid"><section className="chart-panel"><div className="panel-title"><div><span>DESEMPENHO</span><h2>Visão de vendas</h2></div><div className="range">{['Hoje','7 dias','30 dias'].map(r=><button className={range===r?'active':''} onClick={()=>setRange(r)} key={r}>{r}</button>)}</div></div><div className="chart-summary"><b>R$ 18.429,70</b><span><i/> Faturamento</span></div><div className="chart"><div className="y-axis"><span>6k</span><span>4k</span><span>2k</span><span>0</span></div><svg viewBox="0 0 740 220" preserveAspectRatio="none"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#cfff38" stopOpacity=".25"/><stop offset="1" stopColor="#cfff38" stopOpacity="0"/></linearGradient></defs><path className="area" d="M0,180 C70,170 95,90 165,125 S270,155 330,85 S425,140 480,95 S580,40 630,65 S700,70 740,24 L740,220 L0,220Z"/><path className="line" d="M0,180 C70,170 95,90 165,125 S270,155 330,85 S425,140 480,95 S580,40 630,65 S700,70 740,24"/></svg><div className="x-axis"><span>27 jul.</span><span>28 jul.</span><span>29 jul.</span><span>30 jul.</span><span>31 jul.</span><span>01 ago.</span><span>02 ago.</span></div></div></section><section className="quick"><span>ACESSO RÁPIDO</span><h2>Seu link principal</h2><div className="product-icon"><Package/></div><b>Clube Criadores</b><small>R$ 297,00 • Pagamento único</small><div className="copy-link"><span>pay.maax.com/clube-criadores</span><button onClick={copy}>{copied?<Check/>:<Copy/>}</button></div><div className="quick-stats"><div><span>VISITAS</span><b>1.284</b></div><div><span>CONVERSÃO</span><b>52,1%</b></div></div><button className="edit-link">Editar página de checkout <ArrowUpRight/></button></section></div><section className="sales-table"><div className="panel-title"><div><span>ATIVIDADE RECENTE</span><h2>Últimas vendas</h2></div><button>Ver todas <ArrowRight/></button></div><div className="table"><div className="tr th"><span>Pedido</span><span>Produto / Cliente</span><span>Valor</span><span>Status</span><span>Horário</span></div>{sales.map(s=><div className="tr" key={s[0]}><span>{s[0]}</span><span><i>{s[2].split(' ').map(x=>x[0]).join('')}</i><b>{s[1]}</b><small>{s[2]}</small></span><span><b>{s[3]}</b></span><span><em className={s[4]==='Pendente'?'pending':''}>{s[4]}</em></span><span>{s[5]}</span></div>)}</div></section></main></div></div>
}

function App(){const [path,setPath]=useState(location.pathname);useEffect(()=>{const f=()=>setPath(location.pathname);addEventListener('popstate',f);return()=>removeEventListener('popstate',f)},[]);useEffect(()=>{const blockContextMenu=(event)=>event.preventDefault();document.addEventListener('contextmenu',blockContextMenu);return()=>document.removeEventListener('contextmenu',blockContextMenu)},[]);const checkoutMatch=path.match(/^\/checkout\/([^/]+)\/?$/);if(!isPlatformHostname&&!checkoutMatch)return null;return checkoutMatch?<PublicCheckout slug={decodeURIComponent(checkoutMatch[1])}/>:path==='/login'?<RealLogin navigate={go}/>:path==='/dashboard'?<RealDashboard navigate={go}/>:<HomePage/>}
createRoot(document.getElementById('root')).render(<App/>);
