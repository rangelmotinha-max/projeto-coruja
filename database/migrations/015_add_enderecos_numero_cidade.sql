-- Migração 015: Adicionar campos numero e cidade na tabela de endereços
-- Comentário: necessários para geocodificação e exibição completa dos endereços

ALTER TABLE enderecos ADD COLUMN numero TEXT;
ALTER TABLE enderecos ADD COLUMN cidade TEXT;
