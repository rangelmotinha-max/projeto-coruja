const PessoaModel = require('../models/pessoas.model');
const { criarErro } = require('../utils/helpers');
const { validarCadastroPessoa, validarAtualizacaoPessoa } = require('../utils/validators');

// Serviços de negócio para Pessoas encapsulando validações e regras.
async function criar(payload) {
  // Validação centralizada garante integridade antes da persistência.
  const dados = validarCadastroPessoa(payload);
  return PessoaModel.create(dados);
}

async function listar() {
  return PessoaModel.findAll();
}

async function buscarPorId(id) {
  const pessoa = await PessoaModel.findById(id);
  if (!pessoa) throw criarErro('Pessoa não encontrada', 404);
  return pessoa;
}

async function atualizar(id, payload) {
  const atualizacoes = validarAtualizacaoPessoa(payload);
  const existente = await PessoaModel.findById(id);
  if (!existente) throw criarErro('Pessoa não encontrada', 404);

  // Processar endereços se fornecidos no payload
  if (payload.enderecos && Array.isArray(payload.enderecos)) {
    // Obter endereços atuais
    const enderecosAtuais = await PessoaModel.obterEnderecosPorPessoa(id);
    
    // Remover endereços que não estão mais no payload
    for (const enderecoAtual of enderecosAtuais) {
      const existe = payload.enderecos.some(e => e.id === enderecoAtual.id);
      if (!existe) {
        await PessoaModel.removerEndereco(enderecoAtual.id);
      }
    }
    
    // Adicionar novos ou atualizar existentes
    for (const endereco of payload.enderecos) {
      if (endereco.id) {
        // Atualizar endereço existente
        await PessoaModel.atualizarEndereco(endereco.id, endereco);
      } else {
        // Adicionar novo endereço
        await PessoaModel.adicionarEndereco(id, endereco);
      }
    }
  }

  // Processar telefones se fornecidos no payload
  if (payload.telefones && Array.isArray(payload.telefones)) {
    // Obter telefones atuais
    const telefonesAtuais = await PessoaModel.obterTelefonesPorPessoa(id);
    
    // Remover todos os telefones antigos
    for (const telefoneAtual of telefonesAtuais) {
      await PessoaModel.removerTelefone(telefoneAtual.id);
    }
    
    // Adicionar novos telefones
    for (const telefone of payload.telefones) {
      if (telefone.trim()) {
        await PessoaModel.adicionarTelefone(id, telefone);
      }
    }
  }

  // Atualizar dados da pessoa e índice do endereço atual
  if (payload.endereco_atual_index !== undefined) {
    atualizacoes.endereco_atual_index = payload.endereco_atual_index;
  }

  const atualizada = await PessoaModel.update(id, atualizacoes);
  return atualizada;
}

async function remover(id) {
  const existente = await PessoaModel.findById(id);
  if (!existente) throw criarErro('Pessoa não encontrada', 404);

  await PessoaModel.delete(id);
  return true;
}

module.exports = {
  criar,
  listar,
  buscarPorId,
  atualizar,
  remover,
};
