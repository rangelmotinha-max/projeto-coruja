/* global google */
// Comentário: script dedicado para carregar pessoas e montar o mapa da rede.

document.addEventListener('DOMContentLoaded', () => {
  const mapEl = document.getElementById('rede-map');
  const statusEl = document.getElementById('rede-status');
  const regiaoSelect = document.getElementById('rede-regiao-select');
  const aplicarFiltroBtn = document.getElementById('rede-aplicar-filtro');

  if (!mapEl || !statusEl || !regiaoSelect || !aplicarFiltroBtn) return;

  const apiKey = window.APP_CONFIG?.googleMapsApiKey;
  if (!apiKey) {
    statusEl.textContent = 'Informe a chave do Google Maps na variável GOOGLE_MAPS_API_KEY para visualizar o mapa.';
    return;
  }

  // Comentário: carrega o script do Google Maps de forma assíncrona.
  carregarScriptGoogleMaps(apiKey)
    .then(() => inicializarMapa(mapEl, statusEl, regiaoSelect, aplicarFiltroBtn))
    .catch(() => {
      statusEl.textContent = 'Falha ao carregar o Google Maps. Verifique sua chave e conexão.';
    });
});

const CACHE_KEY = 'redeGeocodeCache';
const CACHE_TTL_DIAS = 30;

