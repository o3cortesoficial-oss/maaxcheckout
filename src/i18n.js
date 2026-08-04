const STORAGE_KEY = "maax_language";
const listeners = new Set();
let currentLanguage = "pt-BR";
let observer;

const EN = {
  "Início":"Home","Produtos":"Products","Checkout":"Checkout","Domínio":"Domain","Links de pagamento":"Payment links","Gateways":"Gateways","Frete":"Shipping","Rastreamento":"Tracking","Clientes":"Customers","Assinaturas":"Subscriptions","Sair da conta":"Sign out",
  "PLATAFORMA":"PLATFORM","ADMINISTRAÇÃO":"ADMINISTRATION","MODO DE ACESSO":"ACCESS MODE","Admin da plataforma":"Platform admin","Painel do usuário":"User dashboard","Acesso exclusivo":"Exclusive access","Visão protegida de toda a plataforma.":"Protected view of the entire platform.","Assinatura necessária":"Subscription required","Ative um plano para liberar o painel.":"Activate a plan to unlock the dashboard.",
  "Buscar na plataforma...":"Search the platform...","Buscar":"Search","Configurações":"Settings","Suporte":"Support","Store":"Store","Calculadora de ROI":"ROI calculator","Negócio":"Business","Novo negócio":"New business","Suas operações":"Your businesses","Operação atual":"Current business",
  "Visão geral":"Overview","Resumo atualizado do seu checkout.":"An up-to-date overview of your checkout.","Volume processado":"Processed volume","Total de pagamentos aprovados":"Total approved payments","Eventos ao vivo":"Live events","TEMPO REAL":"REAL TIME","Acessos agora":"Active visitors","Preenchimentos":"Form entries","Pagamentos enviados":"Payments submitted","Pix gerados":"Pix generated","Pedidos pagos":"Paid orders","Pedidos gerados":"Created orders","Produtos ativos":"Active products","Vendas com divergência":"Sales with discrepancies","Atividade real":"Live activity","Últimas vendas":"Latest sales","Nenhuma venda registrada":"No sales recorded","As vendas aparecerão aqui quando seus clientes concluírem o checkout.":"Sales will appear here when customers complete checkout.",
  "Pagamentos aprovados":"Approved payments","pedidos pagos no período":"paid orders in this period","Hoje":"Today","7 dias":"7 days","30 dias":"30 days","Período personalizado":"Custom period","Aplicar período":"Apply period","Conta parceira":"Partner account","Metade dos ganhos é seu!":"Half of the earnings are yours!","Link de convite":"Referral link","Ganhos registrados":"Recorded earnings",
  "Catálogo":"Catalog","Ofertas disponíveis para seus clientes":"Offers available to your customers","Novo produto":"New product","Registros":"Records","Produto":"Product","Tipo":"Type","Preço":"Price","Status":"Status","Ações":"Actions","Ativo":"Active","Inativo":"Inactive","Editar":"Edit","Excluir":"Delete","Copiar link":"Copy link","Atualizar":"Refresh","Nenhum produto ainda":"No products yet",
  "Pagamentos":"Payments","Configure e controle os provedores que processam seus checkouts":"Configure and manage the providers that process your checkouts","Buscar gateway pelo nome...":"Search gateways by name...","Gateway ativo":"Gateway enabled","Testar conexão":"Test connection","Atualizar chaves":"Update keys","Trocar chaves":"Replace keys","Ver documentação":"View documentation","Chave salva e protegida":"Key saved and protected",
  "Editor de checkout":"Checkout editor","Personalize a experiência de compra em tempo real.":"Customize the purchase experience in real time.","Salvar alterações":"Save changes","Visualização":"Preview","Desktop":"Desktop","Mobile":"Mobile","Templates":"Templates","Marca e aparência":"Brand and appearance","Nome da marca":"Brand name","Logo do checkout":"Checkout logo","Banner do checkout":"Checkout banner","Enviar logo":"Upload logo","Enviar banner":"Upload banner","Remover":"Remove","Cor principal":"Primary color","Fundo":"Background","Forma de pagamento":"Payment method","Pix":"Pix","Cartão":"Card","Boleto":"Bank slip","Compra segura":"Secure purchase","Finalizar compra":"Complete purchase","Finalizar pagamento":"Complete payment","Dados pessoais":"Personal details","Nome completo":"Full name","E-mail":"Email","Telefone":"Phone","CPF":"Tax ID","Endereço de entrega":"Shipping address","Entrega":"Shipping","Total":"Total",
  "Conectar domínio":"Connect domain","Subdomínio do checkout":"Checkout subdomain","Adicionar domínio":"Add domain","Testar conexão":"Test connection","Remover domínio":"Remove domain","Domínio conectado e pronto para uso.":"Domain connected and ready to use.","Registro necessário no provedor":"Required DNS record","Nome / Host":"Name / Host","Valor / Destino":"Value / Target","Copiar":"Copy",
  "Opções de frete":"Shipping options","Novo frete":"New shipping option","Título":"Title","Descrição":"Description","Prazo de entrega":"Delivery time","Valor":"Price","Grátis":"Free","Salvar":"Save","Cancelar":"Cancel",
  "Gerencie os pixels usados para medir visitas e conversões dos checkouts":"Manage pixels used to measure checkout visits and conversions","Múltiplos pixels por plataforma":"Multiple pixels per platform","Adicionar":"Add","Nenhum pixel cadastrado nesta plataforma.":"No pixels registered on this platform.","ID do pixel":"Pixel ID","Campanhas que geram receita.":"Campaigns that generate revenue.","Melhores campanhas":"Top campaigns","Atribuição ativa":"Attribution enabled","Receita atribuída":"Attributed revenue","Vendas identificadas":"Identified sales","Taxa de atribuição":"Attribution rate",
  "Relacionamento":"Customers","Pessoas que compram de você":"People who buy from you","Todos":"All","Pagos":"Paid","Não pagos":"Unpaid","Nenhum cliente ainda":"No customers yet","Cliente":"Customer","Situação":"Status","Data":"Date","Anterior":"Previous","Próxima":"Next",
  "Planos e cobranças recorrentes":"Plans and recurring billing","Plano atual":"Current plan","Próxima cobrança":"Next charge","Ciclo":"Cycle","Prévia do ciclo":"Cycle estimate","Escolher plano":"Choose plan","Plano ativo":"Active plan","Essencial":"Essential","Crescimento":"Growth","Escala":"Scale","por semana":"per week","pedidos pagos":"paid orders",
  "Venda mais.":"Sell more.","Complique ":"Make it ","menos.":"simple.","Checkout brasileiro, sem atrito":"Frictionless checkout","Crie checkouts que passam confiança, recebem via Pix e cartão e transformam visitas em receita.":"Build trustworthy checkouts, accept Pix and card payments, and turn visits into revenue.","Começar agora":"Get started","Ver como funciona":"See how it works","Acessar plataforma":"Open platform","Recursos":"Features","Sobre":"About","Como funciona":"How it works","O melhor checkout para vender mais.":"The checkout built to sell more.","Sua operação começa aqui":"Your operation starts here","Entrar na Maax":"Join Maax",
  "Bem-vindo de volta":"Welcome back","Acesse sua conta":"Sign in to your account","Insira seus dados para continuar.":"Enter your details to continue.","Senha":"Password","Entrar":"Sign in","Criar conta":"Create account","Ainda não tem conta?":"Don't have an account yet?","Já tem uma conta?":"Already have an account?","Esqueci minha senha":"Forgot my password","Lembrar de mim":"Remember me","Continuar com Google":"Continue with Google",
  "Termos de Uso":"Terms of Use","Política de Privacidade":"Privacy Policy","Política de Cookies":"Cookie Policy","Termos":"Terms","Privacidade":"Privacy","Cookies":"Cookies","Voltar para o início":"Back to home","DOCUMENTOS LEGAIS":"LEGAL DOCUMENTS","NESTA PÁGINA":"ON THIS PAGE",
  "Idioma":"Language","Português (Brasil)":"Portuguese (Brazil)","Inglês":"English"
};

