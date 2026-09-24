export const modules = [{"id": "basics", "title": "认识语言模型", "subtitle": "从输入与输出开始", "number": "01"}, {"id": "prompting", "title": "把任务说清楚", "subtitle": "理解指令、示例与输出", "number": "02"}, {"id": "data", "title": "理解资料与训练", "subtitle": "分清查资料和训练模型", "number": "03"}, {"id": "actions", "title": "从回答到行动", "subtitle": "工具、工作流与 Agent", "number": "04"}, {"id": "quality", "title": "检查 AI 的回答", "subtitle": "理解评测与表现指标", "number": "05"}, {"id": "support", "title": "认识运行支撑", "subtitle": "方法、环境与执行记录", "number": "06"}];
export const lessons = [
  {
    "id": "model",
    "title": "大语言模型",
    "english": "Large language model · LLM",
    "module": "basics",
    "summary": "大语言模型能够根据输入生成文本，用于问答、摘要、改写等任务。",
    "mechanism": [
      "模型经过训练，能够处理自然语言；使用时，我们提供输入，它生成相应输出。",
      "文本生成与实时搜索是不同能力。联网查找最新信息需要搜索工具等额外环节，不能仅凭一段回答认定它查过网页。"
    ],
    "steps": [
      "提供输入",
      "模型处理",
      "生成输出"
    ],
    "confusion": {
      "wrong": "模型回答了一个问题，就说明它刚刚上网查过。",
      "right": "生成回答不等于执行搜索。以 OpenAI API 为例，网络搜索是需要配置并调用的工具能力。"
    },
    "sources": [
      {
        "publisher": "OpenAI",
        "title": "Key concepts",
        "section": "Text generation models",
        "url": "https://developers.openai.com/api/docs/concepts#text-generation-models",
        "checked": "2026-09-23",
        "scope": "文本生成模型的输入、输出与常见任务；中文转述。"
      },
      {
        "publisher": "OpenAI",
        "title": "Web search",
        "section": "Web search / Choose an integration",
        "url": "https://developers.openai.com/api/docs/guides/tools-web-search",
        "checked": "2026-09-23",
        "scope": "OpenAI API 中通过搜索工具获取网络信息的机制；中文转述。"
      }
    ],
    "quiz": {
      "question": "一段模型回答出现了“最新消息”，这能证明什么？",
      "options": [
        "它一定访问了网页",
        "仅凭这句话，无法确定它是否搜索过",
        "它一定调用了另一个模型"
      ],
      "answer": 1,
      "explanation": "回答的措辞不能证明搜索行为。文本生成与搜索是不同环节，需要查看是否实际使用了搜索工具及其结果。"
    },
    "review": {
      "question": "应用只把一段文章交给文本模型，要求生成三句摘要。这里主要使用了哪种能力？",
      "options": [
        "根据输入生成文本",
        "实时网页搜索",
        "自动查询外部数据库"
      ],
      "answer": 0,
      "explanation": "摘要是根据已提供内容生成文本的任务。这个过程本身不要求访问网页或数据库。"
    },
    "example": {
      "title": "把买家评论缩成一句话",
      "scenario": "原创模拟：亚马逊店铺收到评论“杯子保温不错，但杯盖有点难拧”。助手将它概括为“保温获认可，杯盖体验有待改善”。",
      "question": "这个例子展示了什么？",
      "options": [
        "助手已经查询了全店销量",
        "助手已经修改了商品信息",
        "模型根据评论生成了摘要"
      ],
      "answer": 2,
      "explanation": "输入是一条评论，输出是一句摘要。这展示的是文本生成能力，没有展示查询销量或修改商品的操作。"
    }
  },
  {
    "id": "prompt",
    "title": "提示词",
    "english": "Prompt",
    "module": "basics",
    "summary": "Prompt 是提供给模型的输入，可以包含任务指令、相关资料和示例。",
    "mechanism": [
      "指令说明要做什么，资料提供本次任务所需的信息，示例展示期望的回答方式。",
      "把各部分分清楚有助于模型理解要求。改进 Prompt 能影响输出，但不能保证每次结果完全一致。"
    ],
    "steps": [
      "说明任务",
      "提供资料",
      "明确输出要求",
      "观察回答"
    ],
    "confusion": {
      "wrong": "Prompt 就是必须背下来的神奇咒语。",
      "right": "Prompt 是输入内容。重点是把任务、相关信息与要求表达清楚，而不是寻找某句万能话术。"
    },
    "sources": [
      {
        "publisher": "OpenAI",
        "title": "Key concepts",
        "section": "Text generation models",
        "url": "https://developers.openai.com/api/docs/concepts#text-generation-models",
        "checked": "2026-09-23",
        "scope": "文本模型中 Prompt 的基本含义；中文转述。"
      },
      {
        "publisher": "OpenAI",
        "title": "Prompt engineering",
        "section": "Prompt engineering / Message formatting with Markdown and XML",
        "url": "https://developers.openai.com/api/docs/guides/prompt-engineering",
        "checked": "2026-09-23",
        "scope": "OpenAI 文本模型的指令、示例和上下文组织；中文转述。"
      }
    ],
    "quiz": {
      "question": "在“将下面的文字总结成一句话。资料：……”中，哪部分是任务指令？",
      "options": [
        "资料里的全部原文",
        "模型尚未生成的回答",
        "将下面的文字总结成一句话"
      ],
      "answer": 2,
      "explanation": "任务指令说明模型要做什么。资料是被处理的内容；模型回答则是之后产生的输出。"
    },
    "review": {
      "question": "你在 Prompt 中增加一组“输入 → 理想输出”的例子，主要是在做什么？",
      "options": [
        "自动扩大模型的上下文窗口",
        "展示期望的回答模式",
        "保证所有回答都正确"
      ],
      "answer": 1,
      "explanation": "示例帮助模型理解希望采用的处理和表达方式，但不会自动改变容量，也不保证正确率。"
    },
    "example": {
      "title": "找出评论里的具体问题",
      "scenario": "原创模拟：店铺输入“请指出下面评论提到的商品问题，只写一句话。评论：杯盖有点难拧，保温不错。”",
      "question": "“只写一句话”在这段 Prompt 中起什么作用？",
      "options": [
        "规定输出形式",
        "提供买家的原始反馈",
        "改变商品的真实质量"
      ],
      "answer": 0,
      "explanation": "它约束回答的表达形式；评论才是本次任务需要处理的资料。"
    }
  },
  {
    "id": "token",
    "title": "文本片段",
    "english": "Token",
    "module": "basics",
    "summary": "Token 是模型处理文本时使用的片段单位，并不总是一个完整的字或单词。",
    "mechanism": [
      "进入模型的文本会被切成 Token；一个词可能对应一个片段，也可能被拆成多个片段。",
      "上下文容量常用 Token 衡量。不能直接把字数或单词数当作精确的 Token 数。"
    ],
    "steps": [
      "输入文本",
      "切分片段",
      "模型处理",
      "生成文本"
    ],
    "confusion": {
      "wrong": "100 个单词一定就是 100 个 Token。",
      "right": "单词与 Token 不是一一对应的。准确数量需要使用对应模型的分词或计数工具。"
    },
    "sources": [
      {
        "publisher": "OpenAI",
        "title": "Key concepts",
        "section": "Tokens",
        "url": "https://developers.openai.com/api/docs/concepts#tokens",
        "checked": "2026-09-23",
        "scope": "文本模型的 Token 与上下文长度；不把英文粗略换算当作中文公式。中文转述。"
      }
    ],
    "quiz": {
      "question": "关于 Token，哪句话正确？",
      "options": [
        "一个单词可能被分成多个 Token",
        "一个 Token 永远等于一个汉字",
        "Token 是一次聊天的次数"
      ],
      "answer": 0,
      "explanation": "Token 是文本片段单位；切分边界不必与完整单词或单个汉字一致。"
    },
    "review": {
      "question": "两段文字字数相同，能否直接判断它们的 Token 数相同？",
      "options": [
        "能，字数就是 Token 数",
        "能，只要放在同一段对话里",
        "不能，需要按模型的切分方式计数"
      ],
      "answer": 2,
      "explanation": "Token 取决于文本怎样被切分。相同字数不足以推断相同的 Token 数。"
    },
    "example": {
      "title": "一批评论有多长",
      "scenario": "原创模拟：店铺准备把一批中英文混合评论交给助手。文档显示有 800 个字符，但还没有进行 Token 计数。",
      "question": "这时对输入长度的哪种判断准确？",
      "options": [
        "肯定是 800 个 Token",
        "还不能知道精确的 Token 数",
        "只要是评论，就不占 Token"
      ],
      "answer": 1,
      "explanation": "字符数不是精确的 Token 数。要知道模型实际处理的片段数量，需要使用相应的计数方式。"
    }
  },
  {
    "id": "context",
    "title": "上下文与窗口",
    "english": "Context & context window",
    "module": "basics",
    "summary": "上下文是本次回答可参考的内容；上下文窗口是容纳这些内容与生成输出的容量范围。",
    "mechanism": [
      "以 Claude 请求为例，指令、传入的历史消息、资料和工具结果都会占用上下文，生成的输出也计入窗口。",
      "上下文不是模型训练时见过的全部资料。窗口更大意味着可容纳更多内容，不代表信息越多回答一定越好。"
    ],
    "steps": [
      "准备相关内容",
      "放入当前上下文",
      "模型参考内容",
      "生成回答"
    ],
    "confusion": {
      "wrong": "上下文窗口就是模型学过的全部知识。",
      "right": "训练资料与本次可参考的内容是两回事。窗口描述本次生成能容纳的内容范围，有容量上限。"
    },
    "sources": [
      {
        "publisher": "Anthropic",
        "title": "Context windows",
        "section": "How the context window works",
        "url": "https://platform.claude.com/docs/en/build-with-claude/context-windows#how-the-context-window-works",
        "checked": "2026-09-23",
        "scope": "Claude API 的上下文说明；不同模型的具体容量与历史内容保留机制不同。中文转述。"
      }
    ],
    "quiz": {
      "question": "哪项最准确地描述上下文窗口？",
      "options": [
        "模型训练时见过的所有网页",
        "当前请求内容与生成输出可占用的容量范围",
        "账户里保存过的全部对话"
      ],
      "answer": 1,
      "explanation": "上下文窗口与当前生成过程有关，不等于训练资料库，也不等于账户中保存的全部内容。"
    },
    "review": {
      "question": "一个模型能容纳更长的输入，就一定应该把所有无关资料也塞进去吗？",
      "options": [
        "不应该，容量更大不代表加入更多信息就更准确",
        "应该，任何额外内容都能提高准确率",
        "应该，无关资料不占上下文"
      ],
      "answer": 0,
      "explanation": "更大的窗口提供容量；相关性和信息组织仍然重要，无关内容也会占用空间。"
    },
    "example": {
      "title": "助手本次看到了什么",
      "scenario": "原创模拟：店铺本次把“杯身需手洗”的说明和买家问题一起发给助手。一份旧版说明只保存在电脑上，没有被传入，也没有通过工具读取。",
      "question": "哪份说明明确属于本次提供给模型的上下文？",
      "options": [
        "电脑里所有说明文件",
        "所有历史版本说明",
        "这次发入的“杯身需手洗”说明"
      ],
      "answer": 2,
      "explanation": "本次实际提供的说明属于上下文。文件仅保存在电脑上，并不意味着模型本次能够读取它。"
    }
  },
  {
    "id": "model-call",
    "title": "模型调用",
    "english": "Model request / API call",
    "module": "basics",
    "summary": "模型调用是应用通过接口发送输入与设置，并接收模型响应的过程。",
    "mechanism": [
      "以 OpenAI 的一次文本请求为例，应用指定模型并发送输入，服务返回生成结果。",
      "Prompt 是请求中的内容；调用是发送和接收的过程。返回结果可以包含文本，也可能包含工具调用等其他项目。"
    ],
    "steps": [
      "准备输入",
      "发送请求",
      "服务生成响应",
      "应用展示结果"
    ],
    "confusion": {
      "wrong": "写好一段 Prompt，就等于已经调用了模型。",
      "right": "Prompt 是准备好的输入内容。应用实际发送请求，才进入模型调用过程。"
    },
    "sources": [
      {
        "publisher": "OpenAI",
        "title": "Text generation",
        "section": "Generate text from a simple prompt / output",
        "url": "https://developers.openai.com/api/docs/guides/text",
        "checked": "2026-09-23",
        "scope": "OpenAI Responses API 的一次请求与响应；流程为面向新手的简化表达。中文转述。"
      }
    ],
    "quiz": {
      "question": "你在记事本里写了一段给模型的指令，但还没有发送。此时发生了什么？",
      "options": [
        "服务已经返回了模型响应",
        "模型已经读取了记事本",
        "你准备了 Prompt，还没有发起模型调用"
      ],
      "answer": 2,
      "explanation": "准备输入与发送请求是两个步骤。没有发送，也没有其他读取动作时，不能认定模型已收到内容。"
    },
    "review": {
      "question": "一次请求里有“模型名称”和“要总结的文章”。两者分别是什么？",
      "options": [
        "两者都是模型已经生成的答案",
        "前者指定使用的模型，后者属于输入内容",
        "前者是输出，后者是联网搜索结果"
      ],
      "answer": 1,
      "explanation": "模型名称说明请求交给哪个模型处理；待总结的文章是提供给模型处理的输入。"
    },
    "example": {
      "title": "点下“总结评论”之后",
      "scenario": "原创模拟：店铺点击“总结评论”，应用将三条评论和摘要要求发给模型服务，收到一句摘要，再显示在页面上。",
      "question": "哪一步是把输入交给模型服务？",
      "options": [
        "应用发送包含评论和要求的请求",
        "页面把返回的摘要显示出来",
        "用户在页面上看完摘要"
      ],
      "answer": 0,
      "explanation": "发送请求把输入交给服务；显示和阅读结果发生在收到响应之后。"
    }
  },
  {
    "id": "instructions",
    "title": "清晰的指令",
    "english": "Instructions",
    "module": "prompting",
    "summary": "指令告诉模型要完成什么任务，以及输出应遵循哪些要求。",
    "mechanism": [
      "将任务、要求和待处理资料分开表达，便于模型辨认它们的作用。",
      "标题或标签可以组织输入；仅靠措辞不能保证结果正确。"
    ],
    "steps": [
      "任务",
      "规则",
      "资料",
      "输出要求"
    ],
    "confusion": {
      "wrong": "写得越长，指令就一定越清楚。",
      "right": "清晰来自明确的任务和结构，长度本身不保证效果。"
    },
    "sources": [
      {
        "publisher": "OpenAI",
        "title": "Prompt engineering",
        "section": "Message formatting with Markdown and XML",
        "url": "https://developers.openai.com/api/docs/guides/prompt-engineering",
        "scope": "OpenAI 文本模型的输入组织；中文转述。",
        "checked": "2026-09-23"
      }
    ],
    "quiz": {
      "question": "哪种写法更明确地区分了任务和资料？",
      "options": [
        "把要求夹在资料中间且不做区分",
        "只写“做好一点”",
        "分为“任务：总结”和“资料：原文”"
      ],
      "answer": 2,
      "explanation": "标题帮助区分指令与被处理的内容。"
    },
    "review": {
      "question": "“如果资料没有答案，就说明资料不足”属于什么？",
      "options": [
        "待处理的原文",
        "约束回答行为的指令",
        "已生成的结论"
      ],
      "answer": 1,
      "explanation": "这条指令说明面对信息不足时应怎样回答。"
    },
    "example": {
      "title": "说明里没有写的事",
      "scenario": "原创模拟：亚马逊店铺助手收到“只依据商品说明回答；资料未写时说明无法确定”。",
      "question": "这段输入主要提供了什么？",
      "options": [
        "回答规则",
        "商品尺寸",
        "模型训练数据"
      ],
      "answer": 0,
      "explanation": "它给出了回答规则，没有提供尺寸等商品事实。"
    }
  },
  {
    "id": "few-shot",
    "title": "用示例说明要求",
    "english": "Few-shot prompting",
    "module": "prompting",
    "summary": "在 Prompt 中放入少量输入与理想输出的示例，帮助模型识别期望的模式。",
    "mechanism": [
      "示例展示怎么处理输入；新问题仍需要模型生成答案。",
      "示例放入本次输入，不等于微调模型。"
    ],
    "steps": [
      "给出示例输入",
      "展示理想输出",
      "提供新输入"
    ],
    "confusion": {
      "wrong": "在 Prompt 中放两个例子，就是训练了一个新模型。",
      "right": "这里改变的是输入，未进行微调训练。"
    },
    "sources": [
      {
        "publisher": "OpenAI",
        "title": "Prompt engineering",
        "section": "Few-shot learning",
        "url": "https://developers.openai.com/api/docs/guides/prompt-engineering#few-shot-learning",
        "scope": "少样本提示；中文转述，不保证新样本正确。",
        "checked": "2026-09-23"
      }
    ],
    "quiz": {
      "question": "示例“输入：太棒了 → 输出：积极”主要展示什么？",
      "options": [
        "模型参数",
        "输入到输出的模式",
        "数据库权限"
      ],
      "answer": 1,
      "explanation": "示例在演示期望的处理方式。"
    },
    "review": {
      "question": "更换 Prompt 里的示例，会直接更新模型参数吗？",
      "options": [
        "会，每个示例都是一次微调",
        "会，仅在示例较短时",
        "不会，仅更改本次输入"
      ],
      "answer": 2,
      "explanation": "提供示例与训练模型是两种不同操作。"
    },
    "example": {
      "title": "理解评论分类",
      "scenario": "原创模拟：店铺给出“很满意 → 积极”“杯盖损坏 → 消极”两个示例，再提供一条新评论。",
      "question": "两个示例有什么作用？",
      "options": [
        "自动读取所有评论",
        "保证所有分类都对",
        "演示期望的分类方式"
      ],
      "answer": 2,
      "explanation": "示例帮助理解分类方式；新评论的分类仍需检查。"
    }
  },
  {
    "id": "structured-output",
    "title": "结构化输出",
    "english": "Structured Outputs",
    "module": "prompting",
    "summary": "结构化输出让模型按指定的格式规则返回数据，便于程序读取。",
    "mechanism": [
      "以 OpenAI Structured Outputs 为例，可以指定字段及类型等 JSON Schema 规则。",
      "符合格式不等于内容真实；拒绝、输出中断等情况也需要单独处理。"
    ],
    "steps": [
      "规定字段",
      "生成数据",
      "解析与检查"
    ],
    "confusion": {
      "wrong": "格式正确，就说明里面的事实都正确。",
      "right": "结构与事实是两个维度，仍要检查字段中的内容。"
    },
    "sources": [
      {
        "publisher": "OpenAI",
        "title": "Structured model outputs",
        "section": "Introduction / Handling mistakes / Refusals",
        "url": "https://developers.openai.com/api/docs/guides/structured-outputs",
        "scope": "OpenAI Structured Outputs 功能；中文转述，不泛化为所有模型默认能力。",
        "checked": "2026-09-23"
      }
    ],
    "quiz": {
      "question": "输出符合预定格式，能直接推断什么？",
      "options": [
        "事实一定真实",
        "无需检查任何内容",
        "可以按预定字段读取；事实仍需核对"
      ],
      "answer": 2,
      "explanation": "结构约束不等于事实保证。"
    },
    "review": {
      "question": "“标题为字符串，标签为数组”描述的是什么？",
      "options": [
        "输出的结构要求",
        "模型的全部训练资料",
        "检索到的事实"
      ],
      "answer": 0,
      "explanation": "字段和类型规定了数据组织形式。"
    },
    "example": {
      "title": "让评论摘要有固定字段",
      "scenario": "原创模拟：亚马逊店铺希望每条评论摘要返回“优点”和“问题”两个字段。",
      "question": "为什么要规定这些字段？",
      "options": [
        "让程序更容易读取和展示结果",
        "让评论内容自动变为真实",
        "让模型自动获得店铺权限"
      ],
      "answer": 0,
      "explanation": "固定字段便于读取；真实性和操作权限是其他问题。"
    }
  },
  {
    "id": "retrieval",
    "title": "检索：先找到相关资料",
    "english": "Retrieval",
    "module": "data",
    "summary": "根据问题，从资料中找出相关内容。",
    "mechanism": [
      "语义检索比较含义是否接近，不只检查有没有相同关键词。",
      "检索得到的是候选资料；把资料组织成回答，是后续生成环节的工作。"
    ],
    "steps": [
      "提出问题",
      "搜索资料",
      "返回片段"
    ],
    "confusion": {
      "wrong": "用词不同，就一定检索不到。",
      "right": "语义相近的内容，即使用词不同也可能被找到。"
    },
    "sources": [
      {
        "publisher": "OpenAI",
        "title": "Retrieval",
        "section": "Retrieval / Semantic search",
        "url": "https://developers.openai.com/api/docs/guides/retrieval",
        "checked": "2026-09-23",
        "scope": "中文转述；以文档中的语义检索说明检索概念。"
      }
    ],
    "quiz": {
      "question": "语义检索主要比较什么？",
      "options": [
        "句子的字数",
        "内容含义的相关程度",
        "文字的颜色"
      ],
      "answer": 1,
      "explanation": "关键是含义相关，不要求字面完全一致。"
    },
    "review": {
      "question": "系统找到了三段有关清洗方式的原文。这一步属于？",
      "options": [
        "训练",
        "最终回答生成",
        "检索"
      ],
      "answer": 2,
      "explanation": "找到候选资料，属于检索阶段。"
    },
    "example": {
      "title": "找到杯子的清洗说明",
      "scenario": "课程原创／模拟数据：亚马逊店铺收到问题“能用洗碗机洗吗？”资料写着“建议手洗”。",
      "question": "即使用词不同，这段资料仍可能被检索到，因为？",
      "options": [
        "它与清洗方式有关",
        "它一定是最长的段落",
        "它已经成为模型的新训练数据"
      ],
      "answer": 0,
      "explanation": "这个例子展示了语义相关的检索，不代表已经生成答案。"
    }
  },
  {
    "id": "embedding",
    "title": "Embedding：把文字表示成数字",
    "english": "Vector embedding",
    "module": "data",
    "summary": "用一组数字表示文本，帮助计算文本之间的相关程度。",
    "mechanism": [
      "文本经过 embedding 模型，得到一个向量，也就是一组数字。",
      "比较向量可以帮助查找或分组相关文本；它本身不是一段文字回答。"
    ],
    "steps": [
      "输入文本",
      "转为向量",
      "比较相关性"
    ],
    "confusion": {
      "wrong": "Embedding 就是 AI 写出的摘要。",
      "right": "它是数字表示，可以供检索等步骤使用。"
    },
    "sources": [
      {
        "publisher": "OpenAI",
        "title": "Vector embeddings",
        "section": "What are embeddings?",
        "url": "https://developers.openai.com/api/docs/guides/embeddings",
        "checked": "2026-09-23",
        "scope": "中文转述；本课只讲文本 embedding，不介绍具体型号或价格。"
      }
    ],
    "quiz": {
      "question": "文本 embedding 的输出是什么？",
      "options": [
        "一组数字",
        "一份人工审核报告",
        "一句保证正确的答案"
      ],
      "answer": 0,
      "explanation": "向量是一组数字，可用来比较文本相关性。"
    },
    "review": {
      "question": "哪一步使用了 embedding 的典型能力？",
      "options": [
        "改变网页背景",
        "按含义相近程度给文本分组",
        "确认所有内容都真实"
      ],
      "answer": 1,
      "explanation": "文本分组可以利用数字表示之间的相关程度。"
    },
    "example": {
      "title": "把相近的评论放在一起",
      "scenario": "课程原创／模拟数据：亚马逊店铺有三条评论：“会漏水”“杯盖密封不好”“颜色很好看”。",
      "question": "用 embedding 辅助分组时，哪两条更可能接近？",
      "options": [
        "第二条和第三条",
        "三条必须完全相同",
        "第一条和第二条"
      ],
      "answer": 2,
      "explanation": "前两条都涉及密封问题；这里是含义相似的示意。"
    }
  },
  {
    "id": "rag",
    "title": "RAG：查完资料再回答",
    "english": "Retrieval-augmented generation",
    "module": "data",
    "summary": "先检索相关资料，把资料加入输入，再让模型生成回答。",
    "mechanism": [
      "问题先触发检索，相关片段随后进入模型的上下文。",
      "需要分别检查有没有找到合适资料，以及回答是否正确使用了资料。"
    ],
    "steps": [
      "提问",
      "检索",
      "补充上下文",
      "生成回答"
    ],
    "confusion": {
      "wrong": "用了 RAG，答案就一定正确。",
      "right": "检索和生成两个环节都可能出错。"
    },
    "sources": [
      {
        "publisher": "OpenAI",
        "title": "Optimizing LLM Accuracy",
        "section": "Retrieval-augmented generation (RAG)",
        "url": "https://developers.openai.com/api/docs/guides/optimizing-llm-accuracy",
        "checked": "2026-09-23",
        "scope": "中文转述；仅引用 RAG 的机制和错误来源。"
      }
    ],
    "quiz": {
      "question": "RAG 中，检索资料发生在哪一步之前？",
      "options": [
        "用户提问之前才行",
        "生成本次答案之前",
        "训练基础模型之前"
      ],
      "answer": 1,
      "explanation": "检索内容用来补充这次生成的输入。"
    },
    "review": {
      "question": "找对了原文，但回答却与原文矛盾，应检查哪个环节？",
      "options": [
        "生成是否正确使用资料",
        "页面字体",
        "问题是否包含英文"
      ],
      "answer": 0,
      "explanation": "资料正确并不意味着生成也正确。"
    },
    "example": {
      "title": "商品说明里的依据",
      "scenario": "课程原创／模拟数据：亚马逊店铺资料写着“杯身仅限手洗，不可放入洗碗机”。助手检索到它，却答“可以用洗碗机”。",
      "question": "这次错误发生在哪里？",
      "options": [
        "检索没有找到任何资料",
        "用户没有提供预算",
        "生成的回答没有遵循资料"
      ],
      "answer": 2,
      "explanation": "相关资料已经找到，但答案与它不一致。"
    }
  },
  {
    "id": "pretraining",
    "title": "预训练：模型已有的基础",
    "english": "Pre-training",
    "module": "data",
    "summary": "模型在处理你的请求之前，已经经过面向广泛主题与任务的训练。",
    "mechanism": [
      "这里先区分已有基础与本次输入：基础模型已经接受过训练。",
      "你提供的问题、说明或资料，是本次使用它时的输入，不能据此称为重新预训练。"
    ],
    "steps": [
      "预训练",
      "已有模型",
      "接收输入",
      "生成输出"
    ],
    "confusion": {
      "wrong": "每发送一次问题，模型就从头预训练。",
      "right": "本次调用是在使用已有模型。"
    },
    "sources": [
      {
        "publisher": "OpenAI",
        "title": "Model optimization",
        "section": "Write effective prompts / Fine-tune a model",
        "url": "https://developers.openai.com/api/docs/guides/model-optimization",
        "checked": "2026-09-23",
        "scope": "中文转述；仅用于区分已有模型与本次输入。文档中的平台流程属于历史资料。"
      }
    ],
    "quiz": {
      "question": "输入一个问题并获取答案，最准确的理解是？",
      "options": [
        "从零训练模型",
        "自动完成微调",
        "使用已经训练的模型"
      ],
      "answer": 2,
      "explanation": "调用时使用已有模型，不是每次从头训练。"
    },
    "review": {
      "question": "把一段新资料附在问题后面，能说明什么？",
      "options": [
        "为这次回答提供了上下文",
        "必然更新了基础模型",
        "完成了一次预训练"
      ],
      "answer": 0,
      "explanation": "资料进入本次输入，不能据此认定发生了训练。"
    },
    "example": {
      "title": "今天的新商品资料",
      "scenario": "课程原创／模拟数据：亚马逊店铺今天上架一个杯子，把尺寸说明粘贴给 AI，请它概括。",
      "question": "这段尺寸说明在此次请求中的作用是？",
      "options": [
        "自动训练出新模型",
        "提供当前任务的资料",
        "改变所有用户使用的模型"
      ],
      "answer": 1,
      "explanation": "这是向已有模型提供本次概括所需的内容。"
    }
  },
  {
    "id": "finetuning",
    "title": "微调：进一步训练已有模型",
    "english": "Fine-tuning · SFT",
    "module": "data",
    "summary": "监督微调用输入与理想输出的示例，进一步训练已有模型。",
    "mechanism": [
      "监督微调是微调的一种：用示例帮助模型更稳定地形成特定输出方式。",
      "训练后还要评测；本课理解概念，不要求实际训练模型。"
    ],
    "steps": [
      "已有模型",
      "训练示例",
      "进一步训练",
      "评测"
    ],
    "confusion": {
      "wrong": "让模型看一眼文件，就是微调。",
      "right": "微调包含训练过程，不能与单次提供资料混为一谈。"
    },
    "sources": [
      {
        "publisher": "OpenAI",
        "title": "Supervised fine-tuning",
        "section": "Supervised fine-tuning / Overview",
        "url": "https://developers.openai.com/api/docs/guides/supervised-fine-tuning",
        "checked": "2026-09-23",
        "scope": "中文转述；本课讲监督微调这一种方法。仅作概念参考，不提供历史平台操作教程。"
      }
    ],
    "quiz": {
      "question": "监督微调通常使用什么作为训练示例？",
      "options": [
        "输入与理想输出",
        "网页配色",
        "只有模型名字"
      ],
      "answer": 0,
      "explanation": "这些示例展示期望模型怎样响应。"
    },
    "review": {
      "question": "哪种描述明确包含微调？",
      "options": [
        "复制资料到一次对话中",
        "用任务示例继续训练已有模型",
        "打开一篇文档"
      ],
      "answer": 1,
      "explanation": "关键区别是继续训练。"
    },
    "example": {
      "title": "学会固定的评论分类格式",
      "scenario": "课程原创／模拟数据：亚马逊店铺整理评论与正确类别的示例，用它们进一步训练已有模型。",
      "question": "这一过程在概念上属于？",
      "options": [
        "只检索商品说明",
        "只保存文件",
        "监督微调"
      ],
      "answer": 2,
      "explanation": "示例含输入及期望输出，并实际进入训练过程。"
    }
  },
  {
    "id": "tools",
    "title": "工具与工具调用",
    "english": "Tools & Tool Calling",
    "module": "actions",
    "summary": "工具连接外部数据或操作；工具调用是模型提出请求，执行结果再交回模型。",
    "mechanism": [
      "应用先说明工具能做什么、需要哪些输入。模型根据任务生成工具名称和参数，请求使用它。",
      "应用或服务执行操作，再把结果交回模型。模型随后回答或继续调用；生成调用请求本身不代表操作已完成。"
    ],
    "steps": [
      "提供工具",
      "提出调用",
      "执行操作",
      "返回结果"
    ],
    "confusion": {
      "wrong": "模型说“已经查到”，就等于它执行过查询工具。",
      "right": "自然语言陈述和工具执行是两回事；要看实际调用及其返回结果。"
    },
    "sources": [
      {
        "publisher": "OpenAI",
        "title": "Function calling",
        "section": "How it works / The tool calling flow",
        "url": "https://developers.openai.com/api/docs/guides/function-calling",
        "checked": "2026-09-23",
        "scope": "中文转述工具、调用请求与调用结果的区别，以及应用执行函数工具的过程。"
      },
      {
        "publisher": "Anthropic",
        "title": "How tool use works",
        "section": "The tool-use contract / Where tools run",
        "url": "https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works",
        "checked": "2026-09-23",
        "scope": "补充执行责任：工具由应用或服务运行，模型输出调用请求。"
      }
    ],
    "quiz": {
      "question": "模型生成了“查询库存”的工具名称和参数，但应用还没执行。此时发生了什么？",
      "options": [
        "库存查询已经完成",
        "模型提出了工具调用请求",
        "模型已经获得库存结果"
      ],
      "answer": 1,
      "explanation": "工具调用请求是中间步骤，查询尚未执行，也尚未返回数据。"
    },
    "review": {
      "question": "工具已经查询到结果，但没有把结果交回模型。下面哪一步仍然缺失？",
      "options": [
        "让模型重新训练查询结果",
        "把工具名称改成自然语言",
        "将执行结果提供给模型继续处理"
      ],
      "answer": 2,
      "explanation": "工具返回的数据需要进入后续模型输入，模型才能据此处理本次任务。"
    },
    "example": {
      "title": "模拟：查询保温杯数量",
      "scenario": "亚马逊店铺助手收到“表格里蓝色保温杯有多少个？”它调用读取表格的工具，工具返回“蓝色：24”。",
      "question": "这里的“蓝色：24”属于什么？",
      "options": [
        "工具调用结果",
        "工具的功能说明",
        "模型的调用请求"
      ],
      "answer": 0,
      "explanation": "这是读取表格后返回的数据。案例为课程原创模拟，不代表真实店铺库存。"
    }
  },
  {
    "id": "workflow",
    "title": "工作流：组织任务步骤",
    "english": "Workflow",
    "module": "actions",
    "summary": "在本课文档语境中，工作流把执行单元、工具和控制规则组织成任务过程。",
    "mechanism": [
      "OpenAI 的历史 Agent Builder 文档将工作流描述为 Agent、工具和控制逻辑的组合。本课只借它理解概念。",
      "步骤之间可以顺序连接，也能根据条件分支或循环。工作流中可以使用模型，因此它与 Agent 不是互斥的两类产品。"
    ],
    "steps": [
      "接收输入",
      "执行步骤",
      "条件判断",
      "输出结果"
    ],
    "confusion": {
      "wrong": "只要流程里调用了模型，它就不再是工作流。",
      "right": "工作流可以包含模型或 Agent；关键是如何组织各步骤及其控制关系。"
    },
    "sources": [
      {
        "publisher": "OpenAI",
        "title": "Agent Builder",
        "section": "Agents and workflows",
        "url": "https://developers.openai.com/api/docs/guides/agent-builder",
        "checked": "2026-09-23",
        "scope": "历史概念参考。该产品已进入弃用流程；只解释本文语境的 Workflow，不推荐学习或使用该产品。"
      },
      {
        "publisher": "OpenAI",
        "title": "Node reference",
        "section": "Logic nodes / If/else / While",
        "url": "https://developers.openai.com/api/docs/guides/node-reference",
        "checked": "2026-09-23",
        "scope": "历史概念参考；支持条件分支与循环的解释，不将工作流等同于只有固定直线步骤。"
      }
    ],
    "quiz": {
      "question": "一个过程先让模型分类，再按分类结果进入不同步骤。按本课文档语境，它能是工作流吗？",
      "options": [
        "能，工作流可以组合模型和条件规则",
        "不能，工作流不能使用模型",
        "不能，工作流不能有分支"
      ],
      "answer": 0,
      "explanation": "模型分类和预设的条件分支可以共同组成工作流。"
    },
    "review": {
      "question": "流程规定“校验未通过则返回修改，通过则输出”。这主要体现了工作流的哪种能力？",
      "options": [
        "修改模型训练参数",
        "按条件控制下一步",
        "让所有步骤同时完成"
      ],
      "answer": 1,
      "explanation": "校验结果决定返回还是继续，这是控制流程的条件规则。"
    },
    "example": {
      "title": "模拟：整理商品资料",
      "scenario": "店铺资料整理依次执行“读取表格→检查是否有商品名→有则生成摘要、没有则返回缺失提示”。",
      "question": "哪一部分是在控制流程的分支？",
      "options": [
        "读取表格",
        "生成摘要",
        "根据是否有商品名选择下一步"
      ],
      "answer": 2,
      "explanation": "“是否有商品名”决定两条路径；其他选项是路径中的操作。"
    }
  },
  {
    "id": "agent",
    "title": "Agent：执行单元",
    "english": "Agent",
    "module": "actions",
    "summary": "按 OpenAI 文档语境，Agent 将模型、任务指令和可选工具组织成执行单元。",
    "mechanism": [
      "这里采用 OpenAI Agents SDK 的语境：Agent 包含模型和指令，也可配置工具等能力；它不等于模型本身。",
      "运行时先调用模型，再检查输出。遇到工具请求就执行并继续；得到最终回答时结束，也可能按运行条件暂停。"
    ],
    "steps": [
      "接收任务",
      "调用模型",
      "处理工具",
      "继续或结束"
    ],
    "confusion": {
      "wrong": "只要叫 Agent，就能脱离工具和运行环境独立完成所有操作。",
      "right": "Agent 的能力依赖配置和运行支持；模型提出的操作仍要由工具实际执行。"
    },
    "sources": [
      {
        "publisher": "OpenAI",
        "title": "Agent definitions",
        "section": "What belongs on an agent",
        "url": "https://developers.openai.com/api/docs/guides/agents/define-agents",
        "checked": "2026-09-23",
        "scope": "按 Agents SDK 文档解释 Agent 配置，不宣称这是所有行业产品统一采用的定义。"
      },
      {
        "publisher": "OpenAI",
        "title": "Running agents",
        "section": "The agent loop",
        "url": "https://developers.openai.com/api/docs/guides/agents/running-agents",
        "checked": "2026-09-23",
        "scope": "中文转述模型、工具与运行循环的关系，不包含编码或产品配置教学。"
      }
    ],
    "quiz": {
      "question": "按本课引用的 OpenAI 文档，Agent 与模型的关系是什么？",
      "options": [
        "Agent 是模型训练数据的总称",
        "Agent 是模型生成的一段固定文本",
        "Agent 将模型、指令和可选工具等能力组织起来"
      ],
      "answer": 2,
      "explanation": "模型是组成部分；指令、可调用能力和运行行为共同构成文档中的 Agent。"
    },
    "review": {
      "question": "一次运行中，模型先请求读文件，拿到结果后又请求计算。为什么这仍可能是同一次 Agent 运行？",
      "options": [
        "运行循环可以处理多次模型与工具交互",
        "每次工具调用都会重新训练模型",
        "一个 Agent 只能使用一种工具"
      ],
      "answer": 0,
      "explanation": "运行循环可在工具返回后继续调用模型，直到结束或遇到需要处理的暂停条件。"
    },
    "example": {
      "title": "模拟：从表格到回答",
      "scenario": "店铺助手要统计模拟评论数量。它先请求读取评论文件，再根据返回内容请求计数，最后给出数字。",
      "question": "谁把两次模型输出中的工具请求交给工具执行，并继续推进？",
      "options": [
        "模型输出的文字本身",
        "Agent 的运行循环",
        "新一轮模型预训练"
      ],
      "answer": 1,
      "explanation": "模型决定本轮输出，运行循环处理工具请求并继续，工具负责具体操作。"
    }
  },
  {
    "id": "graph",
    "title": "图结构：节点、连线与状态",
    "english": "Graph",
    "module": "actions",
    "summary": "用节点表示步骤、用连线表示流向，并保存执行所需的状态。",
    "mechanism": [
      "这里借 OpenAI 的历史节点文档理解图式表达：节点代表操作或判断，连线连接步骤并传递需要的数据。",
      "状态保存后续步骤要使用的信息。图上有分支，不代表一定由模型临时决定；分支也可以来自预设条件。"
    ],
    "steps": [
      "节点",
      "连线",
      "状态",
      "分支"
    ],
    "confusion": {
      "wrong": "流程图越复杂，或分支越多，就说明 AI 越智能。",
      "right": "图描述过程结构；是否使用模型、由谁决定分支，需要看节点和规则。"
    },
    "sources": [
      {
        "publisher": "OpenAI",
        "title": "Agent Builder",
        "section": "Compose with nodes",
        "url": "https://developers.openai.com/api/docs/guides/agent-builder",
        "checked": "2026-09-23",
        "scope": "历史概念参考：借节点和有类型的连接解释工作流图，不将 Graph 作为新模型或智能等级。"
      },
      {
        "publisher": "OpenAI",
        "title": "Node reference",
        "section": "Core nodes / Logic nodes / Data nodes / Set state",
        "url": "https://developers.openai.com/api/docs/guides/node-reference",
        "checked": "2026-09-23",
        "scope": "中文转述节点、条件控制与共享状态；不是已弃用产品的操作教程。"
      }
    ],
    "quiz": {
      "question": "图中 A 步生成分类结果，再传给 B 步使用。连接 A 与 B 的线主要表达什么？",
      "options": [
        "模型内部神经元的权重",
        "步骤之间的流向与数据传递关系",
        "每个步骤需要的训练样本量"
      ],
      "answer": 1,
      "explanation": "连线说明步骤怎样衔接，后一步接收前一步约定的数据。"
    },
    "review": {
      "question": "图中写明“字段为空走左边，否则走右边”。仅凭这条规则，能判断什么？",
      "options": [
        "这一定是模型自主规划",
        "这一定调用了两个模型",
        "这是预设条件控制的分支"
      ],
      "answer": 2,
      "explanation": "空或非空是已经写定的判断条件。存在分支本身不能证明模型在自主选择路径。"
    },
    "example": {
      "title": "模拟：保存已读取的信息",
      "scenario": "店铺助手先读取商品编号“CUP-01”，后面的评论查询步骤仍要用这个编号。流程把它保存为后续可访问的变量。",
      "question": "被保存的商品编号在这张执行图中属于什么？",
      "options": [
        "后续可使用的状态",
        "一个新的语言模型",
        "一次模型训练"
      ],
      "answer": 0,
      "explanation": "状态保存执行过程中需要沿用的信息；这里保存的是商品编号。"
    }
  },
  {
    "id": "evals",
    "title": "评测：有标准地检查表现",
    "english": "Evals",
    "module": "quality",
    "summary": "用明确的测试和标准，检查模型在指定任务上的表现。",
    "mechanism": [
      "先明确检查什么，再用测试输入产生输出，按标准检查结果。",
      "一次满意的回答不足以代表整体表现；分数还需要结合具体错误和人工判断理解。"
    ],
    "steps": [
      "明确标准",
      "运行测试",
      "检查输出",
      "查看错误"
    ],
    "confusion": {
      "wrong": "看起来回答得不错，就等于完成评测。",
      "right": "评测需要结构化测试，不能只凭印象。"
    },
    "sources": [
      {
        "publisher": "OpenAI",
        "title": "Evaluation best practices",
        "section": "What are evals? / How to read evals",
        "url": "https://developers.openai.com/api/docs/guides/evaluation-best-practices",
        "checked": "2026-09-23",
        "scope": "中文转述；仅讲评测原则，不介绍已进入历史资料范围的平台操作。"
      }
    ],
    "quiz": {
      "question": "哪种方式更符合评测？",
      "options": [
        "看到一次成功就停止",
        "用一组题按明确标准检查",
        "只看回答是否很长"
      ],
      "answer": 1,
      "explanation": "评测要明确、可检查，不能用单次印象代替。"
    },
    "review": {
      "question": "为什么除了总分，还要看答错的具体题目？",
      "options": [
        "总分必然是假的",
        "错误越多越好",
        "帮助理解模型在哪些情况下失败"
      ],
      "answer": 2,
      "explanation": "不同错误背后可能有不同原因。"
    },
    "example": {
      "title": "评论分类有没有分对",
      "scenario": "课程原创／模拟数据：亚马逊店铺用同一批评论测试助手，并逐条核对“漏水、外观、其他”类别。",
      "question": "这里在做什么？",
      "options": [
        "按标准评测分类结果",
        "训练新模型",
        "制定广告预算"
      ],
      "answer": 0,
      "explanation": "这在检查输出表现，没有描述训练过程。"
    }
  },
  {
    "id": "eval-set",
    "title": "评测集：用于检查的一组题",
    "english": "Evaluation dataset",
    "module": "quality",
    "summary": "评测集保存测试输入，以及检查结果所需的参考信息。",
    "mechanism": [
      "以分类为例，一条测试数据可包含原文和人工确认的正确类别。",
      "把模型输出与参考信息比较，才能判断该条测试是否满足标准。"
    ],
    "steps": [
      "测试输入",
      "参考信息",
      "模型输出",
      "对照检查"
    ],
    "confusion": {
      "wrong": "模型刚生成的答案，天然就是标准答案。",
      "right": "待检查输出和参考信息扮演不同角色。"
    },
    "sources": [
      {
        "publisher": "OpenAI",
        "title": "Working with evals",
        "section": "Explanation: data_source_config parameter / Explanation: testing_criteria parameter",
        "url": "https://developers.openai.com/api/docs/guides/evals",
        "checked": "2026-09-23",
        "scope": "中文转述；以文档中的分类测试解释数据结构，平台操作仅属历史资料。"
      }
    ],
    "quiz": {
      "question": "分类评测中，人工确认的正确类别用于什么？",
      "options": [
        "作为比较模型输出的参考",
        "替模型生成所有答案",
        "修改网页布局"
      ],
      "answer": 0,
      "explanation": "它是参考标签，用来检查模型分得是否正确。"
    },
    "review": {
      "question": "“测试输入”和“模型输出”有什么区别？",
      "options": [
        "两者永远相同",
        "前者交给模型，后者由模型产生",
        "前者必须是图片"
      ],
      "answer": 1,
      "explanation": "评测检查模型对指定输入的响应。"
    },
    "example": {
      "title": "一条评论测试数据",
      "scenario": "课程原创／模拟数据：亚马逊店铺的测试题是“杯盖会漏水”；人工参考类别是“密封问题”，模型输出“外观问题”。",
      "question": "哪个是此次待检查的模型输出？",
      "options": [
        "杯盖会漏水",
        "密封问题",
        "外观问题"
      ],
      "answer": 2,
      "explanation": "它与参考类别不一致，暴露了一次分类错误。"
    }
  },
  {
    "id": "latency-cost",
    "title": "延迟与成本：等多久，用多少",
    "english": "Latency & cost",
    "module": "quality",
    "summary": "延迟描述等待时间，成本描述资源费用；它们与回答质量是不同维度。",
    "mechanism": [
      "模型生成输出需要时间；输出长度和请求次数等因素会影响等待。",
      "Token 用量与调用方式也会影响费用。更快或更便宜，不能单独证明答案更准确。"
    ],
    "steps": [
      "发送请求",
      "处理输入",
      "生成输出",
      "记录用量"
    ],
    "confusion": {
      "wrong": "回答越慢，就一定越准确。",
      "right": "等待时间与准确性需要分别观察。"
    },
    "sources": [
      {
        "publisher": "OpenAI",
        "title": "Latency optimization",
        "section": "Generate fewer tokens / Make fewer requests",
        "url": "https://developers.openai.com/api/docs/guides/latency-optimization",
        "checked": "2026-09-23",
        "scope": "中文转述；说明影响等待时间的因素，不承诺固定提速比例。"
      },
      {
        "publisher": "OpenAI",
        "title": "Cost optimization",
        "section": "Cost and latency",
        "url": "https://developers.openai.com/api/docs/guides/cost-optimization",
        "checked": "2026-09-23",
        "scope": "中文转述；只讲成本因素，不提供实时价格。"
      }
    ],
    "quiz": {
      "question": "同一任务回答更快，能直接说明什么？",
      "options": [
        "答案一定更准确",
        "等待时间更短",
        "模型一定更新"
      ],
      "answer": 1,
      "explanation": "速度描述等待，正确性仍需检查内容。"
    },
    "review": {
      "question": "哪些因素通常会影响模型使用成本？",
      "options": [
        "输入输出用量和调用方式",
        "按钮圆角",
        "页面标题是否英文"
      ],
      "answer": 0,
      "explanation": "费用与实际用量及所用服务有关。"
    },
    "example": {
      "title": "短摘要和长摘要",
      "scenario": "课程原创／模拟数据：亚马逊店铺用同一模型概括同一批评论，一次要求三句话，另一次要求长篇说明。",
      "question": "关于两次等待时间，哪种理解更合理？",
      "options": [
        "长篇一定完全正确",
        "两次必定一样快",
        "输出长度可能影响等待时间"
      ],
      "answer": 2,
      "explanation": "生成更多文字通常需要更多处理；具体表现要实际观察。"
    }
  },
  {
    "id": "harness",
    "title": "Harness：运行支撑",
    "english": "Agent Harness",
    "module": "support",
    "summary": "Harness：模型之外，支撑 Agent 持续运行的配套能力。",
    "mechanism": [
      "这是依据 Anthropic Managed Agents 职责作的中文归纳，不是统一标准定义：它承担调用循环、工具执行和运行环境等支持。",
      "还可管理上下文、会话历史和执行事件。模型生成输出，这些配套让输出能够接上实际操作与后续运行。"
    ],
    "steps": [
      "启动会话",
      "推进循环",
      "运行工具",
      "保留记录"
    ],
    "confusion": {
      "wrong": "换一个更强的模型，就自动补齐了会话保存和工具执行。",
      "right": "模型能力与运行配套是不同层面；文档中的 Harness 提供模型之外的运行支持。"
    },
    "sources": [
      {
        "publisher": "Anthropic",
        "title": "Claude Managed Agents overview",
        "section": "Overview / Core concepts / How it works",
        "url": "https://platform.claude.com/docs/en/managed-agents/overview",
        "checked": "2026-09-23",
        "scope": "根据该产品承担的职责归纳 Harness，限于该文档语境，不宣称所有 Harness 都具备完全相同的能力。"
      },
      {
        "publisher": "Anthropic",
        "title": "Get started with Claude Managed Agents",
        "section": "What's happening",
        "url": "https://platform.claude.com/docs/en/managed-agents/quickstart",
        "checked": "2026-09-23",
        "scope": "支持运行环境、Agent 循环、工具执行与事件返回的职责解释；不教授搭建环境。"
      }
    ],
    "quiz": {
      "question": "下列哪项属于本课所说的 Harness 运行支持？",
      "options": [
        "调整模型训练参数",
        "定义商品评论的分类标签",
        "推进模型与工具之间的循环"
      ],
      "answer": 2,
      "explanation": "Harness 的讨论对象是运行配套；推进调用循环是引用文档列出的职责之一。"
    },
    "review": {
      "question": "模型已经输出读取文件的请求，但系统没有任何组件负责实际执行。缺少的是哪一层？",
      "options": [
        "工具执行等运行支持",
        "用于训练模型的标签数量",
        "描述模型任务的角色名称"
      ],
      "answer": 0,
      "explanation": "知道要做什么和让操作实际发生是不同环节；需要执行工具的运行组件。"
    },
    "example": {
      "title": "模拟：继续整理评论",
      "scenario": "店铺助手正在整理模拟评论。界面能显示已完成的读取步骤，并在下一次交互中沿用保存的会话记录。",
      "question": "这里“保存记录供后续运行使用”主要体现哪类能力？",
      "options": [
        "训练参数更新",
        "会话与状态的运行支持",
        "模型永久学会全部评论"
      ],
      "answer": 1,
      "explanation": "会话记录属于运行配套；保存它不等于把评论训练进模型。"
    }
  },
  {
    "id": "skills",
    "title": "Skills：可复用的方法包",
    "english": "Agent Skills",
    "module": "support",
    "summary": "按 Anthropic 文档，Skill 打包指令、描述及可选资料或脚本，供相关任务复用。",
    "mechanism": [
      "Skill 可以把任务方法和配套资源放在一起，减少每次对话重复说明。它是可加载的资源，不是一次模型训练。",
      "Claude 先看到名称与描述；任务匹配时再读取具体指令，需要时读取其他资料或运行脚本。内容按需加载。"
    ],
    "steps": [
      "查看描述",
      "匹配任务",
      "加载指令",
      "按需用资源"
    ],
    "confusion": {
      "wrong": "安装 Skill 后，它的全部文件会立刻进入每次对话。",
      "right": "文档描述的是分层加载：先名称与描述，再按任务读取指令和所需资源。"
    },
    "sources": [
      {
        "publisher": "Anthropic",
        "title": "Agent Skills",
        "section": "Why use Skills / How Skills work / The Skills architecture",
        "url": "https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview",
        "checked": "2026-09-23",
        "scope": "中文转述 Anthropic Agent Skills 的资源组织与分层加载；案例为原创模拟，不保证不同产品具有相同加载行为。"
      },
      {
        "publisher": "Anthropic",
        "title": "Using Agent Skills with the API",
        "section": "Overview / Prerequisites",
        "url": "https://platform.claude.com/docs/en/build-with-claude/skills-guide",
        "checked": "2026-09-23",
        "scope": "支持 Skill 与代码执行环境的关系；本课只作概念说明，不教授 API 配置。"
      }
    ],
    "quiz": {
      "question": "按本课文档，Skill 最准确的描述是什么？",
      "options": [
        "可复用的指令与配套资源包",
        "每次任务都重新训练出的模型",
        "工具执行成功后的单次返回值"
      ],
      "answer": 0,
      "explanation": "Skill 保存可复用的方法与资源；训练模型、执行工具和返回结果是另外的概念。"
    },
    "review": {
      "question": "某个 Skill 有多份资料，但本次任务只需要其中一份。文档描述的按需加载意味着什么？",
      "options": [
        "先把所有资料放入本次上下文",
        "读取本次需要的资料，其他资料可留在文件中",
        "必须先重新训练所有资料"
      ],
      "answer": 1,
      "explanation": "按需读取避免无关内容占用当前上下文；并不要求每次读完全部文件。"
    },
    "example": {
      "title": "模拟：复用评论整理方法",
      "scenario": "店铺每次整理评论都使用相同分类说明和输出模板。现在把说明、模板以及可选检查脚本放进一个 Skill。",
      "question": "其中的分类说明和模板主要解决什么问题？",
      "options": [
        "自动获得真实店铺全部权限",
        "直接改变基础模型的训练参数",
        "让相关任务复用同一套方法与材料"
      ],
      "answer": 2,
      "explanation": "这个模拟 Skill 沉淀方法；能否读取店铺数据或执行操作，还取决于可用工具与环境。"
    }
  },
  {
    "id": "run-history",
    "title": "运行记录与恢复",
    "english": "Events & session state",
    "module": "support",
    "summary": "运行记录保存执行中的消息与结果，帮助查看发生了什么、从已有会话继续。",
    "mechanism": [
      "以 Claude Managed Agents 为例，服务保存事件历史，并提供读取历史与会话管理能力。",
      "看到“准备调用”不等于操作成功，需要结合工具返回和后续状态判断。"
    ],
    "steps": [
      "接收任务",
      "记录事件",
      "查看结果",
      "继续会话"
    ],
    "confusion": {
      "wrong": "只看到一句“准备查询”，就能认定查询成功。",
      "right": "意图与结果不同，运行记录需要区分请求和实际返回。"
    },
    "sources": [
      {
        "publisher": "Anthropic",
        "title": "Claude Managed Agents overview",
        "section": "Send events and stream responses / Steer or interrupt",
        "url": "https://platform.claude.com/docs/en/managed-agents/overview",
        "scope": "Claude Managed Agents 产品中的事件与会话机制；中文转述。",
        "checked": "2026-09-23"
      }
    ],
    "quiz": {
      "question": "哪条记录更直接表明某次查询收到了结果？",
      "options": [
        "“准备查询”",
        "工具返回的查询结果",
        "“稍等一下”"
      ],
      "answer": 1,
      "explanation": "结果事件提供了执行结果；准备和等待只是过程描述。"
    },
    "review": {
      "question": "保存执行历史主要能帮助我们做什么？",
      "options": [
        "让工具永远不失败",
        "让模型拥有无限上下文",
        "查看已发生的步骤及其结果"
      ],
      "answer": 2,
      "explanation": "历史提供可追踪信息，不保证执行成功或无限容量。"
    },
    "example": {
      "title": "库存查询到了哪一步",
      "scenario": "原创模拟：店铺助手先记录“请求查询库存”，随后收到工具的“连接超时”。",
      "question": "这次能把库存数当作已经查到吗？",
      "options": [
        "能，发出请求就是成功",
        "不能，这次返回的是超时",
        "能，用上次的数当这次结果"
      ],
      "answer": 1,
      "explanation": "发出请求与取得结果不同，本次没有得到库存数。"
    }
  }
];
