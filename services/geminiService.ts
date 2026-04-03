
import { GoogleGenAI } from "@google/genai";
import { GEMINI_PRO_MODEL_NAME, GEMINI_FAST_MODEL_NAME, SILICONFLOW_MODEL_NAME, AIProvider } from "../constants";

/**
 * 压缩 HTML，去除多余空格和注释，大幅降低 Token 消耗
 */
const minifyHtml = (html: string) => {
  return html
    .replace(/<!--[\s\S]*?-->/g, '') // 移除注释
    .replace(/\s+/g, ' ') // 多个空格合并为一个
    .replace(/>\s+</g, '><') // 移除标签之间的空格
    .trim();
};

/**
 * 调用 Gemini API (带重试机制)
 */
async function callGemini(prompt: string, apiKey?: string, model: string = GEMINI_PRO_MODEL_NAME, retries = 2) {
  const finalApiKey = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!finalApiKey) {
    throw new Error("GEMINI_API_KEY 未配置，请在设置中添加。");
  }
  const ai = new GoogleGenAI({ apiKey: finalApiKey });
  
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: model.includes('pro') ? { thinkingConfig: { thinkingBudget: 2048 } } : undefined
      });
      return response.text || "";
    } catch (error: any) {
      const isRateLimit = error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED';
      if (isRateLimit && i < retries) {
        console.warn(`Gemini API 限流 (429)，等待 ${2 ** i} 秒后重试...`);
        await new Promise(resolve => setTimeout(resolve, (2 ** i) * 1000));
        continue;
      }
      throw error;
    }
  }
  return "";
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
  provider: AIProvider = 'gemini-pro',
  apiKeys: { gemini?: string; siliconflow?: string } = {},
  onProgress?: (chunk: string, rawRequest?: string, rawResponse?: string) => void
): Promise<string> => {

  const today = new Date().toISOString().split('T')[0];

  try {
    let result = "";
    const prompt = `
      你是一位资深的产品经理。请根据以下要求生成一段极具真实感、结构严谨、内容详实的对话式文档：

      任务要求：
      1. 文档结构（必须严格遵守）：
         - 主标题： 文档第一行必须是主标题，格式为“【${today}】 一次真实的[场景类型]-[结合文档内容总结的具体业务]”。[场景类型]请根据【${scene}】，包含了“需求评审、需求调研、数据分析、BUG处理、上线复盘、产品规划、竞品分析”等中的一个。例如：“【${today}】 一次真实的需求调研-购物车满减活动逻辑优化”。
         - 背景： 根据本次的【${scene}】，生成对话式文档。使用无序列表，关键结论用红色标注。
         - 参与人员： 列出本次会议的参与角色及其职责。使用无序列表，格式为“Emoji+角色名：”。
         - 对话过程： 必须分为多个阶段（如 Round 1, Round 2...），每个阶段都有明确的主题。
      2. 参会角色：产品小李（必选）、测试小王、后端秦哥、前端小张、运营帆哥、客服小丽。请根据场景需要，从这些角色中选取合适的参与对话。
      3. 核心关注：展现产品经理小李在整个流程内如何，需要关注和做的内容，体现出所有沟通的细节
      4. 对话深度与轮次（核心要求）：
         - 对话必须极具深度且轮次多（至少24 轮深入对话）。
         - 展现真实的职场对话
         - 拒绝空洞的客套话，每一句发言都应带有明确的信息量和逻辑支撑。多用【咱们】【好嘞】【呢】【呀】之类的词，带有真人味
         - 涉及到技术底层的，不要太过于专业，尽可能口语化，方便理解，面向产品经理，比如【Redis锁有问题，出现分布式事务一致性问题】，就描述为【出现数据一致性的问题】

      对话格式规范（必须严格遵守）：
      - 阶段标题：例如“Round 1: 深入拆解业务规则，理解业务，识别核心难点”
      - 角色发言：角色名称前必须带有 Emoji，角色名后紧跟冒号。
      - 对话内容：发言内容应使用嵌套列表形式，展现逻辑层次。
      - 重点标注：关键逻辑、风险点、结论性话术请务必使用 <span style="color: red;">关键内容</span> 进行标红。**要求每个人每次发言中，都必须有一小部分最核心的词句被标红，不要太集中，要均匀分布在整个对话中。**
      - 间距优化：不同角色的对话之间必须留有一个空行，确保结构清晰。

      输出规范：
      - 直接输出文本内容。
      - 严禁包含 \`\`\` 这种 Markdown 包装。
      - 保持纯文本格式，除了用于标红的 <span> 标签外，不要包含其他 HTML 标签。
    `;

    if (provider === 'siliconflow') {
      result = await callSiliconFlow(prompt, apiKeys.siliconflow, SILICONFLOW_MODEL_NAME, onProgress);
    } else {
      const modelName = provider === 'gemini-fast' ? GEMINI_FAST_MODEL_NAME : GEMINI_PRO_MODEL_NAME;
      result = await callGemini(prompt, apiKeys.gemini, modelName);
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
  provider: AIProvider = 'gemini-pro',
  apiKeys: { gemini?: string; siliconflow?: string } = {},
  onProgress?: (chunk: string, rawRequest?: string, rawResponse?: string) => void
): Promise<string> => {

  try {
    const minifiedSource = minifyHtml(sourceHtml);
    const minifiedReference = minifyHtml(referenceHtml);

    const prompt = `
      你是一位精通“视觉克隆”与“人格拟合”的顶级文案专家。
      你的任务：将【源文本】的内容，套入【参考文档】的“外壳”与“灵魂”。

      **输入数据：**
      1. **源文本 (核心内容)**: 
      ${minifiedSource}

      2. **参考风格 (包含视觉格式与人话口吻的模版)**: 
      ${minifiedReference}

      **必须严格执行的指令：**

      1. **视觉格式完美复刻 (Visual Style Cloning - 极高优先级)**:
         - **风格深度仿照**：请深入理解参考文档的视觉逻辑（如分段习惯、字体颜色分布、重点标注方式），并将其自然地应用到源文本中，实现风格的“神似”而非死板的“形似”。
         - **章节与标题克隆 (CRITICAL)**：
           - **主标题复刻**：如果源文本开头有主标题（如“【2026-03-30】 一次真实的...”），必须将其转换为一级标题（<h1>），并使用深色字体（如 color: #1f2937;），**严禁使用橙色**。
           - **逻辑拆分**：深入分析【源文本】的逻辑结构，将其拆分为 3-5 个逻辑清晰的章节。
           - **样式复刻**：提取【参考风格】中标题的视觉样式（如颜色、字号、加粗、间距）。
           - **动态命名**：**严禁直接复制参考文档的标题文字**。必须根据【源文本】的实际内容生成标题，并复刻参考文档的序号格式（如“一、”、“二、”或“1.”）。
         - **色号复刻**：必须提取参考文档中的确切色号。在输出中，对相应的关键词或重点段落必须使用内联样式。
            - **红色重点 (CRITICAL)**：参考文档中作为关键词或重点强调的内容，必须使用红色字体，即 \`color: #ef4444;\`。
            - **橙色标题 (CRITICAL)**：参考文档中的章节标题，以及“背景：”、“参与人员：”等固定板块标题必须使用橙色字体，即 \`color: #f97316;\`。**（主标题除外）**
            - **背景色复刻**：如果参考文档使用了背景色（如浅灰色背景），请使用 \`background-color: #f3f4f6;\`。
          - **标题样式 (CRITICAL)**：**绝对禁止**为任何标题（h1, h2, h3 等）添加 \`background-color\` 属性。标题必须是透明背景。请仅使用文字颜色（\`color: #f97316;\`）来区分标题。**（主标题除外，主标题使用深色）**
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
           - **严禁**在 \`<li>\` 和 \`<span>\` 之间，以及 \`<span>\` 内部的文字开头添加任何空格。
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
      result = await callSiliconFlow(prompt, apiKeys.siliconflow, SILICONFLOW_MODEL_NAME, onProgress);
    } else {
      const modelName = provider === 'gemini-fast' ? GEMINI_FAST_MODEL_NAME : GEMINI_PRO_MODEL_NAME;
      result = await callGemini(prompt, apiKeys.gemini, modelName);
    }

    // 清理可能误生成的 Markdown 标签
    result = result.trim();
    result = result.replace(/^```(html)?\s*/i, '').replace(/\s*```$/i, '');
    result = result.trim();
    
    // 清理 <li> 标签内开头的多余空格，防止无序序号后出现大段空白
    result = result.replace(/(<li[^>]*>)(?:\s|&nbsp;)+/gi, '$1');
    result = result.replace(/(<li[^>]*><span[^>]*>)(?:\s|&nbsp;)+/gi, '$1');
    
    return result;
  } catch (error: any) {
    console.error("AI Style Transfer Error:", error);
    throw new Error(error.message || "风格迁移失败，请重试。");
  }
};
