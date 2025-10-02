//modal de login
function abrirLogin() { 
    const miModal = document.getElementById("modalLogin");
    if(modal && modal.showModal==="function"){ 
        modal.showModal();
    } else {
        alert("Modal no soportado em este navegador");
    }
}

    //rola suavemente até o formulario rápido
function rolarParaRapido() {
    const formRapido = document.querySelector(".formRapido");
    if(formRapido){
        formRapido.scrollIntoView({behavior:"smooth",block:"start"});
    }
}

//validação simples da reserva rápida
(function iniciarValidacao(){
    const formRapido = document.querySelector(".formRapido");

    if(!formRapido) return;

    const seletorRecurso = formRapido.querySelector("select");
    const campoData = formRapido.querySelector('input[type="date"]');
    const campoInicio = formRapido.querySelector('input[placeholder="Início"]');
    const campoFim = formRapido.querySelector('input[placeholder="fim"]');

    //remover a marcação de erro ao digitar
    [seletorRecurso, campoData, campoInicio, campoFim].forEach(el=>{
        if(!el) return;
        el.addEventListener("input", ()=>el.style.borderColor="");
        el.addEventListener("change", ()=>el.style.borderColor="");
    });

    formRapido.addEventListener("submit", (event)=>{
        event.preventDefault();
    
        let valido =true;
        if(seletorRecurso && seletorRecurso.selectedIndex ===0){
            seletorRecurso.style.borderColor="red";
            valido = false;
        }

        //valida data
        if(campoData && !campoData.value){
            campoData.style.borderColor="red";
            valido = false;
        }

        //validar horarios
        const hInicio = campoInicio?.value || '';
        const hFim = campoFim?.value || ''; 

        if(!hInicio){
            campoInicio.style.borderColor="red";
            valido = false;
        }

        if(!hFim){
            campoFim.style.borderColor="red";
            valido = false;
        }

        if(hInicio && hFim && hInicio >= hFim){
            campoInicio.style.borderColor="red";
            campoFim.style.borderColor="red";
            alert("Horário final deve ser maior que o horário inicial");
            return;
        }
    })

})();

// Gerenciamento de Rotas
(function iniciarRotas() {
    let rotas = [];
    let editIndex = null;

    const formRota = document.getElementById('formRota');
    const nomeRota = document.getElementById('nomeRota');
    const origemRota = document.getElementById('origemRota');
    const destinoRota = document.getElementById('destinoRota');
    const listaRotas = document.getElementById('listaRotas');

    function renderRotas() {
        if (!listaRotas) return;
        listaRotas.innerHTML = '';
        rotas.forEach((rota, idx) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <strong>${rota.nome}</strong> | Origem: ${rota.origem} | Destino: ${rota.destino}
                <button onclick="editarRota(${idx})">Editar</button>
                <button onclick="excluirRota(${idx})">Excluir</button>
            `;
            listaRotas.appendChild(li);
        });
    }

    window.editarRota = function(idx) {
        if (!rotas[idx]) return;
        nomeRota.value = rotas[idx].nome;
        origemRota.value = rotas[idx].origem;
        destinoRota.value = rotas[idx].destino;
        editIndex = idx;
    };

    window.excluirRota = function(idx) {
        rotas.splice(idx, 1);
        renderRotas();
    };

    if (formRota) {
        formRota.addEventListener('submit', function(e) {
            e.preventDefault();
            const nome = nomeRota.value.trim();
            const origem = origemRota.value.trim();
            const destino = destinoRota.value.trim();

            let valido = true;
            [nomeRota, origemRota, destinoRota].forEach(el => el.style.borderColor = "");
            if (!nome) { nomeRota.style.borderColor = "red"; valido = false; }
            if (!origem) { origemRota.style.borderColor = "red"; valido = false; }
            if (!destino) { destinoRota.style.borderColor = "red"; valido = false; }
            if (!valido) {
                alert("Por favor, preencha todos os campos da rota.");
                return;
            }

            if (editIndex !== null) {
                rotas[editIndex] = { nome, origem, destino };
                editIndex = null;
            } else {
                rotas.push({ nome, origem, destino });
                alert("Rota adicionada com sucesso!");
            }
            formRota.reset();
            renderRotas();
        });
    }

    renderRotas();
})();

// Gerenciamento de Alunos
(function iniciarAlunos() {
    let alunos = [];
    const formAluno = document.getElementById('formAluno');
    const nomeAluno = document.getElementById('nomeAluno');
    const rotaAluno = document.getElementById('rotaAluno');
    const listaAlunos = document.getElementById('listaAlunos');

    function renderAlunos() {
        if (!listaAlunos) return;
        listaAlunos.innerHTML = '';
        alunos.forEach((aluno, idx) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <strong>${aluno.nome}</strong> | Rota: ${aluno.rota}
                <button onclick="excluirAluno(${idx})">Excluir</button>
            `;
            listaAlunos.appendChild(li);
        });
    }

    window.excluirAluno = function(idx) {
        alunos.splice(idx, 1);
        renderAlunos();
    };

    if (formAluno) {
        formAluno.addEventListener('submit', function(e) {
            e.preventDefault();
            const nome = nomeAluno.value.trim();
            const rota = rotaAluno.value.trim();

            let valido = true;
            [nomeAluno, rotaAluno].forEach(el => el.style.borderColor = "");
            if (!nome) { nomeAluno.style.borderColor = "red"; valido = false; }
            if (!rota) { rotaAluno.style.borderColor = "red"; valido = false; }
            if (!valido) {
                alert("Por favor, preencha todos os campos do aluno.");
                return;
            }

            alunos.push({ nome, rota });
            formAluno.reset();
            renderAlunos();
        });
    }

    renderAlunos();
})();

