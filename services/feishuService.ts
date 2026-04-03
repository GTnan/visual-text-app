
/**
 * 飞书文档集成服务
 */

export interface FeishuTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
  token_type: string;
}

const STORAGE_KEY = 'feishu_tokens';

export const getFeishuTokens = (): FeishuTokens | null => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
};

export const saveFeishuTokens = (tokens: FeishuTokens) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  localStorage.setItem(`${STORAGE_KEY}_time`, Math.floor(Date.now() / 1000).toString());
};

export const clearFeishuTokens = () => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(`${STORAGE_KEY}_time`);
};

/**
 * 刷新飞书 Token
 */
export const refreshFeishuTokens = async (refreshToken: string): Promise<FeishuTokens> => {
  const response = await fetch('/api/auth/feishu/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Token refresh failed");
  }

  const data = await response.json();
  saveFeishuTokens(data);
  return data;
};

/**
 * 解析颜色字符串为 RGB 对象
 */
const parseColor = (colorStr: string | undefined): { r: number, g: number, b: number } | null => {
  if (!colorStr) return null;
  const s = colorStr.toLowerCase().trim();
  
  if (s.startsWith('rgb')) {
    const matches = s.match(/\d+/g);
    if (matches && matches.length >= 3) {
      return { r: parseInt(matches[0]), g: parseInt(matches[1]), b: parseInt(matches[2]) };
    }
  }
  
  if (s.startsWith('#')) {
    const hex = s.substring(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16)
      };
    }
    if (hex.length === 6) {
      return {
        r: parseInt(hex.substring(0, 2), 16),
        g: parseInt(hex.substring(2, 4), 16),
        b: parseInt(hex.substring(4, 6), 16)
      };
    }
  }
  
  return null;
};

/**
 * 飞书颜色映射 (Color String -> Feishu Color Index 1-7)
 * 1：红色, 2：橙色, 3：黄色, 4：绿色, 5：蓝色, 6：紫色, 7：灰色
 */
const getFeishuColor = (colorStr: string | undefined): number | undefined => {
  if (!colorStr) return undefined;
  const s = colorStr.toLowerCase().trim();
  if (s === 'transparent' || s === 'none' || s.includes('rgba(0, 0, 0, 0)')) return undefined;

  const rgb = parseColor(colorStr);
  
  // 飞书标准文字颜色索引 (1-7)
  if (s.includes('red') || s.includes('pink') || s.includes('fuchsia')) return 1;
  if (s.includes('orange') || s.includes('amber')) return 2;
  if (s.includes('yellow')) return 3;
  if (s.includes('green') || s.includes('emerald') || s.includes('teal')) return 4;
  if (s.includes('blue') || s.includes('cyan') || s.includes('sky') || s.includes('indigo')) return 5;
  if (s.includes('purple') || s.includes('violet')) return 6;
  if (s.includes('gray') || s.includes('grey') || s.includes('slate') || s.includes('zinc') || s.includes('stone')) return 7;
  
  if (s.includes('black')) return undefined;

  if (!rgb) return undefined;

  const { r, g, b } = rgb;
  
  // 红色系
  if (r > 150 && g < 110 && b < 110) return 1;
  // 橙色/黄色系
  if (r > 150 && g >= 110 && b < 150) {
    if (g > 190) return 3; // 黄色
    return 2; // 橙色
  }
  // 绿色系
  if (g > 120 && r < 150 && b < 150) return 4;
  // 蓝色系
  if (b > 120 && r < 180 && g < 180) return 5;
  // 紫色系
  if (r > 120 && b > 120 && g < 150) return 6;
  // 灰色系
  if (Math.abs(r - g) < 30 && Math.abs(g - b) < 30 && r > 100) return 7;
  
  return undefined;
};

/**
 * 飞书背景颜色映射 (Color String -> Feishu Color Index 1-15)
 * 1：浅红色, 2：浅橙色, 3：浅黄色, 4：浅绿色, 5：浅蓝色, 6：浅紫色, 7：中灰色
 * 8：红色, 9：橙色, 10：黄色, 11：绿色, 12：蓝色, 13：紫色, 14：灰色, 15：浅灰色
 */