function replaceText(value) {
  const trimmed = value.trim();
  if (!trimmed) return value;
  const translated = EN[trimmed];
  if (!translated) return value;
  return value.replace(trimmed, translated);
}

function translateElement(root = document.body) {
  if (!root || currentLanguage !== "en") return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    const parent = node.parentElement;
    if (!parent || ["SCRIPT", "STYLE", "CODE"].includes(parent.tagName)) return;
    node.nodeValue = replaceText(node.nodeValue);
  });
  root.querySelectorAll?.("[placeholder],[aria-label],[title]").forEach((element) => {
    ["placeholder", "aria-label", "title"].forEach((attribute) => {
      const value = element.getAttribute(attribute);
      if (value) element.setAttribute(attribute, replaceText(value));
    });
  });
}

function watchDom() {
  observer?.disconnect();
  if (currentLanguage !== "en") return;
  translateElement();
  observer = new MutationObserver((mutations) => mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentElement;
      if (parent && !["SCRIPT", "STYLE", "CODE"].includes(parent.tagName)) node.nodeValue = replaceText(node.nodeValue);
    } else if (node.nodeType === Node.ELEMENT_NODE) translateElement(node);
  })));
  observer.observe(document.body, { childList: true, subtree: true });
}

function fallbackLanguage() {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  if (timezone.startsWith("America/") && ["Sao_Paulo","Fortaleza","Recife","Manaus","Belem","Cuiaba","Campo_Grande","Bahia","Maceio","Noronha","Porto_Velho","Boa_Vista","Rio_Branco","Araguaina"].some((city) => timezone.endsWith(city))) return "pt-BR";
  return (navigator.language || "").toLowerCase() === "pt-br" ? "pt-BR" : "en";
}

export async function initializeLocale() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "pt-BR" || saved === "en") currentLanguage = saved;
  else {
    try {
      const response = await fetch("/api/locale", { headers: { Accept: "application/json" } });
      const data = response.ok ? await response.json() : null;
      currentLanguage = data?.locale === "pt-BR" || data?.locale === "en" ? data.locale : fallbackLanguage();
    } catch { currentLanguage = fallbackLanguage(); }
  }
  document.documentElement.lang = currentLanguage;
  watchDom();
  listeners.forEach((listener) => listener(currentLanguage));
  return currentLanguage;
}

export function setLanguage(language) {
  if (language !== "pt-BR" && language !== "en") return;
  localStorage.setItem(STORAGE_KEY, language);
  if (language !== currentLanguage) {
    currentLanguage = language;
    document.documentElement.lang = language;
    window.location.reload();
  }
}

export const getLanguage = () => currentLanguage;
export function subscribeLanguage(listener) { listeners.add(listener); return () => listeners.delete(listener); }
