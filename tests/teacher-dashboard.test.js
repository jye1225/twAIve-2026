const assert = require("assert");
const fs = require("fs");
const path = require("path");

const schema = fs.readFileSync(path.join(__dirname, "..", "supabase", "schema.sql"), "utf8").replace(/\r\n/g, "\n");

assert.match(schema, /create table if not exists public\.teacher_accounts/i);
assert.match(schema, /not exists \(\s*select 1 from public\.teacher_accounts where user_id = auth\.uid\(\)/i);
assert.match(schema, /revoke all on public\.teacher_accounts from anon, authenticated/i);
assert.match(schema, /'questionRiskRates'/);
assert.match(schema, /'averageReflectionDelta'/);
assert.match(schema, /'weakestPrinciples'/);
assert.match(schema, /'episodeCompletion'/);
assert.match(schema, /'consentingRecords'/);
assert.match(schema, /'eligibleTrainingRecords'/);
assert.match(schema, /'eligibleTrainingLearners', eligible_training_learners/);
assert.match(schema, /'scoringVersion', 3/);
assert.match(schema, /having count\(distinct progress\.episode_id\) = 5 and count\(distinct score_entry\.key\) = 7/);
assert.match(schema, /progress\.episode_id in \('deepfake', 'rumor', 'chatbot', 'assignment', 'privacy'\)/);
assert.ok((schema.match(/scores ->> '_version' = '3'/g) || []).length >= 8, "All dashboard aggregations must use the current scoring version");
assert.match(schema, /'minimumClusteringSamples', 50/);
assert.doesNotMatch(schema, /expertLabeledRecords|model_training_labels/i);
assert.match(schema, /score_entry\.key in \([\s\S]*'humanCenteredness'[\s\S]*'transparency'[\s\S]*\)/);
assert.doesNotMatch(schema, /'username'\s*,|'authEmail'\s*,|'displayName'\s*,/i);
const migration = fs.readFileSync(path.join(__dirname, "..", "supabase", "migrations", "20261008_teacher_dashboard_v3.sql"), "utf8").replace(/\r\n/g, "\n");
assert.ok(migration.includes(schema.slice(schema.indexOf("create or replace function public.get_teacher_dashboard()"))), "The non-destructive migration must match the current dashboard function");
assert.doesNotMatch(migration, /drop table|drop column|delete from|update public\./i);

console.log("Teacher dashboard SQL checks passed.");
