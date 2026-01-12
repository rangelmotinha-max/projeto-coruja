/* global google */
// Comentário: script dedicado para carregar pessoas e montar o mapa da rede.

document.addEventListener('DOMContentLoaded', () => {
  const mapEl = document.getElementById('rede-map');
  const statusEl = document.getElementById('rede-status');

  if (!mapEl || !statusEl) return;

  const apiKey = window.APP_CONFIG?.googleMapsApiKey;
  if (!apiKey) {
    statusEl.textContent = 'Informe a chave do Google Maps na variável GOOGLE_MAPS_API_KEY para visualizar o mapa.';
    return;
  }

  // Comentário: carrega o script do Google Maps de forma assíncrona.
  carregarScriptGoogleMaps(apiKey)
    .then(() => inicializarMapa(mapEl, statusEl))
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

function inicializarMapa(mapEl, statusEl) {
  // Comentário: posição inicial aproximada do Brasil.
  const mapa = new google.maps.Map(mapEl, {
    center: { lat: -14.235, lng: -51.9253 },
    zoom: 4,
  });

  const geocoder = new google.maps.Geocoder();
  const infoWindow = new google.maps.InfoWindow();
  const cache = carregarCacheLocal();

  carregarPessoas()
    .then((enderecos) => mapearEnderecos(enderecos, { mapa, geocoder, infoWindow, cache, statusEl }))
    .catch(() => {
      statusEl.textContent = 'Não foi possível carregar pessoas no momento.';
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

async function mapearEnderecos(enderecos, { mapa, geocoder, infoWindow, cache, statusEl }) {
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
      adicionarMarcador({
        mapa,
        infoWindow,
        pessoa: item.pessoa,
        enderecoTexto: item.texto,
        coordenadas,
      });
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

function adicionarMarcador({ mapa, infoWindow, pessoa, enderecoTexto, coordenadas }) {
  const marker = new google.maps.Marker({
    map: mapa,
    position: coordenadas,
    title: pessoa?.nomeCompleto || 'Pessoa',
  });

  marker.addListener('click', () => {
    const nome = pessoa?.nomeCompleto || 'Pessoa';
    const apelido = pessoa?.apelido ? `<div><strong>Apelido:</strong> ${pessoa.apelido}</div>` : '';
    infoWindow.setContent(
      `<div><strong>${nome}</strong></div>${apelido}<div>${enderecoTexto}</div>`
    );
    infoWindow.open(mapa, marker);
  });
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
