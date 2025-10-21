/* script.js — rotas dinâmicas (objetos), login (admin/admin1234), pesquisa, solicitar, criar rota, histórico e toast */

(function(){
  // estado
  let usuarioAtual = null;
  let ultimoFiltroPesquisa = null;
  const reservas = [];
  const rotas = []; // agora armazena objetos { rota, motorista, aluno, responsavel, data, hora, ... }

  // helpers
  function dadosDoForm(form){ return Object.fromEntries(new FormData(form).entries()); }

  // toast
  let __toastTimer = null;
  function mostrarToast(mensagem, tipo = 'ok') {
    try {
      const $toast = document.getElementById('toast');
      if (!$toast) { alert(mensagem); return; }

      // limpa classes anteriores
      $toast.classList.remove('warn', 'err', 'visivel');
      if (tipo === 'warn') $toast.classList.add('warn');
      if (tipo === 'err')  $toast.classList.add('err');

      $toast.textContent = mensagem;

      // força reflow para garantir animação
      void $toast.offsetWidth;

      // mostra
      $toast.classList.add('visivel');

      // agenda esconder
      if (__toastTimer) clearTimeout(__toastTimer);
      __toastTimer = setTimeout(() => {
        $toast.classList.remove('visivel');
        __toastTimer = null;
      }, 3500);
    } catch (err) {
      // fallback seguro
      try { alert(mensagem); } catch (_) { /* ignorar */ }
      console.error('Erro em mostrarToast:', err);
    }
  }

  // atualiza select de rotas (usa nome da rota)
  function atualizarRotasDisponiveis(){
    const sel = document.getElementById('campoRecurso');
    if (!sel) return;
    sel.innerHTML = '<option value="">Selecione uma rota (cadastre primeiro)</option>';
    rotas.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r.rota;
      opt.textContent = r.rota;
      sel.appendChild(opt);
    });
  }

  // mostra detalhes num painel
  function mostrarDetalhesRota(matches){
    const painel = document.getElementById('detalhesRota');
    if (!painel) return;
    if (!matches || matches.length === 0) {
      painel.classList.add('oculto');
      painel.innerHTML = '';
      return;
    }
    // mostra primeiro resultado e informa se há mais
    const r = matches[0];
    const quando = (r.data && r.hora) ? `${r.data} às ${r.hora}` : 'Horário não especificado';
    let html = `<h3 style="margin-top:0">${r.rota}</h3>
                <p><strong>Motorista:</strong> ${r.motorista}<br>
                <strong>Aluno:</strong> ${r.aluno}<br>
                <strong>Responsável:</strong> ${r.responsavel}<br>
                <strong>Data/Hora:</strong> ${quando}</p>`;
    if (matches.length > 1) {
      html += `<p class="textoMutado">(${matches.length} registros com esse nome — exibindo o mais recente)</p>`;
    }
    painel.innerHTML = html;
    painel.classList.remove('oculto');
  }

  // histórico (mantém como estava)
  function renderItemReserva(item, idx){
    const li = document.createElement('li');
    const quando = (item.data && item.hora) ? new Date(`${item.data}T${item.hora}`).toLocaleString('pt-BR') : '';
    const titulo = item.rota || item.recurso || '—';
    const tipo = item.tipo || 'registro';
    const status = item.status || 'pendente';
    const statusLabel = status === 'aprovada' ? '✅ Aprovada' : status === 'registrada' ? '📌 Registrada' : status === 'pendente' ? '⏳ Pendente' : status === 'cancelada' ? '❌ Cancelada' : status;
    li.innerHTML = `<span><strong>${titulo}</strong> ${quando ? '— ' + quando : ''}<br><small class="textoMutado">${tipo}${item.motorista ? ' • Motorista: '+item.motorista : ''}${item.aluno ? ' • Aluno: '+item.aluno : ''}</small></span><span data-idx="${idx}">${statusLabel}</span>`;
    li.style.cursor = 'pointer';
    li.addEventListener('click', () => {
      if (!usuarioAtual) { mostrarToast('Faça login para modificar histórico.', 'warn'); return; }
      if (!usuarioAtual.admin){ mostrarToast('Apenas admin pode cancelar neste demo.', 'warn'); return; }
      if (item.status === 'cancelada'){ mostrarToast('Já cancelado.'); return; }
      item.status = 'cancelada';
      atualizarHistorico();
      mostrarToast('Cancelado com sucesso.', 'warn');
    });
    return li;
  }
  function atualizarHistorico(){
    const listaReservas = document.getElementById('listaReservas');
    if (!listaReservas) return;
    listaReservas.innerHTML = '';
    reservas.slice().reverse().forEach((r, i) => {
      const idx = reservas.length - 1 - i;
      listaReservas.appendChild(renderItemReserva(r, idx));
    });
  }

  // navegação simples
  function irPara(hash){ location.hash = hash; }

  // init after DOM loaded
  document.addEventListener('DOMContentLoaded', () => {
    const formLogin = document.getElementById('formLogin');
    const formPesquisa = document.getElementById('formPesquisa');
    const formSolicitar = document.getElementById('formSolicitar');
    const formRota = document.getElementById('formRota');

    // inicializa select (vazio)
    atualizarRotasDisponiveis();
    mostrarDetalhesRota([]); // esconde painel

    // login
    formLogin?.addEventListener('submit', (e)=>{
      e.preventDefault();
      const { usuario, senha } = dadosDoForm(formLogin);
      if (!usuario || (senha||'').length < 3){ mostrarToast('Usuário/senha inválidos (mín. 3 caracteres).','warn'); return; }
      if (usuario === 'admin' && senha === 'admin1234'){
        usuarioAtual = { login:'admin', professor:true, admin:true };
        mostrarToast('Logado como admin (demo).');
      } else {
        usuarioAtual = { login: usuario, professor: /prof/i.test(usuario), admin: false };
        mostrarToast(`Bem-vindo, ${usuarioAtual.login}!`);
      }
      irPara('#secPesquisa');
    });

    // pesquisa: agora mostra detalhes da rota selecionada
    formPesquisa?.addEventListener('submit', (e)=>{
      e.preventDefault();
      if (!usuarioAtual){ mostrarToast('Faça login antes de pesquisar.','warn'); irPara('#secLogin'); return; }
      const { recurso } = dadosDoForm(formPesquisa);
      if (!recurso){ mostrarToast('Selecione uma rota para pesquisar.','warn'); return; }

      // encontra rotas cadastradas com esse nome (mais recentes primeiro)
      const matches = rotas.filter(r => r.rota === recurso).sort((a,b) => (b.criadoEm || '') > (a.criadoEm || '') ? 1 : -1);
      if (matches.length === 0){
        mostrarToast('Nenhuma rota cadastrada com esse nome.', 'warn');
        mostrarDetalhesRota([]);
        return;
      }

      // exibe toast com resumo rápido e detalhes no painel
      const first = matches[0];
      const resumo = `${first.rota} • Motorista: ${first.motorista} • Aluno: ${first.aluno} • ${first.data || ''} ${first.hora || ''}`;
      mostrarToast(resumo);
      mostrarDetalhesRota(matches);

      // guarda seleção para solicitar vaga
      ultimoFiltroPesquisa = { recurso: first.rota, rotaId: first.criadoEm };
      irPara('#secSolicitar');
    });

    // solicitar vaga (mantém comportamento)
    formSolicitar?.addEventListener('submit', (e)=>{
      e.preventDefault();
      if (!usuarioAtual){ mostrarToast('Faça login antes de solicitar.','warn'); irPara('#secLogin'); return; }
      if (!ultimoFiltroPesquisa){ mostrarToast('Pesquise a rota antes de solicitar vaga.','warn'); irPara('#secPesquisa'); return; }
      const { justificativa } = dadosDoForm(formSolicitar);
      if (!justificativa){ mostrarToast('Descreva a justificativa.','warn'); return; }
      const status = (usuarioAtual.professor || usuarioAtual.admin) ? 'aprovada' : 'pendente';
      const nova = { ...ultimoFiltroPesquisa, justificativa, status, autor: usuarioAtual.login, tipo:'vaga' };
      reservas.push(nova);
      atualizarHistorico();
      mostrarToast(status === 'aprovada' ? 'Vaga aprovada automaticamente.' : 'Solicitação enviada.');
      formSolicitar.reset();
      irPara('#secHistorico');
    });

    // criar rota -> adiciona ao array rotas (objeto) e atualiza select
    formRota?.addEventListener('submit', (e)=>{
      e.preventDefault();
      const { motorista, aluno, rota, responsavel, data, hora } = dadosDoForm(formRota);
      if (!motorista || !aluno || !rota || !responsavel || !data || !hora){
        mostrarToast('Preencha todos os campos da rota (incluindo data e hora).','warn');
        return;
      }
      const rotaObj = {
        motorista,
        aluno,
        rota,
        responsavel,
        data,
        hora,
        criadoEm: new Date().toISOString(), // id de criação
        tipo:'rota',
        status:'registrada'
      };
      // registra rota no histórico e na lista de rotas
      reservas.push(rotaObj);
      if (!rotas.some(r => r.rota === rota && r.data === data && r.hora === hora)) rotas.push(rotaObj);
      atualizarRotasDisponiveis();
      atualizarHistorico();
      mostrarToast(`Rota "${rota}" criada para ${data} às ${hora}. Agora disponível na pesquisa.`);
      formRota.reset();
      irPara('#secHistorico');
    });

    // inicializa histórico
    atualizarHistorico();
  });
})();


