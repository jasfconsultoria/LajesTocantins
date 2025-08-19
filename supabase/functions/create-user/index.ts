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

    const { data: { user: callingUser } } = await supabaseAdmin.auth.getUser(req.headers.get('Authorization')?.replace('Bearer ', ''))
    if (!callingUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: roleData, error: roleError } = await supabaseAdmin
        .from('user_roles')
        .select('roles(name)')
        .eq('user_id', callingUser.id)
        .single()

    if (roleError || roleData?.roles?.name !== 'admin') {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { email, password, full_name, role_name } = await req.json()
    if (!email || !password || !full_name || !role_name) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: { user }, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    })
    if (createError) throw createError

    const { data: newRoleData, error: newRoleError } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', role_name)
      .single()
    if (newRoleError || !newRoleData) throw new Error(`Role '${role_name}' not found.`)

    const { error: upsertError } = await supabaseAdmin
      .from('user_roles')
      .upsert({ user_id: user.id, role_id: newRoleData.id }, { onConflict: 'user_id' })
    if (upsertError) throw upsertError

    return new Response(JSON.stringify({ message: 'User created successfully', user }), {
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