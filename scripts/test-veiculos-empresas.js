const { initDatabase } = require('../src/database/sqlite');
const EmpresaModel = require('../src/models/empresas.model');

(async () => {
  try {
    const db = await initDatabase();
    console.log('[test] DB initialized');

    const payload = {
      cnpj: '12345678000199',
      razaoSocial: 'Empresa Teste Veículos',
      nomeFantasia: 'ETV',
      naturezaJuridica: 'LTDA',
      telefone: '(11) 99999-9999',
      enderecos: [],
      socios: [],
      veiculos: [
        {
          nomeProprietario: 'Empresa Teste Veículos',
          cnpj: '12345678000199',
          placa: 'ABC1D23',
          marcaModelo: 'Modelo X',
          cor: 'Preto',
          anoModelo: 2024,
        },
      ],
    };

    const created = await EmpresaModel.create(payload);
    console.log('[test] Created empresa id:', created.id);
    console.log('[test] Created veiculos:', created.veiculos);

    const fetched1 = await EmpresaModel.findById(created.id);
    console.log('[test] Fetched (after create) veiculos count:', (fetched1.veiculos||[]).length);

    const updates = {
      veiculos: [
        {
          nomeProprietario: 'Empresa Teste Veículos',
          cnpj: '12345678000199',
          placa: 'XYZ9Z99',
          marcaModelo: 'Modelo Y',
          cor: 'Branco',
          anoModelo: 2020,
        },
        {
          nomeProprietario: 'Empresa Teste Veículos',
          cnpj: '12345678000199',
          placa: 'DEF2G34',
          marcaModelo: 'Modelo Z',
          cor: 'Azul',
          anoModelo: 2022,
        },
      ],
    };

    const updated = await EmpresaModel.update(created.id, updates);
    console.log('[test] Updated veiculos:', updated.veiculos);

    const fetched2 = await EmpresaModel.findById(created.id);
    console.log('[test] Fetched (after update) veiculos count:', (fetched2.veiculos||[]).length);

    const del = await EmpresaModel.delete(created.id);
    console.log('[test] Deleted empresa:', del);

    const fetched3 = await EmpresaModel.findById(created.id);
    console.log('[test] Fetched (after delete) should be null:', fetched3);

    process.exit(0);
  } catch (err) {
    console.error('[test] Error:', err);
    process.exit(1);
  }
})();
