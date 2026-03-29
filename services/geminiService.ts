
import { GoogleGenAI } from "@google/genai";
import { GEMINI_MODEL_NAME, SILICONFLOW_MODEL_NAME, AIProvider } from "../constants";

/**
 * 调用 Gemini API
 */
async function callGemini(prompt: string, apiKey?: string, model: string = GEMINI_MODEL_NAME) {
  const finalApiKey = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!finalApiKey) {
    throw new Error("GEMINI_API_KEY 未配置，请在设置中添加。");
  }
  const ai = new GoogleGenAI({ apiKey: finalApiKey });
  const response = await ai.models.generateContent({
    model: model,
    contents: prompt,
    config: model.includes('pro') ? { thinkingConfig: { thinkingBudget: 2048 } } : undefined
  });
  return response.text || "";
}

/**
 * 调用硅基流动 API (OpenAI 兼容接口)
 */
async function callSiliconFlow(
  prompt: string, 
  apiKey?: string, 
  model: string = SILICONFLOW_MODEL_NAME,
  onProgress?: (chunk: string, rawRequest?: string, rawResponse?: string) => void
) {
  const finalApiKey = apiKey || process.env.SILICONFLOW_API_KEY;
  if (!finalApiKey) {
    throw new Error("SILICONFLOW_API_KEY 未配置，请在设置中添加。");
  }

  const requestBody = {
    model: model,
    messages: [{ role: "user", content: prompt }],
    stream: !!onProgress
  };

  if (onProgress) {
    onProgress("", JSON.stringify(requestBody, null, 2), "");
  }

  const response = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${finalApiKey}`
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(`硅基流动 API 错误: ${error.error?.message || error.message || response.statusText}`);
  }

  if (onProgress && response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = "";
    let rawResponseBuffer = "";
    let lineBuffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      rawResponseBuffer += chunk;
      lineBuffer += chunk;
      
      const lines = lineBuffer.split("\n");
      // 保留最后一行（可能是残缺的）在缓冲区中
      lineBuffer = lines.pop() || "";

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        if (trimmedLine.startsWith("data: ")) {
          const dataStr = trimmedLine.slice(6).trim();
          if (dataStr === "[DONE]") continue;
          try {
            const data = JSON.parse(dataStr);
            const content = data.choices[0].delta.content || "";
            fullContent += content;
            onProgress(fullContent, undefined, rawResponseBuffer);
          } catch (e) {
            // 忽略解析错误，可能是残缺的 JSON
          }
        }
      }
    }
    return fullContent;
  } else {
    const data = await response.json();
    return data.choices[0].message.content || "";
  }
}

/**
 * 根据场景描述直接生成源文本内容。
 */
export const generateSourceContent = async (
  scene: string, 
  provider: AIProvider = 'gemini',
  apiKeys: { gemini?: string; siliconflow?: string } = {},
  onProgress?: (chunk: string, rawRequest?: string, rawResponse?: string) => void
): Promise<string> => {

  try {
    let result = "";
    if (provider === 'siliconflow') {
      const siliconFlowPrompt = `
        你是一位资深的需求分析专家和职场观察者。请根据以下【模版示例】的风格和结构，为场景【${scene}】生成一段极具真实感、多轮深入、细节丰富的职场需求评审文档。

        **【模版示例 - 必须参考其视觉风格与结构】**
        背景：
        平台计划上线 【新人专享券】 功能，目标是提升新注册用户的首单转化率。
        产品需求明确提出：仅注册 3 天内且未下单的用户可领取新人券，每个用户仅能领取一次。
        上线后数据异常：老用户也能领取新人券，部分用户甚至重复领取。
        于是产品、技术、数据三方一起排查，才发现原来是逻辑理解错了。
        
        角色：
        👨💻 产品舟哥
        👨🔧 技术东哥
        👩🔬 数据小李
        
        三、业务调研：商家痛点 & 用户洞察
        👨💼运营帆哥：
        舟哥，最近商家反馈说搞活动太费劲。创建一次满减活动要点十几步，还经常报错。
        
        👨💻产品舟哥：
        是的，后台配置这块老框架问题挺多。你有数据支持下吗？
        
        🕵️数分小李：
        有的：
        - 商家活动配置平均耗时 36 分钟；
        - 23% 的活动存在规则冲突；
        
        **【任务要求】**
        1. **参会角色**：产品小李（必选）、测试小王、后端秦哥、前端小张、运营帆哥、客服小丽。请根据场景【${scene}】需要，从这些角色中选取合适的参与对话。
        2. **对话深度**：对话需要极其详细、真实，必须包含 **至少 20 轮** 深入的逻辑博弈。
        3. **真实感**：体现真实的职场沟通细节，包括逻辑确认、边界情况讨论、潜在风险评估、技术实现难点、各方利益博弈等。
        4. **结构要求**：
           - 必须包含“背景”、“角色”、“三、业务调研：商家痛点 & 用户洞察”等板块。
           - 角色发言前必须带有 Emoji。
           - 不同角色的对话之间必须留有一个空行。
           - 关键逻辑、风险点、结论性话术请用红色标注。

        **输出规范：**
        - 直接输出文本内容，严禁包含 \`\`\` 这种 Markdown 包装。
        - 保持纯文本格式，不要包含 HTML 标签。
      `;
      result = await callSiliconFlow(siliconFlowPrompt, apiKeys.siliconflow, SILICONFLOW_MODEL_NAME, onProgress);
    } else {
      const geminiPrompt = `
        你是一位资深的需求分析专家和职场观察者。请根据以下要求生成一段极具真实感、结构严谨、内容详实的职场需求评审文档：

        **任务要求：**
        1. **文档结构（必须严格遵守）**：
           - **背景：** 深入拆解本次【${scene}】的业务背景、核心目标和当前痛点。使用无序列表，关键结论用红色标注。
           - **参与人员：** 列出本次会议的参与角色及其职责。使用无序列表，格式为“Emoji+角色名：职责”。
           - **对话过程：** 必须分为多个阶段（如 Round 1, Round 2...），每个阶段都有明确的主题。
        2. **参会角色**：产品小李（必选）、测试小王、后端秦哥、前端小张、运营帆哥、客服小丽。请根据场景需要，从这些角色中选取合适的参与对话。
        3. **核心关注**：展现产品经理小李在整个流程内如何平衡各方利益、确认业务逻辑、识别边界情况和评估潜在风险。
        4. **对话深度与轮次（核心要求）**：
           - **对话必须极具深度且轮次多（至少 6-8 轮深入对话）**。
           - 展现真实的职场博弈：后端秦哥可能会质疑技术可行性，测试小王会死磕边界条件，运营帆哥会催促上线时间。
           - 对话内容应包含具体的业务逻辑碰撞、数据指标讨论、甚至是一些“不欢而散”后的妥协与共识。
           - **拒绝空洞的客套话**，每一句发言都应带有明确的信息量和逻辑支撑。

        **对话格式规范（必须严格遵守）：**
        - 阶段标题：例如“Round 1: 深入拆解业务规则，理解业务，识别核心难点”
        - 角色发言：角色名称前必须带有 Emoji，角色名后紧跟冒号。
        - 对话内容：发言内容应使用嵌套列表形式，展现逻辑层次。
        - 重点标注：关键逻辑、风险点、结论性话术请用红色标注。
        - **间距优化**：**不同角色的对话之间必须留有一个空行**，确保结构清晰。

        **输出规范：**
        - 直接输出文本内容。
        - 严禁包含 \`\`\` 这种 Markdown 包装。
        - 保持纯文本格式，不要包含 HTML 标签。
      `;
      result = await callGemini(geminiPrompt, apiKeys.gemini);
    }

    // 清理可能误生成的 Markdown 标签
    result = result.trim();
    result = result.replace(/^```(html)?\s*/i, '').replace(/\s*```$/i, '');
    return result.trim();
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    throw new Error(error.message || "生成源文本失败，请重试。");
  }
};

