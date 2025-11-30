import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, updateDoc, doc, getDoc } from "firebase/firestore";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save } from "lucide-react";

export default function PartyForm() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const { id } = useParams();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        name: "",
        type: "buyer",
        gstin: "",
        state: "",
        stateCode: "",
        address: "",
        shippingAddress: "",
    });

    useEffect(() => {
        if (!currentUser || !id) return;

        const fetchParty = async () => {
            try {
                const docSnap = await getDoc(doc(db, "users", currentUser.uid, "parties", id));
                if (docSnap.exists()) {
                    setFormData(docSnap.data());
                }
            } catch (err) {
                setError("Failed to load party: " + err.message);
            }
        };

        fetchParty();
    }, [currentUser, id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            if (id) {
                await updateDoc(doc(db, "users", currentUser.uid, "parties", id), formData);
            } else {
                await addDoc(collection(db, "users", currentUser.uid, "parties"), formData);
            }
            navigate("/parties");
        } catch (err) {
            setError("Failed to save party: " + err.message);
        }
        setLoading(false);
    };

    return (
        <div className="space-y-6 max-w-3xl mx-auto pb-20">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">{id ? "Edit Party" : "New Party"}</h2>
            </div>

            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader><CardTitle>Party Details</CardTitle></CardHeader>
                    <CardContent className="grid gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="type">Type</Label>
                            <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="buyer">Buyer (Bill To)</SelectItem>
                                    <SelectItem value="consignee">Consignee (Ship To)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="gstin">GSTIN</Label>
                            <Input id="gstin" value={formData.gstin} onChange={(e) => setFormData({ ...formData, gstin: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="state">State</Label>
                                <Input id="state" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="stateCode">State Code</Label>
                                <Input id="stateCode" value={formData.stateCode} onChange={(e) => setFormData({ ...formData, stateCode: e.target.value })} placeholder="e.g. 08" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="address">Address</Label>
                            <Textarea id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="shipAddr">Shipping Address</Label>
                            <Textarea id="shipAddr" value={formData.shippingAddress} onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })} placeholder="Same as Address if empty" />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-4">
                    <Button type="button" variant="outline" onClick={() => navigate("/parties")}>Cancel</Button>
                    <Button type="submit" disabled={loading}><Save className="mr-2 h-4 w-4" /> {loading ? "Saving..." : "Save Party"}</Button>
                </div>
            </form>
        </div>
    );
}
