// ==UserScript==
// @name         Tideborn Faction Command
// @namespace    tideborn.legion
// @version      0.15.2
// @description  Modular faction leadership command center for Torn with member management, war, chain, OC, recruitment, armory, finance, analytics, and GitHub auto-updates.
// @author       Leviath4n / Tideborn Legion
// @homepageURL  https://github.com/Leviath4n-work/tideborn-faction-command
// @supportURL   https://github.com/Leviath4n-work/tideborn-faction-command/issues
// @updateURL    https://raw.githubusercontent.com/Leviath4n-work/tideborn-faction-command/main/tideborn-faction-command.meta.js
// @downloadURL  https://raw.githubusercontent.com/Leviath4n-work/tideborn-faction-command/main/tideborn-faction-command.user.js
// @match        https://www.torn.com/*
// @match        https://torn.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_xmlhttpRequest
// @connect      api.torn.com
// @connect      raw.githubusercontent.com
// @run-at       document-idle
// ==/UserScript==

(() => {
    'use strict';

    const APP = {
        id: 'tideborn-faction-command',
        name: 'Tideborn Faction Command',
        short: 'TFC',
        version: '0.15.2',
        apiBase: 'https://api.torn.com/v2',
        apiComment: 'TidebornFC',
        storagePrefix: 'tfc:',
        repoUrl: 'https://github.com/Leviath4n-work/tideborn-faction-command',
        updateMetaUrl: 'https://raw.githubusercontent.com/Leviath4n-work/tideborn-faction-command/main/tideborn-faction-command.meta.js',
        downloadUrl: 'https://raw.githubusercontent.com/Leviath4n-work/tideborn-faction-command/main/tideborn-faction-command.user.js',
    };

    const DEFAULTS = {
        apiKey: '',
        startTab: 'overview',
        rosterCacheSeconds: 60,
        intelCacheHours: 12,
        inactivityHours: 24,
        historyDays: 120,
        panelWidth: 1180,
        compactRows: false,
        memberMetricWindow: 30,
        warAutoRefreshSeconds: 30,
        warRosterCacheSeconds: 20,
        warHospitalSoonMinutes: 15,
        warRecentReleaseMinutes: 10,
        warActivitySampleSeconds: 300,
        warHistoryLimit: 25,
        payoutDefaultMemberPercent: 90,
        payoutDefaultMode: 'hits',
        payoutDefaultAssistWeight: 0,
        payoutDefaultMinRespect: 0,
        payoutDefaultMinHits: 0,
        payoutDefaultHybridRespectPercent: 50,
        payoutDefaultRoundTo: 1000,
        chainAutoRefreshSeconds: 30,
        chainDangerSeconds: 120,
        chainWarningSeconds: 240,
        chainHistoryLimit: 20,
        chainCoverageHours: 24,
        ocAutoRefreshSeconds: 60,
        ocLowCprThreshold: 70,
        ocHistoryLimit: 250,
        recruitIntelCacheHours: 24,
        recruitHistoryLimit: 1000,
        recruitReferralDefaultAmount: 10000000,
        armoryInventoryCacheMinutes: 60,
        armoryNewsDays: 7,
        armoryHistoryDays: 180,
        financeNewsDays: 30,
        financeManualLimit: 2000,
        financeOcMemberPercent: 80,
        analyticsHistoryDays: 365,
        leadershipEventLimit: 120,
    };

    const STAT_NAMES = [
        'xantaken',
        'refills',
        'rankedwarhits',
        'respectforfaction',
        'energydrinkused',
        'revives',
    ];

    const state = {
        config: null,
        open: false,
        activeTab: 'overview',
        roster: [],
        faction: null,
        rosterLastFetchedAt: 0,
        commandRefreshing: false,
        commandLastRefreshedAt: 0,
        memberIntel: {},
        memberLeadership: {},
        leadershipTagFilter: 'all',
        loadingRoster: false,
        syncingIntel: false,
        syncProgress: { done: 0, total: 0, current: '', phase: '' },
        sort: { key: 'last_action', dir: 'asc' },
        search: '',
        statusFilter: 'all',
        memberMetricWindow: 30,
        expandedMemberId: null,
        currentWar: null,
        warOpponent: null,
        enemyRoster: [],
        warLoading: false,
        warLastFetchedAt: 0,
        warSearch: '',
        warFilter: 'all',
        warSort: 'smart',
        expandedTargetId: null,
        warPins: {},
        warNotes: {},
        warAttacks: [],
        warAttackAccess: 'unknown',
        warAttackAccessType: '',
        warAttackError: '',
        warAttackLastFetchedAt: 0,
        warAttackSyncing: false,
        warAttackCache: null,
        warActivityHistory: {},
        warRecentReleases: {},
        warHistory: {},
        payoutDrafts: {},
        payoutWarId: null,
        chain: null,
        chainReport: null,
        chainRecent: [],
        chainReports: {},
        chainAssignments: [],
        chainLoading: false,
        chainLastFetchedAt: 0,
        chainSelectedId: null,
        chainTickerNow: 0,
        ocCrimes: [],
        ocCompleted: [],
        ocCatalog: [],
        ocCrimeExp: [],
        ocHistory: [],
        ocRoleHistory: {},
        ocLoading: false,
        ocLastFetchedAt: 0,
        ocError: '',
        ocFilter: 'active',
        ocMemberFilter: 'all',
        expandedCrimeId: null,
        recruitApplications: [],
        recruitCandidates: {},
        recruitLoading: false,
        recruitLastFetchedAt: 0,
        recruitError: '',
        recruitSearch: '',
        recruitFilter: 'all',
        recruitSort: 'recent',
        recruitExpandedId: null,
        recruitSyncingId: null,
        armoryInventory: [],
        armoryInventoryTimestamp: 0,
        armoryBalance: null,
        armoryNews: [],
        armoryLoading: false,
        armoryLastFetchedAt: 0,
        armoryError: '',
        armoryBalanceError: '',
        armoryNewsError: '',
        armorySearch: '',
        armoryCategory: 'all',
        armoryFilter: 'all',
        armorySort: 'shortage',
        armoryStockRules: { categories: {}, items: {} },
        armoryItemMeta: {},
        armoryHistory: [],
        financeFundNews: [],
        financeManualEntries: [],
        financeLoading: false,
        financeLastFetchedAt: 0,
        financeError: '',
        financeWindow: 30,
        financeFilter: 'all',
        financeSearch: '',
        analyticsHistory: [],
        historyWindow: 30,
        historyMemberSort: 'xanax',
        warTicker: null,
        cache: new Map(),
        queue: [],
        queueRunning: false,
        lastRequestAt: 0,
        updateInfo: { checking: false, latest: '', checkedAt: 0, error: '' },
        toastTimer: null,
    };

    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function nowSec() {
        return Math.floor(Date.now() / 1000);
    }

    function fmtNumber(value) {
        if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
        return Number(value).toLocaleString();
    }

    function fmtMoney(value) {
        if (value === null || value === undefined || Number.isNaN(Number(value))) return '$0';
        const n = Math.round(Number(value));
        return `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString()}`;
    }

    function fmtCompact(value) {
        if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
        const n = Number(value);
        if (Math.abs(n) < 1000) return n.toLocaleString();
        return Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(n);
    }

    function fmtDuration(seconds) {
        if (seconds === null || seconds === undefined || Number.isNaN(Number(seconds))) return '-';
        const s = Math.max(0, Number(seconds));
        if (s < 60) return `${Math.floor(s)}s`;
        if (s < 3600) return `${Math.floor(s / 60)}m`;
        if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
        return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
    }

    function dateKey(ts = Date.now()) {
        const d = new Date(ts);
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    }

    const Store = {
        async get(key, fallback = null) {
            const full = APP.storagePrefix + key;
            try {
                if (typeof GM_getValue === 'function') {
                    return GM_getValue(full, fallback);
                }
                const raw = localStorage.getItem(full);
                return raw === null ? fallback : JSON.parse(raw);
            } catch (err) {
                console.warn('[TFC] storage get failed', key, err);
                return fallback;
            }
        },
        async set(key, value) {
            const full = APP.storagePrefix + key;
            try {
                if (typeof GM_setValue === 'function') {
                    GM_setValue(full, value);
                    return;
                }
                localStorage.setItem(full, JSON.stringify(value));
            } catch (err) {
                console.warn('[TFC] storage set failed', key, err);
            }
        },
        async del(key) {
            const full = APP.storagePrefix + key;
            try {
                if (typeof GM_deleteValue === 'function') {
                    GM_deleteValue(full);
                    return;
                }
                localStorage.removeItem(full);
            } catch (err) {
                console.warn('[TFC] storage delete failed', key, err);
            }
        },
    };

    async function loadConfig() {
        const saved = await Store.get('config', {});
        state.config = { ...DEFAULTS, ...(saved || {}) };
        state.activeTab = state.config.startTab || 'overview';
        state.memberMetricWindow = Number(state.config.memberMetricWindow ?? 30);
        state.memberIntel = await Store.get('memberIntel', {}) || {};
        state.memberLeadership = await Store.get('memberLeadership', {}) || {};
        state.warPins = await Store.get('warPins', {}) || {};
        state.warNotes = await Store.get('warNotes', {}) || {};
        state.warActivityHistory = await Store.get('warActivityHistory', {}) || {};
        state.warRecentReleases = await Store.get('warRecentReleases', {}) || {};
        state.warHistory = await Store.get('warHistory', {}) || {};
        state.payoutDrafts = await Store.get('payoutDrafts', {}) || {};
        state.chainReports = await Store.get('chainReports', {}) || {};
        state.chainAssignments = await Store.get('chainAssignments', []) || [];
        state.ocHistory = await Store.get('ocHistory', []) || [];
        state.ocRoleHistory = await Store.get('ocRoleHistory', {}) || {};
        state.recruitCandidates = await Store.get('recruitCandidates', {}) || {};
        state.armoryStockRules = await Store.get('armoryStockRules', { categories: {}, items: {} }) || { categories: {}, items: {} };
        state.armoryItemMeta = await Store.get('armoryItemMeta', {}) || {};
        state.armoryHistory = await Store.get('armoryHistory', []) || [];
        state.financeManualEntries = await Store.get('financeManualEntries', []) || [];
        const financeSnapshot = await Store.get('financeSnapshot', null);
        if (financeSnapshot) {
            state.financeFundNews = Array.isArray(financeSnapshot.news) ? financeSnapshot.news : [];
            state.financeLastFetchedAt = Number(financeSnapshot.at || 0);
        }
        state.analyticsHistory = await Store.get('analyticsHistory', []) || [];
        const armorySnapshot = await Store.get('armorySnapshot', null);
        if (armorySnapshot) {
            state.armoryInventory = Array.isArray(armorySnapshot.inventory) ? armorySnapshot.inventory : [];
            state.armoryInventoryTimestamp = Number(armorySnapshot.inventoryTimestamp || 0);
            state.armoryBalance = armorySnapshot.balance || null;
            state.armoryNews = Array.isArray(armorySnapshot.news) ? armorySnapshot.news : [];
            state.armoryLastFetchedAt = Number(armorySnapshot.at || 0);
        }
        state.warAttackCache = await Store.get('warAttackCache', null);
    }

    async function saveConfig() {
        await Store.set('config', state.config);
    }

    function cacheKey(path, params) {
        const p = Object.entries(params || {})
            .filter(([, v]) => v !== undefined && v !== null && v !== '')
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}=${String(v)}`)
            .join('&');
        return `${path}?${p}`;
    }

    function apiErrorMessage(data, status) {
        if (data?.error) {
            if (typeof data.error === 'string') return data.error;
            return data.error.error || data.error.message || `API error ${data.error.code ?? ''}`.trim();
        }
        return status ? `HTTP ${status}` : 'Unknown API error';
    }

    function rawRequest(url) {
        const key = state.config?.apiKey?.trim();
        const headers = key ? { Authorization: `ApiKey ${key}` } : {};

        if (typeof GM_xmlhttpRequest === 'function') {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url,
                    headers,
                    timeout: 20000,
                    onload: response => {
                        let data;
                        try { data = JSON.parse(response.responseText); }
                        catch { return reject(new Error(`Invalid JSON response (${response.status})`)); }
                        if (response.status < 200 || response.status >= 300 || data?.error) {
                            return reject(new Error(apiErrorMessage(data, response.status)));
                        }
                        resolve(data);
                    },
                    onerror: () => reject(new Error('Network request failed')),
                    ontimeout: () => reject(new Error('API request timed out')),
                });
            });
        }

        return fetch(url, { headers, credentials: 'omit' }).then(async response => {
            const data = await response.json().catch(() => null);
            if (!response.ok || data?.error) throw new Error(apiErrorMessage(data, response.status));
            return data;
        });
    }

    function rawTextRequest(url) {
        if (typeof GM_xmlhttpRequest === 'function') {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url,
                    timeout: 15000,
                    onload: response => {
                        if (response.status < 200 || response.status >= 300) return reject(new Error(`HTTP ${response.status}`));
                        resolve(String(response.responseText || ''));
                    },
                    onerror: () => reject(new Error('Network request failed')),
                    ontimeout: () => reject(new Error('Update check timed out')),
                });
            });
        }
        return fetch(url, { credentials: 'omit', cache: 'no-store' }).then(async response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.text();
        });
    }

    function compareVersions(a, b) {
        const pa = String(a || '').split('.').map(v => Number(v) || 0);
        const pb = String(b || '').split('.').map(v => Number(v) || 0);
        const len = Math.max(pa.length, pb.length);
        for (let i = 0; i < len; i++) {
            const av = pa[i] || 0;
            const bv = pb[i] || 0;
            if (av > bv) return 1;
            if (av < bv) return -1;
        }
        return 0;
    }

    function parseUserscriptVersion(text) {
        const match = String(text || '').match(/^\s*\/\/\s*@version\s+([^\s]+)\s*$/mi);
        return match ? match[1].trim() : '';
    }

    async function checkForUpdates(showToast = true) {
        if (state.updateInfo.checking) return;
        state.updateInfo.checking = true;
        state.updateInfo.error = '';
        if (state.open && state.activeTab === 'settings') render();
        try {
            const text = await rawTextRequest(`${APP.updateMetaUrl}?t=${Date.now()}`);
            const latest = parseUserscriptVersion(text);
            if (!latest) throw new Error('Could not read latest version');
            state.updateInfo.latest = latest;
            state.updateInfo.checkedAt = nowSec();
            const newer = compareVersions(latest, APP.version) > 0;
            if (showToast) toast(newer ? `TFC ${latest} is available` : `TFC ${APP.version} is up to date`, newer ? 'warn' : 'ok');
        } catch (err) {
            state.updateInfo.error = err?.message || String(err);
            if (showToast) toast(`Update check failed: ${state.updateInfo.error}`, 'error');
        } finally {
            state.updateInfo.checking = false;
            if (state.open && state.activeTab === 'settings') render();
        }
    }

    function openTfcUpdate() {
        window.open(APP.downloadUrl, '_blank', 'noopener,noreferrer');
    }

    function openTfcRepo() {
        window.open(APP.repoUrl, '_blank', 'noopener,noreferrer');
    }

    function enqueueApi(task) {
        return new Promise((resolve, reject) => {
            state.queue.push({ task, resolve, reject });
            pumpQueue();
        });
    }

    async function pumpQueue() {
        if (state.queueRunning) return;
        state.queueRunning = true;
        while (state.queue.length) {
            const item = state.queue.shift();
            try {
                const spacing = 700; // ~85 requests/minute, leaving headroom below Torn's 100/minute limit.
                const wait = Math.max(0, spacing - (Date.now() - state.lastRequestAt));
                if (wait) await sleep(wait);
                state.lastRequestAt = Date.now();
                item.resolve(await item.task());
            } catch (err) {
                item.reject(err);
            }
        }
        state.queueRunning = false;
    }

    async function api(path, params = {}, options = {}) {
        if (!state.config?.apiKey?.trim()) throw new Error('Add your Torn API key in Settings first.');

        const ttl = options.ttl ?? 0;
        const key = cacheKey(path, params);
        const cached = state.cache.get(key);
        if (!options.force && cached && Date.now() - cached.at < ttl) return cached.data;

        const url = new URL(APP.apiBase + path);
        for (const [k, v] of Object.entries(params)) {
            if (v === undefined || v === null || v === '') continue;
            url.searchParams.set(k, Array.isArray(v) ? v.join(',') : String(v));
        }
        url.searchParams.set('comment', APP.apiComment);

        const data = await enqueueApi(() => rawRequest(url.toString()));
        state.cache.set(key, { at: Date.now(), data });
        return data;
    }

    function injectStyles() {
        if ($('#tfc-styles')) return;
        const style = document.createElement('style');
        style.id = 'tfc-styles';
        style.textContent = `
            :root {
                --tfc-bg: #0b1118;
                --tfc-bg2: #131d27;
                --tfc-bg3: #1c2a37;
                --tfc-bg4: #243545;
                --tfc-border: rgba(218,235,248,.18);
                --tfc-border-strong: rgba(218,235,248,.30);
                --tfc-text: #f3f8fc;
                --tfc-text-soft: #dce8f1;
                --tfc-muted: #afbfcc;
                --tfc-muted2: #8fa3b3;
                --tfc-accent: #41c2e3;
                --tfc-accent2: #227f9c;
                --tfc-good: #6bd99d;
                --tfc-warn: #ffc45f;
                --tfc-bad: #ff8080;
                --tfc-purple: #b6a4f3;
                --tfc-focus: #6ed8f0;
            }
            #tfc-launcher {
                position: fixed;
                right: 10px;
                top: 45%;
                z-index: 2147483000;
                border: 1px solid rgba(255,255,255,.16);
                border-radius: 10px 0 0 10px;
                background: linear-gradient(180deg, #1f7890, #174a5b);
                color: #fff;
                font-weight: 800;
                font-size: 12px;
                letter-spacing: .5px;
                padding: 10px 8px;
                cursor: pointer;
                box-shadow: 0 8px 24px rgba(0,0,0,.35);
            }
            #tfc-launcher:hover { filter: brightness(1.1); }
            #tfc-overlay {
                position: fixed;
                inset: 0;
                z-index: 2147483001;
                background: rgba(3,7,11,.72);
                backdrop-filter: blur(3px);
                display: none;
                align-items: center;
                justify-content: center;
                padding: 12px;
                box-sizing: border-box;
            }
            #tfc-overlay.open { display: flex; }
            #tfc-panel {
                width: min(var(--tfc-panel-width, 1040px), calc(100vw - 24px));
                height: min(880px, calc(100vh - 24px));
                background: var(--tfc-bg);
                color: var(--tfc-text);
                border: 1px solid var(--tfc-border);
                border-radius: 14px;
                overflow: hidden;
                box-shadow: 0 28px 90px rgba(0,0,0,.6);
                display: grid;
                grid-template-rows: auto auto minmax(0, 1fr);
                font-family: Arial, Helvetica, sans-serif;
            }
            .tfc-header {
                padding: 14px 16px 12px;
                border-bottom: 1px solid var(--tfc-border);
                background: linear-gradient(180deg, #17232d, #111820);
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
            }
            .tfc-title { display: flex; align-items: center; gap: 11px; min-width: 0; }
            .tfc-logo {
                width: 38px; height: 38px; border-radius: 10px;
                display: grid; place-items: center;
                background: linear-gradient(135deg, #1f8ba8, #123c4a);
                border: 1px solid rgba(255,255,255,.12);
                font-weight: 900; font-size: 14px;
            }
            .tfc-title h2 { margin: 0; font-size: 17px; line-height: 1.2; color: #fff; }
            .tfc-title small { color: var(--tfc-muted); font-size: 11px; }
            .tfc-head-actions { display: flex; gap: 7px; align-items: center; }
            .tfc-btn {
                appearance: none; border: 1px solid var(--tfc-border); background: var(--tfc-bg3); color: var(--tfc-text);
                border-radius: 8px; padding: 8px 10px; font-size: 12px; font-weight: 700; cursor: pointer;
            }
            .tfc-btn:hover { background: #2a3744; }
            .tfc-btn.primary { background: var(--tfc-accent2); border-color: #2b8ea8; }
            .tfc-btn.primary:hover { background: #1b7892; }
            .tfc-btn.danger { color: #ffb5b5; }
            .tfc-btn:disabled { opacity: .45; cursor: default; }
            .tfc-tabs {
                display: flex; gap: 4px; padding: 8px 10px; overflow-x: auto;
                border-bottom: 1px solid var(--tfc-border); background: #121922;
            }
            .tfc-tab {
                white-space: nowrap; border: 0; background: transparent; color: var(--tfc-muted);
                padding: 8px 11px; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 800;
            }
            .tfc-tab.active { color: #fff; background: #24313e; }
            .tfc-tab.disabled { opacity: .35; cursor: default; }
            .tfc-content { min-height: 0; overflow: auto; padding: 14px; }
            .tfc-empty {
                min-height: 260px; display: grid; place-items: center; text-align: center; color: var(--tfc-muted); padding: 30px;
            }
            .tfc-empty strong { color: #fff; display: block; font-size: 18px; margin-bottom: 7px; }
            .tfc-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 190px), 1fr)); gap: 10px; align-items:stretch; }
            .tfc-card {
                background: var(--tfc-bg2); border: 1px solid var(--tfc-border); border-radius: 10px; padding: 12px 13px;
                display:flex; flex-direction:column; justify-content:flex-start; gap:4px; min-width:0; min-height:122px; overflow:visible;
            }
            .tfc-card > * { min-width:0; }
            .tfc-stat-label { color: var(--tfc-muted); font-size: 10px; text-transform: uppercase; letter-spacing: .6px; font-weight: 800; line-height:1.32; min-height:2.6em; overflow-wrap:anywhere; }
            .tfc-stat-value { color:#fff; font-size:clamp(18px, 1.55vw, 23px); line-height:1.08; margin-top:2px; font-weight:900; letter-spacing:-.025em; overflow-wrap:anywhere; word-break:normal; font-variant-numeric:tabular-nums; max-width:100%; }
            .tfc-stat-sub { color: var(--tfc-muted); font-size: 10px; margin-top: 2px; line-height:1.35; overflow-wrap:anywhere; }
            .tfc-section { margin-top: 12px; }
            .tfc-section-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
            .tfc-section-head h3 { margin: 0; font-size: 13px; color: #fff; }
            .tfc-toolbar { display: flex; gap: 7px; align-items: center; flex-wrap: wrap; }
            .tfc-input, .tfc-select {
                border: 1px solid var(--tfc-border); background: #0d1218; color: var(--tfc-text); border-radius: 8px; padding: 8px 9px;
                font-size: 12px; outline: none; box-sizing: border-box;
            }
            .tfc-input:focus, .tfc-select:focus { border-color: #2b8ea8; }
            .tfc-input.search { min-width: 190px; }
            .tfc-table-wrap { overflow: auto; border: 1px solid var(--tfc-border); border-radius: 10px; background: var(--tfc-bg2); }
            .tfc-table { width: 100%; border-collapse: collapse; min-width: 900px; font-size: 11px; }
            .tfc-table th {
                position: sticky; top: 0; z-index: 2; text-align: left; padding: 9px 10px; background: #1c2630; color: #bdc9d4;
                border-bottom: 1px solid var(--tfc-border); white-space: nowrap; cursor: pointer; user-select: none;
            }
            .tfc-table th.no-sort { cursor: default; }
            .tfc-table td { padding: 9px 10px; border-bottom: 1px solid rgba(255,255,255,.055); vertical-align: middle; }
            .tfc-table tr:last-child td { border-bottom: 0; }
            .tfc-table tr:hover td { background: rgba(255,255,255,.025); }
            .tfc-table.compact td { padding-top: 5px; padding-bottom: 5px; }
            .tfc-member { display: flex; flex-direction: column; gap: 2px; }
            .tfc-member a { color: #f5f8fb; font-weight: 800; text-decoration: none; }
            .tfc-member a:hover { text-decoration: underline; }
            .tfc-id { color: var(--tfc-muted); font-size: 9px; }
            .tfc-pill {
                display: inline-flex; align-items: center; gap: 5px; border-radius: 999px; padding: 3px 7px;
                font-size: 10px; font-weight: 800; background: #26323d; color: #d8e1e9; white-space: nowrap;
            }
            .tfc-dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; background: #778491; }
            .tfc-dot.online { background: var(--tfc-good); box-shadow: 0 0 7px rgba(83,197,138,.55); }
            .tfc-dot.idle { background: var(--tfc-warn); }
            .tfc-dot.offline { background: #71808d; }
            .tfc-status-hospital { color: #ff9c9c; }
            .tfc-status-travel { color: #8fd2ff; }
            .tfc-status-okay { color: #9fe0ba; }
            .tfc-muted { color: var(--tfc-muted); }
            .tfc-good { color: var(--tfc-good); }
            .tfc-warn { color: var(--tfc-warn); }
            .tfc-bad { color: var(--tfc-bad); }
            .tfc-alerts { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 8px; }
            .tfc-alert { padding: 10px 11px; border: 1px solid var(--tfc-border); background: var(--tfc-bg2); border-radius: 9px; }
            .tfc-alert strong { display: block; color: #fff; font-size: 11px; margin-bottom: 3px; }
            .tfc-alert span { color: var(--tfc-muted); font-size: 10px; }
            .tfc-member-toggle {
                appearance: none; border: 1px solid var(--tfc-border); background: #111922; color: var(--tfc-muted);
                width: 22px; height: 22px; padding: 0; border-radius: 6px; cursor: pointer; font-size: 11px; line-height: 20px;
            }
            .tfc-member-toggle:hover { color: #fff; background: #24313e; }
            .tfc-member-line { display: flex; align-items: center; gap: 7px; }
            .tfc-detail-row td { padding: 0 !important; background: #0f151c !important; }
            .tfc-detail { padding: 12px 14px 14px; border-top: 1px solid rgba(255,255,255,.055); }
            .tfc-detail-head { display:flex; justify-content:space-between; align-items:flex-start; gap:10px; margin-bottom:10px; }
            .tfc-detail-head strong { color:#fff; font-size:12px; }
            .tfc-detail-head span { color:var(--tfc-muted); font-size:10px; }
            .tfc-metric-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,140px),1fr)); gap:8px; }
            .tfc-metric { background:#161f28; border:1px solid var(--tfc-border); border-radius:8px; padding:8px 9px; }
            .tfc-metric b { display:block; color:#fff; font-size:14px; margin-top:3px; }
            .tfc-metric small { color:var(--tfc-muted); font-size:9px; }
            .tfc-window-table { width:100%; border-collapse:collapse; font-size:10px; margin-top:10px; }
            .tfc-window-table th, .tfc-window-table td { padding:6px 7px; border-bottom:1px solid rgba(255,255,255,.055); text-align:right; }
            .tfc-window-table th:first-child, .tfc-window-table td:first-child { text-align:left; }
            .tfc-window-table th { color:#aebdca; font-size:9px; text-transform:uppercase; letter-spacing:.45px; }
            .tfc-pace { font-size:9px; font-weight:800; white-space:nowrap; }
            .tfc-intel-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,170px),1fr)); gap:9px; margin-top:9px; }
            .tfc-war-score { display:grid; grid-template-columns:1fr auto 1fr; gap:12px; align-items:center; padding:14px; }
            .tfc-war-side { min-width:0; }
            .tfc-war-side.right { text-align:right; }
            .tfc-war-name { color:#fff; font-size:13px; font-weight:900; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
            .tfc-war-points { color:#fff; font-size:27px; font-weight:900; margin-top:3px; }
            .tfc-war-vs { color:var(--tfc-muted); font-size:10px; font-weight:900; text-transform:uppercase; letter-spacing:.7px; }
            .tfc-war-bar { height:9px; background:#0b1016; border:1px solid var(--tfc-border); border-radius:999px; overflow:hidden; margin-top:8px; }
            .tfc-war-bar > span { display:block; height:100%; background:linear-gradient(90deg,#17758e,#2bb2d3); min-width:0; }
            .tfc-war-side.right .tfc-war-bar > span { margin-left:auto; background:linear-gradient(90deg,#a95050,#e36b6b); }
            .tfc-war-summary { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:10px; margin-top:9px; }
            .tfc-release-list { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:8px; }
            .tfc-release { display:flex; align-items:center; justify-content:space-between; gap:10px; border:1px solid var(--tfc-border); background:var(--tfc-bg2); border-radius:9px; padding:10px 11px; min-width:0; }
            .tfc-release strong { color:#fff; font-size:10px; }
            .tfc-release small { display:block; color:var(--tfc-muted); font-size:9px; margin-top:2px; }
            .tfc-countdown { font-variant-numeric:tabular-nums; white-space:nowrap; font-weight:900; color:#ffb2b2; font-size:10px; }
            .tfc-target-actions { display:flex; align-items:center; gap:5px; }
            .tfc-icon-btn { appearance:none; border:1px solid var(--tfc-border); background:#111922; color:#aab8c4; border-radius:7px; padding:5px 7px; cursor:pointer; font-size:10px; font-weight:800; }
            .tfc-icon-btn:hover { color:#fff; background:#24313e; }
            .tfc-icon-btn.pinned { color:#ffd66e; border-color:rgba(239,180,77,.45); background:rgba(239,180,77,.10); }
            .tfc-attack-link { display:inline-flex; text-decoration:none; color:#fff; background:#176b83; border:1px solid #2b8ea8; border-radius:7px; padding:5px 8px; font-size:10px; font-weight:900; }
            .tfc-attack-link:hover { background:#1b7892; }
            .tfc-war-note { width:100%; min-height:56px; resize:vertical; border:1px solid var(--tfc-border); background:#0c1218; color:var(--tfc-text); border-radius:8px; padding:8px; font:11px Arial,sans-serif; box-sizing:border-box; }
            .tfc-war-detail-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,160px),1fr)); gap:8px; margin-bottom:9px; }
            .tfc-war-intel-grid { display:grid; grid-template-columns:1.15fr .85fr; gap:9px; margin-top:9px; }
            .tfc-intel-card { border:1px solid var(--tfc-border); background:var(--tfc-bg2); border-radius:10px; padding:10px; min-width:0; }
            .tfc-intel-card h4 { margin:0 0 8px; color:#fff; font-size:11px; }
            .tfc-mini-table { width:100%; border-collapse:collapse; font-size:10px; }
            .tfc-mini-table th,.tfc-mini-table td { padding:6px 5px; border-bottom:1px solid rgba(255,255,255,.06); text-align:right; white-space:nowrap; }
            .tfc-mini-table th:first-child,.tfc-mini-table td:first-child { text-align:left; }
            .tfc-mini-table th { color:var(--tfc-muted); font-size:9px; text-transform:uppercase; letter-spacing:.45px; }
            .tfc-feed { display:flex; flex-direction:column; gap:5px; max-height:255px; overflow:auto; }
            .tfc-feed-item { display:grid; grid-template-columns:1fr auto; gap:8px; align-items:center; border-bottom:1px solid rgba(255,255,255,.06); padding:5px 0; font-size:10px; }
            .tfc-feed-item:last-child { border-bottom:0; }
            .tfc-feed-item small { display:block; color:var(--tfc-muted); font-size:9px; margin-top:2px; }
            .tfc-activity-meter { display:inline-flex; align-items:center; gap:5px; min-width:72px; }
            .tfc-activity-meter i { display:block; width:34px; height:5px; border-radius:99px; background:#0b1016; overflow:hidden; border:1px solid rgba(255,255,255,.08); }
            .tfc-activity-meter i span { display:block; height:100%; background:var(--tfc-accent); }
            .tfc-intel-lock { border:1px solid rgba(239,180,77,.25); background:rgba(239,180,77,.07); border-radius:9px; padding:9px; color:var(--tfc-muted); font-size:10px; line-height:1.45; }
            .tfc-recent-badge { color:var(--tfc-good); font-size:9px; font-weight:900; margin-left:4px; }
            .tfc-payout-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,185px),1fr)); gap:9px; margin-top:9px; }
            .tfc-payout-controls { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr)); gap:9px; }
            .tfc-payout-control { border:1px solid var(--tfc-border); background:var(--tfc-bg2); border-radius:9px; padding:9px; }
            .tfc-payout-control label { display:block; color:#fff; font-size:10px; font-weight:800; margin-bottom:5px; }
            .tfc-payout-control small { display:block; color:var(--tfc-muted); font-size:9px; margin-top:5px; line-height:1.35; }
            .tfc-money-input { width:110px; text-align:right; }
            .tfc-adjust-input { width:95px; text-align:right; }
            .tfc-note-input { width:150px; }
            .tfc-payout-table { min-width:1180px; }
            .tfc-payout-table th,.tfc-payout-table td { white-space:nowrap; }
            .tfc-payout-table td:last-child { white-space:normal; }
            .tfc-report-badge { display:inline-flex; border-radius:999px; padding:2px 6px; font-size:9px; font-weight:900; background:#24313e; color:#c8d4df; }
            .tfc-report-badge.good { color:#9fe0ba; background:rgba(83,197,138,.1); }
            .tfc-report-badge.warn { color:#ffd28a; background:rgba(239,180,77,.1); }
            .tfc-chain-summary { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:10px; margin-bottom:12px; }
            .tfc-chain-hero { border:1px solid var(--tfc-border); background:linear-gradient(135deg,rgba(42,169,201,.12),rgba(165,140,229,.08)); border-radius:11px; padding:12px; }
            .tfc-chain-timeout { font-size:26px; line-height:1; font-weight:900; letter-spacing:-1px; color:#fff; }
            .tfc-chain-timeout.warn { color:var(--tfc-warn); }
            .tfc-chain-timeout.danger { color:var(--tfc-bad); }
            .tfc-chain-progress { height:8px; background:#0d1218; border-radius:999px; overflow:hidden; margin-top:8px; border:1px solid rgba(255,255,255,.06); }
            .tfc-chain-progress span { display:block; height:100%; background:linear-gradient(90deg,var(--tfc-accent2),var(--tfc-accent)); }
            .tfc-chain-layout { display:grid; grid-template-columns:minmax(0,1.6fr) minmax(300px,.8fr); gap:12px; }
            .tfc-chain-coverage { display:grid; grid-template-columns:repeat(12,minmax(44px,1fr)); gap:4px; min-width:720px; }
            .tfc-chain-hour { border:1px solid var(--tfc-border); background:var(--tfc-bg2); border-radius:7px; padding:6px 4px; text-align:center; min-height:64px; }
            .tfc-chain-hour b { display:block; color:#fff; font-size:10px; }
            .tfc-chain-hour span { display:block; font-size:9px; color:var(--tfc-muted); margin-top:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
            .tfc-chain-hour.empty { border-color:rgba(231,104,104,.35); background:rgba(231,104,104,.06); }
            .tfc-chain-hour.covered { border-color:rgba(83,197,138,.25); background:rgba(83,197,138,.05); }
            .tfc-chain-hour.now { box-shadow:inset 0 0 0 1px var(--tfc-accent); }
            .tfc-chain-plan-grid { display:grid; grid-template-columns:1.4fr 1fr .8fr .8fr .8fr 1.5fr auto; gap:6px; align-items:end; }
            .tfc-chain-plan-grid label { display:block; color:var(--tfc-muted); font-size:9px; margin-bottom:4px; }
            .tfc-chain-assignment { display:grid; grid-template-columns:1.3fr 1fr .8fr .8fr 1.6fr auto; gap:8px; align-items:center; border-top:1px solid var(--tfc-border); padding:8px 0; font-size:10px; }
            .tfc-chain-history-row { cursor:pointer; }
            .tfc-chain-history-row:hover td { background:rgba(42,169,201,.05); }
            .tfc-chain-report-table { min-width:860px; }
            .tfc-chain-report-table th,.tfc-chain-report-table td { white-space:nowrap; }
            .tfc-recruit-summary { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:10px; margin-bottom:12px; }
            .tfc-recruit-table { min-width:1180px; }
            .tfc-recruit-table th,.tfc-recruit-table td { white-space:nowrap; }
            .tfc-recruit-stage { min-width:105px; }
            .tfc-recruit-detail { background:#111922; border-top:1px solid var(--tfc-border); padding:12px; }
            .tfc-recruit-detail-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,170px),1fr)); gap:8px; }
            .tfc-recruit-message { white-space:pre-wrap; line-height:1.45; color:#d9e3eb; font-size:10px; }
            .tfc-recruit-form { display:grid; grid-template-columns:1fr 1fr 1fr auto; gap:7px; align-items:end; }
            .tfc-recruit-form label { display:block; color:var(--tfc-muted); font-size:9px; margin-bottom:4px; }
            .tfc-recruit-notes { width:100%; min-height:74px; resize:vertical; }
            .tfc-repeat-badge { color:var(--tfc-purple); font-size:9px; font-weight:900; margin-left:4px; }
            .tfc-app-active { color:var(--tfc-good); }
            .tfc-app-declined,.tfc-app-withdrawn { color:var(--tfc-warn); }
            .tfc-app-accepted { color:var(--tfc-good); }
            .tfc-armory-summary { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:10px; margin-bottom:12px; }
            .tfc-armory-table { min-width:1080px; }
            .tfc-armory-table th,.tfc-armory-table td { white-space:nowrap; }
            .tfc-armory-min { width:72px; text-align:right; }
            .tfc-armory-short { color:var(--tfc-bad); font-weight:900; }
            .tfc-armory-ok { color:var(--tfc-good); }
            .tfc-armory-layout { display:grid; grid-template-columns:minmax(0,1.3fr) minmax(300px,.7fr); gap:12px; }
            .tfc-armory-loan { display:flex; justify-content:space-between; gap:8px; border-bottom:1px solid rgba(255,255,255,.06); padding:7px 0; font-size:10px; }
            .tfc-armory-loan:last-child { border-bottom:0; }
            .tfc-armory-history { min-width:650px; }
            .tfc-armory-history th,.tfc-armory-history td { white-space:nowrap; }
            .tfc-history-summary { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:10px; margin-bottom:12px; }
            .tfc-history-layout { display:grid; grid-template-columns:minmax(0,1.25fr) minmax(310px,.75fr); gap:12px; }
            .tfc-history-table { min-width:900px; }
            .tfc-history-table th,.tfc-history-table td { white-space:nowrap; }
            .tfc-history-note { border:1px solid rgba(78,196,255,.15); background:rgba(78,196,255,.05); border-radius:10px; padding:10px; font-size:10px; line-height:1.5; }
            .tfc-history-bar { height:5px; background:rgba(255,255,255,.07); border-radius:999px; overflow:hidden; margin-top:5px; }
            .tfc-history-bar span { display:block; height:100%; background:linear-gradient(90deg,#3bbef5,#6ee7b7); border-radius:999px; }
            .tfc-history-delta.good { color:var(--tfc-good); }
            .tfc-history-delta.bad { color:var(--tfc-bad); }
            .tfc-history-delta.neutral { color:var(--tfc-muted); }
            .tfc-finance-summary { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr)); gap:10px; margin-bottom:12px; align-items:stretch; }
            .tfc-finance-layout { display:grid; grid-template-columns:minmax(0,1.25fr) minmax(320px,.75fr); gap:12px; }
            .tfc-finance-entry-form { display:grid; grid-template-columns:130px 125px 150px 150px minmax(160px,1fr) auto; gap:7px; align-items:end; }
            .tfc-finance-status { display:inline-flex; padding:2px 6px; border-radius:999px; border:1px solid rgba(255,255,255,.12); font-size:8px; font-weight:800; letter-spacing:.04em; text-transform:uppercase; }
            .tfc-finance-status.actual { color:var(--tfc-good); border-color:rgba(73,214,151,.35); background:rgba(73,214,151,.08); }
            .tfc-finance-status.valued { color:#65c7ff; border-color:rgba(101,199,255,.35); background:rgba(101,199,255,.08); }
            .tfc-finance-status.planned { color:var(--tfc-warn); border-color:rgba(255,196,92,.35); background:rgba(255,196,92,.08); }
            .tfc-finance-status.liability { color:#ff9f9f; border-color:rgba(255,111,111,.35); background:rgba(255,111,111,.08); }
            .tfc-finance-in { color:var(--tfc-good); font-weight:800; }
            .tfc-finance-out { color:#ff9f9f; font-weight:800; }
            .tfc-finance-transfer { color:var(--tfc-muted); }
            .tfc-oc-item-ready { color:var(--tfc-good); }
            .tfc-oc-item-missing { color:var(--tfc-bad); font-weight:900; }
            .tfc-command-hero { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; padding:15px 16px; border:1px solid rgba(42,169,201,.28); background:linear-gradient(135deg,rgba(42,169,201,.11),rgba(23,30,39,.92)); border-radius:12px; min-width:0; }
            /* Auto basis stays content-sized when responsive rules change the row to a column. */
            .tfc-command-hero > div:first-child { flex:1 1 auto; min-width:0; }
            .tfc-command-hero > .tfc-toolbar { flex:0 1 auto; justify-content:flex-end; }
            .tfc-command-hero h3 { margin:0 0 8px; color:#fff; font-size:18px; line-height:1.18; overflow-wrap:anywhere; }
            .tfc-command-hero p { margin:0; color:var(--tfc-muted); font-size:10px; line-height:1.55; overflow-wrap:anywhere; }
            .tfc-command-modules { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr)); gap:10px; }
            .tfc-command-module { appearance:none; width:100%; text-align:left; color:inherit; cursor:pointer; background:var(--tfc-bg2); border:1px solid var(--tfc-border); border-radius:10px; padding:13px 14px; min-width:0; min-height:126px; overflow:hidden; }
            .tfc-command-module:hover { border-color:rgba(42,169,201,.45); background:#1b2530; }
            .tfc-command-module-top { display:flex; justify-content:space-between; align-items:center; gap:8px; }
            .tfc-command-module-top strong { color:#fff; font-size:11px; line-height:1.3; overflow-wrap:anywhere; }
            .tfc-command-module-value { margin-top:8px; color:#fff; font-size:clamp(16px, 1.7vw, 20px); font-weight:900; line-height:1.08; overflow-wrap:anywhere; word-break:break-word; }
            .tfc-command-module-sub { color:var(--tfc-muted); font-size:10px; line-height:1.45; margin-top:5px; min-height:34px; overflow-wrap:anywhere; }
            .tfc-command-age { color:var(--tfc-muted); font-size:8px; margin-top:7px; }
            .tfc-command-state { display:inline-flex; align-items:center; border-radius:999px; padding:2px 6px; font-size:8px; font-weight:900; letter-spacing:.04em; text-transform:uppercase; border:1px solid var(--tfc-border); }
            .tfc-command-state.good { color:var(--tfc-good); border-color:rgba(83,197,138,.32); background:rgba(83,197,138,.06); }
            .tfc-command-state.warn { color:var(--tfc-warn); border-color:rgba(239,180,77,.32); background:rgba(239,180,77,.06); }
            .tfc-command-state.bad { color:var(--tfc-bad); border-color:rgba(231,104,104,.32); background:rgba(231,104,104,.06); }
            .tfc-command-state.muted { color:var(--tfc-muted); }
            .tfc-command-layout { display:grid; grid-template-columns:minmax(0,1.25fr) minmax(300px,.75fr); gap:12px; }
            .tfc-command-queue { display:flex; flex-direction:column; gap:7px; }
            .tfc-command-action { appearance:none; display:grid; grid-template-columns:8px minmax(0,1fr) auto; align-items:center; gap:9px; width:100%; text-align:left; color:inherit; cursor:pointer; background:var(--tfc-bg2); border:1px solid var(--tfc-border); border-radius:9px; padding:9px 10px; }
            .tfc-command-action:hover { background:#1b2530; }
            .tfc-command-action i { width:8px; height:8px; border-radius:50%; display:block; background:#71808d; }
            .tfc-command-action.bad i { background:var(--tfc-bad); box-shadow:0 0 8px rgba(231,104,104,.35); }
            .tfc-command-action.warn i { background:var(--tfc-warn); }
            .tfc-command-action.good i { background:var(--tfc-good); }
            .tfc-command-action strong { display:block; color:#fff; font-size:10px; line-height:1.3; }
            .tfc-command-action small { display:block; color:var(--tfc-muted); font-size:9px; line-height:1.35; margin-top:2px; }
            .tfc-command-action em { color:var(--tfc-muted); font-size:9px; font-style:normal; font-weight:800; white-space:nowrap; }
            .tfc-command-health { display:flex; flex-direction:column; gap:6px; }
            .tfc-command-health-row { display:grid; grid-template-columns:80px minmax(0,1fr) auto; gap:8px; align-items:center; padding:6px 0; border-bottom:1px solid rgba(255,255,255,.05); font-size:9px; }
            .tfc-command-health-row:last-child { border-bottom:0; }
            .tfc-command-health-row strong { color:#fff; }
            .tfc-settings { max-width: 700px; }
            .tfc-setting { margin-bottom: 14px; }
            .tfc-setting label { display: block; color: #fff; font-size: 11px; font-weight: 800; margin-bottom: 5px; }
            .tfc-setting p { color: var(--tfc-muted); margin: 5px 0 0; font-size: 10px; line-height: 1.45; }
            .tfc-setting .tfc-input, .tfc-setting .tfc-select { width: 100%; }
            .tfc-inline { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .tfc-progress { height: 8px; background: #0b0f14; border-radius: 99px; overflow: hidden; border: 1px solid var(--tfc-border); }
            .tfc-progress > span { display: block; height: 100%; background: linear-gradient(90deg, #16728a, #2ab3d4); width: 0; transition: width .2s; }
            .tfc-progress-line { margin-top: 8px; color: var(--tfc-muted); font-size: 10px; }
            #tfc-toast {
                position: fixed; z-index: 2147483002; left: 50%; bottom: 20px; transform: translateX(-50%);
                background: #18232d; color: #fff; border: 1px solid var(--tfc-border); border-radius: 9px; padding: 10px 13px;
                font: 700 11px Arial, sans-serif; box-shadow: 0 8px 30px rgba(0,0,0,.45); display: none;
            }
            #tfc-toast.show { display: block; }
            #tfc-toast.error { border-color: rgba(231,104,104,.6); color: #ffc5c5; }
            .tfc-kicker { display:block; color:var(--tfc-accent); font-size:10px; line-height:1.35; font-weight:900; text-transform:uppercase; letter-spacing:.65px; margin:0 0 6px; }
            .tfc-placeholder-module { padding: 20px; border: 1px dashed var(--tfc-border); border-radius: 10px; color: var(--tfc-muted); text-align: center; }
            /* v0.13 UI / UX refinement layer */
            #tfc-panel {
                font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                background: linear-gradient(180deg, #101720 0%, #0d131a 100%);
            }
            #tfc-panel * { scrollbar-width: thin; scrollbar-color: #344451 #111820; }
            #tfc-panel *::-webkit-scrollbar { width: 8px; height: 8px; }
            #tfc-panel *::-webkit-scrollbar-track { background: #111820; }
            #tfc-panel *::-webkit-scrollbar-thumb { background: #344451; border-radius: 999px; border: 2px solid #111820; }
            #tfc-panel *::-webkit-scrollbar-thumb:hover { background: #486072; }
            .tfc-header { padding: 12px 14px; }
            .tfc-logo { box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 5px 18px rgba(0,0,0,.22); }
            .tfc-title h2 { letter-spacing: -.2px; }
            .tfc-title small { display:block; margin-top:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:62vw; }
            .tfc-head-sep { opacity:.4; padding:0 3px; }
            .tfc-close-btn { width:34px; height:34px; padding:0; display:grid; place-items:center; font-size:13px; }
            .tfc-btn, .tfc-input, .tfc-select, .tfc-icon-btn, .tfc-member-toggle, .tfc-attack-link { transition: border-color .14s ease, background .14s ease, color .14s ease, transform .08s ease, box-shadow .14s ease; }
            .tfc-btn:active:not(:disabled), .tfc-icon-btn:active:not(:disabled), .tfc-member-toggle:active:not(:disabled) { transform: translateY(1px); }
            .tfc-btn:focus-visible, .tfc-input:focus-visible, .tfc-select:focus-visible, .tfc-tab:focus-visible, .tfc-icon-btn:focus-visible, .tfc-member-toggle:focus-visible, .tfc-command-module:focus-visible, .tfc-command-action:focus-visible { outline:2px solid rgba(42,169,201,.72); outline-offset:2px; }
            .tfc-tabs {
                gap:3px; padding:7px 10px 6px; scrollbar-width:none; scroll-snap-type:x proximity;
                box-shadow: inset 0 -1px 0 rgba(255,255,255,.02);
            }
            .tfc-tabs::-webkit-scrollbar { display:none; }
            .tfc-tab {
                position:relative; scroll-snap-align:start; padding:8px 10px 9px; border-radius:7px 7px 5px 5px;
                letter-spacing:.01em;
            }
            .tfc-tab::after {
                content:""; position:absolute; left:9px; right:9px; bottom:2px; height:2px; border-radius:99px;
                background:transparent; transform:scaleX(.35); transition:background .15s ease, transform .15s ease;
            }
            .tfc-tab:hover:not(:disabled) { color:#e8f2f8; background:rgba(255,255,255,.035); }
            .tfc-tab.active { color:#fff; background:rgba(42,169,201,.10); }
            .tfc-tab.active::after { background:var(--tfc-accent); transform:scaleX(1); }
            .tfc-tab-short { display:none; }
            .tfc-mobile-quickbar { display:none; }
            .tfc-content { padding:13px; scrollbar-gutter:stable; }
            .tfc-card, .tfc-intel-card, .tfc-payout-control, .tfc-chain-hero, .tfc-alert {
                box-shadow: inset 0 1px 0 rgba(255,255,255,.018);
            }
            .tfc-section { margin-top:14px; }
            .tfc-section-head { margin-bottom:9px; min-height:28px; }
            .tfc-section-head h3 { font-size:13px; letter-spacing:.01em; }
            .tfc-toolbar { row-gap:6px; }
            .tfc-input, .tfc-select { min-height:34px; background:#0c1218; }
            .tfc-input:hover, .tfc-select:hover { border-color:rgba(255,255,255,.17); }
            .tfc-table-wrap {
                position:relative; overscroll-behavior:contain; background:#121922;
                box-shadow: 0 7px 22px rgba(0,0,0,.12);
            }
            .tfc-table th {
                background:#1b2631; box-shadow:0 1px 0 rgba(255,255,255,.08); font-size:10px;
            }
            .tfc-table tbody tr:nth-child(even):not(.tfc-detail-row) td { background:rgba(255,255,255,.008); }
            .tfc-table tr:hover td { background:rgba(42,169,201,.035); }
            .tfc-member a { text-underline-offset:2px; }
            .tfc-pill { border:1px solid rgba(255,255,255,.055); }
            .tfc-command-module, .tfc-command-action { transition:border-color .14s ease, background .14s ease, transform .08s ease, box-shadow .14s ease; }
            .tfc-command-module:hover, .tfc-command-action:hover { transform:translateY(-1px); box-shadow:0 7px 18px rgba(0,0,0,.16); }
            .tfc-command-module:active, .tfc-command-action:active { transform:translateY(0); }
            .tfc-empty { border:1px dashed rgba(255,255,255,.08); border-radius:12px; background:rgba(255,255,255,.012); }
            .tfc-empty strong { letter-spacing:-.15px; }
            .tfc-detail-row td { box-shadow:inset 0 1px 0 rgba(42,169,201,.12); }
            .tfc-detail { background:linear-gradient(180deg,rgba(42,169,201,.025),rgba(0,0,0,0)); }
            .tfc-war-note, .tfc-recruit-notes { line-height:1.45; }
            #tfc-toast { max-width:min(520px,calc(100vw - 28px)); text-align:center; }
            /* v0.14 accessibility / clarity pass */
            #tfc-panel {
                color-scheme: dark;
                background: #0b1118;
                border-color: var(--tfc-border-strong);
                font-size: 13px;
                line-height: 1.42;
            }
            #tfc-panel, #tfc-panel button, #tfc-panel input, #tfc-panel select, #tfc-panel textarea, #tfc-panel table {
                font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            }
            /* Defensive contrast: Torn/browser styles must never leak dark text into TFC. */
            #tfc-panel td, #tfc-panel p, #tfc-panel label, #tfc-panel li, #tfc-panel dd, #tfc-panel dt {
                color: var(--tfc-text-soft);
            }
            #tfc-panel h1, #tfc-panel h2, #tfc-panel h3, #tfc-panel h4, #tfc-panel h5, #tfc-panel h6,
            #tfc-panel strong, #tfc-panel b { color: var(--tfc-text); }
            #tfc-panel a { color: #8edff2; }
            #tfc-panel a:hover { color: #c8f3fb; }
            #tfc-panel .tfc-muted { color: var(--tfc-muted) !important; }
            #tfc-panel .tfc-good, #tfc-panel .tfc-app-active, #tfc-panel .tfc-app-accepted, #tfc-panel .tfc-armory-ok, #tfc-panel .tfc-oc-item-ready, #tfc-panel .tfc-finance-in { color: var(--tfc-good) !important; }
            #tfc-panel .tfc-warn, #tfc-panel .tfc-app-declined, #tfc-panel .tfc-app-withdrawn { color: var(--tfc-warn) !important; }
            #tfc-panel .tfc-bad, #tfc-panel .tfc-armory-short, #tfc-panel .tfc-oc-item-missing, #tfc-panel .tfc-finance-out { color: var(--tfc-bad) !important; }

            .tfc-header {
                background: linear-gradient(180deg, #162330 0%, #101820 100%);
                border-bottom-color: var(--tfc-border-strong);
            }
            .tfc-title h2 { color: var(--tfc-text); font-size: 18px; }
            .tfc-title small { color: var(--tfc-muted); font-size: 11px; }
            .tfc-logo { color:#fff; background:linear-gradient(135deg,#2596b5,#164d60); border-color:rgba(255,255,255,.22); }

            .tfc-tabs { background:#101820; border-bottom-color:var(--tfc-border-strong); }
            .tfc-tab { color:var(--tfc-muted); min-height:38px; }
            .tfc-tab:hover:not(:disabled) { color:#fff; background:#1c2a37; }
            .tfc-tab.active { color:#fff; background:#213444; box-shadow:inset 0 0 0 1px rgba(65,194,227,.22); }

            .tfc-content { background:#0b1118; }
            .tfc-card, .tfc-intel-card, .tfc-payout-control, .tfc-alert, .tfc-release,
            .tfc-chain-hour, .tfc-command-module, .tfc-command-action {
                background:#131d27;
                border-color:var(--tfc-border);
            }
            .tfc-card { min-height:82px; padding:13px 14px; }
            .tfc-stat-label { color:var(--tfc-muted); font-size:11px; line-height:1.25; }
            .tfc-stat-value { color:#fff; font-size:25px; margin-top:6px; }
            .tfc-stat-sub { color:var(--tfc-muted); font-size:11px; line-height:1.35; margin-top:5px; }
            .tfc-section { margin-top:18px; }
            .tfc-section-head { margin-bottom:10px; padding-bottom:7px; border-bottom:1px solid rgba(218,235,248,.09); }
            .tfc-section-head h3 { color:#fff; font-size:14px; }
            .tfc-kicker { color:#65d7ee; font-size:10px; }

            .tfc-btn, .tfc-icon-btn, .tfc-member-toggle, .tfc-attack-link {
                min-height:36px;
                background:#1c2a37;
                color:#f4f9fc !important;
                border-color:var(--tfc-border-strong);
                border-radius:9px;
                font-weight:800;
            }
            .tfc-btn:hover, .tfc-icon-btn:hover, .tfc-member-toggle:hover { background:#26394a; border-color:rgba(110,216,240,.48); color:#fff !important; }
            .tfc-btn.primary, .tfc-attack-link { background:#227f9c; border-color:#4cb9d4; color:#fff !important; }
            .tfc-btn.primary:hover, .tfc-attack-link:hover { background:#2996b6; }
            .tfc-btn.danger { color:#ffb0b0 !important; border-color:rgba(255,128,128,.38); background:rgba(255,128,128,.08); }
            .tfc-btn:disabled, .tfc-icon-btn:disabled { opacity:.52; color:#9badba !important; }

            .tfc-input, .tfc-select, .tfc-war-note, .tfc-recruit-notes {
                min-height:38px;
                background:#101923 !important;
                color:#f3f8fc !important;
                border:1px solid var(--tfc-border-strong) !important;
                border-radius:9px;
                caret-color:#fff;
            }
            .tfc-input::placeholder, .tfc-war-note::placeholder, .tfc-recruit-notes::placeholder { color:#8fa3b3 !important; opacity:1; }
            .tfc-select option, #tfc-panel option { background:#182530 !important; color:#f3f8fc !important; }
            .tfc-input:hover, .tfc-select:hover { border-color:rgba(110,216,240,.48) !important; }
            .tfc-input:focus, .tfc-select:focus, .tfc-war-note:focus, .tfc-recruit-notes:focus {
                border-color:var(--tfc-focus) !important;
                box-shadow:0 0 0 3px rgba(110,216,240,.14);
                outline:none;
            }
            #tfc-panel input[type="checkbox"], #tfc-panel input[type="radio"] { accent-color:#41c2e3; width:16px; height:16px; }

            .tfc-table-wrap { background:#101923; border-color:var(--tfc-border-strong); }
            .tfc-table { color:var(--tfc-text-soft); font-size:12px; }
            .tfc-table th {
                background:#223140;
                color:#e1edf5 !important;
                border-bottom-color:var(--tfc-border-strong);
                padding:11px 11px;
                font-size:10px;
            }
            .tfc-table td {
                color:#dce8f1 !important;
                padding:10px 11px;
                border-bottom-color:rgba(218,235,248,.09);
            }
            .tfc-table tbody tr:nth-child(even):not(.tfc-detail-row) td { background:#111c26; }
            .tfc-table tr:hover td { background:#1b2a37 !important; }
            .tfc-table .tfc-good { color:var(--tfc-good) !important; }
            .tfc-table .tfc-warn { color:var(--tfc-warn) !important; }
            .tfc-table .tfc-bad { color:var(--tfc-bad) !important; }
            .tfc-table .tfc-muted, .tfc-table .tfc-id { color:var(--tfc-muted) !important; }
            .tfc-member a { color:#f7fbfe !important; font-size:12px; }
            .tfc-id { color:var(--tfc-muted) !important; font-size:10px; }

            .tfc-pill, .tfc-report-badge, .tfc-finance-status, .tfc-command-state {
                border-color:rgba(218,235,248,.20);
                color:#e6eff6;
                font-size:9px;
                line-height:1.3;
            }
            .tfc-command-state.good, .tfc-report-badge.good, .tfc-finance-status.actual { color:#8be9b3 !important; background:rgba(107,217,157,.12); border-color:rgba(107,217,157,.38); }
            .tfc-command-state.warn, .tfc-report-badge.warn, .tfc-finance-status.planned { color:#ffd787 !important; background:rgba(255,196,95,.12); border-color:rgba(255,196,95,.38); }
            .tfc-command-state.bad, .tfc-finance-status.liability { color:#ffa1a1 !important; background:rgba(255,128,128,.12); border-color:rgba(255,128,128,.40); }
            .tfc-command-state.muted { color:#b7c5d1 !important; background:#1a2732; }

            .tfc-command-hero {
                padding:16px 17px;
                background:linear-gradient(135deg,rgba(65,194,227,.14),#15212c 58%,#111923);
                border-color:rgba(65,194,227,.38);
            }
            .tfc-command-hero h3 { font-size:18px; color:#fff; }
            .tfc-command-hero p { color:#c1cfda; font-size:11px; max-width:760px; }
            .tfc-command-legend { display:flex; flex-wrap:wrap; gap:7px; margin-top:10px; }
            .tfc-command-legend span { display:inline-flex; align-items:center; gap:5px; color:#c9d6df; font-size:10px; }
            .tfc-command-legend i { width:8px; height:8px; border-radius:50%; display:inline-block; }
            .tfc-command-legend .good i { background:var(--tfc-good); }
            .tfc-command-legend .warn i { background:var(--tfc-warn); }
            .tfc-command-legend .bad i { background:var(--tfc-bad); }
            .tfc-command-legend .muted i { background:#8195a5; }

            .tfc-command-modules { gap:11px; }
            .tfc-command-module { min-height:118px; padding:13px 14px; border-color:var(--tfc-border); }
            .tfc-command-module:hover { border-color:rgba(65,194,227,.60); background:#1a2935; }
            .tfc-command-module-top strong { color:#fff; font-size:12px; }
            .tfc-command-module-value { color:#fff; font-size:20px; margin-top:9px; }
            .tfc-command-module-sub { color:#b8c7d2; font-size:10px; min-height:30px; }
            .tfc-command-age { color:#90a5b5; font-size:9px; }
            .tfc-command-action { min-height:60px; padding:11px 12px; }
            .tfc-command-action strong { color:#fff; font-size:11px; }
            .tfc-command-action small { color:#b7c5d1; font-size:10px; }
            .tfc-command-action em { color:#a9bdca; font-size:10px; }
            .tfc-command-health-row { font-size:10px; min-height:34px; }
            .tfc-command-health-row strong { color:#fff; }
            .tfc-command-health-row > span { color:#b7c5d1; }

            .tfc-alert { border-left:4px solid #6d8292; padding:11px 12px; }
            .tfc-alert strong { color:#fff; font-size:12px; }
            .tfc-alert span { color:#bccbd6; font-size:11px; line-height:1.4; }
            .tfc-alert.good { border-left-color:var(--tfc-good); }
            .tfc-alert.warn { border-left-color:var(--tfc-warn); }
            .tfc-alert.bad { border-left-color:var(--tfc-bad); }
            .tfc-empty { color:#b7c5d1; background:#101820; }
            .tfc-empty strong { color:#fff; }
            .tfc-setting label { color:#f3f8fc !important; font-size:12px; }
            .tfc-setting p { color:#b7c5d1; font-size:11px; }
            .tfc-recruit-form label, .tfc-chain-plan-grid label, .tfc-payout-control label { color:#e7f0f6 !important; font-size:10px; }
            .tfc-payout-control small { color:#b2c1cd; font-size:10px; }


            #tfc-panel * { box-sizing:border-box; }
            .tfc-section, .tfc-toolbar, .tfc-detail, .tfc-intel-card, .tfc-metric, .tfc-release, .tfc-command-hero, .tfc-command-module, .tfc-command-action, .tfc-history-note, .tfc-alert { min-width:0; }
            .tfc-card, .tfc-metric, .tfc-intel-card, .tfc-command-module { contain:layout style; }
            .tfc-card .tfc-stat-value, .tfc-command-module-value, .tfc-war-points, .tfc-chain-timeout { text-wrap:balance; }
            .tfc-table-wrap, .tfc-card, .tfc-command-module, .tfc-intel-card, .tfc-alert, .tfc-history-note, .tfc-release { box-shadow:0 1px 0 rgba(255,255,255,.02) inset; }
            #tfc-panel { container-type:inline-size; container-name:tfc; }
            .tfc-card, .tfc-metric, .tfc-intel-card, .tfc-command-module, .tfc-payout-control, .tfc-chain-hero { max-width:100%; }
            .tfc-metric b, .tfc-intel-card b, .tfc-payout-control, .tfc-alert, .tfc-release, .tfc-feed-item > div { overflow-wrap:anywhere; min-width:0; }
            .tfc-section-head > div:first-child { min-width:0; }
            .tfc-section-head h3, .tfc-section-head span, .tfc-detail-head strong, .tfc-detail-head span { overflow-wrap:anywhere; }
            .tfc-finance-summary .tfc-card { min-height:132px; }
            .tfc-finance-summary .tfc-stat-value { font-size:clamp(17px, 1.45vw, 22px); }
            .tfc-war-summary .tfc-card, .tfc-chain-summary .tfc-card, .tfc-recruit-summary .tfc-card, .tfc-armory-summary .tfc-card, .tfc-history-summary .tfc-card { min-height:118px; }
            @container tfc (max-width: 980px) {
                .tfc-command-hero { flex-wrap:wrap; }
                .tfc-command-hero > .tfc-toolbar { width:100%; justify-content:flex-start; }
                .tfc-command-layout, .tfc-history-layout, .tfc-finance-layout, .tfc-armory-layout, .tfc-chain-layout { grid-template-columns:1fr; }
                .tfc-chain-plan-grid { grid-template-columns:repeat(3,minmax(0,1fr)); }
                .tfc-finance-entry-form { grid-template-columns:repeat(3,minmax(0,1fr)); }
                .tfc-recruit-form { grid-template-columns:repeat(2,minmax(0,1fr)); }
            }
            @container tfc (max-width: 720px) {
                .tfc-grid, .tfc-war-summary, .tfc-chain-summary, .tfc-recruit-summary, .tfc-armory-summary, .tfc-history-summary, .tfc-finance-summary, .tfc-command-modules { grid-template-columns:repeat(2,minmax(0,1fr)); }
                .tfc-payout-controls, .tfc-recruit-form, .tfc-finance-entry-form, .tfc-chain-plan-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
                .tfc-command-hero { flex-direction:column; }
                .tfc-command-hero > .tfc-toolbar { width:100%; }
            }
            @container tfc (max-width: 480px) {
                .tfc-grid, .tfc-finance-summary, .tfc-command-modules { grid-template-columns:1fr; }
                .tfc-payout-controls, .tfc-recruit-form, .tfc-finance-entry-form, .tfc-chain-plan-grid { grid-template-columns:1fr; }
                .tfc-metric-grid, .tfc-intel-grid, .tfc-war-detail-grid, .tfc-recruit-detail-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
                .tfc-stat-value { font-size:20px; }
            }
            #tfc-toast { background:#1a2834; color:#fff; border-color:var(--tfc-border-strong); font-size:12px; }
            @media (max-width: 800px) {
                #tfc-overlay { padding: 0; }
                .tfc-header { padding:10px 11px 9px; }
                .tfc-title small { max-width:58vw; }
                .tfc-tabs { padding:6px 7px 5px; gap:2px; }
                .tfc-tab { min-width:48px; padding:8px 9px; text-align:center; }
                .tfc-tab-full { display:none; }
                .tfc-tab-short { display:inline; font-size:10px; letter-spacing:.045em; }
                .tfc-tab::after { left:8px; right:8px; }
                .tfc-mobile-quickbar { display:flex; gap:7px; padding:7px 9px; border-bottom:1px solid var(--tfc-border); background:#0f161e; }
                .tfc-mobile-quickbar .tfc-btn { flex:1; min-height:34px; }
                .tfc-section-head { align-items:flex-start; }
                .tfc-toolbar { width:100%; }
                .tfc-input.search { min-width:0; flex:1 1 160px; }
                .tfc-table-wrap { border-radius:9px; }
                .tfc-table th, .tfc-table td { padding-left:8px; padding-right:8px; }
                .tfc-command-module-value { font-size:16px; }
                .tfc-card { padding:11px; min-height:116px; }
                #tfc-panel { width: 100vw; height: 100vh; max-width: none; border-radius: 0; border: 0; }
                .tfc-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                .tfc-alerts { grid-template-columns: 1fr; }
                .tfc-inline { grid-template-columns: 1fr; }
                .tfc-metric-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
                .tfc-intel-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                .tfc-war-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                .tfc-war-detail-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                .tfc-war-intel-grid { grid-template-columns:1fr; }
                .tfc-chain-summary { grid-template-columns:repeat(2,minmax(0,1fr)); }
                .tfc-chain-layout { grid-template-columns:1fr; }
                .tfc-chain-plan-grid { grid-template-columns:1fr 1fr; }
                .tfc-recruit-summary { grid-template-columns:repeat(2,minmax(0,1fr)); }
                .tfc-recruit-detail-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
                .tfc-recruit-form { grid-template-columns:1fr 1fr; }
                .tfc-armory-summary { grid-template-columns:repeat(2,minmax(0,1fr)); }
                .tfc-history-summary { grid-template-columns:repeat(2,minmax(0,1fr)); }
                .tfc-finance-summary { grid-template-columns:repeat(2,minmax(0,1fr)); }
                .tfc-finance-layout { grid-template-columns:1fr; }
                .tfc-command-modules { grid-template-columns:repeat(2,minmax(0,1fr)); }
                .tfc-command-layout { grid-template-columns:1fr; }
                .tfc-finance-entry-form { grid-template-columns:repeat(3,minmax(0,1fr)); }
                .tfc-armory-layout { grid-template-columns:1fr; }
                .tfc-history-layout { grid-template-columns:1fr; }
                .tfc-release-list { grid-template-columns:1fr; }
                .tfc-content { padding: 10px; }
                .tfc-head-actions .tfc-btn.hide-mobile { display: none; }
            }

            /* v0.15 member leadership records */
            .tfc-lead-summary { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,170px),1fr)); gap:9px; margin-bottom:12px; }
            .tfc-lead-flags { display:flex; flex-wrap:wrap; gap:4px; margin-top:4px; }
            .tfc-lead-chip { display:inline-flex; align-items:center; gap:4px; padding:2px 6px; border-radius:999px; border:1px solid var(--tfc-border); background:#17232e; color:var(--tfc-text-soft); font-size:9px; font-weight:800; white-space:nowrap; }
            .tfc-lead-chip.bad { color:#ffc0c0; border-color:rgba(255,128,128,.35); background:rgba(255,128,128,.08); }
            .tfc-lead-chip.warn { color:#ffd589; border-color:rgba(255,196,95,.35); background:rgba(255,196,95,.08); }
            .tfc-lead-chip.good { color:#9ae8bc; border-color:rgba(107,217,157,.3); background:rgba(107,217,157,.07); }
            .tfc-lead-chip.info { color:#9ce6f5; border-color:rgba(65,194,227,.3); background:rgba(65,194,227,.07); }
            .tfc-leadership { margin-top:14px; border-top:1px solid rgba(110,216,240,.18); padding-top:13px; }
            .tfc-leadership-head { display:flex; justify-content:space-between; align-items:flex-start; gap:10px; margin-bottom:10px; }
            .tfc-leadership-head strong { font-size:13px; }
            .tfc-leadership-head span { display:block; color:var(--tfc-muted); font-size:10px; margin-top:2px; }
            .tfc-leadership-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; }
            .tfc-lead-field { min-width:0; }
            .tfc-lead-field > label { display:block; color:var(--tfc-muted) !important; font-size:10px; font-weight:800; margin-bottom:4px; }
            .tfc-lead-field .tfc-input, .tfc-lead-field .tfc-select { width:100%; }
            .tfc-lead-wide { grid-column:1 / -1; }
            .tfc-lead-tags { display:flex; flex-wrap:wrap; gap:6px; }
            .tfc-lead-tag { display:inline-flex; align-items:center; gap:5px; min-height:32px; padding:5px 8px; border:1px solid var(--tfc-border); border-radius:8px; background:#111b24; color:var(--tfc-text-soft) !important; font-size:10px; font-weight:800; cursor:pointer; }
            .tfc-lead-tag:has(input:checked) { border-color:rgba(65,194,227,.5); background:rgba(65,194,227,.10); color:#dff8fd !important; }
            .tfc-lead-absence { display:grid; grid-template-columns:140px 140px minmax(180px,1fr) auto auto; gap:7px; align-items:end; }
            .tfc-lead-event-form { display:grid; grid-template-columns:150px 120px 150px minmax(220px,1fr) auto; gap:7px; align-items:end; }
            .tfc-lead-timeline { display:flex; flex-direction:column; gap:7px; margin-top:9px; }
            .tfc-lead-event { display:grid; grid-template-columns:86px minmax(0,1fr) auto; gap:9px; align-items:start; padding:9px 10px; border:1px solid var(--tfc-border); background:#101923; border-radius:9px; }
            .tfc-lead-event.warning, .tfc-lead-event.strike { border-left:3px solid var(--tfc-bad); }
            .tfc-lead-event.followup { border-left:3px solid var(--tfc-warn); }
            .tfc-lead-event.commendation { border-left:3px solid var(--tfc-good); }
            .tfc-lead-event.position { border-left:3px solid var(--tfc-accent); }
            .tfc-lead-event-type { color:var(--tfc-muted); font-size:9px; text-transform:uppercase; letter-spacing:.5px; font-weight:900; }
            .tfc-lead-event-body { color:var(--tfc-text-soft); font-size:11px; line-height:1.4; overflow-wrap:anywhere; }
            .tfc-lead-event-body small { display:block; color:var(--tfc-muted); margin-top:3px; font-size:9px; }
            .tfc-lead-event-actions { display:flex; gap:5px; flex-wrap:wrap; justify-content:flex-end; }
            .tfc-lead-event-actions .tfc-btn { min-height:29px; padding:4px 7px; font-size:9px; }
            .tfc-lead-empty { color:var(--tfc-muted); font-size:10px; padding:9px 0; }
            @container tfc (max-width: 760px) {
                .tfc-leadership-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
                .tfc-lead-absence { grid-template-columns:1fr 1fr; }
                .tfc-lead-absence .tfc-lead-note, .tfc-lead-absence .tfc-btn { grid-column:1 / -1; }
                .tfc-lead-event-form { grid-template-columns:1fr 1fr; }
                .tfc-lead-event-form .tfc-lead-event-text, .tfc-lead-event-form .tfc-btn { grid-column:1 / -1; }
            }
            @container tfc (max-width: 480px) {
                .tfc-leadership-grid { grid-template-columns:1fr; }
                .tfc-lead-absence, .tfc-lead-event-form { grid-template-columns:1fr; }
                .tfc-lead-absence > *, .tfc-lead-event-form > * { grid-column:1 !important; }
                .tfc-lead-event { grid-template-columns:1fr; }
                .tfc-lead-event-actions { justify-content:flex-start; }
            }
            @media (max-width: 470px) {
                .tfc-grid { grid-template-columns: repeat(1, minmax(0, 1fr)); }
                .tfc-header { gap:8px; }
                .tfc-title { gap:8px; }
                .tfc-title small { max-width:54vw; font-size:9px; }
                .tfc-head-sep { display:none; }
                .tfc-tabs { padding-left:5px; padding-right:5px; }
                .tfc-tab { min-width:45px; padding-left:7px; padding-right:7px; }
                .tfc-content { padding:8px; }
                .tfc-section { margin-top:11px; }
                .tfc-section-head { flex-direction:column; gap:6px; }
                .tfc-toolbar { gap:5px; }
                .tfc-toolbar .tfc-btn { min-height:34px; }
                .tfc-stat-value { font-size:20px; }
                .tfc-card { border-radius:9px; }
                .tfc-table { font-size:10px; }
                .tfc-empty { min-height:220px; padding:22px 16px; }
                .tfc-title h2 { font-size: 14px; }
                .tfc-metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                .tfc-war-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                .tfc-war-score { grid-template-columns:1fr; text-align:center; }
                .tfc-war-side.right { text-align:center; }
                .tfc-war-vs { display:none; }
                .tfc-war-detail-grid { grid-template-columns:1fr 1fr; }
                .tfc-chain-summary { grid-template-columns:repeat(2,minmax(0,1fr)); }
                .tfc-chain-plan-grid { grid-template-columns:1fr; }
                .tfc-chain-assignment { grid-template-columns:1fr 1fr; }
                .tfc-recruit-summary { grid-template-columns:repeat(2,minmax(0,1fr)); }
                .tfc-recruit-detail-grid { grid-template-columns:1fr; }
                .tfc-recruit-form { grid-template-columns:1fr; }
                .tfc-armory-summary { grid-template-columns:repeat(2,minmax(0,1fr)); }
                .tfc-history-summary { grid-template-columns:repeat(2,minmax(0,1fr)); }
                .tfc-finance-summary { grid-template-columns:repeat(2,minmax(0,1fr)); }
                .tfc-finance-entry-form { grid-template-columns:1fr 1fr; }
                .tfc-command-modules { grid-template-columns:1fr 1fr; }
                .tfc-command-hero { flex-direction:column; }
                .tfc-finance-entry-form .tfc-finance-wide { grid-column:1 / -1; }
                .tfc-logo { width: 33px; height: 33px; }
                #tfc-launcher { right: 0; }
                .tfc-card { min-height:78px; padding:11px 12px; }
                .tfc-stat-label { font-size:10px; }
                .tfc-stat-sub { font-size:10px; }
                .tfc-command-module { min-height:112px; }
                .tfc-command-module-sub { min-height:0; }
                .tfc-command-action { grid-template-columns:8px minmax(0,1fr); }
                .tfc-command-action em { display:none; }
                .tfc-command-legend { gap:6px 10px; }
                .tfc-table { font-size:11px; }
                .tfc-btn, .tfc-input, .tfc-select { min-height:40px; }
            }
        `;
        document.head.appendChild(style);
    }

    function ensureUi() {
        injectStyles();
        if (!$('#tfc-launcher')) {
            const launcher = document.createElement('button');
            launcher.id = 'tfc-launcher';
            launcher.textContent = 'TFC';
            launcher.title = APP.name;
            launcher.addEventListener('click', openPanel);
            document.body.appendChild(launcher);
        }
        if (!$('#tfc-overlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'tfc-overlay';
            overlay.innerHTML = `<div id="tfc-panel" style="--tfc-panel-width:${Number(state.config.panelWidth) || 1180}px"></div>`;
            overlay.addEventListener('click', e => {
                if (e.target === overlay) closePanel();
            });
            document.body.appendChild(overlay);
        }
        if (!$('#tfc-toast')) {
            const toast = document.createElement('div');
            toast.id = 'tfc-toast';
            document.body.appendChild(toast);
        }
    }

    function toast(message, type = 'ok') {
        const el = $('#tfc-toast');
        if (!el) return;
        el.textContent = message;
        el.className = type === 'error' ? 'show error' : 'show';
        clearTimeout(state.toastTimer);
        state.toastTimer = setTimeout(() => { el.className = ''; }, 3000);
    }

    function openPanel() {
        state.open = true;
        $('#tfc-overlay')?.classList.add('open');
        render();
        if (state.config.apiKey && !state.roster.length && !state.loadingRoster) {
            refreshRoster(false).then(() => {
                if (state.open && ['war','payout'].includes(state.activeTab)) refreshWar(false, true);
                if (state.open && state.activeTab === 'chain') refreshChain(false, true);
                if (state.open && state.activeTab === 'oc') refreshOC(false, true);
                if (state.open && state.activeTab === 'recruit') refreshRecruit(false, true);
                if (state.open && state.activeTab === 'armory') refreshArmory(false, true);
                if (state.open && state.activeTab === 'finance') refreshFinance(false, true);
            });
        } else if (state.config.apiKey && ['war','payout'].includes(state.activeTab)) {
            refreshWar(false, true);
        } else if (state.config.apiKey && state.activeTab === 'chain') {
            refreshChain(false, true);
        } else if (state.config.apiKey && state.activeTab === 'oc') {
            refreshOC(false, true);
        } else if (state.config.apiKey && state.activeTab === 'recruit') {
            refreshRecruit(false, true);
        } else if (state.config.apiKey && state.activeTab === 'armory') {
            refreshArmory(false, true);
        } else if (state.config.apiKey && state.activeTab === 'finance') {
            refreshFinance(false, true);
        }
    }

    function closePanel() {
        state.open = false;
        $('#tfc-overlay')?.classList.remove('open');
    }

    const TAB_META = {
        overview: { label: 'Command', short: 'CMD' },
        members: { label: 'Members', short: 'MEM' },
        war: { label: 'War', short: 'WAR' },
        payout: { label: 'Payouts', short: 'PAY' },
        chain: { label: 'Chain', short: 'CHN' },
        oc: { label: 'OC', short: 'OC' },
        recruit: { label: 'Recruit', short: 'REC' },
        armory: { label: 'Armory', short: 'ARM' },
        finance: { label: 'Finance', short: 'FIN' },
        history: { label: 'History', short: 'HIS' },
        settings: { label: 'Settings', short: 'SET' },
    };

    function activeTabMeta() {
        return TAB_META[state.activeTab] || { label: String(state.activeTab || 'Command'), short: 'TFC' };
    }

    function render() {
        if (!state.open) return;
        const panel = $('#tfc-panel');
        if (!panel) return;
        panel.style.setProperty('--tfc-panel-width', `${Number(state.config.panelWidth) || 1180}px`);
        panel.innerHTML = `
            <div class="tfc-header">
                <div class="tfc-title">
                    <div class="tfc-logo">TFC</div>
                    <div>
                        <h2>${escapeHtml(APP.name)}</h2>
                        <small>${state.faction ? `${escapeHtml(state.faction.name)}${state.faction.tag ? ` [${escapeHtml(state.faction.tag)}]` : ''}` : 'Faction leadership suite'} <span class="tfc-head-sep">•</span> ${escapeHtml(activeTabMeta().label)} <span class="tfc-head-sep">•</span> v${APP.version}</small>
                    </div>
                </div>
                <div class="tfc-head-actions">
                    <button class="tfc-btn hide-mobile" data-action="refresh-roster" ${state.loadingRoster ? 'disabled' : ''}>${state.loadingRoster ? 'Refreshing…' : 'Refresh roster'}</button>
                    <button class="tfc-btn primary hide-mobile" data-action="sync-intel" ${state.syncingIntel || !state.roster.length ? 'disabled' : ''}>${state.syncingIntel ? 'Syncing…' : 'Sync intel'}</button>
                    <button class="tfc-btn tfc-close-btn" data-action="close" title="Close Tideborn Faction Command" aria-label="Close Tideborn Faction Command">✕</button>
                </div>
            </div>
            <div class="tfc-tabs" role="tablist" aria-label="Faction Command modules">
                ${tabButton('overview', 'Command')}
                ${tabButton('members', 'Members')}
                ${tabButton('war', 'War')}
                ${tabButton('payout', 'Payouts')}
                ${tabButton('chain', 'Chain')}
                ${tabButton('oc', 'OC')}
                ${tabButton('recruit', 'Recruit')}
                ${tabButton('armory', 'Armory')}
                ${tabButton('finance', 'Finance')}
                ${tabButton('history', 'History')}
                ${tabButton('settings', 'Settings')}
            </div>
            <div class="tfc-mobile-quickbar">
                <button class="tfc-btn" data-action="refresh-roster" ${state.loadingRoster ? 'disabled' : ''}>${state.loadingRoster ? 'Refreshing…' : 'Refresh roster'}</button>
                <button class="tfc-btn primary" data-action="sync-intel" ${state.syncingIntel || !state.roster.length ? 'disabled' : ''}>${state.syncingIntel ? 'Syncing…' : 'Sync intel'}</button>
            </div>
            <div class="tfc-content">${renderActiveTab()}</div>
        `;
        bindUiEvents(panel);
    }

    function tabButton(key, label, disabled = false) {
        const meta = TAB_META[key] || { label, short: label };
        const active = state.activeTab === key;
        return `<button class="tfc-tab ${active ? 'active' : ''} ${disabled ? 'disabled' : ''}" data-tab="${key}" role="tab" aria-selected="${active ? 'true' : 'false'}" title="${escapeHtml(meta.label)}" ${disabled ? 'disabled' : ''}><span class="tfc-tab-full">${escapeHtml(meta.label)}</span><span class="tfc-tab-short">${escapeHtml(meta.short)}</span></button>`;
    }

    function renderActiveTab() {
        if (!state.config.apiKey && state.activeTab !== 'settings') return renderNoKey();
        if (state.activeTab === 'overview') return renderOverview();
        if (state.activeTab === 'members') return renderMembers();
        if (state.activeTab === 'war') return renderWar();
        if (state.activeTab === 'payout') return renderPayouts();
        if (state.activeTab === 'chain') return renderChain();
        if (state.activeTab === 'oc') return renderOC();
        if (state.activeTab === 'recruit') return renderRecruit();
        if (state.activeTab === 'armory') return renderArmory();
        if (state.activeTab === 'finance') return renderFinance();
        if (state.activeTab === 'history') return renderHistory();
        if (state.activeTab === 'settings') return renderSettings();
        return `<div class="tfc-placeholder-module"><strong>${escapeHtml(state.activeTab.toUpperCase())}</strong><br><br>Module scaffolded for a later build.</div>`;
    }

    function renderNoKey() {
        return `
            <div class="tfc-empty">
                <div>
                    <strong>Connect a Torn API key</strong>
                    Most modules work with Public access. OC Command needs at least a Minimal/Custom/Limited key with Faction API Access, while exact faction attack logs need the higher attack permission.<br><br>
                    <button class="tfc-btn primary" data-action="go-settings">Open Settings</button>
                </div>
            </div>
        `;
    }

    function memberBuckets() {
        const now = nowSec();
        const inactiveCutoff = Number(state.config.inactivityHours || 24) * 3600;
        const buckets = { total: 0, online: 0, idle: 0, hospital: 0, traveling: 0, oc: 0, inactive: 0 };
        for (const m of state.roster) {
            buckets.total++;
            const activity = String(m.last_action?.status || '').toLowerCase();
            if (activity === 'online') buckets.online++;
            else if (activity === 'idle') buckets.idle++;
            const s = String(m.status?.state || '').toLowerCase();
            if (s === 'hospital') buckets.hospital++;
            if (s === 'traveling' || s === 'abroad') buckets.traveling++;
            if (m.is_in_oc) buckets.oc++;
            const last = Number(m.last_action?.timestamp || 0);
            if (last && now - last >= inactiveCutoff) buckets.inactive++;
        }
        return buckets;
    }

    function commandAge(at) {
        const ts = Number(at || 0);
        if (!ts) return 'not loaded';
        return `${fmtDuration(Math.max(0, Math.floor((Date.now() - ts) / 1000)))} ago`;
    }

    function commandState(label, cls = 'muted') {
        return `<span class="tfc-command-state ${escapeHtml(cls)}">${escapeHtml(label)}</span>`;
    }

    function commandModuleCard(tab, title, value, sub, stateLabel, stateClass, updatedAt = 0) {
        return `<button class="tfc-command-module" data-command-tab="${escapeHtml(tab)}">
            <div class="tfc-command-module-top"><strong>${escapeHtml(title)}</strong>${commandState(stateLabel, stateClass)}</div>
            <div class="tfc-command-module-value">${escapeHtml(value)}</div>
            <div class="tfc-command-module-sub">${escapeHtml(sub)}</div>
            <div class="tfc-command-age">Updated ${escapeHtml(commandAge(updatedAt))} · open →</div>
        </button>`;
    }

    function commandChainTimeout() {
        if (!state.chain?.id || Number(state.chain.end || 0) || Number(state.chain.cooldown || 0)) return null;
        const age = Math.floor((Date.now() - Number(state.chainLastFetchedAt || Date.now())) / 1000);
        return Math.max(0, Number(state.chain.timeout || 0) - age);
    }

    function commandUnpaidWarPayouts() {
        let count = 0, amount = 0;
        for (const [warId, raw] of Object.entries(state.payoutDrafts || {})) {
            const d = { ...defaultPayoutDraft(), ...(raw || {}) };
            if (!Number(d.grossValue || 0) || Number(d.paidAt || 0)) continue;
            const calc = computePayout(warId);
            if (Number(calc.totalFinal || 0) <= 0) continue;
            count++;
            amount += Number(calc.totalFinal || 0);
        }
        return { count, amount };
    }


    const LEADERSHIP_TAGS = ['Reliable','Needs attention','War carry','Chain','OC specialist','New member'];
    const LEADERSHIP_PROMOTION = ['None','Consider','Ready'];
    const LEADERSHIP_REVIEW = ['None','Demotion review','Removal review'];

    function leadershipAllTags() {
        const tags = new Set(LEADERSHIP_TAGS);
        for (const rec of Object.values(state.memberLeadership || {})) for (const tag of rec?.tags || []) if (tag) tags.add(tag);
        return [...tags].sort((a,b)=>a.localeCompare(b));
    }

    function leadershipId() {
        return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
    }

    function leadershipNormalize(id, name = '') {
        const sid = String(id);
        const existing = state.memberLeadership[sid] || {};
        const rec = {
            id: Number(id) || id,
            name: name || existing.name || `#${id}`,
            tags: Array.isArray(existing.tags) ? existing.tags : [],
            preferredOcRoles: existing.preferredOcRoles || '',
            warAvailability: existing.warAvailability || '',
            timezone: existing.timezone || '',
            recruiter: existing.recruiter || '',
            recruitmentSource: existing.recruitmentSource || '',
            promotion: existing.promotion || 'None',
            review: existing.review || 'None',
            absence: existing.absence && typeof existing.absence === 'object' ? existing.absence : null,
            events: Array.isArray(existing.events) ? existing.events : [],
            positionHistory: Array.isArray(existing.positionHistory) ? existing.positionHistory : [],
            lastKnownPosition: existing.lastKnownPosition || '',
            firstObservedAt: Number(existing.firstObservedAt || nowSec()),
            updatedAt: Number(existing.updatedAt || nowSec()),
        };
        state.memberLeadership[sid] = rec;
        return rec;
    }

    function leadershipFor(memberOrId) {
        const id = typeof memberOrId === 'object' ? memberOrId?.id : memberOrId;
        const name = typeof memberOrId === 'object' ? memberOrId?.name : '';
        return leadershipNormalize(id, name);
    }

    function leadershipTrim(rec) {
        const limit = Math.max(30, Number(state.config.leadershipEventLimit || 120));
        rec.events = (rec.events || []).sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0)).slice(0, limit);
        rec.positionHistory = (rec.positionHistory || []).sort((a,b)=>Number(b.at||0)-Number(a.at||0)).slice(0, 40);
        return rec;
    }

    async function saveLeadership() {
        for (const rec of Object.values(state.memberLeadership || {})) leadershipTrim(rec);
        await Store.set('memberLeadership', state.memberLeadership);
    }

    function leadershipDateValue(ts) {
        if (!Number(ts || 0)) return '';
        return new Date(Number(ts) * 1000).toISOString().slice(0,10);
    }

    function leadershipDateToSec(value, end = false) {
        if (!value) return 0;
        const ms = Date.parse(`${value}T${end ? '23:59:59' : '00:00:00'}Z`);
        return Number.isFinite(ms) ? Math.floor(ms / 1000) : 0;
    }

    function leadershipActiveAbsence(rec, at = nowSec()) {
        const a = rec?.absence;
        if (!a) return false;
        const start = Number(a.start || 0), end = Number(a.end || 0);
        return !!start && start <= at && (!end || end >= at);
    }

    function leadershipUpcomingAbsence(rec, days = 14, at = nowSec()) {
        const a = rec?.absence;
        if (!a?.start) return false;
        const start = Number(a.start || 0);
        return start > at && start <= at + Number(days) * 86400;
    }

    function leadershipOpenWarnings(rec) {
        return (rec?.events || []).filter(e => ['warning','strike'].includes(e.type) && !Number(e.resolvedAt || 0));
    }

    function leadershipOpenFollowups(rec) {
        return (rec?.events || []).filter(e => e.type === 'followup' && !Number(e.resolvedAt || 0));
    }

    function leadershipOverdueFollowups(rec, at = nowSec()) {
        return leadershipOpenFollowups(rec).filter(e => Number(e.dueAt || 0) && Number(e.dueAt) < at);
    }

    function leadershipSummary() {
        const now = nowSec();
        const out = { warnings:[], followups:[], overdue:[], absent:[], upcomingAbsences:[], promotions:[], reviews:[] };
        for (const m of state.roster || []) {
            const rec = leadershipFor(m);
            const warnings = leadershipOpenWarnings(rec);
            const followups = leadershipOpenFollowups(rec);
            const overdue = leadershipOverdueFollowups(rec, now);
            if (warnings.length) out.warnings.push({ member:m, rec, count:warnings.length });
            if (followups.length) out.followups.push({ member:m, rec, count:followups.length });
            if (overdue.length) out.overdue.push({ member:m, rec, count:overdue.length, next:overdue.sort((a,b)=>Number(a.dueAt||0)-Number(b.dueAt||0))[0] });
            if (leadershipActiveAbsence(rec, now)) out.absent.push({ member:m, rec });
            else if (leadershipUpcomingAbsence(rec, 14, now)) out.upcomingAbsences.push({ member:m, rec });
            if (rec.promotion && rec.promotion !== 'None') out.promotions.push({ member:m, rec });
            if (rec.review && rec.review !== 'None') out.reviews.push({ member:m, rec });
        }
        return out;
    }

    function leadershipMemberFlags(member) {
        const rec = leadershipFor(member);
        const flags = [];
        const warnings = leadershipOpenWarnings(rec).length;
        const overdue = leadershipOverdueFollowups(rec).length;
        if (overdue) flags.push({ label:`${overdue} overdue`, cls:'bad' });
        if (warnings) flags.push({ label:`${warnings} warning${warnings===1?'':'s'}`, cls:'warn' });
        if (leadershipActiveAbsence(rec)) flags.push({ label:'Absent', cls:'info' });
        else if (leadershipUpcomingAbsence(rec)) flags.push({ label:'Absence soon', cls:'info' });
        if (rec.review && rec.review !== 'None') flags.push({ label:rec.review, cls:'bad' });
        if (rec.promotion && rec.promotion !== 'None') flags.push({ label:`Promotion: ${rec.promotion}`, cls:'good' });
        return flags;
    }

    function leadershipFlagsHtml(member) {
        const flags = leadershipMemberFlags(member);
        if (!flags.length) return '';
        return `<div class="tfc-lead-flags">${flags.slice(0,4).map(f=>`<span class="tfc-lead-chip ${f.cls}">${escapeHtml(f.label)}</span>`).join('')}</div>`;
    }

    async function observeLeadershipRoster() {
        let changed = false;
        const now = nowSec();
        for (const m of state.roster || []) {
            const sid = String(m.id);
            const existed = !!state.memberLeadership[sid];
            const rec = leadershipFor(m);
            if (rec.name !== m.name) { rec.name = m.name; changed = true; }
            const position = String(m.position || 'Member');
            if (!rec.lastKnownPosition) {
                rec.lastKnownPosition = position;
                rec.positionHistory.unshift({ id:leadershipId(), type:'position', at:now, from:'', to:position, text:`First observed as ${position}` });
                changed = true;
            } else if (rec.lastKnownPosition !== position) {
                rec.positionHistory.unshift({ id:leadershipId(), type:'position', at:now, from:rec.lastKnownPosition, to:position, text:`Position changed: ${rec.lastKnownPosition} → ${position}` });
                rec.lastKnownPosition = position;
                rec.updatedAt = now;
                changed = true;
            }
            const candidate = state.recruitCandidates?.[sid];
            if (candidate) {
                if (!rec.recruiter && candidate.referrer) { rec.recruiter = candidate.referrer; changed = true; }
                if (!rec.recruitmentSource) { rec.recruitmentSource = candidate.source === 'application' ? 'Faction application' : (candidate.source || 'Recruitment pipeline'); changed = true; }
            }
            if (!existed) changed = true;
            leadershipTrim(rec);
        }
        if (changed) await saveLeadership();
    }

    function leadershipTimeline(rec) {
        const events = (rec?.events || []).map(e => ({ ...e, at:Number(e.createdAt||0) }));
        const positions = (rec?.positionHistory || []).map(e => ({ ...e, type:'position', at:Number(e.at||0), createdAt:Number(e.at||0) }));
        return [...events, ...positions].sort((a,b)=>Number(b.at||0)-Number(a.at||0));
    }

    function leadershipEventTitle(e) {
        if (e.type === 'warning') return e.resolvedAt ? 'Resolved warning' : 'Warning';
        if (e.type === 'strike') return e.resolvedAt ? 'Resolved strike' : 'Strike';
        if (e.type === 'followup') return e.resolvedAt ? 'Resolved follow-up' : 'Follow-up';
        if (e.type === 'commendation') return 'Commendation';
        if (e.type === 'position') return 'Position';
        return 'Note';
    }

    function leadershipRenderTimeline(rec) {
        const rows = leadershipTimeline(rec).slice(0, 20);
        if (!rows.length) return `<div class="tfc-lead-empty">No leadership timeline entries yet.</div>`;
        return `<div class="tfc-lead-timeline">${rows.map(e => {
            const type = e.type || 'note';
            const resolved = Number(e.resolvedAt || 0);
            const due = Number(e.dueAt || 0);
            const meta = [fmtDateTime(e.at || e.createdAt), e.severity && type==='warning' ? `severity: ${e.severity}` : '', due ? `due ${fmtDateTime(due)}` : '', resolved ? `resolved ${fmtDateTime(resolved)}` : ''].filter(Boolean).join(' · ');
            return `<div class="tfc-lead-event ${escapeHtml(type)}"><div class="tfc-lead-event-type">${escapeHtml(leadershipEventTitle(e))}</div><div class="tfc-lead-event-body">${escapeHtml(e.text || '')}<small>${escapeHtml(meta)}</small></div><div class="tfc-lead-event-actions">${['warning','strike','followup'].includes(type) ? `<button class="tfc-btn" data-lead-resolve-event="${escapeHtml(rec.id)}" data-lead-event-id="${escapeHtml(e.id)}">${resolved?'Reopen':'Resolve'}</button>` : ''}${type !== 'position' ? `<button class="tfc-btn danger" data-lead-delete-event="${escapeHtml(rec.id)}" data-lead-event-id="${escapeHtml(e.id)}">Delete</button>` : ''}</div></div>`;
        }).join('')}</div>`;
    }

    function renderLeadershipPanel(member) {
        const rec = leadershipFor(member);
        const absence = rec.absence || {};
        const joinApprox = Number(member.days_in_faction || 0) ? nowSec() - Number(member.days_in_faction) * 86400 : 0;
        const tags = LEADERSHIP_TAGS.map(tag => `<label class="tfc-lead-tag"><input type="checkbox" data-lead-tag-member="${member.id}" data-lead-tag-name="${escapeHtml(tag)}" ${(rec.tags||[]).includes(tag)?'checked':''}>${escapeHtml(tag)}</label>`).join('');
        const customTags = (rec.tags || []).filter(tag => !LEADERSHIP_TAGS.includes(tag)).join(', ');
        return `<div class="tfc-leadership">
            <div class="tfc-leadership-head"><div><strong>Leadership record</strong><span>Private to this device · ${joinApprox ? `joined approximately ${fmtDateTime(joinApprox)} · ` : ''}${fmtNumber(member.days_in_faction || 0)} days tenure</span></div>${leadershipFlagsHtml(member)}</div>
            <div class="tfc-leadership-grid">
                <div class="tfc-lead-field tfc-lead-wide"><label>Tags</label><div class="tfc-lead-tags">${tags}</div><input class="tfc-input" style="margin-top:7px" data-lead-custom-tags="${member.id}" value="${escapeHtml(customTags)}" placeholder="Other tags, comma separated"></div>
                <div class="tfc-lead-field"><label>Preferred OC roles</label><input class="tfc-input" data-lead-field="preferredOcRoles" data-lead-member="${member.id}" value="${escapeHtml(rec.preferredOcRoles)}" placeholder="Driver, Muscle, Enforcer…"></div>
                <div class="tfc-lead-field"><label>Timezone / usual hours</label><input class="tfc-input" data-lead-field="timezone" data-lead-member="${member.id}" value="${escapeHtml(rec.timezone)}" placeholder="TCT or local timezone"></div>
                <div class="tfc-lead-field"><label>War availability</label><input class="tfc-input" data-lead-field="warAvailability" data-lead-member="${member.id}" value="${escapeHtml(rec.warAvailability)}" placeholder="e.g. 18:00-02:00 TCT"></div>
                <div class="tfc-lead-field"><label>Recruited / referred by</label><input class="tfc-input" data-lead-field="recruiter" data-lead-member="${member.id}" value="${escapeHtml(rec.recruiter)}" placeholder="Member name or Torn ID"></div>
                <div class="tfc-lead-field"><label>Recruitment source</label><input class="tfc-input" data-lead-field="recruitmentSource" data-lead-member="${member.id}" value="${escapeHtml(rec.recruitmentSource)}" placeholder="Application, referral, forum…"></div>
                <div class="tfc-lead-field"><label>Promotion</label><select class="tfc-select" data-lead-field="promotion" data-lead-member="${member.id}">${LEADERSHIP_PROMOTION.map(v=>`<option value="${v}" ${rec.promotion===v?'selected':''}>${v}</option>`).join('')}</select></div>
                <div class="tfc-lead-field"><label>Demotion / removal</label><select class="tfc-select" data-lead-field="review" data-lead-member="${member.id}">${LEADERSHIP_REVIEW.map(v=>`<option value="${v}" ${rec.review===v?'selected':''}>${v}</option>`).join('')}</select></div>
            </div>
            <div class="tfc-section" style="margin-top:11px"><div class="tfc-section-head"><div><h3>Planned absence</h3><span class="tfc-muted" style="font-size:10px">Use this for holidays, work, travel, or known periods away from faction activity.</span></div></div><div class="tfc-lead-absence"><div class="tfc-lead-field"><label>From</label><input class="tfc-input" type="date" data-lead-absence-start="${member.id}" value="${leadershipDateValue(absence.start)}"></div><div class="tfc-lead-field"><label>Until</label><input class="tfc-input" type="date" data-lead-absence-end="${member.id}" value="${leadershipDateValue(absence.end)}"></div><div class="tfc-lead-field tfc-lead-note"><label>Reason / note</label><input class="tfc-input" data-lead-absence-note="${member.id}" value="${escapeHtml(absence.note||'')}" placeholder="Optional leadership note"></div><button class="tfc-btn primary" data-lead-save-absence="${member.id}">Save absence</button><button class="tfc-btn" data-lead-clear-absence="${member.id}" ${rec.absence?'':'disabled'}>Clear</button></div></div>
            <div class="tfc-section" style="margin-top:11px"><div class="tfc-section-head"><div><h3>Add leadership entry</h3><span class="tfc-muted" style="font-size:10px">Warnings, strikes and follow-ups stay open until resolved. Commendations provide a positive record too.</span></div></div><div class="tfc-lead-event-form"><div class="tfc-lead-field"><label>Type</label><select class="tfc-select" data-lead-new-type="${member.id}"><option value="note">Note</option><option value="warning">Warning</option><option value="strike">Strike</option><option value="commendation">Commendation</option><option value="followup">Follow-up</option></select></div><div class="tfc-lead-field"><label>Severity</label><select class="tfc-select" data-lead-new-severity="${member.id}"><option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option></select></div><div class="tfc-lead-field"><label>Due date (follow-up)</label><input class="tfc-input" type="date" data-lead-new-due="${member.id}"></div><div class="tfc-lead-field tfc-lead-event-text"><label>Entry</label><input class="tfc-input" data-lead-new-text="${member.id}" placeholder="What should leadership remember?"></div><button class="tfc-btn primary" data-lead-add-event="${member.id}">Add entry</button></div>${leadershipRenderTimeline(rec)}</div>
        </div>`;
    }

    async function saveLeadershipField(id, field, value) {
        const rec = leadershipFor(id);
        rec[field] = value;
        rec.updatedAt = nowSec();
        await saveLeadership();
    }

    async function toggleLeadershipTag(id, tag, checked) {
        const rec = leadershipFor(id);
        const set = new Set(rec.tags || []);
        if (checked) set.add(tag); else set.delete(tag);
        rec.tags = [...set];
        rec.updatedAt = nowSec();
        await saveLeadership();
    }

    async function saveLeadershipCustomTags(id, value) {
        const rec = leadershipFor(id);
        const defaults = (rec.tags || []).filter(tag => LEADERSHIP_TAGS.includes(tag));
        const custom = String(value || '').split(',').map(x=>x.trim()).filter(Boolean).slice(0,20);
        rec.tags = [...new Set([...defaults, ...custom])];
        rec.updatedAt = nowSec();
        await saveLeadership();
    }

    async function saveLeadershipAbsence(id) {
        const panel = $('#tfc-panel');
        const start = leadershipDateToSec($(`[data-lead-absence-start="${id}"]`, panel)?.value || '');
        const end = leadershipDateToSec($(`[data-lead-absence-end="${id}"]`, panel)?.value || '', true);
        const note = $(`[data-lead-absence-note="${id}"]`, panel)?.value?.trim() || '';
        if (!start) return toast('Choose an absence start date', 'error');
        if (end && end < start) return toast('Absence end date cannot be before the start', 'error');
        const rec = leadershipFor(id);
        rec.absence = { start, end, note, updatedAt:nowSec() };
        rec.updatedAt = nowSec();
        await saveLeadership();
        toast('Absence saved');
        render();
    }

    async function clearLeadershipAbsence(id) {
        const rec = leadershipFor(id);
        rec.absence = null;
        rec.updatedAt = nowSec();
        await saveLeadership();
        toast('Absence cleared');
        render();
    }

    async function addLeadershipEvent(id) {
        const panel = $('#tfc-panel');
        const type = $(`[data-lead-new-type="${id}"]`, panel)?.value || 'note';
        const severity = $(`[data-lead-new-severity="${id}"]`, panel)?.value || 'medium';
        const dueAt = leadershipDateToSec($(`[data-lead-new-due="${id}"]`, panel)?.value || '', true);
        const text = $(`[data-lead-new-text="${id}"]`, panel)?.value?.trim() || '';
        if (!text) return toast('Write a leadership entry first', 'error');
        if (type === 'followup' && !dueAt) return toast('Choose a due date for a follow-up', 'error');
        const rec = leadershipFor(id);
        rec.events.unshift({ id:leadershipId(), type, severity:['warning','strike'].includes(type)?severity:'', text, dueAt:type==='followup'?dueAt:0, createdAt:nowSec(), resolvedAt:0 });
        rec.updatedAt = nowSec();
        leadershipTrim(rec);
        await saveLeadership();
        toast(`${leadershipEventTitle({type})} added`);
        render();
    }

    async function resolveLeadershipEvent(memberId, eventId) {
        const rec = leadershipFor(memberId);
        const event = (rec.events || []).find(e => String(e.id) === String(eventId));
        if (!event) return;
        event.resolvedAt = event.resolvedAt ? 0 : nowSec();
        rec.updatedAt = nowSec();
        await saveLeadership();
        render();
    }

    async function deleteLeadershipEvent(memberId, eventId) {
        const rec = leadershipFor(memberId);
        rec.events = (rec.events || []).filter(e => String(e.id) !== String(eventId));
        rec.updatedAt = nowSec();
        await saveLeadership();
        render();
    }

    function copyLeadershipCsv() {
        const rows = [['Name','ID','Position','Days in faction','Tags','Open warnings/strikes','Open follow-ups','Overdue follow-ups','Absence from','Absence until','Absence note','Promotion','Review','Preferred OC roles','War availability','Timezone','Recruiter','Recruitment source','Timeline entries','Latest leadership entry','Latest entry date']];
        for (const m of getFilteredSortedMembers()) {
            const rec = leadershipFor(m);
            const latest = leadershipTimeline(rec).find(e=>e.type!=='position') || leadershipTimeline(rec)[0] || null;
            rows.push([m.name,m.id,m.position||'',m.days_in_faction||0,(rec.tags||[]).join('; '),leadershipOpenWarnings(rec).length,leadershipOpenFollowups(rec).length,leadershipOverdueFollowups(rec).length,leadershipDateValue(rec.absence?.start),leadershipDateValue(rec.absence?.end),rec.absence?.note||'',rec.promotion||'None',rec.review||'None',rec.preferredOcRoles||'',rec.warAvailability||'',rec.timezone||'',rec.recruiter||'',rec.recruitmentSource||'',leadershipTimeline(rec).length,latest?.text||'',latest?.at?new Date(Number(latest.at)*1000).toISOString():'']);
        }
        const csv = rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n');
        navigator.clipboard?.writeText(csv).then(()=>toast('Leadership CSV copied')).catch(()=>toast('Could not copy CSV','error'));
    }

    function commandContext() {
        const b = memberBuckets();
        const active = b.online + b.idle;
        const inactiveMembers = state.roster.filter(m => m.last_action?.timestamp && nowSec() - Number(m.last_action.timestamp) >= Number(state.config.inactivityHours || 24) * 3600);

        const war = state.currentWar;
        const phase = warPhase(war);
        const sides = currentWarSides();
        const enemy = enemyStatusBuckets();
        const liveWar = !!war && !Number(war.end || 0) && Number(war.start || 0) <= nowSec();
        const scheduledWar = !!war && !Number(war.end || 0) && Number(war.start || 0) > nowSec();
        const ourScore = Number(sides.ours?.score || 0), enemyScore = Number(sides.enemy?.score || 0);

        const chainTimeout = commandChainTimeout();
        const chainLive = chainTimeout !== null;
        const coverage = chainCoverageSummary();

        const ocActive = (state.ocCrimes || []).filter(c => ['recruiting','planning'].includes(String(c.status || '').toLowerCase()));
        let ocEmpty = 0, ocMissing = 0, ocLowCpr = 0;
        for (const c of ocActive) {
            const st = ocCrimeStats(c);
            ocEmpty += st.empty;
            ocMissing += st.missing;
            for (const slot of c.slots || []) {
                const cpr = Number(slot?.checkpoint_pass_rate || 0);
                if (slot?.user?.id && cpr > 0 && cpr < Number(state.config.ocLowCprThreshold || 70)) ocLowCpr++;
            }
        }
        const assignments = ocCurrentAssignments();
        const ocUnassigned = state.roster.filter(m => !assignments.has(String(m.id))).length;

        const candidates = Object.values(state.recruitCandidates || {});
        const activeApps = candidates.filter(recruitIsActiveApp).length;
        const newCandidates = candidates.filter(c => String(c.pipelineStatus || 'New') === 'New').length;
        const recruitInPlay = candidates.filter(c => ['Contacted','Interested','Trial'].includes(String(c.pipelineStatus || ''))).length;
        const unpaidRefs = candidates.filter(c => c.referrer && !c.referralPaid);
        const unpaidRefAmount = unpaidRefs.reduce((sum,c) => sum + Number(c.referralAmount || 0), 0);

        const armTotals = state.armoryInventory.length ? armoryTotals() : null;
        const ocRequirements = state.armoryInventory.length ? armoryOcRequirements() : [];
        const ocHardBlocks = ocRequirements.filter(r => !r.ready && Number(r.armoryAvailable || 0) <= 0).length;
        const loans = state.armoryInventory.length ? armoryLoanRows() : [];
        const vault = armoryBalanceBreakdown();
        const exMemberBalances = vault ? vault.members.filter(m => !new Set(state.roster.map(x => String(x.id))).has(String(m.id)) && (Number(m.money || 0) || Number(m.points || 0))) : [];
        const exMemberMoney = exMemberBalances.reduce((s,m) => s + Number(m.money || 0), 0);

        const unpaidWar = commandUnpaidWarPayouts();
        const leadership = leadershipSummary();

        return {
            b, active, inactiveMembers,
            war, phase, sides, enemy, liveWar, scheduledWar, ourScore, enemyScore,
            chainTimeout, chainLive, coverage,
            ocActive, ocEmpty, ocMissing, ocLowCpr, ocUnassigned,
            candidates, activeApps, newCandidates, recruitInPlay, unpaidRefs, unpaidRefAmount,
            armTotals, ocHardBlocks, loans, vault, exMemberBalances, exMemberMoney,
            unpaidWar, leadership,
        };
    }

    function commandPriorityQueue(ctx) {
        const rows = [];
        const add = (severity, tab, title, detail, rank = 50) => rows.push({ severity, tab, title, detail, rank });

        if (ctx.chainLive && ctx.chainTimeout <= Number(state.config.chainDangerSeconds || 120))
            add('bad','chain','Chain timer is in danger',`${fmtDuration(ctx.chainTimeout)} remaining before the live chain breaks.`,1);
        else if (ctx.chainLive && ctx.chainTimeout <= Number(state.config.chainWarningSeconds || 240))
            add('warn','chain','Chain timer needs attention',`${fmtDuration(ctx.chainTimeout)} remains on the live chain.`,8);
        if (ctx.chainLive && ctx.coverage.current === 0)
            add('warn','chain','No planned chain coverage now',`${ctx.coverage.gaps} uncovered hour${ctx.coverage.gaps===1?'':'s'} in the next ${state.config.chainCoverageHours}h.`,10);

        if (ctx.liveWar && ctx.enemy.soon > 0)
            add('warn','war',`${ctx.enemy.soon} enemy ${ctx.enemy.soon===1?'target is':'targets are'} releasing soon`,`${ctx.enemy.attackable} currently attackable · ${ctx.enemy.active} active/idle.`,12);
        else if (ctx.liveWar)
            add('good','war','Ranked War is live',`${ctx.ourScore.toLocaleString()} - ${ctx.enemyScore.toLocaleString()} · ${ctx.enemy.attackable} enemy targets currently attackable.`,28);
        else if (ctx.scheduledWar)
            add('warn','war','Ranked War is scheduled',`Starts ${fmtDateTime(ctx.war.start)} · opponent ${ctx.sides.enemy?.name || state.warOpponent?.name || 'unknown'}.`,26);

        if (ctx.ocHardBlocks > 0)
            add('bad','armory',`${ctx.ocHardBlocks} OC item ${ctx.ocHardBlocks===1?'requirement has':'requirements have'} no faction stock`,`Assigned members are missing required items and no available armory copy was observed.`,3);
        if (ctx.ocMissing > 0)
            add('warn','oc',`${ctx.ocMissing} assigned OC item ${ctx.ocMissing===1?'is':'items are'} missing`,`Check the OC slot and armory source before execution.`,14);
        if (ctx.ocEmpty > 0)
            add('warn','oc',`${ctx.ocEmpty} empty OC ${ctx.ocEmpty===1?'slot':'slots'}`,`${ctx.ocActive.length} active/recruiting crime${ctx.ocActive.length===1?'':'s'} currently tracked.`,18);
        if (ctx.ocLowCpr > 0)
            add('warn','oc',`${ctx.ocLowCpr} OC ${ctx.ocLowCpr===1?'assignment is':'assignments are'} below the CPR alert`, `Threshold is ${Number(state.config.ocLowCprThreshold || 70)}%.`,24);

        if (ctx.activeApps > 0)
            add('warn','recruit',`${ctx.activeApps} active faction ${ctx.activeApps===1?'application':'applications'}`,`${ctx.newCandidates} candidate${ctx.newCandidates===1?'':'s'} still in New stage.`,20);
        else if (ctx.newCandidates > 0)
            add('warn','recruit',`${ctx.newCandidates} recruitment ${ctx.newCandidates===1?'candidate needs':'candidates need'} triage`,`Open Recruitment Command to contact, reject, or move them into your pipeline.`,32);

        if (ctx.armTotals?.shortages > 0)
            add('warn','armory',`${ctx.armTotals.shortages} armory ${ctx.armTotals.shortages===1?'item is':'items are'} below minimum`,`${fmtNumber(ctx.armTotals.shortfallUnits)} total units short against your configured stock rules.`,16);
        if (ctx.exMemberBalances.length > 0)
            add('warn','armory',`${ctx.exMemberBalances.length} ex-member ${ctx.exMemberBalances.length===1?'balance remains':'balances remain'}`,`${fmtMoney(ctx.exMemberMoney)} in ex-member cash deposits remains recorded.`,21);

        if (ctx.unpaidWar.count > 0)
            add('warn','payout',`${ctx.unpaidWar.count} war ${ctx.unpaidWar.count===1?'payout is':'payouts are'} still marked unpaid`,`${fmtMoney(ctx.unpaidWar.amount)} calculated member payout value.`,17);
        if (ctx.unpaidRefs.length > 0)
            add('warn','finance',`${ctx.unpaidRefs.length} referral ${ctx.unpaidRefs.length===1?'payment is':'payments are'} outstanding`,`${fmtMoney(ctx.unpaidRefAmount)} currently recorded as referral liabilities.`,22);

        if (ctx.leadership.overdue.length > 0)
            add('bad','members',`${ctx.leadership.overdue.length} member${ctx.leadership.overdue.length===1?' has':'s have'} overdue leadership follow-ups`,ctx.leadership.overdue.slice(0,4).map(x=>x.member.name).join(', ') + (ctx.leadership.overdue.length>4?'…':''),5);
        if (ctx.leadership.reviews.length > 0)
            add('bad','members',`${ctx.leadership.reviews.length} member${ctx.leadership.reviews.length===1?' has':'s have'} demotion/removal review flags`,ctx.leadership.reviews.slice(0,4).map(x=>`${x.member.name}: ${x.rec.review}`).join(' · '),11);
        if (ctx.leadership.warnings.length > 0)
            add('warn','members',`${ctx.leadership.warnings.length} member${ctx.leadership.warnings.length===1?' has':'s have'} open leadership warnings`,ctx.leadership.warnings.slice(0,4).map(x=>x.member.name).join(', ') + (ctx.leadership.warnings.length>4?'…':''),19);
        if (ctx.leadership.absent.length > 0 || ctx.leadership.upcomingAbsences.length > 0)
            add('warn','members',`${ctx.leadership.absent.length} absent · ${ctx.leadership.upcomingAbsences.length} absence${ctx.leadership.upcomingAbsences.length===1?'':'s'} upcoming`,`Leadership availability records for the next 14 days.`,27);
        if (ctx.leadership.promotions.length > 0)
            add('warn','members',`${ctx.leadership.promotions.length} promotion ${ctx.leadership.promotions.length===1?'review is':'reviews are'} open`,ctx.leadership.promotions.slice(0,4).map(x=>`${x.member.name}: ${x.rec.promotion}`).join(' · '),34);

        if (ctx.inactiveMembers.length > 0)
            add('warn','members',`${ctx.inactiveMembers.length} member${ctx.inactiveMembers.length===1?' is':'s are'} inactive ${state.config.inactivityHours}h+`,ctx.inactiveMembers.slice(0,4).map(m=>m.name).join(', ') + (ctx.inactiveMembers.length>4?'…':''),30);

        const dataProblems = [state.ocError, state.recruitError, state.armoryError, state.armoryBalanceError, state.financeError].filter(Boolean);
        if (dataProblems.length)
            add('warn','settings','Some Command data is permission-limited or partially stale',`${dataProblems.length} module warning${dataProblems.length===1?'':'s'} currently reported.`,40);

        return rows.sort((a,b) => a.rank - b.rank).slice(0,12);
    }

    function commandQueueHtml(rows) {
        if (!rows.length) return `<div class="tfc-alert"><strong class="tfc-good">No obvious command actions</strong><span>Loaded module data is not currently flagging a leadership action.</span></div>`;
        return `<div class="tfc-command-queue">${rows.map(r => `<button class="tfc-command-action ${r.severity}" data-command-tab="${escapeHtml(r.tab)}"><i></i><span><strong>${escapeHtml(r.title)}</strong><small>${escapeHtml(r.detail)}</small></span><em>Open →</em></button>`).join('')}</div>`;
    }

    function commandDataHealthRow(name, updatedAt, error = '', target = '', staleMs = 0) {
        const at = Number(updatedAt || 0);
        const stale = at && Number(staleMs || 0) > 0 && Date.now() - at > Number(staleMs);
        let status = 'Ready', cls = 'good';
        if (error) { status = 'Warning'; cls = 'warn'; }
        else if (!at) { status = 'Not loaded'; cls = 'muted'; }
        else if (stale) { status = 'Stale'; cls = 'warn'; }
        const detail = error ? escapeHtml(error).slice(0,120) : at ? `Updated ${escapeHtml(commandAge(at))}${stale ? ' · refresh recommended' : ''}` : 'No local snapshot yet';
        return `<div class="tfc-command-health-row"><strong>${escapeHtml(name)}</strong><span>${detail}</span>${target ? `<button class="tfc-command-state ${cls}" data-command-tab="${escapeHtml(target)}">${escapeHtml(status)}</button>` : commandState(status, cls)}</div>`;
    }

    async function refreshCommandCenter(force = true) {
        if (state.commandRefreshing || !state.config?.apiKey) return;
        state.commandRefreshing = true;
        render();
        try {
            await refreshRoster(force);
            await Promise.allSettled([
                refreshWar(force, true),
                refreshChain(force, true),
                refreshOC(force, true),
                refreshRecruit(force, true),
                refreshFinance(force, true),
            ]);
            await refreshArmory(false, true);
            await recordAnalyticsSnapshot();
            state.commandLastRefreshedAt = Date.now();
            toast('Command Center refreshed');
        } catch (err) {
            console.error('[TFC] command refresh failed', err);
            toast(`Command refresh finished with an error: ${err.message || err}`, 'error');
        } finally {
            state.commandRefreshing = false;
            render();
        }
    }

    function renderOverview() {
        if (state.loadingRoster && !state.roster.length) return `<div class="tfc-empty"><div><strong>Loading faction roster…</strong>Pulling the current member list from Torn.</div></div>`;
        if (!state.roster.length) return `<div class="tfc-empty"><div><strong>No roster loaded</strong><button class="tfc-btn primary" data-action="refresh-command">Load Command Center</button></div></div>`;

        const ctx = commandContext();
        const priorities = commandPriorityQueue(ctx);
        const aggregate30 = aggregateWindow(30);
        const coveragePct = Math.round((aggregate30.covered / Math.max(1, aggregate30.total)) * 100);
        const warValue = ctx.liveWar ? `${fmtNumber(ctx.ourScore)} - ${fmtNumber(ctx.enemyScore)}` : ctx.scheduledWar ? 'Scheduled' : 'No live war';
        const warSub = ctx.liveWar ? `${ctx.enemy.attackable} attackable · ${ctx.enemy.soon} out soon` : ctx.scheduledWar ? `Starts ${fmtDateTime(ctx.war.start)}` : 'No current ranked war loaded';
        const warState = ctx.liveWar ? ['LIVE','good'] : ctx.scheduledWar ? ['Scheduled','warn'] : ['Idle','muted'];
        const chainState = ctx.chainLive ? (ctx.chainTimeout <= Number(state.config.chainDangerSeconds||120) ? ['Danger','bad'] : ctx.chainTimeout <= Number(state.config.chainWarningSeconds||240) ? ['Warning','warn'] : ['Live','good']) : ['Idle','muted'];
        const ocLoaded = !!state.ocLastFetchedAt || !!state.ocError || state.ocCrimes.length > 0;
        const ocState = !ocLoaded ? ['Not loaded','muted'] : ctx.ocHardBlocks || ctx.ocMissing ? ['Action','bad'] : ctx.ocEmpty || ctx.ocLowCpr ? ['Review','warn'] : ctx.ocActive.length ? ['Running','good'] : ['Idle','muted'];
        const recruitState = ctx.activeApps || ctx.newCandidates ? ['Review','warn'] : ctx.recruitInPlay ? ['Pipeline','good'] : ['Quiet','muted'];
        const armState = ctx.armTotals ? (ctx.ocHardBlocks ? ['Blocked','bad'] : ctx.armTotals.shortages ? ['Low stock','warn'] : ['Ready','good']) : ['Not loaded','muted'];
        const moneyState = ctx.unpaidWar.count || ctx.unpaidRefs.length ? ['Payables','warn'] : ctx.vault ? ['Ready','good'] : ['Not loaded','muted'];
        const memberState = ctx.leadership.overdue.length || ctx.leadership.reviews.length ? ['Action','bad'] : (ctx.inactiveMembers.length || ctx.leadership.warnings.length || ctx.leadership.promotions.length ? ['Review','warn'] : ['Ready','good']);

        return `
            <div class="tfc-command-hero">
                <div>
                    <div class="tfc-kicker">Faction Command Center</div>
                    <h3>${escapeHtml(state.faction?.name || 'Your faction')} · leadership overview</h3>
                    <p>Action queue built from every loaded TFC module. Start with red items, then amber. Green is ready; grey means idle or not yet loaded.</p>
                    <div class="tfc-command-legend" aria-label="Status color guide"><span class="bad"><i></i>Action needed</span><span class="warn"><i></i>Review soon</span><span class="good"><i></i>Ready</span><span class="muted"><i></i>Idle / not loaded</span></div>
                </div>
                <div class="tfc-toolbar">
                    <span class="tfc-muted" style="font-size:9px">Unified refresh ${escapeHtml(commandAge(state.commandLastRefreshedAt))}</span>
                    <button class="tfc-btn primary" data-action="refresh-command" ${state.commandRefreshing?'disabled':''}>${state.commandRefreshing?'Refreshing command…':'Refresh command'}</button>
                </div>
            </div>

            <div class="tfc-section">
                <div class="tfc-command-modules">
                    ${commandModuleCard('members','Members',`${ctx.active}/${ctx.b.total} active`,`${ctx.b.inactive} inactive · ${ctx.leadership.overdue.length} overdue follow-up${ctx.leadership.overdue.length===1?'':'s'} · ${ctx.leadership.warnings.length} warning record${ctx.leadership.warnings.length===1?'':'s'}`,memberState[0],memberState[1],state.rosterLastFetchedAt)}
                    ${commandModuleCard('war','Ranked War',warValue,warSub,warState[0],warState[1],state.warLastFetchedAt)}
                    ${commandModuleCard('chain','Chain',ctx.chainLive?`${fmtNumber(state.chain?.current || 0)} hits`:'No live chain',ctx.chainLive?`${fmtDuration(ctx.chainTimeout)} timer · ${ctx.coverage.gaps} coverage gaps`:`${state.chainRecent.length} recent chain${state.chainRecent.length===1?'':'s'} loaded`,chainState[0],chainState[1],state.chainLastFetchedAt)}
                    ${commandModuleCard('oc','Organized Crime',ocLoaded?`${ctx.ocActive.length} active`:'Not loaded',ocLoaded?`${ctx.ocEmpty} empty · ${ctx.ocMissing} missing items · ${ctx.ocUnassigned} unassigned`:'Open or refresh OC Command to load assignments',ocState[0],ocState[1],state.ocLastFetchedAt)}
                    ${commandModuleCard('recruit','Recruitment',`${ctx.activeApps} applications`,`${ctx.newCandidates} new · ${ctx.recruitInPlay} in active pipeline`,recruitState[0],recruitState[1],state.recruitLastFetchedAt)}
                    ${commandModuleCard('armory','Armory',ctx.armTotals?`${ctx.armTotals.shortages} low-stock`:'Not loaded',ctx.armTotals?`${fmtNumber(ctx.armTotals.loanedQty)} loaned · ${ctx.ocHardBlocks} OC hard blocks`:'Load inventory to enable stock alerts',armState[0],armState[1],state.armoryLastFetchedAt)}
                    ${commandModuleCard('finance','Finance',ctx.vault?fmtMoney(ctx.vault.factionMoney):'Not loaded',`${ctx.unpaidWar.count} unpaid war payout${ctx.unpaidWar.count===1?'':'s'} · ${ctx.unpaidRefs.length} referral liabilit${ctx.unpaidRefs.length===1?'y':'ies'}`,moneyState[0],moneyState[1],state.financeLastFetchedAt)}
                    ${commandModuleCard('history','Intel / History',`${coveragePct}% 30d coverage`,aggregate30.covered?`${fmtNumber(aggregate30.totals.xantaken)} Xanax · ${fmtNumber(aggregate30.totals.rankedwarhits)} RW hits`:'Run member intel sync to populate trends','Tracking',aggregate30.covered?'good':'muted',state.rosterLastFetchedAt)}
                </div>
            </div>

            <div class="tfc-command-layout">
                <div class="tfc-section">
                    <div class="tfc-section-head"><div><h3>Priority queue</h3><span class="tfc-muted" style="font-size:10px">${priorities.length} actionable item${priorities.length===1?'':'s'} from currently loaded data · highest urgency first</span></div></div>
                    ${commandQueueHtml(priorities)}
                </div>
                <div>
                    <div class="tfc-section">
                        <div class="tfc-section-head"><div><h3>At a glance</h3><span class="tfc-muted" style="font-size:10px">Current operational numbers</span></div></div>
                        <div class="tfc-grid" style="grid-template-columns:repeat(2,minmax(0,1fr))">
                            ${statCard('Active now',ctx.active,`${ctx.b.online} online · ${ctx.b.idle} idle`)}
                            ${statCard('Hospital',ctx.b.hospital,'current roster')}
                            ${statCard('Traveling',ctx.b.traveling,'traveling / abroad')}
                            ${statCard('30d intel',`${coveragePct}%`,`${aggregate30.covered}/${aggregate30.total} members`)}
                            ${statCard('OC hard blocks',ctx.ocHardBlocks,ctx.ocHardBlocks?'missing item + no stock':'current assigned items')}
                            ${statCard('Outstanding',fmtMoney(ctx.unpaidWar.amount + ctx.unpaidRefAmount),'war payouts + referrals')}
                        </div>
                    </div>
                    <div class="tfc-section">
                        <div class="tfc-section-head"><div><h3>Data health</h3><span class="tfc-muted" style="font-size:10px">Click a status to inspect the module</span></div></div>
                        <div class="tfc-card tfc-command-health">
                            ${commandDataHealthRow('Roster',state.rosterLastFetchedAt,'','members',5*60*1000)}
                            ${commandDataHealthRow('War',state.warLastFetchedAt,state.warAttackError && state.warAttackAccess !== 'ok' ? state.warAttackError : '','war',(ctx.liveWar||ctx.scheduledWar)?2*60*1000:10*60*1000)}
                            ${commandDataHealthRow('Chain',state.chainLastFetchedAt,'','chain',ctx.chainLive?2*60*1000:10*60*1000)}
                            ${commandDataHealthRow('OC',state.ocLastFetchedAt,state.ocError,'oc',10*60*1000)}
                            ${commandDataHealthRow('Recruit',state.recruitLastFetchedAt,state.recruitError,'recruit',15*60*1000)}
                            ${commandDataHealthRow('Armory',state.armoryLastFetchedAt,state.armoryError || state.armoryBalanceError,'armory',75*60*1000)}
                            ${commandDataHealthRow('Finance',state.financeLastFetchedAt,state.financeError,'finance',15*60*1000)}
                        </div>
                    </div>
                </div>
            </div>

            <div class="tfc-section">
                <div class="tfc-section-head"><div><h3>Member intelligence</h3><span class="tfc-muted" style="font-size:10px">30-day aggregate · personal usage is separate from faction-supplied armory usage</span></div><button class="tfc-btn" data-action="sync-intel" ${state.syncingIntel?'disabled':''}>${state.syncingIntel?'Syncing…':'Sync member intel'}</button></div>
                <div class="tfc-grid">
                    ${statCard('Xanax · 30d',aggregate30.covered?fmtNumber(aggregate30.totals.xantaken):'-',`${coveragePct}% roster coverage`)}
                    ${statCard('Refills · 30d',aggregate30.covered?fmtNumber(aggregate30.totals.refills):'-',`${coveragePct}% roster coverage`)}
                    ${statCard('RW hits · 30d',aggregate30.factionCovered?fmtNumber(aggregate30.totals.rankedwarhits):'-','tenure-safe aggregate')}
                    ${statCard('Faction respect · 30d',aggregate30.factionCovered?fmtCompact(aggregate30.totals.respectforfaction):'-','tenure-safe aggregate')}
                    ${statCard('Energy drinks · 30d',aggregate30.covered?fmtNumber(aggregate30.totals.energydrinkused):'-','personal stat delta')}
                    ${statCard('Revives · 30d',aggregate30.covered?fmtNumber(aggregate30.totals.revives):'-','personal stat delta')}
                </div>
                ${renderSyncProgress()}
            </div>
        `;
    }

    function statCard(label, value, sub) {
        return `<div class="tfc-card"><div class="tfc-stat-label">${escapeHtml(label)}</div><div class="tfc-stat-value">${escapeHtml(value)}</div><div class="tfc-stat-sub">${escapeHtml(sub || '')}</div></div>`;
    }

    function buildAlerts() {
        const now = nowSec();
        const inactivity = Number(state.config.inactivityHours || 24) * 3600;
        const inactive = state.roster.filter(m => m.last_action?.timestamp && now - m.last_action.timestamp >= inactivity)
            .sort((a,b) => (a.last_action?.timestamp || 0) - (b.last_action?.timestamp || 0));
        const noOc = state.roster.filter(m => !m.is_in_oc);
        const hospital = state.roster.filter(m => String(m.status?.state || '').toLowerCase() === 'hospital');
        const travel = state.roster.filter(m => ['traveling','abroad'].includes(String(m.status?.state || '').toLowerCase()));
        const alerts = [];
        const leadership = leadershipSummary();

        if (leadership.overdue.length) alerts.push(alertCard(`${leadership.overdue.length} overdue leadership follow-up${leadership.overdue.length===1?'':'s'}`, leadership.overdue.slice(0,4).map(x=>x.member.name).join(', '), 'bad'));
        if (leadership.warnings.length) alerts.push(alertCard(`${leadership.warnings.length} member${leadership.warnings.length===1?' has':'s have'} open warnings`, leadership.warnings.slice(0,4).map(x=>x.member.name).join(', '), 'warn'));
        if (inactive.length) alerts.push(alertCard(`${inactive.length} inactive member${inactive.length === 1 ? '' : 's'}`, `${inactive.slice(0,4).map(m => m.name).join(', ')}${inactive.length > 4 ? '…' : ''}`, 'bad'));
        if (noOc.length) alerts.push(alertCard(`${noOc.length} member${noOc.length === 1 ? '' : 's'} not in an OC`, `${noOc.slice(0,4).map(m => m.name).join(', ')}${noOc.length > 4 ? '…' : ''}`, 'warn'));
        if (hospital.length) alerts.push(alertCard(`${hospital.length} currently hospitalized`, `${hospital.slice(0,4).map(m => m.name).join(', ')}${hospital.length > 4 ? '…' : ''}`, 'bad'));
        if (travel.length) alerts.push(alertCard(`${travel.length} traveling / abroad`, `${travel.slice(0,4).map(m => m.name).join(', ')}${travel.length > 4 ? '…' : ''}`, ''));
        return alerts;
    }

    function alertCard(title, body, cls) {
        return `<div class="tfc-alert"><strong class="${cls ? `tfc-${cls}` : ''}">${escapeHtml(title)}</strong><span>${escapeHtml(body)}</span></div>`;
    }

    function renderSyncProgress() {
        if (!state.syncingIntel && !state.syncProgress.total) return '';
        const pct = state.syncProgress.total ? Math.round((state.syncProgress.done / state.syncProgress.total) * 100) : 0;
        const phase = state.syncProgress.phase ? ` · ${escapeHtml(state.syncProgress.phase)}` : '';
        return `
            <div style="margin-top:10px">
                <div class="tfc-progress"><span style="width:${pct}%"></span></div>
                <div class="tfc-progress-line">${state.syncingIntel ? `Syncing ${escapeHtml(state.syncProgress.current || '')}${phase} · ` : ''}${state.syncProgress.done}/${state.syncProgress.total} (${pct}%)</div>
            </div>
        `;
    }

    function renderMembers() {
        if (!state.roster.length) return `<div class="tfc-empty"><div><strong>No roster loaded</strong><button class="tfc-btn primary" data-action="refresh-roster">Load roster</button></div></div>`;

        const rows = getFilteredSortedMembers();
        const windowLabel = memberWindowLabel();
        const lead = leadershipSummary();
        return `
            <div class="tfc-lead-summary">
                ${statCard('Open warnings',lead.warnings.length,'members with unresolved warnings')}
                ${statCard('Overdue follow-ups',lead.overdue.length,`${lead.followups.length} open follow-ups total`)}
                ${statCard('Absences',lead.absent.length,`${lead.upcomingAbsences.length} starting within 14 days`)}
                ${statCard('Leadership reviews',lead.promotions.length + lead.reviews.length,`${lead.promotions.length} promotion · ${lead.reviews.length} demotion/removal`)}
            </div>
            <div class="tfc-section-head">
                <div>
                    <h3>Members · ${escapeHtml(windowLabel)}</h3>
                    <span class="tfc-muted" style="font-size:10px">${rows.length} shown · ${state.roster.length} total · tap ▸ for full intelligence</span>
                </div>
                <div class="tfc-toolbar">
                    <input class="tfc-input search" data-role="member-search" placeholder="Search name / position" value="${escapeHtml(state.search)}">
                    <select class="tfc-select" data-role="metric-window">
                        <option value="7" ${Number(state.memberMetricWindow) === 7 ? 'selected' : ''}>Last 7 days</option>
                        <option value="30" ${Number(state.memberMetricWindow) === 30 ? 'selected' : ''}>Last 30 days</option>
                        <option value="0" ${Number(state.memberMetricWindow) === 0 ? 'selected' : ''}>Lifetime</option>
                    </select>
                    <select class="tfc-select" data-role="status-filter">
                        ${filterOption('all', 'All statuses')}
                        ${filterOption('active', 'Online / idle')}
                        ${filterOption('hospital', 'Hospital')}
                        ${filterOption('travel', 'Traveling / abroad')}
                        ${filterOption('inactive', `Inactive ${state.config.inactivityHours}h+`)}
                        ${filterOption('nooc', 'Not in OC')}
                        ${filterOption('leadership', 'Leadership action')}
                        ${filterOption('followup', 'Follow-up due / overdue')}
                        ${filterOption('absence', 'Current / upcoming absence')}
                        ${filterOption('promotion', 'Promotion review')}
                        ${filterOption('review', 'Demotion / removal review')}
                    </select>
                    <select class="tfc-select" data-role="leadership-tag-filter">
                        <option value="all" ${state.leadershipTagFilter==='all'?'selected':''}>All leadership tags</option>
                        ${leadershipAllTags().map(tag=>`<option value="${escapeHtml(tag)}" ${state.leadershipTagFilter===tag?'selected':''}>${escapeHtml(tag)}</option>`).join('')}
                    </select>
                    <button class="tfc-btn" data-action="refresh-roster" ${state.loadingRoster ? 'disabled' : ''}>Refresh</button>
                    <button class="tfc-btn primary" data-action="sync-intel" ${state.syncingIntel ? 'disabled' : ''}>Intel</button>
                    <button class="tfc-btn" data-action="copy-leadership-csv">Leadership CSV</button>
                </div>
            </div>
            ${state.syncingIntel ? renderSyncProgress() : ''}
            <div class="tfc-table-wrap" style="margin-top:${state.syncingIntel ? '8px' : '0'}">
                <table class="tfc-table ${state.config.compactRows ? 'compact' : ''}" style="min-width:1180px">
                    <thead><tr>
                        ${th('name', 'Member')}
                        ${th('level', 'Lvl')}
                        ${th('position', 'Position')}
                        ${th('last_action', 'Last action')}
                        ${th('status', 'Status')}
                        ${th('oc', 'OC')}
                        ${th('xanax', `Xanax · ${windowLabel}`)}
                        ${th('xanrate', 'Xan/day')}
                        ${th('refills', 'Refills')}
                        ${th('rw', 'RW hits')}
                        ${th('respect', 'Respect')}
                        ${th('energy', 'Energy')}
                    </tr></thead>
                    <tbody>${rows.map(memberRow).join('')}</tbody>
                </table>
            </div>
        `;
    }

    function filterOption(value, label) {
        return `<option value="${value}" ${state.statusFilter === value ? 'selected' : ''}>${escapeHtml(label)}</option>`;
    }

    function th(key, label) {
        const icon = state.sort.key === key ? (state.sort.dir === 'asc' ? ' ▲' : ' ▼') : '';
        return `<th data-sort="${key}">${escapeHtml(label)}${icon}</th>`;
    }

    function memberRow(m) {
        const record = state.memberIntel[m.id] || {};
        const metric = getMemberMetricRecord(m);
        const values = metric?.values || {};
        const rates = metric?.rates || {};
        const statusState = String(m.status?.state || 'Okay');
        const statusLower = statusState.toLowerCase();
        const statusClass = statusLower === 'hospital' ? 'tfc-status-hospital' : (['traveling','abroad'].includes(statusLower) ? 'tfc-status-travel' : 'tfc-status-okay');
        const lastTs = Number(m.last_action?.timestamp || 0);
        const since = lastTs ? nowSec() - lastTs : null;
        const activity = String(m.last_action?.status || 'Offline').toLowerCase();
        const until = Number(m.status?.until || 0);
        const untilText = until > nowSec() ? ` · ${fmtDuration(until - nowSec())}` : '';
        const expanded = String(state.expandedMemberId) === String(m.id);
        const hasWindow = !!metric;
        const actualWindowTitle = metric?.days && metric.days !== Number(state.memberMetricWindow) ? ` title="Closest available baseline: ${metric.days} days"` : '';
        const xanRate = Number(state.memberMetricWindow) === 0 ? '-' : fmtRate(rates.xantaken);
        const tenureUnsafe = Number(state.memberMetricWindow) !== 0 && metric?.days && Number(m.days_in_faction || 0) < Number(metric.days);
        const rwDisplay = hasWindow ? fmtNumber(values.rankedwarhits) : '-';
        const respectDisplay = hasWindow ? fmtCompact(values.respectforfaction) : '-';
        const factionMetricTitle = tenureUnsafe ? ` title="Member has only ${Number(m.days_in_faction || 0)} days in this faction; this rolling value may include activity from before joining"` : '';
        const main = `<tr>
            <td><div class="tfc-member"><div class="tfc-member-line"><button class="tfc-member-toggle" data-member-toggle="${m.id}" title="${expanded ? 'Collapse' : 'Open member intelligence'}">${expanded ? '▾' : '▸'}</button><a href="https://www.torn.com/profiles.php?XID=${m.id}" target="_blank" rel="noopener">${escapeHtml(m.name)}</a></div><span class="tfc-id">[${m.id}]${metric?.days ? ` · ${metric.days}d baseline` : ''}</span>${leadershipFlagsHtml(m)}</div></td>
            <td>${fmtNumber(m.level)}</td>
            <td>${escapeHtml(m.position || '-')}</td>
            <td><span class="tfc-pill"><span class="tfc-dot ${activity}"></span>${escapeHtml(m.last_action?.relative || (since !== null ? fmtDuration(since) : 'Unknown'))}</span></td>
            <td class="${statusClass}">${escapeHtml(statusState)}${escapeHtml(untilText)}</td>
            <td>${m.is_in_oc ? '<span class="tfc-good">Yes</span>' : '<span class="tfc-warn">No</span>'}</td>
            <td${actualWindowTitle}>${hasWindow ? fmtNumber(values.xantaken) : '-'}</td>
            <td>${hasWindow ? xanRate : '-'}</td>
            <td>${hasWindow ? fmtNumber(values.refills) : '-'}</td>
            <td${factionMetricTitle}>${tenureUnsafe ? '<span class="tfc-warn">≈</span> ' : ''}${rwDisplay}</td>
            <td${factionMetricTitle}>${tenureUnsafe ? '<span class="tfc-warn">≈</span> ' : ''}${respectDisplay}</td>
            <td>${hasWindow ? fmtNumber(values.energydrinkused) : '-'}</td>
        </tr>`;
        return expanded ? main + memberDetailRow(m, record) : main;
    }

    function detailMetric(label, value, sub = '', pace = '') {
        return `<div class="tfc-metric"><small>${escapeHtml(label)}</small><b>${escapeHtml(value)}</b><small>${escapeHtml(sub)}</small>${pace ? `<div style="margin-top:4px">${pace}</div>` : ''}</div>`;
    }

    function memberDetailRow(member, record) {
        const w7 = calculateWindow(record, 7);
        const w30 = calculateWindow(record, 30);
        const life = calculateWindow(record, 'lifetime');
        const currentAge = record?.fetchedAt ? fmtDuration(Math.max(0, Math.floor((Date.now() - record.fetchedAt) / 1000))) : 'never';
        const w30Days = w30?.days || 30;
        return `<tr class="tfc-detail-row"><td colspan="12">
            <div class="tfc-detail">
                <div class="tfc-detail-head">
                    <div><strong>${escapeHtml(member.name)} intelligence</strong><br><span>${fmtNumber(member.days_in_faction)} days in faction · current stats refreshed ${escapeHtml(currentAge)} ago · daily history ${record?.history?.length || 0} snapshot${record?.history?.length === 1 ? '' : 's'}</span></div>
                    <span>${w7 ? `${w7.days}d short window` : 'No short baseline'} · ${w30 ? `${w30.days}d long window` : 'No long baseline'}</span>
                </div>
                ${w30 && Number(member.days_in_faction || 0) < Number(w30.days || 30) ? `<div class="tfc-alert" style="margin-bottom:9px"><strong class="tfc-warn">Recent faction join</strong><span>RW-hit and faction-respect rolling values can include activity from before this member joined. Faction-level aggregates exclude this member until the full window is inside their faction tenure.</span></div>` : ''}
                <div class="tfc-metric-grid">
                    ${detailMetric('Xanax · long window', w30 ? fmtNumber(w30.values.xantaken) : '-', w30 ? `${fmtRate(w30.rates.xantaken)} / day over ${w30Days}d` : 'Sync intel to backfill', paceHtml(record, 'xantaken'))}
                    ${detailMetric('Refills · long window', w30 ? fmtNumber(w30.values.refills) : '-', w30 ? `${fmtRate(w30.rates.refills)} / day` : '', paceHtml(record, 'refills'))}
                    ${detailMetric('RW hits · long window', w30 ? fmtNumber(w30.values.rankedwarhits) : '-', w30 ? `${fmtRate(w30.rates.rankedwarhits)} / day` : '', paceHtml(record, 'rankedwarhits'))}
                    ${detailMetric('Faction respect · long window', w30 ? fmtCompact(w30.values.respectforfaction) : '-', w30 ? `${fmtRate(w30.rates.respectforfaction, 1)} / day` : '', paceHtml(record, 'respectforfaction'))}
                    ${detailMetric('Energy drinks · long window', w30 ? fmtNumber(w30.values.energydrinkused) : '-', w30 ? `${fmtRate(w30.rates.energydrinkused)} / day` : '', paceHtml(record, 'energydrinkused'))}
                    ${detailMetric('Revives · long window', w30 ? fmtNumber(w30.values.revives) : '-', w30 ? `${fmtRate(w30.rates.revives)} / day` : '', paceHtml(record, 'revives'))}
                </div>
                <table class="tfc-window-table">
                    <thead><tr><th>Window</th><th>Days</th><th>Xanax</th><th>Xan/day</th><th>Refills</th><th>RW hits</th><th>Respect</th><th>Energy</th><th>Revives</th></tr></thead>
                    <tbody>
                        ${memberWindowDetailRow('Short', w7)}
                        ${memberWindowDetailRow('Long', w30)}
                        ${memberWindowDetailRow('Lifetime', life)}
                    </tbody>
                </table>
                ${renderLeadershipPanel(member)}
            </div>
        </td></tr>`;
    }

    function memberWindowDetailRow(label, windowData) {
        if (!windowData) return `<tr><td>${escapeHtml(label)}</td><td colspan="8" class="tfc-muted" style="text-align:left">No baseline yet</td></tr>`;
        const v = windowData.values || {};
        const r = windowData.rates || {};
        return `<tr>
            <td>${escapeHtml(label)}</td>
            <td>${windowData.days || 'All'}</td>
            <td>${fmtNumber(v.xantaken)}</td>
            <td>${windowData.days ? fmtRate(r.xantaken) : '-'}</td>
            <td>${fmtNumber(v.refills)}</td>
            <td>${fmtNumber(v.rankedwarhits)}</td>
            <td>${fmtCompact(v.respectforfaction)}</td>
            <td>${fmtNumber(v.energydrinkused)}</td>
            <td>${fmtNumber(v.revives)}</td>
        </tr>`;
    }

    function getFilteredSortedMembers() {
        const q = state.search.trim().toLowerCase();
        const now = nowSec();
        const inactive = Number(state.config.inactivityHours || 24) * 3600;
        let rows = state.roster.filter(m => {
            const rec = leadershipFor(m);
            const hay = [m.name,m.position,m.id,(rec.tags||[]).join(' '),rec.preferredOcRoles,rec.warAvailability,rec.timezone,rec.recruiter,rec.recruitmentSource,...(rec.events||[]).map(e=>e.text||'')].join(' ').toLowerCase();
            if (q && !hay.includes(q)) return false;
            const activity = String(m.last_action?.status || '').toLowerCase();
            const status = String(m.status?.state || '').toLowerCase();
            if (state.statusFilter === 'active' && !['online','idle'].includes(activity)) return false;
            if (state.statusFilter === 'hospital' && status !== 'hospital') return false;
            if (state.statusFilter === 'travel' && !['traveling','abroad'].includes(status)) return false;
            if (state.statusFilter === 'inactive' && !(m.last_action?.timestamp && now - m.last_action.timestamp >= inactive)) return false;
            if (state.statusFilter === 'nooc' && m.is_in_oc) return false;
            if (state.statusFilter === 'leadership' && !(leadershipOpenWarnings(rec).length || leadershipOverdueFollowups(rec).length || (rec.review && rec.review!=='None') || (rec.promotion && rec.promotion!=='None'))) return false;
            if (state.statusFilter === 'followup' && !leadershipOpenFollowups(rec).some(e=>!e.dueAt || Number(e.dueAt) <= now + 7*86400)) return false;
            if (state.statusFilter === 'absence' && !(leadershipActiveAbsence(rec,now) || (Number(rec.absence?.start||0) > now && (!Number(rec.absence?.end||0) || Number(rec.absence.end) >= now)))) return false;
            if (state.statusFilter === 'promotion' && (!rec.promotion || rec.promotion === 'None')) return false;
            if (state.statusFilter === 'review' && (!rec.review || rec.review === 'None')) return false;
            if (state.leadershipTagFilter !== 'all' && !(rec.tags||[]).includes(state.leadershipTagFilter)) return false;
            return true;
        });

        const getVal = (m, key) => {
            const metric = getMemberMetricRecord(m);
            const values = metric?.values || {};
            const rates = metric?.rates || {};
            if (key === 'name') return m.name || '';
            if (key === 'level') return Number(m.level || 0);
            if (key === 'position') return m.position || '';
            if (key === 'last_action') return Number(m.last_action?.timestamp || 0);
            if (key === 'status') return m.status?.state || '';
            if (key === 'oc') return m.is_in_oc ? 1 : 0;
            if (key === 'xanax') return Number(values.xantaken ?? -1);
            if (key === 'xanrate') return Number(rates.xantaken ?? -1);
            if (key === 'refills') return Number(values.refills ?? -1);
            if (key === 'rw') return Number(values.rankedwarhits ?? -1);
            if (key === 'respect') return Number(values.respectforfaction ?? -1);
            if (key === 'energy') return Number(values.energydrinkused ?? -1);
            return '';
        };

        const dir = state.sort.dir === 'asc' ? 1 : -1;
        rows.sort((a,b) => {
            const av = getVal(a, state.sort.key);
            const bv = getVal(b, state.sort.key);
            if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
            return String(av).localeCompare(String(bv), undefined, { sensitivity: 'base' }) * dir;
        });
        return rows;
    }


    function fmtDateTime(timestamp) {
        const ts = Number(timestamp || 0);
        if (!ts) return '-';
        try {
            return new Date(ts * 1000).toLocaleString(undefined, {
                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
            });
        } catch { return '-'; }
    }

    function warPhase(war) {
        if (!war) return { label: 'No ranked war', cls: 'tfc-muted', countdownTs: 0, countdownPrefix: '' };
        const now = nowSec();
        const start = Number(war.start || 0);
        const end = Number(war.end || 0);
        if (end) return { label: 'Finished', cls: war.winner ? 'tfc-muted' : 'tfc-muted', countdownTs: 0, countdownPrefix: '' };
        if (start > now) return { label: 'Scheduled', cls: 'tfc-warn', countdownTs: start, countdownPrefix: 'Starts in ' };
        return { label: 'LIVE', cls: 'tfc-good', countdownTs: 0, countdownPrefix: '' };
    }

    function currentWarSides() {
        const war = state.currentWar;
        if (!war || !Array.isArray(war.factions)) return { ours: null, enemy: null };
        const ownId = Number(state.faction?.id || 0);
        let ours = war.factions.find(f => Number(f.id) === ownId) || null;
        if (!ours && war.factions.length === 2 && state.warOpponent) ours = war.factions.find(f => Number(f.id) !== Number(state.warOpponent.id)) || null;
        const enemy = war.factions.find(f => Number(f.id) !== Number(ours?.id || ownId)) || state.warOpponent || null;
        return { ours, enemy };
    }

    function enemyStatusBuckets() {
        const b = { total: 0, attackable: 0, active: 0, hospital: 0, soon: 0, travel: 0, other: 0 };
        const soonSeconds = Number(state.config.warHospitalSoonMinutes || 15) * 60;
        const now = nowSec();
        for (const m of state.enemyRoster) {
            b.total++;
            const status = String(m.status?.state || '').toLowerCase();
            const activity = String(m.last_action?.status || '').toLowerCase();
            if (status === 'okay') b.attackable++;
            if (['online', 'idle'].includes(activity)) b.active++;
            if (status === 'hospital') {
                b.hospital++;
                const until = Number(m.status?.until || 0);
                if (until > now && until - now <= soonSeconds) b.soon++;
            } else if (['traveling', 'abroad'].includes(status)) b.travel++;
            else if (status !== 'okay') b.other++;
        }
        return b;
    }

    function warPinKey() {
        return String(state.warOpponent?.id || 'none');
    }

    function isTargetPinned(id) {
        const list = state.warPins[warPinKey()] || [];
        return list.map(String).includes(String(id));
    }

    async function toggleWarPin(id) {
        const key = warPinKey();
        const list = new Set((state.warPins[key] || []).map(String));
        const sid = String(id);
        if (list.has(sid)) list.delete(sid); else list.add(sid);
        state.warPins[key] = [...list];
        await Store.set('warPins', state.warPins);
        render();
    }

    function warNoteKey(id) {
        return `${warPinKey()}:${id}`;
    }

    async function saveWarNote(id, value) {
        const key = warNoteKey(id);
        const clean = String(value || '').slice(0, 500);
        if (clean.trim()) state.warNotes[key] = clean;
        else delete state.warNotes[key];
        await Store.set('warNotes', state.warNotes);
    }

    function releaseQueue() {
        const now = nowSec();
        return state.enemyRoster
            .filter(m => String(m.status?.state || '').toLowerCase() === 'hospital' && Number(m.status?.until || 0) > now)
            .sort((a, b) => Number(a.status?.until || 0) - Number(b.status?.until || 0));
    }

    function currentWarId() {
        return String(state.currentWar?.war_id ?? state.currentWar?.id ?? '');
    }

    function currentWarActivityRecord() {
        const id = currentWarId();
        return id ? state.warActivityHistory[id] || null : null;
    }

    function recentReleaseRecord(id) {
        const warId = currentWarId();
        const rec = state.warRecentReleases?.[warId]?.[String(id)] || null;
        if (!rec) return null;
        const age = nowSec() - Number(rec.at || 0);
        const window = Number(state.config.warRecentReleaseMinutes || 10) * 60;
        return age >= 0 && age <= window ? rec : null;
    }

    function targetActivityIntel(id) {
        const sid = String(id);
        const current = currentWarActivityRecord()?.members?.[sid] || null;
        let pastSeen = 0;
        let pastActive = 0;
        let pastWars = 0;
        const opponentId = Number(state.warOpponent?.id || 0);
        const activeWarId = currentWarId();
        for (const [warId, summary] of Object.entries(state.warHistory || {})) {
            if (String(warId) === activeWarId) continue;
            if (Number(summary?.opponentId || 0) !== opponentId) continue;
            const t = summary?.targets?.[sid];
            if (!t || !Number(t.seen || 0)) continue;
            pastSeen += Number(t.seen || 0);
            pastActive += Number(t.active || 0);
            pastWars++;
        }
        const currentPct = current?.seen ? Math.round(Number(current.active || 0) / Number(current.seen) * 100) : null;
        const pastPct = pastSeen ? Math.round(pastActive / pastSeen * 100) : null;
        return { current, currentPct, pastPct, pastWars, pastSeen };
    }

    function targetActivityHtml(id) {
        const intel = targetActivityIntel(id);
        if (intel.currentPct === null) return '<span class="tfc-muted">Collecting...</span>';
        return `<span class="tfc-activity-meter" title="Active in ${intel.current.active || 0} of ${intel.current.seen || 0} roster samples"><i><span style="width:${Math.max(0, Math.min(100, intel.currentPct))}%"></span></i><b>${intel.currentPct}%</b></span>`;
    }

    async function detectRecentReleases(previousRoster, nextRoster) {
        const warId = currentWarId();
        if (!warId) return;
        const previous = new Map((previousRoster || []).map(m => [String(m.id), String(m.status?.state || '').toLowerCase()]));
        const bucket = { ...(state.warRecentReleases[warId] || {}) };
        const now = nowSec();
        for (const m of nextRoster || []) {
            const before = previous.get(String(m.id));
            const after = String(m.status?.state || '').toLowerCase();
            if (before === 'hospital' && after !== 'hospital') {
                bucket[String(m.id)] = { at: now, name: m.name || '', status: after || 'unknown' };
            }
        }
        const keepSeconds = Math.max(3600, Number(state.config.warRecentReleaseMinutes || 10) * 60 * 4);
        for (const [id, rec] of Object.entries(bucket)) {
            if (now - Number(rec?.at || 0) > keepSeconds) delete bucket[id];
        }
        state.warRecentReleases[warId] = bucket;
        await Store.set('warRecentReleases', state.warRecentReleases);
    }

    async function captureEnemyActivitySnapshot(force = false) {
        const warId = currentWarId();
        if (!warId || !state.warOpponent?.id || !state.enemyRoster.length) return;
        const now = nowSec();
        const existing = state.warActivityHistory[warId] || {
            warId,
            opponentId: Number(state.warOpponent.id),
            opponentName: state.warOpponent.name || '',
            sampleCount: 0,
            lastSampleAt: 0,
            members: {},
            timeline: [],
        };
        const interval = Number(state.config.warActivitySampleSeconds || 300);
        if (!force && existing.lastSampleAt && now - Number(existing.lastSampleAt) < interval) return;

        let activeCount = 0, onlineCount = 0, attackableCount = 0, hospitalCount = 0;
        for (const m of state.enemyRoster) {
            const sid = String(m.id);
            const activity = String(m.last_action?.status || '').toLowerCase();
            const status = String(m.status?.state || '').toLowerCase();
            const active = activity === 'online' || activity === 'idle';
            const row = existing.members[sid] || { name: m.name || '', seen: 0, active: 0, online: 0, idle: 0, attackable: 0, hospital: 0, lastActive: 0, lastStatus: '' };
            row.name = m.name || row.name || '';
            row.seen = Number(row.seen || 0) + 1;
            if (active) { row.active = Number(row.active || 0) + 1; row.lastActive = now; activeCount++; }
            if (activity === 'online') { row.online = Number(row.online || 0) + 1; onlineCount++; }
            if (activity === 'idle') row.idle = Number(row.idle || 0) + 1;
            if (status === 'okay') { row.attackable = Number(row.attackable || 0) + 1; attackableCount++; }
            if (status === 'hospital') { row.hospital = Number(row.hospital || 0) + 1; hospitalCount++; }
            row.lastStatus = status;
            existing.members[sid] = row;
        }
        existing.sampleCount = Number(existing.sampleCount || 0) + 1;
        existing.lastSampleAt = now;
        existing.opponentName = state.warOpponent.name || existing.opponentName || '';
        existing.timeline = Array.isArray(existing.timeline) ? existing.timeline : [];
        existing.timeline.push({ t: now, a: activeCount, o: onlineCount, k: attackableCount, h: hospitalCount });
        existing.timeline = existing.timeline.slice(-864); // 72h at the default five-minute cadence.
        state.warActivityHistory[warId] = existing;

        const rows = Object.entries(state.warActivityHistory)
            .sort((a, b) => Number(b[1]?.lastSampleAt || 0) - Number(a[1]?.lastSampleAt || 0))
            .slice(0, 10);
        state.warActivityHistory = Object.fromEntries(rows);
        await Store.set('warActivityHistory', state.warActivityHistory);
    }

    async function assessWarAttackAccess(force = false) {
        if (!force && ['ok', 'denied'].includes(state.warAttackAccess)) return state.warAttackAccess === 'ok';
        try {
            const data = await api('/key/info', {}, { ttl: 10 * 60 * 1000, force });
            const info = data?.info || {};
            const type = String(info.access?.type || 'Unknown');
            const factionPermission = !!info.access?.faction;
            const factionSelections = Array.isArray(info.selections?.faction) ? info.selections.faction.map(String) : [];
            const broadAccess = ['Limited Access', 'Full Access'].includes(type);
            const customAttack = type === 'Custom' && factionSelections.includes('attacks');
            state.warAttackAccessType = type;
            if (factionPermission && (broadAccess || customAttack)) {
                state.warAttackAccess = 'ok';
                state.warAttackError = '';
                return true;
            }
            state.warAttackAccess = 'denied';
            state.warAttackError = !factionPermission
                ? `${type} key does not have Faction API Access permission.`
                : `${type} key does not include the faction attacks selection.`;
            return false;
        } catch (err) {
            state.warAttackAccess = 'error';
            state.warAttackError = err.message || 'Could not inspect API key permissions.';
            return false;
        }
    }

    function compactWarAttack(a) {
        return {
            id: a.id,
            started: Number(a.started || 0),
            ended: Number(a.ended || 0),
            attacker: a.attacker ? { id: a.attacker.id, name: a.attacker.name || '' } : null,
            defender: a.defender ? { id: a.defender.id, name: a.defender.name || '' } : null,
            result: a.result || '',
            respect_gain: Number(a.respect_gain || 0),
            respect_loss: Number(a.respect_loss || 0),
            chain: a.chain ?? null,
            is_interrupted: !!a.is_interrupted,
            modifiers: a.modifiers ? {
                fair_fight: Number(a.modifiers.fair_fight || 0),
                war: Number(a.modifiers.war || 0),
                retaliation: Number(a.modifiers.retaliation || 0),
                group: Number(a.modifiers.group || 0),
                overseas: Number(a.modifiers.overseas || 0),
                chain: Number(a.modifiers.chain || 0),
                warlord: Number(a.modifiers.warlord || 0),
            } : null,
        };
    }

    async function syncWarAttacks(force = false, fullHistory = false) {
        if (state.warAttackSyncing || !state.currentWar || !state.warOpponent?.id) return;
        const start = Number(state.currentWar.start || 0);
        if (!start || start > nowSec()) return;
        state.warAttackSyncing = true;
        try {
            const allowed = await assessWarAttackAccess(force && state.warAttackAccess === 'error');
            if (!allowed) return;
            const warId = currentWarId();
            const ownId = Number(state.faction?.id || 0);
            const enemyId = Number(state.warOpponent.id || 0);

            if (state.warAttackCache?.warId === warId && !state.warAttacks.length) {
                state.warAttacks = Array.isArray(state.warAttackCache.attacks) ? state.warAttackCache.attacks : [];
            }
            const initial = !state.warAttacks.length;
            const latestEnded = state.warAttacks.reduce((m, a) => Math.max(m, Number(a.ended || 0)), 0);
            const from = initial || fullHistory ? Math.max(0, start - 5) : Math.max(start - 5, latestEnded - 5);
            let to = null;
            let page = 0;
            const maxPages = (initial || fullHistory) ? 20 : 3;
            const incoming = [];

            while (page < maxPages) {
                const params = { filters: 'outgoing', limit: 100, sort: 'DESC', from };
                if (to) params.to = to;
                const data = await api('/faction/attacks', params, { force: true });
                const rows = Array.isArray(data?.attacks) ? data.attacks : [];
                for (const a of rows) {
                    const attackerFaction = Number(a?.attacker?.faction?.id || 0);
                    const defenderFaction = Number(a?.defender?.faction?.id || 0);
                    if (!a?.is_ranked_war || attackerFaction !== ownId || defenderFaction !== enemyId || Number(a.ended || 0) < start - 5) continue;
                    incoming.push(compactWarAttack(a));
                }
                if (rows.length < 100) break;
                const oldest = rows.reduce((m, a) => Math.min(m, Number(a.ended || Number.MAX_SAFE_INTEGER)), Number.MAX_SAFE_INTEGER);
                if (!Number.isFinite(oldest) || oldest <= from) break;
                to = oldest - 1;
                page++;
            }

            const merged = new Map(state.warAttacks.map(a => [String(a.id), a]));
            for (const a of incoming) merged.set(String(a.id), a);
            state.warAttacks = [...merged.values()]
                .filter(a => Number(a.ended || 0) >= start - 5)
                .sort((a, b) => Number(b.ended || 0) - Number(a.ended || 0))
                .slice(0, 3000);
            state.warAttackLastFetchedAt = Date.now();
            state.warAttackCache = { warId, opponentId: enemyId, updatedAt: Date.now(), attacks: state.warAttacks };
            await Store.set('warAttackCache', state.warAttackCache);
        } catch (err) {
            console.warn('[TFC] war attack sync failed', err);
            state.warAttackError = err.message || 'Attack sync failed';
            if (/access|permission|key|selection/i.test(state.warAttackError)) state.warAttackAccess = 'denied';
        } finally {
            state.warAttackSyncing = false;
        }
    }

    function warParticipationRows() {
        const map = new Map();
        for (const m of state.roster) map.set(String(m.id), {
            id: m.id, name: m.name || `#${m.id}`, attempts: 0, hits: 0, assists: 0, losses: 0, respect: 0, last: 0,
        });
        for (const a of state.warAttacks) {
            if (!a.attacker?.id) continue;
            const id = String(a.attacker.id);
            const row = map.get(id) || { id: a.attacker.id, name: a.attacker.name || `#${id}`, attempts: 0, hits: 0, assists: 0, losses: 0, respect: 0, last: 0 };
            row.attempts++;
            if (String(a.result).toLowerCase() === 'assist') row.assists++;
            else if (Number(a.respect_gain || 0) > 0) row.hits++;
            if (['lost', 'stalemate', 'escape', 'timeout', 'interrupted'].includes(String(a.result).toLowerCase())) row.losses++;
            row.respect += Number(a.respect_gain || 0);
            row.last = Math.max(row.last, Number(a.ended || 0));
            map.set(id, row);
        }
        return [...map.values()].sort((a, b) => b.hits - a.hits || b.respect - a.respect || b.attempts - a.attempts || String(a.name).localeCompare(String(b.name)));
    }

    function buildWarPerformanceRows(attacks = state.warAttacks, includeRoster = true) {
        const map = new Map();
        if (includeRoster) {
            for (const m of state.roster) map.set(String(m.id), {
                id: m.id, name: m.name || `#${m.id}`, attempts: 0, scoringHits: 0, assists: 0, losses: 0,
                respect: 0, hitRespects: [], first: 0, last: 0, maxChain: 0, fairFightSum: 0, fairFightCount: 0, results: {},
            });
        }
        for (const a of attacks || []) {
            if (!a?.attacker?.id) continue;
            const id = String(a.attacker.id);
            const row = map.get(id) || {
                id: a.attacker.id, name: a.attacker.name || `#${id}`, attempts: 0, scoringHits: 0, assists: 0, losses: 0,
                respect: 0, hitRespects: [], first: 0, last: 0, maxChain: 0, fairFightSum: 0, fairFightCount: 0, results: {},
            };
            const result = String(a.result || 'Unknown');
            const lower = result.toLowerCase();
            const respect = Math.max(0, Number(a.respect_gain || 0));
            const ended = Number(a.ended || 0);
            row.attempts++;
            row.results[result] = Number(row.results[result] || 0) + 1;
            if (lower === 'assist') row.assists++;
            else if (respect > 0) {
                row.scoringHits++;
                row.hitRespects.push(respect);
                row.respect += respect;
            }
            if (/lost|stalemate|escape|timeout|interrupted/.test(lower)) row.losses++;
            if (ended) {
                row.first = row.first ? Math.min(row.first, ended) : ended;
                row.last = Math.max(row.last, ended);
            }
            row.maxChain = Math.max(row.maxChain, Number(a.chain || 0));
            const ff = Number(a.modifiers?.fair_fight);
            if (Number.isFinite(ff) && ff > 0) { row.fairFightSum += ff; row.fairFightCount++; }
            map.set(id, row);
        }
        return [...map.values()].sort((a, b) => b.scoringHits - a.scoringHits || b.respect - a.respect || b.attempts - a.attempts || String(a.name).localeCompare(String(b.name)));
    }

    function compactPerformanceRow(row) {
        return {
            id: row.id, name: row.name, attempts: Number(row.attempts || 0), scoringHits: Number(row.scoringHits || 0),
            assists: Number(row.assists || 0), losses: Number(row.losses || 0), respect: Number(row.respect || 0),
            hitRespects: Array.isArray(row.hitRespects) ? row.hitRespects.map(Number).filter(Number.isFinite) : [],
            first: Number(row.first || 0), last: Number(row.last || 0), maxChain: Number(row.maxChain || 0),
            fairFightSum: Number(row.fairFightSum || 0), fairFightCount: Number(row.fairFightCount || 0), results: row.results || {},
        };
    }

    function payoutWarOptions() {
        const rows = Object.values(state.warHistory || {}).filter(w => w?.warId).sort((a,b) => Number(b.updatedAt || b.end || b.start || 0) - Number(a.updatedAt || a.end || a.start || 0));
        const currentId = currentWarId();
        if (currentId && !rows.some(w => String(w.warId) === currentId)) {
            rows.unshift({ warId: currentId, opponentId: state.warOpponent?.id, opponentName: state.warOpponent?.name || 'Current opponent', start: state.currentWar?.start, end: state.currentWar?.end, updatedAt: Date.now() });
        }
        return rows;
    }

    function selectedPayoutWarId() {
        const options = payoutWarOptions();
        const current = currentWarId();
        if (state.payoutWarId && options.some(w => String(w.warId) === String(state.payoutWarId))) return String(state.payoutWarId);
        state.payoutWarId = current || (options[0] ? String(options[0].warId) : null);
        return state.payoutWarId;
    }

    function payoutPerformanceForWar(warId) {
        if (!warId) return [];
        if (String(warId) === currentWarId() && state.warAttacks.length) return buildWarPerformanceRows(state.warAttacks, true);
        const saved = state.warHistory?.[warId];
        if (Array.isArray(saved?.performance) && saved.performance.length) return saved.performance.map(x => ({ ...x, hitRespects: Array.isArray(x.hitRespects) ? x.hitRespects : [], results: x.results || {} }));
        if (Array.isArray(saved?.participants)) return saved.participants.map(x => ({
            id:x.id, name:x.name, attempts:Number(x.attempts||0), scoringHits:Number(x.hits||0), assists:Number(x.assists||0), losses:Number(x.losses||0),
            respect:Number(x.respect||0), hitRespects:[], first:0, last:0, maxChain:0, fairFightSum:0, fairFightCount:0, results:{}, legacy:true,
        }));
        return [];
    }

    function defaultPayoutDraft() {
        return {
            grossValue: 0,
            memberPercent: Number(state.config.payoutDefaultMemberPercent ?? 90),
            mode: state.config.payoutDefaultMode || 'hits',
            assistWeight: Number(state.config.payoutDefaultAssistWeight ?? 0),
            minRespect: Number(state.config.payoutDefaultMinRespect ?? 0),
            minHits: Number(state.config.payoutDefaultMinHits ?? 0),
            hybridRespectPercent: Number(state.config.payoutDefaultHybridRespectPercent ?? 50),
            roundTo: Number(state.config.payoutDefaultRoundTo ?? 1000),
            paidAt: 0,
            adjustments: {}, excluded: {}, notes: {}, updatedAt: 0,
        };
    }

    function payoutDraft(warId) {
        return { ...defaultPayoutDraft(), ...(state.payoutDrafts?.[warId] || {}), adjustments: { ...(state.payoutDrafts?.[warId]?.adjustments || {}) }, excluded: { ...(state.payoutDrafts?.[warId]?.excluded || {}) }, notes: { ...(state.payoutDrafts?.[warId]?.notes || {}) } };
    }

    async function savePayoutDraft(warId, draft, quiet = false) {
        if (!warId) return;
        state.payoutDrafts[warId] = { ...draft, updatedAt: Date.now() };
        const keep = payoutWarOptions().slice(0, Number(state.config.warHistoryLimit || 25)).map(w => String(w.warId));
        const entries = Object.entries(state.payoutDrafts).filter(([id]) => keep.includes(String(id)) || String(id) === String(warId));
        state.payoutDrafts = Object.fromEntries(entries);
        await Store.set('payoutDrafts', state.payoutDrafts);
        if (!quiet) toast('Payout draft saved');
    }

    function roundMoney(value, step) {
        const s = Math.max(1, Number(step || 1));
        return Math.round(Number(value || 0) / s) * s;
    }

    function computePayout(warId) {
        const draft = payoutDraft(warId);
        const performance = payoutPerformanceForWar(warId).filter(r => Number(r.attempts || 0) > 0 || Number(draft.adjustments?.[r.id] || 0) !== 0);
        const gross = Math.max(0, Number(draft.grossValue || 0));
        const memberPercent = Math.min(100, Math.max(0, Number(draft.memberPercent || 0)));
        const pool = gross * memberPercent / 100;
        const minRespect = Math.max(0, Number(draft.minRespect || 0));
        const minHits = Math.max(0, Number(draft.minHits || 0));
        const assistWeight = Math.max(0, Number(draft.assistWeight || 0));
        const rows = performance.map(row => {
            const hitRespects = Array.isArray(row.hitRespects) ? row.hitRespects.map(Number).filter(Number.isFinite) : [];
            let eligibleHits, eligibleRespect, thresholdLimited = false;
            if (hitRespects.length || Number(row.scoringHits || 0) === 0) {
                const eligible = hitRespects.filter(x => x >= minRespect);
                eligibleHits = eligible.length;
                eligibleRespect = eligible.reduce((a,b) => a+b, 0);
            } else {
                thresholdLimited = minRespect > 0;
                eligibleHits = minRespect > 0 ? 0 : Number(row.scoringHits || 0);
                eligibleRespect = minRespect > 0 ? 0 : Number(row.respect || 0);
            }
            const excluded = !!draft.excluded?.[row.id] || eligibleHits < minHits;
            const hitUnits = excluded ? 0 : eligibleHits + Number(row.assists || 0) * assistWeight;
            const respectUnits = excluded ? 0 : eligibleRespect;
            return { ...row, eligibleHits, eligibleRespect, hitUnits, respectUnits, excluded, thresholdLimited, adjustment:Number(draft.adjustments?.[row.id] || 0), note:draft.notes?.[row.id] || '' };
        });
        const totalHitUnits = rows.reduce((s,r) => s + r.hitUnits, 0);
        const totalRespectUnits = rows.reduce((s,r) => s + r.respectUnits, 0);
        const respectShare = Math.min(100, Math.max(0, Number(draft.hybridRespectPercent || 0))) / 100;
        for (const row of rows) {
            let base = 0;
            if (!row.excluded && pool > 0) {
                if (draft.mode === 'respect') base = totalRespectUnits ? pool * row.respectUnits / totalRespectUnits : 0;
                else if (draft.mode === 'hybrid') {
                    const hitsPart = totalHitUnits ? pool * (1 - respectShare) * row.hitUnits / totalHitUnits : 0;
                    const respectPart = totalRespectUnits ? pool * respectShare * row.respectUnits / totalRespectUnits : 0;
                    base = hitsPart + respectPart;
                } else base = totalHitUnits ? pool * row.hitUnits / totalHitUnits : 0;
            }
            row.basePayout = roundMoney(base, draft.roundTo);
            row.finalPayout = row.excluded ? 0 : Math.max(0, roundMoney(row.basePayout + row.adjustment, draft.roundTo));
        }
        const totalFinal = rows.reduce((s,r) => s + r.finalPayout, 0);
        return { draft, rows, gross, pool, factionRetained:gross-pool, totalHitUnits, totalRespectUnits, totalFinal, variance:pool-totalFinal };
    }

    function payoutBasisLabel(draft) {
        if (draft.mode === 'respect') return 'Eligible respect';
        if (draft.mode === 'hybrid') return `${100-Number(draft.hybridRespectPercent||50)}% hits / ${Number(draft.hybridRespectPercent||50)}% respect`;
        return 'Eligible hit units';
    }

    function renderPayouts() {
        const options = payoutWarOptions();
        const warId = selectedPayoutWarId();
        if (!options.length || !warId) return `<div class="tfc-empty"><div><strong>No tracked war report yet</strong>Open War Command during a ranked war and sync attacks. TFC will retain the performance report for payout work after the war.</div></div>`;
        const summary = state.warHistory?.[warId] || options.find(w => String(w.warId) === String(warId)) || {};
        const calc = computePayout(warId);
        const d = calc.draft;
        const lockedCurrent = String(warId) === currentWarId() && state.warAttackAccess !== 'ok' && !calc.rows.length;
        const thresholdWarning = calc.rows.some(r => r.thresholdLimited);
        const performanceRows = payoutPerformanceForWar(warId).filter(r => Number(r.attempts || 0) > 0);
        const totalAttempts = performanceRows.reduce((s,r)=>s+Number(r.attempts||0),0);
        const totalHits = performanceRows.reduce((s,r)=>s+Number(r.scoringHits||0),0);
        const totalAssists = performanceRows.reduce((s,r)=>s+Number(r.assists||0),0);
        const totalRespect = performanceRows.reduce((s,r)=>s+Number(r.respect||0),0);
        const participants = performanceRows.length;
        const currentBadge = String(warId) === currentWarId() ? '<span class="tfc-report-badge good">CURRENT</span>' : '<span class="tfc-report-badge">SAVED</span>';
        return `
            <div class="tfc-section">
                <div class="tfc-section-head">
                    <div><div class="tfc-kicker">War Performance + Payouts</div><h3 style="margin-top:4px">${escapeHtml(summary.opponentName || 'Ranked war')} ${currentBadge}</h3><span class="tfc-muted" style="font-size:10px">War #${escapeHtml(warId)} · payout drafts stay local to this device</span></div>
                    <div class="tfc-toolbar">
                        <select class="tfc-select" data-role="payout-war">${options.map(w => `<option value="${escapeHtml(w.warId)}" ${String(w.warId)===String(warId)?'selected':''}>#${escapeHtml(w.warId)} · ${escapeHtml(w.opponentName || 'Unknown')}</option>`).join('')}</select>
                        ${String(warId)===currentWarId()?`<button class="tfc-btn" data-action="sync-war-attacks" ${state.warAttackSyncing?'disabled':''}>${state.warAttackSyncing?'Syncing…':'Sync attacks'}</button>`:''}
                    </div>
                </div>
                <div class="tfc-grid">
                    ${statCard('Participants', fmtNumber(participants), `${fmtNumber(totalAttempts)} attempts`)}
                    ${statCard('Scoring hits', fmtNumber(totalHits), `${fmtNumber(totalAssists)} assists`)}
                    ${statCard('Respect', fmtRate(totalRespect,2), 'tracked scoring respect')}
                    ${statCard('Our score', fmtNumber(summary.ourScore ?? 0), `target ${fmtNumber(summary.target ?? 0)}`)}
                    ${statCard('Opponent score', fmtNumber(summary.enemyScore ?? 0), escapeHtml(summary.opponentName || ''))}
                    ${statCard('Attack data', state.warAttackAccess==='ok'||summary.attacksTracked? 'Available':'Locked', summary.attacksTracked?`${fmtNumber(summary.attacksTracked)} stored attacks`:state.warAttackAccessType||'permission dependent')}
                </div>
            </div>
            ${lockedCurrent?`<div class="tfc-intel-lock"><strong class="tfc-warn">Exact performance needs faction attack-log access.</strong><br>${escapeHtml(state.warAttackError || 'Use a Limited/Full key with Faction API Access, or a Custom key containing faction attacks.')}</div>`:''}
            <div class="tfc-section">
                <div class="tfc-section-head"><div><h3>Performance report</h3><span class="tfc-muted" style="font-size:10px">Raw participation stays separate from payout rules.</span></div></div>
                <div class="tfc-table-wrap"><table class="tfc-table"><thead><tr><th>Member</th><th>Attempts</th><th>Scoring hits</th><th>Assists</th><th>Losses</th><th>Respect</th><th>Avg respect</th><th>Avg fair fight</th><th>Max chain</th><th>Last hit</th></tr></thead><tbody>
                ${performanceRows.length?performanceRows.map(r=>`<tr><td><div class="tfc-member"><a href="https://www.torn.com/profiles.php?XID=${r.id}">${escapeHtml(r.name)}</a><span class="tfc-id">[${r.id}]</span></div></td><td>${fmtNumber(r.attempts)}</td><td>${fmtNumber(r.scoringHits)}</td><td>${fmtNumber(r.assists)}</td><td>${fmtNumber(r.losses)}</td><td>${fmtRate(r.respect,2)}</td><td>${r.scoringHits?fmtRate(r.respect/r.scoringHits,3):'-'}</td><td>${r.fairFightCount?fmtRate(r.fairFightSum/r.fairFightCount,2):'-'}</td><td>${fmtNumber(r.maxChain)}</td><td>${r.last?fmtDuration(Math.max(0,nowSec()-Number(r.last)))+' ago':'-'}</td></tr>`).join(''):`<tr><td colspan="10" class="tfc-muted">No attack performance stored for this war.</td></tr>`}
                </tbody></table></div>
            </div>
            <div class="tfc-section">
                <div class="tfc-section-head"><div><h3>Payout builder</h3><span class="tfc-muted" style="font-size:10px">Your 90% member payout is the default preset, but every war can override it.</span></div><div class="tfc-toolbar"><button class="tfc-btn ${d.paidAt?'primary':''}" data-action="toggle-payout-paid">${d.paidAt?'Paid '+fmtDateTime(d.paidAt):'Mark payouts paid'}</button><button class="tfc-btn" data-action="reset-payout-adjustments">Reset adjustments</button><button class="tfc-btn" data-action="copy-payout-csv">Copy CSV</button><button class="tfc-btn primary" data-action="save-payout">Save draft</button></div></div>
                <div class="tfc-payout-controls">
                    <div class="tfc-payout-control"><label>Gross war value</label><input class="tfc-input" data-payout-field="grossValue" type="number" min="0" step="1000000" value="${Number(d.grossValue||0)}"><small>Cash-equivalent value. Manual in v0.5 so we never pretend cache pricing is exact.</small></div>
                    <div class="tfc-payout-control"><label>Member share</label><select class="tfc-select" data-payout-field="memberPercent">${[50,60,70,75,80,85,90,95,100].map(v=>`<option value="${v}" ${Number(d.memberPercent)===v?'selected':''}>${v}%</option>`).join('')}</select><small>The remainder is shown as faction retained value.</small></div>
                    <div class="tfc-payout-control"><label>Payout basis</label><select class="tfc-select" data-payout-field="mode"><option value="hits" ${d.mode==='hits'?'selected':''}>Eligible hits</option><option value="respect" ${d.mode==='respect'?'selected':''}>Eligible respect</option><option value="hybrid" ${d.mode==='hybrid'?'selected':''}>Hybrid</option></select><small>${escapeHtml(payoutBasisLabel(d))}</small></div>
                    <div class="tfc-payout-control"><label>Assist weight</label><select class="tfc-select" data-payout-field="assistWeight">${[0,.25,.5,.75,1].map(v=>`<option value="${v}" ${Number(d.assistWeight)===v?'selected':''}>${v===0?'Excluded':`${v} hit${v===1?'':'s'}`}</option>`).join('')}</select><small>Only affects hit/hybrid allocation. Assists remain separately visible.</small></div>
                    <div class="tfc-payout-control"><label>Minimum respect / hit</label><input class="tfc-input" data-payout-field="minRespect" type="number" min="0" step="0.01" value="${Number(d.minRespect||0)}"><small>Hits below this respect gain do not count toward payout.</small></div>
                    <div class="tfc-payout-control"><label>Minimum eligible hits</label><select class="tfc-select" data-payout-field="minHits">${[0,1,2,3,5,10,20].map(v=>`<option value="${v}" ${Number(d.minHits)===v?'selected':''}>${v?v:'None'}</option>`).join('')}</select><small>Members below this threshold receive no base share.</small></div>
                    <div class="tfc-payout-control"><label>Hybrid respect share</label><select class="tfc-select" data-payout-field="hybridRespectPercent" ${d.mode==='hybrid'?'':'disabled'}>${[25,33,50,67,75].map(v=>`<option value="${v}" ${Number(d.hybridRespectPercent)===v?'selected':''}>${v}% respect / ${100-v}% hits</option>`).join('')}</select><small>Used only in Hybrid mode.</small></div>
                    <div class="tfc-payout-control"><label>Round payouts to</label><select class="tfc-select" data-payout-field="roundTo">${[1,1000,10000,100000,1000000].map(v=>`<option value="${v}" ${Number(d.roundTo)===v?'selected':''}>${v===1?'$1':fmtMoney(v)}</option>`).join('')}</select><small>Rounding variance is shown rather than hidden.</small></div>
                </div>
                ${thresholdWarning?`<div class="tfc-intel-lock" style="margin-top:9px"><strong class="tfc-warn">Historical threshold limitation.</strong> One older saved report does not contain per-hit respect values. A non-zero minimum-respect rule cannot be reconstructed accurately for that report. Current and future v0.5 reports retain those values.</div>`:''}
                <div class="tfc-payout-grid">
                    ${statCard('Gross value',fmtMoney(calc.gross),'manual valuation')}
                    ${statCard('Member pool',fmtMoney(calc.pool),`${Number(d.memberPercent||0)}% preset`)}
                    ${statCard('Faction retained',fmtMoney(calc.factionRetained),`${100-Number(d.memberPercent||0)}%`)}
                    ${statCard('Calculated payouts',fmtMoney(calc.totalFinal),`${calc.rows.filter(r=>r.finalPayout>0).length} payout recipients`)}
                    ${statCard('Payment status',d.paidAt?'PAID':'UNPAID',d.paidAt?fmtDateTime(d.paidAt):'Finance treats this as planned')}
                    ${statCard(calc.variance>=0?'Unallocated':'Over pool',fmtMoney(Math.abs(calc.variance)),calc.variance>=0?'rounding / exclusions / adjustments':'manual adjustments exceed pool')}
                </div>
                <div class="tfc-table-wrap" style="margin-top:9px"><table class="tfc-table tfc-payout-table"><thead><tr><th>Member</th><th>Eligible hits</th><th>Assists</th><th>Eligible respect</th><th>Share units</th><th>Base</th><th>Adjustment</th><th>Final</th><th>Exclude</th><th>Note</th></tr></thead><tbody>
                ${calc.rows.length?calc.rows.map(r=>`<tr><td><div class="tfc-member"><a href="https://www.torn.com/profiles.php?XID=${r.id}">${escapeHtml(r.name)}</a><span class="tfc-id">${fmtNumber(r.attempts)} attempts</span></div></td><td>${fmtNumber(r.eligibleHits)}${r.eligibleHits<Number(r.scoringHits||0)?` <span class="tfc-warn">/${fmtNumber(r.scoringHits)}</span>`:''}</td><td>${fmtNumber(r.assists)}</td><td>${fmtRate(r.eligibleRespect,2)}</td><td>${d.mode==='respect'?fmtRate(r.respectUnits,2):d.mode==='hybrid'?`${fmtRate(r.hitUnits,2)} / ${fmtRate(r.respectUnits,2)}`:fmtRate(r.hitUnits,2)}</td><td>${fmtMoney(r.basePayout)}</td><td><input class="tfc-input tfc-adjust-input" data-payout-adjust="${r.id}" type="number" step="1000" value="${Number(r.adjustment||0)}"></td><td><strong class="${r.finalPayout?'tfc-good':'tfc-muted'}">${fmtMoney(r.finalPayout)}</strong></td><td><input type="checkbox" data-payout-exclude="${r.id}" ${d.excluded?.[r.id]?'checked':''}></td><td><input class="tfc-input tfc-note-input" data-payout-note="${r.id}" type="text" value="${escapeHtml(r.note||'')}" placeholder="bonus / penalty reason"></td></tr>`).join(''):`<tr><td colspan="10" class="tfc-muted">No participating members to calculate yet.</td></tr>`}
                </tbody></table></div>
                <div class="tfc-muted" style="font-size:9px;line-height:1.45;margin-top:8px">Adjustments are explicit additions/subtractions after the proportional base calculation. TFC does not silently rebalance them, so the Unallocated/Over pool card always exposes the difference.</div>
            </div>`;
    }

    async function copyText(textValue) {
        try { await navigator.clipboard.writeText(textValue); return true; } catch {}
        try {
            const ta=document.createElement('textarea'); ta.value=textValue; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); const ok=document.execCommand('copy'); ta.remove(); return ok;
        } catch { return false; }
    }

    async function copyPayoutCsv() {
        const warId = selectedPayoutWarId();
        const calc = computePayout(warId);
        const rows = [['Member','ID','Attempts','Eligible Hits','Assists','Eligible Respect','Base Payout','Adjustment','Final Payout','Excluded','Note']];
        for (const r of calc.rows) rows.push([r.name,r.id,r.attempts,r.eligibleHits,r.assists,Number(r.eligibleRespect||0).toFixed(3),r.basePayout,r.adjustment,r.finalPayout,r.excluded?'Yes':'No',r.note||'']);
        const csv=rows.map(row=>row.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n');
        const ok=await copyText(csv); toast(ok?'Payout CSV copied':'Could not copy CSV',ok?'ok':'error');
    }

    function targetWarHitCount(id) {
        return state.warAttacks.filter(a => String(a.defender?.id) === String(id) && Number(a.respect_gain || 0) > 0).length;
    }

    function previousWarsVsOpponent() {
        const current = currentWarId();
        const opponentId = Number(state.warOpponent?.id || 0);
        return Object.entries(state.warHistory || {}).filter(([id, w]) => String(id) !== current && Number(w?.opponentId || 0) === opponentId).length;
    }

    async function updateWarHistorySummary() {
        const warId = currentWarId();
        if (!warId || !state.currentWar || !state.warOpponent?.id) return;
        const { ours, enemy } = currentWarSides();
        const participation = warParticipationRows();
        const activity = currentWarActivityRecord();
        const targets = {};
        for (const [id, row] of Object.entries(activity?.members || {})) {
            targets[id] = { name: row.name || '', seen: Number(row.seen || 0), active: Number(row.active || 0), online: Number(row.online || 0), attackable: Number(row.attackable || 0) };
        }
        state.warHistory[warId] = {
            warId,
            opponentId: Number(state.warOpponent.id),
            opponentName: state.warOpponent.name || '',
            start: Number(state.currentWar.start || 0),
            end: Number(state.currentWar.end || 0),
            target: Number(state.currentWar.target || 0),
            ourScore: Number(ours?.score || 0),
            enemyScore: Number(enemy?.score || 0),
            updatedAt: Date.now(),
            activitySamples: Number(activity?.sampleCount || 0),
            attacksTracked: state.warAttacks.length,
            scoringHits: buildWarPerformanceRows(state.warAttacks, false).reduce((sum, r) => sum + Number(r.scoringHits || 0), 0),
            respect: state.warAttacks.reduce((sum, a) => sum + Number(a.respect_gain || 0), 0),
            participants: participation.filter(x => x.attempts > 0).map(x => ({ id: x.id, name: x.name, attempts: x.attempts, hits: x.hits, assists: x.assists, losses: x.losses, respect: Math.round(x.respect * 1000) / 1000 })),
            performance: buildWarPerformanceRows(state.warAttacks, false).filter(x => x.attempts > 0).map(compactPerformanceRow),
            targets,
        };
        const limit = Number(state.config.warHistoryLimit || 25);
        state.warHistory = Object.fromEntries(Object.entries(state.warHistory)
            .sort((a, b) => Number(b[1]?.updatedAt || 0) - Number(a[1]?.updatedAt || 0))
            .slice(0, limit));
        await Store.set('warHistory', state.warHistory);
    }

    function renderWarIntelligence() {
        const activity = currentWarActivityRecord();
        const participation = warParticipationRows();
        const activeParticipants = participation.filter(x => x.attempts > 0);
        const totalHits = buildWarPerformanceRows(state.warAttacks, false).reduce((sum, r) => sum + Number(r.scoringHits || 0), 0);
        const totalRespect = state.warAttacks.reduce((sum, a) => sum + Number(a.respect_gain || 0), 0);
        const recent = state.warAttacks.slice(0, 10);
        const attackAge = state.warAttackLastFetchedAt ? fmtDuration(Math.floor((Date.now() - state.warAttackLastFetchedAt) / 1000)) : 'never';

        const activityBlock = `<div class="tfc-intel-card">
            <div class="tfc-section-head" style="margin-bottom:6px"><h4>Opponent activity intelligence</h4><span class="tfc-muted" style="font-size:9px">${fmtNumber(activity?.sampleCount || 0)} samples · 5m cadence</span></div>
            <div class="tfc-war-detail-grid" style="margin-bottom:0">
                ${detailMetric('Observations', fmtNumber(activity?.sampleCount || 0), activity?.lastSampleAt ? `Last ${fmtDuration(nowSec() - Number(activity.lastSampleAt))} ago` : 'Starts automatically')}
                ${detailMetric('Prior wars', fmtNumber(previousWarsVsOpponent()), 'against this faction')}
                ${detailMetric('Recently out', fmtNumber(Object.values(state.warRecentReleases?.[currentWarId()] || {}).filter(r => nowSec() - Number(r.at || 0) <= Number(state.config.warRecentReleaseMinutes || 10) * 60).length), `within ${state.config.warRecentReleaseMinutes}m`)}
                ${detailMetric('History storage', `${Object.keys(state.warHistory || {}).length} wars`, `keeps latest ${state.config.warHistoryLimit}`)}
            </div>
        </div>`;

        let attackBlock;
        if (state.warAttackAccess === 'ok') {
            const top = activeParticipants.slice(0, 10);
            attackBlock = `<div class="tfc-intel-card">
                <div class="tfc-section-head" style="margin-bottom:6px"><h4>Live participation</h4><button class="tfc-btn" data-action="sync-war-attacks" ${state.warAttackSyncing ? 'disabled' : ''}>${state.warAttackSyncing ? 'Syncing...' : 'Sync attacks'}</button></div>
                <div class="tfc-muted" style="font-size:9px;margin-bottom:6px">${fmtNumber(totalHits)} scoring hits · ${fmtRate(totalRespect, 2)} respect · ${activeParticipants.length}/${state.roster.length || '?'} members participated · updated ${attackAge} ago</div>
                ${top.length ? `<table class="tfc-mini-table"><thead><tr><th>Member</th><th>Hits</th><th>Attempts</th><th>Respect</th><th>Last</th></tr></thead><tbody>${top.map(x => `<tr><td>${escapeHtml(x.name)}</td><td>${fmtNumber(x.hits)}</td><td>${fmtNumber(x.attempts)}</td><td>${fmtRate(x.respect, 2)}</td><td>${x.last ? fmtDuration(nowSec() - x.last) + ' ago' : '-'}</td></tr>`).join('')}</tbody></table>` : '<div class="tfc-muted" style="font-size:10px">No tracked war attacks yet.</div>'}
            </div>`;
        } else {
            const reason = state.warAttackError || 'Exact faction attack logs require a higher-permission API key.';
            attackBlock = `<div class="tfc-intel-card"><h4>Live participation</h4><div class="tfc-intel-lock"><strong class="tfc-warn">Exact hit tracking is optional and currently locked.</strong><br>${escapeHtml(reason)}<br><br>War status, target activity, hospital releases, pins, notes, and historical opponent activity continue to work with your existing key. To unlock exact hits, use a Limited/Full key with Faction API Access, or a Custom key containing the faction <b>attacks</b> selection.</div></div>`;
        }

        const feed = state.warAttackAccess === 'ok' ? `<div class="tfc-intel-card" style="grid-column:1/-1">
            <div class="tfc-section-head" style="margin-bottom:6px"><h4>Recent tracked war attacks</h4><span class="tfc-muted" style="font-size:9px">Newest ${Math.min(10, recent.length)} of ${state.warAttacks.length}</span></div>
            ${recent.length ? `<div class="tfc-feed">${recent.map(a => `<div class="tfc-feed-item"><div><strong>${escapeHtml(a.attacker?.name || `#${a.attacker?.id || '?'}`)}</strong> → ${escapeHtml(a.defender?.name || `#${a.defender?.id || '?'}`)}<small>${escapeHtml(a.result || '')} · chain ${a.chain ?? '-'} · ${fmtDuration(Math.max(0, nowSec() - Number(a.ended || 0)))} ago</small></div><div class="${Number(a.respect_gain || 0) > 0 ? 'tfc-good' : 'tfc-muted'}">+${fmtRate(a.respect_gain || 0, 2)} respect</div></div>`).join('')}</div>` : '<div class="tfc-muted" style="font-size:10px">No tracked attacks yet.</div>'}
        </div>` : '';

        return `<div class="tfc-section"><div class="tfc-section-head"><div><h3>War intelligence</h3><span class="tfc-muted" style="font-size:10px">Activity history is sampled locally. Exact attacks are read only when your key permits them.</span></div></div><div class="tfc-war-intel-grid">${activityBlock}${attackBlock}${feed}</div></div>`;
    }

    function renderWar() {
        if (state.warLoading && !state.currentWar) {
            return `<div class="tfc-empty"><div><strong>Loading War Command...</strong>Reading your current ranked war and opponent roster from Torn.</div></div>`;
        }
        if (!state.currentWar) {
            return `<div class="tfc-empty"><div><strong>No current ranked war found</strong>The War module checks Torn's current faction-wars endpoint. If your war has just been matched or started, refresh it here.<br><br><button class="tfc-btn primary" data-action="refresh-war">Refresh War Command</button></div></div>`;
        }

        const war = state.currentWar;
        const { ours, enemy } = currentWarSides();
        const target = Math.max(1, Number(war.target || 0));
        const ourScore = Number(ours?.score || 0);
        const enemyScore = Number(enemy?.score || 0);
        const lead = ourScore - enemyScore;
        const ourPct = Math.min(100, Math.max(0, ourScore / target * 100));
        const enemyPct = Math.min(100, Math.max(0, enemyScore / target * 100));
        const phase = warPhase(war);
        const buckets = enemyStatusBuckets();
        const releases = releaseQueue();
        const filtered = getFilteredSortedTargets();
        const lastRefresh = state.warLastFetchedAt ? fmtDuration(Math.floor((Date.now() - state.warLastFetchedAt) / 1000)) : 'never';
        const auto = Number(state.config.warAutoRefreshSeconds || 0);

        return `
            <div class="tfc-section-head">
                <div>
                    <div class="tfc-kicker">Ranked War Command</div>
                    <h3 style="font-size:16px;margin-top:4px">${escapeHtml(ours?.name || state.faction?.name || 'Your faction')} vs ${escapeHtml(enemy?.name || state.warOpponent?.name || 'Opponent')}</h3>
                    <span class="tfc-muted" style="font-size:10px">War #${fmtNumber(war.war_id ?? war.id)} · refreshed ${escapeHtml(lastRefresh)} ago${auto ? ` · auto ${auto}s` : ''}</span>
                </div>
                <div class="tfc-toolbar">
                    <span class="tfc-pill ${phase.cls}">${escapeHtml(phase.label)}</span>
                    ${phase.countdownTs ? `<span class="tfc-pill"><span>${escapeHtml(phase.countdownPrefix)}</span><span class="tfc-countdown" data-countdown="${phase.countdownTs}"></span></span>` : ''}
                    <button class="tfc-btn primary" data-action="refresh-war" ${state.warLoading ? 'disabled' : ''}>${state.warLoading ? 'Refreshing...' : 'Refresh'}</button>
                </div>
            </div>

            <div class="tfc-card tfc-war-score">
                <div class="tfc-war-side">
                    <div class="tfc-war-name">${escapeHtml(ours?.name || 'Your faction')}</div>
                    <div class="tfc-war-points">${fmtNumber(ourScore)}</div>
                    <div class="tfc-muted" style="font-size:9px">Chain ${fmtNumber(ours?.chain || 0)} · ${Math.max(0, target - ourScore).toLocaleString()} to target</div>
                    <div class="tfc-war-bar"><span style="width:${ourPct.toFixed(2)}%"></span></div>
                </div>
                <div class="tfc-war-vs">Target<br><strong style="font-size:16px;color:#fff">${fmtNumber(target)}</strong></div>
                <div class="tfc-war-side right">
                    <div class="tfc-war-name">${escapeHtml(enemy?.name || 'Opponent')}</div>
                    <div class="tfc-war-points">${fmtNumber(enemyScore)}</div>
                    <div class="tfc-muted" style="font-size:9px">Chain ${fmtNumber(enemy?.chain || 0)} · ${Math.max(0, target - enemyScore).toLocaleString()} to target</div>
                    <div class="tfc-war-bar"><span style="width:${enemyPct.toFixed(2)}%"></span></div>
                </div>
            </div>

            <div class="tfc-war-summary">
                ${statCard('Score gap', `${lead >= 0 ? '+' : ''}${fmtNumber(lead)}`, lead > 0 ? 'ahead' : lead < 0 ? 'behind' : 'tied')}
                ${statCard('Attackable', buckets.attackable, `${buckets.active} online / idle`)}
                ${statCard('Hospital', buckets.hospital, `${buckets.soon} out within ${state.config.warHospitalSoonMinutes}m`)}
                ${statCard('Traveling', buckets.travel, 'traveling / abroad')}
                ${statCard('Enemy roster', buckets.total, `${filtered.length} currently shown`)}
                ${statCard('War start', fmtDateTime(war.start), Number(war.start || 0) > nowSec() ? 'scheduled' : phase.label.toLowerCase())}
            </div>

            ${renderWarIntelligence()}

            <div class="tfc-section">
                <div class="tfc-section-head">
                    <h3>Hospital release queue</h3>
                    <span class="tfc-muted" style="font-size:10px">Earliest ${Math.min(8, releases.length)} of ${releases.length}</span>
                </div>
                ${releases.length ? `<div class="tfc-release-list">${releases.slice(0, 8).map(renderReleaseTarget).join('')}</div>` : `<div class="tfc-card tfc-muted" style="font-size:10px">No opponent members are currently in hospital with a future release time.</div>`}
            </div>

            <div class="tfc-section">
                <div class="tfc-section-head">
                    <div>
                        <h3>Enemy target board</h3>
                        <span class="tfc-muted" style="font-size:10px">Pins and notes are stored locally on this device. TFC never attacks automatically.</span>
                    </div>
                    <div class="tfc-toolbar">
                        <input class="tfc-input search" data-role="war-search" placeholder="Search enemy..." value="${escapeHtml(state.warSearch)}">
                        <select class="tfc-select" data-role="war-filter">
                            ${warFilterOption('all', 'All targets')}
                            ${warFilterOption('attackable', 'Attackable')}
                            ${warFilterOption('active', 'Online / idle')}
                            ${warFilterOption('hospital', 'Hospital')}
                            ${warFilterOption('soon', `Hospital ≤ ${state.config.warHospitalSoonMinutes}m`)}
                            ${warFilterOption('recent', `Recently out ≤ ${state.config.warRecentReleaseMinutes}m`)}
                            ${warFilterOption('travel', 'Traveling / abroad')}
                            ${warFilterOption('pinned', 'Pinned')}
                        </select>
                        <select class="tfc-select" data-role="war-sort">
                            ${warSortOption('smart', 'Smart sort')}
                            ${warSortOption('activity', 'Most active')}
                            ${warSortOption('release', 'Hospital release')}
                            ${warSortOption('leveldesc', 'Level high to low')}
                            ${warSortOption('levelasc', 'Level low to high')}
                            ${warSortOption('name', 'Name')}
                        </select>
                    </div>
                </div>
                <div class="tfc-table-wrap">
                    <table class="tfc-table ${state.config.compactRows ? 'compact' : ''}" style="min-width:1120px">
                        <thead><tr>
                            <th class="no-sort">Target</th>
                            <th class="no-sort">Lvl</th>
                            <th class="no-sort">Last action</th>
                            <th class="no-sort">Status</th>
                            <th class="no-sort">Release / detail</th>
                            <th class="no-sort">Activity</th>
                            <th class="no-sort">Our hits</th>
                            <th class="no-sort">Days in faction</th>
                            <th class="no-sort">Actions</th>
                        </tr></thead>
                        <tbody>${filtered.map(targetRow).join('')}</tbody>
                    </table>
                </div>
            </div>
        `;
    }

    function renderReleaseTarget(m) {
        const until = Number(m.status?.until || 0);
        return `<div class="tfc-release">
            <div><strong>${escapeHtml(m.name)} [${m.id}]</strong><small>Lvl ${fmtNumber(m.level)} · ${escapeHtml(m.last_action?.status || 'Offline')} · ${escapeHtml(m.last_action?.relative || '')}</small></div>
            <div style="text-align:right"><div class="tfc-countdown" data-countdown="${until}"></div><a class="tfc-attack-link" style="margin-top:4px" href="https://www.torn.com/loader.php?sid=attack&user2ID=${m.id}">Attack</a></div>
        </div>`;
    }

    function warFilterOption(value, label) {
        return `<option value="${value}" ${state.warFilter === value ? 'selected' : ''}>${escapeHtml(label)}</option>`;
    }

    function warSortOption(value, label) {
        return `<option value="${value}" ${state.warSort === value ? 'selected' : ''}>${escapeHtml(label)}</option>`;
    }

    function targetStatusPriority(m) {
        const status = String(m.status?.state || '').toLowerCase();
        if (status === 'okay') return 0;
        if (status === 'hospital') {
            const remain = Number(m.status?.until || 0) - nowSec();
            return remain > 0 && remain <= Number(state.config.warHospitalSoonMinutes || 15) * 60 ? 1 : 2;
        }
        if (['traveling', 'abroad'].includes(status)) return 4;
        return 3;
    }

    function targetActivityPriority(m) {
        const a = String(m.last_action?.status || '').toLowerCase();
        if (a === 'online') return 0;
        if (a === 'idle') return 1;
        return 2;
    }

    function getFilteredSortedTargets() {
        const q = state.warSearch.trim().toLowerCase();
        const now = nowSec();
        const soonSeconds = Number(state.config.warHospitalSoonMinutes || 15) * 60;
        let rows = state.enemyRoster.filter(m => {
            if (q && !`${m.name} ${m.id} ${m.position || ''}`.toLowerCase().includes(q)) return false;
            const status = String(m.status?.state || '').toLowerCase();
            const activity = String(m.last_action?.status || '').toLowerCase();
            if (state.warFilter === 'attackable' && status !== 'okay') return false;
            if (state.warFilter === 'active' && !['online', 'idle'].includes(activity)) return false;
            if (state.warFilter === 'hospital' && status !== 'hospital') return false;
            if (state.warFilter === 'soon' && !(status === 'hospital' && Number(m.status?.until || 0) > now && Number(m.status.until) - now <= soonSeconds)) return false;
            if (state.warFilter === 'recent' && !recentReleaseRecord(m.id)) return false;
            if (state.warFilter === 'travel' && !['traveling', 'abroad'].includes(status)) return false;
            if (state.warFilter === 'pinned' && !isTargetPinned(m.id)) return false;
            return true;
        });

        rows.sort((a, b) => {
            const pinA = isTargetPinned(a.id) ? 0 : 1;
            const pinB = isTargetPinned(b.id) ? 0 : 1;
            if (pinA !== pinB) return pinA - pinB;
            const recentA = recentReleaseRecord(a.id) ? 0 : 1;
            const recentB = recentReleaseRecord(b.id) ? 0 : 1;
            if (state.warSort === 'smart' && recentA !== recentB) return recentA - recentB;
            if (state.warSort === 'name') return String(a.name).localeCompare(String(b.name));
            if (state.warSort === 'leveldesc') return Number(b.level || 0) - Number(a.level || 0);
            if (state.warSort === 'levelasc') return Number(a.level || 0) - Number(b.level || 0);
            if (state.warSort === 'activity') {
                const ar = targetActivityPriority(a) - targetActivityPriority(b);
                if (ar) return ar;
                return Number(b.last_action?.timestamp || 0) - Number(a.last_action?.timestamp || 0);
            }
            if (state.warSort === 'release') {
                const au = String(a.status?.state || '').toLowerCase() === 'hospital' ? Number(a.status?.until || Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;
                const bu = String(b.status?.state || '').toLowerCase() === 'hospital' ? Number(b.status?.until || Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;
                if (au !== bu) return au - bu;
            }
            const sp = targetStatusPriority(a) - targetStatusPriority(b);
            if (sp) return sp;
            const ap = targetActivityPriority(a) - targetActivityPriority(b);
            if (ap) return ap;
            return Number(b.last_action?.timestamp || 0) - Number(a.last_action?.timestamp || 0);
        });
        return rows;
    }

    function targetRow(m) {
        const pinned = isTargetPinned(m.id);
        const expanded = String(state.expandedTargetId) === String(m.id);
        const status = String(m.status?.state || 'Unknown');
        const statusLower = status.toLowerCase();
        const statusClass = statusLower === 'hospital' ? 'tfc-status-hospital' : (['traveling', 'abroad'].includes(statusLower) ? 'tfc-status-travel' : (statusLower === 'okay' ? 'tfc-status-okay' : 'tfc-muted'));
        const activity = String(m.last_action?.status || 'Offline').toLowerCase();
        const until = Number(m.status?.until || 0);
        const release = statusLower === 'hospital' && until > nowSec() ? `<span class="tfc-countdown" data-countdown="${until}"></span>` : escapeHtml(m.status?.description || m.status?.details || '-');
        const note = state.warNotes[warNoteKey(m.id)] || '';
        const hasNote = !!String(note).trim();
        const recent = recentReleaseRecord(m.id);
        const activityIntel = targetActivityIntel(m.id);
        const trackedHits = state.warAttackAccess === 'ok' ? targetWarHitCount(m.id) : null;
        const main = `<tr>
            <td><div class="tfc-member"><div class="tfc-member-line"><button class="tfc-member-toggle" data-target-toggle="${m.id}">${expanded ? '▾' : '▸'}</button><a href="https://www.torn.com/profiles.php?XID=${m.id}" target="_blank" rel="noopener">${escapeHtml(m.name)}</a>${pinned ? '<span title="Pinned">★</span>' : ''}${hasNote ? '<span class="tfc-muted" title="Has local note">●</span>' : ''}${recent ? `<span class="tfc-recent-badge" title="Detected leaving hospital ${fmtDuration(nowSec() - Number(recent.at || 0))} ago">RECENT</span>` : ''}</div><span class="tfc-id">[${m.id}]</span></div></td>
            <td>${fmtNumber(m.level)}</td>
            <td><span class="tfc-pill"><span class="tfc-dot ${activity}"></span>${escapeHtml(m.last_action?.relative || 'Unknown')}</span></td>
            <td class="${statusClass}">${escapeHtml(status)}</td>
            <td>${release}</td>
            <td>${targetActivityHtml(m.id)}</td>
            <td>${trackedHits === null ? '<span class="tfc-muted">Locked</span>' : fmtNumber(trackedHits)}</td>
            <td>${fmtNumber(m.days_in_faction)}</td>
            <td><div class="tfc-target-actions"><button class="tfc-icon-btn ${pinned ? 'pinned' : ''}" data-war-pin="${m.id}">${pinned ? '★ Pinned' : '☆ Pin'}</button><a class="tfc-attack-link" href="https://www.torn.com/loader.php?sid=attack&user2ID=${m.id}">Attack</a></div></td>
        </tr>`;
        if (!expanded) return main;
        return main + `<tr class="tfc-detail-row"><td colspan="9"><div class="tfc-detail">
            <div class="tfc-war-detail-grid">
                ${detailMetric('Status detail', m.status?.description || status, m.status?.details || '')}
                ${detailMetric('Last action', m.last_action?.relative || '-', m.last_action?.status || '')}
                ${detailMetric('Current-war activity', activityIntel.currentPct === null ? '-' : `${activityIntel.currentPct}%`, activityIntel.current ? `${activityIntel.current.active || 0}/${activityIntel.current.seen || 0} active samples` : 'Collecting observations')}
                ${detailMetric('Past activity', activityIntel.pastPct === null ? '-' : `${activityIntel.pastPct}%`, activityIntel.pastWars ? `${activityIntel.pastWars} previous war${activityIntel.pastWars === 1 ? '' : 's'} vs this faction` : 'No previous local history')}
                ${detailMetric('Hospital release', statusLower === 'hospital' && until ? fmtDateTime(until) : '-', statusLower === 'hospital' && until > nowSec() ? 'Live countdown above' : '')}
                ${detailMetric('Recently released', recent ? `${fmtDuration(nowSec() - Number(recent.at || 0))} ago` : '-', recent ? `Detected hospital → ${recent.status}` : '')}
                ${detailMetric('Tracked scoring hits', trackedHits === null ? 'Locked' : fmtNumber(trackedHits), state.warAttackAccess === 'ok' ? 'this war' : 'requires attack-log access')}
                ${detailMetric('Faction tenure', `${fmtNumber(m.days_in_faction)} days`, m.position || '')}
            </div>
            <label style="display:block;color:#fff;font-size:10px;font-weight:800;margin-bottom:5px">Local leadership note</label>
            <textarea class="tfc-war-note" data-war-note="${m.id}" placeholder="Known stats, matchup notes, usual behavior, priority, etc.">${escapeHtml(note)}</textarea>
            <div class="tfc-muted" style="font-size:9px;margin-top:5px">Saved locally for this opponent faction. No note is sent to Torn or to other faction members.</div>
        </div></td></tr>`;
    }

    function extractRankedWar(data) {
        const ranked = data?.wars?.ranked ?? data?.ranked ?? null;
        if (!ranked) return null;
        return ranked;
    }

    async function refreshWar(force = false, silent = false) {
        if (state.warLoading || !state.config?.apiKey) return;
        state.warLoading = true;
        if (state.open && ['war','payout'].includes(state.activeTab)) render();
        try {
            if (!state.faction?.id) {
                if (state.loadingRoster) {
                    const started = Date.now();
                    while (state.loadingRoster && Date.now() - started < 15000) await sleep(100);
                } else {
                    await refreshRoster(false);
                }
            }
            if (!state.faction?.id) throw new Error('Could not identify your faction from the API key');
            const warsData = await api('/faction/wars', {}, { ttl: 15_000, force });
            const war = extractRankedWar(warsData);
            const previousWarId = currentWarId();
            const previousOpponentId = Number(state.warOpponent?.id || 0);
            const previousEnemyRoster = [...state.enemyRoster];

            state.currentWar = war;
            state.warOpponent = null;

            if (war && Array.isArray(war.factions)) {
                const ownId = Number(state.faction?.id || 0);
                state.warOpponent = war.factions.find(f => Number(f.id) !== ownId) || null;
                const newWarId = currentWarId();
                const sameOpponent = previousOpponentId && Number(state.warOpponent?.id || 0) === previousOpponentId;
                const sameWar = previousWarId && previousWarId === newWarId;
                if (!sameWar) {
                    state.warAttacks = state.warAttackCache?.warId === newWarId && Array.isArray(state.warAttackCache?.attacks) ? state.warAttackCache.attacks : [];
                    state.warAttackLastFetchedAt = state.warAttackCache?.warId === newWarId ? Number(state.warAttackCache.updatedAt || 0) : 0;
                }
                if (state.warOpponent?.id) {
                    const enemyMembers = await api(`/faction/${state.warOpponent.id}/members`, { striptags: 'true' }, {
                        ttl: Number(state.config.warRosterCacheSeconds || 20) * 1000,
                        force,
                    });
                    const nextRoster = Array.isArray(enemyMembers?.members) ? enemyMembers.members : [];
                    await detectRecentReleases(sameOpponent ? previousEnemyRoster : [], nextRoster);
                    state.enemyRoster = nextRoster;
                    await captureEnemyActivitySnapshot(force && !sameWar);
                    await syncWarAttacks(force, !sameWar || !state.warAttacks.length);
                    await updateWarHistorySummary();
                } else {
                    state.enemyRoster = [];
                }
            } else {
                state.enemyRoster = [];
                // Keep the latest bounded attack cache/report available for post-war payout work.
                if (state.warAttackCache?.warId && Array.isArray(state.warAttackCache.attacks)) state.warAttacks = state.warAttackCache.attacks;
            }
            state.warLastFetchedAt = Date.now();
            if (force && !silent) toast(war ? `War Command updated: ${state.enemyRoster.length} enemy members` : 'No current ranked war found');
        } catch (err) {
            console.error('[TFC] war refresh failed', err);
            if (!silent) toast(`War refresh failed: ${err.message}`, 'error');
        } finally {
            state.warLoading = false;
            if (state.open && ['war','payout'].includes(state.activeTab)) render();
        }
    }

    function chainTimeoutClass(timeout) {
        const t = Number(timeout || 0);
        if (t <= 0) return '';
        if (t <= Number(state.config.chainDangerSeconds || 120)) return 'danger';
        if (t <= Number(state.config.chainWarningSeconds || 240)) return 'warn';
        return '';
    }

    function fmtUtcHour(ts) {
        const d = new Date(Number(ts) * 1000);
        return `${String(d.getUTCHours()).padStart(2,'0')}:00`;
    }

    function fmtUtcDateTime(ts) {
        const d = new Date(Number(ts) * 1000);
        if (!Number(ts)) return '-';
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')} ${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')} TCT`;
    }

    function chainMemberName(id) {
        const m = state.roster.find(x => String(x.id) === String(id));
        return m?.name || `#${id}`;
    }

    function currentChainId() {
        return state.chain?.id ? String(state.chain.id) : (state.chainReport?.id ? String(state.chainReport.id) : null);
    }

    function chainReportRows(report = state.chainReport) {
        if (!report) return [];
        const rows = (report.attackers || []).map(a => ({
            id: a.id,
            name: chainMemberName(a.id),
            attacks: Number(a.attacks?.total || 0),
            respect: Number(a.respect?.total || 0),
            avgRespect: Number(a.respect?.average || 0),
            bestRespect: Number(a.respect?.best || 0),
            bonuses: Number(a.attacks?.bonuses || 0),
            war: Number(a.attacks?.war || 0),
            overseas: Number(a.attacks?.overseas || 0),
            retaliations: Number(a.attacks?.retaliations || 0),
            assists: Number(a.attacks?.assists || 0),
            losses: Number(a.attacks?.losses || 0),
        })).sort((a,b) => b.attacks-a.attacks || b.respect-a.respect || a.name.localeCompare(b.name));
        return rows;
    }

    function compactChainReport(report) {
        if (!report?.id) return null;
        return {
            id: report.id,
            faction_id: report.faction_id,
            start: Number(report.start || 0),
            end: Number(report.end || 0),
            details: report.details || {},
            bonuses: Array.isArray(report.bonuses) ? report.bonuses.slice(-50) : [],
            attackers: Array.isArray(report.attackers) ? report.attackers : [],
            non_attackers: Array.isArray(report.non_attackers) ? report.non_attackers : [],
            fetchedAt: Date.now(),
        };
    }

    async function saveChainReport(report) {
        if (!report?.id) return;
        state.chainReports[String(report.id)] = compactChainReport(report);
        const keep = Object.values(state.chainReports)
            .sort((a,b) => Number(b.start || b.fetchedAt || 0)-Number(a.start || a.fetchedAt || 0))
            .slice(0, Number(state.config.chainHistoryLimit || 20));
        state.chainReports = Object.fromEntries(keep.map(r => [String(r.id), r]));
        await Store.set('chainReports', state.chainReports);
    }

    async function refreshChain(force = false, silent = false) {
        if (state.chainLoading) return;
        state.chainLoading = true;
        if (!silent) render();
        try {
            const needRecent = force || !state.chainRecent.length;
            const promises = [
                api('/faction/chain', {}, { ttl: 15000, force }),
                api('/faction/chainreport', {}, { ttl: 15000, force }),
            ];
            if (needRecent) promises.push(api('/faction/chains', { limit: Number(state.config.chainHistoryLimit || 20), sort: 'DESC' }, { ttl: 10*60*1000, force }));
            const [chainData, reportData, recentData] = await Promise.all(promises);
            state.chain = chainData?.chain || null;
            state.chainReport = reportData?.chainreport || null;
            if (recentData) state.chainRecent = Array.isArray(recentData?.chains) ? recentData.chains : [];
            if (state.chainReport?.id) {
                await saveChainReport(state.chainReport);
                if (!state.chainSelectedId) state.chainSelectedId = String(state.chainReport.id);
            }
            state.chainLastFetchedAt = Date.now();
            if (force && !silent) toast('Chain Command refreshed');
        } catch (err) {
            console.warn('[TFC] chain refresh failed', err);
            if (!silent) toast(`Chain refresh failed: ${err.message}`, 'error');
        } finally {
            state.chainLoading = false;
            if (state.open && state.activeTab === 'chain') render();
        }
    }

    async function loadChainReport(chainId, force = false) {
        const id = String(chainId || '');
        if (!id) return;
        state.chainSelectedId = id;
        const current = String(state.chainReport?.id || '') === id ? state.chainReport : null;
        if (current && !force) return render();
        if (state.chainReports[id] && !force) return render();
        state.chainLoading = true;
        render();
        try {
            const data = await api(`/faction/${encodeURIComponent(id)}/chainreport`, {}, { ttl: 60*60*1000, force });
            if (data?.chainreport) await saveChainReport(data.chainreport);
        } catch (err) {
            toast(`Chain report failed: ${err.message}`, 'error');
        } finally {
            state.chainLoading = false;
            render();
        }
    }

    function selectedChainReport() {
        const id = String(state.chainSelectedId || '');
        if (id && String(state.chainReport?.id || '') === id) return state.chainReport;
        if (id && state.chainReports[id]) return state.chainReports[id];
        return state.chainReport || null;
    }

    function assignmentForHour(ts) {
        const start = Number(ts);
        const end = start + 3600;
        return state.chainAssignments.filter(a => Number(a.start) < end && Number(a.end) > start);
    }

    function upcomingCoverageHours(hours = Number(state.config.chainCoverageHours || 24)) {
        const now = nowSec();
        const base = Math.floor(now / 3600) * 3600;
        return Array.from({length:hours}, (_,i) => {
            const t = base + i*3600;
            const assignments = assignmentForHour(t);
            return { t, assignments, now: i === 0 };
        });
    }

    function renderCoverageGrid() {
        return `<div style="overflow:auto"><div class="tfc-chain-coverage">${upcomingCoverageHours().map(h => {
            const names = h.assignments.map(a => a.name || chainMemberName(a.memberId));
            const cls = h.assignments.length ? 'covered' : 'empty';
            return `<div class="tfc-chain-hour ${cls} ${h.now?'now':''}" title="${escapeHtml(names.join(', ') || 'No assigned coverage')}"><b>${fmtUtcHour(h.t)}</b><span>${h.assignments.length ? `${h.assignments.length} cover` : 'GAP'}</span><span>${escapeHtml(names.slice(0,2).join(', ') || 'Uncovered')}</span></div>`;
        }).join('')}</div></div>`;
    }

    function chainCoverageSummary() {
        const hours = upcomingCoverageHours();
        const gaps = hours.filter(h => !h.assignments.length);
        const current = hours[0]?.assignments.length || 0;
        const nextGap = gaps.find(h => h.t >= Math.floor(nowSec()/3600)*3600);
        return { current, gaps:gaps.length, nextGap };
    }

    function defaultChainPlanDate() {
        const d = new Date();
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
    }

    function parseUtcPlan(date, hour) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date)) || !/^\d{1,2}$/.test(String(hour))) return 0;
        const [y,m,d] = date.split('-').map(Number);
        const h = Number(hour);
        if (h < 0 || h > 23) return 0;
        return Math.floor(Date.UTC(y,m-1,d,h,0,0)/1000);
    }

    async function addChainAssignment() {
        const panel = $('#tfc-panel');
        const memberId = $('[data-chain-plan="member"]', panel)?.value || '';
        const date = $('[data-chain-plan="date"]', panel)?.value || '';
        const hour = $('[data-chain-plan="hour"]', panel)?.value || '';
        const duration = Number($('[data-chain-plan="duration"]', panel)?.value || 1);
        const targetHits = Number($('[data-chain-plan="hits"]', panel)?.value || 0);
        const note = $('[data-chain-plan="note"]', panel)?.value?.trim() || '';
        const start = parseUtcPlan(date,hour);
        if (!memberId || !start) return toast('Choose a member, date and TCT hour', 'error');
        const member = state.roster.find(m => String(m.id) === String(memberId));
        const assignment = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
            memberId: Number(memberId),
            name: member?.name || `#${memberId}`,
            start,
            end:start+Math.max(1,duration)*3600,
            targetHits:Math.max(0,targetHits),
            note,
            chainId:currentChainId(),
            createdAt:Date.now(),
        };
        state.chainAssignments.push(assignment);
        state.chainAssignments = state.chainAssignments
            .filter(a => Number(a.end || 0) > nowSec()-14*86400)
            .sort((a,b)=>Number(a.start)-Number(b.start))
            .slice(-300);
        await Store.set('chainAssignments', state.chainAssignments);
        toast(`Coverage added for ${assignment.name}`);
        render();
    }

    async function deleteChainAssignment(id) {
        state.chainAssignments = state.chainAssignments.filter(a => String(a.id) !== String(id));
        await Store.set('chainAssignments', state.chainAssignments);
        render();
    }

    function assignmentActualHits(a, report) {
        if (!report) return null;
        const row = chainReportRows(report).find(r => String(r.id) === String(a.memberId));
        return row ? row.attacks : 0;
    }

    function renderChainAssignments(report) {
        const rows = state.chainAssignments.filter(a => Number(a.end || 0) > nowSec()-2*86400).sort((a,b)=>Number(a.start)-Number(b.start));
        if (!rows.length) return `<div class="tfc-muted" style="font-size:10px;padding:8px 0">No coverage assignments yet. Add shifts above to expose uncovered hours.</div>`;
        return rows.map(a => {
            const actual = assignmentActualHits(a, report);
            const goal = Number(a.targetHits || 0);
            const actualText = actual === null ? '-' : fmtNumber(actual);
            return `<div class="tfc-chain-assignment">
                <div><strong style="color:#fff">${escapeHtml(a.name || chainMemberName(a.memberId))}</strong><br><span class="tfc-muted">[${a.memberId}]</span></div>
                <div>${fmtUtcDateTime(a.start)}<br><span class="tfc-muted">${fmtUtcHour(a.start)}–${fmtUtcHour(a.end)}</span></div>
                <div><span class="tfc-muted">Goal</span><br><strong>${goal ? fmtNumber(goal) : '-'}</strong></div>
                <div><span class="tfc-muted">Chain total</span><br><strong>${actualText}</strong></div>
                <div>${escapeHtml(a.note || '')}</div>
                <button class="tfc-btn danger" data-chain-delete="${escapeHtml(a.id)}">Remove</button>
            </div>`;
        }).join('');
    }

    function renderChainContributionTable(report) {
        if (!report) return `<div class="tfc-empty"><div><strong>No chain report loaded</strong>Refresh Chain Command or select a completed chain below.</div></div>`;
        const rows = chainReportRows(report);
        const non = new Set((report.non_attackers || []).map(String));
        const body = rows.map((r,i)=>`<tr>
            <td>${i+1}</td><td><a href="https://www.torn.com/profiles.php?XID=${r.id}" target="_blank" rel="noopener">${escapeHtml(r.name)}</a><br><span class="tfc-id">[${r.id}]</span></td>
            <td>${fmtNumber(r.attacks)}</td><td>${fmtNumber(r.respect.toFixed(2))}</td><td>${r.avgRespect.toFixed(2)}</td><td>${r.bestRespect.toFixed(2)}</td><td>${fmtNumber(r.bonuses)}</td><td>${fmtNumber(r.war)}</td><td>${fmtNumber(r.overseas)}</td><td>${fmtNumber(r.assists)}</td><td>${fmtNumber(r.losses)}</td>
        </tr>`).join('');
        const passive = [...non].map(id=>chainMemberName(id)).slice(0,20);
        return `<div style="overflow:auto"><table class="tfc-table tfc-chain-report-table"><thead><tr><th>#</th><th>Member</th><th>Attacks</th><th>Respect</th><th>Avg</th><th>Best</th><th>Bonuses</th><th>War</th><th>Overseas</th><th>Assists</th><th>Losses</th></tr></thead><tbody>${body || `<tr><td colspan="11" class="tfc-muted">No attackers recorded.</td></tr>`}</tbody></table></div>${passive.length ? `<div class="tfc-muted" style="font-size:9px;margin-top:6px">Non-attackers (${non.size}): ${escapeHtml(passive.join(', '))}${non.size>20?'…':''}</div>`:''}`;
    }

    function renderRecentChains() {
        const rows = state.chainRecent || [];
        if (!rows.length) return `<div class="tfc-muted" style="font-size:10px">No completed chains loaded yet.</div>`;
        return `<div style="overflow:auto"><table class="tfc-table"><thead><tr><th>Chain</th><th>Hits</th><th>Respect</th><th>Started</th><th>Ended</th><th></th></tr></thead><tbody>${rows.map(c=>`<tr class="tfc-chain-history-row"><td>#${c.id}</td><td>${fmtNumber(c.chain)}</td><td>${Number(c.respect||0).toFixed(2)}</td><td>${fmtDateTime(c.start)}</td><td>${fmtDateTime(c.end)}</td><td><button class="tfc-btn" data-chain-report="${c.id}">${state.chainReports[String(c.id)]?'Open':'Load report'}</button></td></tr>`).join('')}</tbody></table></div>`;
    }

    function renderChain() {
        const c = state.chain;
        const liveReport = state.chainReport;
        const report = selectedChainReport();
        const details = liveReport?.details || {};
        const coverage = chainCoverageSummary();
        const timeout = Number(c?.timeout || 0);
        const current = Number(c?.current || details.chain || 0);
        const max = Number(c?.max || 0);
        const progress = max > 0 ? Math.min(100, current/max*100) : 0;
        const isLive = !!c?.id && !Number(c?.end || 0) && !Number(c?.cooldown || 0);
        const inCooldown = Number(c?.cooldown || 0) > nowSec();
        const timeoutClass = chainTimeoutClass(timeout);
        const attackers = chainReportRows(liveReport);
        const activeContributors = attackers.filter(r=>r.attacks>0).length;
        const gapLabel = coverage.nextGap ? fmtUtcDateTime(coverage.nextGap.t) : 'None in window';
        const bonusCount = Array.isArray(liveReport?.bonuses) ? liveReport.bonuses.length : 0;
        return `
            <div class="tfc-toolbar">
                <button class="tfc-btn primary" data-action="refresh-chain" ${state.chainLoading?'disabled':''}>${state.chainLoading?'Refreshing…':'Refresh Chain'}</button>
                <span class="tfc-muted" style="font-size:10px">${state.chainLastFetchedAt ? `Updated ${fmtDuration(Math.floor((Date.now()-state.chainLastFetchedAt)/1000))} ago` : 'Not refreshed yet'} · auto ${Number(state.config.chainAutoRefreshSeconds||0)?`${state.config.chainAutoRefreshSeconds}s`:'off'}</span>
            </div>
            <div class="tfc-chain-layout">
                <div>
                    <div class="tfc-chain-hero">
                        <div class="tfc-kicker">${isLive?'LIVE CHAIN':inCooldown?'CHAIN COOLDOWN':'CHAIN STATUS'}</div>
                        <div style="display:flex;justify-content:space-between;gap:12px;align-items:end;margin-top:6px">
                            <div><div style="font-size:34px;font-weight:900;color:#fff;line-height:1">${fmtNumber(current)}</div><div class="tfc-muted" style="font-size:10px;margin-top:4px">current hits${max?` · API max ${fmtNumber(max)}`:''}</div></div>
                            <div style="text-align:right"><div class="tfc-chain-timeout ${timeoutClass}" data-chain-timeout>${isLive?fmtDuration(timeout):inCooldown?fmtDuration(Number(c.cooldown)-nowSec()):'-'}</div><div class="tfc-muted" style="font-size:10px;margin-top:4px">${isLive?'until chain breaks':inCooldown?'cooldown remaining':'no live timer'}</div></div>
                        </div>
                        ${max?`<div class="tfc-chain-progress"><span style="width:${progress.toFixed(1)}%"></span></div>`:''}
                    </div>
                    <div class="tfc-chain-summary" style="margin-top:10px">
                        ${detailMetric('Respect', Number(details.respect||0).toFixed(2), 'latest/live report')}
                        ${detailMetric('Contributors', fmtNumber(activeContributors), `${fmtNumber(details.members||0)} report members`)}
                        ${detailMetric('Targets', fmtNumber(details.targets||0), 'unique targets')}
                        ${detailMetric('Bonus hits', fmtNumber(bonusCount), `${fmtNumber(details.best||0)} best respect`)}
                        ${detailMetric('Coverage now', fmtNumber(coverage.current), `${coverage.gaps} uncovered of next ${state.config.chainCoverageHours}h`)}
                        ${detailMetric('Next gap', gapLabel, 'TCT / UTC')}
                    </div>
                </div>
                <div class="tfc-card">
                    <div class="tfc-kicker">Chain health</div>
                    <div style="margin-top:8px;font-size:10px;line-height:1.55">
                        ${isLive && timeout <= Number(state.config.chainDangerSeconds||120) ? `<div class="tfc-alert"><strong class="tfc-bad">CHAIN DANGER</strong><span>${fmtDuration(timeout)} remaining. A qualifying hit is urgently needed.</span></div>` : ''}
                        ${isLive && timeout > Number(state.config.chainDangerSeconds||120) && timeout <= Number(state.config.chainWarningSeconds||240) ? `<div class="tfc-alert"><strong class="tfc-warn">Timer warning</strong><span>${fmtDuration(timeout)} remaining on the live chain.</span></div>` : ''}
                        ${coverage.current===0 ? `<div class="tfc-alert"><strong class="tfc-warn">No planned coverage now</strong><span>The current TCT hour has no local coverage assignment.</span></div>` : `<div class="tfc-alert"><strong class="tfc-good">${coverage.current} assigned now</strong><span>Current TCT hour has planned chain coverage.</span></div>`}
                        <div class="tfc-muted" style="margin-top:8px">Coverage assignments are leadership-local in v0.7. A later shared backend can let members claim their own slots from Torn/Discord.</div>
                    </div>
                </div>
            </div>

            <div class="tfc-section" style="margin-top:12px">
                <div class="tfc-section-head"><div><h3>24-hour coverage</h3><span class="tfc-muted" style="font-size:10px">TCT / UTC hourly view · gaps are red</span></div></div>
                ${renderCoverageGrid()}
                <div class="tfc-chain-plan-grid" style="margin-top:10px">
                    <div><label>Member</label><select class="tfc-select" data-chain-plan="member"><option value="">Choose member</option>${state.roster.slice().sort((a,b)=>String(a.name).localeCompare(String(b.name))).map(m=>`<option value="${m.id}">${escapeHtml(m.name)} [${m.id}]</option>`).join('')}</select></div>
                    <div><label>TCT date</label><input class="tfc-input" type="date" data-chain-plan="date" value="${defaultChainPlanDate()}"></div>
                    <div><label>Start hour</label><select class="tfc-select" data-chain-plan="hour">${Array.from({length:24},(_,h)=>`<option value="${h}">${String(h).padStart(2,'0')}:00</option>`).join('')}</select></div>
                    <div><label>Duration</label><select class="tfc-select" data-chain-plan="duration">${[1,2,3,4,6,8,12].map(h=>`<option value="${h}">${h}h</option>`).join('')}</select></div>
                    <div><label>Hit goal</label><input class="tfc-input" type="number" min="0" step="1" data-chain-plan="hits" value="0"></div>
                    <div><label>Note</label><input class="tfc-input" data-chain-plan="note" placeholder="e.g. primary cover / backup"></div>
                    <button class="tfc-btn primary" data-action="add-chain-assignment">Add</button>
                </div>
                <div style="margin-top:8px">${renderChainAssignments(liveReport)}</div>
            </div>

            <div class="tfc-section" style="margin-top:12px">
                <div class="tfc-section-head"><div><h3>${report?.id ? `Chain report #${escapeHtml(report.id)}` : 'Chain contribution'}</h3><span class="tfc-muted" style="font-size:10px">Exact public chain-report totals · ${report?.start?`${fmtDateTime(report.start)} → ${report.end?fmtDateTime(report.end):'ongoing'}`:'refresh to load'}</span></div></div>
                ${renderChainContributionTable(report)}
            </div>

            <div class="tfc-section" style="margin-top:12px">
                <div class="tfc-section-head"><div><h3>Recent completed chains</h3><span class="tfc-muted" style="font-size:10px">Open a report to inspect member totals after the chain has ended.</span></div></div>
                ${renderRecentChains()}
            </div>`;
    }

    function updateChainCountdowns() {
        if (!state.open || state.activeTab !== 'chain') return;
        const el = $('[data-chain-timeout]', $('#tfc-panel'));
        if (!el || !state.chain) return;
        const isLive = !!state.chain.id && !Number(state.chain.end||0) && !Number(state.chain.cooldown||0);
        if (isLive) {
            const age = Math.floor((Date.now()-Number(state.chainLastFetchedAt||Date.now()))/1000);
            const remaining = Math.max(0, Number(state.chain.timeout||0)-age);
            el.textContent = fmtDuration(remaining);
            el.classList.remove('warn','danger');
            const cls = chainTimeoutClass(remaining); if (cls) el.classList.add(cls);
        } else if (Number(state.chain.cooldown||0)>nowSec()) {
            el.textContent = fmtDuration(Number(state.chain.cooldown)-nowSec());
        }
    }


    function ocMemberName(id) {
        const m = state.roster.find(x => String(x.id) === String(id));
        return m?.name || `User ${id}`;
    }

    function ocCatalogCrime(name) {
        return state.ocCatalog.find(c => String(c.name || '').toLowerCase() === String(name || '').toLowerCase()) || null;
    }

    function ocCatalogItemName(crime, slot) {
        const itemId = Number(slot?.item_requirement?.id || 0);
        if (!itemId) return '';
        const cat = ocCatalogCrime(crime?.name);
        const posId = String(slot?.position_info?.id ?? '');
        const label = String(slot?.position_info?.label || slot?.position || '');
        const found = (cat?.slots || []).find(s => String(s?.position_info?.id ?? '') === posId)
            || (cat?.slots || []).find(s => String(s?.position_info?.label || s?.name || '') === label)
            || (cat?.slots || []).find(s => Number(s?.required_item?.id || 0) === itemId);
        return found?.required_item?.name || `Item #${itemId}`;
    }

    function ocStatusClass(status) {
        const s = String(status || '').toLowerCase();
        if (s === 'successful') return 'tfc-good';
        if (s === 'failure' || s === 'expired') return 'tfc-bad';
        if (s === 'planning') return 'tfc-warn';
        return '';
    }

    function ocCurrentAssignments() {
        const map = new Map();
        for (const crime of state.ocCrimes || []) {
            for (const slot of crime.slots || []) {
                if (!slot?.user?.id) continue;
                map.set(String(slot.user.id), { crime, slot });
            }
        }
        return map;
    }

    function compactOcCrime(crime) {
        return {
            id: crime.id,
            name: crime.name,
            difficulty: crime.difficulty,
            status: crime.status,
            created_at: crime.created_at || 0,
            ready_at: crime.ready_at || null,
            expired_at: crime.expired_at || 0,
            executed_at: crime.executed_at || null,
            rewards: crime.rewards ? {
                money: Number(crime.rewards.money || 0),
                respect: Number(crime.rewards.respect || 0),
                items: Array.isArray(crime.rewards.items) ? crime.rewards.items.map(i => ({ id: i.id, quantity: i.quantity })) : [],
                payout: crime.rewards.payout ? { ...crime.rewards.payout } : null,
            } : null,
            slots: (crime.slots || []).map(slot => ({
                position: slot.position || '',
                position_info: slot.position_info ? { id: slot.position_info.id, label: slot.position_info.label, number: slot.position_info.number } : null,
                checkpoint_pass_rate: Number(slot.checkpoint_pass_rate || 0),
                item_requirement: slot.item_requirement ? { ...slot.item_requirement } : null,
                user: slot.user ? {
                    id: slot.user.id,
                    outcome: slot.user.outcome ?? null,
                    outcome_duration: slot.user.outcome_duration ?? null,
                    joined_at: slot.user.joined_at || 0,
                    progress: Number(slot.user.progress || 0),
                    item_outcome: slot.user.item_outcome ? { ...slot.user.item_outcome } : null,
                } : null,
            })),
        };
    }

    async function mergeOcHistory(completed) {
        const byId = new Map((state.ocHistory || []).map(c => [String(c.id), c]));
        for (const crime of completed || []) byId.set(String(crime.id), compactOcCrime(crime));
        state.ocHistory = [...byId.values()]
            .sort((a,b) => Number(b.executed_at || b.expired_at || b.created_at || 0) - Number(a.executed_at || a.expired_at || a.created_at || 0))
            .slice(0, Number(state.config.ocHistoryLimit || 250));
        await Store.set('ocHistory', state.ocHistory);
    }

    async function observeOcRoles(crimes) {
        const now = nowSec();
        let changed = false;
        for (const crime of crimes || []) {
            for (const slot of crime.slots || []) {
                const uid = slot?.user?.id;
                const cpr = Number(slot?.checkpoint_pass_rate || 0);
                if (!uid || cpr <= 0) continue;
                const roleId = String(slot?.position_info?.id ?? slot?.position_info?.label ?? slot?.position ?? 'unknown');
                const member = state.ocRoleHistory[String(uid)] || {};
                const rec = member[roleId] || { samples: 0, sum: 0, max: 0, latest: 0, label: slot?.position_info?.label || slot?.position || roleId, lastSeen: 0, crimes: {} };
                const sampleKey = `${crime.id}:${roleId}`;
                rec.crimes = rec.crimes || {};
                if (!rec.crimes[sampleKey]) {
                    rec.samples = Number(rec.samples || 0) + 1;
                    rec.sum = Number(rec.sum || 0) + cpr;
                    rec.crimes[sampleKey] = cpr;
                    const keys = Object.keys(rec.crimes);
                    if (keys.length > 30) for (const k of keys.slice(0, keys.length - 30)) delete rec.crimes[k];
                }
                rec.max = Math.max(Number(rec.max || 0), cpr);
                rec.latest = cpr;
                rec.label = slot?.position_info?.label || slot?.position || rec.label || roleId;
                rec.lastSeen = now;
                member[roleId] = rec;
                state.ocRoleHistory[String(uid)] = member;
                changed = true;
            }
        }
        if (changed) await Store.set('ocRoleHistory', state.ocRoleHistory);
    }

    function ocKnownRoles(userId) {
        const roles = Object.values(state.ocRoleHistory[String(userId)] || {});
        return roles.sort((a,b) => Number(b.latest || b.max || 0) - Number(a.latest || a.max || 0));
    }

    function ocMemberPerformance(userId) {
        let crimes = 0, success = 0, failed = 0, jailed = 0, hospitalized = 0, injured = 0;
        let totalCpr = 0, cprSamples = 0, lastAt = 0;
        for (const crime of state.ocHistory || []) {
            const slots = (crime.slots || []).filter(s => String(s?.user?.id) === String(userId));
            if (!slots.length) continue;
            crimes++;
            lastAt = Math.max(lastAt, Number(crime.executed_at || 0));
            for (const slot of slots) {
                const outcome = String(slot?.user?.outcome || '').toLowerCase();
                if (outcome === 'successful') success++;
                else if (outcome === 'failed') failed++;
                else if (outcome === 'jailed') jailed++;
                else if (outcome === 'hospitalized') hospitalized++;
                else if (outcome === 'injured') injured++;
                const cpr = Number(slot?.checkpoint_pass_rate || 0);
                if (cpr > 0) { totalCpr += cpr; cprSamples++; }
            }
        }
        return { crimes, success, failed, jailed, hospitalized, injured, avgCpr: cprSamples ? totalCpr/cprSamples : 0, lastAt };
    }

    function ocCrimeStats(crime) {
        const slots = crime?.slots || [];
        const filled = slots.filter(s => s?.user?.id).length;
        const empty = slots.length - filled;
        const assigned = slots.filter(s => s?.user?.id);
        const missing = assigned.filter(s => s?.item_requirement && s.item_requirement.is_available === false).length;
        const cprs = assigned.map(s => Number(s.checkpoint_pass_rate || 0)).filter(v => v > 0);
        const minCpr = cprs.length ? Math.min(...cprs) : 0;
        const progress = assigned.length ? assigned.reduce((sum,s)=>sum+Number(s?.user?.progress || 0),0)/assigned.length : 0;
        return { filled, empty, missing, minCpr, progress };
    }

    function ocTimeLabel(crime) {
        const now = nowSec();
        const status = String(crime?.status || '').toLowerCase();
        if (status === 'planning' && Number(crime.ready_at || 0)) {
            const diff = Number(crime.ready_at) - now;
            return diff > 0 ? `Ready in ${fmtDuration(diff)}` : 'Ready now';
        }
        if (status === 'recruiting' && Number(crime.expired_at || 0)) {
            const diff = Number(crime.expired_at) - now;
            return diff > 0 ? `Expires in ${fmtDuration(diff)}` : 'Expired';
        }
        if (Number(crime.executed_at || 0)) return fmtDateTime(crime.executed_at);
        return '';
    }

    async function refreshOC(force = false, silent = false) {
        if (state.ocLoading) return;
        state.ocLoading = true;
        state.ocError = '';
        if (!silent) render();
        try {
            const ttl = Number(state.config.ocAutoRefreshSeconds || 60) * 1000;
            const tasks = await Promise.allSettled([
                api('/faction/crimes', { cat: 'available', limit: 100, sort: 'DESC' }, { ttl, force }),
                api('/faction/crimes', { cat: 'completed', limit: 100, sort: 'DESC' }, { ttl: Math.max(ttl, 5*60*1000), force }),
                api('/faction/crimeexp', {}, { ttl: 30*60*1000, force }),
                api('/torn/organizedcrimes', {}, { ttl: 24*60*60*1000, force: false }),
            ]);
            const [activeR, completedR, expR, catalogR] = tasks;
            if (activeR.status === 'fulfilled') state.ocCrimes = Array.isArray(activeR.value?.crimes) ? activeR.value.crimes : [];
            else state.ocError = activeR.reason?.message || 'Unable to load organized crimes';
            if (completedR.status === 'fulfilled') {
                state.ocCompleted = Array.isArray(completedR.value?.crimes) ? completedR.value.crimes : [];
                await mergeOcHistory(state.ocCompleted);
            }
            if (expR.status === 'fulfilled') state.ocCrimeExp = Array.isArray(expR.value?.crimeexp) ? expR.value.crimeexp : [];
            if (catalogR.status === 'fulfilled') state.ocCatalog = Array.isArray(catalogR.value?.organizedcrimes) ? catalogR.value.organizedcrimes : [];
            await observeOcRoles([...(state.ocCrimes || []), ...(state.ocCompleted || [])]);
            state.ocLastFetchedAt = Date.now();
            if (force && !silent && !state.ocError) toast(`OC Command refreshed · ${state.ocCrimes.length} active crimes`);
            if (force && state.ocError) toast(`OC refresh partial: ${state.ocError}`, 'error');
        } catch (err) {
            state.ocError = err.message || String(err);
            if (!silent) toast(`OC refresh failed: ${state.ocError}`, 'error');
        } finally {
            state.ocLoading = false;
            if (state.open) render();
        }
    }

    function renderOcSlot(crime, slot) {
        const user = slot?.user;
        const label = slot?.position_info?.label || slot?.position || 'Role';
        const cpr = Number(slot?.checkpoint_pass_rate || 0);
        const item = slot?.item_requirement;
        const itemName = item ? ocCatalogItemName(crime, slot) : '';
        const low = user && cpr > 0 && cpr < Number(state.config.ocLowCprThreshold || 70);
        const missing = user && item && item.is_available === false;
        const progress = Number(user?.progress || 0);
        return `<tr>
            <td><strong>${escapeHtml(label)}</strong></td>
            <td>${user ? `<a href="https://www.torn.com/profiles.php?XID=${user.id}" target="_blank" rel="noopener">${escapeHtml(ocMemberName(user.id))}</a>` : '<span class="tfc-warn">Empty</span>'}</td>
            <td class="${low?'tfc-warn':''}">${user && cpr ? `${fmtNumber(cpr)}%` : '-'}</td>
            <td>${user ? `${Math.round(progress)}%` : '-'}</td>
            <td>${item ? `${escapeHtml(itemName)}${item.is_reusable?' · reusable':''}${missing?' · <span class="tfc-bad">MISSING</span>':''}` : '-'}</td>
            <td>${user?.outcome ? `<span class="${String(user.outcome).toLowerCase()==='successful'?'tfc-good':'tfc-bad'}">${escapeHtml(user.outcome)}</span>` : '-'}</td>
        </tr>`;
    }

    function renderOcCrimeCard(crime) {
        const st = ocCrimeStats(crime);
        const expanded = String(state.expandedCrimeId) === String(crime.id);
        const status = String(crime.status || '');
        const reward = crime.rewards;
        const rewardText = reward ? `${fmtMoney(reward.money || 0)} · ${fmtNumber(reward.respect || 0)} respect${reward.items?.length ? ` · ${reward.items.length} item reward${reward.items.length===1?'':'s'}` : ''}` : '';
        return `<div class="tfc-card" style="margin-bottom:8px">
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap">
                <div>
                    <div class="tfc-kicker">Difficulty ${fmtNumber(crime.difficulty)} · Crime #${escapeHtml(crime.id)}</div>
                    <div style="font-size:15px;font-weight:800;color:#fff;margin-top:3px">${escapeHtml(crime.name)}</div>
                    <div style="font-size:10px;margin-top:4px"><span class="${ocStatusClass(status)}"><strong>${escapeHtml(status)}</strong></span> · ${escapeHtml(ocTimeLabel(crime))}</div>
                </div>
                <button class="tfc-btn" data-oc-toggle="${escapeHtml(crime.id)}">${expanded?'Hide':'Details'}</button>
            </div>
            <div class="tfc-chain-summary" style="margin-top:9px">
                ${detailMetric('Slots', `${st.filled}/${(crime.slots||[]).length}`, st.empty?`${st.empty} empty`:'full')}
                ${detailMetric('Planning', `${Math.round(st.progress)}%`, 'average slot progress')}
                ${detailMetric('Lowest CPR', st.minCpr?`${fmtNumber(st.minCpr)}%`:'-', st.minCpr && st.minCpr < Number(state.config.ocLowCprThreshold||70)?'below alert threshold':'assigned slots')}
                ${detailMetric('Missing items', fmtNumber(st.missing), st.missing?'needs attention':'assigned users ready')}
            </div>
            ${rewardText ? `<div class="tfc-muted" style="font-size:10px;margin-top:8px">Reward: ${escapeHtml(rewardText)}</div>` : ''}
            ${expanded ? `<div class="tfc-table-wrap" style="margin-top:10px"><table class="tfc-table"><thead><tr><th>Role</th><th>Member</th><th>CPR</th><th>Progress</th><th>Required item</th><th>Outcome</th></tr></thead><tbody>${(crime.slots||[]).map(slot=>renderOcSlot(crime,slot)).join('')}</tbody></table></div>` : ''}
        </div>`;
    }

    function ocFilteredCrimes() {
        const active = state.ocCrimes || [];
        const historical = state.ocHistory || [];
        if (state.ocFilter === 'active') return active;
        if (state.ocFilter === 'recruiting') return active.filter(c => String(c.status).toLowerCase()==='recruiting');
        if (state.ocFilter === 'planning') return active.filter(c => String(c.status).toLowerCase()==='planning');
        if (state.ocFilter === 'successful') return historical.filter(c => String(c.status).toLowerCase()==='successful');
        if (state.ocFilter === 'failure') return historical.filter(c => String(c.status).toLowerCase()==='failure');
        return [...active, ...historical].sort((a,b)=>Number(b.executed_at||b.ready_at||b.created_at||0)-Number(a.executed_at||a.ready_at||a.created_at||0));
    }

    function renderOcMembers() {
        const assignments = ocCurrentAssignments();
        const expRank = new Map((state.ocCrimeExp || []).map((id,i)=>[String(id), i+1]));
        let members = state.roster.slice();
        if (state.ocMemberFilter === 'unassigned') members = members.filter(m => !m.is_in_oc && !assignments.has(String(m.id)));
        else if (state.ocMemberFilter === 'assigned') members = members.filter(m => m.is_in_oc || assignments.has(String(m.id)));
        members.sort((a,b) => {
            const aa = assignments.has(String(a.id)) || a.is_in_oc;
            const bb = assignments.has(String(b.id)) || b.is_in_oc;
            if (aa !== bb) return aa ? 1 : -1;
            return String(a.name).localeCompare(String(b.name));
        });
        return `<div class="tfc-table-wrap"><table class="tfc-table"><thead><tr><th>Member</th><th>Current OC</th><th>Role</th><th>CPR</th><th>Progress</th><th>CE rank</th><th>Recent history</th><th>Known role CPR</th></tr></thead><tbody>${members.map(m=>{
            const cur = assignments.get(String(m.id));
            const perf = ocMemberPerformance(m.id);
            const roles = ocKnownRoles(m.id).slice(0,3);
            const cpr = Number(cur?.slot?.checkpoint_pass_rate || 0);
            const progress = Number(cur?.slot?.user?.progress || 0);
            const outcomes = perf.crimes ? `${perf.success} success · ${perf.failed + perf.jailed + perf.hospitalized + perf.injured} adverse` : '-';
            return `<tr>
                <td><a href="https://www.torn.com/profiles.php?XID=${m.id}" target="_blank" rel="noopener"><strong>${escapeHtml(m.name)}</strong></a></td>
                <td>${cur ? `${escapeHtml(cur.crime.name)} · D${fmtNumber(cur.crime.difficulty)}` : (m.is_in_oc ? 'In OC' : '<span class="tfc-warn">Unassigned</span>')}</td>
                <td>${cur ? escapeHtml(cur.slot?.position_info?.label || cur.slot?.position || '-') : '-'}</td>
                <td class="${cpr && cpr<Number(state.config.ocLowCprThreshold||70)?'tfc-warn':''}">${cpr?`${fmtNumber(cpr)}%`:'-'}</td>
                <td>${cur?`${Math.round(progress)}%`:'-'}</td>
                <td>${expRank.get(String(m.id)) ? `#${expRank.get(String(m.id))}` : '-'}</td>
                <td>${escapeHtml(outcomes)}</td>
                <td>${roles.length ? roles.map(r=>`${escapeHtml(r.label)} ${fmtNumber(r.latest||r.max)}%`).join('<br>') : '<span class="tfc-muted">Learning</span>'}</td>
            </tr>`;
        }).join('')}</tbody></table></div>`;
    }

    function renderOC() {
        if (state.ocLoading && !state.ocCrimes.length && !state.ocHistory.length) return `<div class="tfc-empty"><div><strong>Loading OC Command…</strong>Reading available crimes, recent completed crimes, crime experience order, and OC definitions.</div></div>`;
        if (state.ocError && !state.ocCrimes.length) {
            return `<div class="tfc-section"><div class="tfc-alert"><strong class="tfc-bad">OC access unavailable</strong><span>${escapeHtml(state.ocError)}</span></div><div class="tfc-card" style="margin-top:10px"><div class="tfc-kicker">Permission required</div><div class="tfc-muted" style="font-size:10px;line-height:1.5;margin-top:5px">Faction OC data requires at least a Minimal/Custom/Limited key with Faction API Access. Your existing Public-key modules continue to work normally.</div><button class="tfc-btn primary" style="margin-top:10px" data-action="refresh-oc">Retry OC Command</button></div></div>`;
        }
        const assignments = ocCurrentAssignments();
        const active = state.ocCrimes || [];
        const recruiting = active.filter(c=>String(c.status).toLowerCase()==='recruiting');
        const planning = active.filter(c=>String(c.status).toLowerCase()==='planning');
        const emptySlots = active.reduce((n,c)=>n+ocCrimeStats(c).empty,0);
        const missingItems = active.reduce((n,c)=>n+ocCrimeStats(c).missing,0);
        const unassigned = state.roster.filter(m => !m.is_in_oc && !assignments.has(String(m.id))).length;
        const lowCprSlots = active.reduce((n,c)=>n+(c.slots||[]).filter(s=>s?.user?.id && Number(s.checkpoint_pass_rate||0)>0 && Number(s.checkpoint_pass_rate)<Number(state.config.ocLowCprThreshold||70)).length,0);
        const crimes = ocFilteredCrimes();
        const age = state.ocLastFetchedAt ? fmtDuration(Math.max(0,(Date.now()-state.ocLastFetchedAt)/1000)) : '-';
        return `<div class="tfc-grid">
            ${statCard('Active OCs', active.length, `${recruiting.length} recruiting · ${planning.length} planning`)}
            ${statCard('Empty slots', emptySlots, 'across active crimes')}
            ${statCard('Unassigned', unassigned, `${state.roster.length} roster members`)}
            ${statCard('Missing items', missingItems, 'assigned-slot requirements')}
            ${statCard(`CPR < ${state.config.ocLowCprThreshold}%`, lowCprSlots, 'your alert threshold')}
            ${statCard('OC history', state.ocHistory.length, `bounded to ${state.config.ocHistoryLimit}`)}
        </div>

        <div class="tfc-section">
            <div class="tfc-section-head"><div><h3>OC Command</h3><span class="tfc-muted" style="font-size:10px">Last refresh ${escapeHtml(age)} ago · assigned CPR is exact · empty-slot CPR is not inferred</span></div><button class="tfc-btn primary" data-action="refresh-oc" ${state.ocLoading?'disabled':''}>${state.ocLoading?'Refreshing…':'Refresh OC'}</button></div>
            ${state.ocError ? `<div class="tfc-alert" style="margin-bottom:9px"><strong class="tfc-warn">Partial refresh</strong><span>${escapeHtml(state.ocError)}</span></div>` : ''}
            <div class="tfc-toolbar" style="margin-bottom:9px">
                <label class="tfc-muted" style="font-size:10px">Crimes</label>
                <select class="tfc-select" data-role="oc-filter"><option value="active" ${state.ocFilter==='active'?'selected':''}>Active</option><option value="recruiting" ${state.ocFilter==='recruiting'?'selected':''}>Recruiting</option><option value="planning" ${state.ocFilter==='planning'?'selected':''}>Planning</option><option value="successful" ${state.ocFilter==='successful'?'selected':''}>Successful history</option><option value="failure" ${state.ocFilter==='failure'?'selected':''}>Failed history</option><option value="all" ${state.ocFilter==='all'?'selected':''}>All tracked</option></select>
            </div>
            ${crimes.length ? crimes.map(renderOcCrimeCard).join('') : `<div class="tfc-empty"><div><strong>No crimes in this view</strong>Try another status filter or refresh.</div></div>`}
        </div>

        <div class="tfc-section" style="margin-top:12px">
            <div class="tfc-section-head"><div><h3>Member OC matrix</h3><span class="tfc-muted" style="font-size:10px">Current assignment + CE rank + retained observed role CPR</span></div><select class="tfc-select" data-role="oc-member-filter"><option value="all" ${state.ocMemberFilter==='all'?'selected':''}>All members</option><option value="unassigned" ${state.ocMemberFilter==='unassigned'?'selected':''}>Unassigned only</option><option value="assigned" ${state.ocMemberFilter==='assigned'?'selected':''}>Assigned only</option></select></div>
            ${renderOcMembers()}
            <div class="tfc-card" style="margin-top:9px"><div class="tfc-kicker">Role-fit learning</div><div class="tfc-muted" style="font-size:10px;line-height:1.5;margin-top:5px">Torn exposes the joined member's CPR for occupied slots, but not every faction member's CPR for every empty slot. TFC records observed member/role CPR whenever it sees an assignment, so the Known role CPR column becomes more useful over time without fabricating unavailable data.</div></div>
        </div>`;
    }

    const RECRUIT_STAGES = ['New','Contacted','Interested','Trial','Accepted','Rejected','Watchlist'];

    function recruitDefaultStage(appStatus = '') {
        const s = String(appStatus || '').toLowerCase();
        if (s === 'accepted') return 'Accepted';
        if (s === 'declined') return 'Rejected';
        if (s === 'withdrawn') return 'Watchlist';
        return 'New';
    }

    function recruitApplicationUser(app) {
        return app?.user || app?.player || {};
    }

    function recruitAppSnapshot(app) {
        const user = recruitApplicationUser(app);
        return {
            id: Number(app?.id || 0),
            status: String(app?.status || ''),
            valid_until: Number(app?.valid_until || 0),
            message: app?.message ?? null,
            seenAt: nowSec(),
            level: Number(user?.level || 0),
            stats: user?.stats ? {
                strength: Number(user.stats.strength || 0),
                defense: Number(user.stats.defense || 0),
                speed: Number(user.stats.speed || 0),
                dexterity: Number(user.stats.dexterity || 0),
            } : null,
        };
    }

    function recruitCandidateIdFromApp(app) {
        const user = recruitApplicationUser(app);
        return Number(user?.id || user?.player_id || 0);
    }

    function recruitCompactProfile(data) {
        const p = data?.profile || data?.user || data?.basic || data || {};
        const faction = p?.faction || {};
        return {
            id: Number(p?.player_id || p?.id || 0),
            name: p?.name || '',
            level: Number(p?.level || 0),
            age: Number(p?.age || 0),
            rank: p?.rank || '',
            signup: p?.signup || '',
            last_action: p?.last_action ? {
                status: p.last_action.status || '',
                relative: p.last_action.relative || '',
                timestamp: Number(p.last_action.timestamp || 0),
            } : null,
            status: p?.status ? {
                state: p.status.state || '',
                description: p.status.description || '',
                details: p.status.details || '',
                until: Number(p.status.until || 0),
            } : null,
            faction: faction && (faction.faction_id || faction.id || faction.faction_name || faction.name) ? {
                id: Number(faction.faction_id || faction.id || 0),
                name: faction.faction_name || faction.name || '',
                tag: faction.faction_tag || faction.tag || '',
                position: faction.position || '',
                days: Number(faction.days_in_faction || faction.days || 0),
            } : null,
        };
    }

    function recruitProfileFromCandidate(c) {
        return c?.intel?.profile || null;
    }

    function recruitIsMember(id) {
        return state.roster.some(m => String(m.id) === String(id));
    }

    function recruitIsActiveApp(c) {
        return !!c?.activeApplication && String(c?.application?.status || '').toLowerCase() === 'active';
    }

    function recruitRepeatCount(c) {
        const ids = new Set((c?.applicationHistory || []).map(a => String(a.id || '')).filter(Boolean));
        return ids.size;
    }

    function recruitPruneCandidates() {
        const limit = Math.max(100, Number(state.config.recruitHistoryLimit || 1000));
        const entries = Object.entries(state.recruitCandidates || {});
        if (entries.length <= limit) return;
        entries.sort((a,b) => Number(b[1]?.updatedAt || b[1]?.lastSeen || 0) - Number(a[1]?.updatedAt || a[1]?.lastSeen || 0));
        const active = entries.filter(([,c]) => c?.activeApplication);
        const activeIds = new Set(active.map(([id]) => id));
        const rest = entries.filter(([id]) => !activeIds.has(id));
        const keep = [...active, ...rest].slice(0, Math.max(limit, active.length));
        state.recruitCandidates = Object.fromEntries(keep);
    }

    async function saveRecruitCandidates() {
        recruitPruneCandidates();
        await Store.set('recruitCandidates', state.recruitCandidates);
    }

    async function mergeRecruitApplications(applications) {
        const now = nowSec();
        const seen = new Set();
        for (const app of applications || []) {
            const id = recruitCandidateIdFromApp(app);
            if (!id) continue;
            const sid = String(id);
            seen.add(sid);
            const user = recruitApplicationUser(app);
            const existing = state.recruitCandidates[sid] || {};
            const snap = recruitAppSnapshot(app);
            const history = Array.isArray(existing.applicationHistory) ? [...existing.applicationHistory] : [];
            const idx = history.findIndex(x => String(x.id) === String(snap.id));
            if (idx >= 0) history[idx] = { ...history[idx], ...snap, seenAt: history[idx].seenAt || snap.seenAt };
            else history.push(snap);
            history.sort((a,b)=>Number(b.seenAt||0)-Number(a.seenAt||0));
            const currentSnap = history.find(x => String(x.id) === String(snap.id)) || snap;
            state.recruitCandidates[sid] = {
                ...existing,
                id,
                name: user?.name || existing.name || `#${id}`,
                level: Number(user?.level || existing.level || 0),
                source: existing.source || 'application',
                firstSeen: Number(existing.firstSeen || now),
                lastSeen: now,
                updatedAt: now,
                activeApplication: String(app?.status || '').toLowerCase() === 'active',
                application: currentSnap,
                applicationHistory: history.slice(0, 10),
                pipelineStatus: existing.pipelineStatus || recruitDefaultStage(app?.status),
                stageHistory: Array.isArray(existing.stageHistory) ? existing.stageHistory : [],
                notes: existing.notes || '',
                referrer: existing.referrer || '',
                referralAmount: Number(existing.referralAmount ?? state.config.recruitReferralDefaultAmount ?? 0),
                referralPaid: !!existing.referralPaid,
            };
        }
        for (const [sid,c] of Object.entries(state.recruitCandidates || {})) {
            if (c?.activeApplication && !seen.has(sid)) {
                c.activeApplication = false;
                c.updatedAt = now;
            }
        }
        await saveRecruitCandidates();
    }

    async function refreshRecruit(force = false, silent = false) {
        if (state.recruitLoading) return;
        state.recruitLoading = true;
        state.recruitError = '';
        if (!silent) render();
        try {
            const data = await api('/faction/applications', {}, { ttl: 60*1000, force });
            const apps = Array.isArray(data?.applications) ? data.applications : [];
            state.recruitApplications = apps;
            await mergeRecruitApplications(apps);
            state.recruitLastFetchedAt = Date.now();
            if (force && !silent) toast(`Recruitment refreshed · ${apps.filter(a=>String(a.status).toLowerCase()==='active').length} active applications`);
        } catch (err) {
            state.recruitError = err.message || String(err);
            if (!silent) toast(`Recruitment refresh failed: ${state.recruitError}`, 'error');
        } finally {
            state.recruitLoading = false;
            if (state.open) render();
        }
    }

    function recruitCandidateIntelFresh(c) {
        const at = Number(c?.intel?.fetchedAt || 0);
        return at && Date.now() - at < Number(state.config.recruitIntelCacheHours || 24) * 3600 * 1000;
    }

    async function syncRecruitIntel(id, force = false) {
        const sid = String(id || '');
        const c = state.recruitCandidates[sid];
        if (!c || state.recruitSyncingId) return;
        if (!force && recruitCandidateIntelFresh(c)) { toast('Candidate intel is still cached'); return; }
        state.recruitSyncingId = sid;
        render();
        try {
            const [profileR, statsR] = await Promise.allSettled([
                api(`/user/${encodeURIComponent(sid)}/profile`, { striptags: 'true' }, { ttl: Number(state.config.recruitIntelCacheHours||24)*3600*1000, force }),
                api(`/user/${encodeURIComponent(sid)}/personalstats`, { cat: 'popular' }, { ttl: Number(state.config.recruitIntelCacheHours||24)*3600*1000, force }),
            ]);
            const intel = { ...(c.intel || {}), fetchedAt: Date.now(), error: '' };
            if (profileR.status === 'fulfilled') {
                intel.profile = recruitCompactProfile(profileR.value);
                if (intel.profile?.name) c.name = intel.profile.name;
                if (intel.profile?.level) c.level = intel.profile.level;
            }
            if (statsR.status === 'fulfilled') intel.stats = extractStats(statsR.value);
            if (profileR.status === 'rejected' && statsR.status === 'rejected') {
                intel.error = profileR.reason?.message || statsR.reason?.message || 'Unable to load public player intelligence';
                throw new Error(intel.error);
            }
            if (profileR.status === 'rejected') intel.profileError = profileR.reason?.message || 'Profile unavailable';
            if (statsR.status === 'rejected') intel.statsError = statsR.reason?.message || 'Personal stats unavailable';
            c.intel = intel;
            c.updatedAt = nowSec();
            await saveRecruitCandidates();
            toast(`Intel updated for ${c.name || `#${sid}`}`);
        } catch (err) {
            c.intel = { ...(c.intel||{}), fetchedAt: Date.now(), error: err.message || String(err) };
            await saveRecruitCandidates();
            toast(`Candidate intel failed: ${err.message}`, 'error');
        } finally {
            state.recruitSyncingId = null;
            render();
        }
    }

    async function addRecruitCandidateFromUi() {
        const input = $('[data-role="recruit-manual-id"]', $('#tfc-panel'));
        const id = Number(String(input?.value || '').replace(/\D+/g,''));
        if (!id) return toast('Enter a Torn user ID', 'error');
        const sid = String(id);
        const existing = state.recruitCandidates[sid] || {};
        state.recruitCandidates[sid] = {
            ...existing,
            id,
            name: existing.name || `#${id}`,
            source: existing.source || 'manual',
            firstSeen: Number(existing.firstSeen || nowSec()),
            lastSeen: Number(existing.lastSeen || nowSec()),
            updatedAt: nowSec(),
            activeApplication: !!existing.activeApplication,
            pipelineStatus: existing.pipelineStatus || 'Watchlist',
            stageHistory: Array.isArray(existing.stageHistory) ? existing.stageHistory : [],
            notes: existing.notes || '',
            referrer: existing.referrer || '',
            referralAmount: Number(existing.referralAmount ?? state.config.recruitReferralDefaultAmount ?? 0),
            referralPaid: !!existing.referralPaid,
            applicationHistory: Array.isArray(existing.applicationHistory) ? existing.applicationHistory : [],
        };
        state.recruitExpandedId = sid;
        await saveRecruitCandidates();
        await syncRecruitIntel(id, true);
    }

    function recruitStageClass(stage) {
        if (stage === 'Accepted') return 'tfc-good';
        if (stage === 'Rejected') return 'tfc-bad';
        if (stage === 'Interested' || stage === 'Trial') return 'tfc-good';
        if (stage === 'Watchlist') return 'tfc-warn';
        return '';
    }

    function recruitCurrentFactionLabel(c) {
        const f = recruitProfileFromCandidate(c)?.faction;
        if (!f?.id && !f?.name) return '-';
        return `${escapeHtml(f.name || `#${f.id}`)}${f.tag ? ` [${escapeHtml(f.tag)}]` : ''}`;
    }

    function recruitBattleStatsTotal(c) {
        const stats = c?.application?.stats;
        if (!stats) return null;
        return ['strength','defense','speed','dexterity'].reduce((sum,k)=>sum+Number(stats[k]||0),0);
    }

    function recruitRows() {
        const q = state.recruitSearch.trim().toLowerCase();
        let rows = Object.values(state.recruitCandidates || {});
        rows = rows.filter(c => {
            const stage = String(c.pipelineStatus || 'New');
            const f = state.recruitFilter;
            if (f === 'active' && !recruitIsActiveApp(c)) return false;
            if (f === 'unpaid' && !(c.referrer && !c.referralPaid)) return false;
            if (f === 'members' && !recruitIsMember(c.id)) return false;
            if (RECRUIT_STAGES.map(x=>x.toLowerCase()).includes(f) && stage.toLowerCase() !== f) return false;
            if (!q) return true;
            const hay = [c.name,c.id,c.pipelineStatus,c.notes,c.referrer,c.application?.message,recruitProfileFromCandidate(c)?.faction?.name].join(' ').toLowerCase();
            return hay.includes(q);
        });
        const stageOrder = { New:0, Contacted:1, Interested:2, Trial:3, Watchlist:4, Accepted:5, Rejected:6 };
        rows.sort((a,b) => {
            if (state.recruitSort === 'name') return String(a.name||'').localeCompare(String(b.name||''),undefined,{sensitivity:'base'});
            if (state.recruitSort === 'stage') return (stageOrder[a.pipelineStatus]??99)-(stageOrder[b.pipelineStatus]??99) || Number(b.updatedAt||0)-Number(a.updatedAt||0);
            if (state.recruitSort === 'level') return Number(b.level||0)-Number(a.level||0);
            if (state.recruitSort === 'xanax') return Number(b.intel?.stats?.xantaken||0)-Number(a.intel?.stats?.xantaken||0);
            if (state.recruitSort === 'rwhits') return Number(b.intel?.stats?.rankedwarhits||0)-Number(a.intel?.stats?.rankedwarhits||0);
            if (recruitIsActiveApp(a) !== recruitIsActiveApp(b)) return recruitIsActiveApp(a) ? -1 : 1;
            return Number(b.updatedAt || b.lastSeen || 0) - Number(a.updatedAt || a.lastSeen || 0);
        });
        return rows;
    }

    function recruitApplicationLabel(c) {
        if (!c?.application) return '<span class="tfc-muted">Manual</span>';
        const status = String(c.application.status || '').toLowerCase();
        const expiry = Number(c.application.valid_until || 0);
        const cls = `tfc-app-${status}`;
        const expiryText = expiry && status === 'active' ? ` · ${expiry > nowSec() ? `${fmtDuration(expiry-nowSec())} left` : 'expired'}` : '';
        return `<span class="${cls}"><strong>${escapeHtml(status || 'unknown')}</strong></span>${expiryText}`;
    }

    function renderRecruitDetail(c) {
        const p = recruitProfileFromCandidate(c);
        const stats = c?.intel?.stats || {};
        const app = c?.application || null;
        const bs = app?.stats || null;
        const bsTotal = recruitBattleStatsTotal(c);
        const repeat = recruitRepeatCount(c);
        const appTrackedAge = app?.seenAt ? fmtDuration(Math.max(0, nowSec()-Number(app.seenAt))) : '-';
        const intelAge = c?.intel?.fetchedAt ? fmtDuration(Math.max(0,(Date.now()-c.intel.fetchedAt)/1000)) : 'never';
        const lastAction = p?.last_action?.timestamp ? `${escapeHtml(p.last_action.status || '')} · ${fmtDuration(Math.max(0,nowSec()-p.last_action.timestamp))} ago` : '-';
        return `<tr><td colspan="10" style="padding:0"><div class="tfc-recruit-detail">
            <div class="tfc-section-head"><div><div class="tfc-kicker">Candidate dossier</div><h3 style="margin-top:4px">${escapeHtml(c.name || `#${c.id}`)} [${c.id}]</h3><span class="tfc-muted" style="font-size:9px">Intel ${escapeHtml(intelAge)} old${c?.intel?.error ? ` · ${escapeHtml(c.intel.error)}` : ''}</span></div><div class="tfc-toolbar"><a class="tfc-btn" href="https://www.torn.com/profiles.php?XID=${c.id}" target="_blank" rel="noopener">Profile</a><button class="tfc-btn primary" data-recruit-intel="${c.id}" ${String(state.recruitSyncingId)===String(c.id)?'disabled':''}>${String(state.recruitSyncingId)===String(c.id)?'Syncing…':'Refresh intel'}</button></div></div>
            <div class="tfc-recruit-detail-grid">
                ${statCard('Level', p?.level || c.level || '-', p?.rank || 'public profile')}
                ${statCard('Account age', p?.age ? `${fmtNumber(p.age)}d` : '-', p?.signup || '')}
                ${statCard('Last action', lastAction, p?.status?.description || p?.status?.state || '')}
                ${statCard('Current faction', p?.faction?.name || '-', p?.faction?.position || (p?.faction?.days ? `${p.faction.days}d tenure` : ''))}
                ${statCard('Xanax', stats.xantaken ?? '-', 'lifetime public stat')}
                ${statCard('Refills', stats.refills ?? '-', 'lifetime public stat')}
                ${statCard('RW hits', stats.rankedwarhits ?? '-', 'lifetime public stat')}
                ${statCard('Faction respect', stats.respectforfaction ?? '-', 'lifetime public stat')}
            </div>
            <div class="tfc-inline" style="margin-top:9px">
                <div class="tfc-card"><div class="tfc-kicker">Application snapshot</div><div class="tfc-muted" style="font-size:10px;margin-top:6px;line-height:1.45">Torn status: <strong>${escapeHtml(app?.status || 'No current application')}</strong>${repeat>1?` · <span class="tfc-repeat-badge">${repeat} applications seen</span>`:''}${app?.seenAt?` · tracked ${escapeHtml(appTrackedAge)}`:''}${app?.valid_until?` · valid until ${escapeHtml(fmtDateTime(app.valid_until))}`:''}</div><div class="tfc-recruit-message" style="margin-top:8px">${app?.message ? escapeHtml(app.message) : '<span class="tfc-muted">No application message recorded.</span>'}</div>${bs ? `<div class="tfc-muted" style="font-size:9px;margin-top:8px">Shared battle stats · STR ${fmtCompact(bs.strength)} · DEF ${fmtCompact(bs.defense)} · SPD ${fmtCompact(bs.speed)} · DEX ${fmtCompact(bs.dexterity)} · total ${fmtCompact(bsTotal)}</div>` : `<div class="tfc-muted" style="font-size:9px;margin-top:8px">Applicant did not share battle stats in this application.</div>`}</div>
                <div class="tfc-card"><div class="tfc-kicker">Leadership record</div><div class="tfc-recruit-form" style="margin-top:7px"><div><label>Pipeline stage</label><select class="tfc-select" data-recruit-stage="${c.id}">${RECRUIT_STAGES.map(v=>`<option value="${v}" ${c.pipelineStatus===v?'selected':''}>${v}</option>`).join('')}</select></div><div><label>Referred by</label><input class="tfc-input" data-recruit-referrer="${c.id}" value="${escapeHtml(c.referrer||'')}" placeholder="Name / Torn ID"></div><div><label>Referral amount</label><input class="tfc-input" data-recruit-amount="${c.id}" type="number" min="0" step="1000000" value="${Number(c.referralAmount||0)}"></div><label style="display:flex;align-items:center;gap:6px;color:#fff;font-size:10px;padding-bottom:8px"><input type="checkbox" data-recruit-paid="${c.id}" ${c.referralPaid?'checked':''}> Paid</label></div><textarea class="tfc-input tfc-recruit-notes" data-recruit-notes="${c.id}" placeholder="Leadership notes…">${escapeHtml(c.notes||'')}</textarea></div>
            </div>
            <div class="tfc-muted" style="font-size:9px;margin-top:8px;line-height:1.45">Faction history beyond the player's current public faction is not exposed by an official public Torn endpoint, so TFC does not fabricate it. Application history here means applications this installation has actually observed.</div>
        </div></td></tr>`;
    }

    function renderRecruitRow(c) {
        const p = recruitProfileFromCandidate(c);
        const stats = c?.intel?.stats || {};
        const expanded = String(state.recruitExpandedId) === String(c.id);
        const repeat = recruitRepeatCount(c);
        const isMember = recruitIsMember(c.id);
        const last = p?.last_action?.timestamp ? fmtDuration(Math.max(0,nowSec()-p.last_action.timestamp)) : '-';
        return `<tr>
            <td><button class="tfc-member-toggle" data-recruit-toggle="${c.id}">${expanded?'▾':'▸'}</button></td>
            <td><div class="tfc-member"><a href="https://www.torn.com/profiles.php?XID=${c.id}" target="_blank" rel="noopener">${escapeHtml(c.name || `#${c.id}`)}</a><span class="tfc-id">#${c.id}${isMember?' · CURRENT MEMBER':''}${repeat>1?` · ${repeat} apps`:''}</span></div></td>
            <td><strong class="${recruitStageClass(c.pipelineStatus)}">${escapeHtml(c.pipelineStatus || 'New')}</strong></td>
            <td>${recruitApplicationLabel(c)}</td>
            <td>${fmtNumber(p?.level || c.level || 0) || '-'}</td>
            <td>${last}${p?.last_action?.status?` <span class="tfc-muted">${escapeHtml(p.last_action.status)}</span>`:''}</td>
            <td>${stats.xantaken===null||stats.xantaken===undefined?'-':fmtNumber(stats.xantaken)}</td>
            <td>${stats.rankedwarhits===null||stats.rankedwarhits===undefined?'-':fmtNumber(stats.rankedwarhits)}</td>
            <td>${recruitCurrentFactionLabel(c)}</td>
            <td>${c.referrer ? `${escapeHtml(c.referrer)}${c.referralPaid?' · <span class="tfc-good">paid</span>':' · <span class="tfc-warn">unpaid</span>'}` : '-'}</td>
        </tr>${expanded ? renderRecruitDetail(c) : ''}`;
    }

    function renderRecruit() {
        const rows = recruitRows();
        const all = Object.values(state.recruitCandidates || {});
        const active = all.filter(recruitIsActiveApp);
        const inPlay = all.filter(c=>['Contacted','Interested','Trial'].includes(c.pipelineStatus));
        const repeats = all.filter(c=>recruitRepeatCount(c)>1).length;
        const unpaid = all.filter(c=>c.referrer && !c.referralPaid);
        const unpaidTotal = unpaid.reduce((sum,c)=>sum+Number(c.referralAmount||0),0);
        const currentMembers = all.filter(c=>recruitIsMember(c.id)).length;
        const age = state.recruitLastFetchedAt ? fmtDuration(Math.max(0,(Date.now()-state.recruitLastFetchedAt)/1000)) : '-';
        return `<div class="tfc-recruit-summary">
            ${statCard('Active apps', active.length, 'currently active in Torn')}
            ${statCard('Pipeline', all.length, `stored / ${state.config.recruitHistoryLimit} cap`)}
            ${statCard('In play', inPlay.length, 'contacted · interested · trial')}
            ${statCard('Repeat applicants', repeats, '2+ observed applications')}
            ${statCard('Unpaid referrals', unpaid.length, fmtMoney(unpaidTotal))}
            ${statCard('Now members', currentMembers, 'candidate IDs on current roster')}
        </div>
        <div class="tfc-section">
            <div class="tfc-section-head"><div><h3>Recruitment Command</h3><span class="tfc-muted" style="font-size:10px">Applications last checked ${escapeHtml(age)} ago · candidate records persist locally after Torn removes the application</span></div><div class="tfc-toolbar"><button class="tfc-btn" data-action="copy-recruit-csv">Copy CSV</button><button class="tfc-btn primary" data-action="refresh-recruit" ${state.recruitLoading?'disabled':''}>${state.recruitLoading?'Refreshing…':'Refresh applications'}</button></div></div>
            ${state.recruitError ? `<div class="tfc-alert" style="margin-bottom:9px"><strong class="tfc-warn">Applications unavailable</strong><span>${escapeHtml(state.recruitError)} · Manual candidate lookup and stored records still work. Faction applications require Minimal access with Faction API Access (or an equivalent Custom/Limited key).</span></div>` : ''}
            <div class="tfc-toolbar" style="margin-bottom:9px">
                <input class="tfc-input search" data-role="recruit-search" value="${escapeHtml(state.recruitSearch)}" placeholder="Search candidate / ID / note / referrer">
                <select class="tfc-select" data-role="recruit-filter"><option value="all" ${state.recruitFilter==='all'?'selected':''}>All candidates</option><option value="active" ${state.recruitFilter==='active'?'selected':''}>Active applications</option>${RECRUIT_STAGES.map(v=>`<option value="${v.toLowerCase()}" ${state.recruitFilter===v.toLowerCase()?'selected':''}>${v}</option>`).join('')}<option value="unpaid" ${state.recruitFilter==='unpaid'?'selected':''}>Unpaid referrals</option><option value="members" ${state.recruitFilter==='members'?'selected':''}>Now faction members</option></select>
                <select class="tfc-select" data-role="recruit-sort"><option value="recent" ${state.recruitSort==='recent'?'selected':''}>Smart / recent</option><option value="name" ${state.recruitSort==='name'?'selected':''}>Name</option><option value="stage" ${state.recruitSort==='stage'?'selected':''}>Pipeline stage</option><option value="level" ${state.recruitSort==='level'?'selected':''}>Level</option><option value="xanax" ${state.recruitSort==='xanax'?'selected':''}>Xanax</option><option value="rwhits" ${state.recruitSort==='rwhits'?'selected':''}>RW hits</option></select>
                <input class="tfc-input" data-role="recruit-manual-id" inputmode="numeric" placeholder="Torn ID">
                <button class="tfc-btn" data-action="add-recruit-candidate">Add / lookup</button>
            </div>
            <div class="tfc-table-wrap"><table class="tfc-table tfc-recruit-table"><thead><tr><th class="no-sort"></th><th>Candidate</th><th>Pipeline</th><th>Torn application</th><th>Level</th><th>Last action</th><th>Xanax</th><th>RW hits</th><th>Current faction</th><th>Referral</th></tr></thead><tbody>${rows.length ? rows.map(renderRecruitRow).join('') : `<tr><td colspan="10" class="tfc-muted">No candidates in this view. Refresh applications or add a Torn ID manually.</td></tr>`}</tbody></table></div>
            <div class="tfc-card" style="margin-top:9px"><div class="tfc-kicker">What TFC keeps</div><div class="tfc-muted" style="font-size:10px;line-height:1.5;margin-top:5px">Application message, optional shared battle stats, Torn application outcome, observed repeat applications, your pipeline stage, leadership notes, referral details, and compact public-player intel. Records are capped by the Recruitment history setting so storage cannot grow forever.</div></div>
        </div>`;
    }

    async function saveRecruitField(id, field, value) {
        const c = state.recruitCandidates[String(id)];
        if (!c) return;
        if (field === 'pipelineStatus' && String(c.pipelineStatus || '') !== String(value || '')) {
            const history = Array.isArray(c.stageHistory) ? [...c.stageHistory] : [];
            history.unshift({ status: String(value || ''), at: nowSec() });
            c.stageHistory = history.slice(0, 20);
        }
        if (field === 'referralPaid') {
            c.referralPaidAt = value ? nowSec() : 0;
        }
        c[field] = value;
        c.updatedAt = nowSec();
        await saveRecruitCandidates();
    }

    async function copyRecruitCsv() {
        const rows = [['Candidate','ID','Pipeline','Torn Application','Level','Last Action','Xanax','Refills','RW Hits','Faction Respect','Current Faction','Referrer','Referral Amount','Referral Paid','Notes','Applications Seen']];
        for (const c of recruitRows()) {
            const p = recruitProfileFromCandidate(c);
            const st = c?.intel?.stats || {};
            rows.push([c.name,c.id,c.pipelineStatus,c.application?.status||'',p?.level||c.level||'',p?.last_action?.relative||'',st.xantaken??'',st.refills??'',st.rankedwarhits??'',st.respectforfaction??'',p?.faction?.name||'',c.referrer||'',Number(c.referralAmount||0),c.referralPaid?'Yes':'No',c.notes||'',recruitRepeatCount(c)]);
        }
        const csv = rows.map(row=>row.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n');
        const ok = await copyText(csv);
        toast(ok ? 'Recruitment CSV copied' : 'Could not copy recruitment CSV', ok ? 'ok' : 'error');
    }

    const ARMORY_CATEGORIES = ['weapons','armor','temporary','medical','consumables','drugs','boosters','utilities','loot'];

    function armoryStripHtml(value) {
        const el = document.createElement('div');
        el.innerHTML = String(value || '');
        return String(el.textContent || el.innerText || '').replace(/\s+/g, ' ').trim();
    }

    function armoryBalanceBreakdown() {
        const b = state.armoryBalance?.balance || state.armoryBalance || null;
        if (!b?.faction) return null;
        const rosterIds = new Set((state.roster || []).map(m => String(m.id)));
        const hasRoster = rosterIds.size > 0;
        let currentMoney = 0, currentPoints = 0, exMoney = 0, exPoints = 0;
        for (const m of b.members || []) {
            const isCurrent = !hasRoster || rosterIds.has(String(m.id));
            if (isCurrent) {
                currentMoney += Number(m.money || 0);
                currentPoints += Number(m.points || 0);
            } else {
                exMoney += Number(m.money || 0);
                exPoints += Number(m.points || 0);
            }
        }
        return {
            factionMoney: Number(b.faction.money || 0),
            factionPoints: Number(b.faction.points || 0),
            currentMoney, currentPoints, exMoney, exPoints,
            members: Array.isArray(b.members) ? b.members : [],
            hasRoster,
        };
    }

    function armoryHistoryTrim(rows) {
        const cutoff = new Date();
        cutoff.setUTCDate(cutoff.getUTCDate() - Number(state.config.armoryHistoryDays || 180));
        const min = dateKey(cutoff.getTime());
        return (rows || []).filter(r => r?.d && r.d >= min).sort((a,b) => String(a.d).localeCompare(String(b.d)));
    }

    async function armoryRecordHistory() {
        const v = armoryBalanceBreakdown();
        if (!v) return;
        const d = dateKey();
        const row = { d, factionMoney:v.factionMoney, memberMoney:v.currentMoney, exMoney:v.exMoney, factionPoints:v.factionPoints, memberPoints:v.currentPoints };
        const rows = [...(state.armoryHistory || [])];
        const idx = rows.findIndex(x => x.d === d);
        if (idx >= 0) rows[idx] = row; else rows.push(row);
        state.armoryHistory = armoryHistoryTrim(rows);
        await Store.set('armoryHistory', state.armoryHistory);
    }

    async function fetchArmoryCategory(category, force = false) {
        const out = [];
        let offset = 0;
        let inventoryTimestamp = 0;
        const ttl = Number(state.config.armoryInventoryCacheMinutes || 60) * 60 * 1000;
        for (let page = 0; page < 25; page++) {
            const data = await api('/faction/inventory', { cat: category, limit: 100, offset }, { ttl, force });
            const rows = Array.isArray(data?.inventory) ? data.inventory : [];
            inventoryTimestamp = Math.max(inventoryTimestamp, Number(data?.inventory_timestamp || 0));
            for (const row of rows) out.push({ ...row, _category: category });
            const total = Number(data?._metadata?.total || 0);
            if (rows.length < 100 || (total && out.length >= total)) break;
            offset += rows.length;
        }
        return { rows: out, inventoryTimestamp };
    }

    async function refreshArmoryItemMeta(force = false) {
        const ids = [...new Set((state.armoryInventory || []).map(r => Number(r.id || 0)).filter(Boolean))];
        if (!ids.length) return;
        const ttl = 6 * 60 * 60 * 1000;
        const stale = ids.filter(id => force || !state.armoryItemMeta[String(id)]?.fetchedAt || Date.now() - Number(state.armoryItemMeta[String(id)].fetchedAt || 0) > ttl);
        if (!stale.length) return;
        for (let i = 0; i < stale.length; i += 50) {
            const chunk = stale.slice(i, i + 50);
            try {
                const data = await api(`/torn/${chunk.join(',')}/items`, {}, { ttl, force });
                for (const item of data?.items || []) {
                    state.armoryItemMeta[String(item.id)] = {
                        id: Number(item.id || 0),
                        name: item.name || '',
                        type: item.type || '',
                        marketPrice: Number(item?.value?.market_price || 0),
                        fetchedAt: Date.now(),
                    };
                }
            } catch (err) {
                console.warn('[TFC] armory item metadata failed', err);
            }
        }
        await Store.set('armoryItemMeta', state.armoryItemMeta);
    }

    async function saveArmorySnapshot() {
        await Store.set('armorySnapshot', {
            at: state.armoryLastFetchedAt,
            inventoryTimestamp: state.armoryInventoryTimestamp,
            inventory: state.armoryInventory,
            balance: state.armoryBalance,
            news: state.armoryNews.slice(0, 100),
        });
    }

    async function refreshArmory(force = false, silent = false) {
        if (state.armoryLoading) return;
        const localTtl = Number(state.config.armoryInventoryCacheMinutes || 60) * 60 * 1000;
        if (!force && state.armoryInventory.length && Date.now() - Number(state.armoryLastFetchedAt || 0) < localTtl) {
            if (state.open) render();
            return;
        }
        state.armoryLoading = true;
        state.armoryError = '';
        state.armoryBalanceError = '';
        state.armoryNewsError = '';
        if (!silent) render();
        try {
            const from = nowSec() - Number(state.config.armoryNewsDays || 7) * 86400;
            const inventoryPromise = Promise.allSettled(ARMORY_CATEGORIES.map(cat => fetchArmoryCategory(cat, force)));
            const tasks = await Promise.allSettled([
                inventoryPromise,
                api('/faction/balance', { cat: 'all' }, { ttl: 10*60*1000, force }),
                api('/faction/news', { cat: 'armoryAction,armoryDeposit', limit: 100, sort: 'DESC', from, striptags: 'false' }, { ttl: 5*60*1000, force }),
                api('/faction/crimes', { cat: 'available', limit: 100, sort: 'DESC' }, { ttl: 60*1000, force }),
                api('/torn/organizedcrimes', {}, { ttl: 24*60*60*1000, force: false }),
            ]);

            const invOuter = tasks[0];
            if (invOuter.status === 'fulfilled') {
                const settled = invOuter.value;
                const rows = [];
                let ts = 0, failed = 0, firstError = '';
                for (let i = 0; i < settled.length; i++) {
                    const r = settled[i];
                    if (r.status === 'fulfilled') {
                        rows.push(...r.value.rows);
                        ts = Math.max(ts, Number(r.value.inventoryTimestamp || 0));
                    } else {
                        failed++;
                        if (!firstError) firstError = r.reason?.message || String(r.reason);
                        const category = ARMORY_CATEGORIES[i];
                        rows.push(...(state.armoryInventory || []).filter(x => x._category === category));
                    }
                }
                if (rows.length) {
                    state.armoryInventory = rows;
                    state.armoryInventoryTimestamp = ts;
                    if (failed) state.armoryError = `${failed} inventory categor${failed===1?'y':'ies'} failed: ${firstError}`;
                } else if (failed) state.armoryError = firstError || 'Unable to load faction inventory';
            } else state.armoryError = invOuter.reason?.message || 'Unable to load faction inventory';

            if (tasks[1].status === 'fulfilled') state.armoryBalance = tasks[1].value;
            else state.armoryBalanceError = tasks[1].reason?.message || 'Faction balance unavailable';
            if (tasks[2].status === 'fulfilled') state.armoryNews = Array.isArray(tasks[2].value?.news) ? tasks[2].value.news : [];
            else state.armoryNewsError = tasks[2].reason?.message || 'Armory news unavailable';
            if (tasks[3].status === 'fulfilled') state.ocCrimes = Array.isArray(tasks[3].value?.crimes) ? tasks[3].value.crimes : state.ocCrimes;
            if (tasks[4].status === 'fulfilled') state.ocCatalog = Array.isArray(tasks[4].value?.organizedcrimes) ? tasks[4].value.organizedcrimes : state.ocCatalog;

            state.armoryLastFetchedAt = Date.now();
            if (state.armoryInventory.length) await refreshArmoryItemMeta(false);
            await armoryRecordHistory();
            await saveArmorySnapshot();
            if (force && !silent) toast(`Armory refreshed · ${armoryGroupedItems().length} item types`);
        } catch (err) {
            state.armoryError = err.message || String(err);
            if (!silent) toast(`Armory refresh failed: ${state.armoryError}`, 'error');
        } finally {
            state.armoryLoading = false;
            if (state.open) render();
        }
    }

    function armoryMinimumFor(item) {
        const rules = state.armoryStockRules || { categories:{}, items:{} };
        const itemRule = rules.items?.[String(item.id)];
        if (itemRule !== undefined && itemRule !== null && itemRule !== '') return Math.max(0, Number(itemRule || 0));
        return Math.max(0, Number(rules.categories?.[item.category] || 0));
    }

    function armoryGroupedItems() {
        const map = new Map();
        for (const row of state.armoryInventory || []) {
            const id = Number(row.id || 0);
            const category = String(row._category || 'other');
            const key = `${category}:${id}`;
            if (!map.has(key)) map.set(key, { id, name: row.name || `Item #${id}`, type: row.type || '', category, total:0, available:0, loanedQty:0, borrowers:{}, uids:[] });
            const g = map.get(key);
            const amount = Math.max(0, Number(row.amount ?? 0));
            g.total += amount;
            if (row.loaned?.id) {
                g.loanedQty += amount;
                const sid = String(row.loaned.id);
                if (!g.borrowers[sid]) g.borrowers[sid] = { id:Number(row.loaned.id), name:row.loaned.name || `#${row.loaned.id}`, qty:0 };
                g.borrowers[sid].qty += amount;
            } else g.available += amount;
            if (Array.isArray(row.uids)) g.uids.push(...row.uids.slice(0, 250));
        }
        const rows = [...map.values()];
        for (const g of rows) {
            const meta = state.armoryItemMeta[String(g.id)] || {};
            g.marketPrice = Number(meta.marketPrice || 0);
            g.minimum = armoryMinimumFor(g);
            g.shortfall = Math.max(0, g.minimum - g.available);
            g.availableValue = g.available * g.marketPrice;
            g.totalValue = g.total * g.marketPrice;
        }
        return rows;
    }

    function armoryOcRequirements() {
        const items = armoryGroupedItems();
        const byId = new Map();
        for (const item of items) {
            if (!byId.has(String(item.id))) byId.set(String(item.id), item);
            else {
                const prev = byId.get(String(item.id));
                prev.available += item.available; prev.total += item.total; prev.loanedQty += item.loanedQty;
                for (const [uid,b] of Object.entries(item.borrowers||{})) {
                    if (!prev.borrowers[uid]) prev.borrowers[uid] = { ...b }; else prev.borrowers[uid].qty += b.qty;
                }
            }
        }
        const out = [];
        for (const crime of state.ocCrimes || []) {
            const status = String(crime.status || '').toLowerCase();
            if (!['recruiting','planning'].includes(status)) continue;
            for (const slot of crime.slots || []) {
                const req = slot?.item_requirement;
                const user = slot?.user;
                if (!req?.id || !user?.id) continue;
                const arm = byId.get(String(req.id));
                const borrower = arm?.borrowers?.[String(user.id)] || null;
                const ready = req.is_available === true;
                let source = '';
                if (borrower) source = `Faction loan (${borrower.qty})`;
                else if (ready) source = 'Own / other source';
                else if (Number(arm?.available || 0) > 0) source = `Can loan · ${arm.available} available`;
                else source = 'No available faction stock';
                out.push({
                    crimeId: crime.id, crimeName: crime.name, difficulty: crime.difficulty, status: crime.status,
                    userId: user.id, userName: ocMemberName(user.id), role: slot?.position_info?.label || slot?.position || 'Role',
                    itemId: Number(req.id), itemName: ocCatalogItemName(crime, slot) || arm?.name || `Item #${req.id}`,
                    reusable: !!req.is_reusable, ready, source, armoryAvailable:Number(arm?.available||0), factionLoan:!!borrower,
                });
            }
        }
        return out;
    }

    function armoryLoanRows() {
        const map = new Map();
        for (const item of armoryGroupedItems()) {
            for (const b of Object.values(item.borrowers || {})) {
                const sid = String(b.id);
                if (!map.has(sid)) map.set(sid, { id:b.id, name:b.name, items:[], qty:0, value:0 });
                const row = map.get(sid);
                row.items.push({ id:item.id, name:item.name, category:item.category, qty:b.qty, marketPrice:item.marketPrice, value:b.qty*item.marketPrice });
                row.qty += b.qty;
                row.value += b.qty*item.marketPrice;
            }
        }
        return [...map.values()].sort((a,b) => b.value-a.value || b.qty-a.qty || a.name.localeCompare(b.name));
    }

    function armoryUtilityLoanFlags() {
        const needed = new Set(armoryOcRequirements().map(r => `${r.userId}:${r.itemId}`));
        const flags = [];
        for (const item of armoryGroupedItems().filter(i => i.category === 'utilities')) {
            for (const b of Object.values(item.borrowers || {})) {
                if (!needed.has(`${b.id}:${item.id}`)) flags.push({ memberId:b.id, memberName:b.name, itemId:item.id, itemName:item.name, qty:b.qty });
            }
        }
        return flags;
    }

    function armoryFilteredItems() {
        let rows = armoryGroupedItems();
        const q = state.armorySearch.trim().toLowerCase();
        if (q) rows = rows.filter(r => `${r.name} ${r.id} ${r.type} ${r.category} ${Object.values(r.borrowers||{}).map(b=>b.name).join(' ')}`.toLowerCase().includes(q));
        if (state.armoryCategory !== 'all') rows = rows.filter(r => r.category === state.armoryCategory);
        if (state.armoryFilter === 'low') rows = rows.filter(r => r.shortfall > 0);
        if (state.armoryFilter === 'loaned') rows = rows.filter(r => r.loanedQty > 0);
        if (state.armoryFilter === 'available') rows = rows.filter(r => r.available > 0);
        if (state.armoryFilter === 'oc') {
            const ids = new Set(armoryOcRequirements().map(r=>String(r.itemId)));
            rows = rows.filter(r => ids.has(String(r.id)));
        }
        const sort = state.armorySort;
        rows.sort((a,b) => {
            if (sort === 'name') return a.name.localeCompare(b.name);
            if (sort === 'available') return b.available-a.available || a.name.localeCompare(b.name);
            if (sort === 'loaned') return b.loanedQty-a.loanedQty || a.name.localeCompare(b.name);
            if (sort === 'value') return b.totalValue-a.totalValue || a.name.localeCompare(b.name);
            if (sort === 'category') return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
            return b.shortfall-a.shortfall || b.minimum-a.minimum || a.name.localeCompare(b.name);
        });
        return rows;
    }

    async function saveArmoryMinimum(itemId, value) {
        state.armoryStockRules.items = state.armoryStockRules.items || {};
        const n = Math.max(0, Number(value || 0));
        if (n === 0) delete state.armoryStockRules.items[String(itemId)];
        else state.armoryStockRules.items[String(itemId)] = n;
        await Store.set('armoryStockRules', state.armoryStockRules);
    }

    async function applyArmoryCategoryMinimum() {
        const panel = $('#tfc-panel');
        const cat = $('[data-role="armory-rule-category"]', panel)?.value || '';
        const value = Math.max(0, Number($('[data-role="armory-rule-min"]', panel)?.value || 0));
        if (!cat) return toast('Choose an armory category', 'error');
        state.armoryStockRules.categories = state.armoryStockRules.categories || {};
        if (value === 0) delete state.armoryStockRules.categories[cat];
        else state.armoryStockRules.categories[cat] = value;
        await Store.set('armoryStockRules', state.armoryStockRules);
        toast(value ? `Default minimum for ${cat}: ${value}` : `Default minimum cleared for ${cat}`);
        render();
    }

    function armoryTotals() {
        const items = armoryGroupedItems();
        return {
            itemTypes: items.length,
            totalQty: items.reduce((s,x)=>s+x.total,0),
            availableQty: items.reduce((s,x)=>s+x.available,0),
            loanedQty: items.reduce((s,x)=>s+x.loanedQty,0),
            marketValue: items.reduce((s,x)=>s+x.totalValue,0),
            availableValue: items.reduce((s,x)=>s+x.availableValue,0),
            shortages: items.filter(x=>x.shortfall>0).length,
            shortfallUnits: items.reduce((s,x)=>s+x.shortfall,0),
        };
    }

    function armoryBorrowersText(item) {
        const rows = Object.values(item.borrowers || {});
        if (!rows.length) return '-';
        return rows.map(b => `<a href="https://www.torn.com/profiles.php?XID=${b.id}" target="_blank" rel="noopener">${escapeHtml(b.name)}</a>${b.qty>1?` ×${b.qty}`:''}`).join(', ');
    }

    function armoryItemRow(item) {
        const minSource = state.armoryStockRules.items?.[String(item.id)] !== undefined ? 'item override' : Number(state.armoryStockRules.categories?.[item.category] || 0) > 0 ? `${item.category} default` : 'disabled';
        return `<tr>
            <td><strong>${escapeHtml(item.name)}</strong><div class="tfc-muted" style="font-size:9px">#${item.id} · ${escapeHtml(item.type || item.category)}</div></td>
            <td>${escapeHtml(item.category)}</td>
            <td class="${item.shortfall>0?'tfc-armory-short':'tfc-armory-ok'}">${fmtNumber(item.available)}</td>
            <td>${fmtNumber(item.loanedQty)}</td>
            <td>${fmtNumber(item.total)}</td>
            <td><input class="tfc-input tfc-armory-min" data-armory-min="${item.id}" type="number" min="0" step="1" value="${item.minimum}" title="${escapeHtml(minSource)}"></td>
            <td class="${item.shortfall>0?'tfc-armory-short':'tfc-muted'}">${item.shortfall>0?`-${fmtNumber(item.shortfall)}`:'-'}</td>
            <td>${item.marketPrice ? fmtMoney(item.marketPrice) : '-'}</td>
            <td>${item.totalValue ? fmtMoney(item.totalValue) : '-'}</td>
            <td style="white-space:normal;min-width:190px">${armoryBorrowersText(item)}</td>
        </tr>`;
    }

    function renderArmoryVault() {
        const v = armoryBalanceBreakdown();
        if (!v) return `<div class="tfc-card"><div class="tfc-kicker">Vault</div><div class="tfc-muted" style="font-size:10px;margin-top:6px">${escapeHtml(state.armoryBalanceError || 'Balance data unavailable with this key.')}</div></div>`;
        const exMembers = v.members.filter(m => !new Set((state.roster||[]).map(x=>String(x.id))).has(String(m.id)) && (Number(m.money||0) || Number(m.points||0)));
        const recent = [...(state.armoryHistory || [])].sort((a,b)=>String(b.d).localeCompare(String(a.d))).slice(0,14);
        return `<div class="tfc-card">
            <div class="tfc-section-head"><div><h3>Vault</h3><span class="tfc-muted" style="font-size:10px">Faction funds are kept separate from member deposits</span></div></div>
            <div class="tfc-grid" style="margin-bottom:9px">
                ${statCard('Faction money', fmtMoney(v.factionMoney), `${fmtNumber(v.factionPoints)} faction points`)}
                ${statCard('Member deposits', fmtMoney(v.currentMoney), `${fmtNumber(v.currentPoints)} member points`)}
                ${statCard('Ex-member balances', fmtMoney(v.exMoney), v.exMoney||v.exPoints ? `${fmtNumber(v.exPoints)} points · review` : 'none observed')}
            </div>
            ${exMembers.length ? `<div class="tfc-alert" style="margin-bottom:9px"><strong class="tfc-warn">Ex-member balances remain</strong><span>${exMembers.slice(0,8).map(m=>`${escapeHtml(m.username)}: ${fmtMoney(m.money)}${Number(m.points||0)?` + ${fmtNumber(m.points)} pts`:''}`).join(' · ')}${exMembers.length>8?` · +${exMembers.length-8} more`:''}</span></div>` : ''}
            ${recent.length ? `<div class="tfc-table-wrap"><table class="tfc-table tfc-armory-history"><thead><tr><th>UTC date</th><th>Faction money</th><th>Member deposits</th><th>Ex-member</th><th>Faction pts</th></tr></thead><tbody>${recent.map(r=>`<tr><td>${escapeHtml(r.d)}</td><td>${fmtMoney(r.factionMoney)}</td><td>${fmtMoney(r.memberMoney)}</td><td>${fmtMoney(r.exMoney)}</td><td>${fmtNumber(r.factionPoints)}</td></tr>`).join('')}</tbody></table></div>` : ''}
        </div>`;
    }

    function renderArmoryOcRequirements() {
        const rows = armoryOcRequirements();
        if (!rows.length) return `<div class="tfc-card"><div class="tfc-kicker">OC item requirements</div><div class="tfc-muted" style="font-size:10px;margin-top:6px">No assigned active OC slots with item requirements are currently visible.</div></div>`;
        return `<div class="tfc-card">
            <div class="tfc-section-head"><div><h3>OC item requirements</h3><span class="tfc-muted" style="font-size:10px">Cross-referenced against current faction loans and available armory stock</span></div></div>
            <div class="tfc-table-wrap"><table class="tfc-table"><thead><tr><th>Member</th><th>Crime</th><th>Role</th><th>Item</th><th>Status</th><th>Source / action</th></tr></thead><tbody>
            ${rows.map(r=>`<tr><td><a href="https://www.torn.com/profiles.php?XID=${r.userId}" target="_blank" rel="noopener">${escapeHtml(r.userName)}</a></td><td>${escapeHtml(r.crimeName)} <span class="tfc-muted">D${r.difficulty}</span></td><td>${escapeHtml(r.role)}</td><td>${escapeHtml(r.itemName)}${r.reusable?' · reusable':''}</td><td class="${r.ready?'tfc-oc-item-ready':'tfc-oc-item-missing'}">${r.ready?'READY':'MISSING'}</td><td>${escapeHtml(r.source)}</td></tr>`).join('')}
            </tbody></table></div>
        </div>`;
    }

    function renderArmoryLoans() {
        const borrowers = armoryLoanRows();
        const flags = armoryUtilityLoanFlags();
        return `<div class="tfc-card">
            <div class="tfc-section-head"><div><h3>Loans by member</h3><span class="tfc-muted" style="font-size:10px">Approximate values use base item market prices, not unique weapon/armor bonuses</span></div></div>
            ${borrowers.length ? borrowers.slice(0,30).map(b=>`<div class="tfc-armory-loan"><div><strong><a href="https://www.torn.com/profiles.php?XID=${b.id}" target="_blank" rel="noopener">${escapeHtml(b.name)}</a></strong><small>${b.items.map(i=>`${escapeHtml(i.name)}${i.qty>1?` ×${i.qty}`:''}`).join(' · ')}</small></div><div style="text-align:right"><strong>${fmtNumber(b.qty)} item${b.qty===1?'':'s'}</strong><small>${b.value?fmtMoney(b.value):''}</small></div></div>`).join('') : `<div class="tfc-muted" style="font-size:10px">No current loans visible.</div>`}
            ${flags.length ? `<div class="tfc-alert" style="margin-top:10px"><strong class="tfc-warn">Utility loans with no current OC requirement observed</strong><span>${flags.slice(0,12).map(f=>`${escapeHtml(f.memberName)}: ${escapeHtml(f.itemName)}${f.qty>1?` ×${f.qty}`:''}`).join(' · ')}${flags.length>12?` · +${flags.length-12} more`:''}</span></div>` : ''}
        </div>`;
    }

    function renderArmoryNews() {
        if (!state.armoryNews.length) return `<div class="tfc-card"><div class="tfc-kicker">Recent armory activity</div><div class="tfc-muted" style="font-size:10px;margin-top:6px">${escapeHtml(state.armoryNewsError || 'No recent armory actions returned.')}</div></div>`;
        return `<div class="tfc-card"><div class="tfc-section-head"><div><h3>Recent armory activity</h3><span class="tfc-muted" style="font-size:10px">Latest ${Math.min(20,state.armoryNews.length)} actions from Torn faction news</span></div></div><div class="tfc-feed">${state.armoryNews.slice(0,20).map(n=>`<div class="tfc-feed-item"><div>${escapeHtml(armoryStripHtml(n.text))}</div><small>${fmtDateTime(n.timestamp)}</small></div>`).join('')}</div></div>`;
    }

    function renderArmory() {
        if (state.armoryLoading && !state.armoryInventory.length) return `<div class="tfc-empty"><div><strong>Loading Armory & Vault Command…</strong>Reading the current inventory categories, vault balances, OC item requirements, and armory activity.</div></div>`;
        if (state.armoryError && !state.armoryInventory.length) return `<div class="tfc-section"><div class="tfc-alert"><strong class="tfc-bad">Armory inventory unavailable</strong><span>${escapeHtml(state.armoryError)}</span></div><div class="tfc-card" style="margin-top:10px"><div class="tfc-kicker">Permission required</div><div class="tfc-muted" style="font-size:10px;line-height:1.5;margin-top:5px">The current Torn faction inventory endpoint requires a Limited access key. Faction balance additionally requires faction API permission. Other TFC modules continue to work at their existing access levels.</div><button class="tfc-btn primary" style="margin-top:10px" data-action="refresh-armory">Retry Armory</button></div></div>`;
        if (!state.armoryInventory.length) return `<div class="tfc-empty"><div><strong>No armory snapshot loaded</strong><button class="tfc-btn primary" data-action="refresh-armory">Load Armory</button></div></div>`;

        const totals = armoryTotals();
        const v = armoryBalanceBreakdown();
        const loans = armoryLoanRows();
        const ocReq = armoryOcRequirements();
        const rows = armoryFilteredItems();
        const inventoryAge = state.armoryInventoryTimestamp ? fmtDuration(Math.max(0, nowSec()-state.armoryInventoryTimestamp)) : '-';
        const localAge = state.armoryLastFetchedAt ? fmtDuration(Math.floor((Date.now()-state.armoryLastFetchedAt)/1000)) : '-';
        return `
            <div class="tfc-section-head"><div><h3>Armory & Vault Command</h3><span class="tfc-muted" style="font-size:10px">Local refresh ${escapeHtml(localAge)} ago · Torn inventory snapshot ${escapeHtml(inventoryAge)} old · server inventory cache is 1 hour</span></div><div class="tfc-toolbar"><button class="tfc-btn" data-action="copy-armory-shortages">Shortages CSV</button><button class="tfc-btn" data-action="copy-armory-loans">Loans CSV</button><button class="tfc-btn primary" data-action="refresh-armory" ${state.armoryLoading?'disabled':''}>${state.armoryLoading?'Refreshing…':'Refresh Armory'}</button></div></div>
            ${state.armoryError ? `<div class="tfc-alert" style="margin-bottom:9px"><strong class="tfc-warn">Partial inventory refresh</strong><span>${escapeHtml(state.armoryError)}</span></div>` : ''}
            <div class="tfc-armory-summary">
                ${statCard('Item types', totals.itemTypes, `${fmtNumber(totals.totalQty)} physical/stacked units`)}
                ${statCard('Available', fmtNumber(totals.availableQty), totals.availableValue ? `${fmtMoney(totals.availableValue)} base market` : 'in armory')}
                ${statCard('Loaned', fmtNumber(totals.loanedQty), `${loans.length} borrower${loans.length===1?'':'s'}`)}
                ${statCard('Low stock', totals.shortages, totals.shortages ? `${fmtNumber(totals.shortfallUnits)} units short` : 'configured rules')}
                ${statCard('OC item slots', ocReq.length, `${ocReq.filter(x=>!x.ready).length} missing`)}
                ${statCard('Faction cash', v ? fmtMoney(v.factionMoney) : '-', v ? `${fmtMoney(v.currentMoney)} member deposits` : 'vault access unavailable')}
            </div>

            <div class="tfc-card" style="margin-bottom:10px">
                <div class="tfc-section-head"><div><h3>Stock controls</h3><span class="tfc-muted" style="font-size:10px">Minimums compare against currently available armory stock, excluding loaned copies</span></div></div>
                <div class="tfc-toolbar" style="align-items:end">
                    <input class="tfc-input" data-role="armory-search" style="min-width:180px" placeholder="Search item, ID, borrower…" value="${escapeHtml(state.armorySearch)}">
                    <select class="tfc-select" data-role="armory-category"><option value="all">All categories</option>${ARMORY_CATEGORIES.map(c=>`<option value="${c}" ${state.armoryCategory===c?'selected':''}>${c}</option>`).join('')}</select>
                    <select class="tfc-select" data-role="armory-filter"><option value="all" ${state.armoryFilter==='all'?'selected':''}>All stock</option><option value="low" ${state.armoryFilter==='low'?'selected':''}>Low stock only</option><option value="loaned" ${state.armoryFilter==='loaned'?'selected':''}>Loaned only</option><option value="available" ${state.armoryFilter==='available'?'selected':''}>Available only</option><option value="oc" ${state.armoryFilter==='oc'?'selected':''}>OC items only</option></select>
                    <select class="tfc-select" data-role="armory-sort"><option value="shortage" ${state.armorySort==='shortage'?'selected':''}>Sort: shortage</option><option value="name" ${state.armorySort==='name'?'selected':''}>Name</option><option value="category" ${state.armorySort==='category'?'selected':''}>Category</option><option value="available" ${state.armorySort==='available'?'selected':''}>Available</option><option value="loaned" ${state.armorySort==='loaned'?'selected':''}>Loaned</option><option value="value" ${state.armorySort==='value'?'selected':''}>Base market value</option></select>
                </div>
                <div class="tfc-toolbar" style="margin-top:8px;align-items:end">
                    <div><div class="tfc-muted" style="font-size:9px;margin-bottom:4px">Apply category default minimum</div><select class="tfc-select" data-role="armory-rule-category">${ARMORY_CATEGORIES.map(c=>`<option value="${c}">${c}${Number(state.armoryStockRules.categories?.[c]||0)?` · ${state.armoryStockRules.categories[c]}`:''}</option>`).join('')}</select></div>
                    <div><div class="tfc-muted" style="font-size:9px;margin-bottom:4px">Units per item</div><input class="tfc-input" data-role="armory-rule-min" type="number" min="0" step="1" value="0" style="width:90px"></div>
                    <button class="tfc-btn" data-action="apply-armory-category-min">Apply</button>
                    <span class="tfc-muted" style="font-size:9px">Set 0 to clear a category default. Editing a row creates an item-specific override.</span>
                </div>
            </div>

            <div class="tfc-section"><div class="tfc-section-head"><div><h3>Inventory</h3><span class="tfc-muted" style="font-size:10px">${rows.length} shown · ${totals.itemTypes} item types total</span></div></div><div class="tfc-table-wrap"><table class="tfc-table tfc-armory-table"><thead><tr><th>Item</th><th>Category</th><th>Available</th><th>Loaned</th><th>Total</th><th>Minimum</th><th>Short</th><th>Base price</th><th>Total value</th><th>Borrowers</th></tr></thead><tbody>${rows.map(armoryItemRow).join('') || `<tr><td colspan="10" class="tfc-muted">No items match the current filters.</td></tr>`}</tbody></table></div></div>

            <div class="tfc-armory-layout">
                <div>${renderArmoryVault()}</div>
                <div>${renderArmoryLoans()}</div>
            </div>
            <div class="tfc-armory-layout" style="margin-top:12px">
                <div>${renderArmoryOcRequirements()}</div>
                <div>${renderArmoryNews()}</div>
            </div>
            <div class="tfc-card" style="margin-top:12px"><div class="tfc-kicker">Valuation note</div><div class="tfc-muted" style="font-size:10px;line-height:1.5;margin-top:5px">Market values are approximate base-item values from Torn item metadata. They are useful for consumables and broad exposure, but they do not attempt to price unique weapon/armor bonuses or individual UID quality.</div></div>
        `;
    }

    async function copyArmoryLoansCsv() {
        const rows = [['Member','User ID','Item','Item ID','Category','Quantity','Base Market Price','Approx Value']];
        for (const b of armoryLoanRows()) for (const item of b.items) rows.push([b.name,b.id,item.name,item.id,item.category,item.qty,item.marketPrice||'',item.value||'']);
        const csv = rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n');
        { const ok = await copyText(csv); toast(ok ? 'Loan CSV copied' : 'Could not copy loan CSV', ok ? 'ok' : 'error'); }
    }

    async function copyArmoryShortagesCsv() {
        const rows = [['Item','Item ID','Category','Available','Minimum','Shortfall','Base Market Price','Estimated Restock Value']];
        for (const item of armoryGroupedItems().filter(x=>x.shortfall>0).sort((a,b)=>b.shortfall-a.shortfall)) rows.push([item.name,item.id,item.category,item.available,item.minimum,item.shortfall,item.marketPrice||'',item.shortfall*item.marketPrice||'']);
        const csv = rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n');
        { const ok = await copyText(csv); toast(ok ? 'Shortage CSV copied' : 'Could not copy shortage CSV', ok ? 'ok' : 'error'); }
    }

    function updateOcCountdowns() {
        // OC time labels are rebuilt on each API/ticker render. Keep this hook for future lightweight countdown nodes.
    }

    function updateWarCountdowns() {
        if (!state.open || state.activeTab !== 'war') return;
        const now = nowSec();
        $$('[data-countdown]', $('#tfc-panel')).forEach(el => {
            const target = Number(el.dataset.countdown || 0);
            const diff = target - now;
            el.textContent = diff > 0 ? fmtDuration(diff) : 'Now';
            if (diff <= 0) el.classList.add('tfc-good');
        });
    }

    function startWarTicker() {
        if (state.warTicker) return;
        state.warTicker = setInterval(() => {
            if (!state.open) return;
            if (state.activeTab === 'war') updateWarCountdowns();
            if (state.activeTab === 'chain') updateChainCountdowns();
            if (state.activeTab === 'oc') updateOcCountdowns();
            if (['war','payout'].includes(state.activeTab)) {
                const seconds = Number(state.config?.warAutoRefreshSeconds || 0);
                if (seconds > 0 && !state.warLoading && !state.loadingRoster && Date.now() - Number(state.warLastFetchedAt || 0) >= seconds * 1000) refreshWar(false, true);
            }
            if (state.activeTab === 'chain') {
                const seconds = Number(state.config?.chainAutoRefreshSeconds || 0);
                if (seconds > 0 && !state.chainLoading && Date.now() - Number(state.chainLastFetchedAt || 0) >= seconds * 1000) refreshChain(false, true);
            }
            if (state.activeTab === 'oc') {
                const seconds = Number(state.config?.ocAutoRefreshSeconds || 0);
                if (seconds > 0 && !state.ocLoading && Date.now() - Number(state.ocLastFetchedAt || 0) >= seconds * 1000) refreshOC(false, true);
            }
        }, 1000);
    }

    function financeWindowCutoff() {
        const days = Number(state.financeWindow || 0);
        return days > 0 ? nowSec() - days * 86400 : 0;
    }

    function financeInWindow(ts) {
        const cutoff = financeWindowCutoff();
        return !cutoff || Number(ts || 0) >= cutoff;
    }

    function financeWindowLabel() {
        const days = Number(state.financeWindow || 0);
        return days > 0 ? `${days} days` : 'all retained';
    }

    function financeTrimManual(rows) {
        return (rows || [])
            .filter(r => r && r.id && Number(r.ts || 0) > 0)
            .sort((a,b) => Number(b.ts || 0) - Number(a.ts || 0) || Number(b.createdAt || 0) - Number(a.createdAt || 0))
            .slice(0, Math.max(100, Number(state.config.financeManualLimit || 2000)));
    }

    function financeStripHtml(value) {
        return armoryStripHtml(value || '');
    }

    function financeParseMoney(text) {
        const clean = financeStripHtml(text);
        const m = clean.match(/\$\s*([\d,]+(?:\.\d{1,2})?)/);
        return m ? Number(m[1].replace(/,/g,'')) : 0;
    }

    function financeParsePoints(text) {
        const clean = financeStripHtml(text);
        const m = clean.match(/([\d,]+)\s+points?\b/i);
        return m ? Number(m[1].replace(/,/g,'')) : 0;
    }

    async function refreshFinance(force = false, silent = false) {
        if (state.financeLoading) return;
        state.financeLoading = true;
        state.financeError = '';
        if (!silent) render();
        try {
            const from = nowSec() - Math.max(1, Number(state.config.financeNewsDays || 30)) * 86400;
            const tasks = await Promise.allSettled([
                api('/faction/balance', { cat:'all' }, { ttl:10*60*1000, force }),
                api('/faction/news', { cat:'depositFunds', limit:100, sort:'DESC', from, striptags:'false' }, { ttl:5*60*1000, force }),
                api('/faction/news', { cat:'giveFunds', limit:100, sort:'DESC', from, striptags:'false' }, { ttl:5*60*1000, force }),
            ]);
            if (tasks[0].status === 'fulfilled') state.armoryBalance = tasks[0].value;
            else state.financeError = tasks[0].reason?.message || 'Faction balance unavailable';
            const merged = [];
            if (tasks[1].status === 'fulfilled') for (const n of tasks[1].value?.news || []) merged.push({ ...n, _financeCategory:'depositFunds' });
            else state.financeError += `${state.financeError?' · ':''}Deposits: ${tasks[1].reason?.message || 'unavailable'}`;
            if (tasks[2].status === 'fulfilled') for (const n of tasks[2].value?.news || []) merged.push({ ...n, _financeCategory:'giveFunds' });
            else state.financeError += `${state.financeError?' · ':''}Given funds: ${tasks[2].reason?.message || 'unavailable'}`;
            const byId = new Map();
            for (const n of merged) byId.set(String(n.id || `${n._financeCategory}:${n.timestamp}:${n.text}`), n);
            state.financeFundNews = [...byId.values()].sort((a,b)=>Number(b.timestamp||0)-Number(a.timestamp||0)).slice(0,500);
            state.financeLastFetchedAt = Date.now();
            await Store.set('financeSnapshot', { at:state.financeLastFetchedAt, news:state.financeFundNews });
            if (state.armoryBalance) {
                await armoryRecordHistory();
                if (state.roster.length) await recordAnalyticsSnapshot();
            }
            if (force && !silent) toast(`Finance refreshed · ${state.financeFundNews.length} fund events`);
        } catch (err) {
            state.financeError = err.message || String(err);
            if (!silent) toast(`Finance refresh failed: ${state.financeError}`, 'error');
        } finally {
            state.financeLoading = false;
            if (state.open) render();
        }
    }

    function financeManualRows() {
        return financeTrimManual(state.financeManualEntries || []);
    }

    async function addFinanceManualEntry() {
        const panel = $('#tfc-panel');
        const date = $('[data-finance-add="date"]', panel)?.value || dateKey();
        const type = $('[data-finance-add="type"]', panel)?.value || 'expense';
        const category = $('[data-finance-add="category"]', panel)?.value || 'Other';
        const amount = Math.max(0, Number($('[data-finance-add="amount"]', panel)?.value || 0));
        const note = $('[data-finance-add="note"]', panel)?.value.trim() || '';
        const member = $('[data-finance-add="member"]', panel)?.value.trim() || '';
        if (!amount) return toast('Enter an amount greater than $0', 'error');
        const parsed = Date.parse(`${date}T12:00:00Z`);
        if (!Number.isFinite(parsed)) return toast('Choose a valid date', 'error');
        const row = {
            id:`manual:${Date.now()}:${Math.random().toString(36).slice(2,7)}`,
            ts:Math.floor(parsed/1000), type, category, amount, note, member,
            createdAt:Date.now(), status:'actual', source:'Manual ledger',
        };
        state.financeManualEntries = financeTrimManual([row, ...(state.financeManualEntries || [])]);
        await Store.set('financeManualEntries', state.financeManualEntries);
        toast('Finance entry added');
        render();
    }

    async function deleteFinanceManualEntry(id) {
        state.financeManualEntries = (state.financeManualEntries || []).filter(r => String(r.id) !== String(id));
        await Store.set('financeManualEntries', state.financeManualEntries);
        toast('Finance entry deleted');
        render();
    }

    function financeWarEntries() {
        const rows = [];
        for (const w of Object.values(state.warHistory || {})) {
            const warId = String(w.warId || '');
            if (!warId) continue;
            const d = payoutDraft(warId);
            const gross = Math.max(0, Number(d.grossValue || 0));
            if (!gross) continue;
            const ts = Number(w.end || w.start || 0);
            if (!financeInWindow(ts)) continue;
            const calc = computePayout(warId);
            rows.push({ id:`war-gross:${warId}`, ts, type:'income', category:'Ranked War', amount:gross, status:'valued', source:'War valuation', description:`${w.opponentName || 'Ranked War'} gross value`, ref:warId });
            if (Number(calc.totalFinal || 0) > 0) {
                rows.push({ id:`war-payout:${warId}`, ts:Number(d.paidAt || ts), type:'expense', category:'War payout', amount:Number(calc.totalFinal || 0), status:d.paidAt?'actual':'planned', source:'Payout builder', description:`${w.opponentName || 'Ranked War'} member payouts`, ref:warId });
            }
        }
        return rows;
    }

    function financeOcEntries() {
        const rows = [];
        const share = Math.min(100, Math.max(0, Number(state.config.financeOcMemberPercent ?? 80))) / 100;
        for (const c of state.ocHistory || []) {
            if (String(c.status || '').toLowerCase() !== 'successful') continue;
            const amount = Math.max(0, Number(c.rewards?.money || 0));
            if (!amount) continue;
            const ts = Number(c.executed_at || c.expired_at || c.created_at || 0);
            if (!financeInWindow(ts)) continue;
            rows.push({ id:`oc-gross:${c.id}`, ts, type:'income', category:'Organized Crime', amount, status:'valued', source:'OC history', description:`${c.name || `OC #${c.id}`} reward generated`, ref:String(c.id) });
            const memberShare = amount * share;
            if (memberShare > 0) rows.push({ id:`oc-share:${c.id}`, ts, type:'expense', category:'OC payout', amount:memberShare, status:'planned', source:'OC payout model', description:`Projected ${Math.round(share*100)}% member share · ${c.name || `OC #${c.id}`}`, ref:String(c.id) });
        }
        return rows;
    }

    function financeReferralEntries() {
        const rows = [];
        for (const c of Object.values(state.recruitCandidates || {})) {
            const amount = Math.max(0, Number(c.referralAmount || 0));
            if (!amount || !String(c.referrer || '').trim()) continue;
            const ts = Number(c.referralPaidAt || c.updatedAt || c.firstSeen || 0);
            if (!financeInWindow(ts)) continue;
            rows.push({ id:`referral:${c.id}`, ts, type:'expense', category:'Referral', amount, status:c.referralPaid?'actual':'liability', source:'Recruitment', description:`Referral for ${c.name || `#${c.id}`} · ${c.referrer}`, ref:String(c.id) });
        }
        return rows;
    }

    function financeAllEntries() {
        const manual = financeManualRows().filter(r => financeInWindow(r.ts)).map(r => ({ ...r, description:r.note || r.category || 'Manual entry' }));
        return [...manual, ...financeWarEntries(), ...financeOcEntries(), ...financeReferralEntries()]
            .sort((a,b)=>Number(b.ts||0)-Number(a.ts||0));
    }

    function financeVisibleEntries() {
        let rows = financeAllEntries();
        const f = state.financeFilter;
        if (f === 'income' || f === 'expense' || f === 'transfer') rows = rows.filter(r=>r.type===f);
        else if (['actual','valued','planned','liability'].includes(f)) rows = rows.filter(r=>r.status===f);
        const q = String(state.financeSearch || '').trim().toLowerCase();
        if (q) rows = rows.filter(r => `${r.category||''} ${r.description||''} ${r.source||''} ${r.member||''} ${r.ref||''}`.toLowerCase().includes(q));
        return rows;
    }

    function financeVaultDelta() {
        const rows = [...(state.armoryHistory || [])]
            .filter(r => r?.d && (!Number(state.financeWindow||0) || financeInWindow(Date.parse(`${r.d}T12:00:00Z`)/1000)))
            .sort((a,b)=>String(a.d).localeCompare(String(b.d)));
        if (rows.length < 2) return null;
        const first = Number(rows[0].factionMoney || 0), last = Number(rows[rows.length-1].factionMoney || 0);
        return { first, last, delta:last-first, days:Math.max(1, Math.round((Date.parse(`${rows[rows.length-1].d}T12:00:00Z`)-Date.parse(`${rows[0].d}T12:00:00Z`))/86400000)) };
    }

    function financeSummary() {
        const entries = financeAllEntries();
        const actual = entries.filter(r=>r.status==='actual');
        const generated = entries.filter(r=>r.type==='income' && (r.status==='actual'||r.status==='valued')).reduce((s,r)=>s+Number(r.amount||0),0);
        const actualExpenses = actual.filter(r=>r.type==='expense').reduce((s,r)=>s+Number(r.amount||0),0);
        const actualIncome = actual.filter(r=>r.type==='income').reduce((s,r)=>s+Number(r.amount||0),0);
        const planned = entries.filter(r=>r.type==='expense' && r.status==='planned').reduce((s,r)=>s+Number(r.amount||0),0);
        const liabilities = entries.filter(r=>r.type==='expense' && r.status==='liability').reduce((s,r)=>s+Number(r.amount||0),0);
        const modelledOut = entries.filter(r=>r.type==='expense').reduce((s,r)=>s+Number(r.amount||0),0);
        const modelledRetained = generated - modelledOut;
        const actualLedgerNet = actualIncome - actualExpenses;
        const vault = financeVaultDelta();
        return { entries, generated, actualExpenses, actualIncome, planned, liabilities, modelledRetained, actualLedgerNet, vault, reconciliation:vault ? vault.delta-actualLedgerNet : null };
    }

    function financeFundNewsRows() {
        return (state.financeFundNews || []).filter(n=>financeInWindow(n.timestamp)).map(n=>({
            ...n,
            clean:financeStripHtml(n.text),
            money:financeParseMoney(n.text),
            points:financeParsePoints(n.text),
        })).sort((a,b)=>Number(b.timestamp||0)-Number(a.timestamp||0));
    }

    function financeEntryStatus(entry) {
        const s = entry.status || 'actual';
        const label = s === 'valued' ? 'Valued' : s === 'planned' ? 'Planned' : s === 'liability' ? 'Liability' : 'Actual';
        return `<span class="tfc-finance-status ${s}">${label}</span>`;
    }

    function financeEntryAmount(entry) {
        const amount = fmtMoney(entry.amount || 0);
        if (entry.type === 'income') return `<span class="tfc-finance-in">+${amount}</span>`;
        if (entry.type === 'expense') return `<span class="tfc-finance-out">-${amount}</span>`;
        return `<span class="tfc-finance-transfer">${amount}</span>`;
    }

    function renderFinanceLedger() {
        const rows = financeVisibleEntries();
        return `<div class="tfc-section"><div class="tfc-section-head"><div><h3>Operating ledger</h3><span class="tfc-muted" style="font-size:10px">Actual manual/paid entries stay distinct from valued rewards, planned distributions, and liabilities.</span></div></div>
            <div class="tfc-toolbar" style="margin-bottom:9px"><input class="tfc-input" data-role="finance-search" placeholder="Search source, category, note…" value="${escapeHtml(state.financeSearch)}" style="min-width:200px"><select class="tfc-select" data-role="finance-filter"><option value="all" ${state.financeFilter==='all'?'selected':''}>All ledger entries</option><option value="actual" ${state.financeFilter==='actual'?'selected':''}>Actual only</option><option value="valued" ${state.financeFilter==='valued'?'selected':''}>Valued rewards</option><option value="planned" ${state.financeFilter==='planned'?'selected':''}>Planned payouts</option><option value="liability" ${state.financeFilter==='liability'?'selected':''}>Liabilities</option><option value="income" ${state.financeFilter==='income'?'selected':''}>Income only</option><option value="expense" ${state.financeFilter==='expense'?'selected':''}>Expenses only</option></select></div>
            <div class="tfc-table-wrap"><table class="tfc-table"><thead><tr><th>Date</th><th>Status</th><th>Category</th><th>Description</th><th>Source</th><th>Amount</th><th></th></tr></thead><tbody>${rows.slice(0,250).map(r=>`<tr><td>${fmtDateTime(r.ts)}</td><td>${financeEntryStatus(r)}</td><td>${escapeHtml(r.category||'-')}</td><td style="white-space:normal;min-width:220px">${escapeHtml(r.description||r.note||'-')}${r.member?`<div class="tfc-muted">${escapeHtml(r.member)}</div>`:''}</td><td>${escapeHtml(r.source||'-')}</td><td>${financeEntryAmount(r)}</td><td>${String(r.id||'').startsWith('manual:')?`<button class="tfc-btn danger" data-finance-delete="${escapeHtml(r.id)}">Delete</button>`:''}</td></tr>`).join('')||`<tr><td colspan="7" class="tfc-muted">No finance entries match this window/filter.</td></tr>`}</tbody></table></div>
        </div>`;
    }

    function renderFinanceFundNews() {
        const rows = financeFundNewsRows();
        const deposits = rows.filter(r=>r._financeCategory==='depositFunds');
        const gives = rows.filter(r=>r._financeCategory==='giveFunds');
        const depositMoney = deposits.reduce((s,r)=>s+Number(r.money||0),0);
        const giveMoney = gives.reduce((s,r)=>s+Number(r.money||0),0);
        return `<div class="tfc-section"><div class="tfc-section-head"><div><h3>Observed fund movements</h3><span class="tfc-muted" style="font-size:10px">Torn fund-news messages are free-form. These are transfers, not automatically revenue/expense.</span></div></div>
            <div class="tfc-grid" style="margin-bottom:9px">${statCard('Deposits observed',fmtMoney(depositMoney),`${deposits.length} news rows with parsed cash`)}${statCard('Funds given',fmtMoney(giveMoney),`${gives.length} news rows with parsed cash`)}</div>
            <div class="tfc-feed">${rows.slice(0,30).map(r=>`<div class="tfc-feed-item"><div><span class="tfc-finance-status ${r._financeCategory==='depositFunds'?'actual':'planned'}">${r._financeCategory==='depositFunds'?'Deposit':'Given'}</span> ${escapeHtml(r.clean)}${r.money?` <strong>${fmtMoney(r.money)}</strong>`:''}${r.points?` <strong>${fmtNumber(r.points)} pts</strong>`:''}</div><small>${fmtDateTime(r.timestamp)}</small></div>`).join('')||`<div class="tfc-muted" style="font-size:10px">${escapeHtml(state.financeError || 'No fund news loaded for this window.')}</div>`}</div>
        </div>`;
    }

    function renderFinanceManualAdd() {
        const cats=['Donation / income','Sale','Purchase','Armory','Reimbursement','War payout','OC payout','Referral','Service','Other'];
        return `<div class="tfc-section"><div class="tfc-section-head"><div><h3>Add actual ledger entry</h3><span class="tfc-muted" style="font-size:10px">Use this for cash movement TFC cannot verify structurally, such as purchases, reimbursements, cache sales, and OC payouts.</span></div></div><div class="tfc-finance-entry-form">
            <div><div class="tfc-muted" style="font-size:9px;margin-bottom:4px">UTC date</div><input class="tfc-input" data-finance-add="date" type="date" value="${dateKey()}"></div>
            <div><div class="tfc-muted" style="font-size:9px;margin-bottom:4px">Type</div><select class="tfc-select" data-finance-add="type"><option value="expense">Expense</option><option value="income">Income</option><option value="transfer">Transfer / adjustment</option></select></div>
            <div><div class="tfc-muted" style="font-size:9px;margin-bottom:4px">Category</div><select class="tfc-select" data-finance-add="category">${cats.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}</select></div>
            <div><div class="tfc-muted" style="font-size:9px;margin-bottom:4px">Amount</div><input class="tfc-input" data-finance-add="amount" type="number" min="0" step="1000" placeholder="0"></div>
            <div class="tfc-finance-wide"><div class="tfc-muted" style="font-size:9px;margin-bottom:4px">Note / counterparty</div><input class="tfc-input" data-finance-add="note" placeholder="e.g. Sold RW caches / reimbursed member"></div>
            <div class="tfc-finance-wide"><div class="tfc-muted" style="font-size:9px;margin-bottom:4px">Member (optional)</div><input class="tfc-input" data-finance-add="member" placeholder="Name or ID"></div>
            <button class="tfc-btn primary tfc-finance-wide" data-action="add-finance-entry">Add entry</button>
        </div></div>`;
    }

    async function copyFinanceCsv() {
        const rows=[['Date','Status','Type','Category','Description','Source','Amount','Reference']];
        for (const r of financeVisibleEntries()) rows.push([new Date(Number(r.ts||0)*1000).toISOString().slice(0,10),r.status||'actual',r.type||'',r.category||'',r.description||r.note||'',r.source||'',r.amount||0,r.ref||'']);
        const csv=rows.map(row=>row.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n');
        const ok=await copyText(csv); toast(ok?'Finance CSV copied':'Could not copy Finance CSV',ok?'ok':'error');
    }

    function renderFinance() {
        const v = armoryBalanceBreakdown();
        const sum = financeSummary();
        const vault = sum.vault;
        const age = state.financeLastFetchedAt ? fmtDuration(Math.max(0,Math.floor((Date.now()-state.financeLastFetchedAt)/1000))) : '-';
        const expectedOc = sum.entries.filter(r=>r.category==='OC payout'&&r.status==='planned').reduce((s,r)=>s+Number(r.amount||0),0);
        const unpaidWar = sum.entries.filter(r=>r.category==='War payout'&&r.status==='planned').reduce((s,r)=>s+Number(r.amount||0),0);
        return `<div class="tfc-section"><div class="tfc-section-head"><div><div class="tfc-kicker">Faction Finance Command</div><h3 style="margin-top:4px">Operating view</h3><span class="tfc-muted" style="font-size:10px">${escapeHtml(financeWindowLabel())} · fund feed refreshed ${escapeHtml(age)} ago · local ledger is device-local</span></div><div class="tfc-toolbar"><select class="tfc-select" data-role="finance-window"><option value="7" ${Number(state.financeWindow)===7?'selected':''}>7 days</option><option value="30" ${Number(state.financeWindow)===30?'selected':''}>30 days</option><option value="90" ${Number(state.financeWindow)===90?'selected':''}>90 days</option><option value="180" ${Number(state.financeWindow)===180?'selected':''}>180 days</option><option value="0" ${Number(state.financeWindow)===0?'selected':''}>All retained</option></select><button class="tfc-btn" data-action="copy-finance-csv">Copy CSV</button><button class="tfc-btn primary" data-action="refresh-finance" ${state.financeLoading?'disabled':''}>${state.financeLoading?'Refreshing…':'Refresh Finance'}</button></div></div>
            ${state.financeError?`<div class="tfc-alert" style="margin-bottom:9px"><strong class="tfc-warn">Partial finance data</strong><span>${escapeHtml(state.financeError)}</span></div>`:''}
            <div class="tfc-finance-summary">
                ${statCard('Faction cash',v?fmtMoney(v.factionMoney):'-',v?`${fmtMoney(v.currentMoney)} member deposits kept separate`:'balance permission required')}
                ${statCard('Tracked value generated',fmtMoney(sum.generated),'valued war/OC rewards + actual manual income')}
                ${statCard('Actual expenses',fmtMoney(sum.actualExpenses),'manual / paid tracked expenses')}
                ${statCard('Planned distributions',fmtMoney(sum.planned),`${fmtMoney(unpaidWar)} war · ${fmtMoney(expectedOc)} OC`)}
                ${statCard('Outstanding liabilities',fmtMoney(sum.liabilities),'currently unpaid referral obligations')}
                ${statCard('Modelled retained',fmtMoney(sum.modelledRetained),'generated minus tracked/planned/liability outflow')}
            </div>
            <div class="tfc-history-note"><strong>Cash reconciliation:</strong> ${vault?`${fmtMoney(vault.first)} → ${fmtMoney(vault.last)} (${vault.delta>=0?'+':''}${fmtMoney(vault.delta)}) over ${vault.days}d`:'building vault history'}<br>${vault?`Actual ledger net in this window: <strong>${sum.actualLedgerNet>=0?'+':''}${fmtMoney(sum.actualLedgerNet)}</strong>. Unreconciled vault movement: <strong>${sum.reconciliation>=0?'+':''}${fmtMoney(sum.reconciliation)}</strong>.`:''}<br><span class="tfc-muted">The reconciliation difference is expected to include member-deposit movement, cache/item sales, purchases, payouts, and other cash events not yet entered as actual ledger rows. Valued war/OC rewards are intentionally not treated as verified cash receipts.</span></div>
        </div>
        ${renderFinanceManualAdd()}
        ${renderFinanceLedger()}
        <div class="tfc-finance-layout"><div>${renderFinanceFundNews()}</div><div><div class="tfc-section"><div class="tfc-section-head"><div><h3>Finance rules</h3><span class="tfc-muted" style="font-size:10px">How automatic entries are interpreted</span></div></div><div class="tfc-history-note"><strong>Ranked War:</strong> gross value comes from your payout draft valuation; payouts become Actual only after you press <em>Mark payouts paid</em> in Payouts.<br><br><strong>Organized Crime:</strong> successful money rewards are Valued income; a ${Number(state.config.financeOcMemberPercent||80)}% member share is shown as Planned, not assumed paid.<br><br><strong>Recruit referrals:</strong> unpaid referrals are Liabilities; checking Paid in Recruitment converts them to Actual expenses.<br><br><strong>Fund news:</strong> deposits/give-outs stay outside profit calculations because Torn exposes them as free-form transfer messages and member deposits are not faction revenue.</div></div></div></div>`;
    }

    function historyCutoffSec() {
        const days = Number(state.historyWindow || 0);
        return days > 0 ? nowSec() - days * 86400 : 0;
    }

    function historyWindowLabel() {
        const days = Number(state.historyWindow || 0);
        return days > 0 ? `${days} days` : 'all retained history';
    }

    function historyTsInWindow(ts) {
        const cutoff = historyCutoffSec();
        return !cutoff || Number(ts || 0) >= cutoff;
    }

    function analyticsTrim(rows) {
        const days = Math.max(30, Number(state.config.analyticsHistoryDays || 365));
        const cutoff = new Date();
        cutoff.setUTCDate(cutoff.getUTCDate() - days);
        const min = dateKey(cutoff.getTime());
        return (rows || []).filter(r => r?.d && r.d >= min).sort((a,b)=>String(a.d).localeCompare(String(b.d)));
    }

    async function recordAnalyticsSnapshot() {
        if (!state.roster.length) return;
        const b = memberBuckets();
        const vault = armoryBalanceBreakdown();
        const candidates = Object.values(state.recruitCandidates || {});
        const row = {
            d: dateKey(),
            members: Number(b.total || 0), online: Number(b.online || 0), idle: Number(b.idle || 0),
            inactive: Number(b.inactive || 0), inOc: Number(b.oc || 0), hospital: Number(b.hospital || 0), traveling: Number(b.traveling || 0),
            candidates: candidates.length, activeApps: candidates.filter(recruitIsActiveApp).length,
            unpaidReferrals: candidates.filter(c=>c.referrer && !c.referralPaid).length,
            factionMoney: vault ? Number(vault.factionMoney || 0) : null,
            memberMoney: vault ? Number(vault.currentMoney || 0) : null,
            exMoney: vault ? Number(vault.exMoney || 0) : null,
        };
        const rows = [...(state.analyticsHistory || [])];
        const idx = rows.findIndex(x=>x.d===row.d);
        if (idx >= 0) rows[idx] = { ...rows[idx], ...row }; else rows.push(row);
        state.analyticsHistory = analyticsTrim(rows);
        await Store.set('analyticsHistory', state.analyticsHistory);
    }

    function historyAnalyticsDelta(key) {
        const rows = analyticsTrim(state.analyticsHistory || []).filter(r => !Number(state.historyWindow || 0) || historyTsInWindow(Date.parse(`${r.d}T12:00:00Z`) / 1000));
        if (rows.length < 2) return null;
        const first = Number(rows[0]?.[key]);
        const last = Number(rows[rows.length-1]?.[key]);
        if (!Number.isFinite(first) || !Number.isFinite(last)) return null;
        return { first, last, delta:last-first, days:Math.max(1,Math.round((Date.parse(`${rows[rows.length-1].d}T12:00:00Z`)-Date.parse(`${rows[0].d}T12:00:00Z`))/86400000)) };
    }

    function historyDeltaHtml(delta, formatter = fmtNumber, positiveGood = true) {
        if (!delta) return '<span class="tfc-muted">building history</span>';
        const d = Number(delta.delta || 0);
        const cls = d === 0 ? 'neutral' : ((d > 0) === positiveGood ? 'good' : 'bad');
        const sign = d > 0 ? '+' : '';
        return `<span class="tfc-history-delta ${cls}">${sign}${formatter(d)} over ${delta.days}d</span>`;
    }

    function historyMemberRows() {
        const days = Number(state.historyWindow || 0);
        const rows = [];
        for (const member of state.roster || []) {
            const rec = state.memberIntel[member.id];
            if (!rec?.current) continue;
            const w = days > 0 ? calculateWindow(rec, days) : calculateWindow(rec, 'lifetime');
            if (!w) continue;
            rows.push({ member, window:w });
        }
        const metric = state.historyMemberSort || 'xanax';
        const key = metric === 'respect' ? 'respectforfaction' : metric === 'rw' ? 'rankedwarhits' : metric === 'refills' ? 'refills' : 'xantaken';
        rows.sort((a,b)=>Number(b.window?.values?.[key] ?? -1)-Number(a.window?.values?.[key] ?? -1) || String(a.member.name).localeCompare(String(b.member.name)));
        return rows;
    }

    function historyWarRows() {
        return Object.values(state.warHistory || {})
            .filter(w=>w?.warId && historyTsInWindow(Number(w.end || w.start || 0)))
            .sort((a,b)=>Number(b.end||b.start||0)-Number(a.end||a.start||0));
    }

    function historyChainRows() {
        return Object.values(state.chainReports || {})
            .filter(r=>r?.id && historyTsInWindow(Number(r.end || r.start || 0)))
            .sort((a,b)=>Number(b.end||b.start||0)-Number(a.end||a.start||0));
    }

    function historyOcRows() {
        return (state.ocHistory || []).filter(c=>historyTsInWindow(Number(c.executed_at || c.expired_at || c.created_at || 0)));
    }

    function historyRecruitStats() {
        const cutoff = historyCutoffSec();
        const candidates = Object.values(state.recruitCandidates || {});
        const firstSeen = candidates.filter(c=>!cutoff || Number(c.firstSeen||0)>=cutoff);
        let accepted = 0, rejected = 0, interested = 0;
        for (const c of candidates) {
            const transitions = Array.isArray(c.stageHistory) ? c.stageHistory.filter(h=>!cutoff || Number(h.at||0)>=cutoff) : [];
            if (transitions.some(h=>h.status==='Accepted')) accepted++;
            if (transitions.some(h=>h.status==='Rejected')) rejected++;
            if (transitions.some(h=>['Interested','Trial'].includes(h.status))) interested++;
        }
        return { firstSeen:firstSeen.length, accepted, rejected, interested, activeApps:candidates.filter(recruitIsActiveApp).length, unpaid:candidates.filter(c=>c.referrer&&!c.referralPaid).length };
    }

    function historyPayoutStats(wars) {
        let gross=0, pool=0, retained=0, paid=0, valued=0;
        for (const war of wars) {
            const draft = state.payoutDrafts?.[String(war.warId)];
            if (!draft || Number(draft.grossValue||0)<=0) continue;
            const calc = computePayout(String(war.warId));
            gross += Number(calc.gross||0); pool += Number(calc.pool||0); retained += Number(calc.factionRetained||0); paid += Number(calc.totalFinal||0); valued++;
        }
        return { gross,pool,retained,paid,valued };
    }

    function historyWarContributorRows(wars) {
        const map = new Map();
        for (const w of wars) {
            for (const p of w.performance || w.participants || []) {
                const id = String(p.id||''); if (!id) continue;
                const row = map.get(id) || { id:p.id, name:p.name||chainMemberName(p.id), wars:0, hits:0, respect:0, assists:0 };
                row.wars++; row.hits += Number(p.scoringHits ?? p.hits ?? 0); row.respect += Number(p.respect||0); row.assists += Number(p.assists||0); map.set(id,row);
            }
        }
        return [...map.values()].sort((a,b)=>b.hits-a.hits || b.respect-a.respect).slice(0,10);
    }

    function historyChainContributorRows(chains) {
        const map = new Map();
        for (const report of chains) {
            for (const p of chainReportRows(report)) {
                const id = String(p.id||''); if (!id) continue;
                const row = map.get(id) || { id:p.id, name:p.name, chains:0, attacks:0, respect:0, bonuses:0 };
                row.chains++; row.attacks += Number(p.attacks||0); row.respect += Number(p.respect||0); row.bonuses += Number(p.bonuses||0); map.set(id,row);
            }
        }
        return [...map.values()].sort((a,b)=>b.attacks-a.attacks || b.respect-a.respect).slice(0,10);
    }

    function renderHistoryMembers(memberRows) {
        const days = Number(state.historyWindow || 0);
        const body = memberRows.slice(0,25).map(({member:m,window:w},i)=>{
            const v=w.values||{}, r=w.rates||{};
            return `<tr><td>${i+1}</td><td><div class="tfc-member"><a href="https://www.torn.com/profiles.php?XID=${m.id}" target="_blank" rel="noopener">${escapeHtml(m.name)}</a><span class="tfc-id">[${m.id}]</span></div></td><td>${fmtNumber(v.xantaken)}</td><td>${days?fmtRate(r.xantaken,2):'-'}</td><td>${fmtNumber(v.refills)}</td><td>${fmtNumber(v.rankedwarhits)}</td><td>${fmtRate(v.respectforfaction,2)}</td><td>${fmtNumber(v.energydrinkused)}</td><td>${fmtNumber(v.revives)}</td><td>${w.days?`${w.days}d`:'lifetime'}</td></tr>`;
        }).join('');
        return `<div class="tfc-section"><div class="tfc-section-head"><div><h3>Member trends</h3><span class="tfc-muted" style="font-size:10px">Top 25 with a usable ${escapeHtml(historyWindowLabel())} baseline · faction-level RW/respect can predate membership for very new recruits in lifetime mode.</span></div><select class="tfc-select" data-role="history-member-sort"><option value="xanax" ${state.historyMemberSort==='xanax'?'selected':''}>Sort: Xanax</option><option value="rw" ${state.historyMemberSort==='rw'?'selected':''}>Sort: RW hits</option><option value="respect" ${state.historyMemberSort==='respect'?'selected':''}>Sort: Respect</option><option value="refills" ${state.historyMemberSort==='refills'?'selected':''}>Sort: Refills</option></select></div><div style="overflow:auto"><table class="tfc-table tfc-history-table"><thead><tr><th>#</th><th>Member</th><th>Xanax</th><th>Xanax/day</th><th>Refills</th><th>RW hits</th><th>Faction respect</th><th>Energy drinks</th><th>Revives</th><th>Coverage</th></tr></thead><tbody>${body||`<tr><td colspan="10" class="tfc-muted">No member baselines cover this window yet. Daily snapshots will improve longer windows over time.</td></tr>`}</tbody></table></div></div>`;
    }

    function renderHistoryWars(wars, payout) {
        const top = historyWarContributorRows(wars);
        const table = wars.slice(0,20).map(w=>{
            const d=state.payoutDrafts?.[String(w.warId)]; const calc=d&&Number(d.grossValue||0)>0?computePayout(String(w.warId)):null;
            const ended=Number(w.end||0)>0; const result=ended?(Number(w.ourScore||0)>Number(w.enemyScore||0)?'<span class="tfc-good">W</span>':Number(w.ourScore||0)<Number(w.enemyScore||0)?'<span class="tfc-bad">L</span>':'T'):'-';
            return `<tr><td>${fmtDateTime(w.end||w.start)}</td><td>${escapeHtml(w.opponentName||`#${w.opponentId||''}`)}</td><td>${result}</td><td>${fmtNumber(w.ourScore)} - ${fmtNumber(w.enemyScore)}</td><td>${fmtNumber(w.scoringHits||0)}</td><td>${fmtRate(w.respect||0,2)}</td><td>${fmtNumber((w.performance||w.participants||[]).length)}</td><td>${calc?fmtMoney(calc.gross):'-'}</td><td>${calc?fmtMoney(calc.totalFinal):'-'}</td></tr>`;
        }).join('');
        return `<div class="tfc-history-layout"><div class="tfc-section"><div class="tfc-section-head"><div><h3>Ranked War history</h3><span class="tfc-muted" style="font-size:10px">Stored wars inside ${escapeHtml(historyWindowLabel())}.</span></div></div><div style="overflow:auto"><table class="tfc-table tfc-history-table"><thead><tr><th>Date</th><th>Opponent</th><th>Result</th><th>Score</th><th>Hits</th><th>Respect</th><th>Participants</th><th>Gross value</th><th>Calculated payouts</th></tr></thead><tbody>${table||`<tr><td colspan="9" class="tfc-muted">No retained wars in this window.</td></tr>`}</tbody></table></div></div><div class="tfc-section"><div class="tfc-section-head"><div><h3>War contributors</h3><span class="tfc-muted" style="font-size:10px">Across retained reports in this window.</span></div></div>${top.length?top.map((r,i)=>`<div class="tfc-armory-loan"><div><strong>${i+1}. ${escapeHtml(r.name)}</strong><div class="tfc-muted">${r.wars} war${r.wars===1?'':'s'} · ${fmtNumber(r.assists)} assists</div></div><div style="text-align:right"><strong>${fmtNumber(r.hits)} hits</strong><div class="tfc-muted">${fmtRate(r.respect,2)} respect</div></div></div>`).join(''):'<div class="tfc-muted" style="font-size:10px">No stored contributor data.</div>'}<div class="tfc-history-note" style="margin-top:10px"><strong>Payout valuation</strong><br>${payout.valued} of ${wars.length} retained war${wars.length===1?'':'s'} have a gross value entered.<br>Gross: <strong>${fmtMoney(payout.gross)}</strong> · Member pool: <strong>${fmtMoney(payout.pool)}</strong> · Faction retained: <strong>${fmtMoney(payout.retained)}</strong>.</div></div></div>`;
    }

    function renderHistoryChains(chains) {
        const top=historyChainContributorRows(chains);
        const totalHits=chains.reduce((s,r)=>s+Number(r.details?.chain||r.details?.attacks||0),0);
        const totalRespect=chains.reduce((s,r)=>s+Number(r.details?.respect||0),0);
        return `<div class="tfc-history-layout"><div class="tfc-section"><div class="tfc-section-head"><div><h3>Chain history</h3><span class="tfc-muted" style="font-size:10px">${chains.length} retained reports · ${fmtNumber(totalHits)} reported hits · ${fmtRate(totalRespect,2)} respect.</span></div></div><div style="overflow:auto"><table class="tfc-table"><thead><tr><th>Date</th><th>Chain</th><th>Hits</th><th>Respect</th><th>Contributors</th><th>Bonuses</th></tr></thead><tbody>${chains.map(r=>`<tr><td>${fmtDateTime(r.end||r.start)}</td><td>#${r.id}</td><td>${fmtNumber(r.details?.chain||r.details?.attacks||0)}</td><td>${fmtRate(r.details?.respect||0,2)}</td><td>${fmtNumber(chainReportRows(r).filter(x=>x.attacks>0).length)}</td><td>${fmtNumber((r.bonuses||[]).length)}</td></tr>`).join('')||`<tr><td colspan="6" class="tfc-muted">No retained chain reports in this window.</td></tr>`}</tbody></table></div></div><div class="tfc-section"><div class="tfc-section-head"><div><h3>Chain contributors</h3><span class="tfc-muted" style="font-size:10px">Top contributors across retained reports.</span></div></div>${top.length?top.map((r,i)=>`<div class="tfc-armory-loan"><div><strong>${i+1}. ${escapeHtml(r.name)}</strong><div class="tfc-muted">${r.chains} chain${r.chains===1?'':'s'} · ${fmtNumber(r.bonuses)} bonus hits</div></div><div style="text-align:right"><strong>${fmtNumber(r.attacks)} attacks</strong><div class="tfc-muted">${fmtRate(r.respect,2)} respect</div></div></div>`).join(''):'<div class="tfc-muted" style="font-size:10px">No stored contributor data.</div>'}</div></div>`;
    }

    function renderHistoryOcRecruitVault(ocs, recruit) {
        const success=ocs.filter(c=>String(c.status).toLowerCase()==='successful').length;
        const failure=ocs.filter(c=>String(c.status).toLowerCase()==='failure').length;
        const resolved=success+failure;
        const money=ocs.reduce((s,c)=>s+Number(c.rewards?.money||0),0);
        const respect=ocs.reduce((s,c)=>s+Number(c.rewards?.respect||0),0);
        const factionDelta=historyAnalyticsDelta('factionMoney');
        const memberDelta=historyAnalyticsDelta('members');
        const ocRows=[...ocs].sort((a,b)=>Number(b.executed_at||b.expired_at||0)-Number(a.executed_at||a.expired_at||0)).slice(0,12);
        return `<div class="tfc-history-layout"><div class="tfc-section"><div class="tfc-section-head"><div><h3>Organized Crime history</h3><span class="tfc-muted" style="font-size:10px">Completed crimes retained by OC Command.</span></div></div><div class="tfc-grid">${statCard('Completed OCs',fmtNumber(ocs.length),`${success} successful · ${failure} failed`)}${statCard('Success rate',resolved?`${Math.round(success/resolved*100)}%`:'-',`${resolved} resolved crimes`)}${statCard('OC money',fmtMoney(money),'recorded successful rewards')}${statCard('OC respect',fmtRate(respect,2),'recorded rewards')}</div><div style="overflow:auto;margin-top:9px"><table class="tfc-table"><thead><tr><th>Date</th><th>Crime</th><th>Difficulty</th><th>Status</th><th>Money</th><th>Respect</th></tr></thead><tbody>${ocRows.map(c=>`<tr><td>${fmtDateTime(c.executed_at||c.expired_at||c.created_at)}</td><td>${escapeHtml(c.name||`#${c.id}`)}</td><td>${fmtNumber(c.difficulty||0)}</td><td><span class="${ocStatusClass(c.status)}">${escapeHtml(c.status||'-')}</span></td><td>${c.rewards?fmtMoney(c.rewards.money||0):'-'}</td><td>${c.rewards?fmtRate(c.rewards.respect||0,2):'-'}</td></tr>`).join('')||`<tr><td colspan="6" class="tfc-muted">No retained OC history in this window.</td></tr>`}</tbody></table></div></div><div><div class="tfc-section"><div class="tfc-section-head"><div><h3>Recruitment analytics</h3><span class="tfc-muted" style="font-size:10px">Stage-transition history begins in v0.10; older candidates still contribute first-seen/current-state data.</span></div></div><div class="tfc-grid">${statCard('New candidates',recruit.firstSeen,historyWindowLabel())}${statCard('Accepted moves',recruit.accepted,'recorded stage transitions')}${statCard('Interested / Trial',recruit.interested,'recorded transitions')}${statCard('Active applications',recruit.activeApps,'current')}${statCard('Unpaid referrals',recruit.unpaid,'current')}</div></div><div class="tfc-section"><div class="tfc-section-head"><div><h3>Faction / vault trend</h3><span class="tfc-muted" style="font-size:10px">One compact daily snapshot. Trends begin once v0.10 has multiple days of observations.</span></div></div><div class="tfc-history-note"><strong>Members:</strong> ${memberDelta?`${fmtNumber(memberDelta.first)} → ${fmtNumber(memberDelta.last)}`:'building history'}<br>${historyDeltaHtml(memberDelta,fmtNumber,true)}<br><br><strong>Faction cash:</strong> ${factionDelta?`${fmtMoney(factionDelta.first)} → ${fmtMoney(factionDelta.last)}`:'building history'}<br>${historyDeltaHtml(factionDelta,fmtMoney,true)}</div></div></div></div>`;
    }

    async function copyHistoryCsv() {
        const days=Number(state.historyWindow||0);
        const rows=[['Section','Date/Member','Metric','Value','Extra']];
        for (const {member:m,window:w} of historyMemberRows()) {
            const v=w.values||{};
            rows.push(['Member',m.name,'Xanax',v.xantaken??'',m.id]);
            rows.push(['Member',m.name,'RW Hits',v.rankedwarhits??'',m.id]);
            rows.push(['Member',m.name,'Faction Respect',v.respectforfaction??'',m.id]);
        }
        for (const w of historyWarRows()) rows.push(['War',fmtDateTime(w.end||w.start),w.opponentName||w.opponentId,`${w.ourScore||0}-${w.enemyScore||0}`,w.warId]);
        for (const c of historyChainRows()) rows.push(['Chain',fmtDateTime(c.end||c.start),`Chain #${c.id}`,c.details?.chain||c.details?.attacks||0,c.details?.respect||0]);
        for (const c of historyOcRows()) rows.push(['OC',fmtDateTime(c.executed_at||c.expired_at||c.created_at),c.name||c.id,c.status||'',c.rewards?.money||0]);
        const csv=rows.map(row=>row.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n');
        const ok=await copyText(csv); toast(ok?`History CSV copied (${days||'all'}d window)`:'Could not copy History CSV',ok?'ok':'error');
    }

    function renderHistory() {
        const days=Number(state.historyWindow||0);
        const memberRows=historyMemberRows();
        const wars=historyWarRows();
        const chains=historyChainRows();
        const ocs=historyOcRows();
        const recruit=historyRecruitStats();
        const payout=historyPayoutStats(wars);
        const agg=days>0?aggregateWindow(days):null;
        const memberCoverage=days>0?`${memberRows.length}/${state.roster.length}`:`${memberRows.length} lifetime records`;
        const warHits=wars.reduce((s,w)=>s+Number(w.scoringHits||0),0);
        const chainHits=chains.reduce((s,r)=>s+Number(r.details?.chain||r.details?.attacks||0),0);
        const ocSuccess=ocs.filter(c=>String(c.status).toLowerCase()==='successful').length;
        return `<div class="tfc-section"><div class="tfc-section-head"><div><div class="tfc-kicker">History + Analytics Command</div><h3 style="margin-top:4px">Faction intelligence over time</h3><span class="tfc-muted" style="font-size:10px">Analytics are local to this device and respect each module's retention limit.</span></div><div class="tfc-toolbar"><select class="tfc-select" data-role="history-window"><option value="7" ${days===7?'selected':''}>7 days</option><option value="30" ${days===30?'selected':''}>30 days</option><option value="90" ${days===90?'selected':''}>90 days</option><option value="180" ${days===180?'selected':''}>180 days</option><option value="0" ${days===0?'selected':''}>All retained</option></select><button class="tfc-btn" data-action="record-analytics">Snapshot today</button><button class="tfc-btn" data-action="copy-history-csv">Copy CSV</button></div></div><div class="tfc-history-summary">${statCard('Member coverage',memberCoverage,days>0?'usable personal-stat baselines':'current lifetime counters')}${statCard('Xanax',days>0?fmtNumber(agg?.totals?.xantaken||0):'-',days>0?historyWindowLabel():'select a dated window')}${statCard('RW hits',days>0?fmtNumber(agg?.totals?.rankedwarhits||0):fmtNumber(warHits),days>0?'member personal-stat deltas':'retained war reports')}${statCard('Tracked wars',fmtNumber(wars.length),`${fmtNumber(warHits)} scoring hits`)}${statCard('Tracked chains',fmtNumber(chains.length),`${fmtNumber(chainHits)} report hits`)}${statCard('Successful OCs',fmtNumber(ocSuccess),`${fmtNumber(ocs.length)} completed tracked`)}</div><div class="tfc-history-note"><strong>Coverage matters.</strong> Member 7/30-day figures can use Torn historical backfills. Longer windows only become complete after TFC has stored enough daily snapshots. War, chain, OC, recruitment and vault analytics are bounded by their individual retention settings, so this screen never claims to be a complete lifetime ledger.</div></div>${renderHistoryMembers(memberRows)}${renderHistoryWars(wars,payout)}${renderHistoryChains(chains)}${renderHistoryOcRecruitVault(ocs,recruit)}`;
    }

    function renderSettings() {
        return `
            <div class="tfc-settings">
                <div class="tfc-kicker">Core configuration</div>
                <h3 style="color:#fff;margin:5px 0 14px;font-size:16px">Settings</h3>
                <div class="tfc-setting">
                    <label>Torn API key</label>
                    <input class="tfc-input" data-setting="apiKey" type="password" autocomplete="off" placeholder="Paste a Public / Custom / Limited key" value="${escapeHtml(state.config.apiKey || '')}">
                    <p>Version ${APP.version} keeps Member Intelligence, war status, payouts, Chain Command, OC, Recruitment, Finance, and History Analytics on their existing access levels. Armory inventory and faction vault balances require Limited access; vault balances also require faction API permission. Exact faction attack logs still require Limited/Full access with Faction API Access, or a Custom key containing faction attacks. The key is stored locally by the userscript and sent only to api.torn.com.</p>
                </div>
                <div class="tfc-inline">
                    <div class="tfc-setting">
                        <label>Inactive alert threshold</label>
                        <select class="tfc-select" data-setting="inactivityHours">
                            ${[12,24,36,48,72,168].map(v => `<option value="${v}" ${Number(state.config.inactivityHours) === v ? 'selected' : ''}>${v < 168 ? `${v} hours` : '7 days'}</option>`).join('')}
                        </select>
                    </div>
                    <div class="tfc-setting">
                        <label>Member intel cache</label>
                        <select class="tfc-select" data-setting="intelCacheHours">
                            ${[3,6,12,24].map(v => `<option value="${v}" ${Number(state.config.intelCacheHours) === v ? 'selected' : ''}>${v} hours</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="tfc-inline">
                    <div class="tfc-setting">
                        <label>History retention</label>
                        <select class="tfc-select" data-setting="historyDays">
                            ${[30,60,90,120,180,365].map(v => `<option value="${v}" ${Number(state.config.historyDays) === v ? 'selected' : ''}>${v} days</option>`).join('')}
                        </select>
                        <p>One snapshot per member per UTC day, so storage stays bounded.</p>
                    </div>
                    <div class="tfc-setting">
                        <label>Panel width</label>
                        <select class="tfc-select" data-setting="panelWidth">
                            ${[900,1040,1180,1320].map(v => `<option value="${v}" ${Number(state.config.panelWidth) === v ? 'selected' : ''}>${v}px</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="tfc-inline">
                    <div class="tfc-setting">
                        <label>War auto refresh</label>
                        <select class="tfc-select" data-setting="warAutoRefreshSeconds">
                            ${[0,15,30,60].map(v => `<option value="${v}" ${Number(state.config.warAutoRefreshSeconds) === v ? 'selected' : ''}>${v ? `${v} seconds` : 'Off'}</option>`).join('')}
                        </select>
                        <p>Only runs while War Command is open.</p>
                    </div>
                    <div class="tfc-setting">
                        <label>Hospital soon window</label>
                        <select class="tfc-select" data-setting="warHospitalSoonMinutes">
                            ${[5,10,15,20,30].map(v => `<option value="${v}" ${Number(state.config.warHospitalSoonMinutes) === v ? 'selected' : ''}>${v} minutes</option>`).join('')}
                        </select>
                    </div>
                    <div class="tfc-setting">
                        <label>Recently released window</label>
                        <select class="tfc-select" data-setting="warRecentReleaseMinutes">
                            ${[5,10,15,20,30].map(v => `<option value="${v}" ${Number(state.config.warRecentReleaseMinutes) === v ? 'selected' : ''}>${v} minutes</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="tfc-section" style="margin-top:8px">
                    <div class="tfc-section-head"><div><h3>Chain Command</h3><span class="tfc-muted" style="font-size:10px">Live timer, danger thresholds, coverage, and report history.</span></div></div>
                    <div class="tfc-inline">
                        <div class="tfc-setting"><label>Chain auto-refresh</label><select class="tfc-select" data-setting="chainAutoRefreshSeconds">${[0,15,30,60].map(v=>`<option value="${v}" ${Number(state.config.chainAutoRefreshSeconds)===v?'selected':''}>${v?`${v} seconds`:'Off'}</option>`).join('')}</select></div>
                        <div class="tfc-setting"><label>Danger threshold</label><select class="tfc-select" data-setting="chainDangerSeconds">${[60,90,120,150,180].map(v=>`<option value="${v}" ${Number(state.config.chainDangerSeconds)===v?'selected':''}>${v} seconds</option>`).join('')}</select></div>
                        <div class="tfc-setting"><label>Warning threshold</label><select class="tfc-select" data-setting="chainWarningSeconds">${[180,210,240,270,300].map(v=>`<option value="${v}" ${Number(state.config.chainWarningSeconds)===v?'selected':''}>${v} seconds</option>`).join('')}</select></div>
                        <div class="tfc-setting"><label>Coverage window</label><select class="tfc-select" data-setting="chainCoverageHours">${[12,24,36,48].map(v=>`<option value="${v}" ${Number(state.config.chainCoverageHours)===v?'selected':''}>${v} hours</option>`).join('')}</select></div>
                    </div>
                </div>
                <div class="tfc-section" style="margin-top:8px">
                    <div class="tfc-section-head"><div><h3>OC Command</h3><span class="tfc-muted" style="font-size:10px">Refresh cadence, CPR alerts, and bounded completed-crime history.</span></div></div>
                    <div class="tfc-inline">
                        <div class="tfc-setting"><label>OC auto-refresh</label><select class="tfc-select" data-setting="ocAutoRefreshSeconds">${[0,30,60,120,300].map(v=>`<option value="${v}" ${Number(state.config.ocAutoRefreshSeconds)===v?'selected':''}>${v?`${v} seconds`:'Off'}</option>`).join('')}</select></div>
                        <div class="tfc-setting"><label>Low CPR alert</label><select class="tfc-select" data-setting="ocLowCprThreshold">${[50,60,65,70,75,80,85,90].map(v=>`<option value="${v}" ${Number(state.config.ocLowCprThreshold)===v?'selected':''}>Below ${v}%</option>`).join('')}</select></div>
                        <div class="tfc-setting"><label>Completed OC history</label><select class="tfc-select" data-setting="ocHistoryLimit">${[100,150,250,400,500].map(v=>`<option value="${v}" ${Number(state.config.ocHistoryLimit)===v?'selected':''}>${v} crimes</option>`).join('')}</select></div>
                    </div>
                </div>
                <div class="tfc-section" style="margin-top:8px">
                    <div class="tfc-section-head"><div><h3>Recruitment Command</h3><span class="tfc-muted" style="font-size:10px">Candidate intel cache, retained pipeline size, and referral defaults.</span></div></div>
                    <div class="tfc-inline">
                        <div class="tfc-setting"><label>Candidate intel cache</label><select class="tfc-select" data-setting="recruitIntelCacheHours">${[6,12,24,48,72].map(v=>`<option value="${v}" ${Number(state.config.recruitIntelCacheHours)===v?'selected':''}>${v} hours</option>`).join('')}</select></div>
                        <div class="tfc-setting"><label>Candidate history cap</label><select class="tfc-select" data-setting="recruitHistoryLimit">${[250,500,1000,1500,2000].map(v=>`<option value="${v}" ${Number(state.config.recruitHistoryLimit)===v?'selected':''}>${v} candidates</option>`).join('')}</select></div>
                        <div class="tfc-setting"><label>Default referral payout</label><input class="tfc-input" data-setting="recruitReferralDefaultAmount" type="number" min="0" step="1000000" value="${Number(state.config.recruitReferralDefaultAmount||0)}"></div>
                    </div>
                </div>
                <div class="tfc-section" style="margin-top:8px">
                    <div class="tfc-section-head"><div><h3>Armory & Vault Command</h3><span class="tfc-muted" style="font-size:10px">Torn caches faction inventory server-side for one hour; local settings avoid redundant refresh work.</span></div></div>
                    <div class="tfc-inline">
                        <div class="tfc-setting"><label>Inventory local cache</label><select class="tfc-select" data-setting="armoryInventoryCacheMinutes">${[30,60,90,120].map(v=>`<option value="${v}" ${Number(state.config.armoryInventoryCacheMinutes)===v?'selected':''}>${v} minutes</option>`).join('')}</select></div>
                        <div class="tfc-setting"><label>Armory news lookback</label><select class="tfc-select" data-setting="armoryNewsDays">${[1,3,7,14,30].map(v=>`<option value="${v}" ${Number(state.config.armoryNewsDays)===v?'selected':''}>${v} day${v===1?'':'s'} (max 100 rows)</option>`).join('')}</select></div>
                        <div class="tfc-setting"><label>Vault history retention</label><select class="tfc-select" data-setting="armoryHistoryDays">${[30,60,90,180,365].map(v=>`<option value="${v}" ${Number(state.config.armoryHistoryDays)===v?'selected':''}>${v} days</option>`).join('')}</select></div>
                        <div class="tfc-setting"><label>Analytics daily history</label><select class="tfc-select" data-setting="analyticsHistoryDays">${[90,180,365,730].map(v=>`<option value="${v}" ${Number(state.config.analyticsHistoryDays)===v?'selected':''}>${v} days</option>`).join('')}</select></div>
                    </div>
                </div>
                <div class="tfc-section" style="margin-top:8px">
                    <div class="tfc-section-head"><div><h3>Faction Finance Command</h3><span class="tfc-muted" style="font-size:10px">Fund-news lookback, local-ledger storage, and OC distribution modeling.</span></div></div>
                    <div class="tfc-inline">
                        <div class="tfc-setting"><label>Fund-news lookback</label><select class="tfc-select" data-setting="financeNewsDays">${[7,14,30,60,90].map(v=>`<option value="${v}" ${Number(state.config.financeNewsDays)===v?'selected':''}>${v} days</option>`).join('')}</select></div>
                        <div class="tfc-setting"><label>Manual ledger cap</label><select class="tfc-select" data-setting="financeManualLimit">${[500,1000,2000,3000,5000].map(v=>`<option value="${v}" ${Number(state.config.financeManualLimit)===v?'selected':''}>${v} entries</option>`).join('')}</select></div>
                        <div class="tfc-setting"><label>Default OC member share</label><select class="tfc-select" data-setting="financeOcMemberPercent">${[50,60,70,75,80,85,90,95,100].map(v=>`<option value="${v}" ${Number(state.config.financeOcMemberPercent)===v?'selected':''}>${v}%</option>`).join('')}</select><p>Finance models this as planned until an actual payout is recorded.</p></div>
                    </div>
                </div>
                <div class="tfc-section" style="margin-top:8px">
                    <div class="tfc-section-head"><div><h3>Default war payout preset</h3><span class="tfc-muted" style="font-size:10px">New war drafts start with these values. Existing drafts keep their own rules.</span></div></div>
                    <div class="tfc-inline">
                        <div class="tfc-setting"><label>Member share</label><select class="tfc-select" data-setting="payoutDefaultMemberPercent">${[50,60,70,75,80,85,90,95,100].map(v=>`<option value="${v}" ${Number(state.config.payoutDefaultMemberPercent)===v?'selected':''}>${v}%</option>`).join('')}</select></div>
                        <div class="tfc-setting"><label>Basis</label><select class="tfc-select" data-setting="payoutDefaultMode"><option value="hits" ${state.config.payoutDefaultMode==='hits'?'selected':''}>Eligible hits</option><option value="respect" ${state.config.payoutDefaultMode==='respect'?'selected':''}>Eligible respect</option><option value="hybrid" ${state.config.payoutDefaultMode==='hybrid'?'selected':''}>Hybrid</option></select></div>
                        <div class="tfc-setting"><label>Assist weight</label><select class="tfc-select" data-setting="payoutDefaultAssistWeight">${[0,.25,.5,.75,1].map(v=>`<option value="${v}" ${Number(state.config.payoutDefaultAssistWeight)===v?'selected':''}>${v===0?'Excluded':v}</option>`).join('')}</select></div>
                        <div class="tfc-setting"><label>Round to</label><select class="tfc-select" data-setting="payoutDefaultRoundTo">${[1,1000,10000,100000,1000000].map(v=>`<option value="${v}" ${Number(state.config.payoutDefaultRoundTo)===v?'selected':''}>${v===1?'$1':fmtMoney(v)}</option>`).join('')}</select></div>
                    </div>
                </div>
                <div class="tfc-setting">
                    <label>Leadership timeline retention</label><select class="tfc-select" data-setting="leadershipEventLimit">${[60,120,200,300].map(v=>`<option value="${v}" ${Number(state.config.leadershipEventLimit)===v?'selected':''}>${v} entries per member</option>`).join('')}</select><p>Warnings, notes, commendations and follow-ups are bounded per member. Position history has a separate compact cap.</p>
                </div>
                <div class="tfc-setting">
                    <label style="display:flex;align-items:center;gap:8px"><input type="checkbox" data-setting="compactRows" ${state.config.compactRows ? 'checked' : ''}> Compact member rows</label>
                </div>
                <div class="tfc-toolbar">
                    <button class="tfc-btn primary" data-action="save-settings">Save settings</button>
                    <button class="tfc-btn" data-action="test-key">Test API key</button>
                    <button class="tfc-btn danger" data-action="clear-intel">Clear cached member intel</button>
                </div>
                <div class="tfc-card" style="margin-top:14px">
                    <div class="tfc-section-head">
                        <div>
                            <div class="tfc-kicker">Updates</div>
                            <h3 style="margin:4px 0 0">GitHub auto-update</h3>
                        </div>
                        <span class="tfc-pill ${state.updateInfo.error ? 'bad' : (state.updateInfo.latest && compareVersions(state.updateInfo.latest, APP.version) > 0 ? 'warn' : 'good')}">${state.updateInfo.checking ? 'Checking…' : (state.updateInfo.error ? 'Check failed' : (state.updateInfo.latest ? (compareVersions(state.updateInfo.latest, APP.version) > 0 ? 'Update available' : 'Up to date') : 'Ready'))}</span>
                    </div>
                    <div class="tfc-muted" style="font-size:11px;line-height:1.55;margin-top:8px">
                        Installed: <strong style="color:#fff">v${APP.version}</strong>${state.updateInfo.latest ? ` · Latest: <strong style="color:#fff">v${escapeHtml(state.updateInfo.latest)}</strong>` : ''}. Tampermonkey checks the GitHub metadata URL automatically; TornPDA can update from the same stable script URL.
                    </div>
                    ${state.updateInfo.error ? `<div class="tfc-alert bad" style="margin-top:10px">${escapeHtml(state.updateInfo.error)}</div>` : ''}
                    <div class="tfc-toolbar" style="margin-top:10px">
                        <button class="tfc-btn" data-action="check-updates" ${state.updateInfo.checking ? 'disabled' : ''}>${state.updateInfo.checking ? 'Checking…' : 'Check for updates'}</button>
                        ${state.updateInfo.latest && compareVersions(state.updateInfo.latest, APP.version) > 0 ? '<button class="tfc-btn primary" data-action="open-update">Install update</button>' : ''}
                        <button class="tfc-btn" data-action="open-repo">Open GitHub</button>
                    </div>
                </div>
                <div class="tfc-card" style="margin-top:14px">
                    <div class="tfc-kicker">API discipline</div>
                    <div class="tfc-muted" style="font-size:10px;line-height:1.5;margin-top:5px">Roster refreshes are cheap single requests. Member intelligence goes through one shared queue at roughly 85 requests per minute and is cached. This keeps the whole future suite from creating independent API request storms.</div>
                </div>
            </div>
        `;
    }

    function bindUiEvents(panel) {
        $$('[data-action]', panel).forEach(el => el.addEventListener('click', async () => {
            const action = el.dataset.action;
            if (action === 'close') return closePanel();
            if (action === 'go-settings') { state.activeTab = 'settings'; return render(); }
            if (action === 'refresh-command') return refreshCommandCenter(true);
            if (action === 'refresh-roster') return refreshRoster(true);
            if (action === 'refresh-war') return refreshWar(true);
            if (action === 'refresh-chain') return refreshChain(true);
            if (action === 'refresh-oc') return refreshOC(true);
            if (action === 'refresh-recruit') return refreshRecruit(true);
            if (action === 'refresh-armory') return refreshArmory(true);
            if (action === 'refresh-finance') return refreshFinance(true);
            if (action === 'add-finance-entry') return addFinanceManualEntry();
            if (action === 'copy-finance-csv') return copyFinanceCsv();
            if (action === 'apply-armory-category-min') return applyArmoryCategoryMinimum();
            if (action === 'copy-armory-loans') return copyArmoryLoansCsv();
            if (action === 'copy-armory-shortages') return copyArmoryShortagesCsv();
            if (action === 'record-analytics') { await recordAnalyticsSnapshot(); toast('Today\'s analytics snapshot saved'); return render(); }
            if (action === 'copy-history-csv') return copyHistoryCsv();
            if (action === 'copy-leadership-csv') return copyLeadershipCsv();
            if (action === 'add-recruit-candidate') return addRecruitCandidateFromUi();
            if (action === 'copy-recruit-csv') return copyRecruitCsv();
            if (action === 'add-chain-assignment') return addChainAssignment();
            if (action === 'sync-war-attacks') {
                await syncWarAttacks(true, true);
                await updateWarHistorySummary();
                if (state.warAttackAccess === 'ok') toast(`Tracked ${state.warAttacks.length} war attacks`);
                else toast(state.warAttackError || 'Attack tracking is not available with this key', 'error');
                return render();
            }
            if (action === 'sync-intel') return syncMemberIntel();
            if (action === 'save-payout') { const id=selectedPayoutWarId(); await savePayoutDraft(id,payoutDraft(id)); return render(); }
            if (action === 'copy-payout-csv') return copyPayoutCsv();
            if (action === 'toggle-payout-paid') { const id=selectedPayoutWarId(); if (!id) return; const d=payoutDraft(id); d.paidAt=d.paidAt?0:nowSec(); await savePayoutDraft(id,d,true); toast(d.paidAt?'War payouts marked paid':'War payouts marked unpaid'); return render(); }
            if (action === 'reset-payout-adjustments') { const id=selectedPayoutWarId(); const d=payoutDraft(id); d.adjustments={}; d.excluded={}; d.notes={}; await savePayoutDraft(id,d,true); toast('Payout adjustments reset'); return render(); }
            if (action === 'save-settings') return saveSettingsFromUi();
            if (action === 'test-key') return testApiKey();
            if (action === 'check-updates') return checkForUpdates(true);
            if (action === 'open-update') return openTfcUpdate();
            if (action === 'open-repo') return openTfcRepo();
            if (action === 'clear-intel') return clearIntel();
        }));

        $$('[data-command-tab]', panel).forEach(el => el.addEventListener('click', () => {
            const tab = el.dataset.commandTab;
            if (!tab) return;
            state.activeTab = tab;
            state.config.startTab = tab;
            saveConfig();
            render();
            if (['war','payout'].includes(tab)) refreshWar(false, true);
            if (tab === 'chain') refreshChain(false, true);
            if (tab === 'oc') refreshOC(false, true);
            if (tab === 'recruit') refreshRecruit(false, true);
            if (tab === 'armory') refreshArmory(false, true);
            if (tab === 'finance') refreshFinance(false, true);
            if (tab === 'history') recordAnalyticsSnapshot();
        }));

        $$('[data-tab]', panel).forEach(el => el.addEventListener('click', () => {
            if (el.disabled) return;
            state.activeTab = el.dataset.tab;
            state.config.startTab = state.activeTab;
            saveConfig();
            render();
            if (['war','payout'].includes(state.activeTab)) refreshWar(false, true);
            if (state.activeTab === 'chain') refreshChain(false, true);
            if (state.activeTab === 'oc') refreshOC(false, true);
            if (state.activeTab === 'recruit') refreshRecruit(false, true);
            if (state.activeTab === 'armory') refreshArmory(false, true);
            if (state.activeTab === 'finance') refreshFinance(false, true);
            if (state.activeTab === 'history') recordAnalyticsSnapshot();
        }));

        const historyWindow = $('[data-role="history-window"]', panel);
        if (historyWindow) historyWindow.addEventListener('change', e => { state.historyWindow = Number(e.target.value); render(); });
        const historyMemberSort = $('[data-role="history-member-sort"]', panel);
        if (historyMemberSort) historyMemberSort.addEventListener('change', e => { state.historyMemberSort = e.target.value; render(); });

        const search = $('[data-role="member-search"]', panel);
        if (search) search.addEventListener('input', e => {
            state.search = e.target.value;
            render();
            const input = $('[data-role="member-search"]', $('#tfc-panel'));
            if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
        });

        const filter = $('[data-role="status-filter"]', panel);
        if (filter) filter.addEventListener('change', e => {
            state.statusFilter = e.target.value;
            render();
        });

        const leadershipTagFilter = $('[data-role="leadership-tag-filter"]', panel);
        if (leadershipTagFilter) leadershipTagFilter.addEventListener('change', e => { state.leadershipTagFilter = e.target.value; render(); });

        const metricWindow = $('[data-role="metric-window"]', panel);
        if (metricWindow) metricWindow.addEventListener('change', e => {
            state.memberMetricWindow = Number(e.target.value);
            state.config.memberMetricWindow = state.memberMetricWindow;
            saveConfig();
            render();
        });

        $$('[data-sort]', panel).forEach(th => th.addEventListener('click', () => {
            const key = th.dataset.sort;
            if (state.sort.key === key) state.sort.dir = state.sort.dir === 'asc' ? 'desc' : 'asc';
            else state.sort = { key, dir: key === 'name' || key === 'position' || key === 'status' ? 'asc' : 'desc' };
            render();
        }));

        const warSearch = $('[data-role="war-search"]', panel);
        if (warSearch) warSearch.addEventListener('input', e => {
            state.warSearch = e.target.value;
            render();
            const input = $('[data-role="war-search"]', $('#tfc-panel'));
            if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
        });

        const warFilter = $('[data-role="war-filter"]', panel);
        if (warFilter) warFilter.addEventListener('change', e => { state.warFilter = e.target.value; render(); });

        const warSort = $('[data-role="war-sort"]', panel);
        if (warSort) warSort.addEventListener('change', e => { state.warSort = e.target.value; render(); });

        $$('[data-war-pin]', panel).forEach(el => el.addEventListener('click', () => toggleWarPin(el.dataset.warPin)));
        $$('[data-target-toggle]', panel).forEach(el => el.addEventListener('click', () => {
            const id = el.dataset.targetToggle;
            state.expandedTargetId = String(state.expandedTargetId) === String(id) ? null : id;
            render();
        }));
        $$('[data-war-note]', panel).forEach(el => el.addEventListener('change', () => saveWarNote(el.dataset.warNote, el.value)));

        const payoutWar = $('[data-role="payout-war"]', panel);
        if (payoutWar) payoutWar.addEventListener('change', e => { state.payoutWarId=e.target.value; render(); });
        $$('[data-payout-field]', panel).forEach(el => el.addEventListener('change', async () => {
            const id=selectedPayoutWarId(); const d=payoutDraft(id); const key=el.dataset.payoutField;
            d[key] = ['mode'].includes(key) ? el.value : Number(el.value);
            await savePayoutDraft(id,d,true); render();
        }));
        $$('[data-payout-adjust]', panel).forEach(el => el.addEventListener('change', async () => {
            const id=selectedPayoutWarId(); const d=payoutDraft(id); d.adjustments[el.dataset.payoutAdjust]=Number(el.value||0); await savePayoutDraft(id,d,true); render();
        }));
        $$('[data-payout-exclude]', panel).forEach(el => el.addEventListener('change', async () => {
            const id=selectedPayoutWarId(); const d=payoutDraft(id); d.excluded[el.dataset.payoutExclude]=!!el.checked; await savePayoutDraft(id,d,true); render();
        }));
        $$('[data-payout-note]', panel).forEach(el => el.addEventListener('change', async () => {
            const id=selectedPayoutWarId(); const d=payoutDraft(id); d.notes[el.dataset.payoutNote]=el.value; await savePayoutDraft(id,d,true);
        }));

        $$('[data-chain-delete]', panel).forEach(el => el.addEventListener('click', () => deleteChainAssignment(el.dataset.chainDelete)));
        $$('[data-chain-report]', panel).forEach(el => el.addEventListener('click', () => loadChainReport(el.dataset.chainReport)));
        $$('[data-oc-toggle]', panel).forEach(el => el.addEventListener('click', () => { state.expandedCrimeId = String(state.expandedCrimeId) === String(el.dataset.ocToggle) ? null : el.dataset.ocToggle; render(); }));
        const ocFilter = $('[data-role="oc-filter"]', panel);
        if (ocFilter) ocFilter.addEventListener('change', e => { state.ocFilter = e.target.value; render(); });
        const ocMemberFilter = $('[data-role="oc-member-filter"]', panel);
        if (ocMemberFilter) ocMemberFilter.addEventListener('change', e => { state.ocMemberFilter = e.target.value; render(); });

        const recruitSearch = $('[data-role="recruit-search"]', panel);
        if (recruitSearch) recruitSearch.addEventListener('input', e => {
            state.recruitSearch = e.target.value;
            render();
            const input = $('[data-role="recruit-search"]', $('#tfc-panel'));
            if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
        });
        const recruitFilter = $('[data-role="recruit-filter"]', panel);
        if (recruitFilter) recruitFilter.addEventListener('change', e => { state.recruitFilter = e.target.value; render(); });
        const recruitSort = $('[data-role="recruit-sort"]', panel);
        if (recruitSort) recruitSort.addEventListener('change', e => { state.recruitSort = e.target.value; render(); });
        $$('[data-recruit-toggle]', panel).forEach(el => el.addEventListener('click', () => {
            const id = el.dataset.recruitToggle;
            state.recruitExpandedId = String(state.recruitExpandedId) === String(id) ? null : id;
            render();
        }));
        $$('[data-recruit-intel]', panel).forEach(el => el.addEventListener('click', () => syncRecruitIntel(el.dataset.recruitIntel, true)));
        $$('[data-recruit-stage]', panel).forEach(el => el.addEventListener('change', async () => { await saveRecruitField(el.dataset.recruitStage, 'pipelineStatus', el.value); render(); }));
        $$('[data-recruit-referrer]', panel).forEach(el => el.addEventListener('change', async () => { await saveRecruitField(el.dataset.recruitReferrer, 'referrer', el.value.trim()); render(); }));
        $$('[data-recruit-amount]', panel).forEach(el => el.addEventListener('change', async () => { await saveRecruitField(el.dataset.recruitAmount, 'referralAmount', Math.max(0,Number(el.value||0))); render(); }));
        $$('[data-recruit-paid]', panel).forEach(el => el.addEventListener('change', async () => { await saveRecruitField(el.dataset.recruitPaid, 'referralPaid', !!el.checked); render(); }));
        $$('[data-recruit-notes]', panel).forEach(el => el.addEventListener('change', async () => { await saveRecruitField(el.dataset.recruitNotes, 'notes', el.value); }));

        const financeWindow = $('[data-role="finance-window"]', panel);
        if (financeWindow) financeWindow.addEventListener('change', e => { state.financeWindow=Number(e.target.value||0); render(); });
        const financeFilter = $('[data-role="finance-filter"]', panel);
        if (financeFilter) financeFilter.addEventListener('change', e => { state.financeFilter=e.target.value; render(); });
        const financeSearch = $('[data-role="finance-search"]', panel);
        if (financeSearch) financeSearch.addEventListener('input', e => {
            state.financeSearch=e.target.value; render();
            const input=$('[data-role="finance-search"]',$('#tfc-panel')); if(input){input.focus();input.setSelectionRange(input.value.length,input.value.length);}
        });
        $$('[data-finance-delete]', panel).forEach(el => el.addEventListener('click', () => deleteFinanceManualEntry(el.dataset.financeDelete)));

        const armorySearch = $('[data-role="armory-search"]', panel);
        if (armorySearch) armorySearch.addEventListener('input', e => {
            state.armorySearch = e.target.value; render();
            const input = $('[data-role="armory-search"]', $('#tfc-panel'));
            if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
        });
        const armoryCategory = $('[data-role="armory-category"]', panel);
        if (armoryCategory) armoryCategory.addEventListener('change', e => { state.armoryCategory=e.target.value; render(); });
        const armoryFilter = $('[data-role="armory-filter"]', panel);
        if (armoryFilter) armoryFilter.addEventListener('change', e => { state.armoryFilter=e.target.value; render(); });
        const armorySort = $('[data-role="armory-sort"]', panel);
        if (armorySort) armorySort.addEventListener('change', e => { state.armorySort=e.target.value; render(); });
        $$('[data-armory-min]', panel).forEach(el => el.addEventListener('change', async () => { await saveArmoryMinimum(el.dataset.armoryMin, el.value); render(); }));

        $$('[data-lead-field]', panel).forEach(el => el.addEventListener('change', async () => { await saveLeadershipField(el.dataset.leadMember, el.dataset.leadField, el.value); render(); }));
        $$('[data-lead-tag-member]', panel).forEach(el => el.addEventListener('change', async () => { await toggleLeadershipTag(el.dataset.leadTagMember, el.dataset.leadTagName, !!el.checked); render(); }));
        $$('[data-lead-custom-tags]', panel).forEach(el => el.addEventListener('change', async () => { await saveLeadershipCustomTags(el.dataset.leadCustomTags, el.value); render(); }));
        $$('[data-lead-save-absence]', panel).forEach(el => el.addEventListener('click', () => saveLeadershipAbsence(el.dataset.leadSaveAbsence)));
        $$('[data-lead-clear-absence]', panel).forEach(el => el.addEventListener('click', () => clearLeadershipAbsence(el.dataset.leadClearAbsence)));
        $$('[data-lead-add-event]', panel).forEach(el => el.addEventListener('click', () => addLeadershipEvent(el.dataset.leadAddEvent)));
        $$('[data-lead-resolve-event]', panel).forEach(el => el.addEventListener('click', () => resolveLeadershipEvent(el.dataset.leadResolveEvent, el.dataset.leadEventId)));
        $$('[data-lead-delete-event]', panel).forEach(el => el.addEventListener('click', () => deleteLeadershipEvent(el.dataset.leadDeleteEvent, el.dataset.leadEventId)));

        bindMemberToggleEvents(panel);
        updateWarCountdowns();
        updateChainCountdowns();
    }

    function bindMemberToggleEvents(root) {
        $$('[data-member-toggle]', root).forEach(el => el.addEventListener('click', () => {
            const id = el.dataset.memberToggle;
            state.expandedMemberId = String(state.expandedMemberId) === String(id) ? null : id;
            render();
        }));
    }

    async function saveSettingsFromUi() {
        const panel = $('#tfc-panel');
        const get = key => $(`[data-setting="${key}"]`, panel);
        const oldApiKey = state.config.apiKey || '';
        state.config.apiKey = get('apiKey')?.value.trim() || '';
        state.config.inactivityHours = Number(get('inactivityHours')?.value || DEFAULTS.inactivityHours);
        state.config.intelCacheHours = Number(get('intelCacheHours')?.value || DEFAULTS.intelCacheHours);
        state.config.historyDays = Number(get('historyDays')?.value || DEFAULTS.historyDays);
        state.config.panelWidth = Number(get('panelWidth')?.value || DEFAULTS.panelWidth);
        state.config.warAutoRefreshSeconds = Number(get('warAutoRefreshSeconds')?.value ?? DEFAULTS.warAutoRefreshSeconds);
        state.config.warHospitalSoonMinutes = Number(get('warHospitalSoonMinutes')?.value || DEFAULTS.warHospitalSoonMinutes);
        state.config.warRecentReleaseMinutes = Number(get('warRecentReleaseMinutes')?.value || DEFAULTS.warRecentReleaseMinutes);
        state.config.payoutDefaultMemberPercent = Number(get('payoutDefaultMemberPercent')?.value ?? DEFAULTS.payoutDefaultMemberPercent);
        state.config.payoutDefaultMode = get('payoutDefaultMode')?.value || DEFAULTS.payoutDefaultMode;
        state.config.payoutDefaultAssistWeight = Number(get('payoutDefaultAssistWeight')?.value ?? DEFAULTS.payoutDefaultAssistWeight);
        state.config.payoutDefaultRoundTo = Number(get('payoutDefaultRoundTo')?.value ?? DEFAULTS.payoutDefaultRoundTo);
        state.config.chainAutoRefreshSeconds = Number(get('chainAutoRefreshSeconds')?.value ?? DEFAULTS.chainAutoRefreshSeconds);
        state.config.chainDangerSeconds = Number(get('chainDangerSeconds')?.value ?? DEFAULTS.chainDangerSeconds);
        state.config.chainWarningSeconds = Number(get('chainWarningSeconds')?.value ?? DEFAULTS.chainWarningSeconds);
        state.config.chainCoverageHours = Number(get('chainCoverageHours')?.value ?? DEFAULTS.chainCoverageHours);
        state.config.ocAutoRefreshSeconds = Number(get('ocAutoRefreshSeconds')?.value ?? DEFAULTS.ocAutoRefreshSeconds);
        state.config.ocLowCprThreshold = Number(get('ocLowCprThreshold')?.value ?? DEFAULTS.ocLowCprThreshold);
        state.config.ocHistoryLimit = Number(get('ocHistoryLimit')?.value ?? DEFAULTS.ocHistoryLimit);
        state.config.recruitIntelCacheHours = Number(get('recruitIntelCacheHours')?.value ?? DEFAULTS.recruitIntelCacheHours);
        state.config.recruitHistoryLimit = Number(get('recruitHistoryLimit')?.value ?? DEFAULTS.recruitHistoryLimit);
        state.config.recruitReferralDefaultAmount = Number(get('recruitReferralDefaultAmount')?.value ?? DEFAULTS.recruitReferralDefaultAmount);
        state.config.armoryInventoryCacheMinutes = Number(get('armoryInventoryCacheMinutes')?.value ?? DEFAULTS.armoryInventoryCacheMinutes);
        state.config.armoryNewsDays = Number(get('armoryNewsDays')?.value ?? DEFAULTS.armoryNewsDays);
        state.config.armoryHistoryDays = Number(get('armoryHistoryDays')?.value ?? DEFAULTS.armoryHistoryDays);
        state.config.financeNewsDays = Number(get('financeNewsDays')?.value ?? DEFAULTS.financeNewsDays);
        state.config.financeManualLimit = Number(get('financeManualLimit')?.value ?? DEFAULTS.financeManualLimit);
        state.config.financeOcMemberPercent = Number(get('financeOcMemberPercent')?.value ?? DEFAULTS.financeOcMemberPercent);
        state.config.analyticsHistoryDays = Number(get('analyticsHistoryDays')?.value ?? DEFAULTS.analyticsHistoryDays);
        state.config.leadershipEventLimit = Number(get('leadershipEventLimit')?.value ?? DEFAULTS.leadershipEventLimit);
        state.config.compactRows = !!get('compactRows')?.checked;
        state.financeManualEntries = financeTrimManual(state.financeManualEntries || []);
        await saveLeadership();
        await Store.set('financeManualEntries', state.financeManualEntries);
        await saveConfig();
        state.cache.clear();
        if (oldApiKey !== state.config.apiKey) {
            state.roster = [];
            state.faction = null;
            state.rosterLastFetchedAt = 0;
            state.commandLastRefreshedAt = 0;
            state.memberIntel = {};
            state.expandedMemberId = null;
            state.currentWar = null;
            state.warOpponent = null;
            state.enemyRoster = [];
            state.warLastFetchedAt = 0;
            state.expandedTargetId = null;
            state.warAttacks = [];
            state.warAttackAccess = 'unknown';
            state.warAttackAccessType = '';
            state.warAttackError = '';
            state.warAttackLastFetchedAt = 0;
            state.warAttackCache = null;
            state.warActivityHistory = {};
            state.warRecentReleases = {};
            state.warHistory = {};
            state.payoutDrafts = {};
            state.payoutWarId = null;
            state.chain = null;
            state.chainReport = null;
            state.chainRecent = [];
            state.chainReports = {};
            state.chainAssignments = [];
            state.chainLastFetchedAt = 0;
            state.chainSelectedId = null;
            state.ocCrimes = [];
            state.ocCompleted = [];
            state.ocCatalog = [];
            state.ocCrimeExp = [];
            state.ocHistory = [];
            state.ocRoleHistory = {};
            state.ocLastFetchedAt = 0;
            state.ocError = '';
            state.expandedCrimeId = null;
            state.recruitApplications = [];
            state.recruitCandidates = {};
            state.recruitLastFetchedAt = 0;
            state.recruitError = '';
            state.recruitExpandedId = null;
            state.armoryInventory = [];
            state.armoryInventoryTimestamp = 0;
            state.armoryBalance = null;
            state.armoryNews = [];
            state.armoryLastFetchedAt = 0;
            state.armoryError = '';
            state.armoryBalanceError = '';
            state.armoryNewsError = '';
            state.armoryStockRules = { categories:{}, items:{} };
            state.armoryItemMeta = {};
            state.armoryHistory = [];
            state.financeFundNews = [];
            state.financeManualEntries = [];
            state.financeLastFetchedAt = 0;
            state.financeError = '';
            state.analyticsHistory = [];
            await Store.del('lastRoster');
            await Store.set('memberIntel', {});
            await Store.set('warAttackCache', null);
            await Store.set('warActivityHistory', {});
            await Store.set('warRecentReleases', {});
            await Store.set('warHistory', {});
            await Store.set('payoutDrafts', {});
            await Store.set('chainReports', {});
            await Store.set('chainAssignments', []);
            await Store.set('ocHistory', []);
            await Store.set('ocRoleHistory', {});
            await Store.set('recruitCandidates', {});
            await Store.set('armoryStockRules', { categories:{}, items:{} });
            await Store.set('armoryItemMeta', {});
            await Store.set('armoryHistory', []);
            await Store.set('financeManualEntries', []);
            await Store.del('financeSnapshot');
            await Store.set('analyticsHistory', []);
            await Store.del('armorySnapshot');
        }
        toast('Settings saved');
        render();
    }

    async function testApiKey() {
        const input = $('[data-setting="apiKey"]', $('#tfc-panel'));
        const original = state.config.apiKey;
        const candidate = input?.value.trim() || '';
        if (!candidate) return toast('Paste an API key first', 'error');
        state.config.apiKey = candidate;
        try {
            const data = await api('/user/basic', { striptags: 'true' }, { force: true });
            let suffix = '';
            try {
                const keyData = await api('/key/info', {}, { force: true });
                suffix = keyData?.info?.access?.type ? ` · ${keyData.info.access.type}` : '';
            } catch {}
            toast(`API key works${data?.basic?.name ? `: ${data.basic.name}` : ''}${suffix}`);
        } catch (err) {
            toast(`API test failed: ${err.message}`, 'error');
        } finally {
            state.config.apiKey = original;
        }
    }

    async function clearIntel() {
        state.memberIntel = {};
        state.syncProgress = { done: 0, total: 0, current: '', phase: '' };
        await Store.set('memberIntel', {});
        toast('Cached member intel cleared');
        render();
    }

    async function refreshRoster(force = false) {
        if (state.loadingRoster) return;
        state.loadingRoster = true;
        render();
        try {
            const [membersData, basicData] = await Promise.all([
                api('/faction/members', { striptags: 'true' }, { ttl: Number(state.config.rosterCacheSeconds) * 1000, force }),
                api('/faction/basic', {}, { ttl: 5 * 60 * 1000, force }),
            ]);
            state.roster = Array.isArray(membersData?.members) ? membersData.members : [];
            state.faction = basicData?.basic || null;
            await observeLeadershipRoster();
            state.rosterLastFetchedAt = Date.now();
            await Store.set('lastRoster', { at: state.rosterLastFetchedAt, members: state.roster, faction: state.faction });
            await recordAnalyticsSnapshot();
            if (force) toast(`Roster updated: ${state.roster.length} members`);
        } catch (err) {
            console.error('[TFC] roster refresh failed', err);
            toast(`Roster refresh failed: ${err.message}`, 'error');
        } finally {
            state.loadingRoster = false;
            render();
        }
    }

    function flattenNumbers(obj, path = '', out = {}) {
        if (obj === null || obj === undefined) return out;
        if (typeof obj === 'number') {
            out[path.toLowerCase()] = obj;
            return out;
        }
        if (Array.isArray(obj)) {
            for (const item of obj) {
                if (item && typeof item === 'object' && 'name' in item && 'value' in item) {
                    out[String(item.name).toLowerCase()] = Number(item.value);
                } else flattenNumbers(item, path, out);
            }
            return out;
        }
        if (typeof obj === 'object') {
            for (const [k, v] of Object.entries(obj)) {
                flattenNumbers(v, path ? `${path}.${k}` : k, out);
            }
        }
        return out;
    }

    function extractStats(data) {
        const flat = flattenNumbers(data?.personalstats ?? data ?? {});
        const pick = (...keys) => {
            for (const key of keys) {
                const exact = flat[key.toLowerCase()];
                if (Number.isFinite(exact)) return exact;
            }
            for (const [path, val] of Object.entries(flat)) {
                if (keys.some(key => path.endsWith(`.${key.toLowerCase()}`) || path === key.toLowerCase())) return val;
            }
            return null;
        };
        return {
            xantaken: pick('xantaken', 'drugs.xanax', 'xanax'),
            refills: pick('refills'),
            rankedwarhits: pick('rankedwarhits', 'faction.ranked_war_hits', 'ranked_war_hits'),
            respectforfaction: pick('respectforfaction', 'faction.respect'),
            energydrinkused: pick('energydrinkused', 'energy_drinks', 'energy_drink'),
            revives: pick('revives', 'hospital.revives'),
        };
    }

    function historyTargetTimestamp(days) {
        const d = new Date();
        d.setUTCHours(12, 0, 0, 0);
        d.setUTCDate(d.getUTCDate() - Number(days));
        return Math.floor(d.getTime() / 1000);
    }

    function dateKeyToMs(key) {
        if (!key) return NaN;
        return Date.parse(`${key}T00:00:00Z`);
    }

    function upsertHistorySnapshot(history, key, stats, source = 'local') {
        if (!key || !stats) return;
        const row = { d: key, ...stats, _source: source };
        const idx = history.findIndex(x => x.d === key);
        if (idx >= 0) history[idx] = { ...history[idx], ...row };
        else history.push(row);
        history.sort((a, b) => String(a.d).localeCompare(String(b.d)));
    }

    function findBaselineSnapshot(record, requestedDays) {
        const history = Array.isArray(record?.history) ? record.history : [];
        if (!history.length) return null;
        const target = Date.now() - Number(requestedDays) * 86400000;
        const toleranceDays = Math.max(4, Math.round(Number(requestedDays) * 0.2));
        let best = null;
        let bestDistance = Infinity;
        for (const row of history) {
            const ms = dateKeyToMs(row?.d);
            if (!Number.isFinite(ms)) continue;
            const distance = Math.abs(ms - target);
            if (distance < bestDistance) {
                best = row;
                bestDistance = distance;
            }
        }
        if (!best || bestDistance > toleranceDays * 86400000) return null;
        const todayMs = dateKeyToMs(dateKey());
        const baseMs = dateKeyToMs(best.d);
        const actualDays = Math.max(1, Math.round((todayMs - baseMs) / 86400000));
        return { row: best, actualDays };
    }

    function calculateWindow(record, requestedDays) {
        const current = record?.current || null;
        if (!current) return null;
        if (!requestedDays || requestedDays === 'lifetime') {
            return { days: null, requestedDays: null, values: { ...current }, rates: {}, baseline: null };
        }
        const baseline = findBaselineSnapshot(record, requestedDays);
        if (!baseline) return null;
        const values = {};
        const rates = {};
        for (const key of STAT_NAMES) {
            const currentRaw = current[key];
            const oldRaw = baseline.row[key];
            const cur = Number(currentRaw);
            const old = Number(oldRaw);
            if (currentRaw === null || currentRaw === undefined || oldRaw === null || oldRaw === undefined || !Number.isFinite(cur) || !Number.isFinite(old) || cur < old) {
                values[key] = null;
                rates[key] = null;
                continue;
            }
            values[key] = cur - old;
            rates[key] = values[key] / baseline.actualDays;
        }
        return {
            requestedDays: Number(requestedDays),
            days: baseline.actualDays,
            values,
            rates,
            baseline: baseline.row,
        };
    }

    function paceComparison(record, key) {
        const w7 = calculateWindow(record, 7);
        const w30 = calculateWindow(record, 30);
        const raw7 = w7?.rates?.[key];
        const raw30 = w30?.rates?.[key];
        if (raw7 === null || raw7 === undefined || raw30 === null || raw30 === undefined) return null;
        const r7 = Number(raw7);
        const r30 = Number(raw30);
        if (!Number.isFinite(r7) || !Number.isFinite(r30)) return null;
        if (r30 === 0) return r7 > 0 ? Infinity : 0;
        return ((r7 / r30) - 1) * 100;
    }

    function paceHtml(record, key) {
        const pct = paceComparison(record, key);
        if (pct === null) return '<span class="tfc-muted tfc-pace">No pace yet</span>';
        if (pct === Infinity) return '<span class="tfc-good tfc-pace">New activity ↑</span>';
        const rounded = Math.round(pct);
        if (Math.abs(rounded) < 5) return '<span class="tfc-muted tfc-pace">≈ 30d pace</span>';
        const cls = rounded > 0 ? 'tfc-good' : 'tfc-warn';
        const arrow = rounded > 0 ? '↑' : '↓';
        return `<span class="${cls} tfc-pace">${arrow} ${Math.abs(rounded)}% vs 30d</span>`;
    }

    function memberWindowLabel(windowValue = state.memberMetricWindow) {
        return Number(windowValue) === 7 ? '7d' : Number(windowValue) === 30 ? '30d' : 'Lifetime';
    }

    function getMemberMetricRecord(member, windowValue = state.memberMetricWindow) {
        const record = state.memberIntel[member.id];
        if (!record?.current) return null;
        return Number(windowValue) === 7 ? calculateWindow(record, 7)
            : Number(windowValue) === 30 ? calculateWindow(record, 30)
            : calculateWindow(record, 'lifetime');
    }

    function aggregateWindow(days = 30) {
        const totals = Object.fromEntries(STAT_NAMES.map(k => [k, 0]));
        let covered = 0;
        let factionCovered = 0;
        for (const member of state.roster) {
            const window = calculateWindow(state.memberIntel[member.id], days);
            if (!window) continue;
            covered++;
            const enoughFactionTenure = Number(member.days_in_faction || 0) >= Number(window.days || days);
            if (enoughFactionTenure) factionCovered++;
            for (const key of STAT_NAMES) {
                if (['rankedwarhits', 'respectforfaction'].includes(key) && !enoughFactionTenure) continue;
                const raw = window.values?.[key];
                if (raw === null || raw === undefined) continue;
                const value = Number(raw);
                if (Number.isFinite(value)) totals[key] += value;
            }
        }
        return { totals, covered, factionCovered, total: state.roster.length };
    }

    function fmtRate(value, digits = 2) {
        if (value === null || value === undefined || !Number.isFinite(Number(value))) return '-';
        return Number(value).toLocaleString(undefined, { maximumFractionDigits: digits });
    }

    function shouldFetchIntel(record, force = false) {
        if (force || !record?.fetchedAt) return true;
        const ttl = Number(state.config.intelCacheHours || 12) * 3600 * 1000;
        return Date.now() - record.fetchedAt >= ttl;
    }

    function needsInitialBackfill(record) {
        return !record?.backfill?.d7 || !record?.backfill?.d30;
    }

    async function fetchHistoricalStats(memberId, days) {
        const timestamp = historyTargetTimestamp(days);
        const data = await api(`/user/${memberId}/personalstats`, {
            stat: STAT_NAMES,
            timestamp,
        }, { force: true });
        return {
            stats: extractStats(data),
            timestamp,
            key: dateKey(timestamp * 1000),
        };
    }

    async function syncMemberIntel(force = false) {
        if (state.syncingIntel || !state.roster.length) return;
        state.syncingIntel = true;
        const targets = state.roster.filter(m => {
            const record = state.memberIntel[m.id];
            return shouldFetchIntel(record, force) || needsInitialBackfill(record);
        });
        state.syncProgress = { done: 0, total: targets.length, current: '', phase: '' };
        render();

        if (!targets.length) {
            state.syncingIntel = false;
            toast('Member intel and historical baselines are already cached');
            render();
            return;
        }

        let failures = 0;
        let backfilled = 0;
        for (const member of targets) {
            state.syncProgress.current = member.name;
            const existing = state.memberIntel[member.id] || {};
            const history = Array.isArray(existing.history) ? [...existing.history] : [];
            const backfill = { ...(existing.backfill || {}) };
            let current = existing.current || null;
            let fetchedAt = existing.fetchedAt || 0;

            try {
                if (shouldFetchIntel(existing, force)) {
                    state.syncProgress.phase = 'current stats';
                    renderProgressOnly();
                    const data = await api(`/user/${member.id}/personalstats`, { stat: STAT_NAMES }, { force: true });
                    current = extractStats(data);
                    fetchedAt = Date.now();
                }

                if (!current) throw new Error('No current personal stats available');
                upsertHistorySnapshot(history, dateKey(), current, 'daily');

                if (!backfill.d7) {
                    state.syncProgress.phase = '7-day baseline';
                    renderProgressOnly();
                    const historical = await fetchHistoricalStats(member.id, 7);
                    upsertHistorySnapshot(history, historical.key, historical.stats, 'api-history');
                    backfill.d7 = historical.key;
                    backfilled++;
                }

                if (!backfill.d30) {
                    state.syncProgress.phase = '30-day baseline';
                    renderProgressOnly();
                    const historical = await fetchHistoricalStats(member.id, 30);
                    upsertHistorySnapshot(history, historical.key, historical.stats, 'api-history');
                    backfill.d30 = historical.key;
                    backfilled++;
                }

                state.memberIntel[member.id] = {
                    ...existing,
                    current,
                    fetchedAt,
                    backfill,
                    history: trimHistory(history),
                };
            } catch (err) {
                failures++;
                console.warn(`[TFC] intel sync failed for ${member.name} [${member.id}]`, err);
                // Preserve any successful work from this member so a later sync only retries missing pieces.
                if (current) {
                    state.memberIntel[member.id] = {
                        ...existing,
                        current,
                        fetchedAt,
                        backfill,
                        history: trimHistory(history),
                    };
                }
            }
            state.syncProgress.done++;
            state.syncProgress.phase = '';
            if (state.syncProgress.done % 3 === 0) await Store.set('memberIntel', state.memberIntel);
        }

        await Store.set('memberIntel', state.memberIntel);
        state.syncingIntel = false;
        state.syncProgress.current = '';
        state.syncProgress.phase = '';
        const message = failures
            ? `Intel sync finished with ${failures} failed member${failures === 1 ? '' : 's'}`
            : `Intel synced for ${targets.length} members${backfilled ? ` · ${backfilled} historical baselines added` : ''}`;
        toast(message, failures ? 'error' : 'ok');
        render();
    }

    function renderProgressOnly() {
        if (!state.open) return;
        const progress = $('.tfc-progress');
        const line = $('.tfc-progress-line');
        if (!progress || !line) return;
        const pct = state.syncProgress.total ? Math.round((state.syncProgress.done / state.syncProgress.total) * 100) : 0;
        const bar = $('span', progress);
        if (bar) bar.style.width = `${pct}%`;
        const phase = state.syncProgress.phase ? ` · ${state.syncProgress.phase}` : '';
        line.textContent = `Syncing ${state.syncProgress.current || ''}${phase} · ${state.syncProgress.done}/${state.syncProgress.total} (${pct}%)`;
    }

    function trimHistory(history) {
        const cutoff = new Date();
        cutoff.setUTCDate(cutoff.getUTCDate() - Number(state.config.historyDays || 120));
        const min = dateKey(cutoff.getTime());
        return history.filter(x => x?.d && x.d >= min);
    }

    async function restoreCachedRoster() {
        const cached = await Store.get('lastRoster', null);
        if (!cached || !Array.isArray(cached.members)) return;
        // Keep stale cached data only as instant UI while a real refresh happens.
        state.roster = cached.members;
        state.faction = cached.faction || null;
        state.rosterLastFetchedAt = Number(cached.at || 0);
    }

    function handleKeyboard(e) {
        if (e.key === 'Escape' && state.open) closePanel();
    }

    async function init() {
        await loadConfig();
        await restoreCachedRoster();
        if (state.roster.length) await observeLeadershipRoster();
        ensureUi();
        startWarTicker();
        document.addEventListener('keydown', handleKeyboard);
        console.info(`[TFC] ${APP.name} v${APP.version} loaded`);
    }

    init().catch(err => console.error('[TFC] init failed', err));
})();
