import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { EmotionLevel } from './expense.entity';
import { UsersService } from '../users/users.service';
import { GoalsService } from '../goals/goals.service';
import { ExpensesService } from './expenses.service';
import { IncomesService } from './incomes.service';
import { InsightsService } from './insights.service';
import { ReportsService } from './reports.service';
import { CategoriesService } from './categories.service';

type CurrencyCode = 'USD' | 'UZS' | 'JPY' | 'RUB';

const CURRENCY_RATES_FROM_USD: Record<CurrencyCode, number> = {
  USD: 1,
  UZS: 12650,
  JPY: 150,
  RUB: 92,
};

const CURRENCY_ALIASES: Record<CurrencyCode, RegExp> = {
  USD: /\b(usd|dollar|dollars|бакс|баксов|доллар|доллара|долларов)\b|\$/i,
  UZS: /\b(uzs|som|so'm|soum|sum|сум|сома|сумов)\b/i,
  JPY: /\b(jpy|yen|yens|иена|иен|円)\b|¥/i,
  RUB: /\b(rub|ruble|rubles|рубль|рубля|рублей|руб)\b|₽/i,
};

@Injectable()
export class ChatService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any;

  constructor(
    private readonly usersService: UsersService,
    private readonly goalsService: GoalsService,
    private readonly configService: ConfigService,
    private readonly expensesService: ExpensesService,
    private readonly incomesService: IncomesService,
    private readonly insightsService: InsightsService,
    private readonly reportsService: ReportsService,
    private readonly categoriesService: CategoriesService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey && apiKey !== 'your-gemini-api-key-here') {
      // Check if API key looks valid (starts with AIza...)
      if (!apiKey.startsWith('AIza')) {
        console.error('❌ Invalid API key format. Gemini API keys start with "AIza..."');
        console.error('   Please check your GEMINI_API_KEY in .env file');
        return;
      }
      
      console.log(`🔑 API Key found: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
      
      this.genAI = new GoogleGenerativeAI(apiKey);
      
      // Use the latest available models (2025)
      // Try gemini-2.5-flash first (recommended for most use cases)
      try {
        this.model = this.genAI.getGenerativeModel({ 
          model: 'gemini-2.5-flash',
        });
        console.log('✅ Model initialized: gemini-2.5-flash');
      } catch (error) {
        try {
          // Fallback to gemini-2.5-pro
          this.model = this.genAI.getGenerativeModel({ 
            model: 'gemini-2.5-pro',
          });
          console.log('✅ Model initialized: gemini-2.5-pro');
        } catch (error2) {
          try {
            // Fallback to gemini-2.5-flash-lite
            this.model = this.genAI.getGenerativeModel({ 
              model: 'gemini-2.5-flash-lite',
            });
            console.log('✅ Model initialized: gemini-2.5-flash-lite');
          } catch (error3) {
            // Last resort: try gemini-2.0-flash-exp
            this.model = this.genAI.getGenerativeModel({ 
              model: 'gemini-2.0-flash-exp',
            });
            console.log('✅ Model initialized: gemini-2.0-flash-exp');
          }
        }
      }
    } else {
      console.warn('⚠️  GEMINI_API_KEY not found or not set. Using fallback parser only.');
    }
  }

  /**
   * Main chat handler with AI and tools
   */
  async handleChatMessage(userId: string, message: string, context: 'chat' | 'emotions' = 'chat', language: 'ru' | 'en' | 'ja' = 'en') {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Chat: try to parse goal creation first (works even when AI doesn't call add_goal)
    if (context === 'chat') {
      const goalResult = await this.tryGoalParser(userId, message.trim(), language, (user as any).currency || 'USD');
      if (goalResult) return goalResult;
    }

    // If Gemini is not configured, use context-aware fallbacks
    if (!this.genAI || !this.model) {
      // For emotions page: return analytical insights instead of simple parser
      if (context === 'emotions') {
        const insights = await this.insightsService.getInsights(userId, 'this_month', 'emotions', language);
        return {
          message: insights.insights,
          toolUsed: 'get_insights_fallback',
        };
      }
      // For normal chat: keep quick-add parser behavior
      return this.simpleParser(userId, message, language, (user as any).currency || 'USD');
    }

    // Get user expenses and incomes for context
    const [expenses, incomes] = await Promise.all([
      this.expensesService.getExpenses(userId),
      this.incomesService.getIncomes(userId),
    ]);

    // Define tools based on context
    // For emotions: only get_insights (read-only analysis)
    // For chat: all tools including add_expense, add_income, add_goal
    const baseTools = context === 'emotions' ? [] : [
      {
        name: 'add_expense',
        description: 'Add expense when user mentions spending. Patterns: "курица 100", "coffee 5", "bought X". Use automatically, no questions.',
        parameters: {
          type: 'OBJECT',
          properties: {
            description: {
              type: 'STRING',
              description: 'What was purchased or spent on',
            },
            amount: {
              type: 'NUMBER',
              description: 'Amount spent',
            },
            emotion: {
              type: 'STRING',
              enum: ['low', 'medium', 'high'],
              description: 'Emotional level: low (unhappy/regretful/sad), medium (neutral), high (happy/satisfied). If user mentions emotion like "happy/satisfied", "sad/regretful", or "neutral" in the message, use it. Default: medium',
            },
            currency: {
              type: 'STRING',
              enum: ['USD', 'UZS', 'JPY', 'RUB'],
              description: 'Currency of amount if explicitly mentioned (USD, UZS, JPY, RUB)',
            },
          },
          required: ['description', 'amount'],
        },
      },
      {
        name: 'add_income',
        description: 'Add income when user mentions receiving money. Patterns: "зарплата 5000", "salary 2000", "received 100". Use automatically.',
        parameters: {
          type: 'OBJECT',
          properties: {
            description: {
              type: 'STRING',
              description: 'Source of income (e.g., "Salary", "Freelance", "Bonus")',
            },
            amount: {
              type: 'NUMBER',
              description: 'Amount received',
            },
            currency: {
              type: 'STRING',
              enum: ['USD', 'UZS', 'JPY', 'RUB'],
              description: 'Currency of amount if explicitly mentioned (USD, UZS, JPY, RUB)',
            },
          },
          required: ['description', 'amount'],
        },
      },
      {
        name: 'add_goal',
        description: 'Create a savings goal. Call this when user says they want to save for something (e.g. "хочу накопить на MacBook 2000", "goal vacation 5000", "save for car 10000"). Required: name (short goal name), targetAmount (positive number).',
        parameters: {
          type: 'OBJECT',
          properties: {
            name: {
              type: 'STRING',
              description: 'Short name of the goal, e.g. "MacBook", "Vacation", "Car"',
            },
            targetAmount: {
              type: 'NUMBER',
              description: 'Target amount to save (positive number), e.g. 2000, 5000',
            },
            currency: {
              type: 'STRING',
              enum: ['USD', 'UZS', 'JPY', 'RUB'],
              description: 'Currency of target amount if explicitly mentioned',
            },
            autoAllocatePercent: {
              type: 'NUMBER',
              description: 'Optional: 0-100, only if user asks for automatic allocation',
            },
          },
          required: ['name', 'targetAmount'],
        },
      },
      {
        name: 'update_goal_progress',
        description: 'Add money to existing goal. Examples: "добавь 500 к MacBook", "save 200 for vacation". Check balance first - cannot exceed available.',
        parameters: {
          type: 'OBJECT',
          properties: {
            goalName: {
              type: 'STRING',
              description: 'Name of the goal to update (must match existing goal name)',
            },
            amount: {
              type: 'NUMBER',
              description: 'Amount to add to the goal. Must not exceed available balance and must be positive.',
            },
            currency: {
              type: 'STRING',
              enum: ['USD', 'UZS', 'JPY', 'RUB'],
              description: 'Currency of amount if explicitly mentioned',
            },
          },
          required: ['goalName', 'amount'],
        },
      },
    ];

    // get_insights: for emotions (only) or for chat (monthly expense analysis)
    const getInsightsTool = {
      name: 'get_insights',
      description: context === 'emotions'
        ? 'Get emotional spending data. Call IMMEDIATELY with dateRange="this_month", focus="emotions".'
        : 'Get spending/expense data for analysis. Call when user asks for monthly expense analysis, spending summary, tahlil, анализ расходов, oylik xarajatlar, or "how did I spend". Use dateRange (this_month, last_month, last_3_months, this_year, all_time) and focus (spending, categories, emotions).',
      parameters: {
        type: 'OBJECT',
        properties: {
          dateRange: {
            type: 'STRING',
            enum: ['this_month', 'last_month', 'last_3_months', 'this_year', 'all_time'],
            description: 'Time period for analysis',
          },
          focus: {
            type: 'STRING',
            enum: ['spending', 'categories', 'emotions', 'trends', 'savings'],
            description: context === 'emotions' ? 'Use "emotions".' : 'Use "spending" or "categories" for expense analysis.',
          },
        },
      },
    };

    const tools = {
      functionDeclarations: context === 'emotions'
        ? [getInsightsTool]
        : [...baseTools, getInsightsTool],
    };

    try {
      // Different prompts for chat vs emotions analysis
      let systemPrompt: string;
      
      if (context === 'emotions') {
        // Get user goals for personalized advice
        const goals = await this.goalsService.getUserGoals(userId);
        const goalsInfo = goals.length > 0 
          ? `\nUser's financial goals: ${goals.map(g => `"${g.name}" ($${g.targetAmount})`).join(', ')}`
          : '';
        
        const languageInstructions: Record<'ru' | 'en' | 'ja', string> = {
          ru: '🚨 КРИТИЧЕСКИ ВАЖНО - ЯЗЫК ОТВЕТА: Ты ДОЛЖЕН отвечать ТОЛЬКО на русском языке. ВСЕ слова, числа, категории, суммы, проценты - ВСЁ должно быть на русском языке. НИКОГДА не используй английский язык в ответе. Если ты ответишь на английском, это будет ошибкой. Отвечай на русском языке!',
          en: '🚨 CRITICAL - RESPONSE LANGUAGE: You MUST respond ONLY in English. ALL words, numbers, categories, amounts, percentages - EVERYTHING must be in English. NEVER use any other language in your response. If you respond in another language, it will be an error. Respond in English!',
          ja: '🚨 重要 - 応答言語：日本語でのみ応答してください。すべての単語、数字、カテゴリ、金額、パーセンテージは日本語で行ってください。回答で他の言語を使用しないでください。他の言語で応答するとエラーになります。日本語で応答してください！',
        };

        const taskInstructions: Record<'ru' | 'en' | 'ja', string> = {
          ru: `ТВОЯ ЗАДАЧА - ИНДИВИДУАЛЬНЫЙ АНАЛИЗ:
1. СРАЗУ вызови get_insights с dateRange="this_month", focus="emotions"
2. Проанализируй РЕАЛЬНЫЕ данные пользователя - найди уникальные паттерны
3. Дай КОНКРЕТНЫЕ индивидуальные рекомендации на основе его данных:
   - "Ты тратишь $X на [категория], что составляет Y% от твоих расходов. Если сократить на Z%, то..."
   - "За [период] ты сделал N транзакций с радостью vs M с сожалением. Это говорит о..."
   - "Для достижения цели '[название цели]' тебе нужно сэкономить $X. Если сократить [категория] на Y%, достигнешь за Z месяцев"
4. Будь живым, интересным, используй метафоры и сравнения
5. В конце дай психологический портрет: "Ты [тип] - [описание], поэтому таких как тебя называют '[термин]'"

СТИЛЬ: Живой, интересный, как будто ты настоящий психолог-аналитик. Без шаблонов!`,
          en: `YOUR TASK - PERSONALIZED ANALYSIS:
1. IMMEDIATELY call get_insights with dateRange="this_month", focus="emotions"
2. Analyze REAL user data - find unique patterns
3. Give SPECIFIC personalized recommendations:
   - "You spend $X on [category], which is Y% of your expenses. If you reduce by Z%, then..."
   - "Over [period] you made N happy transactions vs M regretful ones. This suggests..."
   - "To reach goal '[goal name]' you need to save $X. If you reduce [category] by Y%, you'll reach it in Z months"
4. Be lively, interesting, use metaphors and comparisons
5. End with psychological profile: "You are [type] - [description], which is why people like you are called '[term]'"

STYLE: Lively, interesting, like a real psychologist-analyst. No templates!`,
          ja: `タスク - 個別分析：
1. すぐにget_insightsをdateRange="this_month", focus="emotions"で呼び出し
2. 実際のデータを分析 - ユニークなパターンを見つける
3. 具体的な個別推奨事項を提供：
   - 「[カテゴリ]に$Xを費やし、これは支出のY%です。Z%削減すると...」
   - 「[期間]中にN件の喜びの取引とM件の後悔の取引。これは...を示唆」
   - 「目標'[目標名]'に到達するには$Xを節約する必要があります。[カテゴリ]をY%削減すると、Zヶ月で到達」
4. 生き生きと、興味深く、メタファーと比較を使用
5. 心理プロファイルで終了：「あなたは[タイプ] - [説明]、そのためあなたのような人は'[用語]'と呼ばれます」

スタイル: 生き生きと、興味深く、本物の心理学者-アナリストのように。テンプレートなし！`,
        };

        systemPrompt = `${languageInstructions[language]}

You are a brilliant financial psychologist. Analyze emotional spending patterns and provide personalized, individual insights.

User context: ${expenses.length} expenses, ${incomes.length} incomes.${goalsInfo}

${taskInstructions[language]}

Call get_insights IMMEDIATELY with dateRange="this_month", focus="emotions". Analyze REAL data and give personalized recommendations.`;
      } else {
        // Get user balance for context
        const balance = await this.goalsService.getUserBalance(userId);
        const goals = await this.goalsService.getUserGoals(userId);
        const totalInGoals = goals.reduce((sum, g) => sum + g.currentAmount, 0);
        
        const languageInstructions: Record<'ru' | 'en' | 'ja', string> = {
          ru: 'ОБЯЗАТЕЛЬНО отвечай ТОЛЬКО на русском языке. Все ответы должны быть на русском.',
          en: 'ALWAYS respond ONLY in English. All responses must be in English.',
          ja: '必ず日本語でのみ応答してください。すべての応答は日本語で行ってください。',
        };

        // Живой, естественный промпт для чата (включая add_goal)
        const examples = language === 'ru' 
          ? `"привет" → "Привет! Как дела? Чем помочь?"
"курица 100" → [add_expense] "Добавил курицу $100! 😊"
"зарплата 5000" → [add_income] "Отлично! Добавил зарплату $5000 💰"
"хочу накопить на MacBook 2000" / "цель отпуск 5000" → [add_goal] name + targetAmount`
          : language === 'ja'
          ? `"こんにちは" → "こんにちは！元気ですか？"
"チキン 100" → [add_expense] "チキン $100を追加しました！😊"
"給料 5000" → [add_income] "素晴らしい！給料 $5000を追加しました 💰"
"MacBookのために2000貯めたい" → [add_goal] name + targetAmount`
          : `"hello" → "Hi! How are you? What can I help with?"
"chicken 100" → [add_expense] "Added chicken $100! 😊"
"salary 5000" → [add_income] "Great! Added salary $5000 💰"
"save for MacBook 2000" / "goal vacation 5000" → [add_goal] call with name + targetAmount`;

        systemPrompt = `You are a friendly financial assistant. ${languageInstructions[language]} Balance: $${balance.toLocaleString()}, ${goals.length} goals.

${examples}

When the user wants to create a savings goal (e.g. "хочу накопить на X", "goal vacation 5000", "save for MacBook 2000"), call add_goal with name and targetAmount. When the user asks for monthly expense analysis, spending summary, tahlil, анализ расходов, oylik xarajatlar, or "how did I spend", call get_insights with dateRange (this_month, last_month, or as they said) and focus "spending" or "categories", then use the REAL data to give a clear analysis and recommendations. Be natural. For greetings or small talk, reply with a short greeting only. Only use add_expense/add_income when the user clearly states an amount. NEVER say "I can help you add expenses" or "Try: ..." — just chat like a friend.`;
      }

      // Try to use systemInstruction for better control (if supported)
      let chat;
      let result;
      let response;
      let functionCalls;
      
      try {
        chat = this.model.startChat({
          systemInstruction: systemPrompt,
          tools: [{ functionDeclarations: tools.functionDeclarations }],
        });
        // Send only user message if systemInstruction works
        result = await chat.sendMessage(message);
        response = result.response;
        functionCalls = response.functionCalls();
      } catch (systemError) {
        // Fallback: if systemInstruction doesn't work, use message-based prompt
        console.log('⚠️ systemInstruction not supported, using message-based prompt');
        chat = this.model.startChat({
          tools: [{ functionDeclarations: tools.functionDeclarations }],
        });
        // Send compact prompt + message (minimal tokens)
        const compactPrompt = language === 'ru' 
          ? 'Финансовый помощник. На приветствие (привет, как дела) — коротко поздоровайся, не предлагай добавить расходы. Функции вызывай только когда пользователь явно указывает сумму или просит добавить.'
          : language === 'ja'
          ? '財務アシスタント。挨拶には短く返事するだけ。支出・収入の追加は、ユーザーが金額や追加を明示したときだけ。'
          : 'Financial assistant. For greetings (hello, hi) reply with a short greeting only; do not suggest adding expenses. Use functions only when the user clearly states an amount or asks to add something.';
        result = await chat.sendMessage(`${compactPrompt}\n\n${message}`);
        response = result.response;
        functionCalls = response.functionCalls();
      }
      
      // If no function calls, return text response directly
      if (!functionCalls || functionCalls.length === 0) {
        return {
          message: response.text(),
        };
      }

      // Handle function calls
      if (functionCalls && functionCalls.length > 0) {
        const defaultCurrency: CurrencyCode = this.normalizeCurrency((user as any)?.currency);
        const detectedCurrency = this.detectCurrencyFromText(message) ?? defaultCurrency;
        const detectedEmotion = this.detectEmotionFromText(message);

        const functionResponses = await Promise.all(
          functionCalls.map(async (functionCall: any) => {
            if (functionCall.name === 'add_expense') {
              const args = functionCall.args;
              const currency = args?.currency ? this.normalizeCurrency(args.currency) : detectedCurrency;
              const amountUsd = this.convertToUsd(Number(args.amount), currency);
              const emotion: EmotionLevel = args.emotion || detectedEmotion || 'medium';
              const expense = await this.expensesService.addExpense(
                userId,
                args.description,
                amountUsd,
                emotion,
              );
              return {
                functionResponse: {
                  name: 'add_expense',
                  response: {
                    success: true,
                    expense: {
                      id: expense.id,
                      description: expense.description,
                      amount: expense.amount,
                      emotion: expense.emotion,
                    },
                    message: `Added expense: ${expense.description} - $${expense.amount}`,
                  },
                },
              };
            } else if (functionCall.name === 'add_income') {
              const args = functionCall.args;
              const currency = args?.currency ? this.normalizeCurrency(args.currency) : detectedCurrency;
              const amountUsd = this.convertToUsd(Number(args.amount), currency);
              const income = await this.incomesService.addIncome(
                userId,
                args.description,
                amountUsd,
                args.photo,
              );
              return {
                functionResponse: {
                  name: 'add_income',
                  response: {
                    success: true,
                    income: {
                      id: income.id,
                      description: income.description,
                      amount: income.amount,
                    },
                    message: `Added income: ${income.description} - $${income.amount}`,
                  },
                },
              };
            } else if (functionCall.name === 'add_goal') {
              const raw = functionCall.args;
              const args = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
              const name = (args.name ?? args.goalName ?? '').toString().trim();
              const rawTargetAmount = Number(args.targetAmount ?? args.target ?? args.amount ?? 0);
              const autoAllocate = Number(args.autoAllocatePercent ?? args.auto_allocate_percent ?? args.autoAllocate ?? 0) || 0;
              const currency = args?.currency ? this.normalizeCurrency(args.currency) : detectedCurrency;
              const targetAmount = this.convertToUsd(rawTargetAmount, currency);

              if (!name || targetAmount <= 0 || !Number.isFinite(targetAmount)) {
                return {
                  functionResponse: {
                    name: 'add_goal',
                    response: {
                      success: false,
                      message: 'Goal name and target amount (positive number) are required. Example: add_goal(name="Vacation", targetAmount=5000)',
                    },
                  },
                };
              }

              try {
                const balance = await this.goalsService.getUserBalance(userId);
                const goal = await this.addGoal(userId, name, targetAmount, autoAllocate);
                return {
                  functionResponse: {
                    name: 'add_goal',
                    response: {
                      success: true,
                      goal: {
                        id: goal.id,
                        name: goal.name,
                        targetAmount: goal.targetAmount,
                        currentAmount: goal.currentAmount,
                      },
                      balance,
                      message: `Created goal: ${goal.name} - Target: $${goal.targetAmount.toLocaleString()}. Available balance: $${balance.toLocaleString()}`,
                    },
                  },
                };
              } catch (e: any) {
                const msg = e?.message ?? String(e);
                return {
                  functionResponse: {
                    name: 'add_goal',
                    response: {
                      success: false,
                      message: msg,
                    },
                  },
                };
              }
            } else if (functionCall.name === 'update_goal_progress') {
              const args = functionCall.args;
              const currency = args?.currency ? this.normalizeCurrency(args.currency) : detectedCurrency;
              const amountToAdd = this.convertToUsd(Number(args.amount), currency);
              // Get user's goals to find the one by name
              const goals = await this.goalsService.getUserGoals(userId);
              const goal = goals.find(g => g.name.toLowerCase() === args.goalName.toLowerCase());
              
              if (!goal) {
                return {
                  functionResponse: {
                    name: 'update_goal_progress',
                    response: {
                      success: false,
                      message: `Goal "${args.goalName}" not found. Available goals: ${goals.map(g => g.name).join(', ')}`,
                    },
                  },
                };
              }
              
              // Check balance before updating
              const balance = await this.goalsService.getUserBalance(userId);
              if (amountToAdd > balance) {
                return {
                  functionResponse: {
                    name: 'update_goal_progress',
                    response: {
                      success: false,
                      message: `Недостаточно средств. Доступно: $${balance.toLocaleString()}, запрошено: $${amountToAdd.toLocaleString()}`,
                    },
                  },
                };
              }
              
              if (amountToAdd <= 0) {
                return {
                  functionResponse: {
                    name: 'update_goal_progress',
                    response: {
                      success: false,
                      message: 'Сумма должна быть больше 0',
                    },
                  },
                };
              }
              
              const newCurrentAmount = goal.currentAmount + amountToAdd;
              if (newCurrentAmount > goal.targetAmount) {
                return {
                  functionResponse: {
                    name: 'update_goal_progress',
                    response: {
                      success: false,
                      message: `Сумма не может превышать целевую сумму $${goal.targetAmount.toLocaleString()}`,
                    },
                  },
                };
              }
              
              const updatedGoal = await this.goalsService.updateGoal(goal.id, userId, {
                currentAmount: newCurrentAmount,
              });
              
              return {
                functionResponse: {
                  name: 'update_goal_progress',
                  response: {
                    success: true,
                    goal: {
                      id: updatedGoal.id,
                      name: updatedGoal.name,
                      currentAmount: updatedGoal.currentAmount,
                      targetAmount: updatedGoal.targetAmount,
                    },
                    message: `Added $${amountToAdd.toLocaleString()} to goal "${goal.name}". New progress: $${updatedGoal.currentAmount.toLocaleString()} / $${updatedGoal.targetAmount.toLocaleString()}`,
                  },
                },
              };
            } else if (functionCall.name === 'get_insights') {
              const args = functionCall.args || {};
              const dateRange = args.dateRange || 'this_month';
              const focus = context === 'emotions' ? 'emotions' : (args.focus || 'spending');
              const insights = await this.insightsService.getInsights(
                userId,
                dateRange,
                focus,
                language,
              );

              const formattedResponse = {
                success: true,
                data: {
                  period: insights.period,
                  totalIncome: insights.totalIncome,
                  totalExpenses: insights.totalExpenses,
                  totalSpent: insights.totalSpent,
                  balance: insights.balance,
                  topCategories: (insights.topCategories || []).map((cat: any) => ({
                    category: cat.name,
                    totalAmount: cat.amount,
                    transactionCount: cat.count,
                    happyAmount: cat.happy,
                    sadAmount: cat.sad,
                    neutralAmount: cat.neutral,
                    happyPercent: cat.happyPercent,
                    sadPercent: cat.sadPercent,
                  })),
                  emotionDistribution: insights.emotionDistribution ? {
                    happy: insights.emotionDistribution.high,
                    neutral: insights.emotionDistribution.medium,
                    sad: insights.emotionDistribution.low,
                    happyAmount: insights.emotionDistribution.highAmount,
                    neutralAmount: insights.emotionDistribution.mediumAmount,
                    sadAmount: insights.emotionDistribution.lowAmount,
                  } : {},
                  recentExpenses: insights.recentExpenses,
                  insights: insights.insights,
                },
                message: `Data for ${insights.period}. Total spent: $${(insights.totalSpent ?? 0).toLocaleString()}, income: $${(insights.totalIncome ?? 0).toLocaleString()}. Use this REAL data to give a clear analysis and recommendations.`,
              };
              return {
                functionResponse: {
                  name: 'get_insights',
                  response: formattedResponse,
                },
              };
            }
            return null;
          }),
        );

        // Send function results back to Gemini and get final response
        const validResponses = functionResponses
          .filter((r) => r !== null)
          .map((r) => r.functionResponse);
        
        // Extract response messages from function calls for fallback
        const functionMessages: string[] = [];
        validResponses.forEach((fr: any) => {
          if (fr.response?.message) {
            functionMessages.push(fr.response.message);
          } else if (fr.response?.insights) {
            functionMessages.push(fr.response.insights);
          } else if (typeof fr.response === 'string') {
            functionMessages.push(fr.response);
          }
        });
        
        // Send function responses back to the model
        // Format function responses as a readable string for Gemini
        try {
          // Format function responses as a readable message
          let functionResponseMessage = '';
          validResponses.forEach((fr: any) => {
            if (fr.name === 'get_insights' && fr.response) {
              // For get_insights, format the data in a readable way
              const data = fr.response.data || fr.response;
              functionResponseMessage += `\n\nFunction get_insights returned the following data:\n`;
              functionResponseMessage += `Period: ${data.period || 'N/A'}\n`;
              functionResponseMessage += `Total Expenses: ${data.totalExpenses || 0}\n`;
              functionResponseMessage += `Total Spent: $${(data.totalSpent || 0).toLocaleString()}\n`;
              
              if (data.topCategories && data.topCategories.length > 0) {
                functionResponseMessage += `\nTop Categories:\n`;
                data.topCategories.forEach((cat: any) => {
                  functionResponseMessage += `- ${cat.category || cat.name}: $${(cat.totalAmount || cat.amount || 0).toLocaleString()} (${cat.transactionCount || cat.count || 0} transactions)\n`;
                  functionResponseMessage += `  Happy: $${(cat.happyAmount || cat.happy || 0).toLocaleString()} (${cat.happyPercent || 0}%), `;
                  functionResponseMessage += `Sad: $${(cat.sadAmount || cat.sad || 0).toLocaleString()} (${cat.sadPercent || 0}%), `;
                  functionResponseMessage += `Neutral: $${(cat.neutralAmount || cat.neutral || 0).toLocaleString()}\n`;
                });
              }
              
              if (data.emotionDistribution) {
                const emo = data.emotionDistribution;
                functionResponseMessage += `\nEmotion Distribution:\n`;
                functionResponseMessage += `- Happy: ${emo.happy || 0} transactions, $${(emo.happyAmount || 0).toLocaleString()}\n`;
                functionResponseMessage += `- Neutral: ${emo.neutral || 0} transactions, $${(emo.neutralAmount || 0).toLocaleString()}\n`;
                functionResponseMessage += `- Sad: ${emo.sad || 0} transactions, $${(emo.sadAmount || 0).toLocaleString()}\n`;
              }
              
              if (data.recentExpenses && data.recentExpenses.length > 0) {
                functionResponseMessage += `\nRecent Expenses (first 5):\n`;
                data.recentExpenses.slice(0, 5).forEach((exp: any) => {
                  functionResponseMessage += `- ${exp.description}: $${exp.amount} (${exp.emotion || 'medium'}, ${exp.category || 'Other'})\n`;
                });
              }
            } else if (fr.response?.message) {
              functionResponseMessage += `\n${fr.response.message}\n`;
            } else if (typeof fr.response === 'string') {
              functionResponseMessage += `\n${fr.response}\n`;
            } else {
              // Fallback: stringify the response
              try {
                functionResponseMessage += `\n${JSON.stringify(fr.response, null, 2)}\n`;
              } catch (e) {
                functionResponseMessage += `\nFunction ${fr.name} executed successfully.\n`;
              }
            }
          });
          
          const languageReminder: Record<'ru' | 'en' | 'ja', string> = {
            ru: context === 'emotions' 
              ? '\n\nВАЖНО: 1) Отвечай ТОЛЬКО на русском языке! 2) Используй РЕАЛЬНЫЕ данные из get_insights для анализа! 3) В конце дай психологический портрет: "Ты [тип], ты любишь [действия], поэтому таких как тебя называют [термин]".'
              : '\n\nВАЖНО: Отвечай ТОЛЬКО на русском языке!',
            en: context === 'emotions'
              ? '\n\nIMPORTANT: 1) Respond ONLY in English! 2) Use REAL data from get_insights for analysis! 3) End with psychological profile: "You are [type], you love [actions], which is why people like you are called [term]".'
              : '\n\nIMPORTANT: Respond ONLY in English!',
            ja: context === 'emotions'
              ? '\n\n重要：1) 日本語でのみ応答してください！2) get_insightsからの実際のデータを使用して分析してください！3) 心理プロファイルで終了：「あなたは[タイプ]で、[行動]を愛するため、あなたのような人は[用語]と呼ばれます」。'
              : '\n\n重要：日本語でのみ応答してください！',
          };
          
          const messageToSend = functionResponseMessage + languageReminder[language];
          const finalResult = await chat.sendMessage(messageToSend);
          const finalText = finalResult.response.text();
          
          const fallbackMessages: Record<'ru' | 'en' | 'ja', string> = {
            ru: 'Я здесь, чтобы помочь с вашими финансами!',
            en: 'I\'m here to help with your finances!',
            ja: 'あなたの財務をサポートするためにここにいます！',
          };
          
          return {
            message: finalText || functionMessages.join('\n') || fallbackMessages[language],
            toolUsed: functionCalls[0]?.name || null,
          };
        } catch (sendError: any) {
          console.error('Error sending function responses:', sendError?.message || sendError);
          console.log('Function executed successfully, but API format mismatch. Using fallback response.');
          
          // If sending function responses fails, return meaningful messages from function results
          // This happens when the API format doesn't match - but functions still executed successfully
          const toolName = functionCalls[0]?.name || 'unknown';
          let friendlyMessage = '';
          
          // Generate friendly messages based on the function that was called
          if (toolName === 'add_expense') {
            const expenseInfo = validResponses.find((fr: any) => fr.name === 'add_expense');
            if (expenseInfo?.response?.expense) {
              const emoji = expenseInfo.response.expense.emotion === 'high' ? '😊' : 
                           expenseInfo.response.expense.emotion === 'low' ? '😔' : '😐';
              friendlyMessage = `${emoji} Добавил расход: ${expenseInfo.response.expense.description} - $${expenseInfo.response.expense.amount}`;
            } else {
              friendlyMessage = '✅ Расход успешно добавлен!';
            }
          } else if (toolName === 'add_income') {
            const incomeInfo = validResponses.find((fr: any) => fr.name === 'add_income');
            if (incomeInfo?.response?.income) {
              friendlyMessage = `💰 Отлично! Добавил доход: ${incomeInfo.response.income.description} - $${incomeInfo.response.income.amount}`;
            } else {
              friendlyMessage = '💰 Доход успешно добавлен!';
            }
          } else if (toolName === 'add_goal') {
            const goalInfo = validResponses.find((fr: any) => fr.name === 'add_goal');
            if (goalInfo?.response?.goal) {
              const balance = goalInfo.response.balance || 0;
              friendlyMessage = `🎯 Создал цель "${goalInfo.response.goal.name}" на $${goalInfo.response.goal.targetAmount.toLocaleString()}. Доступный баланс: $${balance.toLocaleString()}`;
            } else {
              friendlyMessage = '🎯 Цель успешно создана!';
            }
          } else if (toolName === 'update_goal_progress') {
            const progressInfo = validResponses.find((fr: any) => fr.name === 'update_goal_progress');
            if (progressInfo?.response?.success) {
              friendlyMessage = progressInfo.response.message || `✅ Прогресс обновлен!`;
            } else {
              friendlyMessage = progressInfo?.response?.message || '❌ Не удалось обновить прогресс';
            }
          } else if (toolName === 'get_insights') {
            // For insights, use the actual insights data from the response
            const insightsInfo = validResponses.find((fr: any) => fr.name === 'get_insights');
            if (insightsInfo?.response?.insights) {
              friendlyMessage = insightsInfo.response.insights;
            } else if (typeof insightsInfo?.response === 'string') {
              friendlyMessage = insightsInfo.response;
            } else if (functionMessages.length > 0) {
              friendlyMessage = functionMessages.join('\n\n');
            } else {
              const insightsMessages: Record<'ru' | 'en' | 'ja', string> = {
                ru: '📊 Инсайты успешно сгенерированы!',
                en: '📊 Insights successfully generated!',
                ja: '📊 インサイトが正常に生成されました！',
              };
              friendlyMessage = insightsMessages[language];
            }
          } else {
            const successMessages: Record<'ru' | 'en' | 'ja', string> = {
              ru: '✅ Операция выполнена успешно!',
              en: '✅ Operation completed successfully!',
              ja: '✅ 操作が正常に完了しました！',
            };
            friendlyMessage = functionMessages.length > 0 
              ? functionMessages.join('\n\n') 
              : successMessages[language];
          }
          
          return {
            message: friendlyMessage,
            toolUsed: toolName,
          };
        }
      }

      // No function was called, return direct response
      const text = response.text();
      const fallbackMessages: Record<'ru' | 'en' | 'ja', string> = {
        ru: 'Я здесь, чтобы помочь с вашими финансами!',
        en: 'I\'m here to help with your finances!',
        ja: 'あなたの財務をサポートするためにここにいます！',
      };
      return {
        message: text || fallbackMessages[language],
        toolUsed: null,
      };
    } catch (error: any) {
      console.error('Gemini API error:', error.message || error);
      if (error.status === 404) {
        console.warn('⚠️  Gemini API models not available. Using fallback parser.');
        console.warn('⚠️  To enable Gemini AI:');
        console.warn('   1. Go to https://makersuite.google.com/app/apikey');
        console.warn('   2. Create/enable API key');
        console.warn('   3. Enable "Generative Language API" in Google Cloud Console');
      }
      // Context-aware fallback when Gemini fails
      if (context === 'emotions') {
        const insights = await this.insightsService.getInsights(userId, 'this_month', 'emotions', language);
        return {
          message: insights.insights,
          toolUsed: 'get_insights_fallback',
        };
      }
      // For normal chat: fall back to quick-add parser
      return this.simpleParser(userId, message, language, (user as any).currency || 'USD');
    }
  }

  /**
   * Add goal (called by AI tool)
   */
  async addGoal(userId: string, name: string, targetAmount: number, autoAllocatePercent: number = 0) {
    try {
      const user = await this.usersService.findById(userId);
      if (!user) throw new Error('User not found');
      return await this.goalsService.createGoal(userId, { name: name.trim(), targetAmount: Math.abs(targetAmount), autoAllocatePercent: autoAllocatePercent ?? 0 });
    } catch (e: any) {
      throw new Error('Failed to add goal: ' + (e?.message ?? e));
    }
  }

  async getExpenses(userId: string) { return this.expensesService.getExpenses(userId); }
  async getIncomes(userId: string) { return this.incomesService.getIncomes(userId); }
  async getEmotions(userId: string, from?: string, to?: string) { return this.insightsService.getEmotions(userId, from, to); }
  async updateExpense(expenseId: string, userId: string, updates: { description?: string; note?: string; amount?: number; emotion?: 'low' | 'medium' | 'high'; category?: string; photo?: string }) { return this.expensesService.updateExpense(expenseId, userId, updates); }
  async updateIncome(incomeId: string, userId: string, description?: string, note?: string) { return this.incomesService.updateIncome(incomeId, userId, description, note); }
  async deleteExpense(expenseId: string, userId: string) { return this.expensesService.deleteExpense(expenseId, userId); }
  async deleteIncome(incomeId: string, userId: string) { return this.incomesService.deleteIncome(incomeId, userId); }
  async getCategories(userId: string) { return this.categoriesService.getCategories(userId); }
  async renameCategory(userId: string, oldCategory: string, newCategory: string) { return this.categoriesService.renameCategory(userId, oldCategory, newCategory); }
  async mergeCategories(userId: string, sourceCategory: string, targetCategory: string) { return this.categoriesService.mergeCategories(userId, sourceCategory, targetCategory); }
  async updateTransactionCategory(userId: string, transactionIds: string[], newCategory: string) { return this.categoriesService.updateTransactionCategory(userId, transactionIds, newCategory); }
  async generateReport(userId: string, format: 'pdf' | 'excel' | 'html' | 'all', dateRange: string, includeCharts: boolean, sendToEmail: boolean, language: 'ru' | 'en' | 'ja' = 'en') { return this.reportsService.generateReport(userId, format, dateRange, includeCharts, sendToEmail, language); }
  async addExpense(userId: string, description: string, amount: number, emotion?: EmotionLevel, photo?: string, category?: string, isRecurring?: boolean, recurrenceType?: 'once' | 'daily' | 'weekly' | 'monthly', recurrenceInterval?: number, recurrenceDaysCount?: number) { return this.expensesService.addExpense(userId, description, amount, emotion ?? 'medium', photo, category, isRecurring, recurrenceType, recurrenceInterval, recurrenceDaysCount); }
  async addIncome(userId: string, description: string, amount: number, photo?: string, isRecurring?: boolean, recurrenceType?: 'once' | 'daily' | 'weekly' | 'monthly', recurrenceInterval?: number, recurrenceDaysCount?: number) { return this.incomesService.addIncome(userId, description, amount, photo, isRecurring, recurrenceType, recurrenceInterval, recurrenceDaysCount); }

  private normalizeCurrency(raw?: string): CurrencyCode {
    const value = (raw || '').toUpperCase().trim();
    if (value === 'USD' || value === 'UZS' || value === 'JPY' || value === 'RUB') {
      return value;
    }
    return 'USD';
  }

  private detectCurrencyFromText(text: string): CurrencyCode | null {
    for (const [currency, regex] of Object.entries(CURRENCY_ALIASES) as [CurrencyCode, RegExp][]) {
      if (regex.test(text)) {
        return currency;
      }
    }
    return null;
  }

  private convertToUsd(amount: number, sourceCurrency: CurrencyCode): number {
    if (!Number.isFinite(amount)) return 0;
    const absAmount = Math.abs(amount);
    if (sourceCurrency === 'USD') return absAmount;
    const rate = CURRENCY_RATES_FROM_USD[sourceCurrency] || 1;
    return Math.round((absAmount / rate) * 100) / 100;
  }

  private detectEmotionFromText(text: string): EmotionLevel | null {
    const normalized = text.toLowerCase();
    if (/\b(happy|great|glad|excited|satisfied|joy|хорошо|счастлив|рад|доволен|嬉しい|満足)\b/i.test(normalized)) {
      return 'high';
    }
    if (/\b(sad|upset|bad|angry|regret|regretful|unhappy|грустно|плохо|жалею|расстроен|悲しい|後悔)\b/i.test(normalized)) {
      return 'low';
    }
    if (/\b(neutral|ok|okay|normal|обычно|нормально|普通)\b/i.test(normalized)) {
      return 'medium';
    }
    return null;
  }

  /**
   * Parse message for goal creation and create goal if pattern matches.
   * Runs before AI so goal creation works even when the model doesn't call add_goal.
   * Number can be anywhere: "goal vacation 5000", "goal 5000 vacation", "5000 goal vacation".
   */
  private async tryGoalParser(
    userId: string,
    message: string,
    language: 'ru' | 'en' | 'ja',
    userCurrency: CurrencyCode = 'USD',
  ): Promise<{ message: string; toolUsed: string } | null> {
    const trimmed = message.trim();
    if (!trimmed || trimmed.length < 3) return null;

    const goalKeywordRe = /\b(goal|цель|накопить|target|save\s+for|add\s+new\s+goal|create\s+new\s+goal|new\s+goal|add\s+goal|create\s+goal|добавь\s+цель|создай\s+цель)\b/i;
    if (!goalKeywordRe.test(trimmed)) return null;

    const numMatch = trimmed.match(/(\d+(?:[.,]\d+)?)/);
    if (!numMatch) return null;
    const amountRaw = numMatch[1].replace(',', '.');
    const parsedAmount = Math.round(parseFloat(amountRaw) * 100) / 100;
    const detectedCurrency = this.detectCurrencyFromText(trimmed) ?? this.normalizeCurrency(userCurrency);
    const amount = this.convertToUsd(parsedAmount, detectedCurrency);
    if (!Number.isFinite(amount) || amount <= 0) return null;

    const triggerPhrases = [
      'add new goal', 'create new goal', 'new goal', 'add goal', 'create goal',
      'goal', 'цель', 'target', 'save for', 'saving for',
      'накопить на', 'накопить', 'хочу накопить на',
      'добавь цель', 'создай цель', 'добавить цель', 'новая цель',
    ];
    let namePart = trimmed
      .replace(new RegExp(numMatch[0].replace(/[.,]/g, '[.,]'), 'gi'), ' ')
      .replace(/\s+/g, ' ')
      .trim();
    for (const phrase of triggerPhrases) {
      const re = new RegExp(phrase.replace(/\s+/g, '\\s+'), 'gi');
      namePart = namePart.replace(re, ' ').trim();
    }
    namePart = namePart.replace(/\s+/g, ' ').trim();
    const name = namePart.replace(/^\s*for\s+|\s+for\s*$/gi, '').trim();

    if (!name || name.length < 2) return null;
    if (/^\d[\d\s.,]*$/.test(name)) return null;

    try {
      const goal = await this.addGoal(userId, name, amount, 0);
      const msg =
        language === 'ru'
          ? `Цель создана: ${goal.name} — цель $${goal.targetAmount.toLocaleString()}. Удачи!`
          : language === 'ja'
            ? `目標を作成しました: ${goal.name} — $${goal.targetAmount.toLocaleString()}。頑張って！`
            : `Goal created: ${goal.name} — target $${goal.targetAmount.toLocaleString()}. Good luck!`;
      return { message: msg, toolUsed: 'add_goal' };
    } catch {
      return null;
    }
  }

  /**
   * Fallback simple parser (if AI is not available)
   * Recognizes patterns like "курица 100", "курица-100", "зарплата 500", "зарплата-500"
   * For casual messages (no amount): returns a short greeting, no action suggestions.
   */
  private async simpleParser(
    userId: string,
    message: string,
    language: 'ru' | 'en' | 'ja' = 'en',
    userCurrency: CurrencyCode = 'USD',
  ) {
    const msg = message.trim().toLowerCase();
    
    // Check for income keywords (зарплата, salary, income, etc.)
    const incomeKeywords = ['зарплата', 'salary', 'income', 'earned', 'received', 'получил', 'получено'];
    const isIncome = incomeKeywords.some(keyword => msg.includes(keyword));
    
    // Extract amount (supports spaces and dashes: "курица 100" or "курица-100")
    const amountMatch = message.match(/(-?\d+([.,]\d+)?)/);
    const parsedAmount = amountMatch 
      ? Math.round(parseFloat(amountMatch[1].replace(',', '.')) * 100) / 100
      : 0;
    const detectedCurrency = this.detectCurrencyFromText(message) ?? this.normalizeCurrency(userCurrency);
    const amount = this.convertToUsd(parsedAmount, detectedCurrency);
    const detectedEmotion = this.detectEmotionFromText(message);
    
    // Extract description (everything except the amount)
    let description = message.replace(/(-?\d+([.,]\d+)?)/g, '').trim();
    if (description.includes('-')) {
      description = description.replace(/-/g, ' ').trim();
    }
    description = description || (isIncome ? 'Income' : 'Expense');

    if (isIncome && amount > 0) {
      const income = await this.incomesService.addIncome(userId, description, amount, undefined);
      return {
        message: `Added income: ${income.description} - $${income.amount}`,
        toolUsed: 'add_income',
      };
    } else if (amount > 0) {
      const expense = await this.expensesService.addExpense(userId, description, amount, detectedEmotion || 'medium');
      return {
        message: `Added expense: ${expense.description} - $${expense.amount}`,
        toolUsed: 'add_expense',
      };
    }

    // No amount = casual message: respond with a short greeting, do not suggest actions
    const casualReplies: Record<string, string> = {
      ru: 'Привет! Как дела? Чем могу помочь?',
      en: 'Hi! How are you? What can I help with?',
      ja: 'こんにちは！元気ですか？何かお手伝いしましょうか？',
    };
    return {
      message: casualReplies[language] ?? casualReplies.en,
      toolUsed: null,
    };
  }
}