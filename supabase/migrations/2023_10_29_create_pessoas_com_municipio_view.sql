CREATE OR REPLACE VIEW public.pessoas_com_municipio AS
    SELECT
        p.id,
        p.pessoa_tipo,
        p.cpf_cnpj,
        p.razao_social,
        p.nome_fantasia,
        p.insc_estadual,
        p.logradouro,
        p.numero,
        p.complemento,
        p.bairro,
        p.municipio AS municipio_codigo, -- Mantém o código original se precisar
        m.municipio AS municipio_nome,  -- Nome do município da tabela municipios
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