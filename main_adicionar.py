# ── TENANT CONFIG ────────────────────────────────────────
@app.get("/tenant", dependencies=[Depends(verify_key)])
async def get_tenant(tenant_id: str):
    res = supabase.table("tenants").select("id, name, plan, copilot_prompt").eq("id", tenant_id).single().execute()
    return res.data

class UpdateCopilotPrompt(BaseModel):
    tenant_id: str
    copilot_prompt: str

@app.put("/tenant/copilot-prompt", dependencies=[Depends(verify_key)])
async def update_copilot_prompt(body: UpdateCopilotPrompt):
    res = supabase.table("tenants").update({
        "copilot_prompt": body.copilot_prompt,
        "updated_at": datetime.utcnow().isoformat(),
    }).eq("id", body.tenant_id).execute()
    return {"ok": True, "tenant": res.data[0]}
