import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, getDoc, getDocs, query, orderBy, updateDoc } from "firebase/firestore";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, Save } from "lucide-react";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function InvoiceForm() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const { id } = useParams();
    const [parties, setParties] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Autocomplete state for product search
    const [productSearch, setProductSearch] = useState({});
    const [showSuggestions, setShowSuggestions] = useState({});

    const { register, control, handleSubmit, setValue, watch, formState: { errors } } = useForm({
        defaultValues: {
            documentType: "Tax Invoice", // Hard-coded to Tax Invoice only
            invoiceNo: "",
            date: format(new Date(), "yyyy-MM-dd"),
            buyerId: "",
            consigneeId: "",
            eWayBillNo: "",
            modeOfPayment: "",
            dispatchDocNo: "",
            vehicleNo: "",
            termsOfDelivery: "",
            freightCharges: 0,
            items: [{ description: "", hsnCode: "", qty: 1, rate: 0, per: "Pcs", amount: 0 }],
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "items"
    });

    const watchItems = useWatch({
        control,
        name: "items",
    });

    // Fetch Parties and Products
    useEffect(() => {
        if (!currentUser) return;

        const fetchData = async () => {
            const partiesQ = query(collection(db, "users", currentUser.uid, "parties"), orderBy("name"));
            const productsQ = query(collection(db, "users", currentUser.uid, "products"), orderBy("name"));

            const [partiesSnap, productsSnap] = await Promise.all([getDocs(partiesQ), getDocs(productsQ)]);

            setParties(partiesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            setProducts(productsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        };

        fetchData();
    }, [currentUser]);

    // Auto-generate Tax Invoice Number
    useEffect(() => {
        if (!currentUser || id) return; // Don't auto-generate when editing

        const generateInvoiceNumber = async () => {
            // Fetch user profile to get the prefix
            const userDoc = await getDoc(doc(db, "users", currentUser.uid));
            const companyProfile = userDoc.data()?.companyProfile || {};
            const prefixCode = companyProfile.invoicePrefix || "INV";
            const prefix = `${prefixCode}/2025-26/`;

            // Fetch all Tax Invoices to find the last number
            const invoicesSnap = await getDocs(collection(db, "users", currentUser.uid, "invoices"));
            const invoices = invoicesSnap.docs.map(d => d.data());

            // Filter by Tax Invoice type
            const taxInvoices = invoices.filter(inv => inv.documentType === "Tax Invoice");

            let nextNumber = 1;

            // Extract numbers from existing tax invoices
            const numbers = taxInvoices
                .map(inv => {
                    // Dynamic regex based on the prefix
                    // We need to escape special characters in prefix if any, but assuming simple alphanumeric for now
                    // Actually, we should be careful. Let's just look for the pattern "PREFIX/2025-26/NUMBER"
                    // But wait, if the user CHANGED the prefix, we might want to continue the sequence from the OLD prefix?
                    // Or start a new sequence for the new prefix?
                    // Usually, changing prefix means starting a new series or continuing. 
                    // Requirement says: "If I set the prefix to "TATA" ... next generated invoice should be TATA/2025-26/36"
                    // This implies continuing the count? Or just finding the max number of THAT prefix?
                    // "If I set it to BILL, it should be BILL/2025-26/36" -> This implies the number 36 is global?
                    // Or maybe 36 was just an example number.
                    // Let's assume we want to find the max number across ALL tax invoices for the current financial year, regardless of prefix?
                    // OR, more likely, we find the max number for THIS prefix.
                    // If I change prefix, I probably want to start from 1 or continue.
                    // Let's stick to: Find max number matching the CURRENT prefix pattern.
                    // If the user wants to continue the number from a previous prefix, they might need to manually set the first one or we'd need more complex logic.
                    // Given the requirement "Fallback: ... default to INV", let's assume we just look for the configured prefix.

                    if (!inv.invoiceNo) return 0;

                    // Check if invoice number starts with the prefix
                    if (inv.invoiceNo.startsWith(prefix)) {
                        const part = inv.invoiceNo.replace(prefix, "");
                        return parseInt(part) || 0;
                    }
                    return 0;
                })
                .filter(n => n > 0);

            if (numbers.length > 0) {
                nextNumber = Math.max(...numbers) + 1;
            }

            const newInvoiceNo = `${prefix}${nextNumber}`;
            setValue("invoiceNo", newInvoiceNo);
        };

        generateInvoiceNumber();
    }, [currentUser, id, setValue]);

    // Fetch Invoice if editing
    useEffect(() => {
        if (!currentUser || !id) return;

        const fetchInvoice = async () => {
            const docSnap = await getDoc(doc(db, "users", currentUser.uid, "invoices", id));
            if (docSnap.exists()) {
                const data = docSnap.data();
                // Reset form with data
                Object.keys(data).forEach(key => {
                    setValue(key, data[key]);
                });
            }
        };

        fetchInvoice();
    }, [currentUser, id, setValue]);

    // Auto-fill Buyer/Consignee details
    const handlePartyChange = (partyId, type) => {
        const party = parties.find(p => p.id === partyId);
        if (party) {
            // In a real app, we might store the full party object or just the ID.
            // For the invoice, we usually want to snapshot the details at that time.
            // But for the form, we just set the ID.
            // We'll store the snapshot on save.
        }
    };

    // Calculations
    const calculateTotals = (items) => {
        let subTotal = 0;
        let totalQty = 0;

        const calculatedItems = items.map(item => {
            const qty = parseFloat(item.qty) || 0;
            const rate = parseFloat(item.rate) || 0;
            const amount = qty * rate;

            subTotal += amount;
            totalQty += qty;

            return { ...item, amount };
        });

        return { subTotal, totalQty };
    };

    const { subTotal, totalQty } = calculateTotals(watchItems || []);
    const freightCharges = parseFloat(watch("freightCharges") || 0);
    const taxableValue = subTotal + freightCharges;

    // Tax Calculation (Simplified for now - assuming 18% IGST or 9+9 CGST/SGST)
    // We need to check state codes to decide IGST vs CGST/SGST
    const buyerId = watch("buyerId");
    const buyer = parties.find(p => p.id === buyerId);
    const companyStateCode = currentUser?.profile?.companyProfile?.stateCode;
    const buyerStateCode = buyer?.state; // Assuming state is the code or we parse it. 
    // For MVP, let's just assume if strings match, it's intra-state.

    const isInterState = companyStateCode && buyerStateCode && companyStateCode.toLowerCase() !== buyerStateCode.toLowerCase();
    const taxRate = 18; // Default 18% for now, or fetch from items (complex)

    // Tax is calculated on (Item Subtotal + Freight)
    const totalTax = taxableValue * (taxRate / 100);
    const grandTotal = taxableValue + totalTax;

    const onSubmit = async (data) => {
        setLoading(true);
        setError("");
        try {
            const buyerDetails = parties.find(p => p.id === data.buyerId);
            const consigneeDetails = parties.find(p => p.id === data.consigneeId);

            const invoiceData = {
                ...data,
                buyerDetails, // Snapshot
                consigneeDetails, // Snapshot
                subTotal,
                freightCharges: parseFloat(data.freightCharges || 0),
                taxableValue,
                totalTax,
                grandTotal,
                totalQty,
                createdAt: new Date().toISOString(),
            };

            if (id) {
                await updateDoc(doc(db, "users", currentUser.uid, "invoices", id), invoiceData);
            } else {
                await addDoc(collection(db, "users", currentUser.uid, "invoices"), invoiceData);
            }
            navigate("/invoices");
        } catch (err) {
            setError("Failed to save invoice: " + err.message);
        }
        setLoading(false);
    };

    // Handle product search input
    const handleProductSearch = (index, value) => {
        setProductSearch(prev => ({ ...prev, [index]: value }));

        if (value.trim().length > 0) {
            setShowSuggestions(prev => ({ ...prev, [index]: true }));
        } else {
            setShowSuggestions(prev => ({ ...prev, [index]: false }));
        }
    };

    // Get filtered products for a specific row
    const getFilteredProducts = (index) => {
        const searchTerm = productSearch[index] || "";
        if (!searchTerm.trim()) return [];

        return products.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.hsnCode?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    // Handle product selection from suggestions
    const handleProductSelect = (index, product) => {
        setValue(`items.${index}.description`, product.name + (product.description ? `\n${product.description}` : ""));
        setValue(`items.${index}.hsnCode`, product.hsnCode);
        setValue(`items.${index}.rate`, product.defaultRate);
        setValue(`items.${index}.per`, product.unit);
        setProductSearch(prev => ({ ...prev, [index]: product.name }));
        setShowSuggestions(prev => ({ ...prev, [index]: false }));
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-20">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">{id ? "Edit Tax Invoice" : "New Tax Invoice"}</h2>
            </div>

            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                    <CardHeader><CardTitle>Tax Invoice Details</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Invoice No</Label>
                            <Input {...register("invoiceNo")} placeholder="e.g. NFI/2025-26/1" required />
                        </div>
                        <div className="space-y-2">
                            <Label>Date</Label>
                            <Input type="date" {...register("date")} required />
                        </div>
                        <div className="space-y-2">
                            <Label>e-Way Bill No</Label>
                            <Input {...register("eWayBillNo")} placeholder="e.g. 123456789012" />
                        </div>
                        <div className="space-y-2">
                            <Label>Buyer (Bill To)</Label>
                            <Select onValueChange={(val) => { setValue("buyerId", val); handlePartyChange(val, 'buyer'); }}>
                                <SelectTrigger><SelectValue placeholder="Select Buyer" /></SelectTrigger>
                                <SelectContent>
                                    {parties.filter(p => p.type === 'buyer' || !p.type).map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Consignee (Ship To)</Label>
                            <Select onValueChange={(val) => setValue("consigneeId", val)}>
                                <SelectTrigger><SelectValue placeholder="Select Consignee" /></SelectTrigger>
                                <SelectContent>
                                    {parties.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Vehicle No</Label>
                            <Input {...register("vehicleNo")} />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Items</CardTitle></CardHeader>
                    <CardContent>
                        {/* Desktop Table View */}
                        <div className="hidden md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[300px]">Description</TableHead>
                                        <TableHead>HSN</TableHead>
                                        <TableHead>Qty</TableHead>
                                        <TableHead>Rate</TableHead>
                                        <TableHead>Per</TableHead>
                                        <TableHead className="w-[120px]">Amount</TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {fields.map((field, index) => (
                                        <TableRow key={field.id}>
                                            <TableCell>
                                                <div className="relative mb-2">
                                                    <Input
                                                        placeholder="Search product..."
                                                        value={productSearch[index] || ""}
                                                        onChange={(e) => handleProductSearch(index, e.target.value)}
                                                        onFocus={() => {
                                                            if (productSearch[index]?.trim()) {
                                                                setShowSuggestions(prev => ({ ...prev, [index]: true }));
                                                            }
                                                        }}
                                                        onBlur={() => {
                                                            setTimeout(() => {
                                                                setShowSuggestions(prev => ({ ...prev, [index]: false }));
                                                            }, 200);
                                                        }}
                                                        className="w-full"
                                                    />
                                                    {showSuggestions[index] && getFilteredProducts(index).length > 0 && (
                                                        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
                                                            {getFilteredProducts(index).map((product) => (
                                                                <div
                                                                    key={product.id}
                                                                    className="px-3 py-2 hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm border-b last:border-b-0"
                                                                    onMouseDown={() => handleProductSelect(index, product)}
                                                                >
                                                                    <div className="font-medium">{product.name}</div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        HSN: {product.hsnCode} | Rate: ₹{product.defaultRate} | Unit: {product.unit}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <Textarea {...register(`items.${index}.description`)} placeholder="Description" className="min-h-[60px]" />
                                            </TableCell>
                                            <TableCell><Input {...register(`items.${index}.hsnCode`)} className="w-20" /></TableCell>
                                            <TableCell><Input type="number" {...register(`items.${index}.qty`)} className="w-20" /></TableCell>
                                            <TableCell><Input type="number" {...register(`items.${index}.rate`)} className="w-24" /></TableCell>
                                            <TableCell><Input {...register(`items.${index}.per`)} className="w-16" /></TableCell>
                                            <TableCell>
                                                {((parseFloat(watchItems[index]?.qty || 0) * parseFloat(watchItems[index]?.rate || 0))).toFixed(2)}
                                            </TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden space-y-6">
                            {fields.map((field, index) => (
                                <div key={field.id} className="bg-muted/30 p-4 rounded-lg border space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-medium text-sm text-muted-foreground">Item #{index + 1}</h4>
                                        <Button variant="ghost" size="sm" onClick={() => remove(index)} className="h-8 w-8 p-0 text-red-500">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="space-y-2">
                                            <Label>Product Search</Label>
                                            <div className="relative">
                                                <Input
                                                    placeholder="Search product..."
                                                    value={productSearch[index] || ""}
                                                    onChange={(e) => handleProductSearch(index, e.target.value)}
                                                    onFocus={() => {
                                                        if (productSearch[index]?.trim()) {
                                                            setShowSuggestions(prev => ({ ...prev, [index]: true }));
                                                        }
                                                    }}
                                                    onBlur={() => {
                                                        setTimeout(() => {
                                                            setShowSuggestions(prev => ({ ...prev, [index]: false }));
                                                        }, 200);
                                                    }}
                                                />
                                                {showSuggestions[index] && getFilteredProducts(index).length > 0 && (
                                                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
                                                        {getFilteredProducts(index).map((product) => (
                                                            <div
                                                                key={product.id}
                                                                className="px-3 py-2 hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm border-b last:border-b-0"
                                                                onMouseDown={() => handleProductSelect(index, product)}
                                                            >
                                                                <div className="font-medium">{product.name}</div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    HSN: {product.hsnCode} | Rate: ₹{product.defaultRate}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Description</Label>
                                            <Textarea {...register(`items.${index}.description`)} placeholder="Item description" className="min-h-[80px]" />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>HSN Code</Label>
                                                <Input {...register(`items.${index}.hsnCode`)} placeholder="HSN" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Unit</Label>
                                                <Input {...register(`items.${index}.per`)} placeholder="Pcs, Kg..." />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="space-y-2">
                                                <Label>Qty</Label>
                                                <Input type="number" {...register(`items.${index}.qty`)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Rate</Label>
                                                <Input type="number" {...register(`items.${index}.rate`)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Amount</Label>
                                                <div className="flex items-center h-10 px-3 border rounded-md bg-muted/50 font-medium">
                                                    {((parseFloat(watchItems[index]?.qty || 0) * parseFloat(watchItems[index]?.rate || 0))).toFixed(2)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Button type="button" variant="outline" className="w-full md:w-auto mt-4" onClick={() => append({ description: "", hsnCode: "", qty: 1, rate: 0, per: "Pcs", amount: 0 })}>
                            <Plus className="mr-2 h-4 w-4" /> Add Item
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row justify-end space-y-4 md:space-y-0">
                            <div className="w-full md:w-80 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Subtotal:</span>
                                    <span className="font-medium">₹{subTotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Freight / Shipping:</span>
                                    <Input
                                        type="number"
                                        {...register("freightCharges")}
                                        className="w-24 md:w-32 text-right h-8"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="flex justify-between items-center text-sm text-muted-foreground">
                                    <span>Taxable Value:</span>
                                    <span>₹{taxableValue.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Tax (18%):</span>
                                    <span>₹{totalTax.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-lg border-t pt-3 mt-2">
                                    <span>Grand Total:</span>
                                    <span>₹{grandTotal.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Desktop Actions */}
                <div className="hidden md:flex justify-end gap-4">
                    <Button type="button" variant="outline" onClick={() => navigate("/invoices")}>Cancel</Button>
                    <Button type="submit" disabled={loading}><Save className="mr-2 h-4 w-4" /> {loading ? "Saving..." : "Save Invoice"}</Button>
                </div>

                {/* Mobile Sticky Actions */}
                <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-background border-t z-50 flex gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => navigate("/invoices")}>Cancel</Button>
                    <Button type="submit" className="flex-1" disabled={loading}>
                        <Save className="mr-2 h-4 w-4" /> {loading ? "Saving..." : "Save"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
