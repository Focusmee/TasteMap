<template>
  <div class="page">
    <NavBar />
    <div class="container">
      <div class="header">
        <div>
          <h2>健康咨询助手</h2>
          <p class="sub">本地规则助手版：可离线运行，后续可替换为你训练好的模型/LLM</p>
        </div>
        <div class="actions">
          <el-button @click="newSession" type="primary">新对话</el-button>
          <el-button @click="exportTxt" plain>导出记录</el-button>
        </div>
      </div>

      <div class="chat-layout">
        <el-card class="side" shadow="never">
          <div class="side-head">会话</div>
          <el-empty v-if="sessions.length===0" description="暂无会话" />
          <div v-else class="session-list">
            <div
              v-for="s in sessions"
              :key="s.id"
              class="session"
              :class="{active: s.id===activeId}"
              @click="selectSession(s.id)"
            >
              <div class="title">{{ s.topic }}</div>
              <div class="time">{{ fmt(s.updated_at) }}</div>
            </div>
          </div>
          <el-divider />
          <div class="quick">
            <div class="q" @click="sendQuick('我今天吃了狮子头，适合减脂吗？')">减脂可否吃</div>
            <div class="q" @click="sendQuick('我对花生过敏，有什么注意事项？')">过敏原提醒</div>
            <div class="q" @click="sendQuick('帮我制定一份一周的饮食原则')">一周原则</div>
          </div>
        </el-card>

        <el-card class="main" shadow="never">
          <div ref="msgBox" class="messages">
            <el-empty v-if="messages.length===0" description="开始提问吧" />
            <div v-for="m in messages" :key="m.id" class="msg" :class="m.role">
              <div class="bubble">{{ m.content }}</div>
              <div class="meta">{{ fmt(m.create_time) }}</div>
            </div>
          </div>

          <div class="composer">
            <el-input
              v-model="input"
              type="textarea"
              :rows="2"
              placeholder="输入你的问题，例如：这道菜的热量高吗？"
              @keyup.enter.exact.prevent="send"
            />
            <el-button type="primary" :loading="sending" @click="send">发送</el-button>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import NavBar from '@/components/NavBar.vue'
import { chatApi } from '@/api'
import dayjs from 'dayjs'

const sessions = ref([])
const activeId = ref(null)
const messages = ref([])

const input = ref('')
const sending = ref(false)
const msgBox = ref(null)

const fmt = (t) => (t ? dayjs(t).format('MM-DD HH:mm') : '')

const loadSessions = async () => {
  const res = await chatApi.sessions()
  if (res.success) {
    sessions.value = res.data.list || []
    if (!activeId.value && sessions.value.length) {
      activeId.value = sessions.value[0].id
      await loadMessages()
    }
  }
}

const loadMessages = async () => {
  if (!activeId.value) return
  const res = await chatApi.messages(activeId.value)
  if (res.success) {
    messages.value = res.data.list || []
    await scrollBottom()
  }
}

const newSession = async () => {
  const res = await chatApi.createSession('健康咨询')
  if (res.success) {
    await loadSessions()
    activeId.value = res.data.id
    messages.value = []
    await loadMessages()
  }
}

const selectSession = async (id) => {
  activeId.value = id
  await loadMessages()
}

const scrollBottom = async () => {
  await nextTick()
  if (msgBox.value) msgBox.value.scrollTop = msgBox.value.scrollHeight
}

const send = async () => {
  if (!activeId.value) {
    await newSession()
  }
  const text = input.value.trim()
  if (!text) return
  sending.value = true
  try {
    const res = await chatApi.send(activeId.value, text)
    if (res.success) {
      input.value = ''
      await loadMessages()
      await loadSessions()
    } else {
      ElMessage.error(res.message || '发送失败')
    }
  } catch (e) {
    ElMessage.error(e?.message || '网络错误')
  } finally {
    sending.value = false
  }
}

const sendQuick = async (t) => {
  input.value = t
  await send()
}

const exportTxt = () => {
  const lines = messages.value.map(m => `[${fmt(m.create_time)}] ${m.role === 'assistant' ? '助手' : '我'}：${m.content}`)
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `chat_${dayjs().format('YYYYMMDD_HHmm')}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(async () => {
  await loadSessions()
})
</script>

<style scoped lang="scss">
@use '@/styles/variable.scss' as *;
.page{min-height:100vh;background:$bg-color;}
.container{padding:24px 40px;max-width:1200px;margin:0 auto;}
.header{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin-bottom:16px;}
.sub{margin:6px 0 0;color:$text-secondary;}
.actions{display:flex;gap:10px;}
.chat-layout{display:grid;grid-template-columns:320px 1fr;gap:16px;}
.side,.main{border-radius:14px;}
.side-head{font-weight:800;margin-bottom:10px;}
.session-list{display:flex;flex-direction:column;gap:8px;max-height:420px;overflow:auto;}
.session{padding:10px 12px;border-radius:12px;background:#f7f9ff;cursor:pointer;}
.session.active{outline:2px solid rgba(64,158,255,.25);}
.session .title{font-weight:700;}
.session .time{font-size:12px;color:$text-secondary;margin-top:4px;}
.quick{display:flex;flex-direction:column;gap:8px;}
.q{padding:10px 12px;border-radius:12px;background:#fff;border:1px solid #eef2ff;cursor:pointer;color:#2c3e50;}
.messages{height:520px;overflow:auto;padding-right:6px;}
.msg{display:flex;flex-direction:column;margin:12px 0;}
.msg.user{align-items:flex-end;}
.msg.assistant{align-items:flex-start;}
.bubble{max-width:78%;padding:10px 12px;border-radius:14px;line-height:1.6;background:#fff;border:1px solid #eef2ff;}
.msg.user .bubble{background:#f0f9ff;border-color:#dbeafe;}
.meta{font-size:12px;color:$text-secondary;margin-top:6px;}
.composer{display:flex;gap:10px;align-items:flex-end;margin-top:12px;}
@media (max-width: 980px){
  .container{padding:18px 16px;}
  .chat-layout{grid-template-columns:1fr;}
  .messages{height:420px;}
}
</style>
