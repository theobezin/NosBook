# NosBook — TODO

## Future Features

### Image Recognition for Weapon Setup
Allow players to take a screenshot of their in-game weapon tooltip and have the app
automatically fill in all weapon details (name, rarity, improvement, shell effects
with rank/value, runic skills with value).

**Recommended approach:** Vision LLM (Claude Haiku or GPT-4o-mini)
- Player uploads/pastes a screenshot
- A Supabase Edge Function sends it to the vision API with a structured prompt
- API returns JSON mapped to our SHELL_EFFECTS / RUNIC_EFFECTS keys
- App pre-fills the weapon modals for user review before saving

**Estimated cost:** ~€0.01–0.03 per image (Claude Haiku)
**Infrastructure needed:** Supabase Edge Function + Anthropic API key

---

### Secondary weapon + costume (arme secondaire + costume)
- Shell system for secondary weapon ✅ (done)
- Runic skills not applicable to secondary weapon ✅ (done)
- TODO: Same shell + runic system for costume slots (costumeTop, costumeBottom, costumeWings)
