CREATE OR REPLACE VIEW public.orcamento_summary_view AS
SELECT
    o.id,
    o.data_orcamento,
    o.numero_pedido,
    o.vendedor,
    o.cnpj_empresa,
    o.status, -- Adicionado a nova coluna 'status'
    o.cliente_id,
    p.nome_fantasia AS nome_cliente,
    -- Calcula o total bruto dos produtos (sem descontos)
    COALESCE(SUM(oc.quantidade * oc.valor_venda), 0) AS total_do_pedido_calculado,
    -- Calcula a soma dos descontos de todos os itens
    COALESCE(SUM(oc.desconto_total), 0) AS total_desconto_itens,
    -- Calcula o total líquido (total bruto - total de descontos)
    COALESCE(SUM(oc.quantidade * oc.valor_venda), 0) - COALESCE(SUM(oc.desconto_total), 0) AS total_liquido_calculado
FROM
    public.orcamento o
LEFT JOIN
    public.orcamento_composicao oc ON o.id = oc.orcamento_id
LEFT JOIN
    public.pessoas p ON o.cliente_id = p.cpf_cnpj
GROUP BY
    o.id, o.data_orcamento, o.numero_pedido, o.vendedor, o.cnpj_empresa, o.status, o.cliente_id, p.nome_fantasia
ORDER BY
    o.data_orcamento DESC;