// Gerenciamento de Responsáveis
(function iniciarResponsaveis() {
    let responsaveis = [];
    const formResponsavel = document.getElementById('formResponsavel');
    const nomeResponsavel = document.getElementById('nomeResponsavel');
    const alunoResponsavel = document.getElementById('alunoResponsavel');
    const listaResponsaveis = document.getElementById('listaResponsaveis');

    function renderResponsaveis() {
        if (!listaResponsaveis) return;
        listaResponsaveis.innerHTML = '';
        responsaveis.forEach((resp, idx) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <strong>${resp.nome}</strong> | Aluno: ${resp.aluno}
                <button onclick="excluirResponsavel(${idx})">Excluir</button>
            `;
            listaResponsaveis.appendChild(li);
        });
    }

    window.excluirResponsavel = function(idx) {
        responsaveis.splice(idx, 1);
        renderResponsaveis();
    };

    if (formResponsavel) {
        formResponsavel.addEventListener('submit', function(e) {
            e.preventDefault();
            const nome = nomeResponsavel.value.trim();
            const aluno = alunoResponsavel.value.trim();

            let valido = true;
            [nomeResponsavel, alunoResponsavel].forEach(el => el.style.borderColor = "");
            if (!nome) { nomeResponsavel.style.borderColor = "red"; valido = false; }
            if (!aluno) { alunoResponsavel.style.borderColor = "red"; valido = false; }
            if (!valido) {
                alert("Por favor, preencha todos os campos do responsável.");
                return;
            }

            responsaveis.push({ nome, aluno });
            formResponsavel.reset();
            renderResponsaveis();
        });
    }

    renderResponsaveis();
})();

// Gerenciamento de Motoristas
(function iniciarMotoristas() {
    let motoristas = [];
    const formMotorista = document.getElementById('formMotorista');
    const nomeMotorista = document.getElementById('nomeMotorista');
    const rotaMotorista = document.getElementById('rotaMotorista');
    const listaMotoristas = document.getElementById('listaMotoristas');

    function renderMotoristas() {
        if (!listaMotoristas) return;
        listaMotoristas.innerHTML = '';
        motoristas.forEach((mot, idx) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <strong>${mot.nome}</strong> | Rota: ${mot.rota}
                <button onclick="excluirMotorista(${idx})">Excluir</button>
            `;
            listaMotoristas.appendChild(li);
        });
    }

    window.excluirMotorista = function(idx) {
        motoristas.splice(idx, 1);
        renderMotoristas();
    };

    if (formMotorista) {
        formMotorista.addEventListener('submit', function(e) {
            e.preventDefault();
            const nome = nomeMotorista.value.trim();
            const rota = rotaMotorista.value.trim();

            let valido = true;
            [nomeMotorista, rotaMotorista].forEach(el => el.style.borderColor = "");
            if (!nome) { nomeMotorista.style.borderColor = "red"; valido = false; }
            if (!rota) { rotaMotorista.style.borderColor = "red"; valido = false; }
            if (!valido) {
                alert("Por favor, preencha todos os campos do motorista.");
                return;
            }

            motoristas.push({ nome, rota });
            formMotorista.reset();
            renderMotoristas();
        });
    }

    renderMotoristas();
})();



