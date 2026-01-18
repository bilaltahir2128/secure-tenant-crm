import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Message {
  role: "user" | "assistant";
  content: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = await req.json() as { messages: Message[] };

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get user's tenant_id
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get tenant_id from profile
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("tenant_id, full_name")
      .eq("user_id", user.id)
      .single();

    if (!profile?.tenant_id) {
      return new Response(JSON.stringify({ error: "No tenant found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tenantId = profile.tenant_id;

    // Fetch CRM data for context
    const [dealsResult, contactsResult, activitiesResult] = await Promise.all([
      supabaseClient
        .from("deals")
        .select("deal_id, title, stage, value, expected_close_date, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabaseClient
        .from("contacts")
        .select("contact_id, first_name, last_name, company, email, job_title")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabaseClient
        .from("activities")
        .select("activity_id, activity_type, title, is_completed, due_date, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    const deals = dealsResult.data || [];
    const contacts = contactsResult.data || [];
    const activities = activitiesResult.data || [];

    // Calculate summary stats
    const dealsByStage = deals.reduce((acc, d) => {
      acc[d.stage] = (acc[d.stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalRevenue = deals
      .filter(d => d.stage === 'closed_won')
      .reduce((sum, d) => sum + (d.value || 0), 0);

    const pipelineValue = deals
      .filter(d => !['closed_won', 'closed_lost'].includes(d.stage))
      .reduce((sum, d) => sum + (d.value || 0), 0);

    const pendingActivities = activities.filter(a => !a.is_completed).length;
    const overdueActivities = activities.filter(a => 
      a.due_date && !a.is_completed && new Date(a.due_date) < new Date()
    ).length;

    // Build CRM context
    const crmContext = `
## CRM Data Summary

### Deals (${deals.length} total)
- By Stage: ${Object.entries(dealsByStage).map(([k, v]) => `${k}: ${v}`).join(', ')}
- Total Pipeline Value: $${pipelineValue.toLocaleString()}
- Closed Won Revenue: $${totalRevenue.toLocaleString()}

### Recent Deals:
${deals.slice(0, 10).map(d => `- "${d.title}" - Stage: ${d.stage}, Value: $${d.value || 0}`).join('\n')}

### Contacts (${contacts.length} total)
${contacts.slice(0, 10).map(c => `- ${c.first_name} ${c.last_name}${c.company ? ` at ${c.company}` : ''}${c.job_title ? ` (${c.job_title})` : ''}`).join('\n')}

### Activities
- Total Activities: ${activities.length}
- Pending: ${pendingActivities}
- Overdue: ${overdueActivities}

Recent Activities:
${activities.slice(0, 5).map(a => `- [${a.activity_type}] "${a.title}" - ${a.is_completed ? 'Completed' : 'Pending'}`).join('\n')}
`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are an AI sales assistant for a CRM system. You have access to the user's CRM data and can answer questions about their sales pipeline, contacts, deals, and activities.

${crmContext}

Guidelines:
- Be helpful, concise, and data-driven
- When discussing numbers, be specific
- Provide actionable insights when relevant
- If asked about specific contacts or deals, reference the data above
- Format responses nicely with bullet points or numbers when listing things
- If you don't have enough data to answer, say so
- Keep responses focused and under 300 words unless more detail is requested

The user's name is: ${profile.full_name || 'there'}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Stream the response back
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("Sales chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
