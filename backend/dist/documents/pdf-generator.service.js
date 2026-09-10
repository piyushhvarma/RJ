var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
function numberToIndianWords(num) {
    if (!num || isNaN(num))
        return 'Zero Rupees Only';
    const a = [
        '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
        'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
    ];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    function inWords(n) {
        if (n < 20)
            return a[n];
        if (n < 100)
            return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
        if (n < 1000)
            return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + inWords(n % 100) : '');
        if (n < 100000)
            return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + inWords(n % 1000) : '');
        if (n < 10000000)
            return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + inWords(n % 100000) : '');
        return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + inWords(n % 10000000) : '');
    }
    const integerPart = Math.floor(num);
    return `${inWords(integerPart)} Rupees Only`;
}
function formatDate(date) {
    if (!date)
        return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime()))
        return 'N/A';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}
let PdfGeneratorService = class PdfGeneratorService {
    streamToBuffer(doc) {
        return new Promise((resolve, reject) => {
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', (err) => reject(err));
        });
    }
    drawHeader(doc, title, docCode) {
        doc.rect(40, 30, 532, 4).fill('#b45309');
        doc.fillColor('#78350f').fontSize(16).font('Helvetica-Bold')
            .text('RADHIKA JEWELLERS / SILVERANSH', 40, 42, { align: 'center' });
        doc.fillColor('#4b5563').fontSize(8).font('Helvetica')
            .text('Main Road, Murtizapur, Dist. Akola (Maharashtra) - 444107 | Mobile: +91 98220 00000', 40, 60, { align: 'center' })
            .text('Registered Gold Loan & Girvi Pawn Broking Services | RBI & Maharashtra Pawn Brokers Act Compliant', 40, 71, { align: 'center' });
        doc.moveTo(40, 85).lineTo(572, 85).strokeColor('#d1d5db').lineWidth(1).stroke();
        doc.rect(40, 92, 532, 22).fill('#fef3c7');
        doc.fillColor('#92400e').fontSize(11).font('Helvetica-Bold')
            .text(title.toUpperCase(), 40, 98, { align: 'center' });
        if (docCode) {
            doc.fillColor('#6b7280').fontSize(8).font('Helvetica')
                .text(`Doc Ref: ${docCode}`, 420, 72, { align: 'right' });
        }
    }
    async generatePledgeAgreement(loan) {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const bufferPromise = this.streamToBuffer(doc);
        this.drawHeader(doc, 'SANCTION LETTER & PLEDGE AGREEMENT (GIRVI PAWN TICKET)', `DOC-${loan.loanCode}`);
        let y = 125;
        doc.rect(40, y, 260, 105).strokeColor('#e5e7eb').lineWidth(1).stroke();
        doc.rect(40, y, 260, 18).fill('#f3f4f6');
        doc.fillColor('#111827').fontSize(9).font('Helvetica-Bold').text('LOAN & SANCTION DETAILS', 48, y + 5);
        doc.fontSize(8).font('Helvetica').fillColor('#374151');
        doc.text(`Loan Code: `, 48, y + 25).font('Helvetica-Bold').text(loan.loanCode, 115, y + 25);
        doc.font('Helvetica').text(`Sanction Date: `, 48, y + 40).text(formatDate(loan.sanctionedDate), 115, y + 40);
        doc.text(`Maturity Date: `, 48, y + 55).text(formatDate(loan.maturityDate), 115, y + 55);
        doc.text(`Scheme: `, 48, y + 70).text(loan.scheme?.name ?? 'Standard Gold Loan', 115, y + 70);
        doc.text(`Vault Box: `, 48, y + 85).font('Helvetica-Bold').fillColor('#b45309')
            .text(loan.packet?.storageLocation?.label ?? 'Box-Assigned', 115, y + 85);
        const cust = loan.customer;
        doc.rect(312, y, 260, 105).strokeColor('#e5e7eb').lineWidth(1).stroke();
        doc.rect(312, y, 260, 18).fill('#f3f4f6');
        doc.fillColor('#111827').fontSize(9).font('Helvetica-Bold').text('BORROWER (PLEDGER) DETAILS', 320, y + 5);
        doc.fontSize(8).font('Helvetica').fillColor('#374151');
        doc.text(`Customer Code: `, 320, y + 25).font('Helvetica-Bold').text(cust.customerCode, 395, y + 25);
        doc.font('Helvetica').text(`Full Name: `, 320, y + 40).font('Helvetica-Bold').text(cust.fullName, 395, y + 40);
        doc.font('Helvetica').text(`Father/Spouse: `, 320, y + 55).text(cust.guardianName || 'N/A', 395, y + 55);
        doc.text(`Mobile: `, 320, y + 70).text(cust.mobile || 'Not on Record', 395, y + 70);
        const addr = [cust.address, cust.city, cust.state].filter(Boolean).join(', ') || 'N/A';
        doc.text(`Address: `, 320, y + 85).text(addr.slice(0, 42), 395, y + 85);
        y += 115;
        doc.rect(40, y, 532, 50).fill('#fafaf9').strokeColor('#d6d3d1').lineWidth(1).stroke();
        const pAmt = loan.principalAmount || 0;
        const rate = loan.interestRate || 0;
        const rateMonthly = (rate / 12).toFixed(2);
        doc.fillColor('#1c1917').fontSize(8).font('Helvetica')
            .text('SANCTIONED AMOUNT', 55, y + 8)
            .text('INTEREST RATE', 200, y + 8)
            .text('MONTHLY RATE', 340, y + 8)
            .text('INTEREST TYPE', 460, y + 8);
        doc.fillColor('#047857').fontSize(13).font('Helvetica-Bold')
            .text(`Rs. ${pAmt.toLocaleString('en-IN')}`, 55, y + 22);
        doc.fillColor('#1f2937').fontSize(11).font('Helvetica-Bold')
            .text(`${rate}% p.a.`, 200, y + 24)
            .text(`${rateMonthly}% p.m.`, 340, y + 24)
            .fontSize(9).text(loan.interestType?.replace('_', ' ') || 'SIMPLE', 460, y + 25);
        doc.fillColor('#4b5563').fontSize(7.5).font('Helvetica-Oblique')
            .text(`Amount in Words: ${numberToIndianWords(pAmt)}`, 55, y + 38);
        y += 60;
        const items = loan.jewelleryItems || [];
        const totalGross = items.reduce((acc, it) => acc + (it.grossWeight || 0), 0);
        const totalNet = items.reduce((acc, it) => acc + (it.netWeight || 0), 0);
        const totalVal = items.reduce((acc, it) => acc + (it.valuation || 0), 0);
        const ltv = totalVal > 0 ? ((pAmt / totalVal) * 100).toFixed(1) : '0';
        doc.rect(40, y, 532, 38).fill('#f8fafc').strokeColor('#e2e8f0').lineWidth(1).stroke();
        doc.fillColor('#334155').fontSize(8).font('Helvetica-Bold')
            .text('PLEDGED COLLATERAL SUMMARY (Details in Schedule A):', 48, y + 6);
        doc.fontSize(8).font('Helvetica').fillColor('#1e293b')
            .text(`Total Items: ${items.length} Article(s)`, 48, y + 20)
            .text(`Gross Weight: ${totalGross.toFixed(3)} g`, 180, y + 20)
            .text(`Net Pure Weight: ${totalNet.toFixed(3)} g`, 310, y + 20)
            .text(`Assessed Valuation: Rs. ${totalVal.toLocaleString('en-IN')}`, 430, y + 20);
        y += 48;
        doc.rect(40, y, 532, 175).strokeColor('#e5e7eb').lineWidth(1).stroke();
        doc.rect(40, y, 532, 16).fill('#f3f4f6');
        doc.fillColor('#111827').fontSize(8).font('Helvetica-Bold').text('TERMS, CONDITIONS & STATUTORY DECLARATION', 48, y + 4);
        const terms = [
            '1. OWNERSHIP DECLARATION: The borrower declares that they are the sole, absolute, lawful owner of the pledged gold/silver ornaments, and the same are free from any previous lien, family dispute, or criminal proceeding.',
            '2. INTEREST & REPAYMENT: Interest is calculated on a monthly simple basis as specified above. Interest must be serviced regularly. Minimum loan tenure is 7 days and maximum period is up to the maturity date specified.',
            '3. CUSTODY & INSURANCE: Pledged articles are stored in a secured bank-grade dual-custody vault under fireproof and insured safe custody. Packet seal is intact and tagged with physical box index.',
            '4. DEFAULT & AUCTION: If the principal and interest are not repaid within 30 days after the maturity date, the lender reserves the right to issue a 14-day legal notice and auction the pledged collateral through an approved public auctioneer to recover the dues in accordance with the Maharashtra Pawn Brokers Act.',
            '5. REDEMPTION PROCEDURE: The physical collateral shall be returned only upon full payment of principal and interest to the borrower in person after biometrics/photo verification and surrender of this original pledge ticket.',
            '6. REPRINT/DUPLICATE: In case of loss of this original receipt, immediate written intimation with police complaint and indemnity bond is required before any duplicate receipt or redemption is processed.'
        ];
        let termY = y + 22;
        doc.fontSize(6.5).font('Helvetica').fillColor('#4b5563');
        for (const t of terms) {
            doc.text(t, 48, termY, { width: 516, lineGap: 1.5 });
            termY += doc.heightOfString(t, { width: 516, lineGap: 1.5 }) + 3.5;
        }
        y += 190;
        doc.rect(40, y, 532, 95).strokeColor('#d1d5db').lineWidth(1).stroke();
        doc.fillColor('#374151').fontSize(7.5).font('Helvetica');
        doc.lineCap('butt').moveTo(55, y + 65).lineTo(185, y + 65).strokeColor('#9ca3af').stroke();
        doc.text("Borrower Signature / Thumb Impression", 55, y + 70, { width: 130, align: 'center' });
        doc.fontSize(6.5).fillColor('#6b7280').text(`Name: ${cust.fullName.slice(0, 22)}`, 55, y + 80, { width: 130, align: 'center' });
        doc.lineCap('butt').moveTo(240, y + 65).lineTo(370, y + 65).strokeColor('#9ca3af').stroke();
        doc.fontSize(7.5).fillColor('#374151').text("Assaying Valuer / Appraiser", 240, y + 70, { width: 130, align: 'center' });
        doc.fontSize(6.5).fillColor('#6b7280').text("Assessed & Weighed in presence", 240, y + 80, { width: 130, align: 'center' });
        doc.lineCap('butt').moveTo(425, y + 65).lineTo(555, y + 65).strokeColor('#9ca3af').stroke();
        doc.fontSize(7.5).fillColor('#374151').text("Authorized Signatory & Seal", 425, y + 70, { width: 130, align: 'center' });
        doc.fontSize(6.5).fillColor('#6b7280').text("For Radhika Jewellers / Silveransh", 425, y + 80, { width: 130, align: 'center' });
        doc.fontSize(6.5).fillColor('#9ca3af')
            .text(`Generated on: ${new Date().toLocaleString('en-IN')} | System Ver: ERP-V2.1 | Secure Verification Token: ${loan.id.slice(0, 8).toUpperCase()}`, 40, 785, { align: 'center' });
        doc.end();
        return bufferPromise;
    }
    async generateJewelleryAnnexure(loan) {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const bufferPromise = this.streamToBuffer(doc);
        this.drawHeader(doc, "SCHEDULE 'A': ITEM-WISE JEWELLERY VALUATION & COLLATERAL ANNEXURE", `ANNEX-${loan.loanCode}`);
        let y = 125;
        doc.rect(40, y, 532, 28).fill('#f8fafc').strokeColor('#e2e8f0').lineWidth(1).stroke();
        doc.fillColor('#1e293b').fontSize(8.5).font('Helvetica-Bold')
            .text(`Loan Code: ${loan.loanCode}`, 48, y + 8)
            .text(`Customer: ${loan.customer?.fullName}`, 200, y + 8)
            .text(`Vault Box: ${loan.packet?.storageLocation?.label ?? 'Box-Assigned'}`, 430, y + 8);
        y += 38;
        doc.rect(40, y, 532, 20).fill('#475569');
        doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold');
        doc.text('#', 45, y + 6);
        doc.text('Item Code', 65, y + 6);
        doc.text('Metal', 150, y + 6);
        doc.text('Category & Description', 195, y + 6);
        doc.text('Gross (g)', 340, y + 6);
        doc.text('Stone (g)', 390, y + 6);
        doc.text('Net (g)', 440, y + 6);
        doc.text('Purity', 485, y + 6);
        doc.text('Valuation', 525, y + 6, { align: 'right', width: 42 });
        y += 20;
        const items = loan.jewelleryItems || [];
        let totalGross = 0;
        let totalStone = 0;
        let totalNet = 0;
        let totalVal = 0;
        doc.font('Helvetica').fontSize(7.5);
        for (let i = 0; i < items.length; i++) {
            const it = items[i];
            totalGross += it.grossWeight || 0;
            totalStone += it.stoneWeight || 0;
            totalNet += it.netWeight || 0;
            totalVal += it.valuation || 0;
            const bg = i % 2 === 0 ? '#ffffff' : '#f9fafb';
            doc.rect(40, y, 532, 18).fill(bg);
            doc.fillColor('#374151');
            doc.text(String(i + 1), 45, y + 5);
            doc.text(it.itemCode.slice(-14), 65, y + 5);
            doc.font('Helvetica-Bold').fillColor(it.metalType === 'SILVER' ? '#475569' : '#b45309')
                .text(it.metalType || 'GOLD', 150, y + 5);
            doc.font('Helvetica').fillColor('#1f2937')
                .text((it.description || it.category).slice(0, 28), 195, y + 5);
            doc.text((it.grossWeight || 0).toFixed(3), 340, y + 5);
            doc.text((it.stoneWeight || 0).toFixed(3), 390, y + 5);
            doc.font('Helvetica-Bold').text((it.netWeight || 0).toFixed(3), 440, y + 5);
            doc.font('Helvetica').text(it.purityKarat || '22K', 485, y + 5);
            doc.text(`Rs.${(it.valuation || 0).toLocaleString('en-IN')}`, 510, y + 5, { align: 'right', width: 57 });
            y += 18;
            if (y > 680 && i < items.length - 1) {
                doc.addPage();
                y = 50;
            }
        }
        doc.rect(40, y, 532, 22).fill('#fef3c7').strokeColor('#fde68a').stroke();
        doc.fillColor('#92400e').fontSize(8.5).font('Helvetica-Bold');
        doc.text(`TOTAL ARTICLES: ${items.length}`, 48, y + 6);
        doc.text(`${totalGross.toFixed(3)} g`, 335, y + 6);
        doc.text(`${totalStone.toFixed(3)} g`, 385, y + 6);
        doc.text(`${totalNet.toFixed(3)} g`, 435, y + 6);
        doc.text(`Rs. ${totalVal.toLocaleString('en-IN')}`, 505, y + 6, { align: 'right', width: 62 });
        y += 35;
        doc.rect(40, y, 532, 60).fill('#fafaf9').strokeColor('#e7e5e4').lineWidth(1).stroke();
        doc.fillColor('#292524').fontSize(8).font('Helvetica-Bold').text('APPRAISER & QUALITY CERTIFICATION:', 48, y + 6);
        doc.fontSize(7).font('Helvetica').fillColor('#44403c')
            .text('All articles enumerated above were tested for purity, assessed for weight, and valued in the physical presence of the customer. Hallmark markings and stones weight deductions are explicitly recorded. Valuation represents intrinsic metal value assessed at prevailing daily board rate.', 48, y + 20, { width: 516, lineGap: 2 });
        y += 80;
        doc.lineCap('butt').moveTo(55, y + 45).lineTo(220, y + 45).strokeColor('#9ca3af').stroke();
        doc.fontSize(7.5).fillColor('#374151').font('Helvetica')
            .text("Customer Verification Signature", 55, y + 50, { width: 165, align: 'center' });
        doc.fontSize(6.5).fillColor('#6b7280')
            .text("Accepted weights & descriptions as listed above", 55, y + 60, { width: 165, align: 'center' });
        doc.lineCap('butt').moveTo(390, y + 45).lineTo(555, y + 45).strokeColor('#9ca3af').stroke();
        doc.fontSize(7.5).fillColor('#374151').font('Helvetica')
            .text("Authorized Assayer / Appraiser Signature", 390, y + 50, { width: 165, align: 'center' });
        doc.fontSize(6.5).fillColor('#6b7280')
            .text("Certified accurate to standard tolerance", 390, y + 60, { width: 165, align: 'center' });
        doc.end();
        return bufferPromise;
    }
    async generatePaymentReceipt(payment) {
        const doc = new PDFDocument({ margin: 40, size: 'A5', layout: 'landscape' });
        const bufferPromise = this.streamToBuffer(doc);
        this.drawHeader(doc, 'OFFICIAL PAYMENT & INTEREST RECEIPT', payment.receiptNumber || payment.paymentCode);
        let y = 125;
        doc.rect(40, y, 515, 30).fill('#f8fafc').strokeColor('#e2e8f0').lineWidth(1).stroke();
        doc.fillColor('#1e293b').fontSize(8.5).font('Helvetica')
            .text(`Receipt No: `, 48, y + 8).font('Helvetica-Bold').text(payment.receiptNumber || payment.paymentCode, 105, y + 8)
            .font('Helvetica').text(`Date: `, 250, y + 8).font('Helvetica-Bold').text(formatDate(payment.paymentDate), 275, y + 8)
            .font('Helvetica').text(`Loan Ref: `, 385, y + 8).font('Helvetica-Bold').text(payment.loan?.loanCode, 435, y + 8);
        y += 38;
        doc.rect(40, y, 515, 65).strokeColor('#e5e7eb').lineWidth(1).stroke();
        const cust = payment.loan?.customer;
        doc.fontSize(8).font('Helvetica').fillColor('#374151')
            .text('Received with thanks from:', 48, y + 8)
            .font('Helvetica-Bold').fontSize(10).fillColor('#111827').text(cust?.fullName || 'N/A', 48, y + 20)
            .font('Helvetica').fontSize(8).fillColor('#4b5563')
            .text(`Customer Code: ${cust?.customerCode || 'N/A'} | Mobile: ${cust?.mobile || 'N/A'}`, 48, y + 35)
            .text(`Payment Mode: ${payment.mode} | Transaction Ref: ${payment.paymentCode}`, 48, y + 48);
        doc.rect(360, y + 8, 185, 48).fill('#ecfdf5').strokeColor('#a7f3d0').stroke();
        doc.fillColor('#065f46').fontSize(7.5).font('Helvetica').text('AMOUNT RECEIVED', 370, y + 14);
        doc.fillColor('#047857').fontSize(15).font('Helvetica-Bold').text(`Rs. ${(payment.amount || 0).toLocaleString('en-IN')}`, 370, y + 26);
        y += 75;
        doc.rect(40, y, 515, 20).fill('#f3f4f6');
        doc.fillColor('#374151').fontSize(8).font('Helvetica-Bold');
        doc.text('Principal Repaid', 50, y + 6);
        doc.text('Interest Paid', 180, y + 6);
        doc.text('Overdue/Penalty', 310, y + 6);
        doc.text('Other Charges', 440, y + 6);
        y += 20;
        doc.rect(40, y, 515, 22).strokeColor('#e5e7eb').stroke();
        doc.fillColor('#111827').fontSize(9).font('Helvetica-Bold');
        doc.text(`Rs. ${(payment.principalComponent || 0).toLocaleString('en-IN')}`, 50, y + 6);
        doc.text(`Rs. ${(payment.interestComponent || 0).toLocaleString('en-IN')}`, 180, y + 6);
        doc.text(`Rs. ${(payment.penaltyComponent || 0).toLocaleString('en-IN')}`, 310, y + 6);
        doc.text(`Rs. ${(payment.otherCharges || 0).toLocaleString('en-IN')}`, 440, y + 6);
        y += 28;
        doc.fillColor('#4b5563').fontSize(7.5).font('Helvetica-Oblique')
            .text(`Amount in Words: ${numberToIndianWords(payment.amount || 0)}`, 48, y);
        y += 25;
        doc.lineCap('butt').moveTo(55, y + 35).lineTo(190, y + 35).strokeColor('#9ca3af').stroke();
        doc.fontSize(7).fillColor('#4b5563').font('Helvetica')
            .text("Borrower / Payee Signature", 55, y + 40, { width: 135, align: 'center' });
        doc.lineCap('butt').moveTo(380, y + 35).lineTo(515, y + 35).strokeColor('#9ca3af').stroke();
        doc.fontSize(7).fillColor('#4b5563').font('Helvetica')
            .text("Authorized Cashier & Seal", 380, y + 40, { width: 135, align: 'center' });
        doc.end();
        return bufferPromise;
    }
    async generateClosureReceipt(loan) {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const bufferPromise = this.streamToBuffer(doc);
        this.drawHeader(doc, 'LOAN SETTLEMENT & PHYSICAL GOLD RELEASE VOUCHER', `CLOSE-${loan.loanCode}`);
        let y = 125;
        doc.rect(40, y, 532, 45).fill('#f0fdf4').strokeColor('#bbf7d0').lineWidth(1).stroke();
        doc.fillColor('#166534').fontSize(11).font('Helvetica-Bold')
            .text('ACCOUNT FULLY SETTLED — COLLATERAL AUTHORIZED FOR HANDOVER', 48, y + 10);
        doc.fontSize(8.5).font('Helvetica').fillColor('#15803d')
            .text(`Loan Code: ${loan.loanCode} | Sanctioned: Rs. ${(loan.principalAmount || 0).toLocaleString('en-IN')} | Outstanding Balance: Rs. 0.00 (NIL)`, 48, y + 26);
        y += 55;
        doc.rect(40, y, 260, 90).strokeColor('#e5e7eb').lineWidth(1).stroke();
        doc.rect(40, y, 260, 18).fill('#f3f4f6');
        doc.fillColor('#111827').fontSize(8.5).font('Helvetica-Bold').text('BORROWER DETAILS', 48, y + 5);
        doc.fontSize(8).font('Helvetica').fillColor('#374151');
        doc.text(`Customer Code: `, 48, y + 25).font('Helvetica-Bold').text(loan.customer?.customerCode, 120, y + 25);
        doc.font('Helvetica').text(`Full Name: `, 48, y + 40).font('Helvetica-Bold').text(loan.customer?.fullName, 120, y + 40);
        doc.font('Helvetica').text(`Mobile: `, 48, y + 55).text(loan.customer?.mobile || 'N/A', 120, y + 55);
        doc.text(`Closure Date: `, 48, y + 70).text(formatDate(new Date()), 120, y + 70);
        doc.rect(312, y, 260, 90).strokeColor('#e5e7eb').lineWidth(1).stroke();
        doc.rect(312, y, 260, 18).fill('#fef3c7');
        doc.fillColor('#92400e').fontSize(8.5).font('Helvetica-Bold').text('VAULT CUSTODY & PACKET PARTICULARS', 320, y + 5);
        doc.fontSize(8).font('Helvetica').fillColor('#374151');
        doc.text(`Packet Code: `, 320, y + 25).font('Helvetica-Bold').text(loan.packet?.packetCode || 'N/A', 395, y + 25);
        doc.font('Helvetica').text(`Vault Storage Box: `, 320, y + 40).font('Helvetica-Bold').fillColor('#b45309')
            .text(loan.packet?.storageLocation?.label ?? 'Box-Assigned', 395, y + 40);
        doc.fillColor('#374151').font('Helvetica').text(`Status: `, 320, y + 55).font('Helvetica-Bold').fillColor('#059669').text('RELEASED FROM VAULT', 395, y + 55);
        doc.fillColor('#374151').font('Helvetica').text(`Verification: `, 320, y + 70).text('Seal verified & unsealed', 395, y + 70);
        y += 100;
        doc.rect(40, y, 532, 18).fill('#334155');
        doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold');
        doc.text('#', 45, y + 5);
        doc.text('Item Code', 65, y + 5);
        doc.text('Metal', 155, y + 5);
        doc.text('Description', 215, y + 5);
        doc.text('Gross Wt (g)', 360, y + 5);
        doc.text('Net Pure Wt (g)', 445, y + 5);
        doc.text('Inspection', 525, y + 5);
        y += 18;
        const items = loan.jewelleryItems || [];
        let totalGross = 0;
        let totalNet = 0;
        doc.font('Helvetica').fontSize(7.5);
        for (let i = 0; i < items.length; i++) {
            const it = items[i];
            totalGross += it.grossWeight || 0;
            totalNet += it.netWeight || 0;
            const bg = i % 2 === 0 ? '#ffffff' : '#f9fafb';
            doc.rect(40, y, 532, 17).fill(bg);
            doc.fillColor('#374151');
            doc.text(String(i + 1), 45, y + 4);
            doc.text(it.itemCode.slice(-14), 65, y + 4);
            doc.font('Helvetica-Bold').fillColor(it.metalType === 'SILVER' ? '#475569' : '#b45309')
                .text(it.metalType || 'GOLD', 155, y + 4);
            doc.font('Helvetica').fillColor('#1f2937')
                .text((it.description || it.category).slice(0, 30), 215, y + 4);
            doc.text((it.grossWeight || 0).toFixed(3), 360, y + 4);
            doc.font('Helvetica-Bold').text((it.netWeight || 0).toFixed(3), 445, y + 4);
            doc.font('Helvetica').fillColor('#059669').text('VERIFIED', 525, y + 4);
            y += 17;
        }
        doc.rect(40, y, 532, 20).fill('#f1f5f9').strokeColor('#cbd5e1').stroke();
        doc.fillColor('#0f172a').fontSize(8).font('Helvetica-Bold');
        doc.text(`TOTAL ARTICLES RETURNED: ${items.length}`, 48, y + 5);
        doc.text(`${totalGross.toFixed(3)} g`, 355, y + 5);
        doc.text(`${totalNet.toFixed(3)} g`, 440, y + 5);
        y += 32;
        doc.rect(40, y, 532, 65).fill('#fffbeb').strokeColor('#fde68a').lineWidth(1).stroke();
        doc.fillColor('#92400e').fontSize(8.5).font('Helvetica-Bold')
            .text('CUSTOMER PHYSICAL RECEIPT & DISCHARGE DECLARATION:', 48, y + 6);
        doc.fontSize(7.5).font('Helvetica').fillColor('#78350f')
            .text('I hereby confirm and acknowledge that I have received all my pledged gold/silver ornaments listed above in full, correct weight, and undamaged condition. The sealed packet was opened and weighed in my presence. The loan account stands fully closed with zero dues, and I have no further claims whatsoever against Radhika Jewellers / Silveransh regarding this pledge.', 48, y + 20, { width: 516, lineGap: 2 });
        y += 85;
        doc.lineCap('butt').moveTo(55, y + 55).lineTo(225, y + 55).strokeColor('#9ca3af').stroke();
        doc.fontSize(8).fillColor('#1f2937').font('Helvetica-Bold')
            .text("Customer Physical Receipt Signature", 55, y + 60, { width: 170, align: 'center' });
        doc.fontSize(7).fillColor('#6b7280').font('Helvetica')
            .text(`Signed by: ${loan.customer?.fullName}`, 55, y + 72, { width: 170, align: 'center' });
        doc.lineCap('butt').moveTo(385, y + 55).lineTo(555, y + 55).strokeColor('#9ca3af').stroke();
        doc.fontSize(8).fillColor('#1f2937').font('Helvetica-Bold')
            .text("Authorized Release Officer Signature", 385, y + 60, { width: 170, align: 'center' });
        doc.fontSize(7).fillColor('#6b7280').font('Helvetica')
            .text("For Radhika Jewellers / Silveransh", 385, y + 72, { width: 170, align: 'center' });
        doc.end();
        return bufferPromise;
    }
};
PdfGeneratorService = __decorate([
    Injectable()
], PdfGeneratorService);
export { PdfGeneratorService };
//# sourceMappingURL=pdf-generator.service.js.map