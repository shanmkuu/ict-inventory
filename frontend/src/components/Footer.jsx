import React from 'react'

const Footer = ({ darkMode }) => {
    const currentYear = new Date().getFullYear();

    return (
        <footer style={{
            marginTop: '2rem',
            padding: '1rem 0',
            borderTop: `1px solid ${darkMode ? '#222' : '#f0f0f0'}`,
            textAlign: 'center',
            color: darkMode ? '#555' : '#aaa',
            fontSize: '0.75rem',
            opacity: 0.8
        }}>
            <p style={{ margin: 0, letterSpacing: '0.02em' }}>
                &copy; {currentYear} All Rights Reserved. Made with love by{' '}
                <a
                    href="https://shanmkuu.vercel.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        color: darkMode ? '#4CAF50' : '#4CAF50',
                        textDecoration: 'none',
                        fontWeight: '500',
                        transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.opacity = '0.7'}
                    onMouseLeave={(e) => e.target.style.opacity = '1'}
                >
                    Emmanuel Leshan
                </a>
            </p>
        </footer>
    );
};

export default Footer;
