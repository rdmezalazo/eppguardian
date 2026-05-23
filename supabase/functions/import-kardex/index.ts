import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import data from "./data.json" with { type: "json" };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { headers, entries } = data as { headers: any[]; entries: any[] };
    const errors: string[] = [];
    let okH = 0, okE = 0;
    const chunk = <T>(a: T[], n: number) => { const o: T[][] = []; for (let i=0;i<a.length;i+=n) o.push(a.slice(i,i+n)); return o; };
    for (const c of chunk(headers, 200)) {
      const { error } = await supabase.from("kardex_headers").insert(c);
      if (error) errors.push("H: " + error.message); else okH += c.length;
    }
    for (const c of chunk(entries, 200)) {
      const { error } = await supabase.from("kardex_entries").insert(c);
      if (error) errors.push("E: " + error.message); else okE += c.length;
    }
    return new Response(JSON.stringify({ okH, okE, errors: errors.slice(0,10) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
