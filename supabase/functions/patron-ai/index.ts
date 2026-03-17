import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2.45.0"
import { ChatOpenAI } from "npm:@langchain/openai@0.2.8"
import { AgentExecutor, createOpenAIFunctionsAgent } from "npm:langchain@0.2.16/agents"
import { ChatPromptTemplate, MessagesPlaceholder } from "npm:@langchain/core@0.2.27/prompts"
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from "npm:@langchain/core@0.2.27/messages"
import { tool } from "npm:@langchain/core@0.2.27/tools"
import { z } from "npm:zod@3.23.8"

// Configuration
const OPENAI_API_KEY = Deno.env.get("PATRON_API_KEY")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

// Initialize Supabase Client with service role for full DB access
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// Setup System Prompt
const SYSTEM_PROMPT = `Sen Patron AI'sın — Clever Service platformunun kurumsal veri asistanısın.

## TEMEL KURAL: Gerçek Veriye Dayan, Asla Tahmin Etme

Sana yöneltilen her soru için önce elindeki araçlardan (tools) ilgili veriyi çek, ardından bu gerçek veriye dayanarak yanıt ver.
Veritabanında olmayan hiçbir konuda yorum, tahmin veya genel bilgi sunma.

## ZORUNLU DAVRANIŞ KURALLARI

### 1. Veri Önce, Yorum Sonra
Kullanıcı bir şey sorduğunda:
  a) Soruyla ilgili hangi tool'un kullanılacağına karar ver (get_customers / get_stock_status / get_orders_report / get_revenue_summary).
  b) Gereken tool'u (veya birden fazla tool'u ard arda) çağır.
  c) Dönen gerçek veriyi analiz et ve net, okunabilir bir yanıt oluştur.
Veriyi çekmeden asla yanıt verme; "sanırım", "genellikle", "muhtemelen" gibi ifadeler kullanma.

### 2. Kapsam Dışı Sorularda Nazikçe Reddet
Şirket veritabanıyla ilgisi olmayan konularda (hava durumu, genel haberler, tarih, kişisel tavsiye, kod yazma vb.) şu şekilde yanıt ver:
  "Ben yalnızca şirketinizin verileri hakkında yardımcı olabilirim. Müşteriler, stok, siparişler veya gelir hakkında bir şey sormak ister misiniz?"
Bu mesajı her seferinde farklı kelimelerle yaz, robotik tekrara düşme.

### 3. Karşılaştırma Yap
"X ile Y'yi karşılaştır" gibi isteklerde her iki ürünü/müşteriyi/segmenti de ilgili tool ile ayrı ayrı sorgula, ardından yan yana karşılaştırmalı tablo veya liste hâlinde sun.

### 4. Analiz Yap
Fiyat, kur veya performans analizi istenirse:
  - Önce veritabanından gerçek rakamları çek.
  - Kur karşılaştırması gerekiyorsa (ör. "dolar bazında pahalı mı?"), güncel yaklaşık USD/TRY kuru olarak 1 USD ≈ 38 TL kullan ve bunu kullanıcıya açıkça belirt.
  - Yorumunu tamamen çektiğin gerçek veriye dayandır.

### 5. Öneri Ver
"Hangi müşteriye kampanya yapayım?", "En riskli ürünüm hangisi?" gibi stratejik sorularda:
  - İlgili tool'ları çağırarak veriyi topla.
  - Segmentlere, harcama miktarlarına, stok durumuna veya sipariş geçmişine bakarak somut, gerekçeli öneriler sun.
  - Her önerinin arkasına veriden alınan sayısal kanıtı ekle.

## İŞ SENARYOLARI

Aşağıdaki soru türlerine karşılık hangi tool'un nasıl kullanılacağı:

| Soru Tipi | Tool | Davranış |
|---|---|---|
| "Stoğu biten / kritik ürünler?" | get_stock_status(only_low_stock=true) | 🔴🟡 ikonlarıyla listele |
| "X ürün kaç TL / kaç adet?" | get_stock_status | Tek ürün filtreli bilgi sun |
| "X ile Y ürününü karşılaştır" | get_stock_status (iki ayrı sorgu) | Yan yana liste formatı |
| "En çok harcayan müşteriler?" | get_customers(limit=10) | Harcama sıralamasıyla listele |
| "VIP müşterilerimi göster" | get_customers(segment=vip) | Segment filtreli liste |
| "Pasif müşterilerimi geri kazanayım" | get_customers(segment=inactive) | Kampanya önerisiyle sun |
| "Bu ay kaç sipariş?" | get_orders_report(days_back=30) | Durum özeti + toplam ciro |
| "Bekleyen siparişlerim?" | get_orders_report(status=pending) | Sadece pending listesi |
| "İptal oranım nedir?" | get_orders_report → hesapla | Yüzde olarak raporla |
| "Toplam gelirim ne?" | get_revenue_summary | Segment bazlı breakdown |

**Müşteri ayak izi / browsing soruları** (hangi müşteri hangi ürüne baktı vb.) için:
Hangi müşterinin hangi ürüne baktığını görmek için ürün görüntüleme verisi gerekiyor, ancak şu an bu veri sisteminizde kayıt altında değil. Müşteri harcama ve segment analizine bakabilir miyim?

## PROAKTİF UYARILAR

Veriyi çektikten sonra aşağıdaki koşulları kontrol et ve koşul sağlanıyorsa yanıtın **sonuna** istenmeden uyarı ekle:

1. **Kritik stok:** Herhangi bir ürünün stock_quantity = 0 ise → "⚠️ [Ürün adı] tamamen tükendi, yeniden sipariş vermeyi düşünün."
2. **Yüksek iptal oranı:** İptal oranı %20'yi geçiyorsa → "❗ Son dönemde iptal oranınız %X — nedenini araştırmanızı öneririm."
3. **Yüksek pasif müşteri oranı:** inactive segment toplam müşterinin %30'unu geçiyorsa → "💡 Müşterilerinizin %X'i pasif — geri kazanım kampanyası değerlendirebilirsiniz."
4. **Gelir yoğunlaşması:** Tek segmentin payı toplam gelirin %80'ini geçiyorsa → "📊 Gelirinizin büyük çoğunluğu tek segmentten geliyor — çeşitlendirme riski var."

Proaktif uyarılar yanıtın **sonuna** eklenir, asla başına değil. Koşul sağlanmıyorsa uyarı ekleme.

## BELİRSİZLİK YÖNETİMİ

- **Belirsiz ürün/müşteri adı:** "Hangi ürünü kastediyorsunuz? Stok listesini getireyim, seçebilirsiniz." — ardından get_stock_status çağır.
- **Boş sorgu sonucu:** "Bu kritere uyan kayıt bulunamadı. Filtreyi genişleteyim mi?"
- **Tarih/dönem belirtilmemiş sipariş sorusu:** Varsayılan olarak son 30 güne bak; bunu kullanıcıya belirt: "Son 30 günü baz aldım."
- **Çok geniş soru ("her şeyi göster", "tüm verileri getir"):** Önce get_revenue_summary ile genel özet getir, ardından "Daha ayrıntılı hangi alanı inceleyelim?" diye sor.
- **Tool hatası / teknik sorun:** "Bu veriyi şu an çekemedim. Lütfen tekrar deneyin veya farklı bir soru sorun."

## DİL VE TON

- Resmi ama sıcak Türkçe; ne robotik ne de aşırı samimi.
- "Efendim", "Sayın" gibi aşırı resmi ifadeler kullanma.
- Emoji politikası:
  - İzin verilen: Veri listelerinde durum ikonları (🔴 🟡 🟢 ⚠️ ❗ 📦 🚚 💡 📊 👑 ⭐ 📋 💤 ⏳ ✅ ❌)
  - Yasak: Selamlama, kapanış veya genel açıklama cümlelerinde dekoratif emoji kullanma.
- "Tabii ki!", "Harika soru!", "Elbette!" gibi dolgu cümleleri kullanma — doğrudan veriye gir.
- Sayısal ifadelerde Türk formatı: ₺12.500,00 (nokta binlik ayraç, virgül ondalık ayraç).
- Yüzdeler: %24,5 şeklinde, noktalama Türkçe standardında.

## YANIT FORMATI
- Yanıtlar Türkçe olsun.
- Para birimlerini ₺ ve Türk lirası formatında göster (ör. ₺12.500,00).
- Listelerde madde işareti (•) ve kısa başlıklar kullan.
- Uzun tablolar yerine özet + en kritik 5-10 kalem göster; kullanıcı daha fazla isterse daha ayrıntılı ver.
- Gereksiz selamlama veya kapanış cümlesi ekleme — doğrudan konuya gir.

## SINIRLAR
- Şirket verisi dışında hiçbir genel bilgi, tavsiye veya içerik üretme.
- Veritabanına yazma, silme veya güncelleme yapma — yalnızca okuma (SELECT) araçların var.
- Kullanıcının tenant_id'si dışındaki verilere erişme; her sorgu zaten tenant_id ile filtrelenir.`

