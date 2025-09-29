-- Primeiro, exclua a VIEW se ela já existir
    DROP VIEW IF EXISTS public.pessoas_com_municipio;

    -- Em seguida, recrie a VIEW com a nova definição
    CREATE OR REPLACE VIEW public.pessoas_com_municipio AS
    SELECT
        p.id,
        p.pessoa_tipo,
        p.cpf_cnpj,
        p.razao_social,
        p.nome_fantasia,
        -- Lógica robusta para nome_completo_busca
        CASE
            WHEN NULLIF(TRIM(p.nome_fantasia), '') IS NOT NULL
             AND NULLIF(TRIM(p.razao_social), '') IS NOT NULL
             AND NULLIF(TRIM(p.nome_fantasia), '') <> NULLIF(TRIM(p.razao_social), '')
                THEN TRIM(p.nome_fantasia) || ' (' || TRIM(p.razao_social) || ')'
            WHEN NULLIF(TRIM(p.nome_fantasia), '') IS NOT NULL
                THEN TRIM(p.nome_fantasia)
            WHEN NULLIF(TRIM(p.razao_social), '') IS NOT NULL
                THEN TRIM(p.razao_social)
            ELSE ''
        END AS nome_completo_busca,
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