'use strict';

/* =========================================================
   CONFIGURAÇÃO
   ========================================================= */
const CONFIG = {
    API_BASE_URL: window.STREAW_API_URL || 'https://streaw-ibke.onrender.com',
    IMG_BASE: 'https://image.tmdb.org/t/p',
    DEBOUNCE_MS: 350,
    CONSULTA_INICIAL: 'Interstellar',
    PLACEHOLDER: 'data:image/svg+xml;utf8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="750">' +
        '<rect width="100%" height="100%" fill="#1a1d26"/>' +
        '<text x="50%" y="50%" fill="#8c939d" font-family="sans-serif" font-size="32" ' +
        'text-anchor="middle">Sem capa</text></svg>'
    )
};

const GENEROS = {
    28: 'Ação', 12: 'Aventura', 16: 'Animação', 35: 'Comédia',
    80: 'Crime', 99: 'Documentário', 18: 'Drama', 10751: 'Família',
    14: 'Fantasia', 36: 'História', 27: 'Terror', 10402: 'Música',
    9648: 'Mistério', 10749: 'Romance', 878: 'Ficção Científica',
    10770: 'Cinema TV', 53: 'Thriller', 10752: 'Guerra', 37: 'Faroeste'
};

// Valor do <select> do dashboard -> id do gênero no TMDB
const GENERO_ID_POR_CONSULTA = {
    Action: 28, Comedy: 35, Drama: 18, 'Science Fiction': 878, Animation: 16, Horror: 27
};

const TITULOS_ABAS = { home: 'Início', minhaLista: 'Minha Lista', dashboard: 'Dashboard' };
const CORES_ROSCA = ['#0080ff', '#00e5ff', '#7000ff', '#ff007f', '#ffaa00', '#00ff88', '#ff4444', '#aaaaaa'];

/* =========================================================
   ESTADO
   ========================================================= */
const estado = {
    abaAtual: 'home',
    filmeSelecionado: null,
    idsSalvos: new Set(),
    listaSalva: [],
    abortBusca: null,
    tokenDashboard: 0,
    graficos: {}
};

const $ = (id) => document.getElementById(id);
const ehMobile = () => window.matchMedia('(max-width: 991.98px)').matches;

/* =========================================================
   UTILITÁRIOS
   ========================================================= */
function criar(tag, props = {}, filhos = []) {
    const elemento = document.createElement(tag);
    Object.entries(props).forEach(([chave, valor]) => {
        if (valor === undefined || valor === null) return;
        if (chave === 'class') elemento.className = valor;
        else if (chave === 'text') elemento.textContent = valor;
        else if (chave === 'on') Object.entries(valor).forEach(([ev, fn]) => elemento.addEventListener(ev, fn));
        else elemento.setAttribute(chave, valor);
    });
    [].concat(filhos).forEach(f => elemento.append(f));
    return elemento;
}

function debounce(fn, atraso) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), atraso);
    };
}

async function buscarJson(url, opcoes = {}) {
    const resposta = await fetch(url, opcoes);
    if (!resposta.ok) throw new Error(`Erro ${resposta.status} ao acessar o servidor.`);
    const texto = await resposta.text();
    return texto ? JSON.parse(texto) : null;
}

const extrairLista = (dados) => Array.isArray(dados) ? dados : (dados?.results || []);

// Converte qualquer formato (backend ou TMDB) em um único objeto
function normalizarFilme(f) {
    const posterPath = f.posterPath || f.poster_path || '';
    const data = f.dataLancamento || f.release_date || '';
    const ano = f.ano || (data ? String(data).split('-')[0] : 'N/D');
    return {
        id: f.id,
        titulo: f.titulo || f.title || 'Sem título',
        ano,
        sinopse: f.sinopse || f.overview || 'Sem sinopse disponível.',
        nota: Number(f.nota ?? f.vote_average ?? 0),
        posterPath,
        poster: urlImagem(posterPath, 'w500'),
        backdropPath: f.backdropPath || f.backdrop_path || '',
        generos: f.genreIds || f.genre_ids || [],
        generosObj: f.genres || [],
        dataLancamento: data
    };
}

function urlImagem(caminho, tamanho) {
    if (!caminho) return CONFIG.PLACEHOLDER;
    return caminho.startsWith('http') ? caminho : `${CONFIG.IMG_BASE}/${tamanho}${caminho}`;
}

/* =========================================================
   FEEDBACK: TOASTS, CARREGAMENTO E ERROS
   ========================================================= */
