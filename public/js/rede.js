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
    .then(({ enderecosValidos, resumoInvalidos }) => {
      // Comentário: informa antecipadamente quantos cadastros ficaram sem endereço válido.
      if (resumoInvalidos.total > 0) {
        statusEl.textContent = montarResumoInvalidos(resumoInvalidos);
      }

      return mapearEnderecos(enderecosValidos, {
        mapa,
        geocoder,
        infoWindow,
        cache,
        statusEl,
        marcadores,
        resumoInvalidos,
      });
    })
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
  const resumoInvalidos = {
    total: 0,
    semEndereco: 0,
    semTextoGeocodificavel: 0,
    latLongInvalido: 0,
  };

  // Comentário: seleciona um endereço válido por pessoa para mapear a rede.
  const obterEnderecoValido = (enderecos) => {
    const lista = Array.isArray(enderecos) ? enderecos : [];
    // Comentário: valida se há coordenadas parseáveis ou texto suficiente para geocodificação.
    const enderecoEhValido = (endereco) => {
      if (!endereco) return false;
      return Boolean(parseLatLong(endereco.latLong) || montarEnderecoCompleto(endereco));
    };
    // Comentário: prioriza o endereço principal quando disponível e válido.
    const enderecoPrincipal = lista.find((endereco) => endereco?.principal === true && enderecoEhValido(endereco));
    if (enderecoPrincipal) return enderecoPrincipal;
    // Comentário: fallback para o primeiro endereço com lat/long parseável ou texto.
    return lista.find((endereco) => enderecoEhValido(endereco)) || null;
  };

  const enderecosValidos = (Array.isArray(pessoas) ? pessoas : [])
    .map((pessoa) => {
      const enderecos = Array.isArray(pessoa?.enderecos) ? pessoa.enderecos : [];
      if (enderecos.length === 0) {
        resumoInvalidos.total += 1;
        resumoInvalidos.semEndereco += 1;
        return null;
      }

      const enderecoSelecionado = obterEnderecoValido(enderecos);
      if (!enderecoSelecionado) {
        resumoInvalidos.total += 1;
        const possuiTexto = enderecos.some((endereco) => Boolean(montarEnderecoCompleto(endereco)));
        const possuiLatLong = enderecos.some((endereco) => Boolean(endereco?.latLong));
        const possuiLatLongValido = enderecos.some((endereco) => Boolean(parseLatLong(endereco?.latLong)));

        if (!possuiTexto) {
          resumoInvalidos.semTextoGeocodificavel += 1;
        }

        if (possuiLatLong && !possuiLatLongValido) {
          resumoInvalidos.latLongInvalido += 1;
        }

        if (!possuiTexto && !possuiLatLong) {
          resumoInvalidos.semEndereco += 1;
        }

        return null;
      }

      return {
        pessoa,
        endereco: enderecoSelecionado,
        texto: montarEnderecoCompleto(enderecoSelecionado),
        latLong: enderecoSelecionado.latLong,
      };
    })
    .filter(Boolean);

  return { enderecosValidos, resumoInvalidos };
}

async function mapearEnderecos(enderecos, {
  mapa,
  geocoder,
  infoWindow,
  cache,
  statusEl,
  marcadores,
  resumoInvalidos,
}) {
  const enderecosValidos = enderecos.filter((item) => item.texto);
  const total = enderecosValidos.length;
  let processados = 0;
  let criados = 0;

  if (total === 0) {
    const resumo = resumoInvalidos?.total ? `${montarResumoInvalidos(resumoInvalidos)} ` : '';
    statusEl.textContent = `${resumo}Nenhum endereço válido encontrado para geocodificação.`;
    return;
  }

  statusEl.textContent = montarStatusGeocodificacao(total, resumoInvalidos);

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

    statusEl.textContent = montarStatusGeocodificacao(total, resumoInvalidos, {
      processados,
      criados,
    });
    // Comentário: pausa simples para reduzir o risco de limite de requisição.
    await aguardar(250);
  }
}

function montarResumoInvalidos(resumoInvalidos) {
  const motivos = [];
  // Comentário: adiciona apenas motivos com contagem > 0 para evitar poluição no status.
  if (resumoInvalidos.semEndereco) {
    motivos.push(`sem endereço: ${resumoInvalidos.semEndereco}`);
  }
  if (resumoInvalidos.semTextoGeocodificavel) {
    motivos.push(`sem texto geocodificável: ${resumoInvalidos.semTextoGeocodificavel}`);
  }
  if (resumoInvalidos.latLongInvalido) {
    motivos.push(`lat/long inválido: ${resumoInvalidos.latLongInvalido}`);
  }

  const detalhes = motivos.length > 0 ? ` (${motivos.join('; ')})` : '';
  return `Endereços inválidos: ${resumoInvalidos.total}${detalhes}.`;
}

function montarStatusGeocodificacao(total, resumoInvalidos, progresso = null) {
  const partes = [];
  // Comentário: inclui resumo de inválidos antes ou durante a geocodificação.
  if (resumoInvalidos?.total) {
    partes.push(montarResumoInvalidos(resumoInvalidos));
  }

  if (progresso) {
    partes.push(`Pessoas processadas: ${progresso.processados}/${total}. Pessoas mapeadas: ${progresso.criados}.`);
  } else {
    partes.push(`Geocodificando ${total} pessoa(s)...`);
  }

  return partes.join(' ');
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

  statusEl.textContent = `Filtro aplicado para ${regiao}. Pessoas visíveis: ${visiveis}.`;
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
