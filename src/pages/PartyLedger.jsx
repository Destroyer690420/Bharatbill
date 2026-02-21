import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, startOfMonth, endOfMonth, parseISO, isBefore, isAfter, isSameDay } from "date-fns";
import html2pdf from "html2pdf.js";
import { Download, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function PartyLedger() {
    const { id } = useParams();
    const { currentUser } = useAuth();
    const [party, setParty] = useState(null);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
    const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));

    const [ledgerData, setLedgerData] = useState({
        openingBalance: 0,
        debits: [], // Invoices
        credits: [], // Payments
        totalDebits: 0,
        totalCredits: 0,
        closingBalance: 0
    });

    const pdfRef = useRef();

    useEffect(() => {
        if (!currentUser || !id) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch Party Details
                const partySnap = await getDoc(doc(db, "users", currentUser.uid, "parties", id));
                if (partySnap.exists()) {
                    setParty(partySnap.data());
                }

                // Fetch Only Tax Invoices (Debits) - Exclude Quotations and Proforma Invoices
                const invoicesQ = query(
                    collection(db, "users", currentUser.uid, "invoices"),
                    where("buyerDetails.id", "==", id),
                    where("documentType", "==", "Tax Invoice")
                );
                const invoicesSnap = await getDocs(invoicesQ);
                const allInvoices = invoicesSnap.docs.map(doc => ({
                    id: doc.id,
                    date: doc.data().date,
                    type: "Sales",
                    refNo: doc.data().invoiceNo,
                    amount: doc.data().grandTotal || 0
                }));

                // Fetch All Payments (Credits)
                const paymentsQ = query(collection(db, "users", currentUser.uid, "payments"), where("partyId", "==", id));
                const paymentsSnap = await getDocs(paymentsQ);
                const allPayments = paymentsSnap.docs.map(doc => ({
                    id: doc.id,
                    date: doc.data().date,
                    type: "Receipt",
                    refNo: doc.data().mode,
                    description: doc.data().description,
                    amount: doc.data().amount || 0
                }));

                processLedger(allInvoices, allPayments, startDate, endDate);

            } catch (err) {
                console.error("Error fetching ledger data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [currentUser, id, startDate, endDate]);

    const processLedger = (invoices, payments, start, end) => {
        const startObj = parseISO(start);
        const endObj = parseISO(end);

        let openingBal = 0;
        const currentDebits = [];
        const currentCredits = [];
        let totDebits = 0;
        let totCredits = 0;

        // Calculate Opening Balance (Transactions before start date)
        invoices.forEach(inv => {
            const invDate = parseISO(inv.date);
            if (isBefore(invDate, startObj)) {
                openingBal += inv.amount;
            } else if ((isAfter(invDate, startObj) || isSameDay(invDate, startObj)) && (isBefore(invDate, endObj) || isSameDay(invDate, endObj))) {
                currentDebits.push(inv);
                totDebits += inv.amount;
            }
        });

        payments.forEach(pay => {
            const payDate = parseISO(pay.date);
            if (isBefore(payDate, startObj)) {
                openingBal -= pay.amount;
            } else if ((isAfter(payDate, startObj) || isSameDay(payDate, startObj)) && (isBefore(payDate, endObj) || isSameDay(payDate, endObj))) {
                currentCredits.push(pay);
                totCredits += pay.amount;
            }
        });

        // Sort by date
        currentDebits.sort((a, b) => new Date(a.date) - new Date(b.date));
        currentCredits.sort((a, b) => new Date(a.date) - new Date(b.date));

        setLedgerData({
            openingBalance: openingBal,
            debits: currentDebits,
            credits: currentCredits,
            totalDebits: totDebits,
            totalCredits: totCredits,
            closingBalance: openingBal + totDebits - totCredits
        });
    };

    const handleDownloadPDF = () => {
        const element = pdfRef.current;
        const opt = {
            margin: 10,
            filename: `Ledger_${party?.name}_${startDate}_to_${endDate}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save();
    };

    if (loading) return <div>Loading...</div>;
    if (!party) return <div>Party not found</div>;

    const company = currentUser.profile.companyProfile;
    const { openingBalance, debits, credits, totalDebits, totalCredits, closingBalance } = ledgerData;

    // Prepare rows for T-Format
    // We need to balance the rows visually if possible, but for now we just render two columns

    const closingBalSide = closingBalance > 0 ? "Credit" : "Debit"; // If positive, user owes us (Debit balance), so Closing Balance appears on Credit side to balance.
    const absClosingBal = Math.abs(closingBalance);

    const finalTotal = Math.max(
        (openingBalance > 0 ? openingBalance : 0) + totalDebits,
        (openingBalance < 0 ? Math.abs(openingBalance) : 0) + totalCredits
    );
    // Actually, standard accounting:
    // Debit Side: Opening Balance (if Dr), Sales
    // Credit Side: Opening Balance (if Cr), Receipts
    // Closing Balance is added to the smaller side to make totals equal.

    const isOpeningDr = openingBalance >= 0;

    const debitTotalCalc = (isOpeningDr ? openingBalance : 0) + totalDebits;
    const creditTotalCalc = (!isOpeningDr ? Math.abs(openingBalance) : 0) + totalCredits;

    const grandTotal = Math.max(debitTotalCalc, creditTotalCalc);

    return (
        <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Link to="/parties">
                        <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
                    </Link>
                    <h2 className="text-3xl font-bold tracking-tight">Party Ledger</h2>
                </div>
                <Button onClick={handleDownloadPDF}><Download className="mr-2 h-4 w-4" /> Download PDF</Button>
            </div>

            <Card>
                <CardHeader><CardTitle>Filter Options</CardTitle></CardHeader>
                <CardContent className="flex gap-4 items-end">
                    <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            style={{ colorScheme: 'dark' }}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>End Date</Label>
                        <Input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            style={{ colorScheme: 'dark' }}
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Opening Balance</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">₹{Math.abs(openingBalance).toFixed(2)} {openingBalance >= 0 ? "Dr" : "Cr"}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Closing Balance</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">₹{Math.abs(closingBalance).toFixed(2)} {closingBalance >= 0 ? "Dr" : "Cr"}</div></CardContent>
                </Card>
            </div>

            {/* PDF Container - Preview */}
            <div className="flex justify-center bg-muted p-8 overflow-auto">
                <div className="shadow-lg">
                    <div ref={pdfRef} className="p-4 text-xs font-sans text-black bg-white" style={{ width: '190mm', minHeight: '277mm' }}>

                        {/* Header Section */}
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-1/2">
                                <div className="flex">
                                    <span className="font-bold mr-2">To :</span>
                                    <div>
                                        <div className="font-bold">{party.name}</div>
                                        <div className="whitespace-pre-line text-xs">{party.address}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="w-1/2">
                                <div className="flex justify-end">
                                    <span className="font-bold mr-2">From :</span>
                                    <div className="text-right">
                                        <div className="font-bold">{company.companyName}</div>
                                        <div className="whitespace-pre-line text-xs">{company.address}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mb-4">
                            <div className="flex justify-between items-end mb-2">
                                <div>Dear Sir/Madam,</div>
                                <div>Date : {format(new Date(), "dd-MMM-yy")}</div>
                            </div>
                            <div className="text-center">
                                <div className="font-bold">Sub: Confirmation of Accounts</div>
                                <div>{format(parseISO(startDate), "d-MMM-yy")} to {format(parseISO(endDate), "d-MMM-yy")}</div>
                            </div>
                        </div>

                        <div className="mb-4 text-xs text-justify">
                            <p className="mb-2">Given below is the details of your Accounts as standing in my/our Books of Accounts for the above mentioned period.</p>
                            <p>Kindly return 3 copies stating your I.T. Permanent A/c No., duly signed and sealed, in confirmation of the same. Please note that if no reply is received from you within a fortnight, it will be assumed that you have accepted the balance shown below.</p>
                        </div>

                        {/* Table Section - Fixed Height with Vertical Line */}
                        <div className="border-t-2 border-b-2 border-black flex text-xs" style={{ minHeight: '600px' }}>

                            {/* Debit Side (Left) */}
                            <div className="w-1/2 border-r border-black flex flex-col relative">
                                {/* Header */}
                                <div className="border-b border-black flex font-bold py-1">
                                    <div className="w-20 pl-1">Date</div>
                                    <div className="flex-1 text-center">Particulars</div>
                                    <div className="w-24 text-right pr-1">Debit Amount</div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 p-1 flex flex-col">
                                    {isOpeningDr && (
                                        <div className="flex mb-1">
                                            <div className="w-20 font-bold">{format(parseISO(startDate), "d-MMM-yy")}</div>
                                            <div className="flex-1 font-bold">Opening Balance</div>
                                            <div className="w-24 text-right">{openingBalance.toFixed(2)}</div>
                                        </div>
                                    )}
                                    {debits.map((inv, i) => (
                                        <div key={i} className="flex mb-1">
                                            <div className="w-20">{format(parseISO(inv.date), "d-MMM-yy")}</div>
                                            <div className="flex-1">Sales - {inv.refNo}</div>
                                            <div className="w-24 text-right">{inv.amount.toFixed(2)}</div>
                                        </div>
                                    ))}

                                    {/* Closing Balance on Debit Side (if Credit Balance) */}
                                    {!isOpeningDr && closingBalance < 0 && (
                                        <div className="flex mt-auto pt-4 pb-1 items-end w-full pr-1">
                                            <div className="flex-1 text-right font-bold mr-4">Closing Balance</div>
                                            <div className="w-24 text-right font-bold">{Math.abs(closingBalance).toFixed(2)}</div>
                                        </div>
                                    )}


                                </div>

                                {/* Footer - Debit Side */}
                                <div className="mt-auto">
                                    {/* First Total Line */}
                                    <div className="border-t border-black py-1 flex justify-between font-bold pr-1">
                                        <div></div>
                                        <div>{grandTotal.toFixed(2)}</div>
                                    </div>
                                    {/* Second Total Line with double border */}
                                    <div className="py-1 flex justify-between font-bold pr-1 border-b-2 border-double">
                                        <div></div>
                                        <div>{grandTotal.toFixed(2)}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Credit Side (Right) */}
                            <div className="w-1/2 flex flex-col relative">
                                {/* Header */}
                                <div className="border-b border-black flex font-bold py-1">
                                    <div className="w-20 pl-1">Date</div>
                                    <div className="flex-1 text-center">Particulars</div>
                                    <div className="w-24 text-right pr-1">Credit Amount</div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 p-1 flex flex-col">
                                    {!isOpeningDr && (
                                        <div className="flex mb-1">
                                            <div className="w-20 font-bold">{format(parseISO(startDate), "d-MMM-yy")}</div>
                                            <div className="flex-1 font-bold">Opening Balance</div>
                                            <div className="w-24 text-right">{Math.abs(openingBalance).toFixed(2)}</div>
                                        </div>
                                    )}
                                    {credits.map((pay, i) => (
                                        <div key={i} className="flex mb-1">
                                            <div className="w-20">{format(parseISO(pay.date), "d-MMM-yy")}</div>
                                            <div className="flex-1">{pay.refNo} {pay.description ? `- ${pay.description}` : ''}</div>
                                            <div className="w-24 text-right">{pay.amount.toFixed(2)}</div>
                                        </div>
                                    ))}


                                </div>

                                {/* Footer - Credit Side (Tally Format) */}
                                <div className="mt-auto">
                                    {/* Line 1: Subtotal */}
                                    <div className="border-t border-black py-1 flex justify-end pr-1">
                                        <div className="w-24 text-right">{creditTotalCalc.toFixed(2)}</div>
                                    </div>

                                    {/* Line 2: Closing Balance (only if positive) */}
                                    {closingBalance >= 0 && (
                                        <div className="py-1 flex justify-between pr-1">
                                            <div className="flex-1 text-right mr-4">Closing Balance</div>
                                            <div className="w-24 text-right">{closingBalance.toFixed(2)}</div>
                                        </div>
                                    )}

                                    {/* Line 3: Grand Total */}
                                    <div className="border-t border-black py-1 flex justify-end pr-1 border-b-2 border-double">
                                        <div className="w-24 text-right font-bold">{grandTotal.toFixed(2)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="mt-4 flex justify-between items-end text-xs">
                            <div>I/We hereby confirm the above</div>
                            <div className="text-right">
                                <div className="font-bold">For {company.companyName}</div>
                                <div style={{ height: '50px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                                    {company.signatureDataUrl && (
                                        <img src={company.signatureDataUrl} alt="Signature" style={{ maxHeight: '50px', maxWidth: '150px', objectFit: 'contain' }} />
                                    )}
                                </div>
                                <div>Authorised Signatory</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
