import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, deleteDoc, doc, where, limit } from "firebase/firestore";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Eye, Trash2, Printer } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function Quotations() {
    const { currentUser } = useAuth();
    const [quotations, setQuotations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) return;

        // Only fetch Quotations and Proforma Invoices - limit to 50 most recent for performance
        // Note: orderBy removed temporarily to avoid index requirement
        const q = query(
            collection(db, "users", currentUser.uid, "invoices"),
            where("documentType", "in", ["Quotation", "Proforma Invoice"]),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const quotationsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Sort client-side by date (newest first)
            quotationsData.sort((a, b) => new Date(b.date) - new Date(a.date));
            setQuotations(quotationsData);
            setLoading(false);
        });

        return unsubscribe;
    }, [currentUser]);

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this quotation?")) {
            try {
                await deleteDoc(doc(db, "users", currentUser.uid, "invoices", id));
            } catch (err) {
                console.error("Error deleting quotation:", err);
            }
        }
    };

    const getDocumentTypeBadgeColor = (type) => {
        switch (type) {
            case "Quotation": return "bg-blue-100 text-blue-800";
            case "Proforma Invoice": return "bg-purple-100 text-purple-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Quotations & Proforma Invoices</h2>
                <Link to="/quotations/new">
                    <Button className="w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" /> New Quotation</Button>
                </Link>
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
                            ) : quotations.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="text-center">No quotations found</TableCell></TableRow>
                            ) : (
                                quotations.map((quotation) => {
                                    const docType = quotation.documentType || "Quotation";
                                    return (
                                        <TableRow key={quotation.id}>
                                            <TableCell className="font-medium">{quotation.invoiceNo}</TableCell>
                                            <TableCell>
                                                <Badge className={getDocumentTypeBadgeColor(docType)}>
                                                    {docType === "Quotation" ? "Quotation" : "Proforma"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{quotation.date ? format(new Date(quotation.date), "dd/MM/yyyy") : "N/A"}</TableCell>
                                            <TableCell>{quotation.buyerDetails?.name || "N/A"}</TableCell>
                                            <TableCell>₹{quotation.grandTotal?.toFixed(2)}</TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Link to={`/quotations/${quotation.id}`}>
                                                    <Button variant="ghost" size="icon">
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <Link to={`/invoices/${quotation.id}/print`}>
                                                    <Button variant="ghost" size="icon">
                                                        <Printer className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(quotation.id)}>
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
