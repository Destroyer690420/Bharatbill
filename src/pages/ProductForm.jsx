import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, updateDoc, doc, getDoc, getDocs, query, orderBy } from "firebase/firestore";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save } from "lucide-react";

export default function ProductForm() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const { id } = useParams();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [products, setProducts] = useState([]);

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        hsnCode: "",
        unit: "Pcs",
        defaultRate: "",
        taxRate: "18",
    });

    useEffect(() => {
        if (!currentUser) return;

        const fetchProducts = async () => {
            const q = query(collection(db, "users", currentUser.uid, "products"), orderBy("name"));
            const snapshot = await getDocs(q);
            setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        };

        fetchProducts();
    }, [currentUser]);

    useEffect(() => {
        if (!currentUser || !id) return;

        const fetchProduct = async () => {
            try {
                const docSnap = await getDoc(doc(db, "users", currentUser.uid, "products", id));
                if (docSnap.exists()) {
                    setFormData(docSnap.data());
                }
            } catch (err) {
                setError("Failed to load product: " + err.message);
            }
        };

        fetchProduct();
    }, [currentUser, id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            // Check for duplicate product name
            const duplicateProduct = products.find(p =>
                p.name.toLowerCase().trim() === formData.name.toLowerCase().trim() &&
                p.id !== id
            );

            if (duplicateProduct) {
                setError("A product with this name already exists. Please use a different name.");
                setLoading(false);
                return;
            }

            const dataToSave = {
                ...formData,
                defaultRate: parseFloat(formData.defaultRate) || 0,
                taxRate: parseFloat(formData.taxRate) || 0,
            };

            if (id) {
                await updateDoc(doc(db, "users", currentUser.uid, "products", id), dataToSave);
            } else {
                await addDoc(collection(db, "users", currentUser.uid, "products"), dataToSave);
            }
            navigate("/products");
        } catch (err) {
            setError("Failed to save product: " + err.message);
        }
        setLoading(false);
    };

    return (
        <div className="space-y-6 max-w-3xl mx-auto pb-20">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">{id ? "Edit Product" : "New Product"}</h2>
            </div>

            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader><CardTitle>Product Details</CardTitle></CardHeader>
                    <CardContent className="grid gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="desc">Description</Label>
                            <Textarea id="desc" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="hsn">HSN Code</Label>
                            <Input id="hsn" value={formData.hsnCode} onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="unit">Unit</Label>
                                <Input id="unit" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} placeholder="e.g. Pcs, Kgs" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="rate">Default Rate</Label>
                                <Input id="rate" type="number" value={formData.defaultRate} onChange={(e) => setFormData({ ...formData, defaultRate: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tax">Tax Rate (%)</Label>
                            <Input id="tax" type="number" value={formData.taxRate} onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })} />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-4">
                    <Button type="button" variant="outline" onClick={() => navigate("/products")}>Cancel</Button>
                    <Button type="submit" disabled={loading}><Save className="mr-2 h-4 w-4" /> {loading ? "Saving..." : "Save Product"}</Button>
                </div>
            </form>
        </div>
    );
}
