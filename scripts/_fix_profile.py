import subprocess
from pathlib import Path

path = Path(r"f:\TasteMap\frontend\frontend\src\views\Profile.vue")
orig = subprocess.check_output(["git","show","HEAD:frontend/frontend/src/views/Profile.vue"]).decode("utf-8")

# Update steps
orig = orig.replace(
    """          <el-steps :active=\"active\" align-center>\n            <el-step title=\"\u57fa\u7840\" />\n            <el-step title=\"\u76ee\u6807\" />\n            <el-step title=\"\u8fc7\u654f\u539f\" />\n            <el-step title=\"\u504f\u597d\" />\n          </el-steps>\n""",
    """          <el-steps :active=\"active\" align-center>\n            <el-step title=\"\u57fa\u7840\" />\n            <el-step title=\"\u76ee\u6807\" />\n            <el-step title=\"\u5065\u5eb7\" />\n            <el-step title=\"\u8fc7\u654f\u539f\" />\n            <el-step title=\"\u504f\u597d\" />\n          </el-steps>\n"""
)

health_block = """\n\n            <div v-else-if=\"active===2\">\n              <el-form :model=\"form\" label-width=\"110px\">\n                <el-form-item label=\"\u5065\u5eb7\u60c5\u51b5\">\n                  <el-checkbox-group v-model=\"form.conditions\">\n                    <el-checkbox v-for=\"c in conditionOpts\" :key=\"c.value\" :label=\"c.value\">{{ c.label }}</el-checkbox>\n                  </el-checkbox-group>\n                </el-form-item>\n                <el-form-item label=\"\u996e\u98df\u65b9\u5f0f\">\n                  <el-select v-model=\"form.diet_style\" style=\"width:260px\">\n                    <el-option label=\"\u666e\u901a\" value=\"normal\" />\n                    <el-option label=\"\u7d20\u98df\" value=\"vegetarian\" />\n                    <el-option label=\"\u7eaf\u7d20\" value=\"vegan\" />\n                    <el-option label=\"\u4f4e\u7cd6/\u4f4e\u78b3\" value=\"low_carb\" />\n                    <el-option label=\"\u4f4e\u76d0\" value=\"low_salt\" />\n                  </el-select>\n                </el-form-item>\n              </el-form>\n            </div>\n\n            <div v-else-if=\"active===3\">\n              <div class=\"tip\">\u53ef\u591a\u9009\uff0c\u7cfb\u7edf\u4f1a\u5728\u63a8\u8350\u548c\u8bc6\u522b\u7ed3\u679c\u4e2d\u6807\u7ea2\u63d0\u9192\u3002</div>\n              <el-check-tag\n                v-for=\"a in allergenOpts\"\n                :key=\"a\"\n                :checked=\"form.allergies.includes(a)\"\n                @change=\"(v)=>toggleAllergen(a,v)\"\n                style=\"margin:8px 8px 0 0\"\n              >{{ a }}</el-check-tag>\n              <el-divider />\n              <el-input v-model=\"allergenCustom\" placeholder=\"\u81ea\u5b9a\u4e49\u8fc7\u654f\u539f\uff0c\u56de\u8f66\u6dfb\u52a0\" @keyup.enter=\"addCustom\" />\n            </div>\n"""

orig = orig.replace(
    """\n\n            <div v-else-if=\"active===2\">\n              <div class=\"tip\">\u53ef\u591a\u9009\uff0c\u7cfb\u7edf\u4f1a\u5728\u63a8\u8350\u548c\u8bc6\u522b\u7ed3\u679c\u4e2d\u6807\u7ea2\u63d0\u9192\u3002</div>\n              <el-check-tag\n                v-for=\"a in allergenOpts\"\n                :key=\"a\"\n                :checked=\"form.allergens.includes(a)\"\n                @change=\"(v)=>toggleAllergen(a,v)\"\n                style=\"margin:8px 8px 0 0\"\n              >{{ a }}</el-check-tag>\n              <el-divider />\n              <el-input v-model=\"allergenCustom\" placeholder=\"\u81ea\u5b9a\u4e49\u8fc7\u654f\u539f\uff0c\u56de\u8f66\u6dfb\u52a0\" @keyup.enter=\"addCustom\" />\n            </div>\n""",
    health_block
)

