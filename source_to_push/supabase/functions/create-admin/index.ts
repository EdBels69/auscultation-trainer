import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { email = 'admin@admin.com', password = 'admin123' } = await req.json().catch(() => ({}));

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const existingAdmin = existingUser?.users?.find(
      (user) => user.email === email
    );

    if (existingAdmin) {
      await supabaseAdmin
        .from('user_profiles')
        .update({ role: 'admin', display_name: 'Admin' })
        .eq('id', existingAdmin.id);

      return new Response(
        JSON.stringify({ message: 'Admin user already exists, role updated' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: 'Admin',
      },
      app_metadata: {
        role: 'admin',
      },
    });

    if (error) {
      throw error;
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    await supabaseAdmin
      .from('user_profiles')
      .update({ role: 'admin', display_name: 'Admin' })
      .eq('id', data.user.id);

    return new Response(
      JSON.stringify({
        message: 'Admin user created successfully',
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});