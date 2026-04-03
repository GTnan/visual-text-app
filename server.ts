
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import cookieParser from "cookie-parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());

  const FEISHU_APP_ID = process.env.FEISHU_APP_ID || "cli_a925630a77391cce";
  const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || "x4iQ07gNFDCIYKf0ErEnff0bXZ5cGTVu";
  
  // Use the dynamic APP_URL for redirect URI
  const APP_URL = process.env.APP_URL || "https://ais-dev-ippzvk6r2ltnc4wuhm3dui-84545006331.us-west1.run.app";
  const REDIRECT_URI = `${APP_URL}/api/auth/feishu/callback`;

  // API: Get Feishu Auth URL
  app.get("/api/auth/feishu/url", (req, res) => {
    const authUrl = `https://open.feishu.cn/open-apis/authen/v1/index?app_id=${FEISHU_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=offline_access`;
    res.json({ url: authUrl });
  });

  // API: Feishu Auth Callback (Automatic)
  app.get("/api/auth/feishu/callback", async (req, res) => {
    const { code } = req.query;
    if (!code) {
      return res.status(400).send("Missing code");
    }

    try {
      // Get app_access_token first
      const appTokenRes = await axios.post("https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal", {
        app_id: FEISHU_APP_ID,
        app_secret: FEISHU_APP_SECRET
      });
      const appAccessToken = appTokenRes.data.app_access_token;

      // Exchange code for user_access_token
      const tokenRes = await axios.post("https://open.feishu.cn/open-apis/authen/v1/access_token", {
        grant_type: "authorization_code",
        code: code
      }, {
        headers: {
          "Authorization": `Bearer ${appAccessToken}`,
          "Content-Type": "application/json"
        }
      });

      const tokens = tokenRes.data.data;
      
      // Send success message to parent window and close popup
      res.send(`
        <html>
          <head><title>授权成功</title></head>
          <body style="font-family: sans-serif; text-align: center; padding-top: 50px;">
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'FEISHU_AUTH_SUCCESS', 
                  tokens: ${JSON.stringify(tokens)} 
                }, '*');
                window.close();
              } else {
                document.body.innerHTML = '<h1>授权成功！</h1><p>您可以关闭此窗口并返回应用。</p>';
              }
            </script>
            <div style="color: #4f46e5;">
              <svg style="width: 64px; height: 64px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <h1>授权成功</h1>
              <p>正在为您跳转，请稍候...</p>
            </div>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error("Feishu Auth Error:", error.response?.data || error.message);
      res.status(500).send("Feishu authentication failed. Please check server logs.");
    }
  });

  // Keep exchange endpoint for backward compatibility if needed, but callback is preferred
  app.post("/api/auth/feishu/exchange", async (req, res) => {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: "Missing code" });
    }

    try {
      // Get app_access_token first
      const appTokenRes = await axios.post("https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal", {
        app_id: FEISHU_APP_ID,
        app_secret: FEISHU_APP_SECRET
      });
      const appAccessToken = appTokenRes.data.app_access_token;

      // Exchange code for user_access_token
      const tokenRes = await axios.post("https://open.feishu.cn/open-apis/authen/v1/access_token", {
        grant_type: "authorization_code",
        code: code
      }, {
        headers: {
          "Authorization": `Bearer ${appAccessToken}`,
          "Content-Type": "application/json"
        }
      });

      if (tokenRes.data.code !== 0) {
        return res.status(400).json({ error: tokenRes.data.msg || "Exchange failed" });
      }

      res.json(tokenRes.data.data);
    } catch (error: any) {
      console.error("Feishu Exchange Error:", error.response?.data || error.message);
      res.status(500).json({ error: "Feishu token exchange failed" });
    }
  });

  // API: Refresh Feishu Token
  app.post("/api/auth/feishu/refresh", async (req, res) => {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return res.status(400).json({ error: "Missing refresh_token" });
    }

    try {
      const appTokenRes = await axios.post("https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal", {
        app_id: FEISHU_APP_ID,
        app_secret: FEISHU_APP_SECRET
      });
      const appAccessToken = appTokenRes.data.app_access_token;

      const refreshRes = await axios.post("https://open.feishu.cn/open-apis/authen/v1/refresh_access_token", {
        grant_type: "refresh_token",
        refresh_token: refresh_token
      }, {
        headers: {
          "Authorization": `Bearer ${appAccessToken}`,
          "Content-Type": "application/json"
        }
      });

      res.json(refreshRes.data.data);
    } catch (error: any) {
      console.error("Feishu Refresh Error:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to refresh token" });
    }
  });

  // API: Create Feishu Document
  app.post("/api/feishu/create-doc", async (req, res) => {
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
    const { children } = req.body;

    if (!accessToken) {
      return res.status(401).json({ error: "Missing Feishu access token" });
    }

    try {
      const docTitle = req.body.title || "智能风格迁移文档";
      let document_id = "";
      let revision_id = -1;
      let docUrl = "";

      // 1. Try to find the "随笔记录" Wiki space
      let targetSpaceId = null;
      try {
        const spacesRes = await axios.get("https://open.feishu.cn/open-apis/wiki/v2/spaces", {
          headers: { "Authorization": `Bearer ${accessToken}` }
        });
        if (spacesRes.data.code === 0 && spacesRes.data.data?.items) {
          const space = spacesRes.data.data.items.find((s: any) => s.name === "随笔记录");
          if (space) {
            targetSpaceId = space.space_id;
          }
        }
      } catch (err: any) {
        console.warn("Failed to fetch wiki spaces, falling back to root folder", err.response?.data || err.message);
      }

      // 2. Create Document
      if (targetSpaceId) {
        // Create in Wiki Space
        const createNodeRes = await axios.post(`https://open.feishu.cn/open-apis/wiki/v2/spaces/${targetSpaceId}/nodes`, {
          obj_type: "docx",
          node_type: "origin",
          title: docTitle
        }, {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          }
        });

        if (createNodeRes.data.code !== 0) {
          console.error("Feishu Create Wiki Node Error:", createNodeRes.data);
          return res.status(400).json({ 
            error: createNodeRes.data.msg || "Failed to create wiki document",
            details: createNodeRes.data
          });
        }
        document_id = createNodeRes.data.data.node.obj_token;
        docUrl = createNodeRes.data.data.node.url;
        
        // Fetch document details to get revision_id
        const docRes = await axios.get(`https://open.feishu.cn/open-apis/docx/v1/documents/${document_id}`, {
          headers: { "Authorization": `Bearer ${accessToken}` }
        });
        revision_id = docRes.data.data.document.revision_id;
      } else {
        // Fallback: Create in Root Folder
        const createDocRes = await axios.post("https://open.feishu.cn/open-apis/docx/v1/documents", {
          title: docTitle
        }, {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          }
        });

        if (createDocRes.data.code !== 0) {
          console.error("Feishu Create Doc Error:", createDocRes.data);
          return res.status(400).json({ 
            error: createDocRes.data.msg || "Failed to create document",
            details: createDocRes.data
          });
        }

        document_id = createDocRes.data.data.document.document_id;
        revision_id = createDocRes.data.data.document.revision_id;
        docUrl = `https://feishu.cn/docx/${document_id}`;
      }

      // 3. Add Blocks (Actual content)
      if (children && children.length > 0) {
        // Feishu API has a limit of 50 blocks per request
        const chunkSize = 50;
        let currentRevisionId = revision_id;
        let currentIndex = 0; // Insert at the beginning, then append

        for (let i = 0; i < children.length; i += chunkSize) {
          const chunk = children.slice(i, i + chunkSize);
          const payload = {
            children: chunk,
            index: currentIndex
          };

          console.log(`Feishu Add Blocks Request Payload (Chunk ${i / chunkSize + 1}):`, JSON.stringify(payload, null, 2));

          const childrenRes = await axios.post(`https://open.feishu.cn/open-apis/docx/v1/documents/${document_id}/blocks/${document_id}/children?document_revision_id=${currentRevisionId}`, payload, {
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json"
            }
          });

          if (childrenRes.data.code !== 0) {
            console.error("Feishu Add Blocks Error:", childrenRes.data);
            return res.status(400).json({ 
              error: childrenRes.data.msg || "Failed to add content blocks",
              details: childrenRes.data
            });
          }

          // Update revision_id for the next chunk
          currentRevisionId = childrenRes.data.data.document_revision_id;
          currentIndex += chunk.length;
        }
      }

      res.json({ 
        success: true, 
        document_id: document_id,
        url: docUrl
      });
    } catch (error: any) {
      console.error("Feishu Doc Creation Error:", error.response?.data || error.message);
      res.status(500).json({ error: error.response?.data?.msg || "Failed to create Feishu document" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
