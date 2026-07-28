#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

const execute = process.argv.includes("--execute");
const daysArg = process.argv.find((arg) => arg.startsWith("--days="));
const days = Number(daysArg?.split("=")[1] ?? "90");

if (!Number.isFinite(days) || days < 1) {
  throw new Error("--days must be a positive number");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();

const { data: applications, error } = await supabase
  .from("applications")
  .select("id,user_id,status,updated_at")
  .in("status", ["draft", "rejected"])
  .lt("updated_at", cutoff);
if (error) throw error;

const userIds = [...new Set((applications ?? []).map((item) => item.user_id))];
const { data: files, error: fileError } = userIds.length
  ? await supabase.from("application_files").select("id,storage_path,user_id").in("user_id", userIds)
  : { data: [], error: null };
if (fileError) throw fileError;

console.log(JSON.stringify({ mode: execute ? "execute" : "dry-run", cutoff, applications: applications?.length ?? 0, files: files?.length ?? 0 }, null, 2));
if (!execute) {
  console.log("Dry run only. Re-run with --execute after approval and backup verification.");
  process.exit(0);
}

for (let index = 0; index < (files?.length ?? 0); index += 1000) {
  const batch = files.slice(index, index + 1000).map((file) => file.storage_path);
  const { error: removeError } = await supabase.storage.from("application-files").remove(batch);
  if (removeError) throw removeError;
}

const ids = (applications ?? []).map((item) => item.id);
if (ids.length) {
  const { error: deleteError } = await supabase.from("applications").delete().in("id", ids);
  if (deleteError) throw deleteError;
}

await supabase.from("audit_logs").insert({
  actor_id: null,
  action: "retention.cleanup",
  entity_type: "application_batch",
  entity_id: null,
  metadata: { cutoff, applications: ids.length, files: files?.length ?? 0 },
});

console.log("Retention cleanup completed.");