function mostrarToast(mensagem, tipo = 'primary') {
    const container = $('toastContainer');
    const toast = criar('div', {
        class: `toast align-items-center text-bg-${tipo} border-0`,
        role: tipo === 'danger' ? 'alert' : 'status',
        'aria-live': tipo === 'danger' ? 'assertive' : 'polite',
        'aria-atomic': 'true'
    }, criar('div', { class: 'd-flex' }, [
        criar('div', { class: 'toast-body', text: mensagem }),
        criar('button', {
            type: 'button', class: 'btn-close btn-close-white me-2 m-auto',
            'data-bs-dismiss': 'toast', 'aria-label': 'Fechar'
        })
    ]));
    container.append(toast);
    toast.addEventListener('hidden.bs.toast', () => toast.remove());
    new bootstrap.Toast(toast, { delay: 3500 }).show();
}

function mostrarCarregando(container, texto = 'Carregando...') {
    container.replaceChildren(
        criar('div', { class: 'col-12 text-center text-secondary py-5', role: 'status' }, [
            criar('div', { class: 'spinner-border spinner-border-sm me-2', 'aria-hidden': 'true' }),
            texto
        ])
    );
}

function mostrarErro(container, mensagem, aoTentarNovamente) {
    const filhos = [criar('p', { class: 'text-danger mb-2', text: mensagem })];
    if (aoTentarNovamente) {
        filhos.push(criar('button', {
            type: 'button', class: 'btn btn-sm btn-outline-light rounded-pill',
            text: 'Tentar novamente', on: { click: aoTentarNovamente }
        }));
    }
    container.replaceChildren(criar('div', { class: 'col-12 text-center py-4', role: 'alert' }, filhos));
}

/* =========================================================
   NAVEGAÇÃO
   ========================================================= */
function mudarAba(nomeAba) {
    estado.abaAtual = nomeAba;

    document.querySelectorAll('.view-section').forEach(s => s.classList.toggle('active', s.id === `view-${nomeAba}`));
    document.querySelectorAll('.sidebar-capsule .nav-link').forEach(btn => {
        const ativo = btn.dataset.aba === nomeAba;
        btn.classList.toggle('active', ativo);
        if (ativo) btn.setAttribute('aria-current', 'page');
        else btn.removeAttribute('aria-current');
    });

    $('tituloSecao').textContent = TITULOS_ABAS[nomeAba];

    // A busca só faz sentido no Início e na Minha Lista
    const input = $('inputBusca');
    $('buscaWrapper').classList.toggle('invisible', nomeAba === 'dashboard');
    input.value = '';
    input.placeholder = nomeAba === 'minhaLista' ? 'Filtrar minha lista...' : 'Pesquisar filmes...';

    if (nomeAba === 'minhaLista') carregarMinhaLista();
    if (nomeAba === 'dashboard') atualizarDashboard();
}

function configurarNavegacao() {
    document.querySelectorAll('.sidebar-capsule .nav-link').forEach(btn => {
        btn.addEventListener('click', () => mudarAba(btn.dataset.aba));
    });
}

function configurarPainelColapsavel() {
    const painel = $('painelDetalhes');
    const btn = $('btnTogglePainel');
    const icone = $('iconeToggle');

    const sincronizar = () => {
        const fechado = painel.classList.contains('collapsed');
        icone.className = fechado ? 'bi bi-chevron-left' : 'bi bi-chevron-right';
        btn.setAttribute('aria-expanded', String(!fechado));
        btn.setAttribute('aria-label', fechado ? 'Abrir painel de detalhes' : 'Fechar painel de detalhes');
    };

    btn.addEventListener('click', () => { painel.classList.toggle('collapsed'); sincronizar(); });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && ehMobile() && !painel.classList.contains('collapsed')) {
            painel.classList.add('collapsed');
            sincronizar();
        }
    });

    if (ehMobile()) painel.classList.add('collapsed');
    sincronizar();
}

function abrirPainel() {
    const painel = $('painelDetalhes');
    painel.classList.remove('collapsed');
    $('iconeToggle').className = 'bi bi-chevron-right';
    $('btnTogglePainel').setAttribute('aria-expanded', 'true');
    $('btnTogglePainel').setAttribute('aria-label', 'Fechar painel de detalhes');
}

/* =========================================================
   HOME E BUSCA
   ========================================================= */