// ─── TOOL DEFINITIONS ─────────────────────────────────

/**
 * 1. Müşteri Listesi / Segment Filtresi
 */
const getCustomersTool = tool(
  async ({ tenant_id, segment, limit }: { tenant_id: string; segment?: "vip" | "premium" | "standard" | "inactive"; limit?: number }) => {
    let query = supabase
      .from("customers")
      .select("name, email, phone, segment, total_orders, total_spent")
      .eq("tenant_id", tenant_id)
      .order("total_spent", { ascending: false })
      .limit(limit ?? 10)

    if (segment) query = query.eq("segment", segment.toLowerCase())

    const { data, error } = await query
    if (error) return `Hata: ${error.message}`
    if (!data || data.length === 0) return "Kriterlere uyan müşteri bulunamadı."

    const rows = data.map((c: { name: string; segment: string; total_orders: number; total_spent: number }) =>
      `• ${c.name} (${c.segment.toUpperCase()}) — ${c.total_orders} sipariş, ₺${Number(c.total_spent).toLocaleString("tr-TR")}`
    )
    return `Toplam ${data.length} müşteri:\n${rows.join("\n")}`
  },
  {
    name: "get_customers",
    description:
      "Şirketin müşteri listesini getirir. Segment filtresi opsiyoneldir (vip, premium, standard, inactive). Harcama ve sipariş sayısıyla birlikte listeler.",
    schema: z.object({
      tenant_id: z.string().describe("Kiracı/şirket kimliği"),
      segment: z.enum(["vip", "premium", "standard", "inactive"]).optional().describe("Müşteri segmenti"),
      limit: z.number().int().min(1).max(50).optional().describe("Kaç müşteri getirilsin? (varsayılan: 10)"),
    }),
  }
)

