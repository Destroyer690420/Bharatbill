import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search, FileSpreadsheet } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Parties() {
    const { currentUser } = useAuth();
    const [parties, setParties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingParty, setEditingParty] = useState(null);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        name: "",
        type: "buyer", // buyer or consignee (or both, but let's keep it simple for now)
        gstin: "",
        state: "",
        address: "",
        shippingAddress: "",
    });

    useEffect(() => {
        if (!currentUser) return;

        const q = query(collection(db, "users", currentUser.uid, "parties"), orderBy("name"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const partiesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setParties(partiesData);
            setLoading(false);
        });

        return unsubscribe;
    }, [currentUser]);

    const handleSave = async () => {
        setError("");
        try {
            if (editingParty) {
                await updateDoc(doc(db, "users", currentUser.uid, "parties", editingParty.id), formData);
            } else {
                await addDoc(collection(db, "users", currentUser.uid, "parties"), formData);
            }
            setIsDialogOpen(false);
            resetForm();
        } catch (err) {
            setError("Failed to save party: " + err.message);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this party?")) {
            try {
                await deleteDoc(doc(db, "users", currentUser.uid, "parties", id));
            } catch (err) {
                console.error("Error deleting party:", err);
            }
        }
    };

    const filteredParties = parties.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.gstin?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Parties (Ledgers)</h2>
                <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                    <DialogTrigger asChild>
                        <Button><Plus className="mr-2 h-4 w-4" /> Add Party</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>{editingParty ? "Edit Party" : "Add New Party"}</DialogTitle>
                        </DialogHeader>
                        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Name</Label>
                                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="type" className="text-right">Type</Label>
                                <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val })}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="buyer">Buyer (Bill To)</SelectItem>
                                        <SelectItem value="consignee">Consignee (Ship To)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="gstin" className="text-right">GSTIN</Label>
                                <Input id="gstin" value={formData.gstin} onChange={(e) => setFormData({ ...formData, gstin: e.target.value })} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="state" className="text-right">State</Label>
                                <Input id="state" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="stateCode" className="text-right">State Code</Label>
                                <Input id="stateCode" value={formData.stateCode} onChange={(e) => setFormData({ ...formData, stateCode: e.target.value })} className="col-span-3" placeholder="e.g. 08" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="address" className="text-right">Address</Label>
                                <Textarea id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="shipAddr" className="text-right">Ship Addr</Label>
                                <Textarea id="shipAddr" value={formData.shippingAddress} onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })} className="col-span-3" placeholder="Same as Address if empty" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" onClick={handleSave}>Save changes</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <Input
                        type="text"
                        placeholder="Search parties by name or GSTIN..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full"
                    />
                </div>
            </div>

            <div className="rounded-md border overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>GSTIN</TableHead>
                                <TableHead>State</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5} className="text-center">Loading...</TableCell></TableRow>
                            ) : filteredParties.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center">No parties found</TableCell></TableRow>
                            ) : (
                                filteredParties.map((party) => (
                                    <TableRow key={party.id}>
                                        <TableCell className="font-medium">{party.name}</TableCell>
                                        <TableCell className="capitalize">{party.type}</TableCell>
                                        <TableCell>{party.gstin}</TableCell>
                                        <TableCell>{party.state}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(party)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Link to={`/parties/${party.id}/ledger`}>
                                                <Button variant="ghost" size="icon" title="View Ledger">
                                                    <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                                                </Button>
                                            </Link>
                                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(party.id)}>
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
        </div>
    );

    function resetForm() {
        setFormData({
            name: "",
            type: "buyer",
            gstin: "",
            state: "",
            stateCode: "",
            address: "",
            shippingAddress: "",
        });
        setEditingParty(null);
    }

    function handleEdit(party) {
        setFormData(party);
        setEditingParty(party);
        setIsDialogOpen(true);
    }
}
