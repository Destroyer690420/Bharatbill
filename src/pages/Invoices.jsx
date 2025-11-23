import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from "firebase/firestore";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Eye, Trash2, Printer } from "lucide-react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function Invoices() {
    const { currentUser } = useAuth();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [documentTypeFilter, setDocumentTypeFilter] = useState("All");

    useEffect(() => {
        if (!currentUser) return;

        const q = query(collection(db, "users", currentUser.uid, "invoices"), orderBy("date", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const invoicesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

    // Filter invoices based on document type
    const filteredInvoices = documentTypeFilter === "All"
        ? invoices
        : invoices.filter(inv => (inv.documentType || "Tax Invoice") === documentTypeFilter);

    const getDocumentTypeBadgeColor = (type) => {
        switch (type) {
            case "Quotation": return "bg-blue-100 text-blue-800";
            case "Proforma Invoice": return "bg-purple-100 text-purple-800";
            default: return "bg-green-100 text-green-800";
        }
    };

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Invoices</h2>
                <Link to="/invoices/new">
                    <Button className="w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" /> New Invoice</Button>
                </Link>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <label className="text-sm font-medium whitespace-nowrap">Filter by Type:</label>
                <Select value={documentTypeFilter} onValueChange={setDocumentTypeFilter}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="All">All Documents</SelectItem>
                        <SelectItem value="Tax Invoice">Tax Invoice</SelectItem>
                        <SelectItem value="Quotation">Quotation</SelectItem>
                        <SelectItem value="Proforma Invoice">Proforma Invoice</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="rounded-md border overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Invoice No</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Buyer</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={6} className="text-center">Loading...</TableCell></TableRow>
                            ) : filteredInvoices.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="text-center">No invoices found</TableCell></TableRow>
                            ) : (
                                filteredInvoices.map((invoice) => {
                                    const docType = invoice.documentType || "Tax Invoice";
                                    return (
                                        <TableRow key={invoice.id}>
                                            <TableCell className="font-medium">{invoice.invoiceNo}</TableCell>
                                            <TableCell>
                                                <Badge className={getDocumentTypeBadgeColor(docType)}>
                                                    {docType === "Tax Invoice" ? "Tax Invoice" : docType === "Quotation" ? "Quotation" : "Proforma"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{invoice.date ? format(new Date(invoice.date), "dd/MM/yyyy") : "N/A"}</TableCell>
                                            <TableCell>{invoice.buyerDetails?.name || "N/A"}</TableCell>
                                            <TableCell>₹{invoice.grandTotal?.toFixed(2)}</TableCell>
                                            <TableCell className="text-right space-x-2">
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
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