/**
 * 2. Stok Durumu
 */
type ProductRow = { name: string; sku: string; category: string; price: number; stock_quantity: number; low_stock_threshold: number }

const getStockTool = tool(
  async ({ tenant_id, only_low_stock, category }: { tenant_id: string; only_low_stock?: boolean; category?: string }) => {
    let query = supabase
      .from("products")
      .select("name, sku, category, price, stock_quantity, low_stock_threshold")
      .eq("tenant_id", tenant_id)
      .eq("is_active", true)
      .order("stock_quantity", { ascending: true })

    if (category) query = query.eq("category", category)

    const { data, error } = await query.limit(20)
    if (error) return `Hata: ${error.message}`
    if (!data || data.length === 0) return "Ürün bulunamadı."

    const filtered = only_low_stock
      ? (data as ProductRow[]).filter((p) => p.stock_quantity <= p.low_stock_threshold)
      : (data as ProductRow[])

    if (filtered.length === 0) return "Düşük stokta ürün yok, stoklar yeterli!"

    const rows = filtered.map((p: ProductRow) => {
      const alert = p.stock_quantity === 0 ? "🔴 STOK YOK" : p.stock_quantity <= p.low_stock_threshold ? "🟡 DÜŞÜK" : "🟢"
      return `• ${alert} ${p.name} (${p.sku}) — Stok: ${p.stock_quantity} adet, Fiyat: ₺${Number(p.price).toLocaleString("tr-TR")}`
    })
    return `${only_low_stock ? "Düşük/biten stok" : "Stok durumu"} (${filtered.length} ürün):\n${rows.join("\n")}`
  },
  {
    name: "get_stock_status",
    description:
      "Ürün stok durumunu getirir. Düşük stokta olan veya biten ürünleri filtreler. Kategori bazında da sorgulanabilir.",
    schema: z.object({
      tenant_id: z.string().describe("Kiracı/şirket kimliği"),
      only_low_stock: z.boolean().optional().describe("Sadece düşük/biten stokları getir"),
      category: z.string().optional().describe("Kategori filtresi örn: 'Elektronik', 'Aksesuar'"),
    }),
  }
)

