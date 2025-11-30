import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, deleteDoc, doc, onSnapshot, query, orderBy } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Search } from "lucide-react";

export default function Products() {
    const { currentUser } = useAuth();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        if (!currentUser) return;

        const q = query(collection(db, "users", currentUser.uid, "products"), orderBy("name"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProducts(productsData);
            setLoading(false);
        });

        return unsubscribe;
    }, [currentUser]);

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this product?")) {
            try {
                await deleteDoc(doc(db, "users", currentUser.uid, "products", id));
            } catch (err) {
                console.error("Error deleting product:", err);
            }
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.hsnCode?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Products (Inventory)</h2>
                <Link to="/products/new">
                    <Button className="w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" /> Add Product</Button>
                </Link>
            </div>

            <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-slate-500" />
                <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                />
            </div>

            {loading ? (
                <div className="text-center py-8">Loading...</div>
            ) : filteredProducts.length === 0 ? (
                <div className="text-center py-8">No products found</div>
            ) : (
                <>
                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4">
                        {filteredProducts.map((product) => (
                            <div key={product.id} className="bg-card border rounded-lg p-4 space-y-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-medium text-sm text-muted-foreground">Product Name</div>
                                        <div className="font-semibold">{product.name}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-medium text-sm text-muted-foreground">Rate</div>
                                        <div className="font-semibold">₹{product.defaultRate}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3 pt-2 border-t">
                                    <div>
                                        <div className="font-medium text-sm text-muted-foreground">HSN</div>
                                        <div className="truncate">{product.hsnCode || "-"}</div>
                                    </div>
                                    <div>
                                        <div className="font-medium text-sm text-muted-foreground">Unit</div>
                                        <div>{product.unit}</div>
                                    </div>
                                    <div>
                                        <div className="font-medium text-sm text-muted-foreground">Tax %</div>
                                        <div>{product.taxRate}%</div>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2 border-t">
                                    <Link to={`/products/${product.id}/edit`} className="flex-1">
                                        <Button variant="outline" size="sm" className="w-full">
                                            <Pencil className="mr-2 h-4 w-4" /> Edit
                                        </Button>
                                    </Link>
                                    <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(product.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>HSN</TableHead>
                                    <TableHead>Unit</TableHead>
                                    <TableHead>Rate</TableHead>
                                    <TableHead>Tax %</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredProducts.map((product) => (
                                    <TableRow key={product.id}>
                                        <TableCell className="font-medium">{product.name}</TableCell>
                                        <TableCell>{product.hsnCode}</TableCell>
                                        <TableCell>{product.unit}</TableCell>
                                        <TableCell>{product.defaultRate}</TableCell>
                                        <TableCell>{product.taxRate}%</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Link to={`/products/${product.id}/edit`}>
                                                <Button variant="ghost" size="icon">
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(product.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </>
            )}
        </div>
    );
}
