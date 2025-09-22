import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: { user } } = await supabaseAdmin.auth.getUser(req.headers.get('Authorization')?.replace('Bearer ', ''))
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: roleData, error: roleError } = await supabaseAdmin
        .from('user_roles')
        .select('roles(name)')
        .eq('user_id', user.id)
        .single()

    if (roleError) throw roleError

    let companies;
    if (roleData?.roles?.name === 'admin') {
      // Admin users can see all companies
      const { data, error } = await supabaseAdmin
        .from('emitente')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      companies = data;
    } else {
      // Non-admin users can only see companies they are associated with
      const { data: associatedCompanies, error: assocError } = await supabaseAdmin
        .from('emitente_users')
        .select('emitente(id, razao_social, cnpj, municipio, uf, created_at)') // Select specific fields from emitente
        .eq('user_id', user.id);
      if (assocError) throw assocError;
      companies = associatedCompanies.map(assoc => assoc.emitente);
    }

    return new Response(JSON.stringify(companies), {
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