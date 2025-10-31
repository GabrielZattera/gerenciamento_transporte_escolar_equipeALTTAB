/* =========================
   script.js – Sprint 2 (incremental)
   Mantém o que havia no Sprint 1 e adiciona o fluxo funcional.
   ========================= */

   /* =========================
   script.js – Sprint 3 (incremental)
   Mantém o que havia no Sprint 2 e adiciona persistência + símbolos unicode.
   ========================= */

/* ===========================================
   0) TOAST ACESSÍVEL (feedback não bloqueante)
   -------------------------------------------
   Por quê? Substitui alert() por UX moderna e acessível.
   Usa <div id="toast" role="status" aria-live="polite"> no HTML.
   =========================================== */
// ALTERAÇÃO SPRINT 2: utilitário de toast
const $toast = document.getElementById('toast');
//$ para indicar que variavel vem do DOM
let __toastTimer = null;
//__para indicar que é uma variável interna
function mostrarToast(mensagem, tipo = 'ok') {
  // fallback se #toast não existir (ambiente antigo)
  if (!$toast) { 
    alert(mensagem); 
    return; 
  }

  $toast.classList.remove('warn', 'err', 'visivel');
  if (tipo === 'warn') $toast.classList.add('warn');
  if (tipo === 'err')  $toast.classList.add('err');
  $toast.textContent = mensagem;

  // força reflow para reativar transição quando reaparecer
  void $toast.offsetWidth;
  $toast.classList.add('visivel');

  clearTimeout(__toastTimer);
  __toastTimer = setTimeout(() => $toast.classList.remove('visivel'), 2800);
}


/* ===========================================
   1) FUNÇÕES ORIGINAIS — Sprint 1 (mantidas)
   =========================================== */

// abre o modal de login (Sprint 1)
function abrirLogin() {
  const modal = document.getElementById('modalLogin');
  if (modal && typeof modal.showModal === 'function') {
    modal.showModal();
  } else {
    // ALTERAÇÃO SPRINT 2: usar toast no lugar de alert, quando possível
    mostrarToast('Modal não suportado neste navegador.', 'warn');
  }
}

// rola suavemente até o formulário rápido (Sprint 1)
function rolarParaRapido() {
  const formRapido = document.querySelector('.formRapido');
  if (formRapido) {
    formRapido.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// validação simples da reserva rápida (Sprint 1)
// Observação Sprint 2: deixamos este fluxo como demonstração/legado.
// O fluxo "oficial" de reserva agora é Login → Pesquisa → Solicitar (abaixo).
(function inicializarValidacao() {
  const form = document.querySelector('.formRapido');
  if (!form) return;

  const seletorRecurso = form.querySelector('select');
  const campoData = form.querySelector('input[type="date"]');
  const campoInicio = form.querySelector('input[placeholder="Início"]');
  const campoFim = form.querySelector('input[placeholder="Fim"]');

  // remover marcação de erro ao digitar/mudar
  [seletorRecurso, campoData, campoInicio, campoFim].forEach(el => {
    if (!el) return;
    el.addEventListener('input', () => el.style.borderColor = '');
    el.addEventListener('change', () => el.style.borderColor = '');
  });

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();

    let valido = true;

    // valida recurso selecionado
    if (seletorRecurso && seletorRecurso.selectedIndex === 0) {
      seletorRecurso.style.borderColor = 'red';
      valido = false;
    }

    // valida data
    if (campoData && !campoData.value) {
      campoData.style.borderColor = 'red';
      valido = false;
    }

    // valida horários
    const hInicio = campoInicio?.value || '';
    const hFim = campoFim?.value || '';
    if (!hInicio) { campoInicio.style.borderColor = 'red'; valido = false; }
    if (!hFim) { campoFim.style.borderColor = 'red'; valido = false; }

    if (hInicio && hFim && hFim <= hInicio) {
      // ALTERAÇÃO SPRINT 2: substitui alert por toast
      mostrarToast('O horário final precisa ser maior que o horário inicial.', 'warn');
      campoInicio.style.borderColor = 'red';
      campoFim.style.borderColor = 'red';
      return;
    }

    if (!valido) {
      // ALTERAÇÃO SPRINT 2: substitui alert por toast
      mostrarToast('Por favor, preencha todos os campos obrigatórios.', 'warn');
      return;
    }

    // sucesso (simulado)
    mostrarToast('Reserva simulada com sucesso! (fluxo rápido/legado)');
    form.reset();
  });
})();