async function carregarFilmesIniciais() {
    const container = $('resultadoBusca');
    mostrarCarregando(container);
    try {
        const dados = await buscarJson(`${CONFIG.API_BASE_URL}/tmdb?consulta=${encodeURIComponent(CONFIG.CONSULTA_INICIAL)}`);
        const filmes = extrairLista(dados).map(normalizarFilme);
        exibirFilmes(filmes, container);

        if (filmes.length) {
            atualizarBannerDestaque(filmes[0]);
            if (!ehMobile()) atualizarPainelLateral(filmes[0]);
        } else {
            atualizarBannerErro('Nenhum destaque disponível.');
        }
    } catch (erro) {
        console.error(erro);
        mostrarErro(container, 'Não foi possível carregar os filmes. Verifique se o servidor está no ar.', carregarFilmesIniciais);
        atualizarBannerErro('Não foi possível carregar o destaque.');
    }
}

function atualizarBannerDestaque(filme) {
    const banner = $('bannerDestaque');
    if (filme.backdropPath) {
        banner.style.background =
            `linear-gradient(to top, rgba(11,12,16,0.95), rgba(11,12,16,0.4)), ` +
            `url('${urlImagem(filme.backdropPath, 'original')}') center/cover`;
    }
    $('bannerTitulo').textContent = filme.titulo;
    $('bannerSinopse').textContent = filme.sinopse;
}

function atualizarBannerErro(mensagem) {
    $('bannerTitulo').textContent = 'Streaw';
    $('bannerSinopse').textContent = mensagem;
}

async function buscarFilmes(termo) {
    const container = $('resultadoBusca');

    if (estado.abortBusca) estado.abortBusca.abort();
    estado.abortBusca = new AbortController();
    const { signal } = estado.abortBusca;

    mostrarCarregando(container, 'Buscando...');
    try {
        const dados = await buscarJson(`${CONFIG.API_BASE_URL}/tmdb?consulta=${encodeURIComponent(termo)}`, { signal });
        exibirFilmes(extrairLista(dados).map(normalizarFilme), container);
    } catch (erro) {
        if (erro.name === 'AbortError') return; // há uma busca mais nova em andamento
        console.error(erro);
        mostrarErro(container, 'Erro ao buscar filmes.', () => buscarFilmes(termo));
    }
}

function filtrarMinhaLista(termo) {
    const t = termo.toLowerCase();
    const filtrados = estado.listaSalva.filter(f => f.titulo.toLowerCase().includes(t));
    exibirFilmes(filtrados, $('containerMinhaLista'), true);
}

function configurarBusca() {
    const input = $('inputBusca');
    const aoDigitar = debounce(() => {
        const termo = input.value.trim();
        if (estado.abaAtual === 'minhaLista') return filtrarMinhaLista(termo);
        if (termo.length === 0) return carregarFilmesIniciais();
        if (termo.length >= 2) buscarFilmes(termo);
    }, CONFIG.DEBOUNCE_MS);
    input.addEventListener('input', aoDigitar);
}

/* =========================================================
   CARDS E PAINEL DE DETALHES
   ========================================================= */
function exibirFilmes(filmes, container, naLista = false) {
    if (!filmes.length) {
        container.replaceChildren(criar('p', { class: 'text-secondary col-12', text: 'Nenhum filme encontrado.' }));
        return;
    }
    container.replaceChildren(...filmes.map(f => criarCard(f, naLista)));
}

function criarCard(filme, naLista) {
    const selecionar = () => atualizarPainelLateral(filme, naLista);

    const imagem = criar('img', {
        class: 'movie-poster', src: filme.poster, alt: `Pôster de ${filme.titulo}`, loading: 'lazy'
    });
    imagem.addEventListener('error', () => { imagem.src = CONFIG.PLACEHOLDER; }, { once: true });

    const card = criar('article', {
        class: 'content-card h-100 d-flex flex-column',
        role: 'button', tabindex: '0',
        'aria-label': `Ver detalhes de ${filme.titulo}`
    }, [
        imagem,
        criar('h3', { class: 'text-white h6 fw-bold text-truncate mb-1', text: filme.titulo }),
        criar('p', { class: 'text-secondary small mb-3', text: filme.ano }),
        criar('span', { class: 'btn btn-sm btn-outline-light mt-auto rounded-pill border-secondary', 'aria-hidden': 'true', text: 'Ver Detalhes' })
    ]);

    card.addEventListener('click', selecionar);
    card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selecionar(); }
    });

    return criar('div', { class: 'col' }, card);
}

function limparPainelLateral() {
    estado.filmeSelecionado = null;
    $('painelConteudo').replaceChildren(
        criar('p', { class: 'text-secondary small', text: 'Clique num filme para ver os detalhes.' })
    );
}