/**
 * 将源文本内容转换为参考文本的视觉风格和语言语气。
 */
export const transformTextStyle = async (
  sourceHtml: string, 
  referenceHtml: string, 
  provider: AIProvider = 'gemini',
  apiKeys: { gemini?: string; siliconflow?: string } = {},
  onProgress?: (chunk: string, rawRequest?: string, rawResponse?: string) => void
): Promise<string> => {

  try {
    const prompt = `
      你是一位精通“视觉克隆”与“人格拟合”的顶级文案专家。
      你的任务：将【源文本】的内容，套入【参考文档】的“外壳”与“灵魂”。

      **输入数据：**
      1. **源文本 (核心内容)**: 
      ${sourceHtml}

      2. **参考风格 (包含视觉格式与人话口吻的模版)**: 
      ${referenceHtml}

      **必须严格执行的指令：**

      1. **视觉格式完美复刻 (Visual Style Cloning - 极高优先级)**:
         - **风格深度仿照**：请深入理解参考文档的视觉逻辑（如分段习惯、字体颜色分布、重点标注方式），并将其自然地应用到源文本中，实现风格的“神似”而非死板的“形似”。
         - **章节与标题克隆 (CRITICAL)**：
           - **逻辑拆分**：深入分析【源文本】的逻辑结构，将其拆分为 3-5 个逻辑清晰的章节。
           - **样式复刻**：提取【参考风格】中标题的视觉样式（如颜色、字号、加粗、间距）。
           - **动态命名**：**严禁直接复制参考文档的标题文字**。必须根据【源文本】的实际内容生成标题，并复刻参考文档的序号格式（如“一、”、“二、”或“1.”）。
         - **色号复刻**：必须提取参考文档中的确切色号。在输出中，对相应的关键词或重点段落必须使用内联样式。
            - **红色重点**：如果参考文档用红色强调，请使用 \`color: #ef4444;\`。
            - **橙色重点**：如果参考文档用橙色强调，请使用 \`color: #f97316;\`。
            - **背景色复刻**：如果参考文档使用了背景色（如浅灰色背景），请使用 \`background-color: #f3f4f6;\`。
            - **标题颜色**：如果参考文档的标题是橙色的，请确保生成的标题也使用 \`color: #f97316;\`。
          - **标题样式 (IMPORTANT)**：除非参考文档明确为标题设置了背景色，否则**严禁**为标题添加 \`background-color\`。请优先使用文字颜色（\`color\`）来区分标题。
         - **格式对齐**：参考文档哪里加粗了，你就哪里加粗；哪里用了下划线，你也用。
         - **列表与序号**：如果参考文档使用了 1.、(1)、Emoji 或特定的列表前缀，请完全复刻这种序号形式。
         - **排版克隆**：复刻参考文档的换行逻辑。它是喜欢每句话换行，还是长段落？你必须保持一致。
         - **字体装饰**：所有的样式必须写在标签的 \`style\` 属性中，确保复制粘贴到 Word/邮件后依然能保留颜色和格式。

      2. **人话语气模拟 (Human Persona)**:
         - **拒绝 AI 感**：参考文档是亲切感、专业感、还是直白简练？完全模仿其说话的语气 and 情感温度。
         - **语境细节**：如果参考文档喜欢用 "~" 或特定的表情/标点习惯，请在不改变源文本原意的情况下自然融入。

      3. **排版与间距 (Layout & Spacing - 核心修正)**:
         - **对话间距 (CRITICAL)**：每个角色的对话板块（包含姓名和对话列表）必须使用一个 \`<div style="margin-bottom: 32px;">\` 进行包裹，并在每个板块结束后显式添加一个空行段落 \`<p>&nbsp;</p>\`，确保不同角色发言之间在复制粘贴后依然有明显的视觉空行。
         - **列表序号与文字颜色分离 (CRITICAL)**：为了防止复制时文字变色或出现双重序号，必须采用以下结构：
           \`<li style="color: #000000; margin-bottom: 8px;"><span style="color: #000000;">内容文字</span></li>\`
           - **严禁**在 \`<li>\` 标签内部手动编写圆点（如 •）、数字（如 1.）或 Emoji 作为序号。
           - **必须**在 \`<li>\` 内部包裹一个 \`<span>\` 来显式指定文字颜色为深色（#000000），确保粘贴到云文档后文字保持黑色。
           - **必须**在 \`<li>\` 上设置 \`color\` 属性来指定圆点/序号的颜色。

      4. **内容保真 (Content Loyalty - 核心要求)**:
         - **严禁删减**：必须完整保留【源文本】中的所有信息点、细节、数据和逻辑。
         - **长度对齐**：改写后的字数和详细程度必须与【源文本】保持一致，甚至可以更详细，但绝对不允许缩短或精简。
         - **核心事实**：严禁随意增减源文本的核心事实。

      **输出规范**:
      - 仅输出 **纯 HTML 代码片段**。
      - 严禁包含 \`\`\`html 这种 Markdown 包装。
      - 所有的视觉样式（颜色、粗体等）必须通过 **inline style** 实现。

      现在，请开始执行极致的视觉风格迁移：
    `;

    let result = "";
    if (provider === 'siliconflow') {
      const siliconFlowPrompt = `
        你是一位精通“视觉克隆”的顶级前端与排版专家。
        你的任务：将【源文本】的内容，**原封不动**地套入【参考文档】的视觉格式中。

        **【核心原则 - 最高优先级】**：
        1. **内容绝对保真**：严禁对【源文本】进行任何改写、润色、精简或总结。源文本里的每一句话、每一个词、每一个数据都必须完整保留。
        2. **风格深度仿照**：请深入理解参考文档的视觉逻辑（如分段习惯、字体颜色分布、重点标注方式），并将其自然地应用到源文本中，实现风格的“神似”而非死板的“形似”。
        3. **仅迁移格式**：你的工作仅仅是提取【参考文档】中的 HTML 结构、CSS 样式（颜色、字体、间距、加粗等），并将其应用到【源文本】上。

        **输入数据：**
        1. **源文本 (必须完整保留的内容)**: 
        ${sourceHtml}

        2. **参考风格 (视觉格式模版)**: 
        ${referenceHtml}

        **必须严格执行的指令：**

        1. **视觉格式完美复刻**:
           - **风格深度仿照**：请深入理解参考文档的视觉逻辑（如分段习惯、字体颜色分布、重点标注方式），并将其自然地应用到源文本中，实现风格的“神似”而非死板的“形似”。
           - **章节与标题克隆 (CRITICAL)**：
             - **逻辑拆分**：深入分析【源文本】的逻辑结构，将其拆分为多个逻辑清晰的章节。
             - **样式复刻**：提取【参考风格】中标题的视觉样式（如颜色、字号、加粗、间距）。
             - **动态命名**：**严禁直接复制参考文档的标题文字**。必须根据【源文本】的实际内容生成标题，并复刻参考文档的序号格式（如“一、”、“二、”或“1.”）。
           - **色号复刻**：必须提取参考文档中的确切色号。在输出中，对相应的关键词或重点段落必须使用内联样式。
              - **红色重点**：使用 \`color: #ef4444;\`。
              - **橙色重点**：使用 \`color: #f97316;\`。
              - **背景色复刻**：如果参考文档使用了背景色，请使用 \`background-color: #f3f4f6;\`。
              - **标题颜色**：如果参考文档标题是橙色，请复刻。
            - **标题样式**：除非参考文档明确要求，否则不要为标题添加背景色。
           - **格式对齐**：参考文档哪里加粗了，你就哪里加粗；哪里用了下划线，你也用。
           - **列表与序号**：完全复刻参考文档的列表形式。
           - **排版克隆**：复刻参考文档的换行逻辑。
           - **字体装饰**：所有的样式必须写在标签的 \`style\` 属性中。

        2. **排版与间距 (Layout & Spacing)**:
           - **对话间距 (CRITICAL)**：每个角色的对话板块必须使用一个 \`<div style="margin-bottom: 32px;">\` 进行包裹，并在每个板块结束后显式添加一个空行段落 \`<p>&nbsp;</p>\`，确保不同角色发言之间在复制粘贴后依然有明显的视觉空行。
           - **列表序号与文字颜色分离 (CRITICAL)**：
             \`<li style="color: #000000; margin-bottom: 8px;"><span style="color: #000000;">内容文字</span></li>\`
             - **严禁**在 \`<li>\` 标签内部手动编写圆点（如 •）、数字（如 1.）或 Emoji 作为序号。
             - **必须**在 \`<li>\` 内部包裹一个 \`<span>\` 来显式指定文字颜色为深色（#000000），确保粘贴到云文档后文字保持黑色。
             - **必须**在 \`<li>\` 上设置 \`color\` 属性来指定圆点/序号的颜色。

        3. **严禁行为**:
           - 严禁改变源文本的语气或用词。
           - 严禁删除源文本的任何细节、逻辑 or 数据。
           - 严禁合并或拆分源文本的段落。

        **输出规范**:
        - 仅输出 **纯 HTML 代码片段**。
        - 严禁包含 \`\`\`html 这种 Markdown 包装。
        - 所有的视觉样式必须通过 **inline style** 实现。

        现在，请开始执行纯粹的视觉风格迁移（保持内容 100% 不变）：
      `;
      result = await callSiliconFlow(siliconFlowPrompt, apiKeys.siliconflow, SILICONFLOW_MODEL_NAME, onProgress);
    } else {
      result = await callGemini(prompt, apiKeys.gemini);
    }

    // 清理可能误生成的 Markdown 标签
    result = result.trim();
    result = result.replace(/^```(html)?\s*/i, '').replace(/\s*```$/i, '');
    result = result.trim();
    
    return result;
  } catch (error: any) {
    console.error("AI Style Transfer Error:", error);
    throw new Error(error.message || "风格迁移失败，请重试。");
  }
};
