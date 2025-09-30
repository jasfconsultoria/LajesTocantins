CREATE OR REPLACE VIEW public.produtos_com_unidade AS
SELECT
    p.id,
    p.created_at,
    p.updated_at,
    p.id_emit,
    p."prod_cProd",
    p."prod_cEAN",
    p."prod_xProd",
    p."prod_NCM",
    p."prod_CEST_Opc",
    p."prod_CFOP",
    p."prod_uCOM", -- Corrigido para usar aspas duplas
    u.unidade AS unidade_nome,
    p."prod_vUnCOM",
    p.icms_pICMS,
    p.icms_pRedBC,
    p.icms_modBC,
    p.icms_CST,
    p.pis_CST,
    p.pis_pPIS,
    p.cofins_CST,
    p.cofins_pCOFINS,
    p.IPI_CST,
    p.IPI_pIPI,
    p.icms_orig,
    p.prod_ativo,
    p.prod_rastro,
    p.prod_nivelm,
    p.prod_alert,
    p.prod_descricao_detalhada,
    -- Campo concatenado para busca
    LOWER(UNACCENT(
        COALESCE(p."prod_cProd", '') || ' ' ||
        COALESCE(p."prod_xProd", '') || ' ' ||
        COALESCE(p."prod_cEAN", '') || ' ' ||
        COALESCE(p."prod_NCM", '') || ' ' ||
        COALESCE(u.unidade, '')
    )) AS busca_completa
FROM
    public.produtos p
LEFT JOIN
    public.unidade u ON p."prod_uCOM" = u.codigo; -- Corrigido para usar aspas duplas

-- Opcional: Adicionar um índice para melhorar a performance da busca na view
-- CREATE INDEX idx_produtos_com_unidade_busca_completa ON public.produtos_com_unidade USING gin (busca_completa gin_trgm_ops);