function atualizarPainelLateral(filme) {
    estado.filmeSelecionado = filme;
    abrirPainel();

    const jaSalvo = estado.idsSalvos.has(String(filme.id));
    const imagem = criar('img', { class: 'right-poster', src: filme.poster, alt: `Pôster de ${filme.titulo}` });
    imagem.addEventListener('error', () => { imagem.src = CONFIG.PLACEHOLDER; }, { once: true });

    const botao = jaSalvo
        ? criar('button', {
            type: 'button', class: 'btn btn-danger w-100 rounded-pill mt-3',
            text: 'Remover da Lista', on: { click: () => removerDaLista(filme.id) }
        })
        : criar('button', {
            type: 'button', class: 'btn btn-primary w-100 rounded-pill mt-3',
            text: 'Adicionar à Minha Lista', on: { click: () => salvarNaLista(filme) }
        });

    $('painelConteudo').replaceChildren(
        imagem,
        criar('h4', { class: 'text-white h5 fw-bold mb-2 text-start w-100', text: filme.titulo }),
        criar('div', { class: 'd-flex justify-content-between align-items-center w-100 mb-3' }, [
            criar('span', { class: 'text-secondary small' }, ['Ano: ', criar('strong', { text: filme.ano })]),
            criar('span', { class: 'badge bg-primary', text: `★ ${filme.nota.toFixed(1)}` })
        ]),
        criar('p', { class: 'text-secondary small text-start sinopse-scroll', text: filme.sinopse }),
        botao
    );
}

/* =========================================================
   CRUD: MINHA LISTA (mesmos endpoints e payloads de antes)
   ========================================================= */
async function carregarIdsSalvos() {
    try {
        const dados = await buscarJson(CONFIG.API_BASE_URL);
        estado.idsSalvos = new Set((dados || []).map(f => String(f.id)));
    } catch (erro) {
        console.error('Não foi possível carregar os IDs salvos:', erro);
    }
}

async function carregarMinhaLista() {
    const container = $('containerMinhaLista');
    mostrarCarregando(container);
    try {
        const dados = await buscarJson(CONFIG.API_BASE_URL);
        estado.listaSalva = (dados || []).map(f => {
            const filme = normalizarFilme(f);
            if (!f.sinopse && !f.overview) filme.sinopse = 'Filme guardado na sua lista pessoal.';
            return filme;
        });
        estado.idsSalvos = new Set(estado.listaSalva.map(f => String(f.id)));
        filtrarMinhaLista($('inputBusca').value.trim());
    } catch (erro) {
        console.error(erro);
        mostrarErro(container, 'Erro ao carregar sua lista.', carregarMinhaLista);
    }
}

async function salvarNaLista(filme) {
    try {
        const resposta = await fetch(`${CONFIG.API_BASE_URL}/minha-lista`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: filme.id,
                title: filme.titulo,
                release_date: filme.ano ? String(filme.ano) : null,
                vote_average: filme.nota,
                poster_path: filme.posterPath
            })
        });

        if (resposta.ok) {
            estado.idsSalvos.add(String(filme.id));
            mostrarToast('Filme adicionado à Minha Lista!', 'success');
            if (estado.filmeSelecionado?.id === filme.id) atualizarPainelLateral(filme);
        } else {
            mostrarToast('Este filme já está na sua lista ou ocorreu um erro.', 'warning');
        }
    } catch (erro) {
        console.error('Erro ao salvar:', erro);
        mostrarToast('Não foi possível conectar ao servidor.', 'danger');
    }
}

async function removerDaLista(id) {
    try {
        const resposta = await fetch(`${CONFIG.API_BASE_URL}/${id}`, { method: 'DELETE' });
        if (!resposta.ok) return mostrarToast('Erro ao remover o filme.', 'danger');

        estado.idsSalvos.delete(String(id));
        estado.listaSalva = estado.listaSalva.filter(f => String(f.id) !== String(id));
        mostrarToast('Removido com sucesso!', 'success');

        if (String(estado.filmeSelecionado?.id) === String(id)) limparPainelLateral();
        if (estado.abaAtual === 'minhaLista') filtrarMinhaLista($('inputBusca').value.trim());
    } catch (erro) {
        console.error('Erro ao remover:', erro);
        mostrarToast('Não foi possível conectar ao servidor.', 'danger');
    }
}

/* =========================================================
   DASHBOARD
   ========================================================= */
function opcoesBase(extra = {}) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { ticks: { color: '#8c939d' }, grid: { display: false } },
            y: { ticks: { color: '#8c939d', precision: 0 }, grid: { color: 'rgba(255,255,255,0.05)' } }
        },
        ...extra
    };
}

