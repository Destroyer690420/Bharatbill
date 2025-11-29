import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from "firebase/firestore";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";

export default function Payments() {
    const { currentUser } = useAuth();
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        if (!currentUser) return;

        const q = query(collection(db, "users", currentUser.uid, "payments"), orderBy("date", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const paymentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPayments(paymentsData);
            setLoading(false);
        });

        return unsubscribe;
    }, [currentUser]);

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this payment?")) {
            try {
                await deleteDoc(doc(db, "users", currentUser.uid, "payments", id));
            } catch (err) {
                console.error("Error deleting payment:", err);
            }
        }
    };

    const filteredPayments = payments.filter(p =>
        p.partyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.referenceNo?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">Payments Received</h2>
                <Link to="/payments/new">
                    <Button><Plus className="mr-2 h-4 w-4" /> New Payment Entry</Button>
                </Link>
            </div>

            <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-slate-500" />
                <Input
                    placeholder="Search by party or reference..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                />
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Party Name</TableHead>
                            <TableHead>Mode</TableHead>
                            <TableHead>Reference</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={6} className="text-center">Loading...</TableCell></TableRow>
                        ) : filteredPayments.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center">No payments found</TableCell></TableRow>
                        ) : (
                            filteredPayments.map((payment) => (
                                <TableRow key={payment.id}>
                                    <TableCell>{format(new Date(payment.date), "dd/MM/yyyy")}</TableCell>
                                    <TableCell className="font-medium">{payment.partyName}</TableCell>
                                    <TableCell>{payment.mode}</TableCell>
                                    <TableCell>{payment.referenceNo || "-"}</TableCell>
                                    <TableCell className="text-right font-bold text-green-600">
                                        ₹{payment.amount?.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Link to={`/payments/${payment.id}`}>
                                            <Button variant="ghost" size="icon">
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(payment.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