const getFeishuBgColor = (colorStr: string | undefined): number | undefined => {
  if (!colorStr) return undefined;
  const s = colorStr.toLowerCase().trim();
  if (s === 'transparent' || s === 'none' || s.includes('rgba(0, 0, 0, 0)')) return undefined;

  const rgb = parseColor(colorStr);

  // 飞书背景颜色映射 (1-15)
  // 优先匹配浅色关键词
  if (s.includes('lightred') || s.includes('浅红')) return 1;
  if (s.includes('lightorange') || s.includes('浅橙')) return 2;
  if (s.includes('lightyellow') || s.includes('浅黄')) return 3;
  if (s.includes('lightgreen') || s.includes('浅绿')) return 4;
  if (s.includes('lightblue') || s.includes('浅蓝')) return 5;
  if (s.includes('lightpurple') || s.includes('浅紫')) return 6;
  if (s.includes('lightgray') || s.includes('lightgrey') || s.includes('浅灰')) return 15;
  if (s.includes('mediumgray') || s.includes('mediumgrey') || s.includes('中灰')) return 7;

  // 再匹配标准色
  if (s.includes('red')) return 8;
  if (s.includes('orange')) return 9;
  if (s.includes('yellow')) return 10;
  if (s.includes('green')) return 11;
  if (s.includes('blue')) return 12;
  if (s.includes('purple')) return 13;
  if (s.includes('gray') || s.includes('grey')) return 14;

  if (!rgb) return undefined;

  const { r, g, b } = rgb;
  
  // 浅色背景映射 (1-7, 15)
  if (r > 245 && g > 245 && b > 245) return undefined; // 太白了，不设背景
  
  // 浅灰
  if (r > 230 && g > 230 && b > 230 && Math.abs(r-g) < 10) return 15;
  // 中灰
  if (r > 180 && g > 180 && b > 180 && Math.abs(r-g) < 10) return 7;

  if (r > 240 && g > 200 && b > 200 && r > g + 20) return 1;  // 浅红
  if (r > 240 && g > 220 && b > 200 && r > b + 20) return 2;  // 浅橙
  if (r > 240 && g > 240 && b > 200 && g > b + 20) return 3;  // 浅黄
  if (r > 200 && g > 240 && b > 200 && g > r + 20) return 4;  // 浅绿
  if (r > 200 && g > 200 && b > 240 && b > r + 20) return 5;  // 浅蓝
  if (r > 220 && g > 200 && b > 240 && r > g + 20) return 6;  // 浅紫
  
  return undefined;
};

/**
 * 将 HTML 转换为飞书 Docx 块
 */
export const convertHtmlToFeishuBlocks = (html: string): any[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const blocks: any[] = [];

  const processNode = (node: Node, inheritedStyle: any = {}): any[] => {
    const elements: any[] = [];
    
    let currentStyle = { ...inheritedStyle };
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tagName = el.tagName.toLowerCase();
      
      // 提取并合并样式
      const textDecoration = el.style.textDecoration || "";
      if (tagName === 'strong' || tagName === 'b' || el.style.fontWeight === 'bold' || el.style.fontWeight === '700') {
        currentStyle.bold = true;
      }
      if (tagName === 'em' || tagName === 'i' || el.style.fontStyle === 'italic') {
        currentStyle.italic = true;
      }
      if (tagName === 'u' || textDecoration.includes('underline')) {
        currentStyle.underline = true;
      }
      if (tagName === 's' || tagName === 'del' || textDecoration.includes('line-through')) {
        currentStyle.strikethrough = true;
      }
      if (tagName === 'code' || tagName === 'kbd') {
        currentStyle.inline_code = true;
      }
      
      // 颜色处理
      const color = el.style.color || el.getAttribute('color');
      const colorIndex = getFeishuColor(color);
      if (colorIndex !== undefined) {
        currentStyle.text_color = colorIndex;
      }
      
      const bgColor = el.style.backgroundColor || el.getAttribute('bgcolor');
      const bgColorIndex = getFeishuBgColor(bgColor);
      if (bgColorIndex !== undefined) {
        currentStyle.background_color = bgColorIndex;
      }

      if (tagName === 'a') {
        const href = el.getAttribute('href');
        if (href) {
          currentStyle.link = { url: href };
        }
      }
    }

    node.childNodes.forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        let text = (child.textContent || "").replace(/[\n\r\t]/g, "");
        // 飞书要求 content 不能为空
        if (text.length > 0) {
          const style: any = {};
          if (currentStyle.bold) style.bold = true;
          if (currentStyle.italic) style.italic = true;
          if (currentStyle.underline) style.underline = true;
          if (currentStyle.strikethrough) style.strikethrough = true;
          if (currentStyle.inline_code) style.inline_code = true;
          // 确保索引在允许范围内 (text_color: 1-7, background_color: 1-15)
          if (currentStyle.text_color !== undefined) style.text_color = Math.min(7, Math.max(1, currentStyle.text_color));
          if (currentStyle.background_color !== undefined) style.background_color = Math.min(15, Math.max(1, currentStyle.background_color));
          if (currentStyle.link) style.link = currentStyle.link;

          elements.push({
            text_run: {
              content: text,
              text_element_style: style
            }
          });
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        const tagName = el.tagName.toLowerCase();
        
        if (tagName === 'br') {
          // 飞书 TextRun 不支持 \n，忽略 br 或在外部处理为新块
          // 这里我们选择忽略，因为 processNode 是为单个块生成 elements
          return;
        } else {
          // 递归处理子节点，传递当前样式进行继承
          elements.push(...processNode(child, currentStyle));
        }
      }
    });

    return elements;
  };

  const rootNodes = Array.from(doc.body.childNodes);
  
  const handleBlock = (node: Node) => {
    if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.TEXT_NODE) return;

    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent || "").replace(/[\n\r\t]/g, "").trim();
      if (text) {
        blocks.push({
          block_type: 2,
          text: { 
            elements: [{ 
              text_run: { 
                content: text, 
                text_element_style: {} 
              } 
            }], 
            style: {} 
          }
        });
      }
      return;
    }

    const el = node as HTMLElement;
    const tagName = el.tagName.toLowerCase();

    // 检查是否包含块级子元素
    const blockTags = ['p', 'div', 'h1', 'h2', 'h3', 'ul', 'ol', 'hr', 'blockquote', 'pre'];
    const hasBlockChildren = Array.from(el.childNodes).some(c => 
      c.nodeType === Node.ELEMENT_NODE && blockTags.includes((c as HTMLElement).tagName.toLowerCase())
    );

    if (hasBlockChildren && (tagName === 'div' || tagName === 'section' || tagName === 'article')) {
      Array.from(el.childNodes).forEach(handleBlock);
      return;
    }

    if (tagName === 'h1') {
      const elements = processNode(el);
      if (elements.length > 0) {
        blocks.push({
          block_type: 3, // Heading 1
          heading1: { elements, style: {} }
        });
      }
    } else if (tagName === 'h2') {
      const elements = processNode(el);
      if (elements.length > 0) {
        blocks.push({
          block_type: 4, // Heading 2
          heading2: { elements, style: {} }
        });
      }
    } else if (tagName === 'h3') {
      const elements = processNode(el);
      if (elements.length > 0) {
        blocks.push({
          block_type: 5, // Heading 3
          heading3: { elements, style: {} }
        });
      }
    } else if (tagName === 'ul') {
      Array.from(el.children).forEach(li => {
        const elements = processNode(li);
        if (elements.length > 0) {
          blocks.push({
            block_type: 12, // Bullet List
            bullet: { elements, style: {} }
          });
        }
      });
    } else if (tagName === 'ol') {
      Array.from(el.children).forEach(li => {
        const elements = processNode(li);
        if (elements.length > 0) {
          blocks.push({
            block_type: 13, // Ordered List
            ordered: { elements, style: {} }
          });
        }
      });
    } else if (tagName === 'hr') {
      blocks.push({
        block_type: 22, // Divider
        divider: {}
      });
    } else if (tagName === 'blockquote') {
      const elements = processNode(el);
      if (elements.length > 0) {
        blocks.push({
          block_type: 15, // Quote
          quote: { elements, style: {} }
        });
      }
    } else {
      // 默认处理为文本块 (p, div, span 等)
      const elements = processNode(el);
      if (elements.length > 0) {
        blocks.push({
          block_type: 2, // Text
          text: { elements, style: {} }
        });
      }
    }
  };

  rootNodes.forEach(handleBlock);

  return blocks;
};

