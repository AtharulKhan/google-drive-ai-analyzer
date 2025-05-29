
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { service, apiToken, googleUserId } = await req.json()

    if (!service || !apiToken) {
      return new Response(
        JSON.stringify({ error: 'Missing service or apiToken' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!googleUserId) {
      return new Response(
        JSON.stringify({ error: 'Google user authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Store the encrypted API token in user_api_tokens table
    const { error: insertError } = await supabase
      .from('user_api_tokens')
      .upsert({
        user_id: googleUserId,
        service: service,
        api_token: apiToken, // In production, you'd want to encrypt this
        updated_at: new Date().toISOString()
      })

    if (insertError) {
      console.error('Error storing API token:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to store API token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in store-api-token function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
