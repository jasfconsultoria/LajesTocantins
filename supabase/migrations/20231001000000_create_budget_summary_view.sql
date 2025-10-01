CREATE OR REPLACE VIEW orcamento_summary_view AS
SELECT
    o.id,
    o.data_orcamento,
    o.cliente_id,
    o.funcionario_id,
    o.endereco_entrega,
    o.historico,
    o.debito_credito,
    o.forma_pagamento,
    o.cnpj_empresa,
    o.cfop,
    o.natureza,
    o.faturado,
    o.vendedor,
    o.desconto,
    o.condicao_pagamento,
    o.endereco_entrega_completo,
    o.obra,
    o.observacao,
    o.prazo_entrega,
    o.numero_nfe,
    o.numero_parcelas,
    o.data_venda,
    o.total_venda,
    o.total_fatura,
    o.nome_cliente,
    o.numero_pedido,
    o.acrescimo,
    o.validade,
    o.solicitante,
    o.telefone,
    o.codigo_antigo,
    o.previsao_entrega,
    COALESCE(SUM(oc.quantidade * oc.valor_venda), 0) AS total_bruto_itens,
    COALESCE(SUM(oc.desconto_total), 0) AS total_desconto_itens,
    (COALESCE(SUM(oc.quantidade * oc.valor_venda), 0)) AS total_do_pedido_calculado,
    (COALESCE(SUM(oc.quantidade * oc.valor_venda), 0) - COALESCE(SUM(oc.desconto_total), 0)) AS total_liquido_calculado
FROM
    orcamento o
LEFT JOIN
    orcamento_composicao oc ON o.id = oc.orcamento_id
GROUP BY
    o.id, o.data_orcamento, o.cliente_id, o.funcionario_id, o.endereco_entrega, o.historico,
    o.debito_credito, o.forma_pagamento, o.cnpj_empresa, o.cfop, o.natureza, o.faturado,
    o.vendedor, o.desconto, o.condicao_pagamento, o.endereco_entrega_completo, o.obra,
    o.observacao, o.prazo_entrega, o.numero_nfe, o.numero_parcelas, o.data_venda,
    o.total_venda, o.total_fatura, o.nome_cliente, o.numero_pedido, o.acrescimo,
    o.validade, o.solicitante, o.telefone, o.codigo_antigo, o.previsao_entrega
ORDER BY
    o.data_orcamento DESC;