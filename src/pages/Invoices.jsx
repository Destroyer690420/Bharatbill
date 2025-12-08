import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, deleteDoc, doc, where, limit, getDocs } from "firebase/firestore";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Eye, Trash2, Printer, FileText, Download } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import html2pdf from "html2pdf.js";

export default function Invoices() {
    const { currentUser } = useAuth();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);

    // Report Generation State
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [reportData, setReportData] = useState(null);
    const [generatingReport, setGeneratingReport] = useState(false);
    const reportRef = useRef();

    useEffect(() => {
        if (!currentUser) return;

        // Only fetch Tax Invoices - limit to 50 most recent for performance
        // Note: orderBy removed temporarily to avoid index requirement
        const q = query(
            collection(db, "users", currentUser.uid, "invoices"),
            where("documentType", "==", "Tax Invoice"),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const invoicesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Sort client-side by date (newest first)
            invoicesData.sort((a, b) => new Date(b.date) - new Date(a.date));
            setInvoices(invoicesData);
            setLoading(false);
        });

        return unsubscribe;
    }, [currentUser]);

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this invoice?")) {
            try {
                await deleteDoc(doc(db, "users", currentUser.uid, "invoices", id));
            } catch (err) {
                console.error("Error deleting invoice:", err);
            }
        }
    };

    const handleDownloadReport = async () => {
        setGeneratingReport(true);
        try {
            // Calculate start and end date for the selected month
            const startDate = new Date(selectedYear, selectedMonth, 1);
            const endDate = endOfMonth(startDate);

            const startStr = format(startDate, "yyyy-MM-dd");
            const endStr = format(endDate, "yyyy-MM-dd");

            // Query all Tax Invoices
            // We filter by date client-side to avoid Firestore index requirements for compound queries
            const q = query(
                collection(db, "users", currentUser.uid, "invoices"),
                where("documentType", "==", "Tax Invoice")
            );

            const snapshot = await getDocs(q);
            const allInvoices = snapshot.docs.map(doc => doc.data());

            // Filter by date range
            const reportInvoices = allInvoices.filter(inv => {
                return inv.date >= startStr && inv.date <= endStr;
            });

            // Sort by date ascending
            reportInvoices.sort((a, b) => new Date(a.date) - new Date(b.date));

            if (reportInvoices.length === 0) {
                alert("No invoices found for the selected month.");
                setGeneratingReport(false);
                return;
            }

            setReportData({
                month: format(startDate, "MMMM yyyy"),
                invoices: reportInvoices,
                totals: reportInvoices.reduce((acc, inv) => ({
                    taxable: acc.taxable + (inv.taxableValue || 0),
                    tax: acc.tax + (inv.totalTax || 0),
                    total: acc.total + (inv.grandTotal || 0)
                }), { taxable: 0, tax: 0, total: 0 })
            });

            // Wait for state update and DOM render
            setTimeout(() => {
                try {
                    const element = reportRef.current;
                    if (!element) {
                        throw new Error("Report element not found");
                    }

                    const opt = {
                        margin: 5,
                        filename: `Sales_Register_${format(startDate, "MMM_yyyy")}.pdf`,
                        image: { type: 'jpeg', quality: 0.98 },
                        html2canvas: { scale: 2 },
                        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
                    };

                    html2pdf().set(opt).from(element).save().then(() => {
                        setGeneratingReport(false);
                        setIsReportModalOpen(false);
                        setReportData(null); // Clear data after generation
                    }).catch(pdfErr => {
                        console.error("PDF Generation Error:", pdfErr);
                        alert("Failed to generate PDF: " + pdfErr.message);
                        setGeneratingReport(false);
                    });
                } catch (innerErr) {
                    console.error("Error in timeout:", innerErr);
                    alert("An error occurred while preparing the PDF: " + innerErr.message);
                    setGeneratingReport(false);
                }
            }, 1000); // Increased timeout to ensure rendering

        } catch (err) {
            console.error("Error fetching data:", err);
            setGeneratingReport(false);
            alert("Failed to fetch data: " + err.message);
        }
    };

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Tax Invoices</h2>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="flex-1 sm:flex-none">
                                <FileText className="mr-2 h-4 w-4" /> Sales Report
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Download Sales Register</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Month</Label>
                                        <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {months.map((month, index) => (
                                                    <SelectItem key={index} value={index.toString()}>{month}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Year</Label>
                                        <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {years.map((year) => (
                                                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleDownloadReport} disabled={generatingReport}>
                                    {generatingReport ? "Generating..." : (
                                        <>
                                            <Download className="mr-2 h-4 w-4" /> Download PDF
                                        </>
                                    )}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Button asChild className="flex-1 sm:flex-none">
                        <Link to="/invoices/new">
                            <Plus className="mr-2 h-4 w-4" /> New Tax Invoice
                        </Link>
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-8">Loading...</div>
            ) : invoices.length === 0 ? (
                <div className="text-center py-8">No invoices found</div>
            ) : (
                <>
                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4">
                        {invoices.map((invoice) => (
                            <div key={invoice.id} className="bg-card border rounded-lg p-4 space-y-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-medium text-sm text-muted-foreground">Invoice No</div>
                                        <div className="font-semibold">{invoice.invoiceNo}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-medium text-sm text-muted-foreground">Amount</div>
                                        <div className="font-semibold text-lg">₹{invoice.grandTotal?.toFixed(2)}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                                    <div>
                                        <div className="font-medium text-sm text-muted-foreground">Date</div>
                                        <div>{invoice.date ? format(new Date(invoice.date), "dd/MM/yyyy") : "N/A"}</div>
                                    </div>
                                    <div>
                                        <div className="font-medium text-sm text-muted-foreground">Buyer</div>
                                        <div className="truncate">{invoice.buyerDetails?.name || "N/A"}</div>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2 border-t">
                                    <Link to={`/invoices/${invoice.id}`} className="flex-1">
                                        <Button variant="outline" size="sm" className="w-full">
                                            <Eye className="mr-2 h-4 w-4" /> View
                                        </Button>
                                    </Link>
                                    <Link to={`/invoices/${invoice.id}/print`} className="flex-1">
                                        <Button variant="outline" size="sm" className="w-full">
                                            <Printer className="mr-2 h-4 w-4" /> Print
                                        </Button>
                                    </Link>
                                    <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(invoice.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block rounded-md border overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table className="min-w-[600px]">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Invoice No</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Buyer</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invoices.map((invoice) => (
                                        <TableRow key={invoice.id}>
                                            <TableCell className="font-medium">{invoice.invoiceNo}</TableCell>
                                            <TableCell>{invoice.date ? format(new Date(invoice.date), "dd/MM/yyyy") : "N/A"}</TableCell>
                                            <TableCell>{invoice.buyerDetails?.name || "N/A"}</TableCell>
                                            <TableCell>₹{invoice.grandTotal?.toFixed(2)}</TableCell>
                                            <TableCell className="text-right space-x-2 whitespace-nowrap">
                                                <Link to={`/invoices/${invoice.id}`}>
                                                    <Button variant="ghost" size="icon">
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <Link to={`/invoices/${invoice.id}/print`}>
                                                    <Button variant="ghost" size="icon">
                                                        <Printer className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(invoice.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </>
            )}

            {/* Hidden Report Container */}
            <div style={{ position: "absolute", top: "-9999px", left: "-9999px" }}>
                {reportData && (
                    <div ref={reportRef} className="p-8 bg-white text-black font-sans" style={{ width: "297mm", minHeight: "210mm" }}>
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold text-center mb-2">{currentUser?.profile?.companyProfile?.companyName}</h1>
                            <h2 className="text-xl font-semibold text-center text-gray-700">Sales Register - {reportData.month}</h2>
                        </div>

                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border p-2 text-left">Date</th>
                                    <th className="border p-2 text-left">Invoice No</th>
                                    <th className="border p-2 text-left">Party Name</th>
                                    <th className="border p-2 text-left">GSTIN</th>
                                    <th className="border p-2 text-right">Taxable Amount</th>
                                    <th className="border p-2 text-right">Tax Amount</th>
                                    <th className="border p-2 text-right">Grand Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.invoices.map((inv, index) => (
                                    <tr key={index}>
                                        <td className="border p-2">{format(new Date(inv.date), "dd/MM/yyyy")}</td>
                                        <td className="border p-2">{inv.invoiceNo}</td>
                                        <td className="border p-2">{inv.buyerDetails?.name}</td>
                                        <td className="border p-2">{inv.buyerDetails?.gstin || "-"}</td>
                                        <td className="border p-2 text-right">₹{inv.taxableValue?.toFixed(2) || "0.00"}</td>
                                        <td className="border p-2 text-right">₹{inv.totalTax?.toFixed(2) || "0.00"}</td>
                                        <td className="border p-2 text-right">₹{inv.grandTotal?.toFixed(2) || "0.00"}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="font-bold bg-gray-50">
                                    <td className="border p-2 text-right" colSpan={4}>Total</td>
                                    <td className="border p-2 text-right">₹{reportData.totals.taxable.toFixed(2)}</td>
                                    <td className="border p-2 text-right">₹{reportData.totals.tax.toFixed(2)}</td>
                                    <td className="border p-2 text-right">₹{reportData.totals.total.toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
