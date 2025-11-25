import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, Package, FileText, LogOut, Settings, CreditCard, Menu, X, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export default function Layout({ children }) {
    const { logout } = useAuth();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const navItems = [
        { href: "/", label: "Dashboard", icon: LayoutDashboard },
        { href: "/invoices", label: "Invoices", icon: FileText },
        { href: "/quotations", label: "Quotations", icon: FileSpreadsheet },
        { href: "/payments", label: "Payments", icon: CreditCard },
        { href: "/parties", label: "Parties", icon: Users },
        { href: "/products", label: "Products", icon: Package },
        { href: "/settings", label: "Settings", icon: Settings },
    ];

    const closeMobileMenu = () => setMobileMenuOpen(false);

    return (
        <div className="min-h-screen bg-background flex">
            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-background border-b border-border flex items-center px-4 z-40">
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="p-2 rounded-md hover:bg-accent hover:text-accent-foreground"
                    aria-label="Toggle menu"
                >
                    {mobileMenuOpen ? <X className="h-6 w-6 text-foreground" /> : <Menu className="h-6 w-6 text-foreground" />}
                </button>
                <h1 className="text-xl font-bold text-foreground ml-4">Lekha</h1>
            </div>

            {/* Overlay for mobile */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
                    onClick={closeMobileMenu}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "w-64 bg-card border-r border-border flex flex-col fixed h-full z-50 transition-transform duration-300 ease-in-out",
                    "lg:translate-x-0",
                    mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="p-6 border-b border-border">
                    <h1 className="text-2xl font-bold text-foreground">Lekha</h1>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                to={item.href}
                                onClick={closeMobileMenu}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px]",
                                    isActive
                                        ? "bg-accent text-accent-foreground"
                                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                )}
                            >
                                <Icon className="h-5 w-5 flex-shrink-0" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-border">
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 min-h-[44px]"
                        onClick={() => {
                            closeMobileMenu();
                            logout();
                        }}
                    >
                        <LogOut className="h-5 w-5 mr-2" />
                        Logout
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 lg:ml-64 pt-16 lg:pt-8 p-4 sm:p-6 lg:p-8 bg-background text-foreground">
                {children}
            </main>
        </div>
    );
}