/**
 * 3. Sipariş Raporu / Özeti
 */
type OrderRow = { customer_name: string; status: string; total_amount: number; created_at: string }

const getOrdersTool = tool(
  async ({ tenant_id, status, days_back }: { tenant_id: string; status?: string; days_back?: number }) => {
    const since = new Date()
    since.setDate(since.getDate() - (days_back ?? 30))

    let query = supabase
      .from("orders")
      .select("customer_name, status, total_amount, created_at")
      .eq("tenant_id", tenant_id)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(50)

    if (status) query = query.eq("status", status)

    const { data, error } = await query
    if (error) return `Hata: ${error.message}`
    if (!data || data.length === 0) return `Son ${days_back ?? 30} günde sipariş bulunamadı.`

    const orders = data as OrderRow[]
    const total = orders.reduce((sum: number, o: OrderRow) => sum + Number(o.total_amount), 0)
    const byStatus: Record<string, number> = {}
    orders.forEach((o: OrderRow) => { byStatus[o.status] = (byStatus[o.status] || 0) + 1 })

    const statusLabel: Record<string, string> = {
      pending: "⏳ Bekleyen",
      confirmed: "✅ Onaylı",
      shipped: "🚚 Kargoda",
      delivered: "📦 Teslim",
      cancelled: "❌ İptal",
    }

    const summary = Object.entries(byStatus)
      .map(([s, c]) => `${statusLabel[s] ?? s}: ${c}`)
      .join(" | ")

    const recent = orders.slice(0, 5).map((o: OrderRow) =>
      `• ${o.customer_name} — ₺${Number(o.total_amount).toLocaleString("tr-TR")} (${statusLabel[o.status] ?? o.status})`
    )

    return [
      `Son ${days_back ?? 30} gün sipariş özeti (${data.length} sipariş):`,
      `Toplam Ciro: ₺${total.toLocaleString("tr-TR")}`,
      `Durum: ${summary}`,
      `\nSon siparişler:`,
      ...recent,
    ].join("\n")
  },
  {
    name: "get_orders_report",
    description:
      "Sipariş raporunu getirir. Belirli bir durum (pending/confirmed/shipped/delivered/cancelled) ve gün aralığı ile filtrelenebilir. Toplam ciro ve durum özeti verir.",
    schema: z.object({
      tenant_id: z.string().describe("Kiracı/şirket kimliği"),
      status: z
        .enum(["pending", "confirmed", "shipped", "delivered", "cancelled"])
        .optional()
        .describe("Sipariş durumu filtresi"),
      days_back: z.number().int().min(1).max(365).optional().describe("Kaç gün geriye bak? (varsayılan: 30)"),
    }),
  }
)

/**
 * 4. Gelir Özeti (customers tablosundan segment bazlı)
 */
type CustomerSegmentRow = { segment: string; total_spent: number; total_orders: number }

const getRevenueSummaryTool = tool(
  async ({ tenant_id }: { tenant_id: string }) => {
    const { data, error } = await supabase
      .from("customers")
      .select("segment, total_spent, total_orders")
      .eq("tenant_id", tenant_id)

    if (error) return `Hata: ${error.message}`
    if (!data || data.length === 0) return "Gelir verisi bulunamadı."

    const bySegment: Record<string, { spent: number; orders: number; count: number }> = {}
    let grandTotal = 0

    ;(data as CustomerSegmentRow[]).forEach((c: CustomerSegmentRow) => {
      if (!bySegment[c.segment]) bySegment[c.segment] = { spent: 0, orders: 0, count: 0 }
      bySegment[c.segment].spent += Number(c.total_spent)
      bySegment[c.segment].orders += Number(c.total_orders)
      bySegment[c.segment].count += 1
      grandTotal += Number(c.total_spent)
    })

    const segmentLabel: Record<string, string> = {
      vip: "👑 VIP",
      premium: "⭐ Premium",
      standard: "📋 Standart",
      inactive: "💤 Pasif",
    }

    const rows = Object.entries(bySegment).map(([seg, v]) =>
      `${segmentLabel[seg] ?? seg}: ${v.count} müşteri, ${v.orders} sipariş, ₺${v.spent.toLocaleString("tr-TR")}`
    )

    return [
      `Toplam Gelir: ₺${grandTotal.toLocaleString("tr-TR")}`,
      `Müşteri Segmenti Özeti:`,
      ...rows,
    ].join("\n")
  },
  {
    name: "get_revenue_summary",
    description:
      "Toplam gelir özetini ve müşteri segment bazlı harcama dağılımını getirir. Kimin ne kadar harcadığına dair genel bakış sağlar.",
    schema: z.object({
      tenant_id: z.string().describe("Kiracı/şirket kimliği"),
    }),
  }
)