/* ===========================================
   2) AJUDANTES E ESTADO (Sprint 2)
   -------------------------------------------
   Por quê? Preparar "estado mínimo" e leitura por FormData.
   =========================================== */

// ALTERAÇÃO SPRINT 2: helper para transformar FormData em objeto simples
function dadosDoForm(form) {
  return Object.fromEntries(new FormData(form).entries());
}

// ALTERAÇÃO SPRINT 2: estado mínimo de aplicação (simulado)
let usuarioAtual = null;              // { login, professor: boolean }
let ultimoFiltroPesquisa = null;      // { recurso, data, hora }
const reservas = [];                  // histórico em memória (simulado)


/* ===========================================
   3) MENU ATIVO POR HASH (acessibilidade)
   -------------------------------------------
   Por quê? Destacar seção atual sem roteador.
   Requer CSS: .menu a[aria-current="true"] { ... }
   =========================================== */
// ALTERAÇÃO SPRINT 2: destacar link ativo do menu
const menuLinks = document.querySelectorAll('.menu a, header .acoesNav a');
function atualizarMenuAtivo() {
  const hash = location.hash || '#secLogin';
  menuLinks.forEach(a => {
    const ativo = a.getAttribute('href') === hash;
    a.setAttribute('aria-current', ativo ? 'true' : 'false');
  });
}
window.addEventListener('hashchange', atualizarMenuAtivo);
document.addEventListener('DOMContentLoaded', atualizarMenuAtivo);


/* ===========================================
   4) FLUXO LOGIN → PESQUISA → SOLICITAR → HISTÓRICO
   -------------------------------------------
   Por quê? Implementar o fluxo didático da Sprint 2,
   com RN simulada: usuários cujo login contém "prof"
   recebem aprovação automática na solicitação.
   =========================================== */

// Seletores das seções (se existirem no HTML atual)
const formLogin     = document.getElementById('formLogin');
const formPesquisa  = document.getElementById('formPesquisa');
const formSolicitar = document.getElementById('formSolicitar');
const listaReservas = document.getElementById('listaReservas');

/* ===========================================
  SPRINT 3: REGRAS
  =========================================== */

  //ADICONAR UMA HORA AO HORÁRIO "HH:MM" PARA FIM PADRÃO
  function adicionarHora(hhmm){
    const [h,m] = (hhmm || '00:00').slip(':').map(Number);
    const d = new Date();
    d.setHours(h,m,0,0);
    d.setMinutes(d.getMinutes() + 60);
    return d.toTimeString().slice(0,5);

  }

  //DETECÇÃO DE CONFLITO (RN2)
  //Não  há conflito apenas quando um termina antes do outro começar
  function haConflito({recursoId, data, horaInicio, horaFim}){
    const existentes = repo.get(DB_KEYS.reservas).filter(r => r.recursoId === recursoId && r.data === data && r.status !== 'cancelada');
    return existentes.some(r =>! (r.horaFim <= horaInicio || r.horaInicio >= horaFim));
  }

  //RENDER A PARTIR DO BANCO DE DADOS (localstorage)
  function renderizarReservasPersistida(r, recursoMap = null){
    if (!listaReservas) return;
    const recursos = recursoMap || Object.fromEntries(repo.get(DB_KEYS.recursos).map(rr => [rr.id, rr.nome]));
    const quando = '${r.data.split('-').reverse().join('/')}-${r.horaInicio}-${r.horaFim}';
    
  }


// (a) LOGIN
// ALTERAÇÃO SPRINT 2: valida credenciais simples e define perfil simulado
//? significa encadeamento opcional, isto é, faz as vezes do if
formLogin?.addEventListener('submit', (e) => {
  e.preventDefault();
  const { usuario, senha } = dadosDoForm(formLogin);

  if (!usuario || (senha || '').length < 3) {
    mostrarToast('Usuário/senha inválidos (mín. 3 caracteres).', 'warn');
    return;
  }

  const professor = /prof/i.test(usuario); // RN4 (simulada) — "parece professor"
  usuarioAtual = { login: usuario, professor };

  // MOSTRAR APENAS TOAST DE LOGIN (não recarregar a página)
  mostrarToast(`Bem-vindo, ${usuarioAtual.login}!`);

  // fechar modal de login se existir (UX)
  const modal = document.getElementById('modalLogin');
  if (modal && typeof modal.close === 'function') modal.close();

  // atualizar menu/estado sem forçar reload
  // usa replaceState para atualizar a hash na URL sem navegação de recarregamento
  history.replaceState(null, '', '#secPesquisa');
  atualizarMenuAtivo();
});

