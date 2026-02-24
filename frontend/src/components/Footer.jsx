import React, { useEffect, useRef, useState } from 'react'
import { _0xsystem, validateSystemIntegrity, generatePulse } from '../utils/system-integrity'

const Footer = ({ darkMode, isBypassed }) => {
    const currentYear = new Date().getFullYear();
    const footerRef = useRef(null);
    const [isTampered, setIsTampered] = useState(false);

    // Integrity enforcement & Heartbeat system
    useEffect(() => {
        const a = _0xsystem.gA();
        const u = _0xsystem.gU();

        const validate = () => {
            if (!validateSystemIntegrity(a, u)) {
                setIsTampered(true);
                window.dispatchEvent(new CustomEvent('security-tamper'));
                return false;
            }
            return true;
        };

        // Heartbeat Emitter
        const heartbeat = setInterval(() => {
            if (validate()) {
                const pulse = generatePulse();
                window.dispatchEvent(new CustomEvent('system-pulse', { detail: { pulse } }));
            }
        }, 3000);

        // DOM Protection
        if (footerRef.current) {
            const observer = new MutationObserver(() => {
                const style = window.getComputedStyle(footerRef.current);
                if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                    setIsTampered(true);
                    window.dispatchEvent(new CustomEvent('security-tamper'));
                }
            });

            observer.observe(footerRef.current, {
                attributes: true,
                childList: true,
                subtree: true,
                attributeFilter: ['style', 'class']
            });

            return () => {
                clearInterval(heartbeat);
                observer.disconnect();
            };
        }

        return () => clearInterval(heartbeat);
    }, []);

    const linkStyle = {
        color: '#4CAF50',
        textDecoration: 'none',
        fontWeight: '500',
        transition: 'opacity 0.2s',
        ...(isTampered && !isBypassed ? { color: '#ff0000', textDecoration: 'line-through' } : {})
    };

    return (
        <footer
            ref={footerRef}
            style={{
                marginTop: '2rem',
                padding: '1rem 0',
                borderTop: `1px solid ${darkMode ? '#222' : '#f0f0f0'}`,
                textAlign: 'center',
                color: darkMode ? '#555' : '#aaa',
                fontSize: '0.75rem',
                opacity: 0.8,
                ...(isTampered && !isBypassed ? { border: '1px solid red', padding: '0.5rem' } : {})
            }}
        >
            <p style={{ margin: 0, letterSpacing: '0.02em' }}>
                &copy; {currentYear} All Rights Reserved. Made with love by{' '}
                <a
                    id="dev-credit-link"
                    href={_0xsystem.gU()}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={linkStyle}
                    onMouseEnter={(e) => (!isTampered || isBypassed) && (e.target.style.opacity = '0.7')}
                    onMouseLeave={(e) => (!isTampered || isBypassed) && (e.target.style.opacity = '1')}
                >
                    {_0xsystem.gA()}
                </a>
            </p>
        </footer>
    );
};

export default Footer;
