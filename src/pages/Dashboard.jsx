import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { DollarSign, TrendingUp, Users, Wallet } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from "date-fns";

export default function Dashboard() {
    const { logout, currentUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [invoices, setInvoices] = useState([]);
    const [payments, setPayments] = useState([]);
    const [parties, setParties] = useState([]);

    useEffect(() => {
        if (!currentUser) return;

        const fetchData = async () => {
            try {
                // Fetch only Tax Invoices (exclude Quotations and Proforma Invoices)
                const invoicesSnap = await getDocs(collection(db, "users", currentUser.uid, "invoices"));
                const invoicesData = invoicesSnap.docs
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }))
                    .filter(inv => inv.documentType === "Tax Invoice"); // Only Tax Invoices
                setInvoices(invoicesData);

                // Fetch all payments
                const paymentsSnap = await getDocs(collection(db, "users", currentUser.uid, "payments"));
                const paymentsData = paymentsSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setPayments(paymentsData);

                // Fetch all parties
                const partiesSnap = await getDocs(collection(db, "users", currentUser.uid, "parties"));
                const partiesData = partiesSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setParties(partiesData);
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [currentUser]);

    // Calculate Total Receivables
    const totalInvoiceAmount = invoices.reduce((sum, inv) => {
        const items = inv.items || [];
        let invoiceTotal = 0;
        items.forEach(item => {
            const amount = (item.qty * item.rate);
            const itemTaxRate = parseFloat(item.taxRate) || 18; // Default to 18%
            const tax = amount * (itemTaxRate / 100);
            invoiceTotal += amount + tax;
        });
        // Add freight tax (18% for services)
        const freightCharges = parseFloat(inv.freightCharges || 0);
        const freightTax = freightCharges * 0.18;
        invoiceTotal += freightCharges + freightTax;
        return sum + invoiceTotal;
    }, 0);

    const totalPaymentAmount = payments.reduce((sum, pay) => sum + (parseFloat(pay.amount) || 0), 0);
    const totalReceivables = totalInvoiceAmount - totalPaymentAmount;

    // Calculate Monthly Sales (current month invoices)
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const monthlySales = invoices
        .filter(inv => {
            const invDate = parseISO(inv.date);
            return invDate >= monthStart && invDate <= monthEnd;
        })
        .reduce((sum, inv) => {
            const items = inv.items || [];
            let invoiceTotal = 0;
            items.forEach(item => {
                const amount = (item.qty * item.rate);
                const itemTaxRate = parseFloat(item.taxRate) || 18;
                const tax = amount * (itemTaxRate / 100);
                invoiceTotal += amount + tax;
            });
            const freightCharges = parseFloat(inv.freightCharges || 0);
            const freightTax = freightCharges * 0.18;
            invoiceTotal += freightCharges + freightTax;
            return sum + invoiceTotal;
        }, 0);

    // Calculate Monthly Collections (current month payments)
    const monthlyCollections = payments
        .filter(pay => {
            const payDate = parseISO(pay.date);
            return payDate >= monthStart && payDate <= monthEnd;
        })
        .reduce((sum, pay) => sum + (parseFloat(pay.amount) || 0), 0);

    // Active Parties count
    const activeParties = parties.length;

    // Monthly Revenue Trend (last 6 months)
    const getMonthlyRevenue = () => {
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const monthDate = subMonths(now, i);
            const monthStart = startOfMonth(monthDate);
            const monthEnd = endOfMonth(monthDate);

            const revenue = invoices
                .filter(inv => {
                    const invDate = parseISO(inv.date);
                    return invDate >= monthStart && invDate <= monthEnd;
                })
                .reduce((sum, inv) => {
                    const items = inv.items || [];
                    let invoiceTotal = 0;
                    items.forEach(item => {
                        const amount = (item.qty * item.rate);
                        const itemTaxRate = parseFloat(item.taxRate) || 18;
                        const tax = amount * (itemTaxRate / 100);
                        invoiceTotal += amount + tax;
                    });
                    const freightCharges = parseFloat(inv.freightCharges || 0);
                    const freightTax = freightCharges * 0.18;
                    invoiceTotal += freightCharges + freightTax;
                    return sum + invoiceTotal;
                }, 0);

            months.push({
                month: format(monthDate, "MMM yy"),
                revenue: revenue
            });
        }
        return months;
    };

    // Product Performance (top 5 products by quantity)
    const getProductPerformance = () => {
        const productMap = {};

        invoices.forEach(inv => {
            (inv.items || []).forEach(item => {
                const desc = item.description || "Unknown";
                if (!productMap[desc]) {
                    productMap[desc] = 0;
                }
                productMap[desc] += parseFloat(item.qty) || 0;
            });
        });

        const products = Object.entries(productMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        return products;
    };

    // Recent Invoices (last 5)
    const getRecentInvoices = () => {
        return [...invoices]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5)
            .map(inv => {
                const items = inv.items || [];
                let invoiceTotal = 0;
                items.forEach(item => {
                    const amount = (item.qty * item.rate);
                    const itemTaxRate = parseFloat(item.taxRate) || 18;
                    const tax = amount * (itemTaxRate / 100);
                    invoiceTotal += amount + tax;
                });
                const freightCharges = parseFloat(inv.freightCharges || 0);
                const freightTax = freightCharges * 0.18;
                invoiceTotal += freightCharges + freightTax;

                return {
                    invoiceNo: inv.invoiceNo,
                    partyName: inv.buyerDetails?.name || "N/A",
                    date: inv.date,
                    amount: invoiceTotal,
                    status: "Pending" // Can be enhanced with payment tracking
                };
            });
    };

    // Top Debtors (parties with highest outstanding)
    const getTopDebtors = () => {
        const debtorMap = {};

        // Add invoice amounts
        invoices.forEach(inv => {
            const partyId = inv.buyerId;
            const partyName = inv.buyerDetails?.name || "Unknown";

            if (!debtorMap[partyId]) {
                debtorMap[partyId] = { name: partyName, amount: 0 };
            }

            const items = inv.items || [];
            let invoiceTotal = 0;
            items.forEach(item => {
                const amount = (item.qty * item.rate);
                const itemTaxRate = parseFloat(item.taxRate) || 18;
                const tax = amount * (itemTaxRate / 100);
                invoiceTotal += amount + tax;
            });
            const freightCharges = parseFloat(inv.freightCharges || 0);
            const freightTax = freightCharges * 0.18;
            invoiceTotal += freightCharges + freightTax;
            debtorMap[partyId].amount += invoiceTotal;
        });

        // Subtract payment amounts
        payments.forEach(pay => {
            const partyId = pay.partyId;
            if (debtorMap[partyId]) {
                debtorMap[partyId].amount -= parseFloat(pay.amount) || 0;
            }
        });

        return Object.values(debtorMap)
            .filter(d => d.amount > 0)
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);
    };

    const revenueData = getMonthlyRevenue();
    const productData = getProductPerformance();
    const recentInvoices = getRecentInvoices();
    const topDebtors = getTopDebtors();

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

    if (loading) {
        return (
            <div className="p-8">
                <div className="text-center">Loading dashboard...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold">
                    {currentUser?.profile?.companyProfile?.companyName || "Dashboard"}
                </h1>
                <Button onClick={logout} variant="outline" className="self-start sm:self-auto">Logout</Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Receivables</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{totalReceivables.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">Outstanding amount</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Monthly Sales</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{monthlySales.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">{format(now, "MMMM yyyy")}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Monthly Collections</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{monthlyCollections.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">{format(now, "MMMM yyyy")}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Parties</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeParties}</div>
                        <p className="text-xs text-muted-foreground">Total registered</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Monthly Revenue Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {revenueData.length > 0 && revenueData.some(d => d.revenue > 0) ? (
                            <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
                                <BarChart data={revenueData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="revenue" fill="#8884d8" name="Revenue (₹)" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                                No data available
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Product Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {productData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
                                <PieChart>
                                    <Pie
                                        data={productData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {productData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                                No data available
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* At a Glance Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Invoices</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {recentInvoices.length > 0 ? (
                            <div className="space-y-4">
                                {recentInvoices.map((inv, idx) => (
                                    <div key={idx} className="flex justify-between items-center border-b pb-2">
                                        <div>
                                            <div className="font-medium">{inv.invoiceNo}</div>
                                            <div className="text-sm text-muted-foreground">{inv.partyName}</div>
                                            <div className="text-xs text-muted-foreground">{format(parseISO(inv.date), "dd MMM yyyy")}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold">₹{inv.amount.toFixed(2)}</div>
                                            <div className="text-xs text-orange-600">{inv.status}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground py-8">
                                No invoices yet
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Top Debtors</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {topDebtors.length > 0 ? (
                            <div className="space-y-4">
                                {topDebtors.map((debtor, idx) => (
                                    <div key={idx} className="flex justify-between items-center border-b pb-2">
                                        <div>
                                            <div className="font-medium">{debtor.name}</div>
                                            <div className="text-sm text-muted-foreground">Outstanding</div>
                                        </div>
                                        <div className="font-bold text-red-600">₹{debtor.amount.toFixed(2)}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground py-8">
                                No outstanding debts
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
