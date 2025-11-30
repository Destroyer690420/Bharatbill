import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Moon, Sun } from "lucide-react";

export default function Settings() {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [formData, setFormData] = useState({
        companyName: "",
        address: "",
        gstin: "",
        invoicePrefix: "",
        state: "",
        stateCode: "",
        bankName: "",
        accountNo: "",
        ifsc: "",
        branch: "",
    });

    // Theme state
    const [theme, setTheme] = useState(() => {
        const savedTheme = localStorage.getItem('theme');
        return savedTheme || 'dark';
    });

    // Apply theme on mount and when theme changes
    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'light') {
            root.classList.add('light');
        } else {
            root.classList.remove('light');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    useEffect(() => {
        if (!currentUser) return;
        const fetchProfile = async () => {
            try {
                const docRef = doc(db, "users", currentUser.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists() && docSnap.data().companyProfile) {
                    setFormData(docSnap.data().companyProfile);
                }
            } catch (err) {
                console.error("Error fetching profile:", err);
                setError("Failed to load profile data.");
            } finally {
                setFetchLoading(false);
            }
        };
        fetchProfile();
    }, [currentUser]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
        if (success) setSuccess("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess("");

        try {
            if (!currentUser) throw new Error("No user logged in");

            await updateDoc(doc(db, "users", currentUser.uid), {
                companyProfile: formData,
            });

            setSuccess("Settings saved successfully!");
        } catch (err) {
            setError("Failed to save settings: " + err.message);
        }
        setLoading(false);
    };

    if (fetchLoading) return <div className="p-8 text-center">Loading settings...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Settings</h2>

            {/* Theme Toggle Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Appearance</CardTitle>
                    <CardDescription>Customize the look and feel of your application.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Theme</Label>
                            <div className="text-sm text-muted-foreground">
                                Switch between light and dark mode
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={toggleTheme}
                            className="h-10 w-10"
                        >
                            {theme === 'dark' ? (
                                <Sun className="h-5 w-5" />
                            ) : (
                                <Moon className="h-5 w-5" />
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Company Profile</CardTitle>
                    <CardDescription>Manage your business details and preferences.</CardDescription>
                </CardHeader>
                <CardContent>
                    {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
                    {success && <Alert className="mb-4 border-green-500 text-green-700 bg-green-50"><CheckCircle2 className="h-4 w-4 mr-2" /><AlertDescription>{success}</AlertDescription></Alert>}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="companyName">Company Name</Label>
                                <Input id="companyName" required value={formData.companyName} onChange={handleChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="gstin">GSTIN</Label>
                                <Input id="gstin" required value={formData.gstin} onChange={handleChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="invoicePrefix">Invoice Prefix</Label>
                                <Input id="invoicePrefix" value={formData.invoicePrefix} onChange={handleChange} placeholder="e.g. INV" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="address">Address</Label>
                            <Textarea id="address" required value={formData.address} onChange={handleChange} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="state">State Name</Label>
                                <Input id="state" required value={formData.state} onChange={handleChange} placeholder="e.g. Maharashtra" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="stateCode">State Code</Label>
                                <Input id="stateCode" required value={formData.stateCode} onChange={handleChange} placeholder="e.g. 27" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h3 className="font-semibold text-lg pt-4 border-t">Bank Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                <div className="space-y-2">
                                    <Label htmlFor="bankName">Bank Name</Label>
                                    <Input id="bankName" required value={formData.bankName} onChange={handleChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="accountNo">Account No</Label>
                                    <Input id="accountNo" required value={formData.accountNo} onChange={handleChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="ifsc">IFSC Code</Label>
                                    <Input id="ifsc" required value={formData.ifsc} onChange={handleChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="branch">Branch</Label>
                                    <Input id="branch" required value={formData.branch} onChange={handleChange} />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit" disabled={loading}>
                                {loading ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
