
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

    const { actorId, input, endpoint = 'run-sync-get-dataset-items', googleUserId } = await req.json()

    if (!actorId || !input) {
      return new Response(
        JSON.stringify({ error: 'Missing actorId or input' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!googleUserId) {
      return new Response(
        JSON.stringify({ error: 'Google user authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user's Apify API token using Google user ID
    const { data: tokenData, error: tokenError } = await supabase
      .from('user_api_tokens')
      .select('api_token')
      .eq('user_id', googleUserId)
      .eq('service', 'apify')
      .single()

    if (tokenError || !tokenData?.api_token) {
      return new Response(
        JSON.stringify({ error: 'Apify API token not found. Please add it in Settings.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Make the API call to Apify
    const apifyUrl = `https://api.apify.com/v2/acts/${actorId}/${endpoint}?token=${tokenData.api_token}`
    
    const apifyResponse = await fetch(apifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    })

    if (!apifyResponse.ok) {
      const errorData = await apifyResponse.json().catch(() => ({ message: apifyResponse.statusText }))
      return new Response(
        JSON.stringify({ error: errorData.error?.message || errorData.message || `HTTP error ${apifyResponse.status}` }),
        { status: apifyResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const result = await apifyResponse.json()
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in apify-proxy function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
