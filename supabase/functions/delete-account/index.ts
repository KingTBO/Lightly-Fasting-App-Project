// Lightly: delete the signed-in person's account, for good.
// The app calls this with the person's own access token. The token is checked here, and only the account it belongs to
// can be deleted. The service role key is supplied by Supabase to this function at run time; it is never in the app or the repo.
// Deploy: supabase functions deploy delete-account --no-verify-jwt   (the token is verified below)
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return reply(405, { error: 'method' });

  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return reply(401, { error: 'signed out' });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // who is asking: the account the token belongs to, and no other
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return reply(401, { error: 'signed out' });
  const uid = data.user.id;

  // the backup (it also holds the profile picture), then the account itself
  const del = await admin.from('lightly_state').delete().eq('user_id', uid);
  if (del.error) return reply(500, { error: 'backup' });
  const gone = await admin.auth.admin.deleteUser(uid);
  if (gone.error) return reply(500, { error: 'account' });

  return reply(200, { ok: true });
});
