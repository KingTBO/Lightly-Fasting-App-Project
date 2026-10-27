/* Cloud backup. Leave empty to run fully on-device. Both values are public by design (the anon key is safe in the browser:
   Row Level Security in supabase/schema.sql protects every row). Never put the service_role key here.
   Add code:true only if the Magic Link email template includes {{ .Token }} (needs custom SMTP). */
window.LIGHTLY_CLOUD={url:'',key:''};
