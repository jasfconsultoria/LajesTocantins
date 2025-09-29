CREATE OR REPLACE VIEW public.pessoas_com_municipio AS
    SELECT
        p.id,
        p.pessoa_tipo,
        p.cpf_cnpj,
        p.razao_social,
        p.nome_fantasia,
        COALESCE(p.razao_social, p.nome_fantasia) || CASE WHEN p.razao_social IS NOT NULL AND p.nome_fantasia IS NOT NULL AND p.razao_social <> p.nome_fantasia THEN ' (' || p.nome_fantasia || ')' ELSE '' END AS nome_completo_busca,
        p.insc_estadual,
        p.logradouro,
        p.numero,
        p.complemento,
        p.bairro,
        p.municipio AS municipio_codigo,
        m.municipio AS municipio_nome,
        p.uf,
        p.cep,
        p.pais,
        p.telefone,
        p.email,
        p.contato,
        p.observacao,
        p.created_at,
        p.updated_at
    FROM
        public.pessoas p
    LEFT JOIN
        public.municipios m ON p.municipio = m.codigo;