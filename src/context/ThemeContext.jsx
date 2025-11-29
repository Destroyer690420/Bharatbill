import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        // Check localStorage first
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            return savedTheme;
        }
        // Default to light mode
        return 'light';
    });

    useEffect(() => {
        const root = document.documentElement;

        // Remove both classes first to be safe
        root.classList.remove('light', 'dark');

        if (theme === 'light') {
            root.classList.add('light');
        } else {
            // Default Tailwind dark mode usually relies on 'dark' class
            // If the system was using 'dark' class for dark mode:
            root.classList.add('dark');
        }

        // Save preference
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