// (b) PESQUISAR DISPONIBILIDADE
// ALTERAÇÃO SPRINT 2: guarda filtro pesquisado (simulação de disponibilidade)
formPesquisa?.addEventListener('submit', (e) => {
  e.preventDefault();

  if (!usuarioAtual) {
    mostrarToast('Faça login antes de pesquisar.', 'warn');
    location.hash = '#secLogin';
    atualizarMenuAtivo();
    return;
  }

  const { recurso, data, hora } = dadosDoForm(formPesquisa);
  if (!recurso || !data || !hora) {
    mostrarToast('Preencha recurso, data e horário.', 'warn');
    return;
  }

  ultimoFiltroPesquisa = { recurso, data, hora };
  const quando = new Date(`${data}T${hora}`).toLocaleString('pt-BR');
  mostrarToast(`Disponível: ${recurso} em ${quando}.`);
  location.hash = '#secSolicitar';
  atualizarMenuAtivo();
});

// (c) SOLICITAR RESERVA
// ALTERAÇÃO SPRINT 2: aplica RN simulada e registra no histórico
formSolicitar?.addEventListener('submit', (e) => {
  e.preventDefault();

  if (!usuarioAtual) {
    mostrarToast('Faça login antes de solicitar.', 'warn');
    location.hash = '#secLogin';
    atualizarMenuAtivo();
    return;
  }
  if (!ultimoFiltroPesquisa) {
    mostrarToast('Pesquise a disponibilidade antes de solicitar.', 'warn');
    location.hash = '#secPesquisa';
    atualizarMenuAtivo();
    return;
  }

  const { justificativa } = dadosDoForm(formSolicitar);
  if (!justificativa) {
    mostrarToast('Descreva a justificativa.', 'warn');
    return;
  }

  // RN4 (simulada): se login contém "prof", aprova automaticamente
  const status = usuarioAtual.professor ? 'aprovada' : 'pendente';

  const nova = {
    ...ultimoFiltroPesquisa,
    justificativa,
    status,
    autor: usuarioAtual.login
  };

  reservas.push(nova);
  renderItemReserva(nova);

  mostrarToast(status === 'aprovada'
    ? 'Reserva aprovada automaticamente.'
    : 'Reserva enviada para análise.');

  formSolicitar.reset();
  location.hash = '#secHistorico';
  atualizarMenuAtivo();
});

// (d) RENDERIZAÇÃO DO HISTÓRICO
// ALTERAÇÃO SPRINT 2: lista simples (sem <template>, para não quebrar seu HTML)
function renderItemReserva({ recurso, data, hora, justificativa, status }) {
  if (!listaReservas) return;

  const li = document.createElement('li');
  const quando = new Date(`${data}T${hora}`).toLocaleString('pt-BR');

  li.innerHTML = `
    <span><strong>${recurso}</strong> — ${quando}</span>
    <span>${status === 'aprovada' ? '✅ Aprovada' : status === 'cancelada' ? '❌ Cancelada' : '⏳ Pendente'}</span>
  `;

  // Opcional didático: clique para cancelar (simulação)
  li.addEventListener('click', () => {
    // impede recancelar
    if (li.dataset.status === 'cancelada') return;
    li.dataset.status = 'cancelada';
    li.lastElementChild.textContent = '❌ Cancelada';
    mostrarToast('Reserva cancelada.', 'warn');
  });

  listaReservas.appendChild(li);
}


/* ===========================================
   5) AJUSTES FINAIS DE ARRANQUE
   -------------------------------------------
   Por quê? Garantir que link ativo apareça já na carga inicial.
   =========================================== */
document.addEventListener('DOMContentLoaded', () => {
  // Se a pessoa abriu direto numa âncora, destacar no menu
  atualizarMenuAtivo();
});