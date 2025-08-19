import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

// Define os cabeçalhos CORS para permitir que o app acesse esta função
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Responde a requisições OPTIONS para verificação de CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Cria um cliente Supabase com permissões de administrador, usando as chaves seguras do ambiente
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Pega o token de autenticação do usuário que está fazendo a chamada
    const authorization = req.headers.get('Authorization')
    if (!authorization) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    
    // Verifica quem é o usuário
    const { data: { user } } = await supabaseAdmin.auth.getUser(authorization.replace('Bearer ', ''))
    if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Verifica se o usuário tem a função 'admin'
    const { data: roleData, error: roleError } = await supabaseAdmin
        .from('user_roles')
        .select('roles(name)')
        .eq('user_id', user.id)
        .single()

    if (roleError || roleData?.roles?.name !== 'admin') {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Se for admin, busca todos os usuários do sistema
    const { data: { users }, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers()
    if (listUsersError) throw listUsersError

    const userIds = users.map(u => u.id)

    // Busca os detalhes adicionais (perfil, empresa) para todos os usuários encontrados
    const { data: details, error: detailsError } = await supabaseAdmin
      .from('profiles')
      .select(`
        id,
        full_name,
        user_roles ( roles ( name ) ),
        emitente_users ( emitente ( municipio, uf ) )
      `)
      .in('id', userIds)
    
    if (detailsError) throw detailsError

    // Combina os dados de autenticação (email) com os detalhes do perfil
    const combinedData = users.map(u => {
      const userDetails = details.find(d => d.id === u.id)
      const locationData = userDetails?.emitente_users[0]?.emitente
      return {
        id: u.id,
        email: u.email,
        full_name: userDetails?.full_name || u.email,
        role: userDetails?.user_roles[0]?.roles?.name || 'N/A',
        location: locationData ? `${locationData.municipio}, ${locationData.uf}` : 'N/A',
        created_at: u.created_at,
      }
    })

    // Retorna a lista completa de usuários
    return new Response(JSON.stringify(combinedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})