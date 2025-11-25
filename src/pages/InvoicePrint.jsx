import { useEffect, useState, useRef } from "react";
import html2pdf from "html2pdf.js";
import { Download } from "lucide-react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { numberToWords } from "@/lib/numberToWords";
import { format, addDays } from "date-fns";

export default function InvoicePrint() {
    const { id } = useParams();
    const { currentUser } = useAuth();
    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const pdfRef = useRef();

    useEffect(() => {
        if (!currentUser || !id) return;
        const fetchInvoice = async () => {
            const docSnap = await getDoc(doc(db, "users", currentUser.uid, "invoices", id));
            if (docSnap.exists()) {
                setInvoice(docSnap.data());
            }
            setLoading(false);
        };
        fetchInvoice();
    }, [currentUser, id]);

    useEffect(() => {
        if (!loading && invoice) {
            document.title = invoice.invoiceNo; // Set title for print filename
        }
    }, [loading, invoice]);



    const handleDownloadPDF = () => {
        const element = pdfRef.current;
        const opt = {
            margin: 0,
            filename: `${invoice.invoiceNo}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save();
    };

    if (loading) return <div>Loading...</div>;
    if (!invoice) return <div>Invoice not found</div>;

    const company = currentUser.profile.companyProfile;
    const buyer = invoice.buyerDetails;
    const consignee = invoice.consigneeDetails;

    // Tax Logic
    const companyStateCode = company.stateCode;
    const buyerStateCode = buyer?.state ? buyer.state : "";

    const isIntraState = (company.stateCode && buyer.stateCode && company.stateCode === buyer.stateCode) ||
        (company.stateCode && buyer.state && company.stateCode.toLowerCase() === buyer.state.toLowerCase()) ||
        (company.address && buyer.address && company.address.toLowerCase().includes(buyer.address.toLowerCase()));

    const isIGST = !isIntraState;

    const freightCharges = parseFloat(invoice.freightCharges || 0);
    let totalQty = 0;
    let totalTaxable = 0;

    const itemsWithTax = invoice.items.map(item => {
        const qty = parseFloat(item.qty) || 0;
        const rate = parseFloat(item.rate) || 0;
        const amount = qty * rate;

        totalQty += qty;
        totalTaxable += amount; // This is actually Item Subtotal now

        return {
            ...item,
            amount,
        };
    });

    const subTotal = totalTaxable;
    const taxableValue = subTotal + freightCharges;
    const totalTaxAmount = taxableValue * 0.18;
    const totalAmountBeforeRoundoff = taxableValue + totalTaxAmount;
    const grandTotal = Math.round(totalAmountBeforeRoundoff);
    const roundOffAmount = grandTotal - totalAmountBeforeRoundoff;

    const taxWordAmount = Math.round(totalTaxAmount);
    const grandTotalWordAmount = grandTotal;

    // Get document type and determine appropriate labels
    const documentType = invoice.documentType || "Tax Invoice";
    const documentTitle = documentType;

    // Check if this is a Quotation (Proforma Invoices use invoice layout)
    const isQuotation = documentType === "Quotation";

    // Calculate Valid Until Date (30 days from invoice date for quotations)
    const validUntilDate = isQuotation ? addDays(new Date(invoice.date), 30) : null;

    // Determine copy text based on document type
    const getCopyText = (copyNumber) => {
        if (documentType === "Quotation") {
            return copyNumber === 1 ? "ORIGINAL FOR CUSTOMER" : "DUPLICATE FOR SUPPLIER";
        } else {
            return copyNumber === 1 ? "ORIGINAL FOR RECIPIENT" : "DUPLICATE FOR TRANSPORTER";
        }
    };

    // Professional Quotation Layout (Single Page)
    const renderQuotation = () => (
        <div className="quotation-page">
            <div className="quotation-container">
                {/* Header */}
                <div className="quotation-header">
                    <div className="company-info">
                        <div className="company-name">{company.companyName}</div>
                        <div className="company-address">{company.address}</div>
                        <div style={{ fontSize: '9pt', marginTop: '4px' }}>GSTIN: {company.gstin}</div>
                        <div style={{ fontSize: '9pt' }}>State: {company.state} ({company.stateCode})</div>
                    </div>
                    <div className="quotation-title-section">
                        <div className="quotation-title">{documentType.toUpperCase()}</div>
                        <div className="quotation-details">
                            <div className="detail-row">
                                <span className="detail-label">Quotation No:</span>
                                <span className="detail-value">{invoice.invoiceNo}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Date:</span>
                                <span className="detail-value">{format(new Date(invoice.date), "dd-MMM-yyyy")}</span>
                            </div>
                            {validUntilDate && (
                                <div className="detail-row">
                                    <span className="detail-label">Valid Until:</span>
                                    <span className="detail-value">{format(validUntilDate, "dd-MMM-yyyy")}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Client Section */}
                <div className="client-section">
                    <div className="section-title">Quotation For:</div>
                    <div className="client-name">{buyer?.name}</div>
                    <div className="client-address">{buyer?.address}</div>
                    {buyer?.gstin && <div style={{ fontSize: '9pt', marginTop: '4px' }}>GSTIN: {buyer.gstin}</div>}
                    {buyer?.state && <div style={{ fontSize: '9pt' }}>State: {buyer.state}</div>}
                </div>

                {/* Items Table */}
                <div className="items-section">
                    <table className="quotation-table">
                        <thead>
                            <tr>
                                <th className="col-sno">S.No</th>
                                <th className="col-description">Description</th>
                                <th className="col-hsn">HSN</th>
                                <th className="col-qty">Qty</th>
                                <th className="col-rate">Rate</th>
                                <th className="col-amount">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itemsWithTax.map((item, index) => (
                                <tr key={index}>
                                    <td className="text-center">{index + 1}</td>
                                    <td className="description-cell">{item.description}</td>
                                    <td className="text-center text-sm">{item.hsnCode}</td>
                                    <td className="text-center">{item.qty} {item.per}</td>
                                    <td className="text-right">₹{item.rate.toFixed(2)}</td>
                                    <td className="text-right font-semibold">₹{item.amount.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals Section */}
                <div className="totals-section">
                    <div className="totals-grid">
                        <div className="total-row">
                            <span>Subtotal:</span>
                            <span>₹{subTotal.toFixed(2)}</span>
                        </div>
                        {freightCharges > 0 && (
                            <div className="total-row">
                                <span>Freight Charges:</span>
                                <span>₹{freightCharges.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="total-row">
                            <span>Taxable Value:</span>
                            <span>₹{taxableValue.toFixed(2)}</span>
                        </div>
                        <div className="total-row">
                            <span>{isIGST ? "IGST @ 18%" : "GST (CGST 9% + SGST 9%)"}</span>
                            <span>₹{totalTaxAmount.toFixed(2)}</span>
                        </div>
                        <div className="total-row grand-total">
                            <span>Grand Total:</span>
                            <span>₹{grandTotal.toFixed(2)}</span>
                        </div>
                    </div>
                    <div className="amount-words">
                        Amount in Words: <span className="font-semibold">{numberToWords(grandTotalWordAmount)}</span>
                    </div>
                </div>

                {/* Terms & Conditions */}
                <div className="terms-section">
                    <div className="section-title">Terms & Conditions</div>
                    <div className="terms-content">
                        {invoice.termsOfDelivery || company.termsAndConditions ? (
                            <div className="whitespace-pre-line">{invoice.termsOfDelivery || company.termsAndConditions}</div>
                        ) : (
                            <>
                                <div>1. Prices are valid for 30 days from the quotation date</div>
                                <div>2. 50% advance payment required to confirm the order, remaining 50% before dispatch</div>
                                <div>3. Delivery period: 20-30 working days from receipt of advance payment</div>
                                <div>4. Delivery charges extra as per actual</div>
                                <div>5. All disputes subject to {company.state} jurisdiction</div>
                            </>
                        )}
                    </div>
                </div>

                {/* Bank Details */}
                {company.bankDetails && (
                    <div className="bank-section">
                        <div className="section-title">Bank Details</div>
                        <div className="bank-content">{company.bankDetails}</div>
                    </div>
                )}

                {/* Footer */}
                <div className="quotation-footer">
                    <div className="footer-note">
                        We trust this quotation meets your requirements and look forward to serving you.
                    </div>
                    <div className="signature-section">
                        <div>For {company.companyName}</div>
                        <div className="signature-space"></div>
                        <div>Authorized Signatory</div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderInvoice = (copyNumber) => (
        <div className="a4-page">
            <div className="invoice-border-box">
                <div className="header-title">
                    <span style={{ flex: 1 }}>{documentTitle}</span>
                    <span style={{ fontWeight: 'normal', fontStyle: 'italic', fontSize: '8pt' }}>({getCopyText(copyNumber)})</span>
                </div>

                <div className="row">
                    <div className="col w-50" style={{ padding: 0 }}>
                        <div style={{ padding: '4px 4px 6px 4px', borderBottom: '1px solid black', fontSize: '8pt' }}>
                            <div className="bold" style={{ fontSize: '10pt' }}>{company.companyName}</div>
                            <div style={{ whiteSpace: 'pre-line' }}>{company.address}</div>
                            <div>GSTIN/UIN: <span className="bold">{company.gstin}</span></div>
                            <div>State Name : <span className="bold">{company.state}</span>, Code : <span className="bold">{company.stateCode}</span></div>
                        </div>
                        <div style={{ padding: '4px 4px 6px 4px', borderBottom: '1px solid black', fontSize: '8pt' }}>
                            <div className="small">Consignee (Ship to)</div>
                            <div className="bold">{consignee?.name}</div>
                            <div style={{ whiteSpace: 'pre-line' }}>{consignee?.shippingAddress || consignee?.address}</div>
                            <div>GSTIN/UIN : <span className="bold">{consignee?.gstin}</span></div>
                            <div>State Name : <span className="bold">{consignee?.state}</span>, Code : <span className="bold">{consignee?.stateCode}</span></div>
                        </div>
                        <div style={{ padding: '4px 4px 6px 4px', fontSize: '8pt' }}>
                            <div className="small">Buyer (Bill to)</div>
                            <div className="bold">{buyer?.name}</div>
                            <div style={{ whiteSpace: 'pre-line' }}>{buyer?.address}</div>
                            <div>GSTIN/UIN : <span className="bold">{buyer?.gstin}</span></div>
                            <div>State Name : <span className="bold">{buyer?.state}</span>, Code : <span className="bold">{buyer?.stateCode}</span></div>
                        </div>
                    </div>
                    <div className="col w-50" style={{ padding: 0, fontSize: '8pt' }}>
                        <div className="sub-grid">
                            <div><div className="small">Invoice No.</div><div className="bold">{invoice.invoiceNo}</div></div>
                            <div><div className="small">Dated</div><div className="bold">{format(new Date(invoice.date), "dd-MMM-yy")}</div></div>
                        </div>
                        <div className="sub-grid">
                            <div><div className="small">e-Way Bill No.</div><div className="bold">{invoice.eWayBillNo}</div></div>
                            <div><div className="small">Mode/Terms of Payment</div><div>{invoice.modeOfPayment}</div></div>
                        </div>
                        <div className="sub-grid">
                            <div><div className="small">Reference No. & Date.</div><div className="bold">{invoice.invoiceNo} / {format(new Date(invoice.date), "dd-MMM-yy")}</div></div>
                            <div><div className="small">Other References</div><div></div></div>
                        </div>
                        <div className="sub-grid">
                            <div><div className="small">Buyer's Order No.</div><div></div></div>
                            <div><div className="small">Dated</div><div></div></div>
                        </div>
                        <div className="sub-grid">
                            <div><div className="small">Dispatch Doc No.</div><div>{invoice.dispatchDocNo}</div></div>
                            <div><div className="small">Delivery Note Date</div><div></div></div>
                        </div>
                        <div className="sub-grid">
                            <div><div className="small">Vehicle Number</div><div className="bold">{invoice.vehicleNo}</div></div>
                            <div><div className="small">Destination</div><div></div></div>
                        </div>
                        <div style={{ padding: '2px', height: 'auto', minHeight: '40px' }}>
                            <div className="small">
                                {documentType === "Proforma Invoice" || documentType === "Quotation"
                                    ? "Terms and Conditions"
                                    : "Terms of Delivery"}
                            </div>
                            <div style={{ fontSize: '7pt', lineHeight: '1.4', whiteSpace: 'pre-line' }}>
                                {documentType === "Proforma Invoice" || documentType === "Quotation" ? (
                                    invoice.termsOfDelivery ||
                                    "1. 50% advance payment required to confirm the order and remaining 50% before dispatch\n2. Delivery period: 20-30 working days from receipt of advance payment\n3. Delivery charges extra as per actual"
                                ) : (
                                    invoice.termsOfDelivery
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <table className="items-table" style={{ height: '100%' }}>
                        <thead>
                            <tr>
                                <th width="4%">Sl<br />No.</th>
                                <th width="50%">Description of Goods</th>
                                <th width="10%">HSN/SAC</th>
                                <th width="8%">Quantity</th>
                                <th width="9%">Rate</th>
                                <th width="5%">per</th>
                                <th width="14%">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itemsWithTax.map((item, index) => (
                                <tr key={index}>
                                    <td className="text-center">{index + 1}</td>
                                    <td>
                                        <div className="bold">{item.description}</div>
                                    </td>
                                    <td className="text-center">{item.hsnCode}</td>
                                    <td className="bold text-center">{item.qty} {item.per}</td>
                                    <td className="text-right">{item.rate}</td>
                                    <td className="text-center">{item.per}</td>
                                    <td className="text-right bold">
                                        <div>{item.amount.toFixed(2)}</div>
                                    </td>
                                </tr>
                            ))}

                            {/* Spacer row to push summary to bottom */}
                            <tr style={{ height: '100%' }}>
                                <td style={{ borderRight: '1px solid black' }}></td>
                                <td style={{ borderRight: '1px solid black' }}></td>
                                <td style={{ borderRight: '1px solid black' }}></td>
                                <td style={{ borderRight: '1px solid black' }}></td>
                                <td style={{ borderRight: '1px solid black' }}></td>
                                <td style={{ borderRight: '1px solid black' }}></td>
                                <td style={{ borderRight: 'none' }}></td>
                            </tr>

                            {/* Cartage Charges */}
                            {freightCharges > 0 && (
                                <tr>
                                    <td style={{ borderRight: '1px solid black' }}></td>
                                    <td className="text-right bold italic" style={{ borderRight: '1px solid black' }}>CARTAGE CHARGES</td>
                                    <td className="text-center" style={{ borderRight: '1px solid black' }}>9965</td>
                                    <td style={{ borderRight: '1px solid black' }}></td>
                                    <td style={{ borderRight: '1px solid black' }}></td>
                                    <td style={{ borderRight: '1px solid black' }}></td>
                                    <td className="text-right bold">{freightCharges.toFixed(2)}</td>
                                </tr>
                            )}

                            {/* Tax Rows */}
                            {isIGST ? (
                                <tr>
                                    <td style={{ borderRight: '1px solid black' }}></td>
                                    <td className="text-right bold italic" style={{ borderRight: '1px solid black' }}>Output Igst</td>
                                    <td style={{ borderRight: '1px solid black' }}></td>
                                    <td style={{ borderRight: '1px solid black' }}></td>
                                    <td style={{ borderRight: '1px solid black' }}></td>
                                    <td style={{ borderRight: '1px solid black' }}></td>
                                    <td className="text-right bold">{totalTaxAmount.toFixed(2)}</td>
                                </tr>
                            ) : (
                                <>
                                    <tr>
                                        <td style={{ borderRight: '1px solid black' }}></td>
                                        <td className="text-right bold italic" style={{ borderRight: '1px solid black' }}>Output Cgst</td>
                                        <td style={{ borderRight: '1px solid black' }}></td>
                                        <td style={{ borderRight: '1px solid black' }}></td>
                                        <td style={{ borderRight: '1px solid black' }}></td>
                                        <td style={{ borderRight: '1px solid black' }}></td>
                                        <td className="text-right bold">{(totalTaxAmount / 2).toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ borderRight: '1px solid black' }}></td>
                                        <td className="text-right bold italic" style={{ borderRight: '1px solid black' }}>Output Sgst</td>
                                        <td style={{ borderRight: '1px solid black' }}></td>
                                        <td style={{ borderRight: '1px solid black' }}></td>
                                        <td style={{ borderRight: '1px solid black' }}></td>
                                        <td style={{ borderRight: '1px solid black' }}></td>
                                        <td className="text-right bold">{(totalTaxAmount / 2).toFixed(2)}</td>
                                    </tr>
                                </>
                            )}

                            {/* Roundoff */}
                            <tr>
                                <td style={{ borderRight: '1px solid black' }}></td>
                                <td className="text-right bold italic" style={{ borderRight: '1px solid black' }}>Roundoff</td>
                                <td style={{ borderRight: '1px solid black' }}></td>
                                <td style={{ borderRight: '1px solid black' }}></td>
                                <td style={{ borderRight: '1px solid black' }}></td>
                                <td style={{ borderRight: '1px solid black' }}></td>
                                <td className="text-right bold">{roundOffAmount.toFixed(2)}</td>
                            </tr>

                        </tbody>
                        <tfoot>
                            <tr style={{ borderTop: '1px solid black', borderBottom: '1px solid black', height: '30px' }}>
                                <td style={{ borderRight: '1px solid black' }}></td>
                                <td className="text-right bold" style={{ borderRight: '1px solid black' }}>Total</td>
                                <td style={{ borderRight: '1px solid black' }}></td>
                                <td className="bold text-center" style={{ borderRight: '1px solid black' }}>{totalQty} Pcs</td>
                                <td style={{ borderRight: '1px solid black' }}></td>
                                <td style={{ borderRight: '1px solid black' }}></td>
                                <td className="bold text-right">₹ {grandTotal.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div>
                    <div style={{ padding: '4px', borderBottom: '1px solid black' }}>
                        <div className="small">
                            Amount Chargeable (in words)
                            <span style={{ float: 'right', fontStyle: 'italic' }}>E. & O.E</span>
                        </div>
                        <div className="bold italic">
                            {numberToWords(grandTotalWordAmount)}
                        </div>
                    </div>

                    <div style={{ padding: '0' }}>
                        <table className="tax-analysis-table">
                            <thead>
                                <tr>
                                    <th rowSpan="2">HSN/SAC</th>
                                    <th rowSpan="2">Taxable<br />Value</th>
                                    {isIGST ? (
                                        <th colSpan="2">Integrated Tax</th>
                                    ) : (
                                        <>
                                            <th colSpan="2">Central Tax</th>
                                            <th colSpan="2">State Tax</th>
                                        </>
                                    )}
                                    <th rowSpan="2">Total<br />Tax Amount</th>
                                </tr>
                                <tr>
                                    {isIGST ? (
                                        <><th>Rate</th><th>Amount</th></>
                                    ) : (
                                        <><th>Rate</th><th>Amount</th><th>Rate</th><th>Amount</th></>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="text-center">All Items</td>
                                    <td className="text-right">{taxableValue.toFixed(2)}</td>
                                    {isIGST ? (
                                        <>
                                            <td className="text-right">18%</td>
                                            <td className="text-right">{totalTaxAmount.toFixed(2)}</td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="text-right">9%</td>
                                            <td className="text-right">{(totalTaxAmount / 2).toFixed(2)}</td>
                                            <td className="text-right">9%</td>
                                            <td className="text-right">{(totalTaxAmount / 2).toFixed(2)}</td>
                                        </>
                                    )}
                                    <td className="text-right">{totalTaxAmount.toFixed(2)}</td>
                                </tr>
                                <tr className="bold">
                                    <td className="text-right">Total</td>
                                    <td className="text-right">{taxableValue.toFixed(2)}</td>
                                    {isIGST ? (
                                        <>
                                            <td></td>
                                            <td className="text-right">{totalTaxAmount.toFixed(2)}</td>
                                        </>
                                    ) : (
                                        <>
                                            <td></td>
                                            <td className="text-right">{(totalTaxAmount / 2).toFixed(2)}</td>
                                            <td></td>
                                            <td className="text-right">{(totalTaxAmount / 2).toFixed(2)}</td>
                                        </>
                                    )}
                                    <td className="text-right">{totalTaxAmount.toFixed(2)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div style={{ padding: '4px', borderBottom: '1px solid black' }}>
                        <div className="small">
                            Tax Amount (in words) : <span className="bold">{numberToWords(taxWordAmount)}</span>
                        </div>
                    </div>

                    <div className="row" style={{ borderBottom: 'none', minHeight: '100px' }}>
                        <div className="col w-50" style={{ borderRight: '1px solid black', padding: '4px' }}>
                            <div className="small" style={{ textDecoration: 'underline' }}>Declaration</div>
                            <div className="small">
                                We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
                            </div>
                        </div>
                        <div className="col w-50" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '4px' }}>
                            <div className="small text-right bold">For {company.companyName}</div>
                            <br /><br />
                            <div className="small text-right">Authorised Signatory</div>
                        </div>
                    </div>
                </div>
            </div >
            <div className="text-center small mt-1">This is a Computer Generated Invoice</div>
        </div >
    );

    return (
        <div className="bg-white text-black p-0 m-0 text-[10pt] font-sans leading-tight">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Arimo:wght@400;700&display=swap');
                
                /* === INVOICE STYLES === */
                .a4-page {
                    width: 210mm;
                    height: 296mm;
                    background: white;
                    color: #000;
                    font-family: 'Arimo', sans-serif;
                    font-size: 10pt;
                    line-height: 1.3;
                    box-sizing: border-box;
                    padding: 5mm;
                    margin: 0 auto;
                    position: relative;
                    page-break-after: always;
                }

                .a4-page:last-child {
                    page-break-after: auto;
                }

                .invoice-border-box { border: 1px solid #000; display: flex; flex-direction: column; height: 282mm; }
                .row { display: flex; border-bottom: 1px solid #000; }
                .col { padding: 4px; border-right: 1px solid #000; }
                .col:last-child { border-right: none; }
                .row:last-child { border-bottom: none; }
                
                .header-title { text-align: center; font-weight: bold; padding: 5px; border-bottom: 1px solid #000; display: flex; justify-content: space-between; font-size: 9pt; }
                
                .bold { font-weight: 700; }
                .small { font-size: 7pt; color: #333; margin-bottom: 2px; }
                .w-50 { width: 50%; }
                
                .sub-grid { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid #000; }
                .sub-grid > div { padding: 3px 4px 5px 4px; border-right: 1px solid #000; display: flex; flex-direction: column; justify-content: center; min-height: 32px; }
                .sub-grid > div:last-child { border-right: none; }
                
                .items-table { width: 100%; border-collapse: collapse; height: 100%; }
                .items-table th { border-bottom: 1px solid #000; border-right: 1px solid #000; font-weight: bold; text-align: center; font-size: 8pt; padding: 4px; background: #f0f0f0; }
                .items-table td { border-right: 1px solid #000; padding: 4px; vertical-align: top; font-size: 9pt; }
                .items-table td:last-child, .items-table th:last-child { border-right: none; }
                
                .tax-analysis-table { width: 100%; border-collapse: collapse; }
                .tax-analysis-table th, .tax-analysis-table td { border: 1px solid #000; padding: 6px; text-align: center; font-size: 8pt; }
                .tax-analysis-table th { background: #f0f0f0; }

                /* === QUOTATION STYLES === */
                .quotation-page {
                    width: 210mm;
                    min-height: 297mm;
                    max-height: 297mm;
                    background: white;
                    color: #000;
                    font-family: 'Inter', sans-serif;
                    font-size: 10pt;
                    box-sizing: border-box;
                    padding: 15mm 15mm 10mm 15mm;
                    margin: 0 auto;
                    page-break-after: auto;
                    display: flex;
                    flex-direction: column;
                }

                .quotation-container {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }

                .quotation-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    border-bottom: 2px solid #2563eb;
                }

                .company-info {
                    flex: 1;
                }

                .company-name {
                    font-size: 18pt;
                    font-weight: 700;
                    color: #1e3a8a;
                    margin-bottom: 8px;
                }

                .company-address {
                    font-size: 9pt;
                    color: #4b5563;
                    line-height: 1.5;
                    white-space: pre-line;
                    margin-bottom: 6px;
                }

                .quotation-title-section {
                    text-align: right;
                }

                .quotation-title {
                    font-size: 24pt;
                    font-weight: 800;
                    color: #1e3a8a;
                    margin-bottom: 10px;
                    letter-spacing: 1px;
                }

                .quotation-details {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .detail-row {
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                    font-size: 9pt;
                }

                .detail-label {
                    font-weight: 600;
                    color: #6b7280;
                }

                .detail-value {
                    font-weight: 500;
                    color: #111827;
                }

                .client-section {
                    background: #f8fafc;
                    padding: 12px 15px;
                    border-radius: 6px;
                    margin-bottom: 20px;
                    border-left: 4px solid #2563eb;
                }

                .section-title {
                    font-size: 9pt;
                    font-weight: 600;
                    text-transform: uppercase;
                    color: #6b7280;
                    margin-bottom: 8px;
                    letter-spacing: 0.5px;
                }

                .client-name {
                    font-size: 12pt;
                    font-weight: 700;
                    color: #111827;
                    margin-bottom: 5px;
                }

                .client-address {
                    font-size: 9pt;
                    color: #4b5563;
                    line-height: 1.5;
                    white-space: pre-line;
                }

                .items-section {
                    margin-bottom: 20px;
                    flex: 1;
                }

                .quotation-table {
                    width: 100%;
                    border-collapse: collapse;
                    background: white;
                }

                .quotation-table thead {
                    background: #e0f2fe;
                    border-bottom: 2px solid #2563eb;
                }

                .quotation-table th {
                    padding: 10px 8px;
                    text-align: left;
                    font-weight: 600;
                    font-size: 9pt;
                    color: #1e40af;
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                }

                .quotation-table tbody tr {
                    border-bottom: 1px solid #e5e7eb;
                }

                .quotation-table tbody tr:last-child {
                    border-bottom: 2px solid #cbd5e1;
                }

                .quotation-table td {
                    padding: 8px;
                    font-size: 9pt;
                    vertical-align: top;
                }

                .col-sno {
                    width: 5%;
                    text-align: center;
                }

                .col-description {
                    width: 45%;
                }

                .col-hsn {
                    width: 12%;
                    text-align: center;
                }

                .col-qty {
                    width: 10%;
                    text-align: center;
                }

                .col-rate {
                    width: 13%;
                    text-align: right;
                }

                .col-amount {
                    width: 15%;
                    text-align: right;
                }

                .description-cell {
                    line-height: 1.5;
                    white-space: pre-line;
                    color: #111827;
                }

                .text-sm {
                    font-size: 8pt;
                    color: #6b7280;
                }

                .totals-section {
                    margin-bottom: 20px;
                    border-top: 2px solid #cbd5e1;
                    padding-top: 15px;
                }

                .totals-grid {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    gap: 6px;
                    margin-bottom: 12px;
                }

                .total-row {
                    display: grid;
                    grid-template-columns: 200px 120px;
                    gap: 20px;
                    font-size: 9pt;
                }

                .total-row.grand-total {
                    font-size: 12pt;
                    font-weight: 700;
                    color: #1e3a8a;
                    border-top: 2px solid #2563eb;
                    padding-top: 8px;
                    margin-top: 8px;
                }

                .amount-words {
                    font-size: 9pt;
                    color: #374151;
                    padding: 8px 12px;
                    background: #f1f5f9;
                    border-radius: 4px;
                    border-left: 3px solid #2563eb;
                }

                .terms-section {
                    margin-bottom: 15px;
                }

                .terms-content {
                    font-size: 8.5pt;
                    color: #374151;
                    line-height: 1.6;
                    padding: 10px 0;
                }

                .terms-content > div {
                    margin-bottom: 4px;
                }

                .bank-section {
                    margin-bottom: 15px;
                    font-size: 8.5pt;
                }

                .bank-content {
                    background: #f8fafc;
                    padding: 8px 12px;
                    border-radius: 4px;
                    color: #374151;
                    line-height: 1.5;
                    white-space: pre-line;
                }

                .quotation-footer {
                    margin-top: auto;
                    padding-top: 15px;
                    border-top: 1px solid #cbd5e1;
                }

                .footer-note {
                    font-size: 8.5pt;
                    color: #6b7280;
                    font-style: italic;
                    margin-bottom: 20px;
                }

                .signature-section {
                    text-align: right;
                    font-size: 9pt;
                }

                .signature-space {
                    margin: 30px 0 10px;
                }

                .font-semibold {
                    font-weight: 600;
                }

                .whitespace-pre-line {
                    white-space: pre-line;
                }
                
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                .tax-row { font-style: italic; font-weight: bold; font-size: 8pt; }
            `}</style>

            <div className="no-print fixed top-0 left-0 right-0 bg-card text-card-foreground border-b border-border p-4 flex justify-between items-center z-50">
                <div className="font-bold text-lg">{isQuotation ? "Quotation Preview" : "Invoice Preview"}</div>
                <div className="flex gap-2">
                    <button onClick={handleDownloadPDF} className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded">
                        <Download size={16} /> Download PDF
                    </button>
                </div>
            </div>

            <div className="pt-20 bg-muted min-h-screen flex flex-col items-center gap-8 pb-8">
                <div ref={pdfRef}>
                    {isQuotation ? (
                        // Single page for Quotations/Proforma Invoices
                        renderQuotation()
                    ) : (
                        // Two copies for Tax Invoices
                        <>
                            {renderInvoice(1)}
                            {renderInvoice(2)}
                        </>
                    )}
                </div>
            </div>
        </div >
    );
}
