/* script.js — Transporte Escolar (Sistema Completo Unificado)
   Gerencia tanto a página de login quanto o sistema principal */

   (() => {
    // Chaves do localStorage
    const STORAGE_KEYS = {
      MOTORISTAS: 'schoolBus_motoristas',
      PAIS: 'schoolBus_pais',
      ALUNOS: 'schoolBus_alunos',
      ROTAS: 'schoolBus_rotas',
      SOLICITACOES: 'schoolBus_solicitacoes',
      USUARIO: 'schoolBus_usuario'
    };
  
    // Estado global
    let usuarioAtual = null;
    let motoristas = [];
    let pais = [];
    let alunos = [];
    let rotas = [];
    let solicitacoes = [];
  
    // ============================================
    // localStorage - Persistência de Dados
    // ============================================
    function salvarNoStorage(chave, dados) {
      try {
        localStorage.setItem(chave, JSON.stringify(dados));
      } catch (e) {
        console.warn('Erro ao salvar no localStorage:', e);
      }
    }
  
    function carregarDoStorage(chave, padrao = []) {
      try {
        const item = localStorage.getItem(chave);
        return item ? JSON.parse(item) : padrao;
      } catch (e) {
        console.warn('Erro ao carregar do localStorage:', e);
        return padrao;
      }
    }
  
    function carregarDados() {
      motoristas = carregarDoStorage(STORAGE_KEYS.MOTORISTAS, []);
      pais = carregarDoStorage(STORAGE_KEYS.PAIS, []);
      alunos = carregarDoStorage(STORAGE_KEYS.ALUNOS, []);
      rotas = carregarDoStorage(STORAGE_KEYS.ROTAS, []);
      solicitacoes = carregarDoStorage(STORAGE_KEYS.SOLICITACOES, []);
      usuarioAtual = carregarDoStorage(STORAGE_KEYS.USUARIO, null);
    }
  
    function salvarDados() {
      salvarNoStorage(STORAGE_KEYS.MOTORISTAS, motoristas);
      salvarNoStorage(STORAGE_KEYS.PAIS, pais);
      salvarNoStorage(STORAGE_KEYS.ALUNOS, alunos);
      salvarNoStorage(STORAGE_KEYS.ROTAS, rotas);
      salvarNoStorage(STORAGE_KEYS.SOLICITACOES, solicitacoes);
      if (usuarioAtual) {
        salvarNoStorage(STORAGE_KEYS.USUARIO, usuarioAtual);
      }
    }
  
    // ============================================
    // Utilitários
    // ============================================
    const el = id => document.getElementById(id);
    const toast = el('toast');
  
    const dadosDoForm = form => Object.fromEntries(new FormData(form).entries());
  
    // Função auxiliar para montar endereço completo a partir dos campos separados
    function montarEnderecoCompleto(rua, numero, bairro, cidade, estado, cep) {
      const partes = [];
      if (rua) partes.push(rua);
      if (numero) partes.push(rua ? numero : `Nº ${numero}`);
      if (bairro) partes.push(bairro);
      if (cidade) partes.push(cidade);
      if (estado) partes.push(estado);
      if (cep) partes.push(`CEP: ${cep}`);
      
      return partes.filter(Boolean).join(', ');
    }

    // Função auxiliar para obter endereço completo de uma rota (suporta formato antigo e novo)
    function obterEnderecoRota(rota, tipo) {
      // Formato novo (campos separados)
      if (tipo === 'origem') {
        if (rota.origemRua) {
          return montarEnderecoCompleto(
            rota.origemRua,
            rota.origemNumero,
            rota.origemBairro,
            rota.origemCidade,
            rota.origemEstado,
            rota.origemCEP
          );
        }
        // Formato antigo (compatibilidade)
        return rota.origem || '';
      } else if (tipo === 'destino') {
        if (rota.destinoRua) {
          return montarEnderecoCompleto(
            rota.destinoRua,
            rota.destinoNumero,
            rota.destinoBairro,
            rota.destinoCidade,
            rota.destinoEstado,
            rota.destinoCEP
          );
        }
        // Formato antigo (compatibilidade)
        return rota.destino || '';
      }
      return '';
    }
  
    // Função auxiliar para obter endereço do aluno
    // Prioriza o endereço da rota se o aluno tiver uma solicitação confirmada/aprovada
    function obterEnderecoAluno(aluno) {
      if (!aluno) {
        return 'Endereço não cadastrado';
      }

      // Verificar se o aluno tem uma solicitação confirmada ou aprovada
      const solicitacaoAtiva = solicitacoes.find(s => 
        s.alunoId === aluno.id && 
        (s.status === 'confirmada' || s.status === 'aprovada')
      );

      // Se tiver solicitação ativa, usar o endereço de origem da rota
      if (solicitacaoAtiva) {
        const rota = rotas.find(r => r.id === solicitacaoAtiva.rotaId);
        if (rota) {
          const enderecoOrigem = obterEnderecoRota(rota, 'origem');
          if (enderecoOrigem) {
            return enderecoOrigem;
          }
        }
      }

      // Caso contrário, usar o endereço do responsável
      if (!aluno.responsavelId) {
        return 'Endereço não cadastrado';
      }
      const responsavel = pais.find(p => p.id === aluno.responsavelId);
      if (!responsavel || !responsavel.endereco) {
        return 'Endereço não cadastrado';
      }
      const enderecoCompleto = [
        responsavel.endereco,
        responsavel.cidade,
        responsavel.cep
      ].filter(Boolean).join(' - ');
      return enderecoCompleto || 'Endereço não cadastrado';
    }
  
    // Toast otimizado
    let toastTimer = null;
    function mostrarToast(msg, tipo = 'ok') {
      if (!toast) return alert(msg);
      toast.className = `toast ${tipo}`;
      toast.textContent = msg;
      clearTimeout(toastTimer);
      void toast.offsetWidth;
      toast.classList.add('visivel');
      toastTimer = setTimeout(() => toast.classList.remove('visivel'), 3500);
    }
  
    // Função para validar formulário
    function validarFormulario(form) {
      const campos = form.querySelectorAll('[required]');
      const camposVazios = [];
      
      campos.forEach(campo => {
        if (campo.type === 'select-one') {
          if (!campo.value || campo.value === '') {
            camposVazios.push(campo.previousElementSibling?.textContent || campo.name);
          }
        } else if (campo.tagName === 'TEXTAREA') {
          if (!campo.value || campo.value.trim() === '') {
            camposVazios.push(campo.previousElementSibling?.textContent || campo.name);
          }
        } else {
          if (!campo.value || campo.value.trim() === '') {
            camposVazios.push(campo.previousElementSibling?.textContent || campo.name);
          }
        }
      });
      
      if (camposVazios.length > 0) {
        mostrarToast(`Preencha os seguintes campos: ${camposVazios.join(', ')}`, 'warn');
        return false;
      }
      
      return true;
    }
  
    // Verificar autenticação
    function verificarAutenticacao() {
      if (!usuarioAtual) {
        window.location.href = 'login.html';
        return false;
      }
      return true;
    }
  
    // ============================================
    // Sistema de Busca
    // ============================================
    function realizarBusca(termo) {
      if (!termo || termo.trim().length < 2) {
        return [];
      }
      
      const termoLower = termo.toLowerCase().trim();
      const resultados = [];
      
      // Buscar em motoristas
      motoristas.forEach(m => {
        if (
          m.nome?.toLowerCase().includes(termoLower) ||
          m.cpf?.toLowerCase().includes(termoLower) ||
          m.cnh?.toLowerCase().includes(termoLower) ||
          m.telefone?.toLowerCase().includes(termoLower)
        ) {
          resultados.push({
            tipo: 'Motorista',
            titulo: m.nome,
            subtitulo: `CPF: ${m.cpf} • CNH: ${m.cnh}`,
            id: m.id,
            dados: m
          });
        }
      });
      
      // Buscar em pais/responsáveis
      pais.forEach(p => {
        if (
          p.nome?.toLowerCase().includes(termoLower) ||
          p.cpf?.toLowerCase().includes(termoLower) ||
          p.email?.toLowerCase().includes(termoLower) ||
          p.telefone?.toLowerCase().includes(termoLower) ||
          p.endereco?.toLowerCase().includes(termoLower) ||
          p.cidade?.toLowerCase().includes(termoLower)
        ) {
          resultados.push({
            tipo: 'Responsável',
            titulo: p.nome,
            subtitulo: `CPF: ${p.cpf} • ${p.email || p.telefone}`,
            id: p.id,
            dados: p
          });
        }
      });
      
      // Buscar em alunos
      alunos.forEach(a => {
        const responsavel = pais.find(p => p.id === a.responsavelId);
        if (
          a.nome?.toLowerCase().includes(termoLower) ||
          a.escola?.toLowerCase().includes(termoLower) ||
          responsavel?.nome?.toLowerCase().includes(termoLower)
        ) {
          resultados.push({
            tipo: 'Aluno',
            titulo: a.nome,
            subtitulo: `Escola: ${a.escola} • Responsável: ${responsavel?.nome || 'N/A'}`,
            id: a.id,
            dados: a
          });
        }
      });
      
      // Buscar em rotas
      rotas.forEach(r => {
        const motorista = motoristas.find(m => m.id === r.motoristaId);
        const enderecoOrigem = obterEnderecoRota(r, 'origem');
        const enderecoDestino = obterEnderecoRota(r, 'destino');
        if (
          r.nome?.toLowerCase().includes(termoLower) ||
          enderecoOrigem?.toLowerCase().includes(termoLower) ||
          enderecoDestino?.toLowerCase().includes(termoLower) ||
          motorista?.nome?.toLowerCase().includes(termoLower)
        ) {
          resultados.push({
            tipo: 'Rota',
            titulo: r.nome,
            subtitulo: `${enderecoOrigem} → ${enderecoDestino} • ${r.horario} • Motorista: ${motorista?.nome || 'N/A'}`,
            id: r.id,
            dados: r
          });
        }
      });
      
      // Buscar em solicitações
      solicitacoes.forEach(s => {
        const rota = rotas.find(r => r.id === s.rotaId);
        const aluno = alunos.find(a => a.id === s.alunoId);
        if (
          rota?.nome?.toLowerCase().includes(termoLower) ||
          aluno?.nome?.toLowerCase().includes(termoLower) ||
          s.justificativa?.toLowerCase().includes(termoLower)
        ) {
          resultados.push({
            tipo: 'Solicitação',
            titulo: `${rota?.nome || 'Rota'} - ${aluno?.nome || 'Aluno'}`,
            subtitulo: `Status: ${s.status} • ${s.justificativa?.substring(0, 50)}...`,
            id: s.id,
            dados: s
          });
        }
      });
      
      return resultados;
    }
  
    function exibirResultadosBusca(resultados) {
      const container = el('resultadosBusca');
      if (!container) return;
      
      if (resultados.length === 0) {
        container.innerHTML = '<div class="resultado-vazio">Nenhum resultado encontrado</div>';
        container.classList.remove('oculto');
        return;
      }
      
      container.innerHTML = '';
      resultados.slice(0, 10).forEach(resultado => {
        const item = document.createElement('div');
        item.className = 'resultado-item';
        item.innerHTML = `
          <span class="resultado-tipo">${resultado.tipo}</span>
          <strong>${resultado.titulo}</strong>
          <small>${resultado.subtitulo}</small>
        `;
        item.onclick = () => {
          container.classList.add('oculto');
          el('campoBusca').value = '';
          scrollParaResultado(resultado);
        };
        container.appendChild(item);
      });
      
      container.classList.remove('oculto');
    }
  
    function scrollParaResultado(resultado) {
      switch(resultado.tipo) {
        case 'Motorista':
          document.querySelector('#formMotorista')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          break;
        case 'Responsável':
          document.querySelector('#formPai')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          break;
        case 'Aluno':
          document.querySelector('#formAluno')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          break;
        case 'Rota':
          document.querySelector('#formRota')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          break;
        case 'Solicitação':
          document.querySelector('#formSolicitar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          break;
      }
    }
  
    // ============================================
    // PÁGINA DE LOGIN
    // ============================================
    function inicializarLogin() {
      function verificarLogin() {
        try {
          const usuarioSalvo = localStorage.getItem(STORAGE_KEYS.USUARIO);
          if (usuarioSalvo) {
            window.location.href = 'index.html';
          }
        } catch (e) {
          console.warn('Erro ao verificar login:', e);
        }
      }
  
      verificarLogin();
  
      const formLogin = el('formLogin');
      if (!formLogin) return;
  
      formLogin.addEventListener('submit', e => {
        e.preventDefault();
        const { usuario, senha } = dadosDoForm(formLogin);
  
        if (!usuario || !usuario.trim()) {
          return mostrarToast('Por favor, preencha o campo de usuário.', 'warn');
        }
  
        if (!senha || senha.length < 3) {
          return mostrarToast('Senha deve ter no mínimo 3 caracteres.', 'warn');
        }
  
        usuarioAtual =
          usuario === 'admin' && senha === 'admin1234'
            ? { login: 'admin', admin: true }
            : { login: usuario, admin: false };
  
        try {
          salvarNoStorage(STORAGE_KEYS.USUARIO, usuarioAtual);
          mostrarToast(`Bem-vindo, ${usuarioAtual.login}! Redirecionando...`);
          
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 1000);
        } catch (e) {
          console.warn('Erro ao salvar login:', e);
          mostrarToast('Erro ao fazer login. Tente novamente.', 'err');
        }
      });
    }
  
    // ============================================
    // Atualização de Selects
    // ============================================
    function atualizarSelectPais() {
      const select = el('campoResponsavelAluno');
      if (!select) return;
      select.innerHTML = '<option value="">Selecione um responsável</option>';
      pais.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.nome} (${p.cpf})`;
        select.appendChild(opt);
      });
    }
  
    function atualizarSelectMotoristas() {
      const select = el('campoMotoristaRota');
      if (!select) return;
      select.innerHTML = '<option value="">Selecione um motorista</option>';
      motoristas.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = `${m.nome} (${m.cnh})`;
        select.appendChild(opt);
      });
    }
  
    function atualizarSelectRotas() {
      const select = el('campoRotaSolicitar');
      if (!select) return;
      select.innerHTML = '<option value="">Selecione uma rota</option>';
      rotas.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.id;
        const enderecoOrigem = obterEnderecoRota(r, 'origem');
        const enderecoDestino = obterEnderecoRota(r, 'destino');
        opt.textContent = `${r.nome} - ${enderecoOrigem} → ${enderecoDestino} (${r.horario})`;
        select.appendChild(opt);
      });
    }
  
    function atualizarSelectAlunos() {
      const select = el('campoAlunoSolicitar');
      if (!select) return;
      select.innerHTML = '<option value="">Selecione um aluno</option>';
      alunos.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a.id;
        opt.textContent = `${a.nome} - ${a.escola}`;
        select.appendChild(opt);
      });
    }
  
    // ============================================
    // Renderização de Listas
    // ============================================
    function renderizarMotoristas() {
      const lista = el('listaMotoristas');
      if (!lista) return;
      lista.innerHTML = '';
      if (motoristas.length === 0) {
        lista.innerHTML = '<li class="textoMutado">Nenhum motorista cadastrado</li>';
        return;
      }
      motoristas.forEach(m => {
        const li = document.createElement('li');
        li.innerHTML = `
          <span>
            <strong>${m.nome}</strong><br>
            <small class="textoMutado">CPF: ${m.cpf} • CNH: ${m.cnh} • Tel: ${m.telefone}</small>
          </span>
          <button class="botao botaoPerigo" onclick="window.excluirMotorista('${m.id}')">Excluir</button>
        `;
        lista.appendChild(li);
      });
    }
  
    function renderizarPais() {
      const lista = el('listaPais');
      if (!lista) return;
      lista.innerHTML = '';
      if (pais.length === 0) {
        lista.innerHTML = '<li class="textoMutado">Nenhum responsável cadastrado</li>';
        return;
      }
      pais.forEach(p => {
        const li = document.createElement('li');
        const enderecoCompleto = p.endereco ? `${p.endereco}${p.cidade ? ' - ' + p.cidade : ''}${p.cep ? ' - CEP: ' + p.cep : ''}`.trim() : 'Endereço não informado';
        li.innerHTML = `
          <span>
            <strong>${p.nome}</strong><br>
            <small class="textoMutado">CPF: ${p.cpf} • Tel: ${p.telefone} • Email: ${p.email}<br>
            Endereço: ${enderecoCompleto}</small>
          </span>
          <button class="botao botaoPerigo" onclick="window.excluirPai('${p.id}')">Excluir</button>
        `;
        lista.appendChild(li);
      });
    }
  
    function renderizarAlunos() {
      const lista = el('listaAlunos');
      if (!lista) return;
      lista.innerHTML = '';
      if (alunos.length === 0) {
        lista.innerHTML = '<li class="textoMutado">Nenhum aluno cadastrado</li>';
        return;
      }
      alunos.forEach(a => {
        const responsavel = pais.find(p => p.id === a.responsavelId);
        const endereco = obterEnderecoAluno(a);
        const li = document.createElement('li');
        li.innerHTML = `
          <span>
            <strong>${a.nome}</strong> (${a.idade} anos)<br>
            <small class="textoMutado">Escola: ${a.escola} • Responsável: ${responsavel ? responsavel.nome : 'N/A'}<br>
            Endereço: ${endereco}</small>
          </span>
          <button class="botao botaoPerigo" onclick="window.excluirAluno('${a.id}')">Excluir</button>
        `;
        lista.appendChild(li);
      });
    }
  
    function renderizarRotas() {
      const lista = el('listaRotas');
      if (!lista) return;
      lista.innerHTML = '';
      if (rotas.length === 0) {
        lista.innerHTML = '<li class="textoMutado">Nenhuma rota cadastrada</li>';
        return;
      }
      rotas.forEach(r => {
        const motorista = motoristas.find(m => m.id === r.motoristaId);
        const enderecoOrigem = obterEnderecoRota(r, 'origem');
        const enderecoDestino = obterEnderecoRota(r, 'destino');
        const li = document.createElement('li');
        li.innerHTML = `
          <span>
            <strong>${r.nome}</strong><br>
            <small class="textoMutado">${enderecoOrigem} → ${enderecoDestino} • ${r.horario} • ${r.vagas} vagas • Motorista: ${motorista ? motorista.nome : 'N/A'}</small>
          </span>
          <button class="botao botaoPerigo" onclick="window.excluirRota('${r.id}')">Excluir</button>
        `;
        lista.appendChild(li);
      });
    }
  
    function renderizarSolicitacoes() {
      const lista = el('listaSolicitacoes');
      if (!lista) return;
      lista.innerHTML = '';
      if (solicitacoes.length === 0) {
        lista.innerHTML = '<li class="textoMutado">Nenhuma solicitação</li>';
        return;
      }
      solicitacoes.forEach(s => {
        const rota = rotas.find(r => r.id === s.rotaId);
        const aluno = alunos.find(a => a.id === s.alunoId);
        const endereco = aluno ? obterEnderecoAluno(aluno) : 'N/A';
        const statusIcon = {
          aprovada: '✅ Aprovada',
          pendente: '⏳ Pendente',
          confirmada: '✅ Confirmada',
          negada: '❌ Negada'
        }[s.status] || s.status;
        
        const li = document.createElement('li');
        const botoes = s.status === 'pendente' 
          ? `<button class="botao botaoSucesso" onclick="window.confirmarSolicitacao('${s.id}')">Confirmar</button>
             <button class="botao botaoPerigo" onclick="window.excluirSolicitacao('${s.id}')">Excluir</button>`
          : `<button class="botao botaoPerigo" onclick="window.excluirSolicitacao('${s.id}')">Excluir</button>`;
        
        li.innerHTML = `
          <span>
            <strong>${rota ? rota.nome : 'Rota não encontrada'}</strong><br>
            <small class="textoMutado">Aluno: ${aluno ? aluno.nome : 'N/A'} • ${statusIcon}<br>
            Endereço: ${endereco}<br>
            Justificativa: ${s.justificativa}</small>
          </span>
          <div style="display: flex; gap: 8px;">
            ${botoes}
          </div>
        `;
        lista.appendChild(li);
      });
    }
  
    function atualizarTudo() {
      renderizarMotoristas();
      renderizarPais();
      renderizarAlunos();
      renderizarRotas();
      renderizarSolicitacoes();
      atualizarSelectPais();
      atualizarSelectMotoristas();
      atualizarSelectRotas();
      atualizarSelectAlunos();
      atualizarSeletorRotasMapa();
      atualizarMapa();
      salvarDados();
    }

    // ============================================
    // Sistema de Mapa
    // ============================================
    let mapa = null;
    let marcadores = [];
    let polylines = [];
    let rotaSelecionadaMapa = 'todas';

    // Função para geocodificar um endereço (converter em coordenadas)
    async function geocodificarEndereco(endereco) {
      if (!endereco || !endereco.trim()) {
        return null;
      }

      try {
        // Usando Nominatim API (gratuita, sem chave)
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco)}&limit=1&countrycodes=br`;
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'TransporteEscolar/1.0'
          }
        });
        
        if (!response.ok) {
          throw new Error('Erro na requisição');
        }
        
        const data = await response.json();
        
        if (data && data.length > 0) {
          return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
            enderecoCompleto: data[0].display_name
          };
        }
        
        return null;
      } catch (error) {
        console.warn(`Erro ao geocodificar "${endereco}":`, error);
        return null;
      }
    }

    // Atualizar seletor de rotas no mapa
    function atualizarSeletorRotasMapa() {
      const seletor = el('seletorRotaMapa');
      if (!seletor) return;

      const valorAtual = seletor.value;
      seletor.innerHTML = '<option value="todas">Todas as Rotas</option>';

      rotas.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.id;
        const enderecoOrigem = obterEnderecoRota(r, 'origem');
        const enderecoDestino = obterEnderecoRota(r, 'destino');
        opt.textContent = `${r.nome} - ${enderecoOrigem} → ${enderecoDestino}`;
        seletor.appendChild(opt);
      });

      // Restaurar valor selecionado se ainda existir
      if (valorAtual && rotas.find(r => r.id === valorAtual)) {
        seletor.value = valorAtual;
      } else {
        seletor.value = 'todas';
        rotaSelecionadaMapa = 'todas';
      }
    }

    // Inicializar o mapa
    function inicializarMapa() {
      const containerMapa = el('mapaRotas');
      if (!containerMapa) {
        console.warn('Container do mapa não encontrado');
        return;
      }

      if (typeof L === 'undefined') {
        console.warn('Leaflet não está carregado. Tentando novamente...');
        setTimeout(inicializarMapa, 500);
        return;
      }

      // Se o mapa já foi inicializado, apenas atualizar
      if (mapa) {
        atualizarMapa();
        return;
      }

      try {
        // Criar mapa centralizado no Brasil (coordenadas aproximadas)
        mapa = L.map('mapaRotas', {
          zoomControl: true,
          attributionControl: true
        }).setView([-14.2350, -51.9253], 5);

        // Adicionar camada de tiles (OpenStreetMap com tema claro)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19
        }).addTo(mapa);

        console.log('Mapa inicializado com sucesso');
        
        // Atualizar o mapa após inicializar
        atualizarMapa();
      } catch (error) {
        console.error('Erro ao inicializar mapa:', error);
      }
    }

    // Limpar marcadores e polylines do mapa
    function limparMapa() {
      if (!mapa) return;
      marcadores.forEach(marker => mapa.removeLayer(marker));
      polylines.forEach(polyline => mapa.removeLayer(polyline));
      marcadores = [];
      polylines = [];
    }

    // Atualizar o mapa com as rotas cadastradas
    async function atualizarMapa() {
      if (!mapa) {
        console.warn('Mapa não inicializado');
        return;
      }

      limparMapa();

      if (rotas.length === 0) {
        console.log('Nenhuma rota cadastrada');
        return;
      }

      // Filtrar rotas baseado na seleção
      let rotasParaMostrar = rotas;
      if (rotaSelecionadaMapa && rotaSelecionadaMapa !== 'todas') {
        rotasParaMostrar = rotas.filter(r => r.id === rotaSelecionadaMapa);
      }

      if (rotasParaMostrar.length === 0) {
        console.log('Nenhuma rota para mostrar');
        return;
      }

      const coordenadasRotas = [];
      let rotasProcessadas = 0;

      // Processar cada rota
      for (const rota of rotasParaMostrar) {
        const motorista = motoristas.find(m => m.id === rota.motoristaId);
        
        // Obter endereços completos (suporta formato antigo e novo)
        const enderecoOrigem = obterEnderecoRota(rota, 'origem');
        const enderecoDestino = obterEnderecoRota(rota, 'destino');
        
        // Geocodificar origem e destino
        const coordOrigem = await geocodificarEndereco(enderecoOrigem);
        const coordDestino = await geocodificarEndereco(enderecoDestino);

        if (coordOrigem && coordDestino) {
          coordenadasRotas.push({
            rota: rota,
            motorista: motorista,
            origem: coordOrigem,
            destino: coordDestino
          });

          // Adicionar marcador de origem (azul)
          const markerOrigem = L.marker([coordOrigem.lat, coordOrigem.lng], {
            icon: L.divIcon({
              className: 'marker-origem',
              html: '<div style="background-color: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            })
          });

          markerOrigem.bindPopup(`
            <strong>Origem: ${rota.nome}</strong><br>
            <small>${coordOrigem.enderecoCompleto || enderecoOrigem}</small><br>
            <small>Horário: ${rota.horario}</small>
          `);
          markerOrigem.addTo(mapa);
          marcadores.push(markerOrigem);

          // Adicionar marcador de destino (vermelho)
          const markerDestino = L.marker([coordDestino.lat, coordDestino.lng], {
            icon: L.divIcon({
              className: 'marker-destino',
              html: '<div style="background-color: #ef4444; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            })
          });

          markerDestino.bindPopup(`
            <strong>Destino: ${rota.nome}</strong><br>
            <small>${coordDestino.enderecoCompleto || enderecoDestino}</small><br>
            <small>Motorista: ${motorista ? motorista.nome : 'N/A'}</small><br>
            <small>Vagas: ${rota.vagas}</small>
          `);
          markerDestino.addTo(mapa);
          marcadores.push(markerDestino);

          // Adicionar linha conectando origem e destino
          const polyline = L.polyline(
            [[coordOrigem.lat, coordOrigem.lng], [coordDestino.lat, coordDestino.lng]],
            {
              color: '#d4a620',
              weight: 3,
              opacity: 0.7,
              dashArray: '10, 5'
            }
          ).addTo(mapa);
          polylines.push(polyline);
        }

        rotasProcessadas++;
        
        // Aguardar um pouco entre requisições para evitar rate limiting
        if (rotasProcessadas < rotas.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Ajustar o zoom do mapa para mostrar todas as rotas
      if (coordenadasRotas.length > 0) {
        const bounds = [];
        coordenadasRotas.forEach(coord => {
          bounds.push([coord.origem.lat, coord.origem.lng]);
          bounds.push([coord.destino.lat, coord.destino.lng]);
        });
        mapa.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  
    // ============================================
    // Funções de Exclusão e Ação (expostas globalmente)
    // ============================================
    window.excluirMotorista = (id) => {
      if (!confirm('Deseja realmente excluir este motorista?')) return;
      motoristas = motoristas.filter(m => m.id !== id);
      rotas = rotas.filter(r => r.motoristaId !== id);
      atualizarTudo();
      mostrarToast('Motorista excluído com sucesso.');
    };
  
    window.excluirPai = (id) => {
      if (!confirm('Deseja realmente excluir este responsável? Os alunos vinculados serão afetados.')) return;
      pais = pais.filter(p => p.id !== id);
      alunos = alunos.filter(a => a.responsavelId !== id);
      atualizarTudo();
      mostrarToast('Responsável excluído com sucesso.');
    };
  
    window.excluirAluno = (id) => {
      if (!confirm('Deseja realmente excluir este aluno?')) return;
      alunos = alunos.filter(a => a.id !== id);
      solicitacoes = solicitacoes.filter(s => s.alunoId !== id);
      atualizarTudo();
      mostrarToast('Aluno excluído com sucesso.');
    };
  
    window.excluirRota = (id) => {
      if (!confirm('Deseja realmente excluir esta rota? As solicitações vinculadas serão afetadas.')) return;
      rotas = rotas.filter(r => r.id !== id);
      solicitacoes = solicitacoes.filter(s => s.rotaId !== id);
      atualizarTudo();
      mostrarToast('Rota excluída com sucesso.');
    };
  
    window.excluirSolicitacao = (id) => {
      if (!confirm('Deseja realmente excluir esta solicitação?')) return;
      solicitacoes = solicitacoes.filter(s => s.id !== id);
      atualizarTudo();
      mostrarToast('Solicitação excluída com sucesso.');
    };
  
    window.confirmarSolicitacao = (id) => {
      const solicitacao = solicitacoes.find(s => s.id === id);
      if (!solicitacao) return;
      
      solicitacao.status = 'confirmada';
      atualizarTudo();
      mostrarToast('Solicitação confirmada com sucesso!');
    };
  
    // ============================================
    // SISTEMA PRINCIPAL
    // ============================================
    function inicializarSistema() {
      carregarDados();
  
      if (!verificarAutenticacao()) return;
  
      if (usuarioAtual && el('usuarioLogado')) {
        el('usuarioLogado').textContent = `Usuário: ${usuarioAtual.login}`;
      }
  
      // Logout
      el('btnSair')?.addEventListener('click', () => {
        usuarioAtual = null;
        salvarDados();
        localStorage.removeItem(STORAGE_KEYS.USUARIO);
        window.location.href = 'login.html';
      });
  
      // Sistema de Busca
      const campoBusca = el('campoBusca');
      const resultadosBusca = el('resultadosBusca');
      
      if (campoBusca && resultadosBusca) {
        let buscaTimer = null;
        
        campoBusca.addEventListener('input', (e) => {
          clearTimeout(buscaTimer);
          const termo = e.target.value;
          
          if (termo.length < 2) {
            resultadosBusca.classList.add('oculto');
            return;
          }
          
          buscaTimer = setTimeout(() => {
            const resultados = realizarBusca(termo);
            exibirResultadosBusca(resultados);
          }, 300);
        });
        
        // Fechar resultados ao clicar fora
        document.addEventListener('click', (e) => {
          if (!campoBusca.contains(e.target) && !resultadosBusca.contains(e.target)) {
            resultadosBusca.classList.add('oculto');
          }
        });
        
        // Fechar ao pressionar ESC
        campoBusca.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            resultadosBusca.classList.add('oculto');
            campoBusca.blur();
          }
        });
      }
  
      // Cadastro Motorista
      el('formMotorista')?.addEventListener('submit', e => {
        e.preventDefault();
        const form = el('formMotorista');
        if (!validarFormulario(form)) return;
        
        const dados = dadosDoForm(form);
        const novoMotorista = {
          id: Date.now().toString(),
          ...dados,
          criadoEm: new Date().toISOString()
        };
        motoristas.push(novoMotorista);
        atualizarTudo();
        mostrarToast('Motorista cadastrado com sucesso!');
        form.reset();
      });
  
      // Cadastro Pai
      el('formPai')?.addEventListener('submit', e => {
        e.preventDefault();
        const form = el('formPai');
        if (!validarFormulario(form)) return;
        
        const dados = dadosDoForm(form);
        const novoPai = {
          id: Date.now().toString(),
          ...dados,
          criadoEm: new Date().toISOString()
        };
        pais.push(novoPai);
        atualizarTudo();
        mostrarToast('Responsável cadastrado com sucesso!');
        form.reset();
      });
  
      // Cadastro Aluno
      el('formAluno')?.addEventListener('submit', e => {
        e.preventDefault();
        const form = el('formAluno');
        if (!validarFormulario(form)) return;
        
        const dados = dadosDoForm(form);
        const novoAluno = {
          id: Date.now().toString(),
          ...dados,
          criadoEm: new Date().toISOString()
        };
        alunos.push(novoAluno);
        atualizarTudo();
        mostrarToast('Aluno cadastrado com sucesso!');
        form.reset();
      });
  
      // Cadastro Rota
      el('formRota')?.addEventListener('submit', e => {
        e.preventDefault();
        const form = el('formRota');
        if (!validarFormulario(form)) return;
        
        const dados = dadosDoForm(form);
        
        // Montar endereços completos a partir dos campos separados
        const origemCompleto = montarEnderecoCompleto(
          dados.origemRua,
          dados.origemNumero,
          dados.origemBairro,
          dados.origemCidade,
          dados.origemEstado,
          dados.origemCEP
        );
        
        const destinoCompleto = montarEnderecoCompleto(
          dados.destinoRua,
          dados.destinoNumero,
          dados.destinoBairro,
          dados.destinoCidade,
          dados.destinoEstado,
          dados.destinoCEP
        );
        
        const novaRota = {
          id: Date.now().toString(),
          nome: dados.nome,
          motoristaId: dados.motoristaId,
          horario: dados.horario,
          vagas: dados.vagas,
          // Campos separados
          origemRua: dados.origemRua,
          origemNumero: dados.origemNumero,
          origemBairro: dados.origemBairro,
          origemCidade: dados.origemCidade,
          origemEstado: dados.origemEstado,
          origemCEP: dados.origemCEP,
          destinoRua: dados.destinoRua,
          destinoNumero: dados.destinoNumero,
          destinoBairro: dados.destinoBairro,
          destinoCidade: dados.destinoCidade,
          destinoEstado: dados.destinoEstado,
          destinoCEP: dados.destinoCEP,
          // Endereço completo (para compatibilidade)
          origem: origemCompleto,
          destino: destinoCompleto,
          criadoEm: new Date().toISOString()
        };
        
        rotas.push(novaRota);
        atualizarTudo();
        mostrarToast('Rota cadastrada com sucesso!');
        form.reset();
      });
  
      // Solicitar Vaga
      el('formSolicitar')?.addEventListener('submit', e => {
        e.preventDefault();
        const form = el('formSolicitar');
        if (!validarFormulario(form)) return;
        
        const dados = dadosDoForm(form);
        const novaSolicitacao = {
          id: Date.now().toString(),
          ...dados,
          status: usuarioAtual?.admin ? 'aprovada' : 'pendente',
          autor: usuarioAtual?.login || 'anônimo',
          criadoEm: new Date().toISOString()
        };
        solicitacoes.push(novaSolicitacao);
        atualizarTudo();
        mostrarToast(novaSolicitacao.status === 'aprovada' ? 'Vaga aprovada automaticamente!' : 'Solicitação enviada!');
        form.reset();
      });
  
      atualizarTudo();
      
      // Máscaras para campos de endereço
      const camposCEP = ['campoOrigemCEP', 'campoDestinoCEP'];
      camposCEP.forEach(id => {
        const campo = el(id);
        if (campo) {
          campo.addEventListener('input', (e) => {
            let valor = e.target.value.replace(/\D/g, '');
            if (valor.length > 5) {
              valor = valor.substring(0, 5) + '-' + valor.substring(5, 8);
            }
            e.target.value = valor;
          });
        }
      });

      const camposEstado = ['campoOrigemEstado', 'campoDestinoEstado'];
      camposEstado.forEach(id => {
        const campo = el(id);
        if (campo) {
          campo.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 2);
          });
        }
      });
      
      // Inicializar mapa após um pequeno delay para garantir que o Leaflet carregou
      setTimeout(() => {
        inicializarMapa();
      }, 500);

      // Event listener para o seletor de rotas do mapa
      const seletorRotaMapa = el('seletorRotaMapa');
      if (seletorRotaMapa) {
        seletorRotaMapa.addEventListener('change', (e) => {
          rotaSelecionadaMapa = e.target.value;
          atualizarMapa();
        });
      }
    }
  
    // ============================================
    // Inicialização baseada na página
    // ============================================
    document.addEventListener('DOMContentLoaded', () => {
      const formLogin = el('formLogin');
      const sistemaPrincipal = el('sistemaPrincipal');
  
      if (formLogin && !sistemaPrincipal) {
        inicializarLogin();
      } else if (sistemaPrincipal) {
        inicializarSistema();
            // Atualizar ano no footer
    const anoElement = document.getElementById('anoAtual');
    if (anoElement) {
      anoElement.textContent = new Date().getFullYear();
    }

    atualizarTudo();
      }
    });
  })();