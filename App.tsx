
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { RichInput } from './components/RichInput';
import { Button } from './components/Button';
import { transformTextStyle, generateSourceContent } from './services/geminiService';
import { INITIAL_SOURCE_PLACEHOLDER, INITIAL_STYLE_PLACEHOLDER, DEFAULT_PROVIDER, AIProvider, DEFAULT_SILICONFLOW_KEY } from './constants';
import { ProcessingState } from './types';
import { getFeishuTokens, saveFeishuTokens, clearFeishuTokens, createFeishuDoc, exchangeFeishuCode, refreshFeishuTokens, FeishuTokens } from './services/feishuService';
import { Layout, FileText, ExternalLink, LogOut, RefreshCw, Key } from 'lucide-react';
import { 
  AuthUser, 
  fetchMe, 
  login as loginApi, 
  logout as logoutApi,
  listUsers,
  createUserApi,
  updateUserApi,
  resetUserPassword,
  deleteUserApi,
  changeMyPassword,
  UserRole
} from './services/authService';

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.592c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

// Icons
const MagicIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M9.315 7.584C12.195 3.883 16.695 1.5 21.75 1.5a.75.75 0 01.75.75c0 5.056-2.383 9.555-6.084 12.436-.067.052-.142.093-.223.121l-4.432 1.477a.525.525 0 01-.676-.534l.27-4.262a1.8 1.8 0 00-.077-.96l-1.984-5.011z" clipRule="evenodd" />
    <path d="M7.5 13.5h-.75a3 3 0 00-3 3v2.25H6a.75.75 0 010 1.5H3.75A.75.75 0 013 18.75V16.5a4.5 4.5 0 014.5-4.5h.75a.75.75 0 010 1.5zM12.75 12a.75.75 0 00-1.5 0v3a.75.75 0 001.5 0v-3zM15 15.75a.75.75 0 00-1.5 0v1.5a.75.75 0 001.5 0v-1.5z" />
  </svg>
);

const SparklesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M11.644 1.59a.75.75 0 01.712 0l9.75 5.63a.75.75 0 010 1.298l-9.75 5.63a.75.75 0 01-.712 0l-9.75-5.63a.75.75 0 010-1.298l9.75-5.63z" />
    <path d="M11.644 12.67a.75.75 0 01.712 0l9.75 5.63a.75.75 0 010 1.298l-9.75 5.63a.75.75 0 01-.712 0l-9.75-5.63a.75.75 0 010-1.298l9.75-5.63z" />
  </svg>
);

const LoaderIcon = () => (
  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5" />
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
  </svg>
);

