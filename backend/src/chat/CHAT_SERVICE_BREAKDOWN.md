# chat.service.ts — tuzilma va ajratish rejasi

**Fayl:** `chat.service.ts`  
**Hajm:** ~2549 qator  
**Maqsad:** Barcha logikani bo‘limlarga ajratib, qatorlar va metodlar ro‘yxatini berish.

---

## 1. Umumiy tuzilma

| Bo‘lim | Qatorlar (taxminan) | Tavsif |
|--------|---------------------|--------|
| **Constructor + Gemini init** | 1–80 | Nest dependency injection, Gemini API sozlash |
| **AI Chat** | 86–802 | `handleChatMessage` — AI tools, function calls, prompts |
| **Expenses** | 804–1066 | `addExpense`, `createRecurringExpenses`, `createRecurringIncomes` (income recurrence) |
| **Incomes** | 1069–1191 | `addIncome`, recurring, auto-allocate goals |
| **Goals (AI orqali)** | 1194–1218 | `addGoal` — faqat chat kontekstida |
| **Insights** | 1221–1331 | `getInsights` — davr, kategoriya, emotion tahlil |
| **Reports** | 1334–1936 | `generateReport`, `generateReportAnalysis`, `generateHTMLReport`, `generateExcelReport` |
| **Helpers (private)** | 1940–2068 | `categorizeExpense`, `generateInsightsText` |
| **CRUD Expenses/Incomes** | 2072–2398 | `getExpenses`, `getIncomes`, `getEmotions`, `updateExpense`, `updateIncome`, `deleteExpense`, `deleteIncome` |
| **Categories** | 2403–2503 | `getCategories`, `renameCategory`, `mergeCategories`, `updateTransactionCategory` |
| **Simple Parser** | 2509–2547 | `simpleParser` — AI yo‘q bo‘lsa fallback |

---

## 2. Metodlar ro‘yxati (qator bo‘yicha)

### Public (controller chaqiradi)

| Metod | Qator | Vazifa |
|-------|--------|--------|
| `handleChatMessage` | 86 | AI chat + tools (add_expense, add_income, add_goal, update_goal_progress, get_insights) |
| `addExpense` | 804 | Yangi expense qo‘shish, budget tekshiruv, recurring |
| `addIncome` | 1069 | Yangi income qo‘shish, recurring, goals auto-allocate |
| `addGoal` | 1194 | Yangi goal yaratish (AI orqali) |
| `getInsights` | 1221 | Davr bo‘yicha tahlil (spending, categories, emotions) |
| `generateReport` | 1334 | PDF/Excel/HTML hisobot, email |
| `getExpenses` | 2072 | User expenses ro‘yxati |
| `getIncomes` | 2082 | User incomes ro‘yxati |
| `getEmotions` | 2093 | Emotion bo‘yicha expense tahlil |
| `updateExpense` | 2141 | Expense yangilash |
| `updateIncome` | 2159 | Income yangilash |
| `deleteExpense` | 2177 | Expense o‘chirish, photo fayl o‘chirish |
| `deleteIncome` | 2298 | Income o‘chirish, goals rollback |
| `getCategories` | 2403 | User category lari |
| `renameCategory` | 2433 | Kategoriya nomini o‘zgartirish |
| `mergeCategories` | 2457 | Ikki kategoriyani birlashtirish |
| `updateTransactionCategory` | 2485 | Tanlangan transaksiyalar kategoriyasini o‘zgartirish |

### Private (faqat service ichida)

| Metod | Qator | Vazifa |
|-------|--------|--------|
| `createRecurringIncomes` | 962 | Daily recurrence bo‘yicha income lar yaratish |
| `createRecurringExpenses` | 1012 | Daily recurrence bo‘yicha expense lar yaratish |
| `generateReportAnalysis` | 1503 | Hisobot matni (ru/en/ja) |
| `generateHTMLReport` | 1568 | HTML hisobot sahifa |
| `generateExcelReport` | 1856 | Excel (exceljs) |
| `categorizeExpense` | 1940 | Description dan kategoriya taxmin qilish |
| `generateInsightsText` | 1955 | Insights uchun matn (emotions/spending) |
| `simpleParser` | 2509 | "курица 100" / "зарплата 500" fallback parser |

---

## 3. Bog‘liqliklar (constructor)

- `expenseRepo`, `incomeRepo` — TypeORM
- `usersService` — User tekshirish
- `goalsService` — Balance, goals, updateGoal
- `budgetsService` — Budget tekshiruv, getBudgetWithSpending
- `emailService` — Budget/report email
- `configService` — GEMINI_API_KEY
- `pdfService` — HTML → PDF

---

## 4. Ajratish taklifi (modullarga bo‘lish)

Quyidagi servislarga bo‘lish mumkin. `ChatService` faqat AI chat va boshqa servislarni chaqiruvchi “facade” qilib qoldiriladi.

| Yangi servis / fayl | O‘z ichiga olishi kerak | Taxminan qator |
|--------------------|--------------------------|----------------|
| **expenses.service.ts** | `addExpense`, `createRecurringExpenses`, `getExpenses`, `updateExpense`, `deleteExpense`, `categorizeExpense` | ~500 |
| **incomes.service.ts** | `addIncome`, `createRecurringIncomes`, `getIncomes`, `updateIncome`, `deleteIncome`, goals auto-allocate/rollback | ~350 |
| **insights.service.ts** | `getInsights`, `generateInsightsText`, `getEmotions` | ~250 |
| **reports.service.ts** | `generateReport`, `generateReportAnalysis`, `generateHTMLReport`, `generateExcelReport` | ~600 |
| **categories.service.ts** | `getCategories`, `renameCategory`, `mergeCategories`, `updateTransactionCategory` | ~100 |
| **chat-ai.service.ts** (yoki chat.service.ts ichida qoladi) | `handleChatMessage`, tools ta’rifi, `simpleParser`, `addGoal` (yoki goalsService ga delegatsiya) | ~750 |

**ChatService** keyin:
- `ExpensesService`, `IncomesService`, `InsightsService`, `ReportsService`, `CategoriesService` ni inject qiladi;
- `handleChatMessage` va `simpleParser` shu yerda qoladi, qolgan ishlar (add expense/income, get insights, add goal) tegishli servislarga delegatsiya qilinadi.

---

## 5. Qisqa xulosa

- **chat.service.ts** hozir: chat AI + expenses + incomes + insights + reports + categories bitta faylda.
- **Ajratish:** expenses, incomes, insights, reports, categories alohida servislar; chat.service faqat AI va orchestrator.
- **Foyda:** Har bir fayl ~100–600 qator atrofida, test va o‘zgartirish osonlashadi.

Agar keyingi qadamda konkret fayllar (masalan, `expenses.service.ts`) uchun kod bo‘laklarini chiqarib berish kerak bo‘lsa, shuni yozing.