orig = orig.replace(
    "<el-button v-if=\"active<3\" type=\"primary\" @click=\"active++\">\u4e0b\u4e00\u6b65</el-button>",
    "<el-button v-if=\"active<4\" type=\"primary\" @click=\"active++\">\u4e0b\u4e00\u6b65</el-button>"
)

key = "<div class=\"t\">\u5065\u5eb7\u6982\u89c8</div>"
idx = orig.find(key)
if idx == -1:
    raise SystemExit("Overview title not found")

start = orig.rfind('<el-card class="panel" shadow="never">', 0, idx)
if start == -1:
    raise SystemExit("Overview card start not found")

end = orig.find('</el-card>', idx)
if end == -1:
    raise SystemExit("Overview card end not found")
end += len('</el-card>')

overview_block = orig[start:end]
role_card = """        <div class=\"side\">\n          <el-card class=\"panel role-card\" shadow=\"never\">\n            <div class=\"role-head\">\n              <div class=\"role-title\">\u5065\u5eb7\u89d2\u8272\u5361</div>\n              <div class=\"role-sub\">RPG \u98ce\u683c\u5b9e\u65f6\u5c5e\u6027\u5c55\u793a</div>\n            </div>\n\n            <div class=\"role-body\">\n              <div class=\"identity\">\n                <div class=\"avatar\">{{ avatarLetter }}</div>\n                <div class=\"id-item\">\n                  <div class=\"id-key\">\U0001F464 \u6635\u79f0</div>\n                  <div class=\"id-val\">{{ nicknameDisplay }}</div>\n                </div>\n                <div class=\"id-item\">\n                  <div class=\"id-key\">\U0001F382 \u5e74\u9f84</div>\n                  <div class=\"id-val\">{{ form.age ?? '-' }}</div>\n                </div>\n                <div class=\"id-item\">\n                  <div class=\"id-key\">\U0001F4CF \u8eab\u9ad8\u4f53\u91cd</div>\n                  <div class=\"id-val\">{{ form.height ?? '-' }}cm / {{ form.weight ?? '-' }}kg</div>\n                </div>\n                <div class=\"id-item\">\n                  <div class=\"id-key\">\u2696\ufe0f BMI</div>\n                  <div class=\"id-val\">\n                    {{ bmiText }}\n                    <span class=\"badge\" :class=\"`badge-${bmiStatus.tone}`\">{{ bmiStatus.label }}</span>\n                  </div>\n                </div>\n                <div class=\"id-item\">\n                  <div class=\"id-key\">\U0001F3AF \u5f53\u524d\u76ee\u6807</div>\n                  <div class=\"id-val\">{{ goalLabel }}</div>\n                </div>\n              </div>\n\n              <div class=\"attrs\">\n                <div class=\"attr\">\n                  <div class=\"attr-head\">\n                    <div>\U0001F50B \u80fd\u91cf\u9700\u6c42</div>\n                    <div class=\"attr-text\">\u76ee\u6807 {{ form.calorie_target ?? '-' }} kcal</div>\n                  </div>\n                  <el-progress :percentage=\"caloriePercent\" :show-text=\"false\" :color=\"calorieColor\" />\n                </div>\n                <div class=\"attr\">\n                  <div class=\"attr-head\">\n                    <div>\U0001F4AA \u6d3b\u8dc3\u5ea6</div>\n                    <div class=\"attr-text\">{{ activityMeta.label }}</div>\n                  </div>\n                  <el-progress :percentage=\"activityMeta.percent\" :show-text=\"false\" :color=\"activityColor\" />\n                </div>\n                <div class=\"attr\">\n                  <div class=\"attr-head\">\n                    <div>\u2696\ufe0f \u4f53\u578b\u72b6\u6001</div>\n                    <div class=\"attr-text\">\n                      <span class=\"badge\" :class=\"`badge-${bmiStatus.tone}`\">{{ bmiStatus.label }}</span>\n                    </div>\n                  </div>\n                </div>\n                <div class=\"attr\">\n                  <div class=\"attr-head\">\n                    <div>\U0001F9E0 \u996e\u98df\u6a21\u5f0f</div>\n                    <div class=\"attr-text\">\n                      <span class=\"tag\">{{ dietStyleLabel }}</span>\n                    </div>\n                  </div>\n                </div>\n              </div>\n            </div>\n          </el-card>\n\n"""

replacement = role_card + overview_block + "\n        </div>"
orig = orig[:start] + replacement + orig[end:]

