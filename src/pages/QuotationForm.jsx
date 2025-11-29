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

export default function QuotationForm() {
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
            documentType: "Quotation",
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

    // Auto-generate Invoice Number based on Document Type
    useEffect(() => {
        if (!currentUser || id) return; // Don't auto-generate when editing

        const generateInvoiceNumber = async () => {
            const docType = watch("documentType") || "Quotation";

            // Fetch all invoices to find the last number for this type
            const invoicesSnap = await getDocs(collection(db, "users", currentUser.uid, "invoices"));
            const invoices = invoicesSnap.docs.map(d => d.data());

            // Filter by document type
            const sameTypeInvoices = invoices.filter(inv => inv.documentType === docType);

            let nextNumber = 1;
            let prefix = "";

            if (docType === "Proforma Invoice") {
                // Format: NFI/PI/2325/XX
                prefix = "NFI/PI/2325/";

                const numbers = sameTypeInvoices
                    .map(inv => {
                        const match = inv.invoiceNo?.match(/NFI\/PI\/2325\/(\d+)/);
                        return match ? parseInt(match[1]) : 0;
                    })
                    .filter(n => n > 0);

                if (numbers.length > 0) {
                    nextNumber = Math.max(...numbers) + 1;
                }
            } else if (docType === "Quotation") {
                // Format: QT/2325/XX
                prefix = "QT/2325/";

                const numbers = sameTypeInvoices
                    .map(inv => {
                        const match = inv.invoiceNo?.match(/QT\/2325\/(\d+)/);
                        return match ? parseInt(match[1]) : 0;
                    })
                    .filter(n => n > 0);

                if (numbers.length > 0) {
                    nextNumber = Math.max(...numbers) + 1;
                }
            }

            const newInvoiceNo = `${prefix}${nextNumber}`;
            setValue("invoiceNo", newInvoiceNo);
        };

        generateInvoiceNumber();
    }, [currentUser, id, watch("documentType")]);

    // Fetch Quotation if editing
    useEffect(() => {
        if (!currentUser || !id) return;

        const fetchQuotation = async () => {
            const docSnap = await getDoc(doc(db, "users", currentUser.uid, "invoices", id));
            if (docSnap.exists()) {
                const data = docSnap.data();
                // Reset form with data
                Object.keys(data).forEach(key => {
                    setValue(key, data[key]);
                });
            }
        };

        fetchQuotation();
    }, [currentUser, id, setValue]);

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

    const buyerId = watch("buyerId");
    const buyer = parties.find(p => p.id === buyerId);
    const companyStateCode = currentUser?.profile?.companyProfile?.stateCode;
    const buyerStateCode = buyer?.state;

    const isInterState = companyStateCode && buyerStateCode && companyStateCode.toLowerCase() !== buyerStateCode.toLowerCase();
    const taxRate = 18;

    const totalTax = taxableValue * (taxRate / 100);
    const grandTotal = taxableValue + totalTax;

    const onSubmit = async (data) => {
        setLoading(true);
        setError("");
        try {
            const buyerDetails = parties.find(p => p.id === data.buyerId);
            const consigneeDetails = parties.find(p => p.id === data.consigneeId);

            const quotationData = {
                ...data,
                buyerDetails,
                consigneeDetails,
                subTotal,
                freightCharges: parseFloat(data.freightCharges || 0),
                taxableValue,
                totalTax,
                grandTotal,
                totalQty,
                createdAt: new Date().toISOString(),
            };

            if (id) {
                await updateDoc(doc(db, "users", currentUser.uid, "invoices", id), quotationData);
            } else {
                await addDoc(collection(db, "users", currentUser.uid, "invoices"), quotationData);
            }
            navigate("/quotations");
        } catch (err) {
            setError("Failed to save quotation: " + err.message);
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
                <h2 className="text-3xl font-bold tracking-tight">{id ? "Edit Quotation" : "New Quotation"}</h2>
            </div>

            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                    <CardHeader><CardTitle>Quotation Details</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2 md:col-span-3">
                            <Label>Document Type</Label>
                            <Select
                                onValueChange={(val) => {
                                    setValue("documentType", val);
                                    setValue("invoiceNo", "");
                                }}
                                defaultValue={watch("documentType") || "Quotation"}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Document Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Quotation">Quotation</SelectItem>
                                    <SelectItem value="Proforma Invoice">Proforma Invoice</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Invoice No</Label>
                            <Input {...register("invoiceNo")} placeholder="e.g. QT/2325/1" required />
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
                            <Select onValueChange={(val) => setValue("buyerId", val)}>
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
                                                    <div className="absolute z-50 w-full mt-1 bg-black border border-[#2F3336] rounded-md shadow-lg max-h-60 overflow-auto">
                                                        {getFilteredProducts(index).map((product) => (
                                                            <div
                                                                key={product.id}
                                                                className="px-3 py-2 hover:bg-[#16181C] cursor-pointer text-sm border-b border-[#2F3336] last:border-b-0"
                                                                onMouseDown={() => handleProductSelect(index, product)}
                                                            >
                                                                <div className="font-medium text-[#E7E9EA]">{product.name}</div>
                                                                <div className="text-xs text-[#71767B]">
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
                        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => append({ description: "", hsnCode: "", qty: 1, rate: 0, per: "Pcs", amount: 0 })}>
                            <Plus className="mr-2 h-4 w-4" /> Add Item
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex justify-end space-y-2">
                            <div className="w-80 space-y-2">
                                <div className="flex justify-between items-center">
                                    <span>Subtotal:</span>
                                    <span>₹{subTotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span>Freight / Shipping Charges:</span>
                                    <Input
                                        type="number"
                                        {...register("freightCharges")}
                                        className="w-32 text-right h-8"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="flex justify-between items-center text-sm text-muted-foreground">
                                    <span>Taxable Value:</span>
                                    <span>₹{taxableValue.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span>Tax (18%):</span>
                                    <span>₹{totalTax.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-lg border-t pt-2">
                                    <span>Grand Total:</span>
                                    <span>₹{grandTotal.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-4">
                    <Button type="button" variant="outline" onClick={() => navigate("/quotations")}>Cancel</Button>
                    <Button type="submit" disabled={loading}><Save className="mr-2 h-4 w-4" /> {loading ? "Saving..." : "Save Quotation"}</Button>
                </div>
            </form>
        </div>
    );
}
