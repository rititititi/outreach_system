const assert=require('node:assert/strict');const {analyze,match}=require('../engine.js');
const text=`Company: Test Labs
Products: Skincare serum and cleanser
Target audience: Adults interested in ingredient-focused skin care
Target market: United States
Campaign goal: Build brand awareness
Budget: USD 5,000
Tone: Educational and thoughtful
Platform: Instagram
Description: We make accessible skincare with transparent ingredient lists.`;
const a=analyze(text,'test.txt');assert.equal(a.fields.brand,'Test Labs');assert.equal(a.fields.niche,'Skincare');assert.equal(a.fields.budget,5000);assert.equal(a.fields.market,'United States');assert.equal(a.fields.goal,'Brand awareness');assert.equal(a.fields.platform,'Instagram');assert.match(a.evidence.brand,/Company: Test Labs/);
const sparse=analyze('We sell interesting things to people around the world. Read more about our mission here.');assert.equal(sparse.fields.brand,undefined);assert.equal(sparse.fields.market,undefined);assert.equal(sparse.fields.budget,undefined);assert.equal(sparse.fields.niche,undefined);
assert.equal(analyze('Budget: HKD 50,000\nWe manufacture skin care products for local customers.').fields.budget,undefined);
assert.equal(analyze('Budget: $5,000\nWe manufacture skin care products for local customers.').fields.budget,undefined);
assert.throws(()=>analyze('too short'));assert.throws(()=>analyze('a'.repeat(120001)));
const ambiguous=analyze('We focus on skincare and software, with solutions spanning both industries.');assert.equal(ambiguous.fields.niche,undefined);
const skincare={niche:'Skincare',reason:'Ingredient-focused serum routines',cover:'skin care',market:'United States',platform:'Instagram',engagement:5};
const tech={...skincare,niche:'Technology',reason:'Electronics reviews and software',cover:'gadgets'};
assert(match(skincare,a.fields).score>match(tech,a.fields).score);assert(match(skincare,a.fields).eligible);assert(!match(tech,a.fields).eligible);
assert(!match(skincare,{...a.fields,market:'Hong Kong'}).eligible);assert(!match(skincare,{...a.fields,platform:'TikTok'}).eligible);assert(!match(skincare,{...a.fields,exclusions:'serum'}).eligible);
assert(match(skincare,{...a.fields,market:'US'}).eligible);assert.equal(match(skincare,a.fields).parts.reduce((s,p)=>s+p.points,0),match(skincare,a.fields).score);
console.log('PASS: evidence extraction, unknown fields, currency handling, ambiguous industry, bounds, profile relevance, market/platform constraints, exclusions.');
