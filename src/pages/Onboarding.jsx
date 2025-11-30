import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Onboarding() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        companyName: "",
        address: "",
        gstin: "",
        state: "",
        stateCode: "",
        bankName: "",
        accountNo: "",
        ifsc: "",
        branch: "",
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            if (!currentUser) throw new Error("No user logged in");

            await setDoc(doc(db, "users", currentUser.uid), {
                companyProfile: formData,
                createdAt: new Date(),
            });

            // navigate("/"); // Let PrivateRoute handle the redirect once profile is detected
        } catch (err) {
            setError("Failed to save profile: " + err.message);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-background p-8 flex justify-center">
            <Card className="w-full max-w-2xl h-fit">
                <CardHeader>
                    <CardTitle>Setup Company Profile</CardTitle>
                    <CardDescription>Enter your business details. These will appear on your invoices.</CardDescription>
                </CardHeader>
                <CardContent>
                    {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="companyName">Company Name</Label>
                                <Input id="companyName" required value={formData.companyName} onChange={handleChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="gstin">GSTIN</Label>
                                <Input id="gstin" required value={formData.gstin} onChange={handleChange} />
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
                            <h3 className="font-semibold">Bank Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Saving..." : "Save & Continue"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