const App: React.FC = () => {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [view, setView] = useState<'login' | 'main' | 'admin'>('login');

  const [sourceContent, setSourceContent] = useState<string>(INITIAL_SOURCE_PLACEHOLDER);
  const [sourceMode, setSourceMode] = useState<'input' | 'generate'>('input');
  const [sceneInput, setSceneInput] = useState<string>('');
  const [isGeneratingSource, setIsGeneratingSource] = useState(false);
  const [provider, setProvider] = useState<AIProvider>(DEFAULT_PROVIDER);
  
  // API Keys Management
  const [geminiKey, setGeminiKey] = useState<string>(() => localStorage.getItem('GEMINI_API_KEY') || '');
  const [siliconflowKey, setSiliconflowKey] = useState<string>(() => localStorage.getItem('SILICONFLOW_API_KEY') || DEFAULT_SILICONFLOW_KEY);
  const [showSettings, setShowSettings] = useState(false);
  
  const [styleContent, setStyleContent] = useState<string>(INITIAL_STYLE_PLACEHOLDER);
  const [outputContent, setOutputContent] = useState<string>('<p class="text-gray-400 italic">等待生成...</p>');
  const [rawRequest, setRawRequest] = useState<string>('');
  const [rawResponse, setRawResponse] = useState<string>('');
  const [showDebug, setShowDebug] = useState(false);
  const [status, setStatus] = useState<ProcessingState>({
    isLoading: false,
    error: null,
    isSuccess: false
  });
  const [isCopied, setIsCopied] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  // Feishu State
  const [feishuTokens, setFeishuTokens] = useState<FeishuTokens | null>(() => getFeishuTokens());
  const [isCreatingFeishuDoc, setIsCreatingFeishuDoc] = useState(false);
  const [feishuDocUrl, setFeishuDocUrl] = useState<string | null>(null);
  const [feishuRequest, setFeishuRequest] = useState<string>('');
  const [feishuResponse, setFeishuResponse] = useState<string>('');
  const [showFeishuDebug, setShowFeishuDebug] = useState(false);
  const [isOutputFocused, setIsOutputFocused] = useState(false);
  const [isRefreshingFeishu, setIsRefreshingFeishu] = useState(false);

  // 管理后台状态
  const [adminUsers, setAdminUsers] = useState<AuthUser[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [newUser, setNewUser] = useState<{ username: string; password: string; role: UserRole }>({
    username: '',
    password: '',
    role: 'user'
  });
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordOld, setPasswordOld] = useState('');
  const [passwordNew, setPasswordNew] = useState('');

  // 登录表单
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Sync outputContent to outputRef when not focused
  useEffect(() => {
    if (outputRef.current && !isOutputFocused && outputContent !== outputRef.current.innerHTML) {
      outputRef.current.innerHTML = outputContent;
    }
  }, [outputContent, isOutputFocused]);

  // 初始化时获取当前登录用户
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setAuthLoading(true);
        const user = await fetchMe();
        if (cancelled) return;
        setAuthUser(user);
        if (user) {
          setView('main');
        } else {
          setView('login');
        }
      } catch (e: any) {
        if (!cancelled) {
          setAuthError(e.message || '获取登录状态失败');
          setView('login');
        }
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Listen for Feishu Auth Success
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'FEISHU_AUTH_SUCCESS') {
        const tokens = event.data.tokens;
        saveFeishuTokens(tokens);
        setFeishuTokens(tokens);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleLogin = async () => {
    if (!loginUsername.trim() || !loginPassword.trim()) {
      setAuthError('请输入用户名和密码');
      return;
    }
    try {
      setAuthError(null);
      setAuthLoading(true);
      const user = await loginApi(loginUsername.trim(), loginPassword);
      setAuthUser(user);
      setLoginPassword('');
      setView('main');
    } catch (e: any) {
      setAuthError(e.message || '登录失败');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutApi();
    setAuthUser(null);
    setView('login');
  };

  const openAdminView = async () => {
    setView('admin');
    setAdminError(null);
    setAdminLoading(true);
    try {
      const users = await listUsers();
      setAdminUsers(users);
    } catch (e: any) {
      setAdminError(e.message || '加载用户列表失败');
    } finally {
      setAdminLoading(false);
    }
  };

  const refreshUsers = async () => {
    setAdminLoading(true);
    try {
      const users = await listUsers();
      setAdminUsers(users);
    } catch (e: any) {
      setAdminError(e.message || '加载用户列表失败');
    } finally {
      setAdminLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.username.trim() || !newUser.password.trim()) {
      setAdminError('请填写用户名和密码');
      return;
    }
    try {
      setAdminError(null);
      await createUserApi({
        username: newUser.username.trim(),
        password: newUser.password,
        role: newUser.role,
      });
      setNewUser({ username: '', password: '', role: 'user' });
      await refreshUsers();
    } catch (e: any) {
      setAdminError(e.message || '创建用户失败');
    }
  };

  const handleToggleUserActive = async (user: AuthUser) => {
    try {
      setAdminError(null);
      await updateUserApi(user.id, { is_active: !user.is_active });
      await refreshUsers();
    } catch (e: any) {
      setAdminError(e.message || '更新用户失败');
    }
  };

  const handleChangeUserRole = async (user: AuthUser, role: UserRole) => {
    try {
      setAdminError(null);
      await updateUserApi(user.id, { role });
      await refreshUsers();
    } catch (e: any) {
      setAdminError(e.message || '更新用户失败');
    }
  };

  const handleDeleteUser = async (user: AuthUser) => {
    if (!window.confirm(`确认删除用户 ${user.username} 吗？`)) return;
    try {
      setAdminError(null);
      await deleteUserApi(user.id);
      await refreshUsers();
    } catch (e: any) {
      setAdminError(e.message || '删除用户失败');
    }
  };

  const handleResetUserPassword = async (user: AuthUser) => {
    const pwd = window.prompt(`为用户 ${user.username} 设置新密码：`);
    if (!pwd) return;
    try {
      setAdminError(null);
      await resetUserPassword(user.id, pwd);
      alert('密码重置成功');
    } catch (e: any) {
      setAdminError(e.message || '重置密码失败');
    }
  };

  const handleChangeMyPassword = async () => {
    if (!passwordOld || !passwordNew) {
      setStatus(prev => ({ ...prev, error: "请填写完整原密码和新密码" }));
      return;
    }
    try {
      await changeMyPassword(passwordOld, passwordNew);
      setPasswordOld('');
      setPasswordNew('');
      setPasswordModalOpen(false);
      setStatus(prev => ({ ...prev, error: null }));
    } catch (e: any) {
      setStatus(prev => ({ ...prev, error: e.message || "修改密码失败" }));
    }
  };

  const handleFeishuConnect = async () => {
    try {
      const response = await fetch('/api/auth/feishu/url');
      const { url } = await response.json();
      window.open(url, 'feishu_auth', 'width=600,height=700');
    } catch (err) {
      console.error("Failed to get Feishu auth URL", err);
      setStatus(prev => ({ ...prev, error: "获取飞书授权链接失败" }));
    }
  };

  const handleCreateFeishuDoc = async () => {
    if (!feishuTokens || !outputContent || !status.isSuccess) return;

    setIsCreatingFeishuDoc(true);
    setFeishuDocUrl(null);
    setFeishuRequest('');
    setFeishuResponse('');
    
    try {
      // Extract first title for document name
      const parser = new DOMParser();
      const doc = parser.parseFromString(outputContent, 'text/html');
      const h1Element = doc.querySelector('h1');
      const extractedTitle = h1Element?.textContent?.replace(/[\n\r\t]/g, "").trim() || doc.querySelector('h2')?.textContent?.replace(/[\n\r\t]/g, "").trim() || "智能风格迁移文档";

      let title = extractedTitle;
      // Generate fallback title if it doesn't match the expected format
      if (!title.startsWith("【")) {
        const today = new Date();
        const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const titleName = sceneInput.trim() || title;
        title = `【${formattedDate}】 - ${titleName}`;
      }

      // Remove the h1 element from the document body so it doesn't duplicate as content
      if (h1Element) {
        h1Element.remove();
      }
      const contentForFeishu = doc.body.innerHTML;

      // Prepare debug request info
      const { convertHtmlToFeishuBlocks } = await import('./services/feishuService');
      const blocks = convertHtmlToFeishuBlocks(contentForFeishu);
      
      // 严格按照发送给后端的 Payload 结构记录调试信息
      const requestPayload = {
        title,
        index: 0,
        children: blocks
      };
      setFeishuRequest(JSON.stringify(requestPayload, null, 2));

      const result = await createFeishuDoc(title, contentForFeishu, feishuTokens);
      
      // Update tokens in state if they were refreshed in the service
      const latestTokens = getFeishuTokens();
      if (latestTokens && latestTokens.access_token !== feishuTokens.access_token) {
        setFeishuTokens(latestTokens);
      }
      
      setFeishuResponse(JSON.stringify(result, null, 2));
      setFeishuDocUrl(result.url);
      setIsCopied(true); // Reuse copied state for a brief success highlight
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err: any) {
      console.error("Feishu Doc Creation Error:", err);
      setFeishuResponse(JSON.stringify(err.response?.data || { error: err.message }, null, 2));
      setStatus(prev => ({ ...prev, error: err.message || "创建飞书文档失败" }));
    } finally {
      setIsCreatingFeishuDoc(false);
    }
  };

  const handleFeishuDisconnect = () => {
    clearFeishuTokens();
    setFeishuTokens(null);
    setFeishuDocUrl(null);
  };

  const handleRefreshFeishuTokens = async () => {
    if (!feishuTokens?.refresh_token) return;
    
    setIsRefreshingFeishu(true);
    try {
      const newTokens = await refreshFeishuTokens(feishuTokens.refresh_token);
      setFeishuTokens(newTokens);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err: any) {
      console.error("Failed to refresh Feishu tokens", err);
      setStatus(prev => ({ ...prev, error: "刷新飞书 Token 失败: " + err.message }));
    } finally {
      setIsRefreshingFeishu(false);
    }
  };

  const handleGenerate = useCallback(async (overrideSourceContent?: string | React.MouseEvent) => {
    const actualOverride = typeof overrideSourceContent === 'string' ? overrideSourceContent : undefined;
    const contentToUse = actualOverride || sourceContent;
    // 基础校验
    if (!contentToUse || contentToUse === INITIAL_SOURCE_PLACEHOLDER || contentToUse.trim() === "") {
      setStatus(prev => ({ ...prev, error: "请填写源文本后再试。" }));
      return;
    }
    if (!styleContent || styleContent.trim() === "") {
      setStatus(prev => ({ ...prev, error: "请填写参考风格后再试。" }));
      return;
    }

    setStatus({ isLoading: true, error: null, isSuccess: false });
    setIsCopied(false);
    setOutputContent('<p class="text-gray-400 animate-pulse text-center py-12">正在提取视觉基因并重构内容...</p>');
    setRawRequest('');
    setRawResponse('');

    try {
      const result = await transformTextStyle(
        contentToUse, 
        styleContent, 
        provider, 
        {
          gemini: geminiKey,
          siliconflow: siliconflowKey
        },
        (chunk, req, res) => {
          if (chunk) setOutputContent(chunk);
          if (req) setRawRequest(req);
          if (res) setRawResponse(res);
        }
      );
      setOutputContent(result);
      setStatus({ isLoading: false, error: null, isSuccess: true });
    } catch (err: any) {
      console.error(err);
      let errorMessage = err.message || "生成失败，请检查网络或 API Key。";
      
      // 针对余额不足的特定提示
      const isBalanceError = errorMessage.includes('insufficient') || errorMessage.includes('余额不足');
      // 针对限流 429 的特定提示
      const isRateLimitError = errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('quota');
      
      setStatus({ 
        isLoading: false, 
        error: errorMessage, 
        isSuccess: false 
      });
      
      setOutputContent(`<div class="text-red-500 p-4 bg-red-50 rounded-xl border border-red-100">
        <p class="font-bold mb-2">生成过程中发生错误：</p>
        <p class="text-sm opacity-80">${errorMessage}</p>
        ${isBalanceError ? `
          <div class="mt-4 p-3 bg-white/50 rounded-lg border border-red-200 text-xs text-red-700">
            <strong>💡 建议方案：</strong><br/>
            检测到硅基流动账户余额不足。请在顶部切换到 <b>Gemini</b> 模型继续免费使用，或在设置中更新您的 API Key。
          </div>
        ` : ''}
        ${isRateLimitError ? `
          <div class="mt-4 p-3 bg-white/50 rounded-lg border border-red-200 text-xs text-red-700">
            <strong>💡 建议方案：</strong><br/>
            检测到 API 请求频率过高或额度耗尽（429 限流）。<br/>
            1. <b>模型降级</b>：请在顶部切换为 <b>Gemini Fast</b> 模型，它的免费额度远高于 Pro 模型。<br/>
            2. <b>稍后重试</b>：请等待 1-2 分钟后再点击“一键生成并迁移风格”。<br/>
            3. <b>配置专属 Key</b>：在右上角“设置”中填入您自己的 API Key 以提升额度。
          </div>
        ` : ''}
      </div>`);
    }
  }, [sourceContent, styleContent, provider, geminiKey, siliconflowKey]);

  const handleGenerateSource = useCallback(async () => {
    if (!sceneInput.trim()) {
      setStatus(prev => ({ ...prev, error: "请输入场景描述后再试。" }));
      return;
    }

    setIsGeneratingSource(true);
    setStatus({ isLoading: false, error: null, isSuccess: false });
    setRawRequest('');
    setRawResponse('');

    try {
      const generated = await generateSourceContent(
        sceneInput, 
        provider, 
        {
          gemini: geminiKey,
          siliconflow: siliconflowKey
        },
        (chunk, req, res) => {
          if (chunk) {
            const htmlGenerated = chunk
              .split('\n')
              .map(line => line.trim() ? `<p>${line}</p>` : '<br/>')
              .join('');
            setSourceContent(htmlGenerated);
          }
          if (req) setRawRequest(req);
          if (res) setRawResponse(res);
        }
      );
      // 将换行符转换为 <p> 标签以适配 RichInput
      const htmlGenerated = generated
        .split('\n')
        .map(line => line.trim() ? `<p>${line}</p>` : '<br/>')
        .join('');
      setSourceContent(htmlGenerated);
      setSourceMode('input'); // 生成后切回输入模式查看结果
      
      // 自动触发风格迁移
      setTimeout(() => {
        handleGenerate(htmlGenerated);
      }, 500);
    } catch (err: any) {
      console.error(err);
      const errorMessage = err.message || "生成源文本失败，请重试。";
      const isRateLimitError = errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('quota');
      
      setStatus({ 
        isLoading: false, 
        error: errorMessage, 
        isSuccess: false 
      });
      setSourceContent(`<div class="text-red-500 p-4 bg-red-50 rounded-xl border border-red-100">
        <p class="font-bold mb-2">生成失败：</p>
        <p class="text-sm opacity-80">${errorMessage}</p>
        ${isRateLimitError ? `
          <div class="mt-4 p-3 bg-white/50 rounded-lg border border-red-200 text-xs text-red-700">
            <strong>💡 建议方案：</strong><br/>
            检测到 API 请求频率过高或额度耗尽（429 限流）。<br/>
            1. <b>模型降级</b>：请在顶部切换为 <b>Gemini Fast</b> 模型，它的免费额度远高于 Pro 模型。<br/>
            2. <b>稍后重试</b>：请等待 1-2 分钟后再重新生成。<br/>
            3. <b>配置专属 Key</b>：在右上角“设置”中填入您自己的 API Key 以提升额度。
          </div>
        ` : ''}
      </div>`);
    } finally {
      setIsGeneratingSource(false);
    }
  }, [sceneInput, provider, geminiKey, siliconflowKey, handleGenerate]);

  const handleSaveSettings = () => {
    localStorage.setItem('GEMINI_API_KEY', geminiKey);
    localStorage.setItem('SILICONFLOW_API_KEY', siliconflowKey);
    setShowSettings(false);
  };

  const handleCopy = useCallback(async () => {
    if (!outputContent || !status.isSuccess) return;

    try {
      // 为了让不同平台（Word, 微信, 钉钉, 邮件等）都能完美识别格式，
      // 我们需要构建一个包含完整内联样式的 HTML 包装器。
      // 这里的内联样式能确保粘贴后字体、字号、颜色和行高保持一致。
      const styledWrapper = `
        <div style="font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif; font-size: 14px; line-height: 1.6; color: #000000;">
          ${outputContent}
        </div>
      `;

      // 使用现代 Clipboard API 写入富文本 (text/html) 和 纯文本 (text/plain)
      const htmlBlob = new Blob([styledWrapper], { type: 'text/html' });
      const plainText = outputRef.current?.innerText || "";
      const textBlob = new Blob([plainText], { type: 'text/plain' });

      const clipboardItem = new ClipboardItem({
        'text/html': htmlBlob,
        'text/plain': textBlob
      });

      await navigator.clipboard.write([clipboardItem]);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("富文本复制失败，尝试回退到纯文本复制", err);
      try {
        const plainText = outputRef.current?.innerText || "";
        await navigator.clipboard.writeText(plainText);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (fallbackErr) {
        setStatus(prev => ({ ...prev, error: "复制失败，请手动选中文本并复制。" }));
      }
    }
  }, [outputContent, status.isSuccess]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-500">正在加载...</div>
      </div>
    );
  }

  if (!authUser || view === 'login') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200">
                <MagicIcon />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800">智能文本风格迁移助手</h1>
                <p className="text-xs text-slate-400 mt-1">请先登录后使用与管理用户</p>
              </div>
            </div>
          </div>
          {authError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs">
              {authError}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">用户名</label>
              <input
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                autoComplete="username"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
                placeholder="请输入用户名"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">密码</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
                placeholder="请输入密码"
              />
            </div>
            <Button
              onClick={handleLogin}
              disabled={authLoading}
              className="w-full font-bold py-2.5 rounded-xl"
            >
              {authLoading ? '正在登录...' : '登录'}
            </Button>
            <p className="text-[10px] text-slate-400 mt-2">
              首次使用：请在后端调用 <code>/api/auth/init-admin</code> 初始化管理员账号。
            </p>
          </div>
        </div>
      </div>
    );
  }

  const renderAdminView = () => (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800">用户管理后台</h2>
          <p className="text-xs text-slate-400 mt-1">新增/禁用用户、设置角色和重置密码</p>
        </div>
        <Button onClick={() => setView('main')} className="text-xs px-4 py-2 rounded-xl">
          返回助手
        </Button>
      </div>
      {adminError && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs">
          {adminError}
        </div>
      )}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">新增用户</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs text-slate-500 mb-1">用户名</label>
            <input
              value={newUser.username}
              onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">初始密码</label>
            <input
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">角色</label>
            <select
              value={newUser.role}
              onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value as UserRole }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
            >
              <option value="user">普通用户</option>
              <option value="admin">管理员</option>
            </select>
          </div>
          <div>
            <Button onClick={handleCreateUser} className="w-full text-sm py-2.5 rounded-xl">
              创建
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">用户列表</h3>
          <button
            onClick={refreshUsers}
            className="text-xs text-slate-400 hover:text-indigo-500"
          >
            刷新
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">ID</th>
                <th className="px-4 py-2 text-left font-semibold">用户名</th>
                <th className="px-4 py-2 text-left font-semibold">角色</th>
                <th className="px-4 py-2 text-left font-semibold">状态</th>
                <th className="px-4 py-2 text-left font-semibold">创建时间</th>
                <th className="px-4 py-2 text-left font-semibold">操作</th>
              </tr>
            </thead>
            <tbody>
              {adminLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    加载中...
                  </td>
                </tr>
              ) : adminUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    暂无用户
                  </td>
                </tr>
              ) : (
                adminUsers.map((u) => (
                  <tr key={u.id} className="border-t border-slate-100">
                    <td className="px-4 py-2">{u.id}</td>
                    <td className="px-4 py-2">{u.username}</td>
                    <td className="px-4 py-2">
                      <select
                        value={u.role}
                        onChange={(e) => handleChangeUserRole(u, e.target.value as UserRole)}
                        className="px-2 py-1 rounded-lg border border-slate-200 text-xs"
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => handleToggleUserActive(u)}
                        className={`px-2 py-1 rounded-full text-[10px] font-semibold ${
                          u.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {u.is_active ? '启用中' : '已禁用'}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-slate-400">
                      {new Date(u.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 space-x-2">
                      <button
                        onClick={() => handleResetUserPassword(u)}
                        className="text-xs text-indigo-500 hover:underline"
                      >
                        重置密码
                      </button>
                      {authUser.id !== u.id && (
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="text-xs text-rose-500 hover:underline"
                        >
                          删除
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200">
               <MagicIcon />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              视觉文本克隆助手
            </h1>
          </div>
          <div className="flex items-center space-x-4">
             <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button 
                  onClick={() => setProvider('gemini-fast')}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all ${provider === 'gemini-fast' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Gemini Fast
                </button>
                <button 
                  onClick={() => setProvider('gemini-pro')}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all ${provider === 'gemini-pro' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Gemini Pro
                </button>
                <button 
                  onClick={() => setProvider('siliconflow')}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all ${provider === 'siliconflow' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  硅基流动
                </button>
             </div>
             <button 
               onClick={() => setShowSettings(true)}
               className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
               title="设置 API Key"
             >
               <SettingsIcon />
             </button>
             {authUser && (
               <div className="flex items-center space-x-2 text-xs text-slate-500">
                 <span className="px-2 py-1 rounded-full bg-slate-100 border border-slate-200">
                   {authUser.username}（{authUser.role === 'admin' ? '管理员' : '用户'}）
                 </span>
                 {authUser.role === 'admin' && (
                   <button
                     onClick={openAdminView}
                     className="px-2 py-1 rounded-full border border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                   >
                     管理后台
                   </button>
                 )}
                 <button
                   onClick={() => setPasswordModalOpen(true)}
                   className="p-1 text-slate-400 hover:text-indigo-600"
                   title="修改密码"
                 >
                   <Key size={16} />
                 </button>
                 <button
                   onClick={handleLogout}
                   className="p-1 text-slate-400 hover:text-rose-500"
                   title="退出登录"
                 >
                   <LogOut size={16} />
                 </button>
               </div>
             )}
          </div>
        </div>
      </header>

      {view === 'admin' ? (
        renderAdminView()
      ) : (
      <main className="max-w-7xl mx-auto px-4 py-8">
        {status.error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 flex items-center animate-in fade-in slide-in-from-top-4 duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-sm font-semibold">{status.error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* 输入部分 */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col group transition-all hover:shadow-md">
              <div className="px-5 pt-5 flex items-center justify-between">
                <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl">
                  <button 
                    onClick={() => setSourceMode('input')}
                    className={`text-[10px] uppercase tracking-wider font-bold px-4 py-2 rounded-lg transition-all ${sourceMode === 'input' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    手动输入模式
                  </button>
                  <button 
                    onClick={() => setSourceMode('generate')}
                    className={`text-[10px] uppercase tracking-wider font-bold px-4 py-2 rounded-lg transition-all ${sourceMode === 'generate' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    AI 场景生成模式
                  </button>
                </div>
              </div>
              <div className="p-5 flex-grow">
                {sourceMode === 'input' ? (
                  <RichInput 
                    label="1. 源文本 (核心内容)" 
                    value={sourceContent}
                    onChange={setSourceContent}
                    placeholderHtml={INITIAL_SOURCE_PLACEHOLDER}
                    minHeight="h-44 lg:h-48"
                  />
                ) : (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex flex-col">
                      <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        输入场景描述
                      </label>
                      <textarea
                        value={sceneInput}
                        onChange={(e) => setSceneInput(e.target.value)}
                        placeholder="例如：一次完整的需求评审、紧急线上 Bug 修复讨论、新功能头脑风暴..."
                        className="w-full h-32 p-4 rounded-xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all resize-none text-gray-800 text-sm leading-relaxed"
                      />
                    </div>
                    <Button 
                      onClick={handleGenerateSource} 
                      disabled={isGeneratingSource}
                      className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
                    >
                      {isGeneratingSource ? (
                        <>
                          <LoaderIcon />
                          <span>正在构思对话细节...</span>
                        </>
                      ) : (
                        <>
                          <SparklesIcon />
                          <span>生成对话式源文本</span>
                        </>
                      )}
                    </Button>
                    <p className="text-[10px] text-slate-400 text-center italic">
                      提示：生成后会自动填充到“手动输入模式”中，您可以继续微调。
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col group transition-all hover:shadow-md">
              <div className="p-5 flex-grow">
                <RichInput 
                  label="2. 参考风格 (在此粘贴模版)" 
                  value={styleContent}
                  onChange={setStyleContent}
                  placeholderHtml={INITIAL_STYLE_PLACEHOLDER}
                  minHeight="h-44 lg:h-48"
                  bgColor="bg-indigo-50/10"
                />
              </div>
              <div className="px-5 pb-4">
                 <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-medium italic">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>提示：直接粘贴带颜色、粗体、列表的文字，AI 会精准提取所有视觉样式并应用。</span>
                 </div>
              </div>
            </div>

            <Button 
              onClick={handleGenerate} 
              disabled={status.isLoading}
              className="w-full text-lg font-bold shadow-xl shadow-indigo-200/50 h-14 rounded-2xl transition-transform active:scale-95"
            >
              {status.isLoading ? (
                <>
                  <LoaderIcon />
                  <span>正在深度复刻视觉风格...</span>
                </>
              ) : (
                <>
                  <MagicIcon />
                  <span>立即执行风格迁移</span>
                </>
              )}
            </Button>
          </div>

          {/* 输出部分 */}
          <div className="lg:col-span-5 h-full min-h-[500px]">
             <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl h-full flex flex-col overflow-hidden ring-1 ring-slate-100">
                <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-4 flex justify-between items-center">
                  <h2 className="text-sm font-bold text-slate-700 flex items-center">
                    <span className="w-1.5 h-4 bg-indigo-500 rounded-full mr-2.5"></span>
                    3. 改写结果
                  </h2>

                  <div className="flex items-center space-x-2">
                    {outputContent && outputContent !== '<p class="text-gray-400 animate-pulse text-center py-12">正在提取视觉基因并重构内容...</p>' && (
                      <button 
                        onClick={() => {
                          setOutputContent('');
                          setFeishuDocUrl(null);
                          setStatus(prev => ({ ...prev, isSuccess: false }));
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                        title="清空结果"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}

                    {status.isSuccess && (
                      <div className="flex items-center space-x-2">
                      {feishuTokens ? (
                        <div className="flex items-center space-x-2">
                          {feishuDocUrl ? (
                            <a 
                              href={feishuDocUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition-all"
                            >
                              <ExternalLink size={14} />
                              <span>打开飞书文档</span>
                            </a>
                          ) : (
                            <button
                              onClick={handleCreateFeishuDoc}
                              disabled={isCreatingFeishuDoc}
                              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50"
                            >
                              {isCreatingFeishuDoc ? <RefreshCw size={14} className="animate-spin" /> : <FileText size={14} />}
                              <span>{isCreatingFeishuDoc ? '正在创建...' : '同步至飞书'}</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={handleFeishuConnect}
                          className="flex items-center space-x-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all"
                        >
                          <Layout size={14} />
                          <span>授权飞书</span>
                        </button>
                      )}

                      <button
                        onClick={handleCopy}
                        title="一键复制并完美保留所有格式"
                        className={`
                          flex items-center space-x-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300
                          ${isCopied 
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 scale-105' 
                            : 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300'}
                        `}
                      >
                        {isCopied ? <CheckIcon /> : <CopyIcon />}
                        <span>{isCopied ? '复制成功' : '一键复制'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-grow p-8 bg-white overflow-y-auto">
                    <div 
                      ref={outputRef}
                      className={`prose prose-slate prose-sm max-w-none rich-editor-content leading-relaxed outline-none min-h-[400px] relative ${!status.isLoading ? 'cursor-text' : 'cursor-default'}`}
                      data-placeholder="在此处手动录入或修改改写结果，点击下方按钮同步至飞书..."
                      contentEditable={!status.isLoading}
                      onInput={(e) => {
                        setOutputContent(e.currentTarget.innerHTML);
                        // If user manually types, we should mark it as success to enable copy/feishu buttons
                        if (e.currentTarget.innerHTML.trim() !== "" && !status.isSuccess) {
                          setStatus(prev => ({ ...prev, isSuccess: true }));
                        }
                      }}
                      onFocus={() => setIsOutputFocused(true)}
                      onBlur={() => setIsOutputFocused(false)}
                      suppressContentEditableWarning={true}
                    />
                    
                    {(rawRequest || rawResponse) && (
                      <div className="mt-8 border-t border-slate-100 pt-6">
                        <button 
                          onClick={() => setShowDebug(!showDebug)}
                          className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-indigo-500 transition-colors flex items-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 mr-1 transition-transform ${showDebug ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                          {showDebug ? '隐藏请求详情' : '查看请求详情 (调试用)'}
                        </button>
                        
                        {showDebug && (
                          <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
                            {rawRequest && (
                              <div className="space-y-1.5">
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Raw Request</span>
                                <pre className="p-3 bg-slate-900 text-slate-300 text-[10px] rounded-lg overflow-x-auto font-mono">
                                  {rawRequest}
                                </pre>
                              </div>
                            )}
                            {rawResponse && (
                              <div className="space-y-1.5">
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Raw Response (Streamed)</span>
                                <pre className="p-3 bg-slate-900 text-slate-300 text-[10px] rounded-lg overflow-x-auto font-mono whitespace-pre-wrap">
                                  {rawResponse}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Feishu Debug Section */}
                    {(feishuRequest || feishuResponse) && (
                      <div className="mt-8 border-t border-slate-100 pt-6">
                        <button 
                          onClick={() => setShowFeishuDebug(!showFeishuDebug)}
                          className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest hover:text-indigo-600 transition-colors flex items-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 mr-1 transition-transform ${showFeishuDebug ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                          {showFeishuDebug ? '隐藏飞书请求详情' : '查看飞书请求详情 (调试用)'}
                        </button>
                        
                        {showFeishuDebug && (
                          <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
                            {feishuRequest && (
                              <div className="space-y-1.5">
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Feishu Request Payload</span>
                                <pre className="p-3 bg-slate-900 text-slate-300 text-[10px] rounded-lg overflow-x-auto font-mono">
                                  {feishuRequest}
                                </pre>
                              </div>
                            )}
                            {feishuResponse && (
                              <div className="space-y-1.5">
                                <span className="text-[9px] font-bold text-slate-400 uppercase">Feishu Response</span>
                                <pre className="p-3 bg-slate-900 text-slate-300 text-[10px] rounded-lg overflow-x-auto font-mono whitespace-pre-wrap">
                                  {feishuResponse}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {status.isSuccess && feishuTokens && !feishuDocUrl && (
                      <div className="mt-8 flex justify-center">
                        <button
                          onClick={handleCreateFeishuDoc}
                          disabled={isCreatingFeishuDoc}
                          className="flex items-center space-x-2 px-8 py-3 rounded-2xl text-sm font-bold bg-indigo-600 text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                        >
                          {isCreatingFeishuDoc ? <RefreshCw size={18} className="animate-spin" /> : <FileText size={18} />}
                          <span>{isCreatingFeishuDoc ? '正在同步至飞书...' : '一键同步至飞书文档'}</span>
                        </button>
                      </div>
                    )}
                </div>
                {status.isSuccess && !isCopied && (
                   <div className="px-6 py-2 bg-slate-50 border-t border-slate-100 text-center animate-in fade-in duration-700">
                      <p className="text-[10px] text-slate-400">点击复制后可直接粘贴至 Word、邮件或微信，完美保留字体、色号与粗体。</p>
                   </div>
                )}
             </div>
          </div>

        </div>
      </main>
      )}
      
      <footer className="max-w-7xl mx-auto px-4 mt-8 text-center">
         <div className="inline-flex items-center space-x-4 text-[10px] text-slate-400 font-medium">
           <span>基于 {provider === 'gemini-fast' ? 'Gemini 3 Flash' : provider === 'gemini-pro' ? 'Gemini 3 Pro' : 'DeepSeek-V3'} 旗舰模型</span>
           <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
           <span>全量视觉样式提取引擎</span>
           <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
           <span>内联 CSS 格式保留技术</span>
         </div>
      </footer>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 flex items-center">
                <SettingsIcon />
                <span className="ml-2">API Key 配置</span>
              </h3>
              <button 
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gemini API Key</label>
                <input 
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="输入您的 Gemini API Key"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm"
                />
                <p className="text-[10px] text-slate-400">留空则尝试使用环境变量配置。</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">硅基流动 API Key</label>
                <input 
                  type="password"
                  value={siliconflowKey}
                  onChange={(e) => setSiliconflowKey(e.target.value)}
                  placeholder="输入您的 SiliconFlow API Key"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm"
                />
                <p className="text-[10px] text-slate-400">默认已预设测试 Key，可根据需要修改。</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">飞书集成</label>
                {feishuTokens ? (
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-emerald-500 p-1.5 rounded-lg text-white">
                          <CheckIcon />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-emerald-800">已连接飞书</p>
                          <p className="text-[10px] text-emerald-600">支持一键同步富文本至飞书文档</p>
                        </div>
                      </div>
                      <button 
                        onClick={handleFeishuDisconnect}
                        className="p-2 text-rose-500 hover:bg-rose-100 rounded-lg transition-all"
                        title="断开连接"
                      >
                        <LogOut size={18} />
                      </button>
                    </div>
                    
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Access Token</span>
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={handleRefreshFeishuTokens}
                              disabled={isRefreshingFeishu}
                              className="text-[9px] text-indigo-500 hover:underline disabled:opacity-50"
                            >
                              {isRefreshingFeishu ? '刷新中...' : '手动刷新'}
                            </button>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(feishuTokens.access_token);
                                setIsCopied(true);
                                setTimeout(() => setIsCopied(false), 2000);
                              }}
                              className="text-[9px] text-indigo-500 hover:underline"
                            >
                              复制
                            </button>
                          </div>
                        </div>
                        <div className="text-[10px] font-mono bg-white p-2 rounded border border-slate-100 break-all line-clamp-2">
                          {feishuTokens.access_token}
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Refresh Token</span>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(feishuTokens.refresh_token);
                              setIsCopied(true);
                              setTimeout(() => setIsCopied(false), 2000);
                            }}
                            className="text-[9px] text-indigo-500 hover:underline"
                          >
                            复制
                          </button>
                        </div>
                        <div className="text-[10px] font-mono bg-white p-2 rounded border border-slate-100 break-all line-clamp-2">
                          {feishuTokens.refresh_token}
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">过期时间</span>
                        <span className="text-[10px] text-slate-600">
                          {(() => {
                            const savedTime = parseInt(localStorage.getItem('feishu_tokens_time') || '0');
                            if (!savedTime) return '未知';
                            const expiryDate = new Date((savedTime + feishuTokens.expires_in) * 1000);
                            return expiryDate.toLocaleString();
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={handleFeishuConnect}
                    className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all text-left flex items-center justify-between group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="bg-slate-200 p-1.5 rounded-lg text-slate-500 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                        <Layout size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700 group-hover:text-indigo-700 transition-all">连接飞书文档</p>
                        <p className="text-[10px] text-slate-400">授权后可一键创建飞书在线文档</p>
                      </div>
                    </div>
                    <ExternalLink size={16} className="text-slate-300 group-hover:text-indigo-400" />
                  </button>
                )}
              </div>
              <Button 
                onClick={handleSaveSettings}
                className="w-full font-bold py-3 rounded-xl shadow-lg shadow-indigo-100"
              >
                保存配置
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 修改密码 Modal */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center">
                <Key size={18} className="mr-2" />
                修改密码
              </h3>
              <button
                onClick={() => setPasswordModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">原密码</label>
                <input
                  type="password"
                  value={passwordOld}
                  onChange={(e) => setPasswordOld(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">新密码</label>
                <input
                  type="password"
                  value={passwordNew}
                  onChange={(e) => setPasswordNew(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                />
              </div>
              <Button onClick={handleChangeMyPassword} className="w-full font-bold py-2.5 rounded-xl">
                确认修改
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