const tools = [getCustomersTool, getStockTool, getOrdersTool, getRevenueSummaryTool]

// ─── CORS HELPERS ─────────────────────────────────────
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  })
}

// ─── MAIN HANDLER ─────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return json({ ok: true })

  try {
    const body = await req.json().catch(() => ({}))
    const { tenant_id, user_id, question, conversation_id } = body

    if (!question) return json({ error: "Soru boş olamaz (question missing)" }, 400)
    if (!tenant_id) return json({ error: "tenant_id zorunludur" }, 400)

    console.log(`[Patron AI] user: ${user_id}, tenant: ${tenant_id}`)

    // UUID format validator — "dev_user_123" gibi geçersiz değerleri null'a çevir
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const safeUserId: string | null = (typeof user_id === "string" && UUID_RE.test(user_id)) ? user_id : null

    let currentConversationId = conversation_id
    let chatHistory: BaseMessage[] = []

    // 1. Fetch Conversation History
    if (currentConversationId) {
      const { data: convData, error: convErr } = await supabase
        .from("ai_conversations")
        .select("messages")
        .eq("id", currentConversationId)
        .single()

      if (!convErr && convData?.messages) {
        chatHistory = (convData.messages as Array<{ role: string; content: string }>).map((m) => {
          if (m.role === "user") return new HumanMessage(m.content)
          if (m.role === "assistant") return new AIMessage(m.content)
          return new SystemMessage(m.content)
        })
        if (chatHistory.length > 10) chatHistory = chatHistory.slice(chatHistory.length - 10)
      }
    } else {
      // Create new conversation
      const { data: newConv } = await supabase
        .from("ai_conversations")
        .insert({ tenant_id, user_id: safeUserId, title: question.slice(0, 60) })
        .select("id")
        .single()

      if (newConv?.id) currentConversationId = newConv.id
    }

    // 2. Setup LangChain Agent
    const llm = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0.3,
      apiKey: OPENAI_API_KEY,
    })

    const prompt = ChatPromptTemplate.fromMessages([
      ["system", SYSTEM_PROMPT],
      new MessagesPlaceholder("chat_history"),
      ["human", "{input}"],
      new MessagesPlaceholder("agent_scratchpad"),
    ])

    const agent = await createOpenAIFunctionsAgent({ llm, tools, prompt })
    const agentExecutor = new AgentExecutor({ agent, tools, verbose: true })

    // 3. Execute Agent — inject tenant_id into question context
    const enrichedQuestion = `[tenant_id: ${tenant_id}] ${question}`
    const result = await agentExecutor.invoke({
      input: enrichedQuestion,
      chat_history: chatHistory,
    })

    const answer = result.output

    // 4. Persist messages to DB
    if (currentConversationId) {
      const newMessages = [
        ...chatHistory.map((m) => ({
          role: m._getType() === "human" ? "user" : "assistant",
          content: typeof m.content === "string" ? m.content : "",
        })),
        { role: "user", content: question },
        { role: "assistant", content: answer },
      ]

      await supabase
        .from("ai_conversations")
        .update({ messages: newMessages, updated_at: new Date().toISOString() })
        .eq("id", currentConversationId)
    }

    return json({ answer, conversation_id: currentConversationId })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu"
    console.error("Agent error:", error)
    return json({ error: msg }, 500)
  }
})
