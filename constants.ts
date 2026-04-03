// 使用 Gemini 3 Pro 以获得最强的视觉样式解析和语气模拟能力
export const GEMINI_PRO_MODEL_NAME = 'gemini-3-pro-preview';
export const GEMINI_FAST_MODEL_NAME = 'gemini-3-flash-preview';

// 硅基流动默认模型 (DeepSeek-V3 或 DeepSeek-R1)
export const SILICONFLOW_MODEL_NAME = 'Pro/deepseek-ai/DeepSeek-R1';

export type AIProvider = 'gemini-fast' | 'gemini-pro' | 'siliconflow';
export const DEFAULT_PROVIDER: AIProvider = 'gemini-pro';

export const DEFAULT_SILICONFLOW_KEY = 'sk-vuajfowbfnkrdqdnpikbihhmhyrtgzkvaxvbmqrppxisflki';

export const INITIAL_SOURCE_PLACEHOLDER = `
  <p>在此处粘贴或输入您的<strong>源文本</strong>内容...</p>
  <p>内容会被保留，但“外壳”和“灵魂”会被改写。</p>
`;

export const INITIAL_STYLE_PLACEHOLDER = `
  <h2 style="color: #d97706; font-size: 24px; font-weight: bold; margin-bottom: 16px;">背景：</h2>
  <ul style="padding-left: 24px; margin: 0 0 32px 0;">
    <li style="color: #000000; margin-bottom: 12px;">
      <span style="color: #000000;">平台计划上线 <span style="color: #dc2626; font-weight: bold;">【新人专享券】</span> 功能，目标是提升新注册用户的首单转化率。</span>
    </li>
    <li style="color: #000000; margin-bottom: 12px;">
      <span style="color: #000000;">产品需求明确提出：<span style="color: #dc2626;">仅注册 3 天内且未下单的用户可领取新人券，每个用户仅能领取一次。</span> 因为需求提出到上线的时间非常短，所以就简单查看后上线观察！</span>
    </li>
    <li style="color: #000000; margin-bottom: 12px;">
      <span style="color: #000000;">上线后数据异常：老用户也能领取新人券，<span style="color: #dc2626;">部分用户甚至重复领取。</span></span>
    </li>
    <li style="color: #000000; margin-bottom: 12px;">
      <span style="color: #000000;">于是产品、技术、数据三方一起排查，<span style="color: #dc2626;">才发现原来是逻辑理解错了。</span> 需求一开始也是经过了技术评审，但是最终上线还是和期望有差异。</span>
    </li>
    <li style="color: #000000; margin-bottom: 12px;">
      <span style="color: #000000;">这对于产品来说也是比较常见的场景，<span style="color: #dc2626;">跟着这个真实场景，来抠细节，看看如何复盘规避！</span></span>
    </li>
  </ul>

  <h2 style="color: #d97706; font-size: 24px; font-weight: bold; margin-bottom: 16px;">角色：</h2>
  <ul style="padding-left: 24px; margin: 0 0 32px 0;">
    <li style="color: #000000; margin-bottom: 8px;">
      <span style="color: #000000;">👨‍💻 产品舟哥</span>
    </li>
    <li style="color: #000000; margin-bottom: 8px;">
      <span style="color: #000000;">👨‍🔧 技术东哥</span>
    </li>
    <li style="color: #000000; margin-bottom: 8px;">
      <span style="color: #000000;">👨‍🔧 数据小李</span>
    </li>
  </ul>

  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />

  <h1 style="color: #d97706; font-size: 24px; font-weight: bold; margin-bottom: 24px;">一、项目背景：核心痛点与需求洞察</h1>
  
  <div style="margin-bottom: 32px;">
    <p style="margin-bottom: 12px;"><strong>👨‍💼 业务负责人：</strong></p>
    <ul style="padding-left: 24px; margin: 0;">
      <li style="color: #000000; margin-bottom: 12px;">
        <span style="color: #000000;">目前的流程太复杂，用户在 <span style="color: #dc2626; font-weight: bold;">关键环节</span> 经常流失。</span>
      </li>
    </ul>
  </div>
  <p>&nbsp;</p>

  <h1 style="color: #d97706; font-size: 24px; font-weight: bold; margin-bottom: 24px;">二、解决方案：流程优化与自动化</h1>
  
  <div style="margin-bottom: 32px;">
    <p style="margin-bottom: 12px;"><strong>👨‍💻 产品经理：</strong></p>
    <ul style="padding-left: 24px; margin: 0;">
      <li style="color: #000000; margin-bottom: 12px;">
        <span style="color: #000000;">我们需要引入 <span style="color: #dc2626;">自动化审核</span> 机制，缩短处理时间。</span>
      </li>
    </ul>
  </div>
  <p>&nbsp;</p>

  <h1 style="color: #d97706; font-size: 24px; font-weight: bold; margin-bottom: 24px;">三、数据指标：优化后的预期收益</h1>
  
  <div style="margin-bottom: 32px;">
    <p style="margin-bottom: 12px;"><strong>🕵️ 数分专家：</strong></p>
    <ul style="padding-left: 24px; margin: 0;">
      <li style="color: #000000; margin-bottom: 12px;">
        <span style="color: #000000;">预期指标：</span>
        <ul style="padding-left: 24px; margin-top: 8px; list-style-type: none;">
          <li style="margin-bottom: 8px; color: #000000;">处理耗时预计 <span style="color: #dc2626; font-weight: bold;">降低 50%</span>；</li>
          <li style="margin-bottom: 8px; color: #000000;">用户转化率预计 <span style="color: #dc2626; font-weight: bold;">提升 15%</span>。</li>
        </ul>
      </li>
    </ul>
  </div>
  <p>&nbsp;</p>
`;
