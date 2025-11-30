import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, deleteDoc, doc, onSnapshot, query, orderBy } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Search, FileSpreadsheet } from "lucide-react";

export default function Parties() {
    const { currentUser } = useAuth();
    const [parties, setParties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

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
                <Link to="/parties/new">
                    <Button className="w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" /> Add Party</Button>
                </Link>
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

            {loading ? (
                <div className="text-center py-8">Loading...</div>
            ) : filteredParties.length === 0 ? (
                <div className="text-center py-8">No parties found</div>
            ) : (
                <>
                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4">
                        {filteredParties.map((party) => (
                            <div key={party.id} className="bg-card border rounded-lg p-4 space-y-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-medium text-sm text-muted-foreground">Name</div>
                                        <div className="font-semibold">{party.name}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-medium text-sm text-muted-foreground">Type</div>
                                        <div className="capitalize">{party.type}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                                    <div>
                                        <div className="font-medium text-sm text-muted-foreground">GSTIN</div>
                                        <div className="truncate">{party.gstin || "-"}</div>
                                    </div>
                                    <div>
                                        <div className="font-medium text-sm text-muted-foreground">State</div>
                                        <div>{party.state || "-"}</div>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2 border-t">
                                    <Link to={`/parties/${party.id}/edit`} className="flex-1">
                                        <Button variant="outline" size="sm" className="w-full">
                                            <Pencil className="mr-2 h-4 w-4" /> Edit
                                        </Button>
                                    </Link>
                                    <Link to={`/parties/${party.id}/ledger`} className="flex-1">
                                        <Button variant="outline" size="sm" className="w-full">
                                            <FileSpreadsheet className="mr-2 h-4 w-4 text-blue-600" /> Ledger
                                        </Button>
                                    </Link>
                                    <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(party.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block rounded-md border overflow-hidden">
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
                                    {filteredParties.map((party) => (
                                        <TableRow key={party.id}>
                                            <TableCell className="font-medium">{party.name}</TableCell>
                                            <TableCell className="capitalize">{party.type}</TableCell>
                                            <TableCell>{party.gstin}</TableCell>
                                            <TableCell>{party.state}</TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Link to={`/parties/${party.id}/edit`}>
                                                    <Button variant="ghost" size="icon">
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                </Link>
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
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