# Update allergens -> allergies
orig = orig.replace("form.allergens", "form.allergies")

# Add conditionOpts and diet style fields
orig = orig.replace(
    """const activityOpts = [\n  { label: '\u4f4e', value: 'low' },\n  { label: '\u4e2d', value: 'mid' },\n  { label: '\u9ad8', value: 'high' }\n]\n\nconst allergenOpts = ['\u82b1\u751f', '\u575a\u679c', '\u6d77\u9c9c', '\u9e21\u86cb', '\u725b\u5976', '\u5c0f\u9ea6', '\u5927\u8c46', '\u829d\u9ebb']\nconst prefSeed = ['\u5c11\u6cb9', '\u5c11\u76d0', '\u5c11\u7cd6', '\u6e05\u6de1', '\u4e0d\u8fa3', '\u9ad8\u86cb\u767d']\n""",
    """const activityOpts = [\n  { label: '\u4f4e', value: 'low' },\n  { label: '\u4e2d', value: 'mid' },\n  { label: '\u9ad8', value: 'high' }\n]\n\nconst conditionOpts = [\n  { label: '\u9ad8\u8840\u538b', value: 'hypertension' },\n  { label: '\u7cd6\u5c3f\u75c5/\u63a7\u7cd6', value: 'diabetes' },\n  { label: '\u9ad8\u8840\u8102', value: 'hyperlipidemia' },\n  { label: '\u75db\u98ce', value: 'gout' },\n  { label: '\u80a0\u80c3\u654f\u611f', value: 'sensitive_gut' }\n]\n\nconst allergenOpts = ['\u82b1\u751f', '\u575a\u679c', '\u6d77\u9c9c', '\u9e21\u86cb', '\u725b\u5976', '\u5c0f\u9ea6', '\u5927\u8c46', '\u829d\u9ebb']\nconst prefSeed = ['\u5c11\u6cb9', '\u5c11\u76d0', '\u5c11\u7cd6', '\u6e05\u6de1', '\u4e0d\u8fa3', '\u9ad8\u86cb\u767d']\n"""
)

orig = orig.replace(
    """  activity: 'mid',\n  allergens: [],\n  preferences: [],\n  scenes: []\n})\n\nconst overview = ref({})\n""",
    """  activity: 'mid',\n  conditions: [],\n  diet_style: 'normal',\n  allergies: [],\n  preferences: [],\n  scenes: []\n})\n\nconst overview = ref({})\n"""
)

orig = orig.replace(
    "const toggleAllergen = (a, checked) => {\n  const arr = new Set(form.value.allergens)\n  if (checked) arr.add(a)\n  else arr.delete(a)\n  form.value.allergens = Array.from(arr)\n}\n",
    "const toggleAllergen = (a, checked) => {\n  const arr = new Set(form.value.allergies)\n  if (checked) arr.add(a)\n  else arr.delete(a)\n  form.value.allergies = Array.from(arr)\n}\n"
)

orig = orig.replace(
    "  if (!form.value.allergens.includes(t)) form.value.allergens.push(t)\n",
    "  if (!form.value.allergies.includes(t)) form.value.allergies.push(t)\n"
)

orig = orig.replace(
    "import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'",
    "import { ref, onMounted, onBeforeUnmount, nextTick, computed } from 'vue'"
)