function desenharGrafico(chave, canvasId, config) {
    if (estado.graficos[chave]) estado.graficos[chave].destroy();
    estado.graficos[chave] = new Chart($(canvasId).getContext('2d'), config);
}

function criarGraficoBarras(chave, canvasId, labels, valores, rotulo, cor) {
    desenharGrafico(chave, canvasId, {
        type: 'bar',
        data: { labels, datasets: [{ label: rotulo, data: valores, backgroundColor: cor, borderRadius: 6 }] },
        options: opcoesBase()
    });
}

function limparGraficos() {
    Object.values(estado.graficos).forEach(g => g.destroy());
    estado.graficos = {};
}

async function atualizarDashboard() {
    const consulta = $('seletorConjunto').value || 'Action';
    const aviso = $('dashboardAviso');
    const token = ++estado.tokenDashboard;

    aviso.className = 'text-secondary text-center py-3';
    aviso.textContent = 'Carregando dados...';

    try {
        const dados = await buscarJson(`${CONFIG.API_BASE_URL}/tmdb/analise?consulta=${encodeURIComponent(consulta)}`);
        if (token !== estado.tokenDashboard) return; // resposta antiga, ignora

        if (!Array.isArray(dados) || !dados.length) {
            limparGraficos();
            aviso.textContent = 'Nenhum filme retornado para este conjunto.';
            return;
        }

        const filmes = dados.map(normalizarFilme);
        aviso.textContent = '';
        processarGraficoGeneros(filmes, consulta);
        processarGraficoAnos(filmes);
        processarGraficoFaixasNotas(filmes);
    } catch (erro) {
        if (token !== estado.tokenDashboard) return;
        console.error(erro);
        limparGraficos();
        aviso.className = 'text-danger text-center py-3';
        aviso.textContent = 'Erro ao carregar os dados do dashboard.';
    }
}

function processarGraficoGeneros(filmes, consulta) {
    const idIgnorado = GENERO_ID_POR_CONSULTA[consulta];
    const contagem = {};
    const somar = (nome) => { contagem[nome] = (contagem[nome] || 0) + 1; };

    filmes.forEach(f => {
        f.generos.forEach(id => { if (id !== idIgnorado) somar(GENEROS[id] || 'Outros'); });
        f.generosObj.forEach(g => { if (g.id !== idIgnorado && g.name !== consulta) somar(g.name || 'Outros'); });
    });

    $('tituloGeneros').textContent = `Outros gêneros nos filmes selecionados`;

    const labels = Object.keys(contagem);
    const valores = Object.values(contagem);

    desenharGrafico('generos', 'chartGeneros', {
        type: 'doughnut',
        data: {
            labels: labels.length ? labels : ['Sem dados'],
            datasets: [{ data: valores.length ? valores : [1], backgroundColor: CORES_ROSCA }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: '#8c939d', boxWidth: 12 } } }
        }
    });
}

function processarGraficoAnos(filmes) {
    const contagem = {};
    filmes.forEach(f => {
        if (f.dataLancamento && f.dataLancamento.length >= 4) {
            const ano = f.dataLancamento.substring(0, 4);
            contagem[ano] = (contagem[ano] || 0) + 1;
        }
    });
    const anos = Object.keys(contagem).sort();
    criarGraficoBarras('anos', 'chartAnos', anos.length ? anos : ['Sem dados'],
        anos.length ? anos.map(a => contagem[a]) : [0], 'Filmes Lançados', '#0080ff');
}

function processarGraficoFaixasNotas(filmes) {
    const faixas = { '0 - 2': 0, '2 - 4': 0, '4 - 6': 0, '6 - 8': 0, '8 - 10': 0 };
    filmes.forEach(({ nota }) => {
        if (nota <= 2) faixas['0 - 2']++;
        else if (nota <= 4) faixas['2 - 4']++;
        else if (nota <= 6) faixas['4 - 6']++;
        else if (nota <= 8) faixas['6 - 8']++;
        else faixas['8 - 10']++;
    });
    criarGraficoBarras('faixas', 'chartFaixasNotas', Object.keys(faixas), Object.values(faixas),
        'Quantidade de Filmes', '#7000ff');
}

/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
    configurarNavegacao();
    configurarBusca();
    configurarPainelColapsavel();
    $('seletorConjunto').addEventListener('change', atualizarDashboard);
    carregarFilmesIniciais();
    carregarIdsSalvos();
});