/**
 * 创建飞书文档 (带自动刷新 Token 逻辑)
 */
export const createFeishuDoc = async (title: string, html: string, tokens: FeishuTokens): Promise<any> => {
  // 检查 Token 是否过期 (提前 5 分钟刷新)
  let currentTokens = tokens;
  const now = Math.floor(Date.now() / 1000);
  const savedTime = parseInt(localStorage.getItem('feishu_tokens_time') || '0');
  
  if (now - savedTime > tokens.expires_in - 300) {
    console.log("Feishu token expired or expiring soon, refreshing...");
    try {
      currentTokens = await refreshFeishuTokens(tokens.refresh_token);
    } catch (err) {
      console.error("Failed to refresh token, will try with current one:", err);
    }
  }

  const blocks = convertHtmlToFeishuBlocks(html);
  
  // 不再手动在最前面添加 H1 标题，避免与 AI 生成的标题重复
  // 且 AI 生成的标题会带有正确的视觉样式（如橙色文字）
  const children = blocks;

  const payload = {
    title,
    children,
    index: 0
  };
  
  const response = await fetch('/api/feishu/create-doc', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${currentTokens.access_token}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '创建飞书文档失败');
  }

  return response.json();
};

/**
 * 交换飞书授权码
 */
export const exchangeFeishuCode = async (code: string): Promise<FeishuTokens> => {
  const response = await fetch('/api/auth/feishu/exchange', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ code })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '交换授权码失败');
  }

  const tokens = await response.json();
  saveFeishuTokens(tokens);
  localStorage.setItem('feishu_tokens_time', Math.floor(Date.now() / 1000).toString());
  return tokens;
}

/**
 * 刷新飞书 Token
 */
export const refreshFeishuToken = async (refreshToken: string): Promise<FeishuTokens> => {
  const response = await fetch('/api/auth/feishu/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ refresh_token: refreshToken })
  });

  if (!response.ok) {
    throw new Error('刷新飞书 Token 失败');
  }

  const tokens = await response.json();
  saveFeishuTokens(tokens);
  localStorage.setItem('feishu_tokens_time', Math.floor(Date.now() / 1000).toString());
  return tokens;
};