computed_block = """const overview = ref({})\nconst calorieColor = '#2563eb'\nconst activityColor = '#f59e0b'\n\nconst nicknameDisplay = computed(() => form.value.nickname?.trim() || '\u672a\u547d\u540d\u63a2\u7d22\u8005')\nconst avatarLetter = computed(() => nicknameDisplay.value[0]?.toUpperCase() || '?')\n\nconst bmi = computed(() => {\n  const h = Number(form.value.height)\n  const w = Number(form.value.weight)\n  if (!h || !w) return null\n  const m = h / 100\n  return w / (m * m)\n})\n\nconst bmiText = computed(() => (bmi.value ? bmi.value.toFixed(1) : '-'))\n\nconst bmiStatus = computed(() => {\n  if (!bmi.value) return { label: '\u672a\u77e5', tone: 'muted' }\n  if (bmi.value < 18.5) return { label: '\u504f\u7626', tone: 'blue' }\n  if (bmi.value < 24) return { label: '\u6b63\u5e38\u533a\u95f4', tone: 'green' }\n  if (bmi.value < 28) return { label: '\u504f\u80d6', tone: 'orange' }\n  return { label: '\u80a5\u80d6', tone: 'red' }\n})\n\nconst goalLabel = computed(() => {\n  const map = {\n    cut: '\u51cf\u8102',\n    bulk: '\u589e\u808c',\n    low_sugar: '\u63a7\u7cd6',\n    low_salt: '\u4f4e\u76d0',\n    balanced: '\u5747\u8861'\n  }\n  return map[form.value.goal] || '\u672a\u77e5'\n})\n\nconst caloriePercent = computed(() => {\n  const target = Number(form.value.calorie_target) || 0\n  const base = 2400\n  const pct = Math.round((target / base) * 100)\n  return Math.max(0, Math.min(100, pct))\n})\n\nconst activityMeta = computed(() => {\n  const map = {\n    low: { label: '\u4f4e', percent: 35 },\n    mid: { label: '\u4e2d', percent: 65 },\n    high: { label: '\u9ad8', percent: 90 }\n  }\n  return map[form.value.activity] || { label: '\u672a\u77e5', percent: 0 }\n})\n\nconst dietStyleLabel = computed(() => {\n  const map = {\n    normal: '\u666e\u901a\u578b\u996e\u98df\u8005',\n    vegetarian: '\u7d20\u98df',\n    vegan: '\u7eaf\u7d20',\n    low_carb: '\u4f4e\u7cd6/\u4f4e\u78b3',\n    low_salt: '\u4f4e\u76d0'\n  }\n  return map[form.value.diet_style] || '\u672a\u77e5'\n})\n\n"""

orig = orig.replace("const overview = ref({})\n", computed_block)

orig = orig.replace(
    ".grid{display:grid;grid-template-columns:1.15fr 1fr;gap:16px;}\n",
    ".grid{display:grid;grid-template-columns:1.15fr 1fr;gap:16px;}\n.side{display:flex;flex-direction:column;gap:16px;}\n"
)

style_block = """
.role-card{background:linear-gradient(135deg,#f8fafc 0%, #eef2ff 60%, #e0f2fe 100%);border:1px solid #e0e7ff;}
.role-head{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:12px;}
.role-title{font-size:18px;font-weight:900;}
.role-sub{font-size:12px;color:$text-secondary;}
.role-body{display:grid;grid-template-columns:1fr 1.2fr;gap:16px;}
.identity{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:12px;}
.avatar{width:64px;height:64px;border-radius:16px;background:linear-gradient(135deg,#fef3c7,#bfdbfe);display:flex;align-items:center;justify-content:center;font-weight:900;color:#1f2937;margin-bottom:10px;font-size:20px;}
.id-item{display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px dashed #e5e7eb;font-size:13px;}
.id-item:last-child{border-bottom:0;}
.id-key{color:$text-secondary;}
.id-val{font-weight:700;display:flex;align-items:center;gap:8px;}
.attrs{display:flex;flex-direction:column;gap:12px;}
.attr{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:10px 12px;}
.attr-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-size:13px;}
.attr-text{color:$text-secondary;}
.badge{display:inline-flex;align-items:center;gap:6px;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:700;}
.badge-green{background:#dcfce7;color:#166534;}
.badge-blue{background:#dbeafe;color:#1d4ed8;}
.badge-orange{background:#ffedd5;color:#9a3412;}
.badge-red{background:#fee2e2;color:#991b1b;}
.badge-muted{background:#f3f4f6;color:#6b7280;}
.tag{display:inline-flex;align-items:center;padding:2px 8px;border-radius:10px;background:#eef2ff;color:#3730a3;font-size:12px;font-weight:700;}
"""

orig = orig.replace(".chart{height:260px;}\n", ".chart{height:260px;}\n" + style_block)

orig = orig.replace(
    "@media (max-width: 980px){\n  .container{padding:18px 16px;}\n  .grid{grid-template-columns:1fr;}\n  .stats{grid-template-columns:1fr;}\n}\n",
    "@media (max-width: 980px){\n  .container{padding:18px 16px;}\n  .grid{grid-template-columns:1fr;}\n  .stats{grid-template-columns:1fr;}\n  .role-body{grid-template-columns:1fr;}\n}\n"
)

path.write_text(orig, encoding="utf-8")
print("Profile.vue rebuilt from git base")
