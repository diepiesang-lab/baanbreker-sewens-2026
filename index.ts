import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  const adminClient = createClient(supabaseUrl, serviceKey)
  const { data: { user: caller }, error: callerError } = await adminClient.auth.getUser(token)
  if (callerError || !caller) return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  const { data: adminRow } = await adminClient.from('admin_users').select('id,active').eq('id', caller.id).maybeSingle()
  if (!adminRow?.active) return new Response(JSON.stringify({ error: 'Not authorized as an active administrator' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  const body = await req.json().catch(() => ({}))
  const email = String(body.email || '').trim().toLowerCase()
  const redirectTo = String(body.redirectTo || supabaseUrl).trim()
  if (!email || !email.includes('@')) return new Response(JSON.stringify({ error: 'Valid email address required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, { redirectTo })
  if (inviteError) return new Response(JSON.stringify({ error: inviteError.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  const invitedUser = invited.user
  if (!invitedUser) return new Response(JSON.stringify({ error: 'Invitation created but no user was returned' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  const { error: rowError } = await adminClient.from('admin_users').upsert({ id: invitedUser.id, role: 'admin', active: true }, { onConflict: 'id' })
  if (rowError) return new Response(JSON.stringify({ error: `Invite sent, but admin access could not be registered: ${rowError.message}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  return new Response(JSON.stringify({ ok: true, email, message: 'Admin invitation sent' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
