import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, updateDoc, doc, getDocs, getDoc, query, orderBy } from "firebase/firestore";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";

export default function PaymentForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [parties, setParties] = useState([]);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        date: format(new Date(), "yyyy-MM-dd"),
        partyId: "",
        amount: "",
        mode: "Bank Transfer",
        referenceNo: "",
        description: "",
    });

    useEffect(() => {
        if (!currentUser) return;

        const fetchParties = async () => {
            const q = query(collection(db, "users", currentUser.uid, "parties"), orderBy("name"));
            const snapshot = await getDocs(q);
            setParties(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        };

        const fetchPayment = async () => {
            if (!id) return;
            const docSnap = await getDoc(doc(db, "users", currentUser.uid, "payments", id));
            if (docSnap.exists()) {
                setFormData(docSnap.data());
            }
        };

        fetchParties();
        fetchPayment();
    }, [currentUser, id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const selectedParty = parties.find(p => p.id === formData.partyId);
            const paymentData = {
                ...formData,
                partyName: selectedParty ? selectedParty.name : "",
                amount: parseFloat(formData.amount),
                updatedAt: new Date().toISOString(),
            };

            if (id) {
                await updateDoc(doc(db, "users", currentUser.uid, "payments", id), paymentData);
            } else {
                paymentData.createdAt = new Date().toISOString();
                await addDoc(collection(db, "users", currentUser.uid, "payments"), paymentData);
            }
            navigate("/payments");
        } catch (err) {
            setError("Failed to save payment: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto pb-20">
            <h2 className="text-3xl font-bold tracking-tight mb-6">{id ? "Edit Payment" : "New Payment Entry"}</h2>

            {error && <Alert variant="destructive" className="mb-6"><AlertDescription>{error}</AlertDescription></Alert>}

            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader><CardTitle>Payment Details</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Date</Label>
                                <Input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Party</Label>
                                <Select
                                    value={formData.partyId}
                                    onValueChange={(val) => setFormData({ ...formData, partyId: val })}
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Party" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {parties.map(party => (
                                            <SelectItem key={party.id} value={party.id}>{party.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Amount (₹)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Payment Mode</Label>
                                <Select
                                    value={formData.mode}
                                    onValueChange={(val) => setFormData({ ...formData, mode: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                        <SelectItem value="Cash">Cash</SelectItem>
                                        <SelectItem value="Cheque">Cheque</SelectItem>
                                        <SelectItem value="UPI">UPI</SelectItem>
                                        <SelectItem value="Adjustment">Adjustment (TDS/PF/ESI)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Reference / Cheque No.</Label>
                            <Input
                                value={formData.referenceNo}
                                onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })}
                                placeholder="e.g. UTR Number or Cheque Number"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Description / Particulars</Label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="e.g. Received via NEFT from HDFC Bank"
                            />
                        </div>

                        <div className="flex justify-end gap-4 pt-4">
                            <Button type="button" variant="outline" onClick={() => navigate("/payments")}>Cancel</Button>
                            <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Payment"}</Button>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </div>
    );
}
