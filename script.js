/* script.js — Transporte Escolar (versão otimizada e limpa)
   Funções: rotas dinâmicas, login, pesquisa, solicitações, histórico e toast. */

(() => {
  // Estado global
  let usuarioAtual = null;
  let ultimaRotaPesquisada = null;
  const reservas = [];
  const rotas = [];

  // Elementos principais (cacheados)
  const el = id => document.getElementById(id);
  const toast = el('toast');
  const selectRotas = el('campoRecurso');
  const painelDetalhes = el('detalhesRota');
  const listaHistorico = el('listaReservas');

  // Utilitários
  const dadosDoForm = form => Object.fromEntries(new FormData(form).entries());
  const irPara = hash => (location.hash = hash);

  // Toast otimizado
  let toastTimer = null;
  function mostrarToast(msg, tipo = 'ok') {
    if (!toast) return alert(msg);
    toast.className = `toast ${tipo}`;
    toast.textContent = msg;

    clearTimeout(toastTimer);
    void toast.offsetWidth; // força reflow (animação)
    toast.classList.add('visivel');

    toastTimer = setTimeout(() => toast.classList.remove('visivel'), 3500);
  }

  // Atualiza o <select> com rotas disponíveis
  function atualizarSelectRotas() {
    selectRotas.innerHTML = '<option value="">Selecione uma rota (cadastre primeiro)</option>';
    rotas.forEach(({ rota }) => {
      const opt = document.createElement('option');
      opt.value = opt.textContent = rota;
      selectRotas.appendChild(opt);
    });
  }

  // Mostra detalhes da rota pesquisada
  function mostrarDetalhes(matches = []) {
    if (!matches.length) return painelDetalhes.classList.add('oculto');

    const r = matches[0];
    const quando = r.data && r.hora ? `${r.data} às ${r.hora}` : 'Horário não especificado';
    painelDetalhes.innerHTML = `
      <h3>${r.rota}</h3>
      <p><strong>Motorista:</strong> ${r.motorista}<br>
      <strong>Aluno:</strong> ${r.aluno}<br>
      <strong>Responsável:</strong> ${r.responsavel}<br>
      <strong>Data/Hora:</strong> ${quando}</p>
      ${matches.length > 1 ? `<p class="textoMutado">(${matches.length} registros — exibindo o mais recente)</p>` : ''}
    `;
    painelDetalhes.classList.remove('oculto');
  }

  // Atualiza lista de histórico
  function atualizarHistorico() {
    listaHistorico.innerHTML = '';
    reservas.slice().reverse().forEach((r, i, arr) => {
      const idx = arr.length - 1 - i;
      const quando = r.data && r.hora ? new Date(`${r.data}T${r.hora}`).toLocaleString('pt-BR') : '';
      const statusIcon = {
        aprovada: '✅ Aprovada',
        registrada: '📌 Registrada',
        pendente: '⏳ Pendente',
        cancelada: '❌ Cancelada'
      }[r.status] || r.status;

      const li = document.createElement('li');
      li.innerHTML = `
        <span>
          <strong>${r.rota || r.recurso || '—'}</strong> ${quando ? `— ${quando}` : ''}<br>
          <small class="textoMutado">${r.tipo || 'registro'}${r.motorista ? ` • Motorista: ${r.motorista}` : ''}${r.aluno ? ` • Aluno: ${r.aluno}` : ''}</small>
        </span>
        <span>${statusIcon}</span>
      `;
      li.dataset.idx = idx;
      li.style.cursor = 'pointer';
      li.onclick = () => cancelarItem(r);
      listaHistorico.appendChild(li);
    });
  }

  // Cancelar rota (somente admin)
  function cancelarItem(item) {
    if (!usuarioAtual) return mostrarToast('Faça login para modificar histórico.', 'warn');
    if (!usuarioAtual.admin) return mostrarToast('Apenas admin pode cancelar neste demo.', 'warn');
    if (item.status === 'cancelada') return mostrarToast('Já cancelado.');
    item.status = 'cancelada';
    atualizarHistorico();
    mostrarToast('Cancelado com sucesso.', 'warn');
  }

  // Ações de formulário
  document.addEventListener('DOMContentLoaded', () => {
    const formLogin = el('formLogin');
    const formPesquisa = el('formPesquisa');
    const formSolicitar = el('formSolicitar');
    const formRota = el('formRota');

    atualizarSelectRotas();
    mostrarDetalhes([]);

    // LOGIN
    formLogin?.addEventListener('submit', e => {
      e.preventDefault();
      const { usuario, senha } = dadosDoForm(formLogin);

      if (!usuario || senha.length < 3)
        return mostrarToast('Usuário/senha inválidos (mín. 3 caracteres).', 'warn');

      usuarioAtual =
        usuario === 'admin' && senha === 'admin1234'
          ? { login: 'admin', admin: true, professor: true }
          : { login: usuario, admin: false, professor: /prof/i.test(usuario) };

      mostrarToast(`Bem-vindo, ${usuarioAtual.login}${usuarioAtual.admin ? ' (admin demo)' : ''}!`);
      irPara('#secPesquisa');
    });

    // PESQUISA
    formPesquisa?.addEventListener('submit', e => {
      e.preventDefault();
      if (!usuarioAtual) return mostrarToast('Faça login antes de pesquisar.', 'warn'), irPara('#secLogin');

      const { recurso } = dadosDoForm(formPesquisa);
      if (!recurso) return mostrarToast('Selecione uma rota para pesquisar.', 'warn');

      const matches = rotas.filter(r => r.rota === recurso).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
      if (!matches.length) return mostrarToast('Nenhuma rota encontrada.', 'warn'), mostrarDetalhes([]);

      const r = matches[0];
      mostrarToast(`${r.rota} • Motorista: ${r.motorista} • Aluno: ${r.aluno}`);
      mostrarDetalhes(matches);

      ultimaRotaPesquisada = { recurso: r.rota, rotaId: r.criadoEm };
      irPara('#secSolicitar');
    });

    // SOLICITAR VAGA
    formSolicitar?.addEventListener('submit', e => {
      e.preventDefault();
      if (!usuarioAtual) return mostrarToast('Faça login antes de solicitar.', 'warn'), irPara('#secLogin');
      if (!ultimaRotaPesquisada) return mostrarToast('Pesquise a rota antes de solicitar.', 'warn'), irPara('#secPesquisa');

      const { justificativa } = dadosDoForm(formSolicitar);
      if (!justificativa) return mostrarToast('Descreva a justificativa.', 'warn');

      const status = usuarioAtual.admin || usuarioAtual.professor ? 'aprovada' : 'pendente';
      reservas.push({ ...ultimaRotaPesquisada, justificativa, status, autor: usuarioAtual.login, tipo: 'vaga' });
      atualizarHistorico();
      mostrarToast(status === 'aprovada' ? 'Vaga aprovada automaticamente.' : 'Solicitação enviada.');
      formSolicitar.reset();
      irPara('#secHistorico');
    });

    // CRIAR ROTA
    formRota?.addEventListener('submit', e => {
      e.preventDefault();
      const { motorista, aluno, rota, responsavel, data, hora } = dadosDoForm(formRota);
      if ([motorista, aluno, rota, responsavel, data, hora].some(v => !v))
        return mostrarToast('Preencha todos os campos da rota.', 'warn');

      const rotaObj = { motorista, aluno, rota, responsavel, data, hora, criadoEm: new Date().toISOString(), tipo: 'rota', status: 'registrada' };

      reservas.push(rotaObj);
      if (!rotas.find(r => r.rota === rota && r.data === data && r.hora === hora)) rotas.push(rotaObj);

      atualizarSelectRotas();
      atualizarHistorico();
      mostrarToast(`Rota "${rota}" criada para ${data} às ${hora}.`);
      formRota.reset();
      irPara('#secHistorico');
    });

    atualizarHistorico();
  });
})();
