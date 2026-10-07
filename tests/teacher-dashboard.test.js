const assert = require("assert");
const fs = require("fs");
const path = require("path");

const schema = fs.readFileSync(path.join(__dirname, "..", "supabase", "schema.sql"), "utf8");

assert.match(schema, /create table if not exists public\.teacher_accounts/i);
assert.match(schema, /not exists \(\s*select 1 from public\.teacher_accounts where user_id = auth\.uid\(\)/i);
assert.match(schema, /revoke all on public\.teacher_accounts from anon, authenticated/i);
assert.match(schema, /'questionRiskRates'/);
assert.match(schema, /'averageReflectionDelta'/);
assert.match(schema, /'weakestPrinciples'/);
assert.match(schema, /'episodeCompletion'/);
assert.match(schema, /'consentingRecords'/);
assert.match(schema, /'eligibleTrainingRecords'/);
assert.match(schema, /'minimumClusteringSamples', 50/);
assert.doesNotMatch(schema, /expertLabeledRecords|model_training_labels/i);
assert.match(schema, /score_entry\.key in \([\s\S]*'humanCenteredness'[\s\S]*'transparency'[\s\S]*\)/);
assert.doesNotMatch(schema, /'username'\s*,|'authEmail'\s*,|'displayName'\s*,/i);

console.log("Teacher dashboard SQL checks passed.");