function carregarScriptGoogleMaps(apiKey) {
  if (window.google?.maps) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const chave = encodeURIComponent(apiKey);
    script.src = `https://maps.googleapis.com/maps/api/js?key=${chave}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject();
    document.head.appendChild(script);
  });
}

function inicializarMapa(mapEl, statusEl, regiaoSelect, aplicarFiltroBtn) {
  // Comentário: posição inicial aproximada do Brasil.
  const mapa = new google.maps.Map(mapEl, {
    center: { lat: -14.235, lng: -51.9253 },
    zoom: 4,
  });

  const geocoder = new google.maps.Geocoder();
  const infoWindow = new google.maps.InfoWindow();
  const cache = carregarCacheLocal();
  const marcadores = [];

  carregarPessoas()
    .then((enderecos) => mapearEnderecos(enderecos, {
      mapa,
      geocoder,
      infoWindow,
      cache,
      statusEl,
      marcadores,
    }))
    .then(() => {
      // Comentário: aplica o filtro inicial conforme a seleção atual.
      aplicarFiltroRegiao({
        regiaoSelecionada: regiaoSelect.value,
        marcadores,
        mapa,
        statusEl,
      });
    })
    .catch(() => {
      statusEl.textContent = 'Não foi possível carregar pessoas no momento.';
    });

  aplicarFiltroBtn.addEventListener('click', () => {
    aplicarFiltroRegiao({
      regiaoSelecionada: regiaoSelect.value,
      marcadores,
      mapa,
      statusEl,
    });
  });
}

async function carregarPessoas() {
  const response = await fetch('/api/pessoas');
  if (!response.ok) throw new Error('Falha ao buscar pessoas');
  const pessoas = await response.json();

  // Comentário: monta uma lista plana de endereços por pessoa.
  return (Array.isArray(pessoas) ? pessoas : []).flatMap((pessoa) => {
    const enderecos = Array.isArray(pessoa.enderecos) ? pessoa.enderecos : [];
    return enderecos.map((endereco) => ({
      pessoa,
      endereco,
      texto: montarEnderecoCompleto(endereco),
      latLong: endereco.latLong,
    }));
  });
}

async function mapearEnderecos(enderecos, { mapa, geocoder, infoWindow, cache, statusEl, marcadores }) {
  const enderecosValidos = enderecos.filter((item) => item.texto);
  const total = enderecosValidos.length;
  let processados = 0;
  let criados = 0;

  if (total === 0) {
    statusEl.textContent = 'Nenhum endereço válido encontrado para geocodificação.';
    return;
  }

  statusEl.textContent = `Geocodificando ${total} endereço(s)...`;

  for (const item of enderecosValidos) {
    processados += 1;
    const coordenadas = obterCoordenadasDoCache(item, cache) || await geocodificarEndereco(item, geocoder, cache);

    if (coordenadas) {
      criados += 1;
      const regiaoAdministrativa = obterRegiaoAdministrativa(item.endereco);
      const marcador = adicionarMarcador({
        mapa,
        infoWindow,
        pessoa: item.pessoa,
        enderecoTexto: item.texto,
        coordenadas,
        regiaoAdministrativa,
      });
      marcadores.push(marcador);
    }

    statusEl.textContent = `Processados ${processados}/${total}. Marcadores criados: ${criados}.`;
    // Comentário: pausa simples para reduzir o risco de limite de requisição.
    await aguardar(250);
  }
}

function montarEnderecoCompleto(endereco) {
  if (!endereco) return '';

  const logradouroNumero = [endereco.logradouro, endereco.numero].filter(Boolean).join(', ');
  const partes = [
    logradouroNumero,
    endereco.bairro,
    endereco.cidade,
    endereco.uf,
    endereco.cep,
  ];

  return partes.map((parte) => String(parte || '').trim()).filter(Boolean).join(' - ');
}

function obterCoordenadasDoCache(item, cache) {
  const enderecoTexto = item.texto;
  if (!enderecoTexto) return null;

  // Comentário: prioriza lat/long informados manualmente.
  const coordenadasLatLong = parseLatLong(item.latLong);
  if (coordenadasLatLong) return coordenadasLatLong;

  const registro = cache.get(enderecoTexto);
  if (!registro) return null;

  if (registro.expiraEm && registro.expiraEm < Date.now()) {
    cache.delete(enderecoTexto);
    salvarCacheLocal(cache);
    return null;
  }

  return registro.coordenadas || null;
}

async function geocodificarEndereco(item, geocoder, cache) {
  const enderecoTexto = item.texto;
  if (!enderecoTexto) return null;

  try {
    const resultado = await geocode(geocoder, enderecoTexto);
    cache.set(enderecoTexto, {
      coordenadas: resultado,
      expiraEm: Date.now() + CACHE_TTL_DIAS * 24 * 60 * 60 * 1000,
    });
    salvarCacheLocal(cache);
    return resultado;
  } catch {
    // Comentário: ignora endereço inválido e segue a lista.
    return null;
  }
}

function geocode(geocoder, enderecoTexto) {
  return new Promise((resolve, reject) => {
    geocoder.geocode({ address: enderecoTexto }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const location = results[0].geometry.location;
        resolve({ lat: location.lat(), lng: location.lng() });
      } else {
        reject(new Error(status));
      }
    });
  });
}

function adicionarMarcador({ mapa, infoWindow, pessoa, enderecoTexto, coordenadas, regiaoAdministrativa }) {
  const marker = new google.maps.Marker({
    map: mapa,
    position: coordenadas,
    title: pessoa?.nomeCompleto || 'Pessoa',
  });

  marker.addListener('click', () => {
    const nome = pessoa?.nomeCompleto || 'Pessoa';
    const apelido = pessoa?.apelido ? `<div><strong>Apelido:</strong> ${pessoa.apelido}</div>` : '';
    const regiao = regiaoAdministrativa ? `<div><strong>Região:</strong> ${regiaoAdministrativa}</div>` : '';
    infoWindow.setContent(
      `<div><strong>${nome}</strong></div>${apelido}${regiao}<div>${enderecoTexto}</div>`
    );
    infoWindow.open(mapa, marker);
  });

  return {
    marker,
    regiaoAdministrativa,
  };
}

function parseLatLong(latLong) {
  if (!latLong) return null;
  const partes = String(latLong).split(',').map((v) => Number(v.trim()));
  if (partes.length !== 2 || partes.some((v) => Number.isNaN(v))) return null;
  return { lat: partes[0], lng: partes[1] };
}

function carregarCacheLocal() {
  const cache = new Map();
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return cache;
    const obj = JSON.parse(raw);
    Object.entries(obj || {}).forEach(([chave, valor]) => {
      if (valor && typeof valor === 'object') {
        cache.set(chave, valor);
      }
    });
  } catch {
    // Comentário: se o cache estiver corrompido, iniciamos do zero.
    localStorage.removeItem(CACHE_KEY);
  }
  return cache;
}

function salvarCacheLocal(cache) {
  const obj = {};
  cache.forEach((valor, chave) => {
    obj[chave] = valor;
  });
  localStorage.setItem(CACHE_KEY, JSON.stringify(obj));
}

function aguardar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function aplicarFiltroRegiao({ regiaoSelecionada, marcadores, mapa, statusEl }) {
  // Comentário: exibe todos quando não há filtro definido.
  const regiao = String(regiaoSelecionada || '').trim();
  let visiveis = 0;

  marcadores.forEach(({ marker, regiaoAdministrativa }) => {
    const corresponde = !regiao || regiaoAdministrativa === regiao;
    marker.setMap(corresponde ? mapa : null);
    if (corresponde) visiveis += 1;
  });

  if (!regiao) {
    statusEl.textContent = `Filtro limpo. Marcadores visíveis: ${visiveis}.`;
    return;
  }

  statusEl.textContent = `Filtro aplicado para ${regiao}. Marcadores visíveis: ${visiveis}.`;
}

function obterRegiaoAdministrativa(endereco) {
  if (!endereco) return '';

  // Comentário: prioridade para campo explícito, se existir no backend.
  const campoExplicito = String(endereco.regiaoAdministrativa || '').trim();
  if (campoExplicito) return campoExplicito;

  const cidade = normalizarTexto(endereco.cidade);
  const bairro = normalizarTexto(endereco.bairro);
  const chave = cidade || bairro;

  return MAPEAMENTO_REGIOES_DF[chave] || '';
}

function normalizarTexto(valor) {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

// Comentário: mapeamento simples de cidades/bairros para regiões administrativas do DF.
const MAPEAMENTO_REGIOES_DF = {
  'aguas claras': 'Águas Claras',
  'arniqueira': 'Arniqueira',
  'brazlandia': 'Brazlândia',
  'candangolandia': 'Candangolândia',
  'ceilandia': 'Ceilândia',
  'cruzeiro': 'Cruzeiro',
  'fercal': 'Fercal',
  'gama': 'Gama',
  'guara': 'Guará',
  'itapoa': 'Itapoã',
  'jardim botanico': 'Jardim Botânico',
  'lago norte': 'Lago Norte',
  'lago sul': 'Lago Sul',
  'nucleo bandeirante': 'Núcleo Bandeirante',
  'paranoa': 'Paranoá',
  'park way': 'Park Way',
  'planaltina': 'Planaltina',
  'plano piloto': 'Plano Piloto',
  'recanto das emas': 'Recanto das Emas',
  'riacho fundo': 'Riacho Fundo',
  'riacho fundo ii': 'Riacho Fundo II',
  'samambaia': 'Samambaia',
  'santa maria': 'Santa Maria',
  'sao sebastiao': 'São Sebastião',
  'scia/estrutural': 'SCIA/Estrutural',
  'sia': 'SIA',
  'sobradinho': 'Sobradinho',
  'sobradinho ii': 'Sobradinho II',
  'sudoeste/octogonal': 'Sudoeste/Octogonal',
  'taguatinga': 'Taguatinga',
  'varjao': 'Varjão',
  'vicente pires': 'Vicente Pires',
};
